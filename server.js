import zlib from "node:zlib";
import { readFileSync } from "node:fs";
import express from "express";
import { GoogleGenAI } from "@google/genai";
import {
  MAX_PDF_BYTES,
  MAX_PDF_PAGES,
  MAX_BODY,
  MAX_TURNS,
  MAX_QUESTION_CHARS,
} from "./limits.js";
import { REPORT_SCHEMA, PROFILE_SCHEMA } from "./schemas.js";
import { analysePrompt, cvPrompt, chatPrompt } from "./prompts.js";
import { SAMPLE_REPORT } from "./src/sampleReport.js";
import { securityHeaders, inlineScriptHashes } from "./headers.js";

const app = express();
// Don't advertise the stack — one less thing for a scanner to fingerprint.
app.disable("x-powered-by");
// Vercel sits in front as a proxy — without this, every request shares one IP
// and the rate limiter would punish everyone for one heavy user.
app.set("trust proxy", 1);

// ── Security headers ─────────────────────────────────────────────────────────
// Set on every response, before anything else runs. What they are and why
// lives in headers.js, shared with vercel.json.
//
// The inline-script hash is read from the built index.html at startup rather
// than hard-coded, so it can never drift out of sync with what ships.
function builtScriptHashes() {
  try {
    return inlineScriptHashes(readFileSync(`${import.meta.dirname}/dist/index.html`, "utf8"));
  } catch {
    // No build yet (e.g. `npm start` before `npm run build`) — the CSP still
    // stands, it just won't allow the theme snippet until dist exists.
    return "";
  }
}

const SECURITY_HEADERS = securityHeaders(builtScriptHashes());

app.use((_req, res, next) => {
  res.set(SECURITY_HEADERS);
  next();
});

app.use(express.json({ limit: MAX_BODY }));

// In production the same server hosts the built React app from dist/
app.use(express.static(`${import.meta.dirname}/dist`));

// Reads GEMINI_API_KEY from the environment — the key never reaches the browser.
// Free key, no card needed: https://aistudio.google.com/apikey
const HAS_KEY = (process.env.GEMINI_API_KEY ?? "").length > 20;
const ai = HAS_KEY ? new GoogleGenAI({}) : null;

const MOCK_AI = process.env.MOCK_AI === "1";

// ── Model plumbing ──────────────────────────────────────────────────────────

// Overloaded or rate-limited — the two upstream states worth retrying elsewhere.
const isBusy = (err) => err?.status === 503 || err?.status === 429;

// Log a fixed shape — status and a trimmed message — never the whole error
// object. An upstream error can carry echoes of the request it failed on, and
// document contents must never reach a log. Personal data stays out of stdout.
const logUpstream = (where, err) =>
  console.error(`${where} failed:`, err?.status ?? "?", (err?.message ?? "").slice(0, 300));

// Free-tier capacity comes and goes per model — walk down this list until one
// answers. Best model first. All of these can read a PDF directly.
const MODELS = [
  "gemini-3.5-flash",
  "gemini-3-flash-preview",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
];

async function callModel({ prompt, pdf, schema }) {
  const parts = [];
  if (pdf) parts.push({ inlineData: { mimeType: "application/pdf", data: pdf } });
  parts.push({ text: prompt });

  let lastErr;
  for (const model of MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: [{ role: "user", parts }],
        config: {
          responseMimeType: "application/json",
          responseJsonSchema: schema,
        },
      });
      return JSON.parse(response.text);
    } catch (err) {
      lastErr = err;
      if (isBusy(err)) {
        console.warn(`${model} unavailable (${err.status}), trying next model`);
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

// Schemas can't enforce numeric ranges or rank order — tidy both.
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, Math.round(Number(n) || 0)));

// A schema can ask for priority and impact to agree, but it can't enforce it,
// and the model does drift — a 4-out-of-5 impact labelled "nice to have" tells
// the reader to skip the ask that would change their year. So the invariant is
// applied here instead of merely requested.
function alignPriority(ask) {
  if (ask.impact >= 5) return "must";
  if (ask.impact === 4 && ask.priority === "nice") return "should";
  if (ask.impact <= 2 && ask.priority !== "nice") return "nice";
  return ask.priority;
}

function finishReport(report) {
  report.asks ??= [];
  report.asks.sort((a, b) => a.rank - b.rank);
  report.asks.forEach((ask, i) => {
    ask.rank = i + 1;
    ask.likelihood = clamp(ask.likelihood, 0, 100);
    ask.impact = clamp(ask.impact, 1, 5);
    ask.priority = alignPriority(ask);
  });
  if (report.fit) report.fit.score = clamp(report.fit.score, 0, 100);
  if (report.overall) {
    report.overall.fairness_score = clamp(report.overall.fairness_score, 0, 100);
  }
  return report;
}

// ── Rate limiting ───────────────────────────────────────────────────────────
// The Gemini key is a free-tier key with a daily quota — a public endpoint with
// no brakes would let one visitor burn the whole allowance. Sliding window per
// IP per bucket, plus a global daily ceiling as the backstop. Reading a whole
// contract is far heavier than answering one question about it, so the two get
// separate allowances rather than competing for one.

const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_DAY_GLOBAL = 220;

const BUCKETS = {
  analyse: 5, // whole-document reads, per IP per window
  chat: 30, // follow-up questions, per IP per window
};

const hitsByIp = new Map(); // "bucket:ip" -> timestamps
let dailyCount = 0;
let dailyCountDate = new Date().toDateString();

function rateLimited(bucket, ip) {
  const now = Date.now();

  const today = new Date().toDateString();
  if (today !== dailyCountDate) {
    dailyCountDate = today;
    dailyCount = 0;
  }
  if (dailyCount >= MAX_PER_DAY_GLOBAL) return "day";

  const key = `${bucket}:${ip}`;
  const recent = (hitsByIp.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= BUCKETS[bucket]) {
    hitsByIp.set(key, recent);
    return "window";
  }

  recent.push(now);
  hitsByIp.set(key, recent);
  dailyCount += 1;

  // Don't let the map grow forever on a long-running server.
  if (hitsByIp.size > 5000) {
    for (const [k, times] of hitsByIp) {
      if (times.every((t) => now - t >= WINDOW_MS)) hitsByIp.delete(k);
    }
  }
  return null;
}

// ── Request validation ──────────────────────────────────────────────────────

// A PDF always starts with "%PDF-" — base64 of those bytes always starts JVBER.
// Cheap way to refuse a renamed .docx before spending a model call on it.
const looksLikePdf = (b64) => b64.startsWith("JVBER");

// Every page in a PDF is one "/Type /Page" object, so counting them needs no
// PDF library. The catch: since PDF 1.5 those objects are often packed into
// Flate-compressed object streams, where a regex over the raw bytes finds
// nothing at all — and a page cap whose failure mode is "allow" is worse than
// no cap, because it reads as protection that isn't there. A 60-page contract
// is only ~80 KB, so the byte cap never catches book-length documents; this is
// the check that has to work.
const PAGE_OBJECT = /\/Type\s*\/Page[^s]/g;

// Inflating a stream can expand it enormously, so the pass stops at a budget
// rather than trusting a stranger's file to be reasonable.
const INFLATE_BUDGET = 32 * 1024 * 1024;

function countPagesInCompressedStreams(buffer) {
  let found = 0;
  let spent = 0;
  let at = 0;

  while ((at = buffer.indexOf("stream", at)) !== -1) {
    // The `stream` keyword is followed by CRLF or LF, then the raw bytes.
    let start = at + "stream".length;
    if (buffer[start] === 0x0d) start += 1;
    if (buffer[start] === 0x0a) start += 1;

    const end = buffer.indexOf("endstream", start);
    if (end === -1) break;
    at = end;

    try {
      const inflated = zlib.inflateSync(buffer.subarray(start, end));
      spent += inflated.length;
      found += inflated.toString("latin1").match(PAGE_OBJECT)?.length ?? 0;
    } catch {
      // Not Flate-compressed, or damaged. Nothing to learn from this one.
    }
    if (spent > INFLATE_BUDGET) break;
  }
  return found;
}

function countPages(buffer) {
  const inTheClear = buffer.toString("latin1").match(PAGE_OBJECT)?.length ?? 0;
  // Most writers leave the page tree readable. Only pay for decompression when
  // they haven't.
  return inTheClear > 0 ? inTheClear : countPagesInCompressedStreams(buffer);
}

function validatePdf(pdf) {
  if (typeof pdf !== "string" || !pdf) return "No file was uploaded.";
  if (!looksLikePdf(pdf)) {
    return "That doesn't look like a PDF. Export the contract as a PDF and try again.";
  }
  const bytes = Buffer.from(pdf, "base64");
  if (bytes.length > MAX_PDF_BYTES) {
    return `That file is ${(bytes.length / 1024 / 1024).toFixed(1)} MB — the limit is ${
      MAX_PDF_BYTES / 1024 / 1024
    } MB.`;
  }
  const pages = countPages(bytes);
  if (pages > MAX_PDF_PAGES) {
    return `That document runs to about ${pages} pages — the limit is ${MAX_PDF_PAGES}. Redline is built for employment contracts, not book-length agreements.`;
  }
  return null;
}

// ── Routes ──────────────────────────────────────────────────────────────────

app.get("/api/health", (_req, res) => res.json({ ok: true }));

// Tells the browser what mode the server is in, so the UI can be honest about
// it rather than failing at the moment someone drops a file in.
app.get("/api/status", (_req, res) =>
  res.json({ mock: MOCK_AI, ready: MOCK_AI || HAS_KEY })
);

app.post("/api/analyze", async (req, res) => {
  const { pdf, profile } = req.body ?? {};

  const invalid = validatePdf(pdf);
  if (invalid) return res.status(400).json({ error: invalid });

  const limited = rateLimited("analyse", req.ip);
  if (limited === "window") {
    return res.status(429).json({
      error: "Too many contracts in a short burst — wait a few minutes and try again.",
    });
  }
  if (limited === "day") {
    return res.status(429).json({
      error: "Redline has hit its free-tier budget for today. Come back tomorrow.",
    });
  }

  if (MOCK_AI) {
    return res.json({
      report: {
        ...SAMPLE_REPORT,
        summary: `MOCK MODE — no API call was made. ${SAMPLE_REPORT.summary}`,
      },
    });
  }

  if (!HAS_KEY) {
    return res.status(503).json({
      error:
        "GEMINI_API_KEY is missing or still the placeholder. Grab a free one at aistudio.google.com/apikey and paste the full key into .env (local) or the Vercel project's environment variables (production).",
    });
  }

  try {
    const report = await callModel({
      prompt: analysePrompt(profile ?? null),
      pdf,
      schema: REPORT_SCHEMA,
    });
    res.json({ report: finishReport(report) });
  } catch (err) {
    logUpstream("analyze", err);
    if (isBusy(err)) {
      return res.status(503).json({
        error: "Every free-tier model is busy or rate-limited right now — wait a minute and try again.",
      });
    }
    const detail = (err?.message ?? "").slice(0, 200);
    res.status(502).json({
      error: `Reading the contract failed${detail ? `: ${detail}` : ". Try again."}`,
    });
  }
});

const MOCK_PROFILE = {
  current_role: "Senior Customer Support Engineer",
  years_experience: 6,
  skills: [
    "Zendesk administration",
    "SQL",
    "React",
    "Escalation management",
    "API troubleshooting",
    "Runbook authoring",
  ],
  achievements: [
    "Cut first-response time from 14h to 3h across a nine-person team",
    "Built the escalation runbook now used by the whole support org",
    "Reduced repeat contacts by 22% by rewriting the top 20 help articles",
  ],
  current_salary: "£46,000",
  target_salary: "£58,000",
  must_haves: ["Two days a week at home", "No weekend on-call"],
  notes: "MOCK MODE — no API call was made.",
};

app.post("/api/profile", async (req, res) => {
  const { pdf } = req.body ?? {};

  const invalid = validatePdf(pdf);
  if (invalid) return res.status(400).json({ error: invalid });

  const limited = rateLimited("analyse", req.ip);
  if (limited) {
    return res.status(429).json({
      error:
        limited === "day"
          ? "Redline has hit its free-tier budget for today. You can still fill the profile in by hand."
          : "Too many uploads in a short burst — wait a few minutes, or fill the profile in by hand.",
    });
  }

  if (MOCK_AI) return res.json({ profile: MOCK_PROFILE });

  if (!HAS_KEY) {
    return res.status(503).json({
      error: "No GEMINI_API_KEY is set on the server. Fill the profile in by hand instead.",
    });
  }

  try {
    const profile = await callModel({ prompt: cvPrompt, pdf, schema: PROFILE_SCHEMA });
    profile.years_experience = clamp(profile.years_experience, 0, 60);
    res.json({ profile });
  } catch (err) {
    logUpstream("profile", err);
    const detail = (err?.message ?? "").slice(0, 200);
    res.status(isBusy(err) ? 503 : 502).json({
      error: `Reading the CV failed${detail ? `: ${detail}` : ""}. You can fill the profile in by hand.`,
    });
  }
});

// ── Follow-up questions ─────────────────────────────────────────────────────
// Chat is grounded twice over: on the report, which is always available, and
// on the PDF itself when the browser still has it from this session. History
// entries only carry the report, so answers there are limited to the clauses
// the report already quoted — and the model is told to say so.

app.post("/api/chat", async (req, res) => {
  const { messages, report, profile, pdf } = req.body ?? {};

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "No question was asked." });
  }
  if (messages.length > MAX_TURNS) {
    return res.status(400).json({
      error: "This conversation has run long — start a fresh one to keep the answers sharp.",
    });
  }
  const last = messages.at(-1);
  if (last?.role !== "user" || !last.text?.trim()) {
    return res.status(400).json({ error: "No question was asked." });
  }
  if (last.text.length > MAX_QUESTION_CHARS) {
    return res.status(400).json({ error: "That question is too long — trim it down." });
  }
  if (!report?.document) {
    return res.status(400).json({ error: "There's no report to ask about yet." });
  }
  // A PDF is optional here, but if one is sent it still has to be a real one.
  if (pdf) {
    const invalid = validatePdf(pdf);
    if (invalid) return res.status(400).json({ error: invalid });
  }

  const limited = rateLimited("chat", req.ip);
  if (limited) {
    return res.status(429).json({
      error:
        limited === "day"
          ? "Redline has hit its free-tier budget for today. Come back tomorrow."
          : "Too many questions in a short burst — wait a couple of minutes.",
    });
  }

  if (MOCK_AI) {
    return res.json({
      reply: `MOCK MODE — no API call was made. You asked: "${last.text.trim()}". With a real key, this would be answered from ${
        pdf ? "the contract PDF itself" : "the report's quoted clauses"
      }.`,
    });
  }

  if (!HAS_KEY) {
    return res.status(503).json({
      error: "No GEMINI_API_KEY is set on the server, so there's nothing to ask.",
    });
  }

  try {
    const parts = [];
    if (pdf) parts.push({ inlineData: { mimeType: "application/pdf", data: pdf } });
    parts.push({ text: chatPrompt(report, profile ?? null, messages, Boolean(pdf)) });

    let lastErr;
    for (const model of MODELS) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: [{ role: "user", parts }],
        });
        return res.json({ reply: response.text.trim() });
      } catch (err) {
        lastErr = err;
        if (isBusy(err)) continue;
        throw err;
      }
    }
    throw lastErr;
  } catch (err) {
    logUpstream("chat", err);
    const detail = (err?.message ?? "").slice(0, 200);
    res.status(isBusy(err) ? 503 : 502).json({
      error: `Couldn't answer that${detail ? `: ${detail}` : ". Try again."}`,
    });
  }
});

// `npm start` runs this file directly and needs a port. On Vercel, api/index.js
// imports the app instead and the platform does the listening.
if (process.argv[1] === import.meta.filename) {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => console.log(`API listening on ${PORT}`));
}

export default app;
