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
  damageEntity,
  getGamePhase,
  getHeroDefinition,
  getEffectiveArcaneDamage,
  getSimpleSkillAffectedTargets,
  getSimpleSkillExecuteMultiplier,
  getSimpleSkillDamage,
  hasTimedEffect,
  healArcaneDirectly,
  isPositiveSimpleSkill,
  loadGameData,
  resolveDeaths,
  simulationFrameSeconds,
  tryCastSimpleSkill,
  tick,
  type Arcane,
  type Camp,
  type Creep,
  type SimulationState,
} from './simulation.ts'
import { getSkillEffectProfile } from '../game-systems/skillRuntime.ts'
import type { HeroSkillDefinition } from '../game-systems/heroAttributes.ts'

function assertFinitePoint(entity: { id: string; pos: { x: number; y: number } }) {
  assert.ok(Number.isFinite(entity.pos.x), `${entity.id} has invalid x`)
  assert.ok(Number.isFinite(entity.pos.y), `${entity.id} has invalid y`)
}

function assertFiniteHealth(entity: { id: string; hp: number; maxHp: number }) {
  assert.ok(Number.isFinite(entity.hp), `${entity.id} has invalid hp`)
  assert.ok(Number.isFinite(entity.maxHp), `${entity.id} has invalid maxHp`)
  assert.ok(entity.maxHp > 0, `${entity.id} must have maxHp`)
}

await loadGameData()

assert.equal(getGamePhase(9 * 60), 'early')
assert.equal(getGamePhase(20 * 60), 'mid')
assert.equal(getGamePhase(29 * 60), 'late')

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
  const cooldownUntil = caster.itemCooldowns[silence.id]
  assert.equal(cooldownUntil, 122, 'official 22-second cooldown should be stored as an absolute game time')
  caster.stats.mana = caster.stats.maxMana
  cooldownState.time = 121.99
  assert.equal(tryCastSimpleSkill(cooldownState, caster, enemy), false, 'skills must not cast before cooldown expires')
  cooldownState.time = cooldownUntil
  assert.equal(tryCastSimpleSkill(cooldownState, caster, enemy), true, 'skills should cast again when cooldown expires')

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
assert.equal(renderFrame.time, state.time, 'render frame should preserve simulation time')
assert.equal(renderFrame.arcanes.length, state.arcanes.length, 'render frame should preserve arcanes')
assert.equal(renderFrame.creeps.length, state.creeps.length, 'render frame should preserve creeps')
assert.equal('pathIndex' in renderFrame.arcanes[0], false, 'render frame should omit arcane pathfinding state')
assert.equal('aggroTargetId' in renderFrame.creeps[0], false, 'render frame should omit creep aggro state')

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
