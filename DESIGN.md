# Design

<!-- impeccable:design-doc, written directly (no documenter subagent available in this harness) -->

## World

Terminal-inspired trading dashboard. True black CRT ground, amber phosphor accent, hairline amber-tinted borders, zero blur, zero gradients, zero rounded corners, zero soft drop shadow. Monospace (JetBrains Mono) carries every label, number, and heading; Inter is reserved for longer descriptive prose only (factor blurbs, empty states).

Chosen over: sportsbook odds board, credit-report letterhead, refined version of the prior dark/glass look. Direct user pick.

## Tokens (`src/index.css`)

- `--color-bg` `#000000` — page ground
- `--color-surface` / `--color-surface-2` — panel fills, barely lighter than bg
- `--color-border` — amber-tinted hairline (structural dividers: header, sidebar, panel headers)
- `--color-border-soft` — neutral hairline (internal row dividers)
- `--color-amber` `#ffb03e` — primary accent (brand, focus ring, active states, selection)
- `--color-up` `#2fd66a` / `--color-down` `#ff4d4d` — directional color, used consistently everywhere a call/price moves
- `--color-score-*` — six sports-tier band colors (Bum → GOAT), red → gold gradient across the set

Utility classes: `.board` (flat panel, hairline border), `.term-label` (amber uppercase mono section header), `.mono-num` (tabular numeric mono).

## Type

- Display/headings/labels/data: JetBrains Mono, uppercase for labels, bold for emphasis.
- Body/prose: Inter — only for multi-word descriptive sentences, never for numbers or controls.
- No named "AI-default" display face (Space Grotesk, DM Sans, etc.) was used; monospace is the display voice because the subject is genuinely a data terminal, not a costume.

## Components

- **Panels** are always `.board rounded-none` with a `.term-label` header bar (uppercase amber label + a small mono-num right-aligned meta value). No icon-plus-heading-plus-stat card grids.
- **Buttons** are flat with a 1px/2px border in their semantic color, never a soft filled pill; active/selected state inverts to solid fill.
- **Score gauge** (`CreditGauge.tsx`) is a 6-segment pie readout with a rotating needle, kept from the prior build at the user's explicit request, re-themed into the terminal palette (mono uppercase band labels instead of italic serif).
- **Watchlist rows** read like a quote board: square logo/initial badge, mono symbol, tabular Last/Chg/Chg% columns, hover-revealed Up/Down/remove actions.
- Company logos render on a white square backdrop (real content, not decoration) so dark/transparent brand art stays legible against the black ground; falls back to a colored initial chip when no logo is available.

## Known deviations from a from-scratch Impeccable run

This pass adapted the Impeccable `new-work` flow to this harness's actual capabilities:

- No image-generation tool was available, so this was a **code-led** build throughout (no comp/decision-page round) — stated per the skill's own instructions for that case.
- The shipped `impeccable-finish-reviewer` and `impeccable-documenter` subagents are not registered in this harness's available agent list, so the finish review and this document were produced in-thread by the same session instead of a fresh spawned reviewer, per the skill's degraded-capability fallback. One self-run inspection pass (desktop screenshots, one fix round) was completed; a second independent review did not happen.
- The full "roll dice for seven cultural visual worlds" concept-seed ceremony was condensed into a direct 4-option user choice (Bloomberg Terminal, Sportsbook Odds Board, Credit Report Letterhead, refined-dark standing exit) rather than running `concept-seed.mjs` — the user picked Sportsbook first, then explicitly asked to switch to Bloomberg Terminal mid-build, which is the world actually shipped.
