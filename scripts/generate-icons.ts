/**
 * Generates the PWA icons.
 *
 * A grocery shop's customers reorder every week, so "add to home screen" is
 * worth having — and Android will not offer to install a site without real
 * raster icons. Rather than commit binary blobs nobody can review, the icons
 * are drawn here from the brand colours and written as PNGs, so changing the
 * logo is a code change with a visible diff.
 *
 * Run with: npx tsx scripts/generate-icons.ts
 */

import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

type RGBA = [number, number, number, number];

const GREEN: RGBA = [15, 123, 79, 255]; // #0F7B4F, the primary brand colour
const WHITE: RGBA = [255, 255, 255, 255];

// ---------------------------------------------------------------------------
// Minimal PNG writer (truecolour + alpha, no interlacing)
// ---------------------------------------------------------------------------

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);

  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData), 0);

  return Buffer.concat([length, typeAndData, crc]);
}

function encodePng(width: number, height: number, pixels: Uint8Array): Buffer {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // colour type: RGBA
  header[10] = 0; // deflate
  header[11] = 0; // adaptive filtering
  header[12] = 0; // no interlace

  // Each scanline is prefixed with its filter type; 0 = none.
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0;
    Buffer.from(pixels.buffer, y * stride, stride).copy(raw, y * (stride + 1) + 1);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// The mark: a white shopping bag on the brand green
// ---------------------------------------------------------------------------

function drawIcon(size: number): Uint8Array {
  const pixels = new Uint8Array(size * size * 4);

  const set = (x: number, y: number, colour: RGBA) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const offset = (y * size + x) * 4;
    pixels[offset] = colour[0];
    pixels[offset + 1] = colour[1];
    pixels[offset + 2] = colour[2];
    pixels[offset + 3] = colour[3];
  };

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) set(x, y, GREEN);
  }

  // Maskable icons get cropped to a circle on some launchers, so the mark
  // stays inside the middle 60% where nothing can be cut off.
  const bagWidth = Math.round(size * 0.44);
  const bagHeight = Math.round(size * 0.36);
  const left = Math.round((size - bagWidth) / 2);
  const top = Math.round(size * 0.40);
  const radius = Math.round(size * 0.05);
  const wall = Math.max(2, Math.round(size * 0.035));

  const insideRoundedRect = (x: number, y: number, x0: number, y0: number, w: number, h: number, r: number) => {
    if (x < x0 || y < y0 || x >= x0 + w || y >= y0 + h) return false;
    const dx = Math.min(x - x0, x0 + w - 1 - x);
    const dy = Math.min(y - y0, y0 + h - 1 - y);
    if (dx >= r || dy >= r) return true;
    const cx = r - dx;
    const cy = r - dy;
    return cx * cx + cy * cy <= r * r;
  };

  // Bag body, drawn as an outline so the shape reads at 48px.
  for (let y = top; y < top + bagHeight; y += 1) {
    for (let x = left; x < left + bagWidth; x += 1) {
      const outer = insideRoundedRect(x, y, left, top, bagWidth, bagHeight, radius);
      const inner = insideRoundedRect(
        x,
        y,
        left + wall,
        top + wall,
        bagWidth - wall * 2,
        bagHeight - wall * 2,
        Math.max(1, radius - wall),
      );
      if (outer && !inner) set(x, y, WHITE);
    }
  }

  // Handle: a half ring sitting on the bag's top edge.
  const handleRadius = Math.round(bagWidth * 0.26);
  const handleCx = Math.round(size / 2);
  const handleCy = top;
  for (let y = handleCy - handleRadius - wall; y <= handleCy; y += 1) {
    for (let x = handleCx - handleRadius - wall; x <= handleCx + handleRadius + wall; x += 1) {
      const dx = x - handleCx;
      const dy = y - handleCy;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance <= handleRadius && distance >= handleRadius - wall) set(x, y, WHITE);
    }
  }

  return pixels;
}

const publicDir = path.join(process.cwd(), 'public');
mkdirSync(publicDir, { recursive: true });

for (const size of [192, 512]) {
  const file = path.join(publicDir, `icon-${size}.png`);
  writeFileSync(file, encodePng(size, size, drawIcon(size)));
  console.info(`wrote public/icon-${size}.png`);
}

// Apple ignores the manifest and reads this one from the page head.
writeFileSync(path.join(publicDir, 'apple-icon.png'), encodePng(180, 180, drawIcon(180)));
console.info('wrote public/apple-icon.png');
