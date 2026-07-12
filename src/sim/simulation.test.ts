import assert from 'node:assert/strict'

import {
  addTimedEffect,
  applySimpleSkillDispel,
  applySimpleSkillDisplacement,
  applySimpleSkillSummonPressure,
  applySimpleNegativeSkillEffects,
  canTargetWithSimpleDamageSkill,
  createInitialState,
  createMatchRenderFrame,
  createMatchStaticData,
  damageEntity,
  enrichTeamPlanWithMapTarget,
  getGamePhase,
  getArcanePassiveCombatModifiers,
  getCampClearAssessment,
  getHeroDefinition,
  getHigherPriorityFarmAlly,
  getCreepXpShare,
  getDenyTarget,
  getEffectiveArcaneDamage,
  getShopItemsForInventory,
  getSimulationEntityIndexes,
  getTeamMatchOutcome,
  getSimpleSkillAffectedTargets,
  getSimpleSkillExecuteMultiplier,
  getSimpleSkillDamage,
  getLastHitTarget,
  getLastHitCandidateFromCreeps,
  getRoleFarmPriority,
  getTowerTankAssessment,
  getTowerTankCandidate,
  hasTimedEffect,
  healArcaneDirectly,
  isPositiveSimpleSkill,
  loadGameData,
  materializeMatchRenderFrame,
  resetDisengagedNeutralCamps,
  resolveDeaths,
  resolveCombat,
  simulationFrameSeconds,
  tryCastSimpleSkill,
  tick,
  updateBoss,
  type Arcane,
  type Camp,
  type Creep,
  type SimulationState,
  type TickFrameContext,
} from './simulation.ts'
import { getSkillEffectProfile } from '../game-systems/skillRuntime.ts'
import type { HeroSkillDefinition } from '../game-systems/heroAttributes.ts'
import { ReplayChunkEncoder, ReplayFrameStore } from './replayStore.ts'

function assertFinitePoint(entity: { id: string; pos: { x: number; y: number } }) {
  assert.ok(Number.isFinite(entity.pos.x), `${entity.id} has invalid x`)
  assert.ok(Number.isFinite(entity.pos.y), `${entity.id} has invalid y`)
}

function assertFiniteHealth(entity: { id: string; hp: number; maxHp: number }) {
  assert.ok(Number.isFinite(entity.hp), `${entity.id} has invalid hp`)
  assert.ok(Number.isFinite(entity.maxHp), `${entity.id} has invalid maxHp`)
  assert.ok(entity.maxHp > 0, `${entity.id} must have maxHp`)
}

function createTickFrameContext(): TickFrameContext {
  return {
    routeCreepTargetCache: { attack: new Map(), vision: new Map() },
    arcaneNearRouteCache: new Map(),
    attackableTowersCache: {},
    attackableStructuresCache: {},
  }
}

await loadGameData()

assert.ok(getRoleFarmPriority('Safe Lane') > getRoleFarmPriority('Mid'))
assert.ok(getRoleFarmPriority('Mid') > getRoleFarmPriority('Offlane'))
assert.ok(getRoleFarmPriority('Offlane') > getRoleFarmPriority('Greedy Support'))
assert.ok(getRoleFarmPriority('Greedy Support') > getRoleFarmPriority('Dedicated Support'))

{
  const neutralState = createInitialState('neutral-ecosystem-test')
  neutralState.time = 1200
  assert.equal(neutralState.camps.length, 16, 'the expanded jungle should contain eight symmetric camp pairs')
  for (const camp of neutralState.camps) {
    const mirrored = neutralState.camps.find((candidate) => (
      candidate.id !== camp.id &&
      candidate.strength === camp.strength &&
      candidate.pos.x === 100 - camp.pos.x &&
      candidate.pos.y === 100 - camp.pos.y
    ))
    assert.ok(mirrored, `${camp.id} should have a symmetric counterpart`)
  }

  const farmer = neutralState.arcanes[0]
  const camp = neutralState.camps.find((candidate) => candidate.strength === 'weak')!
  farmer.stats.hp = farmer.stats.maxHp = 5000
  farmer.stats.damage = farmer.stats.damageMin = farmer.stats.damageMax = 500
  farmer.stats.attackSpeed = 0.5
  assert.equal(getCampClearAssessment(neutralState, farmer, camp).canClear, true, 'a strong healthy core should accept a weak camp')

  farmer.stats.hp = farmer.stats.maxHp = 350
  farmer.stats.damage = farmer.stats.damageMin = farmer.stats.damageMax = 12
  farmer.stats.attackSpeed = 2.5
  const stackedCamp = { ...camp, hp: camp.maxHp * 4, maxHp: camp.maxHp * 4, damage: camp.damage * 2 }
  assert.equal(getCampClearAssessment(neutralState, farmer, stackedCamp).canClear, false, 'a fragile Arcane should reject an unsafe stacked camp')

  const damagedCamp = { ...camp, hp: camp.maxHp / 2, lastDamagedAt: 10, aggroTargetId: farmer.id, aggroUntil: 18 }
  const resetCamp = resetDisengagedNeutralCamps([damagedCamp], 18)[0]
  assert.equal(resetCamp.hp, resetCamp.maxHp, 'a disengaged camp should restore its full current-stack health')
  assert.equal(resetCamp.aggroTargetId, undefined, 'a disengaged camp should clear aggro')

  const resetBoss = updateBoss({ ...neutralState.boss, hp: neutralState.boss.maxHp / 2, lastDamagedAt: 10 }, 22, 0)
  assert.equal(resetBoss.hp, resetBoss.maxHp, 'the Boss should restore full health after disengaging')
  assert.equal(resetBoss.aggroTargetId, undefined, 'the Boss should clear aggro after disengaging')
}

{
  const siegeState = createInitialState('tower-tank-test')
  siegeState.time = 600
  siegeState.creeps = []
  const tierOne = siegeState.towers.find((tower) => tower.team === 'dusk' && tower.tier === 1)!
  const tierTwo = siegeState.towers.find((tower) => tower.team === 'dusk' && tower.tier === 2)!
  tierOne.hp = 600
  tierTwo.hp = 600
  const allies = siegeState.arcanes.filter((arcane) => arcane.team === 'dawn')
  allies.forEach((arcane, index) => {
    arcane.pos = { x: tierOne.pos.x + index * 0.2, y: tierOne.pos.y }
    arcane.stats.hp = arcane.stats.maxHp = 10000
    arcane.stats.damage = arcane.stats.damageMin = arcane.stats.damageMax = 600
    arcane.stats.attackSpeed = 0.5
  })
  const tank = getTowerTankCandidate(siegeState, 'dawn', tierOne)
  assert.ok(tank, 'a sufficiently durable hero should unlock an unprotected no-wave siege')
  assert.equal(getTowerTankAssessment(siegeState, tank!, tierOne).canTank, true)

  allies.forEach((arcane) => { arcane.pos = { ...tierTwo.pos } })
  assert.equal(getTowerTankAssessment(siegeState, allies[0], tierTwo).protectedByBackdoor, true)
  assert.equal(getTowerTankCandidate(siegeState, 'dawn', tierTwo), undefined, 'backdoor must block a no-wave tank siege')
}

{
  const retaliationState = createInitialState('neutral-retaliation-test')
  retaliationState.arcanes.forEach((arcane) => { arcane.pos = { x: 1, y: 1 } })
  const attacker = retaliationState.arcanes[0]
  const camp = retaliationState.camps[0]
  attacker.pos = { x: camp.pos.x + Math.min(7, camp.range + 1.5), y: camp.pos.y }
  const hpBefore = attacker.stats.hp
  damageEntity(retaliationState, camp.id, 1, {
    id: attacker.id,
    label: attacker.player,
    team: attacker.team,
    damageType: 'physical',
  })
  resolveCombat(retaliationState, createTickFrameContext())
  assert.ok(attacker.stats.hp > 0)
  assert.ok(retaliationState.arcanes[0].stats.hp < hpBefore, 'a ranged aggressor inside the leash should receive neutral retaliation')
}

{
  const farmState = createInitialState('farm-priority-test')
  farmState.time = 120
  const carry = farmState.arcanes.find((arcane) => arcane.team === 'dawn' && arcane.role === 'Safe Lane')!
  const support = farmState.arcanes.find((arcane) => arcane.team === 'dawn' && arcane.role === 'Dedicated Support')!
  carry.pos = { x: 40, y: 40 }
  support.pos = { x: 41, y: 40 }
  const creep: Creep = {
    id: 'farm-priority-creep', team: 'dusk', lane: carry.lane, type: 'melee', seedId: 'lane_melee_creep',
    pos: { x: 42, y: 40 }, pathIndex: 0, hp: 1, maxHp: 100, damage: 1, range: 1.5,
    visionRange: 12, goldReward: 40, xpReward: 57, lastAttack: 0,
  }
  assert.equal(getHigherPriorityFarmAlly(farmState, support, creep.pos)?.id, carry.id)
  assert.ok(getCreepXpShare(farmState, creep, carry) > getCreepXpShare(farmState, creep, support), 'lane XP should favor the higher-priority core')
  assert.equal(getLastHitCandidateFromCreeps(farmState, support, [creep], 2), undefined, 'support should yield a last hit to the nearby carry')
  assert.equal(getLastHitCandidateFromCreeps(farmState, carry, [creep], 2)?.id, creep.id)
}

{
  const endState = createInitialState('end-game-target-test')
  endState.towers.forEach((tower) => { if (tower.team === 'dusk') tower.hp = 0 })
  endState.structures.forEach((structure) => { if (structure.team === 'dusk') structure.hp = 0 })
  const plan = enrichTeamPlanWithMapTarget(endState, 'dawn', {
    type: 'end_game', urgency: 90, risk: 20, expectedValue: 160, reasonTags: ['base'],
  })
  assert.equal(plan?.targetId, 'base-dusk', 'end-game plans should explicitly target the unlocked enemy base')
}

{
  const jungleState = createInitialState('jungle-economy-test')
  jungleState.time = 12 * 60
  const carry = jungleState.arcanes.find((arcane) => arcane.team === 'dawn' && arcane.role === 'Safe Lane')!
  const support = jungleState.arcanes.find((arcane) => arcane.team === 'dawn' && arcane.role === 'Dedicated Support')!
  const camp = jungleState.camps[0]
  carry.pos = { ...camp.pos }
  support.pos = { x: camp.pos.x > 50 ? 5 : 95, y: camp.pos.y > 50 ? 5 : 95 }
  camp.hp = 0
  camp.lastHitBy = { id: carry.id, label: carry.player, team: carry.team }
  const carryGoldBefore = carry.stats.gold
  const carryXpBefore = carry.stats.xp
  const supportGoldBefore = support.stats.gold
  const supportXpBefore = support.stats.xp
  resolveDeaths(jungleState)
  const rewardedCarry = jungleState.arcanes.find((arcane) => arcane.id === carry.id)!
  const distantSupport = jungleState.arcanes.find((arcane) => arcane.id === support.id)!
  assert.ok(rewardedCarry.stats.gold > carryGoldBefore && rewardedCarry.stats.xp > carryXpBefore)
  assert.equal(distantSupport.stats.gold, supportGoldBefore, 'neutral gold should not be granted to the whole team')
  assert.equal(distantSupport.stats.xp, supportXpBefore, 'neutral XP should only be shared with nearby allies')
}

assert.equal(getGamePhase(9 * 60), 'early')
assert.equal(getGamePhase(20 * 60), 'mid')
assert.equal(getGamePhase(29 * 60), 'late')
assert.equal(getTeamMatchOutcome(undefined, 'dawn'), 'draw', 'a capped match must not mark either team as defeated')
assert.equal(getTeamMatchOutcome(undefined, 'dusk'), 'draw', 'both teams should draw when there is no winner')
assert.equal(getTeamMatchOutcome('dawn', 'dawn'), 'winner', 'the winning team should be identified')
assert.equal(getTeamMatchOutcome('dawn', 'dusk'), 'loser', 'only the opposing team should be defeated')

const seededA = createInitialState('simulation-smoke-seed')
const seededB = createInitialState('simulation-smoke-seed')
assert.deepEqual(
  seededA.arcanes.map((arcane) => arcane.heroDefinitionId),
  seededB.arcanes.map((arcane) => arcane.heroDefinitionId),
  'same seed should produce the same test roster',
)

const initialState = seededA
let state: SimulationState = initialState

{
  const indexedState = tick(createInitialState('entity-index-regression'), simulationFrameSeconds, true)
  const firstIndexes = getSimulationEntityIndexes(indexedState)
  assert.equal(firstIndexes.arcane.get(indexedState.arcanes[0].id), 0, 'arcane ids should resolve to their live array index')
  assert.equal(firstIndexes.creep.get(indexedState.creeps[0].id), 0, 'creep ids should resolve to their live array index')
  const removedCreepId = indexedState.creeps[0].id
  indexedState.creeps = indexedState.creeps.slice(1)
  const rebuiltIndexes = getSimulationEntityIndexes(indexedState)
  assert.strictEqual(rebuiltIndexes, firstIndexes, 'the reusable index container should survive wave changes')
  assert.equal(rebuiltIndexes.creep.has(removedCreepId), false, 'removed creeps should leave the id index')
  assert.equal(rebuiltIndexes.creep.get(indexedState.creeps[0].id), 0, 'remaining creeps should receive their new array index')

  const inventory = [...indexedState.arcanes[0].items]
  const resolvedItems = getShopItemsForInventory(inventory)
  assert.strictEqual(getShopItemsForInventory(inventory), resolvedItems, 'unchanged inventory arrays should reuse resolved item definitions')
  assert.notStrictEqual(getShopItemsForInventory([...inventory]), resolvedItems, 'a replaced inventory array should invalidate resolved item definitions')
}

{
  const cacheState = createInitialState('passive-cache-seed')
  const arcane = cacheState.arcanes[0]
  arcane.heroDefinitionId = 'h007_sword_tempest'
  arcane.skillLevels = { E: 4 }
  const first = getArcanePassiveCombatModifiers(cacheState, arcane)
  assert.strictEqual(getArcanePassiveCombatModifiers(cacheState, arcane), first, 'passive modifiers should be cached while skill levels keep their identity')
  arcane.skillLevels = { E: 3 }
  assert.notStrictEqual(getArcanePassiveCombatModifiers(cacheState, arcane), first, 'a new skill-level object should invalidate passive modifiers')
}

{
  const telemetryState = createInitialState('telemetry-seed')
  const attacker = telemetryState.arcanes.find((arcane) => arcane.team === 'dawn')!
  const victim = telemetryState.arcanes.find((arcane) => arcane.team === 'dusk')!
  damageEntity(telemetryState, victim.id, 100, { id: attacker.id, label: attacker.player, team: attacker.team, damageType: 'pure' })
  const updatedAttacker = telemetryState.arcanes.find((arcane) => arcane.id === attacker.id)!
  const updatedVictim = telemetryState.arcanes.find((arcane) => arcane.id === victim.id)!
  assert.equal(updatedAttacker.damageDealt, 100, 'applied damage should be recorded for the attacker')
  assert.equal(updatedAttacker.heroDamageDealt, 100, 'hero damage should be recorded separately')
  assert.equal(updatedVictim.damageTaken, 100, 'damage taken should be recorded for the victim')

  const wounded = { ...updatedVictim, stats: { ...updatedVictim.stats, hp: updatedVictim.stats.maxHp - 80 } }
  const healed = healArcaneDirectly(wounded, 120)
  assert.equal(healed.healingDone - wounded.healingDone, 80, 'healing should count only effective recovery')
  assert.equal(healed.healingReceived - wounded.healingReceived, 80, 'self healing should count as received healing')
}

{
  const targetedDamageState = tick(createInitialState('targeted-damage-regression'), simulationFrameSeconds, true)
  const creep = targetedDamageState.creeps[0]
  const source = { id: 'test-environment', label: 'Test', team: creep.team === 'dawn' ? 'dusk' : 'dawn', damageType: 'pure' } as const
  const collectionsBefore = {
    arcanes: targetedDamageState.arcanes,
    creeps: targetedDamageState.creeps,
    towers: targetedDamageState.towers,
    structures: targetedDamageState.structures,
    bases: targetedDamageState.bases,
    camps: targetedDamageState.camps,
  }
  damageEntity(targetedDamageState, creep.id, 10, source)
  assert.notStrictEqual(targetedDamageState.creeps, collectionsBefore.creeps, 'damage should replace the targeted entity collection')
  assert.equal(targetedDamageState.creeps[0].hp, creep.hp - 10, 'targeted creep damage should update the indexed entity')
  assert.strictEqual(targetedDamageState.arcanes, collectionsBefore.arcanes, 'unrelated arcane collections should retain identity')
  assert.strictEqual(targetedDamageState.towers, collectionsBefore.towers, 'unrelated tower collections should retain identity')
  assert.strictEqual(targetedDamageState.structures, collectionsBefore.structures, 'unrelated structure collections should retain identity')
  assert.strictEqual(targetedDamageState.bases, collectionsBefore.bases, 'unrelated base collections should retain identity')
  assert.strictEqual(targetedDamageState.camps, collectionsBefore.camps, 'unrelated camp collections should retain identity')
}

{
  const scheduledState = tick(createInitialState('fixed-attack-schedule'), simulationFrameSeconds, true)
  const tower = scheduledState.towers.find((candidate) => candidate.team === 'dawn')!
  const target = scheduledState.creeps.find((candidate) => candidate.team === 'dusk')!
  tower.lastAttack = -10
  target.pos = { ...tower.pos }
  target.lastAttack = scheduledState.time
  scheduledState.towers = [tower]
  scheduledState.creeps = [target]
  scheduledState.structures = []
  scheduledState.camps = []
  scheduledState.boss.hp = 0
  scheduledState.arcanes = scheduledState.arcanes.map((arcane) => ({ ...arcane, stats: { ...arcane.stats, hp: 0 } }))

  resolveCombat(scheduledState, createTickFrameContext())
  const hpAfterFirstAttack = scheduledState.creeps[0].hp
  const nextAttackAt = tower.lastAttack + 1.2
  assert.equal(nextAttackAt, scheduledState.time + 1.2, 'lastAttack plus cooldown should register the next relevant attack time')
  scheduledState.time += simulationFrameSeconds
  resolveCombat(scheduledState, createTickFrameContext())
  assert.equal(scheduledState.creeps[0].hp, hpAfterFirstAttack, 'fixed attackers must not search or attack before nextAttackAt')
  scheduledState.time = nextAttackAt
  resolveCombat(scheduledState, createTickFrameContext())
  assert.ok(scheduledState.creeps[0].hp < hpAfterFirstAttack, 'fixed attackers should act exactly when their event becomes ready')
}

{
  const priorityState = tick(createInitialState('last-hit-before-deny'), simulationFrameSeconds, true)
  const arcane = priorityState.arcanes.find((candidate) => candidate.team === 'dawn' && candidate.lane === 'top')!
  const enemyCreep = priorityState.creeps.find((candidate) => candidate.team === 'dusk' && candidate.lane === arcane.lane)!
  const alliedCreep = priorityState.creeps.find((candidate) => candidate.team === arcane.team && candidate.lane === arcane.lane)!
  arcane.pos = { x: 50, y: 50 }
  arcane.lastAttack = -10
  arcane.skillLevels = {}
  enemyCreep.pos = { x: 50.2, y: 50 }
  enemyCreep.hp = 1
  alliedCreep.pos = { x: 50.3, y: 50 }
  alliedCreep.hp = 1
  enemyCreep.lastAttack = priorityState.time
  alliedCreep.lastAttack = priorityState.time
  priorityState.arcanes = priorityState.arcanes.map((candidate) => candidate.id === arcane.id
    ? arcane
    : { ...candidate, stats: { ...candidate.stats, hp: 0 } })
  priorityState.creeps = [enemyCreep, alliedCreep]
  priorityState.towers = []
  priorityState.structures = []
  priorityState.camps = []
  priorityState.boss.hp = 0

  assert.equal(getLastHitTarget(priorityState, arcane)?.id, enemyCreep.id, 'the enemy creep should be a valid last-hit target')
  assert.equal(getDenyTarget(priorityState, arcane)?.id, alliedCreep.id, 'the allied creep should be a valid deny target')
  resolveCombat(priorityState, createTickFrameContext())
  assert.equal(priorityState.creeps[0].hp, 0, 'last hit must execute before deny when both are available')
  assert.equal(priorityState.creeps[1].hp, 1, 'the deny target must remain untouched while a last hit is available')
}

{
  const cooldownState = createInitialState('skill-cooldown-regression')
  const caster = cooldownState.arcanes.find((arcane) => arcane.team === 'dawn')!
  const enemy = cooldownState.arcanes.find((arcane) => arcane.team === 'dusk')!
  caster.heroDefinitionId = 'h067_silence_warden'
  caster.skillLevels = { Q: 1 }
  caster.stats.mana = caster.stats.maxMana
  caster.pos = { x: 50, y: 50 }
  enemy.pos = { x: 51, y: 50 }
  enemy.stats.hp = enemy.stats.maxHp * 0.5
  cooldownState.time = 100

  assert.equal(tryCastSimpleSkill(cooldownState, caster, enemy), true, 'ready skills should cast')
  const silence = getHeroDefinition(caster.heroDefinitionId).skills!.find((skill) => skill.key === 'Q')!
  const liveCaster = cooldownState.arcanes.find((arcane) => arcane.id === caster.id)!
  const liveEnemy = cooldownState.arcanes.find((arcane) => arcane.id === enemy.id)!
  const cooldownUntil = liveCaster.itemCooldowns[silence.id]
  assert.equal(cooldownUntil, 122, 'official 22-second cooldown should be stored as an absolute game time')
  assert.ok(liveCaster.stats.mana < liveCaster.stats.maxMana, 'mana cost should persist on the live caster after damage replaces state entities')
  liveCaster.stats.mana = liveCaster.stats.maxMana
  cooldownState.time = 121.99
  assert.equal(tryCastSimpleSkill(cooldownState, liveCaster, liveEnemy), false, 'skills must not cast before cooldown expires')
  cooldownState.time = cooldownUntil
  assert.equal(tryCastSimpleSkill(cooldownState, liveCaster, liveEnemy), true, 'skills should cast again when cooldown expires')

  const globalSilence = getHeroDefinition(caster.heroDefinitionId).skills!.find((skill) => skill.key === 'R')!
  assert.equal(getSimpleSkillDamage(caster, globalSilence, 1), 0, 'global silence is control and should not damage every enemy')
}

{
  const killState = createInitialState('skill-kill-attribution-seed')
  const attacker = killState.arcanes.find((arcane) => arcane.team === 'dawn')!
  const victim = killState.arcanes.find((arcane) => arcane.team === 'dusk')!
  damageEntity(killState, victim.id, victim.stats.maxHp * 5, {
    id: `${attacker.id}-test-skill`,
    label: `${attacker.player}: Test Skill`,
    team: attacker.team,
    damageType: 'pure',
  })
  resolveDeaths(killState)
  const creditedAttacker = killState.arcanes.find((arcane) => arcane.id === attacker.id)!
  assert.equal(killState.kills.dawn, 1, 'skill kills should count for the caster team')
  assert.equal(creditedAttacker.kills, 1, 'skill kills should count for the caster KDA')
}

{
  const structureState = createInitialState('structure-pacing-seed')
  const attacker = structureState.arcanes.find((arcane) => arcane.team === 'dawn')!
  const tower = structureState.towers.find((candidate) => candidate.team === 'dusk' && candidate.tier === 1)!
  const skill = (getHeroDefinition(attacker.heroDefinitionId).skills ?? []).find((candidate) => candidate.kind !== 'passive')
  assert.ok(skill, 'test hero should have an active skill')
  assert.equal(
    canTargetWithSimpleDamageSkill(attacker, skill, tower),
    false,
    'ordinary hero skills should not target structures',
  )

  const hpBefore = tower.hp
  damageEntity(structureState, tower.id, 100, {
    id: attacker.id,
    label: attacker.player,
    team: attacker.team,
    damageType: 'pure',
  })
  const damagedTower = structureState.towers.find((candidate) => candidate.id === tower.id)!
  assert.equal(hpBefore - damagedTower.hp, 25, 'early hero attacks should respect both source and structure timing reductions')
}

{
  const skillState = createInitialState('skill-runtime-seed')
  const caster = skillState.arcanes.find((arcane) => arcane.team === 'dawn')!
  const enemies = skillState.arcanes.filter((arcane) => arcane.team === 'dusk')
  enemies.forEach((enemy, index) => {
    enemy.pos = { x: 50 + index * 0.25, y: 50 }
  })
  caster.pos = { x: 48, y: 50 }
  const areaRoot: HeroSkillDefinition = {
    key: 'Q',
    id: 'area-root-test',
    name: 'Area Root',
    kind: 'active',
    target: 'area',
    damageType: 'magical',
    sourceTag: 'root',
    mechanics: ['movement_control'],
    tags: ['root', 'movement_control'],
    values: { damage: 100, radius: 420, root: 1.8, duration: 2 },
  }
  const profile = getSkillEffectProfile(areaRoot, 1)
  const affected = getSimpleSkillAffectedTargets(skillState, caster, areaRoot, profile, enemies[0])
  assert.equal(affected.length, enemies.length, 'area skills should resolve every enemy inside their radius')
  applySimpleNegativeSkillEffects(skillState, caster, areaRoot, 1, enemies[0])
  assert.equal(hasTimedEffect(skillState, enemies[0].id, 'root'), true, 'root skills should apply the root control state')
  assert.equal(isPositiveSimpleSkill({ ...areaRoot, damageType: 'none', tags: ['global_heal'] }), true, 'compound heal tags should target allies')
  assert.equal(isPositiveSimpleSkill({ ...areaRoot, damageType: 'none', tags: ['anti_heal'] }), false, 'anti-heal must not be misclassified as healing')

  skillState.arcanes.filter((arcane) => arcane.team === caster.team).forEach((ally) => { ally.pos = { x: 48, y: 50 } })
  enemies.forEach((enemy, index) => { enemy.pos = index === 0 ? { x: 51, y: 50 } : { x: 90, y: 10 + index } })
  const globalNuke = { ...areaRoot, target: 'global' as const, sourceTag: 'global_nuke', values: { ...areaRoot.values, global: true } }
  const globalTargets = getSimpleSkillAffectedTargets(skillState, caster, globalNuke, getSkillEffectProfile(globalNuke, 1), enemies[0])
  assert.deepEqual(globalTargets.map((target) => target.id), [enemies[0].id], 'damaging global skills should only affect enemies visible to the caster team')

  const displacedEnemy = enemies[1]
  displacedEnemy.pos = { x: 55, y: 50 }
  const distanceBeforePull = Math.abs(displacedEnemy.pos.x - caster.pos.x)
  applySimpleSkillDisplacement(caster, displacedEnemy, { ...areaRoot, tags: ['hook'] }, 2)
  assert.ok(Math.abs(displacedEnemy.pos.x - caster.pos.x) < distanceBeforePull, 'hook skills should pull enemies toward the caster')

  displacedEnemy.stats.hp = displacedEnemy.stats.maxHp * 0.25
  assert.ok(getSimpleSkillExecuteMultiplier(displacedEnemy, 3) > 1, 'execute skills should amplify damage against low-health targets')

  addTimedEffect(skillState, displacedEnemy, {
    sourceId: 'test-positive-effect',
    sourceName: 'Test Buff',
    sourceTeam: displacedEnemy.team,
    kind: 'buff',
    polarity: 'positive',
    value: 1,
    duration: 10,
  })
  const removedBuffs = applySimpleSkillDispel(skillState, { ...areaRoot, tags: ['purge'] }, displacedEnemy, 'positive')
  assert.equal(removedBuffs, 1, 'purge skills should remove dispellable enemy buffs')

  applySimpleSkillSummonPressure(skillState, caster, areaRoot, { ...profile, summonCount: 3, summonDuration: 20 })
  assert.ok(
    skillState.timedEffects.some((effect) => effect.targetId === caster.id && effect.sourceId.endsWith('-summons')),
    'summon skills should add temporary combat pressure without spawning extra simulation entities',
  )

  const passiveCarrier = skillState.arcanes[0]
  passiveCarrier.heroDefinitionId = 'h007_sword_tempest'
  passiveCarrier.skillLevels = { E: 4 }
  const passiveDamage = getEffectiveArcaneDamage(skillState, passiveCarrier)
  assert.ok(passiveDamage > passiveCarrier.stats.damage, 'leveled passive skills should modify continuous combat stats')
}

for (let step = 0; step < 600; step += 1) {
  state = tick(state, simulationFrameSeconds, step % 30 === 0)
}

assert.ok(state.time > initialState.time, 'simulation time should advance')
assert.ok(state.creeps.length > 0, 'lane creeps should spawn')
assert.ok(state.arcanes.some((arcane) => arcane.stats.hp > 0), 'at least one arcane should be alive')

const renderFrame = createMatchRenderFrame(state)
const motionFrame = createMatchRenderFrame(state, false)
const hydratedFrame = materializeMatchRenderFrame(motionFrame, createMatchStaticData(state), renderFrame.details)
assert.equal(renderFrame.time, state.time, 'render frame should preserve simulation time')
assert.equal(renderFrame.arcanes.length, state.arcanes.length, 'render frame should preserve arcanes')
assert.equal(renderFrame.creeps.length, state.creeps.length, 'render frame should preserve creeps')
assert.equal('pathIndex' in renderFrame.arcanes[0], false, 'render frame should omit arcane pathfinding state')
assert.equal('aggroTargetId' in renderFrame.creeps[0], false, 'render frame should omit creep aggro state')
assert.equal(motionFrame.details, undefined, 'motion frames should omit repeated inspector details')
assert.equal(hydratedFrame.arcanes[0].id, state.arcanes[0].id, 'hydration should restore static arcane identity')
assert.ok(Math.abs(hydratedFrame.arcanes[0].stats.hp - state.arcanes[0].stats.hp) <= 0.001, 'hydration should preserve dynamic arcane health')
assert.ok(JSON.stringify(motionFrame).length < JSON.stringify(state).length * 0.35, 'motion frame should be substantially smaller than simulation state')

const replayEncoder = new ReplayChunkEncoder()
const replayStore = new ReplayFrameStore()
const detailChunk = replayEncoder.encode([renderFrame])
const nextMotionFrame = { ...motionFrame, time: motionFrame.time + 0.2 }
const motionChunk = replayEncoder.encode([nextMotionFrame])
replayStore.appendChunk(detailChunk)
replayStore.appendChunk(motionChunk)
const normalizeFrame = <T>(frame: T) => JSON.parse(JSON.stringify(frame)) as T
assert.equal(motionChunk.dictionaryAdditions.length, 0, 'creep id dictionary should be shared across replay chunks')
assert.deepEqual(normalizeFrame(replayStore.get(0)), normalizeFrame(renderFrame), 'binary replay should preserve complete render frames')
assert.deepEqual(normalizeFrame(replayStore.get(1)), normalizeFrame(nextMotionFrame), 'binary replay should preserve compact motion frames')
assert.equal(replayStore.findIndexAtOrBefore(nextMotionFrame.time - 0.01), 0, 'replay seek should select the preceding frame')
assert.deepEqual(
  normalizeFrame({ ...renderFrame, details: replayStore.findDetailsAtOrBefore(1) }).details,
  normalizeFrame(renderFrame).details,
  'motion frames should reuse the latest inspector details',
)
assert.ok(replayStore.estimatedByteLength > 0, 'binary replay should report its retained byte size')

for (const arcane of state.arcanes as Arcane[]) {
  assertFinitePoint(arcane)
  assertFiniteHealth({ id: arcane.id, hp: arcane.stats.hp, maxHp: arcane.stats.maxHp })
  assert.ok(Number.isFinite(arcane.stats.mana), `${arcane.id} has invalid mana`)
}

for (const creep of state.creeps as Creep[]) {
  assertFinitePoint(creep)
  assertFiniteHealth(creep)
}

for (const camp of state.camps as Camp[]) {
  assertFinitePoint(camp)
  assertFiniteHealth(camp)
}

assertFinitePoint(state.boss)
assertFiniteHealth(state.boss)

console.log('simulation smoke tests passed')
