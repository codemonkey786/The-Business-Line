import type { PricePoint } from "./types";

const BASE_URL = "https://www.alphavantage.co/query";
const API_KEY = import.meta.env.VITE_ALPHAVANTAGE_API_KEY as string | undefined;

export const hasAlphaVantageKey = () => Boolean(API_KEY);

interface RawSeriesResponse {
  Information?: string;
  Note?: string;
  "Error Message"?: string;
  [seriesKey: string]: unknown;
}

async function fetchSeries(
  symbol: string,
  fn: "TIME_SERIES_DAILY" | "TIME_SERIES_WEEKLY_ADJUSTED",
  seriesKey: string,
  priceField: "4. close" | "5. adjusted close",
  extraParams: Record<string, string> = {}
): Promise<PricePoint[]> {
  const url = new URL(BASE_URL);
  url.searchParams.set("function", fn);
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("apikey", API_KEY!);
  for (const [k, v] of Object.entries(extraParams)) url.searchParams.set(k, v);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Alpha Vantage request failed: ${res.status}`);
  const data = (await res.json()) as RawSeriesResponse;

  const series = data[seriesKey] as Record<string, Record<string, string>> | undefined;
  if (!series) {
    throw new Error(data.Information || data.Note || data["Error Message"] || "No historical data returned");
  }

  return Object.entries(series)
    .map(([date, bar]) => ({ t: new Date(`${date}T00:00:00Z`).getTime(), price: parseFloat(bar[priceField]) }))
    .filter((p) => Number.isFinite(p.price))
    .sort((a, b) => a.t - b.t);
}

// The weekly series is adjusted (splits + dividends) and free; the compact daily series is raw
// and only free unadjusted, so a stock split inside that recent ~5-month window (or right at
// the seam between the two sources) would otherwise show up as a fake cliff. Detecting a jump
// that closely matches a clean split ratio and rescaling everything before it onto today's
// share-count scale fixes that without needing the premium adjusted-daily endpoint.
const SPLIT_RATIOS = [2, 3, 4, 5, 6, 7, 8, 10, 15, 20, 25, 30];
const SPLIT_TOLERANCE = 0.04;

function closestSplitRatio(ratio: number): number | null {
  for (const r of SPLIT_RATIOS) {
    if (Math.abs(ratio - r) / r < SPLIT_TOLERANCE) return r;
    if (Math.abs(ratio - 1 / r) / (1 / r) < SPLIT_TOLERANCE) return 1 / r;
  }
  return null;
}

export function adjustForSplits(points: PricePoint[]): PricePoint[] {
  if (points.length < 2) return points;
  const out = points.map((p) => ({ ...p }));
  let cumulative = 1;
  for (let i = points.length - 1; i > 0; i--) {
    const cur = points[i].price;
    const prev = points[i - 1].price;
    if (cur > 0 && prev > 0) {
      const split = closestSplitRatio(prev / cur);
      if (split) cumulative *= split;
    }
    out[i - 1].price = points[i - 1].price / cumulative;
  }
  return out;
}

// Finnhub's free tier blocks all historical candle resolutions, so history comes from Alpha
// Vantage instead. Their free tier no longer allows outputsize=full on TIME_SERIES_DAILY
// (premium-only as of their latest pricing change — confirmed directly), but TIME_SERIES_WEEKLY
// is genuinely free and goes back decades, so long-range depth comes from weekly closes while
// the last ~5 months use real daily closes (outputsize=compact, also free) for finer detail.
// Sequential, not parallel — Alpha Vantage's free tier caps at ~1 request/second.
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchFullDailyHistory(symbol: string): Promise<PricePoint[]> {
  if (!API_KEY) return [];

  const daily = await fetchSeries(symbol, "TIME_SERIES_DAILY", "Time Series (Daily)", "4. close", { outputsize: "compact" }).catch(
    () => []
  );
  await sleep(1100); // stay clear of Alpha Vantage's ~1 request/second free-tier burst limit
  const weekly = await fetchSeries(symbol, "TIME_SERIES_WEEKLY_ADJUSTED", "Weekly Adjusted Time Series", "5. adjusted close").catch(
    () => []
  );

  if (daily.length === 0 && weekly.length === 0) {
    throw new Error("No historical data returned");
  }

  const earliestDaily = daily.length > 0 ? daily[0].t : Infinity;
  const longRange = weekly.filter((p) => p.t < earliestDaily);
  const merged = [...longRange, ...daily].sort((a, b) => a.t - b.t);
  return adjustForSplits(merged);
}
