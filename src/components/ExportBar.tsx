import { useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { useStore } from "@/state/store";
import { getOutputCanvas } from "@/render/engine";
import { currentRequest } from "@/render/buildRequest";
import { computeFrame } from "@/core/render/portrait";
import { buildSvg } from "@/core/export/svg";
import { Section, Segmented, Toggle, ColorField } from "./ui/Controls";
import { Icon } from "./ui/Icon";
import { Modal } from "./ui/Modal";

const OUTPUT_SIZES = [512, 1024, 2048] as const;

function baseName(name: string | null): string {
  if (!name) return "portrait";
  return name.replace(/\.[^.]+$/, "") || "portrait";
}

export function ExportBar() {
  const [open, setOpen] = useState(false);

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

  const saveBlob = (blob: Blob, ext: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${baseName(sourceName)}-mosaic-${gridSize}x${gridSize}.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  const downloadPng = () => {
    const canvas = getOutputCanvas(plan.outputPx);
    canvas.toBlob((blob) => {
      if (blob) saveBlob(blob, "png");
    }, "image/png");
  };

  const downloadSvg = () => {
    const source = useStore.getState().source;
    if (!source) return;
    const req = currentRequest();
    const svg = buildSvg(computeFrame(source, req), req);
    saveBlob(new Blob([svg], { type: "image/svg+xml" }), "svg");
  };

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
              disabled={pending}
            >
              <Icon name={pending ? "sparkles" : "download"} size={15} />
              {pending ? "Rendering…" : `PNG · ${plan.outputPx}²`}
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--icon"
              onClick={downloadSvg}
              disabled={pending || renderMode === "relief"}
              title={renderMode === "relief" ? "SVG supports square and dot modes" : undefined}
            >
              <Icon name="download" size={15} /> SVG (vector)
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
