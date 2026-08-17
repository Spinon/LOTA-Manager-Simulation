import { FULL_ITEM_SEEDS_V2, type FullItemEffectSeed, type FullItemSeed } from '../data/itemSeedsV2.ts'
import { consumableCatalog, itemShopCatalog } from '../game-systems/itemSeedsAdapter.ts'

export type ItemSupportStatus = 'complete' | 'partial' | 'approximate' | 'missing'

export type ItemSupportFamily = {
  id: string
  status: ItemSupportStatus
  evidence: string
}

export type ItemRuntimeAuditRow = {
  itemId: string
  archetype: string
  category: string
  slot: string
  shopTier: string
  cost: number
  buyable: boolean
  status: ItemSupportStatus
  families: ItemSupportFamily[]
  effectKinds: string[]
  tags: string[]
  statKeys: string[]
  valueKeys: string[]
  unhandledStatKeys: string[]
  unhandledEffectValueKeys: string[]
  fingerprint: string
}

export type ItemRuntimeAudit = {
  schemaVersion: 1
  sourceItemCount: number
  effectCount: number
  buyableCount: number
  statusCounts: Record<ItemSupportStatus, number>
  familyCounts: Record<string, Record<ItemSupportStatus, number>>
  rows: ItemRuntimeAuditRow[]
}

const statusPriority: Record<ItemSupportStatus, number> = {
  complete: 0,
  approximate: 1,
  partial: 2,
  missing: 3,
}

const completeStatKeys = new Set([
  'attributes.agility',
  'attributes.allAttributes',
  'attributes.intelligence',
  'attributes.primaryAttribute',
  'attributes.secondaryAttributes',
  'attributes.selectedAttribute',
  'attributes.strength',
  'defense.armor',
  'defense.magicResistancePct',
  'defense.slowResistancePct',
  'defense.statusResistancePct',
  'mobility.movementSpeed',
  'mobility.movementSpeedPct',
  'offense.attackRangeRangedOnly',
  'offense.attackSpeed',
  'offense.damage',
  'offense.damagePct',
  'resources.maxHealth',
  'resources.maxMana',
  'utility.abilityUpgradeScepter',
  'utility.abilityUpgradeShard',
])

const approximateStatKeys = new Set([
  'utility.castRange',
])

const runtimeEffectValueKeys = new Set([
  'allyArmor',
  'allyAttackSpeed',
  'armorReduction',
  'barrier',
  'baseDamage',
  'block',
  'bonusDamage',
  'bonusGold',
  'bonusXpPct',
  'chanceMeleePct',
  'chancePct',
  'chanceRangedPct',
  'charges',
  'cleavePct',
  'cooldown',
  'critMultiplier',
  'currentHealthDamagePct',
  'damage',
  'damageByLevel',
  'damageFromBurnPct',
  'damageFromIntPct',
  'damageFromPrimaryAttributePct',
  'damagePct',
  'distance',
  'dps',
  'duration',
  'enemyArmorReduction',
  'heal',
  'health',
  'healthPerCharge',
  'lifestealPct',
  'magicBarrier',
  'mana',
  'manaPerCharge',
  'manaCost',
  'manaBurn',
  'maxHealthDpsPct',
  'maxCharges',
  'healPerCharge',
  'moveSlowPct',
  'moveSpeedPct',
  'procDamage',
  'radius',
  'range',
  'root',
  'slowDuration',
  'slowPct',
  'stun',
  'threshold',
  'upgradeSlot',
  'healthCost',
])

const metadataEffectValueKeys = new Set([
  'agility',
  'armor',
  'attackRangeRangedOnly',
  'attackSpeed',
  'canAttachTo',
  'castRange',
  'cooldownReductionPct',
  'damagePct',
  'evasionPct',
  'healAmpPct',
  'healthRegen',
  'healthRegenAmpPct',
  'healthRegenPct',
  'intelligence',
  'magicResistancePct',
  'manaRegen',
  'manaRegenAmpPct',
  'maxHealth',
  'maxLevel',
  'maxMana',
  'movementSpeed',
  'movementSpeedPct',
  'nightVision',
  'primaryAttribute',
  'secondaryAttributes',
  'selectedAttribute',
  'spellAmpPct',
  'spellLifestealPct',
  'statusResistancePct',
  'strength',
  'tier',
])

const activeRuntimeTags = new Set([
  'armor_reduction',
  'attack_slow',
  'attack_speed',
  'barrier',
  'basic_dispel',
  'blink',
  'creep_only',
  'cyclone',
  'damage',
  'debuff_immunity',
  'disable',
  'disarm',
  'dispel',
  'displacement',
  'ethereal',
  'gold',
  'haste',
  'heal',
  'heal_or_damage',
  'heal_over_time',
  'heal_reduction',
  'healing',
  'hex',
  'link_barrier',
  'magic_barrier',
  'magic_damage',
  'magical_damage',
  'mobility',
  'movement',
  'nuke',
  'physical_barrier',
  'physical_immunity',
  'restore_health',
  'restore_mana',
  'root',
  'silence',
  'slow',
  'slow_immunity',
  'strong_dispel',
  'stun',
  'team_barrier',
  'xp',
])

const activeApproximationTags = new Set([
  'cyclone',
  'damage_immunity',
  'debuff_immunity',
  'ethereal',
  'heal_reduction',
  'physical_immunity',
  'slow_immunity',
])

const passiveRuntimeTags = new Set([
  'armor_reduction',
  'attack_modifier',
  'attack_proc',
  'bash',
  'chain_lightning',
  'cleave',
  'critical',
  'critical_scaling',
  'dot',
  'extra_projectiles',
  'lifesteal',
  'lifesteal_amp',
  'magic_damage',
  'magic_barrier',
  'magic_resistance_reduction',
  'magical',
  'mana_burn',
  'max_health_dot',
  'multi_target_attack',
  'single_target_spell_proc',
  'slow',
  'spell_damage_reduction',
  'stat_bonus',
])

const auraRuntimeTags = new Set([
  'armor_aura',
  'attack_speed_aura',
  'blind',
  'damage',
  'lifesteal',
  'magical_damage',
  'mana_regen',
])

const explicitlyUnhandledMechanicTags = new Set([
  'attribute_toggle',
  'break_attack',
  'channel',
  'control_neutral',
  'cooldown_reduction',
  'cooldown_reset',
  'counter_attack',
  'damage_amp',
  'damage_return',
  'free_movement',
  'heal_steal',
  'illusion',
  'invisibility',
  'magic_damage_amp',
  'magic_resistance',
  'magic_vulnerability',
  'mana_cost',
  'movement_steal',
  'permanent_buff',
  'phased',
  'self_drain',
  'self_silence',
  'spell_amp',
  'spell_lifesteal',
  'spell_reflect',
  'teleport',
  'trap',
  'true_strike',
])

const shopItemIds = new Set(itemShopCatalog.map((item) => item.id))
const consumableIds = new Set(consumableCatalog.map((item) => item.id))

export function buildItemRuntimeAudit(): ItemRuntimeAudit {
  const rows = FULL_ITEM_SEEDS_V2.map(classifyItem)
  const statusCounts = createStatusCounts()
  const familyCounts: ItemRuntimeAudit['familyCounts'] = {}

  rows.forEach((row) => {
    statusCounts[row.status] += 1
    row.families.forEach((family) => {
      const counts = familyCounts[family.id] ?? createStatusCounts()
      counts[family.status] += 1
      familyCounts[family.id] = counts
    })
  })

  return {
    schemaVersion: 1,
    sourceItemCount: rows.length,
    effectCount: FULL_ITEM_SEEDS_V2.reduce((total, item) => total + item.effects.length, 0),
    buyableCount: rows.filter((row) => row.buyable).length,
    statusCounts,
    familyCounts: Object.fromEntries(Object.entries(familyCounts).sort(([left], [right]) => left.localeCompare(right))),
    rows,
  }
}

function classifyItem(item: FullItemSeed): ItemRuntimeAuditRow {
  const families: ItemSupportFamily[] = []
  const add = (id: string, status: ItemSupportStatus, evidence: string) => mergeFamily(families, { id, status, evidence })
  const buyable = !item.restrictions.cannotBeBought && !item.restrictions.isRecipeComponentOnly && item.cost > 0
  const inRuntimeCatalog = shopItemIds.has(item.id) || consumableIds.has(item.id)
  const statKeys = getNonZeroStatKeys(item)
  const unhandledStatKeys = statKeys.filter((key) => !completeStatKeys.has(key) && !approximateStatKeys.has(key))
  const valueKeys = [...new Set(item.effects.flatMap((effect) => Object.keys(effect.values)))].sort()
  const unhandledEffectValueKeys = valueKeys.filter((key) => !runtimeEffectValueKeys.has(key) && !metadataEffectValueKeys.has(key))

  if (!buyable) {
    add('catalog', 'complete', 'non-buyable component or neutral entry remains excluded from the base shop')
  } else {
    add(
      'catalog',
      inRuntimeCatalog ? 'complete' : 'missing',
      inRuntimeCatalog ? 'item is exposed through the runtime shop or consumable catalog' : 'buyable source item is absent from runtime catalogs',
    )
  }

  if (item.slot === 'neutral' || item.slot === 'neutral_enchantment') {
    add('acquisition', 'missing', 'neutral drops, selection, enchantment attachment, and neutral slots are not simulated')
  } else if (item.restrictions.isRecipeComponentOnly) {
    add('acquisition', 'complete', 'component-only item is intentionally excluded from direct AI purchase')
  } else {
    add('acquisition', inRuntimeCatalog ? 'complete' : 'missing', inRuntimeCatalog ? 'AI can acquire this item at base' : 'no acquisition route exists')
  }

  if (statKeys.length === 0) {
    add('stats', 'complete', 'item declares no non-zero static attributes')
  } else if (unhandledStatKeys.length > 0) {
    add('stats', 'partial', `${statKeys.length - unhandledStatKeys.length}/${statKeys.length} non-zero stat fields have a runtime path`)
  } else if (statKeys.some((key) => approximateStatKeys.has(key))) {
    add('stats', 'approximate', 'cast range currently shares the acquisition-range abstraction')
  } else {
    add('stats', 'complete', 'all non-zero static attributes reach calculated combat stats or upgrade unlocks')
  }

  add(
    'recipes',
    item.components.length > 0 ? 'approximate' : 'complete',
    item.components.length > 0 ? 'AI buys the final item directly without consuming component inventory' : 'item has no component recipe',
  )

  const hasStackContract = item.stacking.uniqueByItemId || item.stacking.stackGroup.length > 0
  add(
    'stacking',
    hasStackContract ? 'partial' : 'complete',
    hasStackContract ? 'duplicate item names are blocked, but stack groups and stack modes are not enforced generically' : 'item declares no stacking restriction',
  )

  const hasAttackTypeRestriction = item.restrictions.requiresMeleeHero || item.restrictions.requiresRangedHero
  add(
    'restrictions',
    hasAttackTypeRestriction ? 'missing' : 'partial',
    hasAttackTypeRestriction
      ? 'melee/ranged source restrictions are not read; current purchase filtering relies on item id heuristics'
      : 'shop exclusion is implemented, while share/drop/sell/illusion rules remain source-specific',
  )

  add(
    'purchase_ai',
    buyable && inRuntimeCatalog ? 'partial' : buyable ? 'missing' : 'complete',
    buyable && inRuntimeCatalog
      ? 'build examples, role heuristics, timing, resale, and full-inventory upgrades work; dense item AI weights and synergies are not consumed'
      : buyable ? 'AI cannot purchase the item' : 'non-buyable item correctly bypasses purchase decisions',
  )

  item.effects.forEach((effect) => classifyEffect(item, effect).forEach((family) => mergeFamily(families, family)))

  if (item.effects.length === 0) add('effects', 'complete', 'item declares no runtime effect')
  if (unhandledEffectValueKeys.length > 0) {
    add('special_values', 'partial', `${unhandledEffectValueKeys.length} effect values are preserved but not consumed by a generic handler`)
  }

  const status = getWorstStatus(families)
  const effectKinds = [...new Set(item.effects.map((effect) => effect.kind))].sort()
  const tags = [...new Set([...item.tags, ...item.effects.flatMap((effect) => effect.tags)])].sort()
  const fingerprint = [
    item.id,
    item.category,
    item.slot,
    item.shopTier,
    item.cost,
    ...effectKinds,
    ...statKeys,
    ...valueKeys,
    ...families.map((family) => `${family.id}:${family.status}`).sort(),
  ].join('|')

  return {
    itemId: item.id,
    archetype: item.archetype,
    category: item.category,
    slot: item.slot,
    shopTier: item.shopTier,
    cost: item.cost,
    buyable,
    status,
    families: families.sort((left, right) => left.id.localeCompare(right.id)),
    effectKinds,
    tags,
    statKeys,
    valueKeys,
    unhandledStatKeys,
    unhandledEffectValueKeys,
    fingerprint,
  }
}

function classifyEffect(item: FullItemSeed, effect: FullItemEffectSeed): ItemSupportFamily[] {
  const families: ItemSupportFamily[] = []
  const effectTags = new Set(effect.tags)
  const hasTag = (set: Set<string>) => [...effectTags].some((tag) => set.has(tag))

  if (effect.kind === 'passive') {
    const supported = hasTag(passiveRuntimeTags)
    families.push({
      id: 'passive',
      status: supported ? 'complete' : 'missing',
      evidence: supported ? `${effect.id} reaches static or on-attack passive handlers` : `${effect.id} has no generic passive handler`,
    })
  } else if (effect.kind === 'active') {
    const supported = hasTag(activeRuntimeTags)
    const approximated = hasTag(activeApproximationTags)
    const hasUnhandledMechanic = hasTag(explicitlyUnhandledMechanicTags)
    families.push({
      id: 'active',
      status: !supported ? 'missing' : hasUnhandledMechanic ? 'partial' : approximated ? 'approximate' : 'complete',
      evidence: !supported
        ? `${effect.id} cannot be selected or resolved by the generic active-item runtime`
        : hasUnhandledMechanic
          ? `${effect.id} applies a supported core action but omits at least one declared mechanic`
          : approximated
            ? `${effect.id} maps a specialized state to the generic timed-effect model`
            : `${effect.id} has AI selection and a matching generic runtime action`,
    })

    const cooldown = readNumber(effect.values.cooldown)
    families.push({
      id: 'cooldown',
      status: cooldown !== undefined ? 'complete' : 'approximate',
      evidence: cooldown !== undefined ? `${effect.id} uses its declared ${cooldown}s cooldown` : `${effect.id} falls back to a 20s cooldown`,
    })

    const manaCost = readNumber(effect.values.manaCost) ?? 0
    const healthCost = readNumber(effect.values.healthCost) ?? 0
    families.push({
      id: 'resource_cost',
      status: 'complete',
      evidence: manaCost > 0 || healthCost > 0
        ? `${effect.id} checks and spends its declared mana/health cost ${manaCost}/${healthCost} after a successful activation`
        : `${effect.id} declares no activation resource cost`,
    })
  } else if (effect.kind === 'consumable') {
    const restoresHealth = readNumber(effect.values.health) !== undefined || readNumber(effect.values.heal) !== undefined
    const restoresMana = readNumber(effect.values.mana) !== undefined
    const supported = restoresHealth || restoresMana
    const breakOnDamage = effectTags.has('break_on_damage')
    families.push({
      id: 'consumable',
      status: !supported ? 'missing' : breakOnDamage || effect.target !== 'self' ? 'partial' : 'complete',
      evidence: !supported
        ? `${effect.id} is not a health/mana consumable and has no use routine`
        : breakOnDamage || effect.target !== 'self'
          ? `${effect.id} restores resources, but interruption and allied targeting are not fully modeled`
          : `${effect.id} is consumed from the normal inventory and restores declared resources`,
    })
  } else if (effect.kind === 'aura') {
    const supported = hasTag(auraRuntimeTags)
    families.push({
      id: 'aura',
      status: supported ? 'partial' : 'missing',
      evidence: supported ? `${effect.id} updates nearby units through normalized aura modifiers` : `${effect.id} has no matching proximity handler`,
    })
  } else if (effect.kind === 'toggle') {
    const passiveWhileOwned = hasTag(passiveRuntimeTags)
    families.push({
      id: 'toggle',
      status: passiveWhileOwned ? 'approximate' : 'missing',
      evidence: passiveWhileOwned
        ? `${effect.id} is treated as always enabled; no persistent toggle choice exists`
        : `${effect.id} has no toggle state or matching passive behavior`,
    })
  } else {
    families.push({
      id: 'enchantment',
      status: 'missing',
      evidence: `${effect.id} is preserved in source data, but neutral enchantment attachment is not implemented`,
    })
  }

  const charges = readNumber(effect.values.charges) ?? readNumber(effect.values.maxCharges)
  if (charges !== undefined || effectTags.has('charges')) {
    const hasFixedInitialCharges = readNumber(effect.values.charges) !== undefined
    const hasPersistentChargeRuntime = effect.kind === 'consumable' || effect.kind === 'active' || effect.kind === 'passive'
    families.push({
      id: 'charges',
      status: hasPersistentChargeRuntime ? 'complete' : 'missing',
      evidence: effect.kind === 'passive'
        ? `${effect.id} initializes, serializes, displays, and automatically spends persistent barrier charges on qualifying damage`
        : hasFixedInitialCharges
          ? `${effect.id} initializes, serializes, displays, checks, and spends persistent inventory charges per successful use`
          : `${effect.id} gains charges from nearby combat events, serializes them, displays them, and spends them per successful use`,
    })
  }

  if (effect.kind === 'active' || effect.kind === 'consumable') {
    const directTargets = new Set(['self', 'unit', 'enemy', 'area'])
    families.push({
      id: 'targeting',
      status: directTargets.has(effect.target) ? 'approximate' : 'missing',
      evidence: directTargets.has(effect.target)
        ? `${effect.target} targeting uses generic self/ally/enemy/area selection`
        : `${effect.target} targeting has no dedicated item resolver`,
    })
  }

  const usesRules = Object.values(effect.rules).some(Boolean)
  if (usesRules) {
    families.push({
      id: 'effect_rules',
      status: 'partial',
      evidence: `${effect.id} preserves targeting/dispel/immunity rules, but generic handlers consume only a subset`,
    })
  }

  if (item.restrictions.consumedOnUse && effect.kind !== 'consumable' && effectTags.has('permanent_buff')) {
    families.push({
      id: 'consumption',
      status: 'missing',
      evidence: `${effect.id} declares permanent consumption, but the active item is not removed after use`,
    })
  }

  return families
}

function getNonZeroStatKeys(item: FullItemSeed) {
  const keys: string[] = []
  Object.entries(item.stats).forEach(([group, values]) => {
    Object.entries(values).forEach(([key, value]) => {
      if (typeof value === 'number' && value !== 0) keys.push(`${group}.${key}`)
    })
  })
  return keys.sort()
}

function mergeFamily(families: ItemSupportFamily[], candidate: ItemSupportFamily) {
  const existing = families.find((family) => family.id === candidate.id)
  if (!existing) {
    families.push(candidate)
    return
  }
  if (statusPriority[candidate.status] > statusPriority[existing.status]) existing.status = candidate.status
  if (!existing.evidence.includes(candidate.evidence)) existing.evidence = `${existing.evidence}; ${candidate.evidence}`
}

function getWorstStatus(families: ItemSupportFamily[]) {
  return families.reduce<ItemSupportStatus>((worst, family) => (
    statusPriority[family.status] > statusPriority[worst] ? family.status : worst
  ), 'complete')
}

function createStatusCounts(): Record<ItemSupportStatus, number> {
  return { complete: 0, partial: 0, approximate: 0, missing: 0 }
}

function readNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}
