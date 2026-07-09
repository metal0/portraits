import type { CloakField, ColorMode } from "../types";
import type { Ctx2D } from "../graphics";

/**
 * The cloak is a perturbation field — it only means anything on output that
 * hasn't already been destroyed by the mosaic. So it's gated to a fine,
 * full-color render; anywhere coarser, averaging + quantization erase it.
 */
export function isPhotoLike(gridSize: number, colorMode: ColorMode): boolean {
  return gridSize >= 96 && colorMode === "full-color";
}

function clamp8(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}

/**
 * Add a low-resolution RGB perturbation field (nearest-neighbour upsampled) to
 * RGBA pixels in place, skipping transparent ones. Shared by the optimizer and
 * the live render so the measured and displayed images are identical.
 */
export function addField(data: Uint8ClampedArray, w: number, h: number, field: CloakField): void {
  const n = field.size;
  for (let y = 0; y < h; y++) {
    const fy = Math.min(n - 1, (y * n / h) | 0);
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (data[i + 3] === 0) continue;
      const fx = Math.min(n - 1, (x * n / w) | 0);
      const c = (fy * n + fx) * 3;
      data[i] = clamp8(data[i] + field.data[c]);
      data[i + 1] = clamp8(data[i + 1] + field.data[c + 1]);
      data[i + 2] = clamp8(data[i + 2] + field.data[c + 2]);
    }
  }
}

/** Apply a baked cloak field to the rendered canvas. */
export function applyCloak(ctx: Ctx2D, size: number, field: CloakField): void {
  const img = ctx.getImageData(0, 0, size, size);
  addField(img.data, size, size, field);
  ctx.putImageData(img, 0, 0);
}
