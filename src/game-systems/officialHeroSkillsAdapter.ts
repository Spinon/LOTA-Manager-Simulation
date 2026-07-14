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

type SummonArchetype = 'unit' | 'ward' | 'healing_ward' | 'illusion' | 'clone'
type SummonMode = 'cast' | 'channel' | 'target_death' | 'on_attack' | 'on_death'

type SummonImportProfile = {
  archetype: SummonArchetype
  mode: SummonMode
}

const summonImportProfiles: Record<string, SummonImportProfile> = {
  juggernaut_healing_ward: { archetype: 'healing_ward', mode: 'cast' },
  shadow_shaman_mass_serpent_ward: { archetype: 'ward', mode: 'cast' },
  witch_doctor_death_ward: { archetype: 'ward', mode: 'channel' },
  enigma_demonic_conversion: { archetype: 'unit', mode: 'cast' },
  warlock_rain_of_chaos: { archetype: 'unit', mode: 'cast' },
  warlock_eldritch_summoning: { archetype: 'unit', mode: 'on_death' },
  beastmaster_summon_razorback: { archetype: 'unit', mode: 'cast' },
  beastmaster_summon_raptor: { archetype: 'unit', mode: 'cast' },
  venomancer_plague_ward: { archetype: 'ward', mode: 'cast' },
  skeleton_king_bone_guard: { archetype: 'unit', mode: 'cast' },
  skeleton_king_reincarnation: { archetype: 'unit', mode: 'on_death' },
  furion_force_of_nature: { archetype: 'unit', mode: 'cast' },
  clinkz_wind_walk: { archetype: 'unit', mode: 'cast' },
  broodmother_spawn_spiderlings: { archetype: 'unit', mode: 'target_death' },
  invoker_forge_spirit: { archetype: 'unit', mode: 'cast' },
  lycan_summon_wolves: { archetype: 'unit', mode: 'cast' },
  lone_druid_spirit_bear: { archetype: 'unit', mode: 'cast' },
  chaos_knight_phantasm: { archetype: 'illusion', mode: 'cast' },
  treant_eyes_in_the_forest: { archetype: 'ward', mode: 'cast' },
  undying_tombstone: { archetype: 'ward', mode: 'cast' },
  undying_flesh_golem: { archetype: 'unit', mode: 'on_attack' },
  naga_siren_mirror_image: { archetype: 'illusion', mode: 'cast' },
  visage_summon_familiars: { archetype: 'unit', mode: 'cast' },
  arc_warden_tempest_double: { archetype: 'clone', mode: 'cast' },
  ringmaster_funhouse_mirror: { archetype: 'illusion', mode: 'cast' },
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
  if (skill.behaviorFlags.includes('PASSIVE')) return 'passive'
  if (skill.behaviorFlags.includes('ATTACK') && skill.behaviorFlags.includes('AUTOCAST')) return 'passive'
  if (skill.category === 'innate' && skill.sourceInternalName !== 'lone_druid_spirit_bear') return 'passive'
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
  const summonProfile = getSummonImportProfile(skill)
  if (summonProfile) {
    values.summonArchetype = summonProfile.archetype
    values.summonMode = summonProfile.mode
  }
  if (summonProfile && (summonProfile.mode === 'cast' || summonProfile.mode === 'channel')) {
    assignAlias(values, skill, 'summons', [
      'summons', 'spawn_count', 'max_treants', 'max_skeleton_charges', 'count', 'ward_count',
      'hawk_count', 'wolf_count', 'familiar_count', 'images_count', 'skeleton_count',
      'extra_spirit_count_exort', 'extra_spirit_count_quas',
    ])
    if (!hasPositiveNumber(Array.isArray(values.summons) ? values.summons : [])) values.summons = [1]
    assignAlias(values, skill, 'summonDuration', [
      'summon_duration', 'golem_duration', 'skeleton_duration', 'treant_duration', 'spiderling_duration',
      'spirit_duration', 'wolf_duration', 'illusion_duration', 'duration', 'AbilityDuration',
    ])
    if (skill.sourceInternalName === 'witch_doctor_death_ward') values.summonDuration = [...skill.channelTimes]
    if (['lone_druid_spirit_bear', 'visage_summon_familiars'].includes(skill.sourceInternalName)) values.summonDuration = [7200]
    assignAlias(values, skill, 'summonHp', [
      'eidelon_max_health', 'golem_hp', 'boar_base_max_health', 'hawk_base_max_health',
      'ward_hp_tooltip', 'skeleton_health', 'treant_health', 'tooltip_spiderling_hp', 'spirit_hp',
      'wolf_hp', 'bear_hp', 'familiar_hp',
    ])
    assignAlias(values, skill, 'summonHits', [
      'healing_ward_hits_to_kill_tooltip', 'hits_to_destroy_tooltip', 'ward_health', 'tombstone_health',
    ])
    assignAlias(values, skill, 'summonDamage', [
      'ward_damage_tooltip', 'eidelon_base_damage', 'golem_dmg', 'boar_base_damage',
      'skeleton_damage_tooltip', 'treant_damage', 'spirit_damage', 'wolf_damage',
      'familiar_attack_damage', 'dive_damage', 'damage',
    ])
    assignAlias(values, skill, 'summonRange', [
      'attack_range_tooltip', 'eidolon_attack_range', 'familiar_attack_range',
    ])
    assignAlias(values, skill, 'summonMoveSpeed', [
      'healing_ward_movespeed_tooltip', 'eidelon_base_movespeed', 'golem_movement_speed',
      'boar_base_movespeed', 'min_move_speed', 'treant_movespeed', 'wolf_movespeed',
      'bear_movespeed', 'familiar_base_movespeed',
    ])
    assignAlias(values, skill, 'summonAttackInterval', ['hawk_base_attack_interval', 'wolf_bat', 'bear_bat', 'attack_rate'])
    assignAlias(values, skill, 'summonVision', [
      'healing_ward_aura_radius', 'hawk_base_vision_range', 'treant_vision_day', 'vision_aoe', 'vision_radius',
    ])
    assignAlias(values, skill, 'summonGoldBounty', [
      'golem_gold_bounty', 'hawk_base_gold_bounty', 'gold_bounty', 'treant_gold_bounty_min',
      'familiar_bounty', 'bounty_gold', 'bounty',
    ])
    assignAlias(values, skill, 'summonXpBounty', [
      'eidolon_xp_bounty', 'boar_base_xp_bounty', 'hawk_base_xp_bounty', 'xp_bounty',
      'treant_xp_bounty', 'familiar_bounty', 'bounty_xp',
    ])
    assignAlias(values, skill, 'summonOutgoingDamagePct', ['outgoing_damage_tooltip', 'tooltip_damage_outgoing_melee'])
    assignAlias(values, skill, 'summonIncomingDamagePct', ['incoming_damage_tooltip', 'tooltip_incoming_damage_total_pct', 'tooltip_damage_incoming_total_pct'])
    assignAlias(values, skill, 'summonHealPct', ['healing_ward_heal_amount'])
  }
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

function isSummonAbility(skill: RuntimeSkill) {
  return getSummonImportProfile(skill) !== undefined
}

function getSummonImportProfile(skill: RuntimeSkill) {
  return summonImportProfiles[skill.sourceInternalName.toLowerCase()]
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
  if (['teleport', 'blink', 'leap', 'dash', 'charge'].some((token) => internal.includes(token))) tags.add('mobility')
  if (isSummonAbility(skill)) tags.add('summon')
  const summonProfile = getSummonImportProfile(skill)
  if (summonProfile) {
    tags.add(`summon_${summonProfile.archetype}`)
    tags.add(`summon_${summonProfile.mode}`)
  }
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
