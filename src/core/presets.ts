import { GRID_MAX, GRID_MIN } from "./grid";
import type { AntiFrOptions, CustomPreset, PresetConfig, PresetsFile } from "./types";
import { PRESETS_FILE_VERSION } from "./types";

const DEFAULT_ASCII_RAMP = "@%#*+=-:. ";
const HEX_COLOR = /^#[0-9a-f]{6}$/i;
export const MAX_PRESETS = 500;
export const MAX_PALETTE_COLORS = 256;
export const MAX_PRESET_NAME_LENGTH = 100;

const RENDER_MODES = ["square", "dot", "relief", "ascii", "cmyk"] as const;
const DOT_SHAPES = ["circle", "square", "diamond"] as const;
const RELIEF_VARIANTS = ["size", "height", "iso"] as const;
const COLOR_MODES = ["full-color", "grayscale", "threshold", "duotone", "palette"] as const;
const PALETTE_SOURCES = ["auto", "custom"] as const;
const DITHER_MODES = ["none", "floyd-steinberg", "bayer"] as const;
const OCCLUSION_REGIONS = ["eyes", "eyes-nose"] as const;
const OCCLUSION_STYLES = ["bar", "scramble", "pixelate"] as const;

type UnknownRecord = Record<string, unknown>;

export function buildPresetsFile(presets: CustomPreset[]): PresetsFile {
  if (presets.length > MAX_PRESETS) {
    throw new Error(`Cannot export more than ${MAX_PRESETS} presets`);
  }

  return {
    app: "portraits",
    kind: "presets",
    version: PRESETS_FILE_VERSION,
    presets: presets.map((preset, index) => parsePreset(preset, `presets[${index}]`)),
  };
}

/** Parse, validate, and normalize a shared presets file. Throws on any invalid value. */
export function parsePresetsFile(text: string): CustomPreset[] {
  const data: unknown = JSON.parse(text);
  const file = requireRecord(data, "file");
  requireKeys(file, ["app", "kind", "version", "presets"], "file");

  if (file.app !== "portraits" || file.kind !== "presets") {
    throw new Error("Not a Portraits presets file");
  }
  if (file.version !== PRESETS_FILE_VERSION) {
    throw new Error(`Unsupported presets file version: ${String(file.version)}`);
  }

  const presets = requireArray(file.presets, "file.presets");
  if (presets.length > MAX_PRESETS) {
    throw new Error(`file.presets must contain at most ${MAX_PRESETS} presets`);
  }

  return presets.map((preset, index) => parsePreset(preset, `file.presets[${index}]`));
}

/** Normalize valid persisted presets while discarding entries that can no longer be applied safely. */
export function normalizeStoredPresets(value: unknown): CustomPreset[] {
  if (!Array.isArray(value)) return [];

  const normalized: CustomPreset[] = [];
  for (const [index, preset] of value.entries()) {
    if (normalized.length >= MAX_PRESETS) break;
    try {
      normalized.push(parsePreset(preset, `stored.presets[${index}]`));
    } catch {
      // Invalid local entries are omitted so one damaged preset cannot break hydration.
    }
  }
  return normalized;
}

export function normalizePresetName(name: string): string {
  return name.trim().slice(0, MAX_PRESET_NAME_LENGTH);
}

function parsePreset(value: unknown, path: string): CustomPreset {
  const preset = requireRecord(value, path);
  requireKeys(preset, ["id", "name", "config"], path);

  return {
    id: requireBoundedString(preset.id, `${path}.id`, 1, 128),
    name: requireBoundedString(
      preset.name,
      `${path}.name`,
      1,
      MAX_PRESET_NAME_LENGTH,
      true,
    ),
    config: parseConfig(preset.config, `${path}.config`),
  };
}

function parseConfig(value: unknown, path: string): PresetConfig {
  const config = requireRecord(value, path);
  requireKeys(
    config,
    [
      "grid",
      "renderMode",
      "square",
      "dot",
      "relief",
      "ascii",
      "color",
      "adjust",
      "exportSettings",
      "antiFr",
    ],
    path,
    ["ascii", "antiFr"],
  );

  const grid = parseGrid(config.grid, `${path}.grid`);
  return {
    grid,
    renderMode: requireEnum(config.renderMode, RENDER_MODES, `${path}.renderMode`),
    square: parseSquare(config.square, grid, `${path}.square`),
    dot: parseDot(config.dot, `${path}.dot`),
    relief: parseRelief(config.relief, `${path}.relief`),
    ascii: parseAscii(config.ascii, `${path}.ascii`),
    color: parseColor(config.color, `${path}.color`),
    adjust: parseAdjust(config.adjust, `${path}.adjust`),
    exportSettings: parseExportSettings(config.exportSettings, `${path}.exportSettings`),
    antiFr: parseAntiFr(config.antiFr, `${path}.antiFr`),
  };
}

function parseGrid(value: unknown, path: string): PresetConfig["grid"] {
  const grid = requireRecord(value, path);
  requireKeys(
    grid,
    ["displaySizePx", "targetBlockScreenPx", "outputSizePx", "gridOverride"],
    path,
  );

  return {
    displaySizePx: requireInteger(grid.displaySizePx, `${path}.displaySizePx`, 16, 128),
    targetBlockScreenPx: requireNumber(grid.targetBlockScreenPx, `${path}.targetBlockScreenPx`, 1, 3),
    outputSizePx: requireInteger(grid.outputSizePx, `${path}.outputSizePx`, 512, 4096),
    gridOverride:
      grid.gridOverride === null
        ? null
        : requireInteger(grid.gridOverride, `${path}.gridOverride`, GRID_MIN, GRID_MAX),
  };
}

function parseSquare(
  value: unknown,
  grid: PresetConfig["grid"],
  path: string,
): PresetConfig["square"] {
  const square = requireRecord(value, path);
  const hasCurrentShape = hasOwn(square, "gap") || hasOwn(square, "cornerRadius");
  const hasLegacyShape = hasOwn(square, "tileGapPx") || hasOwn(square, "roundedCornersPx");

  if (hasCurrentShape === hasLegacyShape) {
    throw new Error(`${path} must use one supported square settings shape`);
  }

  const outline = requireBoolean(square.outline, `${path}.outline`);
  const outlineColor = requireColor(square.outlineColor, `${path}.outlineColor`);
  if (hasCurrentShape) {
    requireKeys(square, ["gap", "cornerRadius", "outline", "outlineColor"], path);
    return {
      gap: requireNumber(square.gap, `${path}.gap`, 0, 0.45),
      cornerRadius: requireNumber(square.cornerRadius, `${path}.cornerRadius`, 0, 0.5),
      outline,
      outlineColor,
    };
  }

  requireKeys(square, ["tileGapPx", "roundedCornersPx", "outline", "outlineColor"], path);
  const tileGapPx = requireNumber(square.tileGapPx, `${path}.tileGapPx`, 0, 24);
  const roundedCornersPx = requireNumber(
    square.roundedCornersPx,
    `${path}.roundedCornersPx`,
    0,
    40,
  );
  const legacyGrid =
    grid.gridOverride ??
    Math.min(GRID_MAX, Math.max(GRID_MIN, Math.round(grid.displaySizePx / grid.targetBlockScreenPx)));
  const cellSize = grid.outputSizePx / legacyGrid;
  const gap = Math.min(0.45, tileGapPx / cellSize);
  const tileSize = Math.max(Number.EPSILON, cellSize - tileGapPx);

  return {
    gap,
    cornerRadius: Math.min(0.5, roundedCornersPx / tileSize),
    outline,
    outlineColor,
  };
}

function parseDot(value: unknown, path: string): PresetConfig["dot"] {
  const dot = requireRecord(value, path);
  requireKeys(dot, ["dotShape", "invert", "minDotScale", "maxDotScale"], path);

  return {
    dotShape: requireEnum(dot.dotShape, DOT_SHAPES, `${path}.dotShape`),
    invert: requireBoolean(dot.invert, `${path}.invert`),
    minDotScale: requireNumber(dot.minDotScale, `${path}.minDotScale`, 0, 0.8),
    maxDotScale: requireNumber(dot.maxDotScale, `${path}.maxDotScale`, 0.2, 1.4),
  };
}

function parseRelief(value: unknown, path: string): PresetConfig["relief"] {
  const relief = requireRecord(value, path);
  requireKeys(
    relief,
    ["variant", "minScale", "maxScale", "shadowBlur", "shadowOffset", "heightScale"],
    path,
  );

  return {
    variant: requireEnum(relief.variant, RELIEF_VARIANTS, `${path}.variant`),
    minScale: requireNumber(relief.minScale, `${path}.minScale`, 0.1, 1),
    maxScale: requireNumber(relief.maxScale, `${path}.maxScale`, 0.5, 1.4),
    shadowBlur: requireNumber(relief.shadowBlur, `${path}.shadowBlur`, 0, 40),
    shadowOffset: requireNumber(relief.shadowOffset, `${path}.shadowOffset`, -40, 40),
    heightScale: requireNumber(relief.heightScale, `${path}.heightScale`, 0, 3),
  };
}

function parseAscii(value: unknown, path: string): PresetConfig["ascii"] {
  if (value === undefined) return { ramp: DEFAULT_ASCII_RAMP };

  const ascii = requireRecord(value, path);
  requireKeys(ascii, ["ramp"], path);
  const ramp = requireBoundedString(ascii.ramp, `${path}.ramp`, 0, 256);
  return { ramp: ramp.length > 0 ? ramp : DEFAULT_ASCII_RAMP };
}

function parseColor(value: unknown, path: string): PresetConfig["color"] {
  const color = requireRecord(value, path);
  requireKeys(
    color,
    [
      "mode",
      "threshold",
      "duotoneDark",
      "duotoneLight",
      "paletteSize",
      "paletteSource",
      "customPalette",
      "dither",
    ],
    path,
  );

  const customPalette = requireArray(color.customPalette, `${path}.customPalette`);
  if (customPalette.length > MAX_PALETTE_COLORS) {
    throw new Error(`${path}.customPalette must contain at most ${MAX_PALETTE_COLORS} colors`);
  }

  return {
    mode: requireEnum(color.mode, COLOR_MODES, `${path}.mode`),
    threshold: requireNumber(color.threshold, `${path}.threshold`, 0.1, 0.9),
    duotoneDark: requireColor(color.duotoneDark, `${path}.duotoneDark`),
    duotoneLight: requireColor(color.duotoneLight, `${path}.duotoneLight`),
    paletteSize: requireInteger(color.paletteSize, `${path}.paletteSize`, 1, 256),
    paletteSource: requireEnum(color.paletteSource, PALETTE_SOURCES, `${path}.paletteSource`),
    customPalette: customPalette.map((entry, index) =>
      requireColor(entry, `${path}.customPalette[${index}]`),
    ),
    dither: requireEnum(color.dither, DITHER_MODES, `${path}.dither`),
  };
}

function parseAdjust(value: unknown, path: string): PresetConfig["adjust"] {
  const adjust = requireRecord(value, path);
  requireKeys(
    adjust,
    ["brightness", "contrast", "saturation", "gamma", "posterize", "sharpen"],
    path,
  );

  return {
    brightness: requireNumber(adjust.brightness, `${path}.brightness`, -100, 100),
    contrast: requireNumber(adjust.contrast, `${path}.contrast`, -100, 100),
    saturation: requireNumber(adjust.saturation, `${path}.saturation`, -100, 100),
    gamma: requireNumber(adjust.gamma, `${path}.gamma`, 0.2, 3),
    posterize: requireInteger(adjust.posterize, `${path}.posterize`, 0, 16),
    sharpen: requireNumber(adjust.sharpen, `${path}.sharpen`, 0, 100),
  };
}

function parseExportSettings(value: unknown, path: string): PresetConfig["exportSettings"] {
  const settings = requireRecord(value, path);
  requireKeys(settings, ["transparentBackground", "circularMask", "backgroundColor"], path);

  return {
    transparentBackground: requireBoolean(
      settings.transparentBackground,
      `${path}.transparentBackground`,
    ),
    circularMask: requireBoolean(settings.circularMask, `${path}.circularMask`),
    backgroundColor: requireColor(settings.backgroundColor, `${path}.backgroundColor`),
  };
}

function parseAntiFr(value: unknown, path: string): AntiFrOptions {
  if (value === undefined) return defaultAntiFr();

  const antiFr = requireRecord(value, path);
  requireKeys(
    antiFr,
    ["occlusion", "warp", "cloak", "cloakField", "landmarks"],
    path,
    ["cloakField", "landmarks"],
  );
  if (antiFr.cloakField !== undefined && antiFr.cloakField !== null) {
    throw new Error(`${path}.cloakField must be null`);
  }
  if (antiFr.landmarks !== undefined && antiFr.landmarks !== null) {
    throw new Error(`${path}.landmarks must be null`);
  }

  const occlusion = requireRecord(antiFr.occlusion, `${path}.occlusion`);
  requireKeys(occlusion, ["enabled", "region", "style", "strength"], `${path}.occlusion`);
  const warp = requireRecord(antiFr.warp, `${path}.warp`);
  requireKeys(warp, ["enabled", "strength"], `${path}.warp`);
  const cloak = requireRecord(antiFr.cloak, `${path}.cloak`);
  requireKeys(cloak, ["enabled", "strength"], `${path}.cloak`);

  return {
    occlusion: {
      enabled: requireBoolean(occlusion.enabled, `${path}.occlusion.enabled`),
      region: requireEnum(occlusion.region, OCCLUSION_REGIONS, `${path}.occlusion.region`),
      style: requireEnum(occlusion.style, OCCLUSION_STYLES, `${path}.occlusion.style`),
      strength: requireNumber(occlusion.strength, `${path}.occlusion.strength`, 0, 1),
    },
    warp: {
      enabled: requireBoolean(warp.enabled, `${path}.warp.enabled`),
      strength: requireNumber(warp.strength, `${path}.warp.strength`, 0, 1),
    },
    cloak: {
      enabled: requireBoolean(cloak.enabled, `${path}.cloak.enabled`),
      strength: requireNumber(cloak.strength, `${path}.cloak.strength`, 0, 1),
    },
    cloakField: null,
    landmarks: null,
  };
}

function defaultAntiFr(): AntiFrOptions {
  return {
    occlusion: { enabled: false, region: "eyes", style: "bar", strength: 0.5 },
    warp: { enabled: false, strength: 0.5 },
    cloak: { enabled: false, strength: 0.5 },
    cloakField: null,
    landmarks: null,
  };
}

function requireRecord(value: unknown, path: string): UnknownRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${path} must be an object`);
  }
  return value as UnknownRecord;
}

function requireKeys(
  value: UnknownRecord,
  keys: readonly string[],
  path: string,
  optionalKeys: readonly string[] = [],
): void {
  const allowed = new Set(keys);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) throw new Error(`${path}.${key} is not supported`);
  }
  const optional = new Set(optionalKeys);
  for (const key of keys) {
    if (!optional.has(key) && !hasOwn(value, key)) throw new Error(`${path}.${key} is required`);
  }
}

function hasOwn(value: UnknownRecord, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function requireArray(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`${path} must be an array`);
  return value;
}

function requireBoundedString(
  value: unknown,
  path: string,
  minLength: number,
  maxLength: number,
  requireVisibleCharacter = false,
): string {
  if (typeof value !== "string" || value.length < minLength || value.length > maxLength) {
    throw new Error(`${path} must be a string between ${minLength} and ${maxLength} characters`);
  }
  if (requireVisibleCharacter && value.trim().length === 0) {
    throw new Error(`${path} must not be blank`);
  }
  return value;
}

function requireBoolean(value: unknown, path: string): boolean {
  if (typeof value !== "boolean") throw new Error(`${path} must be a boolean`);
  return value;
}

function requireNumber(value: unknown, path: string, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    throw new Error(`${path} must be a finite number between ${min} and ${max}`);
  }
  return value;
}

function requireInteger(value: unknown, path: string, min: number, max: number): number {
  const number = requireNumber(value, path, min, max);
  if (!Number.isInteger(number)) throw new Error(`${path} must be an integer`);
  return number;
}

function requireColor(value: unknown, path: string): string {
  if (typeof value !== "string" || value.length !== 7 || !HEX_COLOR.test(value)) {
    throw new Error(`${path} must be a six-digit hexadecimal color`);
  }
  return value;
}

function requireEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  path: string,
): T {
  if (typeof value !== "string" || !isAllowed(allowed, value)) {
    throw new Error(`${path} is not a supported value`);
  }
  return value;
}

function isAllowed<T extends string>(allowed: readonly T[], value: string): value is T {
  return allowed.some((candidate) => candidate === value);
}
