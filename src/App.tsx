import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { TopNav, type NavTab } from "./components/TopNav";
import { ApiKeyNotice } from "./components/ApiKeyNotice";
import { ScoreHero } from "./components/ScoreHero";
import { PositionsTable } from "./components/PositionsTable";
import { ScoreStatsPanel } from "./components/ScoreStatsPanel";
import { WatchlistPanel } from "./components/WatchlistPanel";
import { SymbolDetailCard } from "./components/SymbolDetailCard";
import { NewsTicker } from "./components/NewsTicker";
import { MosaicFeed } from "./components/MosaicFeed";
import { LeaderboardPanel } from "./components/LeaderboardPanel";
import { ProfileModal } from "./components/ProfileModal";
import { AuthModal } from "./components/AuthModal";
import { usePortfolio } from "./store/usePortfolio";
import { useQuotes } from "./store/useQuotes";
import { useProfiles } from "./store/useProfiles";
import { useBetas } from "./store/useBetas";
import { useAuth } from "./store/useAuth";
import { useFullHistory } from "./store/useFullHistory";
import { useCompanyDescriptions } from "./store/useCompanyDescriptions";
import { useMarketNews } from "./store/useNews";
import { useScoreDelta } from "./store/useScoreDelta";
import { useScoreHistory } from "./store/useScoreHistory";
import { useReadingActivity } from "./store/useReadingActivity";
import { useArticleFeedback } from "./store/useArticleFeedback";
import { mergeDailyAndIntradayScoreHistory } from "./lib/scoreHistoryStorage";
import { computeCreditScore, scoreImpactForCall, bandColorVar } from "./lib/creditScore";
import { hasApiKey } from "./lib/finnhub";
import { hasSupabaseConfig } from "./lib/supabase";
import { mergeFullAndLiveHistory } from "./lib/fullHistoryStorage";
import { CATEGORY_LIBRARY, DEFAULT_CATEGORY_KEYS, symbolsForCategories } from "./lib/categories";
import type { CallDirection } from "./lib/types";

export default function App() {
  const { user, loading: authLoading, signIn, signUp, signInWithGoogle, signOut, updateDisplayName } = useAuth();
  const displayName = (user?.user_metadata as { display_name?: string } | undefined)?.display_name;
  const { state, pick, closeCall, setScoreImpact, toggleWatchlist, syncStatus } = usePortfolio(user?.id);
  const activeCategoryKeys = DEFAULT_CATEGORY_KEYS;
  const activeCategories = useMemo(
    () => CATEGORY_LIBRARY.filter((c) => activeCategoryKeys.includes(c.key)),
    [activeCategoryKeys]
  );

  const trackedSymbols = useMemo(
    () =>
      Array.from(
        new Set([...state.watchlist, ...state.calls.map((c) => c.symbol), ...symbolsForCategories(activeCategoryKeys)])
      ),
    [state.watchlist, state.calls, activeCategoryKeys]
  );
  const { quotes, history, dailyHistory } = useQuotes(trackedSymbols);
  const profiles = useProfiles(trackedSymbols);
  const callSymbols = useMemo(() => Array.from(new Set(state.calls.map((c) => c.symbol))), [state.calls]);
  const betas = useBetas(callSymbols);
  const openPositionSymbols = useMemo(
    () => Array.from(new Set(state.calls.filter((c) => !c.closedAt).map((c) => c.symbol))),
    [state.calls]
  );
  // Positions lead the mosaic's stock pool, then the rest of your watchlist and active
  // category symbols fill in the remaining space so scrolling further keeps surfacing more
  // real, already-tracked stocks instead of running dry after a handful.
  const mosaicStockSymbols = useMemo(() => {
    const rest = [...state.watchlist, ...activeCategories.flatMap((c) => c.symbols)].filter(
      (s) => !openPositionSymbols.includes(s)
    );
    return Array.from(new Set([...openPositionSymbols, ...rest])).slice(0, 26);
  }, [openPositionSymbols, activeCategories, state.watchlist]);
  const scoreResult = useMemo(() => computeCreditScore(state, quotes, betas), [state, quotes, betas]);
  const scoreDelta = useScoreDelta(scoreResult.score);
  const { history: scoreHistory, dailyHistory: dailyScoreHistory } = useScoreHistory(scoreResult.score);
  const mergedScoreHistory = useMemo(
    () => mergeDailyAndIntradayScoreHistory(dailyScoreHistory, scoreHistory),
    [dailyScoreHistory, scoreHistory]
  );

  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(state.watchlist[0] ?? null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<NavTab>("overview");

  // Full multi-year daily history is fetched lazily, only for whichever symbol is actually
  // open in the detail panel — the free data source behind it has a small daily request
  // budget, so this deliberately never fetches for the whole watchlist/markets list.
  const fullHistory = useFullHistory(selectedSymbol ? [selectedSymbol] : []);
  const selectedDailyHistory = useMemo(() => {
    if (!selectedSymbol) return [];
    return mergeFullAndLiveHistory(fullHistory[selectedSymbol] ?? [], dailyHistory[selectedSymbol] ?? []);
  }, [selectedSymbol, fullHistory, dailyHistory]);

  // Same lazy, one-symbol-at-a-time treatment as full history — only ever fetched for
  // whatever's currently open in the detail panel.
  const companyDescriptions = useCompanyDescriptions(
    selectedSymbol ? [{ symbol: selectedSymbol, name: profiles[selectedSymbol]?.name }] : []
  );

  const { articles: marketNews } = useMarketNews();
  const { activity: readingActivity, recordView } = useReadingActivity();
  const { feedback: articleFeedback, setFeedback: setArticleFeedback } = useArticleFeedback();

  // Viewing a stock (clicking its row anywhere) just selects it into the detail panel — and
  // counts as one real, honest "read" of that symbol for the leaderboard.
  function handleViewSymbol(symbol: string) {
    setSelectedSymbol(symbol);
    recordView(symbol);
  }

  // A closed call's score contribution is frozen at the moment it closes — computed here,
  // right before the store applies the close, against the state as it will look once closed.
  function frozenImpactForClose(symbol: string, quote: { price: number }) {
    const existing = state.calls.find((c) => c.symbol === symbol && !c.closedAt);
    if (!existing) return undefined;
    const nextState = {
      ...state,
      calls: state.calls.map((c) => (c.id === existing.id ? { ...c, closedAt: Date.now(), exitPrice: quote.price } : c)),
    };
    return scoreImpactForCall(nextState, existing.id, quotes, betas);
  }

  function handlePick(symbol: string, direction: CallDirection) {
    const quote = quotes[symbol];
    if (!quote) return;
    pick(symbol, direction, quote, frozenImpactForClose(symbol, quote));
  }

  function handleDivest(symbol: string) {
    const quote = quotes[symbol];
    if (!quote) return;
    closeCall(symbol, quote, frozenImpactForClose(symbol, quote));
  }

  // Backfill: any call closed before this freezing behavior existed won't have a stored
  // scoreImpact yet — compute one real snapshot for it, once, so it stops recalculating forever.
  useEffect(() => {
    if (Object.keys(quotes).length === 0) return;
    const missing = state.calls.filter((c) => c.closedAt && c.scoreImpact == null);
    for (const c of missing) {
      setScoreImpact(c.id, scoreImpactForCall(state, c.id, quotes, betas));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.calls, quotes, betas]);

  function handleAddSymbol(symbol: string) {
    if (!state.watchlist.includes(symbol)) toggleWatchlist(symbol);
    handleViewSymbol(symbol);
  }

  const activeCall = selectedSymbol ? state.calls.find((c) => c.symbol === selectedSymbol && !c.closedAt) : undefined;

  // Every person tracks their own real credit score, so there's no anonymous/guest mode —
  // sign-in is required before the app itself renders, not just optional "sync" later.
  if (hasSupabaseConfig() && authLoading) {
    return <div className="h-screen bg-black" />;
  }

  if (hasSupabaseConfig() && !user) {
    return (
      <AuthModal
        required
        onSignIn={signIn}
        onSignUp={signUp}
        onSignInWithGoogle={signInWithGoogle}
        onClose={() => {}}
      />
    );
  }

  return (
    <div className="h-screen flex overflow-hidden">
      <div className="flex-1 flex flex-col min-h-0">
        <TopNav
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onSelectSymbol={handleAddSymbol}
          onOpenProfile={() => setProfileOpen(true)}
          scoreColor={bandColorVar(scoreResult.band)}
        />
        {!hasApiKey() && <ApiKeyNotice />}

        <main className="flex-1 overflow-y-auto px-6 py-6">
          {activeTab === "overview" ? (
            <>
              <ScoreHero score={scoreResult.score} band={scoreResult.band} delta={scoreDelta} scoreHistory={mergedScoreHistory} />

              <div className="flex items-center gap-3 mt-4">
                <span className="text-[var(--color-ink-dim)] text-sm shrink-0">Markets</span>
                <NewsTicker articles={marketNews} />
              </div>

              <MosaicFeed
                title="For You"
                articles={marketNews}
                stockSymbols={mosaicStockSymbols}
                positionSymbols={openPositionSymbols}
                quotes={quotes}
                profiles={profiles}
                history={history}
                onView={handleViewSymbol}
                articleFeedback={articleFeedback}
                onSetArticleFeedback={setArticleFeedback}
              />
            </>
          ) : activeTab === "history" ? (
            <>
              <PositionsTable state={state} quotes={quotes} profiles={profiles} betas={betas} winRate={scoreResult.winRate} status="open" history={history} />
              <PositionsTable state={state} quotes={quotes} profiles={profiles} betas={betas} winRate={scoreResult.winRate} status="closed" />
              <ScoreStatsPanel history={scoreHistory} dailyHistory={dailyScoreHistory} bandColor={bandColorVar(scoreResult.band)} />
            </>
          ) : (
            <LeaderboardPanel
              articles={marketNews}
              readingActivity={readingActivity}
              profiles={profiles}
              watchlist={state.watchlist}
              quotes={quotes}
              score={scoreResult.score}
              band={scoreResult.band}
              bandColor={bandColorVar(scoreResult.band)}
              userEmail={displayName || user?.email}
              onViewSymbol={handleViewSymbol}
            />
          )}
        </main>
      </div>

      <div className="relative flex shrink-0">
        <button
          onClick={() => setSidebarCollapsed((v) => !v)}
          title={sidebarCollapsed ? "Expand watchlist" : "Collapse watchlist"}
          className="absolute top-1/2 -translate-y-1/2 -left-3 z-10 w-6 h-12 rounded-full bg-[var(--color-surface-2)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-ink-faint)] hover:text-[var(--color-ink)] hover:bg-white/[0.08] transition-colors"
        >
          {sidebarCollapsed ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
        </button>

        <aside
          className={`shrink-0 overflow-hidden border-l border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col min-h-0 transition-[width] duration-200 ${
            sidebarCollapsed ? "w-0" : "w-[340px]"
          }`}
        >
          <div className="w-[340px] flex-1 min-h-[140px] flex flex-col">
            <WatchlistPanel
              watchlist={state.watchlist}
              quotes={quotes}
              profiles={profiles}
              selectedSymbol={selectedSymbol}
              onView={handleViewSymbol}
              onAddSymbol={handleAddSymbol}
              onRemoveSymbol={toggleWatchlist}
            />
          </div>
          {selectedSymbol && (
            <div className="w-[340px] shrink-0">
              <SymbolDetailCard
                symbol={selectedSymbol}
                companyName={profiles[selectedSymbol]?.name}
                description={companyDescriptions[selectedSymbol]}
                quote={quotes[selectedSymbol]}
                history={history[selectedSymbol] ?? []}
                dailyHistory={selectedDailyHistory}
                logoUrl={profiles[selectedSymbol]?.logo}
                activeCall={activeCall}
                onPick={(direction) => handlePick(selectedSymbol, direction)}
                onDivest={() => handleDivest(selectedSymbol)}
                onClose={() => setSelectedSymbol(null)}
              />
            </div>
          )}
        </aside>
      </div>

      {profileOpen && (
        <ProfileModal
          score={scoreResult.score}
          band={scoreResult.band}
          winRate={scoreResult.winRate}
          calls={state.calls}
          createdAt={state.createdAt}
          user={user}
          syncStatus={syncStatus}
          onUpdateDisplayName={updateDisplayName}
          onSignOut={() => {
            signOut();
            setProfileOpen(false);
          }}
          onOpenAuth={() => {
            setProfileOpen(false);
            setAuthOpen(true);
          }}
          onClose={() => setProfileOpen(false)}
        />
      )}

      {authOpen && (
        <AuthModal
          onSignIn={async (email, password) => {
            await signIn(email, password);
            setAuthOpen(false);
          }}
          onSignUp={signUp}
          onSignInWithGoogle={signInWithGoogle}
          onClose={() => setAuthOpen(false)}
        />
      )}
    </div>
  );
}
