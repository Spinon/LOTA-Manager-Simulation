export type EffectPolarity = 'positive' | 'negative' | 'neutral'
export type EffectDurationType = 'instant' | 'timed' | 'permanent' | 'aura' | 'toggle'
export type DispelType = 'none' | 'basic' | 'strong' | 'death'
export type DispelPower = 'basic' | 'strong'
export type StackMode =
  | 'refresh'
  | 'independent'
  | 'stack_intensity'
  | 'stack_duration'
  | 'max_value_only'
  | 'unique_source'
  | 'replace_weaker'
  | 'replace_older'

export const EFFECT_RULES = {
  duration: {
    minimumEffectDuration: 0.1,
    defaultAuraLingerDuration: 0.5,
  },
  movement: {
    minimumMovementSpeed: 100,
    maximumMovementSpeed: 550,
    hasteMovementSpeed: 550,
    defaultHexMoveSpeed: 140,
  },
  attackSpeed: {
    minimumAttackSpeed: 20,
    maximumAttackSpeed: 700,
  },
  dispel: {
    basicRemovesBasic: true,
    strongRemovesBasic: true,
    strongRemovesStrong: true,
  },
  stacking: {
    defaultMaxStacks: 10,
    defaultStackDecayDelay: 5,
  },
  ticks: {
    defaultDotTickInterval: 1,
    defaultHotTickInterval: 1,
    simulationTickInterval: 1,
  },
} as const

export function combineMultiplicative(values: number[]): number {
  return 1 - values.reduce((acc, value) => acc * (1 - clamp(value, 0, 0.95)), 1)
}

export function finalDebuffDuration(
  baseDuration: number,
  statusResistances: number[],
  outgoingDebuffAmp = 0,
  incomingDebuffAmp = 0,
  ignoresStatusResistance = false,
): number {
  const ampMultiplier = (1 + outgoingDebuffAmp) * (1 + incomingDebuffAmp)
  const resistanceMultiplier = ignoresStatusResistance ? 1 : 1 - combineMultiplicative(statusResistances)
  return Math.max(EFFECT_RULES.duration.minimumEffectDuration, baseDuration * ampMultiplier * resistanceMultiplier)
}

export function finalBuffDuration(baseDuration: number, buffDurationAmp = 0): number {
  return Math.max(EFFECT_RULES.duration.minimumEffectDuration, baseDuration * (1 + buffDurationAmp))
}

export function finalSlowValue(rawSlow: number, slowResistances: number[]): number {
  return rawSlow * (1 - combineMultiplicative(slowResistances))
}

export function applyFlatAndPercentModifiers(
  baseValue: number,
  flatModifiers: number[] = [],
  percentAdditiveModifiers: number[] = [],
  percentMultiplicativeModifiers: number[] = [],
): number {
  const flatAdjusted = baseValue + flatModifiers.reduce((sum, value) => sum + value, 0)
  const additiveMultiplier = 1 + percentAdditiveModifiers.reduce((sum, value) => sum + value, 0)
  const multiplicativeMultiplier = percentMultiplicativeModifiers.reduce((product, value) => product * (1 + value), 1)

  return flatAdjusted * additiveMultiplier * multiplicativeMultiplier
}

export function applyBarrier(incomingDamage: number, barrierRemaining: number) {
  const absorbedDamage = Math.min(Math.max(0, incomingDamage), Math.max(0, barrierRemaining))

  return {
    damageAfterBarrier: Math.max(0, incomingDamage - absorbedDamage),
    barrierRemaining: Math.max(0, barrierRemaining - absorbedDamage),
    absorbedDamage,
  }
}

export function calculateDotTotalDamage(dps: number, duration: number, tickInterval: number = EFFECT_RULES.ticks.defaultDotTickInterval, damageMultiplier = 1): number {
  if (tickInterval <= 0) return 0
  const ticks = Math.floor(duration / tickInterval)
  return dps * tickInterval * ticks * damageMultiplier
}

export function calculateHotTotalHeal(hps: number, duration: number, tickInterval: number = EFFECT_RULES.ticks.defaultHotTickInterval, healMultiplier = 1): number {
  if (tickInterval <= 0) return 0
  const ticks = Math.floor(duration / tickInterval)
  return hps * tickInterval * ticks * healMultiplier
}

export function canDispelEffect(effectDispelType: DispelType, dispelPower: DispelPower): boolean {
  if (effectDispelType === 'none' || effectDispelType === 'death') return false
  if (dispelPower === 'strong') {
    return effectDispelType === 'basic' || effectDispelType === 'strong'
  }
  return effectDispelType === 'basic'
}

export function updateStackCount(currentStacks: number, stacksToAdd: number, maxStacks: number = EFFECT_RULES.stacking.defaultMaxStacks): number {
  return Math.min(Math.max(0, currentStacks) + Math.max(0, stacksToAdd), Math.max(0, maxStacks))
}

export function clampMovementSpeed(movementSpeed: number): number {
  return clamp(movementSpeed, EFFECT_RULES.movement.minimumMovementSpeed, EFFECT_RULES.movement.maximumMovementSpeed)
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}
