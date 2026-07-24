import { useState } from "react";
import { Label, Clause } from "./ui.jsx";
import {
  CONTRACT_TYPE,
  FIT_VERDICT,
  assessmentOf,
  priorityOf,
  recommendationOf,
  severityOf,
} from "./vocab.js";

// Likelihood is a percentage; impact is 1-5. Both render as the same thin
// bar so the eye can compare them down a column of asks.
function ScoreBar({ label, value, max = 100, tone }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <Label>{label}</Label>
        <span className="font-mono text-xs text-ink/70">
          {max === 100 ? `${value}%` : `${value}/${max}`}
        </span>
      </div>
      <div className="mt-1 h-1 w-full bg-rule">
        <div className={`h-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

const likelihoodTone = (n) =>
  n >= 60 ? "bg-good" : n >= 35 ? "bg-watch" : "bg-redline";

function AskCard({ ask, onCopy }) {
  const [open, setOpen] = useState(ask.rank <= 2);
  const muted = ask.should_ask === false;

  return (
    <article
      className={`border-t border-rule pt-5 ${muted ? "opacity-55" : ""}`}
    >
      <div className="grid gap-5 sm:grid-cols-[1fr_170px]">
        <div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-redline">
              {String(ask.rank).padStart(2, "0")}
            </span>
            <span
              className={`border px-1.5 py-0.5 font-mono text-[0.625rem] uppercase tracking-[0.18em] ${
                priorityOf(ask.priority)
              }`}
            >
              {ask.priority}
            </span>
            {muted && (
              <span className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-ink/40">
                don&apos;t ask
              </span>
            )}
          </div>

          <h4 className="mt-2 font-serif text-xl leading-snug">{ask.title}</h4>
          <p className="mt-2 text-sm leading-relaxed text-ink/75">{ask.why}</p>

          <button
            onClick={() => setOpen(!open)}
            className="no-print mt-3 font-mono text-[0.625rem] uppercase tracking-[0.18em] text-ink/45 underline-offset-4 hover:text-redline hover:underline"
          >
            {open ? "hide" : "clause, leverage & wording"}
          </button>
        </div>

        <div className="flex flex-col gap-3 sm:border-l sm:border-rule sm:pl-5">
          <ScoreBar
            label="Likelihood"
            value={ask.likelihood}
            tone={likelihoodTone(ask.likelihood)}
          />
          <ScoreBar
            label="Impact"
            value={ask.impact}
            max={5}
            tone="bg-ink/70"
          />
        </div>
      </div>

      {open && (
        <div className="mt-4 grid gap-4 pb-5">
          <div>
            <Label className="mb-1.5">The clause</Label>
            <Clause text={ask.clause} />
          </div>
          <div>
            <Label className="mb-1.5">Your leverage</Label>
            <p className="text-sm leading-relaxed text-ink/75">{ask.leverage}</p>
          </div>
          <div className="border border-rule bg-ink/[0.03] p-4 dark:bg-ink/[0.04]">
            <div className="flex items-baseline justify-between gap-3">
              <Label>Say it like this</Label>
              <button
                onClick={() => onCopy(ask.suggested_wording)}
                className="no-print font-mono text-[0.625rem] uppercase tracking-[0.18em] text-ink/45 underline-offset-4 hover:text-redline hover:underline"
              >
                copy
              </button>
            </div>
            <p className="mt-2 font-serif text-[0.95rem] leading-relaxed">
              {ask.suggested_wording}
            </p>
          </div>
        </div>
      )}
      {!open && <div className="pb-5" />}
    </article>
  );
}

function TermRow({ term }) {
  const [open, setOpen] = useState(false);
  const a = assessmentOf(term.assessment);

  return (
    <div className="border-t border-rule">
      <button
        onClick={() => setOpen(!open)}
        className="grid w-full grid-cols-[1fr_auto] items-baseline gap-4 py-3 text-left sm:grid-cols-[190px_1fr_92px]"
      >
        <span className="font-mono text-xs uppercase tracking-[0.12em] text-ink/60">
          {term.label}
        </span>
        <span className="text-sm">{term.value}</span>
        <span
          className={`flex items-center justify-end gap-1.5 font-mono text-[0.625rem] uppercase tracking-[0.16em] ${a.tone}`}
        >
          <span className={`h-1.5 w-1.5 ${a.dot}`} />
          {a.label}
        </span>
      </button>
      {open && (
        <div className="grid gap-3 pb-4 sm:pl-[190px]">
          <p className="text-sm leading-relaxed text-ink/75">{term.note}</p>
          <Clause text={term.verbatim} />
        </div>
      )}
    </div>
  );
}

function StatCell({ label, children, sub }) {
  return (
    <div className="border-t border-rule px-4 py-4 first:border-l-0 sm:border-t-0 sm:border-l">
      <Label>{label}</Label>
      <div className="mt-1.5 font-serif text-2xl leading-tight">{children}</div>
      {sub && <p className="mt-1 text-xs leading-snug text-ink/55">{sub}</p>}
    </div>
  );
}

export default function ReportView({ report, onCopyText }) {
  const doc = report.document ?? {};
  // Reports saved before the field was renamed carry `gaps`.
  const gaps = report.fit?.experience_gaps ?? report.fit?.gaps ?? [];
  const rec = recommendationOf(report.overall?.recommendation);
  const asks = report.asks ?? [];
  const flags = report.flags ?? [];
  const hasHighFlag = flags.some((f) => f.severity === "high");

  return (
    <div className="mx-auto max-w-3xl">
      {/* Masthead */}
      <header className="border-b-2 border-ink pb-4">
        <Label>{CONTRACT_TYPE[doc.contract_type] ?? "Contract"}</Label>
        <h2 className="mt-2 font-serif text-3xl leading-tight sm:text-4xl">
          {doc.title}
        </h2>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-ink/50">
          <span>{doc.employer}</span>
          <span>{doc.role}</span>
          <span>{doc.jurisdiction}</span>
        </div>
      </header>

      {doc.read_confidence === "low" && (
        <p className="mt-4 border-l-2 border-watch bg-watch/[0.07] px-4 py-3 text-sm leading-relaxed text-ink/80">
          <strong className="font-semibold">This PDF was hard to read.</strong>{" "}
          It may be a low-quality scan or a photograph. Check every quoted
          clause against the document itself before you rely on anything here.
        </p>
      )}

      {/* Verdict strip */}
      <section className="mt-6 grid border border-rule sm:grid-cols-3">
        <StatCell label="Verdict">
          <span className={rec.tone}>{rec.label}</span>
        </StatCell>
        <StatCell
          label="Terms fairness"
          sub="How these terms sit against ordinary practice."
        >
          {report.overall?.fairness_score}
          <span className="text-base text-ink/40">/100</span>
        </StatCell>
        <StatCell
          label="Your fit"
          sub={`${report.fit?.verdict ?? ""} match for this role`}
        >
          <span className={FIT_VERDICT[report.fit?.verdict] ?? ""}>
            {report.fit?.score}
          </span>
          <span className="text-base text-ink/40">/100</span>
        </StatCell>
      </section>

      <p className="mt-6 font-serif text-lg leading-relaxed sm:text-xl">
        {report.summary}
      </p>

      {report.overall?.recommendation_reason && (
        <p className="mt-4 text-sm leading-relaxed text-ink/70">
          {report.overall.recommendation_reason}
        </p>
      )}

      {/* The asks */}
      <section className="mt-12">
        <div className="flex items-baseline justify-between border-b-2 border-ink pb-2">
          <h3 className="font-mono text-xs uppercase tracking-[0.28em]">
            What to ask for
          </h3>
          <span className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-ink/45">
            {asks.length} points, ranked
          </span>
        </div>
        <div className="mt-2">
          {asks.map((ask) => (
            <AskCard key={ask.rank} ask={ask} onCopy={onCopyText} />
          ))}
        </div>
      </section>

      {/* Fit detail */}
      <section className="mt-12">
        <h3 className="border-b-2 border-ink pb-2 font-mono text-xs uppercase tracking-[0.28em]">
          You against this role
        </h3>
        <p className="mt-4 text-sm leading-relaxed text-ink/75">
          {report.fit?.rationale}
        </p>
        <div className="mt-5 grid gap-6 sm:grid-cols-2">
          <div>
            <Label className="mb-2">Where you&apos;re strong</Label>
            <ul className="grid gap-2">
              {(report.fit?.matches ?? []).map((m, i) => (
                <li key={i} className="flex gap-2.5 text-sm leading-relaxed">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 bg-good" />
                  {m}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <Label className="mb-2">Where you’re light</Label>
            <ul className="grid gap-2">
              {gaps.length === 0 && (
                <li className="text-sm text-ink/50">
                  Nothing this role asks for is missing from your record.
                </li>
              )}
              {gaps.map((g, i) => (
                <li key={i} className="flex gap-2.5 text-sm leading-relaxed">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 bg-watch" />
                  {g}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Key terms */}
      <section className="mt-12">
        <div className="flex items-baseline justify-between border-b-2 border-ink pb-2">
          <h3 className="font-mono text-xs uppercase tracking-[0.28em]">
            The terms
          </h3>
          <span className="no-print font-mono text-[0.625rem] uppercase tracking-[0.18em] text-ink/45">
            tap a row for the clause
          </span>
        </div>
        <div className="mt-1">
          {(report.key_terms ?? []).map((term, i) => (
            <TermRow key={i} term={term} />
          ))}
        </div>
      </section>

      {/* Flags */}
      {flags.length > 0 && (
        <section className="mt-12">
          <h3 className="border-b-2 border-ink pb-2 font-mono text-xs uppercase tracking-[0.28em]">
            Worth a closer look
          </h3>
          <div className="mt-2">
            {flags.map((flag, i) => {
              const s = severityOf(flag.severity);
              return (
                <article key={i} className="border-t border-rule py-4">
                  <div className="flex items-center gap-2.5">
                    <span className={`h-3 w-0.5 ${s.bar}`} />
                    <span
                      className={`font-mono text-[0.625rem] uppercase tracking-[0.18em] ${s.tone}`}
                    >
                      {s.label}
                    </span>
                  </div>
                  <h4 className="mt-1.5 font-serif text-lg leading-snug">
                    {flag.title}
                  </h4>
                  <p className="mt-2 text-sm leading-relaxed text-ink/75">
                    {flag.why}
                  </p>
                  <div className="mt-3">
                    <Clause text={flag.clause} />
                  </div>
                </article>
              );
            })}
          </div>

          {hasHighFlag && (
            <div className="mt-5 border border-redline/40 bg-redline/[0.05] p-4">
              <Label className="text-redline">Get a human on this one</Label>
              <p className="mt-2 text-sm leading-relaxed text-ink/80">
                Something above is flagged high. Redline reads documents, it
                doesn&apos;t give legal advice — before you sign, it is worth
                twenty free minutes with someone who does.
              </p>
              <ul className="mt-3 grid gap-1.5 font-mono text-xs">
                {[
                  ["Acas helpline — free, 0300 123 1100", "https://www.acas.org.uk/contact"],
                  ["Citizens Advice — free", "https://www.citizensadvice.org.uk/work/"],
                  ["Your union rep, if you have one", "https://www.tuc.org.uk/joinunion"],
                  ["Law Society — find a solicitor", "https://solicitors.lawsociety.org.uk/"],
                ].map(([text, href]) => (
                  <li key={href}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-ink/70 underline decoration-rule underline-offset-4 hover:text-redline"
                    >
                      {text}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {/* Missing */}
      {(report.missing ?? []).length > 0 && (
        <section className="mt-12">
          <h3 className="border-b-2 border-ink pb-2 font-mono text-xs uppercase tracking-[0.28em]">
            What isn&apos;t in it
          </h3>
          <ul className="mt-3 grid gap-2">
            {report.missing.map((m, i) => (
              <li key={i} className="flex gap-2.5 text-sm leading-relaxed">
                <span className="mt-2 h-px w-3 shrink-0 bg-redline" />
                {m}
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="mt-12 border-t border-rule pt-4">
        <p className="font-mono text-[0.625rem] leading-relaxed tracking-[0.08em] text-ink/40">
          Redline is an information tool, not a solicitor, and this report is
          not legal advice. Every quoted clause should be checked against the
          document itself before you act on it.
        </p>
      </footer>
    </div>
  );
}
