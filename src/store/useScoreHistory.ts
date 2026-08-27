import { useEffect, useRef, useState } from "react";
import {
  appendScorePoint,
  clearScoreHistory,
  loadDailyScoreHistory,
  loadScoreHistory,
  saveDailyScoreHistory,
  saveScoreHistory,
  upsertDailyScorePoint,
  type ScorePoint,
} from "../lib/scoreHistoryStorage";

const SAMPLE_INTERVAL_MS = 20 * 1000;
const PERSIST_DEBOUNCE_MS = 2000;

// A real snapshot on a genuine timer, independent of whether the score's value actually
// changed between samples — a flat stretch (e.g. markets closed) is still real, honest
// history, not something to skip recording. Kept at two resolutions, same as price history:
// a dense rolling 24h window, and one real point per calendar day for the long ranges.
export function useScoreHistory(score: number) {
  const [history, setHistory] = useState<ScorePoint[]>(() => loadScoreHistory());
  const [dailyHistory, setDailyHistory] = useState<ScorePoint[]>(() => loadDailyScoreHistory());
  const scoreRef = useRef(score);
  const persistTimer = useRef<number | null>(null);
  const persistDailyTimer = useRef<number | null>(null);

  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  useEffect(() => {
    function record() {
      if (!Number.isFinite(scoreRef.current)) return;
      const point = { t: Date.now(), score: scoreRef.current };
      setHistory((prev) => {
        const next = appendScorePoint(prev, point);
        if (persistTimer.current) window.clearTimeout(persistTimer.current);
        persistTimer.current = window.setTimeout(() => saveScoreHistory(next), PERSIST_DEBOUNCE_MS);
        return next;
      });
      setDailyHistory((prev) => {
        const next = upsertDailyScorePoint(prev, point);
        if (persistDailyTimer.current) window.clearTimeout(persistDailyTimer.current);
        persistDailyTimer.current = window.setTimeout(() => saveDailyScoreHistory(next), PERSIST_DEBOUNCE_MS);
        return next;
      });
    }
    record();
    const interval = window.setInterval(record, SAMPLE_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, []);

  const reset = () => {
    clearScoreHistory();
    setHistory([]);
    setDailyHistory([]);
  };

  return { history, dailyHistory, reset };
}
