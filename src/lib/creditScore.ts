import type { Call, PortfolioState, Quote } from "./types";

export interface CreditScoreResult {
  score: number;
  band: ScoreBand;
  avgEdgePct: number;
  openCalls: number;
  winRate: number | null;
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

function clamp(n: number, min: number, max: number) {
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
// win or a loss in the win rate.
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
// This is still purely about that one stock's own movement (how hard was THIS move to call),
// not any other call, position, or account-level fact.
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

// The one thing that moves the score: each call's own price movement, converted straight to
// points, risk-adjusted for that same stock's volatility. Nothing else — not win rate, not
// account age, not how many other stocks you're backing — has any say in it. A call still
// counts (and keeps moving) while open; closing it just freezes this same number permanently.
const POINTS_PER_PERCENT_EDGE = 4;

function pointsForCall(call: Call, quotes: Record<string, Quote>, betas: Record<string, number>): number {
  return riskAdjustedEdgePct(call, quotes, betas) * POINTS_PER_PERCENT_EDGE;
}

// A call's own, permanent point contribution — literally what computeCreditScore sums over
// every call to get the total, isolated to just this one. Since the score is now a plain sum
// (no cross-call interactions to untangle), this is the direct formula rather than a diff.
export function scoreImpactForCall(
  state: PortfolioState,
  callId: string,
  quotes: Record<string, Quote>,
  betas: Record<string, number> = {}
): number {
  const call = state.calls.find((c) => c.id === callId);
  if (!call) return 0;
  return pointsForCall(call, quotes, betas);
}

export function computeCreditScore(
  state: PortfolioState,
  quotes: Record<string, Quote>,
  betas: Record<string, number> = {}
): CreditScoreResult {
  const totalPoints = state.calls.reduce((sum, c) => sum + pointsForCall(c, quotes, betas), 0);
  const score = clamp(Math.round((600 + totalPoints) * 100) / 100, 300, 850);

  const allEdges = state.calls.map((c) => callEdgePct(c, quotes));
  const avgEdgePct = allEdges.length > 0 ? allEdges.reduce((a, b) => a + b, 0) / allEdges.length : 0;

  const closed = state.calls.filter((c) => c.closedAt);
  const { wins, decisive } = winRateExcludingPushes(closed);

  return {
    score,
    band: bandForScore(score),
    avgEdgePct,
    openCalls: state.calls.filter((c) => !c.closedAt).length,
    winRate: decisive > 0 ? wins / decisive : null,
  };
}
