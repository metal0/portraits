import { useRef } from "react";
import { useStore } from "@/state/store";
import { Section } from "./ui/Controls";
import { Icon } from "./ui/Icon";

export function Uploader(props: {
  onFile: (file: File) => void;
  error: string | null;
  loading: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const sourceName = useStore((s) => s.sourceName);
  const openCropModal = useStore((s) => s.openCropModal);

  return (
    <Section icon="image" title="Image">
      <button
        type="button"
        className="uploader"
        onClick={() => inputRef.current?.click()}
        disabled={props.loading}
      >
        <Icon name="upload" size={22} className="uploader__icon" />
        <span className="uploader__text">
          {props.loading ? "Decoding…" : "Upload, drop, or paste"}
        </span>
        <span className="uploader__hint">PNG · JPG · WEBP · AVIF</span>
      </button>
      {sourceName && (
        <>
          <p className="uploader__file">
            <Icon name="check" size={12} /> {sourceName}
          </p>
          <button type="button" className="btn btn--ghost btn--icon" onClick={openCropModal}>
            <Icon name="crop" size={14} /> Recrop
          </button>
        </>
      )}
      {props.error && (
        <p className="uploader__error">
          <Icon name="x" size={12} /> {props.error}
        </p>
      )}
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
    </Section>
  );
}
