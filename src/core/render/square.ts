import type { RenderRequest, SampledGrid } from "../types";
import type { Ctx2D } from "../graphics";

const ALPHA_CUTOFF = 8;

export function renderSquare(ctx: Ctx2D, sample: SampledGrid, req: RenderRequest): void {
  const cellSize = req.outputSizePx / sample.size;
  const { gap, cornerRadius, outline, outlineColor } = req.square;

  // Integer, cell-relative gap keeps block edges on whole pixels (crisp).
  const gapPx = Math.round(gap * cellSize);
  const halfGap = Math.floor(gapPx / 2);
  const size = cellSize - gapPx;
  const radius = cornerRadius * size;

  ctx.lineWidth = Math.max(1, cellSize * 0.04);

  if (size <= 0) return;

  for (const cell of sample.cells) {
    if (cell.a < ALPHA_CUTOFF) continue;

    const x = cell.gx * cellSize + halfGap;
    const y = cell.gy * cellSize + halfGap;

    ctx.fillStyle = `rgb(${cell.r}, ${cell.g}, ${cell.b})`;

    if (radius > 0) {
      ctx.beginPath();
      ctx.roundRect(x, y, size, size, Math.min(radius, size / 2));
      ctx.fill();
      if (outline) {
        ctx.strokeStyle = outlineColor;
        ctx.stroke();
      }
    } else {
      ctx.fillRect(x, y, size, size);
      if (outline) {
        ctx.strokeStyle = outlineColor;
        ctx.strokeRect(x, y, size, size);
      }
    }
  }
}
