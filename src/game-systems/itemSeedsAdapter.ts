import { ITEM_SEEDS, type ItemSeed, type ItemStats } from '../data/itemSeeds.ts'
import { HERO_BUILD_EXAMPLES, ITEM_AI_GUIDES, type HeroBuildExample, type ItemAiGuide } from '../data/itemAiBuildGuides.ts'
import type { DispelPower } from './effectFormulas.ts'
import { ATTRIBUTE_RULES, type StatModifier } from './heroAttributes.ts'

export type ShopItem = {
  id: string
  name: string
  cost: number
  modifier: StatModifier
  active?: {
    effectId: string
    target: string
    tags: string[]
    values: Record<string, number | string | boolean>
    dispelPower?: DispelPower
    cooldown: number
    duration?: number
  }
  summary: {
    damage: number
    maxHp: number
    maxMana: number
    armor: number
    magicResistance: number
    statusResistance: number
    slowResistance: number
    moveSpeed: number
  }
}

export type ConsumableItem = {
  id: string
  name: string
  cost: number
  charges: number
  heal?: number
  mana?: number
  duration?: number
  instant: boolean
}

export function toDisplayName(id: string) {
  return id
    .replace(/^i\d+_/, '')
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function hasStats(seed: ItemSeed) {
  return seed.stats && Object.keys(seed.stats).length > 0
}

function toFlatStats(stats: ItemStats) {
  return {
    strength: stats.strength,
    agility: stats.agility,
    intelligence: stats.intelligence,
    maxHealth: stats.maxHealth,
    healthRegen: stats.healthRegen,
    maxMana: stats.maxMana,
    manaRegen: stats.manaRegen,
    damageMin: stats.damage,
    damageMax: stats.damage,
    armor: stats.armor,
    magicResistance: stats.magicResistance,
    statusResistance: stats.statusResistance,
    slowResistance: stats.slowResistance,
    evasion: stats.evasion,
    attackSpeed: stats.attackSpeed,
    movementSpeed: stats.movementSpeed,
    dayVision: stats.dayVision,
    nightVision: stats.nightVision,
  }
}

function toPercentStats(stats: ItemStats) {
  return {
    maxHealth: undefined,
    healthRegen: stats.healthRegenAmpPct,
    maxMana: undefined,
    manaRegen: stats.manaRegenAmpPct,
    damage: stats.damagePct,
    magicResistance: undefined,
    movementSpeed: stats.movementSpeedPct,
    dayVision: undefined,
    nightVision: undefined,
  }
}

export function toItemModifier(seed: ItemSeed): StatModifier {
  return {
    id: seed.id,
    source: 'item',
    flat: seed.stats ? toFlatStats(seed.stats) : undefined,
    percent: seed.stats ? toPercentStats(seed.stats) : undefined,
  }
}

export function estimateItemSummary(stats: ItemStats = {}) {
  const strengthHealth = (stats.strength ?? 0) * ATTRIBUTE_RULES.healthPerStrength
  const intelligenceMana = (stats.intelligence ?? 0) * ATTRIBUTE_RULES.manaPerIntelligence

  return {
    damage: Math.round((stats.damage ?? 0) + (stats.primaryAttribute ?? 0)),
    maxHp: Math.round((stats.maxHealth ?? 0) + strengthHealth),
    maxMana: Math.round((stats.maxMana ?? 0) + intelligenceMana),
    armor: Math.round(stats.armor ?? 0),
    magicResistance: Math.round(stats.magicResistance ?? 0),
    statusResistance: Math.round(stats.statusResistance ?? 0),
    slowResistance: Math.round(stats.slowResistance ?? 0),
    moveSpeed: Math.round(stats.movementSpeed ?? 0),
  }
}

export function toShopItem(seed: ItemSeed): ShopItem {
  return {
    id: seed.id,
    name: toDisplayName(seed.id),
    cost: seed.cost,
    modifier: toItemModifier(seed),
    active: toActiveItem(seed),
    summary: estimateItemSummary(seed.stats),
  }
}

function toActiveItem(seed: ItemSeed): ShopItem['active'] {
  const active = seed.effects?.find((effect) => effect.kind === 'active')
  if (!active) return undefined
  const tags = new Set([...seed.tags, ...active.tags])
  const dispelPower = tags.has('strong_dispel') || tags.has('debuff_immunity')
    ? 'strong'
    : tags.has('basic_dispel') || tags.has('dispel')
      ? 'basic'
      : undefined

  return {
    effectId: active.id,
    target: active.target,
    tags: [...tags],
    values: active.values ?? {},
    dispelPower,
    cooldown: readNumber(active.values?.cooldown) ?? 20,
    duration: readNumber(active.values?.duration),
  }
}

export function toConsumableItem(seed: ItemSeed): ConsumableItem | undefined {
  const effect = seed.effects?.find((candidate) => candidate.kind === 'consumable')
  if (!effect) return undefined
  const values = effect.values ?? {}
  const heal = readNumber(values.health) ?? readNumber(values.heal)
  const mana = readNumber(values.mana)
  if (!heal && !mana) return undefined

  return {
    id: seed.id,
    name: toDisplayName(seed.id),
    cost: seed.cost,
    charges: readNumber(values.charges) ?? 1,
    heal,
    mana,
    duration: readNumber(values.duration),
    instant: !values.duration,
  }
}

const inventoryShopSeeds = ITEM_SEEDS
  .filter((seed) => seed.cost > 0 && hasStats(seed) && seed.slot === 'inventory' && !isComponentOnlyItem(seed.id))
  .sort((a, b) => a.cost - b.cost)

export const itemShopCatalog = [
  ...inventoryShopSeeds,
  ...inventoryShopSeeds.filter((seed) => toActiveItem(seed)?.dispelPower),
]
  .filter((seed, index, seeds) => seeds.findIndex((candidate) => candidate.id === seed.id) === index)
  .sort((a, b) => a.cost - b.cost)
  .map(toShopItem)

export const consumableCatalog = ITEM_SEEDS
  .filter((seed) => seed.cost > 0 && seed.slot === 'consumable')
  .map(toConsumableItem)
  .filter((item): item is ConsumableItem => item !== undefined)

export function getItemSeedById(id: string) {
  return ITEM_SEEDS.find((seed) => seed.id === id)
}

export function getItemAiGuideById(id: string): ItemAiGuide | undefined {
  return ITEM_AI_GUIDES.find((guide) => guide.id === id)
}

export function getHeroBuildExample(heroId: string): HeroBuildExample | undefined {
  return HERO_BUILD_EXAMPLES.find((build) => build.heroId === heroId)
}

export function getRecommendedBuildItemIds(heroId: string) {
  const build = getHeroBuildExample(heroId)
  if (!build) return []

  return uniqueIds([
    ...build.earlyItems,
    ...build.coreItems,
    ...build.situationalItems.slice(0, 2),
    ...build.luxuryItems,
  ]).filter((id) => getShopItemById(id) !== undefined)
}

export function getRecommendedStartingItemNames(heroId: string, role: string) {
  const build = getHeroBuildExample(heroId)
  const ids = build?.startingItems ?? getFallbackStartingItemIds(role)
  return ids
    .map((id) => {
      const consumable = getConsumableById(id)
      if (consumable) return consumable.name
      return getShopItemById(id)?.name
    })
    .filter((name): name is string => name !== undefined)
    .slice(0, 6)
}

export function getShopItemById(id: string) {
  return itemShopCatalog.find((item) => item.id === id)
}

export function getShopItemByName(name: string) {
  return itemShopCatalog.find((item) => item.name === name)
}

export function getConsumableById(id: string) {
  return consumableCatalog.find((item) => item.id === id)
}

function isComponentOnlyItem(id: string) {
  const guide = getItemAiGuideById(id)
  if (guide?.aiClassification === 'component_only') return true
  if (guide?.recommendedOwners.includes('build_component_only')) return true
  return false
}

function getFallbackStartingItemIds(role: string) {
  if (role === 'Mid') return ['i003_mana_clarity', 'i004_burst_mango', 'i068_magic_wand']
  if (role.includes('Support')) return ['i001_regen_rations', 'i003_mana_clarity', 'i008_observer_eye', 'i009_sentry_eye']
  return ['i001_regen_rations', 'i002_healing_salve', 'i004_burst_mango']
}

function uniqueIds(ids: string[]) {
  return ids.filter((id, index) => ids.indexOf(id) === index)
}

function readNumber(value: unknown) {
  return typeof value === 'number' ? value : undefined
}
