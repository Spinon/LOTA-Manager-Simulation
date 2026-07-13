import assert from 'node:assert/strict'

import { detectCombatEncounters } from './analysis/combatContextAnalyzer.ts'
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

console.log('combatBlackboard tests passed')
