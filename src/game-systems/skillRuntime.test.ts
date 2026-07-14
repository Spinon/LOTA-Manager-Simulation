import assert from 'node:assert/strict'

import type { HeroSkillDefinition } from './heroAttributes.ts'
import { getPrimarySkillUsageSituation, getSkillAiUsageScore, getSkillEffectProfile, isConfirmedGlobalSkill } from './skillRuntime.ts'
import { getOfficialSkillsForHero } from './officialHeroSkillsAdapter.ts'
import { getRuntimeNormalizedSkill } from './skillUnlocks.ts'

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

const namedControlSkill: HeroSkillDefinition = {
  ...skill,
  id: 'test-named-controls',
  tags: ['fear', 'disarm', 'mute'],
  mechanics: ['fear', 'disarm', 'mute'],
  values: {
    duration: 2,
    fearDuration: [1.2, 1.8],
    disarmDuration: [2.4, 3.1],
  },
}
const namedControlProfile = getSkillEffectProfile(namedControlSkill, 2)
assert.equal(namedControlProfile.fearDuration, 1.8)
assert.equal(namedControlProfile.disarmDuration, 3.1)
assert.equal(namedControlProfile.muteDuration, 2, 'named controls without an explicit duration should use the official base duration')

function findOfficialSkill(heroId: string, sourceAbilityId: number) {
  const kit = getOfficialSkillsForHero(heroId)
  const found = [...(kit?.skills ?? []), ...(kit?.supplementalSkills ?? [])]
    .find((candidate) => candidate.sourceAbilityId === sourceAbilityId)
  assert.ok(found, `${heroId} should expose official ability ${sourceAbilityId}`)
  return found
}

const serpentWard = getSkillEffectProfile(findOfficialSkill('h020_hex_warden', 5081), 2)
assert.equal(serpentWard.summonArchetype, 'ward')
assert.equal(serpentWard.summonMode, 'cast')
assert.equal(serpentWard.summonCount, 10)
assert.equal(serpentWard.summonDamage, 85)

const mirrorImage = getSkillEffectProfile(findOfficialSkill('h081_naga_siren', 5467), 1)
assert.equal(mirrorImage.summonArchetype, 'illusion')
assert.equal(mirrorImage.summonCount, 3)
assert.equal(mirrorImage.summonOutgoingDamagePct, 25)
assert.equal(mirrorImage.summonIncomingDamagePct, 350)

const tempestDouble = getSkillEffectProfile(findOfficialSkill('h105_arc_double', 5683), 1)
assert.equal(tempestDouble.summonArchetype, 'clone')
assert.equal(tempestDouble.summonGoldBounty, 70)

const spiritBear = findOfficialSkill('h072_druid_dual', 1342)
assert.equal(spiritBear.kind, 'active', 'castable innate abilities should remain active')
assert.equal(getSkillEffectProfile(spiritBear, 1).summonDuration, 7200)

const eldritchImp = getSkillEffectProfile(findOfficialSkill('h029_soul_warlock', 1274), 1)
assert.equal(eldritchImp.summonMode, 'on_death')
assert.equal(eldritchImp.summonCount, 1)
assert.equal(eldritchImp.summonDuration, 15)
assert.equal(eldritchImp.summonHp, 5)
assert.equal(eldritchImp.summonDamage, 20)
assert.equal(eldritchImp.summonMoveSpeed, 297)

const reincarnation = findOfficialSkill('h034_skeleton_monarch', 5089)
assert.equal(reincarnation.kind, 'passive', 'death-triggered reincarnation must not enter normal cast selection')
assert.equal(getSkillEffectProfile(reincarnation, 2).summonCount, 3)

const spiderlings = getSkillEffectProfile(findOfficialSkill('h053_brood_matriarch', 5279), 1)
assert.equal(spiderlings.summonMode, 'target_death')
assert.equal(spiderlings.summonCount, 4)
assert.equal(spiderlings.summonDuration, 40)
assert.equal(spiderlings.summonTriggerDuration, 20)
assert.equal(spiderlings.summonHp, 325)
assert.equal(spiderlings.summonDamage, 0, 'the injection nuke must not become spiderling basic-attack damage')

const fleshGolem = getSkillEffectProfile(findOfficialSkill('h077_decay_zombie', 5447), 1)
assert.equal(fleshGolem.summonMode, 'on_attack')
assert.equal(fleshGolem.summonCount, 1)
assert.equal(fleshGolem.summonDuration, 15)
assert.equal(fleshGolem.duration, 40)

const hellfireBlast = findOfficialSkill('h034_skeleton_monarch', 5086)
assert.equal(hellfireBlast.tags.includes('summon'), false, 'hero-name tokens must not classify ordinary skills as summons')
const orbitingSpirits = getRuntimeNormalizedSkill(findOfficialSkill('h083_spirit_tether', 5486))
assert.equal(getSkillEffectProfile(orbitingSpirits, 1).summonCount, 0, 'orbiting projectiles are not independent summoned units')

console.log('skillRuntime tests passed')
