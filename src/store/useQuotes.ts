import { useEffect, useRef, useState } from "react";
import { fetchQuotes } from "../lib/finnhub";
import { onTrade, subscribeTrades, unsubscribeTrades } from "../lib/finnhubSocket";
import {
  loadDailyHistory,
  loadPriceHistory,
  pruneHistoryPoint,
  saveDailyHistory,
  savePriceHistory,
  upsertDailyPoint,
} from "../lib/priceHistoryStorage";
import type { PricePoint, Quote } from "../lib/types";

const REST_POLL_MS = 30_000;
const TICK_FLUSH_MS = 1_000;
const PERSIST_DEBOUNCE_MS = 5_000;
const API_KEY = import.meta.env.VITE_FINNHUB_API_KEY as string | undefined;

export function useQuotes(symbols: string[]) {
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  // Seeded from localStorage so real elapsed-time ranges (1H, 1D) have genuine history to
  // show across reloads, instead of resetting to nothing every time the page opens.
  const [history, setHistory] = useState<Record<string, PricePoint[]>>(() => loadPriceHistory());
  // One real point per calendar day, grown honestly over real elapsed time — backs the
  // 1M/3M/6M/ALL ranges without ever fabricating a day that hasn't actually happened.
  const [dailyHistory, setDailyHistory] = useState<Record<string, PricePoint[]>>(() => loadDailyHistory());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const symbolsKey = symbols.slice().sort().join(",");

  const persistTimer = useRef<number | null>(null);
  const persistDailyTimer = useRef<number | null>(null);
  function schedulePersist(next: Record<string, PricePoint[]>) {
    if (persistTimer.current) window.clearTimeout(persistTimer.current);
    persistTimer.current = window.setTimeout(() => savePriceHistory(next), PERSIST_DEBOUNCE_MS);
  }
  function schedulePersistDaily(next: Record<string, PricePoint[]>) {
    if (persistDailyTimer.current) window.clearTimeout(persistDailyTimer.current);
    persistDailyTimer.current = window.setTimeout(() => saveDailyHistory(next), PERSIST_DEBOUNCE_MS);
  }

  // Slower REST baseline: keeps prevClose/open/high/low fresh and covers the case
  // where WebSocket ticks are sparse (thinly traded symbols, market closed, etc).
  useEffect(() => {
    if (!symbolsKey) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    async function poll() {
      try {
        const list = symbolsKey.split(",");
        // Paint each batch in as it lands rather than waiting for the whole watchlist to
        // finish — with 20+ symbols staggered to respect the free-tier rate limit, waiting
        // for the full set left the first symbols sitting on a skeleton for several seconds
        // even though their own request had already come back.
        await fetchQuotes(list, (batch) => {
          if (cancelled) return;
          setQuotes((prev) => ({ ...prev, ...batch }));
          const now = Date.now();
          setHistory((prev) => {
            const next = { ...prev };
            for (const [symbol, q] of Object.entries(batch)) {
              next[symbol] = pruneHistoryPoint(next[symbol] ?? [], { t: now, price: q.price });
            }
            schedulePersist(next);
            return next;
          });
          setDailyHistory((prev) => {
            const next = { ...prev };
            for (const [symbol, q] of Object.entries(batch)) {
              next[symbol] = upsertDailyPoint(next[symbol] ?? [], { t: now, price: q.price });
            }
            schedulePersistDaily(next);
            return next;
          });
          setLoading(false);
        });
        if (!cancelled) setError(null);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to fetch quotes");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    poll();
    const interval = setInterval(poll, REST_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [symbolsKey]);

  // Real-time WebSocket ticks, batched into one state update per second so the UI
  // visibly moves every second without re-rendering on every single trade print.
  useEffect(() => {
    if (!API_KEY || !symbolsKey) return;
    const list = symbolsKey.split(",");
    list.forEach((s) => subscribeTrades(API_KEY, s));

    const pending = new Map<string, { price: number; t: number }>();
    const offTrade = onTrade((symbol, price, t) => {
      if (!list.includes(symbol)) return;
      pending.set(symbol, { price, t: t || Date.now() });
    });

    const flush = window.setInterval(() => {
      if (pending.size === 0) return;
      const updates = new Map(pending);
      pending.clear();

      setQuotes((prev) => {
        const next = { ...prev };
        updates.forEach(({ price, t }, symbol) => {
          const existing = next[symbol];
          if (!existing) return;
          const prevClose = existing.prevClose || existing.price;
          const change = price - prevClose;
          const percentChange = prevClose ? (change / prevClose) * 100 : 0;
          next[symbol] = { ...existing, price, change, percentChange, updatedAt: t };
        });
        return next;
      });

      setHistory((prev) => {
        const next = { ...prev };
        updates.forEach(({ price, t }, symbol) => {
          next[symbol] = pruneHistoryPoint(next[symbol] ?? [], { t, price });
        });
        schedulePersist(next);
        return next;
      });
    }, TICK_FLUSH_MS);

    return () => {
      list.forEach((s) => unsubscribeTrades(s));
      offTrade();
      clearInterval(flush);
    };
  }, [symbolsKey]);

  return { quotes, history, dailyHistory, loading, error };
}
