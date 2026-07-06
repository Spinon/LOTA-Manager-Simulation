import assert from 'node:assert/strict'
import { currentVision, isDay, smokeBreaks, visionScore } from './visionFormulas.ts'

{
  assert.equal(isDay(0), true)
  assert.equal(isDay(299), true)
  assert.equal(isDay(300), false)
  assert.equal(isDay(600), true)
}

{
  assert.equal(currentVision(16, 9, 120), 16)
  assert.equal(currentVision(16, 9, 420), 9)
  assert.equal(smokeBreaks(800), true)
  assert.equal(smokeBreaks(1200), false)
  assert.equal(visionScore([
    { importance: 3, visible: true },
    { importance: 10, visible: false },
    { importance: 2, visible: true },
  ]), 5)
}

console.log('visionFormulas tests passed')
