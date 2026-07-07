import { deflateSync } from "node:zlib";

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Buffer {
  const typeBytes = Buffer.from(type, "ascii");
  const body = Buffer.concat([typeBytes, data]);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

/** Encode an RGBA pixel buffer (width*height*4) as a PNG Buffer. */
function encodePng(width: number, height: number, rgba: Uint8Array): Buffer {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // bit depth
  ihdr.writeUInt8(6, 9); // color type RGBA
  ihdr.writeUInt8(0, 10);
  ihdr.writeUInt8(0, 11);
  ihdr.writeUInt8(0, 12);

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.subarray(y * stride, y * stride + stride).forEach((v, i) => {
      raw[y * (stride + 1) + 1 + i] = v;
    });
  }

  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", new Uint8Array(0)),
  ]);
}

/**
 * A deterministic 96×96 "face": diagonal gradient background, a bright oval
 * face, two dark eyes and a mouth — enough luminance variation to exercise
 * every render/color mode.
 */
export function makeFacePng(): Buffer {
  const size = 96;
  const rgba = new Uint8Array(size * size * 4);
  const cx = size / 2;
  const cy = size * 0.46;

  const inEllipse = (x: number, y: number, ex: number, ey: number, rx: number, ry: number) => {
    const dx = (x - ex) / rx;
    const dy = (y - ey) / ry;
    return dx * dx + dy * dy <= 1;
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      let r = 40 + (x / size) * 120;
      let g = 30 + (y / size) * 90;
      let b = 90 + ((x + y) / (size * 2)) * 120;

      if (inEllipse(x, y, cx, cy, size * 0.28, size * 0.36)) {
        r = 235;
        g = 205;
        b = 180;
      }
      if (
        inEllipse(x, y, cx - size * 0.11, cy - size * 0.04, size * 0.05, size * 0.04) ||
        inEllipse(x, y, cx + size * 0.11, cy - size * 0.04, size * 0.05, size * 0.04)
      ) {
        r = 20;
        g = 20;
        b = 30;
      }
      if (inEllipse(x, y, cx, cy + size * 0.18, size * 0.13, size * 0.05)) {
        r = 150;
        g = 40;
        b = 50;
      }

      rgba[i] = Math.min(255, r);
      rgba[i + 1] = Math.min(255, g);
      rgba[i + 2] = Math.min(255, b);
      rgba[i + 3] = 255;
    }
  }

  return encodePng(size, size, rgba);
}
