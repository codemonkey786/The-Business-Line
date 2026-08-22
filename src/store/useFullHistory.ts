import { useEffect, useRef, useState } from "react";
import { fetchFullDailyHistory } from "../lib/alphaVantage";
import { loadFullHistory, saveFullHistory, isFullHistoryStale } from "../lib/fullHistoryStorage";
import type { PricePoint } from "../lib/types";

// Lazy and cached forever (per symbol, in localStorage) — Alpha Vantage's free tier is
// rate-limited to a small number of requests/day, so this only ever fetches for symbols a
// caller actually asks for (e.g. the one currently open in the detail panel), never eagerly
// for a whole watchlist.
export function useFullHistory(symbols: string[]) {
  const [fullHistory, setFullHistory] = useState<Record<string, PricePoint[]>>({});
  const requested = useRef<Set<string>>(new Set());
  const symbolsKey = symbols.slice().sort().join(",");

  useEffect(() => {
    const list = symbolsKey ? symbolsKey.split(",") : [];

    for (const symbol of list) {
      const cached = loadFullHistory(symbol);
      if (cached) {
        setFullHistory((prev) => (prev[symbol] ? prev : { ...prev, [symbol]: cached.points }));
      }
      if (cached && !isFullHistoryStale(cached)) continue;
      if (requested.current.has(symbol)) continue;
      requested.current.add(symbol);

      fetchFullDailyHistory(symbol)
        .then((points) => {
          if (points.length === 0) return;
          saveFullHistory(symbol, points);
          setFullHistory((prev) => ({ ...prev, [symbol]: points }));
        })
        .catch(() => {
          // daily quota hit, unsupported symbol, or no key configured — silently keep
          // whatever cached/local data is already available
        });
    }
  }, [symbolsKey]);

  return fullHistory;
}
