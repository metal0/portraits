# Portraits

Turn a photo into a pixel-art avatar that still looks like *you* — even when an app shrinks it down to a tiny profile picture.

### [**Try it live**](https://portraits.i0.tf)

Everything happens inside your own browser tab. There's no server, no sign-up, and nothing gets uploaded. Your photo never leaves your computer.

## Why you might want this

**It keeps your real face off the internet.** Every profile photo you post gets scraped, indexed, and fed into face-recognition systems and AI training datasets. Once your face is out there, you can't take it back. A pixel mosaic still reads as a recognizable "you" to friends and coworkers, but it isn't a clean photograph a scanner can match against your real identity.

**It survives tiny sizes.** Discord, Slack, GitHub, and most apps squash your avatar down to something like 32 or 64 pixels wide. A normal photo turns into a blurry smudge at that size. Portraits is built the other way around: you tell it how small the picture will actually be shown, and it designs a mosaic *coarse enough to survive the shrink* — so your avatar stays sharp and clear where it counts.

**It's private by design.** Because all the work runs locally in your browser, your original photo is never sent anywhere. Nobody — not us, not a cloud service — ever sees it.

## What it does

You upload a photo, position your face, pick a style, and download a finished image. Under the hood it rebuilds your photo as a grid of colored blocks (a mosaic), tuned so the face still comes through at the size you'll actually use it.

The trick: most tools make an avatar and *hope* it survives being resized. Portraits works the problem backwards — it starts from the final display size and picks a block grid that's guaranteed to hold up.

## Features

- **Size-aware grid.** Tell it where the avatar will live (say, "64px in Discord") and it picks the right level of chunkiness automatically, so your face stays recognizable there.
- **Three looks.** Solid square blocks, a dotted "halftone" print style, or a raised 3D relief with soft shading.
- **Color or black-and-white**, with brightness/contrast adjustments and a one-click auto-enhance.
- **Retro color palettes** — 1-bit, grayscale, Game Boy, and Minecraft, or bring your own colors. (Uses Floyd–Steinberg dithering, the classic technique for faking more colors than you have.)
- **Framing options.** Crop to a square or circle, add a round mask, and choose a transparent or solid background.
- **Presets.** Save a look you like, name it, and share it with others as a small file.
- **Real downloads.** Export a PNG at 512, 1024, or 2048 pixels, or a crisp SVG vector file (for the square and dot styles).

---

*The rest of this README is for developers who want to run, tinker with, or deploy the project.*

## How the grid math works

Two lines do the important part:

```ts
gridSize  = clamp(round(displaySizePx / targetBlockScreenPx), 12, 128)
blockSize = outputSizePx / gridSize
```

Say the avatar will be shown at **64px** and you want each block to read as roughly **2px** on screen. That gives `64 / 2 = 32` blocks across. Export at **1024px** and each block becomes `1024 / 32 = 32px`. The result is a 1024×1024 image built from a crisp 32×32 mosaic.

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
