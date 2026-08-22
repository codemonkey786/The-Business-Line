import { User } from "lucide-react";
import { StockSearch } from "./StockSearch";

export type NavTab = "overview" | "history" | "leaderboard";

interface Props {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onSelectSymbol: (symbol: string) => void;
  onOpenProfile: () => void;
  scoreColor: string;
}

const NAV_LINKS: { label: string; tab: NavTab }[] = [
  { label: "Overview", tab: "overview" },
  { label: "History", tab: "history" },
  { label: "Leaderboard", tab: "leaderboard" },
];

export function TopNav({ activeTab, onTabChange, onSelectSymbol, onOpenProfile, scoreColor }: Props) {
  return (
    <header className="h-10 shrink-0 border-b border-[var(--color-border-soft)] flex items-center px-5 gap-6 bg-[var(--color-surface)]">
      <button onClick={() => onTabChange("overview")} title="Home" className="flex items-center gap-2.5 shrink-0 hover:brightness-110 transition-all">
        <div
          className="w-7 h-7 rounded-[9px] flex items-center justify-center shrink-0 bg-white"
          style={{ boxShadow: "0 2px 10px -2px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.6)" }}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
            <polyline
              points="2,4 7,20 12,8 17,20 22,4"
              stroke="#1e4d2b"
              strokeWidth="4.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
        </div>
        <span className="display-bold text-[15px] tracking-tight text-white hidden sm:inline">The Business Line</span>
      </button>

      <div className="w-full max-w-xs">
        <StockSearch onSelect={onSelectSymbol} compact />
      </div>

      <nav className="hidden lg:flex items-center gap-1 text-sm font-medium text-[var(--color-ink-dim)]">
        {NAV_LINKS.map((link) => (
          <button
            key={link.tab}
            onClick={() => onTabChange(link.tab)}
            className={`px-3 py-1 rounded-full transition-colors ${
              activeTab === link.tab ? "bg-white/[0.08] text-[var(--color-ink)]" : "hover:bg-white/[0.06] hover:text-[var(--color-ink)]"
            }`}
          >
            {link.label}
          </button>
        ))}
      </nav>

      <button
        onClick={onOpenProfile}
        title="Profile"
        className="ml-auto w-7 h-7 shrink-0 rounded-full flex items-center justify-center hover:brightness-125 hover:bg-white/[0.06] transition-all"
        style={{ color: scoreColor }}
      >
        <User size={15} />
      </button>
    </header>
  );
}
