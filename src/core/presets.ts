import type { CustomPreset, PresetsFile } from "./types";
import { PRESETS_FILE_VERSION } from "./types";

export function buildPresetsFile(presets: CustomPreset[]): PresetsFile {
  return { app: "portraits", kind: "presets", version: PRESETS_FILE_VERSION, presets };
}

/** Parse and shallow-validate a presets JSON file. Throws on malformed input. */
export function parsePresetsFile(text: string): CustomPreset[] {
  const data = JSON.parse(text) as Partial<PresetsFile>;
  if (data.app !== "portraits" || data.kind !== "presets" || !Array.isArray(data.presets)) {
    throw new Error("Not a Portraits presets file");
  }
  return data.presets.filter(
    (p): p is CustomPreset =>
      typeof p?.name === "string" && typeof p?.config === "object" && p.config !== null,
  );
}
