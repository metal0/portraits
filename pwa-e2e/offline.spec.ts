import { expect, test } from "@playwright/test";

const MODEL_ASSET_COUNT = 6;
const INSTALL_ICON_PATHS = [
  "/pwa-192x192.png",
  "/pwa-512x512.png",
  "/maskable-icon-512x512.png",
] as const;
const INSTALL_ICON_PATH_SET = new Set<string>(INSTALL_ICON_PATHS);

test("loads the editor and face-recognition assets without a connection", async ({
  context,
  page,
}) => {
  test.setTimeout(120_000);

  // #given a first online visit has installed and activated the service worker
  await page.goto("/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);

  const modelResponses = new Map<string, boolean>();
  const scriptResponses = new Map<string, boolean>();
  const installIconResponses = new Map<string, boolean>();
  page.on("response", (response) => {
    const url = new URL(response.url());
    if (url.origin !== "http://127.0.0.1:4173") return;

    if (url.pathname.startsWith("/models/") && !url.pathname.endsWith("README.md")) {
      modelResponses.set(url.pathname, response.fromServiceWorker());
    }
    if (url.pathname.startsWith("/assets/") && url.pathname.endsWith(".js")) {
      scriptResponses.set(url.pathname, response.fromServiceWorker());
    }
    if (INSTALL_ICON_PATH_SET.has(url.pathname)) {
      installIconResponses.set(url.pathname, response.fromServiceWorker());
    }
  });

  // #when the browser goes offline and opens a fresh in-scope route
  await context.setOffline(true);
  await page.goto("/offline-check");

  // #then the install metadata, app shell, lazy bundle, and all model files come from the worker
  await expect
    .poll(
      async () => {
        const manifest = await page.evaluate(async (iconPaths) => {
          const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
          if (!link) return null;

          const response = await fetch(link.href);
          if (!response.ok) return null;

          const iconResponses = await Promise.all(iconPaths.map((path) => fetch(path)));

          const value: unknown = await response.json();
          if (typeof value !== "object" || value === null) return null;
          const record = value as Record<string, unknown>;
          const icons = Array.isArray(record.icons)
            ? record.icons.flatMap((value) => {
                if (typeof value !== "object" || value === null) return [];
                const icon = value as Record<string, unknown>;
                return [
                  {
                    purpose: typeof icon.purpose === "string" ? icon.purpose : "any",
                    sizes: icon.sizes,
                  },
                ];
              })
            : [];

          return {
            display: record.display,
            icons,
            iconsAvailable: iconResponses.every((iconResponse) => iconResponse.ok),
            name: record.name,
            shortName: record.short_name,
            startUrl: record.start_url,
          };
        }, INSTALL_ICON_PATHS);

        return {
          controlled: await page.evaluate(() => navigator.serviceWorker.controller !== null),
          heading: await page.getByRole("heading", { name: "Pixel Mosaic Portrait" }).textContent(),
          installIconsReady:
            installIconResponses.size === INSTALL_ICON_PATHS.length &&
            [...installIconResponses.values()].every(Boolean),
          manifest,
          modelsReady:
            modelResponses.size === MODEL_ASSET_COUNT &&
            [...modelResponses.values()].every(Boolean),
          scriptsReady:
            scriptResponses.size >= 2 && [...scriptResponses.values()].every(Boolean),
        };
      },
      { timeout: 60_000 },
    )
    .toEqual({
      controlled: true,
      heading: "Pixel Mosaic Portrait",
      installIconsReady: true,
      manifest: {
        display: "standalone",
        icons: [
          { purpose: "any", sizes: "64x64" },
          { purpose: "any", sizes: "192x192" },
          { purpose: "any", sizes: "512x512" },
          { purpose: "maskable", sizes: "512x512" },
        ],
        iconsAvailable: true,
        name: "Pixel Mosaic Portrait",
        shortName: "Portraits",
        startUrl: "/",
      },
      modelsReady: true,
      scriptsReady: true,
    });
});
