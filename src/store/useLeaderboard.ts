import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Profile } from "../lib/types";

// The real, cross-user "Top Credit Scores" ranking — reads every signed-in user's public
// profiles row (display name + score, kept current by useProfileSync). RLS on that table only
// allows authenticated reads, so this stays disabled for guests.
export function useLeaderboard(enabled: boolean) {
  const [entries, setEntries] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!supabase || !enabled) return;
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("user_id, email, display_name, avatar_url, score, is_admin")
      .not("score", "is", null)
      .order("score", { ascending: false })
      .limit(50);
    setEntries(
      (data ?? []).map((p) => ({
        userId: p.user_id,
        email: p.email,
        isAdmin: p.is_admin,
        displayName: p.display_name ?? undefined,
        avatarUrl: p.avatar_url ?? undefined,
        score: p.score ?? undefined,
      }))
    );
    setLoading(false);
  }, [enabled]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { entries, loading, refresh };
}
