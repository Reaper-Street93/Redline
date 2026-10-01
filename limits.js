// Shared between the browser (which refuses the file early, with a friendly
// message) and the server (which refuses it properly), so the two can never
// disagree about how big a contract is too big.
// 3 MB because Vercel refuses any request body over 4.5 MB, and a PDF grows by
// a third on its way there as base64. Ten typed pages is a few hundred KB.
export const MAX_PDF_BYTES = 3 * 1024 * 1024; // 3 MB
export const MAX_PDF_PAGES = 40;

// Base64 inflates by 4/3, plus JSON overhead — the Express body limit has to
// clear the largest PDF we accept or the cap above would never be reached.
export const MAX_BODY = "4.5mb";

// Chat limits. A long conversation is resent in full on every turn, so the cap
// is about keeping answers sharp and the free tier alive, not about safety.
export const MAX_TURNS = 24;
export const MAX_QUESTION_CHARS = 1500;
