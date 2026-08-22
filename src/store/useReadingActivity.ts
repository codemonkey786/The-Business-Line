import { useCallback, useRef, useState } from "react";
import { loadReadingActivity, recordSymbolView, saveReadingActivity, type ReadingActivity } from "../lib/readingActivityStorage";

const PERSIST_DEBOUNCE_MS = 1000;

// Tracks which symbols you've actually opened, and how often — your own real reading activity,
// not anyone else's. Persisted locally so it builds up genuinely over time you spend using the app.
export function useReadingActivity() {
  const [activity, setActivity] = useState<ReadingActivity>(() => loadReadingActivity());
  const persistTimer = useRef<number | null>(null);

  const recordView = useCallback((symbol: string) => {
    setActivity((prev) => {
      const next = recordSymbolView(prev, symbol);
      if (persistTimer.current) window.clearTimeout(persistTimer.current);
      persistTimer.current = window.setTimeout(() => saveReadingActivity(next), PERSIST_DEBOUNCE_MS);
      return next;
    });
  }, []);

  return { activity, recordView };
}
