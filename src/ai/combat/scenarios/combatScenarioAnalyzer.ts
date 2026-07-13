import { pointDistance } from '../analysis/combatContextAnalyzer.ts'
import type {
  CombatChaseStopReason,
  CombatEncounterType,
  CombatPhase,
  CombatPoint,
  CombatReinforcementProjection,
  CombatScenarioAssessment,
  CombatTeamId,
} from '../types/combatAiTypes.ts'

export interface CombatScenarioHeroInput {
  id: string
  team: CombatTeamId
  role: string
  pos: CombatPoint
  healthPct: number
  manaPct: number
  level: number
  levelProgress: number
  moveSpeed: number
  combatPower: number
  effectiveHealth: number
  rotationCost: number
  visibleToTeam: boolean
  canTankTower: boolean
  controlReady: boolean
  escapeReady: boolean
  combatResourceReady: boolean
  disabled: boolean
}

export interface CombatScenarioCreepInput {
  team: CombatTeamId
  pos: CombatPoint
  healthPct: number
  damage: number
}

export interface CombatScenarioTowerInput {
  id: string
  team: CombatTeamId
  pos: CombatPoint
  range: number
  active: boolean
  aggroTargetId?: string
}

export interface CombatScenarioInput {
  teamId: CombatTeamId
  encounterType: CombatEncounterType
  center: CombatPoint
  radius: number
  alliedHeroIds: string[]
  enemyHeroIds: string[]
  heroes: CombatScenarioHeroInput[]
  creeps: CombatScenarioCreepInput[]
  towers: CombatScenarioTowerInput[]
  phase: CombatPhase
  primaryTargetId?: string
  objectiveOpportunityValue: number
  recentEnemyTeleportCount: number
}

const reinforcementHorizonSeconds = 11
const waveInfluenceRange = 12

export function analyzeCombatScenario(input: CombatScenarioInput): CombatScenarioAssessment {
  const enemyTeam: CombatTeamId = input.teamId === 'dawn' ? 'dusk' : 'dawn'
  const alliedIds = new Set(input.alliedHeroIds)
  const enemyIds = new Set(input.enemyHeroIds)
  const localAllies = input.heroes.filter((hero) => hero.team === input.teamId && alliedIds.has(hero.id))
  const localEnemies = input.heroes.filter((hero) => hero.team === enemyTeam && enemyIds.has(hero.id) && hero.visibleToTeam)
  const objectiveValue = getObjectiveValue(input.encounterType)
  const alliedReinforcements = projectReinforcements(input, input.teamId, alliedIds, objectiveValue, true)
  const enemyReinforcements = projectReinforcements(input, enemyTeam, enemyIds, objectiveValue, false)
  const localAlliedPower = sumPower(localAllies)
  const localEnemyPower = sumPower(localEnemies)
  const projectedAlliedPower = localAlliedPower + sumArrivalPower(alliedReinforcements)
  const projectedEnemyPower = localEnemyPower + sumArrivalPower(enemyReinforcements)
  const localPowerAdvantage = normalizedAdvantage(localAlliedPower, localEnemyPower)
  const projectedPowerAdvantage = normalizedAdvantage(projectedAlliedPower, projectedEnemyPower)
  const alliedWavePower = getWavePower(input, input.teamId)
  const enemyWavePower = getWavePower(input, enemyTeam)
  const wavePowerAdvantage = normalizedAdvantage(alliedWavePower, enemyWavePower)
  const nearbyTower = getInfluencingTower(input)
  const towerInfluence = getTowerInfluence(input, nearbyTower, alliedWavePower)
  const levelTimingAdvantage = getLevelTimingAdvantage(localAllies, localEnemies)
  const healthAdvantage = average(localAllies.map((hero) => hero.healthPct)) - average(localEnemies.map((hero) => hero.healthPct))
  const towerTank = nearbyTower?.team === enemyTeam
    ? getTowerTankCandidate(localAllies)
    : undefined
  const aggroHolder = nearbyTower?.aggroTargetId
    ? localAllies.find((hero) => hero.id === nearbyTower.aggroTargetId)
    : undefined
  const replacementTank = towerTank && towerTank.id !== aggroHolder?.id ? towerTank : undefined
  const requestTowerAggroDrop = Boolean(aggroHolder && aggroHolder.healthPct < 0.44 && replacementTank)
  const formationIntegrity = getFormationIntegrity(localAllies)
  const counterInitiationRisk = getCounterInitiationRisk(
    localAllies,
    localEnemies,
    enemyReinforcements,
    projectedPowerAdvantage,
    towerInfluence,
    formationIntegrity,
    input.recentEnemyTeleportCount,
  )
  const counterInitiationOpportunity = getCounterInitiationOpportunity(
    input.encounterType,
    localAllies,
    localEnemies,
    localPowerAdvantage,
    towerInfluence,
  )
  const engageScore = round(
    localPowerAdvantage * 0.42 +
    projectedPowerAdvantage * 0.24 +
    wavePowerAdvantage * 0.16 +
    towerInfluence * 0.68 +
    levelTimingAdvantage +
    healthAdvantage * 24 +
    objectiveValue * 0.16 +
    counterInitiationOpportunity * 0.2 -
    counterInitiationRisk * 0.2,
  )
  const averageAllyEta = average(alliedReinforcements.map((reinforcement) => reinforcement.etaSeconds))
  const reinforcementScore = round(
    projectedPowerAdvantage - localPowerAdvantage +
    alliedReinforcements.length * 8 +
    objectiveValue * 0.22 -
    averageAllyEta * 1.4 -
    enemyReinforcements.length * 5,
  )
  const noWaveTowerDive = towerInfluence <= -38 && alliedWavePower <= 0.5 && !towerTank
  const waitingForLevelTiming = isLaneEncounter(input.encounterType) &&
    localAllies.some((hero) => hero.levelProgress >= 0.88) &&
    levelTimingAdvantage < 7
  const canWaitForReinforcement = alliedReinforcements.length > 0 &&
    projectedPowerAdvantage >= localPowerAdvantage + 9 &&
    projectedPowerAdvantage > -12

  const chaseTarget = getChaseTarget(input, localEnemies)
  const chaseScore = getChaseScore({
    input,
    target: chaseTarget,
    localAllies,
    localEnemies,
    localPowerAdvantage,
    projectedPowerAdvantage,
    enemyReinforcements,
    formationIntegrity,
    counterInitiationRisk,
  })
  const chaseStopReason = input.phase === 'chase'
    ? getChaseStopReason({
        input,
        target: chaseTarget,
        localAllies,
        localEnemies,
        localPowerAdvantage,
        formationIntegrity,
        counterInitiationRisk,
        projectedPowerAdvantage,
        chaseScore,
        enemyReinforcements,
      })
    : undefined
  const chaseAllowed = input.phase !== 'chase' || chaseStopReason === undefined

  let intent: CombatScenarioAssessment['intent']
  if (!chaseAllowed) {
    intent = chaseStopReason === 'counter_initiation' || projectedPowerAdvantage <= -18
      ? 'disengage'
      : 'hold'
  } else if (input.phase === 'chase') {
    intent = 'engage'
  } else if (noWaveTowerDive || (engageScore <= -20 && projectedPowerAdvantage <= -9)) {
    intent = 'disengage'
  } else if (canWaitForReinforcement && reinforcementScore >= 8) {
    intent = 'reinforce'
  } else if (waitingForLevelTiming && engageScore < 18) {
    intent = 'hold'
  } else if (counterInitiationRisk >= 70 && counterInitiationOpportunity < 34) {
    intent = projectedPowerAdvantage <= -14 ? 'disengage' : 'hold'
  } else if (counterInitiationOpportunity >= 34 && counterInitiationRisk <= 58) {
    intent = 'engage'
  } else if (engageScore >= 6) {
    intent = 'engage'
  } else {
    intent = 'hold'
  }

  const reasonTags = [
    `scenario_${intent}`,
    localPowerAdvantage >= 0 ? 'local_numbers_ok' : 'local_numbers_down',
    projectedPowerAdvantage >= localPowerAdvantage + 9 ? 'reinforcements_improve_fight' : 'reinforcements_no_swing',
    wavePowerAdvantage >= 12 ? 'allied_wave_advantage' : wavePowerAdvantage <= -12 ? 'enemy_wave_advantage' : 'waves_even',
    towerInfluence > 0 ? 'allied_tower_influence' : towerInfluence < 0 ? 'enemy_tower_influence' : 'no_tower_influence',
    waitingForLevelTiming ? 'level_timing_wait' : 'level_timing_ready',
    noWaveTowerDive ? 'no_wave_no_tank' : 'siege_access_ok',
    formationIntegrity >= 0.66 ? 'formation_intact' : 'formation_stretched',
    counterInitiationRisk >= 60 ? 'counter_initiation_threat' : 'counter_initiation_safe',
    counterInitiationOpportunity >= 34 ? 'counter_initiation_window' : 'counter_initiation_unavailable',
    chaseStopReason ? `chase_stop_${chaseStopReason}` : input.phase === 'chase' ? 'chase_authorized' : 'chase_not_active',
  ]

  return {
    intent,
    engageScore,
    reinforcementScore,
    chaseAllowed,
    chaseScore,
    formationIntegrity: round(formationIntegrity),
    counterInitiationRisk: round(counterInitiationRisk),
    counterInitiationOpportunity: round(counterInitiationOpportunity),
    chaseStopReason,
    localPowerAdvantage: round(localPowerAdvantage),
    projectedPowerAdvantage: round(projectedPowerAdvantage),
    wavePowerAdvantage: round(wavePowerAdvantage),
    towerInfluence,
    levelTimingAdvantage: round(levelTimingAdvantage),
    objectiveValue,
    alliedReinforcements,
    enemyReinforcements,
    towerId: nearbyTower?.id,
    towerAggroTargetId: nearbyTower?.aggroTargetId,
    towerTankHeroId: towerTank?.id,
    requestTowerAggroDrop,
    reasonTags,
  }
}

type ChaseContext = {
  input: CombatScenarioInput
  target: CombatScenarioHeroInput | undefined
  localAllies: CombatScenarioHeroInput[]
  localEnemies: CombatScenarioHeroInput[]
  localPowerAdvantage: number
  projectedPowerAdvantage: number
  enemyReinforcements: CombatReinforcementProjection[]
  formationIntegrity: number
  counterInitiationRisk: number
}

type ChaseStopContext = ChaseContext & {
  chaseScore: number
}

function getChaseTarget(input: CombatScenarioInput, visibleEnemies: CombatScenarioHeroInput[]) {
  if (input.primaryTargetId) {
    return visibleEnemies.find((hero) => hero.id === input.primaryTargetId)
  }
  return [...visibleEnemies].sort((left, right) => left.healthPct - right.healthPct || left.id.localeCompare(right.id))[0]
}

function getChaseScore(context: ChaseContext) {
  const { input, target, localAllies, localEnemies, localPowerAdvantage, projectedPowerAdvantage, enemyReinforcements, formationIntegrity, counterInitiationRisk } = context
  if (!target) return -100
  const killProbability = clamp(
    (1 - target.healthPct) * 72 +
    Math.max(0, localPowerAdvantage) * 0.32 +
    Math.max(0, localAllies.length - localEnemies.length) * 9,
    0,
    100,
  )
  const targetNoEscape = target.escapeReady ? 0 : 18
  const objectiveConversion = getObjectiveValue(input.encounterType) * 0.42
  const bountyValue = target.role === 'Safe Lane'
    ? 18
    : target.role === 'Mid'
      ? 15
      : target.role === 'Offlane'
        ? 11
        : 7
  const overextensionRisk = Math.max(0, pointDistance(target.pos, input.center) - input.radius * 0.7) * 4 +
    Math.max(0, -projectedPowerAdvantage) * 0.22
  const enemyReinforcementRisk = enemyReinforcements.length * 9 + input.recentEnemyTeleportCount * 15
  const formationBreak = (1 - formationIntegrity) * 46
  const objectiveOpportunityCost = input.objectiveOpportunityValue * 0.74
  return round(
    killProbability +
    targetNoEscape +
    objectiveConversion +
    bountyValue -
    overextensionRisk -
    enemyReinforcementRisk -
    formationBreak -
    objectiveOpportunityCost -
    counterInitiationRisk * 0.34,
  )
}

function getChaseStopReason(context: ChaseStopContext): CombatChaseStopReason | undefined {
  const { input, target, localAllies, formationIntegrity, counterInitiationRisk, projectedPowerAdvantage, chaseScore, enemyReinforcements } = context
  if (!target) return 'dangerous_fog'
  if (localAllies.length >= 2 && formationIntegrity < 0.5) return 'formation_break'
  if (input.recentEnemyTeleportCount >= 2 || enemyReinforcements.length >= 2) return 'enemy_reinforcements'
  if (counterInitiationRisk >= 68 || projectedPowerAdvantage <= -24) return 'counter_initiation'
  if (input.objectiveOpportunityValue >= 32 && input.objectiveOpportunityValue > chaseScore * 0.72) return 'better_objective'
  const noCombatResources = localAllies.every((hero) => !hero.combatResourceReady)
  if (noCombatResources && target.escapeReady && target.healthPct > 0.24) return 'resources_spent'
  if (chaseScore < 14) return 'low_value'
  return undefined
}

function getFormationIntegrity(allies: CombatScenarioHeroInput[]) {
  if (allies.length <= 1) return 1
  let maximumNearestDistance = 0
  let isolatedSupport = false
  allies.forEach((hero) => {
    const nearestAllyDistance = Math.min(...allies
      .filter((ally) => ally.id !== hero.id)
      .map((ally) => pointDistance(hero.pos, ally.pos)))
    maximumNearestDistance = Math.max(maximumNearestDistance, nearestAllyDistance)
    if (hero.role.includes('Support') && nearestAllyDistance > 9) isolatedSupport = true
  })
  return clamp(1 - Math.max(0, maximumNearestDistance - 5) / 14 - (isolatedSupport ? 0.2 : 0), 0, 1)
}

function getCounterInitiationRisk(
  allies: CombatScenarioHeroInput[],
  enemies: CombatScenarioHeroInput[],
  enemyReinforcements: CombatReinforcementProjection[],
  projectedPowerAdvantage: number,
  towerInfluence: number,
  formationIntegrity: number,
  recentEnemyTeleportCount: number,
) {
  const enemyControl = enemies.filter((hero) => hero.controlReady && !hero.disabled).length
  const alliedControl = allies.filter((hero) => hero.controlReady && !hero.disabled).length
  return clamp(
    enemyControl * 17 +
    enemyReinforcements.length * 9 +
    recentEnemyTeleportCount * 15 +
    Math.max(0, -projectedPowerAdvantage) * 0.32 +
    Math.max(0, -towerInfluence) * 0.3 +
    (1 - formationIntegrity) * 34 -
    alliedControl * 5,
    0,
    100,
  )
}

function getCounterInitiationOpportunity(
  encounterType: CombatEncounterType,
  allies: CombatScenarioHeroInput[],
  enemies: CombatScenarioHeroInput[],
  localPowerAdvantage: number,
  towerInfluence: number,
) {
  const alliedControl = allies.filter((hero) => hero.controlReady && !hero.disabled).length
  const disabledEnemies = enemies.filter((hero) => hero.disabled).length
  const counterDiveBonus = encounterType === 'counter_dive' ? 28 : 0
  return clamp(
    alliedControl * 15 +
    disabledEnemies * 20 +
    Math.max(0, localPowerAdvantage) * 0.22 +
    Math.max(0, towerInfluence) * 0.42 +
    counterDiveBonus,
    0,
    100,
  )
}

export function getTeamEncounterType(
  encounterType: CombatEncounterType,
  teamId: CombatTeamId,
  scenario: CombatScenarioAssessment,
  towers: CombatScenarioTowerInput[],
) {
  if (encounterType !== 'tower_dive') return encounterType
  const tower = scenario.towerId ? towers.find((candidate) => candidate.id === scenario.towerId) : undefined
  return tower?.team === teamId ? 'counter_dive' : encounterType
}

function projectReinforcements(
  input: CombatScenarioInput,
  team: CombatTeamId,
  participants: Set<string>,
  objectiveValue: number,
  alliedKnowledge: boolean,
) {
  return input.heroes
    .filter((hero) => hero.team === team && !participants.has(hero.id) && (alliedKnowledge || hero.visibleToTeam))
    .map((hero) => {
      const distanceToContact = Math.max(0, pointDistance(hero.pos, input.center) - input.radius)
      const etaSeconds = distanceToContact / Math.max(0.6, hero.moveSpeed)
      const arrivalProbability = clamp(1 - etaSeconds / (reinforcementHorizonSeconds + 2), 0.12, 1)
      const arrivalPower = getHeroReadyPower(hero) * arrivalProbability
      const rotationValue = arrivalPower + objectiveValue * 0.15 - hero.rotationCost
      return { heroId: hero.id, etaSeconds, arrivalPower, rotationValue }
    })
    .filter((projection) => projection.etaSeconds <= reinforcementHorizonSeconds && projection.rotationValue >= 8)
    .sort((left, right) => left.etaSeconds - right.etaSeconds || left.heroId.localeCompare(right.heroId))
    .map(({ heroId, etaSeconds, arrivalPower }) => ({
      heroId,
      etaSeconds: round(etaSeconds),
      arrivalPower: round(arrivalPower),
    }))
}

function getWavePower(input: CombatScenarioInput, team: CombatTeamId) {
  return input.creeps
    .filter((creep) => creep.team === team && pointDistance(creep.pos, input.center) <= waveInfluenceRange)
    .reduce((total, creep) => total + creep.damage * clamp(creep.healthPct, 0.15, 1), 0)
}

function getInfluencingTower(input: CombatScenarioInput) {
  return input.towers
    .filter((tower) => tower.active && pointDistance(tower.pos, input.center) <= tower.range + 3)
    .sort((left, right) => pointDistance(left.pos, input.center) - pointDistance(right.pos, input.center))[0]
}

function getTowerInfluence(input: CombatScenarioInput, tower: CombatScenarioTowerInput | undefined, alliedWavePower: number) {
  if (!tower) return 0
  if (tower.team === input.teamId) return tower.aggroTargetId ? 55 : 42
  return alliedWavePower > 0.5 ? -24 : -48
}

function getTowerTankCandidate(heroes: CombatScenarioHeroInput[]) {
  return heroes
    .filter((hero) => hero.canTankTower && hero.healthPct >= 0.58)
    .sort((left, right) => {
      const leftScore = left.effectiveHealth * left.healthPct + (left.role === 'Offlane' ? 180 : 0)
      const rightScore = right.effectiveHealth * right.healthPct + (right.role === 'Offlane' ? 180 : 0)
      return rightScore - leftScore || left.id.localeCompare(right.id)
    })[0]
}

function getLevelTimingAdvantage(allies: CombatScenarioHeroInput[], enemies: CombatScenarioHeroInput[]) {
  const alliedLevel = average(allies.map((hero) => hero.level))
  const enemyLevel = average(enemies.map((hero) => hero.level))
  const alliedTiming = allies.filter((hero) => hero.levelProgress >= 0.88).length
  const enemyTiming = enemies.filter((hero) => hero.levelProgress >= 0.88).length
  return (alliedLevel - enemyLevel) * 6 + (alliedTiming - enemyTiming) * 3
}

function getObjectiveValue(type: CombatEncounterType) {
  if (type === 'high_ground_fight' || type === 'base_defense') return 40
  if (type === 'objective_skirmish') return 34
  if (type === 'rune_skirmish') return 28
  if (type === 'tower_dive' || type === 'counter_dive') return 24
  if (type === 'full_teamfight') return 22
  if (type === 'camp_contest' || type === 'jungle_skirmish') return 14
  if (type === 'lane_all_in') return 12
  return 8
}

function isLaneEncounter(type: CombatEncounterType) {
  return type === 'lane_trade' || type === 'lane_all_in'
}

function sumPower(heroes: CombatScenarioHeroInput[]) {
  return heroes.reduce((total, hero) => total + getHeroReadyPower(hero), 0)
}

function getHeroReadyPower(hero: CombatScenarioHeroInput) {
  const readiness = 0.36 + clamp(hero.healthPct, 0, 1) * 0.44 + clamp(hero.manaPct, 0, 1) * 0.2
  return hero.combatPower * readiness
}

function sumArrivalPower(projections: CombatReinforcementProjection[]) {
  return projections.reduce((total, projection) => total + projection.arrivalPower, 0)
}

function normalizedAdvantage(allies: number, enemies: number) {
  if (allies + enemies <= 0) return 0
  return ((allies - enemies) / (allies + enemies)) * 100
}

function average(values: number[]) {
  if (values.length === 0) return 0
  return values.reduce((total, value) => total + value, 0) / values.length
}

function round(value: number) {
  return Math.round(value * 10) / 10
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}
