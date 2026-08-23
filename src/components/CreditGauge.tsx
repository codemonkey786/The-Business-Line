import { useMemo, useState } from "react";
import { SCORE_BANDS, percentileForScore, type ScoreBand } from "../lib/creditScore";
import { useAnimatedNumber } from "../store/useAnimatedNumber";
import { scoreChangeOverPeriod, type ScorePoint } from "../lib/scoreHistoryStorage";

const SIZE_W = 760;
const SIZE_H = 225;
const CX = SIZE_W / 2;
const CY = 205;
const OUTER_R = 148;
const GAP_DEG = 2;
const MIN_SCORE = 300;
const MAX_SCORE = 850;

function polar(r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: CX + r * Math.cos(rad), y: CY - r * Math.sin(rad) };
}

function wedgePath(startAngle: number, endAngle: number) {
  const outerStart = polar(OUTER_R, startAngle);
  const outerEnd = polar(OUTER_R, endAngle);
  return `M ${CX} ${CY} L ${outerStart.x} ${outerStart.y} A ${OUTER_R} ${OUTER_R} 0 0 1 ${outerEnd.x} ${outerEnd.y} Z`;
}

// The six bands are drawn as equal-width wedges, but their score ranges aren't equal
// (Excellent is only 50 points wide vs. 100 for the rest) — so the needle has to be
// positioned by band-slot + fraction-within-band, not a straight (score-min)/(max-min)
// lerp across the whole 300-850 range, or it lands off the actual band boundaries.
function scorePct(score: number) {
  const clamped = Math.max(MIN_SCORE, Math.min(MAX_SCORE, score));
  const n = SCORE_BANDS.length;
  const i = Math.max(
    0,
    SCORE_BANDS.findIndex((b) => clamped <= b.max)
  );
  const b = SCORE_BANDS[i];
  const frac = b.max > b.min ? (clamped - b.min) / (b.max - b.min) : 0;
  return (i + Math.max(0, Math.min(1, frac))) / n;
}

const PERIODS: { label: string; ms: number }[] = [
  { label: "1D", ms: 24 * 60 * 60 * 1000 },
  { label: "1W", ms: 7 * 24 * 60 * 60 * 1000 },
  { label: "1M", ms: 30 * 24 * 60 * 60 * 1000 },
  { label: "3M", ms: 90 * 24 * 60 * 60 * 1000 },
];

interface Props {
  score: number;
  band: ScoreBand;
  delta?: number;
  scoreHistory?: ScorePoint[];
}

export function CreditGauge({ score, band, delta, scoreHistory = [] }: Props) {
  const percentile = percentileForScore(score);
  const needleAngle = 180 - scorePct(score) * 180;
  const color = bandColor(band);
  // A score sitting exactly on a band boundary (e.g. 600, right between Fair and
  // Good) points the needle right at the dividing line — so both wedges it touches
  // should glow, not just whichever one bandForScore happened to pick.
  const activeBands = useMemo(() => {
    const set = new Set<ScoreBand>([band]);
    const i = SCORE_BANDS.findIndex((b) => b.band === band);
    if (i > 0 && score === SCORE_BANDS[i].min) set.add(SCORE_BANDS[i - 1].band);
    if (i < SCORE_BANDS.length - 1 && score === SCORE_BANDS[i].max) set.add(SCORE_BANDS[i + 1].band);
    return set;
  }, [band, score]);
  const { value: animatedScore, direction: scoreDirection } = useAnimatedNumber(score);
  const scoreTextColor = scoreDirection === -1 ? "var(--color-down)" : scoreDirection === 1 ? "var(--color-up)" : "#ffffff";
  const [showPeriods, setShowPeriods] = useState(false);

  const periodChanges = useMemo(
    () => PERIODS.map((p) => ({ ...p, change: scoreChangeOverPeriod(scoreHistory, score, p.ms) })),
    [scoreHistory, score]
  );

  return (
    <div
      data-tour="score"
      className="board p-6 flex flex-col items-center"
      style={{ boxShadow: `0 0 60px -6px ${color}66, 0 0 120px -20px ${color}40, inset 0 0 80px -30px ${color}33` }}
    >
      <svg viewBox={`0 0 ${SIZE_W} ${SIZE_H}`} className="w-full max-w-[640px] overflow-visible">
        {SCORE_BANDS.map((b, i) => {
          const rawStart = 180 - i * 30;
          const rawEnd = 180 - (i + 1) * 30;
          const segStart = rawStart - GAP_DEG / 2;
          const segEnd = rawEnd + GAP_DEG / 2;
          const mid = (rawStart + rawEnd) / 2;
          const above = mid >= 60 && mid <= 120;

          const tickInner = polar(OUTER_R + 3, mid);
          const tickOuter = polar(OUTER_R + (above ? 30 : 34), mid);
          const labelAnchorX = tickOuter.x < CX ? "end" : tickOuter.x > CX ? "start" : "middle";
          const nameY = above ? tickOuter.y - 4 - 16 : tickOuter.y + 18;
          const rangeY = above ? tickOuter.y - 4 : nameY + 14;

          const isActive = activeBands.has(b.band);

          return (
            <g key={b.band}>
              <path
                d={wedgePath(segStart, segEnd)}
                fill={b.color}
                opacity={isActive ? 1 : 0.88}
                style={{ filter: isActive ? `drop-shadow(0 0 22px ${b.color}) drop-shadow(0 0 8px ${b.color})` : `drop-shadow(0 0 9px ${b.color}88)` }}
              />
              <line
                x1={tickInner.x}
                y1={tickInner.y}
                x2={tickOuter.x}
                y2={tickOuter.y}
                stroke={isActive ? b.color : "rgba(255,255,255,0.22)"}
                strokeWidth={isActive ? 1.5 : 1}
                style={isActive ? { filter: `drop-shadow(0 0 4px ${b.color})` } : undefined}
              />
              <text
                x={tickOuter.x}
                y={nameY}
                textAnchor={labelAnchorX}
                fontFamily="var(--font-display)"
                fontWeight={700}
                fontSize={15}
                letterSpacing={0.3}
                paintOrder="stroke"
                stroke={isActive ? "var(--color-ink)" : "var(--color-ink-dim)"}
                strokeWidth={0.7}
                fill={isActive ? "var(--color-ink)" : "var(--color-ink-dim)"}
                style={isActive ? { filter: `drop-shadow(0 0 6px ${b.color}cc)` } : undefined}
              >
                {b.band.toUpperCase()}
              </text>
              <text x={tickOuter.x} y={rangeY} textAnchor={labelAnchorX} fontFamily="var(--font-display)" fontSize={10} fill="var(--color-ink-faint)">
                {b.min}&ndash;{b.max}
              </text>
            </g>
          );
        })}

        <g
          style={{
            transform: `rotate(${90 - needleAngle}deg)`,
            transformOrigin: `${CX}px ${CY}px`,
            transition: "transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
            filter: "drop-shadow(0 0 10px rgba(255,255,255,0.95)) drop-shadow(0 0 22px rgba(255,255,255,0.5))",
          }}
        >
          <line x1={CX} y1={CY + 16} x2={CX} y2={CY - (OUTER_R - 16)} stroke="#ffffff" strokeWidth={3} strokeLinecap="round" />
        </g>
        <circle
          cx={CX}
          cy={CY}
          r={8}
          fill="#ffffff"
          style={{ filter: "drop-shadow(0 0 10px rgba(255,255,255,0.95)) drop-shadow(0 0 20px rgba(255,255,255,0.5))" }}
        />
        <circle cx={CX} cy={CY} r={3} fill="#000" />
      </svg>

      <div className="flex flex-col items-center -mt-2 w-full">
        <div className="flex items-center gap-3">
          <span
            className="display-bold text-6xl tracking-tight transition-colors duration-300"
            style={{ color: scoreTextColor, textShadow: `0 0 30px ${color}99, 0 0 60px ${color}55` }}
          >
            {animatedScore.toFixed(2)}
          </span>
        </div>
        <div
          className="relative flex items-center gap-2 mt-1 text-sm mono-num"
          onMouseEnter={() => setShowPeriods(true)}
          onMouseLeave={() => setShowPeriods(false)}
        >
          <span className="font-bold tracking-wide" style={{ color, textShadow: `0 0 12px ${color}aa` }}>
            {band.toUpperCase()}
          </span>
          <span className="text-[var(--color-ink-faint)]">|</span>
          <span className="text-[var(--color-ink-dim)]">TOP {percentile}%</span>
          {typeof delta === "number" && Math.abs(delta) > 0.001 && (
            <span className={`font-bold px-1.5 ${delta > 0 ? "text-[var(--color-up)]" : "text-[var(--color-down)]"}`}>
              {delta > 0 ? "+" : ""}
              {delta.toFixed(2)}
            </span>
          )}

          {showPeriods && (
            <div
              className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-56 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] shadow-2xl p-3 z-20"
              style={{ boxShadow: "0 12px 40px -8px rgba(0,0,0,0.6)" }}
            >
              <p className="term-label text-[10px] mb-2 text-[var(--color-ink-faint)]">Score Change</p>
              <div className="flex flex-col gap-1.5">
                {periodChanges.map((p) => (
                  <div key={p.label} className="flex items-center justify-between text-xs">
                    <span className="text-[var(--color-ink-dim)] font-semibold">{p.label}</span>
                    {p.change == null ? (
                      <span className="text-[var(--color-ink-faint)]">Collecting…</span>
                    ) : Math.abs(p.change) < 0.005 ? (
                      <span className="text-[var(--color-ink-dim)] font-bold">0.00</span>
                    ) : (
                      <span className={`font-bold ${p.change > 0 ? "text-[var(--color-up)]" : "text-[var(--color-down)]"}`}>
                        {p.change > 0 ? "+" : ""}
                        {p.change.toFixed(2)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function bandColor(band: ScoreBand): string {
  return SCORE_BANDS.find((b) => b.band === band)?.color ?? "var(--color-score-starter)";
}
