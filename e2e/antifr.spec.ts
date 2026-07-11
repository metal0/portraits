import { test, expect, type Page } from "@playwright/test";
import { makeFacePng } from "./fixtures/makeImage";

const FACE = makeFacePng();

test.describe.configure({ mode: "serial" });

async function upload(page: Page) {
  await page.locator('input[accept*="image"]').setInputFiles({
    name: "face.png",
    mimeType: "image/png",
    buffer: FACE,
  });
  await page.getByRole("button", { name: /Apply crop/ }).click();
  await expect(page.locator(".stage__canvas")).toBeVisible();
}

async function uploadBlank(page: Page) {
  await page.locator('input[accept*="image"]').evaluate(async (input: HTMLInputElement) => {
    const canvas = document.createElement("canvas");
    canvas.width = 96;
    canvas.height = 96;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("no canvas context");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => {
        if (result) resolve(result);
        else reject(new Error("failed to encode test image"));
      }, "image/png");
    });
    const transfer = new DataTransfer();
    transfer.items.add(new File([blob], "blank.png", { type: "image/png" }));
    input.files = transfer.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
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

  // #when a render input changes after optimization
  await page.getByRole("button", { name: "Adjust", exact: true }).click();
  await page.getByRole("slider", { name: /^Brightness/ }).fill("10");

  // #then the image-specific cloak field is invalidated
  await expect(page.getByRole("button", { name: "Optimize cloak", exact: true })).toBeVisible();

  expect(errors.filter((e) => /Content Security Policy|CSP/i.test(e))).toEqual([]);
  expect(errors.filter((e) => /pageerror/.test(e))).toEqual([]);
});

test("same-sized replacement invalidates in-flight face analysis", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/");
  await upload(page);
  await page.getByRole("button", { name: "Privacy", exact: true }).click();
  await page.getByText("Hide feature band").click();
  await expect
    .poll(() => frVerdict(page), { timeout: 45_000 })
    .toMatch(/Likely matches you|Borderline|Unlikely to match|No face detected/);

  // #given a rendered measurement has been invalidated and a replacement has identical dimensions
  await page.getByRole("slider", { name: /^Coverage/ }).fill("80");
  await expect(page.getByText("Measuring…")).toBeVisible({ timeout: 15_000 });

  // #when the source is replaced while that measurement can still be in flight
  await uploadBlank(page);

  // #then only the replacement's terminal no-face state can commit
  const terminalState = page.getByText("No face found in your photo", { exact: true });
  await expect(terminalState).toBeVisible({ timeout: 45_000 });
  await page.waitForTimeout(2_000);
  await expect(terminalState).toBeVisible();
});

test("failed model loading can be retried", async ({ page }) => {
  test.setTimeout(90_000);
  let failModelLoad = true;
  await page.route("**/models/tiny_face_detector_model-weights_manifest.json", async (route) => {
    if (failModelLoad) {
      failModelLoad = false;
      await route.fulfill({ status: 503, contentType: "application/json", body: "{}" });
      return;
    }
    await route.continue();
  });
  await page.goto("/");
  await upload(page);

  // #given the first same-origin model request fails
  await page.getByRole("button", { name: "Privacy", exact: true }).click();
  await page.getByText("Hide feature band").click();
  const retry = page.getByRole("button", { name: "Retry face analysis" });
  await expect(retry).toBeVisible({ timeout: 45_000 });

  // #when the user retries after the transient failure clears
  await retry.click();

  // #then the rejected model promise is not reused and analysis reaches a terminal result
  await expect
    .poll(() => frVerdict(page), { timeout: 45_000 })
    .toMatch(
      /Likely matches you|Borderline|Unlikely to match|No face detected|No face found in your photo/,
    );
});

test("returning to a previous crop restarts cancelled baseline analysis", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/");
  await upload(page);
  await page.getByRole("button", { name: "Privacy", exact: true }).click();
  await page.getByText("Hide feature band").click();
  await expect
    .poll(() => frVerdict(page), { timeout: 45_000 })
    .toMatch(/Likely matches you|Borderline|Unlikely to match|No face detected/);

  // #given analysis starts for a changed crop
  await page.getByRole("button", { name: "Recrop" }).click();
  await page.getByRole("slider", { name: /Zoom/ }).fill("2");
  await page.getByRole("button", { name: "Apply crop" }).click();

  // #when the crop returns to the previously analyzed geometry before that work settles
  await page.getByRole("button", { name: "Recrop" }).click();
  await page.getByRole("slider", { name: /Zoom/ }).fill("1");
  await page.getByRole("button", { name: "Apply crop" }).click();

  // #then the invalidated baseline cache cannot leave analysis idle
  await expect
    .poll(() => frVerdict(page), { timeout: 45_000 })
    .toMatch(/Likely matches you|Borderline|Unlikely to match|No face detected/);
});

test("returning to a previous crop while privacy is off restarts analysis", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/");
  await upload(page);
  await page.getByRole("button", { name: "Privacy", exact: true }).click();
  const privacyToggle = page.getByText("Hide feature band");
  await privacyToggle.click();
  await expect
    .poll(() => frVerdict(page), { timeout: 45_000 })
    .toMatch(/Likely matches you|Borderline|Unlikely to match|No face detected/);

  // #given privacy analysis is disabled after crop A has been cached
  await privacyToggle.click();

  // #when the crop moves away from A and back while analysis remains disabled
  await page.getByRole("button", { name: "Recrop" }).click();
  await page.getByRole("slider", { name: /Zoom/ }).fill("2");
  await page.getByRole("button", { name: "Apply crop" }).click();
  await page.getByRole("button", { name: "Recrop" }).click();
  await page.getByRole("slider", { name: /Zoom/ }).fill("1");
  await page.getByRole("button", { name: "Apply crop" }).click();
  await privacyToggle.click();

  // #then re-enabling privacy cannot reuse the cleared baseline as a cache hit
  await expect
    .poll(() => frVerdict(page), { timeout: 45_000 })
    .toMatch(/Likely matches you|Borderline|Unlikely to match|No face detected/);
});

test("stale cloak optimization cannot install a field", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/");
  await upload(page);
  await page.getByRole("button", { name: "Privacy", exact: true }).click();
  await overrideGrid(page, "128");
  const cloakToggle = page.getByText("Adversarial cloak (experimental)");
  await cloakToggle.click();
  const optimize = page.getByRole("button", { name: "Optimize cloak", exact: true });
  await expect(optimize).toBeEnabled({ timeout: 60_000 });

  // #given a cloak optimization is in flight
  await optimize.click();
  await expect(page.getByRole("button", { name: "Optimizing…" })).toBeDisabled();

  // #when its captured cloak state changes before the optimizer resolves
  await cloakToggle.click();
  await cloakToggle.click();

  // #then the stale field is discarded instead of being installed or re-enabling stale state
  await expect(page.getByRole("button", { name: "Optimize cloak", exact: true })).toBeEnabled({
    timeout: 60_000,
  });
  await expect(page.getByRole("button", { name: "Re-optimize cloak" })).toHaveCount(0);
});
