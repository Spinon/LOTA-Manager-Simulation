import type { HeroDefinition, HeroSkillDefinition } from './heroAttributes.ts'
import type { SkillUsageSituation } from './skillRuntime.ts'

export type AbilityUpgradeSlot = 'scepter' | 'shard'
export type RuntimeSkillSet = 'primary' | 'supplemental'
export type SkillRuntimeUnlockRule =
  | 'primary'
  | 'scepter_item'
  | 'shard_item'
  | 'invoked_loadout'
  | 'song_loadout'
  | 'situational_utility'
  | 'souvenir_resource'
  | 'alternate_stance'
  | 'parent_state'
  | 'unsupported_contextual'

export type ContextualSkillSelectionInput = {
  skillLevels: Partial<Record<string, number>>
  situation: SkillUsageSituation
  hpRatio: number
  skillStates?: Record<string, RuntimeParentSkillState>
}

export type RuntimeParentSkillState = {
  activeUntil: number
  charges?: number
  mode?: 'in' | 'out'
  positions?: Array<{ x: number; y: number }>
}

export const abilityUpgradeItemIds: Record<AbilityUpgradeSlot, string> = {
  scepter: 'i135_grand_spell_scepter',
  shard: 'i136_spell_shard',
}

const invokerHeroId = 'h066_complex_mage'
const monkeyHeroId = 'h106_monkey_warrior'
const ringmasterHeroId = 'h118_circus_controller'
const stanceHeroId = 'h119_twin_blade_duelist'
const songHeroId = 'h120_heavy_artillery_commander'
const parentStateHeroIds = ['h082_light_keeper', 'h083_spirit_tether', 'h098_ember_duelist', 'h124_stone_giant']
const automaticContextualHeroIds = new Set([invokerHeroId, songHeroId, monkeyHeroId, ...parentStateHeroIds])

const invokerOrbRecipes: Record<number, string> = {
  5376: 'QQQ',
  5381: 'QQW',
  5382: 'QWW',
  5383: 'WWW',
  5384: 'WWE',
  5385: 'WEE',
  5386: 'EEE',
  5387: 'QEE',
  5389: 'QQE',
  5390: 'QWE',
}

const invokerSituationOrder: Record<SkillUsageSituation, number[]> = {
  laning: [5376, 5384, 5382, 5383, 5389, 5387, 5385, 5386, 5390, 5381],
  farming: [5387, 5384, 5385, 5383, 5386, 5382, 5376, 5389, 5390, 5381],
  gank: [5376, 5382, 5389, 5390, 5385, 5384, 5386, 5383, 5387, 5381],
  teamfight: [5390, 5385, 5383, 5382, 5386, 5376, 5389, 5384, 5387, 5381],
  retreat: [5381, 5382, 5389, 5390, 5376, 5383, 5384, 5385, 5387, 5386],
  push: [5387, 5384, 5385, 5383, 5386, 5382, 5390, 5376, 5389, 5381],
  save: [5381, 5382, 5389, 5390, 5384, 5376, 5383, 5385, 5387, 5386],
  objective: [5387, 5384, 5385, 5383, 5386, 5390, 5382, 5376, 5389, 5381],
}

const runtimeHeroSkillsCache = new WeakMap<HeroDefinition, Map<string, HeroSkillDefinition[]>>()
const normalizedSkillCache = new WeakMap<HeroSkillDefinition, HeroSkillDefinition>()

export function getSkillRuntimeUnlockRule(
  skill: HeroSkillDefinition,
  runtimeSet: RuntimeSkillSet,
): SkillRuntimeUnlockRule {
  if (runtimeSet === 'primary') return 'primary'
  if (skill.category === 'scepter_granted') return 'scepter_item'
  if (skill.category === 'shard_granted') return 'shard_item'
  if (skill.id.startsWith(`${invokerHeroId}_`)) return 'invoked_loadout'
  if (skill.id.startsWith(`${songHeroId}_`)) return 'song_loadout'
  if (skill.id.startsWith(`${monkeyHeroId}_`)) return 'situational_utility'
  if (skill.id.startsWith(`${ringmasterHeroId}_`)) return 'souvenir_resource'
  if (skill.id.startsWith(`${stanceHeroId}_`)) return 'alternate_stance'
  if (parentStateHeroIds.some((heroId) => skill.id.startsWith(`${heroId}_`))) return 'parent_state'
  return 'unsupported_contextual'
}

export function getContextualSkillIds(
  definition: HeroDefinition,
  input: ContextualSkillSelectionInput,
) {
  if (definition.id === invokerHeroId) return getInvokedLoadout(definition, input)
  if (definition.id === songHeroId) return getSongLoadout(definition, input)
  if (definition.id === monkeyHeroId && input.situation === 'retreat') {
    return definition.supplementalSkills
      ?.filter((skill) => skill.sourceAbilityId === 1627)
      .map((skill) => skill.id) ?? []
  }
  if (parentStateHeroIds.includes(definition.id)) return getParentStateLoadout(definition, input)
  return []
}

export function hasAutomaticContextualSkillSelection(definition: HeroDefinition) {
  return automaticContextualHeroIds.has(definition.id)
}

export function getRuntimeHeroSkills(
  definition: HeroDefinition,
  upgradeSlots: ReadonlySet<AbilityUpgradeSlot>,
  contextualSkillIds: readonly string[] = [],
) {
  const upgradeMask = (upgradeSlots.has('scepter') ? 1 : 0) | (upgradeSlots.has('shard') ? 2 : 0)
  const selectedContextualIds = [...new Set(contextualSkillIds)].sort()
  const selectedContextualIdSet = new Set(selectedContextualIds)
  const cacheKey = `${upgradeMask}:${selectedContextualIds.join(',')}`
  let skillsByUnlockState = runtimeHeroSkillsCache.get(definition)
  if (!skillsByUnlockState) {
    skillsByUnlockState = new Map()
    runtimeHeroSkillsCache.set(definition, skillsByUnlockState)
  }
  const cached = skillsByUnlockState.get(cacheKey)
  if (cached) return cached

  const primary = (definition.skills ?? []).map(getRuntimeNormalizedSkill)
  const supplemental = (definition.supplementalSkills ?? []).filter((skill) => {
    const rule = getSkillRuntimeUnlockRule(skill, 'supplemental')
    if (rule === 'scepter_item') return upgradeSlots.has('scepter')
    if (rule === 'shard_item') return upgradeSlots.has('shard')
    if (rule === 'unsupported_contextual') return false
    return selectedContextualIdSet.has(skill.id)
  }).map(getRuntimeNormalizedSkill)
  const skills = [...primary, ...supplemental]
  skillsByUnlockState.set(cacheKey, skills)
  return skills
}

export function getGrantedSkillLevel(skill: HeroSkillDefinition, heroLevel: number) {
  const maxLevel = Math.max(1, skill.maxLevel ?? 1)
  if (maxLevel === 1) return 1
  return Math.min(maxLevel, Math.max(1, Math.floor(heroLevel / 6)))
}

export function getContextualSkillLevel(
  skill: HeroSkillDefinition,
  skillLevels: Partial<Record<string, number>>,
) {
  const rule = getSkillRuntimeUnlockRule(skill, 'supplemental')
  if (rule === 'invoked_loadout') {
    const recipe = invokerOrbRecipes[skill.sourceAbilityId ?? 0]
    if (!recipe) return 0
    const requiredLevels = [...new Set(recipe)].map((key) => skillLevels[key] ?? 0)
    if (requiredLevels.some((level) => level <= 0)) return 0
    return Math.max(1, ...requiredLevels)
  }
  if (rule === 'song_loadout') return Math.max(0, skillLevels.R ?? 0)
  if (rule === 'situational_utility') return 1
  if (rule === 'parent_state') {
    const levelKeyByAbilityId: Record<number, string> = {
      1372: 'R',
      5490: 'W',
      5493: 'W',
      5607: 'R',
      6937: 'E',
    }
    return Math.max(0, skillLevels[levelKeyByAbilityId[skill.sourceAbilityId ?? 0]] ?? 0)
  }
  return 0
}

function getInvokedLoadout(definition: HeroDefinition, input: ContextualSkillSelectionInput) {
  const order = invokerSituationOrder[input.situation]
  return (definition.supplementalSkills ?? [])
    .filter((skill) => {
      const recipe = invokerOrbRecipes[skill.sourceAbilityId ?? 0]
      return recipe !== undefined && [...new Set(recipe)].every((key) => (input.skillLevels[key] ?? 0) > 0)
    })
    .sort((left, right) => {
      const leftIndex = order.indexOf(left.sourceAbilityId ?? 0)
      const rightIndex = order.indexOf(right.sourceAbilityId ?? 0)
      return (leftIndex < 0 ? order.length : leftIndex) - (rightIndex < 0 ? order.length : rightIndex)
    })
    .slice(0, 2)
    .map((skill) => skill.id)
}

function getSongLoadout(definition: HeroDefinition, input: ContextualSkillSelectionInput) {
  if ((input.skillLevels.R ?? 0) <= 0) return []
  const sourceAbilityId = input.hpRatio < 0.58 || input.situation === 'save'
    ? 1665
    : input.situation === 'retreat'
      ? 1664
      : 1663
  return definition.supplementalSkills
    ?.filter((skill) => skill.sourceAbilityId === sourceAbilityId)
    .map((skill) => skill.id) ?? []
}

function getParentStateLoadout(definition: HeroDefinition, input: ContextualSkillSelectionInput) {
  const states = input.skillStates ?? {}
  let sourceAbilityId: number | undefined
  if (definition.id === 'h082_light_keeper' && states[parentSkillStateKey(5474)]) sourceAbilityId = 1372
  if (definition.id === 'h083_spirit_tether') {
    const spirits = states[parentSkillStateKey(5486)]
    if (spirits) {
      const desiredMode = ['teamfight', 'gank', 'save'].includes(input.situation) ? 'in' : 'out'
      if (spirits.mode !== desiredMode) sourceAbilityId = desiredMode === 'in' ? 5490 : 5493
    }
  }
  if (definition.id === 'h098_ember_duelist' && (states[parentSkillStateKey(5606)]?.positions?.length ?? 0) > 0) sourceAbilityId = 5607
  if (definition.id === 'h124_stone_giant' && (states[parentSkillStateKey(5108)]?.charges ?? 0) > 0) sourceAbilityId = 6937
  if (sourceAbilityId === undefined) return []
  return definition.supplementalSkills
    ?.filter((skill) => skill.sourceAbilityId === sourceAbilityId)
    .map((skill) => skill.id) ?? []
}

export function parentSkillStateKey(sourceAbilityId: number) {
  return String(sourceAbilityId)
}

export function getRuntimeNormalizedSkill(skill: HeroSkillDefinition) {
  const cached = normalizedSkillCache.get(skill)
  if (cached) return cached
  const sourceAbilityId = skill.sourceAbilityId ?? 0
  let normalized = skill

  if (skill.id.startsWith(`${invokerHeroId}_`) && [5370, 5371, 5372].includes(sourceAbilityId)) {
    const orbNames: Record<number, string> = { 5370: 'Essencia de Gelo', 5371: 'Essencia de Tempestade', 5372: 'Essencia de Fogo' }
    normalized = {
      ...skill,
      name: orbNames[sourceAbilityId],
      kind: 'passive',
      target: 'passive',
    }
  } else if (skill.id.startsWith(`${invokerHeroId}_`)) {
    normalized = normalizeInvokedSkill(skill, sourceAbilityId)
  } else if (skill.id.startsWith(`${songHeroId}_`)) {
    normalized = normalizeSongSkill(skill, sourceAbilityId)
  } else if (skill.id.startsWith(`${monkeyHeroId}_`) && sourceAbilityId === 1627) {
    normalized = {
      ...skill,
      name: 'Disfarce Arcano',
      target: 'self',
      tags: withTags(skill, ['transformation', 'escape', 'defensive_utility', 'damage_reduction']),
      values: {
        ...skill.values,
        duration: skill.values.transfiguration_duration ?? 1.5,
      },
    }
  } else if (parentStateHeroIds.some((heroId) => skill.id.startsWith(`${heroId}_`))) {
    normalized = normalizeParentStateSkill(skill, sourceAbilityId)
  }

  normalizedSkillCache.set(skill, normalized)
  return normalized
}

function normalizeParentStateSkill(skill: HeroSkillDefinition, sourceAbilityId: number): HeroSkillDefinition {
  const names: Record<number, string> = {
    5474: 'Forma Radiante',
    1372: 'Vinculo Radiante',
    5486: 'Espiritos Guardioes',
    5490: 'Espiritos para Dentro',
    5493: 'Espiritos para Fora',
    5606: 'Remanescente Ardente',
    5607: 'Ativar Remanescente',
    5108: 'Agarrar Arvore',
    6937: 'Arremessar Arvore',
  }
  const base = { ...skill, name: names[sourceAbilityId] ?? skill.name }
  if (sourceAbilityId === 5474) return { ...base, tags: withTags(skill, ['transformation', 'damage_buff']) }
  if (sourceAbilityId === 5486) {
    return {
      ...base,
      values: {
        ...skill.values,
        summons: skill.values.spirit_amount ?? 5,
        summonDuration: skill.values.spirit_duration ?? skill.values.duration ?? 15,
      },
    }
  }
  if (sourceAbilityId === 5490 || sourceAbilityId === 5493) {
    return { ...base, target: 'self', tags: withTags(skill, ['summon_control', 'defensive_utility']) }
  }
  if (sourceAbilityId === 5606) {
    return { ...base, values: { ...skill.values, damage: 0 } }
  }
  if (sourceAbilityId === 5607) return { ...base, target: 'area', tags: withTags(skill, ['mobility', 'area']) }
  if (sourceAbilityId === 5108) {
    return {
      ...base,
      target: 'self',
      tags: withTags(skill, ['damage_buff']),
      values: { ...skill.values, duration: 120 },
    }
  }
  return base
}

function normalizeInvokedSkill(skill: HeroSkillDefinition, sourceAbilityId: number): HeroSkillDefinition {
  const names: Record<number, string> = {
    5376: 'Estalo Glacial',
    5381: 'Passo Espectral',
    5382: 'Ciclone',
    5383: 'Pulso de Mana',
    5384: 'Alacridade',
    5385: 'Meteoro Caotico',
    5386: 'Golpe Solar',
    5387: 'Espirito Forjado',
    5389: 'Muralha de Gelo',
    5390: 'Onda Ensurdecedora',
  }
  const base = { ...skill, name: names[sourceAbilityId] ?? skill.name }
  if (sourceAbilityId === 5376) {
    return { ...base, tags: withTags(skill, ['stun']), values: { ...skill.values, stun: skill.values.freeze_duration ?? 0.4 } }
  }
  if (sourceAbilityId === 5381) {
    return {
      ...base,
      target: 'self',
      tags: withTags(skill, ['mobility', 'escape', 'defensive_utility', 'damage_reduction']),
      values: { ...skill.values, duration: 6, moveSpeedBonusPct: 12 },
    }
  }
  if (sourceAbilityId === 5382) {
    return { ...base, tags: withTags(skill, ['stun']), values: { ...skill.values, stun: skill.values.lift_duration ?? 1.2 } }
  }
  if (sourceAbilityId === 5383) {
    return { ...base, tags: withTags(skill, ['mana_burn']), values: { ...skill.values, damage: scaleNumericValue(skill.values.mana_burned, 0.6) } }
  }
  if (sourceAbilityId === 5384) {
    return { ...base, tags: withTags(skill, ['damage_buff', 'ally_target']) }
  }
  if (sourceAbilityId === 5387) {
    return {
      ...base,
      target: 'self',
      tags: withTags(skill, ['summon']),
      values: { ...skill.values, summons: skill.values.extra_spirit_count_exort ?? 1, summonDuration: skill.values.spirit_duration ?? 24 },
    }
  }
  if (sourceAbilityId === 5390) return { ...base, tags: withTags(skill, ['knockback']) }
  return base
}

function normalizeSongSkill(skill: HeroSkillDefinition, sourceAbilityId: number): HeroSkillDefinition {
  if (sourceAbilityId === 1663) return { ...skill, name: 'Cancao de Guerra' }
  if (sourceAbilityId === 1664) {
    return {
      ...skill,
      name: 'Ritmo Acelerado',
      target: 'self',
      tags: withTags(skill, ['mobility', 'haste', 'ally_target']),
      values: {
        ...skill.values,
        duration: skill.values.movement_burst_duration ?? 1,
        moveSpeedBonusPct: skill.values.movespeed_bonus_burst ?? 16,
      },
    }
  }
  if (sourceAbilityId === 1665) {
    return {
      ...skill,
      name: 'Boas Vibracoes',
      target: 'self',
      tags: withTags(skill, ['heal', 'ally_target']),
      values: { ...skill.values, heal: skill.values.heal_burst ?? 34 },
    }
  }
  return skill
}

function withTags(skill: HeroSkillDefinition, tags: string[]) {
  return [...new Set([...skill.tags, ...tags])]
}

function scaleNumericValue(value: HeroSkillDefinition['values'][string], multiplier: number) {
  if (Array.isArray(value)) return value.map((entry) => typeof entry === 'number' ? entry * multiplier : entry)
  return typeof value === 'number' ? value * multiplier : 0
}
