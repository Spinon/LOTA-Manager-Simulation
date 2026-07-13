import assert from 'node:assert/strict'

import {
  defaultSimulationChunkSteps,
  getNextSimulationChunkSteps,
  maximumSimulationChunkSteps,
  minimumSimulationChunkSteps,
} from './precomputeScheduling.ts'

assert.equal(
  getNextSimulationChunkSteps(defaultSimulationChunkSteps, 250),
  defaultSimulationChunkSteps,
  'a chunk at the target duration should keep its current size',
)
assert.ok(
  getNextSimulationChunkSteps(defaultSimulationChunkSteps, 100) > defaultSimulationChunkSteps,
  'fast machines should process larger chunks and send fewer messages',
)
assert.ok(
  getNextSimulationChunkSteps(defaultSimulationChunkSteps, 1_000) < defaultSimulationChunkSteps,
  'slow machines should process smaller chunks to keep cancellation responsive',
)
assert.equal(
  getNextSimulationChunkSteps(maximumSimulationChunkSteps, 1),
  maximumSimulationChunkSteps,
  'chunk growth should remain bounded',
)
assert.equal(
  getNextSimulationChunkSteps(minimumSimulationChunkSteps, 10_000),
  minimumSimulationChunkSteps,
  'chunk shrinkage should remain bounded',
)
assert.equal(
  getNextSimulationChunkSteps(defaultSimulationChunkSteps, Number.NaN),
  defaultSimulationChunkSteps,
  'invalid measurements should not disturb the scheduler',
)

console.log('precomputeScheduling tests passed')
