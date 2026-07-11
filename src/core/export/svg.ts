import type { RenderRequest, SampledGrid } from "../types";

const ALPHA_CUTOFF = 8;
const HEX_COLOR = /^#[0-9a-f]{6}$/i;

function rgb(r: number, g: number, b: number): string {
  return `rgb(${r},${g},${b})`;
}

function svgColor(value: string): string {
  return value.length === 7 && HEX_COLOR.test(value) ? value : "#000000";
}

function squareCells(sample: SampledGrid, req: RenderRequest, cellSize: number): string {
  const { gap, cornerRadius, outline, outlineColor } = req.square;
  const gapPx = Math.round(gap * cellSize);
  const halfGap = Math.floor(gapPx / 2);
  const size = cellSize - gapPx;
  if (size <= 0) return "";
  const radius = Math.min(cornerRadius * size, size / 2);
  const rx = radius > 0 ? ` rx="${radius.toFixed(2)}"` : "";

  const parts: string[] = [];
  for (const cell of sample.cells) {
    if (cell.a < ALPHA_CUTOFF) continue;
    const x = cell.gx * cellSize + halfGap;
    const y = cell.gy * cellSize + halfGap;
    const stroke = outline
      ? ` stroke="${svgColor(outlineColor)}" stroke-width="${cellSize * 0.04}"`
      : "";
    parts.push(
      `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${size.toFixed(2)}" height="${size.toFixed(2)}"${rx} fill="${rgb(cell.r, cell.g, cell.b)}"${stroke}/>`,
    );
  }
  return parts.join("");
}

function dotCells(sample: SampledGrid, req: RenderRequest, cellSize: number): string {
  const { dotShape, invert, minDotScale, maxDotScale } = req.dot;
  const maxR = cellSize * 0.5 * maxDotScale;
  const minR = cellSize * 0.5 * minDotScale;
  const parts: string[] = [];
  for (const cell of sample.cells) {
    if (cell.a < ALPHA_CUTOFF) continue;
    const darkness = invert ? cell.luma : 1 - cell.luma;
    const radius = minR + (maxR - minR) * darkness;
    if (radius <= 0.25) continue;
    const cx = (cell.gx + 0.5) * cellSize;
    const cy = (cell.gy + 0.5) * cellSize;
    const fill = rgb(cell.r, cell.g, cell.b);
    if (dotShape === "square") {
      parts.push(
        `<rect x="${(cx - radius).toFixed(2)}" y="${(cy - radius).toFixed(2)}" width="${(radius * 2).toFixed(2)}" height="${(radius * 2).toFixed(2)}" fill="${fill}"/>`,
      );
    } else if (dotShape === "diamond") {
      const p = `${cx},${(cy - radius).toFixed(2)} ${(cx + radius).toFixed(2)},${cy} ${cx},${(cy + radius).toFixed(2)} ${(cx - radius).toFixed(2)},${cy}`;
      parts.push(`<polygon points="${p}" fill="${fill}"/>`);
    } else {
      parts.push(`<circle cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="${radius.toFixed(2)}" fill="${fill}"/>`);
    }
  }
  return parts.join("");
}

const XML_ESCAPE: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;" };

function asciiCells(sample: SampledGrid, req: RenderRequest, cellSize: number): string {
  const ramp = req.ascii.ramp.length > 0 ? req.ascii.ramp : "@%#*+=-:. ";
  const last = ramp.length - 1;
  const fontSize = (cellSize * 1.15).toFixed(2);
  const parts: string[] = [];
  for (const cell of sample.cells) {
    if (cell.a < ALPHA_CUTOFF) continue;
    const ch = ramp[Math.min(last, Math.max(0, Math.round(cell.luma * last)))];
    if (ch === " " || ch === "") continue;
    const glyph = XML_ESCAPE[ch] ?? ch;
    const x = ((cell.gx + 0.5) * cellSize).toFixed(2);
    const y = ((cell.gy + 0.55) * cellSize).toFixed(2);
    parts.push(
      `<text x="${x}" y="${y}" font-family="monospace" font-size="${fontSize}" text-anchor="middle" dominant-baseline="central" fill="${rgb(cell.r, cell.g, cell.b)}">${glyph}</text>`,
    );
  }
  return parts.join("");
}

/**
 * Build a standalone SVG string for square, dot or ASCII modes (relief/cmyk
 * fall back to flat squares). Vector output scales crisply to any size.
 */
export function buildSvg(sample: SampledGrid, req: RenderRequest): string {
  const S = req.outputSizePx;
  const cellSize = S / sample.size;

  const clip = req.exportSettings.circularMask;
  const defs = clip
    ? `<defs><clipPath id="mask"><circle cx="${S / 2}" cy="${S / 2}" r="${S / 2}"/></clipPath></defs>`
    : "";
  const bg = req.exportSettings.transparentBackground
    ? ""
    : `<rect width="${S}" height="${S}" fill="${svgColor(req.exportSettings.backgroundColor)}"/>`;

  const cells =
    req.renderMode === "dot"
      ? dotCells(sample, req, cellSize)
      : req.renderMode === "ascii"
        ? asciiCells(sample, req, cellSize)
        : squareCells(sample, req, cellSize);
  const group = clip ? `<g clip-path="url(#mask)">${bg}${cells}</g>` : `${bg}${cells}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">${defs}${group}</svg>`;
}
