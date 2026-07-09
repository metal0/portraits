import type { Cell, Crop, FaceLandmarks, SampledGrid } from "./types";
import { luminance } from "./luma";
import { clamp } from "./grid";
import { makeCanvas } from "./graphics";
import { warpImageData } from "./antifr/warp";

export interface WarpConfig {
  strength: number;
  landmarks: FaceLandmarks;
}

export interface SourceRect {
  sx: number;
  sy: number;
  side: number;
}

/**
 * The square region of the source image to sample, derived from the crop.
 * `scale` zooms in (>1 = tighter crop); `x`/`y` are the normalized center.
 */
export function computeSquareSourceRect(width: number, height: number, crop: Crop): SourceRect {
  const base = Math.min(width, height);
  const side = base / Math.max(1, crop.scale);
  const cx = crop.x * width;
  const cy = crop.y * height;
  const sx = clamp(cx - side / 2, 0, width - side);
  const sy = clamp(cy - side / 2, 0, height - side);
  return { sx, sy, side };
}

/**
 * Downscale the cropped square to gridSize×gridSize using high-quality
 * smoothing (box-averaging) and read back per-cell average color + luminance.
 */
export function sampleGrid(
  source: ImageBitmap,
  crop: Crop,
  gridSize: number,
  warp: WarpConfig | null = null,
): SampledGrid {
  const { sx, sy, side } = computeSquareSourceRect(source.width, source.height, crop);
  const { ctx } = makeCanvas(gridSize, gridSize);

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.clearRect(0, 0, gridSize, gridSize);

  if (warp) {
    // Warp the cropped square at intermediate resolution, then downscale — the
    // geometry shift has to happen before averaging to survive the mosaic.
    const mid = Math.max(128, Math.min(512, gridSize * 4));
    const { canvas: midCanvas, ctx: midCtx } = makeCanvas(mid, mid);
    midCtx.imageSmoothingEnabled = true;
    midCtx.imageSmoothingQuality = "high";
    midCtx.drawImage(source, sx, sy, side, side, 0, 0, mid, mid);
    midCtx.putImageData(warpImageData(midCtx.getImageData(0, 0, mid, mid), warp.landmarks, warp.strength), 0, 0);
    ctx.drawImage(midCanvas, 0, 0, mid, mid, 0, 0, gridSize, gridSize);
  } else {
    ctx.drawImage(source, sx, sy, side, side, 0, 0, gridSize, gridSize);
  }

  const { data } = ctx.getImageData(0, 0, gridSize, gridSize);
  const cells: Cell[] = new Array(gridSize * gridSize);

  for (let gy = 0; gy < gridSize; gy++) {
    for (let gx = 0; gx < gridSize; gx++) {
      const idx = (gy * gridSize + gx) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];
      cells[gy * gridSize + gx] = { gx, gy, r, g, b, a, luma: luminance(r, g, b) };
    }
  }

  return { size: gridSize, cells };
}
