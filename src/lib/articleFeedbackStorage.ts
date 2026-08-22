const KEY = "creditfolio.articleFeedback.v1";

export type FeedbackValue = "like" | "dislike";
export type ArticleFeedback = Record<number, FeedbackValue>;

export function loadArticleFeedback(): ArticleFeedback {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ArticleFeedback) : {};
  } catch {
    return {};
  }
}

export function saveArticleFeedback(feedback: ArticleFeedback) {
  try {
    localStorage.setItem(KEY, JSON.stringify(feedback));
  } catch {
    // non-fatal — just re-collects from here next session
  }
}
