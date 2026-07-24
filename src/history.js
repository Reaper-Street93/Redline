// Past reports live in localStorage — no backend, no accounts, still £0.
// The contract PDF itself is never kept, only the report made from it.
const KEY = "redline.history";
const MAX_ENTRIES = 20;

export function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) ?? [];
  } catch {
    return [];
  }
}

function persist(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // Storage full or blocked — history just won't survive a refresh.
  }
  return list;
}

export function addToHistory(report, filename) {
  const entry = {
    id: Date.now(),
    at: new Date().toISOString(),
    filename,
    report,
  };
  return persist([entry, ...loadHistory()].slice(0, MAX_ENTRIES));
}

export function removeFromHistory(id) {
  return persist(loadHistory().filter((entry) => entry.id !== id));
}

export function clearHistory() {
  return persist([]);
}

export function formatWhen(iso) {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
