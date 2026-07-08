import type { RenderRequest, SampledGrid } from "../types";
import type { Ctx2D } from "../graphics";

const ALPHA_CUTOFF = 8;
const FONT_STACK = 'ui-monospace, "Cascadia Code", "SF Mono", Menlo, monospace';

export const ASCII_RAMPS: { name: string; ramp: string }[] = [
  { name: "Standard", ramp: "@%#*+=-:. " },
  { name: "Blocks", ramp: "█▓▒░ " },
  { name: "Minimal", ramp: "#=-. " },
  { name: "Dense", ramp: "$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,\"^`'. " },
];

/** Each cell becomes a monospace glyph chosen by brightness, in the cell color. */
export function renderAscii(ctx: Ctx2D, sample: SampledGrid, req: RenderRequest): void {
  const cellSize = req.outputSizePx / sample.size;
  const ramp = req.ascii.ramp.length > 0 ? req.ascii.ramp : "@%#*+=-:. ";
  const last = ramp.length - 1;

  ctx.font = `${(cellSize * 1.15).toFixed(2)}px ${FONT_STACK}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (const cell of sample.cells) {
    if (cell.a < ALPHA_CUTOFF) continue;
    const ch = ramp[Math.min(last, Math.max(0, Math.round(cell.luma * last)))];
    if (ch === " " || ch === "") continue;
    ctx.fillStyle = `rgb(${cell.r}, ${cell.g}, ${cell.b})`;
    ctx.fillText(ch, (cell.gx + 0.5) * cellSize, (cell.gy + 0.55) * cellSize);
  }
}
