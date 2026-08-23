import { useState } from "react";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import type { CompanyProfile, Quote } from "../lib/types";
import { CompanyLogo } from "./CompanyLogo";
import { StockSearch } from "./StockSearch";

interface Props {
  watchlist: string[];
  quotes: Record<string, Quote>;
  profiles: Record<string, CompanyProfile>;
  selectedSymbol: string | null;
  onView: (symbol: string) => void;
  onAddSymbol: (symbol: string) => void;
  onRemoveSymbol: (symbol: string) => void;
}

function Row({
  symbol,
  quote,
  logoUrl,
  selected,
  onSelect,
  onRemove,
}: {
  symbol: string;
  quote?: Quote;
  logoUrl?: string;
  selected: boolean;
  onSelect: () => void;
  onRemove: () => void;
}) {
  const change = quote?.change ?? 0;
  const percentChange = quote?.percentChange ?? 0;
  const positive = change >= 0;
  const changeColor = positive ? "text-[var(--color-up)]" : "text-[var(--color-down)]";

  return (
    <div
      onClick={onSelect}
      className={`group relative flex items-center gap-2 pl-3.5 pr-2 py-2.5 cursor-pointer transition-colors border-b border-[var(--color-border-soft)] ${
        selected ? "bg-white/[0.07]" : "hover:bg-white/[0.045]"
      }`}
    >
      {selected && <span className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: "var(--color-amber)" }} />}

      <CompanyLogo symbol={symbol} logoUrl={logoUrl} size={24} />

      <span className="flex items-center gap-1.5 w-[56px] shrink-0 min-w-0">
        <span className="text-[14px] font-semibold text-[var(--color-ink)] truncate">{symbol}</span>
      </span>

      <span className="text-[13.5px] mono-num text-[var(--color-ink)] flex-1 text-right truncate">
        {quote ? quote.price.toFixed(2) : <span className="inline-block h-3 w-10 skeleton rounded ml-auto" />}
      </span>
      <span className={`text-[12.5px] mono-num w-[42px] text-right shrink-0 ${quote ? changeColor : "text-transparent"}`}>
        {quote ? `${positive ? "+" : ""}${change.toFixed(2)}` : "0.00"}
      </span>
      <span className={`text-[12.5px] mono-num w-[50px] text-right shrink-0 ${quote ? changeColor : "text-transparent"}`}>
        {quote ? `${positive ? "+" : ""}${percentChange.toFixed(2)}%` : "0.00%"}
      </span>

      <div className="w-5 shrink-0 flex items-center justify-center">
        <button
          title="Remove"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="w-5 h-5 flex items-center justify-center rounded text-[var(--color-ink-faint)] opacity-0 group-hover:opacity-100 hover:text-[var(--color-ink)] transition-all"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

export function WatchlistPanel({
  watchlist,
  quotes,
  profiles,
  selectedSymbol,
  onView,
  onAddSymbol,
  onRemoveSymbol,
}: Props) {
  const [addOpen, setAddOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="h-full flex flex-col">
      {addOpen && (
        <div className="px-4 py-3 border-b border-[var(--color-border-soft)]">
          <StockSearch
            compact
            onSelect={(symbol) => {
              onAddSymbol(symbol);
              setAddOpen(false);
            }}
          />
        </div>
      )}

      <div className="flex items-center gap-2 pl-3.5 pr-2 py-2 border-b border-[var(--color-border-soft)] shrink-0">
        <span className="text-[13px] text-[var(--color-ink-faint)] w-[56px] shrink-0">Symbol</span>
        <span className="text-[13px] text-[var(--color-ink-faint)] flex-1 text-right">Last</span>
        <span className="text-[13px] text-[var(--color-ink-faint)] w-[42px] text-right shrink-0">Chg</span>
        <span className="text-[13px] text-[var(--color-ink-faint)] w-[50px] text-right shrink-0">Chg%</span>
        <button
          onClick={() => setAddOpen((v) => !v)}
          title="Add to watchlist"
          className={`w-5 shrink-0 flex items-center justify-center transition-colors ${addOpen ? "text-[var(--color-amber)]" : "text-[var(--color-ink-faint)] hover:text-[var(--color-ink)]"}`}
        >
          <Plus size={14} />
        </button>
      </div>

      <button
        onClick={() => setCollapsed((v) => !v)}
        className="flex items-center gap-1.5 px-3.5 py-2 text-[12px] font-semibold text-[var(--color-ink-dim)] hover:text-[var(--color-ink)] transition-colors shrink-0"
      >
        <ChevronDown size={14} className={`transition-transform ${collapsed ? "-rotate-90" : ""}`} />
        STOCKS
      </button>

      {!collapsed && (
        <div className="overflow-y-auto flex-1">
          {watchlist.length === 0 ? (
            <p className="text-sm text-[var(--color-ink-faint)] text-center py-8 px-4">
              Your watchlist is empty. Tap + to add a symbol.
            </p>
          ) : (
            watchlist.map((symbol) => (
              <Row
                key={symbol}
                symbol={symbol}
                quote={quotes[symbol]}
                logoUrl={profiles[symbol]?.logo}
                selected={selectedSymbol === symbol}
                onSelect={() => onView(symbol)}
                onRemove={() => onRemoveSymbol(symbol)}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
