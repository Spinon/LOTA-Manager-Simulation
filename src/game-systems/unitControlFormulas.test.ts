import assert from 'node:assert/strict'
import {
  illusionIncomingDamage,
  illusionOutgoingDamage,
  microPerformanceMultiplier,
  summonDamage,
} from './unitControlFormulas.ts'

function closeTo(actual: number, expected: number, epsilon = 0.0001) {
  assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} should be close to ${expected}`)
}

{
  closeTo(illusionOutgoingDamage(100, 0.35), 35)
  closeTo(illusionIncomingDamage(100, 3), 300)
  closeTo(summonDamage({
    baseDamage: 100,
    ownerDamageAmpPct: 20,
    summonDamageAmpPct: 10,
    targetDamageReductionPct: 25,
  }), 99)
}

{
  closeTo(microPerformanceMultiplier(25, 50), 1)
  closeTo(microPerformanceMultiplier(80, 50), 1.5)
  closeTo(microPerformanceMultiplier(-20, 50), 0.5)
}

console.log('unitControlFormulas tests passed')
