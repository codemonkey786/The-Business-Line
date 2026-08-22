import type { PricePoint } from "./types";

const INTRADAY_KEY = "creditfolio.priceHistory.v1";
const DAILY_KEY = "creditfolio.dailyPriceHistory.v1";

// A plain 24h window loses Friday's close by Sunday — keep 4 real days so the weekend gap
// (Friday close to Monday open) doesn't wipe out the last real trading session's data.
const INTRADAY_MAX_AGE_MS = 4 * 24 * 60 * 60 * 1000;
const INTRADAY_MAX_POINTS_PER_SYMBOL = 6000; // safety valve against runaway growth on very liquid symbols
const DAILY_MAX_POINTS_PER_SYMBOL = 800; // >2 years of daily closes — plenty, tiny storage footprint

// ---- Intraday (dense, last 24h) ----

export function loadPriceHistory(): Record<string, PricePoint[]> {
  try {
    const raw = localStorage.getItem(INTRADAY_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, PricePoint[]>;
    const cutoff = Date.now() - INTRADAY_MAX_AGE_MS;
    const pruned: Record<string, PricePoint[]> = {};
    for (const [symbol, points] of Object.entries(parsed)) {
      pruned[symbol] = points.filter((p) => p.t >= cutoff);
    }
    return pruned;
  } catch {
    return {};
  }
}

export function savePriceHistory(history: Record<string, PricePoint[]>) {
  try {
    localStorage.setItem(INTRADAY_KEY, JSON.stringify(history));
  } catch {
    // storage full or unavailable — live view still works, just without persistence
  }
}

export function pruneHistoryPoint(existing: PricePoint[], next: PricePoint): PricePoint[] {
  const cutoff = Date.now() - INTRADAY_MAX_AGE_MS;
  const merged = [...existing, next].filter((p) => p.t >= cutoff);
  return merged.length > INTRADAY_MAX_POINTS_PER_SYMBOL ? merged.slice(merged.length - INTRADAY_MAX_POINTS_PER_SYMBOL) : merged;
}

// ---- Daily rollup (one real point per calendar day, grows slowly and honestly over time) ----

function dayKey(t: number): string {
  return new Date(t).toISOString().slice(0, 10);
}

export function loadDailyHistory(): Record<string, PricePoint[]> {
  try {
    const raw = localStorage.getItem(DAILY_KEY);
    return raw ? (JSON.parse(raw) as Record<string, PricePoint[]>) : {};
  } catch {
    return {};
  }
}

export function saveDailyHistory(history: Record<string, PricePoint[]>) {
  try {
    localStorage.setItem(DAILY_KEY, JSON.stringify(history));
  } catch {
    // non-fatal
  }
}

// Updates today's running daily point (last price of the day so far) or appends a new
// day's point when the calendar day rolls over. Never fabricates days that didn't happen.
export function upsertDailyPoint(existing: PricePoint[], next: PricePoint): PricePoint[] {
  const key = dayKey(next.t);
  const lastIdx = existing.length - 1;
  let updated: PricePoint[];
  if (lastIdx >= 0 && dayKey(existing[lastIdx].t) === key) {
    updated = existing.slice(0, lastIdx).concat([next]);
  } else {
    updated = [...existing, next];
  }
  return updated.length > DAILY_MAX_POINTS_PER_SYMBOL ? updated.slice(updated.length - DAILY_MAX_POINTS_PER_SYMBOL) : updated;
}
