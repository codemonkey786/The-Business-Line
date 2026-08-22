import { useEffect, useRef, useState } from "react";
import { fetchBeta } from "../lib/finnhub";

// Beta rarely changes and is only needed for symbols with a call attached to them (open or
// closed) — fetched once per symbol per session, same pattern as useProfiles.
export function useBetas(symbols: string[]) {
  const [betas, setBetas] = useState<Record<string, number>>({});
  const requested = useRef<Set<string>>(new Set());
  const symbolsKey = symbols.slice().sort().join(",");

  useEffect(() => {
    const toFetch = symbolsKey ? symbolsKey.split(",").filter((s) => !requested.current.has(s)) : [];
    if (toFetch.length === 0) return;
    toFetch.forEach((s) => requested.current.add(s));

    toFetch.forEach((symbol) => {
      fetchBeta(symbol)
        .then((beta) => {
          if (beta != null) {
            setBetas((prev) => ({ ...prev, [symbol]: beta }));
          }
        })
        .catch(() => {
          // no beta available — callers fall back to a neutral beta of 1
        });
    });
  }, [symbolsKey]);

  return betas;
}
