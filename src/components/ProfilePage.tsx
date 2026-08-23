import { Check, Clock, Newspaper, Trash2 } from "lucide-react";
import type { ScoreBand } from "../lib/creditScore";
import type { Post, Quote } from "../lib/types";
import type { ScorePoint } from "../lib/scoreHistoryStorage";
import { ScoreHero } from "./ScoreHero";

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

function PostRow({
  post,
  quote,
  onOpen,
  onDelete,
  onApprove,
}: {
  post: Post;
  quote?: Quote;
  onOpen: (post: Post) => void;
  onDelete: () => void;
  onApprove?: () => void;
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
            <span className="font-bold text-[var(--color-amber)]">The Business Line</span>
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
        <button
          onClick={onDelete}
          className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-down)] hover:brightness-125 transition-all px-3 py-1.5 rounded-full bg-[var(--color-down)]/10"
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
}: Props) {
  const myPosts = posts.filter((p) => p.authorId === userId);
  const pendingReview = posts.filter((p) => p.status === "pending" && p.authorId !== userId);

  return (
    <div>
      <ScoreHero score={score} band={band} delta={delta} scoreHistory={scoreHistory} />

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
