import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Newspaper } from "lucide-react";
import { TopNav, MobileTabBar, type NavTab } from "./components/TopNav";
import { ApiKeyNotice } from "./components/ApiKeyNotice";
import { ScoreHero } from "./components/ScoreHero";
import { WatchlistPanel } from "./components/WatchlistPanel";
import { SymbolDetailCard } from "./components/SymbolDetailCard";
import { NewsTicker } from "./components/NewsTicker";
import { MosaicFeed } from "./components/MosaicFeed";
import { ProfileModal } from "./components/ProfileModal";
import { AuthModal } from "./components/AuthModal";
import type { TourStep } from "./components/ProductTour";
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
import { useAdmin } from "./store/useAdmin";
import { useAdminManagement } from "./store/useAdminManagement";
import { useLeaderboard } from "./store/useLeaderboard";
import { useProfileSync } from "./store/useProfileSync";
import { uploadAvatar } from "./lib/avatarImage";
import { usePosts } from "./store/usePosts";
import { ArticleReader } from "./components/ArticleReader";
import { PostReader } from "./components/PostReader";
import { mergeDailyAndIntradayScoreHistory } from "./lib/scoreHistoryStorage";
import { computeCreditScore, scoreImpactForCall, bandColorVar } from "./lib/creditScore";
import { hasApiKey } from "./lib/finnhub";
import { hasSupabaseConfig } from "./lib/supabase";
import { mergeFullAndLiveHistory } from "./lib/fullHistoryStorage";
import { CATEGORY_LIBRARY, DEFAULT_CATEGORY_KEYS, symbolsForCategories } from "./lib/categories";
import { filterNewsByStaffActivity } from "./lib/newsFiltering";
import type { CallDirection, NewsArticle, Post } from "./lib/types";

// Split out of the main bundle: none of these are needed to paint the default Overview tab, so
// there's no reason to make every visitor download and parse them before first render.
const LeaderboardPanel = lazy(() => import("./components/LeaderboardPanel").then((m) => ({ default: m.LeaderboardPanel })));
const ProfilePage = lazy(() => import("./components/ProfilePage").then((m) => ({ default: m.ProfilePage })));
const PostComposer = lazy(() => import("./components/PostComposer").then((m) => ({ default: m.PostComposer })));
const AdminManager = lazy(() => import("./components/AdminManager").then((m) => ({ default: m.AdminManager })));
const ProductTour = lazy(() => import("./components/ProductTour").then((m) => ({ default: m.ProductTour })));

const TAB_FALLBACK = <div className="text-sm text-[var(--color-ink-faint)] py-10 text-center">Loading…</div>;

const TOUR_STEPS: TourStep[] = [
  { selector: "[data-tour='search']", title: "Search the market", body: "Look up any S&P 500, Nasdaq 100, or Dow 30 stock and jump straight to it." },
  { selector: "[data-tour='tabs']", title: "Get around", body: "Overview, History, Leaderboard, and your Profile — everything lives behind these four tabs." },
  {
    selector: "[data-tour='score']",
    title: "Your credit score",
    body: "Everyone starts at a theoretical 600. It moves for real based on the stock calls you back.",
  },
  { selector: "[data-tour='feed']", title: "Your feed", body: "Real market news mixed with posts from The Business Line staff." },
  { selector: "[data-tour='watchlist']", title: "Track stocks", body: "Add symbols here to watch their price and back them Up or Down." },
  { selector: "[data-tour='profile']", title: "Your account", body: "Manage your display name, sign out, or admin tools from here." },
];

export default function App() {
  const { user, loading: authLoading, signIn, signUp, signInWithGoogle, signOut, updateDisplayName, updateAvatar } = useAuth();
  const userMeta = user?.user_metadata as { display_name?: string; avatar_url?: string } | undefined;
  const displayName = userMeta?.display_name;
  const avatarUrl = userMeta?.avatar_url;

  // Uploads to the user's own folder in the avatars bucket, then stores the resulting public
  // URL on the account (mirrors handleUpdateDisplayName) so it's there next time they sign in.
  async function handleUpdateAvatar(file: File) {
    if (!user?.id) return;
    const url = await uploadAvatar(file, user.id);
    await updateAvatar(url);
  }
  const { state, pick, closeCall, setScoreImpact, toggleWatchlist, syncStatus } = usePortfolio(user?.id);
  const { isAdmin, isOwner } = useAdmin(user);
  const { posts, createPost, updatePost, deletePost, approvePost, renameMyPosts } = usePosts(user);

  // Changing your display name should relabel your existing posts too, not just future ones.
  async function handleUpdateDisplayName(name: string) {
    await updateDisplayName(name);
    if (user?.id) await renameMyPosts(user.id, name);
  }
  const publishedPosts = useMemo(() => posts.filter((p) => p.status === "published"), [posts]);
  const adminManagement = useAdminManagement(isOwner);
  const [composerOpen, setComposerOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [adminManagerOpen, setAdminManagerOpen] = useState(false);
  const [readingArticle, setReadingArticle] = useState<NewsArticle | null>(null);
  const [readingPost, setReadingPost] = useState<Post | null>(null);
  const activeCategoryKeys = DEFAULT_CATEGORY_KEYS;
  const activeCategories = useMemo(
    () => CATEGORY_LIBRARY.filter((c) => activeCategoryKeys.includes(c.key)),
    [activeCategoryKeys]
  );

  const postSymbols = useMemo(() => posts.map((p) => p.symbol).filter((s): s is string => Boolean(s)), [posts]);
  const trackedSymbols = useMemo(
    () =>
      Array.from(
        new Set([...state.watchlist, ...state.calls.map((c) => c.symbol), ...symbolsForCategories(activeCategoryKeys), ...postSymbols])
      ),
    [state.watchlist, state.calls, activeCategoryKeys, postSymbols]
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
  useProfileSync(user?.id, displayName, avatarUrl, scoreResult.score);
  const leaderboard = useLeaderboard(Boolean(user));

  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(state.watchlist[0] ?? null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMessage, setAuthMessage] = useState<string | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<NavTab>("overview");
  const [tourOpen, setTourOpen] = useState(false);

  // A one-time walkthrough, shown right after a real sign-in — not for guests, and not again
  // for an account that's already seen (or skipped) it once.
  useEffect(() => {
    if (!user) return;
    if (localStorage.getItem(`tour-seen:${user.id}`)) return;
    setTourOpen(true);
  }, [user]);

  function finishTour() {
    if (user) localStorage.setItem(`tour-seen:${user.id}`, "1");
    setTourOpen(false);
  }

  // Guests can browse the dashboard with a theoretical (default, un-personalized) credit
  // score, but actually opening content requires an account — this is the shared gate for
  // both of those "requires an account" actions, popped up instead of performing them.
  function requireAuth(action: () => void) {
    if (user) {
      action();
      return;
    }
    setAuthMessage("Create a free account to read this and follow along — everyone starts with a theoretical 600 credit score.");
    setAuthOpen(true);
  }

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

  const { articles: marketNewsRaw } = useMarketNews();
  const marketNews = useMemo(
    () => filterNewsByStaffActivity(marketNewsRaw, publishedPosts.length),
    [marketNewsRaw, publishedPosts.length]
  );
  const { activity: readingActivity, recordView } = useReadingActivity();
  const {
    feedback: articleFeedback,
    likeCounts: articleLikeCounts,
    dislikeCounts: articleDislikeCounts,
    setFeedback: setArticleFeedback,
  } = useArticleFeedback(user);

  // Viewing a stock (clicking its row anywhere) just selects it into the detail panel — and
  // counts as one real, honest "read" of that symbol for the leaderboard. Gated behind an
  // account for guests.
  function handleViewSymbol(symbol: string) {
    requireAuth(() => {
      setSelectedSymbol(symbol);
      recordView(symbol);
    });
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

  // The logo and every nav tab route through this — clicking either while an article/post is
  // open needs to actually leave the reader, not just flip activeTab underneath it (the reader
  // views take priority over activeTab in the render below, so activeTab alone never surfaces).
  function handleTabChange(tab: NavTab) {
    setReadingArticle(null);
    setReadingPost(null);
    setActiveTab(tab);
    if (tab === "leaderboard") leaderboard.refresh();
  }

  function openArticle(article: NewsArticle) {
    requireAuth(() => setReadingArticle(article));
  }

  function openPost(post: Post) {
    requireAuth(() => setReadingPost(post));
  }

  function handleAddSymbol(symbol: string) {
    requireAuth(() => {
      if (!state.watchlist.includes(symbol)) toggleWatchlist(symbol);
      handleViewSymbol(symbol);
    });
  }

  const activeCall = selectedSymbol ? state.calls.find((c) => c.symbol === selectedSymbol && !c.closedAt) : undefined;

  // Guests can browse the dashboard itself — the score gauge, feed, and watchlist all render
  // with a theoretical (default, un-personalized) 600 score — but opening an article/post or
  // a stock's detail panel is gated behind an account via requireAuth() below.
  if (hasSupabaseConfig() && authLoading) {
    return <div className="h-screen bg-black" />;
  }

  return (
    <div className="h-[calc(100vh-56px-env(safe-area-inset-bottom))] md:h-screen flex flex-col md:flex-row overflow-hidden">
      <div className="flex-1 flex flex-col min-h-0">
        <TopNav
          activeTab={activeTab}
          onTabChange={handleTabChange}
          onSelectSymbol={handleAddSymbol}
          onOpenProfile={() => setProfileOpen(true)}
          scoreColor={bandColorVar(scoreResult.band)}
          avatarUrl={avatarUrl}
        />
        {!hasApiKey() && <ApiKeyNotice />}

        <main className="flex-1 overflow-y-auto px-4 md:px-6 py-6">
          {readingArticle ? (
            <ArticleReader
              article={readingArticle}
              feedback={articleFeedback?.[readingArticle.id]}
              onSetFeedback={setArticleFeedback}
              likeCount={articleLikeCounts?.[readingArticle.id]}
              dislikeCount={articleDislikeCounts?.[readingArticle.id]}
              onBack={() => setReadingArticle(null)}
            />
          ) : readingPost ? (
            <PostReader
              post={readingPost}
              quote={readingPost.symbol ? quotes[readingPost.symbol] : undefined}
              history={readingPost.symbol ? history[readingPost.symbol] ?? [] : []}
              onBack={() => setReadingPost(null)}
            />
          ) : activeTab === "overview" ? (
            <>
              <ScoreHero score={scoreResult.score} band={scoreResult.band} delta={scoreDelta} scoreHistory={mergedScoreHistory} />

              <div className="flex items-center gap-3 mt-4">
                <span className="text-[var(--color-ink-dim)] text-sm shrink-0">Markets</span>
                <NewsTicker articles={marketNews} onOpenArticle={openArticle} />
              </div>

              {isAdmin && (
                <div className="flex justify-end mt-4">
                  <button
                    onClick={() => setComposerOpen(true)}
                    className="flex items-center gap-1.5 text-sm font-semibold px-3.5 py-2 rounded-lg bg-[var(--color-amber)] text-black hover:brightness-110 active:scale-[0.98] transition-all"
                  >
                    <Newspaper size={13} />
                    New Post
                  </button>
                </div>
              )}

              <MosaicFeed
                title="For You"
                articles={marketNews}
                posts={publishedPosts}
                stockSymbols={mosaicStockSymbols}
                positionSymbols={openPositionSymbols}
                quotes={quotes}
                profiles={profiles}
                history={history}
                onView={handleViewSymbol}
                onOpenArticle={openArticle}
                onOpenPost={openPost}
                articleFeedback={articleFeedback}
                onSetArticleFeedback={setArticleFeedback}
                articleLikeCounts={articleLikeCounts}
                articleDislikeCounts={articleDislikeCounts}
              />

              {(composerOpen || editingPost) && user?.id && (
                <Suspense fallback={null}>
                  <PostComposer
                    userId={user.id}
                    post={editingPost ?? undefined}
                    onCreate={createPost}
                    onUpdate={updatePost}
                    onClose={() => {
                      setComposerOpen(false);
                      setEditingPost(null);
                    }}
                  />
                </Suspense>
              )}
            </>
          ) : activeTab === "leaderboard" ? (
            <Suspense fallback={TAB_FALLBACK}>
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
                userId={user?.id}
                signedIn={Boolean(user)}
                scoreEntries={leaderboard.entries}
                scoreEntriesLoading={leaderboard.loading}
                onViewSymbol={handleViewSymbol}
              />
            </Suspense>
          ) : (
            <Suspense fallback={TAB_FALLBACK}>
              <ProfilePage
                score={scoreResult.score}
                band={scoreResult.band}
                delta={scoreDelta}
                scoreHistory={mergedScoreHistory}
                isAdmin={isAdmin}
                posts={posts}
                userId={user?.id}
                quotes={quotes}
                onDeletePost={deletePost}
                onApprovePost={approvePost}
                onOpenPost={setReadingPost}
                onEditPost={setEditingPost}
                displayName={displayName}
                userEmail={user?.email}
                onUpdateDisplayName={user ? handleUpdateDisplayName : undefined}
                portfolio={state}
                profiles={profiles}
                betas={betas}
                winRate={scoreResult.winRate}
                priceHistory={history}
                scoreProgressHistory={scoreHistory}
                scoreProgressDailyHistory={dailyScoreHistory}
              />
            </Suspense>
          )}
        </main>
      </div>

      <div className="relative flex shrink-0">
        <button
          onClick={() => setSidebarCollapsed((v) => !v)}
          title={sidebarCollapsed ? "Expand watchlist" : "Collapse watchlist"}
          className="hidden md:flex absolute top-1/2 -translate-y-1/2 -left-3 z-10 w-6 h-12 rounded-full bg-[var(--color-surface-2)] border border-[var(--color-border)] items-center justify-center text-[var(--color-ink-faint)] hover:text-[var(--color-ink)] hover:bg-white/[0.08] transition-colors"
        >
          {sidebarCollapsed ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
        </button>

        <aside
          className={`w-full shrink-0 overflow-y-auto md:overflow-hidden border-t md:border-t-0 md:border-l border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col min-h-0 h-[50vh] md:h-auto transition-[width] duration-200 ${
            sidebarCollapsed ? "md:w-0" : "md:w-[340px]"
          }`}
        >
          <div className="w-full md:w-[340px] flex-1 min-h-[140px] flex flex-col" data-tour="watchlist">
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
            <div className="w-full md:w-[340px] shrink-0">
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

      <MobileTabBar activeTab={activeTab} onTabChange={handleTabChange} />

      {profileOpen && (
        <ProfileModal
          score={scoreResult.score}
          band={scoreResult.band}
          winRate={scoreResult.winRate}
          calls={state.calls}
          createdAt={state.createdAt}
          user={user}
          avatarUrl={avatarUrl}
          syncStatus={syncStatus}
          onUpdateDisplayName={handleUpdateDisplayName}
          onUpdateAvatar={handleUpdateAvatar}
          onSignOut={() => {
            signOut();
            setProfileOpen(false);
          }}
          onOpenAuth={() => {
            setProfileOpen(false);
            setAuthMessage(undefined);
            setAuthOpen(true);
          }}
          onClose={() => setProfileOpen(false)}
          isOwner={isOwner}
          onOpenAdminManager={() => {
            setProfileOpen(false);
            setAdminManagerOpen(true);
          }}
        />
      )}

      {adminManagerOpen && (
        <Suspense fallback={null}>
          <AdminManager
            profiles={adminManagement.profiles}
            loading={adminManagement.loading}
            onSetAdmin={adminManagement.setAdmin}
            onClose={() => setAdminManagerOpen(false)}
          />
        </Suspense>
      )}

      {tourOpen && (
        <Suspense fallback={null}>
          <ProductTour steps={TOUR_STEPS} onFinish={finishTour} />
        </Suspense>
      )}

      {authOpen && (
        <AuthModal
          message={authMessage}
          onSignIn={async (email, password) => {
            await signIn(email, password);
            setAuthOpen(false);
          }}
          onSignUp={async (email, password) => {
            const signedInImmediately = await signUp(email, password);
            if (signedInImmediately) setAuthOpen(false);
            return signedInImmediately;
          }}
          onSignInWithGoogle={signInWithGoogle}
          onClose={() => setAuthOpen(false)}
        />
      )}
    </div>
  );
}
