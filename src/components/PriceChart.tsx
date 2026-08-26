import { useId, useMemo, useRef, useState } from "react";
import type { PricePoint } from "../lib/types";

type Range = "1H" | "1D" | "1M" | "3M" | "6M" | "ALL";

const RANGE_ORDER: Range[] = ["1H", "1D", "1M", "3M", "6M", "ALL"];

const RANGE_CONFIG: Record<Range, { source: "intraday" | "daily"; windowMs: number | null }> = {
  "1H": { source: "intraday", windowMs: 60 * 60 * 1000 },
  "1D": { source: "intraday", windowMs: 24 * 60 * 60 * 1000 },
  "1M": { source: "daily", windowMs: 30 * 24 * 60 * 60 * 1000 },
  "3M": { source: "daily", windowMs: 90 * 24 * 60 * 60 * 1000 },
  "6M": { source: "daily", windowMs: 180 * 24 * 60 * 60 * 1000 },
  ALL: { source: "daily", windowMs: null },
};

interface Props {
  data: PricePoint[];
  dailyData?: PricePoint[];
  positive: boolean;
  height?: number;
  showRangeToggle?: boolean;
}

export function PriceChart({ data, dailyData = [], positive, height = 120, showRangeToggle = false }: Props) {
  const gradientId = useId();
  const width = 400;
  const [range, setRange] = useState<Range>("1H");
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const windowed = useMemo(() => {
    if (!showRangeToggle) return data;
    const config = RANGE_CONFIG[range];
    const source = config.source === "daily" ? dailyData : data;
    if (config.windowMs == null) return source;
    const cutoff = Date.now() - config.windowMs;
    const recent = source.filter((d) => d.t >= cutoff);

    // The market's been closed a while (weekend/overnight) and our own polling just keeps
    // re-recording the same frozen price — fall back to the last real session's actual
    // movement (e.g. Friday's close) instead of showing a dead flat line for "now".
    const recentPrices = new Set(recent.map((d) => d.price));
    if (config.source === "intraday" && recent.length >= 3 && recentPrices.size <= 1 && source.length > 0) {
      const lastPrice = source[source.length - 1].price;
      let lastMoveIdx = -1;
      for (let i = source.length - 1; i >= 0; i--) {
        if (source[i].price !== lastPrice) {
          lastMoveIdx = i;
          break;
        }
      }
      if (lastMoveIdx >= 0) {
        const anchor = source[lastMoveIdx].t;
        const sessionCutoff = anchor - config.windowMs;
        const session = source.filter((d) => d.t >= sessionCutoff && d.t <= anchor);
        if (session.length >= 2) return session;
      }
    }
    return recent;
  }, [data, dailyData, range, showRangeToggle]);

  const isLastSession = windowed.length > 0 && Date.now() - windowed[windowed.length - 1].t > 15 * 60 * 1000;

  const { linePath, areaPath, points, min, max, flat } = useMemo(() => {
    if (windowed.length < 2)
      return { linePath: "", areaPath: "", points: [] as { x: number; y: number; t: number; price: number }[], min: 0, max: 0, flat: false };

    const prices = windowed.map((d) => d.price);
    const lo = Math.min(...prices);
    const hi = Math.max(...prices);
    const span = hi - lo;
    const pad = 8;
    const isFlat = span === 0;

    const pts = windowed.map((d, i) => {
      const x = (i / (windowed.length - 1)) * width;
      const y = isFlat ? height / 2 : pad + (1 - (d.price - lo) / span) * (height - pad * 2);
      return { x, y, t: d.t, price: d.price };
    });

    const line = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ");
    const area = `${line} L ${width} ${height} L 0 ${height} Z`;
    return { linePath: line, areaPath: area, points: pts, min: lo, max: hi, flat: isFlat };
  }, [windowed, height]);

  // Genuinely no price movement across several real samples (not just "not enough history
  // yet") — the underlying feed isn't ticking for this symbol, so don't claim it's LIVE.
  const noRecentTicks = flat && windowed.length >= 3 && !isLastSession;

  const color = noRecentTicks ? "var(--color-ink-faint)" : positive ? "var(--color-up)" : "var(--color-down)";
  const lastPoint = points[points.length - 1];
  const hovered = hoverIndex != null ? points[hoverIndex] : null;

  function handleMove(e: React.MouseEvent<SVGSVGElement>) {
    if (!svgRef.current || points.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * width;
    const idx = Math.round((relX / width) * (points.length - 1));
    setHoverIndex(Math.max(0, Math.min(points.length - 1, idx)));
  }

  const formatLabel = (t: number) =>
    RANGE_CONFIG[range].source === "intraday"
      ? isLastSession
        ? new Date(t).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
        : new Date(t).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
      : new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

  const rangeToggle = showRangeToggle && (
    <div className="flex items-center gap-0.5">
      {RANGE_ORDER.map((r) => (
        <button
          key={r}
          onClick={() => {
            setRange(r);
            setHoverIndex(null);
          }}
          className={`mono-num text-[10px] font-semibold px-1.5 py-0.5 rounded transition-colors ${
            range === r ? "bg-white/[0.12] text-[var(--color-ink)]" : "text-[var(--color-ink-faint)] hover:text-[var(--color-ink-dim)]"
          }`}
        >
          {r}
        </button>
      ))}
    </div>
  );

  if (!linePath) {
    return (
      <div>
        {rangeToggle && <div className="flex justify-end mb-1">{rangeToggle}</div>}
        <div style={{ height }} className="flex items-center justify-center text-xs text-[var(--color-ink-faint)] text-center px-4">
          {data.length < 2
            ? "Collecting live price data…"
            : `Not enough real history yet for ${range} — this fills in the longer you use the app.`}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5 gap-2 min-h-[16px]">
        {hovered ? (
          <span className="mono-num text-[11px] text-[var(--color-ink-dim)] whitespace-nowrap overflow-hidden text-ellipsis min-w-0">
            <span className="font-semibold text-[var(--color-ink)]">${hovered.price.toFixed(2)}</span> · {formatLabel(hovered.t)}
          </span>
        ) : (
          <span className="mono-num text-[11px] text-[var(--color-ink-faint)] whitespace-nowrap overflow-hidden text-ellipsis min-w-0">
            {formatLabel(windowed[0].t)} &ndash; {formatLabel(windowed[windowed.length - 1].t)}
          </span>
        )}
        <div className="flex items-center gap-2.5 shrink-0">
          {!hovered &&
            (isLastSession ? (
              <div className="flex items-center gap-1.5 mono-num text-[9px] tracking-wider text-[var(--color-ink-faint)]">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-ink-faint)]" />
                LAST SESSION
              </div>
            ) : noRecentTicks ? (
              <div className="flex items-center gap-1.5 mono-num text-[9px] tracking-wider text-[var(--color-ink-faint)]">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-ink-faint)]" />
                NO RECENT TICKS
              </div>
            ) : (
              <div className="flex items-center gap-1.5 mono-num text-[9px] tracking-wider text-[var(--color-ink-faint)]">
                <span className="live-dot" style={{ background: color }} />
                LIVE
              </div>
            ))}
          {rangeToggle}
        </div>
      </div>
      <div className="relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          width="100%"
          height={height}
          preserveAspectRatio="none"
          className="cursor-crosshair overflow-visible"
          onMouseMove={handleMove}
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <path d={areaPath} fill={`url(#${gradientId})`} />
          <path d={linePath} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

          {hovered ? (
            <>
              <line x1={hovered.x} y1={0} x2={hovered.x} y2={height} stroke="rgba(255,255,255,0.25)" strokeWidth={1} strokeDasharray="3 3" />
              <circle cx={hovered.x} cy={hovered.y} r={4} fill="#fff" stroke={color} strokeWidth={2} />
            </>
          ) : (
            lastPoint && (
              <>
                {!noRecentTicks && !isLastSession && (
                  <circle cx={lastPoint.x} cy={lastPoint.y} r={3} fill="none" stroke={color} strokeWidth={2} opacity={0.7}>
                    <animate attributeName="r" values="3;11" dur="1.8s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.7;0" dur="1.8s" repeatCount="indefinite" />
                  </circle>
                )}
                <circle cx={lastPoint.x} cy={lastPoint.y} r={3} fill={color} />
              </>
            )
          )}
        </svg>
      </div>
      {min !== max && (
        <div className="flex items-center justify-between mt-1 mono-num text-[9px] text-[var(--color-ink-faint)]">
          <span>${min.toFixed(2)}</span>
          <span>${max.toFixed(2)}</span>
        </div>
      )}
    </div>
  );
}
