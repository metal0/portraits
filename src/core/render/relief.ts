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
  const gap = cellSize * 0.09;
  const s = cellSize - 2 * gap;
  if (s <= 0) return;

  const maxLift = cellSize * 0.95 * req.relief.heightScale;
  const shadowStrength = Math.min(1, req.relief.shadowBlur / 40);
  const shadowAlpha = 0.18 + 0.32 * shadowStrength;

  const lift = (cell: Cell) => (1 - cell.luma) * maxLift;
  const baseX = (cell: Cell) => cell.gx * cellSize + gap;
  const baseY = (cell: Cell) => cell.gy * cellSize + gap;

  // Pass 1: cast shadows on the base plane (so no shadow paints over a face).
  ctx.fillStyle = `rgba(0,0,0,${shadowAlpha})`;
  for (const cell of sample.cells) {
    if (cell.a < ALPHA_CUTOFF) continue;
    const h = lift(cell);
    if (h <= 0.5) continue;
    ctx.fillRect(baseX(cell) + h * 0.28, baseY(cell) + h * 0.28, s, s);
  }

  // Pass 2: extruded blocks — top face lifted up-left, side walls exposed.
  for (const cell of sample.cells) {
    if (cell.a < ALPHA_CUTOFF) continue;
    const rgb: RGB = [cell.r, cell.g, cell.b];
    const h = lift(cell);
    const bx = baseX(cell);
    const by = baseY(cell);
    const dx = -h * 0.6;
    const dy = -h * 0.6;
    const fx = bx + dx;
    const fy = by + dy;

    if (h > 0.5) {
      // Right wall.
      quad(ctx, [[fx + s, fy], [fx + s, fy + s], [bx + s, by + s], [bx + s, by]], shade(rgb, 0.6));
      // Bottom wall (darkest — faces away from the top-left light).
      quad(ctx, [[fx, fy + s], [fx + s, fy + s], [bx + s, by + s], [bx, by + s]], shade(rgb, 0.42));
    }

    // Top face, lit and slightly brighter the taller it is.
    ctx.fillStyle = shade(rgb, 1.05 + (1 - cell.luma) * 0.12);
    ctx.fillRect(fx, fy, s, s);

    // Top-left rim highlight for a crisp raised edge.
    ctx.strokeStyle = shade(rgb, 1.5);
    ctx.lineWidth = Math.max(1, cellSize * 0.045);
    ctx.beginPath();
    ctx.moveTo(fx, fy + s);
    ctx.lineTo(fx, fy);
    ctx.lineTo(fx + s, fy);
    ctx.stroke();
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
