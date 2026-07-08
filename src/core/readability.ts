export type ReadabilityVerdict = "Readable" | "Borderline" | "Too detailed" | "Too abstract";

export interface ReadabilityResult {
  verdict: ReadabilityVerdict;
  /** 0..100 heuristic confidence-free score. */
  score: number;
  /** 0..1 luminance spread. */
  contrast: number;
  /** 0..1 high-frequency edge energy (detail that may not survive shrinking). */
  detail: number;
  /** Populated luminance clusters (tonal separation). */
  clusters: number;
}

/**
 * Judge how well an avatar reads at its target size. Operates on the mosaic
 * already downscaled to `size`×`size` (what the viewer actually sees). Purely
 * heuristic — surfaced as guidance, not a verdict to trust blindly.
 */
export function analyzeReadability(pixels: Uint8ClampedArray, size: number): ReadabilityResult {
  const n = size * size;
  const lum = new Float32Array(n);
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const p = i * 4;
    const l = 0.2126 * pixels[p] + 0.7152 * pixels[p + 1] + 0.0722 * pixels[p + 2];
    lum[i] = l;
    sum += l;
  }
  const mean = sum / n;

  let variance = 0;
  const hist = new Array(8).fill(0);
  for (let i = 0; i < n; i++) {
    variance += (lum[i] - mean) ** 2;
    hist[Math.min(7, (lum[i] / 32) | 0)]++;
  }
  const stddev = Math.sqrt(variance / n);
  const contrast = Math.min(1, stddev / 70);
  const clusters = hist.filter((c) => c > n * 0.04).length;

  // Center-weighted edge energy: detail near the face matters most.
  let edgeSum = 0;
  let weightSum = 0;
  const c = (size - 1) / 2;
  for (let y = 1; y < size - 1; y++) {
    for (let x = 1; x < size - 1; x++) {
      const i = y * size + x;
      const gx = Math.abs(lum[i + 1] - lum[i - 1]);
      const gy = Math.abs(lum[i + size] - lum[i - size]);
      const d = ((x - c) / c) ** 2 + ((y - c) / c) ** 2;
      const w = Math.exp(-d * 1.2);
      edgeSum += ((gx + gy) / 2) * w;
      weightSum += w;
    }
  }
  const detail = Math.min(1, edgeSum / weightSum / 42);

  let verdict: ReadabilityVerdict;
  if (contrast < 0.18 || clusters <= 2) verdict = "Too abstract";
  else if (detail > 0.72) verdict = "Too detailed";
  else if (contrast >= 0.32 && detail >= 0.15 && detail <= 0.62 && clusters >= 3) verdict = "Readable";
  else verdict = "Borderline";

  const score = Math.max(
    0,
    Math.min(
      100,
      Math.round(contrast * 45 + (Math.min(clusters, 6) / 6) * 25 + (1 - Math.abs(detail - 0.4) / 0.4) * 30),
    ),
  );

  return { verdict, score, contrast, detail, clusters };
}
