function truncate(text: string, maxLen = 220): string {
  if (text.length <= maxLen) return text;
  const cut = text.slice(0, maxLen);
  const lastPeriod = cut.lastIndexOf(". ");
  if (lastPeriod > 60) return cut.slice(0, lastPeriod + 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${lastSpace > 60 ? cut.slice(0, lastSpace) : cut}…`;
}

interface OpenSearchResponse extends Array<unknown> {
  0: string;
  1: string[];
}

interface SummaryResponse {
  extract?: string;
  type?: string;
}

// No Finnhub free-tier field carries a company description, so this resolves the company
// name to a real Wikipedia article and pulls its opening summary — genuine text, not a
// fabricated blurb. Free, no key, CORS-enabled (verified directly).
export async function fetchCompanyDescription(companyName: string): Promise<string | null> {
  if (!companyName.trim()) return null;
  try {
    const searchUrl = new URL("https://en.wikipedia.org/w/api.php");
    searchUrl.searchParams.set("action", "opensearch");
    searchUrl.searchParams.set("search", companyName);
    searchUrl.searchParams.set("limit", "1");
    searchUrl.searchParams.set("namespace", "0");
    searchUrl.searchParams.set("format", "json");
    searchUrl.searchParams.set("origin", "*");
    const searchRes = await fetch(searchUrl.toString());
    if (!searchRes.ok) return null;
    const [, titles] = (await searchRes.json()) as OpenSearchResponse;
    const title = titles?.[0];
    if (!title) return null;

    const summaryRes = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, "_"))}`);
    if (!summaryRes.ok) return null;
    const summary = (await summaryRes.json()) as SummaryResponse;
    if (!summary.extract || summary.type === "disambiguation") return null;
    return truncate(summary.extract);
  } catch {
    return null;
  }
}
