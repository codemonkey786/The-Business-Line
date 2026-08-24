import type { CompanyProfile } from "./types";

const KEY_PREFIX = "creditfolio.companyProfile.v1.";

// A company's name/logo/industry/exchange essentially never changes — cache forever so any
// symbol you've ever viewed renders its real logo instantly on every future visit, instead of
// showing the colored-initial placeholder while it's re-fetched from Finnhub every session.
export function loadCompanyProfile(symbol: string): CompanyProfile | null {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + symbol);
    return raw ? (JSON.parse(raw) as CompanyProfile) : null;
  } catch {
    return null;
  }
}

export function saveCompanyProfile(profile: CompanyProfile) {
  try {
    localStorage.setItem(KEY_PREFIX + profile.symbol, JSON.stringify(profile));
  } catch {
    // non-fatal — feature just re-fetches next time
  }
}
