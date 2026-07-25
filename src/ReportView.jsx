import { useState } from "react";
import { Clause, Label, micro } from "./ui.jsx";
import {
  CONTRACT_TYPE,
  FIT_VERDICT,
  assessmentOf,
  priorityOf,
  recommendationOf,
  severityOf,
} from "./vocab.js";
import { groupByTheme, isImprovable } from "./themes.js";

// The heavy ruled heading that opens each block of the report.
function SectionHeading({ children, aside }) {
  return (
    <div className="flex items-baseline justify-between border-b-2 border-ink pb-2">
      <h3 className="font-mono text-xs uppercase tracking-[0.28em]">{children}</h3>
      {aside}
    </div>
  );
}

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

function AskCard({ ask, onCopy, onShowSource, onShowProfile }) {
  const [open, setOpen] = useState(ask.rank <= 2);
  const muted = ask.should_ask === false;

  return (
    <article
      className={`border-t border-rule py-5 ${muted ? "opacity-55" : ""}`}
    >
      <div className="grid gap-5 sm:grid-cols-[1fr_170px]">
        <div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-redline">
              {String(ask.rank).padStart(2, "0")}
            </span>
            <span
              className={`border px-1.5 py-0.5 ${micro} ${
                priorityOf(ask.priority)
              }`}
            >
              {ask.priority}
            </span>
            {muted && (
              <span className={`${micro} text-ink/40`}>
                don&apos;t ask
              </span>
            )}
          </div>

          <h4 className="mt-2 font-serif text-xl leading-snug">{ask.title}</h4>
          <p className="mt-2 text-sm leading-relaxed text-ink/75">{ask.why}</p>

          <button
            onClick={() => setOpen(!open)}
            className={`no-print mt-3 ${micro} text-ink/45 underline-offset-4 hover:text-redline hover:underline`}
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
        <div className="mt-4 grid gap-4">
          <div>
            <Label className="mb-1.5">The clause</Label>
            <Clause text={ask.clause} onFind={onShowSource} />
          </div>
          <div>
            <Label className="mb-1.5">Your leverage</Label>
            <p className="text-sm leading-relaxed text-ink/75">{ask.leverage}</p>
            {onShowProfile && (
              <button
                onClick={() => onShowProfile(ask.leverage)}
                className={`no-print mt-1.5 ${micro} text-ink/40 underline-offset-4 hover:text-redline hover:underline`}
              >
                what backs this up →
              </button>
            )}
          </div>
          <div className="border border-rule bg-ink/[0.03] p-4 dark:bg-ink/[0.04]">
            <div className="flex items-baseline justify-between gap-3">
              <Label>Say it like this</Label>
              <button
                onClick={() => onCopy(ask.suggested_wording)}
                className={`no-print ${micro} text-ink/45 underline-offset-4 hover:text-redline hover:underline`}
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
    </article>
  );
}

function TermRow({ term, onShowSource }) {
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
          className={`flex items-center justify-end gap-1.5 ${micro} ${a.tone}`}
        >
          <span className={`h-1.5 w-1.5 ${a.dot}`} />
          {a.label}
        </span>
      </button>
      {open && (
        <div className="grid gap-3 pb-4 sm:pl-[190px]">
          <p className="text-sm leading-relaxed text-ink/75">{term.note}</p>
          <Clause text={term.verbatim} onFind={onShowSource} />
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

// ── The summary page: the contract in plain English ────────────────────────

// A single term as the summary shows it — no verbatim clause, just what it says
// and why it earned its mark. The ones worth acting on carry the red rule, so a
// reader skimming can see where the room to improve is without reading a word.
function SummaryTerm({ term }) {
  const improvable = isImprovable(term.assessment);
  const a = assessmentOf(term.assessment);
  return (
    <div
      className={`py-2.5 ${
        improvable ? "border-l-2 border-redline pl-3" : "border-l-2 border-transparent pl-3"
      }`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-serif text-[0.95rem]">{term.label}</span>
        <span className={`shrink-0 text-right text-sm ${improvable ? "text-ink" : "text-ink/70"}`}>
          {term.value}
        </span>
      </div>
      <p className="mt-1 flex items-start gap-2 text-sm leading-relaxed text-ink/65">
        <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 ${a.dot}`} />
        {term.note}
      </p>
    </div>
  );
}

function SummaryPage({ report, onGoToAsks }) {
  const groups = groupByTheme(report.key_terms);
  const askable = (report.asks ?? []).filter((a) => a.should_ask !== false).length;
  const improvable = (report.key_terms ?? []).filter((t) => isImprovable(t.assessment)).length;

  return (
    <div>
      <p className="font-serif text-lg leading-relaxed sm:text-xl">{report.summary}</p>
      {report.overall?.recommendation_reason && (
        <p className="mt-4 text-sm leading-relaxed text-ink/70">
          {report.overall.recommendation_reason}
        </p>
      )}

      <p className="mt-6 text-sm leading-relaxed text-ink/60">
        Here is the whole contract in plain English, grouped the way you would
        actually think about it. The terms with a red edge are the ones worth a
        second look — {improvable} of them.
      </p>

      {groups.map((group) => {
        const count = group.terms.filter((t) => isImprovable(t.assessment)).length;
        return (
          <section key={group.key} className="mt-10">
            <SectionHeading
              aside={
                count > 0 && (
                  <span className={`${micro} text-redline`}>
                    {count} to improve
                  </span>
                )
              }
            >
              {group.heading}
            </SectionHeading>
            <p className="mt-2 text-xs leading-relaxed text-ink/45">{group.blurb}</p>
            <div className="mt-2">
              {group.terms.map((term) => (
                <SummaryTerm key={term.index} term={term} />
              ))}
            </div>
          </section>
        );
      })}

      {/* The bridge to the second page — the point of the whole thing. */}
      <div className="no-print mt-12 border-2 border-ink p-6 text-center">
        <p className="font-serif text-xl">
          {askable} {askable === 1 ? "thing is" : "things are"} worth going back
          and asking for.
        </p>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink/65">
          Ranked by what is worth spending your goodwill on, each with the odds,
          the leverage from your own record, and wording you can send today.
        </p>
        <button
          onClick={onGoToAsks}
          className="mt-5 border-2 border-ink px-6 py-2.5 font-mono text-xs uppercase tracking-[0.2em] hover:bg-ink hover:text-stock"
        >
          What to ask for →
        </button>
      </div>
    </div>
  );
}

// ── The evidence page: what to ask for, and the receipts ───────────────────

function AsksPage({ report, onCopyText, onShowSource, onShowProfile }) {
  const gaps = report.fit?.experience_gaps ?? report.fit?.gaps ?? [];
  const asks = report.asks ?? [];
  const flags = report.flags ?? [];
  const hasHighFlag = flags.some((f) => f.severity === "high");

  return (
    <div>
      {/* The asks */}
      <section>
        <SectionHeading aside={<span className={`${micro} text-ink/45`}>{asks.length} points, ranked</span>}>
          What to ask for
        </SectionHeading>
        <div className="mt-2">
          {asks.map((ask) => (
            <AskCard
              key={ask.rank}
              ask={ask}
              onCopy={onCopyText}
              onShowSource={onShowSource}
              onShowProfile={onShowProfile}
            />
          ))}
        </div>
      </section>

      {/* Fit detail */}
      <section className="mt-12">
        <SectionHeading
          aside={
            onShowProfile && (
              <button
                onClick={() => onShowProfile("")}
                className={`no-print ${micro} text-ink/45 underline-offset-4 hover:text-redline hover:underline`}
              >
                read the profile →
              </button>
            )
          }
        >
          You against this role
        </SectionHeading>
        <p className="mt-4 text-sm leading-relaxed text-ink/75">{report.fit?.rationale}</p>
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

      {/* Key terms — the full evidence, with the clause behind each */}
      <section className="mt-12">
        <SectionHeading aside={<span className={`no-print ${micro} text-ink/45`}>tap a row for the clause</span>}>
          The terms, in full
        </SectionHeading>
        <div className="mt-1">
          {(report.key_terms ?? []).map((term, i) => (
            <TermRow key={i} term={term} onShowSource={onShowSource} />
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
              const sev = severityOf(flag.severity);
              return (
                <article key={i} className="border-t border-rule py-4">
                  <div className="flex items-center gap-2.5">
                    <span className={`h-3 w-0.5 ${sev.bar}`} />
                    <span className={`${micro} ${sev.tone}`}>{sev.label}</span>
                  </div>
                  <h4 className="mt-1.5 font-serif text-lg leading-snug">{flag.title}</h4>
                  <p className="mt-2 text-sm leading-relaxed text-ink/75">{flag.why}</p>
                  <div className="mt-3">
                    <Clause text={flag.clause} onFind={onShowSource} />
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
    </div>
  );
}

// ── The report: two pages over one shared masthead ─────────────────────────

export default function ReportView({ report, onCopyText, onShowSource, onShowProfile }) {
  const doc = report.document ?? {};
  const rec = recommendationOf(report.overall?.recommendation);
  const [page, setPage] = useState("summary");

  const TABS = [
    ["summary", "Summary"],
    ["asks", "What to ask for"],
  ];

  return (
    <div className="mx-auto max-w-3xl">
      {/* Masthead */}
      <header className="border-b-2 border-ink pb-4">
        <Label>{CONTRACT_TYPE[doc.contract_type] ?? "Contract"}</Label>
        <h2 className="mt-2 font-serif text-3xl leading-tight sm:text-4xl">{doc.title}</h2>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-ink/50">
          <span>{doc.employer}</span>
          <span>{doc.role}</span>
          <span>{doc.jurisdiction}</span>
        </div>
      </header>

      {doc.read_confidence === "low" && (
        <p className="mt-4 border-l-2 border-watch bg-watch/[0.07] px-4 py-3 text-sm leading-relaxed text-ink/80">
          <strong className="font-semibold">This PDF was hard to read.</strong>{" "}
          It may be a low-quality scan or a photograph. Check every quoted clause
          against the document itself before you rely on anything here.
        </p>
      )}

      {/* Verdict strip — the at-a-glance, on both pages */}
      <section className="mt-6 grid border border-rule sm:grid-cols-3">
        <StatCell label="Verdict">
          <span className={rec.tone}>{rec.label}</span>
        </StatCell>
        <StatCell label="Terms fairness" sub="How these terms sit against ordinary practice.">
          {report.overall?.fairness_score}
          <span className="text-base text-ink/40">/100</span>
        </StatCell>
        <StatCell label="Your fit" sub={`${report.fit?.verdict ?? ""} match for this role`}>
          <span className={FIT_VERDICT[report.fit?.verdict] ?? ""}>{report.fit?.score}</span>
          <span className="text-base text-ink/40">/100</span>
        </StatCell>
      </section>

      {/* Page switcher */}
      <nav className="no-print mt-8 flex gap-6 border-b border-rule">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setPage(key)}
            className={`-mb-px border-b-2 pb-2 ${micro} ${
              page === key
                ? "border-redline text-redline"
                : "border-transparent text-ink/45 hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      {/* Both pages stay mounted so print gets the whole report; the screen
          shows one at a time, print shows both under their own headings. */}
      <div className={`mt-8 ${page === "summary" ? "" : "hidden"} print:block`}>
        <SummaryPage report={report} onGoToAsks={() => setPage("asks")} />
      </div>
      <div className={`mt-8 ${page === "asks" ? "" : "hidden"} print:mt-12 print:block`}>
        <AsksPage
          report={report}
          onCopyText={onCopyText}
          onShowSource={onShowSource}
          onShowProfile={onShowProfile}
        />
      </div>

      <footer className="mt-12 border-t border-rule pt-4">
        <p className="font-mono text-[0.625rem] leading-relaxed tracking-[0.08em] text-ink/40">
          Redline is an information tool, not a solicitor, and this report is not
          legal advice. Every quoted clause should be checked against the
          document itself before you act on it.
        </p>
      </footer>
    </div>
  );
}
