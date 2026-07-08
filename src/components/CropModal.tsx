import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useStore } from "@/state/store";
import type { Crop } from "@/core/types";
import { clamp } from "@/core/grid";
import { Icon } from "./ui/Icon";

/** Crop square in source-pixel space. */
interface Box {
  cx: number;
  cy: number;
  s: number;
}

type Handle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "move";

const HANDLES: { id: Exclude<Handle, "move">; x: number; y: number }[] = [
  { id: "nw", x: 0, y: 0 },
  { id: "n", x: 0.5, y: 0 },
  { id: "ne", x: 1, y: 0 },
  { id: "e", x: 1, y: 0.5 },
  { id: "se", x: 1, y: 1 },
  { id: "s", x: 0.5, y: 1 },
  { id: "sw", x: 0, y: 1 },
  { id: "w", x: 0, y: 0.5 },
];

export function CropModal() {
  const open = useStore((s) => s.cropModalOpen);
  const source = useStore((s) => s.source);
  const crop = useStore((s) => s.crop);
  const setCrop = useStore((s) => s.setCrop);
  const close = useStore((s) => s.closeCropModal);

  if (!open || !source) return null;
  return (
    <CropEditor
      source={source}
      initial={crop}
      onApply={(c) => {
        setCrop(c);
        close();
      }}
      onCancel={close}
    />
  );
}

function CropEditor(props: {
  source: ImageBitmap;
  initial: Crop;
  onApply: (c: Crop) => void;
  onCancel: () => void;
}) {
  const { source } = props;
  const w = source.width;
  const h = source.height;
  const minDim = Math.min(w, h);
  const minSide = Math.max(16, minDim * 0.12);
  const maxZoom = Math.round((minDim / minSide) * 10) / 10;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState({ k: 1, dw: 0, dh: 0 });

  const [box, setBox] = useState<Box>(() => {
    const s = clamp(minDim / Math.max(1, props.initial.scale), minSide, minDim);
    return {
      cx: clamp(props.initial.x * w, s / 2, w - s / 2),
      cy: clamp(props.initial.y * h, s / 2, h - s / 2),
      s,
    };
  });

  // Fit the image into the available modal space; recompute on resize.
  useLayoutEffect(() => {
    const measure = () => {
      const maxW = Math.min(520, window.innerWidth - 48);
      const maxH = Math.min(window.innerHeight * 0.55, 460);
      const k = Math.min(maxW / w, maxH / h);
      setFit({ k, dw: Math.round(w * k), dh: Math.round(h * k) });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [w, h]);

  // Draw the source into the fit canvas.
  useEffect(() => {
    const c = canvasRef.current;
    if (!c || fit.dw === 0) return;
    c.width = fit.dw;
    c.height = fit.dh;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(source, 0, 0, fit.dw, fit.dh);
  }, [source, fit]);

  const drag = useRef<{ handle: Handle; box: Box } | null>(null);

  const pointerToSrc = (e: React.PointerEvent) => {
    const rect = stageRef.current!.getBoundingClientRect();
    return {
      x: clamp((e.clientX - rect.left) / fit.k, 0, w),
      y: clamp((e.clientY - rect.top) / fit.k, 0, h),
    };
  };

  const onPointerDown = (handle: Handle) => (e: React.PointerEvent) => {
    e.preventDefault();
    // Handles live inside the draggable box; stop the event so a handle press
    // starts a resize instead of bubbling up to the box's "move" handler.
    if (handle !== "move") e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    drag.current = { handle, box };
    dragStart.current = pointerToSrc(e);
  };
  const dragStart = useRef({ x: 0, y: 0 });

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const p = pointerToSrc(e);
    const { handle, box: b0 } = drag.current;

    if (handle === "move") {
      const dx = p.x - dragStart.current.x;
      const dy = p.y - dragStart.current.y;
      setBox({
        s: b0.s,
        cx: clamp(b0.cx + dx, b0.s / 2, w - b0.s / 2),
        cy: clamp(b0.cy + dy, b0.s / 2, h - b0.s / 2),
      });
      return;
    }
    setBox(resize(handle, b0, p, { w, h, minSide, maxSide: minDim }));
  };

  const endDrag = (e: React.PointerEvent) => {
    if (drag.current && (e.target as Element).hasPointerCapture?.(e.pointerId)) {
      (e.target as Element).releasePointerCapture(e.pointerId);
    }
    drag.current = null;
  };

  const setZoom = (zoom: number) => {
    const s = clamp(minDim / zoom, minSide, minDim);
    setBox((b) => ({
      s,
      cx: clamp(b.cx, s / 2, w - s / 2),
      cy: clamp(b.cy, s / 2, h - s / 2),
    }));
  };

  const apply = () =>
    props.onApply({ x: box.cx / w, y: box.cy / h, scale: minDim / box.s, rotation: 0 });

  const disp = { left: (box.cx - box.s / 2) * fit.k, top: (box.cy - box.s / 2) * fit.k, size: box.s * fit.k };
  const zoom = minDim / box.s;

  return createPortal(
    <div className="modal" onMouseDown={props.onCancel}>
      <div className="modal__dialog crop" role="dialog" aria-modal="true" aria-label="Crop image" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal__head">
          <h2 className="modal__title">Crop</h2>
          <button type="button" className="icon-btn" title="Cancel" onClick={props.onCancel}>
            <Icon name="x" size={14} />
          </button>
        </div>

        <div className="crop__stage" ref={stageRef} style={{ width: fit.dw, height: fit.dh }}>
          <canvas ref={canvasRef} className="crop__img" />
          <div
            className="crop__box"
            style={{ left: disp.left, top: disp.top, width: disp.size, height: disp.size }}
            onPointerDown={onPointerDown("move")}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          >
            <div className="crop__grid" />
            {HANDLES.map((hd) => (
              <span
                key={hd.id}
                className={`crop__handle crop__handle--${hd.id}`}
                style={{ left: `${hd.x * 100}%`, top: `${hd.y * 100}%` }}
                onPointerDown={onPointerDown(hd.id)}
                onPointerMove={onPointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
              />
            ))}
          </div>
        </div>

        <label className="crop__zoom field">
          <span className="field__label">
            Zoom <strong>{zoom.toFixed(1)}×</strong>
          </span>
          <input
            type="range"
            min={1}
            max={maxZoom}
            step={0.1}
            value={Number(zoom.toFixed(1))}
            onChange={(e) => setZoom(Number(e.target.value))}
          />
        </label>

        <div className="modal__actions modal__actions--row">
          <button type="button" className="btn btn--ghost" onClick={props.onCancel}>
            Cancel
          </button>
          <button type="button" className="btn btn--primary btn--icon" onClick={apply}>
            <Icon name="check" size={15} /> Apply crop
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

interface Bounds {
  w: number;
  h: number;
  minSide: number;
  maxSide: number;
}

/** Resize the square from a handle, keeping it square and inside the image. */
function resize(handle: Handle, b: Box, p: { x: number; y: number }, bnd: Bounds): Box {
  const L = b.cx - b.s / 2;
  const R = b.cx + b.s / 2;
  const T = b.cy - b.s / 2;
  const B = b.cy + b.s / 2;
  const { w, h, minSide, maxSide } = bnd;
  const fromEdges = (l: number, t: number, s: number): Box => ({ cx: l + s / 2, cy: t + s / 2, s });

  switch (handle) {
    case "nw": {
      const s = clamp(Math.max(R - p.x, B - p.y), minSide, Math.min(maxSide, R, B));
      return fromEdges(R - s, B - s, s);
    }
    case "ne": {
      const s = clamp(Math.max(p.x - L, B - p.y), minSide, Math.min(maxSide, w - L, B));
      return fromEdges(L, B - s, s);
    }
    case "sw": {
      const s = clamp(Math.max(R - p.x, p.y - T), minSide, Math.min(maxSide, R, h - T));
      return fromEdges(R - s, T, s);
    }
    case "se": {
      const s = clamp(Math.max(p.x - L, p.y - T), minSide, Math.min(maxSide, w - L, h - T));
      return fromEdges(L, T, s);
    }
    case "n": {
      const room = 2 * Math.min(b.cx, w - b.cx);
      const s = clamp(B - p.y, minSide, Math.min(maxSide, B, room));
      return fromEdges(b.cx - s / 2, B - s, s);
    }
    case "s": {
      const room = 2 * Math.min(b.cx, w - b.cx);
      const s = clamp(p.y - T, minSide, Math.min(maxSide, h - T, room));
      return fromEdges(b.cx - s / 2, T, s);
    }
    case "w": {
      const room = 2 * Math.min(b.cy, h - b.cy);
      const s = clamp(R - p.x, minSide, Math.min(maxSide, R, room));
      return fromEdges(R - s, b.cy - s / 2, s);
    }
    case "e": {
      const room = 2 * Math.min(b.cy, h - b.cy);
      const s = clamp(p.x - L, minSide, Math.min(maxSide, w - L, room));
      return fromEdges(L, b.cy - s / 2, s);
    }
    default:
      return b;
  }
}
