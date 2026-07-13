import { HERO_SKILL_RUNTIME_OFFICIAL } from '../data/heroSkillRuntimeOfficial.ts'
import type { HeroSkillDefinition } from '../game-systems/heroAttributes.ts'
import { getOfficialSkillsForHero } from '../game-systems/officialHeroSkillsAdapter.ts'
import { getRuntimeNormalizedSkill, getSkillRuntimeUnlockRule, type RuntimeSkillSet } from '../game-systems/skillUnlocks.ts'

export type SkillSupportStatus = 'complete' | 'partial' | 'approximate' | 'missing'

export type SkillSupportFamily = {
  id: string
  status: SkillSupportStatus
  evidence: string
}

export type SkillRuntimeAuditRow = {
  heroId: string
  skillId: string
  sourceAbilityId: number
  key: string
  category: string
  kind: HeroSkillDefinition['kind']
  target: HeroSkillDefinition['target']
  damageType: HeroSkillDefinition['damageType']
  runtimeSet: RuntimeSkillSet
  status: SkillSupportStatus
  families: SkillSupportFamily[]
  tags: string[]
  valueKeys: string[]
  unhandledValueKeys: string[]
  fingerprint: string
}

export type SkillRuntimeAudit = {
  schemaVersion: 1
  sourceHeroCount: number
  skillCount: number
  statusCounts: Record<SkillSupportStatus, number>
  familyCounts: Record<string, Record<SkillSupportStatus, number>>
  rows: SkillRuntimeAuditRow[]
}

type CatalogSkill = {
  heroId: string
  runtimeSet: SkillRuntimeAuditRow['runtimeSet']
  skill: HeroSkillDefinition
}

const statusPriority: Record<SkillSupportStatus, number> = {
  complete: 0,
  approximate: 1,
  partial: 2,
  missing: 3,
}

const runtimeValueKeys = new Set([
  'attackSpeed',
  'barrier',
  'breakDuration',
  'channelTime',
  'cooldown',
  'critChance',
  'critMultiplier',
  'damage',
  'disarmDuration',
  'duration',
  'fearDuration',
  'global',
  'heal',
  'healthCost',
  'hexDuration',
  'leashDuration',
  'lifestealPct',
  'manaCost',
  'manaValue',
  'moveSpeedBonusPct',
  'muteDuration',
  'radius',
  'range',
  'root',
  'silence',
  'sleepDuration',
  'slow',
  'slowPct',
  'stun',
  'summonDuration',
  'summons',
  'tauntDuration',
])

const metadataValuePattern = /(?:^|_)(?:animation|cast_point|projectile_speed|speed|width|height|vision|tooltip|model|turn_rate|delay|interval|radius|range|duration)(?:_|$)/

export function buildSkillRuntimeAudit(): SkillRuntimeAudit {
  const catalog = getOfficialSkillCatalog()
  const rows = catalog.map(classifySkill)
  const statusCounts = createStatusCounts()
  const familyCounts: SkillRuntimeAudit['familyCounts'] = {}

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
    sourceHeroCount: HERO_SKILL_RUNTIME_OFFICIAL.length,
    skillCount: rows.length,
    statusCounts,
    familyCounts: Object.fromEntries(Object.entries(familyCounts).sort(([a], [b]) => a.localeCompare(b))),
    rows,
  }
}

export function getOfficialSkillCatalog(): CatalogSkill[] {
  return HERO_SKILL_RUNTIME_OFFICIAL.flatMap((kit) => {
    const adapted = getOfficialSkillsForHero(kit.heroId)
    if (!adapted) throw new Error(`Official skill kit was not adapted: ${kit.heroId}`)
    return [
      ...adapted.skills.map((skill) => ({ heroId: kit.heroId, runtimeSet: 'primary' as const, skill })),
      ...adapted.supplementalSkills.map((skill) => ({ heroId: kit.heroId, runtimeSet: 'supplemental' as const, skill })),
    ]
  })
}

function classifySkill(entry: CatalogSkill): SkillRuntimeAuditRow {
  const { heroId, runtimeSet } = entry
  const skill = getRuntimeNormalizedSkill(entry.skill)
  const families: SkillSupportFamily[] = []
  const tags = [...new Set([skill.sourceTag, ...(skill.mechanics ?? []), ...skill.tags].filter((tag): tag is string => Boolean(tag)))].sort()
  const valueKeys = Object.keys(skill.values).sort()
  const tokens = new Set([...tags, ...valueKeys].map((token) => token.toLowerCase()))
  const add = (id: string, status: SkillSupportStatus, evidence: string) => families.push({ id, status, evidence })
  const unlockRule = getSkillRuntimeUnlockRule(skill, runtimeSet)

  add(
    'activation',
    getActivationStatus(unlockRule),
    getUnlockEvidence(unlockRule),
  )

  if (skill.kind === 'passive') {
    add('cost_cooldown', 'complete', 'passive skills do not cast')
  } else {
    const cooldown = maxNumericValue(skill.values.cooldown)
    const manaCost = maxNumericValue(skill.values.manaCost)
    const healthCost = maxNumericValue(skill.values.healthCost)
    const status = cooldown > 0 ? 'complete' : 'approximate'
    add('cost_cooldown', status, cooldown > 0
      ? `official cooldown preserved; max mana/health cost ${manaCost}/${healthCost}`
      : 'runtime applies its minimum cooldown to an official zero-cooldown action')
  }

  add(
    'targeting',
    skill.target === 'unit' || skill.target === 'self' || skill.target === 'passive' ? 'complete' : 'approximate',
    skill.target === 'unit' || skill.target === 'self' || skill.target === 'passive'
      ? `runtime supports ${skill.target} targeting directly`
      : `${skill.target} targeting is reduced to generic target selection`,
  )

  const explicitDamage = maxNumericValue(skill.values.damage)
  if (explicitDamage > 0 || skill.damageType !== 'none') {
    add(
      'damage',
      explicitDamage > 0 && skill.damageType !== 'none' ? 'complete' : 'partial',
      explicitDamage > 0 ? `official damage values preserved (${skill.damageType})` : 'damage type exists without a normalized direct-damage value',
    )
  }

  addCanonicalControl(families, tokens, skill, 'stun', 'stun')
  addCanonicalControl(families, tokens, skill, 'slow', 'slow')
  addCanonicalControl(families, tokens, skill, 'silence', 'silence')
  addCanonicalControl(families, tokens, skill, 'root', 'root')
  addCanonicalControl(families, tokens, skill, 'fear', 'fearDuration')
  addCanonicalControl(families, tokens, skill, 'taunt', 'tauntDuration')
  addCanonicalControl(families, tokens, skill, 'sleep', 'sleepDuration')
  addCanonicalControl(families, tokens, skill, 'hex', 'hexDuration')
  addCanonicalControl(families, tokens, skill, 'disarm', 'disarmDuration')
  addCanonicalControl(families, tokens, skill, 'break', 'breakDuration')
  addCanonicalControl(families, tokens, skill, 'mute', 'muteDuration')

  if (hasToken(tokens, ['leash', 'leashDuration', 'ensnare'])) {
    add('leash', 'approximate', 'runtime currently models leash and ensnare as a root')
  }
  if (hasToken(tokens, ['purge', 'dispel', 'cleanse', 'basic_dispel', 'strong_dispel'])) {
    add('dispel', 'complete', 'basic and strong timed-effect dispels are implemented')
  }
  if (hasPattern(tokens, /(?:immunity|immune|invuln|untargetable|spell_parry)/)) {
    add('immunity', 'approximate', 'immunity-like effects use barrier or incoming-damage modifiers rather than rule-level immunity')
  }
  if (hasToken(tokens, ['barrier', 'shield', 'spell_parry']) || 'barrier' in skill.values) {
    add('barrier', maxNumericValue(skill.values.barrier) > 0 ? 'complete' : 'approximate', 'timed barrier absorption is implemented')
  }
  if (hasToken(tokens, ['damage_over_time', 'dot', 'poison', 'burn', 'aura_dot']) || hasPattern(tokens, /damage_(?:per_second|per_tick|interval)/)) {
    add('damage_over_time', 'partial', 'periodic damage ticks run, while source-specific stacking and intervals remain generic')
  }
  if (hasToken(tokens, ['heal_over_time', 'hot', 'regen', 'regeneration']) || hasPattern(tokens, /heal_(?:per_second|interval)/)) {
    add('healing_over_time', 'partial', 'periodic healing ticks run with a normalized three-second profile')
  }
  if (hasToken(tokens, ['heal', 'healer', 'global_heal', 'heal_damage', 'heal_nuke']) || 'heal' in skill.values) {
    add('healing', maxNumericValue(skill.values.heal) > 0 ? 'complete' : 'approximate', 'ally selection and direct healing are implemented')
  }
  if (hasToken(tokens, ['mana_burn', 'mana_drain']) || 'manaValue' in skill.values) {
    add('mana', 'complete', 'mana burn, drain, restore, and burn damage are implemented')
  }
  if (hasToken(tokens, ['aura']) || hasPattern(tokens, /(?:^|_)aura(?:_|$)/)) {
    add('aura', 'approximate', 'a live proximity aura exists, but source-specific aura values are normalized')
  }
  if (hasToken(tokens, ['mobility', 'blink', 'dash', 'leap', 'jump', 'roll', 'teleport', 'relocate'])) {
    add('mobility', 'approximate', 'movement is applied instantly using normalized map distance')
  }
  if (hasToken(tokens, ['hook', 'hookshot', 'pull', 'drag', 'knockback', 'push']) || hasPattern(tokens, /(?:knockback|pull|push)_distance/)) {
    add('displacement', 'approximate', 'generic pull and push displacement is implemented without source geometry')
  }
  if (hasToken(tokens, ['channel', 'aoe_channel', 'channel_disable']) || maxNumericValue(skill.values.channelTime) > 0) {
    add('channeling', 'partial', 'channel state and interruption exist, but most effects resolve at cast start')
  }
  if (hasPattern(tokens, /(?:^|_)(?:transform|transformation|metamorph|morph_rate|dragon_form)(?:_|$)/)) {
    add('transformation', 'approximate', 'self transformations become timed combat-stat buffs')
  }
  if (hasToken(tokens, ['summon']) || 'summons' in skill.values || hasPattern(tokens, /(?:^|_)(?:illusion|clone|treant|golem|spiderling|zombie|ward_count|spirit_count)(?:_|$)/)) {
    add('summon', 'approximate', 'summons become timed pressure modifiers; independent units are not spawned')
  }
  if (skill.kind === 'passive') {
    add('passive', 'partial', 'common passive combat modifiers work; source-specific triggers and stacks require dedicated handlers')
  }

  const coreFamilyIds = new Set([
    'damage', 'stun', 'slow', 'silence', 'root', 'fear', 'taunt', 'sleep', 'hex', 'disarm', 'break', 'mute',
    'leash', 'dispel', 'immunity', 'barrier', 'damage_over_time', 'healing_over_time', 'healing', 'mana', 'aura',
    'mobility', 'displacement', 'channeling', 'transformation', 'summon', 'passive',
  ])
  if (!families.some((family) => coreFamilyIds.has(family.id))) {
    add('special', 'missing', 'no declared runtime effect beyond generic targeting/cost metadata')
  }

  const unhandledValueKeys = valueKeys.filter((key) => !runtimeValueKeys.has(key) && !metadataValuePattern.test(key))
  if (unhandledValueKeys.length > 0) {
    add('special_values', 'partial', `${unhandledValueKeys.length} source-specific values are preserved but not consumed directly`)
  }

  const status = getWorstStatus(families)
  const sourceAbilityId = skill.sourceAbilityId ?? 0
  const fingerprint = [
    heroId,
    skill.id,
    sourceAbilityId,
    runtimeSet,
    skill.kind,
    skill.target,
    skill.damageType,
    ...families.map((family) => `${family.id}:${family.status}`).sort(),
  ].join('|')

  return {
    heroId,
    skillId: skill.id,
    sourceAbilityId,
    key: skill.key,
    category: skill.category ?? 'other',
    kind: skill.kind,
    target: skill.target,
    damageType: skill.damageType,
    runtimeSet,
    status,
    families: families.sort((a, b) => a.id.localeCompare(b.id)),
    tags,
    valueKeys,
    unhandledValueKeys,
    fingerprint,
  }
}

function addCanonicalControl(
  families: SkillSupportFamily[],
  tokens: Set<string>,
  skill: HeroSkillDefinition,
  family: string,
  valueKey: string,
) {
  if (!tokens.has(family.toLowerCase()) && !(valueKey in skill.values)) return
  const hasDuration = valueKey === 'slow'
    ? maxNumericValue(skill.values.slowPct) > 0 || maxNumericValue(skill.values.slow) > 0
    : maxNumericValue(skill.values[valueKey]) > 0
  families.push({
    id: family,
    status: hasDuration ? 'complete' : 'approximate',
    evidence: hasDuration ? 'canonical runtime status with official value' : 'canonical runtime status with normalized duration/value',
  })
}

function hasToken(tokens: Set<string>, candidates: string[]) {
  return candidates.some((candidate) => tokens.has(candidate.toLowerCase()))
}

function hasPattern(tokens: Set<string>, pattern: RegExp) {
  return [...tokens].some((token) => pattern.test(token))
}

function maxNumericValue(value: HeroSkillDefinition['values'][string]) {
  if (Array.isArray(value)) {
    const numbers = value.filter((entry): entry is number => typeof entry === 'number' && Number.isFinite(entry))
    return numbers.length > 0 ? Math.max(...numbers.map(Math.abs)) : 0
  }
  return typeof value === 'number' && Number.isFinite(value) ? Math.abs(value) : 0
}

function getWorstStatus(families: SkillSupportFamily[]) {
  return families.reduce<SkillSupportStatus>((worst, family) => (
    statusPriority[family.status] > statusPriority[worst] ? family.status : worst
  ), 'complete')
}

function createStatusCounts(): Record<SkillSupportStatus, number> {
  return { complete: 0, partial: 0, approximate: 0, missing: 0 }
}

function getUnlockEvidence(rule: ReturnType<typeof getSkillRuntimeUnlockRule>) {
  if (rule === 'primary') return 'available to the runtime skill selector'
  if (rule === 'scepter_item') return 'unlocked by an inventory item with upgradeSlot=scepter'
  if (rule === 'shard_item') return 'unlocked by an inventory item with upgradeSlot=shard'
  if (rule === 'invoked_loadout') return 'up to two invoked spells are selected from learned orb recipes and the current AI situation'
  if (rule === 'song_loadout') return 'one song is selected from ultimate level, health, and the current AI situation'
  if (rule === 'situational_utility') return 'utility action becomes available in its matching AI situation'
  if (rule === 'souvenir_resource') return 'souvenir requires a dedicated acquisition and charge resource'
  if (rule === 'alternate_stance') return 'persistent Katana/Sai state replaces Q/W/E/R, mirrors levels, and shares paired cooldowns'
  if (rule === 'parent_state') return 'subskill is unlocked and consumed by its serialized parent ability state'
  return 'imported contextual/subskill action without a dedicated activation state machine'
}

function getActivationStatus(rule: ReturnType<typeof getSkillRuntimeUnlockRule>): SkillSupportStatus {
  if (rule === 'invoked_loadout' || rule === 'song_loadout' || rule === 'situational_utility') return 'approximate'
  if (rule === 'alternate_stance') return 'complete'
  if (rule === 'souvenir_resource' || rule === 'unsupported_contextual') return 'missing'
  return 'complete'
}
