import type { FaceLandmarks } from "../types";

interface Control {
  x: number;
  y: number;
  dx: number;
  dy: number;
}

const RADIUS = 0.13;
const TWO_R2 = 2 * RADIUS * RADIUS;

/**
 * Displacement controls that nudge the identity-bearing geometry: widen the
 * inter-ocular distance, drop the nose, and spread the mouth. Magnitudes are a
 * small fraction of the square so a human still reads the same face while the
 * landmark ratios an FR embedding keys on shift.
 */
function controls(lm: FaceLandmarks, strength: number): Control[] {
  const a = strength * 0.05;
  return [
    { x: lm.leftEye.x, y: lm.leftEye.y, dx: -a, dy: 0 },
    { x: lm.rightEye.x, y: lm.rightEye.y, dx: a, dy: 0 },
    { x: lm.nose.x, y: lm.nose.y, dx: 0, dy: a * 0.5 },
    { x: lm.mouthLeft.x, y: lm.mouthLeft.y, dx: -a * 0.6, dy: 0 },
    { x: lm.mouthRight.x, y: lm.mouthRight.y, dx: a * 0.6, dy: 0 },
  ];
}

function clampInt(v: number, hi: number): number {
  return v < 0 ? 0 : v > hi ? hi : v;
}

function sampleBilinear(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  fx: number,
  fy: number,
  out: Uint8ClampedArray,
  o: number,
): void {
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const tx = fx - x0;
  const ty = fy - y0;
  const cx0 = clampInt(x0, w - 1);
  const cx1 = clampInt(x0 + 1, w - 1);
  const cy0 = clampInt(y0, h - 1);
  const cy1 = clampInt(y0 + 1, h - 1);
  const i00 = (cy0 * w + cx0) * 4;
  const i10 = (cy0 * w + cx1) * 4;
  const i01 = (cy1 * w + cx0) * 4;
  const i11 = (cy1 * w + cx1) * 4;
  for (let ch = 0; ch < 4; ch++) {
    const top = data[i00 + ch] + (data[i10 + ch] - data[i00 + ch]) * tx;
    const bot = data[i01 + ch] + (data[i11 + ch] - data[i01 + ch]) * tx;
    out[o + ch] = top + (bot - top) * ty;
  }
}

/**
 * Warp a square image via a landmark-driven displacement field, resampled with
 * bilinear interpolation. Applied to the cropped square BEFORE the mosaic
 * downscale, so — unlike pixel noise — the geometry change survives averaging.
 */
export function warpImageData(src: ImageData, lm: FaceLandmarks, strength: number): ImageData {
  const { width: w, height: h, data } = src;
  const out = new Uint8ClampedArray(data.length);
  const ctrls = controls(lm, strength);

  for (let y = 0; y < h; y++) {
    const v = (y + 0.5) / h;
    for (let x = 0; x < w; x++) {
      const u = (x + 0.5) / w;
      let dx = 0;
      let dy = 0;
      for (const c of ctrls) {
        const ddx = u - c.x;
        const ddy = v - c.y;
        const weight = Math.exp(-(ddx * ddx + ddy * ddy) / TWO_R2);
        dx += c.dx * weight;
        dy += c.dy * weight;
      }
      const su = (u - dx) * w - 0.5;
      const sv = (v - dy) * h - 0.5;
      sampleBilinear(data, w, h, su, sv, out, (y * w + x) * 4);
    }
  }

  return new ImageData(out, w, h);
}
