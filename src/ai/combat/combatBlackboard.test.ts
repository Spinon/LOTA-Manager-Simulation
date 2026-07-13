import assert from 'node:assert/strict'

import { detectCombatEncounters } from './analysis/combatContextAnalyzer.ts'
import { scoreCombatTarget, selectCombatFocus } from './analysis/targetPriorityAnalyzer.ts'
import {
  assignDynamicCombatRoles,
  canReserveControl,
  canReserveDamage,
  canReserveSave,
  createCombatFormationPlan,
} from './coordination/combatCoordination.ts'
import { analyzeCombatScenario, getTeamEncounterType, type CombatScenarioHeroInput } from './scenarios/combatScenarioAnalyzer.ts'
import { createEmptyCombatBlackboards, updateCombatBlackboards } from './teamfight/combatBlackboard.ts'
import type { CombatDetectionInput, CombatHeroSnapshot } from './types/combatAiTypes.ts'

function hero(
  id: string,
  team: 'dawn' | 'dusk',
  x: number,
  y: number,
  values: Partial<CombatHeroSnapshot> = {},
): CombatHeroSnapshot {
  return {
    id,
    team,
    lane: 'mid',
    pos: { x, y },
    alive: true,
    healthPct: 1,
    manaPct: 1,
    level: 5,
    attackRange: 5,
    ...values,
  }
}

function input(gameTime: number, heroes: CombatHeroSnapshot[], mapObjects: CombatDetectionInput['mapObjects'] = []): CombatDetectionInput {
  return { matchSeed: 'combat-blackboard-test', gameTime, heroes, mapObjects }
}

function scenarioHero(
  id: string,
  team: 'dawn' | 'dusk',
  x: number,
  values: Partial<CombatScenarioHeroInput> = {},
): CombatScenarioHeroInput {
  return {
    id,
    team,
    role: 'Offlane',
    pos: { x, y: 50 },
    healthPct: 1,
    manaPct: 1,
    level: 6,
    levelProgress: 0.2,
    moveSpeed: 2.5,
    combatPower: 100,
    effectiveHealth: 1_000,
    rotationCost: 10,
    visibleToTeam: true,
    canTankTower: false,
    controlReady: false,
    escapeReady: false,
    combatResourceReady: true,
    disabled: false,
    ...values,
  }
}

function scenarioInput(overrides: Partial<Parameters<typeof analyzeCombatScenario>[0]> = {}): Parameters<typeof analyzeCombatScenario>[0] {
  return {
    teamId: 'dawn',
    encounterType: 'river_skirmish',
    center: { x: 50, y: 50 },
    radius: 4,
    alliedHeroIds: ['d-local'],
    enemyHeroIds: ['r-local'],
    heroes: [scenarioHero('d-local', 'dawn', 48), scenarioHero('r-local', 'dusk', 52)],
    creeps: [],
    towers: [],
    phase: 'sustain',
    objectiveOpportunityValue: 0,
    recentEnemyTeleportCount: 0,
    ...overrides,
  }
}

const laneTrade = detectCombatEncounters(input(240, [
  hero('d-mid', 'dawn', 48, 50),
  hero('r-mid', 'dusk', 53, 50),
]))
assert.equal(laneTrade.length, 1)
assert.equal(laneTrade[0].encounterType, 'lane_trade')
assert.deepEqual(laneTrade[0].teamHeroIds.dawn, ['d-mid'])
assert.deepEqual(laneTrade[0].teamHeroIds.dusk, ['r-mid'])

const laneAllIn = detectCombatEncounters(input(240, [
  hero('d-mid', 'dawn', 48, 50, { healthPct: 0.3 }),
  hero('r-mid', 'dusk', 53, 50),
]))
assert.equal(laneAllIn[0].encounterType, 'lane_all_in')

const runeFight = detectCombatEncounters(input(-20, [
  hero('d-support', 'dawn', 30, 40),
  hero('r-support', 'dusk', 34, 40),
], [{ id: 'bounty', kind: 'rune', pos: { x: 32, y: 40 }, active: true }]))
assert.equal(runeFight[0].encounterType, 'rune_skirmish')
assert.ok(runeFight[0].reasonTags.includes('pregame'))

const teamfightHeroes = [
  ...Array.from({ length: 4 }, (_, index) => hero(`d-${index}`, 'dawn', 45 + index, 50, { lane: index % 2 ? 'top' : 'mid' })),
  ...Array.from({ length: 4 }, (_, index) => hero(`r-${index}`, 'dusk', 51 + index, 50, { lane: index % 2 ? 'bot' : 'mid' })),
]
const teamfight = detectCombatEncounters(input(1_200, teamfightHeroes))
assert.equal(teamfight.length, 1)
assert.equal(teamfight[0].encounterType, 'full_teamfight')

const teamfightUnderTower = detectCombatEncounters(input(1_200, teamfightHeroes, [
  { id: 'mid-tower', kind: 'tower', pos: { x: 50, y: 50 }, active: true, team: 'dusk', range: 7 },
]))
assert.equal(teamfightUnderTower[0].encounterType, 'full_teamfight', 'large fights should not be reduced to a generic dive')

const highGroundFight = detectCombatEncounters(input(1_200, [
  hero('d-diver', 'dawn', 87, 88),
  hero('r-defender', 'dusk', 91, 91),
], [
  { id: 'dusk-base', kind: 'base', pos: { x: 94, y: 94 }, active: true, team: 'dusk' },
  { id: 'dusk-t4', kind: 'tower', pos: { x: 90, y: 90 }, active: true, team: 'dusk', range: 7 },
]))
assert.equal(highGroundFight[0].encounterType, 'high_ground_fight', 'base fights should take precedence over tower dives')

const reinforcementScenario = analyzeCombatScenario(scenarioInput({
  heroes: [
    scenarioHero('d-local', 'dawn', 48, { combatPower: 90 }),
    scenarioHero('r-local', 'dusk', 52, { combatPower: 125 }),
    scenarioHero('d-support', 'dawn', 63, { role: 'Dedicated Support', combatPower: 110, rotationCost: 4 }),
  ],
}))
assert.equal(reinforcementScenario.intent, 'reinforce', 'a timely ally that swings local power should trigger reinforcement')
assert.deepEqual(reinforcementScenario.alliedReinforcements.map((reinforcement) => reinforcement.heroId), ['d-support'])
assert.ok(reinforcementScenario.projectedPowerAdvantage > reinforcementScenario.localPowerAdvantage)

const hiddenEnemyScenario = analyzeCombatScenario(scenarioInput({
  heroes: [
    scenarioHero('d-local', 'dawn', 48),
    scenarioHero('r-local', 'dusk', 52),
    scenarioHero('r-hidden', 'dusk', 58, { combatPower: 300, visibleToTeam: false }),
  ],
}))
assert.equal(hiddenEnemyScenario.enemyReinforcements.length, 0, 'fogged enemies must not leak into reinforcement estimates')

const visibleEnemyScenario = analyzeCombatScenario(scenarioInput({
  heroes: [
    scenarioHero('d-local', 'dawn', 48),
    scenarioHero('r-local', 'dusk', 52),
    scenarioHero('r-visible', 'dusk', 58, { combatPower: 240, visibleToTeam: true, rotationCost: 0 }),
  ],
}))
assert.deepEqual(visibleEnemyScenario.enemyReinforcements.map((reinforcement) => reinforcement.heroId), ['r-visible'])
assert.ok(visibleEnemyScenario.projectedPowerAdvantage < visibleEnemyScenario.localPowerAdvantage)

const enemyWaveScenario = analyzeCombatScenario(scenarioInput({
  encounterType: 'lane_trade',
  creeps: Array.from({ length: 6 }, (_, index) => ({
    team: 'dusk' as const,
    pos: { x: 50 + index * 0.2, y: 50 },
    healthPct: 1,
    damage: 40,
  })),
}))
assert.equal(enemyWaveScenario.intent, 'hold', 'a large enemy wave should block an otherwise even extended trade')
assert.ok(enemyWaveScenario.wavePowerAdvantage < -90)

const enemyTower = { id: 'r-t1', team: 'dusk' as const, pos: { x: 50, y: 50 }, range: 7, active: true }
const unsupportedDive = analyzeCombatScenario(scenarioInput({ encounterType: 'tower_dive', towers: [enemyTower] }))
assert.equal(unsupportedDive.intent, 'disengage', 'a dive without wave or a valid tank must be abandoned')
assert.ok(unsupportedDive.reasonTags.includes('no_wave_no_tank'))

const tankedDive = analyzeCombatScenario(scenarioInput({
  encounterType: 'tower_dive',
  towers: [enemyTower],
  heroes: [
    scenarioHero('d-local', 'dawn', 48, { canTankTower: true, effectiveHealth: 2_400 }),
    scenarioHero('r-local', 'dusk', 52),
  ],
}))
assert.notEqual(tankedDive.intent, 'disengage', 'a healthy validated tank should unlock no-wave staging')
assert.equal(tankedDive.towerTankHeroId, 'd-local')

const alliedTower = { ...enemyTower, id: 'd-t1', team: 'dawn' as const, aggroTargetId: 'r-local' }
const counterDive = analyzeCombatScenario(scenarioInput({ encounterType: 'tower_dive', towers: [alliedTower] }))
assert.equal(counterDive.intent, 'engage', 'an enemy caught under the allied tower should create a counter-dive window')
assert.equal(getTeamEncounterType('tower_dive', 'dawn', counterDive, [alliedTower]), 'counter_dive')
assert.equal(getTeamEncounterType('tower_dive', 'dusk', counterDive, [alliedTower]), 'tower_dive')

const levelTimingScenario = analyzeCombatScenario(scenarioInput({
  encounterType: 'lane_trade',
  heroes: [
    scenarioHero('d-local', 'dawn', 48, { levelProgress: 0.94 }),
    scenarioHero('r-local', 'dusk', 52),
  ],
}))
assert.equal(levelTimingScenario.intent, 'hold', 'a nearly completed level timing should delay a marginal lane commit')
assert.ok(levelTimingScenario.reasonTags.includes('level_timing_wait'))

const costlyCarryRotation = analyzeCombatScenario(scenarioInput({
  heroes: [
    scenarioHero('d-local', 'dawn', 48),
    scenarioHero('r-local', 'dusk', 52),
    scenarioHero('d-carry', 'dawn', 60, { role: 'Safe Lane', combatPower: 105, rotationCost: 100 }),
    scenarioHero('d-support', 'dawn', 62, { role: 'Dedicated Support', combatPower: 80, rotationCost: 3 }),
  ],
}))
assert.deepEqual(costlyCarryRotation.alliedReinforcements.map((reinforcement) => reinforcement.heroId), ['d-support'], 'a carry near an economy timing should skip a low-value rotation')

const aggroTransfer = analyzeCombatScenario(scenarioInput({
  encounterType: 'tower_dive',
  towers: [{ ...enemyTower, aggroTargetId: 'd-low' }],
  alliedHeroIds: ['d-low', 'd-tank'],
  heroes: [
    scenarioHero('d-low', 'dawn', 48, { healthPct: 0.32 }),
    scenarioHero('d-tank', 'dawn', 49, { canTankTower: true, effectiveHealth: 2_800 }),
    scenarioHero('r-local', 'dusk', 52),
  ],
}))
assert.equal(aggroTransfer.requestTowerAggroDrop, true, 'a low-health tower tank should request an aggro transfer')
assert.equal(aggroTransfer.towerTankHeroId, 'd-tank')

const disciplinedChase = analyzeCombatScenario(scenarioInput({
  encounterType: 'chase',
  phase: 'chase',
  alliedHeroIds: ['d-core', 'd-support'],
  primaryTargetId: 'r-local',
  heroes: [
    scenarioHero('d-core', 'dawn', 48, { role: 'Safe Lane', combatPower: 135 }),
    scenarioHero('d-support', 'dawn', 49, { role: 'Dedicated Support', controlReady: true }),
    scenarioHero('r-local', 'dusk', 52, { healthPct: 0.16, escapeReady: false }),
  ],
}))
assert.equal(disciplinedChase.chaseAllowed, true, 'a visible low-health target may be chased by an intact formation')
assert.equal(disciplinedChase.intent, 'engage')
assert.ok(disciplinedChase.chaseScore >= 14)

const foggedChase = analyzeCombatScenario(scenarioInput({
  encounterType: 'chase',
  phase: 'chase',
  primaryTargetId: 'r-local',
  heroes: [
    scenarioHero('d-local', 'dawn', 48),
    scenarioHero('r-local', 'dusk', 52, { healthPct: 0.12, visibleToTeam: false }),
  ],
}))
assert.equal(foggedChase.chaseAllowed, false, 'losing the focused target in fog must end the chase')
assert.equal(foggedChase.chaseStopReason, 'dangerous_fog')

const brokenFormationChase = analyzeCombatScenario(scenarioInput({
  encounterType: 'chase',
  phase: 'chase',
  alliedHeroIds: ['d-core', 'd-support'],
  heroes: [
    scenarioHero('d-core', 'dawn', 34, { role: 'Safe Lane' }),
    scenarioHero('d-support', 'dawn', 49, { role: 'Dedicated Support' }),
    scenarioHero('r-local', 'dusk', 52, { healthPct: 0.12 }),
  ],
}))
assert.equal(brokenFormationChase.chaseStopReason, 'formation_break', 'an isolated support should terminate the chase')
assert.ok(brokenFormationChase.formationIntegrity < 0.5)

const teleportThreatChase = analyzeCombatScenario(scenarioInput({
  encounterType: 'chase',
  phase: 'chase',
  heroes: [
    scenarioHero('d-local', 'dawn', 48),
    scenarioHero('r-local', 'dusk', 52, { healthPct: 0.18 }),
  ],
  recentEnemyTeleportCount: 2,
}))
assert.equal(teleportThreatChase.chaseStopReason, 'enemy_reinforcements', 'multiple enemy teleports should cancel a chase')

const objectiveConversionChase = analyzeCombatScenario(scenarioInput({
  encounterType: 'chase',
  phase: 'chase',
  objectiveOpportunityValue: 48,
  heroes: [
    scenarioHero('d-local', 'dawn', 48),
    scenarioHero('r-local', 'dusk', 52, { healthPct: 0.48, escapeReady: true }),
  ],
}))
assert.equal(objectiveConversionChase.chaseStopReason, 'better_objective', 'a nearby high-value objective should beat a marginal chase')

const spentResourcesChase = analyzeCombatScenario(scenarioInput({
  encounterType: 'chase',
  phase: 'chase',
  heroes: [
    scenarioHero('d-local', 'dawn', 48, { combatResourceReady: false }),
    scenarioHero('r-local', 'dusk', 52, { healthPct: 0.42, escapeReady: true }),
  ],
}))
assert.equal(spentResourcesChase.chaseStopReason, 'resources_spent', 'a mobile target should not be chased after combat resources are spent')

const counterInitiationThreat = analyzeCombatScenario(scenarioInput({
  heroes: [
    scenarioHero('d-local', 'dawn', 48, { combatPower: 90 }),
    scenarioHero('r-local', 'dusk', 51, { controlReady: true, combatPower: 130 }),
    scenarioHero('r-controller', 'dusk', 53, { controlReady: true, combatPower: 130 }),
  ],
  enemyHeroIds: ['r-local', 'r-controller'],
  recentEnemyTeleportCount: 1,
  towers: [enemyTower],
}))
assert.ok(counterInitiationThreat.counterInitiationRisk >= 68, 'ready enemy control, tower and teleport threat should expose a counter-initiation')
assert.notEqual(counterInitiationThreat.intent, 'engage')

const counterInitiationWindow = analyzeCombatScenario(scenarioInput({
  encounterType: 'counter_dive',
  alliedHeroIds: ['d-local', 'd-controller'],
  heroes: [
    scenarioHero('d-local', 'dawn', 48, { controlReady: true }),
    scenarioHero('d-controller', 'dawn', 49, { controlReady: true }),
    scenarioHero('r-local', 'dusk', 52, { disabled: true }),
  ],
  towers: [alliedTower],
}))
assert.ok(counterInitiationWindow.counterInitiationOpportunity >= 60)
assert.equal(counterInitiationWindow.intent, 'engage', 'ready allied control should punish an enemy committed under an allied tower')

const opening = updateCombatBlackboards({
  gameTime: 240,
  previous: createEmptyCombatBlackboards(),
  encounters: laneTrade,
})
assert.equal(opening.dawn[0].phase, 'opening')
assert.equal(opening.dawn[0].encounterId, opening.dusk[0].encounterId)
const encounterId = opening.dawn[0].encounterId

const movedTrade = detectCombatEncounters(input(241, [
  hero('d-mid', 'dawn', 49, 50),
  hero('r-mid', 'dusk', 53, 50),
]))
const committed = updateCombatBlackboards({ gameTime: 241, previous: opening, encounters: movedTrade })
assert.equal(committed.dawn[0].encounterId, encounterId, 'participant matching should preserve the encounter id')
assert.equal(committed.dawn[0].phase, 'commit')

const sustained = updateCombatBlackboards({ gameTime: 243.3, previous: committed, encounters: movedTrade })
assert.equal(sustained.dawn[0].phase, 'sustain')

const disengaging = updateCombatBlackboards({ gameTime: 244, previous: sustained, encounters: [] })
assert.equal(disengaging.dawn[0].phase, 'disengage')
assert.ok(disengaging.dawn[0].reasonTags.includes('contact_lost'))
const expired = updateCombatBlackboards({ gameTime: 246.5, previous: disengaging, encounters: [] })
assert.equal(expired.dawn.length, 0, 'lost encounters should expire instead of becoming stuck')

const deterministicA = detectCombatEncounters(input(1_200, teamfightHeroes))
const deterministicB = detectCombatEncounters(input(1_200, teamfightHeroes))
assert.deepEqual(deterministicA, deterministicB, 'encounter detection must be deterministic')

const targetInput = {
  strategicValue: 65,
  currentThreat: 45,
  killProbability: 68,
  accessibility: 78,
  allyFollowUp: 72,
  positioningError: 50,
  cooldownPunishValue: 10,
  interruptValue: 0,
  objectiveConversionValue: 20,
  defensiveResources: 32,
  enemySaveCoverage: 12,
  overextensionRisk: 24,
  baitRisk: 8,
  expectedOverkill: 5,
  targetSwitchCost: 0,
  dangerScore: 28,
  towerExposure: 0,
  reasons: ['safe_target'],
}
const safeTarget = scoreCombatTarget({ targetId: 'safe-support', ...targetInput })
const towerBait = scoreCombatTarget({
  targetId: 'tower-core',
  ...targetInput,
  strategicValue: 100,
  killProbability: 88,
  dangerScore: 92,
  towerExposure: 100,
  overextensionRisk: 90,
  baitRisk: 85,
  reasons: ['tower_bait'],
})
assert.equal(selectCombatFocus([safeTarget, towerBait]).primary?.targetId, 'safe-support', 'tower danger should outweigh a tempting strategic target')
assert.equal(selectCombatFocus([towerBait]).primary, undefined, 'an unsupported tower target should not become team focus')

const currentTarget = scoreCombatTarget({ targetId: 'current', ...targetInput, targetSwitchCost: -10 })
const marginalAlternative = { ...safeTarget, targetId: 'marginal', finalScore: currentTarget.finalScore + 8 }
assert.equal(selectCombatFocus([currentTarget, marginalAlternative], currentTarget.targetId).primary?.targetId, 'current', 'small score gains should not cause target thrashing')
const decisiveAlternative = { ...safeTarget, targetId: 'decisive', finalScore: currentTarget.finalScore + 25 }
assert.equal(selectCombatFocus([currentTarget, decisiveAlternative], currentTarget.targetId).primary?.targetId, 'decisive', 'large gains should switch focus')

const combatRoles = assignDynamicCombatRoles([
  { id: 'hc', role: 'Safe Lane', attackRange: 5.5, hasControl: false, hasSave: false, hasInterrupt: false, hasBurst: false },
  { id: 'mid', role: 'Mid', attackRange: 3.2, hasControl: true, hasSave: false, hasInterrupt: true, hasBurst: true },
  { id: 'off', role: 'Offlane', attackRange: 2.5, hasControl: true, hasSave: false, hasInterrupt: true, hasBurst: false },
  { id: 'sup4', role: 'Greedy Support', attackRange: 5, hasControl: true, hasSave: false, hasInterrupt: true, hasBurst: false },
  { id: 'sup5', role: 'Dedicated Support', attackRange: 5, hasControl: false, hasSave: true, hasInterrupt: false, hasBurst: false },
])
assert.equal(combatRoles.find((role) => role.heroId === 'off')?.primaryRole, 'primary_initiator')
assert.equal(combatRoles.find((role) => role.heroId === 'off')?.positioningBand, 'frontline')
assert.equal(combatRoles.find((role) => role.heroId === 'sup5')?.primaryRole, 'save')
assert.equal(combatRoles.find((role) => role.heroId === 'sup5')?.positioningBand, 'backline')
const formation = createCombatFormationPlan({ x: 50, y: 50 }, combatRoles, 'hc')
assert.deepEqual(formation.frontlineHeroIds, ['off'])
assert.ok(formation.backlineHeroIds.includes('hc'))
assert.equal(formation.protectHeroId, 'hc')

const activeControl = [{
  targetId: 'enemy-core',
  sourceHeroId: 'off',
  sourceId: 'off-stun',
  controlType: 'stun' as const,
  expectedStart: 100,
  expectedEnd: 102,
  priority: 70,
  reliability: 0.9,
}]
assert.equal(canReserveControl(activeControl, 'enemy-core', 100.5, false), false, 'follow-up control should wait for active control')
assert.equal(canReserveControl(activeControl, 'enemy-core', 100.5, true), true, 'an urgent interrupt may overlap control')

const lethalDamage = [{
  targetId: 'enemy-core',
  sourceHeroId: 'mid',
  sourceId: 'mid-nuke',
  expectedImpactTime: 100.3,
  expectedDamage: 600,
  reliability: 0.9,
  isUltimate: false,
}]
assert.equal(canReserveDamage(lethalDamage, 'enemy-core', 500, 100, true), false, 'ultimates should not overkill a covered target')
assert.equal(canReserveDamage(lethalDamage, 'enemy-core', 500, 100, false), true, 'ordinary damage remains available')

const activeSave = [{
  targetAllyId: 'hc',
  sourceHeroId: 'sup5',
  sourceId: 'sup5-save',
  expectedImpactTime: 100.2,
  expectedPreventedDamage: 300,
  reliability: 0.9,
  saveType: 'barrier' as const,
  isPrimarySave: true,
}]
assert.equal(canReserveSave(activeSave, 'hc', 100, 0.55), false, 'primary saves should not overlap')
assert.equal(canReserveSave(activeSave, 'hc', 100, 0.2), true, 'critical allies may receive overlapping saves')

console.log('combatBlackboard tests passed')
