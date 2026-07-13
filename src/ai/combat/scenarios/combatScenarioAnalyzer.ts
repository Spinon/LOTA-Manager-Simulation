import { pointDistance } from '../analysis/combatContextAnalyzer.ts'
import type {
  CombatEncounterType,
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
}

const reinforcementHorizonSeconds = 11
const waveInfluenceRange = 12

export function analyzeCombatScenario(input: CombatScenarioInput): CombatScenarioAssessment {
  const enemyTeam: CombatTeamId = input.teamId === 'dawn' ? 'dusk' : 'dawn'
  const alliedIds = new Set(input.alliedHeroIds)
  const enemyIds = new Set(input.enemyHeroIds)
  const localAllies = input.heroes.filter((hero) => hero.team === input.teamId && alliedIds.has(hero.id))
  const localEnemies = input.heroes.filter((hero) => hero.team === enemyTeam && enemyIds.has(hero.id))
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
  const engageScore = round(
    localPowerAdvantage * 0.42 +
    projectedPowerAdvantage * 0.24 +
    wavePowerAdvantage * 0.16 +
    towerInfluence * 0.68 +
    levelTimingAdvantage +
    healthAdvantage * 24 +
    objectiveValue * 0.16,
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

  let intent: CombatScenarioAssessment['intent']
  if (noWaveTowerDive || (engageScore <= -20 && projectedPowerAdvantage <= -9)) {
    intent = 'disengage'
  } else if (canWaitForReinforcement && reinforcementScore >= 8) {
    intent = 'reinforce'
  } else if (waitingForLevelTiming && engageScore < 18) {
    intent = 'hold'
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
  ]

  return {
    intent,
    engageScore,
    reinforcementScore,
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
