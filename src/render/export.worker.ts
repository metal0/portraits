import type { RenderRequest } from "@/core/types";
import { renderPortrait, computeFrame } from "@/core/render/portrait";
import { buildSvg } from "@/core/export/svg";

interface ExportMessage {
  id: number;
  kind: "png" | "svg";
  req: RenderRequest;
  source: ImageBitmap;
}

self.onmessage = async (e: MessageEvent<ExportMessage>) => {
  const { id, kind, req, source } = e.data;
  try {
    if (kind === "svg") {
      const svg = buildSvg(computeFrame(source, req), req);
      self.postMessage({ id, svg });
    } else {
      const canvas = new OffscreenCanvas(req.outputSizePx, req.outputSizePx);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("no 2d context in worker");
      renderPortrait(ctx, source, req);
      const blob = await canvas.convertToBlob({ type: "image/png" });
      self.postMessage({ id, blob });
    }
  } catch (err) {
    self.postMessage({ id, error: err instanceof Error ? err.message : String(err) });
  } finally {
    source.close();
  }
};
