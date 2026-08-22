import { useState } from "react";
import { Mail, X } from "lucide-react";
import { hasSupabaseConfig } from "../lib/supabase";

interface Props {
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string) => Promise<void>;
  onSignInWithGoogle: () => Promise<void>;
  onClose: () => void;
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48">
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0124 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 01-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}

export function AuthModal({ onSignIn, onSignUp, onSignInWithGoogle, onClose }: Props) {
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmSent, setConfirmSent] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);

  async function submitGoogle() {
    setError(null);
    setGoogleSubmitting(true);
    try {
      await onSignInWithGoogle();
      // Supabase redirects the whole page to Google next — nothing else to do here.
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setGoogleSubmitting(false);
    }
  }

  if (!hasSupabaseConfig()) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4" onClick={onClose}>
        <div className="board w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-4">
            <p className="font-semibold text-[15px]">Accounts aren't set up yet</p>
            <button onClick={onClose} className="text-[var(--color-ink-faint)] hover:text-[var(--color-ink)] transition-colors">
              <X size={18} />
            </button>
          </div>
          <p className="text-sm text-[var(--color-ink-dim)] leading-relaxed">
            Create a free project at{" "}
            <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-[var(--color-amber)] hover:underline">
              supabase.com
            </a>
            , run <code className="mono-num text-xs bg-[var(--color-surface-2)] px-1.5 py-0.5">supabase/schema.sql</code> in its SQL
            editor, then add <code className="mono-num text-xs bg-[var(--color-surface-2)] px-1.5 py-0.5">VITE_SUPABASE_URL</code> and{" "}
            <code className="mono-num text-xs bg-[var(--color-surface-2)] px-1.5 py-0.5">VITE_SUPABASE_ANON_KEY</code> to{" "}
            <code className="mono-num text-xs bg-[var(--color-surface-2)] px-1.5 py-0.5">.env</code> and restart the dev server.
          </p>
        </div>
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "signUp") {
        await onSignUp(email, password);
        setConfirmSent(true);
      } else {
        await onSignIn(email, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4" onClick={onClose}>
      <div className="board w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full flex items-center justify-center bg-white/[0.06]">
              <Mail size={16} className="text-[var(--color-ink-dim)]" />
            </div>
            <p className="font-semibold text-[15px]">{mode === "signIn" ? "Sign In" : "Create Account"}</p>
          </div>
          <button onClick={onClose} className="text-[var(--color-ink-faint)] hover:text-[var(--color-ink)] transition-colors">
            <X size={18} />
          </button>
        </div>

        {confirmSent ? (
          <p className="text-sm text-[var(--color-ink-dim)] leading-relaxed">
            Check <span className="text-[var(--color-ink)] font-medium">{email}</span> for a confirmation link, then sign in once you've
            verified it.
          </p>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-3">
            <button
              type="button"
              onClick={submitGoogle}
              disabled={googleSubmitting || submitting}
              className="w-full flex items-center justify-center gap-2.5 py-2.5 rounded-lg text-sm font-semibold text-[#1f1f1f] bg-white hover:brightness-95 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              <GoogleIcon />
              {googleSubmitting ? "Redirecting…" : "Continue with Google"}
            </button>

            <div className="flex items-center gap-3 my-0.5">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-[11px] text-[var(--color-ink-faint)]">or</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            <input
              type="email"
              required
              autoFocus
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg bg-white/[0.06] text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] outline-none focus:bg-white/[0.09] transition-colors"
            />
            <input
              type="password"
              required
              minLength={6}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg bg-white/[0.06] text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] outline-none focus:bg-white/[0.09] transition-colors"
            />

            {error && <p className="text-xs text-[var(--color-down)]">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 rounded-lg text-sm font-semibold text-black bg-[var(--color-amber)] hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 mt-1"
            >
              {submitting ? "Please wait…" : mode === "signIn" ? "Sign In" : "Create Account"}
            </button>

            <button
              type="button"
              onClick={() => {
                setMode((m) => (m === "signIn" ? "signUp" : "signIn"));
                setError(null);
              }}
              className="text-xs text-[var(--color-ink-faint)] hover:text-[var(--color-ink)] transition-colors mt-1"
            >
              {mode === "signIn" ? "Need an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
