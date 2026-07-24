// The four things someone genuinely needs to know before dropping an
// employment contract into a website. Shown as a gate the first time, and
// readable any time afterwards from the footer.
const POINTS = [
  {
    title: "This is not legal advice",
    body: "Redline reads a document and tells you what it says, what is unusual about it, and what is worth asking for. It is not a solicitor, it does not know your circumstances, and it will not tell you whether a term is lawful or would hold up. For that, talk to a person.",
  },
  {
    title: "Your contract is sent to Google to be read",
    body: "The PDF goes to Google's Gemini API, which is what does the reading. That is a third party processing a document about you and your employer. Nothing about the file is stored by Redline — it is held in memory for one request and never written to disk or logged — but it does leave this site, and you should know that before you upload rather than after. Your profile has its email addresses, phone numbers, postcodes and reference numbers stripped out before it is sent; the contract itself has to go as it is, because that is the thing being read.",
  },
  {
    title: "Everything else stays in your browser",
    body: "Your profile and your past reports live in this browser's local storage. There is no account, no database and no server-side copy. Clear them whenever you like — the button below wipes the lot, and it actually does.",
  },
  {
    title: "Check it against the document",
    body: "Every clause Redline quotes should be findable, word for word, in your PDF. If a quote doesn't match what's in front of you, trust the paper and not the machine.",
  },
];

export default function Notice({ mode, onAccept, onClose, onEraseAll }) {
  const isGate = mode === "gate";

  return (
    <div className="no-print fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]"
        onClick={isGate ? undefined : onClose}
      />
      <div className="relative max-h-[88dvh] w-full max-w-xl overflow-y-auto border border-ink bg-stock">
        <header className="border-b border-rule px-7 py-5">
          <div className="font-mono text-[0.625rem] uppercase tracking-[0.22em] text-redline">
            Before you upload
          </div>
          <h2 className="mt-2 font-serif text-2xl leading-snug">
            What Redline is, and what it isn&apos;t
          </h2>
        </header>

        <div className="grid gap-5 px-7 py-6">
          {POINTS.map((point, i) => (
            <section key={point.title}>
              <h3 className="flex gap-2.5 font-serif text-lg leading-snug">
                <span className="font-mono text-xs text-redline">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {point.title}
              </h3>
              <p className="mt-1.5 pl-8 text-sm leading-relaxed text-ink/70">
                {point.body}
              </p>
            </section>
          ))}

          <p className="border-t border-rule pt-4 text-xs leading-relaxed text-ink/50">
            Redline is a personal project, offered as-is and with no warranty.
            If a contract matters — and one that decides your pay and your
            notice period does — get a professional to look at it. Acas
            (0300 123 1100) and Citizens Advice are both free.
          </p>
        </div>

        <footer className="sticky bottom-0 flex items-center justify-between gap-4 border-t border-rule bg-stock px-7 py-4">
          {isGate ? (
            <>
              <span className="text-xs text-ink/45">
                Agreeing is remembered on this browser.
              </span>
              <button
                onClick={onAccept}
                className="shrink-0 border-2 border-ink px-5 py-2 font-mono text-xs uppercase tracking-[0.2em] hover:bg-ink hover:text-stock"
              >
                Understood
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onEraseAll}
                className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-ink/40 hover:text-redline"
              >
                erase everything
              </button>
              <button
                onClick={onClose}
                className="shrink-0 border-2 border-ink px-5 py-2 font-mono text-xs uppercase tracking-[0.2em] hover:bg-ink hover:text-stock"
              >
                Close
              </button>
            </>
          )}
        </footer>
      </div>
    </div>
  );
}
