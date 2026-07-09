import type { CloakOptions, ColorMode, FaceLandmarks } from "../types";
import type { Ctx2D } from "../graphics";

/**
 * The cloak is high-frequency pixel texture — it only means anything on output
 * that hasn't already been destroyed by the mosaic. So it's gated to a fine,
 * full-color render; anywhere coarser, averaging + quantization erase it.
 */
export function isPhotoLike(gridSize: number, colorMode: ColorMode): boolean {
  return gridSize >= 96 && colorMode === "full-color";
}

function clamp8(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}

/** Sum of Gaussian bumps at the identity-dense points; 1.0 baseline elsewhere. */
function featureWeight(u: number, v: number, lm: FaceLandmarks | null): number {
  if (!lm) return 1;
  const pts = [lm.leftEye, lm.rightEye, lm.nose, lm.mouthLeft, lm.mouthRight];
  let w = 0.25;
  for (const p of pts) {
    const dx = u - p.x;
    const dy = v - p.y;
    w += Math.exp(-(dx * dx + dy * dy) / (2 * 0.1 * 0.1));
  }
  return Math.min(1.5, w);
}

/**
 * Experimental adversarial-style cloak: a deterministic, high-frequency,
 * channel-varying perturbation concentrated on the feature regions an FR
 * embedding is most sensitive to. Not a trained attack — its effect (if any)
 * shows up directly in the match meter, which measures the cloaked output.
 */
export function applyCloak(
  ctx: Ctx2D,
  size: number,
  opts: CloakOptions,
  lm: FaceLandmarks | null,
): void {
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  const amp = opts.strength * 18;

  for (let y = 0; y < size; y++) {
    const v = (y + 0.5) / size;
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      if (d[i + 3] === 0) continue;
      const hash = ((x * 928371 + y * 1237) ^ (x * 13 + y * 7)) & 7;
      const sign = (hash - 3.5) / 3.5;
      const delta = amp * sign * featureWeight((x + 0.5) / size, v, lm);
      d[i] = clamp8(d[i] + delta);
      d[i + 1] = clamp8(d[i + 1] - delta * 0.7);
      d[i + 2] = clamp8(d[i + 2] + delta * 0.5);
    }
  }

  ctx.putImageData(img, 0, 0);
}
