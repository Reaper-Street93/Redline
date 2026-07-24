import { useEffect, useRef } from "react";
import { SAMPLE_CONTRACT } from "./sampleContract.js";
import { SAMPLE_PROFILE, PROFILE_ITEMS } from "./sampleProfile.js";
import { Label, micro } from "./ui.jsx";

// The two documents the example report was written from, so the demo can be
// checked rather than believed. The contract backs every quoted clause; the
// candidate backs every claim the report makes about the person. Open either
// from the report and it scrolls to the exact clause or the exact achievement,
// marked with the same red rule the report uses.
export default function SourceSheet({
  tab = "contract",
  contractHighlight = [],
  profileHighlight = [],
  emptyNote,
  onTab,
  onClose,
}) {
  const firstHitRef = useRef(null);

  useEffect(() => {
    firstHitRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [tab, contractHighlight, profileHighlight]);

  let seenFirstHit = false;
  const highlight = contractHighlight;

  return (
    <div className="no-print fixed inset-0 z-40 flex justify-end">
      <div
        className="absolute inset-0 bg-ink/25 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <aside className="relative flex h-full w-full max-w-2xl flex-col overflow-y-auto border-l border-rule bg-stock">
        <header className="sticky top-0 z-10 flex items-baseline justify-between border-b border-rule bg-stock px-7 py-4">
          <div>
            <h2 className="font-serif text-2xl">What the example was read from</h2>
            <p className="mt-1 text-xs leading-relaxed text-ink/50">
              {tab === "contract"
                ? highlight.length
                  ? `Clause ${highlight.join(" and ")} — the words the report quoted.`
                  : "Every quote in the example report is somewhere in here, word for word."
                : profileHighlight.length
                  ? "Marked below — what the report is pointing at."
                  : "The person the example report was written for."}
            </p>
          </div>
          <button onClick={onClose} className={`${micro} text-ink/45 hover:text-redline`}>
            close
          </button>
        </header>

        <nav className="sticky top-[73px] z-10 flex gap-6 border-b border-rule bg-stock px-7 py-2.5">
          {[
            ["contract", "The contract"],
            ["candidate", "The candidate"],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => onTab(key)}
              className={`${micro} border-b-2 pb-1 ${
                tab === key
                  ? "border-redline text-redline"
                  : "border-transparent text-ink/45 hover:text-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>

        {tab === "contract" && (
        <article className="px-7 py-7">
          <h3 className="text-center font-serif text-xl uppercase tracking-wide">
            {SAMPLE_CONTRACT.title}
          </h3>
          <div className="mx-auto mt-5 max-w-prose">
            {SAMPLE_CONTRACT.parties.map((party) => (
              <p key={party} className="mb-2 font-serif text-sm leading-relaxed text-ink/70">
                {party}
              </p>
            ))}
          </div>

          {SAMPLE_CONTRACT.sections.map((section) => (
            <section key={section.number} className="mt-7">
              <h4 className={`${micro} text-ink/60`}>
                {section.number}. {section.heading}
              </h4>
              <div className="mt-2.5 grid gap-2.5">
                {section.clauses.map((clause) => {
                  const hit = highlight.includes(clause.number);
                  // Only the first match gets the scroll target, so a quote
                  // spanning two clauses lands on the top of the pair.
                  const isFirstHit = hit && !seenFirstHit;
                  if (isFirstHit) seenFirstHit = true;

                  return (
                    <div
                      key={clause.number}
                      ref={isFirstHit ? firstHitRef : null}
                      className={`grid grid-cols-[46px_1fr] gap-2 py-1 transition-colors ${
                        hit
                          ? "border-l-2 border-redline bg-redline/[0.06] pl-2"
                          : "pl-[10px]"
                      }`}
                    >
                      <span
                        className={`font-mono text-xs ${
                          hit ? "text-redline" : "text-ink/35"
                        }`}
                      >
                        {clause.number}
                      </span>
                      <p className="font-serif text-[0.95rem] leading-relaxed">
                        {clause.text}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}

          <p className="mt-10 border-t border-rule pt-4 text-xs leading-relaxed text-ink/45">
            A fictional contract written for the demo. Northbank Software Limited
            does not exist, and no real employer&apos;s terms are reproduced here.
          </p>
        </article>
        )}

        {tab === "candidate" && (
        <article className="px-7 py-7">
          {emptyNote && (
            <p className="mb-6 border-l-2 border-watch bg-watch/[0.07] px-4 py-3 text-sm leading-relaxed">
              {emptyNote}
            </p>
          )}

          <h3 className="font-serif text-2xl">{SAMPLE_PROFILE.current_role}</h3>
          <p className="mt-1 text-sm text-ink/55">
            {SAMPLE_PROFILE.years_experience} years&apos; experience · on{" "}
            {SAMPLE_PROFILE.current_salary}, aiming for {SAMPLE_PROFILE.target_salary}
          </p>

          {[
            ["Achievements", "achievement"],
            ["Skills", "skill"],
            ["Won't sign without", "must"],
          ].map(([heading, prefix]) => {
            const items = PROFILE_ITEMS.filter((i) => i.key.startsWith(prefix));
            if (!items.length) return null;
            return (
              <section key={heading} className="mt-6">
                <Label>{heading}</Label>
                <div className="mt-2 grid gap-1.5">
                  {items.map((item) => {
                    const hit = profileHighlight.includes(item.key);
                    const isFirstHit = hit && !seenFirstHit;
                    if (isFirstHit) seenFirstHit = true;
                    return (
                      <p
                        key={item.key}
                        ref={isFirstHit ? firstHitRef : null}
                        className={`py-1 font-serif text-[0.95rem] leading-relaxed transition-colors ${
                          hit
                            ? "border-l-2 border-redline bg-redline/[0.06] pl-2.5"
                            : "border-l-2 border-transparent pl-2.5"
                        }`}
                      >
                        {item.text}
                      </p>
                    );
                  })}
                </div>
              </section>
            );
          })}

          <section className="mt-6">
            <Label>In their own words</Label>
            <p className="mt-2 font-serif text-[0.95rem] leading-relaxed text-ink/75">
              {SAMPLE_PROFILE.notes}
            </p>
          </section>

          <p className="mt-10 border-t border-rule pt-4 text-xs leading-relaxed text-ink/45">
            A fictional candidate written for the demo — not a real person, and
            not you. Your own profile lives only in your browser and is never
            shown here.
          </p>
        </article>
        )}
      </aside>
    </div>
  );
}
