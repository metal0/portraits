import { test, expect, type Page } from "@playwright/test";
import { makeFacePng } from "./fixtures/makeImage";

const FACE = makeFacePng();

async function upload(page: Page) {
  await page.locator('input[accept*="image"]').setInputFiles({
    name: "face.png",
    mimeType: "image/png",
    buffer: FACE,
  });
  // Accept the crop picker that opens on upload.
  await page.getByRole("button", { name: /Apply crop/ }).click();
  await expect(page.locator(".stage__canvas")).toBeVisible();
  // Wait for the (debounced) first render to actually paint the canvas.
  await expect.poll(async () => (await canvasStats(page)).variance, { timeout: 5000 }).toBeGreaterThan(0);
}

/** Expand a collapsible section by its header title. */
async function expand(page: Page, name: string) {
  await page.getByRole("button", { name, exact: true }).click();
}

/** Read the visible stage canvas and summarize its pixels. */
async function canvasStats(page: Page) {
  return page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>(".stage__canvas");
    if (!canvas) throw new Error("no stage canvas");
    const ctx = canvas.getContext("2d")!;
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const distinct = new Set<string>();
    let sum = 0;
    let sumSq = 0;
    let n = 0;
    for (let i = 0; i < data.length; i += 4 * 97) {
      const lum = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      distinct.add(`${data[i]},${data[i + 1]},${data[i + 2]}`);
      sum += lum;
      sumSq += lum * lum;
      n++;
    }
    const variance = sumSq / n - (sum / n) ** 2;
    return { distinct: distinct.size, variance };
  });
}

test("renders and stays interactive", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Pixel Mosaic Portrait" })).toBeVisible();
  await expect(page.getByText(/Upload, drop, or paste a photo/)).toBeVisible();

  await upload(page);

  // A real portrait was rendered: many colors, meaningful luminance spread.
  await expect
    .poll(async () => (await canvasStats(page)).variance, { timeout: 5000 })
    .toBeGreaterThan(50);
  const square = await canvasStats(page);
  expect(square.distinct).toBeGreaterThan(20);

  // Profile-size preview strip is populated.
  await expect(page.locator(".preview-mosaic")).toHaveCount(4);
});

test("switching render mode re-renders", async ({ page }) => {
  await page.goto("/");
  await upload(page);
  const before = await canvasStats(page);

  await page.getByRole("tab", { name: "Dot" }).click();
  await expect
    .poll(async () => (await canvasStats(page)).distinct)
    .not.toBe(before.distinct);
});

test("grayscale reduces to neutral tones", async ({ page }) => {
  await page.goto("/");
  await upload(page);

  await expand(page, "Color");
  await page.getByRole("tab", { name: "Gray" }).click();
  const coloredPixels = () =>
    page.evaluate(() => {
      const canvas = document.querySelector<HTMLCanvasElement>(".stage__canvas")!;
      const { data } = canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height);
      let colored = 0;
      for (let i = 0; i < data.length; i += 4 * 53) {
        const max = Math.max(data[i], data[i + 1], data[i + 2]);
        const min = Math.min(data[i], data[i + 1], data[i + 2]);
        if (max - min > 24) colored++;
      }
      return colored;
    });
  // Grayscale tiles are neutral; only anti-aliased tile edges may deviate.
  await expect.poll(coloredPixels, { timeout: 5000 }).toBeLessThan(30);
});

test("crop zoom changes the output", async ({ page }) => {
  await page.goto("/");
  await upload(page);
  const before = await canvasStats(page);

  await page.getByRole("button", { name: "Recrop" }).click();
  await page.getByRole("slider", { name: /Zoom/ }).fill("3");
  await page.getByRole("button", { name: /Apply crop/ }).click();
  await expect
    .poll(async () => (await canvasStats(page)).variance)
    .not.toBe(before.variance);
});

test("posterize reduces distinct colors", async ({ page }) => {
  await page.goto("/");
  await upload(page);
  await expand(page, "Adjust");
  const before = await canvasStats(page);

  await page.getByRole("slider", { name: /Posterize/ }).fill("2");
  await expect
    .poll(async () => (await canvasStats(page)).distinct)
    .toBeLessThan(before.distinct);
});

test("auto-enhance widens luminance range", async ({ page }) => {
  await page.goto("/");
  await upload(page);
  const before = await canvasStats(page);

  await page.getByRole("button", { name: "Auto-enhance" }).click();
  await expand(page, "Adjust");
  // Contrast slider should move off zero.
  const contrast = await page.getByRole("slider", { name: /Contrast/ }).inputValue();
  expect(Number(contrast)).not.toBe(0);
  await expect
    .poll(async () => (await canvasStats(page)).variance)
    .toBeGreaterThan(before.variance * 0.9);
});

test("palette mode quantizes to few colors", async ({ page }) => {
  await page.goto("/");
  await upload(page);

  await expand(page, "Color");
  await page.getByRole("tab", { name: "Palette" }).click();
  await page.getByRole("tab", { name: "Auto" }).click();
  await page.getByRole("tab", { name: "4", exact: true }).click();

  // 4-color palette + anti-aliased tile edges → still a small color count.
  await expect
    .poll(async () => (await canvasStats(page)).distinct, { timeout: 5000 })
    .toBeLessThan(40);
});

test("dithering changes the pixel layout", async ({ page }) => {
  await page.goto("/");
  await upload(page);
  await expand(page, "Color");
  await page.getByRole("tab", { name: "B/W" }).click();
  const flat = await canvasStats(page);

  await page.getByText(/Floyd.*dither/i).click();
  await expect
    .poll(async () => (await canvasStats(page)).variance)
    .not.toBe(flat.variance);
});

test("relief mode renders all variants", async ({ page }) => {
  await page.goto("/");
  await upload(page);

  await page.getByRole("tab", { name: "Relief" }).click();
  await expect
    .poll(async () => (await canvasStats(page)).variance, { timeout: 5000 })
    .toBeGreaterThan(20);
  const raised = await canvasStats(page);

  await page.getByRole("tab", { name: "Iso" }).click();
  await expect
    .poll(async () => (await canvasStats(page)).distinct)
    .not.toBe(raised.distinct);
});

test("presets save, persist, apply, and delete", async ({ page }) => {
  await page.goto("/");
  await upload(page);

  // Distinctive config, then save as a preset (via the prompt dialog).
  await page.getByRole("tab", { name: "Dot" }).click();
  page.once("dialog", (d) => d.accept("My Dot"));
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("button", { name: "My Dot" })).toBeVisible();

  // Change away, then applying the preset restores Dot mode.
  await page.getByRole("tab", { name: "Relief" }).click();
  await page.getByRole("button", { name: "My Dot" }).click();
  await expect(page.getByRole("tab", { name: "Dot" })).toHaveAttribute("aria-selected", "true");

  // Persists across reload (localStorage).
  await page.reload();
  await expect(page.getByRole("button", { name: "My Dot" })).toBeVisible();

  // Delete removes it.
  await page.getByRole("button", { name: "Delete preset" }).click();
  await expect(page.getByRole("button", { name: "My Dot" })).toHaveCount(0);
});

test("exports a PNG download", async ({ page }) => {
  await page.goto("/");
  await upload(page);

  await page.getByRole("button", { name: "Export", exact: true }).click();
  const dialog = page.getByRole("dialog");
  const downloadPromise = page.waitForEvent("download");
  await dialog.getByRole("button", { name: /PNG/ }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.png$/);
});

test("exports an SVG with vector shapes", async ({ page }) => {
  await page.goto("/");
  await upload(page);

  await page.getByRole("button", { name: "Export", exact: true }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("dialog").getByRole("button", { name: /SVG/ }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.svg$/);

  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(chunk as Buffer);
  const svg = Buffer.concat(chunks).toString("utf8");
  expect(svg).toContain("<svg");
  expect(svg).toMatch(/<rect[^>]*fill="rgb\(/);
});
