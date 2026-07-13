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
