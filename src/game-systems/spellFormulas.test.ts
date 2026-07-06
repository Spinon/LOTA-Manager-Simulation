import assert from 'node:assert/strict'
import {
  activeItemValue,
  castsPerMinute,
  cooldownTalentValue,
  expectedFightCasts,
  manaLimitedCastsPerMinute,
  projectileTravelTime,
  uptime,
} from './spellFormulas.ts'

function closeTo(actual: number, expected: number, epsilon = 0.0001) {
  assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} should be close to ${expected}`)
}

{
  closeTo(projectileTravelTime(900, 900), 1)
  closeTo(uptime(3, 12), 0.25)
  closeTo(castsPerMinute(15), 4)
  closeTo(manaLimitedCastsPerMinute(120, 40), 3)
  assert.equal(expectedFightCasts(40, 12, 95, 30), 3)
}

{
  closeTo(cooldownTalentValue(100, 10, 8), 20)
  closeTo(activeItemValue({
    effectMagnitude: 100,
    reliability: 0.8,
    expectedTargets: 2,
    fightImportance: 1.1,
    uptime: 0.5,
    manaBurden: 5,
    executionDifficulty: 3,
    overlapPenalty: 2,
  }), 78)
}

console.log('spellFormulas tests passed')
