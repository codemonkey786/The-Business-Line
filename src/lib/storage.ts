import type { PortfolioState } from "./types";

const KEY = "creditfolio.portfolio.v2";

export function loadPortfolio(): PortfolioState {
  const raw = localStorage.getItem(KEY);
  if (!raw) return freshPortfolio();
  try {
    const parsed = JSON.parse(raw) as PortfolioState;
    if (!Array.isArray(parsed.calls) || !Array.isArray(parsed.watchlist)) return freshPortfolio();
    return parsed;
  } catch {
    return freshPortfolio();
  }
}

export function savePortfolio(state: PortfolioState) {
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function freshPortfolio(): PortfolioState {
  return {
    calls: [],
    watchlist: [
      "AAPL",
      "MSFT",
      "NVDA",
      "AMZN",
      "GOOGL",
      "META",
      "TSLA",
      "AVGO",
      "NFLX",
      "JPM",
      "V",
      "ORCL",
      "CRM",
      "ADBE",
      "DIS",
      "INTC",
      "CSCO",
      "PYPL",
      "KO",
      "WMT",
    ],
    createdAt: Date.now(),
  };
}

export function resetPortfolio(): PortfolioState {
  const fresh = freshPortfolio();
  savePortfolio(fresh);
  return fresh;
}
