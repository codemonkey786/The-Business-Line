import type { NewsArticle } from "../lib/types";

interface Props {
  articles: NewsArticle[];
  onOpenArticle: (article: NewsArticle) => void;
}

// A real, continuously scrolling strip of genuine headlines — no synthetic copy, just the
// same live market news feed used elsewhere, presented like a newsroom ticker.
export function NewsTicker({ articles, onOpenArticle }: Props) {
  if (articles.length === 0) return null;
  const items = articles.slice(0, 15);

  const track = (
    <div className="flex items-center shrink-0">
      {items.map((a, i) => (
        <button
          key={`${a.id}-${i}`}
          onClick={() => onOpenArticle(a)}
          className="flex items-center gap-2 pr-8 text-[13px] text-[var(--color-ink-dim)] hover:text-[var(--color-ink)] transition-colors whitespace-nowrap"
        >
          <span className="mono-num text-[10px] font-bold text-[var(--color-amber)] uppercase tracking-wider shrink-0">{a.source}</span>
          {a.headline}
        </button>
      ))}
    </div>
  );

  return (
    <div className="flex items-center gap-2 flex-1 min-w-0 h-8 rounded-full bg-[var(--color-surface-2)] border border-[var(--color-border-soft)] pl-1.5 pr-4 overflow-hidden">
      <span className="flex items-center gap-1.5 shrink-0 pl-2.5 pr-3 h-6 rounded-full bg-[var(--color-down)]/15 mono-num text-[9.5px] font-bold tracking-wider" style={{ color: "var(--color-down)" }}>
        <span className="live-dot" style={{ background: "var(--color-down)" }} />
        LIVE
      </span>
      <div className="relative flex-1 min-w-0 h-full overflow-hidden">
        <div className="absolute inset-y-0 left-0 flex items-center news-ticker-track">
          {track}
          {track}
        </div>
      </div>
    </div>
  );
}
