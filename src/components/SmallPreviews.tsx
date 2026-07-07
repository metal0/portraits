import { useEffect, useRef, useState } from "react";
import { useStore } from "@/state/store";
import { getOutputCanvas } from "@/render/engine";
import { PREVIEW_SIZES } from "@/core/grid";

export function SmallPreviews() {
  const source = useStore((s) => s.source);
  const renderVersion = useStore((s) => s.renderVersion);
  const outputSize = useStore((s) => s.grid.outputSizePx);
  const [pixelated, setPixelated] = useState(false);

  if (!source) {
    return (
      <section className="section">
        <h2 className="section__title">Small previews</h2>
        <div className="section__stub">Upload an image to preview at profile sizes.</div>
      </section>
    );
  }

  return (
    <section className="section">
      <h2 className="section__title">At profile size</h2>
      <div className="preview-strip">
        {PREVIEW_SIZES.map((size) => (
          <SmallPreview
            key={size}
            size={size}
            renderVersion={renderVersion}
            outputSize={outputSize}
            pixelated={pixelated}
          />
        ))}
      </div>
      <button
        type="button"
        className="btn btn--ghost"
        onClick={() => setPixelated((p) => !p)}
      >
        {pixelated ? "Perceptual (smoothed)" : "Literal (pixelated)"}
      </button>
    </section>
  );
}

function SmallPreview(props: {
  size: number;
  renderVersion: number;
  outputSize: number;
  pixelated: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const dst = ref.current;
    if (!dst) return;
    if (dst.width !== props.size) dst.width = props.size;
    if (dst.height !== props.size) dst.height = props.size;
    const ctx = dst.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = !props.pixelated;
    ctx.imageSmoothingQuality = "high";
    ctx.clearRect(0, 0, props.size, props.size);
    ctx.drawImage(getOutputCanvas(props.outputSize), 0, 0, props.size, props.size);
  }, [props.renderVersion, props.size, props.outputSize, props.pixelated]);

  return (
    <div className="preview-cell">
      <canvas ref={ref} className="preview-cell__canvas" style={{ width: props.size, height: props.size }} />
      <span className="preview-cell__label">{props.size}px</span>
    </div>
  );
}
