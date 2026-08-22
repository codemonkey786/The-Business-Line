import { useEffect, useState } from "react";

const KEY = "creditfolio.scoreBaseline.v1";

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function useScoreDelta(currentScore: number | null): number | undefined {
  const [baseline, setBaseline] = useState<number | null>(null);

  useEffect(() => {
    if (currentScore == null) return;
    try {
      const raw = localStorage.getItem(KEY);
      const parsed = raw ? (JSON.parse(raw) as { day: string; score: number }) : null;
      if (parsed && parsed.day === todayKey()) {
        setBaseline(parsed.score);
      } else {
        localStorage.setItem(KEY, JSON.stringify({ day: todayKey(), score: currentScore }));
        setBaseline(currentScore);
      }
    } catch {
      setBaseline(currentScore);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentScore != null]);

  if (currentScore == null || baseline == null) return undefined;
  return currentScore - baseline;
}
