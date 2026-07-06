import assert from 'node:assert/strict'
import { decisionChance, objectiveConversionValue, shouldTakeDecision } from './decisionFormulas.ts'

{
  assert.equal(shouldTakeDecision(50, 50), true)
  assert.equal(shouldTakeDecision(49, 50), false)
  assert.equal(decisionChance(50, 50), 0.5)
  assert.ok(decisionChance(70, 50) > 0.5)
}

{
  assert.equal(objectiveConversionValue({
    objectiveValue: 100,
    successChance: 0.6,
    expectedLoss: 30,
    mapControlValue: 15,
    tempoValue: 5,
  }), 50)
}

console.log('decisionFormulas tests passed')
