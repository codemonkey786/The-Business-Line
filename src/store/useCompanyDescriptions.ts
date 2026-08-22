import { useEffect, useRef, useState } from "react";
import { fetchCompanyDescription } from "../lib/wikipedia";
import { loadCompanyDescription, saveCompanyDescription } from "../lib/companyDescriptionStorage";

interface Entry {
  symbol: string;
  name?: string;
}

// Lazy and cached forever per symbol — only fetches for whichever entries a caller actually
// asks for (e.g. the symbol currently open in the detail panel), same pattern as useBetas
// and useFullHistory.
export function useCompanyDescriptions(entries: Entry[]) {
  const [descriptions, setDescriptions] = useState<Record<string, string>>({});
  const requested = useRef<Set<string>>(new Set());
  const key = entries
    .map((e) => `${e.symbol}:${e.name ?? ""}`)
    .sort()
    .join(",");

  useEffect(() => {
    for (const { symbol, name } of entries) {
      if (!name) continue;

      const cached = loadCompanyDescription(symbol);
      if (cached) {
        setDescriptions((prev) => (prev[symbol] ? prev : { ...prev, [symbol]: cached }));
        continue;
      }
      if (requested.current.has(symbol)) continue;
      requested.current.add(symbol);

      fetchCompanyDescription(name).then((desc) => {
        if (!desc) return;
        saveCompanyDescription(symbol, desc);
        setDescriptions((prev) => ({ ...prev, [symbol]: desc }));
      });
    }
  }, [key]);

  return descriptions;
}
