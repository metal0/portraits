import { useImageLoader } from "@/hooks/useImageLoader";
import { useRenderEngine } from "@/hooks/useRenderEngine";
import { Uploader } from "@/components/Uploader";
import { CropControls } from "@/components/CropControls";
import { AdjustControls } from "@/components/AdjustControls";
import { DisplayControls } from "@/components/DisplayControls";
import { StyleControls } from "@/components/StyleControls";
import { ColorControls } from "@/components/ColorControls";
import { ExportControls } from "@/components/ExportControls";
import { PreviewStage } from "@/components/PreviewStage";
import { SmallPreviews } from "@/components/SmallPreviews";
import "./App.css";

export default function App() {
  const { loadFile, error, loading } = useImageLoader();
  useRenderEngine();

  return (
    <div className="app">
      <header className="app__header">
        <div className="app__brand">
          <span className="app__logo" aria-hidden />
          <div>
            <h1>Pixel Mosaic Portrait</h1>
            <p className="app__tagline">Runs entirely in your browser — no uploads.</p>
          </div>
        </div>
      </header>

      <div className="app__body">
        <aside className="panel panel--left">
          <Uploader onFile={loadFile} error={error} loading={loading} />
          <CropControls />
          <AdjustControls />
          <DisplayControls />
          <StyleControls />
          <ColorControls />
        </aside>

        <PreviewStage onFile={loadFile} />

        <aside className="panel panel--right">
          <SmallPreviews />
          <ExportControls />
        </aside>
      </div>
    </div>
  );
}
