import { useMemo, useState } from "react";
import { Search, Shield, X } from "lucide-react";
import type { Profile } from "../lib/types";
import { OWNER_USER_ID } from "../lib/admin";

interface Props {
  profiles: Profile[];
  loading: boolean;
  onSetAdmin: (userId: string, value: boolean) => Promise<void>;
  onClose: () => void;
}

export function AdminManager({ profiles, loading, onSetAdmin, onClose }: Props) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter((p) => p.email.toLowerCase().includes(q));
  }, [profiles, query]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4" onClick={onClose}>
      <div className="board w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full flex items-center justify-center bg-[var(--color-amber)]/15">
              <Shield size={16} className="text-[var(--color-amber)]" />
            </div>
            <p className="font-semibold text-[15px]">Manage Admins</p>
          </div>
          <button onClick={onClose} className="text-[var(--color-ink-faint)] hover:text-[var(--color-ink)] transition-colors">
            <X size={18} />
          </button>
        </div>

        <p className="text-xs text-[var(--color-ink-faint)] mb-3 leading-relaxed">
          Admins can post articles that show up in everyone's feed. Only people who've signed in at least once show up here.
        </p>

        {!loading && profiles.length > 0 && (
          <div className="flex items-center gap-2 bg-[var(--color-surface-2)] border border-[var(--color-border-soft)] rounded-full px-3.5 py-2 mb-3">
            <Search size={14} className="text-[var(--color-ink-faint)] shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by email…"
              className="bg-transparent outline-none text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] w-full"
            />
          </div>
        )}

        {loading ? (
          <p className="text-sm text-[var(--color-ink-faint)] py-4 text-center">Loading…</p>
        ) : profiles.length === 0 ? (
          <p className="text-sm text-[var(--color-ink-faint)] py-4 text-center">Nobody else has signed in yet.</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-[var(--color-ink-faint)] py-4 text-center">No one matches "{query}".</p>
        ) : (
          <div className="flex flex-col max-h-80 overflow-y-auto -mx-1">
            {filtered.map((p) => {
              const isOwner = p.userId === OWNER_USER_ID;
              return (
                <div key={p.userId} className="flex items-center justify-between gap-3 px-1 py-2.5 border-b border-[var(--color-border-soft)] last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{p.email}</p>
                    {isOwner && <p className="text-[10px] font-bold text-[var(--color-amber)] uppercase tracking-wider">Owner</p>}
                  </div>
                  <button
                    onClick={() => onSetAdmin(p.userId, !p.isAdmin)}
                    disabled={isOwner}
                    className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors disabled:opacity-40 ${
                      p.isAdmin
                        ? "bg-[var(--color-amber)] text-black"
                        : "bg-white/[0.06] text-[var(--color-ink-dim)] hover:bg-white/[0.1]"
                    }`}
                  >
                    {p.isAdmin ? "Admin" : "Make Admin"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
