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

const spiritLanceIllusion = getSkillEffectProfile(findOfficialSkill('h011_illusion_lancer', 5065), 1)
assert.equal(spiritLanceIllusion.summonArchetype, 'illusion')
assert.equal(spiritLanceIllusion.summonCount, 1)
assert.equal(spiritLanceIllusion.summonDuration, 3.5)
assert.equal(spiritLanceIllusion.summonOutgoingDamagePct, 15)
assert.equal(spiritLanceIllusion.summonIncomingDamagePct, 400)

const doppelwalkIllusion = getSkillEffectProfile(findOfficialSkill('h011_illusion_lancer', 5066), 1)
assert.equal(doppelwalkIllusion.summonArchetype, 'illusion')
assert.equal(doppelwalkIllusion.summonCount, 1, 'the zero-damage decoy remains abstract while the attacking Doppelwalk illusion materializes')
assert.equal(doppelwalkIllusion.summonDuration, 8)
assert.equal(doppelwalkIllusion.summonOutgoingDamagePct, 20)
assert.equal(doppelwalkIllusion.summonIncomingDamagePct, 600)

const conjureImage = getSkillEffectProfile(findOfficialSkill('h101_demon_metamorph', 5620), 4)
assert.equal(conjureImage.summonArchetype, 'illusion')
assert.equal(conjureImage.summonCount, 1)
assert.equal(conjureImage.summonDuration, 34)
assert.equal(conjureImage.summonOutgoingDamagePct, 40)
assert.equal(conjureImage.summonIncomingDamagePct, 250)

const juxtapose = getSkillEffectProfile(findOfficialSkill('h011_illusion_lancer', 5067), 3)
assert.equal(juxtapose.summonMode, 'on_attack')
assert.equal(juxtapose.summonMaxCount, 10)
assert.equal(juxtapose.summonProcChancePct, 50)
assert.equal(juxtapose.summonSecondaryProcChancePct, 9)
assert.equal(juxtapose.summonSecondaryDuration, 4)
assert.equal(juxtapose.summonOutgoingDamagePct, 15)
assert.equal(juxtapose.summonIncomingDamagePct, 600)

const reflection = getSkillEffectProfile(findOfficialSkill('h101_demon_metamorph', 5619), 4)
assert.equal(reflection.summonCopySource, 'target')
assert.equal(reflection.summonTargetScope, 'affected_enemies')
assert.equal(reflection.summonLocksTarget, true)
assert.equal(reflection.summonExpiresWithTarget, true)
assert.equal(reflection.summonUntargetable, true)
assert.equal(reflection.summonDuration, 5)
assert.equal(reflection.summonOutgoingDamagePct, 75)
assert.ok(Math.abs(reflection.radius - 400 / 140) < 0.001)

const hauntSkill = findOfficialSkill('h059_specter_global', 5337)
const haunt = getSkillEffectProfile(hauntSkill, 3)
assert.equal(haunt.summonTargetScope, 'all_enemies')
assert.equal(haunt.summonOutgoingDamagePct, 70)
assert.equal(haunt.summonIncomingDamagePct, 200)
assert.equal(haunt.fearDuration, 0, 'Scepter-only zero fear data must not add control to base Haunt')
assert.deepEqual(hauntSkill.values.realityFearDuration, [2])
assert.deepEqual(hauntSkill.values.realityFearRadius, [400])
assert.deepEqual(hauntSkill.values.realityFearSlowPct, [50])

const disruption = getSkillEffectProfile(findOfficialSkill('h071_shadow_demon', 5421), 4)
assert.equal(disruption.summonCount, 2)
assert.equal(disruption.summonTargetScope, 'primary')
assert.equal(disruption.summonDelay, 2.75)
assert.equal(disruption.summonFlatDamage, 65)
assert.equal(disruption.summonDuration, 14)

const darkPortrait = getSkillEffectProfile(findOfficialSkill('h109_ink_warlock', 7852), 1)
assert.equal(darkPortrait.summonCopySource, 'target')
assert.equal(darkPortrait.summonOutgoingDamagePct, 125)
assert.equal(darkPortrait.summonIncomingDamagePct, 275)
assert.equal(darkPortrait.summonMoveSpeedPct, 0.3)

const tempestDouble = getSkillEffectProfile(findOfficialSkill('h105_arc_double', 5683), 1)
assert.equal(tempestDouble.summonArchetype, 'clone')
assert.equal(tempestDouble.summonGoldBounty, 70)

const spiritBear = findOfficialSkill('h072_druid_dual', 1342)
assert.equal(spiritBear.kind, 'active', 'castable innate abilities should remain active')
const spiritBearProfile = getSkillEffectProfile(spiritBear, 1)
assert.equal(spiritBearProfile.summonDuration, 7200)
assert.equal(spiritBearProfile.summonUnitSeedId, 'summon_spirit_bear')
assert.equal(spiritBearProfile.summonRegen, 1.5)
assert.equal(spiritBearProfile.summonLeashRange, 1100)
assert.equal(spiritBearProfile.summonBacklashPct, 0.2)

const spiritLink = getSkillEffectProfile(findOfficialSkill('h072_druid_dual', 7309), 2)
assert.equal(spiritLink.moveSpeedPct, 0.2)
assert.equal(spiritLink.linkedSummonMoveSpeedPct, 0.4)
assert.equal(spiritLink.lifestealPct, 0.3)
assert.equal(spiritLink.linkedLifestealPct, 0.3)

const savageRoar = getSkillEffectProfile(findOfficialSkill('h072_druid_dual', 5414), 2)
assert.equal(savageRoar.fearDuration, 1.4)

const graveChill = getSkillEffectProfile(findOfficialSkill('h084_gargoyle_brood', 5480), 3)
assert.equal(graveChill.duration, 5)
assert.equal(graveChill.moveSpeedPct, 0.24)
assert.equal(graveChill.attackSpeedPct, 0.55)

const gravekeepersCloak = getSkillEffectProfile(findOfficialSkill('h084_gargoyle_brood', 5482), 4)
assert.equal(gravekeepersCloak.cloakMaxLayers, 4)
assert.equal(gravekeepersCloak.cloakDamageReductionPct, 0.2)
assert.equal(gravekeepersCloak.cloakRecoveryTime, 4)
assert.equal(gravekeepersCloak.cloakMinimumDamage, 40)

const tombstone = getSkillEffectProfile(findOfficialSkill('h077_decay_zombie', 5444), 1)
assert.equal(tombstone.summonSpawnInterval, 4)
assert.equal(tombstone.summonChildDamage, 34)
assert.equal(tombstone.summonChildHits, 2)
assert.equal(tombstone.summonEffectRadius, 1200)

const deathWard = getSkillEffectProfile(findOfficialSkill('h023_witch_shaman', 5141), 1)
assert.equal(deathWard.summonScepterBounceRadius, 575)
assert.equal(deathWard.summonScepterLifestealPct, 0.1)

const familiars = getSkillEffectProfile(findOfficialSkill('h084_gargoyle_brood', 5483), 1)
assert.equal(familiars.summonUnitSeedId, 'summon_stone_familiar')
assert.equal(familiars.summonReturnDistance, 1200)
assert.equal(familiars.summonRecallDuration, 4)

const eldritchImp = getSkillEffectProfile(findOfficialSkill('h029_soul_warlock', 1274), 1)
assert.equal(eldritchImp.summonMode, 'on_death')
assert.equal(eldritchImp.summonCount, 1)
assert.equal(eldritchImp.summonDuration, 15)
assert.equal(eldritchImp.summonHp, 5)
assert.equal(eldritchImp.summonDamage, 20)
assert.equal(eldritchImp.summonMoveSpeed, 297)
assert.equal(eldritchImp.summonEffectRadius, 400)

const reincarnation = findOfficialSkill('h034_skeleton_monarch', 5089)
assert.equal(reincarnation.kind, 'passive', 'death-triggered reincarnation must not enter normal cast selection')
const reincarnationProfile = getSkillEffectProfile(reincarnation, 2)
assert.equal(reincarnationProfile.summonCount, 3)
assert.equal(reincarnationProfile.summonTriggerRadius, 600)
assert.equal(reincarnationProfile.summonTriggerSlowPct, 0.75)
assert.equal(reincarnationProfile.summonTriggerSlowDuration, 4)

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
