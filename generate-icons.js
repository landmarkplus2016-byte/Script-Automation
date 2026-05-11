'use strict';

const zlib = require('node:zlib');
const fs   = require('node:fs');
const path = require('node:path');

// ── CRC32 (required by PNG spec) ─────────────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

// ── PNG chunk writer ─────────────────────────────────────────────
function chunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const l = Buffer.alloc(4); l.writeUInt32BE(data.length);
  const k = Buffer.alloc(4); k.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([l, t, data, k]);
}

// ── PNG encoder (8-bit RGB, filter-0 / None) ─────────────────────
function encodePNG(w, h, rgb) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8-bit depth, RGB colour type

  const raw = [];
  for (let y = 0; y < h; y++) {
    raw.push(0); // filter byte: None
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 3;
      raw.push(rgb[i], rgb[i + 1], rgb[i + 2]);
    }
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(Buffer.from(raw), { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── Pixel-art glyph map (3 cols × 5 rows) ────────────────────────
const GLYPHS = {
  E: [
    [1, 1, 1],
    [1, 0, 0],
    [1, 1, 1],
    [1, 0, 0],
    [1, 1, 1],
  ],
  C: [
    [0, 1, 1],
    [1, 0, 0],
    [1, 0, 0],
    [1, 0, 0],
    [0, 1, 1],
  ],
};

// ── Icon renderer ────────────────────────────────────────────────
function renderIcon(size) {
  const buf = new Uint8Array(size * size * 3);

  function setPixel(x, y, r, g, b) {
    if (x < 0 || x >= size || y < 0 || y >= size) return;
    const i = (y * size + x) * 3;
    buf[i] = r; buf[i + 1] = g; buf[i + 2] = b;
  }

  function fillRect(x, y, w, h, r, g, b) {
    for (let dy = 0; dy < h; dy++)
      for (let dx = 0; dx < w; dx++)
        setPixel(x + dx, y + dy, r, g, b);
  }

  // Background: #1d4ed8
  fillRect(0, 0, size, size, 29, 78, 216);

  // Layout: three letters ("E", "E", "C"), each 3 cols × 5 rows, 1-col gap
  const GLYPH_COLS = 3, GLYPH_ROWS = 5, GAP = 1;
  const TOTAL_COLS = 3 * GLYPH_COLS + 2 * GAP; // = 11

  const cell  = Math.floor(size * 0.68 / TOTAL_COLS);
  const textW = TOTAL_COLS * cell;
  const textH = GLYPH_ROWS * cell;
  const ox    = Math.round((size - textW) / 2);
  const oy    = Math.round((size - textH) / 2);

  ['E', 'E', 'C'].forEach((letter, li) => {
    const lx = ox + li * (GLYPH_COLS + GAP) * cell;
    GLYPHS[letter].forEach((row, ry) => {
      row.forEach((on, cx) => {
        if (on) fillRect(lx + cx * cell, oy + ry * cell, cell, cell, 255, 255, 255);
      });
    });
  });

  // Thin underline accent in lighter blue (#60a5fa)
  const lineY  = oy + textH + Math.round(cell * 0.6);
  const lineH  = Math.max(2, Math.round(cell * 0.25));
  const lineX  = ox + cell;
  const lineW  = textW - cell * 2;
  fillRect(lineX, lineY, lineW, lineH, 96, 165, 250);

  return buf;
}

// ── Generate and write ────────────────────────────────────────────
const assetsDir = path.join(__dirname, 'assets');
fs.mkdirSync(assetsDir, { recursive: true });

for (const size of [192, 512]) {
  const png  = encodePNG(size, size, renderIcon(size));
  const dest = path.join(assetsDir, `icon-${size}.png`);
  fs.writeFileSync(dest, png);
  console.log(`✓  assets/icon-${size}.png  (${(png.length / 1024).toFixed(1)} KB)`);
}
