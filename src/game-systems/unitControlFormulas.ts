export function illusionOutgoingDamage(baseDamage: number, outgoingDamagePct: number): number {
  return Math.max(0, baseDamage * outgoingDamagePct)
}

export function illusionIncomingDamage(incomingDamage: number, incomingDamageMultiplier: number): number {
  return Math.max(0, incomingDamage * incomingDamageMultiplier)
}

export function summonDamage(input: {
  baseDamage: number
  ownerDamageAmpPct?: number
  summonDamageAmpPct?: number
  targetDamageReductionPct?: number
}): number {
  return Math.max(
    0,
    input.baseDamage *
      (1 + (input.ownerDamageAmpPct ?? 0) / 100) *
      (1 + (input.summonDamageAmpPct ?? 0) / 100) *
      (1 - clamp(input.targetDamageReductionPct ?? 0, 0, 100) / 100),
  )
}

export function microPerformanceMultiplier(executionScore: number, complexity = 50): number {
  return clamp(0.5 + executionScore / Math.max(1, complexity), 0.5, 1.5)
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}
