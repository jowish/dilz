const path = require('node:path');
const sharp = require('sharp');

const root = path.resolve(__dirname, '..');
const publicDirectory = path.join(root, 'public');
const iosIcon = path.join(root, 'ios', 'App', 'App', 'Assets.xcassets', 'AppIcon.appiconset', 'AppIcon-512@2x.png');
const iosSplash = path.join(root, 'ios', 'App', 'App', 'Assets.xcassets', 'Splash.imageset', 'splash-2732x2732.png');
const androidRes = path.join(root, 'android', 'app', 'src', 'main', 'res');
const assetsDirectory = path.join(root, 'assets');

const masterSize = 1024;
const logo = Buffer.from(`
  <svg width="${masterSize}" height="${masterSize}" viewBox="0 0 ${masterSize} ${masterSize}" xmlns="http://www.w3.org/2000/svg">
    <rect width="1024" height="1024" fill="#FFFFFF"/>
    <text
      x="512"
      y="520"
      fill="#0B1220"
      font-family="Arial, Helvetica, sans-serif"
      font-size="310"
      font-weight="900"
      letter-spacing="-18"
      text-anchor="middle"
      dominant-baseline="middle"
    >dILz</text>
  </svg>
`);

// Android adaptive icons must keep artwork inside the center ~66% "safe zone"
// of the 108dp canvas so it survives circle/squircle/rounded-square masking
// on different launchers. We reuse the flat white master icon as the
// foreground, scaled down and centered on a transparent canvas; since the
// background layer is the same white, the seam is invisible.
const ANDROID_ADAPTIVE_SAFE_ZONE = 0.62;

const MIPMAP_DENSITIES = {
  mdpi: { launcher: 48, foreground: 108 },
  hdpi: { launcher: 72, foreground: 162 },
  xhdpi: { launcher: 96, foreground: 216 },
  xxhdpi: { launcher: 144, foreground: 324 },
  xxxhdpi: { launcher: 192, foreground: 432 },
};

// (width, height) pairs matching Capacitor's default splash template so we
// swap artwork in place without touching styles.xml or resource names.
const ANDROID_SPLASH_SIZES = {
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

async function renderIcon(master, size, destination) {
  await sharp(master)
    .resize(size, size, { fit: 'fill' })
    .png({ compressionLevel: 9, palette: false })
    .toFile(destination);
}

async function renderAndroidAdaptiveForeground(master, canvasSize, destination) {
  const glyphSize = Math.round(canvasSize * ANDROID_ADAPTIVE_SAFE_ZONE);
  const glyph = await sharp(master).resize(glyphSize, glyphSize, { fit: 'fill' }).toBuffer();
  await sharp({
    create: {
      width: canvasSize,
      height: canvasSize,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: glyph, gravity: 'center' }])
    .png({ compressionLevel: 9 })
    .toFile(destination);
}

async function renderAndroidSplash(source, width, height, destination) {
  await sharp(source)
    .resize(width, height, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png({ compressionLevel: 9 })
    .toFile(destination);
}

async function main() {
  const master = await sharp(logo, { density: 192 })
    .resize(masterSize, masterSize, { fit: 'fill' })
    .png({ compressionLevel: 9, palette: false })
    .toBuffer();

  await Promise.all([
    renderIcon(master, 180, path.join(publicDirectory, 'icon-180.png')),
    renderIcon(master, 192, path.join(publicDirectory, 'icon-192.png')),
    renderIcon(master, 512, path.join(publicDirectory, 'icon-512.png')),
    sharp(master).toFile(iosIcon),
    sharp(master).resize(512, 512, { fit: 'fill' }).png({ compressionLevel: 9 }).toFile(path.join(assetsDirectory, 'play-store-icon-512.png')),
  ]);

  await Promise.all(
    Object.entries(MIPMAP_DENSITIES).flatMap(([density, sizes]) => {
      const dir = path.join(androidRes, `mipmap-${density}`);
      return [
        renderIcon(master, sizes.launcher, path.join(dir, 'ic_launcher.png')),
        renderIcon(master, sizes.launcher, path.join(dir, 'ic_launcher_round.png')),
        renderAndroidAdaptiveForeground(master, sizes.foreground, path.join(dir, 'ic_launcher_foreground.png')),
      ];
    })
  );

  await Promise.all(
    Object.entries(ANDROID_SPLASH_SIZES).map(([relativePath, [width, height]]) =>
      renderAndroidSplash(iosSplash, width, height, path.join(androidRes, relativePath))
    )
  );

  console.log('Generated Dilz web, iOS and Android app icons and splash screens.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
