import { useEffect } from "react";
import { useStore } from "@/state/store";
import { renderToOutput } from "@/render/engine";
import type { RenderRequest } from "@/core/types";

/**
 * Mount once. Watches every setting that affects output and re-renders the
 * singleton output canvas, coalescing rapid changes into a single rAF frame.
 */
export function useRenderEngine(): void {
  const source = useStore((s) => s.source);
  const crop = useStore((s) => s.crop);
  const grid = useStore((s) => s.grid);
  const gridSize = useStore((s) => s.effectiveGrid());
  const renderMode = useStore((s) => s.renderMode);
  const square = useStore((s) => s.square);
  const dot = useStore((s) => s.dot);
  const relief = useStore((s) => s.relief);
  const color = useStore((s) => s.color);
  const adjust = useStore((s) => s.adjust);
  const exportSettings = useStore((s) => s.exportSettings);
  const bumpRender = useStore((s) => s.bumpRender);

  useEffect(() => {
    if (!source) return;

    let frame = 0;
    frame = requestAnimationFrame(() => {
      const req: RenderRequest = {
        crop,
        gridSize,
        outputSizePx: grid.outputSizePx,
        renderMode,
        square,
        dot,
        relief,
        color,
        adjust,
        exportSettings,
      };
      renderToOutput(source, req);
      bumpRender();
    });

    return () => cancelAnimationFrame(frame);
  }, [
    source,
    crop,
    gridSize,
    grid.outputSizePx,
    renderMode,
    square,
    dot,
    relief,
    color,
    adjust,
    exportSettings,
    bumpRender,
  ]);
}
