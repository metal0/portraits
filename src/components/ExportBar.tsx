import { useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { useStore } from "@/state/store";
import { currentRequest } from "@/render/buildRequest";
import { exportPng, exportSvg } from "@/render/exporter";
import { zipStore, type ZipEntry } from "@/core/zip";
import { Section, Segmented, Toggle, ColorField } from "./ui/Controls";
import { Icon } from "./ui/Icon";
import { Modal } from "./ui/Modal";

const OUTPUT_SIZES = [512, 1024, 2048, 4096] as const;
const BATCH_SIZES = [512, 1024, 2048] as const;

function baseName(name: string | null): string {
  if (!name) return "portrait";
  return name.replace(/\.[^.]+$/, "") || "portrait";
}

export function ExportBar() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const grid = useStore((s) => s.grid);
  const setGrid = useStore((s) => s.setGrid);
  const exportSettings = useStore((s) => s.exportSettings);
  const setExport = useStore((s) => s.setExport);
  const hasImage = useStore((s) => s.source !== null);
  const sourceName = useStore((s) => s.sourceName);
  const plan = useStore(useShallow((s) => s.effectivePlan()));
  const gridSize = plan.gridSize;
  const renderMode = useStore((s) => s.renderMode);
  const pending = useStore((s) => s.renderPending);

  const stem = `${baseName(sourceName)}-mosaic-${gridSize}x${gridSize}`;

  const save = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  const svgUnsupported = renderMode === "relief" || renderMode === "cmyk";
  const disabled = pending || busy !== null;

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(label);
    try {
      await fn();
    } finally {
      setBusy(null);
    }
  };

  const downloadPng = () =>
    run("png", async () => {
      const source = useStore.getState().source;
      if (!source) return;
      save(await exportPng(source, currentRequest()), `${stem}.png`);
    });

  const downloadSvg = () =>
    run("svg", async () => {
      const source = useStore.getState().source;
      if (!source) return;
      const svg = await exportSvg(source, currentRequest());
      save(new Blob([svg], { type: "image/svg+xml" }), `${stem}.svg`);
    });

  const downloadBatch = () =>
    run("batch", async () => {
      const source = useStore.getState().source;
      if (!source) return;
      const entries: ZipEntry[] = [];
      for (const size of BATCH_SIZES) {
        const req = currentRequest(size);
        const blob = await exportPng(source, req);
        entries.push({
          name: `${stem}-${req.outputSizePx}.png`,
          data: new Uint8Array(await blob.arrayBuffer()),
        });
      }
      save(zipStore(entries), `${stem}-batch.zip`);
    });

  return (
    <div className="export-bar">
      <button
        type="button"
        className="btn btn--primary btn--icon export-bar__btn"
        disabled={!hasImage}
        onClick={() => setOpen(true)}
      >
        <Icon name="download" size={16} /> Export
      </button>

      {open && (
        <Modal title="Export" onClose={() => setOpen(false)}>
          <Section icon="grid" title="Output resolution">
            <Segmented<string>
              label="Output resolution"
              value={String(grid.outputSizePx)}
              onChange={(v) => setGrid({ outputSizePx: Number(v) })}
              options={OUTPUT_SIZES.map((s) => ({ value: String(s), label: `${s}` }))}
            />
            <p className="modal__note">
              Exports at {plan.outputPx}×{plan.outputPx} ({plan.gridSize}×{plan.gridSize} blocks ·{" "}
              {plan.blockPx}px each) — snapped so blocks stay crisp.
            </p>
          </Section>

          <Section icon="crop" title="Shape & background">
            <Toggle
              label="Circular mask"
              checked={exportSettings.circularMask}
              onChange={(circularMask) => setExport({ circularMask })}
            />
            <Toggle
              label="Transparent background"
              checked={exportSettings.transparentBackground}
              onChange={(transparentBackground) => setExport({ transparentBackground })}
            />
            {!exportSettings.transparentBackground && (
              <ColorField
                label="Background"
                value={exportSettings.backgroundColor}
                onChange={(backgroundColor) => setExport({ backgroundColor })}
              />
            )}
          </Section>

          <div className="modal__actions">
            <button
              type="button"
              className="btn btn--primary btn--icon"
              onClick={downloadPng}
              disabled={disabled}
            >
              <Icon name={busy === "png" ? "sparkles" : "download"} size={15} />
              {busy === "png" ? "Rendering…" : `PNG · ${plan.outputPx}²`}
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--icon"
              onClick={downloadSvg}
              disabled={disabled || svgUnsupported}
              title={svgUnsupported ? "SVG supports square, dot and ASCII modes" : undefined}
            >
              <Icon name="download" size={15} /> {busy === "svg" ? "Rendering…" : "SVG (vector)"}
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--icon"
              onClick={downloadBatch}
              disabled={disabled}
              title="PNG at 512, 1024 and 2048 as a zip"
            >
              <Icon name="layers" size={15} />
              {busy === "batch" ? "Zipping…" : "Batch (zip)"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
