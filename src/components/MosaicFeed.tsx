import { ArticleCompactTile, ArticleHeroTile, ArticleSideTile, ArticleMeta, ArticleFeedbackButtons } from "./ArticleList";
import { CompanyLogo } from "./CompanyLogo";
import { PriceChart } from "./PriceChart";
import type { CompanyProfile, NewsArticle, PricePoint, Quote } from "../lib/types";
import type { ArticleFeedback, FeedbackValue } from "../lib/articleFeedbackStorage";

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

interface Props {
  title: string;
  articles: NewsArticle[];
  stockSymbols: string[];
  positionSymbols?: string[];
  quotes: Record<string, Quote>;
  profiles: Record<string, CompanyProfile>;
  history: Record<string, PricePoint[]>;
  onView: (symbol: string) => void;
  articleFeedback?: ArticleFeedback;
  onSetArticleFeedback?: (articleId: number, value: FeedbackValue) => void;
}

// A single mosaic grid genuinely mixing stock tiles and article tiles — not two separate
// columns, one big story plus a rotating cast of positions, headlines, and market movers
// tiled together like a real finance homepage.
export function MosaicFeed({
  title,
  articles,
  stockSymbols,
  positionSymbols = [],
  quotes,
  profiles,
  history,
  onView,
  articleFeedback,
  onSetArticleFeedback,
}: Props) {
  const hero = articles[0];
  const sideArticles = articles.slice(1, 3);
  const compactArticles = articles.slice(3, 7);
  const tailArticles = articles.slice(7, 25);

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
    <div className="board mt-4 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--color-border)]">
        <span className="display-bold text-lg tracking-tight">{title}</span>
      </div>

      <div className="p-5">
        {hero && (
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <ArticleHeroTile article={hero} feedback={articleFeedback?.[hero.id]} onSetFeedback={onSetArticleFeedback} />
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
              {sideArticles.map((a) => (
                <ArticleSideTile key={a.id} article={a} feedback={articleFeedback?.[a.id]} onSetFeedback={onSetArticleFeedback} />
              ))}
            </div>
          </div>
        )}

        {(compactStocks.length > 0 || compactArticles.length > 0) && (
          <div className="grid grid-cols-4 gap-4 mt-4">
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
            {compactArticles.map((a) => (
              <ArticleCompactTile key={a.id} article={a} feedback={articleFeedback?.[a.id]} onSetFeedback={onSetArticleFeedback} />
            ))}
          </div>
        )}

        {(tailStocks.length > 0 || tailArticles.length > 0) && (
          <div className="grid grid-cols-2 gap-x-6 mt-4 border-t border-[var(--color-border-soft)] pt-2">
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
              {tailArticles.map((a) => (
                <a
                  key={a.id}
                  href={a.url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2 py-4 border-b border-[var(--color-border-soft)] last:border-0 hover:bg-white/[0.03] transition-colors"
                >
                  <p className="text-sm font-semibold leading-snug line-clamp-2">{a.headline}</p>
                  <div className="flex items-center justify-between gap-3 mt-1.5">
                    <ArticleMeta article={a} />
                    <ArticleFeedbackButtons articleId={a.id} value={articleFeedback?.[a.id]} onSetFeedback={onSetArticleFeedback} />
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {(gainers.length > 0 || losers.length > 0) && (
          <div className="grid grid-cols-2 gap-x-8 mt-4 border-t border-[var(--color-border-soft)] pt-4">
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

