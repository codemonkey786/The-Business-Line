import { useCallback, useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { deletePostFeedback, fetchAllPostFeedback, upsertPostFeedback } from "../lib/postFeedback";
import type { FeedbackValue, PostFeedback } from "../lib/types";

const REFRESH_MS = 45_000;

// Same real, shared like/dislike as useArticleFeedback, just for staff posts (keyed by uuid).
export function usePostFeedback(user: User | null) {
  const [feedback, setFeedbackState] = useState<PostFeedback>({});
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [dislikeCounts, setDislikeCounts] = useState<Record<string, number>>({});
  const userRef = useRef(user);
  userRef.current = user;

  const refresh = useCallback(async () => {
    const rows = await fetchAllPostFeedback();
    const mine: PostFeedback = {};
    const likes: Record<string, number> = {};
    const dislikes: Record<string, number> = {};
    for (const row of rows) {
      if (row.value === "like") likes[row.postId] = (likes[row.postId] ?? 0) + 1;
      if (row.value === "dislike") dislikes[row.postId] = (dislikes[row.postId] ?? 0) + 1;
      if (userRef.current && row.userId === userRef.current.id) mine[row.postId] = row.value;
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
    async (postId: string, value: FeedbackValue) => {
      const activeUser = userRef.current;
      if (!activeUser) return;
      const prevValue = feedback[postId];
      const clearing = prevValue === value;

      setFeedbackState((prev) => {
        const next = { ...prev };
        if (clearing) delete next[postId];
        else next[postId] = value;
        return next;
      });
      setLikeCounts((prev) => {
        const next = { ...prev };
        if (prevValue === "like") next[postId] = Math.max(0, (next[postId] ?? 1) - 1);
        if (!clearing && value === "like") next[postId] = (next[postId] ?? 0) + 1;
        return next;
      });
      setDislikeCounts((prev) => {
        const next = { ...prev };
        if (prevValue === "dislike") next[postId] = Math.max(0, (next[postId] ?? 1) - 1);
        if (!clearing && value === "dislike") next[postId] = (next[postId] ?? 0) + 1;
        return next;
      });

      if (clearing) await deletePostFeedback(postId, activeUser.id);
      else await upsertPostFeedback(postId, activeUser.id, value);
    },
    [feedback]
  );

  return { feedback, likeCounts, dislikeCounts, setFeedback };
}
