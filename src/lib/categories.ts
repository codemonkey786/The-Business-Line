export interface CategoryDef {
  key: string;
  label: string;
  symbols: string[];
}

// A browsable library of sector/theme groups. Only the categories the user actually has
// visible get their symbols live-polled — see symbolsForCategories — so this list can stay
// large without risking Finnhub's free-tier rate limit.
export const CATEGORY_LIBRARY: CategoryDef[] = [
  { key: "popular", label: "Popular Stocks", symbols: ["AAPL", "MSFT", "NVDA", "AMZN", "GOOGL", "TSLA"] },
  { key: "technology", label: "Technology Stocks", symbols: ["MSFT", "AAPL", "NVDA", "ORCL", "CRM", "ADBE"] },
  { key: "gaming", label: "Video Game Stocks", symbols: ["EA", "TTWO", "RBLX", "U", "NTDOY"] },
  { key: "automotive", label: "Car Stocks", symbols: ["TSLA", "GM", "F", "TM", "STLA", "RIVN"] },
  { key: "airline", label: "Airplane Stocks", symbols: ["DAL", "UAL", "AAL", "LUV", "BA"] },
  { key: "etf", label: "Popular ETFs", symbols: ["SPY", "QQQ", "DIA", "IWM", "VTI"] },
  { key: "banking", label: "Bank Stocks", symbols: ["JPM", "BAC", "WFC", "C", "GS"] },
  { key: "energy", label: "Oil & Energy Stocks", symbols: ["XOM", "CVX", "COP", "SLB", "OXY"] },
  { key: "retail", label: "Retail Stocks", symbols: ["WMT", "TGT", "COST", "HD", "LOW"] },
  { key: "healthcare", label: "Healthcare Stocks", symbols: ["JNJ", "PFE", "UNH", "LLY", "ABBV"] },
  { key: "semiconductors", label: "Semiconductor Stocks", symbols: ["NVDA", "AMD", "AVGO", "INTC", "TXN"] },
  { key: "streaming", label: "Streaming & Media Stocks", symbols: ["NFLX", "DIS", "WBD", "ROKU", "SPOT"] },
  { key: "realestate", label: "Real Estate Stocks", symbols: ["PLD", "AMT", "O", "SPG", "EQIX"] },
  { key: "socialmedia", label: "Social Media Stocks", symbols: ["META", "SNAP", "PINS", "RDDT", "MTCH"] },
  { key: "ecommerce", label: "E-Commerce Stocks", symbols: ["AMZN", "SHOP", "EBAY", "ETSY", "BABA"] },
  { key: "aerospace", label: "Aerospace & Defense Stocks", symbols: ["BA", "LMT", "RTX", "NOC", "GD"] },
  { key: "restaurant", label: "Restaurant Stocks", symbols: ["MCD", "SBUX", "CMG", "YUM", "DPZ"] },
  { key: "crypto", label: "Crypto-Related Stocks", symbols: ["COIN", "MSTR", "MARA", "RIOT", "HOOD"] },
];

export const DEFAULT_CATEGORY_KEYS = ["popular", "technology", "gaming"];

export function searchCategories(query: string): CategoryDef[] {
  const q = query.trim().toLowerCase();
  if (!q) return CATEGORY_LIBRARY;
  return CATEGORY_LIBRARY.filter((c) => c.label.toLowerCase().includes(q));
}

export function symbolsForCategories(keys: string[]): string[] {
  const active = CATEGORY_LIBRARY.filter((c) => keys.includes(c.key));
  return Array.from(new Set(active.flatMap((c) => c.symbols)));
}
