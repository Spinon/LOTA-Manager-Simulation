import type { ExecutionFailureType, ExecutionOutcome, PlayerContext, PlayerModeScore, PlayerModeType } from '../types/aiTypes.ts'

const MICRO_DECISION_WINDOW_SECONDS = 6

export function resolvePlayerExecution(context: PlayerContext, selected: PlayerModeScore): ExecutionOutcome {
  const successChance = getExecutionSuccessChance(context, selected)
  const roll = deterministicRoll(context.profile.playerId, selected.mode, Math.floor(context.gameTime.seconds / MICRO_DECISION_WINDOW_SECONDS), context.matchSeed)

  if (roll <= successChance) {
    return {
      intendedMode: selected.mode,
      executedMode: selected.mode,
      successChance,
      delaySeconds: getExecutionDelay(context, selected, false),
      reasonTags: ['executed', ...selected.reasonTags],
    }
  }

  const failure = chooseFailure(context, selected, roll)
  return {
    intendedMode: selected.mode,
    executedMode: getFailureMode(context, selected.mode, failure),
    successChance,
    failure,
    delaySeconds: getExecutionDelay(context, selected, true),
    reasonTags: [failure, ...selected.reasonTags],
  }
}

export function getExecutionSuccessChance(context: PlayerContext, selected: PlayerModeScore) {
  const discipline = context.profile.discipline
  const positioning = context.profile.positioning
  const communication = context.profile.communication
  const dangerPenalty = selected.risk * 0.18 + context.self.danger * 0.12
  const pressurePenalty = context.local.enemyNumbersAdvantage * 5 + context.team.throwRisk * 0.1
  const planBonus = context.teamPlan ? context.profile.personality.obedienceToCalls * 0.08 : 0
  const tiltPenalty = context.profile.personality.tiltLevel * 0.22
  const raw = 52 + discipline * 0.18 + positioning * 0.12 + communication * 0.08 + planBonus - dangerPenalty - pressurePenalty - tiltPenalty

  return clamp(Math.round(raw), 18, 96)
}

function chooseFailure(context: PlayerContext, selected: PlayerModeScore, roll: number): ExecutionFailureType {
  if (selected.mode === 'retreat' || context.self.healthPct < 0.32) return 'late_reaction'
  if (context.self.danger >= 68 && context.profile.personality.riskTolerance < 54) return 'panic_retreat'
  if ((selected.mode === 'take_objective' || selected.mode === 'finish_enemy' || selected.mode === 'join_fight') && context.profile.personality.riskTolerance >= 58) {
    return 'overcommit'
  }
  if (roll > 92) return 'wrong_target'
  return 'late_reaction'
}

function getFailureMode(context: PlayerContext, intendedMode: PlayerModeType, failure: ExecutionFailureType): PlayerModeType {
  if (failure === 'panic_retreat') return 'retreat'
  if (failure === 'late_reaction') return context.self.currentMode ?? intendedMode
  if (failure === 'wrong_target') {
    if (intendedMode === 'take_objective') return 'push_lane'
    if (intendedMode === 'save_ally') return 'join_fight'
    return 'farm_lane'
  }
  if (failure === 'overcommit') {
    if (intendedMode === 'retreat') return 'join_fight'
    if (intendedMode === 'farm_lane' || intendedMode === 'farm_jungle') return 'push_lane'
    return intendedMode
  }
  return intendedMode
}

function getExecutionDelay(context: PlayerContext, selected: PlayerModeScore, failed: boolean) {
  const disciplineDelay = (100 - context.profile.discipline) / 100
  const urgencyReduction = selected.urgency / 160
  const failurePenalty = failed ? 0.8 : 0
  return Number(clamp(0.15 + disciplineDelay * 1.25 - urgencyReduction + failurePenalty, 0, 2.4).toFixed(2))
}

function deterministicRoll(playerId: string, mode: PlayerModeType, window: number, matchSeed: string) {
  let hash = 0
  const key = `${matchSeed}:${playerId}:${mode}:${window}`
  for (let index = 0; index < key.length; index += 1) {
    hash = (hash * 33 + key.charCodeAt(index)) % 10007
  }
  return (hash / 10007) * 100
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}
