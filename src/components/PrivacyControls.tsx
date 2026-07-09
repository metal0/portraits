import { useStore } from "@/state/store";
import { Section, Segmented, SliderField, Toggle } from "./ui/Controls";
import type { OcclusionRegion, OcclusionStyle } from "@/core/types";

export function PrivacyControls() {
  const source = useStore((s) => s.source);
  const antiFr = useStore((s) => s.antiFr);
  const setAntiFr = useStore((s) => s.setAntiFr);

  if (!source) return null;

  const { occlusion, warp, landmarks } = antiFr;

  return (
    <Section icon="shield" title="Privacy" collapsible defaultCollapsed>
      <p className="field__label">
        Reduces how well face recognition can match this avatar to you. Measured against a bundled
        open-source model — a guide, not a guarantee against every system.
      </p>

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
        onChange={(enabled) => setAntiFr({ warp: { ...warp, enabled } })}
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
            <p className="field__label">Waiting on face detection — warp needs a detected face.</p>
          )}
        </>
      )}
    </Section>
  );
}
