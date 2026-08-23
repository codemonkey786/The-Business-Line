// The one account that can grant/revoke admin status — mirrors the hardcoded check in the
// Supabase RLS policies (supabase/schema.sql), not just a client-side convenience check.
export const OWNER_USER_ID = "ecb6cf68-a5e8-4eeb-a752-7d472a2e0c0a";
