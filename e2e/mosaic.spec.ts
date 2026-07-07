import { test, expect, type Page } from "@playwright/test";
import { makeFacePng } from "./fixtures/makeImage";

const FACE = makeFacePng();

async function upload(page: Page) {
  await page.locator('input[type="file"]').setInputFiles({
    name: "face.png",
    mimeType: "image/png",
    buffer: FACE,
  });
  await expect(page.locator(".stage__canvas")).toBeVisible();
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
  await expect(page.locator(".preview-cell__canvas")).toHaveCount(6);
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

  await page.getByRole("tab", { name: "Gray" }).click();
  const gray = await page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>(".stage__canvas")!;
    const { data } = canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height);
    let colored = 0;
    for (let i = 0; i < data.length; i += 4 * 53) {
      // Skip background corners; only count near-neutral vs saturated.
      const max = Math.max(data[i], data[i + 1], data[i + 2]);
      const min = Math.min(data[i], data[i + 1], data[i + 2]);
      if (max - min > 24) colored++;
    }
    return colored;
  });
  // Grayscale tiles are neutral; only anti-aliased tile edges may deviate.
  expect(gray).toBeLessThan(30);
});

test("crop zoom changes the output", async ({ page }) => {
  await page.goto("/");
  await upload(page);
  const before = await canvasStats(page);

  const zoom = page.getByRole("slider", { name: /Zoom/ });
  await zoom.fill("2.5");
  await expect
    .poll(async () => (await canvasStats(page)).variance)
    .not.toBe(before.variance);
});

test("exports a PNG download", async ({ page }) => {
  await page.goto("/");
  await upload(page);

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /Download PNG/ }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.png$/);
});
