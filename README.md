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
```

## Grid math (the core concept)

```ts
gridSize  = clamp(round(displaySizePx / targetBlockScreenPx), 12, 128)
blockSize = outputSizePx / gridSize
```

Example: shown at **64px**, block target **2px** → `64/2 = 32` blocks. Export at **1024px** → `1024/32 = 32px` per block. Result: a 1024×1024 avatar built from a 32×32 mosaic.

## Deploy — Cloudflare Pages

This is a static SPA. Two ways to ship it:

### Git integration (recommended)

1. Push to the private `metal0/portraits` repo (already wired).
2. In the Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git**, select the repo.
3. Build settings:
   - **Framework preset:** Vite
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
4. Deploy. Every push to `main` triggers a new build.

`public/_redirects` handles SPA routing; `public/_headers` applies a strict CSP and privacy headers (no external calls permitted).

### Wrangler CLI (optional)

```bash
npm run build
npx wrangler pages deploy dist --project-name portraits
```

## Roadmap

**MVP:** upload → square crop → display-size input → auto grid → square + dot modes → color/grayscale → small-size preview → PNG export.

**V2:** circular mask, palette editor, relief/raised mode, SVG export, batch, manual tile paint, project JSON, local face detection.

See [`pixel_mosaic_portrait_tool_spec.md`](pixel_mosaic_portrait_tool_spec.md) for the full spec.
