const path = require('node:path');
const sharp = require('sharp');

const root = path.resolve(__dirname, '..');
const publicDirectory = path.join(root, 'public');
const iosIcon = path.join(root, 'ios', 'App', 'App', 'Assets.xcassets', 'AppIcon.appiconset', 'AppIcon-512@2x.png');

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

async function renderIcon(master, size, destination) {
  await sharp(master)
    .resize(size, size, { fit: 'fill' })
    .png({ compressionLevel: 9, palette: false })
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
  ]);
  console.log('Generated Dilz web and iOS app icons.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
