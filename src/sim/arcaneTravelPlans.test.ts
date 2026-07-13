import assert from 'node:assert/strict'

import {
  rebaseArcaneTravelPlan,
  sampleArcaneTravelPlan,
  scheduleArcaneTravelPlan,
} from './arcaneTravelPlans.ts'

const plan = scheduleArcaneTravelPlan(
  undefined,
  'lane',
  { x: 0, y: 0 },
  { x: 12, y: 0 },
  4,
  10,
  12,
  '12:0',
  'Avancar rota|Avancando rota',
  '-',
  0,
)
assert.deepEqual(sampleArcaneTravelPlan(plan, 10), { x: 0, y: 0 })
assert.deepEqual(sampleArcaneTravelPlan(plan, 11), { x: 4, y: 0 })
assert.deepEqual(sampleArcaneTravelPlan(plan, 20), { x: 12, y: 0 })
assert.equal(plan.endsAt, 12, 'the AI wake deadline should cap a longer trip')

const arrivingPlan = scheduleArcaneTravelPlan(
  undefined,
  'base',
  { x: 0, y: 0 },
  { x: 3, y: 4 },
  5,
  2,
  10,
  '3:4',
  'Recuar|Recuando para curar',
  '-',
  120,
)
assert.equal(arrivingPlan.endsAt, 3, 'arrival should wake a plan before the next decision')

const rebased = rebaseArcaneTravelPlan(arrivingPlan, { x: 1, y: 1 }, 2.5)
assert.deepEqual(rebased.from, { x: 1, y: 1 })
assert.deepEqual(rebased.destination, { x: 3, y: 4 })
assert.equal(rebased.damageTakenAtStart, 120)

console.log('arcaneTravelPlans tests passed')
