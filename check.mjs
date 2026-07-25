// A smoke test with no test framework and no new dependencies: bundle the real
// components with the esbuild that Vite already ships, render them to static
// HTML, and assert on what comes out.
//
// This exists because `npm run build` is not a correctness check. It happily
// built a CompareView that referenced an identifier it never imported — a page
// that would have thrown the moment anyone compared two contracts. This caught
// it in a second.
//
// Run with `npm run check`.
import { build } from "esbuild";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import fs from "node:fs";

const out = new URL("./.check-bundle.mjs", import.meta.url).pathname;
await build({
  stdin: {
    contents: `
      export { default as UploadScreen } from "./src/UploadScreen.jsx";
      export { default as ReportView } from "./src/ReportView.jsx";
      export { default as CompareView } from "./src/CompareView.jsx";
      export { default as HistorySheet } from "./src/HistorySheet.jsx";
      export { default as SourceSheet } from "./src/SourceSheet.jsx";
      export { SAMPLE_REPORT } from "./src/sampleReport.js";
      export { findClauses, SAMPLE_CLAUSES } from "./src/sampleContract.js";
      export { findProfileItems, PROFILE_ITEMS, SAMPLE_PROFILE } from "./src/sampleProfile.js";
      export { groupByTheme, isImprovable, themeOf } from "./src/themes.js";
    `,
    resolveDir: new URL(".", import.meta.url).pathname,
    loader: "jsx",
  },
  bundle: true, format: "esm", outfile: out,
  external: ["react", "react-dom", "react-dom/server"],
  loader: { ".js": "jsx", ".jsx": "jsx" }, jsx: "automatic",
  logLevel: "error",
});
const {
  UploadScreen, ReportView, CompareView, HistorySheet, SourceSheet,
  SAMPLE_REPORT, findClauses, SAMPLE_CLAUSES,
  findProfileItems, PROFILE_ITEMS, SAMPLE_PROFILE,
  groupByTheme, isImprovable, themeOf,
} = await import(out);

const results = [];
const check = (name, cond, detail = "") => results.push([cond ? "PASS" : "FAIL", name, detail]);

// ── UploadScreen: prop wiring ──────────────────────────────────────────────
let picked = null, analysed = false, profileOpened = false, exampleShown = false;
const upload = (props) => renderToStaticMarkup(React.createElement(UploadScreen, {
  file: null, error: null, status: { mock: true, ready: true }, hasProfile: false,
  onPickFile: (f) => (picked = f), onAnalyse: () => (analysed = true),
  onOpenProfile: () => (profileOpened = true), onShowExample: () => (exampleShown = true),
  ...props,
}));

let html = upload({});
check("upload: hero renders", html.includes("Read the contract"));
check("upload: empty dropzone copy", html.includes("Drop your contract here"));
check("upload: analyse disabled with no file", /<button[^>]*\sdisabled=""/.test(html));
check("upload: nudges for a profile", html.includes("Add your profile"));

html = upload({ file: { name: "northbank.pdf", size: 37618 } });
check("upload: shows picked filename", html.includes("northbank.pdf"));
check("upload: shows KB not 0.0 MB", html.includes("37 KB"), html.match(/\d+ [KM]B[^<]*/)?.[0] ?? "");
check("upload: analyse enabled with a file", !/<button[^>]*\sdisabled=""/.test(html));

html = upload({ error: "That file is empty." });
check("upload: renders an error", html.includes("That file is empty."));
html = upload({ status: { mock: false, ready: false } });
check("upload: warns when no API key", html.includes("GEMINI_API_KEY"));
html = upload({ hasProfile: true });
check("upload: profile nudge gone once set", !html.includes("it uses your own track record"));

// ── ReportView ─────────────────────────────────────────────────────────────
const report = renderToStaticMarkup(React.createElement(ReportView, { report: SAMPLE_REPORT, onCopyText: () => {} }));
check("report: verdict from shared vocab", report.includes("Negotiate, then sign"));
check("report: redlined treatment applied", report.includes('class="redlined'));
check("report: renamed gaps heading", report.includes("Where you"));
check("report: don't-ask ask is muted", report.includes("opacity-55"));
check("report: acas route on high flag", report.includes("acas.org.uk"));
check("report: no stale .clause class", !/class="clause[ "]/.test(report));

// old reports (pre-rename) must still render their gaps
const legacy = structuredClone(SAMPLE_REPORT);
legacy.fit.gaps = legacy.fit.experience_gaps; delete legacy.fit.experience_gaps;
const legacyHtml = renderToStaticMarkup(React.createElement(ReportView, { report: legacy, onCopyText: () => {} }));
check("report: legacy `gaps` still renders", legacyHtml.includes("SaaS billing platform"));

// unknown enum values must not crash or print undefined
const weird = structuredClone(SAMPLE_REPORT);
weird.overall.recommendation = "something_new";
weird.key_terms[0].assessment = "bizarre";
weird.flags[0].severity = "catastrophic";
weird.asks[0].priority = "urgent";
const weirdHtml = renderToStaticMarkup(React.createElement(ReportView, { report: weird, onCopyText: () => {} }));
const leaks = weirdHtml.match(/(?:class="[^"]*undefined|>\s*undefined\s*<)/g);
check("report: survives unknown enums", !leaks, leaks ? leaks.join(" ") : "");

// ── Two-page report ────────────────────────────────────────────────────────
const summaryOnly = renderToStaticMarkup(React.createElement(ReportView, { report: SAMPLE_REPORT, onCopyText(){} }));
check("report: summary page groups terms by theme", summaryOnly.includes("The money") && summaryOnly.includes("Leaving, and afterwards"));
check("report: summary marks what can be improved", summaryOnly.includes("to improve"));
check("report: bridges to the asks page", summaryOnly.includes("What to ask for"));
// both pages are in the DOM (print gets the whole thing) even though one is hidden on screen
check("report: asks page present for print", summaryOnly.includes("Say it like this") || summaryOnly.includes("points, ranked"));
check("report: full terms table on the evidence page", summaryOnly.includes("The terms, in full"));

// grouping: every themed term lands in a real group, order follows THEMES
const grouped = groupByTheme(SAMPLE_REPORT.key_terms);
const regrouped = grouped.reduce((n, g) => n + g.terms.length, 0);
check("themes: every term is grouped exactly once", regrouped === SAMPLE_REPORT.key_terms.length, `${regrouped} of ${SAMPLE_REPORT.key_terms.length}`);
check("themes: no empty groups rendered", grouped.every((g) => g.terms.length > 0));
// the fallback classifier must still place an un-themed term
check("themes: fallback places an un-themed term", themeOf({ label: "Notice period" }) === "leaving", themeOf({ label: "Notice period" }));

// ── The example contract must actually back the example report ─────────────
// This is the app's central promise made checkable, so it is worth asserting:
// every clause the example report quotes has to exist, word for word, in the
// example contract. If someone edits one and not the other, this fails.
const quoted = [
  ...SAMPLE_REPORT.key_terms.map((t) => t.verbatim),
  ...SAMPLE_REPORT.asks.map((a) => a.clause),
  ...SAMPLE_REPORT.flags.map((f) => f.clause),
].filter((q) => q && q !== "not in the contract");
const unresolved = quoted.filter((q) => findClauses(q).length === 0);
check("contract: every quote resolves to a clause", !unresolved.length,
  unresolved.length ? unresolved[0].slice(0, 60) : `${quoted.length} quotes, ${SAMPLE_CLAUSES.length} clauses`);
check("contract: a quote spanning two clauses finds both",
  findClauses(SAMPLE_REPORT.key_terms[1].verbatim).length === 2,
  findClauses(SAMPLE_REPORT.key_terms[1].verbatim).join(", "));

const sheet = renderToStaticMarkup(React.createElement(SourceSheet, { tab: "contract", contractHighlight: ["4.1"], onTab(){}, onClose(){} }));
check("contract: sheet renders the document", sheet.includes("Contract of Employment") && sheet.includes("£52,000"));
check("contract: highlighted clause is marked", sheet.includes("border-redline bg-redline"));
check("contract: says it is fictional", sheet.includes("does not exist"));

// The source link must appear only when a source exists — a report from a real
// upload has no document to open, because the PDF is never kept.
const withSource = renderToStaticMarkup(React.createElement(ReportView, { report: SAMPLE_REPORT, onCopyText(){}, onShowSource(){} }));
const withoutSource = renderToStaticMarkup(React.createElement(ReportView, { report: SAMPLE_REPORT, onCopyText(){} }));
check("report: offers the source link for the example", withSource.includes("see it in the contract"));
check("report: no source link without a source", !withoutSource.includes("see it in the contract"));

// ── The example candidate must back what the report claims about them ──────
// Same promise as the contract, applied to the person: the fit section makes
// claims about six years, Zendesk and a measured result, and every one has to
// trace to something in the profile.
const unbackedMatches = SAMPLE_REPORT.fit.matches.filter((m) => findProfileItems(m).length === 0);
check("candidate: every fit match traces to the profile", !unbackedMatches.length,
  unbackedMatches[0]?.slice(0, 60) ?? `${SAMPLE_REPORT.fit.matches.length} matches`);

// The two stated gaps must actually be gaps — the profile must NOT contain them.
const profileText = JSON.stringify(SAMPLE_PROFILE).toLowerCase();
check("candidate: the billing gap is a real gap", !profileText.includes("billing"));
check("candidate: the team-lead gap is a real gap", !/\bteam[- ]lead\b(?!.*never)/.test(SAMPLE_PROFILE.current_role.toLowerCase()));

// Leverage that cites the profile must resolve; leverage that rests on general
// practice must resolve to nothing, because that distinction is the point.
check("candidate: leverage citing a result finds it",
  findProfileItems(SAMPLE_REPORT.asks[0].leverage).some((k) => k.startsWith("achievement")));
check("candidate: leverage citing a must-have finds it",
  findProfileItems(SAMPLE_REPORT.asks[3].leverage).some((k) => k.startsWith("must")));
check("candidate: general-practice leverage cites nothing",
  findProfileItems(SAMPLE_REPORT.asks[1].leverage).length === 0,
  findProfileItems(SAMPLE_REPORT.asks[1].leverage).join(", "));

const candidate = renderToStaticMarkup(React.createElement(SourceSheet, {
  tab: "candidate", profileHighlight: ["achievement-0"], onTab(){}, onClose(){},
}));
check("candidate: sheet renders the profile", candidate.includes("14h to 3h") && candidate.includes("£58,000"));
check("candidate: highlighted item is marked", candidate.includes("border-redline bg-redline"));
check("candidate: says it is fictional and not the user", candidate.includes("not you"));

const withProfile = renderToStaticMarkup(React.createElement(ReportView, { report: SAMPLE_REPORT, onCopyText(){}, onShowProfile(){} }));
check("report: offers the leverage backing link", withProfile.includes("what backs this up"));
check("report: no leverage link without a source", !withoutSource.includes("what backs this up"));

// ── CompareView ────────────────────────────────────────────────────────────
const a = { id: 1, at: new Date().toISOString(), report: SAMPLE_REPORT };
const b = structuredClone(a); b.id = 2; b.report.document.employer = "Southgate Digital Ltd";
b.report.overall.fairness_score = 71;
const cmp = renderToStaticMarkup(React.createElement(CompareView, { pair: [a, b], onClose: () => {} }));
check("compare: both employers present", cmp.includes("Northbank") && cmp.includes("Southgate"));
check("compare: term-by-term rows", cmp.includes("Term by term"));

// ── HistorySheet ───────────────────────────────────────────────────────────
const hist = renderToStaticMarkup(React.createElement(HistorySheet, {
  history: [a], compareBase: null, onOpen(){}, onCompareClick(){}, onDelete(){}, onClearAll(){}, onClose(){},
}));
check("history: uses the short verdict wording", hist.includes("negotiate first"));

for (const [state, name, detail] of results) console.log(`  ${state}  ${name}${detail ? "  — " + detail : ""}`);
const failed = results.filter(r => r[0] === "FAIL").length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
