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
export function Clause({ text }) {
  if (!text || text === "not in the contract") {
    return (
      <p className="font-mono text-xs text-ink/40">
        Not in the contract — this ask adds something that isn&apos;t there.
      </p>
    );
  }
  return (
    <blockquote className="clause text-[0.9rem] leading-relaxed text-ink/70">
      {text}
    </blockquote>
  );
}
