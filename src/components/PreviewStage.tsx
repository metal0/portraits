import { useEffect, useRef, useState } from "react";
import { useStore } from "@/state/store";
import { getOutputCanvas } from "@/render/engine";
import { recommendGrid, blockSize } from "@/core/grid";
import { ComparePreviews } from "./ComparePreviews";

const PREVIEW_MAX = 512;

export function PreviewStage(props: { onFile: (file: File) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dragging, setDragging] = useState(false);

  const source = useStore((s) => s.source);
  const renderVersion = useStore((s) => s.renderVersion);
  const outputSize = useStore((s) => s.grid.outputSizePx);
  const grid = useStore((s) => s.grid);
  const effectiveGrid = useStore((s) => s.effectiveGrid());
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
          <ComparePreviews />
        </div>
      ) : (
        <div className="stage__empty">
          <div className="stage__grid-readout">
            <Readout value={`${effectiveGrid}×${effectiveGrid}`} label="grid" />
            <Readout value={`${Math.round(blockSize(grid.outputSizePx, effectiveGrid))}px`} label={`per block @ ${grid.outputSizePx}`} />
            <Readout
              value={`${recommendGrid(grid.displaySizePx, grid.targetBlockScreenPx)}²`}
              label="recommended"
            />
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
