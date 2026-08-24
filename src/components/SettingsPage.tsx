import { useRef, useState } from "react";
import { Camera, Check, Cloud, CloudOff, LogOut, Pencil, RefreshCw, Search, User, X } from "lucide-react";
import { bandColorVar, type ScoreBand } from "../lib/creditScore";
import type { SyncStatus } from "../store/usePortfolio";
import type { PortfolioState } from "../lib/types";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--color-border-soft)] bg-white/[0.02] px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-ink-faint)]">{label}</p>
      <p className="mono-num text-[15px] leading-tight mt-1">{value}</p>
    </div>
  );
}

// A labeled value with an inline pencil-to-edit affordance — same pattern for both the display
// name and email fields below, just swapping the value/placeholder/save handler.
function EditableField({
  label,
  value,
  placeholder,
  helper,
  onSave,
}: {
  label: string;
  value?: string;
  placeholder: string;
  helper?: string;
  onSave: (next: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const trimmed = draft.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    setError(null);
    try {
      await onSave(trimmed);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="py-3 border-b border-[var(--color-border-soft)] last:border-0">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-ink-faint)] mb-1.5">{label}</p>
      {editing ? (
        <div className="flex items-center gap-1.5">
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") setEditing(false);
            }}
            placeholder={placeholder}
            maxLength={80}
            className="flex-1 min-w-0 text-sm font-medium bg-white/[0.06] rounded-lg px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-[var(--color-amber)]"
          />
          <button
            onClick={save}
            disabled={saving || !draft.trim()}
            title="Save"
            className="w-8 h-8 shrink-0 flex items-center justify-center rounded-lg bg-[var(--color-amber)] text-black disabled:opacity-50"
          >
            <Check size={14} />
          </button>
          <button
            onClick={() => {
              setEditing(false);
              setError(null);
            }}
            title="Cancel"
            className="w-8 h-8 shrink-0 flex items-center justify-center rounded-lg bg-white/[0.06] text-[var(--color-ink-dim)]"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium truncate">{value || placeholder}</p>
          <button
            onClick={() => {
              setDraft(value ?? "");
              setEditing(true);
            }}
            title={`Edit ${label.toLowerCase()}`}
            className="w-8 h-8 shrink-0 flex items-center justify-center rounded-lg text-[var(--color-ink-faint)] hover:text-[var(--color-ink)] hover:bg-white/[0.06] transition-colors"
          >
            <Pencil size={14} />
          </button>
        </div>
      )}
      {error && <p className="text-xs text-[var(--color-down)] mt-1.5">{error}</p>}
      {!editing && helper && <p className="text-xs text-[var(--color-ink-faint)] mt-0.5">{helper}</p>}
    </div>
  );
}

interface Props {
  band: ScoreBand;
  avatarUrl?: string;
  onUpdateAvatar?: (file: File) => Promise<void>;
  portfolio: PortfolioState;
  displayName?: string;
  onUpdateDisplayName?: (name: string) => Promise<void>;
  userEmail?: string;
  onUpdateEmail?: (email: string) => Promise<void>;
  syncStatus: SyncStatus;
  signedIn: boolean;
  onOpenAuth?: () => void;
  isOwner?: boolean;
  onOpenAdminManager?: () => void;
  onSignOut?: () => void;
}

// The account-management surface — profile picture, name, email, sync status, admin tools,
// sign out — deliberately with none of the score/trading content that lives on the Profile
// tab instead: no gauge, no positions, no score history. Settings is about the account itself.
export function SettingsPage({
  band,
  avatarUrl,
  onUpdateAvatar,
  portfolio,
  displayName,
  onUpdateDisplayName,
  userEmail,
  onUpdateEmail,
  syncStatus,
  signedIn,
  onOpenAuth,
  isOwner,
  onOpenAdminManager,
  onSignOut,
}: Props) {
  const color = bandColorVar(band);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [emailConfirmSent, setEmailConfirmSent] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const distinctSymbols = new Set(portfolio.calls.map((c) => c.symbol)).size;
  const activeSymbols = portfolio.calls.filter((c) => !c.closedAt).length;

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

  return (
    <div>
      <div className="board p-6 flex flex-col items-center text-center">
        {onUpdateAvatar ? (
          <button
            onClick={() => avatarInputRef.current?.click()}
            disabled={uploadingAvatar}
            title="Change profile picture"
            className="relative w-24 h-24 shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--color-surface)] focus:ring-[var(--color-amber)]"
          >
            <span
              className="absolute inset-0 rounded-full overflow-hidden flex items-center justify-center"
              style={{ background: `${color}22`, boxShadow: `0 0 0 3px ${color}55, 0 0 24px -4px ${color}90` }}
            >
              {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> : <User size={40} style={{ color }} />}
            </span>
            <span
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full flex items-center justify-center bg-[var(--color-amber)] text-black"
              style={{ boxShadow: "0 0 0 3px var(--color-surface)" }}
            >
              {uploadingAvatar ? <RefreshCw size={15} className="animate-spin" /> : <Camera size={15} />}
            </span>
            <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
          </button>
        ) : (
          <div
            className="w-24 h-24 shrink-0 rounded-full flex items-center justify-center overflow-hidden"
            style={{ background: `${color}22`, boxShadow: `0 0 0 3px ${color}55, 0 0 24px -4px ${color}90` }}
          >
            {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> : <User size={40} style={{ color }} />}
          </div>
        )}
        {avatarError && <p className="text-xs text-[var(--color-down)] mt-3">{avatarError}</p>}
        <p className="font-semibold text-[15px] mt-3">{displayName || userEmail || "Your Account"}</p>
        {onUpdateAvatar && <p className="text-xs text-[var(--color-ink-faint)] mt-0.5">Tap your photo to change it</p>}
      </div>

      {(onUpdateDisplayName || onUpdateEmail) && (
        <div className="board mt-4 p-5">
          {onUpdateDisplayName && (
            <EditableField
              label="Display Name"
              value={displayName}
              placeholder="Set your name"
              helper="Shown on articles you publish and the leaderboard, instead of your email."
              onSave={onUpdateDisplayName}
            />
          )}
          {onUpdateEmail && (
            <EditableField
              label="Email"
              value={userEmail}
              placeholder="Set your email"
              helper={emailConfirmSent ? "Check your new inbox for a confirmation link — your email won't change until you click it." : undefined}
              onSave={async (next) => {
                await onUpdateEmail(next);
                setEmailConfirmSent(true);
              }}
            />
          )}
        </div>
      )}

      <div className="board mt-4 p-5">
        <div className="grid grid-cols-2 gap-2 mb-4">
          <StatTile label="Stocks Backed" value={String(distinctSymbols)} />
          <StatTile label="Active Stocks Backed" value={String(activeSymbols)} />
        </div>

        {signedIn ? (
          <>
            {userEmail && (
              <div className="flex items-center gap-1.5 mb-3 text-[11px] text-[var(--color-ink-faint)]">
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
            )}
            {isOwner && onOpenAdminManager && (
              <button
                onClick={onOpenAdminManager}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-semibold bg-white/[0.06] text-[var(--color-ink-dim)] hover:text-[var(--color-ink)] hover:bg-white/[0.1] transition-colors mb-2"
              >
                <Search size={14} />
                Search Users
              </button>
            )}
            {onSignOut && (
              <button
                onClick={onSignOut}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-semibold bg-white/[0.06] text-[var(--color-ink-dim)] hover:text-[var(--color-ink)] hover:bg-white/[0.1] transition-colors"
              >
                <LogOut size={14} />
                Sign Out
              </button>
            )}
          </>
        ) : (
          onOpenAuth && (
            <button
              onClick={onOpenAuth}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-semibold text-black bg-[var(--color-amber)] hover:brightness-110 active:scale-[0.98] transition-all"
            >
              <Cloud size={14} />
              Sign in to sync across devices
            </button>
          )
        )}
      </div>
    </div>
  );
}
