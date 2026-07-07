import { useStore } from "@/state/store";
import { Segmented, SliderField, Toggle, ColorField } from "./ui/Controls";
import type { DotShape, RenderMode } from "@/core/types";

export function StyleControls() {
  const renderMode = useStore((s) => s.renderMode);
  const setRenderMode = useStore((s) => s.setRenderMode);
  const square = useStore((s) => s.square);
  const setSquare = useStore((s) => s.setSquare);
  const dot = useStore((s) => s.dot);
  const setDot = useStore((s) => s.setDot);

  return (
    <section className="section">
      <h2 className="section__title">Style</h2>

      <Segmented<RenderMode>
        value={renderMode}
        onChange={setRenderMode}
        options={[
          { value: "square", label: "Square" },
          { value: "dot", label: "Dot" },
        ]}
      />

      {renderMode === "square" && (
        <>
          <SliderField
            label="Gap"
            value={square.tileGapPx}
            min={0}
            max={24}
            suffix="px"
            onChange={(tileGapPx) => setSquare({ tileGapPx })}
          />
          <SliderField
            label="Rounded"
            value={square.roundedCornersPx}
            min={0}
            max={40}
            suffix="px"
            onChange={(roundedCornersPx) => setSquare({ roundedCornersPx })}
          />
          <Toggle
            label="Outline"
            checked={square.outline}
            onChange={(outline) => setSquare({ outline })}
          />
          {square.outline && (
            <ColorField
              label="Outline color"
              value={square.outlineColor}
              onChange={(outlineColor) => setSquare({ outlineColor })}
            />
          )}
        </>
      )}

      {renderMode === "dot" && (
        <>
          <Segmented<DotShape>
            value={dot.dotShape}
            onChange={(dotShape) => setDot({ dotShape })}
            options={[
              { value: "circle", label: "●" },
              { value: "square", label: "■" },
              { value: "diamond", label: "◆" },
            ]}
          />
          <SliderField
            label="Max dot"
            value={Number(dot.maxDotScale.toFixed(2))}
            min={0.2}
            max={1.4}
            step={0.05}
            onChange={(maxDotScale) => setDot({ maxDotScale })}
          />
          <SliderField
            label="Min dot"
            value={Number(dot.minDotScale.toFixed(2))}
            min={0}
            max={0.8}
            step={0.05}
            onChange={(minDotScale) => setDot({ minDotScale })}
          />
          <Toggle
            label="Invert (light = big)"
            checked={dot.invert}
            onChange={(invert) => setDot({ invert })}
          />
        </>
      )}
    </section>
  );
}
