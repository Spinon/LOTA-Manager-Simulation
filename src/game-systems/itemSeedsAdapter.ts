import { type ItemEffectKind, type ItemSeed, type ItemStats } from '../data/itemSeeds.ts'
import { HERO_BUILD_EXAMPLES, ITEM_AI_GUIDES, type HeroBuildExample, type ItemAiGuide } from '../data/itemAiBuildGuides.ts'
import { FULL_ITEM_SEEDS_V2, type FullItemEffectSeed, type FullItemSeed } from '../data/itemSeedsV2.ts'
import type { DispelPower } from './effectFormulas.ts'
import { ATTRIBUTE_RULES, type AttackType, type PrimaryAttribute, type StatModifier } from './heroAttributes.ts'

export type ShopItem = {
  id: string
  name: string
  cost: number
  modifier: StatModifier
  effects: RuntimeItemEffect[]
  active?: {
    effectId: string
    target: string
    tags: string[]
    values: Record<string, number | number[] | string | boolean>
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
    strength: number
    agility: number
    intelligence: number
    attackSpeed: number
    moveSpeedPct: number
    spellAmpPct: number
    lifestealPct: number
    cooldownReductionPct: number
    moveSpeed: number
  }
}

export type RuntimeItemEffect = {
  effectId: string
  kind: ItemEffectKind
  target: string
  tags: string[]
  values: Record<string, number | number[] | string | boolean>
  cooldown?: number
  duration?: number
}

export type ConsumableItem = {
  id: string
  name: string
  cost: number
  charges: number
  effectId: string
  target: string
  tags: string[]
  values: Record<string, number | number[] | string | boolean>
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

function denseStatsToLegacyStats(seed: FullItemSeed): ItemStats {
  const stats = seed.stats
  return {
    strength: stats.attributes.strength + stats.attributes.allAttributes,
    agility: stats.attributes.agility + stats.attributes.allAttributes,
    intelligence: stats.attributes.intelligence + stats.attributes.allAttributes,
    selectedAttribute: stats.attributes.selectedAttribute,
    secondaryAttributes: stats.attributes.secondaryAttributes,
    primaryAttribute: stats.attributes.primaryAttribute,
    maxHealth: stats.resources.maxHealth,
    healthRegen: stats.resources.healthRegen,
    healthRegenPct: stats.resources.healthRegenPct,
    healthRegenAmpPct: stats.resources.healthRegenAmpPct,
    maxMana: stats.resources.maxMana,
    manaRegen: stats.resources.manaRegen,
    manaRegenAmpPct: stats.resources.manaRegenAmpPct,
    damage: stats.offense.damage,
    damagePct: stats.offense.damagePct,
    armor: stats.defense.armor,
    magicResistance: stats.defense.magicResistancePct,
    statusResistance: stats.defense.statusResistancePct,
    slowResistance: stats.defense.slowResistancePct,
    evasion: stats.defense.evasionPct,
    attackSpeed: stats.offense.attackSpeed,
    attackRangeRangedOnly: stats.offense.attackRangeRangedOnly,
    movementSpeed: stats.mobility.movementSpeed,
    movementSpeedPct: stats.mobility.movementSpeedPct,
    castRange: stats.utility.castRange,
    areaOfEffect: stats.utility.areaOfEffect,
    cooldownReductionPct: stats.utility.cooldownReductionPct,
    lifestealPct: stats.offense.lifestealPct,
    spellLifestealPct: stats.offense.spellLifestealPct,
    spellAmpPct: stats.offense.spellAmpPct,
    healAmpPct: stats.utility.healAmpPct,
    debuffDurationPct: stats.utility.debuffDurationPct,
    dayVision: stats.utility.dayVision,
    nightVision: stats.utility.nightVision,
  }
}

function fullEffectToLegacyEffect(effect: FullItemEffectSeed) {
  return {
    id: effect.id,
    kind: effect.kind,
    target: effect.target,
    tags: effect.tags,
    values: effect.values,
  }
}

function fullItemSeedToLegacy(seed: FullItemSeed): ItemSeed {
  return {
    id: seed.id,
    archetype: seed.archetype,
    category: seed.category as ItemSeed['category'],
    slot: seed.slot as ItemSeed['slot'],
    shopTier: seed.shopTier as ItemSeed['shopTier'],
    cost: seed.cost,
    recipeCost: seed.recipeCost,
    components: seed.components,
    tags: seed.tags,
    stats: denseStatsToLegacyStats(seed),
    effects: seed.effects.map(fullEffectToLegacyEffect),
    notes: seed.balanceNotes.join(' '),
  }
}

export const runtimeItemSeeds: ItemSeed[] = FULL_ITEM_SEEDS_V2.map(fullItemSeedToLegacy)
const fullItemSeedById = new Map(FULL_ITEM_SEEDS_V2.map((seed) => [seed.id, seed]))

function hasStats(seed: ItemSeed) {
  return seed.stats && Object.values(seed.stats).some((value) => typeof value === 'number' && value !== 0)
}

type ItemModifierContext = {
  primaryAttribute?: PrimaryAttribute
  attackType?: AttackType
}

function addPrimaryAttributeBonus(
  flat: NonNullable<StatModifier['flat']>,
  primaryAttribute: PrimaryAttribute | undefined,
  amount = 0,
) {
  if (!amount) return
  if (primaryAttribute === 'strength') flat.strength = (flat.strength ?? 0) + amount
  else if (primaryAttribute === 'agility') flat.agility = (flat.agility ?? 0) + amount
  else if (primaryAttribute === 'intelligence') flat.intelligence = (flat.intelligence ?? 0) + amount
  else {
    const split = amount / 3
    flat.strength = (flat.strength ?? 0) + split
    flat.agility = (flat.agility ?? 0) + split
    flat.intelligence = (flat.intelligence ?? 0) + split
  }
}

function addSecondaryAttributeBonus(
  flat: NonNullable<StatModifier['flat']>,
  primaryAttribute: PrimaryAttribute | undefined,
  amount = 0,
) {
  if (!amount) return
  if (primaryAttribute === 'strength') {
    flat.agility = (flat.agility ?? 0) + amount
    flat.intelligence = (flat.intelligence ?? 0) + amount
  } else if (primaryAttribute === 'agility') {
    flat.strength = (flat.strength ?? 0) + amount
    flat.intelligence = (flat.intelligence ?? 0) + amount
  } else if (primaryAttribute === 'intelligence') {
    flat.strength = (flat.strength ?? 0) + amount
    flat.agility = (flat.agility ?? 0) + amount
  } else {
    flat.strength = (flat.strength ?? 0) + amount
    flat.agility = (flat.agility ?? 0) + amount
    flat.intelligence = (flat.intelligence ?? 0) + amount
  }
}

function toFlatStats(stats: ItemStats, context: ItemModifierContext = {}): NonNullable<StatModifier['flat']> {
  const flat: NonNullable<StatModifier['flat']> = {
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
    attackRange: context.attackType === 'ranged' ? stats.attackRangeRangedOnly : undefined,
    acquisitionRange: stats.castRange,
    movementSpeed: stats.movementSpeed,
    dayVision: stats.dayVision,
    nightVision: stats.nightVision,
  }
  addPrimaryAttributeBonus(flat, context.primaryAttribute, stats.primaryAttribute)
  addPrimaryAttributeBonus(flat, context.primaryAttribute, stats.selectedAttribute)
  addSecondaryAttributeBonus(flat, context.primaryAttribute, stats.secondaryAttributes)
  return {
    ...flat,
  }
}

function toPercentStats(stats: ItemStats) {
  return {
    maxHealth: undefined,
    healthRegen: stats.healthRegenAmpPct ?? stats.healthRegenPct,
    maxMana: undefined,
    manaRegen: stats.manaRegenAmpPct,
    damage: stats.damagePct,
    magicResistance: undefined,
    movementSpeed: stats.movementSpeedPct,
    dayVision: undefined,
    nightVision: undefined,
  }
}

export function toItemModifier(seed: ItemSeed, context: ItemModifierContext = {}): StatModifier {
  return {
    id: seed.id,
    source: 'item',
    flat: seed.stats ? toFlatStats(seed.stats, context) : undefined,
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
    strength: Math.round(stats.strength ?? 0),
    agility: Math.round(stats.agility ?? 0),
    intelligence: Math.round(stats.intelligence ?? 0),
    attackSpeed: Math.round(stats.attackSpeed ?? 0),
    moveSpeedPct: Math.round(stats.movementSpeedPct ?? 0),
    spellAmpPct: Math.round(stats.spellAmpPct ?? 0),
    lifestealPct: Math.round(stats.lifestealPct ?? 0),
    cooldownReductionPct: Math.round(stats.cooldownReductionPct ?? 0),
    moveSpeed: Math.round(stats.movementSpeed ?? 0),
  }
}

export function toShopItem(seed: ItemSeed): ShopItem {
  const effects = toRuntimeItemEffects(seed)
  return {
    id: seed.id,
    name: toDisplayName(seed.id),
    cost: seed.cost,
    modifier: toItemModifier(seed),
    effects,
    active: toActiveItem(seed, effects),
    summary: estimateItemSummary(seed.stats),
  }
}

function toRuntimeItemEffects(seed: ItemSeed): RuntimeItemEffect[] {
  const seedEffects = (seed.effects ?? []).map((effect) => ({
    effectId: effect.id,
    kind: effect.kind,
    target: effect.target,
    tags: [...new Set([...seed.tags, ...effect.tags])],
    values: effect.values ?? {},
    cooldown: readNumber(effect.values?.cooldown),
    duration: readNumber(effect.values?.duration),
  }))
  return [
    ...seedEffects,
    ...toPassiveStatEffects(seed),
  ]
}

function toPassiveStatEffects(seed: ItemSeed): RuntimeItemEffect[] {
  const stats = seed.stats
  if (!stats) return []
  const effects: RuntimeItemEffect[] = []
  const addPassive = (suffix: string, tags: string[], values: Record<string, number | number[] | string | boolean>) => {
    effects.push({
      effectId: `${seed.id}_${suffix}`,
      kind: 'passive',
      target: 'self',
      tags: [...new Set([...seed.tags, ...tags])],
      values,
    })
  }

  if (stats.lifestealPct) addPassive('lifesteal_stat', ['lifesteal'], { lifestealPct: stats.lifestealPct })
  if (stats.spellLifestealPct) addPassive('spell_lifesteal_stat', ['spell_lifesteal'], { spellLifestealPct: stats.spellLifestealPct })
  if (stats.spellAmpPct) addPassive('spell_amp_stat', ['spell_amp'], { spellAmpPct: stats.spellAmpPct })
  if (stats.healAmpPct) addPassive('heal_amp_stat', ['heal_amp'], { healAmpPct: stats.healAmpPct })
  if (stats.debuffDurationPct) addPassive('debuff_duration_stat', ['debuff_duration'], { debuffDurationPct: stats.debuffDurationPct })
  if (stats.cooldownReductionPct) addPassive('cooldown_reduction_stat', ['cooldown_reduction'], { cooldownReductionPct: stats.cooldownReductionPct })
  if (stats.castRange) addPassive('cast_range_stat', ['cast_range'], { castRange: stats.castRange })
  return effects
}

function toActiveItem(seed: ItemSeed, effects = toRuntimeItemEffects(seed)): ShopItem['active'] {
  const active = effects.find((effect) => effect.kind === 'active')
  if (!active) return undefined
  const tags = new Set(active.tags)
  const dispelPower = tags.has('strong_dispel') || tags.has('debuff_immunity')
    ? 'strong'
    : tags.has('basic_dispel') || tags.has('dispel')
      ? 'basic'
      : undefined

  return {
    effectId: active.effectId,
    target: active.target,
    tags: [...tags],
    values: active.values,
    dispelPower,
    cooldown: active.cooldown ?? 20,
    duration: active.duration,
  }
}

export function toConsumableItem(seed: ItemSeed): ConsumableItem | undefined {
  const effect = seed.effects?.find((candidate) => candidate.kind === 'consumable')
  if (!effect) return undefined
  const values = effect.values ?? {}
  const heal = readNumber(values.health) ?? readNumber(values.heal)
  const mana = readNumber(values.mana)

  return {
    id: seed.id,
    name: toDisplayName(seed.id),
    cost: seed.cost,
    charges: readNumber(values.charges) ?? 1,
    effectId: effect.id,
    target: effect.target,
    tags: [...new Set([...seed.tags, ...effect.tags])],
    values,
    heal,
    mana,
    duration: readNumber(values.duration),
    instant: !values.duration,
  }
}

function hasRuntimeShopValue(seed: ItemSeed) {
  return hasStats(seed) || (seed.effects ?? []).some((effect) => effect.kind === 'active' || effect.kind === 'passive' || effect.kind === 'aura' || effect.kind === 'toggle')
}

const inventoryShopSeeds = runtimeItemSeeds
  .filter((seed) => seed.cost > 0 && hasRuntimeShopValue(seed) && seed.slot === 'inventory' && !isComponentOnlyItem(seed.id))
  .sort((a, b) => a.cost - b.cost)

export const itemShopCatalog = [
  ...inventoryShopSeeds,
  ...inventoryShopSeeds.filter((seed) => toActiveItem(seed)?.dispelPower),
]
  .filter((seed, index, seeds) => seeds.findIndex((candidate) => candidate.id === seed.id) === index)
  .sort((a, b) => a.cost - b.cost)
  .map(toShopItem)

export const consumableCatalog = runtimeItemSeeds
  .filter((seed) => seed.cost >= 0 && seed.slot === 'consumable')
  .map(toConsumableItem)
  .filter((item): item is ConsumableItem => item !== undefined)

export function getItemSeedById(id: string) {
  return runtimeItemSeeds.find((seed) => seed.id === id)
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
  const fullSeed = fullItemSeedById.get(id)
  if (fullSeed?.restrictions.cannotBeBought || fullSeed?.restrictions.isRecipeComponentOnly) return true
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
