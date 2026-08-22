import { useEffect, useState } from "react";
import { fetchMarketNews } from "../lib/finnhub";
import type { NewsArticle } from "../lib/types";

const REFRESH_MS = 5 * 60 * 1000;

export function useMarketNews() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const news = await fetchMarketNews();
        if (!cancelled) setArticles(news);
      } catch {
        // keep whatever we already have — a transient failure shouldn't blank the feed
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    const interval = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return { articles, loading };
}
