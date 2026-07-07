import type { AdjustSettings, Cell, SampledGrid } from "./types";
import { luminance } from "./luma";
import { clamp } from "./grid";

export const NEUTRAL_ADJUST: AdjustSettings = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  gamma: 1,
  posterize: 0,
  sharpen: 0,
};

function isNeutral(a: AdjustSettings): boolean {
  return (
    a.brightness === 0 &&
    a.contrast === 0 &&
    a.saturation === 0 &&
    a.gamma === 1 &&
    a.posterize === 0 &&
    a.sharpen === 0
  );
}

interface ToneParams {
  brightAdd: number;
  contrastFactor: number;
  gammaInv: number;
  satFactor: number;
  levels: number;
}

function toneParams(a: AdjustSettings): ToneParams {
  const c = a.contrast * 2.55;
  return {
    brightAdd: a.brightness * 2.55,
    contrastFactor: (259 * (c + 255)) / (255 * (259 - c)),
    gammaInv: 1 / a.gamma,
    satFactor: 1 + a.saturation / 100,
    levels: a.posterize >= 2 ? Math.round(a.posterize) : 0,
  };
}

function toneChannel(v: number, p: ToneParams): number {
  let out = v + p.brightAdd;
  out = p.contrastFactor * (out - 128) + 128;
  out = 255 * Math.pow(clamp(out, 0, 255) / 255, p.gammaInv);
  return out;
}

/**
 * Apply tone adjustments (and optional unsharp) to a sampled grid. Operates on
 * the low-res grid, which is cheap and matches the mosaic's resolution.
 */
export function applyAdjustments(sample: SampledGrid, a: AdjustSettings): SampledGrid {
  if (isNeutral(a)) return sample;

  const p = toneParams(a);
  const { size, cells } = sample;

  const toned: Array<[number, number, number]> = cells.map((c) => {
    let r = toneChannel(c.r, p);
    let g = toneChannel(c.g, p);
    let b = toneChannel(c.b, p);

    if (p.satFactor !== 1) {
      const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      r = gray + (r - gray) * p.satFactor;
      g = gray + (g - gray) * p.satFactor;
      b = gray + (b - gray) * p.satFactor;
    }

    if (p.levels > 0) {
      const step = 255 / (p.levels - 1);
      r = Math.round(r / step) * step;
      g = Math.round(g / step) * step;
      b = Math.round(b / step) * step;
    }

    return [clamp(r, 0, 255), clamp(g, 0, 255), clamp(b, 0, 255)];
  });

  const amount = a.sharpen / 100;
  const finalCells: Cell[] = cells.map((c, i) => {
    let [r, g, b] = toned[i];

    if (amount > 0) {
      const neighbors = [
        i - 1,
        i + 1,
        i - size,
        i + size,
      ].filter((n) => {
        if (n < 0 || n >= toned.length) return false;
        // Guard horizontal wrap.
        if (n === i - 1 && c.gx === 0) return false;
        if (n === i + 1 && c.gx === size - 1) return false;
        return true;
      });
      if (neighbors.length > 0) {
        let br = 0;
        let bg = 0;
        let bb = 0;
        for (const n of neighbors) {
          br += toned[n][0];
          bg += toned[n][1];
          bb += toned[n][2];
        }
        br /= neighbors.length;
        bg /= neighbors.length;
        bb /= neighbors.length;
        r = clamp(r + amount * (r - br), 0, 255);
        g = clamp(g + amount * (g - bg), 0, 255);
        b = clamp(b + amount * (b - bb), 0, 255);
      }
    }

    const rr = Math.round(r);
    const gg = Math.round(g);
    const bb2 = Math.round(b);
    return { ...c, r: rr, g: gg, b: bb2, luma: luminance(rr, gg, bb2) };
  });

  return { size, cells: finalCells };
}

/**
 * Derive brightness/contrast/saturation that stretch the current luminance
 * range to full scale (a contrast-stretch auto-enhance).
 */
export function computeAutoAdjust(sample: SampledGrid): Pick<AdjustSettings, "brightness" | "contrast" | "saturation"> {
  const lumas = sample.cells.map((c) => c.luma * 255).sort((x, y) => x - y);
  const n = lumas.length;
  if (n === 0) return { brightness: 0, contrast: 0, saturation: 0 };

  const lo = lumas[Math.floor(n * 0.02)];
  const hi = lumas[Math.min(n - 1, Math.floor(n * 0.98))];
  if (hi - lo < 1) return { brightness: 0, contrast: 0, saturation: 10 };

  const factor = 255 / (hi - lo);
  const C = (255 * 259 * (factor - 1)) / (259 + 255 * factor);
  const contrast = clamp(C / 2.55, -100, 100);

  const mid = (lo + hi) / 2;
  const brightness = clamp((128 - mid) / 2.55, -100, 100);

  return {
    brightness: Math.round(brightness),
    contrast: Math.round(contrast),
    saturation: 10,
  };
}
