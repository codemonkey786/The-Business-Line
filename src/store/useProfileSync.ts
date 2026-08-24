import { useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";

const SYNC_DEBOUNCE_MS = 2000;

// Keeps this user's own row in the public profiles table (display name + current credit score)
// up to date, debounced — that row is what everyone else's leaderboard reads to rank you for
// real, instead of the old placeholder that could only ever show "you".
export function useProfileSync(userId: string | null | undefined, displayName: string | undefined, score: number) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPushed = useRef<{ name?: string; score?: number }>({});

  useEffect(() => {
    if (!userId || !supabase) return;
    const rounded = Math.round(score * 100) / 100;
    if (lastPushed.current.name === displayName && lastPushed.current.score === rounded) return;

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const { error } = await supabase!
        .from("profiles")
        .update({ display_name: displayName ?? null, score: rounded })
        .eq("user_id", userId);
      if (!error) lastPushed.current = { name: displayName, score: rounded };
    }, SYNC_DEBOUNCE_MS);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [userId, displayName, score]);
}
