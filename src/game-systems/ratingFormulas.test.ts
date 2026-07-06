import assert from 'node:assert/strict'
import { bestOfFive, bestOfThree, eloChange, expectedEloScore, sampleSizeConfidence } from './ratingFormulas.ts'

function closeTo(actual: number, expected: number, epsilon = 0.0001) {
  assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} should be close to ${expected}`)
}

{
  closeTo(expectedEloScore(1500, 1500), 0.5)
  closeTo(eloChange(1500, 1500, 1, 24), 12)
  closeTo(bestOfThree(0.5), 0.5)
  closeTo(bestOfFive(0.5), 0.5)
  assert.ok(bestOfFive(0.6) > bestOfThree(0.6))
  assert.equal(sampleSizeConfidence(0), 0)
  assert.ok(sampleSizeConfidence(40) > sampleSizeConfidence(10))
}

console.log('ratingFormulas tests passed')
