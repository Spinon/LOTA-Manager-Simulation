import assert from 'node:assert/strict'

import {
  appendCreepComponents,
  cloneCreepsIntoComponentStore,
  createCreepComponentStore,
  getCreepComponentSlot,
  replaceCreepComponentFacade,
  syncCreepComponents,
} from './creepComponents.ts'
import type { Creep } from './simulation.ts'

function createCreep(index: number): Creep {
  return {
    id: `creep-${index}`,
    team: index % 2 === 0 ? 'dawn' : 'dusk',
    lane: index % 3 === 0 ? 'top' : index % 3 === 1 ? 'mid' : 'bot',
    type: index % 4 === 0 ? 'mage' : 'melee',
    seedId: 'test-creep',
    pos: { x: index + 0.25, y: index + 0.75 },
    pathIndex: index % 12,
    hp: 100 + index,
    maxHp: 200 + index,
    damage: 20,
    range: 1.5,
    visionRange: 6,
    goldReward: 35,
    xpReward: 50,
    lastAttack: index / 10,
    routeTargetId: index % 2 === 0 ? `target-${index}` : undefined,
    nextRouteTargetEvaluationAt: index + 1.5,
  }
}

const store = createCreepComponentStore(2)
const facades = appendCreepComponents(store, Array.from({ length: 200 }, (_, index) => createCreep(index)))
assert.ok(store.capacity >= 200, 'the component store should grow geometrically')
assert.equal(store.length, 200)
assert.equal(facades[199].pos.x, 199.25)
assert.equal(facades[199].hp, 299)
assert.equal(facades[198].routeTargetId, 'target-198')

const first = facades[0]
const firstSlot = getCreepComponentSlot(store, first)!
first.pos.x = 42.5
first.hp = 77
first.lastAttack = 9.25
first.routeTargetId = 'new-target'
syncCreepComponents(store, first)
assert.equal(store.posX[firstSlot], 42.5)
assert.equal(store.hp[firstSlot], 77)
assert.equal(store.lastAttack[firstSlot], 9.25)
assert.equal(store.targetIds[store.routeTarget[firstSlot]], 'new-target')

const replacement = { ...createCreep(0), pos: { x: 8, y: 9 }, hp: 55, routeTargetId: undefined }
facades[0] = replaceCreepComponentFacade(store, first, replacement)
assert.notStrictEqual(facades[0], first, 'replacing a facade should preserve object-mode reference semantics')
assert.deepEqual(facades[0].pos, { x: 8, y: 9 })
assert.equal(store.hp[firstSlot], 55)
assert.equal(store.routeTarget[firstSlot], -1)

const cloned = cloneCreepsIntoComponentStore(facades.slice(0, 3))
assert.notStrictEqual(cloned.creeps[0], first)
assert.deepEqual({ ...cloned.creeps[0].pos }, { x: 8, y: 9 })
cloned.creeps[0].hp = 1
assert.equal(facades[0].hp, 55, 'cloned stores should not share component buffers')

console.log('creepComponents tests passed')
