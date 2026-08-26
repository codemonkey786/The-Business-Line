import { useMemo } from "react";
import { Trophy, Gauge, User, Crown } from "lucide-react";
import { MiniCreditGauge } from "./MiniCreditGauge";
import { PollPanel } from "./PollPanel";
import type { CompanyProfile, DailyPoll, Post, Profile } from "../lib/types";
import { bandForScore, bandColorVar } from "../lib/creditScore";

interface Props {
  posts: Post[];
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

function AuthorRow({
  rank,
  name,
  avatarUrl,
  count,
  max,
}: {
  rank: number;
  name: string;
  avatarUrl?: string;
  count: number;
  max: number;
}) {
  const color = rankColor(rank - 1);
  return (
    <div className="flex items-center gap-3 px-5 py-3 border-b border-[var(--color-border-soft)] last:border-0">
      <span className="mono-num text-sm font-bold w-5 text-center shrink-0" style={{ color }}>
        {rank}
      </span>
      <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden shrink-0 bg-[var(--color-amber)]/15 text-[var(--color-amber)]">
        {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> : <User size={14} />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold truncate">{name}</p>
        <div className="h-1.5 rounded-full bg-white/[0.06] mt-1.5 overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{ width: `${Math.max(6, (count / max) * 100)}%`, background: "var(--color-amber)" }}
          />
        </div>
      </div>
      <span className="mono-num text-sm font-bold text-[var(--color-ink-dim)] shrink-0">
        {count} post{count === 1 ? "" : "s"}
      </span>
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

// Two genuinely-sourced rankings: "Top Authors" counts real published posts by whoever wrote
// them (not external news bylines), and "Top Credit Scores" is a real cross-user ranking pulled
// from every signed-in user's synced profile row (see useLeaderboard/useProfileSync).
export function LeaderboardPanel({
  posts,
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
  const avatarByAuthor = useMemo(() => {
    const map: Record<string, string | undefined> = {};
    for (const e of scoreEntries) map[e.userId] = e.avatarUrl;
    return map;
  }, [scoreEntries]);

  const authors = useMemo(() => {
    const counts = new Map<string, { name: string; count: number }>();
    for (const p of posts) {
      const existing = counts.get(p.authorId);
      if (existing) existing.count += 1;
      else counts.set(p.authorId, { name: p.authorName, count: 1 });
    }
    return Array.from(counts.entries())
      .map(([authorId, v]) => ({ authorId, ...v }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [posts]);

  const maxAuthorPosts = authors[0]?.count ?? 1;

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
            <span className="display-bold text-lg tracking-tight">Top Authors</span>
          </div>
          {authors.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-[var(--color-ink-faint)]">
              No published articles yet — this fills in as staff post to the site.
            </div>
          ) : (
            authors.map((a, i) => (
              <AuthorRow key={a.authorId} rank={i + 1} name={a.name} avatarUrl={avatarByAuthor[a.authorId]} count={a.count} max={maxAuthorPosts} />
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
