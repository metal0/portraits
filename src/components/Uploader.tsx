import { useStore } from "@/state/store";
import { Section } from "./ui/Controls";
import { Icon } from "./ui/Icon";

export function Uploader(props: {
  error: string | null;
  loading: boolean;
  onChooseFile: () => void;
}) {
  const sourceName = useStore((s) => s.sourceName);
  const openCropModal = useStore((s) => s.openCropModal);

  return (
    <Section icon="image" title="Image">
      <button
        type="button"
        className="uploader"
        onClick={props.onChooseFile}
        disabled={props.loading}
        aria-busy={props.loading}
      >
        <Icon name="upload" size={22} className="uploader__icon" />
        <span className="uploader__text">
          {props.loading ? "Decoding…" : "Upload, drop, or paste"}
        </span>
        <span className="uploader__hint">PNG · JPG · WEBP · AVIF</span>
      </button>
      {sourceName && (
        <>
          <p className="uploader__file" aria-live="polite">
            <Icon name="check" size={12} /> {sourceName}
          </p>
          <button type="button" className="btn btn--ghost btn--icon" onClick={openCropModal}>
            <Icon name="crop" size={14} /> Recrop
          </button>
        </>
      )}
      {props.error && (
        <p className="uploader__error" role="alert">
          <Icon name="x" size={12} /> {props.error}
        </p>
      )}
    </Section>
  );
}
