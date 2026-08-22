const KEY = "creditfolio.readingActivity.v1";

export type ReadingActivity = Record<string, number>;

export function loadReadingActivity(): ReadingActivity {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ReadingActivity) : {};
  } catch {
    return {};
  }
}

export function saveReadingActivity(activity: ReadingActivity) {
  try {
    localStorage.setItem(KEY, JSON.stringify(activity));
  } catch {
    // non-fatal — the leaderboard just re-collects from here next session
  }
}

// A real, honest count of how many times you've actually opened a symbol's detail panel —
// nothing inferred or estimated, just a running tally of a genuine action.
export function recordSymbolView(existing: ReadingActivity, symbol: string): ReadingActivity {
  return { ...existing, [symbol]: (existing[symbol] ?? 0) + 1 };
}
