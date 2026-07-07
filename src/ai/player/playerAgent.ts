import { AI_RULES, ROLE_MODE_WEIGHTS } from '../config/aiConstants.ts'
import type { PlayerContext, PlayerModeScore, PlayerModeType } from '../types/aiTypes.ts'

export function scorePlayerModes(context: PlayerContext): PlayerModeScore[] {
  return [
    scoreRetreatMode(context),
    scoreFarmLaneMode(context),
    scoreFarmJungleMode(context),
    scoreJoinFightMode(context),
    scoreSaveAllyMode(context),
    scoreFinishEnemyMode(context),
    scoreTakeObjectiveMode(context),
    scorePushLaneMode(context),
  ].map((score) => applyRoleAndPersonality(context, score))
}

export function selectPlayerMode(context: PlayerContext): PlayerModeScore {
  const scoredModes = scorePlayerModes(context)
    .map((score) => ({
      ...score,
      score: score.score + getStickiness(context, score.mode),
    }))
    .sort((a, b) => b.score - a.score)

  return scoredModes[0]
}

function scoreRetreatMode(context: PlayerContext): PlayerModeScore {
  const score =
    (1 - context.self.healthPct) * 95 +
    context.self.danger * 0.85 +
    context.local.enemyNumbersAdvantage * 13 +
    context.map.gankRisk * 0.2 -
    context.local.allySaveNeed * 0.22 -
    context.profile.personality.riskTolerance * 0.18

  return makeScore('retreat', score, Math.min(100, score), context.self.danger, ['health', 'danger', 'numbers'])
}

function scoreFarmLaneMode(context: PlayerContext): PlayerModeScore {
  const farmPriorityPressure = getFarmPriorityPressure(context)
  const score =
    context.map.safeLaneFarmValue +
    getGpmDecisionBonus(context, context.map.laneFarmGpm) +
    context.self.itemTimingUrgency * 0.8 +
    context.profile.personality.farmBias * 0.25 +
    context.profile.farmingEfficiency * 0.2 -
    farmPriorityPressure.penalty +
    farmPriorityPressure.bonus -
    getLowHealthFarmPenalty(context) -
    context.map.gankRisk * 0.9 -
    getTeamFightUrgency(context) * 0.45

  return makeScore('farm_lane', score, context.self.itemTimingUrgency, context.map.gankRisk, ['farm', 'lane', 'item'])
}

function scoreFarmJungleMode(context: PlayerContext): PlayerModeScore {
  const farmPriorityPressure = getFarmPriorityPressure(context)
  const stackedEconomyPull = context.map.jungleFarmValue > context.map.safeLaneFarmValue
    ? context.self.itemTimingUrgency * 0.42
    : context.self.itemTimingUrgency * 0.12
  const score =
    context.map.jungleFarmValue +
    getGpmDecisionBonus(context, context.map.jungleFarmGpm) +
    stackedEconomyPull +
    context.profile.farmingEfficiency * 0.18 +
    context.profile.personality.greed * 0.22 +
    Math.max(0, context.map.gankRisk - 35) * 0.35 -
    farmPriorityPressure.penalty * 0.85 +
    farmPriorityPressure.bonus * 0.75 -
    getLowHealthFarmPenalty(context) -
    context.local.objectivePressure * 0.45 -
    getTeamFightUrgency(context) * 0.35

  return makeScore('farm_jungle', score, context.self.itemTimingUrgency, Math.max(12, context.map.gankRisk - 12), ['farm', 'jungle'])
}

function scoreJoinFightMode(context: PlayerContext): PlayerModeScore {
  const score =
    context.local.nearbyFightValue +
    getTeamFightUrgency(context) +
    context.team.fightReadiness * 0.35 +
    context.profile.teamfight * 0.22 -
    (1 - context.self.healthPct) * 38 -
    (1 - context.self.manaPct) * 14 -
    context.self.itemTimingUrgency * 0.22

  return makeScore('join_fight', score, getTeamFightUrgency(context), context.self.danger, ['fight', 'team_plan'])
}

function scoreSaveAllyMode(context: PlayerContext): PlayerModeScore {
  const score =
    context.local.allySaveNeed +
    context.profile.personality.saveAllyBias * 0.35 +
    context.profile.communication * 0.18 -
    context.self.danger * 0.35 -
    (1 - context.self.healthPct) * 28

  return makeScore('save_ally', score, context.local.allySaveNeed, context.self.danger, ['ally', 'save'])
}

function scoreFinishEnemyMode(context: PlayerContext): PlayerModeScore {
  const score =
    context.local.finishEnemyValue +
    context.profile.aggression * 0.26 +
    context.profile.personality.playmakingBias * 0.28 -
    context.self.danger * 0.5 -
    context.local.enemyNumbersAdvantage * 10

  return makeScore('finish_enemy', score, context.local.finishEnemyValue, context.self.danger, ['kill', 'pressure'])
}

function scoreTakeObjectiveMode(context: PlayerContext): PlayerModeScore {
  const score =
    context.local.objectivePressure +
    (context.teamPlan?.type === 'group_push' || context.teamPlan?.type === 'take_boss' || context.teamPlan?.type === 'end_game' ? 24 : 0) +
    context.profile.personality.objectiveBias * 0.3 +
    context.team.fightReadiness * 0.22 -
    context.self.danger * 0.42

  return makeScore('take_objective', score, context.local.objectivePressure, context.self.danger, ['objective', 'team_plan'])
}

function scorePushLaneMode(context: PlayerContext): PlayerModeScore {
  const farmPriorityPressure = getFarmPriorityPressure(context)
  const score =
    context.map.lanePushValue +
    getGpmDecisionBonus(context, context.map.lanePushGpm) * 0.65 +
    context.team.lanePressure * 0.25 +
    context.profile.aggression * 0.16 -
    farmPriorityPressure.penalty * 0.25 +
    farmPriorityPressure.bonus * 0.18 -
    getLowHealthFarmPenalty(context) * 0.35 -
    context.map.gankRisk * 0.5 -
    getTeamFightUrgency(context) * 0.2

  return makeScore('push_lane', score, context.map.lanePushValue, context.map.gankRisk, ['lane', 'pressure'])
}

function getFarmPriorityPressure(context: PlayerContext) {
  const farmPriorityDelta = context.profile.farmPriority - 50
  return {
    bonus: Math.max(0, farmPriorityDelta) * 0.42,
    penalty: Math.max(0, -farmPriorityDelta) * 0.58,
  }
}

function getGpmDecisionBonus(context: PlayerContext, optionGpm: number) {
  const availableGpms = [context.map.laneFarmGpm, context.map.jungleFarmGpm, context.map.lanePushGpm]
  const bestGpm = Math.max(1, ...availableGpms)
  const relativeGpm = clamp(optionGpm / bestGpm, 0, 1)
  const survivalConfidence = clamp(context.self.healthPct, 0, 1) * clamp(1 - context.self.danger / 115, 0.18, 1)
  return relativeGpm * relativeGpm * context.profile.gpmDecisionBias * 0.62 * survivalConfidence
}

function getLowHealthFarmPenalty(context: PlayerContext) {
  if (context.self.healthPct >= 0.56) return 0
  return (0.56 - context.self.healthPct) * 130
}

function applyRoleAndPersonality(context: PlayerContext, score: PlayerModeScore): PlayerModeScore {
  const roleWeight = ROLE_MODE_WEIGHTS[context.profile.role][score.mode] ?? 1
  const obedienceBonus = context.teamPlan && (
    (context.teamPlan.type === 'farm_map' && (score.mode === 'farm_lane' || score.mode === 'farm_jungle')) ||
    (context.teamPlan.type === 'avoid_fight' && score.mode === 'retreat') ||
    (context.teamPlan.type === 'defend_tower' && (score.mode === 'push_lane' || score.mode === 'join_fight')) ||
    (context.teamPlan.type === 'defend_high_ground' && (score.mode === 'retreat' || score.mode === 'join_fight')) ||
    (context.teamPlan.type === 'group_push' && score.mode === 'take_objective') ||
    (context.teamPlan.type === 'take_boss' && score.mode === 'take_objective') ||
    (context.teamPlan.type === 'pickoff' && (score.mode === 'finish_enemy' || score.mode === 'join_fight')) ||
    (context.teamPlan.type === 'end_game' && score.mode === 'take_objective')
  )
    ? context.profile.personality.obedienceToCalls * 0.18
    : 0
  const weightedScore = score.score > 0 ? score.score * roleWeight : score.score
  const decisionWindow = Math.floor(context.gameTime.seconds / AI_RULES.noise.decisionWindowSeconds)
  const tiltNoise = getDeterministicDecisionNoise(context.profile.playerId, score.mode, decisionWindow, context.profile.discipline, context.profile.personality.tiltLevel, context.matchSeed)

  return {
    ...score,
    score: weightedScore + obedienceBonus + tiltNoise,
  }
}

function getStickiness(context: PlayerContext, mode: PlayerModeType) {
  if (context.self.currentMode !== mode) return 0
  if (mode === 'retreat') return AI_RULES.modeSelection.retreatStickiness
  if (mode === 'take_objective') return AI_RULES.modeSelection.objectiveStickiness
  return AI_RULES.modeSelection.defaultModeStickiness
}

function getTeamFightUrgency(context: PlayerContext) {
  if (!context.teamPlan) return 0
  if (context.teamPlan.type === 'group_push' || context.teamPlan.type === 'take_boss' || context.teamPlan.type === 'end_game') {
    return context.teamPlan.urgency
  }
  if (context.teamPlan.type === 'pickoff') return context.teamPlan.urgency * 0.8
  if (context.teamPlan.type === 'avoid_fight' || context.teamPlan.type === 'farm_map') {
    return -context.teamPlan.urgency * 0.55
  }
  return context.teamPlan.urgency * 0.35
}

export function getDeterministicDecisionNoise(playerId: string, mode: PlayerModeType, decisionWindow: number, discipline: number, tiltLevel: number, matchSeed = 'default') {
  let hash = 0
  const key = `${matchSeed}:${playerId}:${mode}:${decisionWindow}`
  for (let index = 0; index < key.length; index += 1) {
    hash = (hash * 31 + key.charCodeAt(index)) % 9973
  }
  const normalized = hash / 9973 - 0.5
  const disciplineRatio = clamp(discipline, 0, 100) / 100
  const baseNoise = AI_RULES.noise.amateurBaseNoise +
    (AI_RULES.noise.professionalBaseNoise - AI_RULES.noise.amateurBaseNoise) * disciplineRatio
  const amplitude = clamp(
    baseNoise * (1 + clamp(tiltLevel, 0, 100) / 100),
    0,
    AI_RULES.noise.maxNoise,
  )
  return normalized * amplitude * 2
}

function makeScore(mode: PlayerModeType, score: number, urgency: number, risk: number, reasonTags: string[]): PlayerModeScore {
  return {
    mode,
    score: Math.round(score),
    urgency: clamp(Math.round(urgency), 0, 100),
    risk: clamp(Math.round(risk), 0, 100),
    reasonTags,
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}
