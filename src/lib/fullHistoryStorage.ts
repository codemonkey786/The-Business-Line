import type { PricePoint } from "./types";

const KEY_PREFIX = "creditfolio.fullHistory.v2.";
const STALE_AFTER_MS = 20 * 60 * 60 * 1000; // once a day at most — real closes don't change after the fact

interface CachedFullHistory {
  fetchedAt: number;
  points: PricePoint[];
}

export function loadFullHistory(symbol: string): CachedFullHistory | null {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + symbol);
    return raw ? (JSON.parse(raw) as CachedFullHistory) : null;
  } catch {
    return null;
  }
}

export function saveFullHistory(symbol: string, points: PricePoint[]) {
  try {
    localStorage.setItem(KEY_PREFIX + symbol, JSON.stringify({ fetchedAt: Date.now(), points }));
  } catch {
    // non-fatal — feature just falls back to a re-fetch next time
  }
}

export function isFullHistoryStale(cached: CachedFullHistory): boolean {
  return Date.now() - cached.fetchedAt > STALE_AFTER_MS;
}

function dayKey(t: number): string {
  return new Date(t).toISOString().slice(0, 10);
}

// Full multi-year closes from Alpha Vantage, topped up with whatever we've genuinely
// observed live since — live data wins on any day both sources have, since it's the more
// current read for that day (e.g. today, still in progress).
export function mergeFullAndLiveHistory(full: PricePoint[], live: PricePoint[]): PricePoint[] {
  if (full.length === 0) return live;
  if (live.length === 0) return full;
  const byDay = new Map<string, PricePoint>();
  for (const p of full) byDay.set(dayKey(p.t), p);
  for (const p of live) byDay.set(dayKey(p.t), p);
  return Array.from(byDay.values()).sort((a, b) => a.t - b.t);
}
