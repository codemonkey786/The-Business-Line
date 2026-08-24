import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, hasSupabaseConfig } from "../lib/supabase";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(hasSupabaseConfig());

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Returns whether that signup logged you straight in (true) or actually needs email
  // confirmation first (false) — driven entirely by the project's Auth settings, not anything
  // client-side, so this reflects reality instead of always assuming confirmation is required.
  async function signUp(email: string, password: string) {
    if (!supabase) throw new Error("Supabase isn't configured yet.");
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return Boolean(data.session);
  }

  async function signIn(email: string, password: string) {
    if (!supabase) throw new Error("Supabase isn't configured yet.");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function signInWithGoogle() {
    if (!supabase) throw new Error("Supabase isn't configured yet.");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) throw error;
  }

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
  }

  // Stores your chosen display name on the real Supabase account (user_metadata) so it's
  // there the next time you sign in on any device — not just kept in local state.
  async function updateDisplayName(name: string) {
    if (!supabase) throw new Error("Supabase isn't configured yet.");
    const { data, error } = await supabase.auth.updateUser({ data: { display_name: name } });
    if (error) throw error;
    if (data.user) setSession((prev) => (prev ? { ...prev, user: data.user } : prev));
  }

  // Same pattern as updateDisplayName — stores the uploaded avatar's public URL on the account
  // itself so it's there next time you sign in anywhere, not just this session.
  async function updateAvatar(url: string) {
    if (!supabase) throw new Error("Supabase isn't configured yet.");
    const { data, error } = await supabase.auth.updateUser({ data: { avatar_url: url } });
    if (error) throw error;
    if (data.user) setSession((prev) => (prev ? { ...prev, user: data.user } : prev));
  }

  // Changing your email requires confirming it — Supabase emails a confirmation link to the
  // new address and the account's real email doesn't change until you click it, same
  // "check your email" pattern as signing up with confirmation required. Session is left
  // untouched here on purpose: showing the new address as if it were already active before
  // it's actually confirmed would be lying about the account's real state.
  async function updateEmail(email: string) {
    if (!supabase) throw new Error("Supabase isn't configured yet.");
    const { error } = await supabase.auth.updateUser({ email });
    if (error) throw error;
  }

  return { session, user: session?.user ?? null, loading, signUp, signIn, signInWithGoogle, signOut, updateDisplayName, updateAvatar, updateEmail };
}
