import { supabase } from "./supabase";
import type { FeedbackValue } from "./types";

export interface PostFeedbackRow {
  postId: string;
  userId: string;
  value: FeedbackValue;
}

// Real, shared reactions on staff posts across everyone signed in — same shape as
// article_feedback, just keyed by the post's uuid instead of Finnhub's numeric article id.
export async function fetchAllPostFeedback(): Promise<PostFeedbackRow[]> {
  if (!supabase) return [];
  const { data } = await supabase.from("post_feedback").select("post_id, user_id, value");
  return (data ?? []).map((r) => ({ postId: r.post_id, userId: r.user_id, value: r.value as FeedbackValue }));
}

export async function upsertPostFeedback(postId: string, userId: string, value: FeedbackValue) {
  if (!supabase) return;
  await supabase.from("post_feedback").upsert({ post_id: postId, user_id: userId, value }, { onConflict: "post_id,user_id" });
}

export async function deletePostFeedback(postId: string, userId: string) {
  if (!supabase) return;
  await supabase.from("post_feedback").delete().eq("post_id", postId).eq("user_id", userId);
}
