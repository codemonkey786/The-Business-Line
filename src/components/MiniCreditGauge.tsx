import { useEffect, useState } from "react";
import { SCORE_BANDS } from "../lib/creditScore";

const SCORE_MIN = 300;
const SCORE_MAX = 850;

interface Props {
  score: number;
  size?: number;
  // Off by default (leaderboard rows are small and dense — glow there just smears into mush).
  // On for a hero-sized placement like the profile modal, where each wedge gets a real
  // color-matched drop-shadow and the needle gets a brighter halo, echoing the big Overview gauge.
  glow?: boolean;
}

export function MiniCreditGauge({ score, size = 56, glow = false }: Props) {
  // Rests at the floor on first paint, then animates up to the real score a frame later — so
  // every mount (including a full page reload) reads as the needle sweeping into place, using
  // the same transition that already drives it moving between live scores.
  const [displayScore, setDisplayScore] = useState(SCORE_MIN);
  useEffect(() => {
    const id = requestAnimationFrame(() => setDisplayScore(score));
    return () => cancelAnimationFrame(id);
  }, [score]);

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

  const pct = Math.max(0, Math.min(1, (displayScore - SCORE_MIN) / (SCORE_MAX - SCORE_MIN)));
  const needleAngle = 180 - pct * 180;
  const needleTip = polar(r - 3, needleAngle);

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0 overflow-visible">
      {SCORE_BANDS.map((b, i) => {
        const rawStart = 180 - i * 30;
        const rawEnd = 180 - (i + 1) * 30;
        return (
          <path
            key={b.band}
            d={wedge(rawStart - gap / 2, rawEnd + gap / 2)}
            fill={b.color}
            stroke={glow ? "#ffffff" : undefined}
            strokeOpacity={glow ? 0.4 : undefined}
            strokeWidth={glow ? 1 : undefined}
            style={
              glow
                ? {
                    filter: `saturate(1.35) brightness(1.08) drop-shadow(0 0 8px ${b.color}) drop-shadow(0 0 22px ${b.color}) drop-shadow(0 0 42px ${b.color}aa)`,
                  }
                : undefined
            }
          />
        );
      })}
      <line
        x1={cx}
        y1={cy}
        x2={needleTip.x}
        y2={needleTip.y}
        stroke="#fff"
        strokeWidth={glow ? 2.5 : 2}
        strokeLinecap="round"
        style={{
          filter: glow
            ? "drop-shadow(0 0 4px rgba(255,255,255,0.95)) drop-shadow(0 0 12px rgba(255,255,255,0.7))"
            : "drop-shadow(0 0 3px rgba(255,255,255,0.85))",
          transition: "x2 0.6s cubic-bezier(0.16, 1, 0.3, 1), y2 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      />
      <circle cx={cx} cy={cy} r={glow ? 3 : 2.5} fill="#fff" style={glow ? { filter: "drop-shadow(0 0 4px rgba(255,255,255,0.9))" } : undefined} />
    </svg>
  );
}
