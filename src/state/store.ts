import { create } from "zustand";
import type {
  AdjustSettings,
  ColorSettings,
  Crop,
  DotOptions,
  ExportSettings,
  GridSettings,
  ReliefOptions,
  RenderMode,
  SquareOptions,
} from "@/core/types";
import { recommendGrid } from "@/core/grid";
import { NEUTRAL_ADJUST } from "@/core/adjust";

interface AppState {
  /** Loaded source image; null until the user provides one. */
  source: ImageBitmap | null;
  sourceName: string | null;

  crop: Crop;
  grid: GridSettings;
  renderMode: RenderMode;
  square: SquareOptions;
  dot: DotOptions;
  relief: ReliefOptions;
  color: ColorSettings;
  adjust: AdjustSettings;
  exportSettings: ExportSettings;

  setSource: (bitmap: ImageBitmap | null, name?: string | null) => void;
  setCrop: (patch: Partial<Crop>) => void;
  setGrid: (patch: Partial<GridSettings>) => void;
  setRenderMode: (mode: RenderMode) => void;
  setSquare: (patch: Partial<SquareOptions>) => void;
  setDot: (patch: Partial<DotOptions>) => void;
  setRelief: (patch: Partial<ReliefOptions>) => void;
  setColor: (patch: Partial<ColorSettings>) => void;
  setAdjust: (patch: Partial<AdjustSettings>) => void;
  setExport: (patch: Partial<ExportSettings>) => void;

  /** Bumped after each engine render so consumers can redraw. */
  renderVersion: number;
  bumpRender: () => void;

  /** Effective grid size: manual override if set, else recommended. */
  effectiveGrid: () => number;
}

const initialCrop: Crop = { x: 0.5, y: 0.5, scale: 1, rotation: 0 };

const initialGrid: GridSettings = {
  displaySizePx: 64,
  targetBlockScreenPx: 2,
  outputSizePx: 1024,
  gridOverride: null,
};

export const useStore = create<AppState>((set, get) => ({
  source: null,
  sourceName: null,

  crop: initialCrop,
  grid: initialGrid,
  renderMode: "square",

  square: {
    tileGapPx: 0,
    roundedCornersPx: 0,
    outline: false,
    outlineColor: "#000000",
  },
  dot: {
    dotShape: "circle",
    invert: false,
    minDotScale: 0,
    maxDotScale: 1,
  },
  relief: {
    minScale: 0.35,
    maxScale: 1,
    shadowBlur: 12,
    shadowOffset: 6,
  },
  color: {
    mode: "full-color",
    threshold: 0.5,
    duotoneDark: "#1a1a2e",
    duotoneLight: "#e8e8f0",
    paletteSize: 8,
    customPalette: [],
  },
  adjust: { ...NEUTRAL_ADJUST },
  exportSettings: {
    transparentBackground: false,
    circularMask: false,
    backgroundColor: "#0e0e12",
  },

  setSource: (bitmap, name = null) => set({ source: bitmap, sourceName: name }),
  setCrop: (patch) => set((s) => ({ crop: { ...s.crop, ...patch } })),
  setGrid: (patch) => set((s) => ({ grid: { ...s.grid, ...patch } })),
  setRenderMode: (renderMode) => set({ renderMode }),
  setSquare: (patch) => set((s) => ({ square: { ...s.square, ...patch } })),
  setDot: (patch) => set((s) => ({ dot: { ...s.dot, ...patch } })),
  setRelief: (patch) => set((s) => ({ relief: { ...s.relief, ...patch } })),
  setColor: (patch) => set((s) => ({ color: { ...s.color, ...patch } })),
  setAdjust: (patch) => set((s) => ({ adjust: { ...s.adjust, ...patch } })),
  setExport: (patch) => set((s) => ({ exportSettings: { ...s.exportSettings, ...patch } })),

  renderVersion: 0,
  bumpRender: () => set((s) => ({ renderVersion: s.renderVersion + 1 })),

  effectiveGrid: () => {
    const { grid } = get();
    return grid.gridOverride ?? recommendGrid(grid.displaySizePx, grid.targetBlockScreenPx);
  },
}));
