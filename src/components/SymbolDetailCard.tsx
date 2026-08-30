import { useEffect, useState } from "react";
import { Check, TrendingDown, TrendingUp, X } from "lucide-react";
import { CompanyLogo } from "./CompanyLogo";
import { PriceChart } from "./PriceChart";
import type { Call, CallDirection, PricePoint, Quote } from "../lib/types";

interface Props {
  symbol: string;
  companyName?: string;
  description?: string;
  quote?: Quote;
  history: PricePoint[];
  dailyHistory: PricePoint[];
  logoUrl?: string;
  activeCall?: Call;
  onPick: (direction: CallDirection) => void;
  onDivest: () => void;
  onClose: () => void;
}

export function SymbolDetailCard({
  symbol,
  companyName,
  description,
  quote,
  history,
  dailyHistory,
  logoUrl,
  activeCall,
  onPick,
  onDivest,
  onClose,
}: Props) {
  const positive = (quote?.change ?? 0) >= 0;
  const [pendingDirection, setPendingDirection] = useState<CallDirection | null>(null);
  const [confirmingDivest, setConfirmingDivest] = useState(false);

  // Switching symbols clears any confirmation left over from the previous one.
  useEffect(() => {
    setPendingDirection(null);
    setConfirmingDivest(false);
  }, [symbol]);

  function confirmPick() {
    if (!pendingDirection) return;
    onPick(pendingDirection);
    setPendingDirection(null);
  }

  function confirmDivest() {
    onDivest();
    setConfirmingDivest(false);
  }

  return (
    <div className="border-t border-[var(--color-border)] p-4">
      <div className="flex items-center gap-2.5 mb-3">
        <CompanyLogo symbol={symbol} logoUrl={logoUrl} size={36} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-[15px] truncate">{companyName || symbol}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="ticker-pill">{symbol}</span>
            <p className="mono-num text-[11px] text-[var(--color-ink-faint)]">· COMMON STOCK</p>
          </div>
        </div>
        <button
          onClick={onClose}
          title="Close"
          className="w-7 h-7 shrink-0 flex items-center justify-center rounded-full text-[var(--color-ink-faint)] hover:text-[var(--color-ink)] hover:bg-white/[0.06] transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {description && <p className="text-xs text-[var(--color-ink-dim)] leading-relaxed mb-3">{description}</p>}

      {quote ? (
        <>
          <div className="flex items-baseline gap-2">
            <span className="mono-num text-3xl font-semibold">{quote.price.toFixed(2)}</span>
            <span className="mono-num text-xs text-[var(--color-ink-faint)]">USD</span>
          </div>
          <p className={`text-sm font-semibold mono-num mt-0.5 ${positive ? "text-[var(--color-up)]" : "text-[var(--color-down)]"}`}>
            {positive ? "+" : ""}
            {quote.change.toFixed(2)} {positive ? "+" : ""}
            {quote.percentChange.toFixed(2)}%
          </p>

          <div className="-mx-1 mt-2">
            <PriceChart data={history} dailyData={dailyHistory} positive={positive} showRangeToggle height={92} />
          </div>

          <p className="mono-num text-[11px] text-[var(--color-ink-faint)] mt-1">
            UPDATED {new Date(quote.updatedAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
          </p>
        </>
      ) : (
        <div className="h-16 flex items-center text-xs text-[var(--color-ink-faint)]">Loading price…</div>
      )}

      {activeCall ? (
        <div className="mt-4">
          <div
            className={`flex items-center gap-1.5 mb-3 text-[13px] font-medium ${
              activeCall.direction === "UP" ? "text-[var(--color-up)]" : "text-[var(--color-down)]"
            }`}
          >
            {activeCall.direction === "UP" ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
            Backing {activeCall.direction === "UP" ? "Up" : "Down"} · Bought at ${activeCall.entryPrice.toFixed(2)}
          </div>

          {confirmingDivest ? (
            <div className="flex gap-2">
              <button
                onClick={confirmDivest}
                disabled={!quote}
                className="flex-1 flex items-center justify-center gap-1.5 py-3.5 rounded-full text-[15px] font-bold bg-white text-black hover:brightness-95 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                <Check size={16} strokeWidth={2.5} />
                Confirm Divest{quote ? ` at $${quote.price.toFixed(2)}` : ""}
              </button>
              <button
                onClick={() => setConfirmingDivest(false)}
                className="px-5 flex items-center justify-center rounded-full bg-white/[0.08] text-[var(--color-ink-dim)] hover:text-[var(--color-ink)] hover:bg-white/[0.14] transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmingDivest(true)}
              className="w-full flex items-center justify-center gap-1.5 py-3.5 rounded-full text-[15px] font-bold bg-white text-black hover:brightness-95 active:scale-[0.98] transition-all"
            >
              Divest
            </button>
          )}
        </div>
      ) : pendingDirection ? (
        <div className="flex gap-2 mt-4">
          <button
            onClick={confirmPick}
            disabled={!quote}
            className="flex-1 flex items-center justify-center gap-1.5 py-3.5 rounded-full text-[15px] font-bold bg-white text-black hover:brightness-95 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            <Check size={16} strokeWidth={2.5} />
            Confirm {pendingDirection === "UP" ? "Up" : "Down"}
            {quote ? ` at $${quote.price.toFixed(2)}` : ""}
          </button>
          <button
            onClick={() => setPendingDirection(null)}
            className="px-5 flex items-center justify-center rounded-full bg-white/[0.08] text-[var(--color-ink-dim)] hover:text-[var(--color-ink)] hover:bg-white/[0.14] transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setPendingDirection("UP")}
            className="flex-1 flex items-center justify-center gap-1.5 py-3.5 rounded-full text-[15px] font-bold text-black bg-[var(--color-up)] hover:brightness-95 active:scale-[0.98] transition-all"
          >
            <TrendingUp size={16} strokeWidth={2.5} />
            Go Up
          </button>
          <button
            onClick={() => setPendingDirection("DOWN")}
            className="flex-1 flex items-center justify-center gap-1.5 py-3.5 rounded-full text-[15px] font-bold text-black bg-[var(--color-down)] hover:brightness-95 active:scale-[0.98] transition-all"
          >
            <TrendingDown size={16} strokeWidth={2.5} />
            Go Down
          </button>
        </div>
      )}
    </div>
  );
}
