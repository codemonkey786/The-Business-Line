import { ArticleCompactTile, ArticleHeroTile, ArticleSideTile, ArticleMeta, ArticleFeedbackButtons } from "./ArticleList";
import { CompanyLogo } from "./CompanyLogo";
import { PriceChart } from "./PriceChart";
import type { ArticleFeedback, CompanyProfile, FeedbackValue, NewsArticle, Post, PricePoint, Quote } from "../lib/types";

interface StockTileProps {
  symbol: string;
  quote?: Quote;
  profile?: CompanyProfile;
  history: PricePoint[];
  onView: () => void;
  isPosition?: boolean;
}

function StockSideTile({ symbol, quote, profile, history, onView, isPosition }: StockTileProps) {
  const positive = (quote?.change ?? 0) >= 0;
  const color = positive ? "var(--color-up)" : "var(--color-down)";
  return (
    <button onClick={onView} className="group flex flex-col gap-2 p-3 rounded-xl hover:bg-white/[0.04] transition-colors text-left w-full">
      {isPosition && <span className="mono-num text-[10px] font-bold text-[var(--color-amber)] uppercase tracking-wider">Your Investment</span>}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <CompanyLogo symbol={symbol} logoUrl={profile?.logo} size={26} />
          <div className="min-w-0">
            <p className="text-sm font-bold truncate">{profile?.name || symbol}</p>
            <span className="ticker-pill">{symbol}</span>
          </div>
        </div>
        {quote && (
          <div className="text-right shrink-0">
            <p className="mono-num text-sm font-bold">{quote.price.toFixed(2)}</p>
            <p className="mono-num text-xs font-bold" style={{ color }}>
              {positive ? "+" : ""}
              {quote.percentChange.toFixed(2)}%
            </p>
          </div>
        )}
      </div>
      <PriceChart data={history} positive={positive} height={44} />
    </button>
  );
}

function StockCompactTile({ symbol, quote, profile, onView, isPosition }: Omit<StockTileProps, "history">) {
  const positive = (quote?.change ?? 0) >= 0;
  return (
    <button
      onClick={onView}
      className="group flex flex-col gap-2 p-3 rounded-xl bg-[var(--color-surface-2)] hover:bg-white/[0.06] transition-colors text-left w-full"
    >
      {isPosition && <span className="mono-num text-[9px] font-bold text-[var(--color-amber)] uppercase tracking-wider">Your Investment</span>}
      <div className="flex items-center gap-2.5">
        <CompanyLogo symbol={symbol} logoUrl={profile?.logo} size={28} />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold truncate">{profile?.name || symbol}</p>
          {quote ? (
            <p className={`mono-num text-xs font-bold ${positive ? "text-[var(--color-up)]" : "text-[var(--color-down)]"}`}>
              {quote.price.toFixed(2)} {positive ? "+" : ""}
              {quote.percentChange.toFixed(2)}%
            </p>
          ) : (
            <span className="inline-block h-3 w-14 skeleton rounded mt-0.5" />
          )}
        </div>
      </div>
    </button>
  );
}

function StockRow({ symbol, quote, profile, onView, isPosition }: Omit<StockTileProps, "history">) {
  const positive = (quote?.change ?? 0) >= 0;
  return (
    <button
      onClick={onView}
      className="flex items-center gap-3 px-5 py-4 border-b border-[var(--color-border-soft)] last:border-0 hover:bg-white/[0.03] transition-colors text-left w-full"
    >
      <CompanyLogo symbol={symbol} logoUrl={profile?.logo} size={32} />
      <div className="min-w-0 flex-1">
        {isPosition && (
          <span className="mono-num text-[9px] font-bold text-[var(--color-amber)] uppercase tracking-wider block">Your Investment</span>
        )}
        <p className="text-sm font-semibold truncate">{profile?.name || symbol}</p>
        <span className="ticker-pill">{symbol}</span>
      </div>
      {quote && (
        <div className="text-right shrink-0">
          <p className="mono-num text-sm font-bold">{quote.price.toFixed(2)}</p>
          <p className={`mono-num text-xs font-bold ${positive ? "text-[var(--color-up)]" : "text-[var(--color-down)]"}`}>
            {positive ? "+" : ""}
            {quote.percentChange.toFixed(2)}%
          </p>
        </div>
      )}
    </button>
  );
}

function MoverRow({ symbol, quote, profile, onView }: { symbol: string; quote: Quote; profile?: CompanyProfile; onView: () => void }) {
  const positive = quote.percentChange >= 0;
  return (
    <button onClick={onView} className="flex items-center gap-2.5 py-1.5 rounded-lg hover:bg-white/[0.04] transition-colors text-left w-full">
      <CompanyLogo symbol={symbol} logoUrl={profile?.logo} size={22} />
      <span className="text-[13px] font-bold truncate flex-1 min-w-0">{symbol}</span>
      <span className="mono-num text-[12.5px] text-[var(--color-ink-dim)]">{quote.price.toFixed(2)}</span>
      <span
        className={`mono-num text-[12.5px] font-bold w-[58px] text-right ${positive ? "text-[var(--color-up)]" : "text-[var(--color-down)]"}`}
      >
        {positive ? "+" : ""}
        {quote.percentChange.toFixed(2)}%
      </span>
    </button>
  );
}

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

// Staff posts get their own tile shapes (same slots as article tiles: hero/side/compact/tail)
// so they can genuinely take a hero article's place in the feed, not just live in a separate
// section — the more posts exist, the more of the feed they naturally occupy.
function PostHeroTile({ post, onOpen }: { post: Post; onOpen: (post: Post) => void }) {
  return (
    <button
      onClick={() => onOpen(post)}
      className="group relative rounded-2xl overflow-hidden bg-[var(--color-surface-2)] block w-full h-full min-h-[280px] text-left"
    >
      {post.imageUrl && (
        <img
          src={post.imageUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-5">
        <span className="mono-num text-[10px] font-bold text-[var(--color-amber)] uppercase tracking-wider">From The Business Line</span>
        <p className="display-bold text-2xl leading-tight mt-1.5 text-white">{post.headline}</p>
        <div className="flex items-center justify-between gap-3 mt-3">
          <span className="text-[11px] text-white/70">
            {post.authorName} · {timeAgo(post.createdAt)}
          </span>
          {post.symbol && <span className="ticker-pill">{post.symbol}</span>}
        </div>
      </div>
    </button>
  );
}

function PostSideTile({ post, onOpen }: { post: Post; onOpen: (post: Post) => void }) {
  return (
    <button onClick={() => onOpen(post)} className="group flex gap-3 p-3 rounded-xl hover:bg-white/[0.04] transition-colors w-full text-left">
      <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0 bg-[var(--color-surface-2)]">
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
      <div className="min-w-0 flex flex-col justify-center">
        <p className="text-sm font-bold leading-snug line-clamp-3">{post.headline}</p>
        <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-[var(--color-ink-faint)]">
          <span className="font-bold text-[var(--color-amber)]">The Business Line</span>
          <span>·</span>
          <span>{timeAgo(post.createdAt)}</span>
        </div>
      </div>
    </button>
  );
}

function PostCompactTile({ post, onOpen }: { post: Post; onOpen: (post: Post) => void }) {
  return (
    <button onClick={() => onOpen(post)} className="group block rounded-xl overflow-hidden bg-[var(--color-surface-2)] w-full text-left">
      <div className="h-28 overflow-hidden bg-[var(--color-surface-2)]">
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
      <div className="p-3">
        {post.symbol && <span className="ticker-pill mb-1.5 inline-block">{post.symbol}</span>}
        <p className="text-[13px] font-bold leading-snug line-clamp-2">{post.headline}</p>
        <p className="text-[11px] text-[var(--color-ink-faint)] mt-1.5">
          <span className="font-bold text-[var(--color-amber)]">The Business Line</span> · {timeAgo(post.createdAt)}
        </p>
      </div>
    </button>
  );
}

type FeedItem = { kind: "article"; article: NewsArticle } | { kind: "post"; post: Post };

interface Props {
  title: string;
  articles: NewsArticle[];
  posts: Post[];
  stockSymbols: string[];
  positionSymbols?: string[];
  quotes: Record<string, Quote>;
  profiles: Record<string, CompanyProfile>;
  history: Record<string, PricePoint[]>;
  onView: (symbol: string) => void;
  onOpenArticle: (article: NewsArticle) => void;
  onOpenPost: (post: Post) => void;
  articleFeedback?: ArticleFeedback;
  onSetArticleFeedback?: (articleId: number, value: FeedbackValue) => void;
  articleLikeCounts?: Record<number, number>;
  articleDislikeCounts?: Record<number, number>;
}

// A single mosaic grid genuinely mixing stock tiles, real news, and staff posts — not
// separate sections. Posts lead the pool ahead of external articles, so as more posts get
// published (and the gradual external-source filter kicks in), the feed naturally shifts from
// mostly external news toward mostly — eventually entirely — staff content.
export function MosaicFeed({
  title,
  articles,
  posts,
  stockSymbols,
  positionSymbols = [],
  quotes,
  profiles,
  history,
  onView,
  onOpenArticle,
  onOpenPost,
  articleFeedback,
  onSetArticleFeedback,
  articleLikeCounts,
  articleDislikeCounts,
}: Props) {
  const feedItems: FeedItem[] = [
    ...posts.map((post): FeedItem => ({ kind: "post", post })),
    ...articles.map((article): FeedItem => ({ kind: "article", article })),
  ];

  const hero = feedItems[0];
  const sideItems = feedItems.slice(1, 3);
  const compactItems = feedItems.slice(3, 7);
  const tailItems = feedItems.slice(7, 25);

  const sideStocks = stockSymbols.slice(0, 1);
  const compactStocks = stockSymbols.slice(1, 5);
  const tailStocks = stockSymbols.slice(5, 20);
  // The article column usually runs longer than the stock rows — rather than leave the stock
  // column blank underneath, close it out with real charted tiles instead of empty space.
  const chartStocks = stockSymbols.slice(20, 23);

  // Real gainers/losers ranked from the same live quotes already on screen — genuine market
  // breadth, not a separate fabricated feed.
  const ranked = Object.entries(quotes)
    .filter(([s, q]) => stockSymbols.includes(s) && Number.isFinite(q.percentChange))
    .sort((a, b) => b[1].percentChange - a[1].percentChange);
  const gainers = ranked.slice(0, 5);
  const losers = ranked.slice(-5).reverse();

  if (!hero && stockSymbols.length === 0) return null;

  return (
    <div className="board mt-4 overflow-hidden" data-tour="feed">
      <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--color-border)]">
        <span className="display-bold text-lg tracking-tight">{title}</span>
      </div>

      <div className="p-5">
        {hero && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              {hero.kind === "article" ? (
                <ArticleHeroTile
                  article={hero.article}
                  feedback={articleFeedback?.[hero.article.id]}
                  onSetFeedback={onSetArticleFeedback}
                  likeCount={articleLikeCounts?.[hero.article.id]}
                  dislikeCount={articleDislikeCounts?.[hero.article.id]}
                  onOpen={onOpenArticle}
                />
              ) : (
                <PostHeroTile post={hero.post} onOpen={onOpenPost} />
              )}
            </div>
            <div className="flex flex-col divide-y divide-[var(--color-border-soft)]">
              {sideStocks.map((s) => (
                <StockSideTile
                  key={s}
                  symbol={s}
                  quote={quotes[s]}
                  profile={profiles[s]}
                  history={history[s] ?? []}
                  onView={() => onView(s)}
                  isPosition={positionSymbols.includes(s)}
                />
              ))}
              {sideItems.map((item) =>
                item.kind === "article" ? (
                  <ArticleSideTile
                    key={`article-${item.article.id}`}
                    article={item.article}
                    feedback={articleFeedback?.[item.article.id]}
                    onSetFeedback={onSetArticleFeedback}
                    likeCount={articleLikeCounts?.[item.article.id]}
                    dislikeCount={articleDislikeCounts?.[item.article.id]}
                    onOpen={onOpenArticle}
                  />
                ) : (
                  <PostSideTile key={`post-${item.post.id}`} post={item.post} onOpen={onOpenPost} />
                )
              )}
            </div>
          </div>
        )}

        {(compactStocks.length > 0 || compactItems.length > 0) && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
            {compactStocks.map((s) => (
              <StockCompactTile
                key={s}
                symbol={s}
                quote={quotes[s]}
                profile={profiles[s]}
                onView={() => onView(s)}
                isPosition={positionSymbols.includes(s)}
              />
            ))}
            {compactItems.map((item) =>
              item.kind === "article" ? (
                <ArticleCompactTile
                  key={`article-${item.article.id}`}
                  article={item.article}
                  feedback={articleFeedback?.[item.article.id]}
                  onSetFeedback={onSetArticleFeedback}
                  likeCount={articleLikeCounts?.[item.article.id]}
                  dislikeCount={articleDislikeCounts?.[item.article.id]}
                  onOpen={onOpenArticle}
                />
              ) : (
                <PostCompactTile key={`post-${item.post.id}`} post={item.post} onOpen={onOpenPost} />
              )
            )}
          </div>
        )}

        {(tailStocks.length > 0 || tailItems.length > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 mt-4 border-t border-[var(--color-border-soft)] pt-2">
            <div className="flex flex-col">
              {tailStocks.map((s) => (
                <StockRow
                  key={s}
                  symbol={s}
                  quote={quotes[s]}
                  profile={profiles[s]}
                  onView={() => onView(s)}
                  isPosition={positionSymbols.includes(s)}
                />
              ))}
              {chartStocks.length > 0 && (
                <div className="flex flex-col divide-y divide-[var(--color-border-soft)] border-t border-[var(--color-border-soft)]">
                  {chartStocks.map((s) => (
                    <StockSideTile
                      key={s}
                      symbol={s}
                      quote={quotes[s]}
                      profile={profiles[s]}
                      history={history[s] ?? []}
                      onView={() => onView(s)}
                      isPosition={positionSymbols.includes(s)}
                    />
                  ))}
                </div>
              )}
            </div>
            <div className="flex flex-col">
              {tailItems.map((item) =>
                item.kind === "article" ? (
                  <div
                    key={`article-${item.article.id}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => onOpenArticle(item.article)}
                    onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onOpenArticle(item.article)}
                    className="px-2 py-4 border-b border-[var(--color-border-soft)] last:border-0 hover:bg-white/[0.03] transition-colors cursor-pointer"
                  >
                    <p className="text-sm font-semibold leading-snug line-clamp-2">{item.article.headline}</p>
                    <div className="flex items-center justify-between gap-3 mt-1.5">
                      <ArticleMeta article={item.article} />
                      <ArticleFeedbackButtons
                        articleId={item.article.id}
                        value={articleFeedback?.[item.article.id]}
                        onSetFeedback={onSetArticleFeedback}
                        likeCount={articleLikeCounts?.[item.article.id]}
                        dislikeCount={articleDislikeCounts?.[item.article.id]}
                      />
                    </div>
                  </div>
                ) : (
                  <button
                    key={`post-${item.post.id}`}
                    onClick={() => onOpenPost(item.post)}
                    className="text-left px-2 py-4 border-b border-[var(--color-border-soft)] last:border-0 hover:bg-white/[0.03] transition-colors"
                  >
                    <p className="text-sm font-semibold leading-snug line-clamp-2">{item.post.headline}</p>
                    <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-[var(--color-ink-faint)]">
                      <span className="font-bold text-[var(--color-amber)]">The Business Line</span>
                      <span>·</span>
                      <span>{timeAgo(item.post.createdAt)}</span>
                    </div>
                  </button>
                )
              )}
            </div>
          </div>
        )}

        {(gainers.length > 0 || losers.length > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 mt-4 border-t border-[var(--color-border-soft)] pt-4">
            <div>
              <p className="term-label text-[11px] text-[var(--color-up)] tracking-widest mb-1.5">Top Gainers</p>
              <div className="flex flex-col">
                {gainers.map(([s, q]) => (
                  <MoverRow key={s} symbol={s} quote={q} profile={profiles[s]} onView={() => onView(s)} />
                ))}
              </div>
            </div>
            <div>
              <p className="term-label text-[11px] text-[var(--color-down)] tracking-widest mb-1.5">Top Losers</p>
              <div className="flex flex-col">
                {losers.map(([s, q]) => (
                  <MoverRow key={s} symbol={s} quote={q} profile={profiles[s]} onView={() => onView(s)} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
