export type CombatDamageType = 'physical' | 'magical' | 'pure'

export interface DamageFormulaInput {
  baseDamage: number
  damageType: CombatDamageType
  targetArmor?: number
  targetMagicResistance?: number
  physicalDamageBlock?: number
  magicDamageBlock?: number
  outgoingAmpPct?: number
  incomingAmpPct?: number
  genericMultiplier?: number
}

export function armorDamageMultiplier(armor: number): number {
  return 1 - (0.06 * armor) / (1 + 0.06 * Math.abs(armor))
}

export function physicalDamageReduction(armor: number): number {
  return 1 - armorDamageMultiplier(armor)
}

export function magicDamageMultiplier(magicResistancePct: number): number {
  return 1 - clamp(magicResistancePct, -100, 95) / 100
}

export function expectedCritMultiplier(critSources: Array<{ chance: number; multiplier: number }>): number {
  const orderedSources = [...critSources].sort((a, b) => b.multiplier - a.multiplier)
  let previousFailures = 1
  let expectedMultiplier = 1

  orderedSources.forEach((source) => {
    const chance = clamp(source.chance, 0, 1)
    expectedMultiplier += previousFailures * chance * (Math.max(1, source.multiplier) - 1)
    previousFailures *= 1 - chance
  })

  return expectedMultiplier
}

export function resolveDamage(input: DamageFormulaInput): number {
  let damage = Math.max(0, input.baseDamage)
  damage *= 1 + (input.outgoingAmpPct ?? 0) / 100

  if (input.damageType === 'physical') {
    damage = Math.max(0, damage - (input.physicalDamageBlock ?? 0))
    damage *= armorDamageMultiplier(input.targetArmor ?? 0)
  }

  if (input.damageType === 'magical') {
    damage = Math.max(0, damage - (input.magicDamageBlock ?? 0))
    damage *= magicDamageMultiplier(input.targetMagicResistance ?? 25)
  }

  damage *= 1 + (input.incomingAmpPct ?? 0) / 100
  damage *= input.genericMultiplier ?? 1

  return Math.max(0, damage)
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}
