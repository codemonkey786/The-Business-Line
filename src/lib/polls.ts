import { supabase } from "./supabase";
import type { DailyPoll } from "./types";

// "Today's poll" is just whichever poll is newest — there's no separate active/expired
// concept, the owner posting a new one is what retires the last.
export async function fetchLatestPoll(): Promise<DailyPoll | null> {
  if (!supabase) return null;
  const { data } = await supabase
    .from("daily_polls")
    .select("id, question, options, created_by, created_at")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    question: data.question,
    options: data.options as string[],
    createdBy: data.created_by,
    createdAt: new Date(data.created_at).getTime(),
  };
}

export async function createPoll(question: string, options: string[], userId: string): Promise<DailyPoll> {
  if (!supabase) throw new Error("Not connected.");
  const { data, error } = await supabase
    .from("daily_polls")
    .insert({ question, options, created_by: userId })
    .select("id, question, options, created_by, created_at")
    .single();
  if (error) throw error;
  return {
    id: data.id,
    question: data.question,
    options: data.options as string[],
    createdBy: data.created_by,
    createdAt: new Date(data.created_at).getTime(),
  };
}

export interface PollVoteRow {
  pollId: string;
  userId: string;
  optionIndex: number;
}

export async function fetchPollVotes(pollId: string): Promise<PollVoteRow[]> {
  if (!supabase) return [];
  const { data } = await supabase.from("poll_votes").select("poll_id, user_id, option_index").eq("poll_id", pollId);
  return (data ?? []).map((r) => ({ pollId: r.poll_id, userId: r.user_id, optionIndex: r.option_index }));
}

export async function castVote(pollId: string, userId: string, optionIndex: number) {
  if (!supabase) return;
  await supabase.from("poll_votes").upsert({ poll_id: pollId, user_id: userId, option_index: optionIndex }, { onConflict: "poll_id,user_id" });
}
