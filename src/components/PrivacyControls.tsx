import type { ReactElement } from "react";
import { isPhotoLike } from "@/core/antifr/cloak";
import type { OcclusionRegion, OcclusionStyle } from "@/core/types";
import { useAutoCloak, type AutoCloakStatus } from "@/hooks/useAutoCloak";
import { useStore } from "@/state/store";
import { Section, Segmented, SliderField, Toggle } from "./ui/Controls";

function cloakStatusMessage(status: AutoCloakStatus, applying: boolean): string {
  if (applying) return "Applying the optimized cloak to the latest preview…";
  if (status === "optimizing") return "Optimizing the cloak automatically…";
  if (status === "ready") {
    return "Cloak optimized and applied automatically. Model-specific; treat it as a measured guide.";
  }
  if (status === "unavailable") {
    return "Automatic optimization needs a detected source face. Retry face analysis if it failed.";
  }
  return "Automatic optimization starts after the latest render and face measurement settle.";
}

export function PrivacyControls(): ReactElement | null {
  const autoCloak = useAutoCloak();
  const source = useStore((s) => s.source);
  const antiFr = useStore((s) => s.antiFr);
  const setAntiFr = useStore((s) => s.setAntiFr);
  const gridSize = useStore((s) => s.effectiveGrid());
  const colorMode = useStore((s) => s.color.mode);
  const renderPending = useStore((s) => s.renderPending);

  if (!source) return null;

  const { occlusion, warp, cloak, cloakField, landmarks } = antiFr;
  const cloakActive = isPhotoLike(gridSize, colorMode);
  const applyingCloak = autoCloak.status === "ready" && renderPending && cloakField !== null;

  return (
    <Section icon="shield" title="Privacy" collapsible defaultCollapsed>
      <p className="field__label">
        Reduces how well face recognition can match this avatar to you. A ~7&nbsp;MB face model
        preloads locally in the background after the page opens; nothing is uploaded. The result is
        scored above the preview automatically — a guide, not a guarantee against every system.
      </p>

      <Toggle
        label="Hide feature band"
        checked={occlusion.enabled}
        onChange={(enabled) => setAntiFr({ occlusion: { ...occlusion, enabled } })}
      />
      {occlusion.enabled && (
        <>
          <Segmented<OcclusionRegion>
            label="Occlusion region"
            value={occlusion.region}
            onChange={(region) => setAntiFr({ occlusion: { ...occlusion, region } })}
            options={[
              { value: "eyes", label: "Eyes" },
              { value: "eyes-nose", label: "Eyes + nose" },
            ]}
          />
          <Segmented<OcclusionStyle>
            label="Occlusion style"
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
            <p className="field__label">Detecting the face… warp activates once it’s found.</p>
          )}
        </>
      )}

      <Toggle
        label="Adversarial cloak (experimental)"
        checked={cloak.enabled}
        onChange={(enabled) =>
          setAntiFr(
            enabled
              ? { cloak: { ...cloak, enabled } }
              : { cloak: { ...cloak, enabled }, cloakField: null },
          )
        }
      />
      {cloak.enabled &&
        (cloakActive ? (
          <>
            <SliderField
              label="Cloak budget"
              value={Math.round(cloak.strength * 100)}
              min={10}
              max={100}
              step={5}
              suffix="%"
              onChange={(v) => setAntiFr({ cloak: { ...cloak, strength: v / 100 } })}
            />
            {autoCloak.status === "error" ? (
              <>
                <p className="field__label" role="alert">
                  Automatic cloak optimization failed: {autoCloak.error}
                </p>
                <button
                  type="button"
                  className="btn btn--ghost btn--block"
                  onClick={autoCloak.retry}
                >
                  Retry cloak optimization
                </button>
              </>
            ) : (
              <p
                className="field__label"
                role="status"
                aria-live="polite"
                aria-busy={autoCloak.status === "optimizing"}
              >
                {cloakStatusMessage(autoCloak.status, applyingCloak)}
              </p>
            )}
          </>
        ) : (
          <p className="field__label">
            Inactive: needs a fine, full-color render (grid ≥ 96) — the mosaic erases it otherwise.
          </p>
        ))}
    </Section>
  );
}
