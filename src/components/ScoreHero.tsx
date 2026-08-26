import { CreditGauge } from "./CreditGauge";
import type { ScoreBand } from "../lib/creditScore";
import type { ScorePoint } from "../lib/scoreHistoryStorage";

interface Props {
  score: number;
  band: ScoreBand;
  delta?: number;
  scoreHistory?: ScorePoint[];
  merged?: boolean;
}

export function ScoreHero({ score, band, delta, scoreHistory, merged }: Props) {
  return <CreditGauge score={score} band={band} delta={delta} scoreHistory={scoreHistory} merged={merged} />;
}
