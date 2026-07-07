import type { Cell } from "./types";
import type { RGB } from "./graphics";

/** Median-cut color quantization: derive an n-color palette from cells. */
export function medianCut(cells: Cell[], n: number): RGB[] {
  if (cells.length === 0) return [[0, 0, 0]];
  const target = Math.max(1, Math.min(n, 256));

  let boxes: RGB[][] = [cells.map((c) => [c.r, c.g, c.b] as RGB)];

  while (boxes.length < target) {
    let widestIdx = -1;
    let widestRange = -1;
    for (let i = 0; i < boxes.length; i++) {
      const box = boxes[i];
      if (box.length < 2) continue;
      const range = channelRanges(box);
      const maxRange = Math.max(range[0], range[1], range[2]);
      if (maxRange > widestRange) {
        widestRange = maxRange;
        widestIdx = i;
      }
    }
    if (widestIdx < 0) break;

    const box = boxes[widestIdx];
    const ranges = channelRanges(box);
    const ch = ranges.indexOf(Math.max(ranges[0], ranges[1], ranges[2]));
    box.sort((a, b) => a[ch] - b[ch]);
    const mid = box.length >> 1;
    boxes.splice(widestIdx, 1, box.slice(0, mid), box.slice(mid));
  }

  return boxes.filter((b) => b.length > 0).map(averageColor);
}

function channelRanges(box: RGB[]): [number, number, number] {
  let rMin = 255;
  let gMin = 255;
  let bMin = 255;
  let rMax = 0;
  let gMax = 0;
  let bMax = 0;
  for (const [r, g, b] of box) {
    if (r < rMin) rMin = r;
    if (g < gMin) gMin = g;
    if (b < bMin) bMin = b;
    if (r > rMax) rMax = r;
    if (g > gMax) gMax = g;
    if (b > bMax) bMax = b;
  }
  return [rMax - rMin, gMax - gMin, bMax - bMin];
}

function averageColor(box: RGB[]): RGB {
  let r = 0;
  let g = 0;
  let b = 0;
  for (const c of box) {
    r += c[0];
    g += c[1];
    b += c[2];
  }
  const n = box.length;
  return [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
}

export interface PalettePreset {
  name: string;
  colors: string[];
}

export const PALETTE_PRESETS: PalettePreset[] = [
  { name: "1-bit", colors: ["#000000", "#ffffff"] },
  { name: "Grayscale", colors: ["#000000", "#555555", "#aaaaaa", "#ffffff"] },
  { name: "Game Boy", colors: ["#0f380f", "#306230", "#8bac0f", "#9bbc0f"] },
  {
    name: "Minecraft",
    colors: [
      "#ffffff", "#d87f33", "#b24cd8", "#6699d8",
      "#e5e533", "#7fcc19", "#f27fa5", "#4c4c4c",
      "#999999", "#4c7f99", "#7f3fb2", "#334cb2",
      "#664c33", "#667f33", "#993333", "#191919",
    ],
  },
];
