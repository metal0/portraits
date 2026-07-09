export type RenderMode = "square" | "dot" | "relief" | "ascii" | "cmyk";

export type ColorMode = "full-color" | "grayscale" | "threshold" | "duotone" | "palette";

export type DitherMode = "none" | "floyd-steinberg" | "bayer";

export type PaletteSource = "auto" | "custom";

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
  /** Gap between tiles as a fraction of the cell (0..0.45). */
  gap: number;
  /** Corner radius as a fraction of the tile (0..0.5). */
  cornerRadius: number;
  outline: boolean;
  outlineColor: string;
}

export interface DotOptions {
  dotShape: DotShape;
  invert: boolean;
  minDotScale: number;
  maxDotScale: number;
}

export type ReliefVariant = "size" | "height" | "iso";

export interface AsciiOptions {
  /** Character ramp ordered dark→light. */
  ramp: string;
}

export interface ReliefOptions {
  variant: ReliefVariant;
  minScale: number;
  maxScale: number;
  shadowBlur: number;
  shadowOffset: number;
  /** 0..1 extrusion amount for height + iso variants. */
  heightScale: number;
}

export interface ColorSettings {
  mode: ColorMode;
  threshold: number;
  duotoneDark: string;
  duotoneLight: string;
  paletteSize: number;
  paletteSource: PaletteSource;
  customPalette: string[];
  dither: DitherMode;
}

/** Pre-sampling tone adjustments. All values neutral by default. */
export interface AdjustSettings {
  /** -100..100 additive brightness. */
  brightness: number;
  /** -100..100. */
  contrast: number;
  /** -100..100. */
  saturation: number;
  /** 0.2..3, 1 = neutral. */
  gamma: number;
  /** 0 = off, else 2..16 quantization levels per channel. */
  posterize: number;
  /** 0..100 unsharp amount. */
  sharpen: number;
}

export interface ExportSettings {
  transparentBackground: boolean;
  circularMask: boolean;
  backgroundColor: string;
}

/** A point normalized to the cropped square, both axes in [0, 1]. */
export interface FacePoint {
  x: number;
  y: number;
}

/** Five-point face landmarks (normalized to the crop square) from the detector. */
export interface FaceLandmarks {
  leftEye: FacePoint;
  rightEye: FacePoint;
  nose: FacePoint;
  mouthLeft: FacePoint;
  mouthRight: FacePoint;
}

export type OcclusionRegion = "eyes" | "eyes-nose";
export type OcclusionStyle = "bar" | "scramble" | "pixelate";

export interface OcclusionOptions {
  enabled: boolean;
  region: OcclusionRegion;
  style: OcclusionStyle;
  /** 0..1 — band thickness / intensity of the occlusion. */
  strength: number;
}

export interface WarpOptions {
  enabled: boolean;
  /** 0..1 — how far landmark regions are displaced before downscaling. */
  strength: number;
}

export interface CloakOptions {
  enabled: boolean;
  /** 0..1 — perturbation budget the optimizer is allowed to spend. */
  strength: number;
}

/** A baked, low-resolution RGB perturbation field (size×size×3 deltas). */
export interface CloakField {
  data: Float32Array;
  size: number;
}

/**
 * Optional anti-facial-recognition settings. `landmarks` is image-derived
 * (filled once detection lands) and travels in the render request so the
 * transforms are deterministic in both preview and export; it is not a saved
 * style and is cleared from presets.
 */
export interface AntiFrOptions {
  occlusion: OcclusionOptions;
  warp: WarpOptions;
  cloak: CloakOptions;
  /** Optimized cloak perturbation; image-derived, not saved to presets. */
  cloakField: CloakField | null;
  landmarks: FaceLandmarks | null;
}

/** Result of measuring the rendered avatar against the bundled FR models. */
export interface MatchResult {
  /**
   * Euclidean distance between the mosaic's and the original's face descriptor.
   * Lower = more matchable; face-api treats < 0.6 as the same person. Infinity
   * when no face was detected in the mosaic (the strongest privacy outcome).
   */
  distance: number;
  /** Whether the bundled detector still finds a face in the mosaic. */
  detected: boolean;
  /** Detector confidence for the mosaic, when a face was found. */
  detectionScore: number;
}

export interface DisplayPreset {
  displaySizePx: number;
  targetBlockScreenPx: number;
}

/** Snapshot of the visual configuration captured by a custom preset. */
export interface PresetConfig {
  grid: GridSettings;
  renderMode: RenderMode;
  square: SquareOptions;
  dot: DotOptions;
  relief: ReliefOptions;
  ascii: AsciiOptions;
  color: ColorSettings;
  adjust: AdjustSettings;
  exportSettings: ExportSettings;
  antiFr: AntiFrOptions;
}

export interface CustomPreset {
  id: string;
  name: string;
  config: PresetConfig;
}

export const PRESETS_FILE_VERSION = 1;

export interface PresetsFile {
  app: "portraits";
  kind: "presets";
  version: number;
  presets: CustomPreset[];
}

/** Everything the render engine needs to produce one frame. */
export interface RenderRequest {
  crop: Crop;
  gridSize: number;
  outputSizePx: number;
  renderMode: RenderMode;
  square: SquareOptions;
  dot: DotOptions;
  relief: ReliefOptions;
  ascii: AsciiOptions;
  color: ColorSettings;
  adjust: AdjustSettings;
  exportSettings: ExportSettings;
  antiFr: AntiFrOptions;
}
