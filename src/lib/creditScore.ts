import type { Call, PortfolioState, Quote } from "./types";

export interface ScoreFactor {
  key: string;
  label: string;
  weight: number; // fraction of total, sums to 1
  value: number; // 0-100
  blurb: string;
}

export interface CreditScoreResult {
  score: number;
  band: ScoreBand;
  factors: ScoreFactor[];
  avgEdgePct: number;
  openCalls: number;
  winRate: number | null;
  marketVolatility: number; // realized dispersion across tracked quotes, in percentage points
  volatilityScalar: number; // how much the meter's swing is being amplified (>1) or damped (<1)
}

export type ScoreBand = "Bad" | "Poor" | "Fair" | "Good" | "Very Good" | "Excellent";

export interface BandDef {
  band: ScoreBand;
  min: number;
  max: number;
  color: string;
}

export const SCORE_BANDS: BandDef[] = [
  { band: "Bad", min: 300, max: 399, color: "var(--color-score-bum)" },
  { band: "Poor", min: 400, max: 499, color: "var(--color-score-benchwarmer)" },
  { band: "Fair", min: 500, max: 599, color: "var(--color-score-starter)" },
  { band: "Good", min: 600, max: 699, color: "var(--color-score-allstar)" },
  { band: "Very Good", min: 700, max: 799, color: "var(--color-score-hof)" },
  { band: "Excellent", min: 800, max: 850, color: "var(--color-score-goat)" },
];

export function bandForScore(score: number): ScoreBand {
  for (const b of SCORE_BANDS) {
    if (score <= b.max) return b.band;
  }
  return "Excellent";
}

export function bandColorVar(band: ScoreBand): string {
  return SCORE_BANDS.find((b) => b.band === band)?.color ?? "var(--color-score-starter)";
}

export function percentileForScore(score: number): number {
  const pct = ((score - 300) / (850 - 300)) * 100;
  return Math.max(1, Math.min(99, Math.round(100 - pct)));
}

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

// directional edge: positive = call is/was correct, negative = wrong
function callEdgePct(call: Call, quotes: Record<string, Quote>): number {
  const exit = call.closedAt ? call.exitPrice! : quotes[call.symbol]?.price;
  if (!exit || !call.entryPrice) return 0;
  const rawPct = ((exit - call.entryPrice) / call.entryPrice) * 100;
  return call.direction === "UP" ? rawPct : -rawPct;
}

// A closed call that landed at exactly breakeven is a "push" — it shouldn't count as either a
// win or a loss in the win rate. Without this, a single flat trade with no other closed history
// reads as a 0% track record, which unfairly tanks the score for a position that lost nothing.
function closedCallEdgePct(call: Call): number {
  return ((call.exitPrice! - call.entryPrice) / call.entryPrice) * 100 * (call.direction === "UP" ? 1 : -1);
}

function winRateExcludingPushes(closed: Call[]): { wins: number; decisive: number } {
  const decisive = closed.filter((c) => Math.abs(closedCallEdgePct(c)) > 0.005);
  const wins = decisive.filter((c) => closedCallEdgePct(c) > 0).length;
  return { wins, decisive: decisive.length };
}

// Risk Adjustment: a gain on a high-beta (volatile) stock is a genuinely harder, riskier call
// to have gotten right, so it's worth more. A loss on a low-beta ("safe"/common) stock bucked
// an expected stable trend, so it's worth notably more against you — while a loss on a stock
// that's genuinely volatile was closer to expected, so it's discounted. Beta near 1 is neutral.
function riskMultiplier(beta: number, edgePct: number): number {
  const b = Number.isFinite(beta) && beta > 0 ? beta : 1;
  if (edgePct >= 0) {
    return Math.max(0.85, Math.min(1.5, 1 + (b - 1) * 0.35));
  }
  return Math.max(0.6, Math.min(2.2, 1 + (1 - b) * 0.9));
}

function riskAdjustedEdgePct(call: Call, quotes: Record<string, Quote>, betas: Record<string, number>): number {
  const edge = callEdgePct(call, quotes);
  return edge * riskMultiplier(betas[call.symbol] ?? 1, edge);
}

// Dynamic Scaling: a stand-in for VIX built from real data we already have — the live
// cross-sectional dispersion of % change across every symbol currently on screen. Calm,
// low-dispersion markets damp the meter toward the middle; turbulent, high-dispersion markets
// let it swing further toward the extremes for the same underlying performance.
function computeMarketVolatility(quotes: Record<string, Quote>): number {
  const changes = Object.values(quotes)
    .map((q) => q.percentChange)
    .filter((n) => Number.isFinite(n));
  if (changes.length < 3) return 1; // not enough live data yet — assume a calm baseline
  const mean = changes.reduce((a, b) => a + b, 0) / changes.length;
  const variance = changes.reduce((a, b) => a + (b - mean) ** 2, 0) / changes.length;
  return Math.sqrt(variance);
}

function volatilityScalarFor(marketVolatility: number): number {
  // ~0.8pp dispersion is a calm baseline (scalar ≈ 1); ~2.5pp+ is turbulent (scalar → 1.6).
  return Math.max(0.65, Math.min(1.6, 0.7 + marketVolatility * 0.36));
}

// Factor 1: Track Record (35%) — win rate on closed calls, breakeven "pushes" excluded
function trackRecordFactor(calls: Call[]): ScoreFactor {
  const closed = calls.filter((c) => c.closedAt);
  if (closed.length === 0) {
    return {
      key: "track_record",
      label: "Track Record",
      weight: 0.35,
      value: 68,
      blurb: "No closed calls yet — starting from a neutral baseline.",
    };
  }
  const { wins, decisive } = winRateExcludingPushes(closed);
  if (decisive === 0) {
    return {
      key: "track_record",
      label: "Track Record",
      weight: 0.35,
      value: 68,
      blurb: `${closed.length} closed call${closed.length === 1 ? "" : "s"} landed at breakeven — starting from a neutral baseline.`,
    };
  }
  const winRate = wins / decisive;
  const pushes = closed.length - decisive;
  return {
    key: "track_record",
    label: "Track Record",
    weight: 0.35,
    value: clamp(winRate * 100),
    blurb: `${wins}/${decisive} closed calls were correct${pushes > 0 ? ` (${pushes} breakeven excluded)` : ""}.`,
  };
}

// Factor 2: Current Accuracy (40%) — how your open calls are doing right now, on average.
// Continuous around a neutral 50 at 0% edge, so opening a call at the current price never
// jumps the score by itself — only the live price moving from there does. Edges are risk
// adjusted first, so the same % move counts for more or less depending on the stock's beta.
function currentAccuracyFactor(calls: Call[], quotes: Record<string, Quote>, betas: Record<string, number>): ScoreFactor {
  const open = calls.filter((c) => !c.closedAt);
  if (open.length === 0) {
    return {
      key: "current_accuracy",
      label: "Current Accuracy",
      weight: 0.4,
      value: 50,
      blurb: "You don't have any active calls right now.",
    };
  }
  const rawEdges = open.map((c) => callEdgePct(c, quotes));
  const adjEdges = open.map((c) => riskAdjustedEdgePct(c, quotes, betas));
  const avgRawEdge = rawEdges.reduce((a, b) => a + b, 0) / rawEdges.length;
  const avgAdjEdge = adjEdges.reduce((a, b) => a + b, 0) / adjEdges.length;
  const winning = rawEdges.filter((e) => e > 0).length;
  return {
    key: "current_accuracy",
    label: "Current Accuracy",
    weight: 0.4,
    value: clamp(50 + avgAdjEdge * 1.5),
    blurb: `${winning}/${open.length} active calls are currently in your favor (${avgRawEdge >= 0 ? "+" : ""}${avgRawEdge.toFixed(2)}% avg).`,
  };
}

// Factor 3: Length of History (15%) — account age + hold duration, open positions included.
// A call still counts its time held even while open, so staying in a long-term position keeps
// pushing this factor up in real time rather than only paying off once you close it.
//
// Both sub-scores are blended from a neutral 50 (not 0), same as every other factor's "no data
// yet" baseline (Track Record starts at 68, Current Accuracy at 50) — a brand new account with
// a freshly opened call has genuinely done nothing wrong yet, so it shouldn't score as if it had.
// Without this, opening your very first call cliffs this factor from "unused" straight to 0,
// which alone was worth ~45+ score points — directly contradicting the intent documented on
// Current Accuracy above, that opening a call should never move the score by itself.
function historyLengthFactor(state: PortfolioState): ScoreFactor {
  const ageDays = (Date.now() - state.createdAt) / 86_400_000;
  const ageScore = 50 + clamp((ageDays / 30) * 100) * 0.5;

  const now = Date.now();
  const holdDurationsDays = state.calls.map((c) => (c.closedAt ?? now) - c.openedAt).map((ms) => ms / 86_400_000);

  let holdScore = 50;
  let longestHoldDays = 0;
  if (holdDurationsDays.length > 0) {
    longestHoldDays = Math.max(...holdDurationsDays);
    const avgHoldDays = holdDurationsDays.reduce((a, b) => a + b, 0) / holdDurationsDays.length;
    // Full credit at a 21-day average hold — genuinely long-term, not just overnight.
    holdScore = 50 + clamp((avgHoldDays / 21) * 100) * 0.5;
  }

  const value = clamp(ageScore * 0.35 + holdScore * 0.65);
  const roundedLongest = Math.round(longestHoldDays);
  return {
    key: "history_length",
    label: "Length of History",
    weight: 0.15,
    value,
    blurb:
      roundedLongest >= 1
        ? `Longest position held ${roundedLongest} day${roundedLongest === 1 ? "" : "s"} — staying in longer keeps paying off.`
        : "Rewards a longer track record and patience sticking with a call.",
  };
}

// Factor 4: Conviction Mix (10%) — diversification across distinct symbols
function convictionMixFactor(calls: Call[]): ScoreFactor {
  const distinct = new Set(calls.filter((c) => !c.closedAt).map((c) => c.symbol)).size;
  const value = clamp((distinct / 6) * 100);
  return {
    key: "conviction_mix",
    label: "Conviction Mix",
    weight: 0.1,
    value,
    blurb: `Backing ${distinct} distinct ${distinct === 1 ? "stock" : "stocks"} right now.`,
  };
}

// A single call's real, performance-driven contribution to the current score — the actual
// scoring engine run as-is versus with just that one call's P/L neutralized to breakeven,
// everything else (having the position at all, hold duration, diversification) held equal.
// Isolating performance this way (rather than removing the call outright) keeps the number
// aligned with what it sits next to: a losing position reads negative, a winning one positive,
// a flat one ~0 — removing the call entirely also strips structural credit (e.g. conviction mix,
// history length) that has nothing to do with how the trade is actually performing.
export function scoreImpactForCall(
  state: PortfolioState,
  callId: string,
  quotes: Record<string, Quote>,
  betas: Record<string, number> = {}
): number {
  const call = state.calls.find((c) => c.id === callId);
  if (!call) return 0;

  const full = computeCreditScore(state, quotes, betas).score;

  let neutral: number;
  if (call.closedAt) {
    const neutralCalls = state.calls.map((c) => (c.id === callId ? { ...c, exitPrice: c.entryPrice } : c));
    neutral = computeCreditScore({ ...state, calls: neutralCalls }, quotes, betas).score;
  } else {
    const liveQuote = quotes[call.symbol];
    const neutralQuotes = liveQuote ? { ...quotes, [call.symbol]: { ...liveQuote, price: call.entryPrice } } : quotes;
    neutral = computeCreditScore(state, neutralQuotes, betas).score;
  }

  return full - neutral;
}

export function computeCreditScore(
  state: PortfolioState,
  quotes: Record<string, Quote>,
  betas: Record<string, number> = {}
): CreditScoreResult {
  const factors = [
    trackRecordFactor(state.calls),
    currentAccuracyFactor(state.calls, quotes, betas),
    historyLengthFactor(state),
    convictionMixFactor(state.calls),
  ];

  // A brand new (or freshly reset) account has never made a call yet — start at a flat,
  // neutral 600 rather than whatever the factor baselines happen to compute to, so every
  // person's score genuinely begins in the same place.
  if (state.calls.length === 0) {
    const marketVolatility = computeMarketVolatility(quotes);
    return {
      score: 600,
      band: bandForScore(600),
      factors,
      avgEdgePct: 0,
      openCalls: 0,
      winRate: null,
      marketVolatility,
      volatilityScalar: volatilityScalarFor(marketVolatility),
    };
  }

  const weighted = factors.reduce((sum, f) => sum + f.value * f.weight, 0);

  const allEdges = state.calls.map((c) => callEdgePct(c, quotes));
  const avgEdgePct = allEdges.length > 0 ? allEdges.reduce((a, b) => a + b, 0) / allEdges.length : 0;

  const allAdjEdges = state.calls.map((c) => riskAdjustedEdgePct(c, quotes, betas));
  const avgAdjEdgePct = allAdjEdges.length > 0 ? allAdjEdges.reduce((a, b) => a + b, 0) / allAdjEdges.length : 0;
  const performanceBoost = clamp(50 + avgAdjEdgePct * 0.8, 0, 100);

  const weightedBlend = weighted * 0.7 + performanceBoost * 0.3;

  // Dynamic Scaling: pull the blend further from a neutral 50 (center of the meter) when the
  // market is turbulent, and compress it back toward center when things are calm — same
  // underlying performance, bigger or smaller swing depending on conditions.
  const marketVolatility = computeMarketVolatility(quotes);
  const volatilityScalar = volatilityScalarFor(marketVolatility);
  const blended = clamp(50 + (weightedBlend - 50) * volatilityScalar);

  const rawScore = 300 + (blended / 100) * 550;
  const score = Math.round(rawScore * 100) / 100;

  const closed = state.calls.filter((c) => c.closedAt);
  const { wins, decisive } = winRateExcludingPushes(closed);

  return {
    score: clamp(score, 300, 850),
    band: bandForScore(score),
    factors,
    avgEdgePct,
    openCalls: state.calls.filter((c) => !c.closedAt).length,
    winRate: decisive > 0 ? wins / decisive : null,
    marketVolatility,
    volatilityScalar,
  };
}
