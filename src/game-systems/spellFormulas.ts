export function projectileTravelTime(distance: number, projectileSpeed: number): number {
  if (!Number.isFinite(projectileSpeed)) return 0
  return distance / Math.max(0.001, projectileSpeed)
}

export function uptime(duration: number, cooldown: number): number {
  return Math.min(1, duration / Math.max(0.001, cooldown))
}

export function castsPerMinute(cooldown: number): number {
  return 60 / Math.max(0.001, cooldown)
}

export function manaLimitedCastsPerMinute(manaSustainPerMinute: number, manaCost: number): number {
  return manaSustainPerMinute / Math.max(1, manaCost)
}

export function expectedFightCasts(fightDuration: number, cooldown: number, currentMana: number, manaCost: number): number {
  const cooldownCasts = 1 + Math.floor(Math.max(0, fightDuration) / Math.max(0.001, cooldown))
  const manaCasts = Math.floor(currentMana / Math.max(1, manaCost))
  return Math.max(0, Math.min(cooldownCasts, manaCasts))
}

export function cooldownTalentValue(spellImpact: number, oldCooldown: number, newCooldown: number): number {
  return spellImpact * ((oldCooldown - newCooldown) / Math.max(0.001, oldCooldown))
}

export function activeItemValue(input: {
  effectMagnitude: number
  reliability: number
  expectedTargets: number
  fightImportance: number
  uptime: number
  manaBurden: number
  executionDifficulty: number
  overlapPenalty: number
}): number {
  return input.effectMagnitude *
    input.reliability *
    input.expectedTargets *
    input.fightImportance *
    input.uptime -
    input.manaBurden -
    input.executionDifficulty -
    input.overlapPenalty
}
