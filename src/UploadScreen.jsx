import { useEffect, useRef, useState } from "react";
import { LogoMark } from "./Logo.jsx";
import { formatSize } from "./pdf.js";
import { micro } from "./ui.jsx";

// The first screen: what this is, and the one thing to do about it. Pulled out
// of App because it is a self-contained view with its own drag state, and App's
// job is deciding which view is on screen — not drawing them.
export default function UploadScreen({
  file,
  error,
  status,
  hasProfile,
  onPickFile,
  onAnalyse,
  onOpenProfile,
  onShowExample,
}) {
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef(null);

  // When App clears the picked file — starting again, or erasing everything —
  // the native input still holds the old filename, and re-picking that same
  // file would fire no change event at all. Clear the two in step.
  useEffect(() => {
    if (!file && fileInputRef.current) fileInputRef.current.value = "";
  }, [file]);

  return (
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
            onPickFile(e.dataTransfer.files?.[0]);
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
          <p className={`mt-1.5 ${micro} text-ink/40`}>
            {file
              ? `${formatSize(file.size)} — ready`
              : "PDF · up to 10 MB · nothing is stored"}
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(e) => onPickFile(e.target.files?.[0])}
        />
  
        {error && (
          <p className="mt-4 border-l-2 border-redline bg-redline/[0.05] px-4 py-3 text-sm leading-relaxed">
            {error}
          </p>
        )}
  
        {status && !status.ready && (
          <p className="mt-4 border-l-2 border-watch bg-watch/[0.06] px-4 py-3 text-sm leading-relaxed">
            No API key is set on the server, so analysis will fail. Add a
            free <code className="font-mono text-xs">GEMINI_API_KEY</code>,
            or set <code className="font-mono text-xs">MOCK_AI=1</code> to
            try the flow without one.
          </p>
        )}
  
        {!hasProfile && (
          <p className="mt-4 border-l-2 border-rule px-4 py-3 text-sm leading-relaxed text-ink/60">
            Redline works without one, but it can only tell you what to
            ask for — not what you can point at to win it.{" "}
            <button
              onClick={onOpenProfile}
              className="text-redline underline underline-offset-4"
            >
              Add your profile
            </button>{" "}
            and it uses your own track record as the argument.
          </p>
        )}
  
        <div className="mt-5 flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={onAnalyse}
            disabled={!file}
            className="border-2 border-ink px-6 py-2.5 font-mono text-xs uppercase tracking-[0.2em] transition-colors hover:bg-ink hover:text-stock disabled:border-ink/25 disabled:text-ink/25 disabled:hover:bg-transparent disabled:hover:text-ink/25"
          >
            Analyse
          </button>
          <button
            onClick={onShowExample}
            className="font-mono text-xs uppercase tracking-[0.18em] text-ink/50 underline-offset-4 hover:text-redline hover:underline"
          >
            See an example report
          </button>
        </div>
      </section>
    </>
  );
}
