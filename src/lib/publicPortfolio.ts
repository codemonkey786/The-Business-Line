import { supabase } from "./supabase";
import type { PortfolioState } from "./types";

// Reads another signed-in user's synced portfolio row — used for the public profile view
// reachable by clicking a leaderboard entry. Requires the "Anyone signed in can read
// portfolios" RLS policy (see supabase/schema.sql); without it this just returns null for
// anyone but the row's own owner.
export async function fetchPortfolioState(userId: string): Promise<PortfolioState | null> {
  if (!supabase) return null;
  const { data } = await supabase.from("portfolios").select("state").eq("user_id", userId).maybeSingle();
  return (data?.state as PortfolioState | undefined) ?? null;
}
