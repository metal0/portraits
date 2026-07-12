import {
  defineConfig,
  minimal2023Preset,
} from "@vite-pwa/assets-generator/config";

const OPAQUE_ICON_BACKGROUND = {
  fit: "contain" as const,
  background: "#0e0e12",
};

export default defineConfig({
  headLinkOptions: {
    preset: "2023",
  },
  images: ["public/favicon.svg"],
  preset: {
    ...minimal2023Preset,
    maskable: {
      ...minimal2023Preset.maskable,
      resizeOptions: OPAQUE_ICON_BACKGROUND,
    },
    apple: {
      ...minimal2023Preset.apple,
      resizeOptions: OPAQUE_ICON_BACKGROUND,
    },
  },
});
