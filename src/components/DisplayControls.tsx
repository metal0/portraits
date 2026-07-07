import { useRef } from "react";
import { useStore } from "@/state/store";
import { DISPLAY_PRESETS, GRID_MAX, GRID_MIN, recommendGrid } from "@/core/grid";
import { buildPresetsFile, parsePresetsFile } from "@/core/presets";
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
  const presets = useStore((s) => s.presets);
  const saveCurrentAsPreset = useStore((s) => s.saveCurrentAsPreset);
  const updatePreset = useStore((s) => s.updatePreset);
  const deletePreset = useStore((s) => s.deletePreset);
  const applyPreset = useStore((s) => s.applyPreset);
  const importPresets = useStore((s) => s.importPresets);
  const fileRef = useRef<HTMLInputElement>(null);

  const recommended = recommendGrid(grid.displaySizePx, grid.targetBlockScreenPx);

  const savePreset = () => {
    const name = window.prompt("Preset name", `Preset ${presets.length + 1}`);
    if (name?.trim()) saveCurrentAsPreset(name.trim());
  };

  const exportPresets = () => {
    const blob = new Blob([JSON.stringify(buildPresetsFile(presets), null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "portraits-presets.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const importFromFile = async (file: File) => {
    try {
      const list = parsePresetsFile(await file.text());
      if (list.length > 0) importPresets(list);
    } catch {
      window.alert("Could not import: not a valid Portraits presets file.");
    }
  };

  const actions = (
    <div className="section__actions">
      <button
        type="button"
        className="icon-btn"
        title="Import presets (JSON)"
        onClick={() => fileRef.current?.click()}
      >
        <Icon name="import" size={14} />
      </button>
      <button
        type="button"
        className="icon-btn"
        title="Export presets (JSON)"
        onClick={exportPresets}
        disabled={presets.length === 0}
      >
        <Icon name="download" size={14} />
      </button>
    </div>
  );

  return (
    <Section icon="grid" title="Display size" actions={actions}>
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

        {presets.map((preset) => (
          <span key={preset.id} className="chip chip--custom">
            <button
              type="button"
              className="chip__label"
              title="Apply preset"
              onClick={() => applyPreset(preset.id)}
            >
              <Icon name="sparkles" size={12} />
              {preset.name}
            </button>
            <button
              type="button"
              className="chip__act"
              title="Update to current settings"
              onClick={() => updatePreset(preset.id)}
            >
              <Icon name="save" size={11} />
            </button>
            <button
              type="button"
              className="chip__act chip__act--danger"
              title="Delete preset"
              onClick={() => deletePreset(preset.id)}
            >
              <Icon name="trash" size={11} />
            </button>
          </span>
        ))}

        <button type="button" className="chip chip--add" title="Save current as preset" onClick={savePreset}>
          <Icon name="plus" size={13} />
          Save
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void importFromFile(file);
          e.target.value = "";
        }}
      />

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
