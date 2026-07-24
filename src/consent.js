// Consent is recorded with the version of the notice that was agreed to. Bump
// NOTICE_VERSION whenever the notice materially changes and everyone is asked
// again — an acknowledgement of an old text isn't an acknowledgement of a new
// one.
const KEY = "redline.consent";
export const NOTICE_VERSION = 1;

export function hasConsented() {
  try {
    return JSON.parse(localStorage.getItem(KEY))?.version === NOTICE_VERSION;
  } catch {
    return false;
  }
}

export function recordConsent() {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({ version: NOTICE_VERSION, at: new Date().toISOString() })
    );
  } catch {
    // Storage blocked — they'll be asked again next time, which is the safe
    // way round for this particular flag.
  }
}

export function withdrawConsent() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Nothing to do; there was nothing to clear.
  }
}
