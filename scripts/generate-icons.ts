import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createPng(width: number, height: number, filename: string) {
  // 8-byte PNG header
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // bit depth 8
  ihdr.writeUInt8(6, 9); // RGBA
  ihdr.writeUInt8(0, 10); // compression
  ihdr.writeUInt8(0, 11); // filter
  ihdr.writeUInt8(0, 12); // interlace

  function makeChunk(type: string, data: Buffer): Buffer {
    const len = data.length;
    const buf = Buffer.alloc(12 + len);
    buf.writeUInt32BE(len, 0);
    buf.write(type, 4, 4, 'ascii');
    data.copy(buf, 8);
    // CRC calculation
    let c = 0xffffffff;
    const typeAndData = buf.subarray(4, 8 + len);
    for (let i = 0; i < typeAndData.length; i++) {
      c ^= typeAndData[i];
      for (let j = 0; j < 8; j++) {
        c = (c >>> 1) ^ ((c & 1) ? 0xedb88320 : 0);
      }
    }
    buf.writeInt32BE((c ^ 0xffffffff) | 0, 8 + len);
    return buf;
  }

  const ihdrChunk = makeChunk('IHDR', ihdr);

  // Raw image data with 0 filter byte before each line
  const rowStride = width * 4;
  const rawData = Buffer.alloc((1 + rowStride) * height);

  const cx = width / 2;
  const cy = height / 2;
  const radius = width * 0.42;
  const innerRadius = width * 0.28;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * (1 + rowStride);
    rawData[rowOffset] = 0; // Filter byte 0 (None)

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Deep dark background #0D0D0D
      let r = 13;
      let g = 13;
      let b = 13;
      let a = 255;

      // Stylized badge circle
      if (dist < radius) {
        // Graphite fill #171717
        r = 23;
        g = 23;
        b = 23;

        // Sage green ring / arc (#A3C9A8 = 163, 201, 168)
        if (dist >= innerRadius && dist <= innerRadius + width * 0.06) {
          // Arc on top/right (growth)
          if (dy < dx * 0.5) {
            r = 163;
            g = 201;
            b = 168;
          } else {
            // Terracotta on bottom/left (#E29578 = 226, 149, 120)
            r = 226;
            g = 149;
            b = 120;
          }
        }

        // Inner center icon: subtle upward growth arrow / chevron
        if (Math.abs(dx) < width * 0.14 && dy > -width * 0.12 && dy < width * 0.12) {
          const chevron = Math.abs(dx) - (dy + width * 0.05);
          if (Math.abs(chevron) < width * 0.035 && dy < width * 0.08) {
            // Sage green #A3C9A8
            r = 163;
            g = 201;
            b = 168;
          }
        }
      }

      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  const totalBuffer = Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
  fs.writeFileSync(filename, totalBuffer);
}

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

createPng(192, 192, path.join(publicDir, 'pwa-192x192.png'));
createPng(512, 512, path.join(publicDir, 'pwa-512x512.png'));
createPng(512, 512, path.join(publicDir, 'pwa-maskable-512x512.png'));
createPng(180, 180, path.join(publicDir, 'apple-touch-icon.png'));
console.log('Generated PWA PNG icons successfully!');
