// A report is four different shapes — terms, asks, flags, gaps — and a
// spreadsheet only does one. So the export is long format: every row carries
// the section it came from, and filtering on that column gives you back any
// of the four tables.

const COLUMNS = [
  "section",
  "item",
  "value",
  "rating",
  "likelihood",
  "impact",
  "note",
  "quoted_from_contract",
];

// Anything containing a comma, quote or newline gets quoted; internal quotes
// double up. That's the whole of RFC 4180 that matters here.
function cell(value) {
  const text = value === undefined || value === null ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

const row = (values) => COLUMNS.map((_, i) => cell(values[i])).join(",");

export function reportToCsv(report) {
  const doc = report.document ?? {};
  const rows = [COLUMNS.join(",")];

  const push = (...values) => rows.push(row(values));

  push("Document", "Title", doc.title);
  push("Document", "Employer", doc.employer);
  push("Document", "Role", doc.role);
  push("Document", "Contract type", doc.contract_type);
  push("Document", "Governing law", doc.jurisdiction);
  push("Document", "Read confidence", doc.read_confidence);
  push("Document", "Summary", report.summary);

  push(
    "Verdict",
    "Recommendation",
    report.overall?.recommendation,
    "",
    "",
    "",
    report.overall?.recommendation_reason
  );
  push("Verdict", "Fairness score", report.overall?.fairness_score);
  push("Verdict", "Fit score", report.fit?.score, report.fit?.verdict, "", "", report.fit?.rationale);

  for (const match of report.fit?.matches ?? []) push("Fit — strength", match);
  for (const gap of report.fit?.experience_gaps ?? report.fit?.gaps ?? []) push("Fit — experience gap", gap);

  for (const term of report.key_terms ?? []) {
    push("Term", term.label, term.value, term.assessment, "", "", term.note, term.verbatim);
  }

  for (const ask of report.asks ?? []) {
    push(
      "Ask",
      `${ask.rank}. ${ask.title}`,
      ask.suggested_wording,
      ask.should_ask === false ? `${ask.priority} (don't ask)` : ask.priority,
      ask.likelihood,
      ask.impact,
      `${ask.why} Leverage: ${ask.leverage}`,
      ask.clause
    );
  }

  for (const flag of report.flags ?? []) {
    push("Flag", flag.title, "", flag.severity, "", "", flag.why, flag.clause);
  }

  for (const item of report.missing ?? []) push("Missing from contract", item);

  push(
    "Disclaimer",
    "Not legal advice",
    "Redline is an information tool, not a solicitor. Check every quoted clause against the contract itself."
  );

  return rows.join("\r\n");
}

// Lower case, spaces to dashes, anything else dropped — safe on every OS.
const slug = (text) =>
  (text || "contract")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);

export function downloadCsv(report) {
  // The BOM is what stops Excel mangling £ and — on Windows.
  const blob = new Blob(["﻿" + reportToCsv(report)], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `redline-${slug(report.document?.employer)}-${
    new Date().toISOString().split("T")[0]
  }.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
