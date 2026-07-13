import assert from 'node:assert/strict'

import type { HeroDefinition, HeroSkillDefinition } from './heroAttributes.ts'
import { getGrantedSkillLevel, getRuntimeHeroSkills, getSkillRuntimeUnlockRule } from './skillUnlocks.ts'

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

console.log('skillUnlocks tests passed')
