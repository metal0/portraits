import type { Cell, ColorSettings, SampledGrid } from "./types";
import { hexToRgb, type RGB } from "./graphics";
import { luminance } from "./luma";
import { quantize, nearestColor } from "./color";
import { medianCut } from "./palette";

const BW: RGB[] = [
  [0, 0, 0],
  [255, 255, 255],
];

function buildPalette(sample: SampledGrid, color: ColorSettings): RGB[] | null {
  if (color.mode !== "palette") return null;
  if (color.paletteSource === "custom" && color.customPalette.length > 0) {
    return color.customPalette.map(hexToRgb);
  }
  return medianCut(sample.cells, color.paletteSize);
}

function dithers(color: ColorSettings): boolean {
  return (
    color.dither === "floyd-steinberg" &&
    (color.mode === "palette" || color.mode === "threshold")
  );
}

/**
 * Produce final per-cell display colors for the active color mode. Cell
 * luminance is preserved (adjusted tone), only rgb changes — so brightness-
 * driven modes (dot/relief) still respond to the toned image.
 */
export function applyColor(sample: SampledGrid, color: ColorSettings): SampledGrid {
  const palette = buildPalette(sample, color);

  if (!dithers(color)) {
    const cells = sample.cells.map((c) => {
      const [r, g, b] = quantize(c.r, c.g, c.b, c.luma, color, palette);
      return { ...c, r, g, b };
    });
    return { size: sample.size, cells };
  }

  return floydSteinberg(sample, color, color.mode === "palette" ? palette ?? BW : BW);
}

function floydSteinberg(sample: SampledGrid, _color: ColorSettings, palette: RGB[]): SampledGrid {
  const { size, cells } = sample;
  const rf = Float32Array.from(cells, (c) => c.r);
  const gf = Float32Array.from(cells, (c) => c.g);
  const bf = Float32Array.from(cells, (c) => c.b);
  const out: Cell[] = new Array(cells.length);

  const add = (x: number, y: number, er: number, eg: number, eb: number, w: number) => {
    if (x < 0 || x >= size || y < 0 || y >= size) return;
    const i = y * size + x;
    rf[i] += er * w;
    gf[i] += eg * w;
    bf[i] += eb * w;
  };

  for (let y = 0; y < size; y++) {
    const ltr = y % 2 === 0;
    for (let k = 0; k < size; k++) {
      const x = ltr ? k : size - 1 - k;
      const i = y * size + x;
      const r = Math.max(0, Math.min(255, rf[i]));
      const g = Math.max(0, Math.min(255, gf[i]));
      const b = Math.max(0, Math.min(255, bf[i]));
      const [nr, ng, nb] = nearestColor(r, g, b, palette);
      out[i] = { ...cells[i], r: nr, g: ng, b: nb, luma: luminance(nr, ng, nb) };

      const er = r - nr;
      const eg = g - ng;
      const eb = b - nb;
      const fwd = ltr ? 1 : -1;
      add(x + fwd, y, er, eg, eb, 7 / 16);
      add(x - fwd, y + 1, er, eg, eb, 3 / 16);
      add(x, y + 1, er, eg, eb, 5 / 16);
      add(x + fwd, y + 1, er, eg, eb, 1 / 16);
    }
  }

  return { size, cells: out };
}
