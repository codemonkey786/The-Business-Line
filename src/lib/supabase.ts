import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const hasSupabaseConfig = () => Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

// Only construct a real client when configured — callers must check hasSupabaseConfig()
// first, same pattern as the Finnhub key check.
export const supabase = hasSupabaseConfig() ? createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!) : null;
