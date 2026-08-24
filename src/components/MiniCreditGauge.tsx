import { SCORE_BANDS } from "../lib/creditScore";

const SCORE_MIN = 300;
const SCORE_MAX = 850;

// A miniature version of the real half-circle credit gauge on Overview — same six color
// bands and needle, just small enough to sit inline (leaderboard rows) or scaled up as a
// compact hero (profile modal). Purely a visual primitive: glow/shadow is the consumer's job.
export function MiniCreditGauge({ score, size = 56 }: { score: number; size?: number }) {
  const w = size;
  const h = size / 2 + 6;
  const cx = w / 2;
  const cy = h - 5;
  const r = w / 2 - 3;
  const gap = 2.5;

  function polar(radius: number, angleDeg: number) {
    const rad = (angleDeg * Math.PI) / 180;
    return { x: cx + radius * Math.cos(rad), y: cy - radius * Math.sin(rad) };
  }
  function wedge(startAngle: number, endAngle: number) {
    const a = polar(r, startAngle);
    const b = polar(r, endAngle);
    return `M ${cx} ${cy} L ${a.x} ${a.y} A ${r} ${r} 0 0 1 ${b.x} ${b.y} Z`;
  }

  const pct = Math.max(0, Math.min(1, (score - SCORE_MIN) / (SCORE_MAX - SCORE_MIN)));
  const needleAngle = 180 - pct * 180;
  const needleTip = polar(r - 3, needleAngle);

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0 overflow-visible">
      {SCORE_BANDS.map((b, i) => {
        const rawStart = 180 - i * 30;
        const rawEnd = 180 - (i + 1) * 30;
        return <path key={b.band} d={wedge(rawStart - gap / 2, rawEnd + gap / 2)} fill={b.color} />;
      })}
      <line
        x1={cx}
        y1={cy}
        x2={needleTip.x}
        y2={needleTip.y}
        stroke="#fff"
        strokeWidth={2}
        strokeLinecap="round"
        style={{ filter: "drop-shadow(0 0 3px rgba(255,255,255,0.85))", transition: "x2 0.6s cubic-bezier(0.16, 1, 0.3, 1), y2 0.6s cubic-bezier(0.16, 1, 0.3, 1)" }}
      />
      <circle cx={cx} cy={cy} r={2.5} fill="#fff" />
    </svg>
  );
}
