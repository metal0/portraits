import type { RenderRequest, SampledGrid } from "../types";
import type { Ctx2D } from "../graphics";

const ALPHA_CUTOFF = 8;

interface Channel {
  color: string;
  angleDeg: number;
  coverage: (r: number, g: number, b: number) => number;
}

const CHANNELS: Channel[] = [
  { color: "rgb(0,174,239)", angleDeg: 15, coverage: (r) => 1 - r / 255 },
  { color: "rgb(236,0,140)", angleDeg: 75, coverage: (_r, g) => 1 - g / 255 },
  { color: "rgb(255,242,0)", angleDeg: 0, coverage: (_r, _g, b) => 1 - b / 255 },
  { color: "rgb(0,0,0)", angleDeg: 45, coverage: (r, g, b) => 1 - Math.max(r, g, b) / 255 },
];

/**
 * CMYK-ish halftone: four dot screens (C/M/Y/K), each dot sized by that
 * channel's coverage and offset along its screen angle to form the classic
 * rosette, multiplied over white "paper".
 */
export function renderCmyk(ctx: Ctx2D, sample: SampledGrid, req: RenderRequest): void {
  const out = req.outputSizePx;
  const cellSize = out / sample.size;
  const maxR = cellSize * 0.62;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, out, out);

  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  for (const ch of CHANNELS) {
    const a = (ch.angleDeg * Math.PI) / 180;
    const ox = Math.cos(a) * cellSize * 0.2;
    const oy = Math.sin(a) * cellSize * 0.2;
    ctx.fillStyle = ch.color;
    for (const cell of sample.cells) {
      if (cell.a < ALPHA_CUTOFF) continue;
      const v = ch.coverage(cell.r, cell.g, cell.b);
      if (v <= 0.02) continue;
      const radius = maxR * Math.sqrt(v);
      ctx.beginPath();
      ctx.arc((cell.gx + 0.5) * cellSize + ox, (cell.gy + 0.5) * cellSize + oy, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}
