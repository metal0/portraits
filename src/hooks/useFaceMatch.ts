import { useEffect, useRef } from "react";
import { analyzeFace, faceDistance, loadFaceModels } from "@/analysis/faceApi";
import { computeSquareSourceRect } from "@/core/sampling";
import { getOutputCanvas } from "@/render/engine";
import { useStore } from "@/state/store";

const BASELINE_SIZE = 320;
const MEASURE_DEBOUNCE_MS = 600;

function analysisError(error: unknown): string {
  return error instanceof Error ? error.message : "Local face analysis failed";
}

/**
 * When the user engages FR analysis, this: (1) detects the original cropped
 * face once to get a baseline descriptor + landmarks (which also feed the
 * occlusion/warp transforms), and (2) re-measures the settled mosaic against
 * that baseline on each render. Models load lazily on first use.
 */
export function useFaceMatch(): void {
  const active = useStore(
    (s) => s.antiFr.occlusion.enabled || s.antiFr.warp.enabled || s.antiFr.cloak.enabled,
  );
  const source = useStore((s) => s.source);
  const sourceRevision = useStore((s) => s.sourceRevision);
  const crop = useStore((s) => s.crop);
  const renderVersion = useStore((s) => s.renderVersion);
  const renderPending = useStore((s) => s.renderPending);
  const previewPx = useStore((s) => s.effectivePlan().previewPx);
  const baseline = useStore((s) => s.baselineEmbedding);
  const retryVersion = useStore((s) => s.faceAnalysis.retryVersion);

  const baselineKey = useRef<string>("");
  const baselineGeneration = useRef(0);
  const measurementGeneration = useRef(0);

  useEffect(() => {
    const generation = ++baselineGeneration.current;
    if (!active || !source) {
      baselineKey.current = "";
      return;
    }

    const key = [
      sourceRevision,
      retryVersion,
      source.width,
      source.height,
      crop.x,
      crop.y,
      crop.scale,
      crop.rotation,
    ].join(":");
    if (baselineKey.current === key) return;
    baselineKey.current = "";

    const isCurrent = (): boolean => {
      const current = useStore.getState();
      const currentActive =
        current.antiFr.occlusion.enabled ||
        current.antiFr.warp.enabled ||
        current.antiFr.cloak.enabled;
      return (
        baselineGeneration.current === generation &&
        currentActive &&
        current.source === source &&
        current.sourceRevision === sourceRevision &&
        current.crop === crop &&
        current.faceAnalysis.retryVersion === retryVersion
      );
    };

    const state = useStore.getState();
    state.setBaselineEmbedding(null);
    state.setLandmarks(null);
    state.setMatchResult(null);
    state.setFaceAnalysisStatus("loading", null);

    const analyzeBaseline = async (): Promise<void> => {
      try {
        await loadFaceModels();
        if (!isCurrent()) return;

        const canvas = document.createElement("canvas");
        canvas.width = BASELINE_SIZE;
        canvas.height = BASELINE_SIZE;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Failed to acquire face-analysis canvas");

        const { sx, sy, side } = computeSquareSourceRect(source.width, source.height, crop);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(source, sx, sy, side, side, 0, 0, BASELINE_SIZE, BASELINE_SIZE);
        const result = await analyzeFace(canvas);
        if (!isCurrent()) return;

        baselineKey.current = key;
        const current = useStore.getState();
        current.setMatchResult(null);
        if (!result) {
          current.setBaselineEmbedding(null);
          current.setLandmarks(null);
          current.setFaceAnalysisStatus("no-face", null);
          return;
        }

        current.setLandmarks(result.landmarks);
        current.setBaselineEmbedding(result.descriptor);
        current.setFaceAnalysisStatus("measuring", null);
      } catch (error: unknown) {
        if (!isCurrent()) return;
        const current = useStore.getState();
        current.setBaselineEmbedding(null);
        current.setLandmarks(null);
        current.setMatchResult(null);
        current.setFaceAnalysisStatus("error", analysisError(error));
      }
    };

    void analyzeBaseline();
    return () => {
      if (baselineGeneration.current === generation) baselineGeneration.current += 1;
    };
  }, [active, source, sourceRevision, crop, retryVersion]);

  useEffect(() => {
    const generation = ++measurementGeneration.current;
    if (!active || !source || !baseline || renderPending) return;

    const isCurrent = (): boolean => {
      const current = useStore.getState();
      const currentActive =
        current.antiFr.occlusion.enabled ||
        current.antiFr.warp.enabled ||
        current.antiFr.cloak.enabled;
      return (
        measurementGeneration.current === generation &&
        currentActive &&
        current.source === source &&
        current.sourceRevision === sourceRevision &&
        current.baselineEmbedding === baseline &&
        current.renderVersion === renderVersion &&
        !current.renderPending &&
        current.effectivePlan().previewPx === previewPx
      );
    };

    const state = useStore.getState();
    state.setMatchResult(null);
    state.setFaceAnalysisStatus("measuring", null);

    const measure = async (): Promise<void> => {
      try {
        await loadFaceModels();
        if (!isCurrent()) return;
        const canvas = getOutputCanvas(previewPx);
        const result = await analyzeFace(canvas);
        if (!isCurrent()) return;

        const current = useStore.getState();
        current.setMatchResult(
          result
            ? {
                distance: faceDistance(baseline, result.descriptor),
                detected: true,
                detectionScore: result.detectionScore,
              }
            : { distance: Infinity, detected: false, detectionScore: 0 },
        );
        current.setFaceAnalysisStatus("ready", null);
      } catch (error: unknown) {
        if (!isCurrent()) return;
        const current = useStore.getState();
        current.setMatchResult(null);
        current.setFaceAnalysisStatus("error", analysisError(error));
      }
    };

    const timeoutId = window.setTimeout(() => {
      void measure();
    }, MEASURE_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
      if (measurementGeneration.current === generation) measurementGeneration.current += 1;
    };
  }, [
    active,
    source,
    sourceRevision,
    baseline,
    renderVersion,
    renderPending,
    previewPx,
  ]);
}
