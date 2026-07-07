# Portraits

Turn a photo into a pixel mosaic avatar that still reads as a face when it's shrunk down to a tiny profile picture.

### [**Try it live**](https://portraits.i0.tf)

Everything runs in your browser. No backend, no uploads, no tracking. Your photo never leaves the tab.

## What it does

Most avatars get resized down to 32 or 64 pixels by whatever app you post them in, and a normal photo turns to mush at that size. Portraits works the problem backwards: you tell it how big the avatar will actually be shown (say, "64px in Discord"), and it builds a mosaic grid coarse enough to survive that shrink while still looking like a sharp block mosaic when someone views it full size.

You upload a photo, frame it, pick a look, and download a clean PNG or SVG.

## Features

- **Size-aware grid.** Enter the display size you're targeting and the grid resolution is chosen for you, so the face stays recognizable at that size.
- **Three render modes.** Square blocks, dot halftone, or a raised relief mode with soft 3D shading.
- **Color or grayscale**, plus image adjustments (brightness, contrast, and friends) and a one-click auto-enhance.
- **Limited palettes** with Floyd-Steinberg dithering. Ships with 1-bit, Grayscale, Game Boy, and Minecraft palettes, or bring your own colors.
- **Crop and mask.** Square or circle-safe framing, optional circular mask, transparent or solid background.
- **Presets.** Save any combination of settings, rename or delete them, and export or import them as JSON to share.
- **Real exports.** PNG at 512, 1024, or 2048 pixels, or SVG vector output for square and dot modes.

## How the grid math works

Two lines do the important part:

```ts
gridSize  = clamp(round(displaySizePx / targetBlockScreenPx), 12, 128)
blockSize = outputSizePx / gridSize
```

Say the avatar will be shown at **64px** and you want each block to read as roughly **2px** on screen. That gives `64 / 2 = 32` blocks across. Export at **1024px** and each block becomes `1024 / 32 = 32px`. The result is a 1024x1024 image built from a crisp 32x32 mosaic.

## Running it locally

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build into dist/
npm run preview    # serve the production build
npm run typecheck
npm run test:e2e   # Playwright against your local Chrome (no browser download)
```

### Tech

- Vite, React 19, and TypeScript
- Zustand for state
- Canvas 2D with Web Workers (OffscreenCanvas) for rendering
- Plain CSS with design tokens, no runtime UI dependencies

The image engine lives in [`src/core/`](src/core/) as pure, framework-agnostic functions, so it runs on the main thread or inside a worker and stays easy to unit-test on its own.

### End-to-end tests

[`e2e/`](e2e/) drives the app in real Chrome through Playwright's `channel: "chrome"`, so nothing gets downloaded. A dependency-free PNG encoder ([`e2e/fixtures/makeImage.ts`](e2e/fixtures/makeImage.ts)) generates a deterministic test face, and the specs walk the full flow (upload, render, mode switch, grayscale, crop, PNG export) by reading actual canvas pixels.

## Deploying

The site ships as a Cloudflare Worker using Static Assets, so there's no server code to run. The included [`wrangler.jsonc`](wrangler.jsonc) points a Worker at `dist/`, handles SPA routing, and applies the strict CSP and privacy headers from [`public/_headers`](public/_headers) (no external calls are permitted).

**Git integration (recommended):** in the Cloudflare dashboard, go to Workers & Pages, create a Worker by importing the repo, and set the build command to `npm run build` and the deploy command to `npx wrangler deploy`. Cloudflare reads `wrangler.jsonc` for the rest, and every push to `main` triggers a build and deploy.

**Wrangler CLI:**

```bash
npm run build
npx wrangler deploy
```

## License

MIT
