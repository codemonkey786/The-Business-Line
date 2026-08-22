const PALETTE = ["#f0465a", "#f0a742", "#e0c23e", "#2ec27e", "#4fd1ff", "#7c5cff", "#e05cf0", "#ff7a5c"];

export function symbolColor(symbol: string): string {
  let hash = 0;
  for (let i = 0; i < symbol.length; i++) hash = symbol.charCodeAt(i) + ((hash << 5) - hash);
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

export function symbolInitial(symbol: string): string {
  return symbol.slice(0, 1).toUpperCase();
}
