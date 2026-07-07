import type { ColorSettings } from "./types";
import { hexToRgb, lerp, type RGB } from "./graphics";

export function nearestColor(r: number, g: number, b: number, palette: RGB[]): RGB {
  let best = palette[0] ?? [0, 0, 0];
  let bestDist = Infinity;
  for (const p of palette) {
    const dr = r - p[0];
    const dg = g - p[1];
    const db = b - p[2];
    const dist = dr * dr + dg * dg + db * db;
    if (dist < bestDist) {
      bestDist = dist;
      best = p;
    }
  }
  return best;
}

/**
 * Map a single pixel's color under the active color mode. `luma` is the
 * (pre-quantization) normalized luminance; `palette` is required for palette
 * mode and precomputed by the caller.
 */
export function quantize(
  r: number,
  g: number,
  b: number,
  luma: number,
  color: ColorSettings,
  palette: RGB[] | null,
): RGB {
  switch (color.mode) {
    case "grayscale": {
      const v = Math.round(luma * 255);
      return [v, v, v];
    }
    case "threshold":
      return luma > color.threshold ? [255, 255, 255] : [0, 0, 0];
    case "duotone": {
      const d = hexToRgb(color.duotoneDark);
      const l = hexToRgb(color.duotoneLight);
      return [
        Math.round(lerp(d[0], l[0], luma)),
        Math.round(lerp(d[1], l[1], luma)),
        Math.round(lerp(d[2], l[2], luma)),
      ];
    }
    case "palette":
      return palette && palette.length > 0 ? nearestColor(r, g, b, palette) : [r, g, b];
    case "full-color":
    default:
      return [r, g, b];
  }
}
