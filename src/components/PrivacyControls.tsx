import { useState } from "react";
import { useStore } from "@/state/store";
import { Section, Segmented, SliderField, Toggle } from "./ui/Controls";
import { currentRequest } from "@/render/buildRequest";
import { hardenGrid } from "@/analysis/harden";
import { isPhotoLike } from "@/core/antifr/cloak";
import { GRID_MIN } from "@/core/grid";
import type { OcclusionRegion, OcclusionStyle } from "@/core/types";

export function PrivacyControls() {
  const source = useStore((s) => s.source);
  const antiFr = useStore((s) => s.antiFr);
  const setAntiFr = useStore((s) => s.setAntiFr);
  const frEngaged = useStore((s) => s.frEngaged);
  const setFrEngaged = useStore((s) => s.setFrEngaged);
  const baseline = useStore((s) => s.baselineEmbedding);
  const gridSize = useStore((s) => s.effectiveGrid());
  const colorMode = useStore((s) => s.color.mode);
  const [hardening, setHardening] = useState(false);
  const [hardenNote, setHardenNote] = useState<string | null>(null);

  if (!source) return null;

  const { occlusion, warp, cloak, landmarks } = antiFr;
  const cloakActive = isPhotoLike(gridSize, colorMode);

  const autoHarden = async () => {
    const st = useStore.getState();
    if (!st.source || !st.baselineEmbedding) return;
    setHardening(true);
    setHardenNote(null);
    try {
      const result = await hardenGrid(
        st.source,
        st.baselineEmbedding,
        currentRequest(),
        st.effectiveGrid(),
        GRID_MIN,
        st.grid.displaySizePx,
        st.grid.outputSizePx,
      );
      if (!result) return;
      st.setGrid({ gridOverride: result.grid });
      setHardenNote(
        result.defeated
          ? `Coarsened to ${result.grid}×${result.grid} — no longer matchable.`
          : `Reached ${result.grid}×${result.grid}; still faintly matchable. Try reducing colors too.`,
      );
    } finally {
      setHardening(false);
    }
  };

  return (
    <Section icon="shield" title="Privacy" collapsible defaultCollapsed>
      <p className="field__label">
        Reduces how well face recognition can match this avatar to you. Measured against a bundled
        open-source model — a guide, not a guarantee against every system.
      </p>

      <Toggle
        label="Measure FR matchability"
        checked={frEngaged}
        onChange={setFrEngaged}
      />
      {frEngaged && (
        <p className="field__label">
          Loads a ~7&nbsp;MB face model locally (one time, nothing is uploaded) and scores how
          matchable the mosaic is above the preview.
        </p>
      )}
      {frEngaged && baseline && (
        <>
          <button type="button" className="btn btn--primary btn--block" onClick={autoHarden} disabled={hardening}>
            {hardening ? "Hardening…" : "Auto-harden grid"}
          </button>
          {hardenNote && <p className="field__label">{hardenNote}</p>}
        </>
      )}

      <Toggle
        label="Hide feature band"
        checked={occlusion.enabled}
        onChange={(enabled) => setAntiFr({ occlusion: { ...occlusion, enabled } })}
      />
      {occlusion.enabled && (
        <>
          <Segmented<OcclusionRegion>
            value={occlusion.region}
            onChange={(region) => setAntiFr({ occlusion: { ...occlusion, region } })}
            options={[
              { value: "eyes", label: "Eyes" },
              { value: "eyes-nose", label: "Eyes + nose" },
            ]}
          />
          <Segmented<OcclusionStyle>
            value={occlusion.style}
            onChange={(style) => setAntiFr({ occlusion: { ...occlusion, style } })}
            options={[
              { value: "bar", label: "Bar" },
              { value: "scramble", label: "Scramble" },
              { value: "pixelate", label: "Blur" },
            ]}
          />
          <SliderField
            label="Coverage"
            value={Math.round(occlusion.strength * 100)}
            min={10}
            max={100}
            step={5}
            suffix="%"
            onChange={(v) => setAntiFr({ occlusion: { ...occlusion, strength: v / 100 } })}
          />
        </>
      )}

      <Toggle
        label="Warp geometry"
        checked={warp.enabled}
        onChange={(enabled) => {
          setAntiFr({ warp: { ...warp, enabled } });
          if (enabled) setFrEngaged(true);
        }}
      />
      {warp.enabled && (
        <>
          <SliderField
            label="Warp amount"
            value={Math.round(warp.strength * 100)}
            min={10}
            max={100}
            step={5}
            suffix="%"
            onChange={(v) => setAntiFr({ warp: { ...warp, strength: v / 100 } })}
          />
          {!landmarks && (
            <p className="field__label">Detecting the face… warp activates once it’s found.</p>
          )}
        </>
      )}

      <Toggle
        label="Adversarial cloak (experimental)"
        checked={cloak.enabled}
        onChange={(enabled) => setAntiFr({ cloak: { ...cloak, enabled } })}
      />
      {cloak.enabled && (
        <>
          <SliderField
            label="Cloak strength"
            value={Math.round(cloak.strength * 100)}
            min={10}
            max={100}
            step={5}
            suffix="%"
            onChange={(v) => setAntiFr({ cloak: { ...cloak, strength: v / 100 } })}
          />
          <p className="field__label">
            {cloakActive
              ? "Experimental texture — watch the meter to see if it helps. Model-specific; an arms race like a CAPTCHA."
              : "Inactive: only a fine, full-color render (grid ≥ 96) keeps it — the mosaic erases it otherwise."}
          </p>
        </>
      )}
    </Section>
  );
}
