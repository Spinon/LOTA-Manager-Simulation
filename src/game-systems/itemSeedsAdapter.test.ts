import assert from 'node:assert/strict'
import { ITEM_SEEDS } from '../data/itemSeeds.ts'
import { calculateHeroStats, exampleHero } from './heroAttributes.ts'
import {
  consumableCatalog,
  getHeroBuildExample,
  getRecommendedBuildItemIds,
  getRecommendedStartingItemNames,
  itemShopCatalog,
  toItemModifier,
} from './itemSeedsAdapter.ts'

assert.equal(ITEM_SEEDS.length, 210)
assert.ok(itemShopCatalog.length > 0, 'shop catalog should expose stat items')
assert.ok(itemShopCatalog.every((item) => item.cost > 0), 'shop items should have a cost')
assert.ok(consumableCatalog.length > 0, 'consumable catalog should expose sustain consumables')
assert.ok(consumableCatalog.some((item) => item.heal), 'consumables should include healing')
assert.ok(consumableCatalog.some((item) => item.mana), 'consumables should include mana restore')
assert.ok(itemShopCatalog.some((item) => item.id === 'i083_diffusal_edge'), 'shop catalog should expose recommended build items')
assert.ok(!itemShopCatalog.some((item) => item.id === 'i032_small_damage_blades'), 'component-only items should not be bought as final items')

const sampleBuild = getHeroBuildExample('h001_anti_magic_mobile_carry')
assert.ok(sampleBuild, 'hero item AI guide should expose build examples')
assert.ok(getRecommendedBuildItemIds('h001_anti_magic_mobile_carry').includes('i083_diffusal_edge'), 'recommended build should follow hero guide')
assert.ok(getRecommendedStartingItemNames('h001_anti_magic_mobile_carry', 'Safe Lane').length > 0, 'starting items should be derived from hero guide')

const firstStatItem = ITEM_SEEDS.find((item) => item.stats)
assert.ok(firstStatItem, 'at least one item should provide stats')

const modifier = toItemModifier(firstStatItem)
assert.equal(modifier.source, 'item')
assert.equal(modifier.id, firstStatItem.id)

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
