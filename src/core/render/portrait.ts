import type { RenderRequest } from "../types";
import type { Ctx2D } from "../graphics";
import { sampleGrid } from "../sampling";
import { applyAdjustments } from "../adjust";
import { renderSquare } from "./square";
import { renderDot } from "./dot";

/**
 * Render one complete portrait frame into `ctx`. The context's canvas is
 * expected to be `req.outputSizePx` square. Pure w.r.t. the source image.
 */
export function renderPortrait(ctx: Ctx2D, source: ImageBitmap, req: RenderRequest): void {
  const size = req.outputSizePx;

  ctx.save();
  ctx.clearRect(0, 0, size, size);

  if (req.exportSettings.circularMask) {
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.clip();
  }

  if (!req.exportSettings.transparentBackground) {
    ctx.fillStyle = req.exportSettings.backgroundColor;
    ctx.fillRect(0, 0, size, size);
  }

  const sample = applyAdjustments(sampleGrid(source, req.crop, req.gridSize), req.adjust);

  if (req.renderMode === "dot") {
    renderDot(ctx, sample, req);
  } else {
    renderSquare(ctx, sample, req);
  }

  ctx.restore();
}
