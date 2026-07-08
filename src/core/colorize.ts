import type { Cell, ColorSettings, SampledGrid } from "./types";
import { hexToRgb, type RGB } from "./graphics";
import { luminance } from "./luma";
import { quantize, nearestColor } from "./color";
import { medianCut } from "./palette";
import { toOklab, type Oklab } from "./oklab";

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

function ditherApplies(color: ColorSettings): boolean {
  return color.dither !== "none" && (color.mode === "palette" || color.mode === "threshold");
}

// 8×8 Bayer threshold matrix, normalized to [-0.5, 0.5).
const BAYER8 = [
  [0, 32, 8, 40, 2, 34, 10, 42],
  [48, 16, 56, 24, 50, 18, 58, 26],
  [12, 44, 4, 36, 14, 46, 6, 38],
  [60, 28, 52, 20, 62, 30, 54, 22],
  [3, 35, 11, 43, 1, 33, 9, 41],
  [51, 19, 59, 27, 49, 17, 57, 25],
  [15, 47, 7, 39, 13, 45, 5, 37],
  [63, 31, 55, 23, 61, 29, 53, 21],
].map((row) => row.map((v) => (v + 0.5) / 64 - 0.5));

/**
 * Produce final per-cell display colors for the active color mode. Cell
 * luminance is preserved (adjusted tone), only rgb changes — so brightness-
 * driven modes (dot/relief) still respond to the toned image.
 */
export function applyColor(sample: SampledGrid, color: ColorSettings): SampledGrid {
  const palette = buildPalette(sample, color);
  const paletteLab = palette ? toOklab(palette) : undefined;

  if (!ditherApplies(color)) {
    const cells = sample.cells.map((c) => {
      const [r, g, b] = quantize(c.r, c.g, c.b, c.luma, color, palette, paletteLab);
      return { ...c, r, g, b };
    });
    return { size: sample.size, cells };
  }

  const dPalette = color.mode === "palette" ? palette ?? BW : BW;
  const dLab = color.mode === "palette" ? paletteLab : undefined;
  return color.dither === "bayer"
    ? orderedDither(sample, color, dPalette, dLab)
    : floydSteinberg(sample, dPalette, dLab);
}

/** Ordered (Bayer) dithering — a fixed screen, no error diffusion. */
function orderedDither(
  sample: SampledGrid,
  color: ColorSettings,
  palette: RGB[],
  paletteLab?: Oklab[],
): SampledGrid {
  const { size, cells } = sample;
  const spread = 132 / Math.sqrt(palette.length);
  const cellsOut = cells.map((c) => {
    const t = BAYER8[c.gy & 7][c.gx & 7];
    if (color.mode === "threshold") {
      const on = c.luma + t * 0.7 > color.threshold;
      const v = on ? 255 : 0;
      return { ...c, r: v, g: v, b: v, luma: on ? 1 : 0 };
    }
    const off = t * spread;
    const [nr, ng, nb] = nearestColor(
      Math.max(0, Math.min(255, c.r + off)),
      Math.max(0, Math.min(255, c.g + off)),
      Math.max(0, Math.min(255, c.b + off)),
      palette,
      paletteLab,
    );
    return { ...c, r: nr, g: ng, b: nb, luma: luminance(nr, ng, nb) };
  });
  return { size, cells: cellsOut };
}

function floydSteinberg(sample: SampledGrid, palette: RGB[], paletteLab?: Oklab[]): SampledGrid {
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
      const [nr, ng, nb] = nearestColor(r, g, b, palette, paletteLab);
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
