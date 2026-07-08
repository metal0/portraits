import { makeCanvas } from "./graphics";

export interface FrameBox {
  cx: number;
  cy: number;
  s: number;
}

/**
 * Pick a square crop around the most salient region — no ML. Builds a small
 * edge-energy map (with a mild skin-tone boost), then centers a square on the
 * energy-weighted centroid, sized to its spread and nudged slightly upward
 * (faces sit high). All in source-pixel space.
 */
export function autoFrame(source: ImageBitmap): FrameBox {
  const w = source.width;
  const h = source.height;
  const minDim = Math.min(w, h);
  const minSide = Math.max(16, minDim * 0.15);

  const gw = 96;
  const gh = Math.max(1, Math.round((gw * h) / w));
  const { ctx } = makeCanvas(gw, gh);
  ctx.drawImage(source, 0, 0, gw, gh);
  const data = ctx.getImageData(0, 0, gw, gh).data;

  const lum = new Float32Array(gw * gh);
  for (let i = 0; i < gw * gh; i++) {
    const p = i * 4;
    lum[i] = 0.2126 * data[p] + 0.7152 * data[p + 1] + 0.0722 * data[p + 2];
  }

  const kx = w / gw;
  const ky = h / gh;

  let sw = 0;
  let mx = 0;
  let my = 0;
  const energy = new Float32Array(gw * gh);
  for (let y = 1; y < gh - 1; y++) {
    for (let x = 1; x < gw - 1; x++) {
      const i = y * gw + x;
      const gx = Math.abs(lum[i + 1] - lum[i - 1]);
      const gy = Math.abs(lum[i + gw] - lum[i - gw]);
      const p = i * 4;
      const r = data[p];
      const g = data[p + 1];
      const b = data[p + 2];
      const skin = r > g && g > b && r - b > 18 && r - b < 130 ? 10 : 0;
      const e = gx + gy + skin;
      energy[i] = e;
      sw += e;
      mx += e * (x + 0.5) * kx;
      my += e * (y + 0.5) * ky;
    }
  }

  if (sw === 0) {
    return { cx: w / 2, cy: h / 2, s: minDim };
  }

  mx /= sw;
  my /= sw;

  let vx = 0;
  let vy = 0;
  for (let y = 1; y < gh - 1; y++) {
    for (let x = 1; x < gw - 1; x++) {
      const i = y * gw + x;
      const e = energy[i];
      vx += e * ((x + 0.5) * kx - mx) ** 2;
      vy += e * ((y + 0.5) * ky - my) ** 2;
    }
  }
  const spread = Math.sqrt(Math.max(vx, vy) / sw);
  const s = clampNum(spread * 3.4, minSide, minDim);
  const cx = clampNum(mx, s / 2, w - s / 2);
  const cy = clampNum(my - h * 0.04, s / 2, h - s / 2);
  return { cx, cy, s };
}

function clampNum(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}
