import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { OWNER_USER_ID } from "../lib/admin";

// Every signed-in user gets a profiles row (created here on first load) so the owner has
// someone to actually grant admin to — the owner account itself always counts as an admin
// even before that row exists or catches up, mirroring the OR clause in the RLS policies.
export function useAdmin(user: User | null) {
  const [isAdminFlag, setIsAdminFlag] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !supabase) {
      setIsAdminFlag(false);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);

    (async () => {
      const { data } = await supabase!.from("profiles").select("is_admin").eq("user_id", user.id).maybeSingle();
      if (cancelled) return;

      if (!data) {
        await supabase!.from("profiles").insert({ user_id: user.id, email: user.email ?? "" });
        if (user.id === OWNER_USER_ID) {
          await supabase!.from("profiles").update({ is_admin: true }).eq("user_id", user.id);
          if (!cancelled) setIsAdminFlag(true);
        } else if (!cancelled) {
          setIsAdminFlag(false);
        }
      } else {
        if (user.id === OWNER_USER_ID && !data.is_admin) {
          await supabase!.from("profiles").update({ is_admin: true }).eq("user_id", user.id);
          if (!cancelled) setIsAdminFlag(true);
        } else if (!cancelled) {
          setIsAdminFlag(Boolean(data.is_admin));
        }
      }
      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const isOwner = user?.id === OWNER_USER_ID;
  return { isAdmin: isOwner || isAdminFlag, isOwner, loading };
}
