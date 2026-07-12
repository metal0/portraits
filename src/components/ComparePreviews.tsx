import { useEffect, useRef, useState, type ReactNode } from "react";
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
  const outputSize = useStore((s) => s.effectivePlan().previewPx);
  const crop = useStore((s) => s.crop);
  const [pixelated, setPixelated] = useState(false);

  if (!source) return null;

  return (
    <div className="compare">
      <Frame label="Original">
        {SIZES.map((size) => (
          <OriginalCell key={size} size={size} source={source} crop={crop} />
        ))}
      </Frame>

      <Frame
        label="Mosaic"
        action={
          <button
            type="button"
            className="frame__action"
            onClick={() => setPixelated((p) => !p)}
            title={pixelated ? "Show smoothed" : "Show literal pixels"}
          >
            <Icon name={pixelated ? "eye" : "grid"} size={12} />
            {pixelated ? "Perceptual" : "Literal"}
          </button>
        }
      >
        {SIZES.map((size) => (
          <MosaicCell
            key={size}
            size={size}
            renderVersion={renderVersion}
            outputSize={outputSize}
            pixelated={pixelated}
          />
        ))}
      </Frame>
    </div>
  );
}

function Frame(props: { label: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="frame">
      <span className="frame__legend">{props.label}</span>
      {props.action && <span className="frame__legend frame__legend--right">{props.action}</span>}
      <div className="frame__body">{props.children}</div>
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
      <canvas
        ref={ref}
        role="img"
        aria-label={`Original portrait at ${props.size} pixels`}
        style={{ width: props.size, height: props.size }}
      />
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
      <canvas
        ref={ref}
        role="img"
        aria-label={`Mosaic portrait at ${props.size} pixels`}
        className="preview-mosaic"
        style={{ width: props.size, height: props.size }}
      />
      <span className="compare__size">{props.size}px</span>
    </div>
  );
}
