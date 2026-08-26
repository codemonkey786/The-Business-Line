import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { castVote, createPoll as createPollApi, fetchLatestPoll, fetchPollVotes } from "../lib/polls";
import type { DailyPoll } from "../lib/types";

const REFRESH_MS = 30_000;

// Real, shared votes on the owner's latest daily poll — same "poll everyone, refresh
// periodically" shape as useArticleFeedback/usePostFeedback, just one poll instead of many.
export function useDailyPoll(user: User | null) {
  const [poll, setPoll] = useState<DailyPoll | null>(null);
  const [voteCounts, setVoteCounts] = useState<number[]>([]);
  const [myVote, setMyVote] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const latest = await fetchLatestPoll();
    setPoll(latest);
    if (!latest) {
      setVoteCounts([]);
      setMyVote(null);
      setLoading(false);
      return;
    }
    const votes = await fetchPollVotes(latest.id);
    const counts = new Array(latest.options.length).fill(0);
    let mine: number | null = null;
    for (const v of votes) {
      if (v.optionIndex >= 0 && v.optionIndex < counts.length) counts[v.optionIndex] += 1;
      if (user && v.userId === user.id) mine = v.optionIndex;
    }
    setVoteCounts(counts);
    setMyVote(mine);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, REFRESH_MS);
    return () => clearInterval(interval);
  }, [refresh]);

  const vote = useCallback(
    async (optionIndex: number) => {
      if (!user || !poll) return;
      const prev = myVote;
      if (prev === optionIndex) return;
      setMyVote(optionIndex);
      setVoteCounts((counts) => {
        const next = [...counts];
        if (prev != null) next[prev] = Math.max(0, next[prev] - 1);
        next[optionIndex] = (next[optionIndex] ?? 0) + 1;
        return next;
      });
      await castVote(poll.id, user.id, optionIndex);
    },
    [user, poll, myVote]
  );

  const createPoll = useCallback(
    async (question: string, options: string[]) => {
      if (!user) return;
      const created = await createPollApi(question, options, user.id);
      setPoll(created);
      setVoteCounts(new Array(created.options.length).fill(0));
      setMyVote(null);
    },
    [user]
  );

  return { poll, voteCounts, myVote, loading, vote, createPoll };
}
