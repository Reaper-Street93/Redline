import { useRef, useState } from "react";
import ReportView from "./ReportView.jsx";
import { SAMPLE_REPORT } from "./sampleReport.js";
import { LogoMark, Wordmark } from "./Logo.jsx";

export default function App() {
  const [file, setFile] = useState(null);
  const [report, setReport] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [toast, setToast] = useState(null);
  const fileInputRef = useRef(null);

  // index.html sets the class before first paint; this just mirrors it.
  const [dark, setDark] = useState(() =>
    document.documentElement.classList.contains("dark")
  );

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.theme = next ? "dark" : "light";
    } catch {
      // Private browsing — the choice just won't persist.
    }
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      setToast("Copied");
    } catch {
      setToast("Couldn't copy — select it by hand");
    }
    setTimeout(() => setToast(null), 1600);
  }

  function handleFile(picked) {
    if (!picked) return;
    setFile(picked);
  }

  function reset() {
    setReport(null);
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="min-h-dvh">
      {/* Brand bar */}
      <header className="no-print sticky top-0 z-20 border-b border-rule bg-stock/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
          <button
            onClick={reset}
            className="flex items-center gap-2.5"
            title="Start again"
          >
            <LogoMark />
            <Wordmark />
          </button>
          <button
            onClick={toggleTheme}
            className="font-mono text-[0.625rem] uppercase tracking-[0.2em] text-ink/50 hover:text-redline"
            title="Switch theme"
          >
            {dark ? "light" : "dark"}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-10">
        {!report && (
          <>
            <section className="mx-auto max-w-2xl text-center">
              <h1 className="font-serif text-4xl leading-[1.15] sm:text-5xl">
                Read the contract
                <br />
                <span className="text-redline">before</span> you sign it.
              </h1>
              <p className="mt-5 text-base leading-relaxed text-ink/70">
                Drop a job contract in. Redline tells you what it actually says,
                how it sits against your own experience, and the specific things
                worth going back and asking for — with the odds on each.
              </p>
            </section>

            {/* Drop zone */}
            <section className="mx-auto mt-10 max-w-2xl">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  handleFile(e.dataTransfer.files?.[0]);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`cursor-pointer border-2 border-dashed px-6 py-14 text-center transition-colors ${
                  dragging
                    ? "border-redline bg-redline/[0.04]"
                    : "border-rule hover:border-ink/40"
                }`}
              >
                <LogoMark className="mx-auto h-9 w-9 text-ink/30" />
                <p className="mt-4 font-serif text-xl">
                  {file ? file.name : "Drop your contract here"}
                </p>
                <p className="mt-1.5 font-mono text-[0.625rem] uppercase tracking-[0.18em] text-ink/40">
                  {file
                    ? `${(file.size / 1024 / 1024).toFixed(1)} MB — ready`
                    : "PDF · up to 10 MB · nothing is stored"}
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />

              <div className="mt-5 flex flex-wrap items-center justify-center gap-4">
                <button
                  disabled
                  className="border-2 border-ink/25 px-6 py-2.5 font-mono text-xs uppercase tracking-[0.2em] text-ink/25"
                  title="Not wired up yet"
                >
                  Analyse
                </button>
                <button
                  onClick={() => setReport(SAMPLE_REPORT)}
                  className="font-mono text-xs uppercase tracking-[0.18em] text-ink/50 underline-offset-4 hover:text-redline hover:underline"
                >
                  See an example report
                </button>
              </div>
            </section>
          </>
        )}

        {report && (
          <>
            <div className="no-print mx-auto mb-8 flex max-w-3xl items-center justify-between">
              <button
                onClick={reset}
                className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-ink/50 hover:text-redline"
              >
                ← another contract
              </button>
              <button
                onClick={() => window.print()}
                className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-ink/50 hover:text-redline"
              >
                print / pdf
              </button>
            </div>
            <ReportView report={report} onCopyText={copyText} />
          </>
        )}
      </main>

      {toast && (
        <div className="no-print fixed bottom-6 left-1/2 -translate-x-1/2 border border-ink bg-stock px-4 py-2 font-mono text-xs uppercase tracking-[0.18em]">
          {toast}
        </div>
      )}
    </div>
  );
}
