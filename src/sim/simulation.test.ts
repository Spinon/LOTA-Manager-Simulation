import assert from 'node:assert/strict'

import {
  addTimedEffect,
  applySimpleSkillDispel,
  applySimpleSkillDisplacement,
  applySimpleSkillCastSummons,
  applySimpleSkillSummonPressure,
  applySummonAttackSpecials,
  applySimpleNegativeSkillEffects,
  buildArcaneStats,
  buyItemAtBase,
  canTargetWithSimpleDamageSkill,
  castSimpleSkill,
  collectTacticalCreepActivations,
  collectTacticalArcaneTravelActivations,
  canUseArcaneKinematicFastPath,
  createArcaneTravelPlanIfUseful,
  createInitialState,
  creepTacticalActivationMargin,
  createMatchRenderFrame,
  createMatchStaticData,
  damageEntity,
  distance,
  enrichTeamPlanWithMapTarget,
  formatMatchTime,
  getGamePhase,
  getAnalyzedGameState,
  getCombatCriticalEventSignature,
  getCombatFocusAssessment,
  getCombatStagingPoint,
  getCombatTargetTowerExposure,
  getBountyRuneSide,
  getBulwarkPhysicalDamageMultiplier,
  getArcaneFacingAfterMovement,
  getArcanePassiveCombatModifiers,
  getArcaneAbilityUpgradeSlots,
  getArcaneDefinitionVisionRange,
  getArcaneRuntimeSkills,
  getCampClearAssessment,
  getHeroDefinition,
  getItemPurchasePlan,
  getShopCandidatePool,
  getPlayerAiProfile,
  getPlayerMentalState,
  getPregameBountyRunePlan,
  getPregameRuneContestAssessment,
  getJungleStackChance,
  getHigherPriorityFarmAlly,
  getCreepXpShare,
  getCreepSpatialGrid,
  getDenyTarget,
  getDenyCandidateFromCreeps,
  getEffectiveArcaneAttackCooldown,
  getEffectiveArcaneArmor,
  getEffectiveArcaneDamage,
  getEffectiveArcaneMagicResistance,
  getEffectiveArcaneMoveSpeed,
  getEffectiveSummonAttackInterval,
  getEffectiveSummonMoveSpeed,
  getCloneInheritedAttackDamage,
  getIllusionInheritedAttackDamage,
  getHauntRealityCandidate,
  getShopItemsForInventory,
  getSimulationEntityIndexes,
  getSummonAttackDamage,
  getSummonAuraMultiplier,
  getSummonInheritancePolicy,
  getSummonInheritedItemEffects,
  getTeamMatchOutcome,
  getTempestDoubleAccuracyPct,
  getTempestDoubleAllowedActiveItems,
  getSimpleSkillAffectedTargets,
  getSimpleSkillExecuteMultiplier,
  getSimpleSkillImmunityProfile,
  getSimpleSkillDamage,
  getSimpleSkillLevel,
  getLastHitTarget,
  getLastHitCandidateFromCreeps,
  getLanePullCamp,
  getLanePullPlan,
  getEnemyPullContestPlan,
  getActivePullCampForCreep,
  getBestTeleportTarget,
  getRangedCreepSkillSecureTarget,
  getRetainedArcaneCombatTarget,
  getRouteCreepTarget,
  getSimpleSkillRange,
  getRoleFarmPriority,
  getRoleGpmTarget,
  grantRingmasterSouvenir,
  getArcaneEconomyNeed,
  getArcaneCoordinationReliability,
  getTowerTankAssessment,
  getTowerTankCandidate,
  hasTimedEffect,
  honorsCombatReservations,
  healArcaneDirectly,
  isPositiveSimpleSkill,
  isArcaneAttackDisabled,
  isArcaneBanished,
  isArcaneDebuffImmune,
  isArcaneInFowlPlay,
  isArcaneInvulnerable,
  isArcaneMovementDisabled,
  isArcaneSilenced,
  isArcaneTargetable,
  isSummonActive,
  isSummonTargetable,
  isCreepRouteTargetValid,
  isUltimateSkill,
  isTempestDoubleInventoryItemAllowed,
  isTempestDoubleItemActiveAllowed,
  isPointVisibleToTeam,
  isPersistentSpatialGrid,
  loadGameData,
  materializeMatchRenderFrame,
  matchPreparationStartSeconds,
  resetDisengagedNeutralCamps,
  respawnArcaneIfReady,
  runeSpawnPoints,
  processJungleStacks,
  processTimedEffects,
  performArcaneBasicAttack,
  queryCreepSpatialGrid,
  resolveDeaths,
  resolveCombat,
  resolveIncomingArcaneDamage,
  resolveSummonItemAttackEffects,
  resolveSimpleSkillEffects,
  resolveCompletedChannels,
  simulationFrameSeconds,
  spawnWave,
  startTeleportIfUseful,
  shopCatalog,
  tryCastSimpleSkill,
  tryUseHauntReality,
  tryUseTempestDoubleSkill,
  tryUseTempestDoubleItem,
  tryCastRangedCreepSecureSkill,
  triggerOnAttackSummons,
  tick,
  updateCreepMovement,
  updateCreepsForTick,
  updateArcaneMovement,
  updateArcaneKinematics,
  updateCombatAiFoundation,
  updateBoss,
  updateSummonedUnits,
  type Arcane,
  type Camp,
  type Creep,
  type SimulationState,
  type TickFrameContext,
} from './simulation.ts'
import { createCreepMotionPlan, sampleCreepMotionPlan } from './creepMotionPlans.ts'
import { sampleArcaneTravelPlan, scheduleArcaneTravelPlan } from './arcaneTravelPlans.ts'
import { getSkillEffectProfile } from '../game-systems/skillRuntime.ts'
import { ReplayChunkEncoder, ReplayFrameStore } from './replayStore.ts'
import { parentSkillStateKey, ringmasterSouvenirAbilityIds, ringmasterSouvenirStateKey } from '../game-systems/skillUnlocks.ts'
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

function createTickFrameContext(): TickFrameContext {
  return {
    routeCreepTargetCache: { attack: new Map(), vision: new Map() },
    creepSpatialQueryBuffer: [],
    creepSpatialIdBuffer: [],
    arcaneNearRouteCache: new Map(),
    attackableTowersCache: {},
    attackableStructuresCache: {},
  }
}

function createStateAtGameStart(seed: string) {
  const state = createInitialState(seed)
  state.time = -simulationFrameSeconds
  return tick(state, simulationFrameSeconds, true)
}

await loadGameData()

{
  const unlockState = createInitialState('skill-upgrade-unlock-test')
  const arcane = unlockState.arcanes[0]
  const scepterName = shopCatalog.find((item) => item.id === 'i135_grand_spell_scepter')!.name
  const shardName = shopCatalog.find((item) => item.id === 'i136_spell_shard')!.name
  arcane.heroDefinitionId = 'h076_brute_mage'
  arcane.stats.level = 18
  arcane.items = []
  const definition = getHeroDefinition(arcane.heroDefinitionId)
  const scepterSkill = definition.supplementalSkills!.find((skill) => skill.category === 'scepter_granted')!
  const shardSkill = definition.supplementalSkills!.find((skill) => skill.category === 'shard_granted')!
  const upgradeCandidateIds = getShopCandidatePool(arcane).map((item) => item.id)
  assert.ok(upgradeCandidateIds.indexOf('i136_spell_shard') >= 0 && upgradeCandidateIds.indexOf('i136_spell_shard') <= 3, 'Shard should enter the build after the first core items')
  assert.ok(upgradeCandidateIds.indexOf('i135_grand_spell_scepter') >= 0 && upgradeCandidateIds.indexOf('i135_grand_spell_scepter') <= 5, 'Scepter should enter the build before inventory completion')

  assert.equal(getArcaneRuntimeSkills(arcane).includes(scepterSkill), false, 'Scepter skills should remain locked without the upgrade item')
  assert.equal(getSimpleSkillLevel(arcane, scepterSkill), 0, 'locked granted skills should have no runtime level')
  arcane.items = [scepterName]
  assert.deepEqual([...getArcaneAbilityUpgradeSlots(arcane)], ['scepter'])
  assert.equal(getArcaneRuntimeSkills(arcane).includes(scepterSkill), true, 'the item upgradeSlot should unlock Scepter-granted skills')
  assert.equal(getSimpleSkillLevel(arcane, scepterSkill), 1, 'single-level granted skills should become immediately usable')
  unlockState.time = 600
  const enemy = unlockState.arcanes.find((candidate) => candidate.team !== arcane.team)!
  arcane.skillLevels = {}
  arcane.stats.maxMana = 1_000
  arcane.stats.mana = 1_000
  arcane.stats.maxHp = 2_000
  arcane.stats.hp = 2_000
  arcane.pos = { x: 50, y: 50 }
  enemy.pos = { x: 51, y: 50 }
  enemy.stats.hp = enemy.stats.maxHp * 0.2
  assert.equal(tryCastSimpleSkill(unlockState, arcane, enemy), true, 'the AI skill selector should cast an unlocked granted skill')
  assert.equal(arcane.stats.mana, 600, 'the granted skill should spend its official mana cost')
  assert.equal(hasTimedEffect(unlockState, enemy.id, 'stun'), true, 'the granted skill should execute its normalized runtime effect')
  assert.equal(arcane.itemCooldowns[scepterSkill.id], 607, 'the granted skill should use its official cooldown')

  arcane.items = [shardName]
  assert.deepEqual([...getArcaneAbilityUpgradeSlots(arcane)], ['shard'])
  assert.equal(getArcaneRuntimeSkills(arcane).includes(shardSkill), true, 'the item upgradeSlot should unlock Shard-granted skills')
  assert.equal(getSimpleSkillLevel(arcane, scepterSkill), 0, 'selling the Scepter should remove its granted skill')

  arcane.heroDefinitionId = 'h066_complex_mage'
  arcane.items = [scepterName, shardName]
  assert.equal(
    getArcaneRuntimeSkills(arcane).some((skill) => skill.key.startsWith('S')),
    false,
    'contextual invoked skills must not be unlocked merely by owning both upgrade items',
  )
}

{
  const contextualState = createInitialState('contextual-skill-runtime-test')
  contextualState.time = 10 * 60
  const invoker = contextualState.arcanes[0]
  const enemy = contextualState.arcanes.find((candidate) => candidate.team !== invoker.team)!
  invoker.heroDefinitionId = 'h066_complex_mage'
  invoker.stats.level = 12
  invoker.stats.mana = 1_000
  invoker.stats.maxMana = 1_000
  invoker.skillLevels = { Q: 4, W: 4, E: 5 }
  invoker.aiMode = 'join_fight'
  invoker.macroDecision = 'Lutar em equipe'
  invoker.pos = { x: 50, y: 50 }
  enemy.pos = { x: 52, y: 50 }
  contextualState.arcanes.forEach((candidate) => {
    if (candidate.team !== invoker.team && candidate.id !== enemy.id) candidate.stats.hp = 0
  })

  const teamfightKit = getArcaneRuntimeSkills(invoker)
  const invokedSkills = teamfightKit.filter((skill) => skill.key.startsWith('S'))
  assert.equal(invokedSkills.length, 2, 'the complex mage should expose at most two invoked spells')
  assert.ok(teamfightKit.filter((skill) => ['Q', 'W', 'E'].includes(skill.key)).every((skill) => skill.kind === 'passive'), 'orbs should not be cast as generic attacks')
  assert.ok(invokedSkills.every((skill) => getSimpleSkillLevel(invoker, skill) >= 4), 'invoked spells should scale from learned orb levels')
  const manaBeforeInvoke = invoker.stats.mana
  assert.equal(tryCastSimpleSkill(contextualState, invoker, enemy), true, 'the AI should cast a selected invoked spell')
  assert.ok(invoker.stats.mana < manaBeforeInvoke, 'invoked spells should spend their official mana cost')
  assert.ok(invokedSkills.some((skill) => (invoker.itemCooldowns[skill.id] ?? 0) > contextualState.time), 'the invoked spell should enter its own official cooldown')

  invoker.aiMode = 'retreat'
  invoker.macroDecision = 'Recuar para seguranca'
  const retreatIds = getArcaneRuntimeSkills(invoker).filter((skill) => skill.key.startsWith('S')).map((skill) => skill.id)
  assert.notDeepEqual(retreatIds.sort(), invokedSkills.map((skill) => skill.id).sort(), 'retreat should prepare a different invoked loadout')

  const singer = contextualState.arcanes.find((candidate) => candidate.team === invoker.team && candidate.id !== invoker.id)!
  singer.heroDefinitionId = 'h120_heavy_artillery_commander'
  singer.stats.level = 12
  singer.stats.maxHp = 2_000
  singer.stats.hp = 700
  singer.stats.maxMana = 1_000
  singer.stats.mana = 1_000
  singer.skillLevels = { R: 2 }
  singer.aiMode = 'join_fight'
  singer.macroDecision = 'Lutar em equipe'
  singer.pos = { x: 50, y: 51 }
  const song = getArcaneRuntimeSkills(singer).find((skill) => skill.sourceAbilityId === 1665)!
  assert.ok(song, 'low health should select the healing song')
  assert.equal(getSimpleSkillLevel(singer, song), 2, 'song level should mirror the learned ultimate')
  const hpBeforeSong = singer.stats.hp
  const manaBeforeSong = singer.stats.mana
  assert.equal(tryCastSimpleSkill(contextualState, singer, enemy), true, 'the selected song should be usable by the AI')
  assert.ok(singer.stats.hp > hpBeforeSong, 'the healing song should apply its imported heal value')
  assert.equal(singer.stats.mana, manaBeforeSong - 35, 'the level-two song should spend its official mana cost')

  const trickster = contextualState.arcanes.find((candidate) => candidate.team === invoker.team && candidate.id !== invoker.id && candidate.id !== singer.id)!
  trickster.heroDefinitionId = 'h106_monkey_warrior'
  trickster.skillLevels = { Q: 1 }
  trickster.aiMode = 'farm_lane'
  trickster.macroDecision = 'Farmar rota'
  assert.equal(getArcaneRuntimeSkills(trickster).some((skill) => skill.sourceAbilityId === 1627), false)
  trickster.aiMode = 'retreat'
  trickster.macroDecision = 'Recuar'
  const disguise = getArcaneRuntimeSkills(trickster).find((skill) => skill.sourceAbilityId === 1627)!
  assert.ok(disguise, 'the disguise utility should become available while retreating')
  assert.equal(getSimpleSkillLevel(trickster, disguise), 1)
}

{
  const prepareCaster = (seed: string, heroDefinitionId: string, skillLevels: Arcane['skillLevels']) => {
    const state = createInitialState(seed)
    state.time = 10 * 60
    const caster = state.arcanes[0]
    const enemy = state.arcanes.find((candidate) => candidate.team !== caster.team)!
    caster.heroDefinitionId = heroDefinitionId
    caster.skillLevels = skillLevels
    caster.skillStates = {}
    caster.stats.level = 18
    caster.stats.maxMana = 2_000
    caster.stats.mana = 2_000
    caster.aiMode = 'join_fight'
    caster.macroDecision = 'Lutar em equipe'
    caster.pos = { x: 50, y: 50 }
    enemy.pos = { x: 52, y: 50 }
    enemy.stats.maxHp = 3_000
    enemy.stats.hp = 3_000
    state.arcanes.forEach((candidate) => {
      if (candidate.team !== caster.team && candidate.id !== enemy.id) candidate.stats.hp = 0
    })
    return { state, caster, enemy }
  }

  const light = prepareCaster('parent-state-light-form-test', 'h082_light_keeper', { R: 2 })
  assert.equal(getArcaneRuntimeSkills(light.caster).some((skill) => skill.sourceAbilityId === 1372), false)
  const spiritForm = getArcaneRuntimeSkills(light.caster).find((skill) => skill.sourceAbilityId === 5474)!
  assert.equal(castSimpleSkill(light.state, light.caster, spiritForm, 2, light.enemy), true)
  assert.ok(light.caster.skillStates[parentSkillStateKey(5474)].activeUntil > light.state.time + 40)
  const radiantBind = getArcaneRuntimeSkills(light.caster).find((skill) => skill.sourceAbilityId === 1372)!
  assert.ok(radiantBind, 'Spirit Form should unlock its extra control skill')
  assert.equal(getSimpleSkillLevel(light.caster, radiantBind), 2)
  assert.equal(castSimpleSkill(light.state, light.caster, radiantBind, 2, light.enemy), true)
  assert.ok(light.caster.skillStates[parentSkillStateKey(5474)], 'casting the extra skill must not end Spirit Form')

  const spirit = prepareCaster('parent-state-spirits-test', 'h083_spirit_tether', { W: 3 })
  const guardianSpirits = getArcaneRuntimeSkills(spirit.caster).find((skill) => skill.sourceAbilityId === 5486)!
  assert.equal(castSimpleSkill(spirit.state, spirit.caster, guardianSpirits, 3, spirit.enemy), true)
  assert.equal(spirit.caster.skillStates[parentSkillStateKey(5486)].mode, 'out')
  const spiritsIn = getArcaneRuntimeSkills(spirit.caster).find((skill) => skill.sourceAbilityId === 5490)!
  assert.ok(spiritsIn, 'teamfight mode should request the inward spirits control')
  assert.equal(castSimpleSkill(spirit.state, spirit.caster, spiritsIn, 3, spirit.enemy), true)
  assert.equal(spirit.caster.skillStates[parentSkillStateKey(5486)].mode, 'in')
  assert.equal(getArcaneRuntimeSkills(spirit.caster).some((skill) => skill.sourceAbilityId === 5490), false, 'the active spirits mode should not be recast repeatedly')
  spirit.caster.aiMode = 'farm_jungle'
  spirit.caster.macroDecision = 'Farmar selva'
  assert.ok(getArcaneRuntimeSkills(spirit.caster).some((skill) => skill.sourceAbilityId === 5493), 'farming should request the outward spirits control')

  const ember = prepareCaster('parent-state-remnant-test', 'h098_ember_duelist', { R: 2 })
  const fireRemnant = getArcaneRuntimeSkills(ember.caster).find((skill) => skill.sourceAbilityId === 5606)!
  assert.equal(castSimpleSkill(ember.state, ember.caster, fireRemnant, 2, ember.enemy), true)
  assert.deepEqual(ember.caster.skillStates[parentSkillStateKey(5606)].positions, [{ x: 52, y: 50 }])
  const activateRemnant = getArcaneRuntimeSkills(ember.caster).find((skill) => skill.sourceAbilityId === 5607)!
  assert.ok(activateRemnant, 'placing a remnant should unlock its activation')
  const enemyHpBeforeRemnant = ember.enemy.stats.hp
  assert.equal(castSimpleSkill(ember.state, ember.caster, activateRemnant, 2, ember.enemy), true)
  assert.deepEqual(ember.caster.pos, { x: 52, y: 50 }, 'activation should move to the stored remnant position')
  assert.ok(ember.state.arcanes.find((arcane) => arcane.id === ember.enemy.id)!.stats.hp < enemyHpBeforeRemnant, 'activation should deal its imported area damage')
  assert.equal(ember.caster.skillStates[parentSkillStateKey(5606)], undefined, 'activation should consume the stored remnant')

  const giant = prepareCaster('parent-state-tree-test', 'h124_stone_giant', { E: 3 })
  const treeGrab = getArcaneRuntimeSkills(giant.caster).find((skill) => skill.sourceAbilityId === 5108)!
  assert.equal(castSimpleSkill(giant.state, giant.caster, treeGrab, 3, giant.enemy), true)
  assert.equal(giant.caster.skillStates[parentSkillStateKey(5108)].charges, 7)
  const tossTree = getArcaneRuntimeSkills(giant.caster).find((skill) => skill.sourceAbilityId === 6937)!
  assert.ok(tossTree, 'holding a tree should unlock tree toss')
  assert.equal(getSimpleSkillLevel(giant.caster, tossTree), 3)
  assert.equal(castSimpleSkill(giant.state, giant.caster, tossTree, 3, giant.enemy), true)
  assert.equal(giant.caster.skillStates[parentSkillStateKey(5108)], undefined, 'throwing the tree should consume the held tree')

  light.caster.skillStates[parentSkillStateKey(5474)] = { activeUntil: light.state.time + 0.1 }
  light.caster.stats.mana = 0
  const expiredState = tick(light.state, 0.2, false)
  assert.equal(expiredState.arcanes[0].skillStates[parentSkillStateKey(5474)], undefined, 'expired parent states should be pruned by the simulation tick')

  const replayFrame = createMatchRenderFrame(spirit.state)
  const replayState = materializeMatchRenderFrame(replayFrame, createMatchStaticData(spirit.state), replayFrame.details)
  assert.deepEqual(replayState.arcanes[0].skillStates, spirit.state.arcanes[0].skillStates, 'parent skill state should survive replay materialization')
}

{
  const stanceState = createInitialState('twin-blade-stance-runtime-test')
  stanceState.time = 12 * 60
  let duelist = stanceState.arcanes[0]
  let enemy = stanceState.arcanes.find((candidate) => candidate.team !== duelist.team)!
  duelist.heroDefinitionId = 'h119_twin_blade_duelist'
  duelist.skillLevels = { Q: 4, W: 3, E: 2, R: 1 }
  duelist.skillStates = {}
  duelist.stats.level = 12
  duelist.stats.maxMana = 1_000
  duelist.stats.mana = 1_000
  duelist.aiMode = 'farm_lane'
  duelist.macroDecision = 'Criar vantagem com gank'
  duelist.pos = { x: 50, y: 50 }
  enemy.pos = { x: 51, y: 50 }

  const katanaKit = getArcaneRuntimeSkills(duelist)
  const switchDiscipline = katanaKit.find((skill) => skill.sourceAbilityId === 1497)!
  assert.ok(katanaKit.some((skill) => skill.sourceAbilityId === 1498))
  assert.equal(katanaKit.some((skill) => skill.sourceAbilityId === 1502), false, 'alternate skills should begin hidden in Katana stance')
  assert.equal(tryCastSimpleSkill(stanceState, duelist, enemy), true, 'the AI selector should prioritize the stance switch when the situation calls for Sai')
  assert.equal(duelist.skillStates[parentSkillStateKey(1497)].mode, 'sai')
  assert.equal(duelist.itemCooldowns[switchDiscipline.id], stanceState.time + 8, 'the AI stance switch should use its imported cooldown')
  assert.ok(stanceState.timedEffects.some((effect) => effect.targetId === duelist.id && effect.sourceId === 'twin-blade-sai-swap'), 'switching to Sai should grant the imported movement bonus')

  const saiKit = getArcaneRuntimeSkills(duelist)
  const saiSlots = saiKit.filter((skill) => ['Q', 'W', 'E', 'R'].includes(skill.key))
  assert.deepEqual(saiSlots.map((skill) => skill.sourceAbilityId), [1502, 1503, 1504, 1506], 'Sai should replace all four Katana slots')
  assert.deepEqual(saiSlots.map((skill) => skill.key), ['Q', 'W', 'E', 'R'])
  const talonToss = saiKit.find((skill) => skill.sourceAbilityId === 1503)!
  assert.equal(getSimpleSkillLevel(duelist, talonToss), 3, 'Sai W should mirror the learned Katana W level')
  const primaryW = getHeroDefinition(duelist.heroDefinitionId).skills!.find((skill) => skill.sourceAbilityId === 1499)!
  assert.equal(castSimpleSkill(stanceState, duelist, talonToss, 3, enemy), true)
  duelist = stanceState.arcanes.find((candidate) => candidate.id === duelist.id)!
  enemy = stanceState.arcanes.find((candidate) => candidate.id === enemy.id)!
  assert.equal(duelist.stats.mana, 930, 'Sai W should spend its imported level-three mana cost')
  assert.equal(duelist.itemCooldowns[primaryW.id], stanceState.time + 9, 'using Sai W should put the hidden Katana W on the paired cooldown')

  const parrySkill = getArcaneRuntimeSkills(duelist).find((skill) => skill.sourceAbilityId === 1504)!
  const parryMana = duelist.stats.mana
  assert.equal(castSimpleSkill(stanceState, duelist, parrySkill, 2, enemy), true)
  assert.equal(duelist.stats.mana, parryMana - 20)
  assert.equal(hasTimedEffect(stanceState, duelist.id, 'parry'), true)
  const duelistHpBeforeParry = duelist.stats.hp
  const enemyHpBeforeCounter = enemy.stats.hp
  performArcaneBasicAttack(stanceState, enemy, duelist)
  duelist = stanceState.arcanes.find((candidate) => candidate.id === duelist.id)!
  enemy = stanceState.arcanes.find((candidate) => candidate.id === enemy.id)!
  assert.equal(duelist.stats.hp, duelistHpBeforeParry, 'Parry should block the first incoming basic attack')
  assert.ok(enemy.stats.hp < enemyHpBeforeCounter, 'Parry should counterattack using the imported critical multiplier')
  assert.equal(hasTimedEffect(stanceState, enemy.id, 'stun'), true)
  assert.equal(hasTimedEffect(stanceState, duelist.id, 'parry'), false, 'Parry should be consumed after one valid interception')
  performArcaneBasicAttack(stanceState, enemy, duelist)
  duelist = stanceState.arcanes.find((candidate) => candidate.id === duelist.id)!
  enemy = stanceState.arcanes.find((candidate) => candidate.id === enemy.id)!
  assert.ok(duelist.stats.hp < duelistHpBeforeParry, 'attacks after the consumed Parry should deal damage normally')
  stanceState.time += 20
  duelist.stats.mana += 20
  assert.equal(castSimpleSkill(stanceState, duelist, parrySkill, 2, enemy), true)
  enemy.heroDefinitionId = 'h003_nightmare_controller'
  enemy.skillLevels = { E: 4 }
  const targetedEnemySkill = getHeroDefinition(enemy.heroDefinitionId).skills!
    .find((skill) => skill.sourceAbilityId === 5014)!
  const hpBeforeTargetedParry = duelist.stats.hp
  damageEntity(stanceState, duelist.id, 200, {
    id: `${enemy.id}-${targetedEnemySkill.id}`,
    label: `${enemy.player}: ${targetedEnemySkill.name}`,
    team: enemy.team,
    damageType: 'magical',
  })
  duelist = stanceState.arcanes.find((candidate) => candidate.id === duelist.id)!
  enemy = stanceState.arcanes.find((candidate) => candidate.id === enemy.id)!
  assert.equal(duelist.stats.hp, hpBeforeTargetedParry, 'Parry should also intercept an incoming unit-target skill')
  assert.equal(hasTimedEffect(stanceState, duelist.id, 'parry'), false)

  const saiAttackCooldown = getEffectiveArcaneAttackCooldown(stanceState, duelist)
  duelist.aiMode = 'farm_lane'
  duelist.macroDecision = 'Avancar rota'
  assert.equal(castSimpleSkill(stanceState, duelist, switchDiscipline, 1, enemy), true)
  assert.equal(duelist.skillStates[parentSkillStateKey(1497)].mode, 'katana')
  assert.ok(getEffectiveArcaneAttackCooldown(stanceState, duelist) > saiAttackCooldown, 'Sai should use its faster imported base attack time')
  assert.ok(getArcaneRuntimeSkills(duelist).some((skill) => skill.sourceAbilityId === 1498), 'returning to Katana should restore the primary kit')

  const scepterName = shopCatalog.find((item) => item.id === 'i135_grand_spell_scepter')!.name
  duelist.items = [scepterName]
  duelist.itemCooldowns = {}
  duelist.macroDecision = 'Criar vantagem com gank'
  enemy.stats.maxHp = 5_000
  enemy.stats.hp = 5_000
  assert.equal(castSimpleSkill(stanceState, duelist, switchDiscipline, 1, enemy), true)
  const scepterTalonToss = getArcaneRuntimeSkills(duelist).find((skill) => skill.sourceAbilityId === 1503)!
  assert.equal(castSimpleSkill(stanceState, duelist, scepterTalonToss, 3, enemy), true)
  duelist = stanceState.arcanes.find((candidate) => candidate.id === duelist.id)!
  enemy = stanceState.arcanes.find((candidate) => candidate.id === enemy.id)!
  assert.equal(duelist.itemCooldowns[primaryW.id], undefined, 'Scepter should exempt the first paired cooldown inside its post-switch grace window')
  duelist.itemCooldowns = { [primaryW.id]: stanceState.time + 4 }
  assert.equal(castSimpleSkill(stanceState, duelist, scepterTalonToss, 3, enemy), true)
  duelist = stanceState.arcanes.find((candidate) => candidate.id === duelist.id)!
  enemy = stanceState.arcanes.find((candidate) => candidate.id === enemy.id)!
  assert.equal(duelist.itemCooldowns[primaryW.id], stanceState.time + 4, 'Scepter should not refresh an alternate ability that is already cooling down')

  const replayFrame = createMatchRenderFrame(stanceState)
  const replayState = materializeMatchRenderFrame(replayFrame, createMatchStaticData(stanceState), replayFrame.details)
  assert.equal(replayState.arcanes[0].skillStates[parentSkillStateKey(1497)].mode, 'sai', 'the selected stance should survive replay materialization')
}

{
  const souvenirState = createInitialState('ringmaster-souvenir-runtime-test')
  souvenirState.time = 10 * 60
  let ringmaster = souvenirState.arcanes[0]
  let ally = souvenirState.arcanes[1]
  let enemy = souvenirState.arcanes.find((candidate) => candidate.team !== ringmaster.team)!
  ringmaster.heroDefinitionId = 'h118_circus_controller'
  ringmaster.skillStates = {}
  ringmaster.stats.level = 12
  ringmaster.stats.maxMana = 1_000
  ringmaster.stats.mana = 1_000
  ringmaster.pos = { x: 50, y: 50 }
  ally.pos = { x: 51, y: 50 }
  enemy.pos = { x: 52, y: 50 }
  enemy.stats.hp = 0
  enemy.respawn = 0
  enemy.lastHitBy = { id: ally.id, label: ally.player, team: ally.team }

  resolveDeaths(souvenirState)
  ringmaster = souvenirState.arcanes.find((candidate) => candidate.id === ringmaster.id)!
  ally = souvenirState.arcanes.find((candidate) => candidate.id === ally.id)!
  enemy = souvenirState.arcanes.find((candidate) => candidate.id === enemy.id)!
  const collectedCharges = ringmasterSouvenirAbilityIds.reduce((total, sourceAbilityId) => (
    total + (ringmaster.skillStates[ringmasterSouvenirStateKey(sourceAbilityId)]?.charges ?? 0)
  ), 0)
  assert.equal(collectedCharges, 1, 'a nearby enemy hero death should grant exactly one deterministic souvenir')
  assert.equal(getArcaneRuntimeSkills(ringmaster).filter((skill) => ringmasterSouvenirAbilityIds.includes(skill.sourceAbilityId as typeof ringmasterSouvenirAbilityIds[number])).length, 1, 'only the acquired souvenir should appear in the runtime kit')
  assert.ok(souvenirState.skillMarkers.some((marker) => marker.label.startsWith('Souvenir +')), 'souvenir acquisition should be visible on the map')

  ringmaster.skillStates = {}
  grantRingmasterSouvenir(souvenirState, ringmaster, 389)
  grantRingmasterSouvenir(souvenirState, ringmaster, 389)
  const mirror = getArcaneRuntimeSkills(ringmaster).find((skill) => skill.sourceAbilityId === 389)!
  assert.equal(getSimpleSkillLevel(ringmaster, mirror), 1)
  assert.equal(castSimpleSkill(souvenirState, ringmaster, mirror, 1, enemy), true)
  assert.equal(ringmaster.skillStates[ringmasterSouvenirStateKey(389)].charges, 1, 'using a stacked souvenir should consume one charge')
  assert.ok(souvenirState.timedEffects.some((effect) => effect.targetId === ringmaster.id && effect.sourceId.endsWith('-illusion')), 'the mirror should create temporary illusion pressure')

  ringmaster.skillStates = {}
  grantRingmasterSouvenir(souvenirState, ringmaster, 392)
  ally.stats.hp = ally.stats.maxHp * 0.35
  const tonic = getArcaneRuntimeSkills(ringmaster).find((skill) => skill.sourceAbilityId === 392)!
  assert.equal(castSimpleSkill(souvenirState, ringmaster, tonic, 1, ally), true)
  assert.equal(ringmaster.skillStates[ringmasterSouvenirStateKey(392)], undefined)
  assert.ok(souvenirState.timedEffects.some((effect) => effect.targetId === ally.id && effect.sourceId.endsWith('-strength') && effect.kind === 'barrier'), 'the tonic should grant level-scaled strength durability')

  ringmaster.skillStates = {}
  ringmaster.pos = { x: 50, y: 50 }
  ringmaster.target = { x: 40, y: 40 }
  ringmaster.aiMode = 'retreat'
  ringmaster.macroDecision = 'Recuar para seguranca'
  enemy.stats.hp = enemy.stats.maxHp
  enemy.respawn = -60
  enemy.pos = { x: 50.8, y: 50 }
  grantRingmasterSouvenir(souvenirState, ringmaster, 390)
  const cushionStart = { ...ringmaster.pos }
  assert.equal(tryCastSimpleSkill(souvenirState, ringmaster, enemy), true, 'the AI should use its only escape souvenir while retreating')
  assert.ok(distance(ringmaster.pos, cushionStart) > 2.5, 'the cushion should perform its imported 400-unit leap')
  assert.ok(souvenirState.timedEffects.some((effect) => effect.targetId === enemy.id && effect.sourceId.endsWith('-cloud') && effect.kind === 'slow'), 'the cushion should leave a slowing cloud at its origin')

  ringmaster.skillStates = {}
  grantRingmasterSouvenir(souvenirState, ringmaster, 196)
  const unicycle = getArcaneRuntimeSkills(ringmaster).find((skill) => skill.sourceAbilityId === 196)!
  assert.equal(castSimpleSkill(souvenirState, ringmaster, unicycle, 1, enemy), true)
  assert.ok(souvenirState.timedEffects.some((effect) => effect.targetId === ringmaster.id && effect.sourceId.endsWith('-mount') && effect.modifiers?.moveSpeedPct === 0.6), 'the unicycle should grant its ten-second mobility state')

  const deathState = createInitialState('ringmaster-death-souvenir-test')
  deathState.time = 15 * 60
  let doomedRingmaster = deathState.arcanes[0]
  doomedRingmaster.heroDefinitionId = 'h118_circus_controller'
  doomedRingmaster.skillStates = {}
  doomedRingmaster.stats.hp = 0
  doomedRingmaster.respawn = 0
  resolveDeaths(deathState)
  doomedRingmaster = deathState.arcanes.find((candidate) => candidate.id === doomedRingmaster.id)!
  const deathGiftCharges = ringmasterSouvenirAbilityIds.reduce((total, sourceAbilityId) => (
    total + (doomedRingmaster.skillStates[ringmasterSouvenirStateKey(sourceAbilityId)]?.charges ?? 0)
  ), 0)
  assert.equal(deathGiftCharges, 1, 'dying without a souvenir should grant one from the innate')
  const respawnedRingmaster = respawnArcaneIfReady(doomedRingmaster, doomedRingmaster.respawn, 0)
  assert.deepEqual(respawnedRingmaster.skillStates, doomedRingmaster.skillStates, 'souvenir charges should persist through death and respawn')
}

assert.equal(getRoleGpmTarget('Safe Lane', 40 * 60), 760)
assert.equal(getRoleGpmTarget('Dedicated Support', 40 * 60), 317)
{
  const economyState = createInitialState('economy-need-test')
  const core = economyState.arcanes.find((arcane) => arcane.role === 'Safe Lane')!
  core.earnedGold = 8_000
  assert.ok(getArcaneEconomyNeed(core, 20 * 60) > 40, 'a core far below the pro GPM curve should seek farm')
  core.earnedGold = 13_000
  assert.equal(getArcaneEconomyNeed(core, 20 * 60), 0, 'a core above its GPM curve should not receive recovery pressure')
}

{
  const visionState = createInitialState('vision-scale-test')
  visionState.time = 120
  visionState.creeps = []
  visionState.towers = visionState.towers.map((tower) => ({ ...tower, hp: 0 }))
  visionState.structures = visionState.structures.map((structure) => ({ ...structure, hp: 0 }))
  visionState.bases = visionState.bases.map((base) => ({ ...base, hp: 0 }))
  const observer = visionState.arcanes.find((arcane) => arcane.team === 'dawn')!
  assert.equal(
    observer.visionRange,
    getArcaneDefinitionVisionRange(observer.heroDefinitionId, 'night'),
    'the -01:00 preparation phase should initialize with night vision',
  )
  observer.pos = { x: 50, y: 50 }
  observer.visionRange = getArcaneDefinitionVisionRange(observer.heroDefinitionId, 'day')
  visionState.arcanes = visionState.arcanes.map((arcane) => (
    arcane.id === observer.id ? arcane : { ...arcane, stats: { ...arcane.stats, hp: 0 } }
  ))
  assert.ok(observer.visionRange > 12 && observer.visionRange < 14, '1800 day vision should use the shared world-to-map scale')
  assert.equal(isPointVisibleToTeam(visionState, 'dawn', { x: 62.5, y: 50 }), true)
  assert.equal(isPointVisibleToTeam(visionState, 'dawn', { x: 64, y: 50 }), false)

  observer.visionRange = getArcaneDefinitionVisionRange(observer.heroDefinitionId, 'night')
  visionState.arcanes = [...visionState.arcanes]
  assert.ok(observer.visionRange > 5 && observer.visionRange < 9)
  assert.equal(isPointVisibleToTeam(visionState, 'dawn', { x: 55, y: 50 }), true)
  assert.equal(isPointVisibleToTeam(visionState, 'dawn', { x: 60, y: 50 }), false)

  const alliedCreep = spawnWave(createInitialState('vision-creep-provider-test')).find((creep) => creep.team === 'dawn')!
  alliedCreep.pos = { x: 50, y: 50 }
  observer.stats.hp = 0
  visionState.arcanes = [...visionState.arcanes]
  visionState.creepStorageMode = 'object'
  visionState.creeps = [alliedCreep]
  const creepVisionPoint = { x: 50 + alliedCreep.visionRange - 0.25, y: 50 }
  assert.equal(isPointVisibleToTeam(visionState, 'dawn', creepVisionPoint), true, 'allied creeps should provide team vision')
  damageEntity(visionState, alliedCreep.id, 1, { id: 'vision-test-hit', label: 'Vision test', team: 'dusk' })
  assert.equal(isPointVisibleToTeam(visionState, 'dawn', creepVisionPoint), true, 'non-lethal creep damage should preserve its vision provider')
  damageEntity(visionState, alliedCreep.id, alliedCreep.maxHp * 2, { id: 'vision-test-kill', label: 'Vision test', team: 'dusk' })
  assert.equal(isPointVisibleToTeam(visionState, 'dawn', creepVisionPoint), false, 'a dead creep should immediately stop providing vision')

  const buildingState = createInitialState('vision-building-provider-test')
  const alliedTower = buildingState.towers.find((tower) => tower.team === 'dawn')!
  alliedTower.pos = { x: 50, y: 50 }
  buildingState.arcanes = buildingState.arcanes.map((arcane) => ({ ...arcane, stats: { ...arcane.stats, hp: 0 } }))
  buildingState.creeps = []
  buildingState.structures = buildingState.structures.map((structure) => ({ ...structure, hp: 0 }))
  buildingState.bases = buildingState.bases.map((base) => ({ ...base, hp: 0 }))
  buildingState.towers = buildingState.towers.map((tower) => tower.id === alliedTower.id ? tower : { ...tower, hp: 0 })
  buildingState.time = 120
  assert.equal(isPointVisibleToTeam(buildingState, 'dawn', { x: 62.5, y: 50 }), true, 'allied buildings should provide day vision')
  buildingState.time = 420
  assert.equal(isPointVisibleToTeam(buildingState, 'dawn', { x: 57, y: 50 }), false, 'building vision should shrink at night')
}

{
  const fogState = createInitialState('combat-fog-focus-test')
  fogState.time = 420
  fogState.creeps = []
  fogState.towers = fogState.towers.map((tower) => ({ ...tower, hp: 0 }))
  fogState.structures = fogState.structures.map((structure) => ({ ...structure, hp: 0 }))
  fogState.bases = fogState.bases.map((base) => ({ ...base, hp: 0 }))
  const observer = fogState.arcanes.find((arcane) => arcane.team === 'dawn')!
  const hiddenEnemy = fogState.arcanes.find((arcane) => arcane.team === 'dusk')!
  observer.pos = { x: 50, y: 50 }
  observer.visionRange = getArcaneDefinitionVisionRange(observer.heroDefinitionId, 'night')
  hiddenEnemy.pos = { x: 58, y: 50 }
  fogState.arcanes = fogState.arcanes.map((arcane) => (
    arcane.id === observer.id || arcane.id === hiddenEnemy.id ? arcane : { ...arcane, stats: { ...arcane.stats, hp: 0 } }
  ))
  const hiddenCombat = updateCombatAiFoundation(fogState)
  assert.ok(hiddenCombat.combatBlackboards.dawn[0], 'nearby hidden enemies may still delimit spatial encounter context')
  assert.equal(hiddenCombat.combatBlackboards.dawn[0].primaryTargetId, undefined, 'hidden enemies must not become shared focus')

  hiddenEnemy.pos = { x: 54, y: 50 }
  const revealedCombat = updateCombatAiFoundation(fogState)
  assert.equal(revealedCombat.combatBlackboards.dawn[0].primaryTargetId, hiddenEnemy.id, 'entering allied vision should reveal the focus target')
}

{
  const openingState = createInitialState('opening-timeline-test')
  assert.equal(openingState.time, matchPreparationStartSeconds)
  assert.equal(formatMatchTime(openingState.time), '-01:00')
  assert.equal(formatMatchTime(-0.1), '-00:01')
  assert.equal(openingState.creeps.length, 0)
  assert.equal(openingState.runes.length, 0)
  assert.ok(openingState.camps.every((camp) => camp.hp === 0 && camp.respawn === 60))

  const openingArcane = openingState.arcanes[0]
  const openingPosition = { ...openingArcane.pos }
  const openingGold = openingArcane.stats.gold
  const preparationTick = tick(openingState, 1, true)
  assert.equal(preparationTick.time, -59)
  assert.equal(preparationTick.arcanes[0].macroDecision, 'Defender runa de ouro')
  assert.notDeepEqual(preparationTick.arcanes[0].pos, openingPosition, 'Arcanes should move toward lane during preparation')
  assert.equal(preparationTick.arcanes[0].stats.gold, openingGold, 'passive gold must not accrue before 00:00')
  assert.equal(preparationTick.creeps.length, 0)

  const openingEncoder = new ReplayChunkEncoder()
  const openingStore = new ReplayFrameStore()
  openingStore.appendChunk(openingEncoder.encode([createMatchRenderFrame(createInitialState('opening-replay-test'))]))
  assert.equal(openingStore.getTime(0), matchPreparationStartSeconds, 'binary replay should preserve the negative preparation timestamp')

  const zeroState = createInitialState('opening-zero-test')
  zeroState.time = -0.01
  const atZero = tick(zeroState, 0.02, true)
  assert.ok(atZero.creeps.length > 0, 'the first lane wave should spawn at 00:00')
  const bountyRunes = atZero.runes.filter((rune) => rune.kind === 'bounty')
  assert.equal(bountyRunes.length, 6, 'six gold runes should spawn at 00:00')
  assert.equal(bountyRunes.filter((rune) => rune.side === 'dawn').length, 3)
  assert.equal(bountyRunes.filter((rune) => rune.side === 'dusk').length, 3)
  assert.equal(atZero.runes.some((rune) => rune.kind === 'power'), false)

  for (const point of runeSpawnPoints.bounty) {
    assert.ok(runeSpawnPoints.bounty.some((mirror) => mirror.x === 100 - point.x && mirror.y === 100 - point.y), 'every bounty point should have an exact mirror')
  }
  assert.equal(runeSpawnPoints.bounty.filter((point) => getBountyRuneSide(point) === 'dawn').length, 3)

  assert.ok(preparationTick.arcanes.some((arcane) => arcane.macroDecision === 'Defender runa de ouro'))
  assert.ok(preparationTick.arcanes.some((arcane) => arcane.macroDecision === 'Invadir runa de ouro'))
  const dawnMid = preparationTick.arcanes.find((arcane) => arcane.team === 'dawn' && arcane.role === 'Mid')!
  const dawnMidRune = runeSpawnPoints.bounty
    .filter((point) => getBountyRuneSide(point) === 'dawn')
    .sort((a, b) => distance(a, { x: 50, y: 50 }) - distance(b, { x: 50, y: 50 }))[0]
  assert.deepEqual(dawnMid.target, dawnMidRune, 'the mid should cover the allied river bounty rune')

  const pregameCombatState = createInitialState('opening-combat-test')
  pregameCombatState.time = -30
  pregameCombatState.arcanes = pregameCombatState.arcanes.map((arcane, index) => ({
    ...arcane,
    pos: index === 0 || index === 5 ? { x: 50, y: 50 } : arcane.pos,
    skillLevels: {},
    stats: index === 0 || index === 5 ? arcane.stats : { ...arcane.stats, hp: 0 },
  }))
  assert.ok(pregameCombatState.arcanes[0].lastAttack < pregameCombatState.time, 'initial attacks must be ready throughout the preparation minute')
  const pregameTower = pregameCombatState.towers[0]
  pregameTower.pos = { x: 50, y: 50 }
  pregameTower.lastAttack = -100
  const hpBeforePreparationFight = pregameCombatState.arcanes[5].stats.hp
  const pregameCombatTick = tick(pregameCombatState, 0.01, true)
  assert.ok(pregameCombatTick.arcanes[5].stats.hp < hpBeforePreparationFight, 'Arcanes contesting a pregame rune should fight before 00:00')
  assert.ok(pregameCombatTick.effects.some((effect) => effect.action === 'attack'), 'pregame combat should emit a basic-attack effect')
  assert.equal(pregameCombatTick.towers[0].lastAttack, -100, 'map structures must remain inactive during pregame combat')

  let naturalPregame = createInitialState('pregame-contact-debug')
  let pregameStep = 0
  while (naturalPregame.time < -45) {
    naturalPregame = tick(naturalPregame, simulationFrameSeconds, pregameStep % 3 === 0)
    pregameStep += 1
  }
  assert.ok(
    naturalPregame.arcanes.every((arcane) => arcane.aiMode === 'take_objective'),
    'pregame routes should remain objective-driven instead of switching to scripted chases',
  )

  const threatenedState = createInitialState('opening-rune-response-test')
  threatenedState.time = -30
  const reactingSupport = threatenedState.arcanes.find((arcane) => arcane.team === 'dawn' && arcane.role === 'Greedy Support')!
  const threatenedPoint = runeSpawnPoints.bounty.find((point) => getBountyRuneSide(point) === 'dawn')!
  reactingSupport.pos = { x: threatenedPoint.x + 4, y: threatenedPoint.y }
  const invader = threatenedState.arcanes.find((arcane) => arcane.team === 'dusk')!
  invader.pos = { ...threatenedPoint }
  const responsePlan = getPregameBountyRunePlan(threatenedState, reactingSupport)
  assert.equal(responsePlan.kind, 'defend', 'a nearby support should answer pressure on an allied rune')
  assert.equal(responsePlan.threatened, true)
  assert.deepEqual(responsePlan.point, threatenedPoint)

  const cautiousCore = threatenedState.arcanes.find((arcane) => arcane.team === 'dawn' && arcane.role === 'Safe Lane')!
  cautiousCore.pos = { x: threatenedPoint.x + 6, y: threatenedPoint.y }
  cautiousCore.stats.hp = cautiousCore.stats.maxHp * 0.25
  const cautiousAssessment = getPregameRuneContestAssessment(threatenedState, cautiousCore, {
    point: threatenedPoint,
    kind: 'defend',
    threatened: true,
  }, [invader])
  assert.equal(cautiousAssessment.mustRetreat, true, 'a low-health Arcane should concede the rune instead of chasing')
  const cautiousTick = tick(threatenedState, 0.01, true)
  const cautiousAfterTick = cautiousTick.arcanes.find((arcane) => arcane.id === cautiousCore.id)!
  assert.equal(cautiousAfterTick.macroDecision, 'Recuar da disputa')
  assert.notDeepEqual(cautiousAfterTick.target, invader.pos, 'the enemy position must never become the rune-contest movement target')

  const jungleState = createInitialState('opening-jungle-test')
  jungleState.time = 59.99
  const atOneMinute = tick(jungleState, 0.02, true)
  assert.ok(atOneMinute.camps.every((camp) => camp.hp === camp.maxHp), 'neutral camps should first spawn at 01:00')

  const powerState = createInitialState('opening-power-test')
  powerState.time = 119.99
  const atTwoMinutes = tick(powerState, 0.02, true)
  assert.equal(atTwoMinutes.runes.filter((rune) => rune.kind === 'power').length, 1, 'power runes should start at 02:00')

  const wisdomState = createInitialState('opening-wisdom-test')
  wisdomState.time = 419.99
  const atSevenMinutes = tick(wisdomState, 0.02, true)
  assert.equal(atSevenMinutes.runes.filter((rune) => rune.kind === 'wisdom').length, 2, 'XP runes should start at 07:00')
}

{
  const heroIds = [...new Set(createInitialState('imported-cadence-roster').arcanes.map((arcane) => arcane.heroDefinitionId))].slice(0, 3)
  heroIds.forEach((heroId) => {
    const cadenceState = createInitialState(`imported-cadence-${heroId}`)
    cadenceState.time = 100
    const attacker = cadenceState.arcanes[0]
    const target = cadenceState.arcanes[5]
    attacker.heroDefinitionId = heroId
    attacker.items = []
    attacker.skillLevels = {}
    attacker.stats = buildArcaneStats(heroId, 10, 0, 0, 1, 1, [])
    attacker.pos = { x: 50, y: 50 }
    attacker.lastAttack = 90
    target.items = []
    target.skillLevels = {}
    target.pos = { x: 50.2, y: 50 }
    target.lastAttack = Number.POSITIVE_INFINITY
    target.stats = { ...target.stats, hp: 1_000_000, maxHp: 1_000_000 }
    cadenceState.arcanes = [attacker, target]
    cadenceState.creeps = []
    cadenceState.towers = []
    cadenceState.structures = []
    cadenceState.camps = []
    cadenceState.boss.hp = 0

    const expectedCooldown = attacker.stats.attackSpeed
    assert.ok(Math.abs(getEffectiveArcaneAttackCooldown(cadenceState, attacker) - expectedCooldown) < 1e-9, `${heroId} should use its imported attack interval`)
    const attackTimes: number[] = []
    let observedLastAttack = attacker.lastAttack
    for (let frame = 0; frame < 360; frame += 1) {
      cadenceState.time = 100 + frame * simulationFrameSeconds
      resolveCombat(cadenceState, createTickFrameContext())
      const liveAttacker = cadenceState.arcanes.find((arcane) => arcane.id === attacker.id)!
      if (liveAttacker.lastAttack !== observedLastAttack) {
        attackTimes.push(liveAttacker.lastAttack)
        observedLastAttack = liveAttacker.lastAttack
      }
    }
    for (let index = 1; index < attackTimes.length; index += 1) {
      assert.ok(attackTimes[index] - attackTimes[index - 1] >= expectedCooldown - 1e-9, `${heroId} attacked before its imported cooldown`)
    }
    assert.ok(attackTimes.length >= 5, `${heroId} should produce enough attacks for a cadence audit`)
    assert.equal(
      cadenceState.effects.filter((effect) => effect.sourceId === attacker.id && effect.action !== 'attack').length,
      0,
      `${heroId} basic cadence fixture should not conflate skills/items with attacks`,
    )
  })
}

{
  const combatState = createInitialState('combat-foundation-integration')
  combatState.time = 200
  combatState.arcanes = combatState.arcanes.map((arcane, index) => ({
    ...arcane,
    lane: 'mid',
    pos: index === 0 ? { x: 48, y: 50 } : index === 5 ? { x: 53, y: 50 } : arcane.pos,
    stats: index === 0 || index === 5 ? arcane.stats : { ...arcane.stats, hp: 0 },
  }))
  const combatUpdated = updateCombatAiFoundation(combatState)
  assert.equal(combatUpdated.combatBlackboards.dawn.length, 1, 'simulation should materialize a dawn combat blackboard')
  assert.equal(combatUpdated.combatBlackboards.dusk.length, 1, 'simulation should materialize a dusk combat blackboard')
  assert.equal(combatUpdated.combatBlackboards.dawn[0].encounterId, combatUpdated.combatBlackboards.dusk[0].encounterId)
  assert.ok(combatUpdated.combatBlackboards.dawn[0].scenario, 'the runtime blackboard should include wave, tower and reinforcement context')
  const stableSignature = getCombatCriticalEventSignature(combatUpdated)
  combatUpdated.arcanes[0].stats.hp = combatUpdated.arcanes[0].stats.maxHp * 0.25
  assert.notEqual(getCombatCriticalEventSignature(combatUpdated), stableSignature, 'critical health crossings should invalidate combat context')
  const combatFrame = createMatchRenderFrame(combatUpdated)
  const hydratedCombat = materializeMatchRenderFrame(combatFrame, createMatchStaticData(combatUpdated), combatFrame.details)
  assert.deepEqual(hydratedCombat.combatBlackboards, combatUpdated.combatBlackboards, 'detailed replay frames should preserve combat blackboards')

  const towerState = createInitialState('combat-danger-tower-integration')
  towerState.time = 300
  const defendingTower = towerState.towers.find((tower) => tower.team === 'dusk' && tower.tier === 1)!
  const diver = towerState.arcanes.find((arcane) => arcane.team === 'dawn')!
  const bait = towerState.arcanes.find((arcane) => arcane.team === 'dusk')!
  diver.pos = { x: defendingTower.pos.x - defendingTower.range - 3, y: defendingTower.pos.y }
  bait.pos = { ...defendingTower.pos }
  towerState.arcanes = towerState.arcanes.map((arcane) => (
    arcane.id === diver.id || arcane.id === bait.id ? arcane : { ...arcane, stats: { ...arcane.stats, hp: 0 } }
  ))
  towerState.creeps = []
  const towerCombat = updateCombatAiFoundation(towerState)
  const towerBoard = towerCombat.combatBlackboards.dawn[0]
  const counterDiveBoard = towerCombat.combatBlackboards.dusk[0]
  assert.ok(towerBoard, 'a tower bait should still be recognized as an encounter')
  assert.equal(towerBoard.scenario?.intent, 'disengage', 'unsupported tower pressure should be rejected by the scenario layer')
  assert.equal(counterDiveBoard.encounterType, 'counter_dive', 'the defending team should read the same encounter as a counter-dive')
  assert.equal(counterDiveBoard.scenario?.intent, 'engage', 'the allied tower should authorize a counter-dive response')
  assert.equal(getCombatTargetTowerExposure(towerCombat, diver.team, bait.pos), 100)
  const towerAssessment = getCombatFocusAssessment(towerCombat, diver, bait, towerBoard, [bait])
  assert.equal(towerAssessment.canApproach, false, 'combat focus must not authorize an unsupported tower dive')
  const stagingPoint = getCombatStagingPoint(towerCombat, diver, bait, towerBoard, towerAssessment)
  assert.ok(distance(stagingPoint, defendingTower.pos) > distance(diver.pos, defendingTower.pos), 'tower staging should create distance instead of rushing the bait')

  const chaseState = createInitialState('combat-chase-stop-integration')
  chaseState.time = 420
  const chaser = chaseState.arcanes.find((arcane) => arcane.team === 'dawn')!
  const chased = chaseState.arcanes.find((arcane) => arcane.team === 'dusk')!
  chaser.pos = { x: 48, y: 50 }
  chased.pos = { x: 52, y: 50 }
  chased.stats = { ...chased.stats, hp: chased.stats.maxHp * 0.18 }
  chaseState.arcanes = chaseState.arcanes.map((arcane) => (
    arcane.id === chaser.id || arcane.id === chased.id ? arcane : { ...arcane, stats: { ...arcane.stats, hp: 0 } }
  ))
  const chaseCombat = updateCombatAiFoundation(chaseState)
  const chaseBoard = chaseCombat.combatBlackboards.dawn[0]
  assert.equal(chaseBoard.phase, 'chase')
  assert.ok(chaseBoard.scenario)
  chaseBoard.scenario = {
    ...chaseBoard.scenario!,
    intent: 'hold',
    chaseAllowed: false,
    chaseStopReason: 'dangerous_fog',
  }
  const liveChaser = chaseCombat.arcanes.find((arcane) => arcane.id === chaser.id)!
  liveChaser.forceDecision = true
  liveChaser.nextDecisionAt = chaseCombat.time
  chaseCombat.arcanes.find((arcane) => arcane.id === chased.id)!.stats.hp = 0
  const stoppedChaser = updateArcaneMovement(liveChaser, chaseCombat, simulationFrameSeconds, true)
  assert.equal(stoppedChaser.macroDecision, 'Encerrar perseguicao', 'scenario authority should stop movement even after the focus disappears')
  assert.equal(stoppedChaser.microDecision, 'Reagrupando sem visao do alvo')
}

{
  const purchaseState = createInitialState('full-inventory-upgrade-test')
  const shopper = purchaseState.arcanes[0]
  const compatibleItems = shopCatalog.filter((item) => (
    !(shopper.stats.attackType === 'melee' && item.id.includes('ranged')) &&
    !(shopper.stats.attackType === 'ranged' && item.id.includes('cleave'))
  ))
  shopper.items = compatibleItems.slice(0, 6).map((item) => item.name)
  shopper.stats.gold = 12_000
  const plan = getItemPurchasePlan(shopper)
  assert.ok(plan?.soldItemName, 'a full inventory should produce a replacement plan')
  assert.ok(plan!.item.cost > (compatibleItems.find((item) => item.name === plan!.soldItemName)?.cost ?? 0))
  const goldBefore = shopper.stats.gold
  const upgraded = buyItemAtBase(shopper)
  assert.equal(upgraded.items.length, 6)
  assert.equal(upgraded.items.includes(plan!.soldItemName!), false)
  assert.equal(upgraded.items.includes(plan!.item.name), true)
  assert.equal(upgraded.stats.gold, goldBefore - plan!.netCost, 'the purchase should credit resale gold before buying the upgrade')
}

{
  const humanState = createInitialState('humanized-execution-runtime')
  const player = humanState.arcanes[0]
  const profile = getPlayerAiProfile(player)
  assert.ok(profile.mechanics >= 20 && profile.mechanics <= 98)
  assert.ok(profile.mapAwareness >= 20 && profile.mapAwareness <= 98)
  assert.ok(profile.heroMastery >= 20 && profile.heroMastery <= 98)
  assert.deepEqual(getPlayerAiProfile(player), profile, 'player profiles should be stable and cached')

  const alternateHero = humanState.arcanes.find((arcane) => arcane.heroDefinitionId !== player.heroDefinitionId)!
  const alternateProfile = getPlayerAiProfile({ ...player, heroDefinitionId: alternateHero.heroDefinitionId })
  assert.notStrictEqual(alternateProfile, profile, 'hero mastery cache must include the selected Arcane')

  humanState.time = 10 * 60
  const fresh = getPlayerMentalState(humanState, player, 20, 0)
  humanState.time = 60 * 60
  player.deaths = 7
  player.decisionStatus = 'tilted'
  const exhausted = getPlayerMentalState(humanState, player, 74, 2)
  assert.ok(exhausted.fatigue > fresh.fatigue)
  assert.ok(exhausted.tilt > fresh.tilt)
  assert.ok(exhausted.pressure > fresh.pressure)
  assert.ok(getArcaneCoordinationReliability(humanState, player) >= 0.68)
  assert.equal(
    honorsCombatReservations(humanState, player, 'test-control', 'enemy-target'),
    honorsCombatReservations(humanState, player, 'test-control', 'enemy-target'),
    'coordination mistakes must be deterministic inside the same decision window',
  )
}

{
  const pullState = createInitialState('lane-pull-runtime-test')
  pullState.time = 104
  const support = pullState.arcanes.find((arcane) => arcane.team === 'dawn' && arcane.role === 'Dedicated Support')!
  const core = pullState.arcanes.find((arcane) => arcane.team === 'dawn' && arcane.role === 'Safe Lane')!
  const camp = getLanePullCamp(pullState, 'dawn') ?? pullState.camps.find((candidate) => candidate.id === 'camp-outer-grove-dawn')!
  camp.hp = camp.maxHp
  camp.respawn = 0
  camp.lastAttack = -10
  support.pos = { x: camp.pos.x - 6, y: camp.pos.y }
  core.stats.hp = core.stats.maxHp
  const waveCreep = {
    ...spawnWave(pullState).find((creep) => creep.team === 'dawn' && creep.lane === support.lane && creep.type === 'melee')!,
    pos: { x: camp.pos.x - 8, y: camp.pos.y },
  }
  pullState.creeps = [waveCreep]

  const plan = getLanePullPlan(pullState, support, [])
  assert.ok(plan?.commit, 'the safelane support should commit a valuable pull in the 44-second window')
  assert.equal(plan?.camp.id, camp.id)
  support.microDecision = 'Puxando wave no campo'
  support.target = { ...camp.pos }
  support.pos = { x: camp.pos.x - 7.5, y: camp.pos.y }
  assert.equal(getActivePullCampForCreep(pullState, waveCreep)?.id, camp.id)
  const movedCreep = updateCreepMovement(waveCreep, pullState, 0.2, createTickFrameContext())
  assert.equal(movedCreep.pullCampId, camp.id)
  assert.ok(distance(movedCreep.pos, camp.pos) < distance(waveCreep.pos, camp.pos), 'the pulled wave should leave its lane path toward the camp')
  support.microDecision = 'Retornando para a lane'
  const returnedCreep = updateCreepMovement({ ...movedCreep, pullUntil: pullState.time - 0.1 }, pullState, 0.2, createTickFrameContext())
  assert.equal(returnedCreep.pullCampId, undefined, 'an expired pull should release the creep back to its synchronized lane path')
  support.microDecision = 'Puxando wave no campo'

  const fightingCreep = {
    ...movedCreep,
    pos: { x: camp.pos.x - 1, y: camp.pos.y },
    hp: Math.max(movedCreep.hp, 300),
    maxHp: Math.max(movedCreep.maxHp, 300),
    pullUntil: pullState.time + 10,
    lastAttack: -10,
  }
  pullState.creeps = [fightingCreep]
  assert.equal(getRouteCreepTarget(fightingCreep, pullState, 'attack')?.id, camp.id, 'a pulled creep in range should attack the neutral camp')
  const campHpBeforePullCombat = camp.hp
  const creepHpBeforePullCombat = fightingCreep.hp
  resolveCombat(pullState, createTickFrameContext())
  assert.ok(pullState.camps.find((candidate) => candidate.id === camp.id)!.hp < campHpBeforePullCombat, 'lane creeps should damage the pulled camp')
  assert.ok(pullState.creeps.find((creep) => creep.id === fightingCreep.id)!.hp < creepHpBeforePullCombat, 'neutral camps should retaliate against pulled lane creeps')

  const enemyPuller = pullState.arcanes.find((arcane) => arcane.team === 'dusk' && arcane.role === 'Dedicated Support')!
  const contestSupport = pullState.arcanes.find((arcane) => arcane.team === 'dawn' && arcane.role === 'Greedy Support')!
  const enemyCamp = pullState.camps.find((candidate) => candidate.id === 'camp-outer-grove-dusk')!
  enemyCamp.hp = enemyCamp.maxHp
  enemyCamp.respawn = 0
  enemyPuller.microDecision = 'Puxando wave no campo'
  enemyPuller.pos = { ...enemyCamp.pos }
  contestSupport.pos = { x: enemyCamp.pos.x - 8, y: enemyCamp.pos.y }
  const contest = getEnemyPullContestPlan(pullState, contestSupport, [enemyPuller])
  assert.equal(contest?.puller.id, enemyPuller.id, 'the opposing greedy support should recognize and contest an exposed pull')
}

{
  const retentionState = createInitialState('creep-target-retention-test')
  retentionState.time = 120
  const retentionWave = spawnWave(retentionState)
  const creep = retentionWave.find((candidate) => candidate.team === 'dawn' && candidate.lane === 'mid')!
  const enemyCreep = retentionWave.find((candidate) => candidate.team === 'dusk' && candidate.lane === 'mid')!
  const enemyArcane = retentionState.arcanes.find((candidate) => candidate.team === 'dusk')!
  creep.pos = { x: 50, y: 50 }
  enemyCreep.pos = { x: 51, y: 50 }
  enemyArcane.pos = { x: 50.8, y: 50 }
  retentionState.arcanes.forEach((arcane) => {
    if (arcane.id !== enemyArcane.id) arcane.stats.hp = 0
  })
  retentionState.creeps = [creep, enemyCreep]

  const acquired = updateCreepMovement(creep, retentionState, simulationFrameSeconds, createTickFrameContext())
  assert.equal(acquired.routeTargetId, enemyCreep.id, 'a lane creep should retain the target acquired in its perception window')
  assert.ok((acquired.nextRouteTargetEvaluationAt ?? 0) > retentionState.time)

  retentionState.time += simulationFrameSeconds
  retentionState.creeps = [acquired, enemyCreep]
  const retained = updateCreepMovement(acquired, retentionState, simulationFrameSeconds, createTickFrameContext())
  assert.equal(retained.routeTargetId, enemyCreep.id, 'the target should remain stable between perception windows')

  retained.aggroTargetId = enemyArcane.id
  retained.aggroUntil = retentionState.time + 2
  assert.equal(isCreepRouteTargetValid(retained, enemyCreep, retentionState, 'vision'), false, 'new hero aggro must invalidate the previous lane target')
  retentionState.creeps = [retained, enemyCreep]
  const aggroed = updateCreepMovement(retained, retentionState, simulationFrameSeconds, createTickFrameContext())
  assert.equal(aggroed.routeTargetId, enemyArcane.id, 'aggro changes should force immediate target acquisition')

  enemyArcane.stats.hp = 0
  retentionState.creeps = [aggroed, enemyCreep]
  const afterDeath = updateCreepMovement(aggroed, retentionState, simulationFrameSeconds, createTickFrameContext())
  assert.notEqual(afterDeath.routeTargetId, enemyArcane.id, 'dead retained targets must be discarded immediately')
}

{
  const motionState = createInitialState('creep-motion-plan-runtime-test', { creepMotionMode: 'planned' })
  motionState.time = 120
  motionState.arcanes.forEach((arcane) => { arcane.stats.hp = 0 })
  const routeCreep = spawnWave(motionState).find((candidate) => candidate.team === 'dawn' && candidate.lane === 'mid')!
  motionState.creeps = [routeCreep]

  motionState.creeps = updateCreepsForTick(motionState, simulationFrameSeconds, createTickFrameContext())
  const plannedCreep = motionState.creeps[0]
  assert.equal(plannedCreep.motionPlan?.kind, 'route', 'an uncontested lane creep should enter a route motion plan')
  const storedPosition = { ...plannedCreep.pos }
  const expectedPosition = sampleCreepMotionPlan(plannedCreep.motionPlan!, motionState.time + simulationFrameSeconds)

  motionState.time += simulationFrameSeconds
  motionState.creeps = updateCreepsForTick(motionState, simulationFrameSeconds, createTickFrameContext())
  assert.deepEqual(motionState.creeps[0].pos, storedPosition, 'a sleeping route creep should not materialize every 30Hz tick')
  assert.ok(distance(expectedPosition, storedPosition) > 0, 'the analytical plan should continue advancing while its stored position sleeps')
  const replayPosition = createMatchRenderFrame(motionState).creeps[0]
  assert.equal(replayPosition[4], Number(expectedPosition.x.toFixed(3)), 'replay frames should sample the analytical position without waking the creep')
  assert.equal(replayPosition[5], Number(expectedPosition.y.toFixed(3)), 'replay frames should preserve smooth analytical movement')

  motionState.time = plannedCreep.motionPlan!.endsAt + simulationFrameSeconds
  motionState.creeps = updateCreepsForTick(motionState, simulationFrameSeconds, createTickFrameContext())
  assert.ok(distance(motionState.creeps[0].pos, storedPosition) > 0, 'a due route plan should materialize before reevaluation')
  assert.equal(motionState.creeps[0].motionPlan?.kind, 'route', 'an uncontested creep should schedule its next route segment')
}

{
  const contactState = createInitialState('creep-motion-contact-test', { creepMotionMode: 'planned' })
  contactState.time = 120
  contactState.arcanes.forEach((arcane) => { arcane.stats.hp = 0 })
  const contactWave = spawnWave(contactState)
  const dawnCreep = contactWave.find((candidate) => candidate.team === 'dawn' && candidate.lane === 'mid')!
  const duskCreep = contactWave.find((candidate) => candidate.team === 'dusk' && candidate.lane === 'mid')!
  Object.assign(dawnCreep, { pos: { x: 47, y: 50 }, range: 1.2, visionRange: 10, damage: 0, hp: 10_000, maxHp: 10_000 })
  Object.assign(duskCreep, { pos: { x: 53, y: 50 }, range: 1.2, visionRange: 10, damage: 0, hp: 10_000, maxHp: 10_000 })
  contactState.creeps = [dawnCreep, duskCreep]

  let minimumSeparation = Number.POSITIVE_INFINITY
  for (let step = 0; step < 90; step += 1) {
    contactState.time += simulationFrameSeconds
    contactState.creeps = updateCreepsForTick(contactState, simulationFrameSeconds, createTickFrameContext())
    resolveCombat(contactState, createTickFrameContext())
    const separation = contactState.creeps[1].pos.x - contactState.creeps[0].pos.x
    minimumSeparation = Math.min(minimumSeparation, separation)
    assert.ok(separation >= 0, 'opposing creeps must stop to fight instead of crossing through each other')
  }
  assert.ok(minimumSeparation < 4, 'opposing creeps should close the initial gap before holding attack range')
  assert.ok(contactState.creeps.every((creep) => creep.motionPlan?.kind === 'hold'), 'creeps in attack range should sleep on a hold plan')
}

{
  const activationState = createInitialState('creep-tactical-activation-test', {
    creepMotionMode: 'planned',
    creepSpatialMode: 'persistent',
  })
  activationState.time = 120
  activationState.arcanes.forEach((arcane) => { arcane.stats.hp = 0 })
  const wave = spawnWave(activationState)
  const dawnCreep = wave.find((candidate) => candidate.team === 'dawn' && candidate.lane === 'mid')!
  const duskCreep = wave.find((candidate) => candidate.team === 'dusk' && candidate.lane === 'mid')!
  dawnCreep.pos = { x: 40, y: 50 }
  duskCreep.pos = { x: 40 + dawnCreep.visionRange + 0.75, y: 50 }
  dawnCreep.motionPlan = createCreepMotionPlan('route', dawnCreep.pos, { x: 60, y: 50 }, 4.2, activationState.time, activationState.time + 1.5)
  duskCreep.motionPlan = createCreepMotionPlan('route', duskCreep.pos, { x: 20, y: 50 }, 4.2, activationState.time, activationState.time + 1.5)
  activationState.creeps = [dawnCreep, duskCreep]
  activationState.creepSpatialRevision += 1

  const context = createTickFrameContext()
  collectTacticalCreepActivations(activationState, context)
  assert.equal(context.tacticalActivationCreepIds?.has(dawnCreep.id), true, 'a route plan should wake before an enemy enters exact vision')

  const grid = getCreepSpatialGrid(activationState)
  assert.ok(isPersistentSpatialGrid(grid), 'persistent mode should retain a mutable spatial index')
  const syncCount = grid.stats.syncs
  activationState.time += simulationFrameSeconds
  getCreepSpatialGrid(activationState)
  assert.equal(grid.stats.syncs, syncCount, 'the persistent index should not resync without a tactical revision')

  duskCreep.pos.x = 40 + dawnCreep.visionRange + creepTacticalActivationMargin + 0.5
  activationState.creepSpatialRevision += 1
  const distantContext = createTickFrameContext()
  collectTacticalCreepActivations(activationState, distantContext)
  assert.equal(distantContext.tacticalActivationCreepIds?.has(dawnCreep.id), false, 'distant targets should leave route plans asleep')
  assert.equal(grid.stats.syncs, syncCount + 1, 'crossing a tactical revision should synchronize the retained index once')

  duskCreep.hp = 0
  const nearbyAfterDeath = queryCreepSpatialGrid(activationState, duskCreep.pos, 2)
  assert.equal(nearbyAfterDeath.some((creep) => creep.id === duskCreep.id), false, 'dead creeps should invalidate queries before the next bucket sync')
}

{
  const travelState = createInitialState('arcane-travel-plan-runtime-test', { arcaneTravelMode: 'planned' })
  travelState.time = 120
  travelState.creeps = []
  travelState.arcanes.forEach((candidate) => {
    if (candidate.team === 'dusk') candidate.stats.hp = 0
  })
  const arcane = travelState.arcanes.find((candidate) => candidate.team === 'dawn')!
  arcane.pos = { x: 30, y: 50 }
  arcane.target = { x: 42, y: 50 }
  arcane.macroDecision = 'Avancar rota'
  arcane.microDecision = 'Avancando rota'
  arcane.aiMode = 'push_lane'
  arcane.forceDecision = false
  arcane.nextDecisionAt = travelState.time + 1
  const plan = createArcaneTravelPlanIfUseful(
    travelState,
    arcane,
    arcane.pos,
    arcane.target,
    arcane.target,
    arcane.macroDecision,
    arcane.microDecision,
    arcane.aiMode,
    4,
    arcane.nextDecisionAt,
    false,
    createTickFrameContext(),
  )
  assert.equal(plan?.kind, 'lane', 'safe long lane movement should create an analytical travel plan')
  arcane.travelPlan = plan
  const storedPosition = { ...arcane.pos }
  const manaBefore = arcane.stats.mana
  travelState.time += simulationFrameSeconds
  const sleeping = updateArcaneMovement(arcane, travelState, simulationFrameSeconds, false, createTickFrameContext())
  assert.deepEqual(sleeping.pos, storedPosition, 'a sleeping Arcane should keep its stored runtime position')
  assert.ok(sleeping.stats.mana >= manaBefore, 'out-of-combat mana regeneration should continue while travelling analytically')
  const sampled = sampleArcaneTravelPlan(plan!, travelState.time)
  const renderPosition = createMatchRenderFrame({ ...travelState, arcanes: [sleeping, ...travelState.arcanes.filter((candidate) => candidate.id !== sleeping.id)] }).arcanes[0]
  assert.equal(renderPosition[0], Number(sampled.x.toFixed(3)), 'replay should sample an Arcane travel plan without waking it')
  assert.equal(renderPosition[1], Number(sampled.y.toFixed(3)), 'replay should preserve smooth analytical Arcane travel')

  travelState.arcanes = travelState.arcanes.map((candidate) => candidate.id === sleeping.id ? sleeping : candidate)
  damageEntity(travelState, sleeping.id, 1, { id: 'travel-test-hit', label: 'Test hit', team: 'dusk', damageType: 'pure' })
  const damagedTraveller = travelState.arcanes.find((candidate) => candidate.id === sleeping.id)!
  assert.equal(damagedTraveller.travelPlan, undefined, 'damage should immediately materialize and cancel Arcane travel')

  damagedTraveller.travelPlan = scheduleArcaneTravelPlan(
    undefined,
    'lane',
    damagedTraveller.pos,
    { x: damagedTraveller.pos.x + 10, y: damagedTraveller.pos.y },
    4,
    travelState.time,
    travelState.time + 1,
    `${(damagedTraveller.pos.x + 10).toFixed(3)}:${damagedTraveller.pos.y.toFixed(3)}`,
    `${damagedTraveller.macroDecision}|${damagedTraveller.microDecision}|${damagedTraveller.aiMode}`,
    '-',
    damagedTraveller.damageTaken,
  )
  addTimedEffect(travelState, damagedTraveller, {
    sourceId: 'travel-test-dot',
    sourceName: 'Test DoT',
    sourceTeam: 'dusk',
    kind: 'dot',
    polarity: 'negative',
    value: 1,
    damageType: 'pure',
    tickInterval: 0.01,
    duration: 1,
  })
  travelState.time += 0.02
  const expectedDotPosition = sampleArcaneTravelPlan(damagedTraveller.travelPlan, travelState.time)
  processTimedEffects(travelState)
  assert.equal(damagedTraveller.travelPlan, undefined, 'periodic damage should cancel Arcane travel')
  assert.ok(distance(damagedTraveller.pos, expectedDotPosition) < 0.0001, 'periodic damage should materialize the current analytical position before cancelling')
}

{
  const activationState = createInitialState('arcane-travel-danger-test', { arcaneTravelMode: 'planned' })
  activationState.time = 120
  activationState.creeps = []
  const traveller = activationState.arcanes.find((arcane) => arcane.team === 'dawn')!
  const enemy = activationState.arcanes.find((arcane) => arcane.team === 'dusk')!
  activationState.arcanes.forEach((arcane) => {
    if (arcane.id !== traveller.id && arcane.id !== enemy.id) arcane.stats.hp = 0
  })
  traveller.pos = { x: 45, y: 50 }
  traveller.target = { x: 60, y: 50 }
  traveller.macroDecision = 'Avancar rota'
  traveller.microDecision = 'Avancando rota'
  traveller.aiMode = 'push_lane'
  traveller.travelPlan = scheduleArcaneTravelPlan(
    undefined,
    'lane',
    traveller.pos,
    traveller.target,
    4,
    activationState.time,
    activationState.time + 1,
    '60.000:50.000',
    'Avancar rota|Avancando rota|push_lane',
    '-',
    traveller.damageTaken,
  )
  enemy.pos = { x: 45 + traveller.visionRange - 0.5, y: 50 }
  const context = createTickFrameContext()
  collectTacticalArcaneTravelActivations(activationState, context)
  assert.equal(context.tacticalActivationArcaneIds?.has(traveller.id), true, 'visible danger should wake Arcane travel before contact')

  addTimedEffect(activationState, traveller, {
    sourceId: enemy.id,
    sourceName: enemy.player,
    sourceTeam: enemy.team,
    kind: 'root',
    polarity: 'negative',
    value: 1,
    duration: 1,
  })
  assert.equal(traveller.travelPlan, undefined, 'movement control should immediately cancel Arcane travel')
}

{
  const kinematicState = createInitialState('arcane-kinematic-fast-path-test', { arcaneTravelMode: 'planned' })
  kinematicState.time = 120
  const arcane = kinematicState.arcanes[0]
  arcane.pos = { x: 30, y: 50 }
  arcane.target = { x: 40, y: 50 }
  arcane.movementDestination = { x: 40, y: 50 }
  arcane.forceDecision = false
  arcane.nextDecisionAt = kinematicState.time + 1
  assert.equal(canUseArcaneKinematicFastPath(arcane, kinematicState, false), true, 'frames between AI decisions should use the kinematic fast path')
  const before = { ...arcane.pos }
  const moved = updateArcaneKinematics(arcane, kinematicState, simulationFrameSeconds)
  assert.ok(distance(moved.pos, before) > 0, 'kinematic frames should keep tactical movement at 30Hz')
  assert.equal(moved.movementDestination, arcane.movementDestination, 'kinematic frames should reuse the resolved destination')
}

{
  const creepPriorityState = createInitialState('ranged-creep-priority-test')
  creepPriorityState.time = 240
  const core = creepPriorityState.arcanes.find((arcane) => arcane.team === 'dawn' && arcane.role === 'Safe Lane')!
  creepPriorityState.arcanes.forEach((arcane) => {
    if (arcane.id !== core.id) arcane.pos = { x: 1, y: 1 }
  })
  core.pos = { x: 50, y: 50 }
  const baseCreeps = spawnWave(creepPriorityState)
  const melee = { ...baseCreeps.find((creep) => creep.team === 'dusk' && creep.lane === core.lane && creep.type === 'melee')!, pos: { x: 51, y: 50 }, hp: 1 }
  const ranged = { ...baseCreeps.find((creep) => creep.team === 'dusk' && creep.lane === core.lane && creep.type === 'mage')!, pos: { x: 51.2, y: 50 }, hp: Math.max(2, getEffectiveArcaneDamage(creepPriorityState, core) * 0.9) }
  assert.equal(getLastHitCandidateFromCreeps(creepPriorityState, core, [melee, ranged], 1.06)?.id, ranged.id, 'a killable ranged creep should outrank a lower-health melee creep')
  const alliedMelee = { ...melee, id: 'deny-melee', team: 'dawn' as const, hp: melee.maxHp * 0.2 }
  const alliedRanged = { ...ranged, id: 'deny-ranged', team: 'dawn' as const, hp: ranged.maxHp * 0.49 }
  assert.equal(getDenyCandidateFromCreeps(core, [alliedMelee, alliedRanged])?.id, alliedRanged.id, 'ranged creep timing should also be explicit for denies')
}

{
  const secureState = createInitialState('ranged-creep-spell-secure-test')
  secureState.time = 300
  const caster = secureState.arcanes.find((arcane) => {
    if (arcane.role.includes('Support')) return false
    arcane.stats.level = 6
    const skill = (getHeroDefinition(arcane.heroDefinitionId).skills ?? []).find((candidate) => {
      arcane.skillLevels = { [candidate.key]: 1 }
      return candidate.kind !== 'passive' && !isUltimateSkill(candidate) && !isPositiveSimpleSkill(candidate) && getSimpleSkillDamage(arcane, candidate, 1) > 0
    })
    if (!skill) return false
    arcane.skillLevels = { [skill.key]: 1 }
    return true
  })!
  assert.ok(caster, 'the imported test roster should contain a core with a simple damage skill')
  secureState.arcanes.forEach((arcane) => {
    if (arcane.id !== caster.id) arcane.stats.hp = 0
  })
  const secureSkill = (getHeroDefinition(caster.heroDefinitionId).skills ?? []).find((skill) => (
    (caster.skillLevels[skill.key] ?? 0) > 0 && getSimpleSkillDamage(caster, skill, 1) > 0
  ))!
  caster.stats.mana = caster.stats.maxMana
  caster.pos = { x: 50, y: 50 }
  const skillDamage = getSimpleSkillDamage(caster, secureSkill, 1)
  const skillRange = getSimpleSkillRange(caster, secureSkill, 1)
  const rangedCreep = {
    ...spawnWave(secureState).find((creep) => creep.team !== caster.team && creep.lane === caster.lane && creep.type === 'mage')!,
    pos: { x: 50 + Math.max(1, skillRange * 0.75), y: 50 },
    hp: Math.max(1, skillDamage - 1),
  }
  secureState.creeps = [rangedCreep]
  assert.equal(getRangedCreepSkillSecureTarget(secureState, caster, [rangedCreep])?.id, rangedCreep.id)
  const manaBeforeSecure = caster.stats.mana
  assert.equal(tryCastRangedCreepSecureSkill(secureState, caster, rangedCreep), true)
  assert.equal(secureState.creeps[0].hp, 0, 'the selected simple skill should secure the ranged creep')
  assert.ok(secureState.arcanes.find((arcane) => arcane.id === caster.id)!.stats.mana < manaBeforeSecure)
  assert.ok((secureState.arcanes.find((arcane) => arcane.id === caster.id)!.itemCooldowns[secureSkill.id] ?? 0) > secureState.time)
}

{
  const teleportState = createInitialState('combat-reinforcement-teleport-test')
  teleportState.time = 600
  const arcane = teleportState.arcanes.find((candidate) => candidate.team === 'dawn' && candidate.role === 'Greedy Support')!
  const farTower = teleportState.towers
    .filter((tower) => tower.team === arcane.team && tower.hp > 0)
    .sort((left, right) => distance(right.pos, arcane.pos) - distance(left.pos, arcane.pos))[0]
  arcane.pos = { ...teleportState.bases.find((base) => base.team === arcane.team)!.pos }
  const reinforcementTeleport = getBestTeleportTarget(teleportState, arcane, farTower.pos, 'Reforcar luta', 'Chegando em skirmish', true)
  assert.ok(reinforcementTeleport, 'a reinforcement should teleport when it materially beats walking to the encounter')
  arcane.stats.mana = arcane.stats.maxMana
  arcane.tpScrolls = 1
  arcane.tpCooldownUntil = 0
  const channelingReinforcement = startTeleportIfUseful(teleportState, arcane, farTower.pos, 'Reforcar luta', 'Chegando em skirmish', true, false)
  assert.equal(channelingReinforcement?.channeling?.kind, 'teleport', 'a qualified reinforcement should start the teleport channel')
  teleportState.arcanes = teleportState.arcanes.map((candidate) => candidate.id === arcane.id ? channelingReinforcement! : candidate)
  teleportState.time = channelingReinforcement!.channeling!.completesAt
  resolveCompletedChannels(teleportState)
  assert.deepEqual(
    teleportState.arcanes.find((candidate) => candidate.id === arcane.id)!.pos,
    channelingReinforcement!.channeling!.target,
    'generic channel completion should preserve teleport arrival',
  )
  assert.equal(getBestTeleportTarget(teleportState, arcane, { x: arcane.pos.x + 5, y: arcane.pos.y }, 'Reforcar luta', 'Chegando em skirmish', true), undefined)
}

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
  retaliationState.time = 120
  retaliationState.camps.forEach((camp) => { camp.hp = camp.maxHp; camp.respawn = 0 })
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
  const disciplineState = createInitialState('neutral-target-discipline-test')
  disciplineState.time = 180
  disciplineState.camps.forEach((camp) => { camp.hp = camp.maxHp; camp.respawn = 0 })
  disciplineState.arcanes.forEach((arcane) => { arcane.pos = { x: 1, y: 1 } })
  const ranged = disciplineState.arcanes.find((arcane) => arcane.stats.attackType === 'ranged')!
  const camp = disciplineState.camps.find((candidate) => candidate.strength === 'weak')!
  ranged.pos = { x: camp.pos.x + Math.max(camp.range + 0.4, Math.min(ranged.stats.range, 6)), y: camp.pos.y }
  ranged.microDecision = 'Avancando rota'
  const campHpBefore = camp.hp
  resolveCombat(disciplineState, createTickFrameContext())
  assert.equal(disciplineState.camps.find((candidate) => candidate.id === camp.id)!.hp, campHpBefore, 'a non-jungling Arcane should not poke a neutral camp opportunistically')
}

{
  const stackState = createInitialState('single-stacker-per-minute-test')
  stackState.time = 111.99
  stackState.camps.forEach((camp) => {
    camp.pos = { x: 50, y: 50 }
    camp.hp = camp.maxHp
    camp.respawn = 0
  })
  stackState.arcanes.forEach((arcane) => {
    arcane.stats.hp = 0
    arcane.pos = { x: 1, y: 1 }
  })
  const stacker = stackState.arcanes.find((arcane) => arcane.role === 'Dedicated Support')!
  stacker.stats.hp = stacker.stats.maxHp
  stacker.pos = { x: 50, y: 50 }
  stacker.microDecision = 'Aguardando oportunidade'
  stackState.time = 112.01
  processJungleStacks(stackState, 111.99)
  assert.ok(stackState.camps.filter((camp) => camp.stackCount > 0).length <= 1, 'one Arcane may only stack one camp per minute')
  assert.ok(getJungleStackChance(stackState, stackState.camps[0], stacker) <= 0.5, 'stack chance should remain capped')
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
  const indexSeed = createInitialState('entity-index-regression')
  indexSeed.time = -simulationFrameSeconds
  const indexedState = tick(indexSeed, simulationFrameSeconds, true)
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

  const analyzedState = createInitialState('analyzed-state-dependency-cache')
  const analyzed = getAnalyzedGameState(analyzedState)
  const copiedState = { ...analyzedState, teamCalls: { ...analyzedState.teamCalls } }
  assert.strictEqual(
    getAnalyzedGameState(copiedState),
    analyzed,
    'state copies with unchanged snapshot dependencies should reuse analyzed state',
  )
  const changedArcanesState = { ...copiedState, arcanes: [...copiedState.arcanes] }
  assert.notStrictEqual(
    getAnalyzedGameState(changedArcanesState),
    analyzed,
    'changing a snapshot dependency should rebuild analyzed state',
  )
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
  const targetedDamageState = createStateAtGameStart('targeted-damage-regression')
  targetedDamageState.creepStorageMode = 'object'
  targetedDamageState.creepComponents = undefined
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
  assert.strictEqual(targetedDamageState.creeps, collectionsBefore.creeps, 'damage should retain the creep collection while replacing its target')
  assert.equal(targetedDamageState.creeps[0].hp, creep.hp - 10, 'targeted creep damage should update the indexed entity')
  assert.strictEqual(targetedDamageState.arcanes, collectionsBefore.arcanes, 'unrelated arcane collections should retain identity')
  assert.strictEqual(targetedDamageState.towers, collectionsBefore.towers, 'unrelated tower collections should retain identity')
  assert.strictEqual(targetedDamageState.structures, collectionsBefore.structures, 'unrelated structure collections should retain identity')
  assert.strictEqual(targetedDamageState.bases, collectionsBefore.bases, 'unrelated base collections should retain identity')
  assert.strictEqual(targetedDamageState.camps, collectionsBefore.camps, 'unrelated camp collections should retain identity')
}

{
  const targetedDamageState = createStateAtGameStart('targeted-damage-soa-regression')
  const creep = targetedDamageState.creeps[0]
  const creepsBefore = targetedDamageState.creeps
  const hpBefore = creep.hp
  const source = { id: 'test-environment', label: 'Test', team: creep.team === 'dawn' ? 'dusk' : 'dawn', damageType: 'pure' } as const
  damageEntity(targetedDamageState, creep.id, 10, source)
  assert.strictEqual(targetedDamageState.creeps, creepsBefore, 'SoA damage should retain the stable creep facade collection')
  assert.notStrictEqual(targetedDamageState.creeps[0], creep, 'SoA damage should preserve object-mode target reference semantics')
  assert.equal(targetedDamageState.creeps[0].hp, hpBefore - 10, 'SoA damage should update the typed HP component')
}

{
  const scheduledState = createStateAtGameStart('fixed-attack-schedule')
  const tower = scheduledState.towers.find((candidate) => candidate.team === 'dawn')!
  const target = scheduledState.creeps.find((candidate) => candidate.team === 'dusk')!
  tower.lastAttack = -10
  target.pos = { ...tower.pos }
  target.motionPlan = undefined
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
  const priorityState = createStateAtGameStart('last-hit-before-deny')
  const arcane = priorityState.arcanes.find((candidate) => candidate.team === 'dawn' && candidate.lane === 'top')!
  const enemyCreep = priorityState.creeps.find((candidate) => candidate.team === 'dusk' && candidate.lane === arcane.lane)!
  const alliedCreep = priorityState.creeps.find((candidate) => candidate.team === arcane.team && candidate.lane === arcane.lane)!
  arcane.pos = { x: 50, y: 50 }
  arcane.lastAttack = -10
  arcane.nextCombatEvaluationAt = priorityState.time
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
  const retainedState = createStateAtGameStart('retained-combat-target')
  const arcane = retainedState.arcanes.find((candidate) => candidate.team === 'dawn' && candidate.lane === 'top')!
  const enemyCreep = retainedState.creeps.find((candidate) => candidate.team !== arcane.team && candidate.lane === arcane.lane)!
  arcane.pos = { x: 50, y: 50 }
  enemyCreep.pos = { x: 50.2, y: 50 }
  enemyCreep.hp = 1
  arcane.combatTargetId = enemyCreep.id
  arcane.combatTargetIntent = 'last_hit'
  assert.equal(getRetainedArcaneCombatTarget(retainedState, arcane)?.target.id, enemyCreep.id, 'a reachable last hit should retain its target')

  enemyCreep.hp = enemyCreep.maxHp
  assert.equal(getRetainedArcaneCombatTarget(retainedState, arcane), undefined, 'a last hit outside its damage window must be invalidated')

  enemyCreep.hp = 1
  arcane.combatTargetId = enemyCreep.id
  arcane.combatTargetIntent = 'last_hit'
  damageEntity(retainedState, enemyCreep.id, 0, { id: 'lane-pressure', label: 'Lane pressure', team: arcane.team })
  assert.equal(arcane.combatTargetId, undefined, 'lane creep damage should wake nearby Arcanes and clear retained targets')
  assert.equal(arcane.nextCombatEvaluationAt, retainedState.time, 'lane creep damage should schedule an immediate economic reevaluation')
}

{
  const focusState = createStateAtGameStart('combat-focus-attack-priority')
  focusState.time = 200
  const attacker = focusState.arcanes.find((arcane) => arcane.team === 'dawn')!
  const [closerEnemy, focusedEnemy] = focusState.arcanes.filter((arcane) => arcane.team === 'dusk').slice(0, 2)
  attacker.pos = { x: 50, y: 50 }
  attacker.lastAttack = 190
  attacker.nextCombatEvaluationAt = focusState.time
  attacker.items = []
  attacker.skillLevels = {}
  closerEnemy.pos = { x: 50.15, y: 50 }
  focusedEnemy.pos = { x: 50.3, y: 50 }
  closerEnemy.lastAttack = Number.POSITIVE_INFINITY
  focusedEnemy.lastAttack = Number.POSITIVE_INFINITY
  closerEnemy.skillLevels = {}
  focusedEnemy.skillLevels = {}
  focusState.arcanes = focusState.arcanes.map((arcane) => (
    arcane.id === attacker.id || arcane.id === closerEnemy.id || arcane.id === focusedEnemy.id
      ? arcane
      : { ...arcane, stats: { ...arcane.stats, hp: 0 } }
  ))
  focusState.creeps = []
  focusState.towers = []
  focusState.structures = []
  focusState.camps = []
  focusState.boss.hp = 0
  const focusedState = updateCombatAiFoundation(focusState)
  focusedState.combatBlackboards.dawn[0].primaryTargetId = focusedEnemy.id
  const closerHp = closerEnemy.stats.hp
  const focusedHp = focusedEnemy.stats.hp
  resolveCombat(focusedState, createTickFrameContext())
  assert.equal(focusedState.arcanes.find((arcane) => arcane.id === closerEnemy.id)!.stats.hp, closerHp, 'basic attacks should not abandon team focus for the nearest enemy')
  assert.ok(focusedState.arcanes.find((arcane) => arcane.id === focusedEnemy.id)!.stats.hp < focusedHp, 'the reachable shared focus should receive the basic attack')
}

{
  const cooldownState = createInitialState('skill-cooldown-regression')
  const caster = cooldownState.arcanes.find((arcane) => arcane.team === 'dawn')!
  const enemy = cooldownState.arcanes.find((arcane) => arcane.team === 'dusk')!
  caster.heroDefinitionId = 'h067_silence_warden'
  caster.skillLevels = { Q: 1 }
  caster.stats.mana = caster.stats.maxMana
  caster.microDecision = 'Limpando campo neutro'
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
  assert.equal(liveCaster.microDecision, 'Limpando campo neutro', 'casting a skill should not erase the current tactical commitment')
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
  const channelState = createInitialState('skill-channel-completion')
  channelState.time = 100
  const caster = channelState.arcanes.find((arcane) => arcane.team === 'dawn')!
  const target = channelState.arcanes.find((arcane) => arcane.team === 'dusk')!
  caster.heroDefinitionId = 'h003_nightmare_controller'
  caster.skillLevels = { R: 1 }
  caster.pos = { x: 50, y: 50 }
  caster.aiMode = 'join_fight'
  target.pos = { x: 52, y: 50 }
  caster.stats.maxMana = 1000
  caster.stats.mana = 1000
  const skill = getHeroDefinition(caster.heroDefinitionId).skills!.find((candidate) => candidate.key === 'R')!
  const targetHpBefore = target.stats.hp
  const manaBefore = caster.stats.mana

  assert.equal(castSimpleSkill(channelState, caster, skill, 1, target, true), true)
  let liveCaster = channelState.arcanes.find((arcane) => arcane.id === caster.id)!
  assert.equal(liveCaster.channeling?.completesAt, 104.75, 'channel duration should use the imported channelTime')
  assert.equal(channelState.arcanes.find((arcane) => arcane.id === target.id)!.stats.hp, targetHpBefore, 'channeled effects must not resolve at cast start')
  assert.equal(liveCaster.stats.mana, manaBefore - 200, 'channel mana should be committed at cast start')

  channelState.time = 104.7
  resolveCompletedChannels(channelState)
  assert.equal(channelState.arcanes.find((arcane) => arcane.id === target.id)!.stats.hp, targetHpBefore, 'channel effects must wait for completion')

  channelState.time = 104.75
  resolveCompletedChannels(channelState)
  liveCaster = channelState.arcanes.find((arcane) => arcane.id === caster.id)!
  assert.equal(liveCaster.channeling, undefined)
  assert.ok(channelState.arcanes.find((arcane) => arcane.id === target.id)!.stats.hp < targetHpBefore, 'completed channels should resolve their effect')
  assert.equal(liveCaster.stats.mana, manaBefore - 200, 'channel completion must not charge mana twice')
}

{
  const interruptedState = createInitialState('skill-channel-interruption')
  interruptedState.time = 200
  const caster = interruptedState.arcanes.find((arcane) => arcane.team === 'dawn')!
  const target = interruptedState.arcanes.find((arcane) => arcane.team === 'dusk')!
  caster.heroDefinitionId = 'h003_nightmare_controller'
  caster.skillLevels = { R: 1 }
  caster.pos = { x: 50, y: 50 }
  caster.aiMode = 'join_fight'
  target.pos = { x: 52, y: 50 }
  caster.stats.maxMana = 1000
  caster.stats.mana = 1000
  const skill = getHeroDefinition(caster.heroDefinitionId).skills!.find((candidate) => candidate.key === 'R')!
  const targetHpBefore = target.stats.hp
  assert.equal(castSimpleSkill(interruptedState, caster, skill, 1, target, true), true)
  addTimedEffect(interruptedState, caster, {
    sourceId: 'test-stun',
    sourceName: 'Test Stun',
    sourceTeam: target.team,
    kind: 'stun',
    polarity: 'negative',
    value: 1,
    duration: 6,
  })
  interruptedState.time = 204.75
  resolveCompletedChannels(interruptedState)
  const interruptedCaster = interruptedState.arcanes.find((arcane) => arcane.id === caster.id)!
  assert.equal(interruptedCaster.channeling, undefined)
  assert.match(interruptedCaster.microDecision, /interrompido/)
  assert.equal(interruptedState.arcanes.find((arcane) => arcane.id === target.id)!.stats.hp, targetHpBefore, 'interrupted channels must not resolve their effect')
}

{
  const wardChannelState = createInitialState('summon-channel-lifetime')
  wardChannelState.time = 300
  const caster = wardChannelState.arcanes.find((arcane) => arcane.team === 'dawn')!
  const target = wardChannelState.arcanes.find((arcane) => arcane.team === 'dusk')!
  caster.heroDefinitionId = 'h023_witch_shaman'
  caster.skillLevels = { R: 1 }
  caster.pos = { x: 50, y: 50 }
  caster.aiMode = 'join_fight'
  caster.stats.maxMana = 1000
  caster.stats.mana = 1000
  target.pos = { x: 52, y: 50 }
  const deathWard = getHeroDefinition(caster.heroDefinitionId).skills!.find((candidate) => candidate.key === 'R')!

  assert.equal(castSimpleSkill(wardChannelState, caster, deathWard, 1, target, true), true)
  assert.equal(wardChannelState.summons.length, 1, 'channeled summons should materialize when channeling starts')
  assert.equal(wardChannelState.summons[0].channelBound, true)
  assert.equal(wardChannelState.summons[0].canMove, false)

  const targetHpBeforeCompletion = target.stats.hp
  wardChannelState.time = caster.channeling!.completesAt
  resolveCompletedChannels(wardChannelState)
  assert.equal(target.stats.hp, targetHpBeforeCompletion, 'the ward should deal damage through its own attacks, not a generic completion hit')
  updateSummonedUnits(wardChannelState, 0.1)
  resolveDeaths(wardChannelState)
  assert.equal(wardChannelState.summons.length, 0, 'channel-bound summons should despawn when channeling ends')
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
  structureState.time = 0
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
  const namedControl: HeroSkillDefinition = {
    ...areaRoot,
    id: 'named-control-test',
    tags: ['fear', 'disarm', 'mute'],
    mechanics: ['fear', 'disarm', 'mute'],
    values: { fearDuration: 1.4, disarmDuration: 2.2, duration: 3 },
  }
  applySimpleNegativeSkillEffects(skillState, caster, namedControl, 1, enemies[1])
  assert.equal(hasTimedEffect(skillState, enemies[1].id, 'fear'), true, 'fear should reach the effective timed-control runtime')
  assert.equal(hasTimedEffect(skillState, enemies[1].id, 'disarm'), true, 'disarm should reach the effective timed-control runtime')
  assert.equal(hasTimedEffect(skillState, enemies[1].id, 'mute'), true, 'mute should use the base duration when the official skill has no dedicated duration')
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

  skillState.time = 120
  applySimpleSkillSummonPressure(skillState, caster, areaRoot, { ...profile, summonCount: 3, summonDuration: 20 })
  assert.equal(skillState.summons.length, 3, 'summon skills should spawn independent simulation entities')
  assert.ok(skillState.summons.every((summon) => (
    summon.ownerId === caster.id && summon.sourceSkillId === areaRoot.id && summon.expiresAt === 140
  )), 'summons should preserve ownership, source skill, and lifetime')

  const summonFrame = createMatchRenderFrame(skillState)
  const summonReplayState = materializeMatchRenderFrame(summonFrame, createMatchStaticData(skillState))
  assert.equal(summonReplayState.summons.length, 3, 'summons should survive replay serialization')
  assert.equal(summonReplayState.summons[0].ownerId, caster.id, 'replay summons should preserve their owner')
  const summonReplayStore = new ReplayFrameStore()
  summonReplayStore.appendChunk(new ReplayChunkEncoder().encode([summonFrame]))
  assert.equal(summonReplayStore.get(0).summons.length, 3, 'compressed replay chunks should retain dynamic summons')

  const attackingSummon = skillState.summons[0]
  const summonTarget = skillState.arcanes.find((arcane) => arcane.id === enemies[0].id)!
  attackingSummon.pos = { ...summonTarget.pos }
  attackingSummon.targetId = summonTarget.id
  attackingSummon.lastAttack = skillState.time - attackingSummon.attackInterval
  const targetHpBeforeSummonAttack = summonTarget.stats.hp
  resolveCombat(skillState, createTickFrameContext(), new Set([attackingSummon.id]))
  assert.ok(skillState.arcanes.find((arcane) => arcane.id === summonTarget.id)!.stats.hp < targetHpBeforeSummonAttack, 'summons should perform independent basic attacks')

  const bountySummon = skillState.summons[1]
  bountySummon.team = summonTarget.team
  const goldBeforeSummonKill = skillState.arcanes.find((arcane) => arcane.id === caster.id)!.stats.gold
  damageEntity(skillState, bountySummon.id, bountySummon.hp + 1, { id: caster.id, label: caster.player, team: caster.team })
  resolveDeaths(skillState)
  assert.ok(skillState.arcanes.find((arcane) => arcane.id === caster.id)!.stats.gold > goldBeforeSummonKill, 'the enemy summon last hitter should receive its bounty')

  const expiringSummon = skillState.summons[0]
  expiringSummon.expiresAt = skillState.time
  resolveDeaths(skillState)
  assert.equal(skillState.summons.some((summon) => summon.id === expiringSummon.id), false, 'expired summons should despawn without a kill')

  skillState.summons = []
  const liveCaster = skillState.arcanes.find((arcane) => arcane.id === caster.id)!
  applySimpleSkillSummonPressure(skillState, liveCaster, areaRoot, {
    ...profile,
    summonCount: 1,
    summonDuration: 30,
    summonArchetype: 'ward',
    summonMode: 'cast',
    summonHp: 300,
    summonDamage: 80,
    summonRange: 560,
    summonMoveSpeed: 500,
  })
  const wardSummon = skillState.summons[0]
  assert.equal(wardSummon.archetype, 'ward')
  assert.equal(wardSummon.canMove, false, 'combat wards should remain at their cast point')
  assert.equal(wardSummon.maxHp, 300, 'summons should prefer imported health')
  assert.equal(wardSummon.damage, 80, 'summons should prefer imported damage')
  assert.equal(wardSummon.range, 4, 'official world attack range should convert to map units')

  skillState.summons = []
  applySimpleSkillSummonPressure(skillState, liveCaster, areaRoot, {
    ...profile,
    summonCount: 1,
    summonDuration: 30,
    summonArchetype: 'illusion',
    summonMode: 'cast',
    summonOutgoingDamagePct: 25,
    summonIncomingDamagePct: 350,
  })
  const illusion = skillState.summons[0]
  assert.equal(illusion.maxHp, liveCaster.stats.maxHp, 'illusions should copy their owner health pool')
  assert.equal(illusion.damage, Math.round(getIllusionInheritedAttackDamage(liveCaster) * 0.25), 'illusions should scale inherited attribute damage by the official output percentage')
  assert.equal(illusion.armor, getEffectiveArcaneArmor(skillState, liveCaster), 'illusions should snapshot effective owner armor')
  assert.equal(illusion.magicResistance, liveCaster.stats.magicResistance)
  assert.equal(illusion.range, liveCaster.stats.range)
  assert.equal(illusion.visionRange, liveCaster.visionRange)
  assert.equal(illusion.moveSpeed, getEffectiveArcaneMoveSpeed(skillState, liveCaster))
  assert.equal(illusion.attackInterval, getEffectiveArcaneAttackCooldown(skillState, liveCaster))
  assert.equal(illusion.buildingDamageMultiplier, 0.35)
  assert.equal(getSummonAttackDamage(illusion, skillState.towers.find((tower) => tower.team !== illusion.team)!), illusion.damage * 0.35)
  const illusionHp = illusion.hp
  damageEntity(skillState, illusion.id, 20, {
    id: summonTarget.id,
    label: summonTarget.player,
    team: summonTarget.team,
    damageType: 'pure',
  })
  assert.equal(skillState.summons[0].hp, illusionHp - 70, 'illusion incoming damage should use the official amplification')
  const inheritedReplay = materializeMatchRenderFrame(createMatchRenderFrame(skillState), createMatchStaticData(skillState)).summons[0]
  assert.ok(Math.abs(inheritedReplay.armor - illusion.armor) < 0.001, 'replay should preserve illusion armor within frame precision')
  assert.equal(inheritedReplay.magicResistance, illusion.magicResistance)
  assert.equal(inheritedReplay.buildingDamageMultiplier, 0.35)

  const cloneState = createInitialState('tempest-clone-inheritance')
  cloneState.time = 600
  const cloneOwner = cloneState.arcanes[0]
  cloneOwner.heroDefinitionId = 'h105_arc_double'
  cloneOwner.skillLevels = { Q: 2, R: 1 }
  cloneOwner.stats.maxHp = cloneOwner.stats.hp = 2_400
  cloneOwner.stats.damage = cloneOwner.stats.damageMin = cloneOwner.stats.damageMax = 160
  cloneOwner.stats.armor = 11
  cloneOwner.stats.magicResistance = 31
  cloneOwner.stats.range = 6.2
  cloneOwner.stats.moveSpeed = 7.1
  cloneOwner.stats.attackSpeed = 0.72
  cloneOwner.stats.maxMana = 900
  cloneOwner.stats.mana = 640
  cloneOwner.visionRange = 12
  const tempestDouble = getHeroDefinition(cloneOwner.heroDefinitionId).skills!.find((candidate) => candidate.sourceAbilityId === 5683)!
  applySimpleSkillSummonPressure(cloneState, cloneOwner, tempestDouble, getSkillEffectProfile(tempestDouble, 1), cloneOwner.pos)
  const clone = cloneState.summons[0]
  assert.equal(clone.archetype, 'clone')
  assert.equal(clone.maxHp, 2_400)
  assert.equal(clone.damage, Math.round(getEffectiveArcaneDamage(cloneState, cloneOwner) * 0.75), 'the adapted clone restriction should apply 75% outgoing damage')
  assert.equal(clone.damageTakenMultiplier, 1.5)
  assert.equal(clone.armor, 11)
  assert.equal(clone.magicResistance, 31)
  assert.equal(clone.range, 6.2)
  assert.equal(clone.visionRange, 12)
  assert.equal(clone.moveSpeed, 7.1)
  assert.equal(clone.attackInterval, 0.72)
  assert.equal(clone.goldReward, 70)
  assert.equal(clone.xpReward, 70)
  assert.equal(clone.mana, 640)
  assert.equal(clone.maxMana, 900)
  assert.deepEqual(clone.inheritedSkillLevels, { Q: 2, R: 1 })
  const cloneTarget = cloneState.arcanes.find((arcane) => arcane.team !== clone.team)!
  cloneTarget.pos = { x: clone.pos.x + 3, y: clone.pos.y }
  cloneState.arcanes
    .filter((arcane) => arcane.team !== clone.team && arcane.id !== cloneTarget.id)
    .forEach((arcane) => { arcane.pos = { x: 90, y: 90 } })
  const flux = getArcaneRuntimeSkills(cloneOwner).find((skill) => skill.sourceAbilityId === 5677)!
  cloneOwner.itemCooldowns[flux.id] = cloneState.time + 99
  const cloneManaBeforeFlux = clone.mana!
  assert.equal(tryUseTempestDoubleSkill(cloneState, clone), true, 'Tempest Double should cast learned owner spells')
  assert.equal(clone.mana, cloneManaBeforeFlux - 75, 'the clone should spend its own mana pool')
  assert.ok((clone.abilityCooldowns?.[flux.id] ?? 0) > cloneState.time, 'the clone should own a separate spell cooldown')
  assert.equal(cloneOwner.itemCooldowns[flux.id], cloneState.time + 99, 'clone casts must not consume or reset the owner cooldown')
  assert.equal(clone.abilityCooldowns?.[tempestDouble.id], undefined, 'the clone must never cast Tempest Double recursively')
  assert.equal(hasTimedEffect(cloneState, cloneTarget.id, 'dot'), true)
  assert.equal(hasTimedEffect(cloneState, cloneTarget.id, 'slow'), true)
  cloneOwner.skillLevels.Q = 0
  assert.equal(clone.inheritedSkillLevels?.Q, 2, 'the learned kit should remain a birth snapshot')

  cloneState.time = clone.spawnedAt + (clone.expiresAt - clone.spawnedAt) / 2
  assert.ok(Math.abs(getTempestDoubleAccuracyPct(cloneState, clone) - 0.825) < 0.0001)
  assert.ok(Math.abs(getEffectiveSummonMoveSpeed(cloneState, clone) - clone.moveSpeed * 0.825) < 0.0001)

  const fieldState = createInitialState('tempest-clone-field')
  fieldState.time = 600
  const fieldOwner = fieldState.arcanes[0]
  fieldOwner.heroDefinitionId = 'h105_arc_double'
  fieldOwner.skillLevels = { W: 2, R: 1 }
  fieldOwner.stats.mana = fieldOwner.stats.maxMana = 800
  const fieldSkill = getHeroDefinition(fieldOwner.heroDefinitionId).skills!.find((candidate) => candidate.sourceAbilityId === 5683)!
  applySimpleSkillSummonPressure(fieldState, fieldOwner, fieldSkill, getSkillEffectProfile(fieldSkill, 1), fieldOwner.pos)
  const fieldClone = fieldState.summons[0]
  const fieldEnemy = fieldState.arcanes.find((arcane) => arcane.team !== fieldClone.team)!
  fieldEnemy.pos = { x: fieldClone.pos.x + 3, y: fieldClone.pos.y }
  fieldState.arcanes.filter((arcane) => arcane.team !== fieldClone.team && arcane.id !== fieldEnemy.id).forEach((arcane) => { arcane.pos = { x: 90, y: 90 } })
  assert.equal(tryUseTempestDoubleSkill(fieldState, fieldClone), true)
  assert.ok(fieldClone.cloneField && fieldClone.cloneField.expiresAt > fieldState.time)
  assert.ok(getEffectiveSummonAttackInterval(fieldState, fieldClone) < fieldClone.attackInterval)
  const fieldHp = fieldClone.hp
  damageEntity(fieldState, fieldClone.id, 300, { id: fieldEnemy.id, label: fieldEnemy.player, team: fieldEnemy.team, damageType: 'physical' })
  assert.equal(fieldState.summons[0].hp, fieldHp, 'Magnetic Field should evade physical attacks while the clone remains inside it')

  const sparkState = createInitialState('tempest-clone-spark')
  sparkState.time = 600
  const sparkOwner = sparkState.arcanes[0]
  sparkOwner.heroDefinitionId = 'h105_arc_double'
  sparkOwner.skillLevels = { E: 3, R: 1 }
  sparkOwner.stats.mana = sparkOwner.stats.maxMana = 800
  const sparkDouble = getHeroDefinition(sparkOwner.heroDefinitionId).skills!.find((candidate) => candidate.sourceAbilityId === 5683)!
  applySimpleSkillSummonPressure(sparkState, sparkOwner, sparkDouble, getSkillEffectProfile(sparkDouble, 1), sparkOwner.pos)
  const sparkClone = sparkState.summons[0]
  const sparkTarget = sparkState.arcanes.find((arcane) => arcane.team !== sparkClone.team)!
  sparkTarget.pos = { x: sparkClone.pos.x + 4, y: sparkClone.pos.y }
  sparkState.arcanes.filter((arcane) => arcane.team !== sparkClone.team && arcane.id !== sparkTarget.id).forEach((arcane) => { arcane.pos = { x: 90, y: 90 } })
  const sparkTargetHp = sparkTarget.stats.hp
  assert.equal(tryUseTempestDoubleSkill(sparkState, sparkClone), true)
  assert.equal(sparkTarget.stats.hp, sparkTargetHp, 'Spark Wraith should arm before dealing damage')
  assert.equal(sparkClone.clonePendingCasts?.length, 1)
  sparkState.time = sparkClone.clonePendingCasts![0].activatesAt
  assert.equal(tryUseTempestDoubleSkill(sparkState, sparkClone), true)
  assert.ok(sparkState.arcanes.find((arcane) => arcane.id === sparkTarget.id)!.stats.hp < sparkTargetHp, 'an armed Spark Wraith should hit a unit entering its trigger radius')
  assert.equal(sparkClone.clonePendingCasts?.length, 0)

  const activeItemById = (id: string) => shopCatalog.find((item) => item.id === id)!
  assert.equal(isTempestDoubleItemActiveAllowed(activeItemById('i142_burst_wand')), true)
  assert.equal(isTempestDoubleItemActiveAllowed(activeItemById('i068_magic_wand')), false, 'charge-based items should be forbidden on the clone')
  assert.equal(isTempestDoubleItemActiveAllowed(activeItemById('i011_refillable_bottle')), false, 'stored consumables should be forbidden on the clone')
  assert.equal(isTempestDoubleItemActiveAllowed(activeItemById('i134_moon_shard_generic')), false, 'permanently consumed upgrades should be forbidden on the clone')
  assert.equal(isTempestDoubleItemActiveAllowed(activeItemById('i138_refresh_orb_generic')), false, 'Refresher should be forbidden on the clone')
  assert.equal(isTempestDoubleInventoryItemAllowed('Burst Wand'), true)
  assert.equal(isTempestDoubleInventoryItemAllowed('Magic Wand'), true, 'charge items should retain their passive stats without copying charges')
  assert.equal(isTempestDoubleInventoryItemAllowed('Mana Clarity'), false, 'consumables should not enter the clone inventory')
  assert.equal(isTempestDoubleInventoryItemAllowed(activeItemById('i133_divine_relic').name), false, 'drop-on-death items should not enter the clone inventory')
  assert.equal(isTempestDoubleInventoryItemAllowed(activeItemById('i134_moon_shard_generic').name), false)

  const cloneInventoryState = createInitialState('tempest-clone-inventory-filter')
  cloneInventoryState.time = 600
  const cloneInventoryOwner = cloneInventoryState.arcanes[0]
  cloneInventoryOwner.heroDefinitionId = 'h105_arc_double'
  cloneInventoryOwner.skillLevels = { R: 1 }
  const divineRelicName = activeItemById('i133_divine_relic').name
  cloneInventoryOwner.items = ['Burst Wand', 'Mana Clarity', divineRelicName]
  cloneInventoryOwner.stats = buildArcaneStats(
    cloneInventoryOwner.heroDefinitionId,
    12,
    12_000,
    cloneInventoryOwner.stats.xp,
    1,
    0.65,
    cloneInventoryOwner.items,
  )
  const eligibleCloneStats = buildArcaneStats(
    cloneInventoryOwner.heroDefinitionId,
    12,
    12_000,
    cloneInventoryOwner.stats.xp,
    1,
    0.65,
    ['Burst Wand'],
  )
  const eligibleCloneSource = { ...cloneInventoryOwner, items: ['Burst Wand'], stats: eligibleCloneStats }
  const cloneInventoryDouble = getHeroDefinition(cloneInventoryOwner.heroDefinitionId).skills!.find((candidate) => candidate.sourceAbilityId === 5683)!
  applySimpleSkillSummonPressure(cloneInventoryState, cloneInventoryOwner, cloneInventoryDouble, getSkillEffectProfile(cloneInventoryDouble, 1), cloneInventoryOwner.pos)
  const filteredInventoryClone = cloneInventoryState.summons[0]
  assert.deepEqual(filteredInventoryClone.inheritedItems, ['Burst Wand'])
  assert.equal(filteredInventoryClone.maxHp, eligibleCloneStats.maxHp)
  assert.equal(filteredInventoryClone.maxMana, eligibleCloneStats.maxMana)
  assert.equal(filteredInventoryClone.mana, eligibleCloneStats.mana)
  assert.equal(filteredInventoryClone.damage, Math.round(getCloneInheritedAttackDamage(cloneInventoryState, eligibleCloneSource) * 0.75))
  assert.ok(cloneInventoryOwner.stats.damage > eligibleCloneStats.damage, 'the owner should keep the drop-on-death damage that the clone cannot inherit')

  const cloneItemState = createInitialState('tempest-clone-active-item')
  cloneItemState.time = 600
  const cloneItemOwner = cloneItemState.arcanes[0]
  cloneItemOwner.heroDefinitionId = 'h105_arc_double'
  cloneItemOwner.skillLevels = { R: 1 }
  cloneItemOwner.items = ['Burst Wand']
  cloneItemOwner.stats.mana = cloneItemOwner.stats.maxMana = 800
  const cloneItemDouble = getHeroDefinition(cloneItemOwner.heroDefinitionId).skills!.find((candidate) => candidate.sourceAbilityId === 5683)!
  applySimpleSkillSummonPressure(cloneItemState, cloneItemOwner, cloneItemDouble, getSkillEffectProfile(cloneItemDouble, 1), cloneItemOwner.pos)
  const activeItemClone = cloneItemState.summons[0]
  const activeItemTarget = cloneItemState.arcanes.find((arcane) => arcane.team !== activeItemClone.team)!
  activeItemTarget.pos = { x: activeItemClone.pos.x + 4, y: activeItemClone.pos.y }
  cloneItemState.arcanes.filter((arcane) => arcane.team !== activeItemClone.team && arcane.id !== activeItemTarget.id).forEach((arcane) => { arcane.pos = { x: 90, y: 90 } })
  const burstWand = activeItemById('i142_burst_wand')
  cloneItemOwner.itemCooldowns[burstWand.name] = cloneItemState.time + 99
  const activeItemTargetHp = activeItemTarget.stats.hp
  assert.deepEqual(getTempestDoubleAllowedActiveItems(activeItemClone).map((item) => item.id), ['i142_burst_wand'])
  assert.equal(tryUseTempestDoubleItem(cloneItemState, activeItemClone), true)
  assert.ok(cloneItemState.arcanes.find((arcane) => arcane.id === activeItemTarget.id)!.stats.hp < activeItemTargetHp)
  assert.ok((activeItemClone.itemCooldowns?.[burstWand.name] ?? 0) > cloneItemState.time)
  assert.equal(cloneItemOwner.itemCooldowns[burstWand.name], cloneItemState.time + 99, 'item cooldowns should be independent between owner and clone')

  const cloneBarrierState = createInitialState('tempest-clone-active-barrier')
  cloneBarrierState.time = 600
  const cloneBarrierOwner = cloneBarrierState.arcanes[0]
  cloneBarrierOwner.heroDefinitionId = 'h105_arc_double'
  cloneBarrierOwner.skillLevels = { R: 1 }
  cloneBarrierOwner.items = ['Pavise Barrier']
  const cloneBarrierDouble = getHeroDefinition(cloneBarrierOwner.heroDefinitionId).skills!.find((candidate) => candidate.sourceAbilityId === 5683)!
  applySimpleSkillSummonPressure(cloneBarrierState, cloneBarrierOwner, cloneBarrierDouble, getSkillEffectProfile(cloneBarrierDouble, 1), cloneBarrierOwner.pos)
  const barrierClone = cloneBarrierState.summons[0]
  cloneBarrierState.arcanes.filter((arcane) => arcane.team === barrierClone.team).forEach((arcane) => { arcane.pos = { x: 90, y: 90 } })
  barrierClone.hp = barrierClone.maxHp * 0.4
  const barrierHp = barrierClone.hp
  assert.equal(tryUseTempestDoubleItem(cloneBarrierState, barrierClone), true)
  assert.ok((barrierClone.cloneItemEffects?.[0].barrierRemaining ?? 0) > 0)
  const barrierAttacker = cloneBarrierState.arcanes.find((arcane) => arcane.team !== barrierClone.team)!
  damageEntity(cloneBarrierState, barrierClone.id, 100, {
    id: barrierAttacker.id,
    label: barrierAttacker.player,
    team: barrierAttacker.team,
    damageType: 'physical',
  })
  assert.equal(cloneBarrierState.summons[0].hp, barrierHp, 'an eligible clone barrier should absorb incoming damage')
  assert.ok((cloneBarrierState.summons[0].cloneItemEffects?.[0].barrierRemaining ?? 300) < 300)

  const inheritanceState = createInitialState('hero-like-inheritance-policy')
  inheritanceState.time = 600
  const inheritanceOwner = inheritanceState.arcanes.find((arcane) => arcane.team === 'dawn')!
  const inheritanceTarget = inheritanceState.arcanes.find((arcane) => arcane.team === 'dusk')!
  const inheritedItems = ['Crystal Edge', 'Diffusal Edge', 'Chain Lightning Hammer']
  inheritanceOwner.heroDefinitionId = 'h101_demon_metamorph'
  inheritanceOwner.skillLevels = {}
  inheritanceOwner.items = inheritedItems
  inheritanceOwner.stats = buildArcaneStats(
    inheritanceOwner.heroDefinitionId,
    18,
    8_000,
    inheritanceOwner.stats.xp,
    1,
    1,
    inheritedItems,
  )
  addTimedEffect(inheritanceState, inheritanceOwner, {
    sourceId: 'temporary-double-damage',
    sourceName: 'Temporary Damage',
    sourceTeam: inheritanceOwner.team,
    kind: 'buff',
    polarity: 'positive',
    value: 1,
    modifiers: { damagePct: 1 },
    duration: 30,
  })
  const inheritedBaseDamage = getIllusionInheritedAttackDamage(inheritanceOwner)
  const inheritedCloneDamage = getCloneInheritedAttackDamage(inheritanceState, inheritanceOwner)
  assert.ok(inheritedBaseDamage < inheritanceOwner.stats.damage, 'illusion damage inheritance should exclude raw item damage while preserving item attributes')
  assert.ok(inheritedCloneDamage < getEffectiveArcaneDamage(inheritanceState, inheritanceOwner), 'clones should not snapshot temporary damage buffs')

  applySimpleSkillSummonPressure(inheritanceState, inheritanceOwner, areaRoot, {
    ...profile,
    summonCount: 1,
    summonDuration: 20,
    summonArchetype: 'illusion',
    summonMode: 'cast',
    summonOutgoingDamagePct: 100,
  })
  const inheritedIllusion = inheritanceState.summons[0]
  assert.equal(inheritedIllusion.damage, Math.round(inheritedBaseDamage))
  assert.deepEqual(inheritedIllusion.inheritedItems, inheritedItems)
  assert.equal(getSummonInheritancePolicy(inheritedIllusion).copiesHeroPassives, false)
  assert.equal(getSummonInheritancePolicy(inheritedIllusion).copiesItemActives, false)
  const illusionItemEffects = getSummonInheritedItemEffects(inheritedIllusion)
  assert.equal(illusionItemEffects.some((effect) => effect.effectId === 'minor_crit'), true, 'illusions should inherit safe critical passives')
  assert.equal(illusionItemEffects.some((effect) => effect.effectId === 'mana_burn_attack'), true, 'illusions should inherit reduced mana burn')
  assert.equal(illusionItemEffects.some((effect) => effect.effectId === 'chain_lightning_proc'), false, 'illusions should not inherit spell-like attack procs')
  const targetManaBeforeIllusion = inheritanceTarget.stats.mana
  const illusionItemAttack = resolveSummonItemAttackEffects(inheritanceState, inheritedIllusion, inheritanceTarget)
  const expectedIllusionManaBurn = inheritanceOwner.stats.attackType === 'ranged' ? 4 : 8
  assert.equal(targetManaBeforeIllusion - inheritanceTarget.stats.mana, expectedIllusionManaBurn, 'illusions should apply the attack-type-specific reduced Diffusal mana burn')
  assert.equal(illusionItemAttack.magicDamage, 0)
  inheritanceOwner.items = []
  assert.equal(getSummonInheritedItemEffects(inheritedIllusion).some((effect) => effect.effectId === 'mana_burn_attack'), true, 'summons should retain an inventory snapshot after their source changes items')

  inheritanceOwner.items = inheritedItems
  applySimpleSkillSummonPressure(inheritanceState, inheritanceOwner, areaRoot, {
    ...profile,
    summonCount: 1,
    summonDuration: 20,
    summonArchetype: 'clone',
    summonMode: 'cast',
    summonOutgoingDamagePct: 100,
  })
  const inheritedClone = inheritanceState.summons.find((summon) => summon.archetype === 'clone')!
  assert.equal(inheritedClone.damage, Math.round(inheritedCloneDamage))
  assert.equal(getSummonInheritancePolicy(inheritedClone).copiesHeroPassives, true)
  assert.equal(getSummonInheritancePolicy(inheritedClone).itemPassives, 'full')
  assert.equal(getSummonInheritancePolicy(inheritedClone).copiesItemActives, true)
  const cloneItemEffects = getSummonInheritedItemEffects(inheritedClone)
  assert.equal(cloneItemEffects.some((effect) => effect.effectId === 'chain_lightning_proc'), true, 'clones should inherit eligible attack procs')
  assert.equal(cloneItemEffects.some((effect) => effect.kind === 'active'), false, 'clones should not copy item actives in the current restriction tier')
  let cloneMagicProc = 0
  for (let attempt = 0; attempt < 40 && cloneMagicProc === 0; attempt += 1) {
    inheritanceState.time += 0.1
    inheritanceTarget.stats.mana = inheritanceTarget.stats.maxMana
    cloneMagicProc = resolveSummonItemAttackEffects(inheritanceState, inheritedClone, inheritanceTarget).magicDamage
  }
  assert.ok(cloneMagicProc > 0, 'clone attack procs should resolve deterministically from the cloned inventory')
  inheritanceState.teamAuras[inheritedIllusion.team] = { name: 'Test Aura', attributeMultiplier: 1.2, expiresAt: 700 }
  assert.equal(getSummonAuraMultiplier(inheritanceState, inheritedIllusion), 1.2)
  assert.equal(getSummonAuraMultiplier(inheritanceState, inheritedClone), 1.2)
  assert.equal(getSummonAuraMultiplier(inheritanceState, wardSummon), 1, 'ordinary summons should not inherit hero-only team attribute auras')

  const targetCopyState = createInitialState('target-copy-illusion-runtime')
  targetCopyState.time = 600
  const targetCopyCaster = targetCopyState.arcanes.find((arcane) => arcane.team === 'dawn')!
  const copyTargets = targetCopyState.arcanes.filter((arcane) => arcane.team === 'dusk')
  targetCopyCaster.heroDefinitionId = 'h101_demon_metamorph'
  targetCopyCaster.pos = { x: 48, y: 50 }
  copyTargets.forEach((target, index) => {
    target.pos = index < 2 ? { x: 50 + index, y: 50 } : { x: 80 + index, y: 80 }
  })
  copyTargets[0].stats.maxHp = copyTargets[0].stats.hp = 2_750
  copyTargets[0].stats.damage = copyTargets[0].stats.damageMin = copyTargets[0].stats.damageMax = 190
  const reflectionSkill = getHeroDefinition(targetCopyCaster.heroDefinitionId).skills!
    .find((candidate) => candidate.sourceAbilityId === 5619)!
  const reflectionProfile = getSkillEffectProfile(reflectionSkill, 4)
  const reflectionTargets = getSimpleSkillAffectedTargets(
    targetCopyState,
    targetCopyCaster,
    reflectionSkill,
    reflectionProfile,
    copyTargets[0],
  )
  const reflections = applySimpleSkillCastSummons(
    targetCopyState,
    targetCopyCaster,
    reflectionSkill,
    reflectionProfile,
    copyTargets[0],
    reflectionTargets,
  )
  assert.equal(reflections.length, 2, 'Reflection should create one copy for every enemy in its official area')
  assert.equal(reflections[0].copiedArcaneId, copyTargets[0].id)
  assert.equal(reflections[0].lockedTargetId, copyTargets[0].id)
  assert.equal(reflections[0].maxHp, copyTargets[0].stats.maxHp, 'target-copy illusions should inherit the copied enemy snapshot')
  assert.equal(reflections[0].damage, Math.round(getIllusionInheritedAttackDamage(copyTargets[0]) * 0.75))
  assert.equal(isSummonTargetable(targetCopyState, reflections[0]), false, 'Reflection illusions should remain invulnerable and untargetable')
  const reflectionHp = reflections[0].hp
  damageEntity(targetCopyState, reflections[0].id, 999, { id: copyTargets[0].id, label: copyTargets[0].player, team: copyTargets[0].team })
  assert.equal(reflections[0].hp, reflectionHp, 'untargetable Reflection illusions should ignore incoming damage')
  const reflectionReplay = materializeMatchRenderFrame(
    createMatchRenderFrame(targetCopyState),
    createMatchStaticData(targetCopyState),
  ).summons[0]
  assert.equal(reflectionReplay.copiedArcaneId, copyTargets[0].id)
  assert.equal(reflectionReplay.lockedTargetId, copyTargets[0].id)
  assert.equal(reflectionReplay.untargetable, true)
  copyTargets[0].stats.hp = 0
  updateSummonedUnits(targetCopyState, 0.1)
  assert.equal(reflections[0].expiresAt, targetCopyState.time, 'linked target-copy illusions should expire with their source target')

  const portraitState = createInitialState('strong-illusion-immunity-runtime')
  portraitState.time = 600
  const portraitCaster = portraitState.arcanes.find((arcane) => arcane.team === 'dawn')!
  const portraitTarget = portraitState.arcanes.find((arcane) => arcane.team === 'dusk')!
  portraitCaster.heroDefinitionId = 'h109_ink_warlock'
  portraitCaster.items = [shopCatalog.find((item) => item.id === 'i135_grand_spell_scepter')!.name]
  const portraitSkill = getHeroDefinition(portraitCaster.heroDefinitionId).supplementalSkills!
    .find((candidate) => candidate.sourceAbilityId === 7852)!
  const portraits = applySimpleSkillCastSummons(
    portraitState,
    portraitCaster,
    portraitSkill,
    getSkillEffectProfile(portraitSkill, 1),
    portraitTarget,
    [portraitTarget],
  )
  assert.equal(portraits.length, 1)
  assert.equal(portraits[0].magicResistance, 90, 'strong target-copy illusions should use their declared immunity resistance')

  const disruptionState = createInitialState('delayed-target-copy-illusion-runtime')
  disruptionState.time = 600
  const disruptionCaster = disruptionState.arcanes.find((arcane) => arcane.team === 'dawn')!
  const disruptionTarget = disruptionState.arcanes.find((arcane) => arcane.team === 'dusk')!
  disruptionCaster.heroDefinitionId = 'h071_shadow_demon'
  disruptionTarget.stats.damage = disruptionTarget.stats.damageMin = disruptionTarget.stats.damageMax = 140
  disruptionTarget.stats.statusResistance = 20
  disruptionTarget.channeling = {
    kind: 'skill',
    target: { ...disruptionCaster.pos },
    startedAt: 599,
    completesAt: 604,
    label: 'Canal de teste',
    effectLabel: 'Canal concluido',
  }
  const disruptionSkill = getHeroDefinition(disruptionCaster.heroDefinitionId).skills!
    .find((candidate) => candidate.sourceAbilityId === 5421)!
  const disruptionProfile = getSkillEffectProfile(disruptionSkill, 4)
  const disruptions = applySimpleSkillCastSummons(
    disruptionState,
    disruptionCaster,
    disruptionSkill,
    disruptionProfile,
    disruptionTarget,
    [disruptionTarget],
  )
  const expectedDisruptionReturn = 600 + 2.75 * 0.8
  assert.equal(disruptions.length, 2)
  assert.equal(disruptions[0].spawnedAt, expectedDisruptionReturn, 'Disruption copies should activate when the status-resisted banish ends')
  assert.equal(isArcaneBanished(disruptionState, disruptionTarget), true, 'Disruption should banish its target for the illusion delay')
  assert.equal(isArcaneTargetable(disruptionState, disruptionTarget), false)
  assert.equal(disruptionTarget.channeling, undefined, 'banish should interrupt an active channel')
  const disruptionHp = disruptionTarget.stats.hp
  const disruptionPos = { ...disruptionTarget.pos }
  damageEntity(disruptionState, disruptionTarget.id, 500, {
    id: disruptionCaster.id,
    label: disruptionCaster.player,
    team: disruptionCaster.team,
    damageType: 'pure',
  })
  assert.equal(disruptionTarget.stats.hp, disruptionHp, 'banished Arcanes should be invulnerable')
  const banishedMovement = updateArcaneMovement(disruptionTarget, disruptionState, 1, true)
  assert.deepEqual(banishedMovement.pos, disruptionPos, 'banished Arcanes should not move')
  assert.equal(banishedMovement.microDecision, 'Banido')
  assert.equal(isSummonActive(disruptionState, disruptions[0]), false)
  assert.equal(createMatchRenderFrame(disruptionState).summons.length, 0, 'delayed copies should stay outside the replay until activation')
  assert.equal(disruptions[0].damage, Math.round(getIllusionInheritedAttackDamage(disruptionTarget) * 0.5 + 65))
  disruptionState.time = expectedDisruptionReturn
  assert.equal(isSummonActive(disruptionState, disruptions[0]), true)
  assert.equal(isArcaneBanished(disruptionState, disruptionTarget), false)
  assert.equal(isArcaneTargetable(disruptionState, disruptionTarget), true)
  assert.equal(createMatchRenderFrame(disruptionState).summons.length, 2)

  const immunityState = createInitialState('rule-level-skill-immunity-runtime')
  immunityState.time = 600
  const immunityCaster = immunityState.arcanes.find((arcane) => arcane.team === 'dawn')!
  const immunityEnemy = immunityState.arcanes.find((arcane) => arcane.team === 'dusk')!
  immunityCaster.heroDefinitionId = 'h046_lifesteal_berserker'
  immunityCaster.skillLevels = { Q: 4 }
  const rageSkill = getHeroDefinition(immunityCaster.heroDefinitionId).skills!
    .find((candidate) => candidate.sourceAbilityId === 5249)!
  const rageProfile = getSimpleSkillImmunityProfile(rageSkill, 4)
  assert.equal(rageProfile.debuffImmunityDuration, 6)
  assert.equal(rageProfile.magicResistanceFloor, 80)
  assert.equal(resolveSimpleSkillEffects(immunityState, immunityCaster, rageSkill, 4, immunityCaster), true)
  assert.equal(isArcaneDebuffImmune(immunityState, immunityCaster), true)
  assert.equal(getEffectiveArcaneMagicResistance(immunityState, immunityCaster), 80)
  addTimedEffect(immunityState, immunityCaster, {
    sourceId: 'blocked-slow',
    sourceName: 'Blocked slow',
    sourceTeam: immunityEnemy.team,
    kind: 'slow',
    polarity: 'negative',
    value: 0.5,
    duration: 3,
  })
  assert.equal(hasTimedEffect(immunityState, immunityCaster.id, 'slow'), false, 'debuff immunity should reject ordinary negative effects')
  addTimedEffect(immunityState, immunityCaster, {
    sourceId: 'piercing-slow',
    sourceName: 'Piercing slow',
    sourceTeam: immunityEnemy.team,
    kind: 'slow',
    polarity: 'negative',
    value: 0.5,
    piercesDebuffImmunity: true,
    duration: 3,
  })
  assert.equal(hasTimedEffect(immunityState, immunityCaster.id, 'slow'), true, 'explicit piercing should bypass debuff immunity')
  const immunityHp = immunityCaster.stats.hp
  damageEntity(immunityState, immunityCaster.id, 100, {
    id: immunityEnemy.id,
    label: immunityEnemy.player,
    team: immunityEnemy.team,
    damageType: 'magical',
  })
  assert.ok(Math.abs(immunityState.arcanes.find((arcane) => arcane.id === immunityCaster.id)!.stats.hp - (immunityHp - 20)) < 0.001)

  const cogsState = createInitialState('area-conditioned-debuff-immunity-runtime')
  cogsState.time = 600
  let cogsCaster = cogsState.arcanes.find((arcane) => arcane.team === 'dawn')!
  const cogsEnemy = cogsState.arcanes.find((arcane) => arcane.team === 'dusk')!
  cogsCaster.heroDefinitionId = 'h043_clockwork_trapper'
  cogsCaster.skillLevels = { W: 4 }
  const cogsSkill = getHeroDefinition(cogsCaster.heroDefinitionId).skills!
    .find((candidate) => candidate.sourceAbilityId === 5238)!
  const cogsOrigin = { ...cogsCaster.pos }
  assert.equal(resolveSimpleSkillEffects(cogsState, cogsCaster, cogsSkill, 4, cogsEnemy), true)
  cogsCaster = cogsState.arcanes.find((arcane) => arcane.id === cogsCaster.id)!
  assert.equal(isArcaneDebuffImmune(cogsState, cogsCaster), true)
  assert.ok(getEffectiveArcaneMagicResistance(cogsState, cogsCaster) >= 50)
  cogsCaster.pos = { x: cogsOrigin.x + 2, y: cogsOrigin.y }
  assert.equal(isArcaneDebuffImmune(cogsState, cogsCaster), false, 'leaving the Cogs radius should suspend its immunity')
  addTimedEffect(cogsState, cogsCaster, {
    sourceId: 'outside-cogs-slow',
    sourceName: 'Outside Cogs slow',
    sourceTeam: cogsEnemy.team,
    kind: 'slow',
    polarity: 'negative',
    value: 0.3,
    duration: 2,
  })
  assert.equal(hasTimedEffect(cogsState, cogsCaster.id, 'slow'), true)
  cogsState.timedEffects = cogsState.timedEffects.filter((effect) => effect.kind !== 'slow')
  cogsCaster.pos = cogsOrigin
  addTimedEffect(cogsState, cogsCaster, {
    sourceId: 'inside-cogs-slow',
    sourceName: 'Inside Cogs slow',
    sourceTeam: cogsEnemy.team,
    kind: 'slow',
    polarity: 'negative',
    value: 0.3,
    duration: 2,
  })
  assert.equal(hasTimedEffect(cogsState, cogsCaster.id, 'slow'), false, 'returning inside the active Cogs should restore immunity')

  const handState = createInitialState('scepter-hand-of-god-immunity-runtime')
  handState.time = 600
  let handCaster = handState.arcanes.find((arcane) => arcane.team === 'dawn')!
  let handAlly = handState.arcanes.find((arcane) => arcane.team === 'dawn' && arcane.id !== handCaster.id)!
  handCaster.heroDefinitionId = 'h058_animal_priest'
  handCaster.skillLevels = { R: 3 }
  handCaster.items = [shopCatalog.find((item) => item.id === 'i135_grand_spell_scepter')!.name]
  handCaster.stats.mana = 1000
  handCaster.stats.maxMana = Math.max(handCaster.stats.maxMana, 1000)
  handAlly.pos = { x: handCaster.pos.x + 2, y: handCaster.pos.y }
  handAlly.stats.hp -= 500
  const handSkill = getHeroDefinition(handCaster.heroDefinitionId).skills!
    .find((candidate) => candidate.sourceAbilityId === 5331)!
  assert.deepEqual(handSkill.values.scepterChannelTime, [6])
  assert.deepEqual(handSkill.values.scepterDebuffImmunityRadius, [800])
  assert.deepEqual(handSkill.values.scepterDebuffImmunityResist, [60])
  const handMana = handCaster.stats.mana
  const handAllyHp = handAlly.stats.hp
  assert.equal(castSimpleSkill(handState, handCaster, handSkill, 3, handCaster), true)
  assert.equal(handCaster.channeling?.completesAt, handState.time + 6)
  assert.equal(handCaster.stats.mana, handMana - 400)
  assert.equal(isArcaneDebuffImmune(handState, handAlly), true)
  assert.ok(getEffectiveArcaneMagicResistance(handState, handAlly) >= 60)

  handAlly.pos = { x: handCaster.pos.x + 6.5, y: handCaster.pos.y }
  handState.time += 1
  processTimedEffects(handState)
  handAlly = handState.arcanes.find((arcane) => arcane.id === handAlly.id)!
  assert.equal(handAlly.stats.hp, handAllyHp, 'the Scepter HoT should pause outside Hand of God radius')
  assert.equal(isArcaneDebuffImmune(handState, handAlly), false)
  handAlly.pos = { x: handCaster.pos.x + 2, y: handCaster.pos.y }
  handState.time += 1
  processTimedEffects(handState)
  handCaster = handState.arcanes.find((arcane) => arcane.id === handCaster.id)!
  handAlly = handState.arcanes.find((arcane) => arcane.id === handAlly.id)!
  assert.equal(handAlly.stats.hp, handAllyHp + 120, 'the imported 200% nearby boost should amplify level-three HoT to 120 per second')
  assert.equal(isArcaneDebuffImmune(handState, handAlly), true)
  addTimedEffect(handState, handCaster, {
    sourceId: 'interrupt-hand-of-god',
    sourceName: 'Interrupt Hand of God',
    sourceTeam: 'dusk',
    kind: 'stun',
    polarity: 'negative',
    value: 1,
    piercesDebuffImmunity: true,
    duration: 1,
  })
  assert.equal(handCaster.channeling, undefined, 'hard control should interrupt skill channels immediately')
  assert.equal(isArcaneDebuffImmune(handState, handAlly), false, 'Hand of God aura should end with its source channel')

  const baseHandState = createInitialState('base-hand-of-god-no-immunity-runtime')
  baseHandState.time = 600
  const baseHandCaster = baseHandState.arcanes.find((arcane) => arcane.team === 'dawn')!
  baseHandCaster.heroDefinitionId = 'h058_animal_priest'
  baseHandCaster.skillLevels = { R: 3 }
  baseHandCaster.stats.mana = 1000
  baseHandCaster.stats.maxMana = Math.max(baseHandCaster.stats.maxMana, 1000)
  baseHandState.arcanes.find((arcane) => arcane.team === baseHandCaster.team && arcane.id !== baseHandCaster.id)!.stats.hp -= 500
  const baseHandSkill = getHeroDefinition(baseHandCaster.heroDefinitionId).skills!
    .find((candidate) => candidate.sourceAbilityId === 5331)!
  assert.equal(castSimpleSkill(baseHandState, baseHandCaster, baseHandSkill, 3, baseHandCaster), true)
  assert.equal(baseHandCaster.channeling, undefined, 'Hand of God should remain immediate without Scepter')
  assert.equal(isArcaneDebuffImmune(baseHandState, baseHandCaster), false)

  const starbreakerState = createInitialState('starbreaker-shard-immunity-runtime')
  starbreakerState.time = 600
  const starbreakerCaster = starbreakerState.arcanes.find((arcane) => arcane.team === 'dawn')!
  const starbreakerEnemy = starbreakerState.arcanes.find((arcane) => arcane.team === 'dusk')!
  starbreakerCaster.heroDefinitionId = 'h114_dawn_paladin'
  starbreakerCaster.skillLevels = { Q: 4 }
  starbreakerCaster.items = [shopCatalog.find((item) => item.id === 'i136_spell_shard')!.name]
  const starbreakerSkill = getHeroDefinition(starbreakerCaster.heroDefinitionId).skills!
    .find((candidate) => candidate.sourceAbilityId === 7902)!
  assert.deepEqual(starbreakerSkill.values.shardImmunityResist, [50])
  assert.equal(resolveSimpleSkillEffects(starbreakerState, starbreakerCaster, starbreakerSkill, 4, starbreakerEnemy), true)
  assert.equal(isArcaneDebuffImmune(starbreakerState, starbreakerCaster), true)
  assert.ok(getEffectiveArcaneMagicResistance(starbreakerState, starbreakerCaster) >= 50)
  starbreakerState.time += 1.11
  assert.equal(isArcaneDebuffImmune(starbreakerState, starbreakerCaster), false)

  const baseStarbreakerState = createInitialState('base-starbreaker-no-immunity-runtime')
  baseStarbreakerState.time = 600
  const baseStarbreakerCaster = baseStarbreakerState.arcanes.find((arcane) => arcane.team === 'dawn')!
  const baseStarbreakerEnemy = baseStarbreakerState.arcanes.find((arcane) => arcane.team === 'dusk')!
  baseStarbreakerCaster.heroDefinitionId = 'h114_dawn_paladin'
  baseStarbreakerCaster.skillLevels = { Q: 4 }
  const baseStarbreakerSkill = getHeroDefinition(baseStarbreakerCaster.heroDefinitionId).skills!
    .find((candidate) => candidate.sourceAbilityId === 7902)!
  assert.equal(resolveSimpleSkillEffects(baseStarbreakerState, baseStarbreakerCaster, baseStarbreakerSkill, 4, baseStarbreakerEnemy), true)
  assert.equal(isArcaneDebuffImmune(baseStarbreakerState, baseStarbreakerCaster), false, 'Starbreaker should require Shard for immunity')

  const fowlState = createInitialState('fowl-play-lethal-prevention-runtime')
  fowlState.time = 600
  let fowlTarget = fowlState.arcanes.find((arcane) => arcane.team === 'dawn')!
  const fowlEnemy = fowlState.arcanes.find((arcane) => arcane.team === 'dusk')!
  fowlTarget.heroDefinitionId = 'h020_hex_warden'
  fowlTarget.stats.level = 12
  fowlTarget.stats.hp = 100
  const fowlSkill = getArcaneRuntimeSkills(fowlTarget).find((skill) => skill.sourceAbilityId === 1250)!
  const fowlBaseMoveSpeed = getEffectiveArcaneMoveSpeed(fowlState, fowlTarget)
  addTimedEffect(fowlState, fowlTarget, {
    sourceId: 'fowl-play-preexisting-stun',
    sourceName: 'Preexisting stun',
    sourceTeam: fowlEnemy.team,
    kind: 'stun',
    polarity: 'negative',
    value: 1,
    duration: 4,
  })
  damageEntity(fowlState, fowlTarget.id, 500, {
    id: fowlEnemy.id,
    label: fowlEnemy.player,
    team: fowlEnemy.team,
    damageType: 'pure',
  })
  fowlTarget = fowlState.arcanes.find((arcane) => arcane.id === fowlTarget.id)!
  assert.equal(fowlTarget.stats.hp, 1, 'Fowl Play should intercept lethal damage and leave the hero at one HP')
  assert.equal(isArcaneInFowlPlay(fowlState, fowlTarget), true)
  assert.equal(hasTimedEffect(fowlState, fowlTarget.id, 'damage_immunity'), true)
  assert.equal(hasTimedEffect(fowlState, fowlTarget.id, 'stun'), false, 'Fowl Play should strongly dispel existing control')
  assert.equal(isArcaneAttackDisabled(fowlState, fowlTarget), true)
  assert.equal(isArcaneSilenced(fowlState, fowlTarget), true)
  assert.equal(isArcaneMovementDisabled(fowlState, fowlTarget), false, 'the chicken form should still be able to move')
  assert.ok(Math.abs(getEffectiveArcaneMoveSpeed(fowlState, fowlTarget) / fowlBaseMoveSpeed - 1.05) < 0.0001)
  const chickens = fowlState.summons.filter((summon) => summon.variant === 'fowl_play_chicken')
  assert.equal(chickens.length, 3, 'level 12 should create the base chicken plus one image per six levels')
  assert.ok(chickens.every((chicken) => chicken.damage === 0 && !chicken.canAttack && chicken.damageTakenMultiplier === 2))
  assert.ok((fowlTarget.itemCooldowns[fowlSkill.id] ?? 0) >= fowlState.time + 120)
  assert.ok(fowlState.skillMarkers.some((marker) => marker.label === 'FOWL PLAY'))
  damageEntity(fowlState, fowlTarget.id, 500, {
    id: fowlEnemy.id,
    label: fowlEnemy.player,
    team: fowlEnemy.team,
    damageType: 'pure',
  })
  fowlTarget = fowlState.arcanes.find((arcane) => arcane.id === fowlTarget.id)!
  assert.equal(fowlTarget.stats.hp, 1, 'the one-second damage immunity should absorb follow-up damage')
  fowlState.time += 1.01
  damageEntity(fowlState, fowlTarget.id, 5, {
    id: fowlEnemy.id,
    label: fowlEnemy.player,
    team: fowlEnemy.team,
    damageType: 'pure',
  })
  resolveDeaths(fowlState)
  const deadFowlTarget = fowlState.arcanes.find((arcane) => arcane.id === fowlTarget.id)!
  assert.equal(deadFowlTarget.stats.hp, 0, 'Fowl Play should not retrigger while its cooldown is active')
  const respawnedFowlTarget = respawnArcaneIfReady(deadFowlTarget, deadFowlTarget.respawn, 0)
  assert.equal(respawnedFowlTarget.itemCooldowns[fowlSkill.id], undefined, 'Fowl Play cooldown should reset on respawn')

  const shardFowlState = createInitialState('fowl-play-shard-invulnerability-runtime')
  shardFowlState.time = 600
  const shardFowlTarget = shardFowlState.arcanes.find((arcane) => arcane.team === 'dawn')!
  const shardFowlEnemy = shardFowlState.arcanes.find((arcane) => arcane.team === 'dusk')!
  shardFowlTarget.heroDefinitionId = 'h020_hex_warden'
  shardFowlTarget.items = [shopCatalog.find((item) => item.id === 'i136_spell_shard')!.name]
  shardFowlTarget.stats.hp = 50
  damageEntity(shardFowlState, shardFowlTarget.id, 100, {
    id: shardFowlEnemy.id,
    label: shardFowlEnemy.player,
    team: shardFowlEnemy.team,
    damageType: 'pure',
  })
  assert.equal(isArcaneInvulnerable(shardFowlState, shardFowlTarget), true, 'Shard should add the imported 0.1-second untargetable window')

  const executeFowlState = createInitialState('fowl-play-execute-bypass-runtime')
  executeFowlState.time = 600
  const executeFowlTarget = executeFowlState.arcanes.find((arcane) => arcane.team === 'dawn')!
  const executeFowlEnemy = executeFowlState.arcanes.find((arcane) => arcane.team === 'dusk')!
  executeFowlTarget.heroDefinitionId = 'h020_hex_warden'
  executeFowlTarget.stats.hp = 50
  damageEntity(executeFowlState, executeFowlTarget.id, 100, {
    id: executeFowlEnemy.id,
    label: `${executeFowlEnemy.player}: execute`,
    team: executeFowlEnemy.team,
    damageType: 'pure',
    bypassesDeathPrevention: true,
  })
  assert.equal(executeFowlState.arcanes.find((arcane) => arcane.id === executeFowlTarget.id)!.stats.hp, 0)
  assert.equal(isArcaneInFowlPlay(executeFowlState, executeFowlTarget), false, 'execute damage should bypass Fowl Play')

  const bulwarkState = createInitialState('directional-bulwark-runtime')
  bulwarkState.time = 600
  const bulwarkTarget = bulwarkState.arcanes.find((arcane) => arcane.team === 'dawn')!
  const bulwarkEnemy = bulwarkState.arcanes.find((arcane) => arcane.team === 'dusk')!
  bulwarkTarget.heroDefinitionId = 'h110_arena_sentinel'
  bulwarkTarget.skillLevels = { E: 4 }
  bulwarkTarget.facing = { x: 1, y: 0 }
  const frontAttack = { sourcePosition: { x: bulwarkTarget.pos.x + 4, y: bulwarkTarget.pos.y }, isBasicAttack: true }
  const sideAttack = { sourcePosition: { x: bulwarkTarget.pos.x, y: bulwarkTarget.pos.y + 4 }, isBasicAttack: true }
  const rearAttack = { sourcePosition: { x: bulwarkTarget.pos.x - 4, y: bulwarkTarget.pos.y }, isBasicAttack: true }
  assert.ok(Math.abs(getBulwarkPhysicalDamageMultiplier(bulwarkState, bulwarkTarget, 'physical', frontAttack) - 0.3) < 0.0001)
  assert.equal(getBulwarkPhysicalDamageMultiplier(bulwarkState, bulwarkTarget, 'physical', sideAttack), 0.65)
  assert.equal(getBulwarkPhysicalDamageMultiplier(bulwarkState, bulwarkTarget, 'physical', rearAttack), 1)
  assert.equal(getBulwarkPhysicalDamageMultiplier(bulwarkState, bulwarkTarget, 'magical', frontAttack), 1)
  assert.equal(getBulwarkPhysicalDamageMultiplier(bulwarkState, bulwarkTarget, 'physical', { ...frontAttack, isBasicAttack: false }), 1)
  const frontDamage = resolveIncomingArcaneDamage(bulwarkState, bulwarkTarget, 200, 'physical', frontAttack)
  const rearDamage = resolveIncomingArcaneDamage(bulwarkState, bulwarkTarget, 200, 'physical', rearAttack)
  assert.ok(Math.abs(frontDamage / rearDamage - 0.3) < 0.0001, 'front Bulwark should reduce the resolved basic attack before armor')
  const hpBeforeBulwarkHit = bulwarkTarget.stats.hp
  damageEntity(bulwarkState, bulwarkTarget.id, 200, {
    id: bulwarkEnemy.id,
    label: bulwarkEnemy.player,
    team: bulwarkEnemy.team,
    damageType: 'physical',
    ...frontAttack,
  })
  const liveBulwarkTarget = bulwarkState.arcanes.find((arcane) => arcane.id === bulwarkTarget.id)!
  assert.ok(Math.abs((hpBeforeBulwarkHit - liveBulwarkTarget.stats.hp) - frontDamage) < 0.0001, 'damageEntity should apply directional Bulwark mitigation')
  addTimedEffect(bulwarkState, liveBulwarkTarget, {
    sourceId: 'break-bulwark',
    sourceName: 'Break Bulwark',
    sourceTeam: bulwarkEnemy.team,
    kind: 'break',
    polarity: 'negative',
    value: 1,
    duration: 2,
  })
  assert.equal(getBulwarkPhysicalDamageMultiplier(bulwarkState, liveBulwarkTarget, 'physical', frontAttack), 1, 'break should disable Bulwark mitigation')
  assert.deepEqual(getArcaneFacingAfterMovement({ x: 1, y: 0 }, { x: 2, y: 2 }, { x: 2, y: -2 }), { x: 0, y: -1 })
  assert.deepEqual(getArcaneFacingAfterMovement({ x: 0, y: -1 }, { x: 2, y: 2 }, { x: 2, y: 2 }), { x: 0, y: -1 })

  const invulnerabilityState = createInitialState('rule-level-invulnerability-runtime')
  invulnerabilityState.time = 600
  const invulnerabilityCaster = invulnerabilityState.arcanes.find((arcane) => arcane.team === 'dawn')!
  const invulnerabilityEnemy = invulnerabilityState.arcanes.find((arcane) => arcane.team === 'dusk')!
  invulnerabilityCaster.heroDefinitionId = 'h081_naga_siren'
  invulnerabilityCaster.skillLevels = { Q: 4 }
  const mirrorImageSkill = getHeroDefinition(invulnerabilityCaster.heroDefinitionId).skills!
    .find((candidate) => candidate.sourceAbilityId === 5467)!
  assert.equal(resolveSimpleSkillEffects(invulnerabilityState, invulnerabilityCaster, mirrorImageSkill, 4, invulnerabilityEnemy), true)
  assert.equal(isArcaneInvulnerable(invulnerabilityState, invulnerabilityCaster), true)
  assert.equal(isArcaneTargetable(invulnerabilityState, invulnerabilityCaster), false)
  const invulnerableHp = invulnerabilityCaster.stats.hp
  damageEntity(invulnerabilityState, invulnerabilityCaster.id, 500, {
    id: invulnerabilityEnemy.id,
    label: invulnerabilityEnemy.player,
    team: invulnerabilityEnemy.team,
    damageType: 'pure',
  })
  assert.equal(invulnerabilityCaster.stats.hp, invulnerableHp)
  invulnerabilityState.time += 0.51
  assert.equal(isArcaneTargetable(invulnerabilityState, invulnerabilityCaster), true)

  const nightmareState = createInitialState('targeted-invulnerability-runtime')
  nightmareState.time = 600
  const nightmareCaster = nightmareState.arcanes.find((arcane) => arcane.team === 'dawn')!
  const nightmareTarget = nightmareState.arcanes.find((arcane) => arcane.team === 'dusk')!
  nightmareCaster.heroDefinitionId = 'h003_nightmare_controller'
  nightmareCaster.skillLevels = { E: 4 }
  const nightmareSkill = getHeroDefinition(nightmareCaster.heroDefinitionId).skills!
    .find((candidate) => candidate.sourceAbilityId === 5014)!
  assert.equal(resolveSimpleSkillEffects(nightmareState, nightmareCaster, nightmareSkill, 4, nightmareTarget), true)
  assert.equal(isArcaneInvulnerable(nightmareState, nightmareTarget), true, 'Nightmare should protect its target during the imported opening window')

  const etherealState = createInitialState('rule-level-ethereal-runtime')
  etherealState.time = 600
  const etherealCaster = etherealState.arcanes.find((arcane) => arcane.team === 'dawn')!
  const etherealTarget = etherealState.arcanes.find((arcane) => arcane.team === 'dusk')!
  etherealCaster.heroDefinitionId = 'h028_plague_saint'
  etherealCaster.skillLevels = { H1: 1 }
  const etherealSkill = getHeroDefinition(etherealCaster.heroDefinitionId).supplementalSkills!
    .find((candidate) => candidate.sourceAbilityId === 661)!
  assert.equal(resolveSimpleSkillEffects(etherealState, etherealCaster, etherealSkill, 1, etherealTarget), true)
  assert.equal(hasTimedEffect(etherealState, etherealTarget.id, 'ethereal'), true)
  assert.equal(isArcaneAttackDisabled(etherealState, etherealTarget), true)
  const etherealHp = etherealTarget.stats.hp
  damageEntity(etherealState, etherealTarget.id, 100, {
    id: etherealCaster.id,
    label: etherealCaster.player,
    team: etherealCaster.team,
    damageType: 'physical',
  })
  assert.equal(etherealTarget.stats.hp, etherealHp, 'ethereal units should ignore physical damage')
  const effectiveEtherealResistance = getEffectiveArcaneMagicResistance(etherealState, etherealTarget)
  damageEntity(etherealState, etherealTarget.id, 100, {
    id: etherealCaster.id,
    label: etherealCaster.player,
    team: etherealCaster.team,
    damageType: 'magical',
  })
  const liveEtherealTarget = etherealState.arcanes.find((arcane) => arcane.id === etherealTarget.id)!
  assert.ok(Math.abs(liveEtherealTarget.stats.hp - (etherealHp - 100 * (1 - effectiveEtherealResistance / 100))) < 0.001)

  const hauntState = createInitialState('global-target-copy-illusion-runtime')
  hauntState.time = 600
  const hauntCaster = hauntState.arcanes.find((arcane) => arcane.team === 'dawn')!
  const hauntTargets = hauntState.arcanes.filter((arcane) => arcane.team === 'dusk')
  hauntCaster.heroDefinitionId = 'h059_specter_global'
  hauntCaster.items = [shopCatalog.find((item) => item.id === 'i135_grand_spell_scepter')!.name]
  hauntCaster.pos = { x: 12, y: 12 }
  hauntTargets.forEach((target, index) => {
    target.pos = index < 2 ? { x: 52 + index * 1.5, y: 50 } : { x: 88, y: 84 + index }
  })
  hauntTargets[0].stats.hp = hauntTargets[0].stats.maxHp * 0.2
  const hauntSkill = getHeroDefinition(hauntCaster.heroDefinitionId).skills!
    .find((candidate) => candidate.sourceAbilityId === 5337)!
  const hauntProfile = getSkillEffectProfile(hauntSkill, 3)
  const haunts = applySimpleSkillCastSummons(hauntState, hauntCaster, hauntSkill, hauntProfile, hauntTargets[0], [hauntTargets[0]])
  assert.equal(haunts.length, hauntTargets.length, 'Haunt should create one linked illusion for every living enemy Arcane')
  assert.deepEqual(new Set(haunts.map((summon) => summon.copiedArcaneId)), new Set(hauntTargets.map((target) => target.id)))
  const realityCandidate = getHauntRealityCandidate(hauntState, hauntCaster)
  assert.equal(realityCandidate?.target.id, hauntTargets[0].id, 'Reality should prefer a vulnerable safe Haunt target')
  const realityOrigin = { ...hauntCaster.pos }
  assert.equal(tryUseHauntReality(hauntState, hauntCaster), true)
  assert.notDeepEqual(hauntCaster.pos, realityOrigin)
  assert.equal(realityCandidate?.summon.expiresAt, hauntState.time, 'Reality should consume the selected Haunt illusion')
  assert.equal(hauntCaster.combatTargetId, hauntTargets[0].id)
  assert.equal(hasTimedEffect(hauntState, hauntTargets[0].id, 'fear'), true, 'Scepter Reality should fear nearby enemies')
  assert.equal(hasTimedEffect(hauntState, hauntTargets[1].id, 'slow'), true, 'Scepter Reality should apply its movement slow in the imported radius')
  assert.equal(tryUseHauntReality(hauntState, hauntCaster), false, 'Reality should be usable only once per Haunt cast')

  const juxtaposeState = createInitialState('juxtapose-proc-runtime')
  juxtaposeState.time = 600
  const lancer = juxtaposeState.arcanes.find((arcane) => arcane.team === 'dawn')!
  const juxtaposeTarget = juxtaposeState.arcanes.find((arcane) => arcane.team === 'dusk')!
  lancer.heroDefinitionId = 'h011_illusion_lancer'
  lancer.skillLevels = { R: 3 }
  for (let attempt = 0; attempt < 40 && juxtaposeState.summons.length === 0; attempt += 1) {
    juxtaposeState.time += 0.1
    lancer.lastAttack = juxtaposeState.time
    triggerOnAttackSummons(juxtaposeState, lancer, juxtaposeTarget)
  }
  assert.equal(juxtaposeState.summons.length, 1, 'Juxtapose should create an illusion from successful owner attack procs')
  const firstJuxtapose = juxtaposeState.summons[0]
  for (let attempt = 0; attempt < 160 && juxtaposeState.summons.length === 1; attempt += 1) {
    juxtaposeState.time += 0.1
    firstJuxtapose.lastAttack = juxtaposeState.time
    applySummonAttackSpecials(juxtaposeState, firstJuxtapose, juxtaposeTarget)
  }
  assert.ok(juxtaposeState.summons.length > 1, 'Juxtapose illusions should use their reduced secondary proc chance')
  assert.equal(juxtaposeState.summons[1].expiresAt - juxtaposeState.summons[1].spawnedAt, 4)
  for (let attempt = 0; attempt < 200; attempt += 1) {
    juxtaposeState.time += 0.1
    lancer.lastAttack = juxtaposeState.time
    triggerOnAttackSummons(juxtaposeState, lancer, juxtaposeTarget)
  }
  assert.equal(juxtaposeState.summons.length, 10, 'Juxtapose should respect the official level-three illusion cap')

  skillState.summons = []
  const woundedAlly = skillState.arcanes.find((arcane) => arcane.team === liveCaster.team && arcane.id !== liveCaster.id)!
  woundedAlly.stats.hp = woundedAlly.stats.maxHp * 0.5
  applySimpleSkillSummonPressure(skillState, liveCaster, areaRoot, {
    ...profile,
    summonCount: 1,
    summonDuration: 30,
    summonArchetype: 'healing_ward',
    summonMode: 'cast',
    summonHealPct: 2,
    summonDamage: 0,
  }, woundedAlly.pos)
  const healingWard = skillState.summons[0]
  healingWard.pos = { ...woundedAlly.pos }
  const woundedHp = woundedAlly.stats.hp
  updateSummonedUnits(skillState, 1)
  assert.equal(healingWard.canAttack, false, 'healing wards should not perform generic attacks')
  assert.ok(woundedAlly.stats.hp > woundedHp, 'healing wards should restore nearby allied health over time')

  const spiderlingState = createInitialState('target-death-summon-runtime')
  spiderlingState.time = 600
  const brood = spiderlingState.arcanes[0]
  const spiderlingTarget = spiderlingState.arcanes.find((candidate) => candidate.team !== brood.team)!
  brood.heroDefinitionId = 'h053_brood_matriarch'
  brood.skillLevels = { R: 1 }
  brood.stats.mana = brood.stats.maxMana = 1_000
  brood.pos = { x: 50, y: 50 }
  spiderlingTarget.pos = { x: 51, y: 50 }
  spiderlingTarget.stats.hp = 1
  const spawnSpiderlings = getHeroDefinition(brood.heroDefinitionId).skills!.find((candidate) => candidate.sourceAbilityId === 5279)!
  assert.equal(castSimpleSkill(spiderlingState, brood, spawnSpiderlings, 1, spiderlingTarget, true), true)
  assert.equal(spiderlingState.timedEffects.some((effect) => effect.kind === 'summon_mark' && effect.targetId === spiderlingTarget.id), true, 'target-death summons should mark their victim')
  resolveDeaths(spiderlingState)
  assert.equal(spiderlingState.summons.filter((summon) => summon.sourceSkillId === spawnSpiderlings.id).length, 4, 'a marked target death should materialize the imported spiderling count')
  const propagatingSpiderling = spiderlingState.summons.find((summon) => summon.sourceSkillId === spawnSpiderlings.id)!
  const propagatedTarget = spiderlingState.arcanes.find((candidate) => candidate.team !== brood.team && candidate.id !== spiderlingTarget.id)!
  propagatedTarget.stats.hp = 1
  damageEntity(spiderlingState, propagatedTarget.id, 10, {
    id: propagatingSpiderling.id,
    label: propagatingSpiderling.name,
    team: propagatingSpiderling.team,
    damageType: 'physical',
  })
  resolveDeaths(spiderlingState)
  assert.equal(spiderlingState.summons.filter((summon) => summon.sourceSkillId === spawnSpiderlings.id).length, 5, 'a spiderling last hit should propagate one additional unit')

  const eldritchState = createInitialState('debuff-death-summon-runtime')
  eldritchState.time = 600
  const warlock = eldritchState.arcanes[0]
  const afflictedTarget = eldritchState.arcanes.find((candidate) => candidate.team !== warlock.team)!
  warlock.heroDefinitionId = 'h029_soul_warlock'
  warlock.stats.mana = warlock.stats.maxMana = 1_000
  warlock.pos = { x: 50, y: 50 }
  afflictedTarget.pos = { x: 51, y: 50 }
  afflictedTarget.stats.hp = 1
  const warlockDefinition = getHeroDefinition(warlock.heroDefinitionId)
  const eldritchSummoning = warlockDefinition.skills!.find((candidate) => candidate.sourceAbilityId === 1274)!
  const offensiveWarlockSkill = warlockDefinition.skills!.find((candidate) => candidate.kind === 'active' && candidate.damageType !== 'none')!
  warlock.skillLevels = { [offensiveWarlockSkill.key]: 1 }
  assert.equal(castSimpleSkill(eldritchState, warlock, offensiveWarlockSkill, 1, afflictedTarget, true), true)
  resolveDeaths(eldritchState)
  assert.equal(eldritchState.summons.filter((summon) => summon.sourceSkillId === eldritchSummoning.id).length, 1, 'an enemy dying under a Warlock skill should summon one minor imp')
  const minorImp = eldritchState.summons.find((summon) => summon.sourceSkillId === eldritchSummoning.id)!
  const explosionTargets = eldritchState.arcanes.filter((candidate) => candidate.team !== warlock.team && candidate.stats.hp > 0).slice(0, 2)
  const distantEnemy = eldritchState.arcanes.find((candidate) => candidate.team !== warlock.team && !explosionTargets.includes(candidate) && candidate.stats.hp > 0)!
  minorImp.pos = { x: 50, y: 50 }
  minorImp.targetId = explosionTargets[0].id
  minorImp.lastAttack = eldritchState.time - minorImp.attackInterval
  explosionTargets[0].pos = { x: 50.4, y: 50 }
  explosionTargets[1].pos = { x: 52, y: 50 }
  distantEnemy.pos = { x: 60, y: 50 }
  const explosionHp = explosionTargets.map((target) => target.stats.hp)
  const distantHp = distantEnemy.stats.hp
  resolveCombat(eldritchState, createTickFrameContext(), new Set([minorImp.id]))
  assert.ok(explosionTargets.every((target, index) => eldritchState.arcanes.find((candidate) => candidate.id === target.id)!.stats.hp < explosionHp[index]), 'the imp should damage every enemy inside its imported explosion radius')
  assert.equal(eldritchState.arcanes.find((candidate) => candidate.id === distantEnemy.id)!.stats.hp, distantHp, 'the imp explosion should not hit distant enemies')
  assert.equal(eldritchState.summons.find((summon) => summon.id === minorImp.id)!.hp, 0, 'the imp should be consumed by its first explosion')
  resolveDeaths(eldritchState)
  assert.equal(eldritchState.summons.some((summon) => summon.id === minorImp.id), false, 'an exploded imp should despawn during death resolution')

  const reincarnationState = createInitialState('self-death-summon-runtime')
  reincarnationState.time = 600
  const monarch = reincarnationState.arcanes[0]
  const monarchKiller = reincarnationState.arcanes.find((candidate) => candidate.team !== monarch.team)!
  monarch.heroDefinitionId = 'h034_skeleton_monarch'
  monarch.skillLevels = { R: 1 }
  monarch.stats.mana = 500
  monarch.stats.hp = 0
  monarch.lastHitBy = { id: monarchKiller.id, label: monarchKiller.player, team: monarchKiller.team }
  const nearbyReincarnationEnemies = reincarnationState.arcanes.filter((candidate) => candidate.team !== monarch.team).slice(0, 2)
  nearbyReincarnationEnemies.forEach((enemy, index) => { enemy.pos = { x: monarch.pos.x + 1 + index, y: monarch.pos.y } })
  reincarnationState.arcanes.filter((candidate) => candidate.team !== monarch.team && !nearbyReincarnationEnemies.includes(candidate)).forEach((enemy) => { enemy.pos = { x: 80, y: 80 } })
  const reincarnation = getHeroDefinition(monarch.heroDefinitionId).skills!.find((candidate) => candidate.sourceAbilityId === 5089)!
  resolveDeaths(reincarnationState)
  assert.equal(reincarnationState.summons.filter((summon) => summon.sourceSkillId === reincarnation.id).length, 2, 'Reincarnation should summon the level-one skeleton count on death')
  assert.ok(nearbyReincarnationEnemies.every((enemy) => hasTimedEffect(reincarnationState, enemy.id, 'slow')), 'Reincarnation should slow nearby enemy Arcanes')
  assert.ok(reincarnationState.summons.filter((summon) => summon.sourceSkillId === reincarnation.id).every((summon) => nearbyReincarnationEnemies.some((enemy) => enemy.id === summon.targetId)), 'Reincarnation skeletons should immediately focus nearby enemy Arcanes')
  assert.equal(reincarnationState.arcanes[0].itemCooldowns[reincarnation.id], 780, 'death-triggered summons should enter the official cooldown')

  const noManaReincarnationState = createInitialState('self-death-summon-no-mana')
  noManaReincarnationState.time = 600
  const exhaustedMonarch = noManaReincarnationState.arcanes[0]
  exhaustedMonarch.heroDefinitionId = 'h034_skeleton_monarch'
  exhaustedMonarch.skillLevels = { R: 1 }
  exhaustedMonarch.stats.mana = 0
  exhaustedMonarch.stats.hp = 0
  resolveDeaths(noManaReincarnationState)
  assert.equal(noManaReincarnationState.summons.length, 0, 'Reincarnation should not trigger without its mana cost')

  const fleshGolemState = createInitialState('on-attack-summon-runtime')
  fleshGolemState.time = 600
  const undying = fleshGolemState.arcanes[0]
  const fleshGolemTarget = fleshGolemState.arcanes.find((candidate) => candidate.team !== undying.team)!
  undying.heroDefinitionId = 'h077_decay_zombie'
  undying.skillLevels = { R: 1 }
  undying.stats.mana = undying.stats.maxMana = 1_000
  undying.pos = { x: 50, y: 50 }
  fleshGolemTarget.pos = { x: 51, y: 50 }
  const fleshGolem = getHeroDefinition(undying.heroDefinitionId).skills!.find((candidate) => candidate.sourceAbilityId === 5447)!
  assert.equal(castSimpleSkill(fleshGolemState, undying, fleshGolem, 1, undefined, true), false, 'the transformation should wait for a combat target')
  assert.equal(castSimpleSkill(fleshGolemState, undying, fleshGolem, 1, fleshGolemTarget, true), true)
  performArcaneBasicAttack(fleshGolemState, undying, fleshGolemTarget)
  assert.equal(fleshGolemState.summons.filter((summon) => summon.sourceSkillId === fleshGolem.id).length, 1, 'a transformed attack should summon one zombie')
  for (let attack = 0; attack < 20; attack += 1) {
    fleshGolemState.time += 1
    performArcaneBasicAttack(fleshGolemState, undying, fleshGolemTarget)
  }
  assert.equal(fleshGolemState.summons.filter((summon) => summon.sourceSkillId === fleshGolem.id).length, 12, 'repeated transformed attacks should respect the per-owner summon cap')
  fleshGolemState.timedEffects = []
  const transformedSummonCount = fleshGolemState.summons.length
  performArcaneBasicAttack(fleshGolemState, undying, fleshGolemTarget)
  assert.equal(fleshGolemState.summons.length, transformedSummonCount, 'attacks outside the transformation should not summon zombies')

  const tombstoneState = createInitialState('tombstone-zombie-runtime')
  tombstoneState.time = 600
  const tombstoneCaster = tombstoneState.arcanes[0]
  tombstoneCaster.heroDefinitionId = 'h077_decay_zombie'
  tombstoneCaster.skillLevels = { E: 1 }
  tombstoneCaster.pos = { x: 50, y: 50 }
  const tombstoneTarget = tombstoneState.arcanes.find((candidate) => candidate.team !== tombstoneCaster.team)!
  tombstoneState.arcanes.filter((candidate) => candidate.team !== tombstoneCaster.team).forEach((enemy) => {
    enemy.pos = enemy.id === tombstoneTarget.id ? { x: 51, y: 50 } : { x: 85, y: 85 }
  })
  const tombstoneSkill = getHeroDefinition(tombstoneCaster.heroDefinitionId).skills!.find((candidate) => candidate.sourceAbilityId === 5444)!
  const tombstoneProfile = getSkillEffectProfile(tombstoneSkill, 1)
  applySimpleSkillSummonPressure(tombstoneState, tombstoneCaster, tombstoneSkill, tombstoneProfile, tombstoneCaster.pos)
  const tombstoneUnit = tombstoneState.summons[0]
  tombstoneUnit.pos = { ...tombstoneCaster.pos }
  assert.equal(tombstoneUnit.canAttack, false, 'Tombstone should spawn zombies instead of performing generic attacks')
  tombstoneState.time += tombstoneProfile.summonSpawnInterval
  updateSummonedUnits(tombstoneState, 0.5)
  const tombstoneZombie = tombstoneState.summons.find((summon) => summon.variant === 'tombstone_zombie')!
  assert.ok(tombstoneZombie, 'Tombstone should periodically create a zombie for each enemy Arcane in its radius')
  assert.equal(tombstoneZombie.targetId, tombstoneTarget.id)
  assert.equal(tombstoneZombie.damage, tombstoneProfile.summonChildDamage)
  assert.equal(tombstoneZombie.maxHp, tombstoneProfile.summonChildHits * 90)
  const tombstoneReplay = materializeMatchRenderFrame(createMatchRenderFrame(tombstoneState), createMatchStaticData(tombstoneState))
  assert.equal(tombstoneReplay.summons.find((summon) => summon.id === tombstoneZombie.id)?.variant, 'tombstone_zombie', 'replay frames should preserve specialized summon variants')

  const familiarState = createInitialState('familiar-corrosion-runtime')
  familiarState.time = 600
  const gargoyle = familiarState.arcanes[0]
  gargoyle.heroDefinitionId = 'h084_gargoyle_brood'
  gargoyle.skillLevels = { Q: 2, E: 2, R: 1 }
  const familiarTarget = familiarState.arcanes.find((candidate) => candidate.team !== gargoyle.team)!
  gargoyle.pos = { x: 50, y: 50 }
  familiarTarget.pos = { x: 51, y: 50 }
  const familiarSkill = getHeroDefinition(gargoyle.heroDefinitionId).skills!.find((candidate) => candidate.sourceAbilityId === 5483)!
  applySimpleSkillSummonPressure(familiarState, gargoyle, familiarSkill, getSkillEffectProfile(familiarSkill, 1), gargoyle.pos)
  const familiars = familiarState.summons.filter((summon) => summon.sourceSkillId === familiarSkill.id)
  assert.equal(familiars.length, 2)
  assert.ok(familiars.every((familiar) => familiar.unitSeedId === 'summon_stone_familiar'))
  assert.ok(familiars.every((familiar) => familiar.cloakLayers === 4), 'Familiars should inherit the owner Cloak layers when spawned')
  const graveChillSkill = getHeroDefinition(gargoyle.heroDefinitionId).skills!.find((candidate) => candidate.sourceAbilityId === 5480)!
  const familiarBaseAttackInterval = familiars[0].attackInterval
  resolveSimpleSkillEffects(familiarState, gargoyle, graveChillSkill, 2, familiarTarget)
  assert.ok(familiars.every((familiar) => familiar.sharedBuffUntil === 605), 'Grave Chill should share its imported duration with nearby Familiars')
  assert.ok(getEffectiveSummonMoveSpeed(familiarState, familiars[0]) > familiars[0].moveSpeed)
  assert.ok(getEffectiveSummonAttackInterval(familiarState, familiars[0]) < familiarBaseAttackInterval)
  familiars.forEach((familiar) => {
    familiar.pos = { ...familiarTarget.pos }
    familiar.targetId = familiarTarget.id
    familiar.lastAttack = familiarState.time - familiar.attackInterval
  })
  const familiarHpBeforeStoneForm = familiarTarget.stats.hp
  updateSummonedUnits(familiarState, 0.5)
  assert.ok(familiarState.arcanes.find((arcane) => arcane.id === familiarTarget.id)!.stats.hp < familiarHpBeforeStoneForm, 'Familiars should use their Stone Form unit ability against nearby Arcanes')
  assert.equal(hasTimedEffect(familiarState, familiarTarget.id, 'stun'), true)
  assert.ok(familiars.every((familiar) => familiar.nextAbilityAt === 620), 'each Familiar should track an independent Stone Form cooldown')
  const familiarHpDuringCooldown = familiarState.arcanes.find((arcane) => arcane.id === familiarTarget.id)!.stats.hp
  updateSummonedUnits(familiarState, 0.5)
  assert.equal(familiarState.arcanes.find((arcane) => arcane.id === familiarTarget.id)!.stats.hp, familiarHpDuringCooldown, 'Stone Form should not repeat before its cooldown')
  const familiarFrame = createMatchRenderFrame(familiarState)
  const familiarStaticData = createMatchStaticData(familiarState)
  const familiarReplay = materializeMatchRenderFrame(familiarFrame, familiarStaticData)
  assert.equal(familiarReplay.summons[0].unitSeedId, 'summon_stone_familiar')
  assert.equal(familiarReplay.summons[0].nextAbilityAt, 620)
  assert.equal(familiarReplay.summons[0].sharedBuffUntil, 605)
  assert.equal(familiarReplay.summons[0].cloakLayers, 4)
  const familiarReplayStore = new ReplayFrameStore()
  familiarReplayStore.appendChunk(new ReplayChunkEncoder().encode([familiarFrame]))
  const compressedFamiliarReplay = materializeMatchRenderFrame(familiarReplayStore.get(0), familiarStaticData)
  assert.equal(compressedFamiliarReplay.summons[0].unitSeedId, 'summon_stone_familiar')
  assert.equal(compressedFamiliarReplay.summons[0].nextAbilityAt, 620)
  assert.equal(compressedFamiliarReplay.summons[0].sharedBuffUntil, 605)
  assert.equal(compressedFamiliarReplay.summons[0].cloakLayers, 4)
  resolveCombat(familiarState, createTickFrameContext(), new Set(familiars.map((familiar) => familiar.id)))
  const familiarCorrosion = familiarState.timedEffects.filter((effect) => (
    effect.targetId === familiarTarget.id && effect.modifiers?.armorFlat === -1
  ))
  assert.equal(familiarCorrosion.length, 2, 'each Familiar should maintain its own stacking armor-reduction debuff')
  familiarState.arcanes.filter((arcane) => arcane.team !== gargoyle.team).forEach((enemy) => { enemy.pos = { x: 85, y: 85 } })
  familiars[0].pos = { x: 70, y: 50 }
  updateSummonedUnits(familiarState, 0.5)
  assert.equal(familiars[0].recallStartedAt, 600, 'a distant Familiar should begin the imported recall channel')
  familiarState.time += 4
  updateSummonedUnits(familiarState, 0.5)
  assert.equal(familiars[0].recallStartedAt, undefined)
  assert.ok(distance(familiars[0].pos, gargoyle.pos) < 4, 'recall should return the Familiar to its owner after the imported duration')
  const cloakTarget = familiarState.summons.find((summon) => summon.id === familiars[1].id)!
  cloakTarget.pos = { ...gargoyle.pos }
  const cloakHpBefore = cloakTarget.hp
  damageEntity(familiarState, cloakTarget.id, 100, {
    id: familiarTarget.id,
    label: familiarTarget.player,
    team: familiarTarget.team,
    damageType: 'pure',
  })
  const damagedFamiliar = familiarState.summons.find((summon) => summon.id === cloakTarget.id)!
  assert.equal(damagedFamiliar.hp, cloakHpBefore - 52, 'four level-two Cloak layers should reduce Familiar damage by 48%')
  assert.equal(damagedFamiliar.cloakLayers, 3)
  familiarState.time += 6
  updateSummonedUnits(familiarState, 0.5)
  assert.equal(familiarState.summons.find((summon) => summon.id === cloakTarget.id)!.cloakLayers, 4, 'Cloak should recover one layer after its imported delay')

  const bearState = createInitialState('spirit-bear-runtime')
  bearState.time = 600
  const druid = bearState.arcanes[0]
  const bearKiller = bearState.arcanes.find((candidate) => candidate.team !== druid.team)!
  druid.heroDefinitionId = 'h072_druid_dual'
  const bearSkill = getHeroDefinition(druid.heroDefinitionId).skills!.find((candidate) => candidate.sourceAbilityId === 1342)!
  druid.skillLevels = { [bearSkill.key]: 1, W: 2, E: 2 }
  druid.pos = { x: 50, y: 50 }
  applySimpleSkillSummonPressure(bearState, druid, bearSkill, getSkillEffectProfile(bearSkill, 1), druid.pos)
  const spiritBear = bearState.summons[0]
  assert.equal(spiritBear.unitSeedId, 'summon_spirit_bear')
  assert.equal(spiritBear.damage, 55, 'Spirit Bear should use the adapted unit seed when the official summon skill omits attack damage')
  assert.equal(getEffectiveSummonMoveSpeed(bearState, spiritBear), spiritBear.moveSpeed * 1.4, 'Spirit Link should apply the Bear-specific movement bonus')
  spiritBear.pos = { x: 51, y: 50 }
  bearKiller.pos = { x: 51, y: 50 }
  bearKiller.stats.maxHp = bearKiller.stats.hp = 100_000
  spiritBear.hp -= 100
  druid.stats.hp -= 100
  spiritBear.targetId = bearKiller.id
  spiritBear.lastAttack = bearState.time - spiritBear.attackInterval
  const bearHpBeforeLink = spiritBear.hp
  const druidHpBeforeLink = druid.stats.hp
  resolveCombat(bearState, createTickFrameContext(), new Set([spiritBear.id]))
  assert.ok(spiritBear.hp > bearHpBeforeLink, 'Spirit Bear attacks should lifesteal into the Bear')
  assert.ok(bearState.arcanes.find((arcane) => arcane.id === druid.id)!.stats.hp > druidHpBeforeLink, 'Spirit Bear attacks should share lifesteal with the owner')
  spiritBear.hp -= 100
  const bearHpBeforeOwnerAttack = spiritBear.hp
  const linkedDruid = bearState.arcanes.find((arcane) => arcane.id === druid.id)!
  performArcaneBasicAttack(bearState, linkedDruid, bearKiller)
  assert.ok(spiritBear.hp > bearHpBeforeOwnerAttack, 'owner attacks should share Spirit Link lifesteal with the Bear')
  spiritBear.pos = { x: 56, y: 50 }
  bearKiller.pos = { x: 56, y: 50 }
  const savageRoarSkill = getHeroDefinition(druid.heroDefinitionId).skills!.find((candidate) => candidate.sourceAbilityId === 5414)!
  const roaringDruid = bearState.arcanes.find((arcane) => arcane.id === druid.id)!
  resolveSimpleSkillEffects(bearState, roaringDruid, savageRoarSkill, 2, roaringDruid)
  assert.equal(hasTimedEffect(bearState, bearKiller.id, 'fear'), true, 'Savage Roar should also originate from the Spirit Bear')
  spiritBear.pos = { x: 51, y: 50 }
  bearKiller.pos = { x: 51, y: 50 }
  for (let attempt = 0; attempt < 60 && !hasTimedEffect(bearState, bearKiller.id, 'root'); attempt += 1) {
    bearState.time += spiritBear.attackInterval
    spiritBear.targetId = bearKiller.id
    spiritBear.lastAttack = bearState.time - spiritBear.attackInterval
    resolveCombat(bearState, createTickFrameContext(), new Set([spiritBear.id]))
  }
  assert.equal(hasTimedEffect(bearState, bearKiller.id, 'root'), true, 'Spirit Bear attacks should deterministically roll Entangling Claws')
  spiritBear.pos = { x: 70, y: 50 }
  spiritBear.hp -= 100
  spiritBear.targetId = bearKiller.id
  const bearHpBeforeRegen = spiritBear.hp
  updateSummonedUnits(bearState, 1)
  assert.equal(spiritBear.hp, bearHpBeforeRegen + 1.5, 'Spirit Bear should apply its imported flat regeneration')
  assert.ok(spiritBear.pos.x < 70, 'Spirit Bear should return toward its owner after breaking the attack leash')
  assert.equal(spiritBear.targetId, undefined)
  const druidBeforeBacklash = bearState.arcanes.find((arcane) => arcane.id === druid.id)!
  const druidHpBeforeBacklash = druidBeforeBacklash.stats.hp
  damageEntity(bearState, spiritBear.id, spiritBear.hp + 1, {
    id: bearKiller.id,
    label: bearKiller.player,
    team: bearKiller.team,
    damageType: 'pure',
  })
  resolveDeaths(bearState)
  assert.equal(
    bearState.arcanes.find((arcane) => arcane.id === druid.id)!.stats.hp,
    druidHpBeforeBacklash - druidBeforeBacklash.stats.maxHp * 0.2,
    'a killed Spirit Bear should deal imported backlash damage to its owner',
  )

  const deathWardState = createInitialState('death-ward-scepter-runtime')
  deathWardState.time = 600
  const witch = deathWardState.arcanes[0]
  witch.heroDefinitionId = 'h023_witch_shaman'
  witch.skillLevels = { R: 1 }
  witch.items = [shopCatalog.find((item) => item.id === 'i135_grand_spell_scepter')!.name]
  witch.pos = { x: 50, y: 50 }
  witch.stats.hp = witch.stats.maxHp - 200
  const deathWardTargets = deathWardState.arcanes.filter((candidate) => candidate.team !== witch.team).slice(0, 2)
  deathWardState.arcanes.filter((candidate) => candidate.team !== witch.team).forEach((enemy) => {
    enemy.pos = deathWardTargets.includes(enemy) ? { x: 51 + deathWardTargets.indexOf(enemy), y: 50 } : { x: 85, y: 85 }
  })
  const deathWardSkill = getHeroDefinition(witch.heroDefinitionId).skills!.find((candidate) => candidate.sourceAbilityId === 5141)!
  applySimpleSkillSummonPressure(deathWardState, witch, deathWardSkill, getSkillEffectProfile(deathWardSkill, 1), witch.pos)
  const deathWardUnit = deathWardState.summons[0]
  deathWardUnit.pos = { x: 50, y: 50 }
  deathWardUnit.targetId = deathWardTargets[0].id
  deathWardUnit.lastAttack = deathWardState.time - deathWardUnit.attackInterval
  const deathWardTargetHp = deathWardTargets.map((target) => target.stats.hp)
  const witchHpBeforeLifesteal = witch.stats.hp
  resolveCombat(deathWardState, createTickFrameContext(), new Set([deathWardUnit.id]))
  assert.ok(deathWardTargets.every((target, index) => (
    deathWardState.arcanes.find((arcane) => arcane.id === target.id)!.stats.hp < deathWardTargetHp[index]
  )), 'Scepter Death Ward should bounce to a second nearby Arcane')
  assert.ok(deathWardState.arcanes.find((arcane) => arcane.id === witch.id)!.stats.hp > witchHpBeforeLifesteal, 'Scepter Death Ward bounce should heal its owner through imported lifesteal')
  deathWardState.arcanes.find((arcane) => arcane.id === deathWardTargets[1].id)!.pos = { x: 85, y: 85 }
  const liveWitch = deathWardState.arcanes.find((arcane) => arcane.id === witch.id)!
  liveWitch.stats.hp = liveWitch.stats.maxHp - 100
  deathWardState.time += deathWardUnit.attackInterval
  deathWardUnit.lastAttack = deathWardState.time - deathWardUnit.attackInterval
  const witchHpBeforeSoloLifesteal = liveWitch.stats.hp
  resolveCombat(deathWardState, createTickFrameContext(), new Set([deathWardUnit.id]))
  assert.ok(deathWardState.arcanes.find((arcane) => arcane.id === witch.id)!.stats.hp > witchHpBeforeSoloLifesteal, 'Scepter Death Ward should lifesteal from its primary attack without requiring a bounce target')

  const unitAbilityState = createInitialState('summon-unit-ability-runtime')
  unitAbilityState.time = 600
  const unitAbilityCasterId = unitAbilityState.arcanes[0].id
  const unitAbilityTargets = unitAbilityState.arcanes.filter((arcane) => arcane.team !== unitAbilityState.arcanes[0].team).slice(0, 2)
  unitAbilityState.arcanes.filter((arcane) => arcane.team !== unitAbilityState.arcanes[0].team).forEach((enemy) => {
    enemy.pos = unitAbilityTargets.includes(enemy) ? { x: 51 + unitAbilityTargets.indexOf(enemy), y: 50 } : { x: 85, y: 85 }
    enemy.stats.maxHp = enemy.stats.hp = 100_000
  })
  const getUnitAbilityTarget = (index = 0) => unitAbilityState.arcanes.find((arcane) => arcane.id === unitAbilityTargets[index].id)!
  const spawnUnitAbilitySummon = (heroId: string, sourceAbilityId: number) => {
    const caster = unitAbilityState.arcanes.find((arcane) => arcane.id === unitAbilityCasterId)!
    caster.heroDefinitionId = heroId
    caster.pos = { x: 50, y: 50 }
    const definition = getHeroDefinition(heroId)
    const skill = [...(definition.skills ?? []), ...(definition.supplementalSkills ?? [])]
      .find((candidate) => candidate.sourceAbilityId === sourceAbilityId)!
    caster.skillLevels = { [skill.key]: 1 }
    const profile = getSkillEffectProfile(skill, 1)
    const spawned = applySimpleSkillSummonPressure(
      unitAbilityState,
      caster,
      skill,
      profile,
      caster.pos,
      profile.summonMode,
    )[0]
    assert.ok(spawned, `${skill.id} should materialize a summon for its unit ability test`)
    spawned.pos = { x: 51, y: 50 }
    unitAbilityState.summons = [spawned]
    return spawned
  }

  const wolf = spawnUnitAbilitySummon('h069_wolf_alpha', 5395)
  const wolfTargetHp = getUnitAbilityTarget().stats.hp
  for (let attempt = 0; attempt < 60 && getUnitAbilityTarget().stats.hp === wolfTargetHp; attempt += 1) {
    unitAbilityState.time += 0.05
    applySummonAttackSpecials(unitAbilityState, wolf, getUnitAbilityTarget())
  }
  assert.ok(getUnitAbilityTarget().stats.hp < wolfTargetHp, 'Spirit Wolf should deterministically proc its 160% critical attack')

  unitAbilityState.timedEffects = []
  const boar = spawnUnitAbilitySummon('h030_beast_commander', 7230)
  applySummonAttackSpecials(unitAbilityState, boar, getUnitAbilityTarget())
  const boarSlow = unitAbilityState.timedEffects.find((effect) => effect.sourceId.endsWith(':boar_poison_slow'))!
  assert.equal(boarSlow.value, 0.2)
  assert.ok(boarSlow.expiresAt > unitAbilityState.time && boarSlow.expiresAt - unitAbilityState.time <= 3)

  unitAbilityState.timedEffects = []
  const plagueWard = spawnUnitAbilitySummon('h032_poison_alchemist', 5180)
  applySummonAttackSpecials(unitAbilityState, plagueWard, getUnitAbilityTarget())
  const wardPoison = unitAbilityState.timedEffects.find((effect) => effect.sourceId.endsWith(':ward_poison'))!
  assert.equal(wardPoison.value, 8)
  const wardPoisonHp = getUnitAbilityTarget().stats.hp
  unitAbilityState.time += 1
  processTimedEffects(unitAbilityState)
  assert.ok(getUnitAbilityTarget().stats.hp < wardPoisonHp, 'Plague Ward poison should tick through the shared timed-effect runtime')

  unitAbilityState.timedEffects = []
  const spiderling = spawnUnitAbilitySummon('h053_brood_matriarch', 5279)
  applySummonAttackSpecials(unitAbilityState, spiderling, getUnitAbilityTarget())
  assert.equal(unitAbilityState.timedEffects.find((effect) => effect.sourceId.endsWith(':minor_poison'))?.value, 4)

  unitAbilityState.timedEffects = []
  const forgedSpirit = spawnUnitAbilitySummon('h066_complex_mage', 5387)
  for (let attack = 0; attack < 12; attack += 1) applySummonAttackSpecials(unitAbilityState, forgedSpirit, getUnitAbilityTarget())
  const meltingAttack = unitAbilityState.timedEffects.find((effect) => effect.sourceId.endsWith(':melting_attack'))!
  assert.equal(meltingAttack.stacks, 10)
  assert.equal(meltingAttack.modifiers?.armorFlat, -10)

  unitAbilityState.timedEffects = []
  const golem = spawnUnitAbilitySummon('h029_soul_warlock', 5165)
  const splashTargetHp = getUnitAbilityTarget(1).stats.hp
  applySummonAttackSpecials(unitAbilityState, golem, getUnitAbilityTarget())
  assert.ok(getUnitAbilityTarget(1).stats.hp < splashTargetHp, 'Infernal Golem should splash Burning Fists around its primary target')
  const impactTargetHp = unitAbilityTargets.map((_, index) => getUnitAbilityTarget(index).stats.hp)
  const golemKiller = getUnitAbilityTarget()
  damageEntity(unitAbilityState, golem.id, golem.hp + 1, {
    id: golemKiller.id,
    label: golemKiller.player,
    team: golemKiller.team,
    damageType: 'pure',
  })
  resolveDeaths(unitAbilityState)
  assert.ok(unitAbilityTargets.every((_, index) => getUnitAbilityTarget(index).stats.hp < impactTargetHp[index]), 'a killed Infernal Golem should apply its on-death impact in area')
  assert.equal(unitAbilityState.summons.some((summon) => summon.id === golem.id), false)

  const eidolon = spawnUnitAbilitySummon('h025_gravity_summoner', 5147)
  for (let attack = 0; attack < 5; attack += 1) applySummonAttackSpecials(unitAbilityState, eidolon, getUnitAbilityTarget())
  assert.equal(eidolon.abilityCounter, 5)
  const eidolonFrame = createMatchRenderFrame(unitAbilityState)
  const eidolonStaticData = createMatchStaticData(unitAbilityState)
  const eidolonReplayStore = new ReplayFrameStore()
  eidolonReplayStore.appendChunk(new ReplayChunkEncoder().encode([eidolonFrame]))
  assert.equal(materializeMatchRenderFrame(eidolonReplayStore.get(0), eidolonStaticData).summons[0].abilityCounter, 5)
  applySummonAttackSpecials(unitAbilityState, eidolon, getUnitAbilityTarget())
  assert.equal(eidolon.hp, 0)
  assert.equal(unitAbilityState.summons.filter((summon) => summon.variant === 'eidolon_split_child').length, 2)
  resolveDeaths(unitAbilityState)
  const splitChildren = unitAbilityState.summons.filter((summon) => summon.variant === 'eidolon_split_child')
  for (let attack = 0; attack < 6; attack += 1) applySummonAttackSpecials(unitAbilityState, splitChildren[0], getUnitAbilityTarget())
  assert.equal(unitAbilityState.summons.filter((summon) => summon.variant === 'eidolon_split_child').length, 2, 'split children should not recursively multiply')

  const passiveCarrier = skillState.arcanes[0]
  skillState.timedEffects = []
  passiveCarrier.heroDefinitionId = 'h005_frost_marksman'
  passiveCarrier.skillLevels = { Q: 4 }
  const passiveDamage = getEffectiveArcaneDamage(skillState, passiveCarrier)
  assert.ok(passiveDamage > passiveCarrier.stats.damage, 'leveled passive skills should modify continuous combat stats')
}

for (let step = 0; step < 2400; step += 1) {
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
assert.equal(detailChunk.dictionaryNumbers.length, detailChunk.dictionaryAdditions.length * 2, 'static creep max HP and range should be dictionary data')
assert.equal(detailChunk.creepNumbers.length, renderFrame.creeps.length * 3, 'creep samples should only retain position and current HP')
assert.deepEqual(normalizeFrame(replayStore.get(0)), normalizeFrame(renderFrame), 'binary replay should preserve complete render frames')
assert.deepEqual(normalizeFrame(replayStore.get(1)), normalizeFrame(nextMotionFrame), 'binary replay should preserve compact motion frames')
assert.equal(replayStore.findIndexAtOrBefore(nextMotionFrame.time - 0.01), 0, 'replay seek should select the preceding frame')
assert.deepEqual(
  normalizeFrame({ ...renderFrame, details: replayStore.findDetailsAtOrBefore(1) }).details,
  normalizeFrame(renderFrame).details,
  'motion frames should reuse the latest inspector details',
)
assert.ok(replayStore.estimatedByteLength > 0, 'binary replay should report its retained byte size')

const repeatedExtrasFrames = [
  { ...motionFrame, time: motionFrame.time + 0.4 },
  { ...motionFrame, time: motionFrame.time + 0.6 },
]
const repeatedExtrasChunk = replayEncoder.encode(repeatedExtrasFrames)
assert.equal(repeatedExtrasChunk.extrasOffsets.length, 1, 'unchanged event payloads should reuse the shared extras dictionary')
assert.equal(repeatedExtrasChunk.extrasBytes.byteLength, 0, 'reused event payloads should not be serialized again')
replayStore.appendChunk(repeatedExtrasChunk)

const trajectoryFrame = {
  ...motionFrame,
  time: motionFrame.time + 0.8,
  arcanes: motionFrame.arcanes.map((arcane, index) => index === 0
    ? [arcane[0] + 2, arcane[1] + 4, ...arcane.slice(2)] as typeof arcane
    : arcane),
  creeps: motionFrame.creeps.map((creep, index) => index === 0
    ? [creep[0], creep[1], creep[2], creep[3], creep[4] + 3, creep[5] + 1, ...creep.slice(6)] as typeof creep
    : creep),
  boss: [motionFrame.boss[0] + 2, motionFrame.boss[1] - 2, ...motionFrame.boss.slice(2)] as typeof motionFrame.boss,
}
replayStore.appendChunk(replayEncoder.encode([trajectoryFrame]))
const trajectorySample = replayStore.sampleAtTime(motionFrame.time + 0.7)
assert.equal(trajectorySample.time, motionFrame.time + 0.7, 'trajectory sampling should preserve the requested replay time')
assert.ok(Math.abs(trajectorySample.arcanes[0][0] - (motionFrame.arcanes[0][0] + 1)) < 0.001, 'arcane trajectories should interpolate between keyframes')
assert.ok(Math.abs(trajectorySample.creeps[0][4] - (motionFrame.creeps[0][4] + 1.5)) < 0.001, 'creep trajectories should interpolate between keyframes')
assert.ok(Math.abs(trajectorySample.boss[0] - (motionFrame.boss[0] + 1)) < 0.001, 'boss trajectories should interpolate between keyframes')

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
