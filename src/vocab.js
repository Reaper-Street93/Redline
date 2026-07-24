// One place for every word and colour the report's enums map to. This lived in
// three components before, and they had already drifted: the same verdict read
// "Negotiate, then sign" in the report and "negotiate first" in the history
// list. Same data, two names, which makes a user wonder if they mean different
// things. Labels and tones belong to the vocabulary, not to whoever renders it.

export const RECOMMENDATION = {
  sign: { label: "Sign it", short: "sign it", tone: "text-good" },
  negotiate_then_sign: {
    label: "Negotiate, then sign",
    short: "negotiate first",
    tone: "text-watch",
  },
  push_back_hard: {
    label: "Push back hard",
    short: "push back",
    tone: "text-redline",
  },
  walk_away: { label: "Walk away", short: "walk away", tone: "text-redline" },
};

export const ASSESSMENT = {
  favourable: { label: "favourable", tone: "text-good", dot: "bg-good" },
  standard: { label: "standard", tone: "text-ink/45", dot: "bg-ink/30" },
  watch: { label: "watch", tone: "text-watch", dot: "bg-watch" },
  red_flag: { label: "red flag", tone: "text-redline", dot: "bg-redline" },
};

export const SEVERITY = {
  high: { label: "high", tone: "text-redline", bar: "bg-redline" },
  medium: { label: "medium", tone: "text-watch", bar: "bg-watch" },
  low: { label: "low", tone: "text-ink/45", bar: "bg-rule" },
};

export const PRIORITY = {
  must: "border-redline text-redline",
  should: "border-watch text-watch",
  nice: "border-rule text-ink/50",
};

export const FIT_VERDICT = {
  strong: "text-good",
  good: "text-good",
  stretch: "text-watch",
  mismatch: "text-redline",
};

export const CONTRACT_TYPE = {
  permanent: "Permanent",
  fixed_term: "Fixed term",
  contractor: "Contractor",
  zero_hours: "Zero hours",
  internship: "Internship",
  other: "Other",
};

// Reports are user data that has been through a model, so an unrecognised enum
// value is always possible. Every lookup goes through here and gets something
// renderable rather than `undefined`.
const UNKNOWN = { label: "—", short: "—", tone: "text-ink/50" };

export const recommendationOf = (key) => RECOMMENDATION[key] ?? UNKNOWN;
export const assessmentOf = (key) => ASSESSMENT[key] ?? ASSESSMENT.standard;
export const severityOf = (key) => SEVERITY[key] ?? SEVERITY.low;
export const priorityOf = (key) => PRIORITY[key] ?? PRIORITY.nice;
