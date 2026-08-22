// Thin wrapper around Finnhub's real-time trade WebSocket. REST polling alone can't give
// sub-second price movement without blowing through the free-tier rate limit (60 calls/min),
// but WebSocket trade pushes don't count against that quota — so we use it for live ticks and
// keep REST polling only as a slower baseline refresh (prevClose/open/high/low).

type TradeHandler = (symbol: string, price: number, timestamp: number) => void;

let socket: WebSocket | null = null;
const handlers = new Set<TradeHandler>();
const subscribedSymbols = new Set<string>();
let reconnectTimer: number | null = null;

interface RawTradeMessage {
  type: string;
  data?: { s: string; p: number; t: number }[];
}

function ensureSocket(apiKey: string): WebSocket {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return socket;
  }

  const ws = new WebSocket(`wss://ws.finnhub.io?token=${apiKey}`);
  socket = ws;

  ws.onopen = () => {
    subscribedSymbols.forEach((symbol) => ws.send(JSON.stringify({ type: "subscribe", symbol })));
  };

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data) as RawTradeMessage;
      if (msg.type === "trade" && Array.isArray(msg.data)) {
        msg.data.forEach((t) => handlers.forEach((h) => h(t.s, t.p, t.t)));
      }
    } catch {
      // ignore malformed frames
    }
  };

  ws.onclose = () => {
    if (socket === ws) socket = null;
    if (subscribedSymbols.size > 0 && reconnectTimer == null) {
      reconnectTimer = window.setTimeout(() => {
        reconnectTimer = null;
        if (subscribedSymbols.size > 0) ensureSocket(apiKey);
      }, 3000);
    }
  };

  ws.onerror = () => ws.close();

  return ws;
}

export function subscribeTrades(apiKey: string, symbol: string) {
  if (subscribedSymbols.has(symbol)) return;
  subscribedSymbols.add(symbol);
  const ws = ensureSocket(apiKey);
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "subscribe", symbol }));
  }
}

export function unsubscribeTrades(symbol: string) {
  if (!subscribedSymbols.has(symbol)) return;
  subscribedSymbols.delete(symbol);
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: "unsubscribe", symbol }));
  }
}

export function onTrade(handler: TradeHandler): () => void {
  handlers.add(handler);
  return () => handlers.delete(handler);
}
