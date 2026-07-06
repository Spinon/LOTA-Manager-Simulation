import assert from 'node:assert/strict'
import {
  armorDamageMultiplier,
  expectedCritMultiplier,
  magicDamageMultiplier,
  physicalDamageReduction,
  resolveDamage,
} from './combatFormulas.ts'

function closeTo(actual: number, expected: number, epsilon = 0.0001) {
  assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} should be close to ${expected}`)
}

{
  closeTo(armorDamageMultiplier(0), 1)
  assert.ok(armorDamageMultiplier(10) < 1)
  assert.ok(armorDamageMultiplier(-10) > 1)
}

{
  assert.ok(physicalDamageReduction(10) > 0)
  assert.ok(physicalDamageReduction(-10) < 0)
}

{
  closeTo(magicDamageMultiplier(25), 0.75)
  closeTo(magicDamageMultiplier(-25), 1.25)
}

{
  closeTo(expectedCritMultiplier([{ chance: 0.3, multiplier: 2.25 }]), 1.375)
  closeTo(expectedCritMultiplier([
    { chance: 0.5, multiplier: 2 },
    { chance: 0.5, multiplier: 3 },
  ]), 2.25)
}

{
  closeTo(resolveDamage({ baseDamage: 100, damageType: 'pure' }), 100)
  closeTo(resolveDamage({ baseDamage: 100, damageType: 'magical', targetMagicResistance: 25 }), 75)
  closeTo(resolveDamage({ baseDamage: 100, damageType: 'physical', targetArmor: 0, physicalDamageBlock: 20 }), 80)
}

console.log('combatFormulas tests passed')
