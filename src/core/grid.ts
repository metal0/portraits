import type { DisplayPreset } from "./types";

export const GRID_MIN = 12;
export const GRID_MAX = 128;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function divisorsInRange(n: number, lo: number, hi: number): number[] {
  const out: number[] = [];
  for (let d = lo; d <= hi; d++) if (n % d === 0) out.push(d);
  return out;
}

/**
 * Grid resolution back-solved from how large the avatar will actually be
 * displayed. Snapped to a divisor of the display size when one is close, so
 * every block spans a whole number of screen pixels — that's what keeps the
 * mosaic crisp (instead of blurry) when a platform shrinks it to `displaySizePx`.
 */
export function recommendGrid(displaySizePx: number, targetBlockScreenPx: number): number {
  const raw = displaySizePx / Math.max(0.5, targetBlockScreenPx);
  const lo = Math.min(GRID_MIN, displaySizePx);
  const hi = Math.min(GRID_MAX, displaySizePx);

  const divisors = divisorsInRange(displaySizePx, lo, hi);
  if (divisors.length > 0) {
    let best = divisors[0];
    for (const d of divisors) {
      if (Math.abs(d - raw) < Math.abs(best - raw)) best = d;
    }
    // Only snap when the divisor is reasonably near the requested resolution.
    if (Math.abs(best - raw) / raw <= 0.35) return best;
  }
  return clamp(Math.round(raw), lo, hi);
}

/** Preview render is capped near this size (kept off the export resolution). */
export const PREVIEW_CAP = 1024;

export interface RenderPlan {
  gridSize: number;
  /** Integer output pixels per block — guarantees seam-free (crisp) blocks. */
  blockPx: number;
  /** Actual exported dimension (gridSize × blockPx), near the requested size. */
  outputPx: number;
  /** Capped, integer-celled size used for the on-screen preview. */
  previewPx: number;
  /** Screen pixels each block occupies at the display size. */
  blockScreenPx: number;
}

/**
 * Resolve the actual render geometry. The output canvas is sized to an exact
 * multiple of the grid so each block is an integer number of pixels — no
 * fractional block seams, which is the main source of blur at non-1× targets.
 * The preview is capped so a huge export resolution never bogs down editing.
 */
export function planRender(
  gridSize: number,
  displaySizePx: number,
  requestedOutputPx: number,
): RenderPlan {
  const blockPx = Math.max(1, Math.round(requestedOutputPx / gridSize));
  const previewBlockPx = Math.max(1, Math.min(blockPx, Math.floor(PREVIEW_CAP / gridSize) || 1));
  return {
    gridSize,
    blockPx,
    outputPx: gridSize * blockPx,
    previewPx: gridSize * previewBlockPx,
    blockScreenPx: displaySizePx / gridSize,
  };
}

export const DISPLAY_PRESETS: Record<string, DisplayPreset> = {
  "Discord small": { displaySizePx: 32, targetBlockScreenPx: 2 },
  "Discord profile": { displaySizePx: 80, targetBlockScreenPx: 2 },
  "Twitter/X avatar": { displaySizePx: 48, targetBlockScreenPx: 2 },
  "Instagram profile": { displaySizePx: 110, targetBlockScreenPx: 2 },
  "GitHub avatar": { displaySizePx: 40, targetBlockScreenPx: 2 },
  "LinkedIn profile": { displaySizePx: 56, targetBlockScreenPx: 2 },
  "Facebook profile": { displaySizePx: 40, targetBlockScreenPx: 2 },
  "YouTube channel": { displaySizePx: 48, targetBlockScreenPx: 2 },
  "Reddit avatar": { displaySizePx: 36, targetBlockScreenPx: 2 },
  "Telegram photo": { displaySizePx: 40, targetBlockScreenPx: 2 },
  "Twitch profile": { displaySizePx: 50, targetBlockScreenPx: 2 },
  "WhatsApp photo": { displaySizePx: 40, targetBlockScreenPx: 2 },
};
