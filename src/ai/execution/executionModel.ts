import type {
  ExecutionFailureType,
  ExecutionOutcome,
  PlayerAiProfile,
  PlayerContext,
  PlayerModeScore,
  PlayerModeType,
} from '../types/aiTypes.ts'

const MICRO_DECISION_WINDOW_SECONDS = 6

export type ExecutionSuccessBreakdown = {
  relevantSkill: number
  actionDifficulty: number
  fatiguePenalty: number
  tiltPenalty: number
  pressurePenalty: number
  uncertaintyPenalty: number
  successChance: number
}

export function resolvePlayerExecution(context: PlayerContext, selected: PlayerModeScore): ExecutionOutcome {
  const successChance = getExecutionSuccessChance(context, selected)
  const window = Math.floor(context.gameTime.seconds / MICRO_DECISION_WINDOW_SECONDS)
  const roll = deterministicRoll(context.profile.playerId, selected.mode, window, context.matchSeed)

  if (roll <= successChance) {
    return {
      intendedMode: selected.mode,
      executedMode: selected.mode,
      successChance,
      delaySeconds: getExecutionDelay(context, selected, false),
      reasonTags: ['executed', ...selected.reasonTags],
    }
  }

  const failure = chooseFailure(context, selected, window)
  return {
    intendedMode: selected.mode,
    executedMode: getFailureMode(context, selected.mode, failure),
    successChance,
    failure,
    delaySeconds: getExecutionDelay(context, selected, true, failure),
    reasonTags: [failure, ...selected.reasonTags],
  }
}

export function getExecutionSuccessChance(context: PlayerContext, selected: PlayerModeScore) {
  return getExecutionSuccessBreakdown(context, selected).successChance
}

export function getExecutionSuccessBreakdown(context: PlayerContext, selected: PlayerModeScore): ExecutionSuccessBreakdown {
  const profile = context.profile
  const relevantSkill = getRelevantPlayerSkill(profile, selected.mode)
  const actionDifficulty = getActionDifficulty(context, selected)
  const fatiguePenalty = context.self.fatigue * 0.13
  const tiltPenalty = Math.max(context.self.tilt, profile.personality.tiltLevel) * 0.18
  const clutchPressureMultiplier = clamp(1 - profile.clutch / 140, 0.2, 0.92)
  const pressurePenalty = context.self.pressure * clutchPressureMultiplier * 0.18
  const awarenessUncertaintyMultiplier = clamp(1 - profile.mapAwareness / 125, 0.12, 0.92)
  const uncertaintyPenalty = context.self.informationUncertainty * awarenessUncertaintyMultiplier * 0.16
  const planBonus = context.teamPlan ? profile.personality.obedienceToCalls * 0.05 : 0
  const raw = 36 +
    relevantSkill * 0.28 +
    profile.heroMastery * 0.12 +
    profile.communication * 0.05 +
    profile.teamfight * 0.06 +
    profile.positioning * 0.08 +
    profile.discipline * 0.05 +
    planBonus -
    actionDifficulty * 0.16 -
    fatiguePenalty -
    tiltPenalty -
    pressurePenalty -
    uncertaintyPenalty

  return {
    relevantSkill: round(relevantSkill),
    actionDifficulty: round(actionDifficulty),
    fatiguePenalty: round(fatiguePenalty),
    tiltPenalty: round(tiltPenalty),
    pressurePenalty: round(pressurePenalty),
    uncertaintyPenalty: round(uncertaintyPenalty),
    successChance: clamp(Math.round(raw), 14, 97),
  }
}

export function getRelevantPlayerSkill(profile: PlayerAiProfile, mode: PlayerModeType) {
  if (mode === 'farm_lane') return profile.laning * 0.62 + profile.mechanics * 0.28 + profile.farmingEfficiency * 0.1
  if (mode === 'farm_jungle') return profile.farmingEfficiency * 0.5 + profile.mapAwareness * 0.3 + profile.mechanics * 0.2
  if (mode === 'join_fight') return profile.teamfight * 0.48 + profile.mechanics * 0.24 + profile.communication * 0.28
  if (mode === 'save_ally') return profile.communication * 0.4 + profile.teamfight * 0.32 + profile.mechanics * 0.28
  if (mode === 'finish_enemy') return profile.mechanics * 0.44 + profile.teamfight * 0.34 + profile.positioning * 0.22
  if (mode === 'take_objective') return profile.mapAwareness * 0.38 + profile.discipline * 0.34 + profile.communication * 0.28
  if (mode === 'push_lane') return profile.mapAwareness * 0.42 + profile.laning * 0.34 + profile.discipline * 0.24
  return profile.positioning * 0.42 + profile.mapAwareness * 0.34 + profile.clutch * 0.24
}

export function getActionDifficulty(context: PlayerContext, selected: PlayerModeScore) {
  const modeDifficulty: Record<PlayerModeType, number> = {
    retreat: 10,
    farm_lane: 6,
    farm_jungle: 8,
    join_fight: 20,
    save_ally: 24,
    finish_enemy: 22,
    take_objective: 14,
    push_lane: 10,
  }
  return clamp(
    modeDifficulty[selected.mode] +
    selected.risk * 0.42 +
    context.self.danger * 0.2 +
    context.local.enemyNumbersAdvantage * 7 +
    Math.max(0, selected.urgency - 70) * 0.18,
    0,
    100,
  )
}

export function getCoordinationReliability(profile: PlayerAiProfile, fatigue: number, tilt: number) {
  return clamp(
    0.76 +
    profile.communication * 0.0012 +
    profile.teamfight * 0.0007 +
    profile.discipline * 0.0006 -
    fatigue * 0.001 -
    Math.max(tilt, profile.personality.tiltLevel) * 0.0014,
    0.68,
    0.97,
  )
}

function chooseFailure(context: PlayerContext, selected: PlayerModeScore, window: number): ExecutionFailureType {
  const profile = context.profile
  const difficulty = getActionDifficulty(context, selected)
  const candidates = getFailureCandidates(selected.mode)
  return candidates
    .map((failure) => ({
      failure,
      score: getFailureAffinity(context, selected, failure, difficulty) +
        deterministicFailureBias(profile.playerId, failure, window, context.matchSeed),
    }))
    .sort((left, right) => right.score - left.score || left.failure.localeCompare(right.failure))[0].failure
}

function getFailureCandidates(mode: PlayerModeType): ExecutionFailureType[] {
  if (mode === 'retreat') return ['late_cast', 'bad_position', 'premature_retreat', 'panic_item_use']
  if (mode === 'farm_lane') return ['missed_skillshot', 'failed_aggro_drop', 'bad_position', 'late_cast']
  if (mode === 'farm_jungle') return ['bad_position', 'wrong_target', 'late_cast', 'panic_item_use']
  if (mode === 'join_fight') return ['no_follow_up', 'control_overlap', 'delayed_teleport', 'bad_position', 'overcommit']
  if (mode === 'save_ally') return ['late_cast', 'save_overlap', 'wrong_target', 'panic_item_use']
  if (mode === 'finish_enemy') return ['chase_too_far', 'missed_skillshot', 'wrong_target', 'overcommit']
  if (mode === 'take_objective') return ['overcommit', 'failed_aggro_drop', 'wrong_target', 'bad_position']
  return ['bad_position', 'failed_aggro_drop', 'overcommit', 'wrong_target']
}

function getFailureAffinity(
  context: PlayerContext,
  selected: PlayerModeScore,
  failure: ExecutionFailureType,
  difficulty: number,
) {
  const profile = context.profile
  const fatigue = context.self.fatigue
  const tilt = Math.max(context.self.tilt, profile.personality.tiltLevel)
  const pressure = context.self.pressure
  if (failure === 'late_cast' || failure === 'late_reaction') return (100 - profile.mechanics) * 0.42 + fatigue * 0.4 + pressure * 0.24
  if (failure === 'missed_skillshot') return (100 - profile.mechanics) * 0.58 + difficulty * 0.3
  if (failure === 'wrong_target') return (100 - profile.teamfight) * 0.34 + (100 - profile.mapAwareness) * 0.3 + context.self.informationUncertainty * 0.36
  if (failure === 'control_overlap' || failure === 'save_overlap') return (100 - profile.communication) * 0.58 + tilt * 0.24 + difficulty * 0.16
  if (failure === 'overcommit' || failure === 'chase_too_far') return (100 - profile.discipline) * 0.46 + profile.personality.riskTolerance * 0.28 + selected.risk * 0.24
  if (failure === 'bad_position' || failure === 'failed_aggro_drop') return (100 - profile.positioning) * 0.42 + (100 - profile.laning) * 0.2 + pressure * 0.24
  if (failure === 'premature_retreat' || failure === 'panic_retreat') return (100 - profile.clutch) * 0.4 + (100 - profile.personality.riskTolerance) * 0.22 + pressure * 0.3
  if (failure === 'delayed_teleport' || failure === 'no_follow_up') return (100 - profile.mapAwareness) * 0.34 + (100 - profile.communication) * 0.4 + fatigue * 0.22
  return (100 - profile.clutch) * 0.34 + tilt * 0.42 + pressure * 0.2
}

function getFailureMode(context: PlayerContext, intendedMode: PlayerModeType, failure: ExecutionFailureType): PlayerModeType {
  if (failure === 'panic_retreat' || failure === 'premature_retreat') return 'retreat'
  if (failure === 'late_reaction' || failure === 'late_cast' || failure === 'delayed_teleport' || failure === 'no_follow_up' || failure === 'panic_item_use') {
    return context.self.currentMode ?? intendedMode
  }
  if (failure === 'wrong_target') {
    if (intendedMode === 'take_objective') return 'push_lane'
    if (intendedMode === 'save_ally') return 'join_fight'
    return 'farm_lane'
  }
  if (failure === 'bad_position' && context.self.danger >= 72) return 'retreat'
  if (failure === 'failed_aggro_drop' && context.self.danger >= 64) return 'retreat'
  if (failure === 'overcommit' || failure === 'chase_too_far') {
    if (intendedMode === 'farm_lane' || intendedMode === 'farm_jungle') return 'push_lane'
    return intendedMode
  }
  return intendedMode
}

export function getExecutionDelay(
  context: PlayerContext,
  selected: PlayerModeScore,
  failed: boolean,
  failure?: ExecutionFailureType,
) {
  const reactionSkill = context.profile.mechanics * 0.45 + context.profile.mapAwareness * 0.25 + context.profile.discipline * 0.3
  const reactionDelay = (100 - reactionSkill) / 130
  const difficultyDelay = getActionDifficulty(context, selected) / 250
  const fatigueDelay = context.self.fatigue / 220
  const tiltDelay = context.self.tilt / 250
  const urgencyReduction = selected.urgency / 210
  const failurePenalty = failed
    ? failure === 'late_cast' || failure === 'late_reaction' || failure === 'delayed_teleport' || failure === 'no_follow_up'
      ? 0.85
      : 0.42
    : 0
  return Number(clamp(
    0.06 + reactionDelay + difficultyDelay + fatigueDelay + tiltDelay - urgencyReduction + failurePenalty,
    0.05,
    2.6,
  ).toFixed(2))
}

function deterministicRoll(playerId: string, mode: PlayerModeType, window: number, matchSeed: string) {
  return deterministicUnit(`${matchSeed}:${playerId}:${mode}:${window}`) * 100
}

function deterministicFailureBias(playerId: string, failure: ExecutionFailureType, window: number, matchSeed: string) {
  return deterministicUnit(`${matchSeed}:${playerId}:${failure}:${window}:failure`) * 18
}

function deterministicUnit(key: string) {
  let hash = 0
  for (let index = 0; index < key.length; index += 1) {
    hash = (hash * 33 + key.charCodeAt(index)) % 10007
  }
  return hash / 10007
}

function round(value: number) {
  return Math.round(value * 10) / 10
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}
