// A page of terms with one clause struck out — the mark is the product:
// you don't sign what's in front of you, you send it back changed.
export function LogoMark({ className = "h-7 w-7" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <rect
        x="3.75"
        y="2.75"
        width="16.5"
        height="18.5"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      {/* The clauses. */}
      <path
        d="M7 7.5h10M7 11h10M7 14.5h10M7 18h6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="square"
        opacity="0.35"
      />
      {/* The redline: one clause struck through, running past the margin. */}
      <path
        d="M5 11h14"
        stroke="var(--color-redline)"
        strokeWidth="2"
        strokeLinecap="square"
      />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="font-mono text-[0.95rem] font-medium uppercase tracking-[0.32em]">
      Red<span className="text-redline">line</span>
    </span>
  );
}
