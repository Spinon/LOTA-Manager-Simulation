export function expectedEloScore(rating: number, opponentRating: number): number {
  return 1 / (1 + Math.pow(10, (opponentRating - rating) / 400))
}

export function eloChange(rating: number, opponentRating: number, actualScore: number, kFactor = 24): number {
  return kFactor * (clamp(actualScore, 0, 1) - expectedEloScore(rating, opponentRating))
}

export function bestOfThree(singleGameWinProbability: number): number {
  const p = clamp(singleGameWinProbability, 0, 1)
  return p * p * (3 - 2 * p)
}

export function bestOfFive(singleGameWinProbability: number): number {
  const p = clamp(singleGameWinProbability, 0, 1)
  return Math.pow(p, 3) + 3 * Math.pow(p, 3) * (1 - p) + 6 * Math.pow(p, 3) * Math.pow(1 - p, 2)
}

export function sampleSizeConfidence(n: number): number {
  return Math.sqrt(Math.max(0, n) / (Math.max(0, n) + 20))
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}
