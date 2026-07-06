export function isDay(gameTimeSeconds: number): boolean {
  const cycle = 600
  return positiveModulo(gameTimeSeconds, cycle) < 300
}

export function currentVision(dayVision: number, nightVision: number, gameTimeSeconds: number): number {
  return isDay(gameTimeSeconds) ? dayVision : nightVision
}

export function smokeBreaks(distanceToEnemyHero: number, smokeBreakRadius = 1025): boolean {
  return distanceToEnemyHero <= smokeBreakRadius
}

export function visionScore(cells: Array<{ importance: number; visible: boolean }>): number {
  return cells.reduce((sum, cell) => sum + (cell.visible ? cell.importance : 0), 0)
}

function positiveModulo(value: number, divisor: number) {
  return ((value % divisor) + divisor) % divisor
}
