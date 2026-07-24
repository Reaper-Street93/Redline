// The two presentation pieces that were copy-pasted between the report and the
// comparison view. Small, but a label whose tracking differs by view is exactly
// how a typographic system stops being one.

// Small-caps mono label — the typographic workhorse of the whole report.
export function Label({ children, className = "" }) {
  return (
    <div
      className={`font-mono text-[0.625rem] uppercase tracking-[0.22em] text-ink/45 ${className}`}
    >
      {children}
    </div>
  );
}

// A clause lifted from the contract, set in serif behind a redline. The
// "not in the contract" case is a real answer, not a missing value, so it says
// so rather than rendering an empty quote.
//
// `onFind` is passed only when the source document is available to look at —
// the example report has one, a report from your own upload does not, because
// Redline never keeps the PDF.
export function Clause({ text, onFind }) {
  if (!text || text === "not in the contract") {
    return (
      <p className="font-mono text-xs text-ink/40">
        Not in the contract — this ask adds something that isn&apos;t there.
      </p>
    );
  }
  return (
    <blockquote className="redlined text-[0.9rem] leading-relaxed text-ink/70">
      {text}
      {onFind && (
        <button
          onClick={() => onFind(text)}
          className={`no-print mt-1.5 block ${micro} text-ink/40 underline-offset-4 hover:text-redline hover:underline`}
        >
          see it in the contract →
        </button>
      )}
    </blockquote>
  );
}

// The smallest type in the system: mono, uppercase, wide-tracked. It appeared as
// a literal thirty-eight times, in five slightly different trackings that nobody
// chose on purpose. One token means one decision.
export const micro = "font-mono text-[0.625rem] uppercase tracking-[0.18em]";

// The same type as a quiet control: grey until you reach for it.
export const microLink = `${micro} text-ink/50 hover:text-redline`;
