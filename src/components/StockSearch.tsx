import { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { searchSymbols } from "../lib/finnhub";
import { INDEX_META, searchUniverse, type IndexKey, type UniverseEntry } from "../lib/marketIndex";
import type { SearchResult } from "../lib/types";

const TABS: IndexKey[] = ["SP500", "NASDAQ100", "DOW"];

export function StockSearch({ onSelect, compact = false }: { onSelect: (symbol: string) => void; compact?: boolean }) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<IndexKey>("SP500");
  const [apiResults, setApiResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const localResults = useMemo(() => searchUniverse(query, 60), [query]);

  useEffect(() => {
    if (!query.trim() || localResults.length > 0) {
      setApiResults([]);
      return;
    }
    setLoading(true);
    const handle = setTimeout(async () => {
      try {
        const r = await searchSymbols(query);
        setApiResults(r);
      } catch {
        setApiResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [query, localResults.length]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function pick(symbol: string) {
    onSelect(symbol);
    setQuery("");
    setApiResults([]);
    setOpen(false);
  }

  const browsing = !query.trim();

  return (
    <div ref={containerRef} className="relative w-full">
      <div
        className={`flex items-center gap-2 bg-[var(--color-surface-2)] border border-[var(--color-border-soft)] focus-within:border-[var(--color-amber)] transition-colors rounded-full ${
          compact ? "px-3.5 py-1.5" : "px-3.5 py-2.5"
        }`}
      >
        <Search size={14} className="text-[var(--color-ink-faint)]" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value.toUpperCase());
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={compact ? "Search" : "Search Dow, Nasdaq & S&P stocks…"}
          className="bg-transparent outline-none text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] w-full"
        />
      </div>

      {open && (
        <div className="absolute mt-1.5 w-full min-w-[280px] board overflow-hidden z-30 shadow-[0_12px_28px_-8px_rgba(0,0,0,0.7)]">
          {browsing && (
            <div className="flex border-b border-[var(--color-border-soft)]">
              {TABS.map((key) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`flex-1 text-xs font-semibold py-2.5 transition-colors ${
                    tab === key ? "text-[var(--color-amber)] bg-[var(--color-amber)]/10" : "text-[var(--color-ink-faint)] hover:text-[var(--color-ink-dim)]"
                  }`}
                >
                  {INDEX_META[key].label}
                </button>
              ))}
            </div>
          )}

          <div className="max-h-80 overflow-y-auto">
            {browsing
              ? INDEX_META[tab].list.map((r) => <ResultRow key={r.symbol} symbol={r.symbol} name={r.name} onClick={() => pick(r.symbol)} />)
              : renderQueryResults(localResults, apiResults, loading, pick)}
          </div>
        </div>
      )}
    </div>
  );
}

function renderQueryResults(local: UniverseEntry[], api: SearchResult[], loading: boolean, pick: (symbol: string) => void) {
  if (local.length > 0) {
    return local.map((r) => <ResultRow key={r.symbol} symbol={r.symbol} name={r.name} onClick={() => pick(r.symbol)} />);
  }
  if (loading) return <div className="px-4 py-3 text-xs text-[var(--color-ink-faint)]">Searching…</div>;
  if (api.length === 0) return <div className="px-4 py-3 text-xs text-[var(--color-ink-faint)]">No matches.</div>;
  return api.map((r) => <ResultRow key={r.symbol} symbol={r.symbol} name={r.description} onClick={() => pick(r.symbol)} />);
}

function ResultRow({ symbol, name, onClick }: { symbol: string; name: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-4 py-2.5 hover:bg-white/[0.05] transition-colors flex items-center justify-between gap-3"
    >
      <span className="text-sm font-semibold text-[var(--color-ink)] shrink-0">{symbol}</span>
      <span className="text-xs text-[var(--color-ink-faint)] truncate">{name}</span>
    </button>
  );
}
