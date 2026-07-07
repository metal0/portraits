import type { RenderRequest, SampledGrid } from "../types";
import type { Ctx2D } from "../graphics";
import { resolveCellColor } from "../color";

const ALPHA_CUTOFF = 8;

export function renderSquare(ctx: Ctx2D, sample: SampledGrid, req: RenderRequest): void {
  const cellSize = req.outputSizePx / sample.size;
  const { tileGapPx, roundedCornersPx, outline, outlineColor } = req.square;

  ctx.lineWidth = Math.max(1, cellSize * 0.04);

  for (const cell of sample.cells) {
    if (cell.a < ALPHA_CUTOFF) continue;

    const [r, g, b] = resolveCellColor(cell, req.color);
    const x = cell.gx * cellSize + tileGapPx / 2;
    const y = cell.gy * cellSize + tileGapPx / 2;
    const size = cellSize - tileGapPx;
    if (size <= 0) continue;

    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;

    if (roundedCornersPx > 0) {
      const radius = Math.min(roundedCornersPx, size / 2);
      ctx.beginPath();
      ctx.roundRect(x, y, size, size, radius);
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
