import { useEffect, useRef, useState } from "react";
import { useStore } from "@/state/store";
import { Section, Segmented, SliderField, Toggle, ColorField } from "./ui/Controls";
import { Icon } from "./ui/Icon";
import type { DotShape, RenderMode, ReliefVariant } from "@/core/types";

export function StyleControls() {
  const renderMode = useStore((s) => s.renderMode);
  const setRenderMode = useStore((s) => s.setRenderMode);
  const square = useStore((s) => s.square);
  const setSquare = useStore((s) => s.setSquare);
  const dot = useStore((s) => s.dot);
  const setDot = useStore((s) => s.setDot);
  const relief = useStore((s) => s.relief);
  const setRelief = useStore((s) => s.setRelief);

  // Style options auto-collapse when the user clicks away, and reopen when a
  // style button is pressed — so idle sliders don't clutter the panel.
  const [optionsOpen, setOptionsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!optionsOpen) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOptionsOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [optionsOpen]);

  return (
    <Section icon="sliders" title="Style">
      <div ref={ref}>
        <div onPointerDown={() => setOptionsOpen(true)}>
          <Segmented<RenderMode>
            value={renderMode}
            onChange={setRenderMode}
            options={[
              { value: "square", label: <Icon name="square" size={16} />, title: "Square" },
              { value: "dot", label: <Icon name="circle" size={16} />, title: "Dot" },
              { value: "relief", label: <Icon name="cube" size={16} />, title: "Relief" },
            ]}
          />
        </div>

        <div className={`style-opts${optionsOpen ? " is-open" : ""}`}>
          <div className="style-opts__inner">
            {renderMode === "square" && (
              <>
                <SliderField
                  label="Gap"
                  value={Math.round(square.gap * 100)}
                  min={0}
                  max={45}
                  step={5}
                  suffix="%"
                  onChange={(v) => setSquare({ gap: v / 100 })}
                />
                <SliderField
                  label="Rounded"
                  value={Math.round(square.cornerRadius * 100)}
                  min={0}
                  max={50}
                  step={5}
                  suffix="%"
                  onChange={(v) => setSquare({ cornerRadius: v / 100 })}
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
                    { value: "circle", label: <Icon name="circle" size={15} />, title: "Circle" },
                    { value: "square", label: <Icon name="square" size={15} />, title: "Square" },
                    { value: "diamond", label: <Icon name="diamond" size={15} />, title: "Diamond" },
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

            {renderMode === "relief" && (
              <>
                <Segmented<ReliefVariant>
                  value={relief.variant}
                  onChange={(variant) => setRelief({ variant })}
                  options={[
                    { value: "height", label: "Raised" },
                    { value: "size", label: "Size" },
                    { value: "iso", label: "Iso" },
                  ]}
                />

                {relief.variant === "size" && (
                  <>
                    <SliderField
                      label="Min size"
                      value={Number(relief.minScale.toFixed(2))}
                      min={0.1}
                      max={1}
                      step={0.05}
                      onChange={(minScale) => setRelief({ minScale })}
                    />
                    <SliderField
                      label="Max size"
                      value={Number(relief.maxScale.toFixed(2))}
                      min={0.5}
                      max={1.4}
                      step={0.05}
                      onChange={(maxScale) => setRelief({ maxScale })}
                    />
                    <SliderField
                      label="Shadow"
                      value={relief.shadowBlur}
                      min={0}
                      max={40}
                      onChange={(shadowBlur) => setRelief({ shadowBlur })}
                    />
                  </>
                )}

                {relief.variant === "height" && (
                  <>
                    <SliderField
                      label="Height"
                      value={Number(relief.heightScale.toFixed(2))}
                      min={0}
                      max={3}
                      step={0.05}
                      onChange={(heightScale) => setRelief({ heightScale })}
                    />
                    <SliderField
                      label="Shadow"
                      value={relief.shadowBlur}
                      min={0}
                      max={40}
                      onChange={(shadowBlur) => setRelief({ shadowBlur })}
                    />
                  </>
                )}

                {relief.variant === "iso" && (
                  <SliderField
                    label="Height"
                    value={Number(relief.heightScale.toFixed(2))}
                    min={0}
                    max={3}
                    step={0.05}
                    onChange={(heightScale) => setRelief({ heightScale })}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </Section>
  );
}
