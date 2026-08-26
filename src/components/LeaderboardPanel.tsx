import { useMemo, useState } from "react";
import { Newspaper, Trophy, Gauge, User, Crown } from "lucide-react";
import { MiniCreditGauge } from "./MiniCreditGauge";
import { PollPanel } from "./PollPanel";
import type { CompanyProfile, DailyPoll, NewsArticle, Profile } from "../lib/types";
import { bandForScore, bandColorVar } from "../lib/creditScore";

interface Props {
  articles: NewsArticle[];
  profiles: Record<string, CompanyProfile>;
  score: number;
  bandColor: string;
  userEmail?: string | null;
  userId?: string | null;
  avatarUrl?: string;
  signedIn?: boolean;
  isOwner?: boolean;
  scoreEntries?: Profile[];
  scoreEntriesLoading?: boolean;
  poll: DailyPoll | null;
  pollVoteCounts: number[];
  myPollVote: number | null;
  onVotePoll: (optionIndex: number) => void;
  onCreatePoll: (question: string, options: string[]) => Promise<void>;
}

const RANK_COLORS = ["var(--color-amber)", "#c9c9d4", "#d2895a", "var(--color-ink-faint)"];

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

function PublicationRow({ rank, source, count, max }: { rank: number; source: string; count: number; max: number }) {
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

// Rank 1 reads as an outright win (crown, not a numeral) — 2nd/3rd get a filled medal chip in
// their rank color, and the rest fall back to a quiet numeral so the podium is what actually
// stands out, not every row shouting equally.
function ScoreRankBadge({ rank }: { rank: number }) {
  const color = rankColor(rank - 1);
  if (rank === 1) {
    return (
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
        style={{ background: color, boxShadow: `0 0 16px -3px ${color}` }}
      >
        <Crown size={13} className="text-black" fill="currentColor" strokeWidth={1} />
      </div>
    );
  }
  if (rank <= 3) {
    return (
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center mono-num text-[13px] font-bold shrink-0"
        style={{ background: `${color}26`, color }}
      >
        {rank}
      </div>
    );
  }
  return <span className="mono-num text-sm font-bold w-7 text-center shrink-0 text-[var(--color-ink-faint)]">{rank}</span>;
}

function ScoreRow({ rank, entry, isYou }: { rank: number; entry: Profile; isYou: boolean }) {
  const entryScore = entry.score ?? 0;
  const entryBand = bandForScore(entryScore);
  const entryBandColor = bandColorVar(entryBand);
  const name = entry.displayName || entry.email;
  const leader = rank === 1;
  return (
    <div
      className={`flex items-center gap-3 px-5 py-3.5 border-b border-[var(--color-border-soft)] last:border-0 transition-colors ${
        isYou ? "bg-[var(--color-amber)]/[0.06]" : leader ? "bg-white/[0.025]" : ""
      }`}
    >
      <ScoreRankBadge rank={rank} />
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center overflow-hidden shrink-0"
        style={{
          background: `${entryBandColor}22`,
          color: entryBandColor,
          boxShadow: leader ? `0 0 0 2px ${entryBandColor}, 0 0 14px -3px ${entryBandColor}` : `0 0 0 2px ${entryBandColor}4d`,
        }}
      >
        {entry.avatarUrl ? <img src={entry.avatarUrl} alt="" className="w-full h-full object-cover" /> : <User size={15} />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold truncate flex items-center gap-1.5">
          {name}
          {isYou && (
            <span className="text-[9px] font-bold tracking-wide uppercase px-1.5 py-[1px] rounded-full bg-[var(--color-amber)]/15 text-[var(--color-amber)] shrink-0">
              You
            </span>
          )}
        </p>
        <span
          className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wide px-1.5 py-[1px] rounded-full"
          style={{ background: `${entryBandColor}1f`, color: entryBandColor }}
        >
          {entryBand}
        </span>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <MiniCreditGauge score={entryScore} size={leader ? 64 : 58} glow />
        <span
          className={`mono-num font-bold ${leader ? "text-2xl" : "text-xl"}`}
          style={{ color: "var(--color-amber)", textShadow: "0 0 18px var(--color-amber-dim), 0 0 40px rgba(255,176,62,0.25)" }}
        >
          {entryScore.toFixed(0)}
        </span>
      </div>
    </div>
  );
}

// Two genuinely-sourced rankings: "Best Publications" counts real bylines from the live news
// feed, and "Top Credit Scores" is a real cross-user ranking pulled from every signed-in user's
// synced profile row (see useLeaderboard/useProfileSync).
export function LeaderboardPanel({
  articles,
  profiles,
  score,
  bandColor,
  userEmail,
  userId,
  avatarUrl,
  signedIn,
  isOwner,
  scoreEntries = [],
  scoreEntriesLoading,
  poll,
  pollVoteCounts,
  myPollVote,
  onVotePoll,
  onCreatePoll,
}: Props) {
  const publications = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of articles) {
      if (!a.source) continue;
      counts.set(a.source, (counts.get(a.source) ?? 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [articles]);

  const maxPublication = publications[0]?.[1] ?? 1;

  return (
    <>
      <div className="flex items-baseline gap-2.5 mt-1 mb-1">
        <span className="display-bold text-2xl tracking-tight">Leaderboard</span>
      </div>

      <PollPanel
        poll={poll}
        voteCounts={pollVoteCounts}
        myVote={myPollVote}
        profiles={profiles}
        signedIn={signedIn}
        isOwner={isOwner}
        onVote={onVotePoll}
        onCreatePoll={onCreatePoll}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
        <div className="board overflow-hidden" style={{ boxShadow: "0 0 40px -28px var(--color-amber)" }}>
          <div className="h-[3px] w-full" style={{ background: "linear-gradient(90deg, var(--color-amber), transparent)" }} />
          <div className="flex items-center gap-2.5 px-5 py-4 border-b border-[var(--color-border)]">
            <Trophy size={16} style={{ color: "var(--color-amber)" }} />
            <span className="display-bold text-lg tracking-tight">Best Publications</span>
          </div>
          {publications.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-[var(--color-ink-faint)]">
              No real news sources loaded yet — this fills in as today's market news comes in.
            </div>
          ) : (
            publications.map(([source, count], i) => (
              <PublicationRow key={source} rank={i + 1} source={source} count={count} max={maxPublication} />
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
            <ScoreRow
              rank={1}
              isYou
              entry={{ userId: userId ?? "you", email: userEmail ?? "You", isAdmin: false, avatarUrl, score }}
            />
          ) : (
            scoreEntries.map((entry, i) => <ScoreRow key={entry.userId} rank={i + 1} entry={entry} isYou={entry.userId === userId} />)
          )}
        </div>
      </div>
    </>
  );
}
