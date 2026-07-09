import { useStore } from "@/state/store";
import { Section, Segmented, SliderField, Toggle } from "./ui/Controls";
import type { OcclusionRegion, OcclusionStyle } from "@/core/types";

export function PrivacyControls() {
  const source = useStore((s) => s.source);
  const antiFr = useStore((s) => s.antiFr);
  const setAntiFr = useStore((s) => s.setAntiFr);
  const frEngaged = useStore((s) => s.frEngaged);
  const setFrEngaged = useStore((s) => s.setFrEngaged);

  if (!source) return null;

  const { occlusion, warp, landmarks } = antiFr;

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
    </Section>
  );
}
