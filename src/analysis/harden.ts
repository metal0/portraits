import type { RenderRequest } from "@/core/types";
import { renderPortrait } from "@/core/render/portrait";
import { planRender } from "@/core/grid";
import { analyzeFace, faceDistance, SAME_PERSON_DISTANCE } from "./faceApi";

export interface HardenResult {
  /** Coarsest grid tried (or the first that defeats matching). */
  grid: number;
  /** Descriptor distance at that grid; Infinity if undetected. */
  distance: number;
  detected: boolean;
  /** True if matching was actually defeated (undetected or past the cutoff). */
  defeated: boolean;
}

/**
 * Search from the current grid toward coarser grids, rendering each candidate
 * off-screen and measuring it against the baseline, until the face is no longer
 * matchable (undetected or distance ≥ the same-person cutoff) or the floor is
 * reached. Returns the chosen grid; the caller applies it as an override.
 */
export async function hardenGrid(
  source: ImageBitmap,
  baseline: Float32Array,
  baseReq: RenderRequest,
  startGrid: number,
  minGrid: number,
  displaySizePx: number,
  outputSizePx: number,
): Promise<HardenResult | null> {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  let last: HardenResult | null = null;
  for (let g = startGrid; g >= minGrid; g -= Math.max(1, Math.round(g * 0.12))) {
    // Render each candidate at the same previewPx the match meter measures, so
    // "defeated" here means defeated in what the user actually sees.
    const px = planRender(g, displaySizePx, outputSizePx).previewPx;
    canvas.width = px;
    canvas.height = px;
    const req: RenderRequest = { ...baseReq, gridSize: g, outputSizePx: px };
    renderPortrait(ctx, source, req);
    const res = await analyzeFace(canvas);
    const detected = res !== null;
    const distance = res ? faceDistance(baseline, res.descriptor) : Infinity;
    const defeated = !detected || distance >= SAME_PERSON_DISTANCE;
    last = { grid: g, distance, detected, defeated };
    if (defeated) return last;
  }
  return last;
}
