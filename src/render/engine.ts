import type { RenderRequest } from "@/core/types";
import { renderPortrait } from "@/core/render/portrait";

let outputCanvas: HTMLCanvasElement | null = null;

/** Singleton full-resolution output canvas, shared by preview + export. */
export function getOutputCanvas(size: number): HTMLCanvasElement {
  if (!outputCanvas) {
    outputCanvas = document.createElement("canvas");
  }
  if (outputCanvas.width !== size) outputCanvas.width = size;
  if (outputCanvas.height !== size) outputCanvas.height = size;
  return outputCanvas;
}

export function renderToOutput(source: ImageBitmap, req: RenderRequest): HTMLCanvasElement {
  const canvas = getOutputCanvas(req.outputSizePx);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to acquire output 2D context");
  renderPortrait(ctx, source, req);
  return canvas;
}
