import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  AdjustSettings,
  AntiFrOptions,
  AsciiOptions,
  ColorSettings,
  Crop,
  CustomPreset,
  DotOptions,
  ExportSettings,
  FaceLandmarks,
  GridSettings,
  MatchResult,
  PresetConfig,
  ReliefOptions,
  RenderMode,
  SquareOptions,
} from "@/core/types";
import { recommendGrid, planRender, type RenderPlan } from "@/core/grid";
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
  ascii: AsciiOptions;
  color: ColorSettings;
  adjust: AdjustSettings;
  exportSettings: ExportSettings;
  antiFr: AntiFrOptions;

  /** Baseline embedding of the original face; session-only, never persisted. */
  baselineEmbedding: Float32Array | null;
  /** Latest measurement of the rendered mosaic vs the original; session-only. */
  matchResult: MatchResult | null;

  /** User-saved presets, persisted to localStorage. */
  presets: CustomPreset[];

  /** Whether the crop/zoom picker modal is open. */
  cropModalOpen: boolean;
  openCropModal: () => void;
  closeCropModal: () => void;

  setSource: (bitmap: ImageBitmap | null, name?: string | null) => void;
  setCrop: (patch: Partial<Crop>) => void;
  setGrid: (patch: Partial<GridSettings>) => void;
  setRenderMode: (mode: RenderMode) => void;
  setSquare: (patch: Partial<SquareOptions>) => void;
  setDot: (patch: Partial<DotOptions>) => void;
  setRelief: (patch: Partial<ReliefOptions>) => void;
  setAscii: (patch: Partial<AsciiOptions>) => void;
  setColor: (patch: Partial<ColorSettings>) => void;
  setAdjust: (patch: Partial<AdjustSettings>) => void;
  setExport: (patch: Partial<ExportSettings>) => void;
  setAntiFr: (patch: Partial<AntiFrOptions>) => void;
  setLandmarks: (landmarks: FaceLandmarks | null) => void;
  setBaselineEmbedding: (embedding: Float32Array | null) => void;
  setMatchResult: (result: MatchResult | null) => void;

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

  /** Effective grid size: manual override if set, else style-aware recommend. */
  effectiveGrid: () => number;
  /** Resolved render geometry (aligned output size, integer block px). */
  effectivePlan: () => RenderPlan;
}

function snapshot(s: AppState): PresetConfig {
  return {
    grid: { ...s.grid },
    renderMode: s.renderMode,
    square: { ...s.square },
    dot: { ...s.dot },
    relief: { ...s.relief },
    ascii: { ...s.ascii },
    color: { ...s.color, customPalette: [...s.color.customPalette] },
    adjust: { ...s.adjust },
    exportSettings: { ...s.exportSettings },
    antiFr: { ...s.antiFr, landmarks: null },
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

const initialAntiFr: AntiFrOptions = {
  occlusion: { enabled: false, region: "eyes", style: "bar", strength: 0.5 },
  warp: { enabled: false, strength: 0.5 },
  cloak: { enabled: false, strength: 0.5 },
  landmarks: null,
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
    gap: 0,
    cornerRadius: 0,
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
  ascii: { ramp: "@%#*+=-:. " },
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
  antiFr: {
    occlusion: { ...initialAntiFr.occlusion },
    warp: { ...initialAntiFr.warp },
    cloak: { ...initialAntiFr.cloak },
    landmarks: null,
  },

  baselineEmbedding: null,
  matchResult: null,

  setSource: (bitmap, name = null) =>
    set((s) => ({
      source: bitmap,
      sourceName: name,
      baselineEmbedding: null,
      matchResult: null,
      antiFr: { ...s.antiFr, landmarks: null },
    })),
  setCrop: (patch) => set((s) => ({ crop: { ...s.crop, ...patch } })),
  setGrid: (patch) => set((s) => ({ grid: { ...s.grid, ...patch } })),
  setRenderMode: (renderMode) => set({ renderMode }),
  setSquare: (patch) => set((s) => ({ square: { ...s.square, ...patch } })),
  setDot: (patch) => set((s) => ({ dot: { ...s.dot, ...patch } })),
  setRelief: (patch) => set((s) => ({ relief: { ...s.relief, ...patch } })),
  setAscii: (patch) => set((s) => ({ ascii: { ...s.ascii, ...patch } })),
  setColor: (patch) => set((s) => ({ color: { ...s.color, ...patch } })),
  setAdjust: (patch) => set((s) => ({ adjust: { ...s.adjust, ...patch } })),
  setExport: (patch) => set((s) => ({ exportSettings: { ...s.exportSettings, ...patch } })),
  setAntiFr: (patch) => set((s) => ({ antiFr: { ...s.antiFr, ...patch } })),
  setLandmarks: (landmarks) => set((s) => ({ antiFr: { ...s.antiFr, landmarks } })),
  setBaselineEmbedding: (baselineEmbedding) => set({ baselineEmbedding }),
  setMatchResult: (matchResult) => set({ matchResult }),

  cropModalOpen: false,
  openCropModal: () => set({ cropModalOpen: true }),
  closeCropModal: () => set({ cropModalOpen: false }),

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
      ascii: c.ascii ? { ...c.ascii } : { ramp: "@%#*+=-:. " },
      color: { ...c.color, customPalette: [...c.color.customPalette] },
      adjust: { ...c.adjust },
      exportSettings: { ...c.exportSettings },
      antiFr: { ...initialAntiFr, ...(c.antiFr ?? {}), landmarks: get().antiFr.landmarks },
    });
  },
  importPresets: (list) =>
    set((s) => ({ presets: [...s.presets, ...list.map((p) => ({ ...p, id: newId() }))] })),

      effectiveGrid: () => {
        const { grid, renderMode, square } = get();
        if (grid.gridOverride !== null) return grid.gridOverride;
        // Styles with sub-block detail (dots, relief, gaps) need coarser blocks
        // to survive being shrunk — bias the target accordingly.
        let target = grid.targetBlockScreenPx;
        if (renderMode === "dot" || renderMode === "relief") target *= 1.4;
        else if (square.gap > 0) target *= 1 + square.gap;
        return recommendGrid(grid.displaySizePx, target);
      },
      effectivePlan: () => {
        const s = get();
        return planRender(s.effectiveGrid(), s.grid.displaySizePx, s.grid.outputSizePx);
      },
    }),
    {
      name: "portraits-store",
      version: 1,
      partialize: (s) => ({ presets: s.presets }),
    },
  ),
);
