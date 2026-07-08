import { useStore } from "@/state/store";
import { planRender } from "@/core/grid";
import type { RenderRequest } from "@/core/types";

/**
 * Assemble a RenderRequest from live store state. Pass `requestedOutputPx` to
 * target a specific export resolution (e.g. batch export); omit to use the
 * selected output size.
 */
export function currentRequest(requestedOutputPx?: number): RenderRequest {
  const s = useStore.getState();
  const grid = s.effectiveGrid();
  const plan = planRender(grid, s.grid.displaySizePx, requestedOutputPx ?? s.grid.outputSizePx);
  return {
    crop: s.crop,
    gridSize: plan.gridSize,
    outputSizePx: plan.outputPx,
    renderMode: s.renderMode,
    square: s.square,
    dot: s.dot,
    relief: s.relief,
    ascii: s.ascii,
    color: s.color,
    adjust: s.adjust,
    exportSettings: s.exportSettings,
  };
}
