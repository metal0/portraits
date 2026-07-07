import { useRef } from "react";
import { useStore } from "@/state/store";

export function Uploader(props: {
  onFile: (file: File) => void;
  error: string | null;
  loading: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const sourceName = useStore((s) => s.sourceName);

  return (
    <section className="section">
      <h2 className="section__title">Image</h2>
      <button
        type="button"
        className="uploader"
        onClick={() => inputRef.current?.click()}
        disabled={props.loading}
      >
        <span className="uploader__icon" aria-hidden>
          ⬆
        </span>
        <span className="uploader__text">
          {props.loading ? "Decoding…" : "Upload, drop, or paste"}
        </span>
        <span className="uploader__hint">PNG · JPG · WEBP · AVIF</span>
      </button>
      {sourceName && <p className="uploader__file">{sourceName}</p>}
      {props.error && <p className="uploader__error">{props.error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/avif"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) props.onFile(file);
          e.target.value = "";
        }}
      />
    </section>
  );
}
