// Simple icon generator for PWA
// Creates basic placeholder icons with brand color

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create a simple PNG using canvas (requires canvas package)
// For now, we'll create SVG placeholders that can be converted

const createSVGIcon = (size) => `
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#6B8E6B"/>
  <text
    x="50%"
    y="50%"
    dominant-baseline="middle"
    text-anchor="middle"
    font-family="Arial, sans-serif"
    font-size="${size * 0.4}"
    font-weight="bold"
    fill="white"
  >GB</text>
</svg>
`.trim();

// Create icons directory
const iconsDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Write SVG files (temporary placeholders)
fs.writeFileSync(
  path.join(iconsDir, 'icon-192.svg'),
  createSVGIcon(192)
);

fs.writeFileSync(
  path.join(iconsDir, 'icon-512.svg'),
  createSVGIcon(512)
);

console.log('✓ Generated SVG placeholders in public/icons/');
console.log('  Note: Convert to PNG using: npm install -g sharp-cli && sharp-cli -i public/icons/icon-192.svg -o public/icons/icon-192.png');
console.log('  Or use an online converter like https://svgtopng.com');
