import { HERO_SKILL_RUNTIME_OFFICIAL } from '../data/heroSkillRuntimeOfficial.ts'

export type HeroSkillImportValidation = {
  valid: boolean
  heroCount: number
  abilityCount: number
  errors: string[]
}

type ValidatableAbility = {
  id: string
  sourceAbilityId: number
  sourceInternalName: string
  maxLevel: number
  cooldowns: readonly number[]
  manaCosts: readonly number[]
  damages: readonly number[]
  castRanges: readonly number[]
}

export function validateHeroSkillImport(): HeroSkillImportValidation {
  const errors: string[] = []
  const heroIds = new Set<string>()
  const sourceHeroIds = new Set<number>()
  let abilityCount = 0

  for (const kit of HERO_SKILL_RUNTIME_OFFICIAL) {
    if (heroIds.has(kit.heroId)) errors.push(`duplicate legacy hero: ${kit.heroId}`)
    if (sourceHeroIds.has(kit.sourceHeroId)) errors.push(`duplicate source hero: ${kit.sourceHeroId}`)
    heroIds.add(kit.heroId)
    sourceHeroIds.add(kit.sourceHeroId)

    const abilities = [
      ...kit.standardAbilities,
      ...kit.innateAbilities,
      ...kit.scepterGrantedAbilities,
      ...kit.shardGrantedAbilities,
    ] as unknown as ValidatableAbility[]
    abilityCount += abilities.length
    const abilityIds = new Set<number>()
    for (const ability of abilities) {
      if (abilityIds.has(ability.sourceAbilityId)) errors.push(`duplicate ability ${ability.sourceAbilityId} in ${kit.heroId}`)
      abilityIds.add(ability.sourceAbilityId)
      if (!ability.sourceInternalName) errors.push(`missing source name for ${ability.id}`)
      if (ability.maxLevel < 0) errors.push(`invalid max level for ${ability.id}`)
      for (const values of [ability.cooldowns, ability.manaCosts, ability.damages, ability.castRanges]) {
        if (values.some((value) => !Number.isFinite(value))) errors.push(`non-finite numeric value in ${ability.id}`)
      }
    }
  }

  if (HERO_SKILL_RUNTIME_OFFICIAL.length !== 127) errors.push(`expected 127 mapped heroes, received ${HERO_SKILL_RUNTIME_OFFICIAL.length}`)
  if (heroIds.has('h094_dark_paladin_2')) errors.push('deprecated Abaddon duplicate must not exist in official runtime data')

  return {
    valid: errors.length === 0,
    heroCount: HERO_SKILL_RUNTIME_OFFICIAL.length,
    abilityCount,
    errors,
  }
}
