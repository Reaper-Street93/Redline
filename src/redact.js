// The analysis needs to know what you have done, not how to contact you. A CV
// import drags email addresses, phone numbers and a home address along with
// the useful parts, so they get stripped on the way out.
//
// This deliberately does not claim to remove names. Doing that properly needs
// entity recognition, and a redactor that half-works is worse than one whose
// limits are written down: it invites you to trust it with more than it can
// carry. What it does remove, it removes reliably.

const PATTERNS = [
  [/\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g, "[email removed]"],
  // UK landline/mobile in the usual written forms, plus +44.
  // Ending on a digit stops the match swallowing the space after the number.
  [/(?:\+44\s?\d[\d\s-]{7,11}\d|\b0\d{2,4}[\s-]?\d{3}[\s-]?\d{3,4}\b)/g, "[phone removed]"],
  [/\b[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}\b/gi, "[postcode removed]"],
  // National Insurance number.
  [/\b[A-CEGHJ-PR-TW-Z]{2}\s?\d{2}\s?\d{2}\s?\d{2}\s?[A-D]\b/gi, "[NI number removed]"],
  // Anything long enough to be a card or account number.
  [/\b\d[\d\s-]{12,}\d\b/g, "[number removed]"],
  [/\bhttps?:\/\/\S+/gi, "[link removed]"],
];

function scrubText(value) {
  if (typeof value !== "string") return value;
  return PATTERNS.reduce(
    (text, [pattern, replacement]) => text.replace(pattern, replacement),
    value
  );
}

// Walks the profile's strings and arrays of strings, leaving numbers alone —
// years_experience is a number and has nothing to hide.
export function redactProfile(profile) {
  if (!profile) return profile;
  return Object.fromEntries(
    Object.entries(profile).map(([key, value]) => [
      key,
      Array.isArray(value) ? value.map(scrubText) : scrubText(value),
    ])
  );
}

// True when redaction would actually change something — lets the UI say so
// instead of claiming a scrub that did nothing.
export const wouldRedact = (profile) =>
  JSON.stringify(redactProfile(profile)) !== JSON.stringify(profile);
