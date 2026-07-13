import assert from 'node:assert/strict'

import type { HeroDefinition, HeroSkillDefinition } from './heroAttributes.ts'
import {
  getContextualSkillIds,
  getContextualSkillLevel,
  getGrantedSkillLevel,
  getRuntimeHeroSkills,
  getSkillRuntimeUnlockRule,
} from './skillUnlocks.ts'

const baseSkill: HeroSkillDefinition = {
  key: 'Q',
  id: 'base-skill',
  name: 'Base Skill',
  kind: 'active',
  target: 'unit',
  damageType: 'magical',
  tags: ['damage'],
  values: { damage: 100 },
}
const scepterSkill = { ...baseSkill, key: 'A1', id: 'scepter-skill', category: 'scepter_granted' as const, learnable: false, maxLevel: 3 }
const shardSkill = { ...baseSkill, key: 'H1', id: 'shard-skill', category: 'shard_granted' as const, learnable: false, maxLevel: 1 }
const contextualSkill = { ...baseSkill, key: 'S1', id: 'contextual-skill', category: 'standard' as const, learnable: false }
const definition = {
  skills: [baseSkill],
  supplementalSkills: [scepterSkill, shardSkill, contextualSkill],
} as HeroDefinition

assert.deepEqual(getRuntimeHeroSkills(definition, new Set()).map((skill) => skill.id), ['base-skill'])
assert.strictEqual(getRuntimeHeroSkills(definition, new Set()), getRuntimeHeroSkills(definition, new Set()), 'runtime kits should be cached by upgrade mask')
assert.deepEqual(getRuntimeHeroSkills(definition, new Set(['scepter'])).map((skill) => skill.id), ['base-skill', 'scepter-skill'])
assert.deepEqual(getRuntimeHeroSkills(definition, new Set(['shard'])).map((skill) => skill.id), ['base-skill', 'shard-skill'])
assert.deepEqual(getRuntimeHeroSkills(definition, new Set(['scepter', 'shard'])).map((skill) => skill.id), ['base-skill', 'scepter-skill', 'shard-skill'])
assert.equal(getSkillRuntimeUnlockRule(contextualSkill, 'supplemental'), 'unsupported_contextual')
assert.equal(getGrantedSkillLevel(scepterSkill, 12), 2)
assert.equal(getGrantedSkillLevel(shardSkill, 30), 1)

const orbSkills = (['Q', 'W', 'E'] as const).map((key, index) => ({
  ...baseSkill,
  id: `h066_complex_mage_standard_${index + 1}_${5370 + index}`,
  key,
  sourceAbilityId: 5370 + index,
}))
const invokedSkills = [
  { ...baseSkill, id: 'h066_complex_mage_standard_4_5376', key: 'S1', sourceAbilityId: 5376, learnable: false },
  { ...baseSkill, id: 'h066_complex_mage_standard_9_5385', key: 'S6', sourceAbilityId: 5385, learnable: false },
  { ...baseSkill, id: 'h066_complex_mage_standard_13_5390', key: 'S10', sourceAbilityId: 5390, learnable: false },
] satisfies HeroSkillDefinition[]
const invokerDefinition = {
  id: 'h066_complex_mage',
  skills: orbSkills,
  supplementalSkills: invokedSkills,
} as HeroDefinition
const invokedIds = getContextualSkillIds(invokerDefinition, {
  skillLevels: { Q: 4, W: 3, E: 5 },
  situation: 'teamfight',
  hpRatio: 0.9,
})
assert.deepEqual(invokedIds, [invokedSkills[2].id, invokedSkills[1].id], 'teamfights should invoke the two best learned recipes')
assert.equal(getSkillRuntimeUnlockRule(invokedSkills[0], 'supplemental'), 'invoked_loadout')
assert.equal(getContextualSkillLevel(invokedSkills[2], { Q: 4, W: 3, E: 5 }), 5, 'invoked spell strength should follow its learned orbs')
const invokedRuntimeKit = getRuntimeHeroSkills(invokerDefinition, new Set(), invokedIds)
assert.ok(invokedRuntimeKit.slice(0, 3).every((skill) => skill.kind === 'passive'), 'orb instances must not enter the generic cast selector')
assert.deepEqual(invokedRuntimeKit.slice(3).map((skill) => skill.id).sort(), [...invokedIds].sort())

const songSkills = [1663, 1664, 1665].map((sourceAbilityId, index) => ({
  ...baseSkill,
  id: `h120_heavy_artillery_commander_standard_${index + 5}_${sourceAbilityId}`,
  key: `S${index + 1}`,
  sourceAbilityId,
  learnable: false,
})) satisfies HeroSkillDefinition[]
const songDefinition = {
  id: 'h120_heavy_artillery_commander',
  skills: [{ ...baseSkill, id: 'song-ultimate', key: 'R', maxLevel: 3 }],
  supplementalSkills: songSkills,
} as HeroDefinition
assert.deepEqual(getContextualSkillIds(songDefinition, {
  skillLevels: { R: 2 },
  situation: 'retreat',
  hpRatio: 0.8,
}), [songSkills[1].id], 'retreat should select the movement song')
assert.deepEqual(getContextualSkillIds(songDefinition, {
  skillLevels: { R: 2 },
  situation: 'teamfight',
  hpRatio: 0.4,
}), [songSkills[2].id], 'low health should select the healing song')
assert.equal(getContextualSkillLevel(songSkills[2], { R: 2 }), 2)

console.log('skillUnlocks tests passed')
