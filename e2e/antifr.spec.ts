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

async function frScore(page: Page): Promise<number> {
  const el = page.locator(".meter--fr .meter__score");
  if ((await el.count()) === 0) return NaN;
  return Number.parseFloat((await el.first().innerText()).trim());
}

async function overrideGrid(page: Page, value: string) {
  await page.getByRole("button", { name: "Customize", exact: true }).click();
  await page.locator(".grid-override input").check();
  await page.getByRole("slider", { name: /^Grid/ }).fill(value);
}

test("occlusion blacks out the band and auto-shows the match meter", async ({ page }) => {
  test.setTimeout(60_000);
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

  // #when the eye band is occluded — no separate opt-in
  await page.getByRole("button", { name: "Privacy", exact: true }).click();
  await page.getByText("Hide feature band").click();

  // #then the mosaic gains black cells (fallback band; model load competes for the main thread)
  await expect.poll(blackFraction, { timeout: 15_000 }).toBeGreaterThan(before + 0.03);

  // #and the match meter auto-loads the model and settles on a verdict
  await expect
    .poll(() => frVerdict(page), { timeout: 45_000 })
    .toMatch(/Likely matches you|Borderline|Unlikely to match|No face detected/);
});

test("cloak optimization raises the descriptor distance on a fine render", async ({ page }) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`console: ${m.text()}`);
  });

  await page.goto("/");
  await upload(page);

  await page.getByRole("button", { name: "Privacy", exact: true }).click();
  await overrideGrid(page, "128");

  // Enabling the cloak engages the model but changes nothing until optimized.
  await page.getByText("Adversarial cloak (experimental)").click();
  await expect.poll(() => frVerdict(page), { timeout: 60_000 }).toMatch(/Likely matches you|Borderline/);
  const before = await frScore(page);

  // #when the cloak is optimized against the local model
  await page.getByRole("button", { name: /Optimize cloak/ }).click();
  await expect(page.getByRole("button", { name: /Re-optimize cloak/ })).toBeVisible({ timeout: 60_000 });

  // #then it measurably worsens the match (higher distance, or undetectable) once
  // the debounced re-render + re-measure lands
  await expect
    .poll(
      async () => {
        const v = await frVerdict(page);
        if (v === "No face detected") return 9;
        const s = await frScore(page);
        return Number.isFinite(s) ? s : 9;
      },
      { timeout: 25_000 },
    )
    .toBeGreaterThan(before + 0.1);
  console.log(`CLOAK before=${before} verdict=${await frVerdict(page)} score=${await frScore(page)}`);

  expect(errors.filter((e) => /Content Security Policy|CSP/i.test(e))).toEqual([]);
  expect(errors.filter((e) => /pageerror/.test(e))).toEqual([]);
});
