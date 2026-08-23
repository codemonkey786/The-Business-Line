import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Profile } from "../lib/types";

// Owner-only: the full list of everyone who's ever signed in (i.e. has a profiles row), so the
// owner can grant/revoke admin. RLS only lets the actual update through when it's the owner
// making it — this hook doesn't itself enforce that, the database does.
export function useAdminManagement(enabled: boolean) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!supabase || !enabled) return;
    setLoading(true);
    const { data } = await supabase.from("profiles").select("user_id, email, is_admin").order("email");
    setProfiles((data ?? []).map((p) => ({ userId: p.user_id, email: p.email, isAdmin: p.is_admin })));
    setLoading(false);
  }, [enabled]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const setAdmin = useCallback(
    async (userId: string, value: boolean) => {
      if (!supabase) return;
      const { error } = await supabase.from("profiles").update({ is_admin: value }).eq("user_id", userId);
      if (!error) {
        setProfiles((prev) => prev.map((p) => (p.userId === userId ? { ...p, isAdmin: value } : p)));
      }
    },
    []
  );

  return { profiles, loading, setAdmin, refresh };
}
