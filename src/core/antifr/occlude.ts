import type { FaceLandmarks, OcclusionOptions, SampledGrid } from "../types";
import { luminance } from "../luma";

interface Band {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** Deterministic PRNG so scrambling is stable across renders and exports. */
function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The normalized band (in crop-square coords) to occlude. Uses landmarks when
 * available; otherwise falls back to a default eye line — faces framed by
 * autoFrame sit slightly above center.
 */
function occlusionBand(opts: OcclusionOptions, lm: FaceLandmarks | null): Band {
  const half = 0.05 + opts.strength * 0.1;
  if (lm) {
    const cy = (lm.leftEye.y + lm.rightEye.y) / 2;
    const exMin = Math.min(lm.leftEye.x, lm.rightEye.x);
    const exMax = Math.max(lm.leftEye.x, lm.rightEye.x);
    const padX = 0.12;
    const bottom = opts.region === "eyes-nose" ? Math.max(cy + half, lm.nose.y + half * 0.5) : cy + half;
    return { x0: clamp01(exMin - padX), y0: clamp01(cy - half), x1: clamp01(exMax + padX), y1: clamp01(bottom) };
  }
  const cy = 0.4;
  const bottom = opts.region === "eyes-nose" ? cy + half + 0.12 : cy + half;
  return { x0: 0.14, y0: clamp01(cy - half), x1: 0.86, y1: clamp01(bottom) };
}

/**
 * Occlude the identity-dense feature band (eyes, optionally down to the nose)
 * at the grid/cell level, so it flows through every render mode and lands in
 * both the canvas preview and the SVG/PNG export. Pure: returns a new grid.
 */
export function applyOcclusion(
  sample: SampledGrid,
  opts: OcclusionOptions,
  lm: FaceLandmarks | null,
): SampledGrid {
  if (!opts.enabled) return sample;
  const { size } = sample;
  const band = occlusionBand(opts, lm);
  const cx0 = Math.max(0, Math.floor(band.x0 * size));
  const cx1 = Math.min(size, Math.ceil(band.x1 * size));
  const cy0 = Math.max(0, Math.floor(band.y0 * size));
  const cy1 = Math.min(size, Math.ceil(band.y1 * size));
  if (cx1 <= cx0 || cy1 <= cy0) return sample;

  const cells = sample.cells.map((c) => ({ ...c }));
  const inBand = (gx: number, gy: number): boolean => gx >= cx0 && gx < cx1 && gy >= cy0 && gy < cy1;

  if (opts.style === "bar") {
    for (const c of cells) {
      if (inBand(c.gx, c.gy)) {
        c.r = 0;
        c.g = 0;
        c.b = 0;
        c.luma = 0;
      }
    }
    return { size, cells };
  }

  if (opts.style === "scramble") {
    const idx: number[] = [];
    for (let i = 0; i < cells.length; i++) if (inBand(cells[i].gx, cells[i].gy)) idx.push(i);
    const colors = idx.map((i) => [cells[i].r, cells[i].g, cells[i].b] as [number, number, number]);
    const rand = mulberry32(0x9e3779b1 ^ idx.length);
    for (let i = colors.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      const t = colors[i];
      colors[i] = colors[j];
      colors[j] = t;
    }
    idx.forEach((cellIndex, k) => {
      const [r, g, b] = colors[k];
      cells[cellIndex].r = r;
      cells[cellIndex].g = g;
      cells[cellIndex].b = b;
      cells[cellIndex].luma = luminance(r, g, b);
    });
    return { size, cells };
  }

  // pixelate: coarsen the band into larger blocks, erasing feature detail.
  const block = Math.max(2, Math.round(2 + opts.strength * 5));
  for (let by = cy0; by < cy1; by += block) {
    for (let bx = cx0; bx < cx1; bx += block) {
      const yEnd = Math.min(by + block, cy1);
      const xEnd = Math.min(bx + block, cx1);
      let r = 0;
      let g = 0;
      let b = 0;
      let n = 0;
      for (let y = by; y < yEnd; y++) {
        for (let x = bx; x < xEnd; x++) {
          const c = cells[y * size + x];
          r += c.r;
          g += c.g;
          b += c.b;
          n++;
        }
      }
      if (n === 0) continue;
      r = Math.round(r / n);
      g = Math.round(g / n);
      b = Math.round(b / n);
      const lu = luminance(r, g, b);
      for (let y = by; y < yEnd; y++) {
        for (let x = bx; x < xEnd; x++) {
          const c = cells[y * size + x];
          c.r = r;
          c.g = g;
          c.b = b;
          c.luma = lu;
        }
      }
    }
  }
  return { size, cells };
}
