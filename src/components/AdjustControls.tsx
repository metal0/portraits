import { useStore } from "@/state/store";
import { Section, SliderField } from "./ui/Controls";
import { Icon } from "./ui/Icon";
import { sampleGrid } from "@/core/sampling";
import { computeAutoAdjust, NEUTRAL_ADJUST } from "@/core/adjust";

export function AdjustControls() {
  const adjust = useStore((s) => s.adjust);
  const setAdjust = useStore((s) => s.setAdjust);
  const source = useStore((s) => s.source);
  const crop = useStore((s) => s.crop);
  const gridSize = useStore((s) => s.effectiveGrid());

  if (!source) return null;

  const autoEnhance = () => {
    const sample = sampleGrid(source, crop, gridSize);
    setAdjust({ ...NEUTRAL_ADJUST, ...computeAutoAdjust(sample) });
  };

  const actions = (
    <div className="section__actions">
      <button type="button" className="icon-btn" title="Auto-enhance" onClick={autoEnhance}>
        <Icon name="sparkles" size={14} />
      </button>
      <button
        type="button"
        className="icon-btn"
        title="Reset adjustments"
        onClick={() => setAdjust({ ...NEUTRAL_ADJUST })}
      >
        <Icon name="reset" size={14} />
      </button>
    </div>
  );

  return (
    <Section icon="sliders" title="Adjust" actions={actions}>
      <SliderField
        label="Brightness"
        value={adjust.brightness}
        min={-100}
        max={100}
        onChange={(brightness) => setAdjust({ brightness })}
      />
      <SliderField
        label="Contrast"
        value={adjust.contrast}
        min={-100}
        max={100}
        onChange={(contrast) => setAdjust({ contrast })}
      />
      <SliderField
        label="Saturation"
        value={adjust.saturation}
        min={-100}
        max={100}
        onChange={(saturation) => setAdjust({ saturation })}
      />
      <SliderField
        label="Gamma"
        value={Number(adjust.gamma.toFixed(2))}
        min={0.2}
        max={3}
        step={0.05}
        onChange={(gamma) => setAdjust({ gamma })}
      />
      <SliderField
        label="Posterize"
        value={adjust.posterize}
        min={0}
        max={16}
        suffix={adjust.posterize === 0 ? " (off)" : " levels"}
        onChange={(posterize) => setAdjust({ posterize })}
      />
      <SliderField
        label="Sharpen"
        value={adjust.sharpen}
        min={0}
        max={100}
        onChange={(sharpen) => setAdjust({ sharpen })}
      />
    </Section>
  );
}
