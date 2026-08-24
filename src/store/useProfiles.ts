import { useEffect, useRef, useState } from "react";
import { fetchProfiles } from "../lib/finnhub";
import { loadCompanyProfile, saveCompanyProfile } from "../lib/companyProfileStorage";
import type { CompanyProfile } from "../lib/types";

const RETRY_MS = 30_000;

// Profiles (and their logos) are checked against a permanent local cache first — anything
// you've ever viewed before renders its real logo instantly, no network wait at all. Only
// symbols with no cache hit go through the staggered batch fetch, and any that's still missing
// after a pass gets retried on a timer, so a transient free-tier rate limit doesn't permanently
// strand a symbol without its logo for the rest of the session.
export function useProfiles(symbols: string[]) {
  const [profiles, setProfiles] = useState<Record<string, CompanyProfile>>({});
  const profilesRef = useRef(profiles);
  profilesRef.current = profiles;
  const symbolsKey = symbols.slice().sort().join(",");

  useEffect(() => {
    if (!symbolsKey) return;
    let cancelled = false;
    const list = symbolsKey.split(",");

    const cacheHits: Record<string, CompanyProfile> = {};
    const uncached: string[] = [];
    for (const s of list) {
      if (profilesRef.current[s]) continue;
      const hit = loadCompanyProfile(s);
      if (hit) cacheHits[s] = hit;
      else uncached.push(s);
    }
    if (Object.keys(cacheHits).length > 0) {
      setProfiles((prev) => ({ ...cacheHits, ...prev }));
    }

    async function loadMissing(target: string[]) {
      const remaining = target.filter((s) => !profilesRef.current[s]);
      if (remaining.length === 0) return;
      await fetchProfiles(remaining, (batch) => {
        if (cancelled) return;
        for (const p of Object.values(batch)) saveCompanyProfile(p);
        setProfiles((prev) => ({ ...prev, ...batch }));
      });
    }

    loadMissing(uncached);
    const interval = setInterval(() => loadMissing(list), RETRY_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [symbolsKey]);

  return profiles;
}
