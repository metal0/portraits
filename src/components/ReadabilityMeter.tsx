import { useEffect, useState } from "react";
import { useStore } from "@/state/store";
import { getOutputCanvas } from "@/render/engine";
import { makeCanvas } from "@/core/graphics";
import { analyzeReadability, type ReadabilityResult, type ReadabilityVerdict } from "@/core/readability";

const SLUG: Record<ReadabilityVerdict, string> = {
  Readable: "readable",
  Borderline: "borderline",
  "Too detailed": "detailed",
  "Too abstract": "abstract",
};

export function ReadabilityMeter() {
  const source = useStore((s) => s.source);
  const renderVersion = useStore((s) => s.renderVersion);
  const displayPx = useStore((s) => s.grid.displaySizePx);
  const [res, setRes] = useState<ReadabilityResult | null>(null);

  // Debounced + driven off completed renders only: reads the settled canvas so
  // preset changes don't flash transient verdicts computed from a stale frame.
  useEffect(() => {
    if (!source) {
      setRes(null);
      return;
    }
    const id = window.setTimeout(() => {
      const st = useStore.getState();
      const size = Math.max(16, Math.min(128, Math.round(st.grid.displaySizePx)));
      const { ctx } = makeCanvas(size, size);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.clearRect(0, 0, size, size);
      ctx.drawImage(getOutputCanvas(st.effectivePlan().outputPx), 0, 0, size, size);
      setRes(analyzeReadability(ctx.getImageData(0, 0, size, size).data, size));
    }, 450);
    return () => window.clearTimeout(id);
  }, [renderVersion, source]);

  if (!source || !res) return null;

  const title = `contrast ${(res.contrast * 100) | 0}% · detail ${(res.detail * 100) | 0}% · ${res.clusters} tones`;

  return (
    <div className={`meter meter--${SLUG[res.verdict]}`} title={title}>
      <span className="meter__dot" aria-hidden />
      <span className="meter__label">Reads at {displayPx}px</span>
      <span className="meter__verdict">{res.verdict}</span>
      <div className="meter__bar">
        <span style={{ width: `${res.score}%` }} />
      </div>
      <span className="meter__score">{res.score}</span>
    </div>
  );
}
