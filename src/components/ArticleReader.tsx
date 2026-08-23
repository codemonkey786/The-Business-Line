import { ArrowLeft, ExternalLink } from "lucide-react";
import type { FeedbackValue, NewsArticle } from "../lib/types";
import { ArticleFeedbackButtons } from "./ArticleList";

interface Props {
  article: NewsArticle;
  feedback?: FeedbackValue;
  onSetFeedback?: (articleId: number, value: FeedbackValue) => void;
  likeCount?: number;
  dislikeCount?: number;
  onBack: () => void;
}

// Real, non-fabricated content only: the headline/image/summary Finnhub actually gives us,
// shown as a native in-app page instead of popping a new tab. The full original article stays
// on the publisher's own site — we don't have rights to reproduce their copyrighted body text
// here, so "Continue reading" links out for that rather than faking it locally.
export function ArticleReader({ article, feedback, onSetFeedback, likeCount, dislikeCount, onBack }: Props) {
  const published = new Date(article.datetime * 1000).toLocaleString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className="max-w-2xl mx-auto">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-[var(--color-ink-faint)] hover:text-[var(--color-ink)] transition-colors mb-6"
      >
        <ArrowLeft size={15} />
        Back
      </button>

      <div className="flex items-center gap-2 text-xs text-[var(--color-ink-faint)] mb-3">
        <span className="font-bold text-[var(--color-amber)] uppercase tracking-wider">{article.source}</span>
        <span>·</span>
        <span>{published}</span>
      </div>
      <h1 className="display-bold text-3xl leading-tight mb-4">{article.headline}</h1>

      {article.image && (
        <img
          src={article.image}
          alt=""
          className="w-full max-h-96 object-cover rounded-xl mb-4"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      )}

      {article.summary && <p className="text-[15px] text-[var(--color-ink-dim)] leading-relaxed whitespace-pre-wrap">{article.summary}</p>}

      <div className="flex items-center justify-between gap-4 mt-6 pt-6 border-t border-[var(--color-border-soft)]">
        <ArticleFeedbackButtons
          articleId={article.id}
          value={feedback}
          onSetFeedback={onSetFeedback}
          likeCount={likeCount}
          dislikeCount={dislikeCount}
        />
        <a
          href={article.url}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 text-sm font-semibold text-[var(--color-amber)] hover:brightness-110 transition-all shrink-0"
        >
          Continue reading on {article.source}
          <ExternalLink size={14} />
        </a>
      </div>
    </div>
  );
}
