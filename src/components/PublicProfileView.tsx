import { useEffect, useState } from "react";
import { ArrowLeft, User } from "lucide-react";
import { CreditGauge } from "./CreditGauge";
import { PositionsTable } from "./PositionsTable";
import { bandForScore, bandColorVar, computeCreditScore } from "../lib/creditScore";
import { fetchPortfolioState } from "../lib/publicPortfolio";
import type { CompanyProfile, PortfolioState, Post, PricePoint, Profile, Quote } from "../lib/types";

interface Props {
  profile: Profile;
  posts: Post[];
  quotes: Record<string, Quote>;
  profiles: Record<string, CompanyProfile>;
  betas: Record<string, number>;
  priceHistory: Record<string, PricePoint[]>;
  onBack: () => void;
  onOpenPost: (post: Post) => void;
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

// Anyone's real, live portfolio and posts — reachable by clicking a leaderboard entry.
// Read-only: no divest, no edit, just the same honest positions/score data the leaderboard
// itself is built from, one level deeper.
export function PublicProfileView({ profile, posts, quotes, profiles, betas, priceHistory, onBack, onOpenPost }: Props) {
  const [portfolio, setPortfolio] = useState<PortfolioState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setPortfolio(null);
    fetchPortfolioState(profile.userId).then((state) => {
      if (!cancelled) {
        setPortfolio(state);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [profile.userId]);

  const score = profile.score ?? 600;
  const band = bandForScore(score);
  const color = bandColorVar(band);
  const authorPosts = posts.filter((p) => p.authorId === profile.userId);
  const winRate = portfolio ? computeCreditScore(portfolio, quotes, betas).winRate : null;
  const name = profile.displayName || profile.email;

  return (
    <div className="max-w-3xl mx-auto">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-[var(--color-ink-faint)] hover:text-[var(--color-ink)] transition-colors mb-4"
      >
        <ArrowLeft size={15} />
        Back
      </button>

      <div className="board p-6 flex items-center gap-4 mb-4">
        <div
          className="w-16 h-16 rounded-full overflow-hidden shrink-0 flex items-center justify-center"
          style={{ background: `${color}22`, color, boxShadow: `0 0 0 2px ${color}, 0 0 20px -4px ${color}` }}
        >
          {profile.avatarUrl ? <img src={profile.avatarUrl} alt="" className="w-full h-full object-cover" /> : <User size={28} />}
        </div>
        <div className="min-w-0">
          <p className="display-bold text-xl truncate">{name}</p>
          <span
            className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wide px-1.5 py-[1px] rounded-full"
            style={{ background: `${color}1f`, color }}
          >
            {band}
          </span>
        </div>
      </div>

      <CreditGauge score={score} band={band} />

      {loading ? (
        <div className="board mt-4 p-10 text-center text-sm text-[var(--color-ink-faint)]">Loading positions…</div>
      ) : !portfolio || portfolio.calls.length === 0 ? (
        <div className="board mt-4 p-10 text-center text-sm text-[var(--color-ink-faint)]">No positions yet.</div>
      ) : (
        <>
          <PositionsTable state={portfolio} quotes={quotes} profiles={profiles} betas={betas} winRate={winRate} status="open" history={priceHistory} />
          <PositionsTable state={portfolio} quotes={quotes} profiles={profiles} betas={betas} winRate={winRate} status="closed" />
        </>
      )}

      {authorPosts.length > 0 && (
        <div className="board mt-4 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-[var(--color-border)]">
            <span className="display-bold text-lg tracking-tight">Posts</span>
            <span className="ml-auto mono-num text-xs text-[var(--color-ink-faint)]">{authorPosts.length} total</span>
          </div>
          <div className="flex flex-col">
            {authorPosts.map((post) => (
              <button
                key={post.id}
                onClick={() => onOpenPost(post)}
                className="text-left px-5 py-3 border-b border-[var(--color-border-soft)] last:border-0 hover:bg-white/[0.03] transition-colors"
              >
                <p className="text-sm font-bold truncate">{post.headline}</p>
                <p className="text-xs text-[var(--color-ink-faint)] mt-0.5">{timeAgo(post.createdAt)}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
