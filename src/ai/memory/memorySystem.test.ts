import assert from 'node:assert/strict'
import { addAiMemoryEvent, areaDangerFromMemory, pruneAiMemory } from './memorySystem.ts'
import type { AiMemoryEvent } from '../types/aiTypes.ts'

const deathEvent: AiMemoryEvent = {
  id: 'death-1',
  type: 'hero_death',
  teamId: 'dawn',
  gameTime: 100,
  position: { x: 50, y: 50 },
  value: 70,
  expiresAtGameTime: 340,
  tags: ['death', 'danger'],
}

{
  const danger = areaDangerFromMemory([deathEvent], { x: 50, y: 50 }, 100)
  assert.equal(danger, 70)
}

{
  const nearDanger = areaDangerFromMemory([deathEvent], { x: 54, y: 50 }, 100, 20)
  const farDanger = areaDangerFromMemory([deathEvent], { x: 80, y: 50 }, 100, 20)
  assert.ok(nearDanger > farDanger)
  assert.equal(farDanger, 0)
}

{
  const freshDanger = areaDangerFromMemory([deathEvent], { x: 50, y: 50 }, 120)
  const oldDanger = areaDangerFromMemory([deathEvent], { x: 50, y: 50 }, 300)
  assert.ok(freshDanger > oldDanger)
}

{
  assert.deepEqual(pruneAiMemory([deathEvent], 500), [])
  assert.equal(pruneAiMemory([deathEvent], 120).length, 1)
}

{
  const memories = addAiMemoryEvent([deathEvent], { ...deathEvent, id: 'death-2', gameTime: 120 }, 1)
  assert.equal(memories.length, 1)
  assert.equal(memories[0].id, 'death-2')
}

console.log('memorySystem tests passed')
