import { useStore } from "@/state/store";
import { getOutputCanvas } from "@/render/engine";
import { Segmented, Toggle, ColorField } from "./ui/Controls";

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

  const download = () => {
    const canvas = getOutputCanvas(grid.outputSizePx);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${baseName(sourceName)}-mosaic-${gridSize}x${gridSize}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  };

  return (
    <section className="section">
      <h2 className="section__title">Export</h2>

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

      <button type="button" className="btn btn--primary" onClick={download} disabled={!hasImage}>
        Download PNG · {grid.outputSizePx}²
      </button>
    </section>
  );
}
