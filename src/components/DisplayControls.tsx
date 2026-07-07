import { useStore } from "@/state/store";
import { DISPLAY_PRESETS, GRID_MAX, GRID_MIN, recommendGrid } from "@/core/grid";
import { Section, SliderField } from "./ui/Controls";
import { Icon, type IconName } from "./ui/Icon";

const PRESET_ICON: Record<string, IconName> = {
  "Discord small": "discord",
  "Discord profile": "discord",
  "Twitter/X avatar": "x_logo",
  "Instagram profile": "instagram",
  "GitHub avatar": "github",
};

export function DisplayControls() {
  const grid = useStore((s) => s.grid);
  const setGrid = useStore((s) => s.setGrid);
  const effectiveGrid = useStore((s) => s.effectiveGrid());
  const recommended = recommendGrid(grid.displaySizePx, grid.targetBlockScreenPx);

  return (
    <Section icon="grid" title="Display size">
      <div className="preset-row">
        {Object.entries(DISPLAY_PRESETS).map(([name, preset]) => (
          <button
            key={name}
            type="button"
            className="chip"
            onClick={() =>
              setGrid({
                displaySizePx: preset.displaySizePx,
                targetBlockScreenPx: preset.targetBlockScreenPx,
                gridOverride: null,
              })
            }
          >
            <Icon name={PRESET_ICON[name] ?? "grid"} size={13} />
            {name}
          </button>
        ))}
      </div>

      <SliderField
        label="Shown at"
        value={grid.displaySizePx}
        min={16}
        max={128}
        suffix="px"
        onChange={(displaySizePx) => setGrid({ displaySizePx })}
      />
      <SliderField
        label="Block target"
        value={grid.targetBlockScreenPx}
        min={1}
        max={3}
        step={0.25}
        suffix="px"
        onChange={(targetBlockScreenPx) => setGrid({ targetBlockScreenPx })}
      />

      <div className="grid-summary">
        <span>
          Recommended grid <strong>{recommended}×{recommended}</strong>
        </span>
        <label className="grid-override">
          <input
            type="checkbox"
            checked={grid.gridOverride !== null}
            onChange={(e) => setGrid({ gridOverride: e.target.checked ? recommended : null })}
          />
          Override
        </label>
      </div>

      {grid.gridOverride !== null && (
        <SliderField
          label="Grid"
          value={grid.gridOverride}
          min={GRID_MIN}
          max={GRID_MAX}
          suffix={`×${grid.gridOverride}`}
          onChange={(gridOverride) => setGrid({ gridOverride })}
        />
      )}

      <p className="grid-effective">
        Active: {effectiveGrid}×{effectiveGrid} blocks
      </p>
    </Section>
  );
}
