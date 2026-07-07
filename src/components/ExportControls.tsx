import { useStore } from "@/state/store";
import { getOutputCanvas } from "@/render/engine";
import { currentRequest } from "@/render/buildRequest";
import { computeFrame } from "@/core/render/portrait";
import { buildSvg } from "@/core/export/svg";
import { Section, Segmented, Toggle, ColorField } from "./ui/Controls";
import { Icon } from "./ui/Icon";

const OUTPUT_SIZES = [512, 1024, 2048] as const;

function baseName(name: string | null): string {
  if (!name) return "portrait";
  return name.replace(/\.[^.]+$/, "") || "portrait";
}

export function ExportControls() {
  const grid = useStore((s) => s.grid);
  const setGrid = useStore((s) => s.setGrid);
  const exportSettings = useStore((s) => s.exportSettings);
  const setExport = useStore((s) => s.setExport);
  const hasImage = useStore((s) => s.source !== null);
  const sourceName = useStore((s) => s.sourceName);
  const gridSize = useStore((s) => s.effectiveGrid());
  const renderMode = useStore((s) => s.renderMode);
  const pending = useStore((s) => s.renderPending);

  const saveBlob = (blob: Blob, ext: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${baseName(sourceName)}-mosaic-${gridSize}x${gridSize}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPng = () => {
    const canvas = getOutputCanvas(grid.outputSizePx);
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
    <Section icon="download" title="Export">
      <div className="field">
        <span className="field__label">Output resolution</span>
        <Segmented<string>
          value={String(grid.outputSizePx)}
          onChange={(v) => setGrid({ outputSizePx: Number(v) })}
          options={OUTPUT_SIZES.map((s) => ({ value: String(s), label: `${s}` }))}
        />
      </div>

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

      <button
        type="button"
        className="btn btn--primary btn--icon"
        onClick={downloadPng}
        disabled={!hasImage || pending}
      >
        <Icon name={pending ? "sparkles" : "download"} size={15} />
        {pending ? "Rendering…" : `Download PNG · ${grid.outputSizePx}²`}
      </button>
      <button
        type="button"
        className="btn btn--ghost btn--icon"
        onClick={downloadSvg}
        disabled={!hasImage || pending || renderMode === "relief"}
        title={renderMode === "relief" ? "SVG supports square and dot modes" : undefined}
      >
        <Icon name="download" size={15} /> Download SVG (vector)
      </button>
    </Section>
  );
}
