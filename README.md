# Pixel Mosaic Portrait

A browser-only tool that converts a photo into a **pixel mosaic / halftone avatar**, optimized for how it will look at small social-media profile sizes.

The whole idea: you tell it *where* the avatar will be shown (e.g. "64px in Discord"), and it back-solves a grid that stays recognizable as a face at that size while looking like a crisp block mosaic up close.

**No backend. No uploads. No tracking.** The image never leaves your browser.

---

## Stack

- **Vite + React 19 + TypeScript**
- **Zustand** for state
- **Canvas 2D + Web Workers** (OffscreenCanvas) for the rendering engine
- Vanilla CSS with design tokens — zero runtime UI dependencies

The image engine lives in [`src/core/`](src/core/) as pure, framework-agnostic functions so it can run on the main thread or inside a worker, and be unit-tested in isolation.

## Develop

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build → dist/
npm run preview    # serve the production build locally
npm run typecheck
npm run test:e2e   # Playwright E2E against your local Chrome (no browser download)
```

### E2E tests

[`e2e/`](e2e/) drives the app in real Chrome via Playwright's `channel: "chrome"`,
so no browser binaries are downloaded. A dependency-free PNG encoder
([`e2e/fixtures/makeImage.ts`](e2e/fixtures/makeImage.ts)) synthesizes a
deterministic test "face", and the specs verify upload → render → mode switch →
grayscale → crop → PNG export by reading actual canvas pixels.

## Grid math (the core concept)

```ts
gridSize  = clamp(round(displaySizePx / targetBlockScreenPx), 12, 128)
blockSize = outputSizePx / gridSize
```

Example: shown at **64px**, block target **2px** → `64/2 = 32` blocks. Export at **1024px** → `1024/32 = 32px` per block. Result: a 1024×1024 avatar built from a 32×32 mosaic.

## Deploy — Cloudflare Workers (Static Assets)

Cloudflare folded static hosting into **Workers Static Assets**, so a static site
is now a Worker with no server code. This repo ships a [`wrangler.jsonc`](wrangler.jsonc)
that points a Worker at `dist/` — SPA fallback and the CSP in
[`public/_headers`](public/_headers) are handled without any Worker script.

### Git integration (recommended)

1. Push to the private `metal0/portraits` repo (already wired).
2. Cloudflare dashboard → **Workers & Pages → Create → Workers → Import a repository**,
   select `metal0/portraits`.
3. Build settings:
   - **Build command:** `npm run build`
   - **Deploy command:** `npx wrangler deploy`

   Cloudflare reads `wrangler.jsonc` for the assets config. Every push to `main`
   triggers a new build & deploy.

### Wrangler CLI (optional)

```bash
npm run build
npx wrangler deploy
```

SPA routing comes from `not_found_handling: "single-page-application"` in
`wrangler.jsonc`; `public/_headers` applies the strict CSP and privacy headers
(no external calls permitted).

## Features

- **Input** — upload / drag-drop / paste; PNG/JPG/WEBP/AVIF; EXIF orientation
- **Crop** — zoom + pan into a square
- **Adjust** — brightness / contrast / saturation / gamma / posterize / sharpen + one-click auto-enhance
- **Display-size driven grid** — presets (Discord, X, Instagram, GitHub) + auto/override grid
- **Render modes** — square mosaic, dot halftone (circle/square/diamond), relief 3D (raised bevel / size / isometric)
- **Color** — full / grayscale / B&W threshold / duotone / limited palette (median-cut or custom swatches, Game Boy / Minecraft presets) with Floyd–Steinberg dithering
- **Presets** — save the full look, auto-persisted to your browser, inline with the built-ins, JSON import/export
- **Preview** — live large preview + profile-size strip (24–128px), literal-vs-perceptual toggle
- **Export** — PNG (512/1024/2048, circular mask, transparent bg) and crisp vector SVG

## Roadmap (not yet built)

Batch export, manual per-tile paint, readability meter, Web Worker offload for large exports, local face detection.

See [`pixel_mosaic_portrait_tool_spec.md`](pixel_mosaic_portrait_tool_spec.md) for the full spec.
