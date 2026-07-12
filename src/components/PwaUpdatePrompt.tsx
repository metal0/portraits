import type { ReactElement } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import {
  acceptPwaUpdateReload,
  cancelPwaUpdateReload,
  preparePwaUpdateReload,
} from "@/pwa/updateReload";

export function PwaUpdatePrompt(): ReactElement {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onNeedReload() {
      preparePwaUpdateReload();
      window.location.reload();
    },
  });

  const reload = () => {
    const cancelReload = acceptPwaUpdateReload();
    void updateServiceWorker(true).catch(cancelReload);
  };

  const postpone = () => {
    cancelPwaUpdateReload();
    setNeedRefresh(false);
  };

  return (
    <>
      <span className="visually-hidden" role="status" aria-atomic="true">
        {needRefresh
          ? "Update available. Reload when you are ready; your open photo and edits will be cleared."
          : ""}
      </span>
      {needRefresh && (
        <section className="pwa-update" aria-labelledby="pwa-update-title">
          <div className="pwa-update__copy">
            <h2 id="pwa-update-title">Update available</h2>
            <p id="pwa-update-description">
              Reload when you are ready. Your open photo and edits will be cleared.
            </p>
          </div>
          <div className="pwa-update__actions">
            <button
              type="button"
              className="btn btn--ghost"
              onClick={postpone}
            >
              Later
            </button>
            <button
              type="button"
              className="btn btn--primary"
              aria-describedby="pwa-update-description"
              onClick={reload}
            >
              Reload
            </button>
          </div>
        </section>
      )}
    </>
  );
}
