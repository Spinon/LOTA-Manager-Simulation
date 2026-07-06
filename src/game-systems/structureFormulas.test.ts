import assert from 'node:assert/strict'
import {
  expectedTimeToKillStructure,
  isBackdoorProtected,
  structureDamageTaken,
} from './structureFormulas.ts'

function closeTo(actual: number, expected: number, epsilon = 0.0001) {
  assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} should be close to ${expected}`)
}

{
  closeTo(structureDamageTaken({ rawDamage: 100, damageType: 'physical', armor: 0, magicResistance: 0 }), 100)
  assert.ok(structureDamageTaken({ rawDamage: 100, damageType: 'physical', armor: 12, magicResistance: 0 }) < 100)
  closeTo(structureDamageTaken({
    rawDamage: 100,
    damageType: 'magical',
    armor: 0,
    magicResistance: 0.25,
    backdoorMultiplier: 0.25,
  }), 18.75)
}

{
  closeTo(expectedTimeToKillStructure(1000, 50), 20)
  closeTo(expectedTimeToKillStructure(1000, 0), 1000)
  assert.equal(isBackdoorProtected({ hasBackdoorProtection: true, alliedCreepsNearby: 0 }), true)
  assert.equal(isBackdoorProtected({ hasBackdoorProtection: true, alliedCreepsNearby: 1 }), false)
}

console.log('structureFormulas tests passed')
