# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary user is the builder themself: someone who wants a polished demo/portfolio-caliber app to show to others (friends, potential employers) — not a private personal-use-only tool. The audience for the shipped surface is therefore "someone seeing this for the first time," not just the builder.

## Product Purpose

CreditFolio is a stock-market conviction simulator. Instead of reporting profit/loss in dollars, it gamifies market-calling skill through a "Credit Score" (300–850) that rises and falls based on whether the user's directional calls on real stocks turn out to be right.

## Positioning

Unlike typical paper-trading simulators (e.g. Pickfolio) that track shares owned and dollars made, CreditFolio has no shares and no cash balance at all — the entire mechanic is a simple directional call ("Go Up" / "Go Down") on a stock, scored behaviorally like a FICO credit score, with sports-tier band names (Bum → Benchwarmer → Starter → All-Star → HOF → GOAT) instead of Poor/Fair/Good/Excellent.

## Operating Context

Single-page web app, desktop browser only. Live market data comes from Finnhub: REST `/quote` for baseline price/open/high/low (polled every ~20s to respect the free-tier rate limit) plus a WebSocket trade subscription for real sub-second live tick updates on watchlisted symbols. No backend — all state (watchlist, calls, score history) persists to `localStorage` only; single local user, no accounts/auth.

## Capabilities and Constraints

- Users pick "Go Up" or "Go Down" on any stock from a browsable/searchable universe covering the Dow 30, Nasdaq 100, and a ~454-symbol S&P 500 snapshot (~575 unique tickers total).
- The Credit Score blends five weighted behavioral factors — Track Record, Current Accuracy, Length of History, Conviction Mix, New Activity — with raw price-move performance on open/closed calls.
- Live-ticking prices are only maintained for symbols actually in the user's watchlist, to stay within Finnhub's free-tier 60-calls/minute REST limit; the full browsable universe itself is static (name/symbol only) until added.
- Requires a user-supplied free Finnhub API key (`VITE_FINNHUB_API_KEY` in `.env`); the app degrades gracefully (skeleton states, no crash) when the key is missing or the market is closed and no trades are ticking.
- Desktop-only target — no mobile/responsive requirement at this time.
- Stack: React 19 + TypeScript + Vite + Tailwind CSS v4, Framer Motion for animation, Lucide for icons. No component library.

## Brand Commitments

Name: "CreditFolio." No existing logo or brand asset beyond a simple gradient "C" mark currently used as a placeholder header mark — not a binding identity commitment.

## Evidence on Hand

No user testimonials, case studies, or sample data to feature. All market data shown (prices, company names, logos) is genuine live data pulled from Finnhub — nothing here should ever be fabricated or presented as real when it isn't.

## Product Principles

1. **Behavior over balance** — every design choice should reinforce that conviction-tracking (right vs. wrong calls) is the scoreboard, not money. No dollar amounts, no share counts, anywhere.
2. **Real data, honestly represented** — live prices are real; never fake motion or fabricate a "live" look when data is stale, rate-limited, or the market is closed.
3. **Portfolio-grade craft** — this surface is meant to impress a first-time viewer, so visual confidence and finish outweigh minimizing scope.
4. **Legible under real motion** — the score gauge, price ticks, and needle genuinely animate from live data; the UI must stay readable and calm while values are actively changing, not just in a static screenshot.

## Accessibility & Inclusion

No specific accessibility requirement has been established beyond ordinary good practice (sufficient contrast, keyboard-operable controls).
