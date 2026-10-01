// The security headers every response carries, kept in one place. The Express
// server sends them itself; on Vercel the page comes straight off the CDN
// without touching Express, so vercel.json carries a copy — and
// `npm run check` fails if that copy ever drifts from this file.
import { createHash } from "node:crypto";

// CSP sources for the inline <script> blocks in an HTML file, each allowed by
// its exact SHA-256 hash rather than by a blanket 'unsafe-inline'.
export function inlineScriptHashes(html) {
  return [...html.matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g)]
    .map((m) => `'sha256-${createHash("sha256").update(m[1]).digest("base64")}'`)
    .join(" ");
}

// The Content-Security-Policy is the important one: scripts may only come from
// this origin (plus the inline snippets passed in by hash), styles from here or
// Google Fonts, connections only to here. Even if a rendered value somehow
// carried markup, the browser would refuse to run it.
export function securityHeaders(scriptHashes) {
  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "img-src 'self' data:",
    "font-src 'self' https://fonts.gstatic.com",
    // 'unsafe-inline' here covers React's style="" attributes (the score bars),
    // not scripts — script injection stays blocked by script-src below.
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    `script-src 'self' ${scriptHashes}`.trim(),
    "connect-src 'self'",
  ].join("; ");

  return {
    "Content-Security-Policy": csp,
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), interest-cohort=()",
    "Cross-Origin-Opener-Policy": "same-origin",
    // Only meaningful over HTTPS; browsers ignore it over plain http, so it's
    // safe to send locally too.
    "Strict-Transport-Security": "max-age=15552000; includeSubDomains",
  };
}
