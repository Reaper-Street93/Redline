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
      export { SAMPLE_REPORT } from "./src/sampleReport.js";
    `,
    resolveDir: new URL(".", import.meta.url).pathname,
    loader: "jsx",
  },
  bundle: true, format: "esm", outfile: out,
  external: ["react", "react-dom", "react-dom/server"],
  loader: { ".js": "jsx", ".jsx": "jsx" }, jsx: "automatic",
  logLevel: "error",
});
const { UploadScreen, ReportView, CompareView, HistorySheet, SAMPLE_REPORT } = await import(out);

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
