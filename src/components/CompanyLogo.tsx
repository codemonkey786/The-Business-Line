import { useState } from "react";
import { symbolColor, symbolInitial } from "../lib/badge";

interface Props {
  symbol: string;
  logoUrl?: string;
  size: number;
}

export function CompanyLogo({ symbol, logoUrl, size }: Props) {
  const [failed, setFailed] = useState(false);
  const color = symbolColor(symbol);

  if (logoUrl && !failed) {
    return (
      <img
        src={logoUrl}
        alt={symbol}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
        className="object-contain bg-white shrink-0 rounded-full border border-[var(--color-border-soft)]"
        style={{ width: size, height: size, padding: size * 0.14 }}
      />
    );
  }

  return (
    <div
      className="mono-num flex items-center justify-center font-bold shrink-0 rounded-full border border-[var(--color-border-soft)]"
      style={{ width: size, height: size, background: `${color}22`, color, fontSize: size * 0.42 }}
    >
      {symbolInitial(symbol)}
    </div>
  );
}
