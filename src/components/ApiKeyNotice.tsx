import { KeyRound } from "lucide-react";

export function ApiKeyNotice() {
  return (
    <div className="px-6 pt-5">
      <div className="board px-4 py-3.5 flex items-start gap-3">
        <KeyRound size={18} className="text-[var(--color-amber)] shrink-0 mt-0.5" />
        <div className="text-sm text-[var(--color-ink-dim)]">
          <p className="mono-num text-[var(--color-ink)] font-medium mb-0.5">ADD A FREE FINNHUB API KEY TO GO LIVE</p>
          <p>
            Get a free key at{" "}
            <a href="https://finnhub.io/register" target="_blank" rel="noreferrer" className="text-[var(--color-amber)] hover:underline">
              finnhub.io/register
            </a>
            , then add it to <code className="mono-num text-xs bg-[var(--color-surface-2)] px-1.5 py-0.5">.env</code> as{" "}
            <code className="mono-num text-xs bg-[var(--color-surface-2)] px-1.5 py-0.5">VITE_FINNHUB_API_KEY</code> and restart the dev server.
          </p>
        </div>
      </div>
    </div>
  );
}
