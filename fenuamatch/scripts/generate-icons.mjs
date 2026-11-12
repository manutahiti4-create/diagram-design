// Génère le favicon et les icônes PWA à partir du logo SVG.
// Usage : npm run icons
import sharp from 'sharp';
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';

const mark = readFileSync('src/assets/logo-mark.svg');
mkdirSync('public/icons', { recursive: true });
copyFileSync('src/assets/logo-mark.svg', 'public/favicon.svg');

async function onBackground(size, logoRatio, background, out, radius = 0) {
  const logoSize = Math.round(size * logoRatio);
  const logo = await sharp(mark, { density: 1200 }).resize(logoSize, logoSize).png().toBuffer();
  const bg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${radius}" fill="${background}"/></svg>`,
  );
  await sharp(bg).composite([{ input: logo, gravity: 'center' }]).png().toFile(out);
}

await sharp(mark, { density: 600 }).resize(32, 32).png().toFile('public/favicon-32.png');
await onBackground(180, 0.72, '#FFFFFF', 'public/apple-touch-icon.png');
await onBackground(192, 0.72, '#FFFFFF', 'public/icons/icon-192.png', 0);
await onBackground(512, 0.72, '#FFFFFF', 'public/icons/icon-512.png', 0);
await onBackground(512, 0.56, '#FFFFFF', 'public/icons/icon-maskable-512.png'); // zone de sécurité Android
await onBackground(1024, 0.7, '#FFFFFF', 'public/icons/logo-1024.png'); // réseaux sociaux / future application

// Image de partage (Open Graph) 1200x630
const logo = await sharp(mark, { density: 1200 }).resize(300, 300).png().toBuffer();
const og = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <rect width="1200" height="630" fill="#F5F8FA"/>
  <text x="470" y="300" font-family="Poppins, Arial, Helvetica, sans-serif" font-weight="700" font-size="92" fill="#0F2A5A">Fenua<tspan fill="#00A99B">Match</tspan></text>
  <text x="474" y="380" font-family="Inter, Arial, Helvetica, sans-serif" font-size="40" fill="#2D2D2D">Le bon talent, au bon endroit.</text>
</svg>`);
await sharp(og).composite([{ input: logo, left: 130, top: 165 }]).png().toFile('public/og-image.png');
writeFileSync('public/icons/README.txt', 'Fichiers générés par "npm run icons" à partir de src/assets/logo-mark.svg.\n');
console.log('Icônes générées.');
