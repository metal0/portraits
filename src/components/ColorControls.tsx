import { useStore } from "@/state/store";
import { Segmented, SliderField, ColorField } from "./ui/Controls";
import type { ColorMode } from "@/core/types";

export function ColorControls() {
  const color = useStore((s) => s.color);
  const setColor = useStore((s) => s.setColor);

  return (
    <section className="section">
      <h2 className="section__title">Color</h2>

      <Segmented<ColorMode>
        value={color.mode}
        onChange={(mode) => setColor({ mode })}
        options={[
          { value: "full-color", label: "Full" },
          { value: "grayscale", label: "Gray" },
          { value: "threshold", label: "B/W" },
          { value: "duotone", label: "Duo" },
        ]}
      />

      {color.mode === "threshold" && (
        <SliderField
          label="Threshold"
          value={Number(color.threshold.toFixed(2))}
          min={0.1}
          max={0.9}
          step={0.01}
          onChange={(threshold) => setColor({ threshold })}
        />
      )}

      {color.mode === "duotone" && (
        <div className="duo-row">
          <ColorField
            label="Dark"
            value={color.duotoneDark}
            onChange={(duotoneDark) => setColor({ duotoneDark })}
          />
          <ColorField
            label="Light"
            value={color.duotoneLight}
            onChange={(duotoneLight) => setColor({ duotoneLight })}
          />
        </div>
      )}
    </section>
  );
}
