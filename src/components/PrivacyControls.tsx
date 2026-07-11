import { useState, type ReactElement } from "react";
import { useStore } from "@/state/store";
import { Section, Segmented, SliderField, Toggle } from "./ui/Controls";
import { currentRequest } from "@/render/buildRequest";
import { optimizeCloak } from "@/analysis/cloakOptimize";
import { isPhotoLike } from "@/core/antifr/cloak";
import type { OcclusionRegion, OcclusionStyle } from "@/core/types";

export function PrivacyControls(): ReactElement | null {
  const source = useStore((s) => s.source);
  const antiFr = useStore((s) => s.antiFr);
  const setAntiFr = useStore((s) => s.setAntiFr);
  const baseline = useStore((s) => s.baselineEmbedding);
  const gridSize = useStore((s) => s.effectiveGrid());
  const colorMode = useStore((s) => s.color.mode);
  const renderPending = useStore((s) => s.renderPending);
  const [optimizing, setOptimizing] = useState(false);
  const [optimizationError, setOptimizationError] = useState<string | null>(null);

  if (!source) return null;

  const { occlusion, warp, cloak, cloakField, landmarks } = antiFr;
  const cloakActive = isPhotoLike(gridSize, colorMode);

  const runOptimize = async () => {
    const st = useStore.getState();
    if (!st.source || !st.baselineEmbedding || st.renderPending) return;
    const sourceAtStart = st.source;
    const baselineAtStart = st.baselineEmbedding;
    const sourceRevisionAtStart = st.sourceRevision;
    const renderVersionAtStart = st.renderVersion;
    const requestAtStart = currentRequest();
    const strengthAtStart = st.antiFr.cloak.strength;
    const displaySizeAtStart = st.grid.displaySizePx;
    const outputSizeAtStart = st.grid.outputSizePx;

    const inputsAreCurrent = (): boolean => {
      const current = useStore.getState();
      const request = currentRequest();
      return (
        current.source === sourceAtStart &&
        current.sourceRevision === sourceRevisionAtStart &&
        current.baselineEmbedding === baselineAtStart &&
        current.renderVersion === renderVersionAtStart &&
        !current.renderPending &&
        current.antiFr.cloak.enabled &&
        current.antiFr.cloak.strength === strengthAtStart &&
        current.grid.displaySizePx === displaySizeAtStart &&
        current.grid.outputSizePx === outputSizeAtStart &&
        request.crop === requestAtStart.crop &&
        request.gridSize === requestAtStart.gridSize &&
        request.outputSizePx === requestAtStart.outputSizePx &&
        request.renderMode === requestAtStart.renderMode &&
        request.square === requestAtStart.square &&
        request.dot === requestAtStart.dot &&
        request.relief === requestAtStart.relief &&
        request.ascii === requestAtStart.ascii &&
        request.color === requestAtStart.color &&
        request.adjust === requestAtStart.adjust &&
        request.exportSettings === requestAtStart.exportSettings &&
        request.antiFr === requestAtStart.antiFr
      );
    };

    setOptimizationError(null);
    setOptimizing(true);
    try {
      const field = await optimizeCloak(
        sourceAtStart,
        baselineAtStart,
        requestAtStart,
        strengthAtStart,
        displaySizeAtStart,
        outputSizeAtStart,
      );
      if (field && inputsAreCurrent()) useStore.getState().setAntiFr({ cloakField: field });
    } catch (error: unknown) {
      if (inputsAreCurrent()) {
        setOptimizationError(
          error instanceof Error ? error.message : "Cloak optimization failed. Try again.",
        );
      }
    } finally {
      setOptimizing(false);
    }
  };

  return (
    <Section icon="shield" title="Privacy" collapsible defaultCollapsed>
      <p className="field__label">
        Reduces how well face recognition can match this avatar to you. Turning on any tool loads a
        ~7&nbsp;MB face model locally (one time, nothing is uploaded) and scores the result above the
        preview — a guide, not a guarantee against every system.
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
          setAntiFr(enabled ? { cloak: { ...cloak, enabled } } : { cloak: { ...cloak, enabled }, cloakField: null })
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
            <button
              type="button"
              className="btn btn--primary btn--block"
              onClick={runOptimize}
              disabled={optimizing || !baseline || renderPending}
              aria-busy={optimizing}
            >
              {optimizing ? "Optimizing…" : cloakField ? "Re-optimize cloak" : "Optimize cloak"}
            </button>
            <p className="field__label" role="status" aria-live="polite">
              {optimizing
                ? "Optimizing the cloak locally…"
                : cloakField
                ? "Cloak baked in — watch the meter. Model-specific; an arms race like a CAPTCHA."
                : "Searches for a perturbation that lowers the match score (~10s). Watch the meter."}
            </p>
            {optimizationError && (
              <p className="field__label" role="alert">
                Cloak optimization failed: {optimizationError}
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
