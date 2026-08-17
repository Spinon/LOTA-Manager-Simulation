import assert from 'node:assert/strict'
import { ITEM_SEEDS } from '../data/itemSeeds.ts'
import { calculateHeroStats, exampleHero } from './heroAttributes.ts'
import {
  consumableCatalog,
  getConsumableById,
  getHeroBuildExample,
  getRecommendedBuildItemIds,
  getRecommendedStartingItemNames,
  getShopItemById,
  itemShopCatalog,
  runtimeItemSeeds,
  toItemModifier,
} from './itemSeedsAdapter.ts'

assert.equal(ITEM_SEEDS.length, 210)
assert.equal(runtimeItemSeeds.length, 210)
assert.ok(itemShopCatalog.length > 0, 'shop catalog should expose stat items')
assert.ok(itemShopCatalog.every((item) => item.cost > 0), 'shop items should have a cost')
assert.ok(consumableCatalog.length > 0, 'consumable catalog should expose sustain consumables')
assert.ok(consumableCatalog.some((item) => item.heal), 'consumables should include healing')
assert.ok(consumableCatalog.some((item) => item.mana), 'consumables should include mana restore')
const observerWard = getConsumableById('i008_observer_eye')
const sentryWard = getConsumableById('i009_sentry_eye')
const teamSmoke = getConsumableById('i006_team_smoke')
const revealingDust = getConsumableById('i010_revealing_dust')
assert.ok(observerWard, 'zero-cost Observer should remain in the runtime consumable catalog')
assert.equal(observerWard.effectId, 'place_observer')
assert.equal(observerWard.values.dayVision, 1600)
assert.ok(sentryWard?.tags.includes('true_sight'), 'Sentry should preserve its imported detection tag')
assert.equal(sentryWard?.values.radius, 900)
assert.ok(teamSmoke?.tags.includes('invisibility'), 'Smoke should preserve its imported strategic invisibility tag')
assert.equal(teamSmoke?.values.breakRadius, 1025)
assert.equal(teamSmoke?.values.moveSpeedPct, 15)
assert.ok(revealingDust?.tags.includes('true_sight'), 'Dust should preserve its imported reveal tag')
assert.equal(revealingDust?.values.radius, 1050)
assert.equal(revealingDust?.values.slowPct, 20)
assert.ok(itemShopCatalog.some((item) => item.id === 'i083_diffusal_edge'), 'shop catalog should expose recommended build items')
assert.ok(!itemShopCatalog.some((item) => item.id === 'i032_small_damage_blades'), 'component-only items should not be bought as final items')

const sampleBuild = getHeroBuildExample('h001_anti_magic_mobile_carry')
assert.ok(sampleBuild, 'hero item AI guide should expose build examples')
assert.ok(getRecommendedBuildItemIds('h001_anti_magic_mobile_carry').includes('i083_diffusal_edge'), 'recommended build should follow hero guide')
assert.ok(getRecommendedStartingItemNames('h001_anti_magic_mobile_carry', 'Safe Lane').length > 0, 'starting items should be derived from hero guide')

const yasha = getShopItemById('i103_speed_yasha')
assert.ok(yasha, 'Yasha-like speed item should be in shop catalog')
assert.equal(yasha.summary.agility, 16)
assert.equal(yasha.summary.attackSpeed, 15)
assert.equal(yasha.summary.moveSpeedPct, 8)

const firstStatItem = ITEM_SEEDS.find((item) => item.stats)
assert.ok(firstStatItem, 'at least one item should provide stats')

const modifier = toItemModifier(firstStatItem)
assert.equal(modifier.source, 'item')
assert.equal(modifier.id, firstStatItem.id)

const primaryAttributeItem = ITEM_SEEDS.find((item) => item.id === 'i190_t5_apex_shard')
assert.ok(primaryAttributeItem, 'apex-like item should exist')
assert.equal(toItemModifier(primaryAttributeItem, { primaryAttribute: 'strength' }).flat?.strength, 70)
assert.equal(toItemModifier(primaryAttributeItem, { primaryAttribute: 'agility' }).flat?.agility, 70)
assert.equal(toItemModifier(primaryAttributeItem, { primaryAttribute: 'intelligence' }).flat?.intelligence, 70)

const secondaryAttributeItem = ITEM_SEEDS.find((item) => item.id === 'i174_t2_pupil_gift')
assert.ok(secondaryAttributeItem, 'secondary attribute item should exist')
const secondaryStrengthModifier = toItemModifier(secondaryAttributeItem, { primaryAttribute: 'strength' })
assert.equal(secondaryStrengthModifier.flat?.agility, 14)
assert.equal(secondaryStrengthModifier.flat?.intelligence, 14)
assert.equal(secondaryStrengthModifier.flat?.strength ?? 0, 0)

const rangedOnlyItem = ITEM_SEEDS.find((item) => item.id === 'i085_reach_lance')
assert.ok(rangedOnlyItem, 'ranged-only attack range item should exist')
assert.equal(toItemModifier(rangedOnlyItem, { attackType: 'ranged' }).flat?.attackRange, 150)
assert.equal(toItemModifier(rangedOnlyItem, { attackType: 'melee' }).flat?.attackRange, undefined)

const lifestealItem = getShopItemById('i079_frenzy_mask')
assert.ok(lifestealItem, 'lifesteal item should be in shop catalog')
assert.ok(
  lifestealItem.effects.some((effect) => effect.tags.includes('lifesteal') && effect.values.lifestealPct === 20),
  'lifesteal stat should be exposed as a runtime passive effect',
)

const baseStats = calculateHeroStats(exampleHero, 1)
const modifiedStats = calculateHeroStats(exampleHero, 1, [modifier])
assert.ok(
  modifiedStats.resources.maxHealth !== baseStats.resources.maxHealth ||
    modifiedStats.resources.healthRegen !== baseStats.resources.healthRegen ||
    modifiedStats.resources.maxMana !== baseStats.resources.maxMana ||
    modifiedStats.resources.manaRegen !== baseStats.resources.manaRegen ||
    modifiedStats.offense.averageDamage !== baseStats.offense.averageDamage ||
    modifiedStats.offense.attackSpeed !== baseStats.offense.attackSpeed ||
    modifiedStats.defense.armor !== baseStats.defense.armor ||
    modifiedStats.defense.magicResistance !== baseStats.defense.magicResistance ||
    modifiedStats.movement.movementSpeed !== baseStats.movement.movementSpeed,
  'a stat item should modify at least one calculated stat',
)

console.log('itemSeedsAdapter tests passed')
