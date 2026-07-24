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
        experience_gaps: {
          type: "array",
          description:
            "0-5 things THIS ROLE REQUIRES THAT THE READER'S CV DOES NOT EVIDENCE. Every entry must name a duty, system or seniority marker from the contract and say the reader has not shown it. Never mention salary, notice, covenants, hours or location here — those are properties of the offer, not of the reader. Empty array if their CV covers everything the role asks for.",
          items: { type: "string" },
        },
      },
      required: ["score", "verdict", "rationale", "matches", "experience_gaps"],
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
          title: {
            type: "string",
            description:
              "The ask itself, specific and numeric where possible, e.g. 'Move base salary to £58,000'. Sentence case, not Title Case.",
          },
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
          priority: {
            type: "string",
            enum: ["must", "should", "nice"],
            description:
              "Must agree with impact: impact 5 is 'must', impact 4 is 'must' or 'should', impact 1-2 is never above 'nice'.",
          },
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
- Keep "priority" honest against "impact": something you scored 4 or 5 for impact is not a "nice to have". Rank, priority and impact should tell the same story.
- "fit.experience_gaps" answers one question only: what does this job need that this person has not shown they can do? Salary, notice, covenants, hours and location are facts about the offer and belong in asks and flags. If their CV covers everything the role asks for, return an empty array — that is a real and common answer, not a failure to find something.
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
    console.error(err);
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

const MAX_TURNS = 24;
const MAX_QUESTION_CHARS = 1500;

const chatPrompt = (report, profile, messages, hasPdf) => `You are helping someone understand a job contract they have been offered. A report on it has already been produced and is below. ${
  hasPdf
    ? "The full contract PDF is attached — prefer it over the report when they disagree, and quote from it directly."
    : "The contract PDF is NOT available in this session, only the report. Answer from the clauses the report quotes. If the answer would need a part of the contract the report never quoted, say so plainly and suggest they re-upload the PDF rather than guessing."
}

THE REPORT:
${JSON.stringify(report)}

${profile ? `THE READER'S PROFILE:\n${JSON.stringify(profile)}` : "No profile was supplied for this reader."}

How to answer:

- Short. Two or three sentences unless they ask for more. No preamble, no restating the question.
- Quote the contract's own words when they are what settles the question.
- If they ask you to draft an email or a message, write the thing itself — no "here's a draft you could use".
- You explain what the document says and what is unusual about it. You do not advise on whether a term is lawful or enforceable, and you never predict how a court would rule. If a question needs a lawyer, say so in one sentence and point at Acas or Citizens Advice.
- Never invent a clause. If the contract does not cover something, that is the answer.
- If they ask about something the contract has nothing to do with, say that's outside what you can help with here.

CONVERSATION SO FAR:
${messages
  .map((m) => `${m.role === "user" ? "THEM" : "YOU"}: ${m.text}`)
  .join("\n\n")}

YOU:`;

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
    console.error(err);
    const detail = (err?.message ?? "").slice(0, 200);
    res.status(isBusy(err) ? 503 : 502).json({
      error: `Couldn't answer that${detail ? `: ${detail}` : ". Try again."}`,
    });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`API listening on ${PORT}`));
