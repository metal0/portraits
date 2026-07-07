import type { DisplayPreset } from "./types";

export const GRID_MIN = 12;
export const GRID_MAX = 128;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Grid resolution back-solved from how large the avatar will actually be
 * displayed. Clamped to a range that stays recognizable as a face.
 */
export function recommendGrid(displaySizePx: number, targetBlockScreenPx: number): number {
  const raw = Math.round(displaySizePx / targetBlockScreenPx);
  return clamp(raw, GRID_MIN, GRID_MAX);
}

/** Pixel size of one block in the exported image. */
export function blockSize(outputSizePx: number, gridSize: number): number {
  return outputSizePx / gridSize;
}

export const DISPLAY_PRESETS: Record<string, DisplayPreset> = {
  "Discord small": { displaySizePx: 32, targetBlockScreenPx: 1.5 },
  "Discord profile": { displaySizePx: 80, targetBlockScreenPx: 2 },
  "Twitter/X avatar": { displaySizePx: 48, targetBlockScreenPx: 1.75 },
  "Instagram profile": { displaySizePx: 110, targetBlockScreenPx: 2 },
  "GitHub avatar": { displaySizePx: 40, targetBlockScreenPx: 1.5 },
};

export const PREVIEW_SIZES = [24, 32, 48, 64, 96, 128] as const;
