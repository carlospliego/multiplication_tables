// Renders the app icons from a hand-written rocket SVG (modeled on src/components/Rocket.tsx).
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const BG = '#0b1030';

// Rocket artwork in the Rocket.tsx 120x180 coordinate space.
const rocket = `
<path d="M46 130 Q60 185 74 130 Z" fill="#ff8a2b"/>
<path d="M52 130 Q60 164 68 130 Z" fill="#ffd23f"/>
<path d="M40 96 L6 128 L6 144 L40 130 Z" fill="#35e0ff" stroke="#2a3380" stroke-width="3" stroke-linejoin="round"/>
<path d="M80 96 L114 128 L114 144 L80 130 Z" fill="#35e0ff" stroke="#2a3380" stroke-width="3" stroke-linejoin="round"/>
<path d="M60 14 C86 40 88 84 84 132 L36 132 C32 84 34 40 60 14 Z" fill="#f4f6ff" stroke="#2a3380" stroke-width="4" stroke-linejoin="round"/>
<rect x="36" y="128" width="48" height="12" rx="6" fill="#8e9bd8" stroke="#2a3380" stroke-width="3"/>
<path d="M60 14 C70 24 76 36 78 48 L42 48 C44 36 50 24 60 14 Z" fill="#ff5c6c" stroke="#2a3380" stroke-width="4" stroke-linejoin="round"/>
<circle cx="60" cy="76" r="13" fill="#35e0ff" stroke="#2a3380" stroke-width="4"/>`;

// scale = fraction of the icon height the rocket (180 units tall) occupies.
function svg(size, scale) {
  const s = (size * scale) / 180;
  const tx = (size - 120 * s) / 2;
  const ty = (size - 180 * s) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
<rect width="${size}" height="${size}" fill="${BG}"/>
<g transform="translate(${tx} ${ty}) scale(${s})">${rocket}</g></svg>`;
}

const targets = [
  ['icon-192.png', 192, 0.8],
  ['icon-512.png', 512, 0.8],
  ['apple-touch-icon.png', 180, 0.8],
  ['icon-maskable-512.png', 512, 0.55], // safe zone: keep art inside the central 80% circle
];
for (const [name, size, scale] of targets) {
  await sharp(Buffer.from(svg(size, scale))).png().toFile(join(out, name));
  console.log('wrote', name);
}
