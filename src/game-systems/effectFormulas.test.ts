import assert from 'node:assert/strict'
import {
  applyBarrier,
  applyFlatAndPercentModifiers,
  calculateDotTotalDamage,
  calculateHotTotalHeal,
  canDispelEffect,
  clampMovementSpeed,
  combineMultiplicative,
  finalBuffDuration,
  finalDebuffDuration,
  finalSlowValue,
  updateStackCount,
} from './effectFormulas.ts'

function closeTo(actual: number, expected: number, epsilon = 0.0001) {
  assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} should be close to ${expected}`)
}

{
  closeTo(combineMultiplicative([0.25, 0.2]), 0.4)
  closeTo(finalDebuffDuration(2.5, [0.25, 0.2]), 1.5)
  closeTo(finalDebuffDuration(2.5, [0.4], 0.2, 0.1), 1.98)
  closeTo(finalDebuffDuration(2.5, [0.9], 0, 0, true), 2.5)
  closeTo(finalBuffDuration(4, 0.25), 5)
}

{
  closeTo(finalSlowValue(0.5, [0.2, 0.25]), 0.3)
  closeTo(applyFlatAndPercentModifiers(100, [20, -5], [0.1, 0.05], [0.2]), 158.7)
}

{
  assert.deepEqual(applyBarrier(120, 50), {
    damageAfterBarrier: 70,
    barrierRemaining: 0,
    absorbedDamage: 50,
  })
  assert.deepEqual(applyBarrier(40, 100), {
    damageAfterBarrier: 0,
    barrierRemaining: 60,
    absorbedDamage: 40,
  })
}

{
  closeTo(calculateDotTotalDamage(30, 4.5, 1), 120)
  closeTo(calculateHotTotalHeal(20, 5, 0.5, 1.5), 150)
}

{
  assert.equal(canDispelEffect('basic', 'basic'), true)
  assert.equal(canDispelEffect('strong', 'basic'), false)
  assert.equal(canDispelEffect('strong', 'strong'), true)
  assert.equal(canDispelEffect('death', 'strong'), false)
}

{
  assert.equal(updateStackCount(3, 4, 5), 5)
  assert.equal(updateStackCount(3, 4), 7)
  assert.equal(clampMovementSpeed(80), 100)
  assert.equal(clampMovementSpeed(620), 550)
}

console.log('effectFormulas tests passed')
