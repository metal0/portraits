# 🧩 Portraits

Turn a photo into a pixel-art avatar that still looks like *you*, even when an app shrinks it down to a tiny profile picture.

<p align="center">
  <img src="docs/preview.png" alt="Two portraits and their mosaics shown at 16, 32, 64, and 128 pixels" width="599">
</p>

<p align="center">
  <em>Each photo and its mosaic at 16, 32, 64, and 128px. The grid is tuned for <strong>64px</strong>, the size most apps display, so the face stays clearest right where it counts.</em>
</p>

**[▶ Try it live](https://portraits.i0.tf)**

Everything runs inside your browser tab. No server, no sign-up, no uploads. Your photo never leaves your computer.

---

## Why use it

🎨 &nbsp;**An avatar, not a photo you lose control of.** You upload a mosaic of your face instead of the real thing, so the sharpest copy anyone can ever pull is the mosaic you made. Your actual photo never leaves your computer.

🔍 &nbsp;**Survives tiny sizes.** Discord, Slack, and GitHub squash your avatar down to 32 or 64 pixels wide, where a normal photo turns into a blurry smudge. Portraits works the other way around: you tell it how small the picture will be shown, and it builds a mosaic coarse enough to still read clearly once it's shrunk.

🎯 &nbsp;**A tiny avatar isn't really private.** On most platforms any user can fetch the full-resolution original you uploaded, so a small, blurry-looking avatar only *looks* private — the sharp photo is one request away. The fix is to never upload the real photo in the first place.

🔒 &nbsp;**Nothing leaves your browser.** All the work happens locally, so your original photo is never sent anywhere. Nobody — not us, not any cloud service — ever sees it.

**What it can and can't do.** Portraits keeps your real photo off the internet and gives you an avatar that still reads as *you* to people who know you. It is **not** a face-recognition blocker: a mosaic a friend can recognize can often still be matched by software, since both rely on the same rough shapes. Fewer colors and a chunkier grid make it more private but less recognizable — Portraits gives you that dial, and where you set it is up to you.

## How it works

Upload a photo, position your face, pick a style, and download the result. Behind the scenes it rebuilds the photo as a grid of colored blocks (a mosaic), tuned so the face still comes through at the size you'll actually use.

Most tools make an avatar and *hope* it survives being resized. Portraits works the problem backwards: it starts from the final display size and picks a block grid that's guaranteed to hold up.

## Features

- 📐 &nbsp;**Size-aware grid.** Tell it where the avatar will live ("64px in Discord") and it picks the right level of chunkiness automatically.
- 🎨 &nbsp;**Three looks.** Solid square blocks, a dotted "halftone" print style, or a raised 3D relief with soft shading.
- 🌗 &nbsp;**Color or black-and-white**, with brightness and contrast controls plus one-click auto-enhance.
- 🕹️ &nbsp;**Retro palettes.** 1-bit, grayscale, Game Boy, and Minecraft, or bring your own colors. (Uses Floyd–Steinberg dithering to fake more colors than you actually have.)
- ✂️ &nbsp;**Framing.** Crop to a square or circle, add a round mask, and pick a transparent or solid background.
- 💾 &nbsp;**Presets.** Save a look you like, name it, and share it with others as a small file.
- ⬇️ &nbsp;**Real downloads.** Export a PNG at 512, 1024, or 2048 pixels, or a crisp SVG vector (for the square and dot styles).

---

*The rest of this README is for developers who want to run, tinker with, or deploy the project.*

## 🔢 How the grid math works

Two lines do the important part:

```ts
gridSize  = clamp(round(displaySizePx / targetBlockScreenPx), 12, 128)
blockSize = outputSizePx / gridSize
```

Say the avatar will be shown at **64px** and you want each block to read as roughly **2px** on screen. That gives `64 / 2 = 32` blocks across. Export at **1024px** and each block becomes `1024 / 32 = 32px`. The result is a 1024×1024 image built from a crisp 32×32 mosaic.

## 🛠️ Running it locally

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

## 🚀 Deploying

The site ships as a Cloudflare Worker using Static Assets, so there's no server code to run. The included [`wrangler.jsonc`](wrangler.jsonc) points a Worker at `dist/`, handles SPA routing, and applies the strict CSP and privacy headers from [`public/_headers`](public/_headers) (no external calls are permitted).

**One click:** clones the repo into your own account, builds, deploys, and sets up push-to-deploy.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/metal0/portraits)

When prompted, set the build command to `npm run build` (a static-assets Worker has no entry point for Cloudflare to infer it from); everything else is read from `wrangler.jsonc`.

**Git integration:** in the Cloudflare dashboard, go to Workers & Pages, create a Worker by importing the repo, and set the build command to `npm run build` and the deploy command to `npx wrangler deploy`. Cloudflare reads `wrangler.jsonc` for the rest, and every push to `main` triggers a build and deploy.

**Wrangler CLI:**

```bash
npm run build
npx wrangler deploy
```

## License

MIT
