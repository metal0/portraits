import { useStore } from "@/state/store";
import type { RenderRequest } from "@/core/types";

/** Assemble the current RenderRequest from live store state. */
export function currentRequest(): RenderRequest {
  const s = useStore.getState();
  return {
    crop: s.crop,
    gridSize: s.effectiveGrid(),
    outputSizePx: s.grid.outputSizePx,
    renderMode: s.renderMode,
    square: s.square,
    dot: s.dot,
    relief: s.relief,
    color: s.color,
    adjust: s.adjust,
    exportSettings: s.exportSettings,
  };
}
