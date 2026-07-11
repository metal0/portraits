import type { ReactElement } from "react";
import { SAME_PERSON_DISTANCE } from "@/analysis/faceApi";
import { useFaceMatch } from "@/hooks/useFaceMatch";
import { useStore } from "@/state/store";

function verdict(distance: number, detected: boolean): { slug: string; label: string } {
  if (!detected) return { slug: "match-unlikely", label: "No face detected" };
  if (distance < 0.45) return { slug: "match-likely", label: "Likely matches you" };
  if (distance < SAME_PERSON_DISTANCE) return { slug: "match-borderline", label: "Borderline" };
  return { slug: "match-unlikely", label: "Unlikely to match" };
}

export function AntiFrMeter(): ReactElement | null {
  useFaceMatch();
  const active = useStore(
    (s) => s.antiFr.occlusion.enabled || s.antiFr.warp.enabled || s.antiFr.cloak.enabled,
  );
  const source = useStore((s) => s.source);
  const baseline = useStore((s) => s.baselineEmbedding);
  const result = useStore((s) => s.matchResult);
  const analysis = useStore((s) => s.faceAnalysis);
  const retryFaceAnalysis = useStore((s) => s.retryFaceAnalysis);

  if (!source || !active) return null;

  if (analysis.status === "error") {
    return (
      <div
        className="meter meter--fr"
        role="alert"
        title={analysis.error ?? "Local face analysis failed"}
      >
        <span className="meter__dot" aria-hidden />
        <span className="meter__label">FR match</span>
        <span className="meter__verdict">Analysis unavailable</span>
        <button type="button" className="btn btn--ghost" onClick={retryFaceAnalysis}>
          Retry face analysis
        </button>
      </div>
    );
  }
  if (analysis.status === "no-face") {
    return (
      <div className="meter meter--fr meter--match-unlikely" role="status">
        <span className="meter__dot" aria-hidden />
        <span className="meter__label">FR match</span>
        <span className="meter__verdict">No face found in your photo</span>
      </div>
    );
  }
  if (analysis.status === "idle" || analysis.status === "loading") {
    return <div className="meter meter--fr meter--loading" role="status">Loading local face model…</div>;
  }
  if (!baseline) {
    return <div className="meter meter--fr meter--loading" role="status">Preparing face analysis…</div>;
  }
  if (analysis.status === "measuring" || !result) {
    return <div className="meter meter--fr meter--loading" role="status">Measuring…</div>;
  }

  const v = verdict(result.distance, result.detected);
  const matchPct = result.detected
    ? Math.max(0, Math.min(100, Math.round((1 - result.distance / 0.9) * 100)))
    : 0;
  const title = result.detected
    ? `descriptor distance ${result.distance.toFixed(2)} — face-api treats < ${SAME_PERSON_DISTANCE} as the same person`
    : "the bundled detector no longer finds a face in the mosaic";

  return (
    <div
      className={`meter meter--fr meter--${v.slug}`}
      title={title}
      role="status"
      aria-live="polite"
    >
      <span className="meter__dot" aria-hidden />
      <span className="meter__label">FR match</span>
      <span className="meter__verdict">{v.label}</span>
      <div className="meter__bar">
        <span style={{ width: `${matchPct}%` }} />
      </div>
      <span className="meter__score">{result.detected ? result.distance.toFixed(2) : "—"}</span>
    </div>
  );
}
