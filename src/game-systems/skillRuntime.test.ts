import assert from 'node:assert/strict'

import type { HeroSkillDefinition } from './heroAttributes.ts'
import { getPrimarySkillUsageSituation, getSkillAiUsageScore, getSkillEffectProfile, isConfirmedGlobalSkill } from './skillRuntime.ts'

const skill: HeroSkillDefinition = {
  key: 'Q',
  id: 'test-control-skill',
  name: 'Test Control',
  kind: 'active',
  target: 'area',
  damageType: 'magical',
  sourceTag: 'slow',
  mechanics: ['movement_control'],
  tags: ['slow', 'movement_control'],
  values: {
    damage: [100, 180],
    radius: 420,
    slowPct: [25, 40],
    root: [1.2, 1.8],
    duration: 3,
  },
  aiUsage: {
    laning: 30,
    farming: 10,
    gank: 70,
    teamfight: 90,
    retreat: 20,
    push: 10,
    save: 0,
    objective: 20,
  },
}

const profile = getSkillEffectProfile(skill, 2)
assert.strictEqual(getSkillEffectProfile(skill, 2), profile, 'effect profiles should be cached by skill definition and level')
assert.notStrictEqual(getSkillEffectProfile(skill, 1), profile, 'different skill levels should keep separate cached profiles')
assert.equal(profile.damage, 180)
assert.equal(profile.radius, 3)
assert.equal(profile.slowPct, 0.4)
assert.equal(profile.rootDuration, 1.8)
assert.equal(profile.isArea, true)
assert.equal(getSkillAiUsageScore(skill, 'teamfight'), 90)
assert.equal(getPrimarySkillUsageSituation({ phase: 'mid', aiMode: 'join_fight', macroDecision: 'Lutar em equipe', hpRatio: 0.8 }), 'teamfight')
assert.equal(isConfirmedGlobalSkill({ ...skill, target: 'global' }), false, 'a malformed global target should not become map-wide without global metadata')
assert.equal(isConfirmedGlobalSkill({ ...skill, target: 'global', sourceTag: 'global_nuke', values: { ...skill.values, global: true } }), true)

console.log('skillRuntime tests passed')
