/**
 * Regenerates every icon from `public/favicon.svg`.
 *
 *     node scripts/make-icons.mjs
 *
 * Rendering uses headless Chromium (override the binary with CHROME=/path).
 * This is a manual tool: the generated PNG/ICO files are committed, so the
 * normal build never needs a browser.
 *
 * - favicon-32.png / favicon.ico : rounded tile kept, transparent corners.
 * - apple-touch-icon, icon-192/512, avatar : full-bleed brand blue with the
 *   mark at 74% so Android/iOS masks (purpose: any maskable) cannot clip it.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = join(root, 'public');
const source = join(publicDir, 'favicon.svg');
const chrome = process.env.CHROME || 'chromium';
const BRAND = '#2563eb';

if (!existsSync(source)) {
  console.error(`[icons] missing ${source}`);
  process.exit(1);
}

const work = mkdtempSync(join(tmpdir(), 'dogbro-icons-'));

function render(size, { background, scale }) {
  const html = join(work, `icon-${size}-${scale}-${background === 'transparent' ? 't' : 'b'}.html`);
  writeFileSync(
    html,
    `<!doctype html><html><head><meta charset="utf-8"><style>
       html,body{margin:0;padding:0;width:${size}px;height:${size}px;overflow:hidden}
       body{display:flex;align-items:center;justify-content:center;background:${background}}
       img{display:block;width:${Math.round(scale * 100)}%;height:${Math.round(scale * 100)}%}
     </style></head><body><img src="file://${source}" alt=""></body></html>`,
  );
  const out = join(work, `icon-${size}-${Math.round(scale * 100)}-${background === 'transparent' ? 't' : 'b'}.png`);
  execFileSync(
    chrome,
    [
      '--headless',
      '--no-sandbox',
      '--disable-gpu',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
      `--window-size=${size},${size}`,
      '--default-background-color=00000000',
      `--screenshot=${out}`,
      `file://${html}`,
    ],
    { stdio: 'ignore' },
  );
  return readFileSync(out);
}

/** Minimal ICO container: 32-bit entries whose payload is a PNG (Vista+). */
function buildIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  const entries = [];
  let offset = 6 + images.length * 16;
  for (const { size, data } of images) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0);
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    offset += data.length;
  }
  return Buffer.concat([header, ...entries, ...images.map((i) => i.data)]);
}

const tile = (size) => render(size, { background: 'transparent', scale: 1 });
const maskable = (size) => render(size, { background: BRAND, scale: 0.74 });

const outputs = [
  ['favicon-32.png', tile(32)],
  ['apple-touch-icon.png', maskable(180)],
  ['icon-192.png', maskable(192)],
  ['icon-512.png', maskable(512)],
  ['avatar.png', maskable(512)],
  ['favicon.ico', buildIco([16, 32, 48].map((size) => ({ size, data: tile(size) })))],
];

for (const [name, data] of outputs) {
  writeFileSync(join(publicDir, name), data);
  console.log(`[icons] ${name.padEnd(20)} ${data.length} bytes`);
}