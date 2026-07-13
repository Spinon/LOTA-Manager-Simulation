import assert from 'node:assert/strict'

import {
  advanceSimulationClock,
  createSimulationClock,
  getFramesUntilDecision,
  getFramesUntilTime,
} from './simulationClock.ts'
import type { SimulationState } from './simulation.ts'

const idleState = {
  time: 10,
  nextWave: Number.POSITIVE_INFINITY,
  nextTeamDecisionAt: Number.POSITIVE_INFINITY,
  nextCombatAiAt: Number.POSITIVE_INFINITY,
  arcanes: [],
  creeps: [],
  towers: [],
  structures: [],
  bases: [],
  camps: [],
  boss: { hp: 0, respawn: Number.POSITIVE_INFINITY },
  timedEffects: [],
  teamCalls: {},
  teamAuras: {},
  teamFortifications: {},
  combatBlackboards: { dawn: [], dusk: [] },
} as unknown as SimulationState

assert.equal(getFramesUntilDecision(0), 3, 'a decision bucket should contain three virtual 30Hz frames')
assert.equal(getFramesUntilTime(10, 10.05), 2, 'events should wake on the first quantized frame at or after their time')
assert.equal(getFramesUntilTime(10, Number.POSITIVE_INFINITY), Number.POSITIVE_INFINITY)

const eventClock = createSimulationClock('event')
const idleAdvance = advanceSimulationClock(idleState, eventClock)
assert.equal(idleAdvance.virtualFrames, 9, 'idle simulation should jump across three empty decision buckets')
assert.equal(idleAdvance.shouldDecide, true)
assert.equal(idleAdvance.decisionElapsedSeconds, 0.3)
assert.equal(idleAdvance.clockSeconds, 0.297, 'grouped clock time should match nine legacy rounded frames')
assert.ok(Math.abs(idleAdvance.elapsedSeconds - 0.3) < 0.000001, 'movement should retain nine physical 30Hz frames')

const extendedClock = createSimulationClock('event', 18)
const extendedAdvance = advanceSimulationClock(idleState, extendedClock)
assert.equal(extendedAdvance.virtualFrames, 18, 'the event horizon should be configurable for A/B audits')
assert.equal(extendedAdvance.decisionElapsedSeconds, 0.6)

const eventWakeClock = createSimulationClock('event')
const eventAdvance = advanceSimulationClock(idleState, eventWakeClock, 10.05)
assert.equal(eventAdvance.virtualFrames, 2, 'an event inside the bucket should interrupt the jump')
assert.equal(eventAdvance.shouldDecide, false)
const afterEvent = advanceSimulationClock({ ...idleState, time: 10.066 }, eventWakeClock, 10.099)
assert.equal(afterEvent.virtualFrames, 1, 'the remainder of the decision bucket should stay aligned')
assert.equal(afterEvent.shouldDecide, true)

const timedState = {
  ...idleState,
  timedEffects: [{ nextTickAt: 10.05, expiresAt: 11 }],
} as unknown as SimulationState
const timedAdvance = advanceSimulationClock(timedState, createSimulationClock('event'))
assert.equal(timedAdvance.virtualFrames, 2, 'periodic effects should interrupt a long jump on their 30Hz bucket')

const tacticalState = {
  ...idleState,
  combatBlackboards: {
    dawn: [{
      encounterId: 'test-island',
      encounterType: 'teamfight',
      phase: 'commit',
      expiresAt: 20,
      center: { x: 50, y: 50 },
      radius: 4,
      alliedHeroIds: ['dawn-2', 'dawn-1'],
      enemyHeroIds: ['dusk-1'],
    }],
    dusk: [],
  },
} as unknown as SimulationState
const tacticalAdvance = advanceSimulationClock(tacticalState, createSimulationClock('event'), 10.2)
assert.deepEqual(tacticalAdvance.tacticalEntityIds, ['dawn-1', 'dawn-2', 'dusk-1'])
assert.equal(tacticalAdvance.requiresFixedStep, true)
assert.ok(tacticalAdvance.virtualFrames > 1, 'a local island should not force an expensive global 30Hz tick')
assert.deepEqual(tacticalAdvance.tacticalEvents, [], 'an island without a due actor should not poll empty microframes')

const fixedClock = createSimulationClock('fixed')
for (let frame = 0; frame < 2; frame += 1) {
  assert.equal(advanceSimulationClock(idleState, fixedClock).shouldDecide, false)
}
assert.equal(advanceSimulationClock(idleState, fixedClock).shouldDecide, true)
assert.equal(fixedClock.diagnostics.skippedFrames, 0)
assert.equal(fixedClock.diagnostics.fixedStepTicks, 3)

console.log('simulationClock tests passed')
