import { test, expect, type Page } from "@playwright/test";
import { makeFacePng } from "./fixtures/makeImage";

const FACE = makeFacePng();

async function upload(page: Page) {
  await page.locator('input[accept*="image"]').setInputFiles({
    name: "face.png",
    mimeType: "image/png",
    buffer: FACE,
  });
  await page.getByRole("button", { name: /Apply crop/ }).click();
  await expect(page.locator(".stage__canvas")).toBeVisible();
}

async function frVerdict(page: Page): Promise<string> {
  const el = page.locator(".meter--fr .meter__verdict");
  return (await el.count()) > 0 ? el.first().innerText() : "";
}

/** Distinct sampled colors on the visible stage canvas. */
function canvasDistinct(page: Page) {
  return page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>(".stage__canvas")!;
    const { data } = canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height);
    const distinct = new Set<string>();
    for (let i = 0; i < data.length; i += 4 * 17) distinct.add(`${data[i]},${data[i + 1]},${data[i + 2]}`);
    return distinct.size;
  });
}

async function overrideGrid(page: Page, value: string) {
  await page.getByRole("button", { name: "Customize", exact: true }).click();
  await page.locator(".grid-override input").check();
  await page.getByRole("slider", { name: /^Grid/ }).fill(value);
}

test("occlusion bar blacks out the eye band without a model", async ({ page }) => {
  await page.goto("/");
  await upload(page);

  const blackFraction = () =>
    page.evaluate(() => {
      const canvas = document.querySelector<HTMLCanvasElement>(".stage__canvas")!;
      const { data } = canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height);
      let black = 0;
      let n = 0;
      for (let i = 0; i < data.length; i += 4 * 17) {
        if (data[i] < 12 && data[i + 1] < 12 && data[i + 2] < 12) black++;
        n++;
      }
      return black / n;
    });
  const before = await blackFraction();

  // #when the eye band is occluded (works via the fallback band, no ML needed)
  await page.getByRole("button", { name: "Privacy", exact: true }).click();
  await page.getByText("Hide feature band").click();

  // #then the mosaic gains a run of pure-black cells
  await expect.poll(blackFraction, { timeout: 5000 }).toBeGreaterThan(before + 0.03);
});

test("cloak perturbs a fine, full-color render", async ({ page }) => {
  await page.goto("/");
  await upload(page);
  await overrideGrid(page, "128");
  const before = await canvasDistinct(page);

  // #when the experimental cloak is enabled on photo-like output
  await page.getByRole("button", { name: "Privacy", exact: true }).click();
  await page.getByText("Adversarial cloak (experimental)").click();

  // #then its high-frequency texture raises the distinct-color count
  await expect.poll(() => canvasDistinct(page), { timeout: 5000 }).toBeGreaterThan(before + 20);
});

test("FR measurement loads locally, then auto-harden defeats the match", async ({ page }) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`console: ${m.text()}`);
  });

  await page.goto("/");
  await upload(page);

  await page.getByRole("button", { name: "Privacy", exact: true }).click();
  await page.getByText("Measure FR matchability").click();

  // A near-1:1 grid keeps the face detectable — exercises the descriptor/distance path.
  await overrideGrid(page, "128");
  await expect
    .poll(() => frVerdict(page), { timeout: 60_000 })
    .toMatch(/Likely matches you|Borderline/);

  // Auto-harden coarsens until the face is no longer matchable.
  await page.getByRole("button", { name: /Auto-harden/ }).click();
  await expect
    .poll(() => frVerdict(page), { timeout: 30_000 })
    .toMatch(/Unlikely to match|No face detected/);
  await expect(page.getByText(/Coarsened to|still faintly matchable/)).toBeVisible();

  // Loading + running the model triggered no CSP violations or uncaught errors.
  expect(errors.filter((e) => /Content Security Policy|CSP/i.test(e))).toEqual([]);
  expect(errors.filter((e) => /pageerror/.test(e))).toEqual([]);
});
