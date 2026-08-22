import { useState } from "react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { Check, Cloud, CloudOff, LogOut, Pencil, RefreshCw, User, X } from "lucide-react";
import { bandColorVar, type ScoreBand } from "../lib/creditScore";
import type { SyncStatus } from "../store/usePortfolio";
import type { Call } from "../lib/types";

interface Props {
  score: number;
  band: ScoreBand;
  winRate: number | null;
  calls: Call[];
  createdAt: number;
  user: SupabaseUser | null;
  syncStatus: SyncStatus;
  onSignOut: () => void;
  onOpenAuth: () => void;
  onClose: () => void;
  onUpdateDisplayName: (name: string) => Promise<void>;
}

function StatRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-[var(--color-border-soft)] last:border-0">
      <span className="text-sm text-[var(--color-ink-dim)]">{label}</span>
      <span className="mono-num text-sm font-bold" style={valueColor ? { color: valueColor } : undefined}>
        {value}
      </span>
    </div>
  );
}

export function ProfileModal({
  score,
  band,
  winRate,
  calls,
  createdAt,
  user,
  syncStatus,
  onSignOut,
  onOpenAuth,
  onClose,
  onUpdateDisplayName,
}: Props) {
  const color = bandColorVar(band);
  const displayName = (user?.user_metadata as { display_name?: string } | undefined)?.display_name;
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(displayName ?? "");
  const [savingName, setSavingName] = useState(false);

  async function saveName() {
    const trimmed = nameDraft.trim();
    if (!trimmed || savingName) return;
    setSavingName(true);
    try {
      await onUpdateDisplayName(trimmed);
      setEditingName(false);
    } catch {
      // sync status / errors are already surfaced elsewhere; leave the field open to retry
    } finally {
      setSavingName(false);
    }
  }

  const closed = calls.filter((c) => c.closedAt);
  const open = calls.filter((c) => !c.closedAt);
  const distinctSymbols = new Set(calls.map((c) => c.symbol)).size;

  const closedWithEdge = closed.map((c) => ({
    symbol: c.symbol,
    edge: ((c.exitPrice! - c.entryPrice) / c.entryPrice) * 100 * (c.direction === "UP" ? 1 : -1),
  }));
  const best = closedWithEdge.length > 0 ? closedWithEdge.reduce((a, b) => (b.edge > a.edge ? b : a)) : null;

  const memberSince = new Date(createdAt).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4" onClick={onClose}>
      <div className="board w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: `${color}22` }}>
              <User size={20} style={{ color }} />
            </div>
            <div>
              <p className="font-semibold text-[15px]">Your Profile</p>
              <p className="text-xs text-[var(--color-ink-faint)]">Member since {memberSince}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[var(--color-ink-faint)] hover:text-[var(--color-ink)] transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col items-center py-4 mb-2 rounded-xl" style={{ background: `${color}14` }}>
          <span className="mono-num text-4xl font-bold" style={{ color }}>
            {score.toFixed(0)}
          </span>
          <span className="text-sm font-bold mt-0.5" style={{ color }}>
            {band}
          </span>
        </div>

        <div>
          <StatRow label="All-Time Win Rate" value={winRate != null ? `${Math.round(winRate * 100)}%` : "—"} />
          <StatRow label="Total Calls" value={String(calls.length)} />
          <StatRow label="Active Calls" value={String(open.length)} />
          <StatRow label="Closed Calls" value={String(closed.length)} />
          <StatRow label="Stocks Backed" value={String(distinctSymbols)} />
          {best && (
            <StatRow
              label="Best Call"
              value={`${best.symbol} ${best.edge >= 0 ? "+" : ""}${best.edge.toFixed(2)}%`}
              valueColor={best.edge >= 0 ? "var(--color-up)" : "var(--color-down)"}
            />
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-[var(--color-border-soft)]">
          {user ? (
            <>
              <div className="mb-3">
                {editingName ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      autoFocus
                      value={nameDraft}
                      onChange={(e) => setNameDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveName();
                        if (e.key === "Escape") setEditingName(false);
                      }}
                      placeholder="Display name"
                      maxLength={40}
                      className="flex-1 min-w-0 text-sm font-medium bg-white/[0.06] rounded-lg px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-[var(--color-amber)]"
                    />
                    <button
                      onClick={saveName}
                      disabled={savingName || !nameDraft.trim()}
                      title="Save"
                      className="w-7 h-7 shrink-0 flex items-center justify-center rounded-lg bg-[var(--color-amber)] text-black disabled:opacity-50"
                    >
                      <Check size={13} />
                    </button>
                    <button
                      onClick={() => setEditingName(false)}
                      title="Cancel"
                      className="w-7 h-7 shrink-0 flex items-center justify-center rounded-lg bg-white/[0.06] text-[var(--color-ink-dim)]"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{displayName || user.email}</p>
                      {displayName && <p className="text-xs text-[var(--color-ink-faint)] truncate">{user.email}</p>}
                      <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-[var(--color-ink-faint)]">
                        {syncStatus === "syncing" ? (
                          <>
                            <RefreshCw size={11} className="animate-spin" /> Syncing…
                          </>
                        ) : syncStatus === "error" ? (
                          <>
                            <CloudOff size={11} className="text-[var(--color-down)]" /> Sync error
                          </>
                        ) : (
                          <>
                            <Cloud size={11} /> Synced to your account
                          </>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setNameDraft(displayName ?? "");
                        setEditingName(true);
                      }}
                      title="Edit display name"
                      className="w-7 h-7 shrink-0 flex items-center justify-center rounded-lg text-[var(--color-ink-faint)] hover:text-[var(--color-ink)] hover:bg-white/[0.06] transition-colors"
                    >
                      <Pencil size={13} />
                    </button>
                  </div>
                )}
              </div>
              <button
                onClick={onSignOut}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-semibold bg-white/[0.06] text-[var(--color-ink-dim)] hover:text-[var(--color-ink)] hover:bg-white/[0.1] transition-colors"
              >
                <LogOut size={14} />
                Sign Out
              </button>
            </>
          ) : (
            <button
              onClick={onOpenAuth}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-semibold text-black bg-[var(--color-amber)] hover:brightness-110 active:scale-[0.98] transition-all"
            >
              <Cloud size={14} />
              Sign in to sync across devices
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
