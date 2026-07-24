import express from "express";
import { GoogleGenAI } from "@google/genai";
import { MAX_PDF_BYTES, MAX_PDF_PAGES, MAX_BODY } from "./limits.js";
import { SAMPLE_REPORT } from "./src/sampleReport.js";

const app = express();
// Render sits behind a proxy — without this, every request shares one IP
// and the rate limiter would punish everyone for one heavy user.
app.set("trust proxy", 1);
app.use(express.json({ limit: MAX_BODY }));

// In production the same server hosts the built React app from dist/
app.use(express.static(`${import.meta.dirname}/dist`));

// Reads GEMINI_API_KEY from the environment — the key never reaches the browser.
// Free key, no card needed: https://aistudio.google.com/apikey
const HAS_KEY = (process.env.GEMINI_API_KEY ?? "").length > 20;
const ai = HAS_KEY ? new GoogleGenAI({}) : null;

const MOCK_AI = process.env.MOCK_AI === "1";

// ── The shapes agreed in CONTRACT.md ────────────────────────────────────────
// Structured outputs make the API guarantee the response parses against these.

const REPORT_SCHEMA = {
  type: "object",
  properties: {
    document: {
      type: "object",
      properties: {
        title: { type: "string", description: "The document's own title, or one inferred from it." },
        employer: { type: "string", description: "The party offering the work. 'not stated' if absent." },
        role: { type: "string", description: "Job title exactly as written." },
        contract_type: {
          type: "string",
          enum: ["permanent", "fixed_term", "contractor", "zero_hours", "internship", "other"],
        },
        jurisdiction: {
          type: "string",
          description: "Governing law as stated, e.g. 'England & Wales'. 'not stated' if absent.",
        },
        read_confidence: {
          type: "string",
          enum: ["high", "medium", "low"],
          description: "How well you could actually read the PDF. 'low' for poor scans or photographs.",
        },
      },
      required: ["title", "employer", "role", "contract_type", "jurisdiction", "read_confidence"],
      additionalProperties: false,
    },
    summary: {
      type: "string",
      description: "2-4 sentences in plain English telling the reader what they would be signing.",
    },
    key_terms: {
      type: "array",
      description:
        "6 to 12 terms. Cover at least: pay, hours, holiday, notice, probation, place of work, termination, restrictive covenants, IP, pension, sick pay, bonus.",
      items: {
        type: "object",
        properties: {
          label: { type: "string", description: "Short, e.g. 'Notice period'." },
          value: { type: "string", description: "The answer in one line, e.g. '3 months either way'." },
          verbatim: {
            type: "string",
            description:
              "Quoted word-for-word from the contract. Never paraphrased, never invented. Use 'not in the contract' if the term is absent.",
          },
          assessment: { type: "string", enum: ["favourable", "standard", "watch", "red_flag"] },
          note: { type: "string", description: "One sentence on why it earned that assessment." },
        },
        required: ["label", "value", "verbatim", "assessment", "note"],
        additionalProperties: false,
      },
    },
    fit: {
      type: "object",
      properties: {
        score: { type: "integer", description: "0-100. How well the reader's profile matches this role." },
        verdict: { type: "string", enum: ["strong", "good", "stretch", "mismatch"] },
        rationale: { type: "string", description: "One or two sentences." },
        matches: {
          type: "array",
          description: "2-5 places the reader's experience meets or beats what the role asks for.",
          items: { type: "string" },
        },
        gaps: {
          type: "array",
          description: "0-5 places the role asks for more than the profile shows.",
          items: { type: "string" },
        },
      },
      required: ["score", "verdict", "rationale", "matches", "gaps"],
      additionalProperties: false,
    },
    overall: {
      type: "object",
      properties: {
        fairness_score: {
          type: "integer",
          description: "0-100. How these terms sit against ordinary practice for this kind of role.",
        },
        recommendation: {
          type: "string",
          enum: ["sign", "negotiate_then_sign", "push_back_hard", "walk_away"],
        },
        recommendation_reason: { type: "string", description: "Two or three sentences." },
      },
      required: ["fairness_score", "recommendation", "recommendation_reason"],
      additionalProperties: false,
    },
    asks: {
      type: "array",
      description: "3 to 7 negotiation points, ranked by what is worth spending capital on. Rank 1 first.",
      items: {
        type: "object",
        properties: {
          rank: { type: "integer", description: "1 = ask for this first." },
          title: { type: "string", description: "The ask itself, specific and numeric where possible." },
          clause: {
            type: "string",
            description:
              "The verbatim clause this ask attaches to, or exactly 'not in the contract' if it adds something absent.",
          },
          why: { type: "string", description: "Why it matters to this reader specifically." },
          leverage: {
            type: "string",
            description:
              "The thing in the reader's own history they can point at to win it. Cite something real from their profile.",
          },
          likelihood: { type: "integer", description: "0-100. Odds an employer says yes to this ask." },
          impact: { type: "integer", description: "1-5. How much the reader's working life improves if they do." },
          priority: { type: "string", enum: ["must", "should", "nice"] },
          should_ask: {
            type: "boolean",
            description:
              "False when the ask is real but not worth the goodwill it costs. Explain that in suggested_wording.",
          },
          suggested_wording: {
            type: "string",
            description: "One or two sentences, ready to send, polite and specific.",
          },
        },
        required: [
          "rank", "title", "clause", "why", "leverage",
          "likelihood", "impact", "priority", "should_ask", "suggested_wording",
        ],
        additionalProperties: false,
      },
    },
    flags: {
      type: "array",
      description: "0 to 6 unusual or onerous terms worth a closer look.",
      items: {
        type: "object",
        properties: {
          severity: { type: "string", enum: ["high", "medium", "low"] },
          title: { type: "string" },
          clause: { type: "string", description: "Verbatim from the contract." },
          why: { type: "string", description: "Plain English: what this would do to the reader." },
        },
        required: ["severity", "title", "clause", "why"],
        additionalProperties: false,
      },
    },
    missing: {
      type: "array",
      description:
        "0 to 6 terms you would expect in a contract of this type but which are not present at all.",
      items: { type: "string" },
    },
  },
  required: ["document", "summary", "key_terms", "fit", "overall", "asks", "flags", "missing"],
  additionalProperties: false,
};

const PROFILE_SCHEMA = {
  type: "object",
  properties: {
    current_role: { type: "string", description: "Their most recent job title." },
    years_experience: {
      type: "integer",
      description: "Total relevant years of experience, rounded. 0 if it cannot be worked out.",
    },
    skills: {
      type: "array",
      description: "5-12 concrete skills, tools or systems named in the CV. No soft-skill filler.",
      items: { type: "string" },
    },
    achievements: {
      type: "array",
      description:
        "3-6 achievements, quoted or tightened from the CV. Prefer ones carrying a number — those are the negotiating cards.",
      items: { type: "string" },
    },
    current_salary: { type: "string", description: "Only if the CV states it. Otherwise empty string." },
    target_salary: { type: "string", description: "Only if the CV states it. Otherwise empty string." },
    must_haves: {
      type: "array",
      description: "0-5 working conditions the CV signals they care about. Empty if it says nothing.",
      items: { type: "string" },
    },
    notes: { type: "string", description: "One or two lines the fields above don't capture. May be empty." },
  },
  required: [
    "current_role", "years_experience", "skills", "achievements",
    "current_salary", "target_salary", "must_haves", "notes",
  ],
  additionalProperties: false,
};

// ── Prompts ─────────────────────────────────────────────────────────────────

const NO_PROFILE =
  "The reader did not supply a profile. Judge fit on the role alone, say so plainly in fit.rationale, leave matches and gaps empty, and make every leverage line general rather than pretending to cite their history.";

const profileBlock = (profile) => {
  if (!profile) return NO_PROFILE;
  return `THE READER'S PROFILE — this is who is being offered the contract:
${JSON.stringify(profile, null, 2)}`;
};

const analysePrompt = (profile) => `You are a contracts analyst helping someone decide what to do about a job offer. The attached PDF is the contract. Read it and produce a report following the schema.

${profileBlock(profile)}

How to work:

- QUOTE, NEVER INVENT. Every "verbatim" and "clause" field must be lifted word-for-word from the PDF. If a term is not in the document, write exactly "not in the contract" — never reconstruct what you think it probably says.
- Read the whole document, including schedules, annexes and anything in small print. Onerous terms hide at the back.
- Assess against ordinary market practice for this kind of role in the stated jurisdiction. If no governing law is stated, assume the UK and say so.
- The "asks" are the point of this report. Rank them by what is actually worth spending negotiating capital on — impact first, then odds. A high-impact ask at 45% beats an easy win at 90% that changes nothing.
- Ground every "leverage" line in something concrete from the reader's profile. If you cannot, that ask should not be ranked first.
- "suggested_wording" must be something the reader could paste into an email today: polite, specific, no throat-clearing. When should_ask is false, use that field to explain briefly why it is better left alone.
- "missing" matters as much as what is there. A contract that never mentions on-call, or notice, or a salary review, is telling you something.

Where the line is — this matters:

- You describe what the document says and what is unusual about it. You do NOT advise on whether a term is lawful, enforceable, or how a court would rule. If something looks legally serious, put it in "flags" with high severity and let the reader take it to a professional.
- Never soften a genuinely onerous term to be encouraging, and never manufacture alarm to seem useful. Say what is there.
- If the attached PDF is not an employment or engagement contract at all, set contract_type to "other" and say so as the first sentence of the summary rather than inventing an analysis.`;

const cvPrompt = `The attached PDF is a CV. Turn it into a structured profile following the schema.

- Take skills and achievements from what the CV actually claims. Don't editorialise, don't inflate, don't invent numbers.
- Achievements carrying a measurable result are worth more than duties, because they are what the reader will point at in a negotiation. Prefer them.
- Leave salary fields as empty strings unless the CV states a figure outright.
- If the PDF is not a CV, return the schema with empty strings, empty arrays, years_experience 0, and say so in notes.`;

// ── Model plumbing ──────────────────────────────────────────────────────────

// Overloaded or rate-limited — the two upstream states worth retrying elsewhere.
const isBusy = (err) => err?.status === 503 || err?.status === 429;

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

function finishReport(report) {
  report.asks ??= [];
  report.asks.sort((a, b) => a.rank - b.rank);
  report.asks.forEach((ask, i) => {
    ask.rank = i + 1;
    ask.likelihood = clamp(ask.likelihood, 0, 100);
    ask.impact = clamp(ask.impact, 1, 5);
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
// IP, plus a global daily ceiling as the backstop. Contracts are heavier than
// a paste of text, so the window is tighter than Distil's.

const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const MAX_PER_DAY_GLOBAL = 100;

const hitsByIp = new Map();
let dailyCount = 0;
let dailyCountDate = new Date().toDateString();

function rateLimited(ip) {
  const now = Date.now();

  const today = new Date().toDateString();
  if (today !== dailyCountDate) {
    dailyCountDate = today;
    dailyCount = 0;
  }
  if (dailyCount >= MAX_PER_DAY_GLOBAL) return "day";

  const recent = (hitsByIp.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    hitsByIp.set(ip, recent);
    return "window";
  }

  recent.push(now);
  hitsByIp.set(ip, recent);
  dailyCount += 1;

  // Don't let the map grow forever on a long-running server.
  if (hitsByIp.size > 5000) {
    for (const [key, times] of hitsByIp) {
      if (times.every((t) => now - t >= WINDOW_MS)) hitsByIp.delete(key);
    }
  }
  return null;
}

// ── Request validation ──────────────────────────────────────────────────────

// A PDF always starts with "%PDF-" — base64 of those bytes always starts JVBER.
// Cheap way to refuse a renamed .docx before spending a model call on it.
const looksLikePdf = (b64) => b64.startsWith("JVBER");

// Rough page count without a PDF library: every page is one "/Type /Page"
// object. Close enough to refuse a 400-page merger agreement.
function countPages(buffer) {
  const matches = buffer.toString("latin1").match(/\/Type\s*\/Page[^s]/g);
  return matches?.length ?? 0;
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

  const limited = rateLimited(req.ip);
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
        "GEMINI_API_KEY is missing or still the placeholder. Grab a free one at aistudio.google.com/apikey and paste the full key into .env (local) or the Render dashboard (production).",
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
    console.error(err);
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

  const limited = rateLimited(req.ip);
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
    console.error(err);
    const detail = (err?.message ?? "").slice(0, 200);
    res.status(isBusy(err) ? 503 : 502).json({
      error: `Reading the CV failed${detail ? `: ${detail}` : ""}. You can fill the profile in by hand.`,
    });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`API listening on ${PORT}`));
