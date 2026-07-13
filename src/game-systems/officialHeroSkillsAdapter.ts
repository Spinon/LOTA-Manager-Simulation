import { HERO_SKILL_RUNTIME_OFFICIAL } from '../data/heroSkillRuntimeOfficial.ts'
import type { DamageType, HeroSkillDefinition, SkillFlags, SkillKind, SkillTarget } from './heroAttributes.ts'

type RuntimeSpecialValue = {
  name: string
  baseValues: readonly number[]
  isPercentage: boolean
  shardValues: readonly number[]
  scepterValues: readonly number[]
}

type RuntimeSkill = {
  id: string
  sourceAbilityId: number
  category: HeroSkillDefinition['category']
  genericSlot: string
  order: number
  maxLevel: number
  behaviorFlags: readonly string[]
  targetTeamRaw: number
  targetTypeRaw: number
  damageTypeRaw: number
  immunityRaw: number
  dispellableRaw: number
  castRanges: readonly number[]
  castPoints: readonly number[]
  channelTimes: readonly number[]
  cooldowns: readonly number[]
  durations: readonly number[]
  damages: readonly number[]
  manaCosts: readonly number[]
  healthCosts: readonly number[]
  specialValues: readonly RuntimeSpecialValue[]
  upgrades: {
    hasScepterUpgrade: boolean
    hasShardUpgrade: boolean
    grantedByScepter: boolean
    grantedByShard: boolean
  }
  sourceInternalName: string
}

type RuntimeKit = {
  heroId: string
  sourceHeroId: number
  standardAbilities: readonly RuntimeSkill[]
  innateAbilities: readonly RuntimeSkill[]
  scepterGrantedAbilities: readonly RuntimeSkill[]
  shardGrantedAbilities: readonly RuntimeSkill[]
}

const runtimeKits = HERO_SKILL_RUNTIME_OFFICIAL as unknown as readonly RuntimeKit[]
const runtimeKitByHeroId = new Map(runtimeKits.map((kit) => [kit.heroId, kit]))
const deprecatedHeroAliases: Record<string, string> = {
  h094_dark_paladin_2: 'h049_dark_paladin',
}

const defaultAiUsage = {
  laning: 20,
  farming: 10,
  gank: 25,
  teamfight: 35,
  retreat: 10,
  push: 10,
  save: 10,
  objective: 15,
}

export function getOfficialSkillsForHero(heroId: string) {
  const resolvedHeroId = deprecatedHeroAliases[heroId] ?? heroId
  const kit = runtimeKitByHeroId.get(resolvedHeroId)
  if (!kit) return undefined

  const learnableStandards = kit.standardAbilities.filter(isLearnableStandard)
  const ultimate = [...learnableStandards].reverse().find((skill) => skill.maxLevel === 3)
  let regularIndex = 0
  let supplementalIndex = 0

  const standardSkills = kit.standardAbilities.map((skill) => {
    const learnable = isLearnableStandard(skill)
    let key: string
    if (skill === ultimate) key = 'R'
    else if (learnable) key = ['Q', 'W', 'E'][regularIndex++] ?? `D${regularIndex - 3}`
    else key = `S${++supplementalIndex}`
    return toHeroSkillDefinition(kit, skill, key, learnable)
  })

  const innateSkills = kit.innateAbilities.map((skill, index) => toHeroSkillDefinition(kit, skill, `I${index + 1}`, false))
  const supplementalSkills = [
    ...standardSkills.filter((skill) => !skill.learnable),
    ...kit.scepterGrantedAbilities.map((skill, index) => toHeroSkillDefinition(kit, skill, `A${index + 1}`, false)),
    ...kit.shardGrantedAbilities.map((skill, index) => toHeroSkillDefinition(kit, skill, `H${index + 1}`, false)),
  ]

  return {
    skills: [...standardSkills.filter((skill) => skill.learnable), ...innateSkills],
    supplementalSkills,
    sourceHeroId: kit.sourceHeroId,
  }
}

function isLearnableStandard(skill: RuntimeSkill) {
  return skill.maxLevel > 0 && !skill.behaviorFlags.includes('HIDDEN') && !skill.behaviorFlags.includes('NOT_LEARNABLE')
}

function toHeroSkillDefinition(kit: RuntimeKit, skill: RuntimeSkill, key: string, learnable: boolean): HeroSkillDefinition {
  const kind = getSkillKind(skill)
  const target = getSkillTarget(skill, kind)
  const damageType = getDamageType(skill.damageTypeRaw)
  const values = getSkillValues(skill)
  const tags = getSkillTags(skill, values)
  const sourceTag = getSourceTag(tags)

  return {
    key,
    id: skill.id,
    name: getPublicSkillName(key, skill.category),
    kind,
    target,
    damageType,
    sourceTag,
    mechanics: tags,
    tags,
    values,
    flags: getSkillFlags(skill),
    aiUsage: getSkillAiUsage(tags, damageType),
    maxLevel: skill.maxLevel,
    category: skill.category,
    learnable,
    sourceHeroId: kit.sourceHeroId,
    sourceAbilityId: skill.sourceAbilityId,
  }
}

function getSkillKind(skill: RuntimeSkill): SkillKind {
  if (skill.category === 'innate' || skill.behaviorFlags.includes('PASSIVE')) return 'passive'
  if (skill.behaviorFlags.includes('ATTACK') && skill.behaviorFlags.includes('AUTOCAST')) return 'passive'
  if (skill.behaviorFlags.includes('TOGGLE')) return 'toggle'
  return 'active'
}

function getSkillTarget(skill: RuntimeSkill, kind: SkillKind): SkillTarget {
  if (kind === 'passive') return 'passive'
  if (isGlobalAbility(skill.sourceInternalName)) return 'global'
  if (skill.behaviorFlags.includes('UNIT_TARGET')) return 'unit'
  if (skill.behaviorFlags.includes('POINT')) return skill.behaviorFlags.includes('AOE') ? 'area' : 'point'
  if (skill.behaviorFlags.includes('AOE')) return 'area'
  if (skill.behaviorFlags.includes('NO_TARGET') && (skill.targetTeamRaw === 2 || hasOffensiveSpecialValue(skill))) return 'area'
  return 'self'
}

function getDamageType(raw: number): DamageType {
  if (raw === 1) return 'physical'
  if (raw === 2) return 'magical'
  if (raw === 4) return 'pure'
  return 'none'
}

function getSkillValues(skill: RuntimeSkill): HeroSkillDefinition['values'] {
  const values: HeroSkillDefinition['values'] = {}
  assignNumbers(values, 'cooldown', skill.cooldowns)
  assignNumbers(values, 'manaCost', skill.manaCosts)
  assignNumbers(values, 'range', skill.castRanges)
  assignNumbers(values, 'duration', skill.durations)
  assignNumbers(values, 'channelTime', skill.channelTimes)
  assignNumbers(values, 'healthCost', skill.healthCosts)

  for (const special of skill.specialValues) {
    if (special.baseValues.length === 0 || special.name.startsWith('Ability')) continue
    values[special.name] = [...special.baseValues]
  }

  const specialDamage = pickDamageSpecial(skill)
  assignNumbers(values, 'damage', hasPositiveNumber(skill.damages) ? skill.damages : specialDamage)
  assignAlias(values, skill, 'radius', ['radius', 'area_of_effect', 'aoe', 'damage_radius'])
  assignControlDurationAlias(values, skill, 'stun', 'stun')
  assignControlDurationAlias(values, skill, 'silence', 'silence')
  assignControlDurationAlias(values, skill, 'root', 'root')
  assignControlDurationAlias(values, skill, 'fearDuration', 'fear')
  assignControlDurationAlias(values, skill, 'tauntDuration', 'taunt')
  assignControlDurationAlias(values, skill, 'sleepDuration', 'sleep')
  assignControlDurationAlias(values, skill, 'hexDuration', 'hex')
  assignControlDurationAlias(values, skill, 'disarmDuration', 'disarm')
  assignControlDurationAlias(values, skill, 'breakDuration', 'break')
  assignControlDurationAlias(values, skill, 'leashDuration', 'leash')
  assignAlias(values, skill, 'heal', ['heal', 'heal_amount', 'health_restore'])
  assignAlias(values, skill, 'barrier', ['barrier', 'shield', 'damage_absorb'])
  assignAlias(values, skill, 'slowPct', ['slow', 'movespeed_slow', 'movement_slow', 'enemy_slow'], true)
  assignAlias(values, skill, 'summons', ['summons', 'max_treants', 'unit_count', 'count'])
  assignAlias(values, skill, 'summonDuration', ['summon_duration', 'treant_duration', 'duration'])
  assignAlias(values, skill, 'manaValue', ['mana_burned', 'mana_drain', 'mana_restore'])
  assignAlias(values, skill, 'attackSpeed', ['bonus_attack_speed', 'attack_speed'])
  assignAlias(values, skill, 'moveSpeedBonusPct', ['move_speed_bonus_pct', 'movespeed_bonus', 'bonus_movespeed'], true)
  assignAlias(values, skill, 'critChance', ['crit_chance', 'critical_chance'])
  assignAlias(values, skill, 'critMultiplier', ['crit_multiplier', 'crit_damage'])
  assignAlias(values, skill, 'lifestealPct', ['lifesteal', 'lifesteal_pct'])
  if (isGlobalAbility(skill.sourceInternalName)) values.global = true
  return values
}

function assignNumbers(target: HeroSkillDefinition['values'], key: string, numbers: readonly number[]) {
  if (numbers.length > 0) target[key] = [...numbers]
}

function assignAlias(target: HeroSkillDefinition['values'], skill: RuntimeSkill, key: string, names: string[], absolute = false) {
  const picked = pickSpecial(skill, names)
  if (picked.length === 0) return
  target[key] = absolute ? picked.map((value) => Math.abs(value)) : picked
}

function assignControlDurationAlias(
  target: HeroSkillDefinition['values'],
  skill: RuntimeSkill,
  key: string,
  control: string,
) {
  const exact = pickSpecial(skill, [`${control}_duration`, control])
  const fuzzy = skill.specialValues.find((special) => (
    special.name.includes(`${control}_duration`) &&
    !['bonus', 'tooltip', 'pct', 'percent', 'penalty', 'self_'].some((token) => special.name.includes(token))
  ))
  const picked = exact.length > 0 ? exact : fuzzy ? [...fuzzy.baseValues] : []
  if (picked.length > 0) target[key] = picked
}

function pickSpecial(skill: RuntimeSkill, names: string[]) {
  const special = names.map((name) => skill.specialValues.find((value) => value.name === name)).find(Boolean)
  return special ? [...special.baseValues] : []
}

function pickDamageSpecial(skill: RuntimeSkill) {
  const preferred = pickSpecial(skill, ['damage', 'base_damage', 'impact_damage', 'main_damage', 'nuke_damage', 'freeze_damage'])
  if (preferred.length > 0) return preferred
  const candidate = skill.specialValues.find((value) => (
    value.baseValues.some((number) => number > 0) &&
    value.name.includes('damage') &&
    !['pct', 'percent', 'reduction', 'bonus_hero', 'threshold'].some((token) => value.name.includes(token))
  ))
  return candidate ? [...candidate.baseValues] : []
}

function hasOffensiveSpecialValue(skill: RuntimeSkill) {
  return pickDamageSpecial(skill).length > 0 || skill.specialValues.some((value) => (
    ['stun', 'slow', 'silence', 'root', 'damage'].some((token) => value.name.includes(token))
  ))
}

function hasPositiveNumber(numbers: readonly number[]) {
  return numbers.some((value) => value > 0)
}

function getSkillTags(skill: RuntimeSkill, values: HeroSkillDefinition['values']) {
  const internal = skill.sourceInternalName.toLowerCase()
  const tags = new Set<string>(['official'])
  skill.behaviorFlags.forEach((flag) => tags.add(flag.toLowerCase()))
  skill.specialValues.forEach((special) => tags.add(special.name.toLowerCase()))
  if (skill.channelTimes.some((value) => value > 0)) tags.add('channel')
  if (values.global === true) tags.add('global_pressure')
  if (internal.includes('global_silence')) tags.add('global_silence')
  if (internal.includes('global') && internal.includes('invis')) tags.add('global_stealth')
  if (skill.targetTeamRaw === 1) tags.add('ally_target')
  if (skill.behaviorFlags.includes('AOE')) tags.add('area')
  if (skill.specialValues.some((value) => ['damage_per_second', 'damage_interval', 'tick_rate'].includes(value.name))) tags.add('damage_over_time')
  addSemanticTag(tags, internal, 'silence')
  addSemanticTag(tags, internal, 'stun')
  addSemanticTag(tags, internal, 'root')
  addSemanticTag(tags, internal, 'heal')
  addSemanticTag(tags, internal, 'shield')
  addSemanticTag(tags, internal, 'blink')
  addSemanticTag(tags, internal, 'leap')
  addSemanticTag(tags, internal, 'dash')
  addSemanticTag(tags, internal, 'summon')
  if (['teleport', 'blink', 'leap', 'dash', 'charge'].some((token) => internal.includes(token))) tags.add('mobility')
  if (['summon', 'treant', 'golem', 'spider', 'spirit', 'ward'].some((token) => internal.includes(token))) tags.add('summon')
  if ('stun' in values) tags.add('stun')
  if ('silence' in values) tags.add('silence')
  if ('root' in values) tags.add('root')
  if ('fearDuration' in values) tags.add('fear')
  if ('tauntDuration' in values) tags.add('taunt')
  if ('sleepDuration' in values) tags.add('sleep')
  if ('hexDuration' in values) tags.add('hex')
  if ('disarmDuration' in values) tags.add('disarm')
  if ('breakDuration' in values || skill.specialValues.some((value) => value.name === 'does_break')) tags.add('break')
  if ('leashDuration' in values) tags.add('leash')
  if (skill.specialValues.some((value) => value.name === 'does_mute')) tags.add('mute')
  if ('heal' in values) tags.add('heal')
  if ('slowPct' in values) tags.add('slow')
  if ('summons' in values) tags.add('summon')
  if (skill.behaviorFlags.includes('AURA')) tags.add('aura')
  return [...tags]
}

function addSemanticTag(tags: Set<string>, internal: string, tag: string) {
  if (internal.includes(tag)) tags.add(tag)
}

function getSourceTag(tags: string[]) {
  return ['global_silence', 'global_stealth', 'global_pressure', 'silence', 'stun', 'root', 'heal', 'shield', 'mobility', 'summon', 'aura', 'channel']
    .find((tag) => tags.includes(tag)) ?? 'official_spell'
}

function isGlobalAbility(internal: string) {
  return [
    'global_silence',
    'wrath_of_nature',
    'thundergods_wrath',
    'sun_strike',
    'haunt',
    'charge_of_darkness',
  ].some((name) => internal.includes(name))
}

function getPublicSkillName(key: string, category: HeroSkillDefinition['category']) {
  if (category === 'innate') return `Inata ${key.replace('I', '')}`
  if (key === 'R') return 'Ultimate'
  return `Habilidade ${key}`
}

function getSkillFlags(skill: RuntimeSkill): SkillFlags {
  return {
    dispellable: skill.dispellableRaw !== 0,
    piercesDebuffImmunity: skill.immunityRaw > 1,
    canBeDisjointed: skill.behaviorFlags.includes('UNIT_TARGET'),
    usesProjectile: skill.behaviorFlags.includes('UNIT_TARGET'),
    canCrit: false,
    canLifesteal: skill.damageTypeRaw === 1,
    canSpellLifesteal: skill.damageTypeRaw > 1,
    affectsBuildings: (skill.targetTypeRaw & 4) !== 0,
    affectsIllusions: true,
    breaksInvisibility: true,
    breakable: skill.category === 'innate' || skill.behaviorFlags.includes('PASSIVE'),
  }
}

function getSkillAiUsage(tags: string[], damageType: DamageType) {
  return {
    ...defaultAiUsage,
    gank: tags.some((tag) => ['stun', 'silence', 'root', 'mobility'].includes(tag)) ? 65 : 25,
    teamfight: tags.includes('global_pressure') || tags.includes('area') ? 80 : damageType !== 'none' ? 55 : 30,
    retreat: tags.some((tag) => ['heal', 'shield', 'mobility'].includes(tag)) ? 70 : 10,
    save: tags.some((tag) => ['heal', 'shield'].includes(tag)) ? 80 : 10,
    push: tags.includes('summon') ? 65 : 10,
  }
}
