import { useCallback, useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { deleteArticleFeedback, fetchAllArticleFeedback, upsertArticleFeedback } from "../lib/articleFeedback";
import type { ArticleFeedback, FeedbackValue } from "../lib/types";

const REFRESH_MS = 45_000;

// Your own real like/dislike on each article, plus real shared counts across everyone signed
// in — persisted in Supabase, not just this browser. Tapping the same reaction again clears it
// (a genuine toggle, not a one-way vote). Like counts show to everyone, including yourself;
// dislike counts hide from whoever did the disliking (see ArticleFeedbackButtons).
export function useArticleFeedback(user: User | null) {
  const [feedback, setFeedbackState] = useState<ArticleFeedback>({});
  const [likeCounts, setLikeCounts] = useState<Record<number, number>>({});
  const [dislikeCounts, setDislikeCounts] = useState<Record<number, number>>({});
  const userRef = useRef(user);
  userRef.current = user;

  const refresh = useCallback(async () => {
    const rows = await fetchAllArticleFeedback();
    const mine: ArticleFeedback = {};
    const likes: Record<number, number> = {};
    const dislikes: Record<number, number> = {};
    for (const row of rows) {
      if (row.value === "like") likes[row.articleId] = (likes[row.articleId] ?? 0) + 1;
      if (row.value === "dislike") dislikes[row.articleId] = (dislikes[row.articleId] ?? 0) + 1;
      if (userRef.current && row.userId === userRef.current.id) mine[row.articleId] = row.value;
    }
    setFeedbackState(mine);
    setLikeCounts(likes);
    setDislikeCounts(dislikes);
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, REFRESH_MS);
    return () => clearInterval(interval);
  }, [refresh, user]);

  const setFeedback = useCallback(
    async (articleId: number, value: FeedbackValue) => {
      const activeUser = userRef.current;
      if (!activeUser) return;
      const prevValue = feedback[articleId];
      const clearing = prevValue === value;

      // Optimistic local update — the next periodic refresh reconciles with the real totals.
      setFeedbackState((prev) => {
        const next = { ...prev };
        if (clearing) delete next[articleId];
        else next[articleId] = value;
        return next;
      });
      setLikeCounts((prev) => {
        const next = { ...prev };
        if (prevValue === "like") next[articleId] = Math.max(0, (next[articleId] ?? 1) - 1);
        if (!clearing && value === "like") next[articleId] = (next[articleId] ?? 0) + 1;
        return next;
      });
      setDislikeCounts((prev) => {
        const next = { ...prev };
        if (prevValue === "dislike") next[articleId] = Math.max(0, (next[articleId] ?? 1) - 1);
        if (!clearing && value === "dislike") next[articleId] = (next[articleId] ?? 0) + 1;
        return next;
      });

      if (clearing) await deleteArticleFeedback(articleId, activeUser.id);
      else await upsertArticleFeedback(articleId, activeUser.id, value);
    },
    [feedback]
  );

  return { feedback, likeCounts, dislikeCounts, setFeedback };
}
