import { useCallback, useEffect, useRef, useState } from "react";
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
const MIN_CHANGE_TO_RECORD = 0.005; // filters float noise, not real movement

// Two things drive a recorded point: a genuine timer (so a flat stretch — market closed, no
// open calls — still gets honest history instead of a gap), and every real score change as it
// happens. The score itself moves on every live quote tick for an open call, so recording on
// change too is what makes this chart read with the same fine-grained, ticking detail as the
// real price chart it's derived from, instead of flattening a fast real move into one straight
// segment between 20-second samples. Kept at two resolutions, same as price history: a dense
// rolling 24h window, and one real point per calendar day for the long ranges.
export function useScoreHistory(score: number) {
  const [history, setHistory] = useState<ScorePoint[]>(() => loadScoreHistory());
  const [dailyHistory, setDailyHistory] = useState<ScorePoint[]>(() => loadDailyScoreHistory());
  const scoreRef = useRef(score);
  const lastRecordedScore = useRef<number | null>(null);
  const persistTimer = useRef<number | null>(null);
  const persistDailyTimer = useRef<number | null>(null);

  const record = useCallback(() => {
    if (!Number.isFinite(scoreRef.current)) return;
    lastRecordedScore.current = scoreRef.current;
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
  }, []);

  useEffect(() => {
    scoreRef.current = score;
    if (lastRecordedScore.current !== null && Math.abs(score - lastRecordedScore.current) > MIN_CHANGE_TO_RECORD) {
      record();
    }
  }, [score, record]);

  useEffect(() => {
    record();
    const interval = window.setInterval(record, SAMPLE_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [record]);

  const reset = () => {
    clearScoreHistory();
    setHistory([]);
    setDailyHistory([]);
  };

  return { history, dailyHistory, reset };
}
