const path = require('node:path');
const fs = require('node:fs');
const sharp = require('sharp');

const root = path.resolve(__dirname, '..');
const publicDir = path.join(root, 'public');
const assetsDir = path.join(root, 'assets');
const iosIcon = path.join(root, 'ios', 'App', 'App', 'Assets.xcassets', 'AppIcon.appiconset', 'AppIcon-512@2x.png');
const iosSplashDir = path.join(root, 'ios', 'App', 'App', 'Assets.xcassets', 'Splash.imageset');
const androidRes = path.join(root, 'android', 'app', 'src', 'main', 'res');

const INK = '#0B1220';
const PAPER = '#FFFFFF';

// The mark: the "d" as a lens — one ring (bowl) + one stem — on a 120 grid.
// Pure geometry, so it needs no font and redraws identically at any size.
function symbol(fill) {
  return `
    <circle cx="60" cy="74" r="25" fill="none" stroke="${fill}" stroke-width="18"/>
    <rect x="76" y="12" width="18" height="96" rx="2" fill="${fill}"/>`;
}

// A filled square/rounded tile with the mark centred at `scale` of the tile.
function tileSvg(size, { bg = INK, fg = PAPER, radius = 0, scale = 0.64 } = {}) {
  const box = 120;
  const target = size * scale;
  const off = (size - target) / 2;
  const rect = radius
    ? `<rect width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="${bg}"/>`
    : `<rect width="${size}" height="${size}" fill="${bg}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    ${rect}
    <g transform="translate(${off} ${off}) scale(${target / box})">${symbol(fg)}</g>
  </svg>`;
}

// Transparent canvas with the mark only — Android adaptive-icon foreground.
// Smaller scale so it sits inside the launcher's safe zone after masking.
function foregroundSvg(size, { fg = PAPER, scale = 0.5 } = {}) {
  const box = 120;
  const target = size * scale;
  const off = (size - target) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <g transform="translate(${off} ${off}) scale(${target / box})">${symbol(fg)}</g>
  </svg>`;
}

// Splash: ink mark centred on a paper ground.
function splashSvg(width, height, { bg = PAPER, fg = INK, mark = 0.22 } = {}) {
  const box = 120;
  const target = Math.min(width, height) * mark;
  const offX = (width - target) / 2;
  const offY = (height - target) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="${width}" height="${height}" fill="${bg}"/>
    <g transform="translate(${offX} ${offY}) scale(${target / box})">${symbol(fg)}</g>
  </svg>`;
}

const png = (svg) => sharp(Buffer.from(svg)).png({ compressionLevel: 9 });

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

  // ── One full-bleed master, shared by iOS and every web/PWA size so the
  //    artwork is pixel-identical across platforms (OS applies rounding). ─
  const master = await png(tileSvg(1024, { radius: 0 })).toBuffer();
  const fromMaster = (size) => sharp(master).resize(size, size).png({ compressionLevel: 9 });
  await sharp(master).toFile(iosIcon);
  await Promise.all([
    fromMaster(180).toFile(path.join(publicDir, 'icon-180.png')),
    fromMaster(192).toFile(path.join(publicDir, 'icon-192.png')),
    fromMaster(512).toFile(path.join(publicDir, 'icon-512.png')),
    fromMaster(512).toFile(path.join(assetsDir, 'play-store-icon-512.png')),
    // Maskable variant — mark pulled into the 80% safe zone so any launcher
    // mask (circle, squircle) crops only the ground.
    png(tileSvg(512, { radius: 0, scale: 0.54 })).toFile(path.join(publicDir, 'icon-maskable-512.png')),
  ]);

  // Scalable favicon + a 32px PNG fallback + legacy .ico.
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), tileSvg(120, { radius: 26 }).trim() + '\n');
  await png(tileSvg(32, { radius: 7 })).toFile(path.join(publicDir, 'favicon-32.png'));
  const favPng = await png(tileSvg(32, { radius: 7 })).toBuffer();
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), pngToIco(favPng, 32));

  // ── iOS splash (the icon itself was written from the shared master). ──
  const iosSplash = splashSvg(2732, 2732, { mark: 0.18 });
  await Promise.all([
    png(iosSplash).toFile(path.join(iosSplashDir, 'splash-2732x2732.png')),
    png(iosSplash).toFile(path.join(iosSplashDir, 'splash-2732x2732-1.png')),
    png(iosSplash).toFile(path.join(iosSplashDir, 'splash-2732x2732-2.png')),
  ]);

  // ── Android — legacy square launcher + adaptive foreground. ───────────
  await Promise.all(
    Object.entries(MIPMAP).flatMap(([density, s]) => {
      const dir = path.join(androidRes, `mipmap-${density}`);
      return [
        png(tileSvg(s.launcher, { radius: 0 })).toFile(path.join(dir, 'ic_launcher.png')),
        png(tileSvg(s.launcher, { radius: 0 })).toFile(path.join(dir, 'ic_launcher_round.png')),
        png(foregroundSvg(s.foreground)).toFile(path.join(dir, 'ic_launcher_foreground.png')),
      ];
    })
  );

  await Promise.all(
    Object.entries(ANDROID_SPLASH).map(([rel, [w, h]]) =>
      png(splashSvg(w, h, { mark: 0.22 })).toFile(path.join(androidRes, rel))
    )
  );

  console.log('Generated dILz symbol icons + splash screens (web, iOS, Android).');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
