import sharp from 'sharp';
import { readFileSync } from 'node:fs';

const svg = readFileSync(new URL('../public/icons/icon.svg', import.meta.url));
const out = (name) => new URL(`../public/icons/${name}`, import.meta.url).pathname;

await sharp(svg).resize(192, 192).png().toFile(out('icon-192.png'));
await sharp(svg).resize(512, 512).png().toFile(out('icon-512.png'));
await sharp(svg).resize(180, 180).png().toFile(out('apple-touch-icon.png'));
// Maskable: pad the artwork so the safe zone (inner 80%) holds the mountain.
await sharp({ create: { width: 512, height: 512, channels: 4, background: '#0f766e' } })
  .composite([{ input: await sharp(svg).resize(400, 400).png().toBuffer(), gravity: 'centre' }])
  .png()
  .toFile(out('icon-512-maskable.png'));
console.log('icons written');
