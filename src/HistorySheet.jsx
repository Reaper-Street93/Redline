import { formatWhen } from "./history.js";

const RECOMMENDATION = {
  sign: { label: "sign it", tone: "text-good" },
  negotiate_then_sign: { label: "negotiate first", tone: "text-watch" },
  push_back_hard: { label: "push back", tone: "text-redline" },
  walk_away: { label: "walk away", tone: "text-redline" },
};

export default function HistorySheet({
  history,
  onOpen,
  onDelete,
  onClearAll,
  onClose,
}) {
  return (
    <div className="no-print fixed inset-0 z-40 flex justify-end">
      <div
        className="absolute inset-0 bg-ink/25 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <aside className="relative flex h-full w-full max-w-lg flex-col overflow-y-auto border-l border-rule bg-stock">
        <header className="sticky top-0 flex items-baseline justify-between border-b border-rule bg-stock px-6 py-4">
          <div>
            <h2 className="font-serif text-2xl">Contracts you&apos;ve read</h2>
            <p className="mt-1 text-xs leading-relaxed text-ink/50">
              Kept in this browser. The PDFs themselves were never stored.
            </p>
          </div>
          <button
            onClick={onClose}
            className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-ink/45 hover:text-redline"
          >
            close
          </button>
        </header>

        <div className="px-6 py-2">
          {history.length === 0 && (
            <p className="py-16 text-center text-sm text-ink/45">
              Nothing here yet. Analyse a contract and it&apos;ll show up.
            </p>
          )}

          {history.map((entry) => {
            const doc = entry.report?.document ?? {};
            const rec =
              RECOMMENDATION[entry.report?.overall?.recommendation] ?? {
                label: "—",
                tone: "text-ink/50",
              };
            return (
              <article
                key={entry.id}
                className="border-b border-rule py-4"
              >
                <button
                  onClick={() => onOpen(entry)}
                  className="block w-full text-left"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-mono text-[0.625rem] uppercase tracking-[0.16em] text-ink/45">
                      {formatWhen(entry.at)}
                    </span>
                    <span
                      className={`font-mono text-[0.625rem] uppercase tracking-[0.16em] ${rec.tone}`}
                    >
                      {rec.label}
                    </span>
                  </div>
                  <h3 className="mt-1 font-serif text-lg leading-snug">
                    {doc.role || doc.title || "Untitled contract"}
                  </h3>
                  <p className="mt-0.5 text-xs text-ink/50">
                    {doc.employer}
                    {entry.filename ? ` · ${entry.filename}` : ""}
                  </p>
                  <div className="mt-2 flex gap-5 font-mono text-[0.625rem] uppercase tracking-[0.14em] text-ink/45">
                    <span>
                      fairness {entry.report?.overall?.fairness_score}
                    </span>
                    <span>fit {entry.report?.fit?.score}</span>
                    <span>{entry.report?.asks?.length ?? 0} asks</span>
                  </div>
                </button>

                <div className="mt-3 flex gap-4">
                  <button
                    onClick={() => onDelete(entry.id)}
                    className="font-mono text-[0.625rem] uppercase tracking-[0.16em] text-ink/35 underline-offset-4 hover:text-redline hover:underline"
                  >
                    delete
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        {history.length > 0 && (
          <footer className="sticky bottom-0 mt-auto border-t border-rule bg-stock px-6 py-4">
            <button
              onClick={onClearAll}
              className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-ink/40 hover:text-redline"
            >
              delete everything
            </button>
          </footer>
        )}
      </aside>
    </div>
  );
}
