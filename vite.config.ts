import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { VitePWA } from "vite-plugin-pwa";

// The face-recognition weight shard is ~6.4 MiB and must be available offline.
const MAX_PRECACHE_FILE_BYTES = 10 * 1024 * 1024;

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      includeAssets: ["favicon.ico", "favicon.svg", "apple-touch-icon-180x180.png"],
      registerType: "prompt",
      manifest: {
        id: "/",
        name: "Pixel Mosaic Portrait",
        short_name: "Portraits",
        description: "Create privacy-conscious pixel mosaic avatars entirely on your device.",
        lang: "en",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#0e0e12",
        theme_color: "#0e0e12",
        categories: ["photo", "utilities"],
        prefer_related_applications: false,
        icons: [
          {
            src: "pwa-64x64.png",
            sizes: "64x64",
            type: "image/png",
          },
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "maskable-icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        globPatterns: ["**/*.{js,css,html,json,bin}"],
        maximumFileSizeToCacheInBytes: MAX_PRECACHE_FILE_BYTES,
        navigateFallback: "index.html",
      },
    }),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  worker: {
    format: "es",
  },
});
