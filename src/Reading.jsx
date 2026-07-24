import { useEffect, useState } from "react";
import { micro } from "./ui.jsx";

// Reading a contract takes the model a while. Rather than a spinner that says
// nothing, walk through what it is actually doing — the stages are real, the
// timings are a good-faith guess, and the last one holds until the reply lands.
// Observed runs land between 23s and 77s depending on free-tier congestion, so
// the stages are paced to fill most of that rather than finishing in 25s and
// leaving the reader watching a frozen caption.
const STAGES = [
  "Opening the document",
  "Reading the clauses",
  "Pulling out the terms",
  "Weighing them against your profile",
  "Working out what to ask for",
  "Ranking the asks",
];

export default function Reading({ filename }) {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const timer = setInterval(
      () => setStage((s) => Math.min(s + 1, STAGES.length - 1)),
      6000
    );
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="mx-auto max-w-md py-20 text-center">
      <div className="mx-auto flex h-16 w-12 flex-col justify-center gap-[5px] border border-rule px-2">
        {STAGES.map((_, i) => (
          <span
            key={i}
            className={`h-[2px] transition-colors duration-500 ${
              i <= stage ? "bg-redline" : "bg-rule"
            }`}
          />
        ))}
      </div>

      <p className="mt-6 font-serif text-xl">{STAGES[stage]}…</p>
      <p className={`mt-2 ${micro} text-ink/40`}>
        {filename}
      </p>
      <p className="mx-auto mt-8 max-w-xs text-xs leading-relaxed text-ink/45">
        A minute or so, sometimes longer on a busy free tier. The file is held
        in memory for this one request and never written to disk.
      </p>
    </section>
  );
}
