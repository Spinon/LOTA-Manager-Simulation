import { COMBAT_AI_RULES } from '../config/combatAiConstants.ts'
import type { CombatTargetScoreBreakdown, CombatTargetScoreInput } from '../types/combatAiTypes.ts'

export function scoreCombatTarget(input: CombatTargetScoreInput): CombatTargetScoreBreakdown {
  const opportunity =
    input.strategicValue * 0.72 +
    input.currentThreat * 0.58 +
    input.killProbability * 1.15 +
    input.accessibility * 0.82 +
    input.allyFollowUp * 0.7 +
    input.positioningError * 0.62 +
    input.cooldownPunishValue * 0.48 +
    input.interruptValue * 0.9 +
    input.objectiveConversionValue * 0.42
  const risk =
    input.defensiveResources * 0.5 +
    input.enemySaveCoverage * 0.54 +
    input.overextensionRisk * 0.88 +
    input.baitRisk * 0.68 +
    input.expectedOverkill * 0.35 +
    input.targetSwitchCost +
    input.dangerScore * COMBAT_AI_RULES.targetSelection.dangerPenalty +
    input.towerExposure * COMBAT_AI_RULES.targetSelection.towerExposurePenalty

  return {
    ...input,
    finalScore: roundScore(opportunity - risk),
  }
}

export function selectCombatFocus(
  candidates: CombatTargetScoreBreakdown[],
  currentTargetId?: string,
) {
  const sorted = [...candidates].sort((a, b) => b.finalScore - a.finalScore || a.targetId.localeCompare(b.targetId))
  const best = sorted[0]
  const current = currentTargetId ? sorted.find((candidate) => candidate.targetId === currentTargetId) : undefined
  const selected = current && best && best.targetId !== current.targetId &&
    best.finalScore < current.finalScore + COMBAT_AI_RULES.targetSelection.switchThreshold
    ? current
    : best
  if (
    !selected ||
    selected.finalScore < COMBAT_AI_RULES.targetSelection.minimumFocusScore ||
    selected.towerExposure >= 60
  ) {
    return { primary: undefined, secondary: undefined, confidence: 0 }
  }
  const secondary = sorted.find((candidate) => candidate.targetId !== selected.targetId)
  const gap = selected.finalScore - (secondary?.finalScore ?? 0)
  return {
    primary: selected,
    secondary,
    confidence: clamp(Math.round(50 + gap * 1.4), 0, 100),
  }
}

function roundScore(value: number) {
  return Math.round(value * 10) / 10
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}
