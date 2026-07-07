# Web Tool Spec: Client-Side Pixel Mosaic Portrait Generator

## Goal

Create a browser-only tool that converts a user-uploaded image into a **pixel mosaic / block halftone avatar**, optimized for how it will appear at small social media profile-picture sizes.

No backend. No uploads. No tracking. The image stays in the browser.

---

## Core Concept

The user uploads a photo. The app:

1. Crops it to a square or circle-safe composition.
2. Simulates how large the avatar will appear in a social app.
3. Chooses a mosaic grid size based on that view size.
4. Converts the image into square blocks, dot blocks, or raised/relief blocks.
5. Exports a high-resolution PNG/SVG that looks pixelated up close but readable when small.

---

## Target Platform

### Tech Stack

Use plain frontend tech:

```txt
HTML
CSS
TypeScript
Canvas API
Web Workers
Optional: WebGL/WebGPU later
```

No server-side processing.

Optional libraries:

```txt
Vite
React/Svelte/Vue, optional
pica, for high-quality resizing
color-thief or custom palette reducer
```

Everything must work offline after initial page load.

---

## User Inputs

### Image Input

User can:

```txt
Upload image
Drag and drop image
Paste image from clipboard
```

Supported formats:

```txt
PNG
JPG/JPEG
WEBP
AVIF, if browser supports it
```

---

## Main Controls

### 1. Social Display Size

User specifies the approximate display size where the avatar will be viewed.

Examples:

```txt
32 px - tiny chat avatar
48 px - compact profile
64 px - common app avatar
96 px - larger profile view
128 px - detailed profile view
Custom
```

Field:

```ts
displaySizePx: number
```

Default:

```ts
displaySizePx = 64
```

---

### 2. Output Resolution

Final exported image size.

Examples:

```txt
512 × 512
1024 × 1024
2048 × 2048
```

Field:

```ts
outputSizePx: number
```

Default:

```ts
outputSizePx = 1024
```

---

### 3. Perceptual Block Size

This controls how many mosaic blocks survive visually at the intended display size.

Field:

```ts
targetBlockScreenPx: number
```

Recommended values:

```txt
1 px   = very detailed, subtle mosaic
1.5 px = balanced
2 px   = strong pixel mosaic
3 px   = very chunky
```

Default:

```ts
targetBlockScreenPx = 2
```

Formula:

```ts
gridSize = Math.round(displaySizePx / targetBlockScreenPx)
blockSize = outputSizePx / gridSize
```

Example:

```txt
Display size: 64 px
Target block size: 2 px

64 / 2 = 32 blocks

Output: 1024 px
1024 / 32 = 32 px per block
```

So the exported avatar is 1024×1024, made of a 32×32 tile grid.

---

## Display Presets

```ts
const presets = {
  "Discord small": { displaySizePx: 32, targetBlockScreenPx: 1.5 },
  "Discord profile": { displaySizePx: 80, targetBlockScreenPx: 2 },
  "Twitter/X avatar": { displaySizePx: 48, targetBlockScreenPx: 1.75 },
  "Instagram profile": { displaySizePx: 110, targetBlockScreenPx: 2 },
  "GitHub avatar": { displaySizePx: 40, targetBlockScreenPx: 1.5 },
  "Custom": null
}
```

Exact app rendering changes often, so keep these editable.

---

## Processing Pipeline

### Step 1: Load Image

Use:

```ts
createImageBitmap(file)
```

Then draw to an offscreen canvas.

Respect EXIF orientation if possible.

---

### Step 2: Crop Tool

User can adjust:

```txt
Zoom
Pan X/Y
Rotation
Square crop
Circle preview
```

Internally, always process a square crop.

```ts
crop = {
  x: number,
  y: number,
  scale: number,
  rotation: number
}
```

---

### Step 3: Normalize Image

Render cropped image to a working canvas.

```ts
workingSize = gridSize
```

This produces the low-resolution sample image.

Use **average color sampling**, not just nearest-neighbor, unless “raw pixel mode” is enabled.

For each grid cell:

```txt
average R
average G
average B
average alpha
average luminance
```

Luminance formula:

```ts
luma = 0.2126*r + 0.7152*g + 0.0722*b
```

---

## Render Modes

### Mode A: Square Pixel Mosaic

Classic block portrait.

Each cell becomes a square tile.

Options:

```ts
{
  tileGapPx: number,
  roundedCornersPx: number,
  colorMode: "full-color" | "grayscale" | "duotone" | "palette",
  outline: boolean,
  outlineColor: string,
  backgroundColor: string
}
```

---

### Mode B: Dot Halftone

Each cell is a dot whose size depends on brightness.

Formula:

```ts
radius = maxRadius * (1 - normalizedLuma)
```

Dark areas get bigger dots. Light areas get smaller dots.

Options:

```ts
{
  dotShape: "circle" | "square" | "diamond",
  invert: boolean,
  minDotScale: number,
  maxDotScale: number,
  spacing: number
}
```

---

### Mode C: Raised / Relief Mosaic

This handles variations where blocks appear to have different sizes or perceived heights.

There are a few variants.

#### Variant 1: Brightness-Based Tile Size

Each block stays in the grid, but its visible square size changes based on brightness.

```ts
tileScale = minScale + (1 - luma) * (maxScale - minScale)
```

Dark blocks can be larger and bright blocks smaller, or inverted.

This creates a fake depth/halftone effect.

---

#### Variant 2: Brightness-Based Height

Each tile gets a fake 3D height using shadow/highlight.

```ts
height = minHeight + (1 - luma) * maxHeight
```

Render with:

```txt
top-left highlight
bottom-right shadow
drop shadow
optional bevel
```

This makes it look like blocks are physically raised at different heights.

---

#### Variant 3: True Isometric Block Export

Render each pixel as a little extruded cube.

More expensive, but useful for:

```txt
poster art
Minecraft-ish profile pics
physical tile planning
```

---

## Viewability Preview

The UI should show:

```txt
Full-size export preview
Simulated app-size preview
Tiny preview strip
```

Preview sizes:

```txt
24 px
32 px
48 px
64 px
96 px
128 px
```

The user should immediately see whether the face still reads at small size.

Also include a “blurred human perception preview”:

```ts
smallPreviewCanvas.style.imageRendering = "auto"
```

And a “literal pixel preview”:

```ts
smallPreviewCanvas.style.imageRendering = "pixelated"
```

---

## Auto Grid Recommendation

Given:

```ts
displaySizePx
targetBlockScreenPx
```

Calculate:

```ts
recommendedGrid = clamp(
  round(displaySizePx / targetBlockScreenPx),
  12,
  128
)
```

Suggested ranges:

```txt
16×16 = abstract
24×24 = recognizable, chunky
32×32 = best avatar sweet spot
48×48 = clearer face
64×64 = subtle pixelation
96×96 = barely mosaic
```

Default to:

```ts
32×32 for 64 px display
```

---

## Face Optimization

Optional but useful.

### Manual

Let user adjust:

```txt
Brightness
Contrast
Saturation
Sharpness
Posterization
Gamma
```

### Automatic

Use basic image analysis:

```txt
increase contrast
slightly sharpen before sampling
center-weight face region
avoid pure black crushing
avoid pure white clipping
```

Do not require AI face detection. Keep the tool private and simple.

Optional local-only face detection later:

```txt
MediaPipe Face Detection
TensorFlow.js
```

---

## Color Modes

### Full Color

Average RGB per block.

### Grayscale

Convert to luminance.

### Black and White Threshold

```ts
color = luma > threshold ? white : black
```

### Limited Palette

User chooses:

```txt
2 colors
4 colors
8 colors
16 colors
Custom palette
```

Map each tile to closest palette color using RGB or Lab distance.

### Duotone

Map luminance between two colors:

```ts
darkColor → lightColor
```

Good for social avatars.

---

## Export Options

### PNG

Main export format.

```ts
canvas.toBlob("image/png")
```

Options:

```txt
Square PNG
Circular masked PNG
Transparent background PNG
```

### SVG

For dot/square vector exports.

Good for crisp scaling.

### JSON Project File

Optional.

Stores settings:

```ts
{
  version: "1.0",
  imageSettings,
  crop,
  grid,
  renderMode,
  colors,
  exportSettings
}
```

Do **not** store original image unless explicitly included.

---

## UI Layout

### Left Panel

```txt
Upload image
Crop controls
Display size preset
Grid controls
Style mode
Color mode
Export settings
```

### Center

```txt
Large preview
```

### Right Panel

```txt
Small-size previews
Histogram / readability meter
Before/after
Export button
```

---

## Readability Meter

Optional.

Estimate if the avatar is readable at target size.

Heuristics:

```ts
contrastScore
edgeScore
faceRegionBrightnessVariance
numberOfDistinctLuminanceClusters
```

Display:

```txt
Readable
Borderline
Too detailed
Too abstract
```

Avoid fake confidence. This is an avatar tool, not a medical scanner.

---

## Important Algorithms

### Average Cell Sampling

```ts
function sampleGrid(imageData, gridSize) {
  const cells = []

  for (let gy = 0; gy < gridSize; gy++) {
    for (let gx = 0; gx < gridSize; gx++) {
      // sample all pixels inside this cell
      // average rgba
      // calculate luminance
      cells.push({ gx, gy, r, g, b, a, luma })
    }
  }

  return cells
}
```

---

### Render Square Mosaic

```ts
function renderSquareMosaic(ctx, cells, gridSize, outputSize, options) {
  const cellSize = outputSize / gridSize

  for (const cell of cells) {
    const x = cell.gx * cellSize
    const y = cell.gy * cellSize

    ctx.fillStyle = `rgb(${cell.r}, ${cell.g}, ${cell.b})`
    ctx.fillRect(
      x + options.gap / 2,
      y + options.gap / 2,
      cellSize - options.gap,
      cellSize - options.gap
    )
  }
}
```

---

### Render Dot Halftone

```ts
function renderDotHalftone(ctx, cells, gridSize, outputSize, options) {
  const cellSize = outputSize / gridSize
  const maxRadius = cellSize * 0.5 * options.maxDotScale

  for (const cell of cells) {
    const cx = (cell.gx + 0.5) * cellSize
    const cy = (cell.gy + 0.5) * cellSize

    const darkness = 1 - cell.luma
    const radius = maxRadius * darkness

    ctx.beginPath()
    ctx.arc(cx, cy, radius, 0, Math.PI * 2)
    ctx.fill()
  }
}
```

---

### Render Relief Tiles

```ts
function renderReliefMosaic(ctx, cells, gridSize, outputSize, options) {
  const cellSize = outputSize / gridSize

  for (const cell of cells) {
    const darkness = 1 - cell.luma
    const scale = options.minScale + darkness * (options.maxScale - options.minScale)
    const size = cellSize * scale

    const x = (cell.gx + 0.5) * cellSize - size / 2
    const y = (cell.gy + 0.5) * cellSize - size / 2

    ctx.shadowBlur = darkness * options.shadowBlur
    ctx.shadowOffsetX = darkness * options.shadowOffset
    ctx.shadowOffsetY = darkness * options.shadowOffset

    ctx.fillStyle = `rgb(${cell.r}, ${cell.g}, ${cell.b})`
    ctx.fillRect(x, y, size, size)
  }
}
```

---

## Performance Requirements

Use Web Workers for:

```txt
sampling
palette reduction
large exports
SVG generation
```

Use OffscreenCanvas where supported.

Target:

```txt
1024 export under 200 ms
2048 export under 1 second
4096 export under 3 seconds
```

Reasonable on modern desktops. Phones may be slower.

---

## Privacy Requirements

```txt
No uploads
No external API calls
No analytics by default
No image persistence unless user saves project
No server logs because there is no server
```

All processing happens in:

```txt
Canvas
Web Worker
Local memory
```

---

## MVP Feature Set

Build this first:

```txt
Image upload
Square crop
Display size input
Auto grid calculation
Square mosaic mode
Dot halftone mode
Color/grayscale modes
Small-size preview
PNG export
```

---

## V2 Features

```txt
Circular avatar mask
Palette editor
Relief/raised tile mode
SVG export
Batch export
Manual paint/fix individual tiles
Face detection
Minecraft map-art palette mode
Save/load project JSON
```

---

## Acceptance Criteria

The tool is successful when:

```txt
A user can upload a face photo.
They can set a target display size, like 64 px.
The app automatically recommends a grid, like 32×32.
The preview clearly shows how it will look at 32/48/64/96 px.
The exported image is high-res, clean, and block-based.
No image data leaves the browser.
```

Core visual requirement:

```txt
When viewed large: obvious square/dot mosaic.
When viewed small: recognizable portrait.
```
