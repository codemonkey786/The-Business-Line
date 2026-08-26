import { useState } from "react";
import { Check, Plus, Vote, X } from "lucide-react";
import { StockSearch } from "./StockSearch";
import { CompanyLogo } from "./CompanyLogo";
import type { CompanyProfile, DailyPoll } from "../lib/types";

const MAX_OPTIONS = 6;

function NewPollForm({
  onCreate,
  onCancel,
}: {
  onCreate: (question: string, options: string[]) => Promise<void>;
  onCancel: () => void;
}) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addOption(symbol: string) {
    if (options.includes(symbol) || options.length >= MAX_OPTIONS) return;
    setOptions((prev) => [...prev, symbol]);
  }

  function removeOption(symbol: string) {
    setOptions((prev) => prev.filter((s) => s !== symbol));
  }

  async function publish() {
    const trimmed = question.trim();
    if (!trimmed || options.length < 2 || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await onCreate(trimmed, options);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="px-5 py-4 border-b border-[var(--color-border)] flex flex-col gap-3">
      <input
        autoFocus
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Which stock will…?"
        maxLength={140}
        className="w-full text-sm font-semibold bg-white/[0.06] rounded-lg px-3 py-2.5 outline-none focus:ring-1 focus:ring-[var(--color-amber)]"
      />

      {options.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {options.map((s) => (
            <span
              key={s}
              className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full bg-white/[0.08] text-[var(--color-ink)]"
            >
              {s}
              <button onClick={() => removeOption(s)} className="text-[var(--color-ink-faint)] hover:text-[var(--color-down)] transition-colors">
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}

      {options.length < MAX_OPTIONS && <StockSearch compact onSelect={addOption} />}

      <div className="flex items-center gap-2 mt-1">
        <button
          onClick={publish}
          disabled={!question.trim() || options.length < 2 || submitting}
          className="flex-1 py-2 rounded-lg text-sm font-semibold text-black bg-[var(--color-amber)] hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-40 disabled:pointer-events-none"
        >
          {submitting ? "Publishing…" : "Publish Poll"}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 rounded-lg text-sm font-semibold bg-white/[0.06] text-[var(--color-ink-dim)] hover:text-[var(--color-ink)] hover:bg-white/[0.1] transition-colors"
        >
          Cancel
        </button>
      </div>
      {error && <p className="text-xs text-[var(--color-down)]">{error}</p>}
      <p className="text-[11px] text-[var(--color-ink-faint)]">
        {options.length}/{MAX_OPTIONS} options · at least 2 needed. Publishing replaces today's poll.
      </p>
    </div>
  );
}

function OptionRow({
  symbol,
  profile,
  votes,
  total,
  isMine,
  canVote,
  onVote,
}: {
  symbol: string;
  profile?: CompanyProfile;
  votes: number;
  total: number;
  isMine: boolean;
  canVote: boolean;
  onVote: () => void;
}) {
  const pct = total > 0 ? Math.round((votes / total) * 100) : 0;
  return (
    <button
      onClick={onVote}
      disabled={!canVote}
      className={`relative w-full text-left px-5 py-3 border-b border-[var(--color-border-soft)] last:border-0 transition-colors overflow-hidden ${
        canVote ? "hover:bg-white/[0.03] cursor-pointer" : "cursor-default"
      } ${isMine ? "bg-[var(--color-amber)]/[0.06]" : ""}`}
    >
      <div
        className="absolute inset-y-0 left-0 bg-[var(--color-amber)]/[0.08] transition-[width] duration-500"
        style={{ width: `${pct}%` }}
      />
      <div className="relative flex items-center gap-3">
        <CompanyLogo symbol={symbol} logoUrl={profile?.logo} size={28} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold truncate flex items-center gap-1.5">
            {profile?.name || symbol}
            {isMine && <Check size={13} className="text-[var(--color-amber)] shrink-0" />}
          </p>
          <p className="mono-num text-xs text-[var(--color-ink-faint)]">{symbol}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="mono-num text-lg font-bold" style={{ color: isMine ? "var(--color-amber)" : "var(--color-ink)" }}>
            {pct}%
          </p>
          <p className="mono-num text-[10px] text-[var(--color-ink-faint)]">
            {votes} vote{votes === 1 ? "" : "s"}
          </p>
        </div>
      </div>
    </button>
  );
}

interface Props {
  poll: DailyPoll | null;
  voteCounts: number[];
  myVote: number | null;
  profiles: Record<string, CompanyProfile>;
  signedIn?: boolean;
  isOwner?: boolean;
  onVote: (optionIndex: number) => void;
  onCreatePoll: (question: string, options: string[]) => Promise<void>;
}

// The owner's one daily "which stock will do X" poll — real, shared votes (same "everyone sees
// everyone's picks, live" pattern as article/post feedback), but only the owner can publish one.
export function PollPanel({ poll, voteCounts, myVote, profiles, signedIn, isOwner, onVote, onCreatePoll }: Props) {
  const [creating, setCreating] = useState(false);
  const total = voteCounts.reduce((a, b) => a + b, 0);

  return (
    <div className="board overflow-hidden mb-4" style={{ boxShadow: "0 0 40px -28px var(--color-amber)" }}>
      <div className="h-[3px] w-full" style={{ background: "linear-gradient(90deg, var(--color-amber), transparent)" }} />
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-[var(--color-border)]">
        <Vote size={16} style={{ color: "var(--color-amber)" }} />
        <span className="display-bold text-lg tracking-tight">Daily Poll</span>
        {total > 0 && <span className="ml-auto mono-num text-xs text-[var(--color-ink-faint)]">{total} vote{total === 1 ? "" : "s"}</span>}
        {isOwner && !creating && (
          <button
            onClick={() => setCreating(true)}
            title="Post a new daily poll"
            className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-[var(--color-amber)]/15 text-[var(--color-amber)] hover:bg-[var(--color-amber)]/25 transition-colors ${total > 0 ? "" : "ml-auto"}`}
          >
            <Plus size={13} />
            New Poll
          </button>
        )}
      </div>

      {creating ? (
        <NewPollForm
          onCreate={async (q, opts) => {
            await onCreatePoll(q, opts);
            setCreating(false);
          }}
          onCancel={() => setCreating(false)}
        />
      ) : !poll ? (
        <div className="px-5 py-10 text-center text-sm text-[var(--color-ink-faint)]">
          {isOwner ? "You haven't posted a poll yet — hit \"New Poll\" to ask one." : "No poll yet — check back soon."}
        </div>
      ) : (
        <>
          <p className="px-5 pt-4 pb-3 text-[15px] font-bold leading-snug">{poll.question}</p>
          {!signedIn && (
            <p className="px-5 pb-3 -mt-2 text-xs text-[var(--color-ink-faint)]">Sign in to cast your vote.</p>
          )}
          {poll.options.map((symbol, i) => (
            <OptionRow
              key={symbol}
              symbol={symbol}
              profile={profiles[symbol]}
              votes={voteCounts[i] ?? 0}
              total={total}
              isMine={myVote === i}
              canVote={Boolean(signedIn)}
              onVote={() => onVote(i)}
            />
          ))}
        </>
      )}
    </div>
  );
}
