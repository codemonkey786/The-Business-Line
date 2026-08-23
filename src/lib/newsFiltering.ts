import type { NewsArticle } from "./types";

// Every 2 staff posts hides the next-most-common external source in the feed — CNBC goes
// first regardless of how common it actually is, then whichever source is next-most frequent —
// so the feed gradually shifts toward staff content as more posts accumulate, rather than an
// abrupt all-or-nothing toggle. Once enough posts exist, every external source is hidden.
const POSTS_PER_HIDDEN_SOURCE = 2;

export function filterNewsByStaffActivity(articles: NewsArticle[], staffPostCount: number): NewsArticle[] {
  if (staffPostCount <= 0) return articles;

  const counts = new Map<string, number>();
  for (const a of articles) counts.set(a.source, (counts.get(a.source) ?? 0) + 1);

  const ranked = Array.from(counts.keys()).sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0));
  const ordered = ["CNBC", ...ranked.filter((s) => s !== "CNBC")];

  const numToHide = Math.min(ordered.length, Math.floor(staffPostCount / POSTS_PER_HIDDEN_SOURCE));
  if (numToHide === 0) return articles;

  const hidden = new Set(ordered.slice(0, numToHide));
  return articles.filter((a) => !hidden.has(a.source));
}
