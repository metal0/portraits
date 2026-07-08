import { useEffect, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { useStore } from "@/state/store";
import { getOutputCanvas } from "@/render/engine";
import { ComparePreviews } from "./ComparePreviews";
import { ReadabilityMeter } from "./ReadabilityMeter";

const PREVIEW_MAX = 512;

export function PreviewStage(props: { onFile: (file: File) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dragging, setDragging] = useState(false);

  const source = useStore((s) => s.source);
  const renderVersion = useStore((s) => s.renderVersion);
  const plan = useStore(useShallow((s) => s.effectivePlan()));
  const outputSize = plan.outputPx;
  const displayPx = useStore((s) => s.grid.displaySizePx);
  const transparent = useStore((s) => s.exportSettings.transparentBackground);
  const pending = useStore((s) => s.renderPending);

  useEffect(() => {
    const dst = canvasRef.current;
    if (!dst || !source) return;
    const out = getOutputCanvas(outputSize);
    const displaySize = Math.min(PREVIEW_MAX, outputSize);
    if (dst.width !== displaySize) dst.width = displaySize;
    if (dst.height !== displaySize) dst.height = displaySize;
    const ctx = dst.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, displaySize, displaySize);
    ctx.drawImage(out, 0, 0, displaySize, displaySize);
  }, [renderVersion, source, outputSize]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) props.onFile(file);
  };

  return (
    <main
      className={`stage${dragging ? " stage--dragging" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      {source ? (
        <div className="stage__content">
          <div className="frame frame--preview">
            <span className="frame__legend">
              Render · {outputSize}×{outputSize}
            </span>
            <div className="stage__canvas-wrap">
              <canvas
                ref={canvasRef}
                className={`stage__canvas${transparent ? " is-checker" : ""}${
                  pending ? " is-pending" : ""
                }`}
              />
              {pending && <div className="stage__updating">Updating…</div>}
            </div>
          </div>
          <ReadabilityMeter />
          <ComparePreviews />
        </div>
      ) : (
        <div className="stage__empty">
          <div className="stage__grid-readout">
            <Readout value={`${plan.gridSize}×${plan.gridSize}`} label="grid" />
            <Readout
              value={`${plan.blockScreenPx.toFixed(plan.blockScreenPx % 1 ? 1 : 0)}px`}
              label={`per block @ ${displayPx}px`}
            />
            <Readout value={`${plan.outputPx}²`} label="export" />
          </div>
          <p className="stage__hint">Upload, drop, or paste a photo to begin.</p>
        </div>
      )}
      {dragging && <div className="stage__drop-overlay">Drop image</div>}
    </main>
  );
}

function Readout({ value, label }: { value: string; label: string }) {
  return (
    <div className="readout">
      <span className="readout__value">{value}</span>
      <span className="readout__label">{label}</span>
    </div>
  );
}
