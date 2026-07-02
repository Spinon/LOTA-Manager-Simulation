import assert from 'node:assert/strict'
import {
  ATTRIBUTE_RULES,
  calculateAttributeDamage,
  calculateAttributesAtLevel,
  calculateHeroStats,
  calculatePhysicalDamageReduction,
  exampleHero,
  type HeroDefinition,
  type PrimaryAttribute,
  type StatModifier,
} from './heroAttributes.ts'

function closeTo(actual: number, expected: number, epsilon = 0.0001) {
  assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} should be close to ${expected}`)
}

function makeHero(primaryAttribute: PrimaryAttribute): HeroDefinition {
  return {
    ...exampleHero,
    id: `test_${primaryAttribute}`,
    primaryAttribute,
    baseAttributes: {
      strength: 10,
      agility: 20,
      intelligence: 30,
    },
    attributeGrowth: {
      strengthGain: 1,
      agilityGain: 2,
      intelligenceGain: 3,
    },
  }
}

{
  const attributes = calculateAttributesAtLevel(exampleHero, 1)
  assert.deepEqual(attributes, exampleHero.baseAttributes)
}

{
  const attributes = calculateAttributesAtLevel(exampleHero, 10)
  closeTo(attributes.strength, 25 + 3.2 * 9)
  closeTo(attributes.agility, 14 + 1.6 * 9)
  closeTo(attributes.intelligence, 16 + 1.8 * 9)
}

{
  closeTo(calculateAttributeDamage('strength', { strength: 10, agility: 20, intelligence: 30 }), 10)
  closeTo(calculateAttributeDamage('agility', { strength: 10, agility: 20, intelligence: 30 }), 20)
  closeTo(calculateAttributeDamage('intelligence', { strength: 10, agility: 20, intelligence: 30 }), 30)
  closeTo(calculateAttributeDamage('universal', { strength: 10, agility: 20, intelligence: 30 }), 42)
}

{
  const stats = calculateHeroStats(makeHero('strength'), 1)
  closeTo(stats.offense.damageMin, exampleHero.baseStats.baseDamageMin + 10)
}

{
  const stats = calculateHeroStats(makeHero('agility'), 1)
  closeTo(stats.offense.damageMin, exampleHero.baseStats.baseDamageMin + 20)
}

{
  const stats = calculateHeroStats(makeHero('intelligence'), 1)
  closeTo(stats.offense.damageMin, exampleHero.baseStats.baseDamageMin + 30)
}

{
  const stats = calculateHeroStats(makeHero('universal'), 1)
  closeTo(stats.offense.damageMin, exampleHero.baseStats.baseDamageMin + 42)
}

{
  const stats = calculateHeroStats(exampleHero, 1)
  closeTo(stats.resources.maxHealth, exampleHero.baseStats.baseHealth + 25 * ATTRIBUTE_RULES.healthPerStrength)
  closeTo(stats.resources.healthRegen, exampleHero.baseStats.baseHealthRegen + 25 * ATTRIBUTE_RULES.healthRegenPerStrength)
}

{
  const stats = calculateHeroStats(exampleHero, 1)
  closeTo(stats.defense.armor, exampleHero.baseStats.baseArmor + 14 * ATTRIBUTE_RULES.armorPerAgility)
  closeTo(stats.offense.attackSpeed, exampleHero.baseStats.baseAttackSpeed + 14 * ATTRIBUTE_RULES.attackSpeedPerAgility)
}

{
  const stats = calculateHeroStats(exampleHero, 1)
  closeTo(stats.resources.maxMana, exampleHero.baseStats.baseMana + 16 * ATTRIBUTE_RULES.manaPerIntelligence)
  closeTo(stats.resources.manaRegen, exampleHero.baseStats.baseManaRegen + 16 * ATTRIBUTE_RULES.manaRegenPerIntelligence)
  closeTo(stats.defense.magicResistance, exampleHero.baseStats.baseMagicResistance + 16 * ATTRIBUTE_RULES.magicResistancePerIntelligence)
}

{
  assert.ok(calculatePhysicalDamageReduction(10) > 0)
  assert.ok(calculatePhysicalDamageReduction(-10) < 0)
}

{
  const highAttackSpeed: StatModifier = { id: 'haste', source: 'buff', flat: { attackSpeed: 1000 } }
  const lowAttackSpeed: StatModifier = { id: 'slow', source: 'debuff', flat: { attackSpeed: -1000 } }
  closeTo(calculateHeroStats(exampleHero, 1, [highAttackSpeed]).offense.attackSpeed, ATTRIBUTE_RULES.maxAttackSpeed)
  closeTo(calculateHeroStats(exampleHero, 1, [lowAttackSpeed]).offense.attackSpeed, ATTRIBUTE_RULES.minAttackSpeed)
}

{
  const highMoveSpeed: StatModifier = { id: 'boots', source: 'item', flat: { movementSpeed: 1000 } }
  const lowMoveSpeed: StatModifier = { id: 'rooted', source: 'debuff', flat: { movementSpeed: -1000 } }
  closeTo(calculateHeroStats(exampleHero, 1, [highMoveSpeed]).movement.movementSpeed, ATTRIBUTE_RULES.maxMovementSpeed)
  closeTo(calculateHeroStats(exampleHero, 1, [lowMoveSpeed]).movement.movementSpeed, ATTRIBUTE_RULES.minMovementSpeed)
}

{
  const modifier: StatModifier = { id: 'belt', source: 'item', flat: { strength: 5, maxHealth: 100, damageMin: 4 } }
  const stats = calculateHeroStats(exampleHero, 1, [modifier])
  closeTo(stats.attributes.strength, 30)
  closeTo(stats.resources.maxHealth, exampleHero.baseStats.baseHealth + 30 * ATTRIBUTE_RULES.healthPerStrength + 100)
  closeTo(stats.offense.damageMin, exampleHero.baseStats.baseDamageMin + 30 + 4)
}

{
  const modifiers: StatModifier[] = [
    { id: 'flat', source: 'item', flat: { maxHealth: 100 } },
    { id: 'percent', source: 'buff', percent: { maxHealth: 10 } },
  ]
  const stats = calculateHeroStats(exampleHero, 1, modifiers)
  closeTo(stats.resources.maxHealth, (exampleHero.baseStats.baseHealth + 25 * ATTRIBUTE_RULES.healthPerStrength + 100) * 1.1)
}

{
  const stats = calculateHeroStats(exampleHero, 10, [])
  assert.equal(stats.level, 10)
  assert.equal(typeof stats.attributes.totalAttributes, 'number')
  assert.equal(typeof stats.resources.maxHealth, 'number')
  assert.equal(typeof stats.offense.averageDamage, 'number')
  assert.equal(typeof stats.defense.physicalDamageReduction, 'number')
  assert.equal(typeof stats.movement.movementSpeed, 'number')
  assert.equal(typeof stats.vision.dayVision, 'number')
}

console.log('heroAttributes tests passed')
