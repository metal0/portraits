import { useEffect, useRef, useState } from "react";
import { useStore } from "@/state/store";
import { getOutputCanvas } from "@/render/engine";
import { computeSquareSourceRect } from "@/core/sampling";
import type { Crop } from "@/core/types";
import { Icon } from "./ui/Icon";

const SIZES = [16, 32, 64, 128] as const;

/** Side-by-side "how the original vs the mosaic reads" at real profile sizes. */
export function ComparePreviews() {
  const source = useStore((s) => s.source);
  const renderVersion = useStore((s) => s.renderVersion);
  const outputSize = useStore((s) => s.grid.outputSizePx);
  const crop = useStore((s) => s.crop);
  const [pixelated, setPixelated] = useState(false);

  if (!source) return null;

  return (
    <div className="compare">
      <div className="compare__row">
        <span className="compare__tag">Original</span>
        <div className="compare__cells">
          {SIZES.map((size) => (
            <OriginalCell key={size} size={size} source={source} crop={crop} />
          ))}
        </div>
      </div>

      <div className="compare__row">
        <span className="compare__tag">Mosaic</span>
        <div className="compare__cells">
          {SIZES.map((size) => (
            <MosaicCell
              key={size}
              size={size}
              renderVersion={renderVersion}
              outputSize={outputSize}
              pixelated={pixelated}
            />
          ))}
        </div>
      </div>

      <button type="button" className="btn btn--ghost btn--icon compare__toggle" onClick={() => setPixelated((p) => !p)}>
        <Icon name={pixelated ? "eye" : "grid"} size={14} />
        {pixelated ? "Perceptual (smoothed)" : "Literal (pixelated)"}
      </button>
    </div>
  );
}

function OriginalCell(props: { size: number; source: ImageBitmap; crop: Crop }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const dst = ref.current;
    if (!dst) return;
    if (dst.width !== props.size) dst.width = props.size;
    if (dst.height !== props.size) dst.height = props.size;
    const ctx = dst.getContext("2d");
    if (!ctx) return;
    const { sx, sy, side } = computeSquareSourceRect(props.source.width, props.source.height, props.crop);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.clearRect(0, 0, props.size, props.size);
    ctx.drawImage(props.source, sx, sy, side, side, 0, 0, props.size, props.size);
  }, [props.source, props.crop, props.size]);

  return (
    <div className="compare__cell">
      <canvas ref={ref} style={{ width: props.size, height: props.size }} />
      <span className="compare__size">{props.size}px</span>
    </div>
  );
}

function MosaicCell(props: {
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
    <div className="compare__cell">
      <canvas ref={ref} className="preview-mosaic" style={{ width: props.size, height: props.size }} />
      <span className="compare__size">{props.size}px</span>
    </div>
  );
}
