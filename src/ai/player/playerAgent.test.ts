import assert from 'node:assert/strict'
import { getDeterministicDecisionNoise, scorePlayerModes, selectPlayerMode } from './playerAgent.ts'
import type { PlayerContext } from '../types/aiTypes.ts'

function makeContext(overrides: Partial<PlayerContext> = {}): PlayerContext {
  return {
    gameTime: { seconds: 12 * 60, minutes: 12, phase: 'early_mid' },
    matchSeed: 'test-seed',
    teamPlan: {
      type: 'farm_map',
      urgency: 64,
      risk: 24,
      expectedValue: 88,
      reasonTags: ['farm'],
    },
    team: {
      teamId: 'dawn',
      netWorth: 10000,
      xp: 9000,
      aliveHeroes: 5,
      deadHeroes: 0,
      averageHealthPct: 0.8,
      averageManaPct: 0.72,
      pushPower: 40,
      bossDamage: 42,
      defensivePower: 55,
      safeFarm: 75,
      lanePressure: 35,
      structureAtRisk: 12,
      baseThreat: 0,
      visionControl: 52,
      netWorthLead: 800,
      numbersAdvantage: 0,
      fightReadiness: 66,
      lowResourcePressure: 18,
      throwRisk: 10,
    },
    profile: {
      playerId: 'carry',
      role: 'safe_lane',
      farmPriority: 100,
      farmingEfficiency: 82,
      gpmDecisionBias: 86,
      teamfight: 55,
      positioning: 62,
      communication: 50,
      discipline: 70,
      aggression: 42,
      personality: {
        riskTolerance: 42,
        greed: 74,
        obedienceToCalls: 62,
        playmakingBias: 35,
        saveAllyBias: 24,
        farmBias: 82,
        objectiveBias: 48,
        tiltLevel: 0,
      },
    },
    self: {
      healthPct: 0.82,
      manaPct: 0.7,
      danger: 18,
      itemTimingUrgency: 78,
      developmentNeed: 20,
    },
    local: {
      enemyNumbersAdvantage: 0,
      allySaveNeed: 0,
      nearbyFightValue: 22,
      finishEnemyValue: 12,
      objectivePressure: 18,
    },
    map: {
      safeLaneFarmValue: 78,
      jungleFarmValue: 55,
      lanePushValue: 28,
      laneFarmGpm: 420,
      jungleFarmGpm: 340,
      lanePushGpm: 260,
      gankRisk: 22,
    },
    ...overrides,
  }
}

{
  const selected = selectPlayerMode(makeContext())
  assert.equal(selected.mode, 'farm_lane')
}

{
  const selected = selectPlayerMode(makeContext({
    map: {
      ...makeContext().map,
      safeLaneFarmValue: 24,
      jungleFarmValue: 98,
      laneFarmGpm: 220,
      jungleFarmGpm: 610,
      lanePushGpm: 260,
      gankRisk: 14,
    },
    local: {
      ...makeContext().local,
      objectivePressure: 4,
      nearbyFightValue: 8,
    },
  }))
  assert.equal(selected.mode, 'farm_jungle')
}

{
  const selected = selectPlayerMode(makeContext({
    gameTime: { seconds: 52 * 60, minutes: 52, phase: 'ultra_late' },
    teamPlan: { type: 'end_game', urgency: 94, risk: 58, expectedValue: 140, reasonTags: ['base'] },
    self: { ...makeContext().self, healthPct: 0.42, manaPct: 0.5, danger: 58, itemTimingUrgency: 10 },
    local: { ...makeContext().local, nearbyFightValue: 85, finishEnemyValue: 70, objectivePressure: 96 },
  }))
  assert.equal(selected.mode, 'retreat', 'late-game bots should preserve their life before forcing highground')
}

{
  const selected = selectPlayerMode(makeContext({
    profile: {
      ...makeContext().profile,
      playerId: 'support',
      role: 'dedicated_support',
      farmPriority: 16,
      gpmDecisionBias: 24,
      personality: {
        ...makeContext().profile.personality,
        saveAllyBias: 92,
        farmBias: 15,
      },
    },
    local: {
      ...makeContext().local,
      allySaveNeed: 92,
    },
    map: {
      ...makeContext().map,
      safeLaneFarmValue: 20,
      jungleFarmValue: 8,
      laneFarmGpm: 120,
      jungleFarmGpm: 80,
      lanePushGpm: 140,
    },
  }))
  assert.equal(selected.mode, 'save_ally')
}

{
  const selected = selectPlayerMode(makeContext({
    profile: {
      ...makeContext().profile,
      playerId: 'economy-reader',
      gpmDecisionBias: 100,
    },
    self: {
      ...makeContext().self,
      itemTimingUrgency: 42,
    },
    map: {
      ...makeContext().map,
      safeLaneFarmValue: 56,
      jungleFarmValue: 86,
      laneFarmGpm: 310,
      jungleFarmGpm: 640,
      lanePushGpm: 250,
      gankRisk: 10,
    },
    local: {
      ...makeContext().local,
      objectivePressure: 0,
      nearbyFightValue: 4,
    },
  }))
  assert.equal(selected.mode, 'farm_jungle')
}

{
  const selected = selectPlayerMode(makeContext({
    self: {
      ...makeContext().self,
      healthPct: 0.22,
      danger: 86,
      itemTimingUrgency: 10,
    },
    local: {
      ...makeContext().local,
      enemyNumbersAdvantage: 2,
    },
  }))
  assert.equal(selected.mode, 'retreat')
}

{
  const selected = selectPlayerMode(makeContext({
    profile: {
      ...makeContext().profile,
      playerId: 'hard-support-low-farm',
      role: 'dedicated_support',
      farmPriority: 16,
      farmingEfficiency: 20,
      gpmDecisionBias: 24,
      personality: {
        ...makeContext().profile.personality,
        farmBias: 12,
        saveAllyBias: 80,
        greed: 12,
      },
    },
    map: {
      ...makeContext().map,
      safeLaneFarmValue: 88,
      jungleFarmValue: 68,
      laneFarmGpm: 420,
      jungleFarmGpm: 520,
      lanePushGpm: 360,
    },
    local: {
      ...makeContext().local,
      nearbyFightValue: 48,
      allySaveNeed: 22,
    },
  }))
  assert.notEqual(selected.mode, 'farm_lane')
  assert.notEqual(selected.mode, 'farm_jungle')
}

{
  const amateurNoise = Math.abs(getDeterministicDecisionNoise('noise-check', 'farm_lane', 12, 35, 0))
  const professionalNoise = Math.abs(getDeterministicDecisionNoise('noise-check', 'farm_lane', 12, 95, 0))
  assert.ok(amateurNoise > professionalNoise)
}

{
  const riskyFarmContext = makeContext({
    profile: {
      ...makeContext().profile,
      playerId: 'negative-farm-weight',
      role: 'dedicated_support',
      farmPriority: 0,
      farmingEfficiency: 0,
      gpmDecisionBias: 0,
      discipline: 100,
      personality: {
        ...makeContext().profile.personality,
        greed: 0,
        farmBias: 0,
        tiltLevel: 0,
      },
    },
    self: {
      ...makeContext().self,
      healthPct: 0.12,
      danger: 96,
      itemTimingUrgency: 0,
    },
    local: {
      ...makeContext().local,
      objectivePressure: 80,
      nearbyFightValue: 70,
    },
    map: {
      safeLaneFarmValue: 0,
      jungleFarmValue: 0,
      lanePushValue: 0,
      laneFarmGpm: 1,
      jungleFarmGpm: 1,
      lanePushGpm: 1,
      gankRisk: 98,
    },
  })
  const supportFarmScore = scorePlayerModes(riskyFarmContext).find((score) => score.mode === 'farm_jungle')?.score
  const safeLaneFarmScore = scorePlayerModes({
    ...riskyFarmContext,
    profile: {
      ...riskyFarmContext.profile,
      role: 'safe_lane',
    },
  }).find((score) => score.mode === 'farm_jungle')?.score
  assert.ok(supportFarmScore !== undefined && supportFarmScore < 0)
  assert.equal(supportFarmScore, safeLaneFarmScore)
}

console.log('playerAgent tests passed')
