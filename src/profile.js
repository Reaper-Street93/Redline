// The profile lives in localStorage and nowhere else. It leaves the browser
// only as part of an analysis request, and "Forget me" wipes it for good.
const KEY = "redline.profile";

export const EMPTY_PROFILE = {
  current_role: "",
  years_experience: 0,
  skills: [],
  achievements: [],
  current_salary: "",
  target_salary: "",
  must_haves: [],
  notes: "",
};

export function loadProfile() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    return saved ? { ...EMPTY_PROFILE, ...saved } : null;
  } catch {
    return null;
  }
}

export function saveProfile(profile) {
  try {
    localStorage.setItem(KEY, JSON.stringify(profile));
  } catch {
    // Storage full or blocked — the profile just won't survive a refresh.
  }
  return profile;
}

export function clearProfile() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Nothing to do; there was nothing to clear.
  }
}

// A profile with no role and no achievements can't ground a single leverage
// line, so it's worth nothing to the analysis — treat it as absent.
export const profileIsUseful = (p) =>
  Boolean(p && (p.current_role?.trim() || p.achievements?.length));
