import { useEffect } from "react";
import { useImageLoader } from "@/hooks/useImageLoader";
import { useRenderEngine } from "@/hooks/useRenderEngine";
import { useStore } from "@/state/store";
import { Uploader } from "@/components/Uploader";
import { CropControls } from "@/components/CropControls";
import { AdjustControls } from "@/components/AdjustControls";
import { DisplayControls } from "@/components/DisplayControls";
import { StyleControls } from "@/components/StyleControls";
import { ColorControls } from "@/components/ColorControls";
import { ExportBar } from "@/components/ExportBar";
import { PreviewStage } from "@/components/PreviewStage";
import { Icon } from "@/components/ui/Icon";
import "./App.css";

const REPO_URL = "https://github.com/metal0/portraits";

export default function App() {
  const { loadFile, error, loading } = useImageLoader();
  useRenderEngine();

  // Warn before an accidental reload/close loses the in-memory image + edits.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (useStore.getState().source) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

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
          <Uploader onFile={loadFile} error={error} loading={loading} />
          <CropControls />
          <AdjustControls />
          <ColorControls />
          <DisplayControls />
          <StyleControls />
          <ExportBar />
        </aside>

        <PreviewStage onFile={loadFile} />
      </div>
    </div>
  );
}
