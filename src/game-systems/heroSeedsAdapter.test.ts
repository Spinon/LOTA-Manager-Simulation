import assert from 'node:assert/strict'
import { HERO_SEEDS } from '../data/heroSeeds.ts'
import { calculateHeroStats } from './heroAttributes.ts'
import { seedHeroDefinitions } from './heroSeedsAdapter.ts'

assert.equal(Object.keys(seedHeroDefinitions).length, HERO_SEEDS.length)

for (const seed of HERO_SEEDS) {
  const definition = seedHeroDefinitions[seed.id]
  assert.ok(definition, `${seed.id} should have a simulation definition`)
  assert.equal(definition.id, seed.id)
  assert.equal(definition.primaryAttribute, seed.primaryAttribute)
  assert.equal(definition.attackType, seed.attackType)
  assert.ok(definition.roles.length > 0, `${seed.id} should map at least one simulation role`)
  assert.equal(definition.skills?.length, 4, `${seed.id} should import four skills`)
  assert.deepEqual(definition.skills?.map((skill) => skill.key), ['Q', 'W', 'E', 'R'])

  for (const skill of definition.skills ?? []) {
    assert.ok(skill.name.length > 0, `${skill.id} should have a display name`)
    assert.ok(skill.tags.length > 0, `${skill.id} should keep tags`)
    assert.ok(['physical', 'magical', 'pure', 'none'].includes(skill.damageType), `${skill.id} should keep damage type`)
  }

  const stats = calculateHeroStats(definition, 1)
  assert.ok(stats.resources.maxHealth > 0, `${seed.id} should calculate health`)
  assert.ok(stats.offense.averageDamage > 0, `${seed.id} should calculate damage`)
  assert.ok(stats.movement.movementSpeed > 0, `${seed.id} should calculate movement`)
}

console.log('heroSeedsAdapter tests passed')
