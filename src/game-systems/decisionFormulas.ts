import { sigmoid } from './nonCombatFormulas.ts'

export function decisionChance(score: number, threshold: number, variance = 10): number {
  return sigmoid((score - threshold) / Math.max(0.001, variance))
}

export function objectiveConversionValue(input: {
  objectiveValue: number
  successChance: number
  expectedLoss: number
  mapControlValue?: number
  tempoValue?: number
}): number {
  return input.objectiveValue * clamp(input.successChance, 0, 1) +
    (input.mapControlValue ?? 0) +
    (input.tempoValue ?? 0) -
    input.expectedLoss
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}
