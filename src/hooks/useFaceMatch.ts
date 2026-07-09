import { useEffect, useRef } from "react";
import { useStore } from "@/state/store";
import { getOutputCanvas } from "@/render/engine";
import { computeSquareSourceRect } from "@/core/sampling";
import { analyzeFace, faceDistance, loadFaceModels } from "@/analysis/faceApi";

const BASELINE_SIZE = 320;
const MEASURE_DEBOUNCE_MS = 600;

/**
 * When the user engages FR analysis, this: (1) detects the original cropped
 * face once to get a baseline descriptor + landmarks (which also feed the
 * occlusion/warp transforms), and (2) re-measures the settled mosaic against
 * that baseline on each render. Models load lazily on first use.
 */
export function useFaceMatch(): void {
  const frEngaged = useStore((s) => s.frEngaged);
  const source = useStore((s) => s.source);
  const crop = useStore((s) => s.crop);
  const renderVersion = useStore((s) => s.renderVersion);
  const previewPx = useStore((s) => s.effectivePlan().previewPx);
  const baseline = useStore((s) => s.baselineEmbedding);

  const baselineKey = useRef<string>("");
  const measuring = useRef(false);

  useEffect(() => {
    if (!frEngaged || !source) return;
    const key = `${source.width}x${source.height}:${crop.x.toFixed(4)},${crop.y.toFixed(4)},${crop.scale.toFixed(3)}`;
    if (baselineKey.current === key) return;

    let cancelled = false;
    void (async () => {
      await loadFaceModels();
      if (cancelled) return;
      const canvas = document.createElement("canvas");
      canvas.width = BASELINE_SIZE;
      canvas.height = BASELINE_SIZE;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const { sx, sy, side } = computeSquareSourceRect(source.width, source.height, crop);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(source, sx, sy, side, side, 0, 0, BASELINE_SIZE, BASELINE_SIZE);
      const res = await analyzeFace(canvas);
      if (cancelled) return;
      baselineKey.current = key;
      const st = useStore.getState();
      st.setBaselineEmbedding(res ? res.descriptor : null);
      st.setLandmarks(res ? res.landmarks : null);
      st.setMatchResult(null);
    })();
    return () => {
      cancelled = true;
    };
  }, [frEngaged, source, crop]);

  useEffect(() => {
    if (!frEngaged || !source || !baseline) return;

    const id = window.setTimeout(async () => {
      if (measuring.current) return;
      measuring.current = true;
      try {
        await loadFaceModels();
        const canvas = getOutputCanvas(useStore.getState().effectivePlan().previewPx);
        const res = await analyzeFace(canvas);
        useStore.getState().setMatchResult(
          res
            ? { distance: faceDistance(baseline, res.descriptor), detected: true, detectionScore: res.detectionScore }
            : { distance: Infinity, detected: false, detectionScore: 0 },
        );
      } finally {
        measuring.current = false;
      }
    }, MEASURE_DEBOUNCE_MS);

    return () => window.clearTimeout(id);
  }, [frEngaged, source, baseline, renderVersion, previewPx]);
}
