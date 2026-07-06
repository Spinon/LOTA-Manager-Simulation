import { armorDamageMultiplier, type CombatDamageType } from './combatFormulas.ts'

export interface StructureDamageInput {
  rawDamage: number
  damageType: CombatDamageType
  armor: number
  magicResistance: number
  sourceVsBuildingMultiplier?: number
  fortificationMultiplier?: number
  backdoorMultiplier?: number
}

export function structureDamageTaken(input: StructureDamageInput): number {
  let multiplier = 1

  if (input.damageType === 'physical') {
    multiplier *= armorDamageMultiplier(input.armor)
  }

  if (input.damageType === 'magical') {
    multiplier *= 1 - clamp(input.magicResistance, -1, 0.95)
  }

  return Math.max(
    0,
    input.rawDamage *
      multiplier *
      (input.sourceVsBuildingMultiplier ?? 1) *
      (input.fortificationMultiplier ?? 1) *
      (input.backdoorMultiplier ?? 1),
  )
}

export function expectedTimeToKillStructure(currentHealth: number, netSiegeDps: number): number {
  return currentHealth / Math.max(1, netSiegeDps)
}

export function isBackdoorProtected(input: { hasBackdoorProtection: boolean; alliedCreepsNearby: number }): boolean {
  return input.hasBackdoorProtection && input.alliedCreepsNearby <= 0
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}
