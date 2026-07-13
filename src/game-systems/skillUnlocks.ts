import type { HeroDefinition, HeroSkillDefinition } from './heroAttributes.ts'

export type AbilityUpgradeSlot = 'scepter' | 'shard'
export type RuntimeSkillSet = 'primary' | 'supplemental'
export type SkillRuntimeUnlockRule = 'primary' | 'scepter_item' | 'shard_item' | 'unsupported_contextual'

export const abilityUpgradeItemIds: Record<AbilityUpgradeSlot, string> = {
  scepter: 'i135_grand_spell_scepter',
  shard: 'i136_spell_shard',
}

const runtimeHeroSkillsCache = new WeakMap<HeroDefinition, Map<number, HeroSkillDefinition[]>>()

export function getSkillRuntimeUnlockRule(
  skill: HeroSkillDefinition,
  runtimeSet: RuntimeSkillSet,
): SkillRuntimeUnlockRule {
  if (runtimeSet === 'primary') return 'primary'
  if (skill.category === 'scepter_granted') return 'scepter_item'
  if (skill.category === 'shard_granted') return 'shard_item'
  return 'unsupported_contextual'
}

export function getRuntimeHeroSkills(
  definition: HeroDefinition,
  upgradeSlots: ReadonlySet<AbilityUpgradeSlot>,
) {
  const upgradeMask = (upgradeSlots.has('scepter') ? 1 : 0) | (upgradeSlots.has('shard') ? 2 : 0)
  let skillsByUpgradeMask = runtimeHeroSkillsCache.get(definition)
  if (!skillsByUpgradeMask) {
    skillsByUpgradeMask = new Map()
    runtimeHeroSkillsCache.set(definition, skillsByUpgradeMask)
  }
  const cached = skillsByUpgradeMask.get(upgradeMask)
  if (cached) return cached

  const primary = definition.skills ?? []
  const supplemental = (definition.supplementalSkills ?? []).filter((skill) => {
    const rule = getSkillRuntimeUnlockRule(skill, 'supplemental')
    if (rule === 'scepter_item') return upgradeSlots.has('scepter')
    if (rule === 'shard_item') return upgradeSlots.has('shard')
    return false
  })
  const skills = [...primary, ...supplemental]
  skillsByUpgradeMask.set(upgradeMask, skills)
  return skills
}

export function getGrantedSkillLevel(skill: HeroSkillDefinition, heroLevel: number) {
  const maxLevel = Math.max(1, skill.maxLevel ?? 1)
  if (maxLevel === 1) return 1
  return Math.min(maxLevel, Math.max(1, Math.floor(heroLevel / 6)))
}
