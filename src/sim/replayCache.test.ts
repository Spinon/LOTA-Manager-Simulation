import assert from 'node:assert/strict'

import {
  createReplayCacheKey,
  isCompatibleCachedReplay,
  replayCompatibilityVersion,
  type CachedReplay,
} from './replayCache.ts'

const identity = {
  seed: 'cache-seed',
  lineups: ['dawn-a', 'dawn-b', 'dusk-a', 'dusk-b'],
  strategies: { dusk: { pace: 'fast', lane: 'mid' }, dawn: { lane: 'top', pace: 'slow' } },
}
const reorderedIdentity = {
  seed: 'cache-seed',
  lineups: ['dawn-a', 'dawn-b', 'dusk-a', 'dusk-b'],
  strategies: { dawn: { pace: 'slow', lane: 'top' }, dusk: { lane: 'mid', pace: 'fast' } },
}

assert.equal(createReplayCacheKey(identity), createReplayCacheKey(reorderedIdentity), 'object key order must not affect replay identity')
assert.notEqual(createReplayCacheKey(identity), createReplayCacheKey({ ...identity, seed: 'another-seed' }), 'seed must affect replay identity')
assert.notEqual(createReplayCacheKey(identity), createReplayCacheKey({ ...identity, lineups: [...identity.lineups].reverse() }), 'lineup slots must affect replay identity')
assert.notEqual(createReplayCacheKey(identity), createReplayCacheKey(identity, 'new-rules'), 'engine and rules version must affect replay identity')

const replay = {
  key: createReplayCacheKey(identity),
  compatibilityVersion: replayCompatibilityVersion,
} as CachedReplay
assert.equal(isCompatibleCachedReplay(replay, identity), true)
assert.equal(isCompatibleCachedReplay(replay, { ...identity, seed: 'another-seed' }), false)
assert.equal(isCompatibleCachedReplay({ ...replay, compatibilityVersion: 'old-rules' }, identity), false)

console.log('replayCache tests passed')
