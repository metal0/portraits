import { useCallback, useEffect, useRef, useState } from "react";
import { useStore } from "@/state/store";
import { Section, Segmented, SliderField, Toggle, ColorField } from "./ui/Controls";
import { Icon } from "./ui/Icon";
import { ASCII_RAMPS } from "@/core/render/ascii";
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
  const ascii = useStore((s) => s.ascii);
  const setAscii = useStore((s) => s.setAscii);

  // Style options auto-collapse ~5s after the user clicks away, and reopen when
  // a style button is pressed — so idle sliders don't clutter the panel. The
  // pending close is aborted if they click back onto the options.
  const [optionsOpen, setOptionsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<number | null>(null);

  const cancelClose = useCallback(() => {
    if (closeTimer.current !== null) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  useEffect(() => {
    if (!optionsOpen) return;
    const onDown = (e: PointerEvent) => {
      const inside = ref.current?.contains(e.target as Node);
      if (inside) {
        cancelClose();
      } else if (closeTimer.current === null) {
        closeTimer.current = window.setTimeout(() => {
          closeTimer.current = null;
          setOptionsOpen(false);
        }, 5000);
      }
    };
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      cancelClose();
    };
  }, [cancelClose, optionsOpen]);

  const selectRenderMode = (mode: RenderMode) => {
    cancelClose();
    setOptionsOpen(true);
    setRenderMode(mode);
  };

  return (
    <Section icon="sliders" title="Style">
      <div ref={ref}>
        <div>
          <Segmented<RenderMode>
            label="Render style"
            value={renderMode}
            onChange={selectRenderMode}
            options={[
              { value: "square", label: <Icon name="square" size={16} />, title: "Square" },
              { value: "dot", label: <Icon name="circle" size={16} />, title: "Dot" },
              { value: "relief", label: <Icon name="cube" size={16} />, title: "Relief" },
              { value: "ascii", label: <Icon name="type" size={16} />, title: "ASCII" },
              { value: "cmyk", label: <Icon name="circleDot" size={16} />, title: "CMYK" },
            ]}
          />
        </div>

        {optionsOpen && (
          <div className="style-opts is-open">
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
                  label="Dot shape"
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
                  label="Relief style"
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

            {renderMode === "ascii" && (
              <div className="field">
                <span className="field__label">Character set</span>
                <Segmented<string>
                  label="Character set"
                  value={ascii.ramp}
                  onChange={(ramp) => setAscii({ ramp })}
                  options={ASCII_RAMPS.map((r) => ({ value: r.ramp, label: r.name }))}
                />
              </div>
            )}

            {renderMode === "cmyk" && (
              <p className="field__label">Four-color halftone screen — looks best in full-color.</p>
            )}
            </div>
          </div>
        )}
      </div>
    </Section>
  );
}
