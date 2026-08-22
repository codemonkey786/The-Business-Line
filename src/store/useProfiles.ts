import { useEffect, useRef, useState } from "react";
import { fetchProfiles } from "../lib/finnhub";
import type { CompanyProfile } from "../lib/types";

const RETRY_MS = 30_000;

// Profiles (and their logos) come from a staggered batch fetch, and any symbol that's still
// missing one after a pass gets retried on a timer — a transient free-tier rate limit shouldn't
// permanently strand a symbol without its logo for the rest of the session.
export function useProfiles(symbols: string[]) {
  const [profiles, setProfiles] = useState<Record<string, CompanyProfile>>({});
  const profilesRef = useRef(profiles);
  profilesRef.current = profiles;
  const symbolsKey = symbols.slice().sort().join(",");

  useEffect(() => {
    if (!symbolsKey) return;
    let cancelled = false;

    async function loadMissing() {
      const list = symbolsKey.split(",").filter((s) => !profilesRef.current[s]);
      if (list.length === 0) return;
      const result = await fetchProfiles(list);
      if (!cancelled && Object.keys(result).length > 0) {
        setProfiles((prev) => ({ ...prev, ...result }));
      }
    }

    loadMissing();
    const interval = setInterval(loadMissing, RETRY_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [symbolsKey]);

  return profiles;
}
