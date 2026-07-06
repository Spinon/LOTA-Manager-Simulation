import { HERO_SEEDS, type HeroSeed, type SkillSeed } from '../data/heroSeeds.ts'
import { getSkillKit, validateSkillKit, type CompleteSkillSeed } from '../data/completeHeroSkillKits.ts'
import type { HeroDefinition, HeroRole, HeroSkillDefinition } from './heroAttributes'

const supportedRoles = new Set<HeroRole>([
  'carry',
  'support',
  'nuker',
  'disabler',
  'durable',
  'escape',
  'pusher',
  'initiator',
])

function toDisplayName(id: string) {
  return id
    .replace(/^h\d+_/, '')
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function toSkillDisplayName(id: string, heroId: string) {
  const heroSlug = heroId.replace(/^h\d+_/, '')
  return id
    .replace(`${heroSlug}_`, '')
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function toSimulationRoles(seed: HeroSeed): HeroRole[] {
  const mappedRoles = seed.roles.map((role) => {
    if (role === 'mid') return 'nuker'
    if (role === 'offlane') return 'initiator'
    if (role === 'soft_support' || role === 'hard_support' || role === 'healer' || role === 'scout') return 'support'
    return role
  })

  return Array.from(new Set(mappedRoles.filter((role): role is HeroRole => supportedRoles.has(role as HeroRole))))
}

function toHeroSkillDefinition(seed: HeroSeed, skill: SkillSeed): HeroSkillDefinition {
  return {
    key: skill.key,
    id: skill.id,
    name: toSkillDisplayName(skill.id, seed.id),
    kind: skill.kind,
    target: skill.target,
    damageType: skill.damageType,
    tags: skill.tags,
    values: skill.values ?? {},
    scaling: skill.scaling,
  }
}

function toSupportedScalingAttribute(attribute: string | undefined) {
  if (attribute === 'strength' || attribute === 'agility' || attribute === 'intelligence' || attribute === 'universal') return attribute
  if (attribute === 'highest' || attribute === 'total') return attribute
  return undefined
}

function toCompleteHeroSkillDefinition(skill: CompleteSkillSeed): HeroSkillDefinition {
  return {
    key: skill.key,
    id: skill.id,
    name: skill.name,
    kind: skill.kind,
    target: skill.target,
    damageType: skill.damageType,
    tags: Array.from(new Set([skill.sourceTag, ...skill.mechanics, ...skill.synergyTags, ...skill.counterTags])),
    values: skill.values,
    scaling: skill.scaling
      ? {
          attribute: toSupportedScalingAttribute(skill.scaling.attribute),
          coefficient: skill.scaling.coefficient,
        }
      : undefined,
  }
}

export function toHeroDefinition(seed: HeroSeed): HeroDefinition {
  const completeKit = getSkillKit(seed.id)
  const skills = completeKit && validateSkillKit(completeKit)
    ? completeKit.skills.map(toCompleteHeroSkillDefinition)
    : seed.skills.map((skill) => toHeroSkillDefinition(seed, skill))

  return {
    id: seed.id,
    name: toDisplayName(seed.id),
    primaryAttribute: seed.primaryAttribute,
    attackType: seed.attackType,
    roles: toSimulationRoles(seed),
    complexity: seed.complexity,
    skills,
    baseAttributes: seed.baseAttributes,
    attributeGrowth: seed.attributeGrowth,
    baseStats: seed.baseStats,
  }
}

export const seedHeroDefinitions = Object.fromEntries(
  HERO_SEEDS.map((seed) => [seed.id, toHeroDefinition(seed)]),
) as Record<string, HeroDefinition>

export function getHeroSeedById(id: string) {
  return HERO_SEEDS.find((seed) => seed.id === id)
}
