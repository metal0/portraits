import { useStore } from "@/state/store";
import { Section, Segmented, SliderField, Toggle, ColorField } from "./ui/Controls";
import { Icon } from "./ui/Icon";
import { PALETTE_PRESETS } from "@/core/palette";
import type { ColorMode, PaletteSource } from "@/core/types";

export function ColorControls() {
  const color = useStore((s) => s.color);
  const setColor = useStore((s) => s.setColor);

  const applyPreset = (colors: string[]) =>
    setColor({
      mode: "palette",
      paletteSource: "custom",
      customPalette: colors,
      paletteSize: colors.length,
    });

  const setSwatch = (index: number, value: string) => {
    const next = color.customPalette.slice();
    next[index] = value;
    setColor({ customPalette: next });
  };

  const removeSwatch = (index: number) =>
    setColor({ customPalette: color.customPalette.filter((_, i) => i !== index) });

  const addSwatch = () => setColor({ customPalette: [...color.customPalette, "#888888"] });

  return (
    <Section icon="palette" title="Color">
      <Segmented<ColorMode>
        value={color.mode}
        onChange={(mode) => setColor({ mode })}
        options={[
          { value: "full-color", label: "Full" },
          { value: "grayscale", label: "Gray" },
          { value: "threshold", label: "B/W" },
          { value: "duotone", label: "Duo" },
          { value: "palette", label: "Palette" },
        ]}
      />

      {color.mode === "threshold" && (
        <>
          {color.dither === "none" && (
            <SliderField
              label="Threshold"
              value={Number(color.threshold.toFixed(2))}
              min={0.1}
              max={0.9}
              step={0.01}
              onChange={(threshold) => setColor({ threshold })}
            />
          )}
          <Toggle
            label="Floyd–Steinberg dither"
            checked={color.dither === "floyd-steinberg"}
            onChange={(on) => setColor({ dither: on ? "floyd-steinberg" : "none" })}
          />
        </>
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

      {color.mode === "palette" && (
        <>
          <Segmented<PaletteSource>
            value={color.paletteSource}
            onChange={(paletteSource) => setColor({ paletteSource })}
            options={[
              { value: "auto", label: "Auto" },
              { value: "custom", label: "Custom" },
            ]}
          />

          {color.paletteSource === "auto" && (
            <Segmented<string>
              value={String(color.paletteSize)}
              onChange={(v) => setColor({ paletteSize: Number(v) })}
              options={[2, 4, 8, 16].map((n) => ({ value: String(n), label: String(n) }))}
            />
          )}

          {color.paletteSource === "custom" && (
            <div className="swatches">
              {color.customPalette.map((hex, i) => (
                <div className="swatch" key={i}>
                  <input
                    type="color"
                    value={hex}
                    onChange={(e) => setSwatch(i, e.target.value)}
                  />
                  <button
                    type="button"
                    className="swatch__remove"
                    title="Remove color"
                    onClick={() => removeSwatch(i)}
                  >
                    <Icon name="x" size={11} />
                  </button>
                </div>
              ))}
              <button type="button" className="swatch swatch--add" title="Add color" onClick={addSwatch}>
                <Icon name="plus" size={16} />
              </button>
            </div>
          )}

          <div className="preset-row">
            {PALETTE_PRESETS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                className="chip"
                onClick={() => applyPreset(preset.colors)}
              >
                <span className="chip__swatches">
                  {preset.colors.slice(0, 4).map((c, i) => (
                    <span key={i} style={{ background: c }} />
                  ))}
                </span>
                {preset.name}
              </button>
            ))}
          </div>

          <Toggle
            label="Floyd–Steinberg dither"
            checked={color.dither === "floyd-steinberg"}
            onChange={(on) => setColor({ dither: on ? "floyd-steinberg" : "none" })}
          />
        </>
      )}
    </Section>
  );
}
