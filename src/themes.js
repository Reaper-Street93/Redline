// A contract arrives as a flat list of terms, but nobody thinks about a job
// offer that way. They think: what do I get paid, what's my time like, what
// happens if I leave, what am I signing up to. The summary page groups the
// terms the way someone would actually ask about them.
//
// The model tags each term with a theme (see schemas.js). This file owns what
// those themes are called and the order they read in, plus a keyword fallback
// for reports saved before the field existed — an old report should still group
// sensibly rather than dumping everything into "other".

export const THEMES = [
  {
    key: "pay",
    heading: "The money",
    blurb: "What you're paid, and what you might not be.",
  },
  {
    key: "time",
    heading: "Your time",
    blurb: "Hours, holiday, and how long you're on trial.",
  },
  {
    key: "leaving",
    heading: "Leaving, and afterwards",
    blurb: "Notice, and what you can and can't do next.",
  },
  {
    key: "working",
    heading: "The work itself",
    blurb: "Where you work, what you own, what you keep quiet.",
  },
  {
    key: "other",
    heading: "Everything else",
    blurb: "Terms that don't fall neatly under the rest.",
  },
];

export const THEME_KEYS = THEMES.map((t) => t.key);

// Keyword → theme, only consulted when a term has no theme of its own. First
// match wins, so the lists are ordered from most to least specific.
const FALLBACK = [
  ["pay", /salary|\bpay\b|wage|bonus|pension|commission|remunerat|sick pay|overtime pay/i],
  ["time", /hour|holiday|annual leave|vacation|probation|working time|rota|\bleave\b/i],
  ["leaving", /notice|terminat|covenant|non-?compete|garden|redundan|restrictive|resign/i],
  ["working", /place of work|location|remote|hybrid|on-?call|intellectual|\bip\b|confidential|dut(y|ies)|equipment/i],
];

export function themeOf(term) {
  if (term?.theme && THEME_KEYS.includes(term.theme)) return term.theme;
  const label = term?.label ?? "";
  for (const [key, pattern] of FALLBACK) {
    if (pattern.test(label)) return key;
  }
  return "other";
}

// Terms bucketed by theme, in THEMES order, dropping empty groups. Each term
// keeps its original index so the evidence page and the summary page can point
// at the same row.
export function groupByTheme(terms = []) {
  const buckets = new Map(THEME_KEYS.map((key) => [key, []]));
  terms.forEach((term, index) => {
    buckets.get(themeOf(term)).push({ ...term, index });
  });
  return THEMES.map((theme) => ({ ...theme, terms: buckets.get(theme.key) })).filter(
    (group) => group.terms.length > 0
  );
}

// An assessment worth acting on. The summary page counts these per theme so a
// reader can see at a glance where the room to improve is.
export const isImprovable = (assessment) =>
  assessment === "watch" || assessment === "red_flag";
