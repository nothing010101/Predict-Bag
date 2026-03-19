export interface EpochContribution {
  betsPlaced: number;
  betsWon: number;
  earlyBets: number;     // bet < 30 menit setelah pool buka
  poolDiversity: number; // unique pools
}

export interface MiningResult {
  basePoints: number;      // 10 per bet
  accuracyBonus: number;   // 40 per win
  earlyBonus: number;      // 20 per early bet
  diversityBonus: number;  // 30 if >= 3 unique pools
  total: number;
}

export function calculateMining(contrib: EpochContribution): MiningResult {
  const basePoints = contrib.betsPlaced * 10;
  const accuracyBonus = contrib.betsWon * 40;
  const earlyBonus = contrib.earlyBets * 20;
  const diversityBonus = contrib.poolDiversity >= 3 ? 30 : 0;
  const total = basePoints + accuracyBonus + earlyBonus + diversityBonus;

  return { basePoints, accuracyBonus, earlyBonus, diversityBonus, total };
}

// Hitung payout prediction points ke $PREDICTBAG
// Genesis rate: 1000 poin = 100,000 token
export function calculatePayout(predictionPoints: number): bigint {
  return BigInt(predictionPoints) * BigInt(100);
}

// Deadline hours berdasarkan timeframe
export function getDeadlineHours(timeframe: "fast" | "medium" | "slow"): number {
  return { fast: 2, medium: 6, slow: 12 }[timeframe];
}

// Generate pertanyaan pool otomatis
export function generateQuestion(
  tokenName: string,
  currentMc: number,
  timeframe: "fast" | "medium" | "slow"
): string {
  const targetMc = currentMc * 2;
  const hours = getDeadlineHours(timeframe);
  const formatted = targetMc >= 1_000_000
    ? `$${(targetMc / 1_000_000).toFixed(1)}M`
    : `$${(targetMc / 1_000).toFixed(0)}K`;

  return `Will ${tokenName} reach ${formatted} MC within ${hours} hours?`;
}
