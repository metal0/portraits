import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./Icon";

export function Modal(props: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") props.onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [props]);

  // Portal to body so no ancestor stacking context (e.g. the sticky export
  // bar) can trap the fixed overlay beneath other content.
  return createPortal(
    <div className="modal" onMouseDown={props.onClose}>
      <div
        className="modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-label={props.title}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="modal__head">
          <h2 className="modal__title">{props.title}</h2>
          <button type="button" className="icon-btn" title="Close" onClick={props.onClose}>
            <Icon name="x" size={14} />
          </button>
        </div>
        <div className="modal__body">{props.children}</div>
      </div>
    </div>,
    document.body,
  );
}
