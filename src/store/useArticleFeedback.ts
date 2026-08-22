import { useCallback, useState } from "react";
import { loadArticleFeedback, saveArticleFeedback, type ArticleFeedback, type FeedbackValue } from "../lib/articleFeedbackStorage";

// Your own real like/dislike on each article, persisted locally — tapping the same reaction
// again clears it (a genuine toggle, not a one-way vote).
export function useArticleFeedback() {
  const [feedback, setFeedbackState] = useState<ArticleFeedback>(() => loadArticleFeedback());

  const setFeedback = useCallback((articleId: number, value: FeedbackValue) => {
    setFeedbackState((prev) => {
      const next = { ...prev };
      if (next[articleId] === value) {
        delete next[articleId];
      } else {
        next[articleId] = value;
      }
      saveArticleFeedback(next);
      return next;
    });
  }, []);

  return { feedback, setFeedback };
}
