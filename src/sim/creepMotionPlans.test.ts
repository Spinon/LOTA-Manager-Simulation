import assert from 'node:assert/strict'

import {
  createCreepMotionPlan,
  rebaseCreepMotionPlan,
  sampleCreepMotionPlan,
} from './creepMotionPlans.ts'

const routePlan = createCreepMotionPlan('route', { x: 0, y: 0 }, { x: 10, y: 0 }, 4, 1, 4)
assert.deepEqual(sampleCreepMotionPlan(routePlan, 1), { x: 0, y: 0 })
assert.deepEqual(sampleCreepMotionPlan(routePlan, 2), { x: 4, y: 0 })
assert.deepEqual(sampleCreepMotionPlan(routePlan, 5), { x: 10, y: 0 })
assert.equal(routePlan.endsAt, 3.5, 'arrival should wake a route plan before its perception deadline')

const windowedPlan = createCreepMotionPlan('route', { x: 0, y: 0 }, { x: 10, y: 0 }, 4, 1, 2)
assert.equal(windowedPlan.endsAt, 2, 'the perception deadline should cap a long route plan')
assert.deepEqual(sampleCreepMotionPlan(windowedPlan, 2), { x: 4, y: 0 })

const holdPlan = createCreepMotionPlan('hold', { x: 3, y: 7 }, { x: 99, y: 99 }, 4, 2, 2.1)
assert.deepEqual(sampleCreepMotionPlan(holdPlan, 3), { x: 3, y: 7 })
assert.equal(holdPlan.endsAt, 2.1)

const rebased = rebaseCreepMotionPlan(windowedPlan, { x: 1, y: 1 }, 1.5)
assert.deepEqual(rebased.from, { x: 1, y: 1 })
assert.deepEqual(rebased.destination, windowedPlan.destination)
assert.equal(rebased.wakeAt, windowedPlan.wakeAt)

console.log('creepMotionPlans tests passed')
