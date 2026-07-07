import type { Cell, RenderRequest, SampledGrid } from "../types";
import type { Ctx2D, RGB } from "../graphics";

const ALPHA_CUTOFF = 8;

function shade([r, g, b]: RGB, f: number): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * f)));
  return `rgb(${c(r)}, ${c(g)}, ${c(b)})`;
}

/** Variant 1: block size scales with darkness; soft drop shadow for depth. */
function renderSize(ctx: Ctx2D, sample: SampledGrid, req: RenderRequest): void {
  const cellSize = req.outputSizePx / sample.size;
  const { minScale, maxScale, shadowBlur, shadowOffset } = req.relief;

  for (const cell of sample.cells) {
    if (cell.a < ALPHA_CUTOFF) continue;
    const darkness = 1 - cell.luma;
    const scale = minScale + darkness * (maxScale - minScale);
    const size = cellSize * scale;
    const x = (cell.gx + 0.5) * cellSize - size / 2;
    const y = (cell.gy + 0.5) * cellSize - size / 2;

    ctx.shadowColor = "rgba(0,0,0,0.45)";
    ctx.shadowBlur = darkness * shadowBlur;
    ctx.shadowOffsetX = darkness * shadowOffset;
    ctx.shadowOffsetY = darkness * shadowOffset;
    ctx.fillStyle = `rgb(${cell.r}, ${cell.g}, ${cell.b})`;
    ctx.fillRect(x, y, size, size);
  }

  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
}

/** Variant 2: full tiles with a beveled raised face; drop shadow ~ height. */
function renderHeight(ctx: Ctx2D, sample: SampledGrid, req: RenderRequest): void {
  const cellSize = req.outputSizePx / sample.size;
  const bevel = Math.max(1, cellSize * 0.16);
  const { heightScale, shadowBlur } = req.relief;

  for (const cell of sample.cells) {
    if (cell.a < ALPHA_CUTOFF) continue;
    const darkness = 1 - cell.luma;
    const rgb: RGB = [cell.r, cell.g, cell.b];
    const x0 = cell.gx * cellSize;
    const y0 = cell.gy * cellSize;
    const s = cellSize;
    const w = bevel;

    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = darkness * shadowBlur * heightScale;
    ctx.shadowOffsetX = darkness * bevel * heightScale;
    ctx.shadowOffsetY = darkness * bevel * heightScale;
    ctx.fillStyle = shade(rgb, 1);
    ctx.fillRect(x0, y0, s, s);
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    quad(ctx, [[x0, y0], [x0 + s, y0], [x0 + s - w, y0 + w], [x0 + w, y0 + w]], shade(rgb, 1.35));
    quad(ctx, [[x0, y0], [x0 + w, y0 + w], [x0 + w, y0 + s - w], [x0, y0 + s]], shade(rgb, 1.18));
    quad(ctx, [[x0 + s, y0], [x0 + s, y0 + s], [x0 + s - w, y0 + s - w], [x0 + s - w, y0 + w]], shade(rgb, 0.72));
    quad(ctx, [[x0, y0 + s], [x0 + s, y0 + s], [x0 + s - w, y0 + s - w], [x0 + w, y0 + s - w]], shade(rgb, 0.58));

    ctx.fillStyle = shade(rgb, 1);
    ctx.fillRect(x0 + w, y0 + w, s - 2 * w, s - 2 * w);
  }
}

/** Variant 3: isometric extruded cubes, height ~ darkness. */
function renderIso(ctx: Ctx2D, sample: SampledGrid, req: RenderRequest): void {
  const out = req.outputSizePx;
  const margin = out * 0.06;
  const avail = out - 2 * margin;
  const twU = 1;
  const thU = 0.5;
  const baseHU = 0.25;
  const maxHU = 2 * req.relief.heightScale + 0.001;

  const heightU = (c: Cell) => baseHU + (1 - c.luma) * maxHU;

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const c of sample.cells) {
    const cx = (c.gx - c.gy) * twU;
    const cy = (c.gx + c.gy) * thU;
    const h = heightU(c);
    minX = Math.min(minX, cx - twU);
    maxX = Math.max(maxX, cx + twU);
    minY = Math.min(minY, cy - h - thU);
    maxY = Math.max(maxY, cy + thU);
  }

  const scale = avail / Math.max(maxX - minX, maxY - minY);
  const offX = margin + (avail - (maxX - minX) * scale) / 2 - minX * scale;
  const offY = margin + (avail - (maxY - minY) * scale) / 2 - minY * scale;
  const tw = twU * scale;
  const th = thU * scale;

  const ordered = [...sample.cells].sort((a, b) => a.gx + a.gy - (b.gx + b.gy));
  for (const cell of ordered) {
    if (cell.a < ALPHA_CUTOFF) continue;
    const cx = offX + (cell.gx - cell.gy) * tw;
    const cy = offY + (cell.gx + cell.gy) * th;
    const h = heightU(cell) * scale;
    const rgb: RGB = [cell.r, cell.g, cell.b];

    // Top face (diamond) at elevation h.
    quad(
      ctx,
      [[cx, cy - th - h], [cx + tw, cy - h], [cx, cy + th - h], [cx - tw, cy - h]],
      shade(rgb, 1.2),
    );
    // Left face.
    quad(ctx, [[cx - tw, cy - h], [cx, cy + th - h], [cx, cy + th], [cx - tw, cy]], shade(rgb, 0.85));
    // Right face.
    quad(ctx, [[cx, cy + th - h], [cx + tw, cy - h], [cx + tw, cy], [cx, cy + th]], shade(rgb, 0.6));
  }
}

function quad(ctx: Ctx2D, pts: Array<[number, number]>, fill: string): void {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  ctx.fill();
}

export function renderRelief(ctx: Ctx2D, sample: SampledGrid, req: RenderRequest): void {
  switch (req.relief.variant) {
    case "size":
      renderSize(ctx, sample, req);
      break;
    case "iso":
      renderIso(ctx, sample, req);
      break;
    case "height":
    default:
      renderHeight(ctx, sample, req);
      break;
  }
}
