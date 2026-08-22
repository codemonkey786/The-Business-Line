import { useId, useMemo } from "react";
import { Inbox, TrendingDown, TrendingUp } from "lucide-react";
import { scoreImpactForCall } from "../lib/creditScore";
import { symbolColor } from "../lib/badge";
import type { Call, CompanyProfile, PortfolioState, PricePoint, Quote } from "../lib/types";
import { CompanyLogo } from "./CompanyLogo";

interface Props {
  state: PortfolioState;
  quotes: Record<string, Quote>;
  profiles: Record<string, CompanyProfile>;
  betas: Record<string, number>;
  winRate: number | null;
  status: "open" | "closed";
  history?: Record<string, PricePoint[]>;
}

// A minimal, self-contained trend line — deliberately not the full PriceChart (no axes, no
// hover chrome) so it reads at a glance inline in a table row.
function Sparkline({ data, positive }: { data: PricePoint[]; positive: boolean }) {
  const gradientId = useId();
  const { path, area } = useMemo(() => {
    if (data.length < 2) return { path: "", area: "" };
    const prices = data.map((d) => d.price);
    const lo = Math.min(...prices);
    const hi = Math.max(...prices);
    const span = hi - lo || 1;
    const w = 88;
    const h = 30;
    const pad = 3;
    const line = data
      .map((d, i) => {
        const x = (i / (data.length - 1)) * w;
        const y = pad + (1 - (d.price - lo) / span) * (h - pad * 2);
        return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(" ");
    return { path: line, area: `${line} L ${w} ${h} L 0 ${h} Z` };
  }, [data]);

  if (!path) return <span className="text-[var(--color-ink-faint)] text-xs">—</span>;
  const color = positive ? "var(--color-up)" : "var(--color-down)";
  return (
    <svg width={88} height={30} viewBox="0 0 88 30" className="overflow-visible">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.5} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradientId})`} />
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 4px ${color}aa)` }}
      />
    </svg>
  );
}

function Row({
  call,
  quotes,
  profiles,
  impact,
  trend,
}: {
  call: Call;
  quotes: Record<string, Quote>;
  profiles: Record<string, CompanyProfile>;
  impact: number;
  trend?: PricePoint[];
}) {
  const live = call.closedAt ? call.exitPrice! : quotes[call.symbol]?.price;
  // Your P/L is direction-adjusted (a "Down" bet profits when the stock falls) — but the stock's
  // own real move is worth showing too, so betting against it and still seeing "stock +0.3%"
  // isn't confusing.
  const rawChange = live != null ? ((live - call.entryPrice) / call.entryPrice) * 100 : null;
  const edge = rawChange != null ? rawChange * (call.direction === "UP" ? 1 : -1) : null;
  const positive = (edge ?? 0) >= 0;
  const rawPositive = (rawChange ?? 0) >= 0;
  const impactPositive = impact >= 0;
  const accent = symbolColor(call.symbol);

  return (
    <tr className="relative border-b border-[var(--color-border-soft)] last:border-0 hover:bg-white/[0.035] transition-colors">
      <td className="relative px-5 py-4">
        <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full" style={{ background: accent, boxShadow: `0 0 8px -1px ${accent}` }} />
        <div className="flex items-center gap-3">
          <CompanyLogo symbol={call.symbol} logoUrl={profiles[call.symbol]?.logo} size={30} />
          <span className="mono-num font-bold text-[17px]">{call.symbol}</span>
        </div>
      </td>
      <td className="py-4">
        <span
          className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${
            call.direction === "UP" ? "bg-[var(--color-up)] text-[#04150a]" : "bg-[var(--color-down)] text-[#1a0303]"
          }`}
        >
          {call.direction === "UP" ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {call.direction === "UP" ? "Up" : "Down"}
        </span>
      </td>
      <td className="mono-num text-right text-[var(--color-ink-dim)] text-[15px] py-4">${call.entryPrice.toFixed(2)}</td>
      <td className="mono-num text-right font-semibold text-[15px] py-4">{live != null ? `$${live.toFixed(2)}` : "—"}</td>
      {trend !== undefined && (
        <td className="py-4">
          <div className="flex justify-center">
            <Sparkline data={trend} positive={positive} />
          </div>
        </td>
      )}
      <td className="text-right py-4">
        <p
          className={`mono-num font-bold text-[17px] ${
            edge == null ? "text-[var(--color-ink-faint)]" : positive ? "text-[var(--color-up)]" : "text-[var(--color-down)]"
          }`}
        >
          {edge == null ? "—" : `${positive ? "+" : ""}${edge.toFixed(2)}%`}
        </p>
        {rawChange != null && call.direction === "DOWN" && Math.abs(rawChange) > 0.005 && (
          <p className="text-[11px] font-semibold text-[var(--color-ink-faint)]">stock {rawPositive ? "rose" : "fell"}</p>
        )}
      </td>
      <td
        className={`mono-num text-right font-bold text-[17px] px-5 py-4 ${
          impactPositive ? "text-[var(--color-up)]" : "text-[var(--color-down)]"
        }`}
      >
        {Math.abs(impact) < 0.05 ? "0 pts" : `${impactPositive ? "+" : ""}${impact.toFixed(1)} pts`}
      </td>
    </tr>
  );
}

// A clean, single-purpose table for one status at a time (open or closed) — kept separate
// rather than merged, so each section reads at a glance without a redundant status column.
export function PositionsTable({ state, quotes, profiles, betas, winRate, status, history }: Props) {
  const rows = state.calls.filter((c) => (status === "open" ? !c.closedAt : Boolean(c.closedAt)));

  // Open positions' marginal contribution is live — computed against the full call history by
  // running the actual scoring engine with and without that one call. Closed positions use their
  // frozen scoreImpact instead (set the moment they closed): a past trade's contribution is a
  // historical fact and shouldn't keep drifting with live, unrelated market conditions.
  const scoreImpacts = useMemo(() => {
    const live = state.calls.filter((c) => !c.closedAt || c.scoreImpact == null);
    const map = new Map<string, number>();
    for (const c of live) {
      map.set(c.id, scoreImpactForCall(state, c.id, quotes, betas));
    }
    return map;
  }, [state, quotes, betas]);

  const title = status === "open" ? "Active Positions" : "History";
  const emptyText = status === "open" ? "No active positions" : "No closed positions yet";
  const emptyHint = status === "open" ? "Back a stock Up or Down from the watchlist to open one." : "Positions you close will show up here.";
  const accentColor = status === "open" ? "var(--color-up)" : "var(--color-amber)";

  return (
    <div className="board mt-4 overflow-hidden" style={{ boxShadow: `0 0 40px -26px ${accentColor}aa` }}>
      <div className="h-[3px] w-full" style={{ background: `linear-gradient(90deg, ${accentColor}, transparent)` }} />
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2.5">
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: accentColor, boxShadow: `0 0 8px ${accentColor}` }} />
          <span className="display-bold text-2xl tracking-tight">{title}</span>
          <span className="mono-num text-xs font-bold text-[var(--color-ink-faint)]">{rows.length}</span>
        </div>
        {status === "closed" && (
          <span className="mono-num text-xs font-bold text-[var(--color-ink-dim)]">
            {winRate != null ? `${Math.round(winRate * 100)}% win rate` : "no decisive calls yet"}
          </span>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-[var(--color-ink-faint)]">
          <Inbox size={24} strokeWidth={1.5} />
          <p className="text-sm text-[var(--color-ink-dim)] mt-2">{emptyText}</p>
          <p className="text-xs mt-1">{emptyHint}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="mono-num text-[11px] text-[var(--color-ink-faint)] uppercase tracking-wider">
                <th className="text-left font-bold px-5 py-2.5">Symbol</th>
                <th className="text-left font-bold py-2.5">Direction</th>
                <th className="text-right font-bold py-2.5">Bought</th>
                <th className="text-right font-bold py-2.5">{status === "open" ? "Last" : "Sold"}</th>
                {history && <th className="font-bold py-2.5 text-center">Trend</th>}
                <th className="text-right font-bold py-2.5">P/L%</th>
                <th className="text-right font-bold px-5 py-2.5">Score Impact</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <Row
                  key={c.id}
                  call={c}
                  quotes={quotes}
                  profiles={profiles}
                  impact={c.scoreImpact ?? scoreImpacts.get(c.id) ?? 0}
                  trend={history ? history[c.symbol] ?? [] : undefined}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
