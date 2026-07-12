import { expect, test, type Page } from "@playwright/test";
import { makeFacePng } from "./fixtures/makeImage";

const FACE = makeFacePng();

async function openCrop(page: Page): Promise<void> {
  await page.goto("/");
  await page.locator('input[accept*="image"]').setInputFiles({
    name: "face.png",
    mimeType: "image/png",
    buffer: FACE,
  });
  await page.getByRole("dialog", { name: "Crop image" }).waitFor();
}

async function uploadAndApply(page: Page): Promise<void> {
  await openCrop(page);
  await page.getByRole("button", { name: "Apply crop" }).click();
}

test("crop dialog moves focus inside when opened", async ({ page }) => {
  // #given
  await openCrop(page);

  // #then
  await expect(page.getByRole("button", { name: "Close Crop image" })).toBeFocused();
});

test("crop dialog wraps backward focus at its boundary", async ({ page }) => {
  // #given
  await openCrop(page);

  // #when
  await page.keyboard.press("Shift+Tab");

  // #then
  await expect(page.getByRole("button", { name: "Apply crop" })).toBeFocused();
});

test("crop dialog closes with Escape and restores trigger focus", async ({ page }) => {
  // #given
  await uploadAndApply(page);
  const recrop = page.getByRole("button", { name: "Recrop" });
  await recrop.click();

  // #when
  await page.keyboard.press("Escape");

  // #then
  await expect(recrop).toBeFocused();
});

test("crop selection can be repositioned with the keyboard", async ({ page }) => {
  // #given
  await openCrop(page);
  await page.getByRole("slider", { name: /Zoom/ }).fill("2");
  const selection = page.getByRole("group", { name: /Crop selection/ });
  await selection.focus();
  const before = await selection.boundingBox();

  // #when
  await page.keyboard.press("ArrowRight");
  const after = await selection.boundingBox();
  if (!before || !after) throw new Error("Crop selection was not measurable");

  // #then
  expect(after.x).toBeGreaterThan(before.x);
  await expect(selection).toHaveCSS("outline-style", "solid");
  await expect(selection).toHaveCSS("outline-offset", "-4px");
});

test("collapsed style controls are absent from the accessibility tree", async ({ page }) => {
  // #given
  await page.goto("/");

  // #then
  await expect(page.getByRole("slider", { name: /Gap/ })).toHaveCount(0);
});

test("segmented choices support arrow-key selection", async ({ page }) => {
  // #given
  await page.goto("/");
  await page.getByRole("radio", { name: "Square" }).focus();

  // #when
  await page.keyboard.press("ArrowRight");

  // #then
  await expect(page.getByRole("radio", { name: "Dot" })).toHaveAttribute("aria-checked", "true");
});

test("mobile empty state exposes an actionable upload control", async ({ page }) => {
  // #given
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  // #then
  const upload = page.getByRole("button", { name: "Choose a photo" });
  await expect(upload).toBeVisible();
  const bounds = await upload.boundingBox();
  if (!bounds) throw new Error("Upload control was not measurable");
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(844);
});

test("mobile empty state does not overflow horizontally", async ({ page }) => {
  // #given
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  // #when
  const fitsViewport = await page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
  );

  // #then
  expect(fitsViewport).toBe(true);
});
