# Security

Redline has no accounts and no login, so there are no passwords or sessions to
protect. What it does handle is untrusted input — a PDF from who-knows-where —
and a third-party AI processor. The security work is aimed there.

## What's in place

**Input is treated as hostile.**
- Uploads must be PDFs (magic-byte check, not just the file extension), capped
  at 3 MB and 40 pages. The page count looks *inside* Flate-compressed object
  streams, so a document that hides its real length can't slip the cap, and
  decompression is bounded by a 32 MB budget so a compression bomb can't be
  used to exhaust memory.
- The JSON body limit is 4.5 MB — enough for the largest allowed PDF as
  base64, no more, and the most Vercel accepts anyway.
- The model answers against a fixed JSON schema, so its output is shape-checked
  before anything renders.

**The browser can't be turned against the user.**
- A strict `Content-Security-Policy` allows scripts only from this origin plus
  the one inline theme snippet (pinned by its exact SHA-256 hash). Locally the
  server computes the hash from the shipped file at startup; on Vercel the
  page is served with the same headers from `vercel.json`, and `npm run check`
  fails if the two ever disagree. Even if a rendered value
  carried markup, the browser would refuse to execute it.
- React escapes all rendered text; there is no `dangerouslySetInnerHTML`, no
  `eval`, no `innerHTML` anywhere in the codebase.
- Every response also sends `X-Content-Type-Options: nosniff`,
  `X-Frame-Options: DENY` (plus `frame-ancestors 'none'`), `Referrer-Policy:
  no-referrer`, a locked-down `Permissions-Policy`, `Cross-Origin-Opener-Policy`
  and, over HTTPS, `Strict-Transport-Security`.

**Exports are safe.**
- CSV export neutralises formula injection: any cell beginning `=`, `+`, `-`,
  `@` or a control character is prefixed with a quote, so a clause a contract
  smuggled in can't execute when the file is opened in Excel or Sheets.

**The free-tier key is defended.**
- The `GEMINI_API_KEY` lives only in the server environment and never reaches
  the browser. It is not committed — `.env` is git-ignored, and the full commit
  history has been scanned for key material.
- A public endpoint with no brakes would let one visitor burn the daily
  allowance, so requests are rate-limited per IP in separate buckets (5
  document reads / 30 questions per 10 minutes) with a global daily ceiling as
  the backstop.

**Logs stay clean.** No request body, PDF, or profile is ever logged. Upstream
errors are logged as status + a trimmed message only, never the whole error
object, so document contents can't leak into stdout.

**No SSRF surface.** The only outbound call is to Google's Gemini API; no URL is
ever taken from user input.

## Known limitations (honest about the residual risk)

- **Rate-limit state is in-memory.** On Vercel each function instance keeps its
  own counters, and instances come and go with traffic, so the per-IP window
  and the daily ceiling hold per instance rather than across the whole site.
  Google's own account-level quota is the ultimate backstop; the in-app caps
  are best-effort, not a hard guarantee.
- **The body is parsed before the rate limiter runs**, so a flood of large
  bodies costs some parsing work before being rejected. Bounded by the 4.5 MB
  limit; acceptable for a personal deployment, not hardened for a hostile
  internet at scale.
- **Prompt injection via the contract** is possible in principle — a PDF could
  contain text aimed at the model. The JSON-schema output and the "quote, never
  invent" instruction bound the blast radius to a misleading report, not code
  execution, but a reader should always check quoted clauses against the
  document (which the app tells them to do).

## Reporting a problem

This is a personal project. If you find a security issue, please open an issue
on the repository describing it, or contact the author directly rather than
posting exploit details publicly.
