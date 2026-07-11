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
  FaceAnalysisState,
  FaceAnalysisStatus,
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
import {
  MAX_PALETTE_COLORS,
  MAX_PRESETS,
  normalizePresetName,
  normalizeStoredPresets,
} from "@/core/presets";

interface AppState {
  /** Loaded source image; null until the user provides one. */
  source: ImageBitmap | null;
  sourceName: string | null;
  /** Changes for every source assignment, including same-sized replacements. */
  sourceRevision: number;

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

  /** Baseline descriptor of the original face; session-only, never persisted. */
  baselineEmbedding: Float32Array | null;
  /** Latest measurement of the rendered mosaic vs the original; session-only. */
  matchResult: MatchResult | null;
  /** Explicit local face-analysis lifecycle; session-only, never persisted. */
  faceAnalysis: FaceAnalysisState;

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
  setFaceAnalysisStatus: (status: FaceAnalysisStatus, error: string | null) => void;
  retryFaceAnalysis: () => void;

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
    antiFr: { ...s.antiFr, landmarks: null, cloakField: null },
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
  cloakField: null,
  landmarks: null,
};

const initialFaceAnalysis: FaceAnalysisState = {
  status: "idle",
  error: null,
  retryVersion: 0,
};

function clearCloakField(antiFr: AntiFrOptions): AntiFrOptions {
  return antiFr.cloakField ? { ...antiFr, cloakField: null } : antiFr;
}

function normalizePersistedState(value: unknown): Pick<AppState, "presets"> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return { presets: [] };
  }

  const persisted = value as Record<string, unknown>;
  return { presets: normalizeStoredPresets(persisted.presets) };
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      source: null,
      sourceName: null,
      sourceRevision: 0,

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
    cloakField: null,
    landmarks: null,
  },

  baselineEmbedding: null,
  matchResult: null,
  faceAnalysis: { ...initialFaceAnalysis },

  setSource: (bitmap, name = null) =>
    set((s) => ({
      source: bitmap,
      sourceName: name,
      sourceRevision: s.sourceRevision + 1,
      baselineEmbedding: null,
      matchResult: null,
      faceAnalysis: {
        status: "idle",
        error: null,
        retryVersion: s.faceAnalysis.retryVersion,
      },
      antiFr: { ...s.antiFr, landmarks: null, cloakField: null },
    })),
  setCrop: (patch) =>
    set((s) => {
      const crop = { ...s.crop, ...patch };
      const changed =
        crop.x !== s.crop.x ||
        crop.y !== s.crop.y ||
        crop.scale !== s.crop.scale ||
        crop.rotation !== s.crop.rotation;
      if (!changed) return { crop };
      return {
        crop,
        baselineEmbedding: null,
        matchResult: null,
        faceAnalysis: {
          status: "idle",
          error: null,
          retryVersion: s.faceAnalysis.retryVersion,
        },
        antiFr: { ...s.antiFr, landmarks: null, cloakField: null },
      };
    }),
  setGrid: (patch) =>
    set((s) => ({ grid: { ...s.grid, ...patch }, antiFr: clearCloakField(s.antiFr) })),
  setRenderMode: (renderMode) =>
    set((s) => ({ renderMode, antiFr: clearCloakField(s.antiFr) })),
  setSquare: (patch) =>
    set((s) => ({ square: { ...s.square, ...patch }, antiFr: clearCloakField(s.antiFr) })),
  setDot: (patch) =>
    set((s) => ({ dot: { ...s.dot, ...patch }, antiFr: clearCloakField(s.antiFr) })),
  setRelief: (patch) =>
    set((s) => ({ relief: { ...s.relief, ...patch }, antiFr: clearCloakField(s.antiFr) })),
  setAscii: (patch) =>
    set((s) => ({ ascii: { ...s.ascii, ...patch }, antiFr: clearCloakField(s.antiFr) })),
  setColor: (patch) =>
    set((s) => ({
      color: {
        ...s.color,
        ...patch,
        ...(patch.customPalette
          ? { customPalette: patch.customPalette.slice(0, MAX_PALETTE_COLORS) }
          : {}),
      },
      antiFr: clearCloakField(s.antiFr),
    })),
  setAdjust: (patch) =>
    set((s) => ({ adjust: { ...s.adjust, ...patch }, antiFr: clearCloakField(s.antiFr) })),
  setExport: (patch) =>
    set((s) => ({
      exportSettings: { ...s.exportSettings, ...patch },
      antiFr: clearCloakField(s.antiFr),
    })),
  setAntiFr: (patch) =>
    set((s) => {
      const antiFr = { ...s.antiFr, ...patch };
      const changesCloakInput =
        patch.occlusion !== undefined || patch.warp !== undefined || patch.cloak !== undefined;
      const carriesCloakField = Object.prototype.hasOwnProperty.call(patch, "cloakField");
      return {
        antiFr:
          changesCloakInput && !carriesCloakField ? { ...antiFr, cloakField: null } : antiFr,
      };
    }),
  setLandmarks: (landmarks) => set((s) => ({ antiFr: { ...s.antiFr, landmarks } })),
  setBaselineEmbedding: (baselineEmbedding) => set({ baselineEmbedding }),
  setMatchResult: (matchResult) => set({ matchResult }),
  setFaceAnalysisStatus: (status, error) =>
    set((s) => ({ faceAnalysis: { ...s.faceAnalysis, status, error } })),
  retryFaceAnalysis: () =>
    set((s) => ({
      baselineEmbedding: null,
      matchResult: null,
      faceAnalysis: {
        status: "idle",
        error: null,
        retryVersion: s.faceAnalysis.retryVersion + 1,
      },
      antiFr: { ...s.antiFr, landmarks: null },
    })),

  cropModalOpen: false,
  openCropModal: () => set({ cropModalOpen: true }),
  closeCropModal: () => set({ cropModalOpen: false }),

  renderVersion: 0,
  bumpRender: () => set((s) => ({ renderVersion: s.renderVersion + 1, renderPending: false })),

  renderPending: false,
  setRenderPending: (renderPending) => set({ renderPending }),

  presets: [],
  saveCurrentAsPreset: (name) => {
    const normalizedName = normalizePresetName(name);
    if (!normalizedName || get().presets.length >= MAX_PRESETS) return;
    set((s) => ({
      presets: [...s.presets, { id: newId(), name: normalizedName, config: snapshot(s) }],
    }));
  },
  updatePreset: (id) =>
    set((s) => ({
      presets: s.presets.map((p) => (p.id === id ? { ...p, config: snapshot(s) } : p)),
    })),
  renamePreset: (id, name) => {
    const normalizedName = normalizePresetName(name);
    if (!normalizedName) return;
    set((s) => ({
      presets: s.presets.map((p) => (p.id === id ? { ...p, name: normalizedName } : p)),
    }));
  },
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
    set((s) => ({
      presets: [
        ...s.presets,
        ...list
          .slice(0, Math.max(0, MAX_PRESETS - s.presets.length))
          .map((p) => ({ ...p, id: newId() })),
      ],
    })),

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
      version: 2,
      partialize: (s) => ({ presets: s.presets }),
      migrate: (persistedState) => normalizePersistedState(persistedState),
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...normalizePersistedState(persistedState),
      }),
    },
  ),
);
