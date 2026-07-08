import type { RenderRequest } from "@/core/types";
import { renderPortrait, computeFrame } from "@/core/render/portrait";
import { buildSvg } from "@/core/export/svg";

interface Pending {
  resolve: (value: unknown) => void;
  reject: (err: Error) => void;
}

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, Pending>();

function workerSupported(): boolean {
  return typeof Worker !== "undefined" && typeof OffscreenCanvas !== "undefined";
}

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL("./export.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (e: MessageEvent) => {
      const { id, error, ...rest } = e.data;
      const p = pending.get(id);
      if (!p) return;
      pending.delete(id);
      if (error) p.reject(new Error(error));
      else p.resolve(rest);
    };
  }
  return worker;
}

async function call(kind: "png" | "svg", source: ImageBitmap, req: RenderRequest): Promise<Record<string, unknown>> {
  const bitmap = await createImageBitmap(source); // clone; the worker consumes it
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve: resolve as (v: unknown) => void, reject });
    getWorker().postMessage({ id, kind, req, source: bitmap }, [bitmap]);
  });
}

/** Render a PNG at the request's full resolution (off the main thread if possible). */
export async function exportPng(source: ImageBitmap, req: RenderRequest): Promise<Blob> {
  if (workerSupported()) {
    const { blob } = await call("png", source, req);
    return blob as Blob;
  }
  const canvas = document.createElement("canvas");
  canvas.width = req.outputSizePx;
  canvas.height = req.outputSizePx;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d context");
  renderPortrait(ctx, source, req);
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b!), "image/png"));
}

export async function exportSvg(source: ImageBitmap, req: RenderRequest): Promise<string> {
  if (workerSupported()) {
    const { svg } = await call("svg", source, req);
    return svg as string;
  }
  return buildSvg(computeFrame(source, req), req);
}
