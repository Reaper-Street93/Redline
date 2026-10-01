# Redline

Drop in a job contract as a PDF and get back a report: what it actually says,
how it sits against your own experience, and the specific things worth going
back and asking for — each with the odds of getting it and what it's worth if
you do.

Most people read an employment contract once, at the worst possible moment,
with no idea which parts are normal. Redline is the friend who has read four
hundred of them.

**Live: [redline-contracts.vercel.app](https://redline-contracts.vercel.app)** —
*See an example report* opens a finished one instantly, or drop in a contract
PDF (up to 3 MB) and a real report comes back in about a minute.

## What it does

- **Reads the PDF itself** — the document goes to the model as a PDF, so
  scans and stamped pages work, not just files with a clean text layer.
- **Quotes everything** — every term, flag and negotiating point carries the
  clause it came from, word for word, so you can check the machine against
  the paper in ten seconds. The example ships with **both documents it was
  written from** — the contract behind every quote, and the candidate behind
  every claim about the person. Click a quote and the contract opens at that
  clause; click "what backs this up" under an ask and the profile opens at the
  achievement being cited. When an ask cites nothing from your record, it says
  so, because an ask resting on general practice is one you should know is
  doing that. `npm run check` asserts both halves stay true.
- **Weighs it against you** — upload your CV once and it becomes an editable
  profile. Each suggested ask then names the thing in *your* record you can
  point at to win it, instead of generic negotiation advice.
- **Rates each ask on two axes** — how likely you are to get it, and how much
  it changes your working life if you do. Plus a plain `should_ask` flag,
  because some winnable asks cost more goodwill than they're worth.
- **Says what isn't there** — no on-call terms, no salary review, no notice
  from the employer's side. What a contract omits is routinely worse than
  what it says.
- **Answers follow-ups** — a chat panel grounded on the contract itself while
  you still have it open, and on the report's quoted clauses afterwards. Ask
  it to draft the email and it drafts the email.
- **Remembers, compares, exports** — past reports are kept locally, any two
  can be read side by side term-by-term, and any report exports as CSV or
  prints to PDF.
- **A defended API** — per-IP rate limiting in separate buckets for reading
  and chatting, a global daily budget, and size and page caps keep the
  free-tier key safe on a public URL.

## Two pages, one report

The report opens on a **Summary**: the whole contract in plain English, grouped
the way a person actually thinks about an offer — the money, your time, leaving,
the work itself — with the terms worth improving marked and a running count per
group. One click through to **What to ask for**: the ranked asks with leverage
and ready-to-send wording, the fit detail, the full terms table with the clause
behind each, the flags, and what the contract leaves out. Same report, read in
two passes — "what is this?" then "what do I do about it?". A print or PDF
export carries both.

## Where the legal line sits

This was designed in before any code was written, because it's the part that
would be hardest to retrofit — see [CONTRACT.md](CONTRACT.md).

- **Not legal advice, and it says so.** A notice you have to read before your
  first upload, a line in every report footer, a line on the CSV export, and
  a line under the chat box. The model is instructed to describe what the
  document says and what's unusual about it — never whether a term is lawful
  or how a court would rule.
- **Serious flags come with a route to a human.** Anything marked high
  severity puts free, named UK options on screen: Acas, Citizens Advice, a
  union rep, the Law Society's solicitor finder.
- **The third-party processing is disclosed before the upload, not after.**
  Your contract goes to Google's Gemini API, which is the thing doing the
  reading. You are told that before you drop the file.
- **Nothing is stored server-side.** No database, no disk writes, no logging
  of document content. The PDF lives in memory for one request.
- **Everything else lives in your browser.** Profile, history, consent — all
  localStorage. "Erase everything" wipes the lot and actually does.
- **Contact details are stripped from the profile** before it's sent: emails,
  phone numbers, postcodes, NI numbers, account numbers, URLs. It does *not*
  claim to strip names, because it can't do that reliably and a redactor
  whose limits aren't written down is worse than none.

## How it works

1. **Frontend (React + Tailwind)** — one page. Drop a PDF, watch it read, get
   the report. State in `useState`, the API calls with `async/await` + `fetch`,
   the PDF encoded to base64 in the browser so there's no multipart upload and
   no temp file to clean up.
2. **Backend (Node + Express)** — four endpoints: `/api/analyze` reads the
   contract, `/api/profile` turns a CV into a profile, `/api/chat` answers
   follow-ups, `/api/status` tells the UI what mode the server is in. The
   server holds the API key, which never reaches the browser.
3. **Structured outputs** — the report answers against a JSON schema mirroring
   [CONTRACT.md](CONTRACT.md), so it's guaranteed to parse. No regex, no
   hoping. The Gemini free tier means the whole thing runs at £0.

Laid out so each file has one job: `schemas.js` holds the agreed output shapes,
`prompts.js` everything said to the model, `server.js` only the routes and the
plumbing. On the frontend, `vocab.js` is the single source of truth for what
the report's enums are called and coloured, and `ui.jsx` the shared type tokens.

## The build, step by step

The commit history is the project diary — each step was committed as it
happened:

1. **Agree the contract first** — `CONTRACT.md` pinned down the exact input,
   the exact output shape and the legal position before a line of code existed.
2. **Build the empty shell** — React, Tailwind, a hardcoded report, no AI.
   Layout and the design system settled early.
3. **Wire the server** — Express + the PDF going straight to Gemini and coming
   back as the agreed JSON.
4. **Hook up the front end** — real analysis, a loading state that says what
   it's doing, and errors that explain themselves.
5. **Add your side of the table** — CV upload, structured profile, every field
   editable.
6. **Memory, then comparison** — local history, then two offers side by side.
7. **Make it travel** — CSV export, print to PDF.
8. **Let people ask** — the chat panel.
9. **Draw the legal line** — the pre-upload notice, the consent gate, the
   erase button, and the redaction pass.
10. **Review it properly** — a pass with fresh eyes that found a page cap
    silently passing anything that compressed its page tree, three components
    that had drifted on what a verdict is called, a design token written out
    thirty-eight times, and a comparison view that would have crashed on open.

## Security & privacy

No login, because none is needed — but the app takes untrusted PDFs and uses a
third-party AI processor, so the security work is aimed there: a strict
Content-Security-Policy and a full set of security headers, formula-injection-safe
CSV export, magic-byte and page-count validation (that sees inside compressed
page trees), per-IP rate limiting, and logs that never carry document contents.
The API key stays server-side and is git-ignored. See [SECURITY.md](SECURITY.md).

On privacy: the contract is sent to Google to be read and never stored; your
profile and history live only in your browser; contact details are stripped
from the profile before it's sent; and "erase everything" genuinely clears the
lot. Written up against UK/EU GDPR expectations in [PRIVACY.md](PRIVACY.md), and
disclosed in-app before the first upload.

## Run it locally

Requires Node 22+.

```bash
npm install
cp .env.example .env   # add your free GEMINI_API_KEY (aistudio.google.com/apikey)

npm start              # API on :3001
npm run dev            # frontend on :5173 (proxies /api to :3001)
```

No API key yet? Set `MOCK_AI=1` in `.env` and the server returns a canned
report, profile and chat reply, so the whole flow still works.

```bash
npm run check          # renders the real components and asserts on the output
```

`npm run build` proves the code parses, not that it works — it once happily
built a comparison view that referenced an identifier it never imported, which
would have thrown the moment two contracts were compared. `npm run check`
bundles the components with the esbuild Vite already ships, renders them to
static HTML and asserts on what comes out: no test framework, no new
dependencies, about a second to run.

## Run it in production

```bash
npm run build && npm start
```

Locally, one process serves both the built frontend and the API.

The live site runs on [Vercel](https://vercel.com): the built frontend is
served from its CDN with the same security headers the server sends (kept in
step by `npm run check`), and `api/index.js` hands every `/api` request to
the same Express app as a function in the London region. Every push to
`main` redeploys. To run your own copy, import the repo into Vercel and set
`GEMINI_API_KEY` in the project's environment variables.

## Design

A marked-up legal document, on purpose. Contract quotes sit in serif behind a
red margin rule — the redline of the name — while the interface around them
stays in a plain grotesque and small-caps mono, so the machine's voice and the
document's voice never get confused for each other. Newsreader for the
document, Inter for the interface, JetBrains Mono for labels and data. Dark
mode is the same document photocopied onto dark stock: it follows your OS, a
header toggle overrides it, and printing always comes out on light paper.

## Stack

React 19 · Vite · Tailwind CSS 4 · Node/Express 5 · Gemini API
(free tier, native PDF reading, structured outputs) · Vercel
