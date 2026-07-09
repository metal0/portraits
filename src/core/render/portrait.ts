import type { RenderRequest, SampledGrid } from "../types";
import type { Ctx2D } from "../graphics";
import { sampleGrid, type WarpConfig } from "../sampling";
import { applyAdjustments } from "../adjust";
import { applyColor } from "../colorize";
import { applyOcclusion } from "../antifr/occlude";
import { applyCloak, isPhotoLike } from "../antifr/cloak";
import { renderSquare } from "./square";
import { renderDot } from "./dot";
import { renderRelief } from "./relief";
import { renderAscii } from "./ascii";
import { renderCmyk } from "./cmyk";

/** Sample → adjust → colorize → occlude. Shared by canvas render and SVG export. */
export function computeFrame(source: ImageBitmap, req: RenderRequest): SampledGrid {
  const { warp, occlusion, landmarks } = req.antiFr;
  const warpConfig: WarpConfig | null =
    warp.enabled && landmarks ? { strength: warp.strength, landmarks } : null;
  const adjusted = applyAdjustments(sampleGrid(source, req.crop, req.gridSize, warpConfig), req.adjust);
  const colored = applyColor(adjusted, req.color);
  return applyOcclusion(colored, occlusion, landmarks);
}

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

  const sample = computeFrame(source, req);

  if (req.renderMode === "dot") {
    renderDot(ctx, sample, req);
  } else if (req.renderMode === "relief") {
    renderRelief(ctx, sample, req);
  } else if (req.renderMode === "ascii") {
    renderAscii(ctx, sample, req);
  } else if (req.renderMode === "cmyk") {
    renderCmyk(ctx, sample, req);
  } else {
    renderSquare(ctx, sample, req);
  }

  const { cloak, landmarks } = req.antiFr;
  if (cloak.enabled && isPhotoLike(req.gridSize, req.color.mode)) {
    applyCloak(ctx, size, cloak, landmarks);
  }

  ctx.restore();
}
