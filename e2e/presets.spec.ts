import { expect, test } from "@playwright/test";
import { buildSvg } from "../src/core/export/svg";
import {
  buildPresetsFile,
  MAX_PRESET_NAME_LENGTH,
  normalizePresetName,
  normalizeStoredPresets,
  parsePresetsFile,
} from "../src/core/presets";
import type { CustomPreset, RenderRequest, SampledGrid } from "../src/core/types";

const CURRENT_PRESET: CustomPreset = {
  id: "preset-current",
  name: "Current preset",
  config: {
    grid: {
      displaySizePx: 64,
      targetBlockScreenPx: 2,
      outputSizePx: 1024,
      gridOverride: null,
    },
    renderMode: "square",
    square: { gap: 0.1, cornerRadius: 0.2, outline: true, outlineColor: "#112233" },
    dot: { dotShape: "circle", invert: false, minDotScale: 0, maxDotScale: 1 },
    relief: {
      variant: "height",
      minScale: 0.35,
      maxScale: 1,
      shadowBlur: 12,
      shadowOffset: 6,
      heightScale: 0.6,
    },
    ascii: { ramp: "@# " },
    color: {
      mode: "full-color",
      threshold: 0.5,
      duotoneDark: "#1a1a2e",
      duotoneLight: "#e8e8f0",
      paletteSize: 8,
      paletteSource: "auto",
      customPalette: ["#000000", "#ffffff"],
      dither: "none",
    },
    adjust: {
      brightness: 0,
      contrast: 0,
      saturation: 0,
      gamma: 1,
      posterize: 0,
      sharpen: 0,
    },
    exportSettings: {
      transparentBackground: false,
      circularMask: false,
      backgroundColor: "#0e0e12",
    },
    antiFr: {
      occlusion: { enabled: false, region: "eyes", style: "bar", strength: 0.5 },
      warp: { enabled: false, strength: 0.5 },
      cloak: { enabled: false, strength: 0.5 },
      cloakField: null,
      landmarks: null,
    },
  },
};

function serializePreset(preset: unknown): string {
  return JSON.stringify({ app: "portraits", kind: "presets", version: 1, presets: [preset] });
}

test("parses a current version-1 presets export", () => {
  // #given a file produced by the current exporter
  const file = JSON.stringify(buildPresetsFile([CURRENT_PRESET]));

  // #when the shared file is parsed
  const parsed = parsePresetsFile(file);

  // #then the complete preset survives validation unchanged
  expect(parsed).toEqual([CURRENT_PRESET]);
});

test("keeps app-created preset names inside the export contract", () => {
  // #given a name longer than the import format allows
  const appName = normalizePresetName(`  ${"x".repeat(MAX_PRESET_NAME_LENGTH + 20)}  `);

  // #when the app builds and reparses an export containing that name
  const file = JSON.stringify(buildPresetsFile([{ ...CURRENT_PRESET, name: appName }]));

  // #then the app-produced export round-trips through its own parser
  expect(appName).toHaveLength(MAX_PRESET_NAME_LENGTH);
  expect(parsePresetsFile(file)[0]?.name).toBe(appName);
});

test("normalizes an early version-1 preset before returning it", () => {
  // #given a version-1 preset from before relative square settings, ASCII, and privacy options
  const legacyPreset = {
    id: "preset-legacy",
    name: "Legacy preset",
    config: {
      grid: CURRENT_PRESET.config.grid,
      renderMode: CURRENT_PRESET.config.renderMode,
      square: {
        tileGapPx: 8,
        roundedCornersPx: 6,
        outline: true,
        outlineColor: "#112233",
      },
      dot: CURRENT_PRESET.config.dot,
      relief: CURRENT_PRESET.config.relief,
      color: CURRENT_PRESET.config.color,
      adjust: CURRENT_PRESET.config.adjust,
      exportSettings: CURRENT_PRESET.config.exportSettings,
    },
  };

  // #when the legacy file is parsed
  const parsed = parsePresetsFile(serializePreset(legacyPreset));

  // #then missing settings and pixel square values are normalized to the current schema
  expect(parsed[0]?.config).toMatchObject({
    square: { gap: 0.25, cornerRadius: 0.25 },
    ascii: { ramp: "@%#*+=-:. " },
    antiFr: {
      occlusion: { enabled: false, region: "eyes", style: "bar", strength: 0.5 },
      warp: { enabled: false, strength: 0.5 },
      cloak: { enabled: false, strength: 0.5 },
      cloakField: null,
      landmarks: null,
    },
  });
});

test("normalizes legacy persisted presets and discards unsafe entries", () => {
  // #given local state containing one early preset and one malformed preset
  const legacyPreset = {
    ...CURRENT_PRESET,
    config: {
      ...CURRENT_PRESET.config,
      square: {
        tileGapPx: 8,
        roundedCornersPx: 6,
        outline: true,
        outlineColor: "#112233",
      },
      ascii: undefined,
      antiFr: undefined,
    },
  };
  const malformedPreset = {
    ...CURRENT_PRESET,
    id: "preset-malformed",
    config: { ...CURRENT_PRESET.config, color: null },
  };

  // #when persisted presets are normalized during hydration
  const normalized = normalizeStoredPresets([legacyPreset, malformedPreset]);

  // #then the valid legacy entry is upgraded and the unsafe entry is omitted
  expect(normalized).toHaveLength(1);
  expect(normalized[0]?.config).toMatchObject({
    square: { gap: 0.25, cornerRadius: 0.25 },
    ascii: { ramp: "@%#*+=-:. " },
  });
});

test("hydrates and applies an early persisted preset without invalid geometry", async ({ page }) => {
  // #given a preset persisted by the app before relative square settings were introduced
  const legacyPreset = {
    ...CURRENT_PRESET,
    id: "persisted-legacy",
    name: "Persisted legacy",
    config: {
      ...CURRENT_PRESET.config,
      square: {
        tileGapPx: 8,
        roundedCornersPx: 6,
        outline: true,
        outlineColor: "#112233",
      },
      ascii: undefined,
      antiFr: undefined,
    },
  };
  await page.addInitScript((preset) => {
    window.localStorage.setItem(
      "portraits-store",
      JSON.stringify({ state: { presets: [preset] }, version: 1 }),
    );
  }, legacyPreset);

  // #when the app hydrates and the user applies that preset
  await page.goto("/");
  await page.getByRole("button", { name: "Persisted legacy" }).click();
  await page.getByRole("radio", { name: "Square" }).click();

  // #then its pixel geometry has been converted into valid relative controls
  await expect(
    page.locator("label.field").filter({ hasText: "Gap" }).locator('input[type="range"]'),
  ).toHaveValue("25");
  await expect(
    page.locator("label.field").filter({ hasText: "Rounded" }).locator('input[type="range"]'),
  ).toHaveValue("25");
});

test("rejects an unsupported presets file version", () => {
  // #given a structurally valid file with an unknown version
  const file = JSON.stringify({ ...buildPresetsFile([CURRENT_PRESET]), version: 2 });

  // #when and #then the file is parsed, it is rejected before presets are returned
  expect(() => parsePresetsFile(file)).toThrow(/Unsupported presets file version/);
});

test("rejects an invalid nested object shape", () => {
  // #given a preset whose custom palette is not an array
  const preset = {
    ...CURRENT_PRESET,
    config: {
      ...CURRENT_PRESET.config,
      color: { ...CURRENT_PRESET.config.color, customPalette: { color: "#000000" } },
    },
  };

  // #when and #then the preset is parsed, the malformed array is rejected
  expect(() => parsePresetsFile(serializePreset(preset))).toThrow(/customPalette must be an array/);
});

test("rejects an unsupported enum value", () => {
  // #given a preset with an unknown render mode
  const preset = {
    ...CURRENT_PRESET,
    config: { ...CURRENT_PRESET.config, renderMode: "video" },
  };

  // #when and #then the preset is parsed, the enum is rejected
  expect(() => parsePresetsFile(serializePreset(preset))).toThrow(/renderMode is not a supported value/);
});

test("rejects an out-of-range numeric setting", () => {
  // #given a preset whose square gap exceeds the supported range
  const preset = {
    ...CURRENT_PRESET,
    config: {
      ...CURRENT_PRESET.config,
      square: { ...CURRENT_PRESET.config.square, gap: 0.46 },
    },
  };

  // #when and #then the preset is parsed, the range violation is rejected
  expect(() => parsePresetsFile(serializePreset(preset))).toThrow(/gap must be a finite number/);
});

test("rejects a non-finite numeric setting", () => {
  // #given JSON whose exponent overflows to Infinity when parsed
  const file = serializePreset(CURRENT_PRESET).replace('"gap":0.1', '"gap":1e400');

  // #when and #then the preset is parsed, the non-finite value is rejected
  expect(() => parsePresetsFile(file)).toThrow(/gap must be a finite number/);
});

test("rejects a color that could inject SVG markup", () => {
  // #given a preset with markup in an SVG-controlled color field
  const preset = {
    ...CURRENT_PRESET,
    config: {
      ...CURRENT_PRESET.config,
      square: {
        ...CURRENT_PRESET.config.square,
        outlineColor: '#000000"/><script>alert(1)</script><rect fill="#000000',
      },
    },
  };

  // #when and #then the preset is parsed, the hostile color is rejected
  expect(() => parsePresetsFile(serializePreset(preset))).toThrow(/outlineColor must be a six-digit/);
});

test("sanitizes SVG colors even when the builder receives an untrusted request", () => {
  // #given a render request with hostile background and outline color strings
  const hostileColor = '#000000"/><script>alert(1)</script><rect fill="#000000';
  const sample: SampledGrid = {
    size: 1,
    cells: [{ gx: 0, gy: 0, r: 255, g: 255, b: 255, a: 255, luma: 1 }],
  };
  const request: RenderRequest = {
    crop: { x: 0.5, y: 0.5, scale: 1, rotation: 0 },
    gridSize: 1,
    outputSizePx: 64,
    renderMode: "square",
    square: {
      ...CURRENT_PRESET.config.square,
      outlineColor: hostileColor,
    },
    dot: CURRENT_PRESET.config.dot,
    relief: CURRENT_PRESET.config.relief,
    ascii: CURRENT_PRESET.config.ascii,
    color: CURRENT_PRESET.config.color,
    adjust: CURRENT_PRESET.config.adjust,
    exportSettings: {
      ...CURRENT_PRESET.config.exportSettings,
      backgroundColor: hostileColor,
    },
    antiFr: CURRENT_PRESET.config.antiFr,
  };

  // #when the SVG is serialized
  const svg = buildSvg(sample, request);

  // #then both unsafe paint values are replaced by safe hexadecimal colors
  expect(svg.match(/#000000/g)).toHaveLength(2);
});

test("keeps a malformed imported preset out of the store", async ({ page }) => {
  // #given a shared file whose preset is missing a required nested object
  const preset = {
    ...CURRENT_PRESET,
    config: { ...CURRENT_PRESET.config, color: null },
  };
  await page.goto("/");

  // #when the user imports the malformed file and dismisses the validation alert
  const dialogPromise = page.waitForEvent("dialog");
  await page.locator('input[accept*="json"]').setInputFiles({
    name: "malformed-presets.json",
    mimeType: "application/json",
    buffer: Buffer.from(serializePreset(preset)),
  });
  const dialog = await dialogPromise;
  await dialog.accept();

  // #then the rejected preset never becomes an actionable store entry
  await expect(page.getByRole("button", { name: CURRENT_PRESET.name })).toHaveCount(0);
});
