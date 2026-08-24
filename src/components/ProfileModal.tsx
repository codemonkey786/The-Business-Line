import { useRef, useState } from "react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { Camera, Check, Cloud, CloudOff, LogOut, Pencil, RefreshCw, Shield, User, X } from "lucide-react";
import { bandColorVar, type ScoreBand } from "../lib/creditScore";
import { MiniCreditGauge } from "./MiniCreditGauge";
import type { SyncStatus } from "../store/usePortfolio";
import type { Call } from "../lib/types";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

interface Props {
  score: number;
  band: ScoreBand;
  winRate: number | null;
  calls: Call[];
  createdAt: number;
  user: SupabaseUser | null;
  avatarUrl?: string;
  syncStatus: SyncStatus;
  onSignOut: () => void;
  onOpenAuth: () => void;
  onClose: () => void;
  onUpdateDisplayName: (name: string) => Promise<void>;
  onUpdateAvatar?: (file: File) => Promise<void>;
  isOwner?: boolean;
  onOpenAdminManager?: () => void;
}

function StatTile({ label, value, valueColor, wide }: { label: string; value: string; valueColor?: string; wide?: boolean }) {
  return (
    <div className={`rounded-lg border border-[var(--color-border-soft)] bg-white/[0.02] px-3 py-2.5 ${wide ? "col-span-2" : ""}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-ink-faint)]">{label}</p>
      <p className="mono-num text-[15px] leading-tight mt-1" style={valueColor ? { color: valueColor } : undefined}>
        {value}
      </p>
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
  avatarUrl,
  syncStatus,
  onSignOut,
  onOpenAuth,
  onClose,
  onUpdateDisplayName,
  onUpdateAvatar,
  isOwner,
  onOpenAdminManager,
}: Props) {
  const color = bandColorVar(band);
  const displayName = (user?.user_metadata as { display_name?: string } | undefined)?.display_name;
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(displayName ?? "");
  const [savingName, setSavingName] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

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

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !onUpdateAvatar) return;
    if (!file.type.startsWith("image/")) {
      setAvatarError("Please choose an image file.");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setAvatarError("Image is too large — 5MB max.");
      return;
    }
    setAvatarError(null);
    setUploadingAvatar(true);
    try {
      await onUpdateAvatar(file);
    } catch {
      setAvatarError("Upload failed — try again.");
    } finally {
      setUploadingAvatar(false);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4" onClick={onClose}>
      <div className="board w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
        <div className={`flex items-center justify-between ${avatarError ? "mb-2" : "mb-5"}`}>
          <div className="flex items-center gap-3">
            {onUpdateAvatar ? (
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
                title="Change profile picture"
                className="relative w-11 h-11 shrink-0 rounded-full flex items-center justify-center overflow-hidden group focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--color-surface)] focus:ring-[var(--color-amber)]"
                style={{ background: `${color}22` }}
              >
                {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> : <User size={20} style={{ color }} />}
                <span
                  className={`absolute inset-0 flex items-center justify-center bg-black/60 transition-opacity ${
                    uploadingAvatar ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  }`}
                >
                  {uploadingAvatar ? <RefreshCw size={14} className="animate-spin text-white" /> : <Camera size={14} className="text-white" />}
                </span>
                <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
              </button>
            ) : (
              <div className="w-11 h-11 shrink-0 rounded-full flex items-center justify-center overflow-hidden" style={{ background: `${color}22` }}>
                {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> : <User size={20} style={{ color }} />}
              </div>
            )}
            <div>
              <p className="font-semibold text-[15px]">Your Profile</p>
              <p className="text-xs text-[var(--color-ink-faint)]">Member since {memberSince}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[var(--color-ink-faint)] hover:text-[var(--color-ink)] transition-colors">
            <X size={18} />
          </button>
        </div>
        {avatarError && <p className="text-xs text-[var(--color-down)] mb-5">{avatarError}</p>}

        <div
          className="flex flex-col items-center pt-6 pb-5 mb-5 rounded-2xl border border-[var(--color-border-soft)]"
          style={{ background: `${color}12`, boxShadow: `0 0 50px -18px ${color}66, inset 0 0 40px -26px ${color}40` }}
        >
          <MiniCreditGauge score={score} size={176} />
          <span className="display-bold text-[40px] leading-none mt-2" style={{ color, textShadow: `0 0 26px ${color}80` }}>
            {score.toFixed(0)}
          </span>
          <span className="text-xs font-bold uppercase tracking-wider mt-1.5" style={{ color }}>
            {band}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <StatTile label="All-Time Win Rate" value={winRate != null ? `${Math.round(winRate * 100)}%` : "—"} />
          <StatTile label="Stocks Backed" value={String(distinctSymbols)} />
          <StatTile label="Active Calls" value={String(open.length)} />
          <StatTile label="Closed Calls" value={String(closed.length)} />
          {best && (
            <StatTile
              label="Best Call"
              value={`${best.symbol} ${best.edge >= 0 ? "+" : ""}${best.edge.toFixed(2)}%`}
              valueColor={best.edge >= 0 ? "var(--color-up)" : "var(--color-down)"}
              wide
            />
          )}
          <StatTile label="Total Calls" value={String(calls.length)} wide={!best} />
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
              {isOwner && onOpenAdminManager && (
                <button
                  onClick={onOpenAdminManager}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-semibold bg-[var(--color-amber)]/15 text-[var(--color-amber)] hover:bg-[var(--color-amber)]/25 transition-colors mb-2"
                >
                  <Shield size={14} />
                  Manage Admins
                </button>
              )}
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
