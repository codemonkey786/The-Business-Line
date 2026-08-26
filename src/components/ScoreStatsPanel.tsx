import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { ScorePoint } from "../lib/scoreHistoryStorage";

interface Props {
  history: ScorePoint[];
  dailyHistory: ScorePoint[];
  bandColor?: string;
}

type Range = "1D" | "1W" | "1M" | "3M" | "1Y" | "ALL";

const RANGE_ORDER: Range[] = ["1D", "1W", "1M", "3M", "1Y", "ALL"];

const RANGE_CONFIG: Record<Range, { source: "intraday" | "daily"; windowMs: number | null }> = {
  "1D": { source: "intraday", windowMs: 24 * 60 * 60 * 1000 },
  "1W": { source: "daily", windowMs: 7 * 24 * 60 * 60 * 1000 },
  "1M": { source: "daily", windowMs: 30 * 24 * 60 * 60 * 1000 },
  "3M": { source: "daily", windowMs: 90 * 24 * 60 * 60 * 1000 },
  "1Y": { source: "daily", windowMs: 365 * 24 * 60 * 60 * 1000 },
  ALL: { source: "daily", windowMs: null },
};

// A plain straight-segment polyline — the score jumps to a new value each time it's
// recomputed rather than drifting continuously, so a spline here (tried earlier) overshoots
// wildly between closely-spaced, sharply-alternating points, producing spiky artifacts that
// don't reflect the real data. Straight segments stay honest and accurate at any zoom level.
function linePathFor(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return "";
  return pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ");
}

// Rounds a raw step size up to a "nice" round number (1/2/5 × a power of ten) so axis labels
// read like 545/550/555 instead of arbitrary interpolated values like 548.32/554.7.
function niceStep(rawStep: number): number {
  if (!(rawStep > 0)) return 1;
  const exponent = Math.floor(Math.log10(rawStep));
  const fraction = rawStep / Math.pow(10, exponent);
  const niceFraction = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
  return niceFraction * Math.pow(10, exponent);
}

const NICE_TIME_STEPS_MS = [
  5 * 60 * 1000,
  15 * 60 * 1000,
  30 * 60 * 1000,
  60 * 60 * 1000,
  2 * 60 * 60 * 1000,
  3 * 60 * 60 * 1000,
  4 * 60 * 60 * 1000,
  6 * 60 * 60 * 1000,
  12 * 60 * 60 * 1000,
  24 * 60 * 60 * 1000,
  2 * 24 * 60 * 60 * 1000,
  3 * 24 * 60 * 60 * 1000,
  7 * 24 * 60 * 60 * 1000,
  14 * 24 * 60 * 60 * 1000,
  30 * 24 * 60 * 60 * 1000,
  90 * 24 * 60 * 60 * 1000,
  180 * 24 * 60 * 60 * 1000,
  365 * 24 * 60 * 60 * 1000,
];

// Snaps time ticks to clean clock/calendar boundaries (on the hour, every few hours, whole
// days) instead of raw fractions of the data's exact start/end timestamps.
function niceTimeStep(spanMs: number, targetCount: number): number {
  const raw = spanMs / Math.max(targetCount, 1);
  for (const step of NICE_TIME_STEPS_MS) {
    if (step >= raw) return step;
  }
  return NICE_TIME_STEPS_MS[NICE_TIME_STEPS_MS.length - 1];
}


export function ScoreStatsPanel({ history, dailyHistory, bandColor = "var(--color-score-starter)" }: Props) {
  const [range, setRange] = useState<Range>("1D");
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const gradientId = useId();
  const clipId = useId();
  // Tracks the SVG's actual rendered pixel width so the viewBox can match it 1:1 — otherwise
  // preserveAspectRatio="none" scales the x-axis non-uniformly relative to y, which visibly
  // stretches text and geometry wider than intended once the container is much wider than a
  // fixed viewBox.
  const [width, setWidth] = useState(760);
  const height = 260;
  const padL = 46;
  const padR = 8;
  const padT = 12;
  const padB = 26;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;
  const Y_TICKS = 5;
  const X_TICKS = 5;

  const windowed = useMemo(() => {
    const config = RANGE_CONFIG[range];
    const source = config.source === "daily" ? dailyHistory : history;
    if (config.windowMs == null) return source;
    const cutoff = Date.now() - config.windowMs;
    return source.filter((p) => p.t >= cutoff);
  }, [history, dailyHistory, range]);

  const { linePath, areaPath, points, positive, yTicks, xTicks } = useMemo(() => {
    const empty = {
      linePath: "",
      areaPath: "",
      points: [] as { x: number; y: number; t: number; score: number }[],
      min: 0,
      max: 0,
      positive: true,
      yTicks: [] as { y: number; value: number }[],
      xTicks: [] as { x: number; t: number }[],
    };
    if (windowed.length < 2) return empty;

    const scores = windowed.map((p) => p.score);
    const sortedScores = [...scores].sort((a, b) => a - b);
    const trueMax = sortedScores[sortedScores.length - 1];
    const trueMin = sortedScores[0];
    const flat = trueMax === trueMin;
    // Full true range, not a trimmed one — every real dip or spike should render at its actual
    // height rather than getting clipped off at the plot edge. A little headroom keeps the line
    // from pressing flush against the top/bottom gridline.
    const headroom = flat ? 0 : Math.max((trueMax - trueMin) * 0.08, 2);
    const hi = flat ? trueMax : trueMax + headroom;
    const lo = flat ? trueMin : trueMin - headroom;
    const span = hi - lo || 1;
    const t0 = windowed[0].t;
    const t1 = windowed[windowed.length - 1].t;
    const tSpan = t1 - t0 || 1;

    const scoreToY = (score: number) => (flat ? padT + plotH / 2 : padT + (1 - (score - lo) / span) * plotH);
    const timeToX = (t: number) => padL + ((t - t0) / tSpan) * plotW;

    const pts = windowed.map((p) => ({ x: timeToX(p.t), y: scoreToY(p.score), t: p.t, score: p.score }));
    const line = linePathFor(pts);
    const area = `${line} L ${padL + plotW} ${padT + plotH} L ${padL} ${padT + plotH} Z`;

    const yTicks: { y: number; value: number }[] = [];
    if (flat) {
      yTicks.push({ y: scoreToY(lo), value: Math.round(lo) });
    } else {
      const yStep = niceStep(span / (Y_TICKS - 1));
      for (let v = Math.ceil(lo / yStep) * yStep; v <= hi + 0.001; v += yStep) {
        yTicks.push({ y: scoreToY(v), value: v });
      }
    }

    const xTicks: { x: number; t: number }[] = [];
    const xStep = niceTimeStep(tSpan, X_TICKS - 1);
    for (let t = Math.ceil(t0 / xStep) * xStep; t <= t1; t += xStep) {
      xTicks.push({ x: timeToX(t), t });
    }
    if (xTicks.length === 0) xTicks.push({ x: timeToX(t0), t: t0 }, { x: timeToX(t1), t: t1 });

    return { linePath: line, areaPath: area, points: pts, min: lo, max: hi, positive: scores[scores.length - 1] >= scores[0], yTicks, xTicks };
  }, [windowed, width]);

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const update = () => {
      const w = el.getBoundingClientRect().width;
      if (w > 0) setWidth(w);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [linePath]);

  const color = positive ? "var(--color-up)" : "var(--color-down)";
  const lastPoint = points[points.length - 1];
  const hovered = hoverIndex != null ? points[hoverIndex] : null;
  const periodDelta = points.length > 1 ? points[points.length - 1].score - points[0].score : 0;
  const periodPct = points.length > 1 && points[0].score !== 0 ? (periodDelta / points[0].score) * 100 : 0;
  const displayed = hovered ?? lastPoint;

  function handleMove(e: React.MouseEvent<SVGSVGElement>) {
    if (!svgRef.current || points.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * width;
    let nearest = 0;
    let nearestDist = Infinity;
    for (let i = 0; i < points.length; i++) {
      const d = Math.abs(points[i].x - relX);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = i;
      }
    }
    setHoverIndex(nearest);
  }

  const formatTick = (t: number) =>
    RANGE_CONFIG[range].source === "intraday"
      ? new Date(t).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
      : new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

  const formatHoverLabel = (t: number) =>
    RANGE_CONFIG[range].source === "intraday"
      ? new Date(t).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", second: "2-digit" })
      : new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

  // A real date range instead of exposing the raw sample count — "1D · 1,036 samples" is an
  // implementation detail, not something a viewer of the chart needs to know.
  const rangeSpan = (() => {
    if (points.length < 2) return "";
    const start = points[0].t;
    const end = points[points.length - 1].t;
    if (RANGE_CONFIG[range].source === "intraday") {
      const sameDay = new Date(start).toDateString() === new Date(end).toDateString();
      return sameDay
        ? new Date(start).toLocaleDateString(undefined, { month: "short", day: "numeric" })
        : `${new Date(start).toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${new Date(end).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
    }
    return `${new Date(start).toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${new Date(end).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
  })();

  const rangeToggle = (
    <div className="flex items-center gap-0.5 bg-white/[0.04] rounded-lg p-0.5">
      {RANGE_ORDER.map((r) => (
        <button
          key={r}
          onClick={() => {
            setRange(r);
            setHoverIndex(null);
          }}
          className={`mono-num text-[11px] font-bold px-2.5 py-1 rounded-md transition-colors ${
            range === r ? "bg-white/[0.12] text-[var(--color-ink)]" : "text-[var(--color-ink-faint)] hover:text-[var(--color-ink-dim)]"
          }`}
        >
          {r}
        </button>
      ))}
    </div>
  );

  return (
    <div className="board mt-4 overflow-hidden" style={points.length > 0 ? { boxShadow: `0 0 40px -20px ${color}66` } : undefined}>
      <div className="h-[3px] w-full" style={{ background: `linear-gradient(90deg, ${color}, transparent)` }} />
      <div className="flex items-center justify-between px-6 pt-5 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="term-label text-[11px] tracking-widest" style={{ color: bandColor }}>
              SCORE PROGRESSION
            </span>
            {points.length > 0 && !hovered && (
              <span className="flex items-center gap-1.5 mono-num text-[9px] font-bold tracking-wider shrink-0" style={{ color }}>
                <span className="live-dot" style={{ background: color }} />
                LIVE
              </span>
            )}
          </div>
          {points.length > 0 && displayed ? (
            <>
              <div className="flex items-baseline gap-2">
                <span className="display-bold text-[28px] leading-none tracking-tight text-[var(--color-ink)]">
                  {displayed.score.toFixed(2)}
                </span>
                {!hovered && (
                  <span className="mono-num text-[12px] font-bold flex items-center gap-1" style={{ color }}>
                    {periodDelta >= 0 ? "+" : ""}
                    {periodDelta.toFixed(2)} ({periodDelta >= 0 ? "+" : ""}
                    {periodPct.toFixed(2)}%)
                  </span>
                )}
              </div>
              <p className="mono-num text-[11px] text-[var(--color-ink-faint)] mt-1">
                {hovered ? formatHoverLabel(hovered.t) : rangeSpan}
              </p>
            </>
          ) : (
            <div className="h-[44px]" />
          )}
        </div>
        {rangeToggle}
      </div>

      <div className="px-2 pb-4 pt-2">
        {!linePath ? (
          <div style={{ height }} className="flex items-center justify-center text-sm text-[var(--color-ink-faint)] text-center px-4">
            {history.length === 0 && dailyHistory.length === 0
              ? "Collecting real score history — a genuine snapshot is recorded every few seconds, so this fills in the longer you use the app."
              : `Not enough real history yet for ${range} — this fills in the longer you use the app.`}
          </div>
        ) : (
          <svg
            ref={svgRef}
            viewBox={`0 0 ${width} ${height}`}
            width="100%"
            height={height}
            preserveAspectRatio="none"
            className="overflow-visible cursor-crosshair"
            onMouseMove={handleMove}
            onMouseLeave={() => setHoverIndex(null)}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
              <clipPath id={clipId}>
                <rect x={padL} y={padT} width={plotW} height={plotH} />
              </clipPath>
            </defs>

            {yTicks.map((t) => (
              <g key={t.y}>
                <line x1={padL} x2={padL + plotW} y1={t.y} y2={t.y} stroke="var(--color-border-soft)" strokeWidth={1} />
                <text
                  x={padL - 10}
                  y={t.y + 3.5}
                  textAnchor="end"
                  fontFamily="var(--font-sans)"
                  fontWeight={700}
                  fontSize={11}
                  fill="var(--color-ink-dim)"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {Math.round(t.value)}
                </text>
              </g>
            ))}

            {xTicks.map((t, i) => (
              <text
                key={t.x}
                x={t.x}
                y={height - 6}
                textAnchor={i === 0 ? "start" : i === xTicks.length - 1 ? "end" : "middle"}
                fontFamily="var(--font-sans)"
                fontWeight={700}
                fontSize={11}
                fill="var(--color-ink-dim)"
              >
                {formatTick(t.t)}
              </text>
            ))}

            <g clipPath={`url(#${clipId})`}>
              <path d={areaPath} fill={`url(#${gradientId})`} />
              <path
                d={linePath}
                fill="none"
                stroke={color}
                strokeWidth={1.75}
                strokeLinejoin="round"
                strokeLinecap="round"
                style={{ filter: `drop-shadow(0 0 4px ${color}88)` }}
              />
            </g>
            {hovered ? (
              <>
                <line
                  x1={hovered.x}
                  x2={hovered.x}
                  y1={padT}
                  y2={padT + plotH}
                  stroke="rgba(255,255,255,0.28)"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                />
                <circle
                  cx={hovered.x}
                  cy={Math.max(padT, Math.min(padT + plotH, hovered.y))}
                  r={5}
                  fill="#fff"
                  stroke={color}
                  strokeWidth={2.5}
                />
                {(() => {
                  const boxW = 90;
                  const boxH = 34;
                  const cy = Math.max(padT, Math.min(padT + plotH, hovered.y));
                  const bx = Math.min(Math.max(hovered.x - boxW / 2, padL), padL + plotW - boxW);
                  const by = Math.max(padT, cy - boxH - 12);
                  return (
                    <g pointerEvents="none">
                      <rect x={bx} y={by} width={boxW} height={boxH} rx={7} fill="rgba(12,12,14,0.94)" stroke="var(--color-border-soft)" strokeWidth={1} />
                      <text
                        x={bx + boxW / 2}
                        y={by + 16}
                        textAnchor="middle"
                        fontFamily="var(--font-sans)"
                        fontWeight={700}
                        fontSize={13}
                        fill="#fff"
                        style={{ fontVariantNumeric: "tabular-nums" }}
                      >
                        {hovered.score.toFixed(2)}
                      </text>
                      <text
                        x={bx + boxW / 2}
                        y={by + 27}
                        textAnchor="middle"
                        fontFamily="var(--font-sans)"
                        fontWeight={600}
                        fontSize={9}
                        fill="var(--color-ink-faint)"
                      >
                        {formatHoverLabel(hovered.t)}
                      </text>
                    </g>
                  );
                })()}
              </>
            ) : (
              lastPoint &&
              (() => {
                const cy = Math.max(padT, Math.min(padT + plotH, lastPoint.y));
                return (
                  <>
                    <circle cx={lastPoint.x} cy={cy} r={4.5} fill="none" stroke={color} strokeWidth={2} opacity={0.7}>
                      <animate attributeName="r" values="4.5;14" dur="1.8s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.7;0" dur="1.8s" repeatCount="indefinite" />
                    </circle>
                    <circle cx={lastPoint.x} cy={cy} r={4.5} fill={color} />
                  </>
                );
              })()
            )}
          </svg>
        )}
      </div>
    </div>
  );
}
