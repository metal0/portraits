import { useEffect, useRef } from "react";
import { useStore } from "@/state/store";
import { renderToOutput } from "@/render/engine";
import type { RenderRequest } from "@/core/types";

const DEBOUNCE_MS = 1000;

/**
 * Mount once. Watches every setting that affects output and re-renders the
 * singleton output canvas. Renders are debounced so dragging a slider stays
 * responsive; a brand-new image renders immediately. While a render is pending
 * the store flags `renderPending` so exports can be blocked until it lands.
 */
export function useRenderEngine(): void {
  const source = useStore((s) => s.source);
  const crop = useStore((s) => s.crop);
  const gridSize = useStore((s) => s.effectiveGrid());
  const outputPx = useStore((s) => s.effectivePlan().outputPx);
  const renderMode = useStore((s) => s.renderMode);
  const square = useStore((s) => s.square);
  const dot = useStore((s) => s.dot);
  const relief = useStore((s) => s.relief);
  const color = useStore((s) => s.color);
  const adjust = useStore((s) => s.adjust);
  const exportSettings = useStore((s) => s.exportSettings);
  const bumpRender = useStore((s) => s.bumpRender);
  const setRenderPending = useStore((s) => s.setRenderPending);

  const lastSource = useRef<ImageBitmap | null>(null);

  useEffect(() => {
    if (!source) {
      lastSource.current = null;
      return;
    }

    const immediate = source !== lastSource.current;
    lastSource.current = source;
    setRenderPending(true);

    const run = () => {
      const req: RenderRequest = {
        crop,
        gridSize,
        outputSizePx: outputPx,
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
    };

    const id = setTimeout(run, immediate ? 0 : DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [
    source,
    crop,
    gridSize,
    outputPx,
    renderMode,
    square,
    dot,
    relief,
    color,
    adjust,
    exportSettings,
    bumpRender,
    setRenderPending,
  ]);
}
