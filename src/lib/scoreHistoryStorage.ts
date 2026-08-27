const INTRADAY_KEY = "creditfolio.scoreHistory.v3";
const DAILY_KEY = "creditfolio.dailyScoreHistory.v1";

const INTRADAY_MAX_AGE_MS = 24 * 60 * 60 * 1000; // dense resolution: a real rolling day of snapshots
const INTRADAY_MAX_POINTS = 5000; // safety valve against runaway growth
const DAILY_MAX_POINTS = 800; // >2 years of daily closes — plenty, tiny storage footprint

export interface ScorePoint {
  t: number;
  score: number;
}

// ---- Intraday (dense, last 24h) ----

export function loadScoreHistory(): ScorePoint[] {
  try {
    const raw = localStorage.getItem(INTRADAY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ScorePoint[];
    const cutoff = Date.now() - INTRADAY_MAX_AGE_MS;
    return parsed.filter((p) => p.t >= cutoff);
  } catch {
    return [];
  }
}

export function saveScoreHistory(points: ScorePoint[]) {
  try {
    localStorage.setItem(INTRADAY_KEY, JSON.stringify(points));
  } catch {
    // non-fatal — chart just re-collects from here next session
  }
}

// Pacing is handled by the caller's timer, not here — every call is a real recorded snapshot,
// including ones where the score didn't move (that's honest information too: the score was
// genuinely flat over that stretch, e.g. while markets are closed).
export function appendScorePoint(existing: ScorePoint[], next: ScorePoint): ScorePoint[] {
  const cutoff = next.t - INTRADAY_MAX_AGE_MS;
  const updated = [...existing, next].filter((p) => p.t >= cutoff);
  return updated.length > INTRADAY_MAX_POINTS ? updated.slice(updated.length - INTRADAY_MAX_POINTS) : updated;
}

// ---- Daily rollup (one real point per calendar day, grows slowly and honestly over time) ----

// Local calendar day, not UTC — a UTC-day boundary lands mid-afternoon for US timezones
// (e.g. ~5pm PT), which would split a single real trading day's data across two "days" or
// roll the day over while the market's still open. Zero-padded so it stays lexically sortable.
function dayKey(t: number): string {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function loadDailyScoreHistory(): ScorePoint[] {
  try {
    const raw = localStorage.getItem(DAILY_KEY);
    return raw ? (JSON.parse(raw) as ScorePoint[]) : [];
  } catch {
    return [];
  }
}

export function saveDailyScoreHistory(points: ScorePoint[]) {
  try {
    localStorage.setItem(DAILY_KEY, JSON.stringify(points));
  } catch {
    // non-fatal
  }
}

// Wipes both resolutions — used on sign-out so the next visitor to this browser (guest or a
// different account) doesn't see the previous account's score chart before their own history
// has recorded anything.
export function clearScoreHistory() {
  localStorage.removeItem(INTRADAY_KEY);
  localStorage.removeItem(DAILY_KEY);
}

// Updates today's running daily point (latest score so far) or appends a new day's point when
// the calendar day rolls over. Never fabricates a day that hasn't actually happened.
export function upsertDailyScorePoint(existing: ScorePoint[], next: ScorePoint): ScorePoint[] {
  const key = dayKey(next.t);
  const lastIdx = existing.length - 1;
  let updated: ScorePoint[];
  if (lastIdx >= 0 && dayKey(existing[lastIdx].t) === key) {
    updated = existing.slice(0, lastIdx).concat([next]);
  } else {
    updated = [...existing, next];
  }
  return updated.length > DAILY_MAX_POINTS ? updated.slice(updated.length - DAILY_MAX_POINTS) : updated;
}

// Long-range daily closes topped up with genuine recent intraday detail — live wins on any
// day both sources have (it's the more current read for that day), so the chart's most recent
// stretch stays at full resolution instead of flattening to one point.
export function mergeDailyAndIntradayScoreHistory(daily: ScorePoint[], intraday: ScorePoint[]): ScorePoint[] {
  if (daily.length === 0) return intraday;
  if (intraday.length === 0) return daily;
  const cutoffDay = dayKey(intraday[0].t);
  const keptDaily = daily.filter((p) => dayKey(p.t) < cutoffDay);
  return [...keptDaily, ...intraday].sort((a, b) => a.t - b.t);
}

// Real change over a lookback window, computed from genuinely recorded points — returns null
// when history doesn't yet reach back that far rather than guessing at a value.
export function scoreChangeOverPeriod(history: ScorePoint[], currentScore: number, periodMs: number): number | null {
  if (history.length === 0) return null;
  const target = Date.now() - periodMs;
  if (history[0].t > target) return null;

  let closest = history[0];
  for (const p of history) {
    if (p.t > target) break;
    closest = p;
  }
  return currentScore - closest.score;
}
