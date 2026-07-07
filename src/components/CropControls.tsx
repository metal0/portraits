import { useStore } from "@/state/store";
import { Section, SliderField } from "./ui/Controls";
import { Icon } from "./ui/Icon";

export function CropControls() {
  const crop = useStore((s) => s.crop);
  const setCrop = useStore((s) => s.setCrop);
  const hasImage = useStore((s) => s.source !== null);

  if (!hasImage) return null;

  return (
    <Section icon="crop" title="Crop" collapsible defaultCollapsed>
      <SliderField
        label="Zoom"
        value={Number(crop.scale.toFixed(2))}
        min={1}
        max={4}
        step={0.05}
        suffix="×"
        onChange={(scale) => setCrop({ scale })}
      />
      <SliderField
        label="Pan X"
        value={Number(crop.x.toFixed(2))}
        min={0}
        max={1}
        step={0.01}
        onChange={(x) => setCrop({ x })}
      />
      <SliderField
        label="Pan Y"
        value={Number(crop.y.toFixed(2))}
        min={0}
        max={1}
        step={0.01}
        onChange={(y) => setCrop({ y })}
      />
      <button
        type="button"
        className="btn btn--ghost btn--icon"
        onClick={() => setCrop({ x: 0.5, y: 0.5, scale: 1, rotation: 0 })}
      >
        <Icon name="reset" size={14} /> Reset crop
      </button>
    </Section>
  );
}
