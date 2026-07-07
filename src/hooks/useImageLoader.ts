import { useCallback, useEffect, useState } from "react";
import { useStore } from "@/state/store";

const ACCEPTED = /^image\/(png|jpeg|webp|avif)$/;

export interface ImageLoader {
  loadFile: (file: File) => Promise<void>;
  error: string | null;
  loading: boolean;
}

/**
 * Loads an image File into an ImageBitmap (respecting EXIF orientation) and
 * stores it. Also installs a global paste-from-clipboard handler.
 */
export function useImageLoader(): ImageLoader {
  const setSource = useStore((s) => s.setSource);
  const setCrop = useStore((s) => s.setCrop);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadFile = useCallback(
    async (file: File) => {
      if (!ACCEPTED.test(file.type)) {
        setError(`Unsupported format: ${file.type || "unknown"}`);
        return;
      }
      setError(null);
      setLoading(true);
      try {
        const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
        setSource(bitmap, file.name);
        setCrop({ x: 0.5, y: 0.5, scale: 1, rotation: 0 });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to decode image");
      } finally {
        setLoading(false);
      }
    },
    [setSource, setCrop],
  );

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const item = Array.from(e.clipboardData?.items ?? []).find((i) =>
        i.type.startsWith("image/"),
      );
      const file = item?.getAsFile();
      if (file) {
        e.preventDefault();
        void loadFile(file);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [loadFile]);

  return { loadFile, error, loading };
}
