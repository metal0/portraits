import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import { reactRefresh } from "eslint-plugin-react-refresh";
import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores([
    "dist/",
    "coverage/",
    "playwright-report/",
    "test-results/",
    "blob-report/",
    ".wrangler/",
  ]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [js.configs.recommended, tseslint.configs.recommended],
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    extends: [reactHooks.configs.flat.recommended],
    languageOptions: {
      globals: globals.browser,
    },
  },
  reactRefresh.configs.vite(),
  {
    files: ["*.config.ts", "e2e/**/*.ts", "pwa-e2e/**/*.ts"],
    languageOptions: {
      globals: globals.nodeBuiltin,
    },
  },
  {
    files: ["e2e/**/*.ts", "pwa-e2e/**/*.ts"],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    files: ["eslint.config.js"],
    extends: [js.configs.recommended],
    languageOptions: {
      globals: globals.nodeBuiltin,
    },
  },
]);
