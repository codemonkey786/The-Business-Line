import { useState } from "react";
import { Check, Clock, Newspaper, Pencil, Trash2, X } from "lucide-react";
import type { ScoreBand } from "../lib/creditScore";
import { bandColorVar } from "../lib/creditScore";
import type { CompanyProfile, Post, PortfolioState, PricePoint, Quote } from "../lib/types";
import type { ScorePoint } from "../lib/scoreHistoryStorage";
import { ScoreHero } from "./ScoreHero";
import { PositionsTable } from "./PositionsTable";
import { ScoreStatsPanel } from "./ScoreStatsPanel";

function timeAgo(ms: number): string {
  const diffMs = Date.now() - ms;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// Your public byline — used as the "authorName" on any article you publish (instead of your
// raw account email) and as your name on the leaderboard. Surfaced here front-and-center
// rather than buried in the profile popup, since this is where publishing itself happens.
function DisplayNameEditor({
  displayName,
  userEmail,
  onUpdateDisplayName,
}: {
  displayName?: string;
  userEmail?: string;
  onUpdateDisplayName: (name: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(displayName ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    const trimmed = draft.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    try {
      await onUpdateDisplayName(trimmed);
      setEditing(false);
    } catch {
      // no separate error surface here — the field just stays open so they can retry
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="board mt-4 p-5">
      <p className="term-label text-[11px] text-[var(--color-ink-faint)] tracking-widest mb-1">Display Name</p>
      {editing ? (
        <div className="flex items-center gap-1.5 mt-2">
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") setEditing(false);
            }}
            placeholder="Your name"
            maxLength={40}
            className="flex-1 min-w-0 text-sm font-medium bg-white/[0.06] rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-[var(--color-amber)]"
          />
          <button
            onClick={save}
            disabled={saving || !draft.trim()}
            title="Save"
            className="w-9 h-9 shrink-0 flex items-center justify-center rounded-lg bg-[var(--color-amber)] text-black disabled:opacity-50"
          >
            <Check size={15} />
          </button>
          <button
            onClick={() => setEditing(false)}
            title="Cancel"
            className="w-9 h-9 shrink-0 flex items-center justify-center rounded-lg bg-white/[0.06] text-[var(--color-ink-dim)]"
          >
            <X size={15} />
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2 mt-1.5">
          <div className="min-w-0">
            <p className="text-[15px] font-semibold truncate">{displayName || userEmail || "Unnamed"}</p>
            <p className="text-xs text-[var(--color-ink-faint)] mt-0.5">
              {displayName ? "Shown on articles you publish and the leaderboard, instead of your email." : "Set a name to publish articles under it instead of your email."}
            </p>
          </div>
          <button
            onClick={() => {
              setDraft(displayName ?? "");
              setEditing(true);
            }}
            title="Edit display name"
            className="w-9 h-9 shrink-0 flex items-center justify-center rounded-lg text-[var(--color-ink-faint)] hover:text-[var(--color-ink)] hover:bg-white/[0.06] transition-colors"
          >
            <Pencil size={15} />
          </button>
        </div>
      )}
    </div>
  );
}

function PostRow({
  post,
  quote,
  onOpen,
  onDelete,
  onApprove,
  onEdit,
}: {
  post: Post;
  quote?: Quote;
  onOpen: (post: Post) => void;
  onDelete: () => void;
  onApprove?: () => void;
  onEdit?: () => void;
}) {
  const positive = (quote?.percentChange ?? 0) >= 0;
  return (
    <div className="flex items-center gap-3 px-5 py-3 border-b border-[var(--color-border-soft)] last:border-0">
      <button
        onClick={() => onOpen(post)}
        className="group flex items-center gap-3 min-w-0 flex-1 text-left hover:opacity-80 transition-opacity"
      >
        <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-[var(--color-surface-2)]">
          {post.imageUrl && (
            <img
              src={post.imageUrl}
              alt=""
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold leading-snug truncate">{post.headline}</p>
          <div className="flex items-center gap-1.5 mt-1 text-[11px] text-[var(--color-ink-faint)] flex-wrap">
            <span className="font-bold text-[var(--color-amber)]">{post.authorName}</span>
            <span>·</span>
            <span>{timeAgo(post.createdAt)}</span>
            {post.status === "pending" && (
              <>
                <span>·</span>
                <span className="flex items-center gap-1 font-bold text-[var(--color-amber)] uppercase tracking-wider">
                  <Clock size={9} />
                  Pending
                </span>
              </>
            )}
            {post.symbol && (
              <>
                <span>·</span>
                <span className="ticker-pill">{post.symbol}</span>
                {quote && (
                  <span className={`mono-num font-bold ${positive ? "text-[var(--color-up)]" : "text-[var(--color-down)]"}`}>
                    {positive ? "+" : ""}
                    {quote.percentChange.toFixed(2)}%
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      </button>
      <div className="flex items-center gap-2 shrink-0">
        {onApprove && (
          <button
            onClick={onApprove}
            className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-up)] hover:brightness-125 transition-all px-3 py-1.5 rounded-full bg-[var(--color-up)]/10"
          >
            <Check size={12} />
            Approve
          </button>
        )}
        {onEdit && (
          <button
            onClick={onEdit}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg text-[var(--color-ink-faint)] hover:text-[var(--color-ink)] hover:bg-white/[0.06] transition-colors"
          >
            <Pencil size={12} />
            Edit
          </button>
        )}
        <button
          onClick={onDelete}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg text-[var(--color-ink-faint)] hover:text-[var(--color-down)] hover:bg-[var(--color-down)]/10 transition-colors"
        >
          <Trash2 size={12} />
          Delete
        </button>
      </div>
    </div>
  );
}

interface Props {
  score: number;
  band: ScoreBand;
  delta?: number;
  scoreHistory?: ScorePoint[];
  isAdmin: boolean;
  posts: Post[];
  userId?: string;
  quotes: Record<string, Quote>;
  onDeletePost: (id: string) => Promise<void>;
  onApprovePost: (id: string) => Promise<void>;
  onOpenPost: (post: Post) => void;
  onEditPost?: (post: Post) => void;
  displayName?: string;
  userEmail?: string;
  onUpdateDisplayName?: (name: string) => Promise<void>;
  portfolio: PortfolioState;
  profiles: Record<string, CompanyProfile>;
  betas: Record<string, number>;
  winRate: number | null;
  priceHistory: Record<string, PricePoint[]>;
  scoreProgressHistory: ScorePoint[];
  scoreProgressDailyHistory: ScorePoint[];
}

export function ProfilePage({
  score,
  band,
  delta,
  scoreHistory,
  isAdmin,
  posts,
  userId,
  quotes,
  onDeletePost,
  onApprovePost,
  onOpenPost,
  onEditPost,
  displayName,
  userEmail,
  onUpdateDisplayName,
  portfolio,
  profiles,
  betas,
  winRate,
  priceHistory,
  scoreProgressHistory,
  scoreProgressDailyHistory,
}: Props) {
  const myPosts = posts.filter((p) => p.authorId === userId);
  const pendingReview = posts.filter((p) => p.status === "pending" && p.authorId !== userId);

  return (
    <div>
      <ScoreHero score={score} band={band} delta={delta} scoreHistory={scoreHistory} />
      <ScoreStatsPanel history={scoreProgressHistory} dailyHistory={scoreProgressDailyHistory} bandColor={bandColorVar(band)} />

      {onUpdateDisplayName && (
        <DisplayNameEditor displayName={displayName} userEmail={userEmail} onUpdateDisplayName={onUpdateDisplayName} />
      )}

      <PositionsTable state={portfolio} quotes={quotes} profiles={profiles} betas={betas} winRate={winRate} status="open" history={priceHistory} />
      <PositionsTable state={portfolio} quotes={quotes} profiles={profiles} betas={betas} winRate={winRate} status="closed" />

      {isAdmin ? (
        <>
          {pendingReview.length > 0 && (
            <div className="board mt-4 overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-3 border-b border-[var(--color-border)]">
                <Clock size={15} className="text-[var(--color-amber)]" />
                <span className="display-bold text-lg tracking-tight">Pending Review</span>
                <span className="ml-auto mono-num text-xs text-[var(--color-ink-faint)]">{pendingReview.length} total</span>
              </div>
              <div className="flex flex-col">
                {pendingReview.map((post) => (
                  <PostRow
                    key={post.id}
                    post={post}
                    quote={post.symbol ? quotes[post.symbol] : undefined}
                    onOpen={onOpenPost}
                    onDelete={() => onDeletePost(post.id)}
                    onApprove={() => onApprovePost(post.id)}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="board mt-4 overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-[var(--color-border)]">
              <Newspaper size={15} className="text-[var(--color-amber)]" />
              <span className="display-bold text-lg tracking-tight">Your Posts</span>
              <span className="ml-auto mono-num text-xs text-[var(--color-ink-faint)]">{myPosts.length} total</span>
            </div>

            {myPosts.length === 0 ? (
              <p className="text-sm text-[var(--color-ink-faint)] px-5 py-6">You haven't posted anything yet.</p>
            ) : (
              <div className="flex flex-col">
                {myPosts.map((post) => (
                  <PostRow
                    key={post.id}
                    post={post}
                    quote={post.symbol ? quotes[post.symbol] : undefined}
                    onOpen={onOpenPost}
                    onDelete={() => onDeletePost(post.id)}
                    onEdit={onEditPost ? () => onEditPost(post) : undefined}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="board mt-4 p-6 text-center text-sm text-[var(--color-ink-faint)]">
          Only admins can post articles. Ask the site owner if you'd like posting access.
        </div>
      )}
    </div>
  );
}
