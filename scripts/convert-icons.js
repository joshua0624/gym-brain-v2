// Convert SVG icons to PNG using sharp
import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const iconsDir = path.join(__dirname, '..', 'public', 'icons');

async function convertIcon(size) {
  const svgPath = path.join(iconsDir, `icon-${size}.svg`);
  const pngPath = path.join(iconsDir, `icon-${size}.png`);

  await sharp(svgPath)
    .resize(size, size)
    .png()
    .toFile(pngPath);

  console.log(`✓ Converted icon-${size}.svg to PNG`);
}

async function main() {
  await convertIcon(192);
  await convertIcon(512);
  console.log('✓ All icons converted successfully');
}

main().catch(console.error);
