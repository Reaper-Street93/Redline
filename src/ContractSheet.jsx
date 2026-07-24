import { useEffect, useRef } from "react";
import { SAMPLE_CONTRACT } from "./sampleContract.js";
import { micro } from "./ui.jsx";

// The document the example report was read from, so the demo can be checked
// rather than believed. Open it from any quoted clause and it scrolls to that
// clause and marks it — the same red margin rule the report uses, so the link
// between the two is visual and needs no explaining.
export default function ContractSheet({ highlight = [], onClose }) {
  const firstHitRef = useRef(null);

  useEffect(() => {
    firstHitRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [highlight]);

  let seenFirstHit = false;

  return (
    <div className="no-print fixed inset-0 z-40 flex justify-end">
      <div
        className="absolute inset-0 bg-ink/25 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <aside className="relative flex h-full w-full max-w-2xl flex-col overflow-y-auto border-l border-rule bg-stock">
        <header className="sticky top-0 z-10 flex items-baseline justify-between border-b border-rule bg-stock px-7 py-4">
          <div>
            <h2 className="font-serif text-2xl">The example contract</h2>
            <p className="mt-1 text-xs leading-relaxed text-ink/50">
              {highlight.length
                ? `Clause ${highlight.join(" and ")} — the words the report quoted.`
                : "Every quote in the example report is somewhere in here, word for word."}
            </p>
          </div>
          <button onClick={onClose} className={`${micro} text-ink/45 hover:text-redline`}>
            close
          </button>
        </header>

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
      </aside>
    </div>
  );
}
