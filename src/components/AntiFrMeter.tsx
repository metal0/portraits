import { useStore } from "@/state/store";
import { useFaceMatch } from "@/hooks/useFaceMatch";
import { SAME_PERSON_DISTANCE } from "@/analysis/faceApi";

function verdict(distance: number, detected: boolean): { slug: string; label: string } {
  if (!detected) return { slug: "match-unlikely", label: "No face detected" };
  if (distance < 0.45) return { slug: "match-likely", label: "Likely matches you" };
  if (distance < SAME_PERSON_DISTANCE) return { slug: "match-borderline", label: "Borderline" };
  return { slug: "match-unlikely", label: "Unlikely to match" };
}

export function AntiFrMeter() {
  useFaceMatch();
  const active = useStore(
    (s) => s.antiFr.occlusion.enabled || s.antiFr.warp.enabled || s.antiFr.cloak.enabled,
  );
  const source = useStore((s) => s.source);
  const baseline = useStore((s) => s.baselineEmbedding);
  const result = useStore((s) => s.matchResult);

  if (!source || !active) return null;

  if (!baseline && !result) {
    return <div className="meter meter--fr meter--loading">Loading local face model…</div>;
  }
  if (!baseline) {
    return <div className="meter meter--fr meter--loading">No face found in your photo to measure against.</div>;
  }
  if (!result) {
    return <div className="meter meter--fr meter--loading">Measuring…</div>;
  }

  const v = verdict(result.distance, result.detected);
  const matchPct = result.detected
    ? Math.max(0, Math.min(100, Math.round((1 - result.distance / 0.9) * 100)))
    : 0;
  const title = result.detected
    ? `descriptor distance ${result.distance.toFixed(2)} — face-api treats < ${SAME_PERSON_DISTANCE} as the same person`
    : "the bundled detector no longer finds a face in the mosaic";

  return (
    <div className={`meter meter--fr meter--${v.slug}`} title={title}>
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
