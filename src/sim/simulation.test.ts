import assert from 'node:assert/strict'

import {
  addTimedEffect,
  applySimpleSkillDispel,
  applySimpleSkillDisplacement,
  applySimpleSkillSummonPressure,
  applySimpleNegativeSkillEffects,
  buildArcaneStats,
  buyItemAtBase,
  canTargetWithSimpleDamageSkill,
  createInitialState,
  createMatchRenderFrame,
  createMatchStaticData,
  damageEntity,
  distance,
  enrichTeamPlanWithMapTarget,
  formatMatchTime,
  getGamePhase,
  getCombatCriticalEventSignature,
  getCombatFocusAssessment,
  getCombatStagingPoint,
  getCombatTargetTowerExposure,
  getBountyRuneSide,
  getArcanePassiveCombatModifiers,
  getCampClearAssessment,
  getHeroDefinition,
  getItemPurchasePlan,
  getPregameBountyRunePlan,
  getJungleStackChance,
  getHigherPriorityFarmAlly,
  getCreepXpShare,
  getDenyTarget,
  getEffectiveArcaneAttackCooldown,
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
  getRoleGpmTarget,
  getArcaneEconomyNeed,
  getTowerTankAssessment,
  getTowerTankCandidate,
  hasTimedEffect,
  healArcaneDirectly,
  isPositiveSimpleSkill,
  loadGameData,
  materializeMatchRenderFrame,
  matchPreparationStartSeconds,
  resetDisengagedNeutralCamps,
  runeSpawnPoints,
  processJungleStacks,
  resolveDeaths,
  resolveCombat,
  simulationFrameSeconds,
  shopCatalog,
  tryCastSimpleSkill,
  tick,
  updateCombatAiFoundation,
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

function createStateAtGameStart(seed: string) {
  const state = createInitialState(seed)
  state.time = -simulationFrameSeconds
  return tick(state, simulationFrameSeconds, true)
}

await loadGameData()

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
  const initialAttackTimes = new Map(naturalPregame.arcanes.map((arcane) => [arcane.id, arcane.lastAttack]))
  let pregameStep = 0
  while (naturalPregame.time < -45) {
    naturalPregame = tick(naturalPregame, simulationFrameSeconds, pregameStep % 3 === 0)
    pregameStep += 1
  }
  assert.ok(
    naturalPregame.arcanes.some((arcane) => arcane.lastAttack !== initialAttackTimes.get(arcane.id)),
    'natural rune routes should produce combat well before the end of the preparation minute',
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
  assert.ok(towerBoard, 'a tower bait should still be recognized as an encounter')
  assert.equal(getCombatTargetTowerExposure(towerCombat, diver.team, bait.pos), 100)
  const towerAssessment = getCombatFocusAssessment(towerCombat, diver, bait, towerBoard, [bait])
  assert.equal(towerAssessment.canApproach, false, 'combat focus must not authorize an unsupported tower dive')
  const stagingPoint = getCombatStagingPoint(towerCombat, diver, bait, towerBoard, towerAssessment)
  assert.ok(distance(stagingPoint, defendingTower.pos) > distance(diver.pos, defendingTower.pos), 'tower staging should create distance instead of rushing the bait')
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
  const scheduledState = createStateAtGameStart('fixed-attack-schedule')
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
  const priorityState = createStateAtGameStart('last-hit-before-deny')
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
  const focusState = createStateAtGameStart('combat-focus-attack-priority')
  focusState.time = 200
  const attacker = focusState.arcanes.find((arcane) => arcane.team === 'dawn')!
  const [closerEnemy, focusedEnemy] = focusState.arcanes.filter((arcane) => arcane.team === 'dusk').slice(0, 2)
  attacker.pos = { x: 50, y: 50 }
  attacker.lastAttack = 190
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
