import type { DotShape, RenderRequest, SampledGrid } from "../types";
import type { Ctx2D } from "../graphics";

const ALPHA_CUTOFF = 8;

function drawShape(ctx: Ctx2D, shape: DotShape, cx: number, cy: number, radius: number): void {
  switch (shape) {
    case "square":
      ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
      break;
    case "diamond":
      ctx.beginPath();
      ctx.moveTo(cx, cy - radius);
      ctx.lineTo(cx + radius, cy);
      ctx.lineTo(cx, cy + radius);
      ctx.lineTo(cx - radius, cy);
      ctx.closePath();
      ctx.fill();
      break;
    case "circle":
    default:
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();
      break;
  }
}

export function renderDot(ctx: Ctx2D, sample: SampledGrid, req: RenderRequest): void {
  const cellSize = req.outputSizePx / sample.size;
  const { dotShape, invert, minDotScale, maxDotScale } = req.dot;
  const maxRadius = cellSize * 0.5 * maxDotScale;
  const minRadius = cellSize * 0.5 * minDotScale;

  for (const cell of sample.cells) {
    if (cell.a < ALPHA_CUTOFF) continue;

    const darkness = invert ? cell.luma : 1 - cell.luma;
    const radius = minRadius + (maxRadius - minRadius) * darkness;
    if (radius <= 0.25) continue;

    const cx = (cell.gx + 0.5) * cellSize;
    const cy = (cell.gy + 0.5) * cellSize;

    ctx.fillStyle = `rgb(${cell.r}, ${cell.g}, ${cell.b})`;
    drawShape(ctx, dotShape, cx, cy, radius);
  }
}
