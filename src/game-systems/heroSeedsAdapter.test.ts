import assert from 'node:assert/strict'
import { HERO_SEEDS } from '../data/heroSeeds.ts'
import { HERO_SKILL_RUNTIME_OFFICIAL } from '../data/heroSkillRuntimeOfficial.ts'
import { calculateHeroStats } from './heroAttributes.ts'
import { seedHeroDefinitions } from './heroSeedsAdapter.ts'

assert.equal(Object.keys(seedHeroDefinitions).length, HERO_SEEDS.length)
assert.equal(HERO_SKILL_RUNTIME_OFFICIAL.length, 127, 'official import should preserve every unique mapped source hero')
const uniqueDefinitions = Object.values(seedHeroDefinitions).filter((definition) => definition.id !== 'h094_dark_paladin_2')
assert.equal(
  uniqueDefinitions.reduce((total, definition) => total + (definition.skills?.length ?? 0) + (definition.supplementalSkills?.length ?? 0), 0),
  734,
  'all official standard, innate, Scepter, and Shard abilities should reach the simulation adapter',
)

for (const seed of HERO_SEEDS) {
  const definition = seedHeroDefinitions[seed.id]
  assert.ok(definition, `${seed.id} should have a simulation definition`)
  assert.equal(definition.id, seed.id)
  assert.equal(definition.primaryAttribute, seed.primaryAttribute)
  assert.equal(definition.attackType, seed.attackType)
  assert.ok(definition.roles.length > 0, `${seed.id} should map at least one simulation role`)
  assert.ok((definition.skills?.length ?? 0) >= 4, `${seed.id} should expose its learnable and innate abilities`)

  for (const skill of definition.skills ?? []) {
    assert.ok(skill.name.length > 0, `${skill.id} should have a display name`)
    assert.ok(skill.tags.length > 0, `${skill.id} should keep tags`)
    assert.ok(['physical', 'magical', 'pure', 'none'].includes(skill.damageType), `${skill.id} should keep damage type`)
    assert.ok(skill.sourceTag, `${skill.id} should keep its source tag`)
    assert.ok(skill.mechanics && skill.mechanics.length > 0, `${skill.id} should keep mechanics`)
    assert.ok(skill.flags, `${skill.id} should keep behavior flags`)
    assert.ok(skill.aiUsage, `${skill.id} should keep AI usage weights`)
    assert.ok(skill.sourceHeroId, `${skill.id} should keep the official source hero id`)
    assert.ok(skill.sourceAbilityId, `${skill.id} should keep the official source ability id`)
  }

  const stats = calculateHeroStats(definition, 1)
  assert.ok(stats.resources.maxHealth > 0, `${seed.id} should calculate health`)
  assert.ok(stats.offense.averageDamage > 0, `${seed.id} should calculate damage`)
  assert.ok(stats.movement.movementSpeed > 0, `${seed.id} should calculate movement`)
}

const silenceWarden = seedHeroDefinitions.h067_silence_warden
assert.equal(silenceWarden.skills?.find((skill) => skill.key === 'Q')?.target, 'area', 'ordinary silence should be normalized to spatial control')
assert.equal(silenceWarden.skills?.find((skill) => skill.key === 'R')?.target, 'global', 'explicit global silence should remain global')
assert.deepEqual(silenceWarden.skills?.find((skill) => skill.key === 'R')?.values.cooldown, [120])
assert.equal(silenceWarden.skills?.find((skill) => skill.key === 'R')?.values.damage, undefined, 'official Global Silence must not gain invented damage')

const forestSkills = seedHeroDefinitions.h045_forest_commander.skills ?? []
assert.deepEqual(forestSkills.find((skill) => skill.key === 'Q')?.values.damage, [70, 130, 190, 250], 'official Sprout damage should replace the old fabricated global nuke')
assert.deepEqual(forestSkills.find((skill) => skill.key === 'W')?.values.cooldown, [65, 50, 35, 20], 'official teleport cooldown should be preserved')
assert.equal(forestSkills.find((skill) => skill.key === 'R')?.target, 'global')
assert.equal(seedHeroDefinitions.h066_complex_mage.supplementalSkills?.length, 10, 'Invoker invoked spells should be preserved without becoming freely learnable')
assert.equal(
  seedHeroDefinitions.h094_dark_paladin_2.skills?.[0]?.sourceHeroId,
  seedHeroDefinitions.h049_dark_paladin.skills?.[0]?.sourceHeroId,
  'deprecated duplicate should resolve to the canonical official source',
)

console.log('heroSeedsAdapter tests passed')
