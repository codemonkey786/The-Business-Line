import { ThumbsDown, ThumbsUp } from "lucide-react";
import type { NewsArticle, FeedbackValue } from "../lib/types";

function timeAgo(unixSeconds: number): string {
  const diffMs = Date.now() - unixSeconds * 1000;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function ArticleMeta({ article, className = "" }: { article: NewsArticle; className?: string }) {
  return (
    <div className={`flex items-center gap-1.5 text-[11px] text-[var(--color-ink-faint)] ${className}`}>
      <span className="font-bold">{article.source}</span>
      <span>·</span>
      <span>{timeAgo(article.datetime)}</span>
    </div>
  );
}

interface FeedbackProps {
  articleId: number;
  value?: FeedbackValue;
  onSetFeedback?: (articleId: number, value: FeedbackValue) => void;
  likeCount?: number;
  dislikeCount?: number;
  light?: boolean;
}

// Small like/dislike control embedded in article tiles that are themselves one big clickable
// tile — stops the click from also opening the article. Like counts are real and shared,
// visible to everyone including whoever liked it. Dislike counts are also real and shared, but
// hidden from whoever did the disliking so you're not just watching your own number tick up.
export function ArticleFeedbackButtons({ articleId, value, onSetFeedback, likeCount, dislikeCount, light }: FeedbackProps) {
  if (!onSetFeedback) return null;
  const base = "w-6 h-6 flex items-center justify-center rounded-full transition-colors shrink-0";
  const idle = light ? "bg-white/15 text-white/80 hover:bg-white/25 hover:text-white" : "bg-white/[0.06] text-[var(--color-ink-faint)] hover:text-[var(--color-ink)]";
  const countClass = `mono-num text-[10px] font-bold ${light ? "text-white/70" : "text-[var(--color-ink-faint)]"}`;
  const showLikeCount = (likeCount ?? 0) > 0;
  const showDislikeCount = value !== "dislike" && (dislikeCount ?? 0) > 0;
  return (
    <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.preventDefault()}>
      <div className="flex items-center gap-1">
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onSetFeedback(articleId, "like");
          }}
          title="Like"
          className={`${base} ${value === "like" ? "bg-[var(--color-up)] text-[#04150a]" : idle}`}
        >
          <ThumbsUp size={12} />
        </button>
        {showLikeCount && <span className={countClass}>{likeCount}</span>}
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onSetFeedback(articleId, "dislike");
          }}
          title="Dislike"
          className={`${base} ${value === "dislike" ? "bg-[var(--color-down)] text-[#1a0303]" : idle}`}
        >
          <ThumbsDown size={12} />
        </button>
        {showDislikeCount && <span className={countClass}>{dislikeCount}</span>}
      </div>
    </div>
  );
}

export function ArticleHeroTile({
  article,
  feedback,
  onSetFeedback,
  likeCount,
  dislikeCount,
  onOpen,
}: {
  article: NewsArticle;
  feedback?: FeedbackValue;
  onSetFeedback?: (articleId: number, value: FeedbackValue) => void;
  likeCount?: number;
  dislikeCount?: number;
  onOpen: (article: NewsArticle) => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(article)}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onOpen(article)}
      className="group relative rounded-2xl overflow-hidden bg-[var(--color-surface-2)] block w-full h-full min-h-[280px] text-left cursor-pointer"
    >
      {article.image && (
        <img
          src={article.image}
          alt=""
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-5">
        <span className="mono-num text-[10px] font-bold text-[var(--color-amber)] uppercase tracking-wider">Top Story</span>
        <p className="display-bold text-2xl leading-tight mt-1.5 text-white">{article.headline}</p>
        <div className="flex items-center justify-between gap-3 mt-3">
          <ArticleMeta article={article} className="text-white/70" />
          <ArticleFeedbackButtons
            articleId={article.id}
            value={feedback}
            onSetFeedback={onSetFeedback}
            likeCount={likeCount}
            dislikeCount={dislikeCount}
            light
          />
        </div>
      </div>
    </div>
  );
}

export function ArticleSideTile({
  article,
  feedback,
  onSetFeedback,
  likeCount,
  dislikeCount,
  onOpen,
}: {
  article: NewsArticle;
  feedback?: FeedbackValue;
  onSetFeedback?: (articleId: number, value: FeedbackValue) => void;
  likeCount?: number;
  dislikeCount?: number;
  onOpen: (article: NewsArticle) => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(article)}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onOpen(article)}
      className="group flex gap-3 p-3 rounded-xl hover:bg-white/[0.04] transition-colors w-full text-left cursor-pointer"
    >
      <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0 bg-[var(--color-surface-2)]">
        {article.image && (
          <img
            src={article.image}
            alt=""
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        )}
      </div>
      <div className="min-w-0 flex flex-col justify-center">
        <p className="text-sm font-bold leading-snug line-clamp-3">{article.headline}</p>
        <div className="flex items-center justify-between gap-3 mt-1.5">
          <ArticleMeta article={article} />
          <ArticleFeedbackButtons
            articleId={article.id}
            value={feedback}
            onSetFeedback={onSetFeedback}
            likeCount={likeCount}
            dislikeCount={dislikeCount}
          />
        </div>
      </div>
    </div>
  );
}

export function ArticleCompactTile({
  article,
  feedback,
  onSetFeedback,
  likeCount,
  dislikeCount,
  onOpen,
}: {
  article: NewsArticle;
  feedback?: FeedbackValue;
  onSetFeedback?: (articleId: number, value: FeedbackValue) => void;
  likeCount?: number;
  dislikeCount?: number;
  onOpen: (article: NewsArticle) => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(article)}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onOpen(article)}
      className="group block rounded-xl overflow-hidden bg-[var(--color-surface-2)] w-full text-left cursor-pointer"
    >
      <div className="h-28 overflow-hidden bg-[var(--color-surface-2)]">
        {article.image && (
          <img
            src={article.image}
            alt=""
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        )}
      </div>
      <div className="p-3">
        <p className="text-[13px] font-bold leading-snug line-clamp-2">{article.headline}</p>
        <div className="flex items-center justify-between gap-2 mt-1.5">
          <ArticleMeta article={article} />
          <ArticleFeedbackButtons
            articleId={article.id}
            value={feedback}
            onSetFeedback={onSetFeedback}
            likeCount={likeCount}
            dislikeCount={dislikeCount}
          />
        </div>
      </div>
    </div>
  );
}
