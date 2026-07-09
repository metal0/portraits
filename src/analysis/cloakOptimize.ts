import type { CloakField, RenderRequest } from "@/core/types";
import { renderPortrait } from "@/core/render/portrait";
import { planRender } from "@/core/grid";
import { addField } from "@/core/antifr/cloak";
import { analyzeFace, faceDistance } from "./faceApi";

const FIELD = 14;
const ITERS = 26;
const UNDETECTED_DISTANCE = 2;

/**
 * Black-box SPSA search for a subtle perturbation field that maximizes the
 * bundled model's descriptor distance from the baseline. Uses the model itself
 * as the oracle (no gradients), so it provably moves the measured score rather
 * than hoping fixed noise helps. ~2 inferences per iteration.
 */
export async function optimizeCloak(
  source: ImageBitmap,
  baseline: Float32Array,
  baseReq: RenderRequest,
  strength: number,
  displaySizePx: number,
  outputSizePx: number,
): Promise<CloakField | null> {
  const px = planRender(baseReq.gridSize, displaySizePx, outputSizePx).previewPx;
  const canvas = document.createElement("canvas");
  canvas.width = px;
  canvas.height = px;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  // Render the current look once, with no cloak, as the fixed base image.
  const req: RenderRequest = {
    ...baseReq,
    outputSizePx: px,
    antiFr: { ...baseReq.antiFr, cloak: { ...baseReq.antiFr.cloak, enabled: false }, cloakField: null },
  };
  renderPortrait(ctx, source, req);
  const base = ctx.getImageData(0, 0, px, px);

  const dim = FIELD * FIELD * 3;
  const budget = 8 + strength * 42;
  const clip = (v: number): number => (v < -budget ? -budget : v > budget ? budget : v);

  const evalDist = async (data: Float32Array): Promise<number> => {
    const img = new ImageData(new Uint8ClampedArray(base.data), px, px);
    addField(img.data, px, px, { data, size: FIELD });
    ctx.putImageData(img, 0, 0);
    const res = await analyzeFace(canvas);
    return res ? faceDistance(baseline, res.descriptor) : UNDETECTED_DISTANCE;
  };

  const f = new Float32Array(dim);
  let best = f.slice();
  let bestDist = await evalDist(f);

  const a = budget * 0.6;
  const c = budget * 0.5;
  for (let k = 0; k < ITERS; k++) {
    const delta = new Float32Array(dim);
    for (let i = 0; i < dim; i++) delta[i] = Math.random() < 0.5 ? -1 : 1;

    const plus = new Float32Array(dim);
    const minus = new Float32Array(dim);
    for (let i = 0; i < dim; i++) {
      plus[i] = clip(f[i] + c * delta[i]);
      minus[i] = clip(f[i] - c * delta[i]);
    }
    const lp = await evalDist(plus);
    const lm = await evalDist(minus);
    if (lp > bestDist) {
      bestDist = lp;
      best = plus.slice();
    }
    if (lm > bestDist) {
      bestDist = lm;
      best = minus.slice();
    }
    const grad = (lp - lm) / (2 * c);
    for (let i = 0; i < dim; i++) f[i] = clip(f[i] + a * grad * delta[i]);
    if (bestDist >= UNDETECTED_DISTANCE) break;
  }

  return { data: best, size: FIELD };
}
