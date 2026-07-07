export type RenderMode = "square" | "dot" | "relief";

export type ColorMode = "full-color" | "grayscale" | "threshold" | "duotone" | "palette";

export type DotShape = "circle" | "square" | "diamond";

/** A single sampled grid cell: averaged color + derived luminance. */
export interface Cell {
  gx: number;
  gy: number;
  r: number;
  g: number;
  b: number;
  a: number;
  /** Normalized luminance in [0, 1]. */
  luma: number;
}

export interface SampledGrid {
  size: number;
  cells: Cell[];
}

/** Square crop expressed against the source image. */
export interface Crop {
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

export interface GridSettings {
  displaySizePx: number;
  targetBlockScreenPx: number;
  outputSizePx: number;
  /** When set, overrides the auto-recommended grid. */
  gridOverride: number | null;
}

export interface SquareOptions {
  tileGapPx: number;
  roundedCornersPx: number;
  outline: boolean;
  outlineColor: string;
}

export interface DotOptions {
  dotShape: DotShape;
  invert: boolean;
  minDotScale: number;
  maxDotScale: number;
}

export interface ReliefOptions {
  minScale: number;
  maxScale: number;
  shadowBlur: number;
  shadowOffset: number;
}

export interface ColorSettings {
  mode: ColorMode;
  threshold: number;
  duotoneDark: string;
  duotoneLight: string;
  paletteSize: number;
  customPalette: string[];
}

export interface ExportSettings {
  transparentBackground: boolean;
  circularMask: boolean;
  backgroundColor: string;
}

export interface DisplayPreset {
  displaySizePx: number;
  targetBlockScreenPx: number;
}
