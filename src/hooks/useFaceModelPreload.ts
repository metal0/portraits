import { useEffect } from "react";
import { preloadFaceModels } from "@/analysis/faceApi";

const PRELOAD_TIMEOUT_MS = 2_000;

export function useFaceModelPreload(): void {
  useEffect(() => {
    const preload = () => {
      void preloadFaceModels();
    };

    if (typeof window.requestIdleCallback === "function") {
      const idleId = window.requestIdleCallback(preload, { timeout: PRELOAD_TIMEOUT_MS });
      return () => window.cancelIdleCallback(idleId);
    }

    const timeoutId = window.setTimeout(preload, 0);
    return () => window.clearTimeout(timeoutId);
  }, []);
}
