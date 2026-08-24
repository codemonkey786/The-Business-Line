import type { ScoreFactor } from "../lib/creditScore";

interface Props {
  factors: ScoreFactor[];
}

// Every factor is centered on 50 = neutral ("no signal either way, same as your flat 600
// start") — below 50 is actively dragging the score down, above 50 is actively lifting it.
// Surfacing this is the direct answer to "why did my score move when this trade barely did":
// a single position's own P/L (shown elsewhere as its isolated Score Impact) is only one input
// into one of these four factors, not the whole score.
function FactorRow({ factor }: { factor: ScoreFactor }) {
  const pct = Math.max(0, Math.min(100, Math.round(factor.value)));
  const color = pct >= 50 ? "var(--color-up)" : "var(--color-down)";
  return (
    <div className="px-5 py-3 border-b border-[var(--color-border-soft)] last:border-0">
      <div className="flex items-center justify-between gap-3 mb-1.5">
        <span className="text-sm font-bold truncate">{factor.label}</span>
        <span className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] font-semibold text-[var(--color-ink-faint)] uppercase tracking-wide">
            {Math.round(factor.weight * 100)}% weight
          </span>
          <span className="mono-num text-sm font-bold w-8 text-right" style={{ color }}>
            {pct}
          </span>
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
      </div>
      <p className="text-xs text-[var(--color-ink-faint)] mt-1.5">{factor.blurb}</p>
    </div>
  );
}

export function ScoreFactorsPanel({ factors }: Props) {
  return (
    <div className="board mt-4 overflow-hidden">
      <div className="px-5 py-4 border-b border-[var(--color-border)]">
        <span className="term-label text-[11px] tracking-widest" style={{ color: "#ffffff" }}>
          SCORE FACTORS
        </span>
        <p className="text-xs text-[var(--color-ink-faint)] mt-1">
          What actually moves your score, and by how much. 50 is neutral — same as your 600 starting point.
        </p>
      </div>
      {factors.map((f) => (
        <FactorRow key={f.key} factor={f} />
      ))}
    </div>
  );
}
