import { useStore } from "@/state/store";
import { recommendGrid, blockSize } from "@/core/grid";
import "./App.css";

export default function App() {
  const grid = useStore((s) => s.grid);
  const effectiveGrid = useStore((s) => s.effectiveGrid());
  const setGrid = useStore((s) => s.setGrid);

  const recommended = recommendGrid(grid.displaySizePx, grid.targetBlockScreenPx);
  const px = blockSize(grid.outputSizePx, effectiveGrid);

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
          <SectionPlaceholder title="Upload" />
          <SectionPlaceholder title="Crop" />

          <section className="section">
            <h2 className="section__title">Display size</h2>
            <label className="field">
              <span className="field__label">
                Shown at <strong>{grid.displaySizePx}px</strong>
              </span>
              <input
                type="range"
                min={16}
                max={128}
                step={1}
                value={grid.displaySizePx}
                onChange={(e) => setGrid({ displaySizePx: Number(e.target.value) })}
              />
            </label>
            <label className="field">
              <span className="field__label">
                Block size target <strong>{grid.targetBlockScreenPx}px</strong>
              </span>
              <input
                type="range"
                min={1}
                max={3}
                step={0.25}
                value={grid.targetBlockScreenPx}
                onChange={(e) => setGrid({ targetBlockScreenPx: Number(e.target.value) })}
              />
            </label>
          </section>

          <SectionPlaceholder title="Style mode" />
          <SectionPlaceholder title="Color mode" />
          <SectionPlaceholder title="Export" />
        </aside>

        <main className="stage">
          <div className="stage__empty">
            <div className="stage__grid-readout">
              <div className="readout">
                <span className="readout__value">
                  {effectiveGrid}×{effectiveGrid}
                </span>
                <span className="readout__label">grid</span>
              </div>
              <div className="readout">
                <span className="readout__value">{Math.round(px)}px</span>
                <span className="readout__label">per block @ {grid.outputSizePx}</span>
              </div>
              <div className="readout">
                <span className="readout__value">
                  {recommended}×{recommended}
                </span>
                <span className="readout__label">recommended</span>
              </div>
            </div>
            <p className="stage__hint">
              Upload a photo to begin. The engine is wired — rendering lands in Phase 1.
            </p>
          </div>
        </main>

        <aside className="panel panel--right">
          <SectionPlaceholder title="Small previews" />
          <SectionPlaceholder title="Readability" />
        </aside>
      </div>
    </div>
  );
}

function SectionPlaceholder({ title }: { title: string }) {
  return (
    <section className="section section--placeholder">
      <h2 className="section__title">{title}</h2>
      <div className="section__stub">Coming soon</div>
    </section>
  );
}
