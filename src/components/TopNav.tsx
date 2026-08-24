import { Home, Trophy, User } from "lucide-react";
import { StockSearch } from "./StockSearch";

export type NavTab = "overview" | "leaderboard" | "profile";

interface Props {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onSelectSymbol: (symbol: string) => void;
  onOpenProfile: () => void;
  scoreColor: string;
  avatarUrl?: string;
}

const NAV_LINKS: { label: string; tab: NavTab; icon: typeof Home }[] = [
  { label: "Overview", tab: "overview", icon: Home },
  { label: "Leaderboard", tab: "leaderboard", icon: Trophy },
  { label: "Profile", tab: "profile", icon: User },
];

export function TopNav({ activeTab, onTabChange, onSelectSymbol, onOpenProfile, scoreColor, avatarUrl }: Props) {
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

      <div className="w-full max-w-xs" data-tour="search">
        <StockSearch onSelect={onSelectSymbol} compact />
      </div>

      <nav data-tour="tabs" className="hidden md:flex items-center gap-1 text-sm font-medium text-[var(--color-ink-dim)]">
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
        data-tour="profile"
        onClick={onOpenProfile}
        title="Profile"
        className="ml-auto w-7 h-7 shrink-0 rounded-full flex items-center justify-center overflow-hidden hover:brightness-125 hover:bg-white/[0.06] transition-all"
        style={{ color: scoreColor }}
      >
        {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> : <User size={15} />}
      </button>
    </header>
  );
}

// The desktop nav links live in the header (hidden md:flex above) and simply disappear below
// that breakpoint — this is the mobile stand-in so History/Leaderboard/Profile stay reachable
// on a phone instead of only being accessible via the Overview tab.
export function MobileTabBar({ activeTab, onTabChange }: { activeTab: NavTab; onTabChange: (tab: NavTab) => void }) {
  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 flex items-stretch border-t border-[var(--color-border)] bg-[var(--color-surface)]"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {NAV_LINKS.map((link) => {
        const Icon = link.icon;
        const active = activeTab === link.tab;
        return (
          <button
            key={link.tab}
            onClick={() => onTabChange(link.tab)}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
              active ? "text-[var(--color-amber)]" : "text-[var(--color-ink-faint)]"
            }`}
          >
            <Icon size={18} />
            {link.label}
          </button>
        );
      })}
    </nav>
  );
}
