import { sigmoid } from './nonCombatFormulas.ts'

export function updateLanePosition(input: {
  currentLaneEquilibrium: number
  pushPower: number
  pullPower: number
  towerPressure: number
  deltaSeconds: number
}): number {
  return clamp(
    input.currentLaneEquilibrium +
      (input.pushPower - input.pullPower - input.towerPressure) * input.deltaSeconds,
    -100,
    100,
  )
}

export function aggroTriggered(input: {
  distanceToTarget: number
  aggroRadius: number
  issuedAttackCommand: boolean
  targetIsEnemyHero: boolean
}): boolean {
  return input.issuedAttackCommand &&
    input.targetIsEnemyHero &&
    input.distanceToTarget <= input.aggroRadius
}

export function laneWinChance(score: number, variance = 10): number {
  return sigmoid(score / Math.max(0.001, variance))
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}
