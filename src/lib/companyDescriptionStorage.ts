const KEY_PREFIX = "creditfolio.companyDesc.v1.";

// Company descriptions don't go stale the way prices do — cache forever, no TTL.
export function loadCompanyDescription(symbol: string): string | null {
  try {
    return localStorage.getItem(KEY_PREFIX + symbol);
  } catch {
    return null;
  }
}

export function saveCompanyDescription(symbol: string, description: string) {
  try {
    localStorage.setItem(KEY_PREFIX + symbol, description);
  } catch {
    // non-fatal — feature just re-fetches next time
  }
}
