import { formatWhen } from "./history.js";
import { Label, micro, microLink } from "./ui.jsx";
import { assessmentOf, recommendationOf } from "./vocab.js";

// Two numbers, side by side, with the better one in full ink and the other
// dimmed. For most rows higher wins; for flag counts, lower does.
function ScoreRow({ label, a, b, suffix = "", lowerIsBetter = false }) {
  const better = lowerIsBetter ? a < b : a > b;
  const lead = a === b ? null : better ? "a" : "b";
  const cell = (value, side) => (
    <div
      className={`px-4 py-3 text-center font-serif text-2xl ${
        lead === side ? "text-ink" : "text-ink/40"
      }`}
    >
      {value}
      {suffix && <span className="text-sm text-ink/35">{suffix}</span>}
    </div>
  );
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center border-t border-rule">
      {cell(a, "a")}
      <Label className="px-2 text-center">{label}</Label>
      {cell(b, "b")}
    </div>
  );
}

// Terms are matched by label. A term one contract has and the other doesn't is
// often the most interesting row on the page, so absences render explicitly.
function termMap(report) {
  const map = new Map();
  for (const term of report.key_terms ?? []) {
    map.set(term.label.trim().toLowerCase(), term);
  }
  return map;
}

function TermCell({ term }) {
  if (!term) {
    return (
      <div className="px-4 py-3 text-sm text-ink/30 italic">not covered</div>
    );
  }
  return (
    <div className="flex items-start gap-2 px-4 py-3">
      <span
        className={`mt-1.5 h-1.5 w-1.5 shrink-0 ${
          assessmentOf(term.assessment).dot
        }`}
        title={term.assessment}
      />
      <span className="text-sm leading-snug">{term.value}</span>
    </div>
  );
}

function Column({ entry }) {
  const doc = entry.report?.document ?? {};
  const rec = recommendationOf(entry.report?.overall?.recommendation);
  return (
    <div className="px-4 py-4 text-center">
      <Label>{formatWhen(entry.at)}</Label>
      <h3 className="mt-1.5 font-serif text-xl leading-snug">
        {doc.role || doc.title}
      </h3>
      <p className="mt-1 text-xs text-ink/50">{doc.employer}</p>
      <p
        className={`mt-2 ${micro} ${rec.tone}`}
      >
        {rec.label}
      </p>
    </div>
  );
}

export default function CompareView({ pair, onClose }) {
  const [left, right] = pair;
  const a = left.report;
  const b = right.report;

  const termsA = termMap(a);
  const termsB = termMap(b);
  // Left contract's order first, then anything only the right one covers.
  const labels = [
    ...(a.key_terms ?? []).map((t) => t.label),
    ...(b.key_terms ?? [])
      .map((t) => t.label)
      .filter((l) => !termsA.has(l.trim().toLowerCase())),
  ];

  const countHigh = (r) =>
    (r.flags ?? []).filter((f) => f.severity === "high").length;
  const countMust = (r) =>
    (r.asks ?? []).filter((x) => x.priority === "must" && x.should_ask !== false)
      .length;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="no-print mb-8 flex items-center justify-between">
        <button
          onClick={onClose}
          className={microLink}
        >
          ← back
        </button>
        <button
          onClick={() => window.print()}
          className={microLink}
        >
          print / pdf
        </button>
      </div>

      <h2 className="border-b-2 border-ink pb-2 font-mono text-xs uppercase tracking-[0.28em]">
        Two offers, side by side
      </h2>

      <section className="mt-4 border border-rule">
        <div className="grid grid-cols-2 divide-x divide-rule">
          <Column entry={left} />
          <Column entry={right} />
        </div>

        <ScoreRow
          label="Fairness"
          a={a.overall?.fairness_score ?? 0}
          b={b.overall?.fairness_score ?? 0}
          suffix="/100"
        />
        <ScoreRow
          label="Your fit"
          a={a.fit?.score ?? 0}
          b={b.fit?.score ?? 0}
          suffix="/100"
        />
        <ScoreRow
          label="Must-win asks"
          a={countMust(a)}
          b={countMust(b)}
        />
        <ScoreRow
          label="Serious flags"
          a={countHigh(a)}
          b={countHigh(b)}
          lowerIsBetter
        />
      </section>

      {/* Term by term */}
      <section className="mt-10">
        <h3 className="border-b-2 border-ink pb-2 font-mono text-xs uppercase tracking-[0.28em]">
          Term by term
        </h3>
        <div className="mt-1">
          {labels.map((label) => {
            const key = label.trim().toLowerCase();
            return (
              <div key={key} className="border-t border-rule">
                <Label className="px-4 pt-2.5">{label}</Label>
                <div className="grid grid-cols-2 divide-x divide-rule">
                  <TermCell term={termsA.get(key)} />
                  <TermCell term={termsB.get(key)} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* What to ask for, each side */}
      <section className="mt-10">
        <h3 className="border-b-2 border-ink pb-2 font-mono text-xs uppercase tracking-[0.28em]">
          What to ask for, either way
        </h3>
        <div className="mt-4 grid gap-8 sm:grid-cols-2">
          {[left, right].map((entry, i) => (
            <div key={i}>
              <Label className="mb-2">
                {entry.report?.document?.employer ?? `Contract ${i + 1}`}
              </Label>
              <ol className="grid gap-2.5">
                {(entry.report?.asks ?? [])
                  .filter((x) => x.should_ask !== false)
                  .slice(0, 5)
                  .map((ask) => (
                    <li key={ask.rank} className="flex gap-2.5 text-sm leading-snug">
                      <span className="mt-0.5 font-mono text-[0.625rem] text-redline">
                        {String(ask.rank).padStart(2, "0")}
                      </span>
                      <span>
                        {ask.title}
                        <span className="ml-1.5 font-mono text-[0.625rem] text-ink/40">
                          {ask.likelihood}%
                        </span>
                      </span>
                    </li>
                  ))}
              </ol>
            </div>
          ))}
        </div>
      </section>

      <footer className="mt-10 border-t border-rule pt-4">
        <p className="font-mono text-[0.625rem] leading-relaxed tracking-[0.08em] text-ink/40">
          Two reports, not two contracts — a comparison is only as good as the
          readings behind it. Redline is not legal advice.
        </p>
      </footer>
    </div>
  );
}
