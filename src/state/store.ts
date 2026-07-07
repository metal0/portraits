import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  AdjustSettings,
  ColorSettings,
  Crop,
  CustomPreset,
  DotOptions,
  ExportSettings,
  GridSettings,
  PresetConfig,
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

  /** User-saved presets, persisted to localStorage. */
  presets: CustomPreset[];

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

  /** True while a preview render is debouncing/in-flight (exports blocked). */
  renderPending: boolean;
  setRenderPending: (pending: boolean) => void;

  saveCurrentAsPreset: (name: string) => void;
  updatePreset: (id: string) => void;
  renamePreset: (id: string, name: string) => void;
  deletePreset: (id: string) => void;
  applyPreset: (id: string) => void;
  importPresets: (presets: CustomPreset[]) => void;

  /** Effective grid size: manual override if set, else recommended. */
  effectiveGrid: () => number;
}

function snapshot(s: AppState): PresetConfig {
  return {
    grid: { ...s.grid },
    renderMode: s.renderMode,
    square: { ...s.square },
    dot: { ...s.dot },
    relief: { ...s.relief },
    color: { ...s.color, customPalette: [...s.color.customPalette] },
    adjust: { ...s.adjust },
    exportSettings: { ...s.exportSettings },
  };
}

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `p_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`;
}

const initialCrop: Crop = { x: 0.5, y: 0.5, scale: 1, rotation: 0 };

const initialGrid: GridSettings = {
  displaySizePx: 64,
  targetBlockScreenPx: 2,
  outputSizePx: 1024,
  gridOverride: null,
};

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
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
    variant: "height",
    minScale: 0.35,
    maxScale: 1,
    shadowBlur: 12,
    shadowOffset: 6,
    heightScale: 0.6,
  },
  color: {
    mode: "full-color",
    threshold: 0.5,
    duotoneDark: "#1a1a2e",
    duotoneLight: "#e8e8f0",
    paletteSize: 8,
    paletteSource: "auto",
    customPalette: [],
    dither: "none",
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
  bumpRender: () => set((s) => ({ renderVersion: s.renderVersion + 1, renderPending: false })),

  renderPending: false,
  setRenderPending: (renderPending) => set({ renderPending }),

  presets: [],
  saveCurrentAsPreset: (name) =>
    set((s) => ({ presets: [...s.presets, { id: newId(), name, config: snapshot(s) }] })),
  updatePreset: (id) =>
    set((s) => ({
      presets: s.presets.map((p) => (p.id === id ? { ...p, config: snapshot(s) } : p)),
    })),
  renamePreset: (id, name) =>
    set((s) => ({ presets: s.presets.map((p) => (p.id === id ? { ...p, name } : p)) })),
  deletePreset: (id) => set((s) => ({ presets: s.presets.filter((p) => p.id !== id) })),
  applyPreset: (id) => {
    const preset = get().presets.find((p) => p.id === id);
    if (!preset) return;
    const c = preset.config;
    set({
      grid: { ...c.grid },
      renderMode: c.renderMode,
      square: { ...c.square },
      dot: { ...c.dot },
      relief: { ...c.relief },
      color: { ...c.color, customPalette: [...c.color.customPalette] },
      adjust: { ...c.adjust },
      exportSettings: { ...c.exportSettings },
    });
  },
  importPresets: (list) =>
    set((s) => ({ presets: [...s.presets, ...list.map((p) => ({ ...p, id: newId() }))] })),

      effectiveGrid: () => {
        const { grid } = get();
        return grid.gridOverride ?? recommendGrid(grid.displaySizePx, grid.targetBlockScreenPx);
      },
    }),
    {
      name: "portraits-store",
      version: 1,
      partialize: (s) => ({ presets: s.presets }),
    },
  ),
);
