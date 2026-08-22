import { useCallback, useEffect, useRef, useState } from "react";
import type { CallDirection, PortfolioState, Quote } from "../lib/types";
import { loadPortfolio, savePortfolio, freshPortfolio, resetPortfolio as resetStored } from "../lib/storage";
import { supabase } from "../lib/supabase";

const SYNC_DEBOUNCE_MS = 1500;
export type SyncStatus = "offline" | "syncing" | "synced" | "error";

export function usePortfolio(userId?: string | null) {
  const [state, setState] = useState<PortfolioState>(() => loadPortfolio());
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("offline");
  const hydratedUserId = useRef<string | null>(null);
  const skipNextPush = useRef(false);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Local cache always stays warm, signed in or not — it's the offline fallback.
  useEffect(() => {
    savePortfolio(state);
  }, [state]);

  // On sign-in: the cloud row is the source of truth. Adopt it wholesale rather than merging
  // with whatever's sitting in local storage, so signing in never silently blends two people's
  // (or a guest session's) picks together.
  useEffect(() => {
    if (!userId || !supabase) {
      hydratedUserId.current = null;
      setSyncStatus("offline");
      return;
    }
    let cancelled = false;
    setSyncStatus("syncing");

    (async () => {
      const { data, error } = await supabase!.from("portfolios").select("state").eq("user_id", userId).maybeSingle();
      if (cancelled) return;
      if (error) {
        setSyncStatus("error");
        return;
      }

      if (data?.state) {
        skipNextPush.current = true;
        setState(data.state as PortfolioState);
      } else {
        const fresh = freshPortfolio();
        skipNextPush.current = true;
        setState(fresh);
        await supabase!.from("portfolios").upsert({ user_id: userId, state: fresh, updated_at: new Date().toISOString() });
      }
      hydratedUserId.current = userId;
      setSyncStatus("synced");
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Push local changes up, debounced, once this user's initial pull has completed.
  useEffect(() => {
    if (!userId || !supabase || hydratedUserId.current !== userId) return;
    if (skipNextPush.current) {
      skipNextPush.current = false;
      return;
    }
    if (syncTimer.current) clearTimeout(syncTimer.current);
    setSyncStatus("syncing");
    syncTimer.current = setTimeout(async () => {
      const { error } = await supabase!.from("portfolios").upsert({ user_id: userId, state, updated_at: new Date().toISOString() });
      setSyncStatus(error ? "error" : "synced");
    }, SYNC_DEBOUNCE_MS);
    return () => {
      if (syncTimer.current) clearTimeout(syncTimer.current);
    };
  }, [state, userId]);

  // Opens a new call, flips direction if one is already open, or closes it if you tap the same direction again.
  // scoreImpact, when provided, is the marginal contribution frozen at the moment of closing.
  const pick = useCallback((symbol: string, direction: CallDirection, quote: Quote, scoreImpact?: number) => {
    setState((prev) => {
      const openIdx = prev.calls.findIndex((c) => c.symbol === symbol && !c.closedAt);

      if (openIdx < 0) {
        return {
          ...prev,
          calls: [
            { id: crypto.randomUUID(), symbol, direction, entryPrice: quote.price, openedAt: Date.now() },
            ...prev.calls,
          ],
        };
      }

      const existing = prev.calls[openIdx];
      const calls = [...prev.calls];

      if (existing.direction === direction) {
        calls[openIdx] = { ...existing, closedAt: Date.now(), exitPrice: quote.price, scoreImpact };
      } else {
        calls[openIdx] = { ...existing, closedAt: Date.now(), exitPrice: quote.price, scoreImpact };
        calls.unshift({ id: crypto.randomUUID(), symbol, direction, entryPrice: quote.price, openedAt: Date.now() });
      }

      return { ...prev, calls };
    });
  }, []);

  const closeCall = useCallback((symbol: string, quote: Quote, scoreImpact?: number) => {
    setState((prev) => {
      const idx = prev.calls.findIndex((c) => c.symbol === symbol && !c.closedAt);
      if (idx < 0) return prev;
      const calls = [...prev.calls];
      calls[idx] = { ...calls[idx], closedAt: Date.now(), exitPrice: quote.price, scoreImpact };
      return { ...prev, calls };
    });
  }, []);

  // Backfills a frozen score impact onto a closed call that doesn't have one yet (e.g. closed
  // before this feature existed) — a genuine one-time snapshot, not a fabricated value.
  const setScoreImpact = useCallback((callId: string, impact: number) => {
    setState((prev) => ({
      ...prev,
      calls: prev.calls.map((c) => (c.id === callId ? { ...c, scoreImpact: impact } : c)),
    }));
  }, []);

  const toggleWatchlist = useCallback((symbol: string) => {
    setState((prev) => {
      const has = prev.watchlist.includes(symbol);
      return {
        ...prev,
        watchlist: has ? prev.watchlist.filter((s) => s !== symbol) : [...prev.watchlist, symbol],
      };
    });
  }, []);

  const reset = useCallback(() => {
    setState(resetStored());
  }, []);

  return { state, pick, closeCall, setScoreImpact, toggleWatchlist, reset, syncStatus };
}
