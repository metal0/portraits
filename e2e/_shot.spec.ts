import { test } from "@playwright/test";
import { makeFacePng } from "./fixtures/makeImage";

const OUT = "C:/Users/metalo/AppData/Local/Temp/claude/b--Projects-portraits/7b8816aa-f699-4adf-abd3-d6d3153d923d/scratchpad";
const FACE = makeFacePng();

test("shot", async ({ page }) => {
  await page.setViewportSize({ width: 1180, height: 900 });
  await page.goto("/");
  await page.locator('input[accept*="image"]').setInputFiles({ name: "face.png", mimeType: "image/png", buffer: FACE });
  await page.locator(".stage__canvas").waitFor();
  await page.waitForTimeout(1300);
  await page.getByRole("tab", { name: "Dot" }).click(); // open style options
  await page.screenshot({ path: `${OUT}/ui-panel.png` });

  await page.getByRole("button", { name: "Export", exact: true }).click();
  await page.getByRole("dialog").waitFor();
  await page.screenshot({ path: `${OUT}/ui-modal.png` });
});
