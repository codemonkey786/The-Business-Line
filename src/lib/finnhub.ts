import type { CompanyProfile, NewsArticle, Quote, SearchResult } from "./types";

const BASE_URL = "https://finnhub.io/api/v1";
const API_KEY = import.meta.env.VITE_FINNHUB_API_KEY as string | undefined;

export class MissingApiKeyError extends Error {
  constructor() {
    super("Missing Finnhub API key");
    this.name = "MissingApiKeyError";
  }
}

function requireKey() {
  if (!API_KEY) throw new MissingApiKeyError();
  return API_KEY;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Free-tier Finnhub rate-limits aggressively — a burst of parallel requests routinely draws
// 429s. Retrying the one request that got throttled (rather than giving up on that symbol
// until the next poll) is what actually clears a stuck "loading" row.
async function get<T>(path: string, params: Record<string, string>, attempt = 0): Promise<T> {
  const key = requireKey();
  const url = new URL(BASE_URL + path);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  url.searchParams.set("token", key);
  const res = await fetch(url.toString());
  if (res.status === 429 && attempt < 2) {
    await sleep(700 * (attempt + 1));
    return get<T>(path, params, attempt + 1);
  }
  if (!res.ok) {
    throw new Error(`Finnhub request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

interface RawQuote {
  c: number; // current
  d: number; // change
  dp: number; // percent change
  h: number;
  l: number;
  o: number;
  pc: number; // prev close
  t: number;
}

export async function fetchQuote(symbol: string): Promise<Quote> {
  const raw = await get<RawQuote>("/quote", { symbol });
  return {
    symbol,
    price: raw.c,
    change: raw.d,
    percentChange: raw.dp,
    high: raw.h,
    low: raw.l,
    open: raw.o,
    prevClose: raw.pc,
    updatedAt: Date.now(),
  };
}

const QUOTE_BATCH_SIZE = 5;
const QUOTE_BATCH_DELAY_MS = 400;

// Firing every symbol at once (a full watchlist + categories can be 20-30 of them) is exactly
// what triggers the free-tier 429 storm — small staggered batches keep every symbol actually
// loading instead of some getting throttled out and stuck blank until the next poll.
export async function fetchQuotes(symbols: string[]): Promise<Record<string, Quote>> {
  const result: Record<string, Quote> = {};
  for (let i = 0; i < symbols.length; i += QUOTE_BATCH_SIZE) {
    const batch = symbols.slice(i, i + QUOTE_BATCH_SIZE);
    const entries = await Promise.all(
      batch.map(async (s) => {
        try {
          return [s, await fetchQuote(s)] as const;
        } catch {
          return null;
        }
      })
    );
    for (const e of entries) {
      if (e) result[e[0]] = e[1];
    }
    if (i + QUOTE_BATCH_SIZE < symbols.length) await sleep(QUOTE_BATCH_DELAY_MS);
  }
  return result;
}

interface RawProfile {
  name?: string;
  logo?: string;
  finnhubIndustry?: string;
  exchange?: string;
  ticker?: string;
}

export async function fetchProfile(symbol: string): Promise<CompanyProfile | null> {
  const raw = await get<RawProfile>("/stock/profile2", { symbol });
  if (!raw.name) return null;
  return {
    symbol,
    name: raw.name,
    logo: raw.logo ?? "",
    industry: raw.finnhubIndustry ?? "",
    exchange: raw.exchange ?? "",
  };
}

const PROFILE_BATCH_SIZE = 5;
const PROFILE_BATCH_DELAY_MS = 400;

// Same staggered-batch treatment as fetchQuotes — firing every symbol's profile request at
// once is what starves logos out under the free-tier rate limit in the first place.
export async function fetchProfiles(symbols: string[]): Promise<Record<string, CompanyProfile>> {
  const result: Record<string, CompanyProfile> = {};
  for (let i = 0; i < symbols.length; i += PROFILE_BATCH_SIZE) {
    const batch = symbols.slice(i, i + PROFILE_BATCH_SIZE);
    const entries = await Promise.all(
      batch.map(async (s) => {
        try {
          return [s, await fetchProfile(s)] as const;
        } catch {
          return null;
        }
      })
    );
    for (const e of entries) {
      if (e && e[1]) result[e[0]] = e[1];
    }
    if (i + PROFILE_BATCH_SIZE < symbols.length) await sleep(PROFILE_BATCH_DELAY_MS);
  }
  return result;
}

interface RawSearchResult {
  count: number;
  result: { symbol: string; description: string; type: string; displaySymbol: string }[];
}

export async function searchSymbols(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return [];
  const raw = await get<RawSearchResult>("/search", { q: query });
  return raw.result
    .filter((r) => r.type === "Common Stock" && !r.symbol.includes("."))
    .slice(0, 8)
    .map((r) => ({ symbol: r.symbol, description: r.description, type: r.type }));
}

interface RawMetricResponse {
  metric?: { beta?: number };
}

// Beta (5Y monthly, vs. S&P 500) — a genuine risk measure, free on Finnhub's /stock/metric.
export async function fetchBeta(symbol: string): Promise<number | null> {
  const raw = await get<RawMetricResponse>("/stock/metric", { symbol, metric: "all" });
  const beta = raw.metric?.beta;
  return typeof beta === "number" && Number.isFinite(beta) ? beta : null;
}

interface RawNewsItem {
  category?: string;
  datetime: number;
  headline: string;
  id: number;
  image?: string;
  related?: string;
  source: string;
  summary: string;
  url: string;
}

function toArticle(r: RawNewsItem): NewsArticle {
  return {
    id: r.id,
    headline: r.headline,
    summary: r.summary,
    source: r.source,
    url: r.url,
    image: r.image || undefined,
    datetime: r.datetime,
    related: r.related || undefined,
  };
}

// Sources with a genuinely free, unmetered wire feed (real outlets, not fabricated) — pulled
// from every Finnhub news category that has real content, not just "general" alone, so more
// than three outlets actually show up. Outlets whose own sites paywall most articles (Bloomberg,
// Seeking Alpha, WSJ, etc.) are left out so every headline here is actually free to read.
const NEWS_CATEGORIES = ["general", "crypto", "merger", "forex"] as const;
const PAYWALLED_SOURCES = new Set(["Bloomberg", "SeekingAlpha", "Seeking Alpha", "Wall Street Journal", "Financial Times", "Barron's"]);

export async function fetchMarketNews(): Promise<NewsArticle[]> {
  const batches = await Promise.all(
    NEWS_CATEGORIES.map((category) => get<RawNewsItem[]>("/news", { category }).catch(() => [] as RawNewsItem[]))
  );
  const byId = new Map<number, NewsArticle>();
  for (const raw of batches.flat()) {
    if (!raw.headline || !raw.datetime || !raw.source) continue;
    if (PAYWALLED_SOURCES.has(raw.source)) continue;
    byId.set(raw.id, toArticle(raw));
  }
  return Array.from(byId.values()).sort((a, b) => b.datetime - a.datetime);
}

export const hasApiKey = () => Boolean(API_KEY);
