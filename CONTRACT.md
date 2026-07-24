# The Contract — agreed before any code

Redline reads a job contract and tells you three things: what it actually
says, how it sits against your own experience, and what you should go back
and ask for. This document pins down exactly what goes in and exactly what
comes out. Nothing gets built until this shape is agreed.

## What goes in

Two things, and only the first is required per analysis.

### 1. The contract

A PDF of an employment contract, offer letter, contractor agreement or
statement of terms. Dropped or picked in the browser.

- **Native PDFs and scans both work** — the file goes to the model as a PDF,
  so it reads layout and stamped/scanned pages, not just an extracted text
  layer.
- **Nothing is stored.** The bytes live in server memory for the length of
  one request and are never written to disk, never logged, never cached.
- Hard cap: **10 MB / 40 pages**. Employment contracts are ten pages; anything
  bigger is a different document and gets refused politely.

### 2. Your profile

Built once, kept in your browser, reused on every contract afterwards.

You upload your CV as a PDF and the model turns it into a structured profile.
Every field is then editable by hand, because a CV never quite says what you
mean:

```json
{
  "current_role": "Senior Customer Support Engineer",
  "years_experience": 6,
  "skills": ["Zendesk administration", "SQL", "React", "escalation management"],
  "achievements": [
    "Cut first-response time from 14h to 3h across a 9-person team"
  ],
  "current_salary": "£46,000",
  "target_salary": "£58,000",
  "must_haves": ["2 days a week at home", "no on-call"],
  "notes": "Freeform: anything the CV doesn't capture."
}
```

The profile never leaves your browser except as part of an analysis request,
and it is deletable in one click.

## What comes out

One report, as JSON in this exact shape:

```json
{
  "document": {
    "title": "Employment Contract — Senior Support Engineer",
    "employer": "Acme Ltd",
    "role": "Senior Support Engineer",
    "contract_type": "permanent",
    "jurisdiction": "England & Wales",
    "read_confidence": "high"
  },
  "summary": "Three sentences telling you what you'd be signing.",
  "key_terms": [
    {
      "label": "Base salary",
      "value": "£52,000 per year",
      "verbatim": "The Employee shall receive a salary of £52,000 per annum...",
      "assessment": "watch",
      "note": "Six thousand under your target, and no review date is named."
    }
  ],
  "fit": {
    "score": 78,
    "verdict": "strong",
    "rationale": "One or two sentences on how you sit against this role.",
    "matches": ["Six years against the five the role asks for."],
    "gaps": ["No named experience of the SaaS billing stack in clause 3.2."]
  },
  "overall": {
    "fairness_score": 64,
    "recommendation": "negotiate_then_sign",
    "recommendation_reason": "Nothing here is alarming, but three terms are\nmeaningfully below what your experience supports."
  },
  "asks": [
    {
      "rank": 1,
      "title": "Move base salary to £58,000",
      "clause": "The verbatim clause this ask attaches to.",
      "why": "Why it matters to you specifically, given your profile.",
      "leverage": "The thing in YOUR history you point at to win it.",
      "likelihood": 55,
      "impact": 5,
      "priority": "must",
      "should_ask": true,
      "suggested_wording": "A sentence you could paste into an email today."
    }
  ],
  "flags": [
    {
      "severity": "high",
      "title": "Twelve-month non-compete covering the whole UK",
      "clause": "The verbatim clause.",
      "why": "Plain-English explanation of what it would do to you."
    }
  ],
  "missing": [
    "No notice period is stated for the employer's side."
  ]
}
```

### Field rules

| Field | Type | Rules |
|---|---|---|
| `document.title` | string | The document's own title, or one inferred from it |
| `document.employer` | string | Named party offering the work; `"not stated"` if absent |
| `document.role` | string | Job title as written |
| `document.contract_type` | string | One of `permanent`, `fixed_term`, `contractor`, `zero_hours`, `internship`, `other` |
| `document.jurisdiction` | string | Governing law as stated, e.g. `"England & Wales"`; `"not stated"` if absent |
| `document.read_confidence` | string | One of `high`, `medium`, `low` — low means a bad scan, and the UI says so loudly |
| `summary` | string | 2–4 sentences, plain English, no legalese |
| `key_terms` | array | 6–12 terms: pay, hours, holiday, notice, probation, place of work, IP, restrictive covenants, termination, benefits, bonus, expenses |
| `key_terms[].label` | string | Short, e.g. `"Notice period"` |
| `key_terms[].value` | string | The answer in one line, e.g. `"3 months either way"` |
| `key_terms[].verbatim` | string | Quoted from the contract, never paraphrased or invented |
| `key_terms[].assessment` | string | One of `favourable`, `standard`, `watch`, `red_flag` |
| `key_terms[].note` | string | One sentence on why it earned that assessment |
| `fit.score` | integer | 0–100, how well your profile matches the role |
| `fit.verdict` | string | One of `strong`, `good`, `stretch`, `mismatch` |
| `fit.matches` | array | 2–5 places your experience meets or beats the role |
| `fit.gaps` | array | 0–5 places the role asks for more than your profile shows |
| `overall.fairness_score` | integer | 0–100, how the terms sit against ordinary market practice |
| `overall.recommendation` | string | One of `sign`, `negotiate_then_sign`, `push_back_hard`, `walk_away` |
| `asks` | array | 3–7 negotiation points, ranked by what's worth spending capital on |
| `asks[].rank` | integer | 1 = ask for this first |
| `asks[].clause` | string | Verbatim clause the ask attaches to, or `"not in the contract"` |
| `asks[].leverage` | string | Must cite something real from the profile, not generic advice |
| `asks[].likelihood` | integer | 0–100: odds an employer says yes to this ask |
| `asks[].impact` | integer | 1–5: how much your working life improves if they do |
| `asks[].priority` | string | One of `must`, `should`, `nice` |
| `asks[].should_ask` | boolean | `false` when the ask is real but not worth the capital — the UI shows it greyed with the reason |
| `asks[].suggested_wording` | string | One or two sentences, ready to send, polite and specific |
| `flags` | array | 0–6 unusual or onerous terms |
| `flags[].severity` | string | One of `high`, `medium`, `low` |
| `missing` | array | 0–6 terms you'd expect in a contract of this type but which aren't there |

## Why this shape

- **`verbatim` on every term and flag** — the whole risk with a machine
  reading a legal document is invention. Quoting the clause makes each claim
  checkable in ten seconds against the PDF sitting next to it.
- **`likelihood` × `impact`, not one blended score** — "worth asking for" and
  "likely to be granted" are different questions, and the interesting asks are
  the high-impact ones with middling odds. Two axes let the UI plot them.
- **`should_ask` as its own boolean** — you asked for should/shouldn't, and it
  isn't just "likelihood is low". Some low-odds asks are still worth making;
  some easy wins cost you goodwill you'd rather spend on salary.
- **`leverage` tied to the profile** — this is the line between Redline and
  generic negotiation advice. If it can't name something you've actually done,
  the ask isn't grounded and shouldn't be top-ranked.
- **`fit` separate from `overall`** — "can I do this job" and "are these terms
  fair" are independent. A great-fit role can carry a bad contract.
- **`missing` as a first-class field** — what a contract *doesn't* say is
  routinely worse than what it does. A model that only summarises what's on
  the page misses the most valuable half.

## Where the legal line sits

Redline is an information tool, not a solicitor. That has to be built in, not
bolted on afterwards.

1. **Not legal advice, said plainly and often.** A one-time acknowledgement
   before the first analysis, a persistent line in the report header, and a
   line on every export. The model is instructed never to answer "is this
   legal?" — only "here is what it says, here is what is unusual about it".
2. **Every `high` severity flag comes with a route to a human.** Named,
   free, UK-appropriate: ACAS, Citizens Advice, a union rep, a solicitor's
   free first consultation.
3. **The contract goes to Google's Gemini API to be read.** That is disclosed
   before the first upload, not buried — you are sending an employment
   contract to a third-party processor, and you should know that before you
   drop the file, not after.
4. **Nothing is stored server-side.** No database, no disk writes, no request
   logging of document content. Reports and profile live in your browser's
   localStorage, and "Delete everything" is one button that actually does.
5. **Data minimisation by default.** The profile has email addresses, phone
   numbers, postcodes, National Insurance numbers, long account numbers and
   URLs stripped out before it is sent — the analysis never needed any of
   them. It does **not** claim to strip names: doing that properly needs
   entity recognition, and a redactor that half-works is more dangerous than
   one whose limits are written down. The contract PDF goes as it is, because
   it is the thing being read.
6. **Confidence is surfaced, not hidden.** `read_confidence: "low"` puts a
   banner on the report rather than letting a bad scan quietly produce
   confident nonsense.
