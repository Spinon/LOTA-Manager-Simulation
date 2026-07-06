import { HERO_SEEDS, type HeroSeed, type SkillSeed } from '../data/heroSeeds.ts'
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

export function toHeroDefinition(seed: HeroSeed): HeroDefinition {
  return {
    id: seed.id,
    name: toDisplayName(seed.id),
    primaryAttribute: seed.primaryAttribute,
    attackType: seed.attackType,
    roles: toSimulationRoles(seed),
    complexity: seed.complexity,
    skills: seed.skills.map((skill) => toHeroSkillDefinition(seed, skill)),
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
