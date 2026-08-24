import { useMemo, useState } from "react";
import { Newspaper, Trophy, Eye, ListChecks, Gauge, User } from "lucide-react";
import { CompanyLogo } from "./CompanyLogo";
import { MiniCreditGauge } from "./MiniCreditGauge";
import type { CompanyProfile, NewsArticle, Profile, Quote } from "../lib/types";
import { bandForScore, bandColorVar, type ScoreBand } from "../lib/creditScore";

interface Props {
  articles: NewsArticle[];
  readingActivity: Record<string, number>;
  profiles: Record<string, CompanyProfile>;
  watchlist: string[];
  quotes: Record<string, Quote>;
  score: number;
  band: ScoreBand;
  bandColor: string;
  userEmail?: string | null;
  userId?: string | null;
  avatarUrl?: string;
  signedIn?: boolean;
  scoreEntries?: Profile[];
  scoreEntriesLoading?: boolean;
  onViewSymbol: (symbol: string) => void;
}

const RANK_COLORS = ["#ffd54a", "#c9c9d4", "#d2895a", "var(--color-ink-faint)"];

function rankColor(i: number) {
  return RANK_COLORS[Math.min(i, 3)];
}

// Real domains for each outlet's actual favicon — fetched live from Google's favicon service
// (the genuine icon from the outlet's own site), not a fabricated logo.
const SOURCE_DOMAINS: Record<string, string> = {
  Reuters: "reuters.com",
  CNBC: "cnbc.com",
  CoinDesk: "coindesk.com",
  Cointelegraph: "cointelegraph.com",
  "Cryptocurrency News": "cryptocurrencynews.com",
  GlobeNewswire: "globenewswire.com",
  BusinessWire: "businesswire.com",
  Forexlive: "forexlive.com",
};

function SourceLogo({ source }: { source: string }) {
  const domain = SOURCE_DOMAINS[source];
  const [failed, setFailed] = useState(false);
  if (domain && !failed) {
    return (
      <img
        src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
        alt={source}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
        className="w-8 h-8 rounded-lg object-contain bg-white p-1.5 shrink-0"
      />
    );
  }
  return (
    <div
      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
      style={{ background: "var(--color-amber-dim)", color: "var(--color-amber)" }}
    >
      <Newspaper size={14} />
    </div>
  );
}

function JournalistRow({ rank, source, count, max }: { rank: number; source: string; count: number; max: number }) {
  const color = rankColor(rank - 1);
  return (
    <div className="flex items-center gap-3 px-5 py-3 border-b border-[var(--color-border-soft)] last:border-0">
      <span className="mono-num text-sm font-bold w-5 text-center shrink-0" style={{ color }}>
        {rank}
      </span>
      <SourceLogo source={source} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold truncate">{source}</p>
        <div className="h-1.5 rounded-full bg-white/[0.06] mt-1.5 overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{ width: `${Math.max(6, (count / max) * 100)}%`, background: "var(--color-amber)" }}
          />
        </div>
      </div>
      <span className="mono-num text-sm font-bold text-[var(--color-ink-dim)] shrink-0">{count}</span>
    </div>
  );
}

function ReaderRow({
  rank,
  symbol,
  count,
  max,
  profile,
  onClick,
}: {
  rank: number;
  symbol: string;
  count: number;
  max: number;
  profile?: CompanyProfile;
  onClick: () => void;
}) {
  const color = rankColor(rank - 1);
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 px-5 py-3 border-b border-[var(--color-border-soft)] last:border-0 hover:bg-white/[0.03] transition-colors text-left w-full"
    >
      <span className="mono-num text-sm font-bold w-5 text-center shrink-0" style={{ color }}>
        {rank}
      </span>
      <CompanyLogo symbol={symbol} logoUrl={profile?.logo} size={28} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold truncate">{profile?.name || symbol}</p>
        <div className="h-1.5 rounded-full bg-white/[0.06] mt-1.5 overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{ width: `${Math.max(6, (count / max) * 100)}%`, background: "var(--color-up)" }}
          />
        </div>
      </div>
      <span className="mono-num text-sm font-bold text-[var(--color-ink-dim)] shrink-0">
        {count} view{count === 1 ? "" : "s"}
      </span>
    </button>
  );
}

function WatchlistRow({
  rank,
  symbol,
  quote,
  profile,
  onClick,
}: {
  rank: number;
  symbol: string;
  quote: Quote;
  profile?: CompanyProfile;
  onClick: () => void;
}) {
  const rColor = rankColor(rank - 1);
  const positive = quote.percentChange >= 0;
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 px-5 py-3 border-b border-[var(--color-border-soft)] last:border-0 hover:bg-white/[0.03] transition-colors text-left w-full"
    >
      <span className="mono-num text-sm font-bold w-5 text-center shrink-0" style={{ color: rColor }}>
        {rank}
      </span>
      <CompanyLogo symbol={symbol} logoUrl={profile?.logo} size={28} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold truncate">{profile?.name || symbol}</p>
        <p className="mono-num text-xs text-[var(--color-ink-faint)]">{symbol}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="mono-num text-sm font-semibold">{quote.price.toFixed(2)}</p>
        <p className={`mono-num text-xs font-bold ${positive ? "text-[var(--color-up)]" : "text-[var(--color-down)]"}`}>
          {positive ? "+" : ""}
          {quote.percentChange.toFixed(2)}%
        </p>
      </div>
    </button>
  );
}

function ScoreRow({ rank, entry, isYou }: { rank: number; entry: Profile; isYou: boolean }) {
  const color = rankColor(rank - 1);
  const entryScore = entry.score ?? 0;
  const entryBand = bandForScore(entryScore);
  const entryBandColor = bandColorVar(entryBand);
  const name = entry.displayName || entry.email;
  return (
    <div
      className={`flex items-center gap-3 px-5 py-3 border-b border-[var(--color-border-soft)] last:border-0 ${
        isYou ? "bg-white/[0.04]" : ""
      }`}
    >
      <span className="mono-num text-sm font-bold w-5 text-center shrink-0" style={{ color }}>
        {rank}
      </span>
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden shrink-0"
        style={{ background: `${entryBandColor}22`, color: entryBandColor }}
      >
        {entry.avatarUrl ? <img src={entry.avatarUrl} alt="" className="w-full h-full object-cover" /> : <User size={14} />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold truncate">
          {name}
          {isYou && <span className="ml-1.5 text-[10px] font-bold tracking-wide text-[var(--color-amber)]">YOU</span>}
        </p>
        <p className="text-xs text-[var(--color-ink-faint)]">{entryBand}</p>
      </div>
      <div className="flex items-center gap-2.5 shrink-0">
        <MiniCreditGauge score={entryScore} />
        <span className="mono-num text-lg font-bold" style={{ color: entryBandColor }}>
          {entryScore.toFixed(0)}
        </span>
      </div>
    </div>
  );
}

// Four genuinely-sourced rankings: "Top Journalists" counts real bylines from the live news
// feed, "Top Stocks Viewed" is your own locally-tracked reading activity, "Top Watchlist" ranks
// your real watchlist by today's live move, and "Top Credit Scores" is a real cross-user ranking
// pulled from every signed-in user's synced profile row (see useLeaderboard/useProfileSync).
export function LeaderboardPanel({
  articles,
  readingActivity,
  profiles,
  watchlist,
  quotes,
  score,
  band,
  bandColor,
  userEmail,
  userId,
  avatarUrl,
  signedIn,
  scoreEntries = [],
  scoreEntriesLoading,
  onViewSymbol,
}: Props) {
  const journalists = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of articles) {
      if (!a.source) continue;
      counts.set(a.source, (counts.get(a.source) ?? 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [articles]);

  const readers = useMemo(
    () => Object.entries(readingActivity).sort((a, b) => b[1] - a[1]).slice(0, 10),
    [readingActivity]
  );

  const topWatchlist = useMemo(() => {
    return watchlist
      .filter((s) => quotes[s] && Number.isFinite(quotes[s].percentChange))
      .sort((a, b) => quotes[b].percentChange - quotes[a].percentChange)
      .slice(0, 10);
  }, [watchlist, quotes]);

  const maxJournalist = journalists[0]?.[1] ?? 1;
  const maxReader = readers[0]?.[1] ?? 1;

  return (
    <>
      <div className="flex items-baseline gap-2.5 mt-1 mb-1">
        <span className="display-bold text-2xl tracking-tight">Leaderboard</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
        <div className="board overflow-hidden" style={{ boxShadow: "0 0 40px -28px var(--color-amber)" }}>
          <div className="h-[3px] w-full" style={{ background: "linear-gradient(90deg, var(--color-amber), transparent)" }} />
          <div className="flex items-center gap-2.5 px-5 py-4 border-b border-[var(--color-border)]">
            <Trophy size={16} style={{ color: "var(--color-amber)" }} />
            <span className="display-bold text-lg tracking-tight">Top Journalists</span>
          </div>
          {journalists.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-[var(--color-ink-faint)]">
              No real news sources loaded yet — this fills in as today's market news comes in.
            </div>
          ) : (
            journalists.map(([source, count], i) => (
              <JournalistRow key={source} rank={i + 1} source={source} count={count} max={maxJournalist} />
            ))
          )}
        </div>

        <div className="board overflow-hidden" style={{ boxShadow: "0 0 40px -28px var(--color-up)" }}>
          <div className="h-[3px] w-full" style={{ background: "linear-gradient(90deg, var(--color-up), transparent)" }} />
          <div className="flex items-center gap-2.5 px-5 py-4 border-b border-[var(--color-border)]">
            <Eye size={16} style={{ color: "var(--color-up)" }} />
            <span className="display-bold text-lg tracking-tight">Top Stocks Viewed</span>
          </div>
          {readers.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-[var(--color-ink-faint)]">
              Browse some stocks to build your reading leaderboard — every symbol you open counts.
            </div>
          ) : (
            readers.map(([symbol, count], i) => (
              <ReaderRow
                key={symbol}
                rank={i + 1}
                symbol={symbol}
                count={count}
                max={maxReader}
                profile={profiles[symbol]}
                onClick={() => onViewSymbol(symbol)}
              />
            ))
          )}
        </div>

        <div className="board overflow-hidden" style={{ boxShadow: "0 0 40px -28px var(--color-score-hof)" }}>
          <div className="h-[3px] w-full" style={{ background: "linear-gradient(90deg, var(--color-score-hof), transparent)" }} />
          <div className="flex items-center gap-2.5 px-5 py-4 border-b border-[var(--color-border)]">
            <ListChecks size={16} style={{ color: "var(--color-score-hof)" }} />
            <span className="display-bold text-lg tracking-tight">Top Watchlist</span>
          </div>
          {topWatchlist.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-[var(--color-ink-faint)]">
              Add symbols to your watchlist to see today's real movers ranked here.
            </div>
          ) : (
            topWatchlist.map((symbol, i) => (
              <WatchlistRow
                key={symbol}
                rank={i + 1}
                symbol={symbol}
                quote={quotes[symbol]}
                profile={profiles[symbol]}
                onClick={() => onViewSymbol(symbol)}
              />
            ))
          )}
        </div>

        <div className="board overflow-hidden" style={{ boxShadow: `0 0 40px -28px ${bandColor}` }}>
          <div className="h-[3px] w-full" style={{ background: `linear-gradient(90deg, ${bandColor}, transparent)` }} />
          <div className="flex items-center gap-2.5 px-5 py-4 border-b border-[var(--color-border)]">
            <Gauge size={16} style={{ color: bandColor }} />
            <span className="display-bold text-lg tracking-tight">Top Credit Scores</span>
          </div>
          {!signedIn ? (
            <div className="px-5 py-10 text-center text-sm text-[var(--color-ink-faint)]">
              Sign in to see how your real score stacks up against other traders.
            </div>
          ) : scoreEntriesLoading && scoreEntries.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-[var(--color-ink-faint)]">Loading real scores…</div>
          ) : scoreEntries.length === 0 ? (
            <div className="flex items-center gap-3 px-5 py-3">
              <span className="mono-num text-sm font-bold w-5 text-center shrink-0" style={{ color: rankColor(0) }}>
                1
              </span>
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden shrink-0"
                style={{ background: `${bandColor}22`, color: bandColor }}
              >
                {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> : <User size={14} />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold truncate">
                  {userEmail || "You"}
                  <span className="ml-1.5 text-[10px] font-bold tracking-wide text-[var(--color-amber)]">YOU</span>
                </p>
                <p className="text-xs text-[var(--color-ink-faint)]">{band}</p>
              </div>
              <div className="flex items-center gap-2.5 shrink-0">
                <MiniCreditGauge score={score} />
                <span className="mono-num text-lg font-bold" style={{ color: bandColor }}>
                  {score.toFixed(0)}
                </span>
              </div>
            </div>
          ) : (
            scoreEntries.map((entry, i) => <ScoreRow key={entry.userId} rank={i + 1} entry={entry} isYou={entry.userId === userId} />)
          )}
        </div>
      </div>
    </>
  );
}
