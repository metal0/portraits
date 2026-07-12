import { useEffect, useRef } from "react";
import { useImageLoader } from "@/hooks/useImageLoader";
import { useFaceModelPreload } from "@/hooks/useFaceModelPreload";
import { useFaceMatch } from "@/hooks/useFaceMatch";
import { useRenderEngine } from "@/hooks/useRenderEngine";
import { useStore } from "@/state/store";
import { Uploader } from "@/components/Uploader";
import { CropModal } from "@/components/CropModal";
import { AdjustControls } from "@/components/AdjustControls";
import { DisplayControls } from "@/components/DisplayControls";
import { StyleControls } from "@/components/StyleControls";
import { ColorControls } from "@/components/ColorControls";
import { PrivacyControls } from "@/components/PrivacyControls";
import { ExportBar } from "@/components/ExportBar";
import { PreviewStage } from "@/components/PreviewStage";
import { PwaUpdatePrompt } from "@/components/PwaUpdatePrompt";
import { Icon } from "@/components/ui/Icon";
import { consumePwaUpdateReloadAllowance } from "@/pwa/updateReload";
import "./App.css";

const REPO_URL = "https://github.com/metal0/portraits";

export default function App() {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const hasSource = useStore((state) => state.source !== null);
  const { loadFile, error, loading } = useImageLoader();
  useFaceModelPreload();
  useRenderEngine();
  useFaceMatch();
  const chooseImage = () => imageInputRef.current?.click();

  // Warn before an accidental reload/close loses the in-memory image + edits.
  useEffect(() => {
    if (!hasSource) return;

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (consumePwaUpdateReloadAllowance()) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [hasSource]);

  return (
    <div className="app">
      <header className="app__header">
        <span className="app__logo" aria-hidden />
        <div className="app__titles">
          <div className="app__titlerow">
            <h1>Pixel Mosaic Portrait</h1>
            <a
              className="app__github"
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              aria-label="View source on GitHub"
            >
              <Icon name="github" size={15} title="GitHub" />
            </a>
          </div>
          <p className="app__tagline">Runs entirely in your browser, no uploads.</p>
        </div>
      </header>

      <div className="app__body">
        <aside className="panel panel--left">
          <Uploader
            error={error}
            loading={loading}
            onChooseFile={chooseImage}
          />
          <AdjustControls />
          <ColorControls />
          <DisplayControls />
          <StyleControls />
          <PrivacyControls />
          <ExportBar />
        </aside>

        <PreviewStage onFile={loadFile} onChooseFile={chooseImage} />
      </div>

      <input
        ref={imageInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/avif"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void loadFile(file);
          event.target.value = "";
        }}
      />
      <CropModal />
      <PwaUpdatePrompt />
    </div>
  );
}
