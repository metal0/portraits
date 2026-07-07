import type { Cell, ColorSettings } from "./types";
import { hexToRgb, lerp, type RGB } from "./graphics";

function nearestPaletteColor(cell: Cell, palette: RGB[]): RGB {
  let best = palette[0];
  let bestDist = Infinity;
  for (const p of palette) {
    const dr = cell.r - p[0];
    const dg = cell.g - p[1];
    const db = cell.b - p[2];
    const dist = dr * dr + dg * dg + db * db;
    if (dist < bestDist) {
      bestDist = dist;
      best = p;
    }
  }
  return best;
}

/** Resolve the display color of a cell under the active color mode. */
export function resolveCellColor(cell: Cell, color: ColorSettings): RGB {
  switch (color.mode) {
    case "grayscale": {
      const v = Math.round(cell.luma * 255);
      return [v, v, v];
    }
    case "threshold":
      return cell.luma > color.threshold ? [255, 255, 255] : [0, 0, 0];
    case "duotone": {
      const d = hexToRgb(color.duotoneDark);
      const l = hexToRgb(color.duotoneLight);
      return [
        Math.round(lerp(d[0], l[0], cell.luma)),
        Math.round(lerp(d[1], l[1], cell.luma)),
        Math.round(lerp(d[2], l[2], cell.luma)),
      ];
    }
    case "palette": {
      if (color.customPalette.length > 0) {
        return nearestPaletteColor(cell, color.customPalette.map(hexToRgb));
      }
      return [cell.r, cell.g, cell.b];
    }
    case "full-color":
    default:
      return [cell.r, cell.g, cell.b];
  }
}
