const path = require('node:path');
const fs = require('node:fs');
const sharp = require('sharp');

const root = path.resolve(__dirname, '..');
const publicDir = path.join(root, 'public');
const assetsDir = path.join(root, 'assets');
const sourceIcon = path.join(assetsDir, 'source', 'icon-master.png');
const iosIcon = path.join(root, 'ios', 'App', 'App', 'Assets.xcassets', 'AppIcon.appiconset', 'AppIcon-512@2x.png');
const iosSplashDir = path.join(root, 'ios', 'App', 'App', 'Assets.xcassets', 'Splash.imageset');
const androidRes = path.join(root, 'android', 'app', 'src', 'main', 'res');

const INK = { r: 0x0b, g: 0x12, b: 0x20 };
const PAPER = { r: 0xff, g: 0xff, b: 0xff, alpha: 1 };
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

// The source artwork is the finished tile: full-bleed square, opaque
// background, glyph inset with its own padding already baked in. Every
// platform's "as designed" icon is just that master resized.
async function loadMaster(size) {
  return sharp(sourceIcon).resize(size, size, { fit: 'cover' }).png();
}

// Lift the glyph out of the master as a standalone alpha mask (luminance as
// alpha: the near-white mark becomes opaque, the near-black ground becomes
// transparent), then tint it. Lets us re-place "just the mark" at whatever
// scale/colour a given platform's safe zone needs (adaptive icon foreground,
// maskable icon, splash screens) without redrawing it as vector geometry.
async function glyphMask(size) {
  const { data, info } = await sharp(sourceIcon)
    .resize(size, size, { fit: 'cover' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const alpha = Buffer.alloc(width * height);
  for (let i = 0; i < width * height; i++) {
    const r = data[i * channels];
    const g = data[i * channels + 1];
    const b = data[i * channels + 2];
    alpha[i] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  }
  return { alpha, width, height };
}

async function glyphPng(size, { r, g, b }) {
  const { alpha, width, height } = await glyphMask(size);
  const color = Buffer.alloc(width * height * 3);
  for (let i = 0; i < width * height; i++) {
    color[i * 3] = r;
    color[i * 3 + 1] = g;
    color[i * 3 + 2] = b;
  }
  return sharp(color, { raw: { width, height, channels: 3 } })
    .joinChannel(alpha, { raw: { width, height, channels: 1 } })
    .png()
    .toBuffer();
}

// A background (solid colour or transparent) with the glyph centred and
// inset to `scale` of the canvas, optionally corner-rounded.
async function markOnGround(targetSize, { ground = TRANSPARENT, color = PAPER, scale = 0.5, radius = 0 } = {}) {
  const inner = Math.max(1, Math.round(targetSize * scale));
  const glyph = await sharp(await glyphPng(1024, color)).resize(inner, inner).toBuffer();
  const off = Math.round((targetSize - inner) / 2);
  let img = sharp({ create: { width: targetSize, height: targetSize, channels: 4, background: ground } }).composite([
    { input: glyph, left: off, top: off },
  ]);
  if (radius) {
    const mask = Buffer.from(
      `<svg><rect width="${targetSize}" height="${targetSize}" rx="${radius}" ry="${radius}" fill="#fff"/></svg>`
    );
    img = sharp(await img.png().toBuffer()).composite([{ input: mask, blend: 'dest-in' }]);
  }
  return img.png({ compressionLevel: 9 });
}

async function circleMask(buffer, size) {
  const mask = Buffer.from(`<svg><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff"/></svg>`);
  return sharp(buffer).composite([{ input: mask, blend: 'dest-in' }]).png({ compressionLevel: 9 });
}

// Wrap a PNG buffer in a single-image .ico container (ICO supports PNG
// entries), so the legacy /favicon.ico matches the new mark too.
function pngToIco(pngBuffer, dim) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(1, 4); // image count
  const entry = Buffer.alloc(16);
  entry.writeUInt8(dim >= 256 ? 0 : dim, 0); // width (0 = 256)
  entry.writeUInt8(dim >= 256 ? 0 : dim, 1); // height
  entry.writeUInt8(0, 2); // palette
  entry.writeUInt8(0, 3); // reserved
  entry.writeUInt16LE(1, 4); // colour planes
  entry.writeUInt16LE(32, 6); // bits per pixel
  entry.writeUInt32LE(pngBuffer.length, 8); // data size
  entry.writeUInt32LE(6 + 16, 12); // data offset
  return Buffer.concat([header, entry, pngBuffer]);
}

const MIPMAP = {
  mdpi: { launcher: 48, foreground: 108 },
  hdpi: { launcher: 72, foreground: 162 },
  xhdpi: { launcher: 96, foreground: 216 },
  xxhdpi: { launcher: 144, foreground: 324 },
  xxxhdpi: { launcher: 192, foreground: 432 },
};

const ANDROID_SPLASH = {
  'drawable/splash.png': [480, 320],
  'drawable-land-mdpi/splash.png': [480, 320],
  'drawable-land-hdpi/splash.png': [800, 480],
  'drawable-land-xhdpi/splash.png': [1280, 720],
  'drawable-land-xxhdpi/splash.png': [1600, 960],
  'drawable-land-xxxhdpi/splash.png': [1920, 1280],
  'drawable-port-mdpi/splash.png': [320, 480],
  'drawable-port-hdpi/splash.png': [480, 800],
  'drawable-port-xhdpi/splash.png': [720, 1280],
  'drawable-port-xxhdpi/splash.png': [960, 1600],
  'drawable-port-xxxhdpi/splash.png': [1280, 1920],
};

async function main() {
  fs.mkdirSync(assetsDir, { recursive: true });

  if (!fs.existsSync(sourceIcon)) {
    throw new Error(`Missing source artwork at ${sourceIcon}`);
  }

  // ── One full-bleed master, shared by iOS and every web/PWA size so the
  //    artwork is pixel-identical across platforms (OS applies rounding). ─
  const master = await (await loadMaster(1024)).toBuffer();
  const fromMaster = (size) => sharp(master).resize(size, size).png({ compressionLevel: 9 });
  await sharp(master).toFile(iosIcon);
  await Promise.all([
    fromMaster(180).toFile(path.join(publicDir, 'icon-180.png')),
    fromMaster(192).toFile(path.join(publicDir, 'icon-192.png')),
    fromMaster(512).toFile(path.join(publicDir, 'icon-512.png')),
    fromMaster(512).toFile(path.join(assetsDir, 'play-store-icon-512.png')),
    // Maskable variant — mark pulled into the 80% safe zone so any launcher
    // mask (circle, squircle) crops only the ground.
    (await markOnGround(512, { ground: { r: 0, g: 0, b: 0, alpha: 1 }, color: { r: 254, g: 254, b: 254 }, scale: 0.54 })).toFile(
      path.join(publicDir, 'icon-maskable-512.png')
    ),
  ]);

  // Scalable favicon (raster master embedded in an SVG wrapper, since the
  // artwork is a fixed piece of art rather than redrawable geometry) + a
  // 32px PNG fallback + legacy .ico.
  const faviconTile = await (
    await markOnGround(256, { ground: { r: 0, g: 0, b: 0, alpha: 1 }, color: { r: 254, g: 254, b: 254 }, scale: 0.64, radius: 56 })
  ).toBuffer();
  const faviconDataUri = `data:image/png;base64,${faviconTile.toString('base64')}`;
  fs.writeFileSync(
    path.join(publicDir, 'favicon.svg'),
    `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256"><image href="${faviconDataUri}" width="256" height="256"/></svg>\n`
  );
  const favicon32 = await markOnGround(32, {
    ground: { r: 0, g: 0, b: 0, alpha: 1 },
    color: { r: 254, g: 254, b: 254 },
    scale: 0.64,
    radius: 7,
  });
  await favicon32.toFile(path.join(publicDir, 'favicon-32.png'));
  const favPng = await sharp(await favicon32.toBuffer()).toBuffer();
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), pngToIco(favPng, 32));

  // ── iOS splash (the icon itself was written from the shared master). ──
  const iosSplash = await markOnGround(2732, { ground: PAPER, color: INK, scale: 0.18 * 0.64 });
  const iosSplashBuffer = await iosSplash.toBuffer();
  await Promise.all([
    sharp(iosSplashBuffer).toFile(path.join(iosSplashDir, 'splash-2732x2732.png')),
    sharp(iosSplashBuffer).toFile(path.join(iosSplashDir, 'splash-2732x2732-1.png')),
    sharp(iosSplashBuffer).toFile(path.join(iosSplashDir, 'splash-2732x2732-2.png')),
  ]);

  // ── Android — legacy square launcher + adaptive foreground. ───────────
  await Promise.all(
    Object.entries(MIPMAP).map(async ([density, s]) => {
      const dir = path.join(androidRes, `mipmap-${density}`);
      const square = await sharp(master).resize(s.launcher, s.launcher).png().toBuffer();
      const foreground = await markOnGround(s.foreground, {
        ground: TRANSPARENT,
        color: { r: 254, g: 254, b: 254 },
        scale: 0.5 * 0.64,
      });
      await Promise.all([
        sharp(square).toFile(path.join(dir, 'ic_launcher.png')),
        circleMask(square, s.launcher).then((round) => round.toFile(path.join(dir, 'ic_launcher_round.png'))),
        foreground.toFile(path.join(dir, 'ic_launcher_foreground.png')),
      ]);
    })
  );

  await Promise.all(
    Object.entries(ANDROID_SPLASH).map(async ([rel, [w, h]]) =>
      (await markOnGround(Math.max(w, h), { ground: PAPER, color: INK, scale: 0.22 * 0.64 }))
        .resize(w, h, { fit: 'cover', position: 'centre' })
        .toFile(path.join(androidRes, rel))
    )
  );

  console.log('Generated dILz icons + splash screens (web, iOS, Android) from assets/source/icon-master.png.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
