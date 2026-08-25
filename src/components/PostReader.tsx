import { ArrowLeft, Clock } from "lucide-react";
import type { FeedbackValue, Post, PricePoint, Quote } from "../lib/types";
import { PriceChart } from "./PriceChart";
import { parsePostBody, splitTextAndUrls } from "../lib/postContent";
import { PostFeedbackButtons } from "./MosaicFeed";

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

interface Props {
  post: Post;
  quote?: Quote;
  history: PricePoint[];
  feedback?: FeedbackValue;
  onSetFeedback?: (postId: string, value: FeedbackValue) => void;
  likeCount?: number;
  dislikeCount?: number;
  onBack: () => void;
}

// Staff posts are the site's own original content, so this shows the full thing natively —
// no external link needed, unlike real third-party news. Just title, then text, on the page
// itself rather than boxed in a card. Deleting your own post lives on the Profile page, not
// buried in the reading view.
export function PostReader({ post, quote, history, feedback, onSetFeedback, likeCount, dislikeCount, onBack }: Props) {
  return (
    <div className="max-w-2xl mx-auto">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-[var(--color-ink-faint)] hover:text-[var(--color-ink)] transition-colors mb-6"
      >
        <ArrowLeft size={15} />
        Back
      </button>

      <div className="flex items-center gap-2">
        <span className="mono-num text-[10px] font-bold text-[var(--color-amber)] uppercase tracking-wider">From The Business Line</span>
        {post.status === "pending" && (
          <span className="flex items-center gap-1 text-[10px] font-bold text-[var(--color-down)] uppercase tracking-wider">
            <Clock size={10} />
            Pending Approval — not public yet
          </span>
        )}
      </div>
      <h1 className="display-bold text-3xl leading-tight mt-1.5 mb-2">{post.headline}</h1>
      <p className="text-xs text-[var(--color-ink-faint)] mb-6">
        {post.authorName} · {timeAgo(post.createdAt)}
      </p>

      {post.symbol && (
        <div className="rounded-xl bg-[var(--color-surface-2)] p-3 mb-6">
          <div className="flex items-center justify-between mb-1.5">
            <span className="ticker-pill">{post.symbol}</span>
            {quote && (
              <span
                className={`mono-num text-xs font-bold ${(quote.percentChange ?? 0) >= 0 ? "text-[var(--color-up)]" : "text-[var(--color-down)]"}`}
              >
                {quote.price.toFixed(2)} {(quote.percentChange ?? 0) >= 0 ? "+" : ""}
                {quote.percentChange.toFixed(2)}%
              </span>
            )}
          </div>
          <PriceChart data={history} positive={(quote?.percentChange ?? 0) >= 0} height={60} />
        </div>
      )}

      {post.imageUrl && (
        <img
          src={post.imageUrl}
          alt=""
          className="w-full rounded-xl mb-6 max-h-96 object-cover"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      )}

      {parsePostBody(post.body).map((block, i) =>
        block.type === "image" ? (
          <img
            key={i}
            src={block.url}
            alt=""
            loading="lazy"
            decoding="async"
            className={
              block.align === "center"
                ? "w-full rounded-xl my-6 max-h-96 object-cover"
                : `max-w-[45%] max-h-72 rounded-xl mb-4 object-cover ${
                    block.align === "left" ? "float-left mr-5" : "float-right ml-5"
                  }`
            }
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <p key={i} className="text-[15px] text-[var(--color-ink)] leading-relaxed whitespace-pre-wrap mb-4 last:mb-0">
            {block.text}
          </p>
        )
      )}
      <div className="clear-both" />

      <div className="flex items-center gap-4 mt-6 pt-6 border-t border-[var(--color-border-soft)]">
        <PostFeedbackButtons postId={post.id} value={feedback} onSetFeedback={onSetFeedback} likeCount={likeCount} dislikeCount={dislikeCount} />
      </div>

      {post.credits && (
        <div className="mt-8 pt-5 border-t border-[var(--color-border-soft)]">
          <p className="term-label text-[10px] tracking-widest text-[var(--color-ink-faint)] mb-2">Sources &amp; Credits</p>
          <div className="flex flex-col gap-1">
            {post.credits
              .split("\n")
              .map((line) => line.trim())
              .filter(Boolean)
              .map((line, i) => (
                <p key={i} className="text-xs text-[var(--color-ink-faint)] leading-relaxed">
                  {splitTextAndUrls(line).map((seg, j) =>
                    seg.isUrl ? (
                      <a
                        key={j}
                        href={seg.text}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[var(--color-amber)] hover:underline break-all"
                      >
                        {seg.text}
                      </a>
                    ) : (
                      <span key={j}>{seg.text}</span>
                    )
                  )}
                </p>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
