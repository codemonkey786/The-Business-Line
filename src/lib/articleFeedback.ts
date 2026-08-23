import { supabase } from "./supabase";
import type { FeedbackValue } from "./types";

export interface ArticleFeedbackRow {
  articleId: number;
  userId: string;
  value: FeedbackValue;
}

// Real, shared reactions across everyone signed in — a dislike count needs to reflect what
// other people actually clicked, not just this browser, so this reads the whole table rather
// than a local cache.
export async function fetchAllArticleFeedback(): Promise<ArticleFeedbackRow[]> {
  if (!supabase) return [];
  const { data } = await supabase.from("article_feedback").select("article_id, user_id, value");
  return (data ?? []).map((r) => ({ articleId: r.article_id, userId: r.user_id, value: r.value as FeedbackValue }));
}

export async function upsertArticleFeedback(articleId: number, userId: string, value: FeedbackValue) {
  if (!supabase) return;
  await supabase.from("article_feedback").upsert({ article_id: articleId, user_id: userId, value }, { onConflict: "article_id,user_id" });
}

export async function deleteArticleFeedback(articleId: number, userId: string) {
  if (!supabase) return;
  await supabase.from("article_feedback").delete().eq("article_id", articleId).eq("user_id", userId);
}
