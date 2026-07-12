import { useCallback, useEffect, useRef, useState } from "react";
import { optimizeCloak } from "@/analysis/cloakOptimize";
import { isPhotoLike } from "@/core/antifr/cloak";
import { currentRequest } from "@/render/buildRequest";
import { useStore } from "@/state/store";

export type AutoCloakStatus =
  | "inactive"
  | "unsupported"
  | "waiting"
  | "unavailable"
  | "optimizing"
  | "ready"
  | "error";

export interface AutoCloakState {
  status: AutoCloakStatus;
  error: string | null;
  retry: () => void;
}

interface Attempt {
  key: string;
  status: "optimizing" | "error";
  error: string | null;
}

interface ActiveRun {
  controller: AbortController;
  promise: Promise<void>;
}

function optimizationError(error: unknown): string {
  return error instanceof Error ? error.message : "Cloak optimization failed. Try again.";
}

export function useAutoCloak(): AutoCloakState {
  const source = useStore((s) => s.source);
  const sourceRevision = useStore((s) => s.sourceRevision);
  const baseline = useStore((s) => s.baselineEmbedding);
  const faceStatus = useStore((s) => s.faceAnalysis.status);
  const renderPending = useStore((s) => s.renderPending);
  const renderVersion = useStore((s) => s.renderVersion);
  const cloak = useStore((s) => s.antiFr.cloak);
  const cloakField = useStore((s) => s.antiFr.cloakField);
  const gridSize = useStore((s) => s.effectiveGrid());
  const colorMode = useStore((s) => s.color.mode);
  const [retryGeneration, setRetryGeneration] = useState(0);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const generationRef = useRef(0);
  const activeRunRef = useRef<ActiveRun | null>(null);

  const supported = isPhotoLike(gridSize, colorMode);
  const runKey = [sourceRevision, renderVersion, cloak.strength, retryGeneration].join(":");

  useEffect(() => {
    const generation = ++generationRef.current;
    const previousRun = activeRunRef.current;
    previousRun?.controller.abort();

    if (
      !source ||
      !baseline ||
      !cloak.enabled ||
      !supported ||
      cloakField ||
      renderPending ||
      faceStatus !== "ready"
    ) {
      return;
    }

    const controller = new AbortController();
    const sourceAtStart = source;
    const baselineAtStart = baseline;
    const strengthAtStart = cloak.strength;

    const execute = async (): Promise<void> => {
      try {
        await previousRun?.promise;
        if (controller.signal.aborted || generationRef.current !== generation) return;

        const state = useStore.getState();
        if (
          state.source !== sourceAtStart ||
          state.sourceRevision !== sourceRevision ||
          state.baselineEmbedding !== baselineAtStart ||
          state.renderVersion !== renderVersion ||
          state.renderPending ||
          !state.antiFr.cloak.enabled ||
          state.antiFr.cloakField ||
          state.faceAnalysis.status !== "ready"
        ) {
          return;
        }

        const requestAtStart = currentRequest();
        const displaySizeAtStart = state.grid.displaySizePx;
        const outputSizeAtStart = state.grid.outputSizePx;
        const inputsAreCurrent = (): boolean => {
          const current = useStore.getState();
          const request = currentRequest();
          return (
            !controller.signal.aborted &&
            generationRef.current === generation &&
            current.source === sourceAtStart &&
            current.sourceRevision === sourceRevision &&
            current.baselineEmbedding === baselineAtStart &&
            current.renderVersion === renderVersion &&
            !current.renderPending &&
            current.faceAnalysis.status === "ready" &&
            current.antiFr.cloak.enabled &&
            !current.antiFr.cloakField &&
            current.antiFr.cloak.strength === strengthAtStart &&
            current.grid.displaySizePx === displaySizeAtStart &&
            current.grid.outputSizePx === outputSizeAtStart &&
            request.crop === requestAtStart.crop &&
            request.gridSize === requestAtStart.gridSize &&
            request.outputSizePx === requestAtStart.outputSizePx &&
            request.renderMode === requestAtStart.renderMode &&
            request.square === requestAtStart.square &&
            request.dot === requestAtStart.dot &&
            request.relief === requestAtStart.relief &&
            request.ascii === requestAtStart.ascii &&
            request.color === requestAtStart.color &&
            request.adjust === requestAtStart.adjust &&
            request.exportSettings === requestAtStart.exportSettings &&
            request.antiFr === requestAtStart.antiFr
          );
        };

        setAttempt({ key: runKey, status: "optimizing", error: null });
        const field = await optimizeCloak(
          sourceAtStart,
          baselineAtStart,
          requestAtStart,
          strengthAtStart,
          displaySizeAtStart,
          outputSizeAtStart,
          controller.signal,
        );
        if (!inputsAreCurrent()) return;

        setAttempt(null);
        useStore.getState().setAntiFr({ cloakField: field });
      } catch (error: unknown) {
        if (controller.signal.aborted || generationRef.current !== generation) return;
        setAttempt({ key: runKey, status: "error", error: optimizationError(error) });
      } finally {
        setAttempt((current) =>
          current?.key === runKey && current.status === "optimizing" ? null : current,
        );
      }
    };

    const activeRun: ActiveRun = { controller, promise: Promise.resolve() };
    activeRun.promise = execute().finally(() => {
      if (activeRunRef.current === activeRun) activeRunRef.current = null;
    });
    activeRunRef.current = activeRun;

    return () => controller.abort();
  }, [
    baseline,
    cloak.enabled,
    cloak.strength,
    cloakField,
    faceStatus,
    renderPending,
    renderVersion,
    retryGeneration,
    runKey,
    source,
    sourceRevision,
    supported,
  ]);

  const retry = useCallback(() => {
    setAttempt(null);
    setRetryGeneration((generation) => generation + 1);
  }, []);

  let status: AutoCloakStatus;
  if (!cloak.enabled) status = "inactive";
  else if (!supported) status = "unsupported";
  else if (cloakField) status = "ready";
  else if (faceStatus === "no-face" || faceStatus === "error") status = "unavailable";
  else if (!baseline || renderPending || faceStatus !== "ready") status = "waiting";
  else if (attempt?.key === runKey) status = attempt.status;
  else status = "waiting";

  return {
    status,
    error: status === "error" ? attempt?.error ?? "Cloak optimization failed." : null,
    retry,
  };
}
