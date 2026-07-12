import assert from 'node:assert/strict'
import { getExecutionSuccessChance, resolvePlayerExecution } from './executionModel.ts'
import type { PlayerContext, PlayerModeScore } from '../types/aiTypes.ts'

function makeContext(overrides: Partial<PlayerContext> = {}): PlayerContext {
  return {
    gameTime: { seconds: 600, minutes: 10, phase: 'early_mid' },
    matchSeed: 'test-seed',
    teamPlan: {
      type: 'group_push',
      urgency: 70,
      risk: 38,
      expectedValue: 72,
      reasonTags: ['group'],
    },
    team: {
      teamId: 'dawn',
      netWorth: 10000,
      xp: 9800,
      aliveHeroes: 5,
      deadHeroes: 0,
      averageHealthPct: 0.8,
      averageManaPct: 0.72,
      pushPower: 62,
      bossDamage: 40,
      defensivePower: 55,
      safeFarm: 48,
      lanePressure: 58,
      structureAtRisk: 12,
      baseThreat: 0,
      visionControl: 55,
      netWorthLead: 400,
      numbersAdvantage: 1,
      fightReadiness: 72,
      lowResourcePressure: 10,
      throwRisk: 14,
    },
    profile: {
      playerId: 'stable-player',
      role: 'offlane',
      farmPriority: 62,
      farmingEfficiency: 55,
      gpmDecisionBias: 58,
      teamfight: 76,
      positioning: 74,
      communication: 68,
      discipline: 78,
      aggression: 58,
      personality: {
        riskTolerance: 54,
        greed: 42,
        obedienceToCalls: 74,
        playmakingBias: 60,
        saveAllyBias: 28,
        farmBias: 38,
        objectiveBias: 72,
        tiltLevel: 0,
      },
    },
    self: {
      healthPct: 0.82,
      manaPct: 0.7,
      danger: 24,
      itemTimingUrgency: 24,
      developmentNeed: 20,
    },
    local: {
      enemyNumbersAdvantage: 0,
      allySaveNeed: 0,
      nearbyFightValue: 45,
      finishEnemyValue: 20,
      objectivePressure: 74,
    },
    map: {
      safeLaneFarmValue: 30,
      jungleFarmValue: 18,
      lanePushValue: 58,
      laneFarmGpm: 220,
      jungleFarmGpm: 170,
      lanePushGpm: 340,
      gankRisk: 24,
    },
    ...overrides,
  }
}

const selected: PlayerModeScore = {
  mode: 'take_objective',
  score: 92,
  urgency: 80,
  risk: 28,
  reasonTags: ['objective'],
}

{
  const stable = getExecutionSuccessChance(makeContext(), selected)
  const tilted = getExecutionSuccessChance(makeContext({
    profile: {
      ...makeContext().profile,
      discipline: 32,
      positioning: 38,
      communication: 30,
      personality: {
        ...makeContext().profile.personality,
        tiltLevel: 70,
      },
    },
    self: {
      ...makeContext().self,
      danger: 78,
    },
    local: {
      ...makeContext().local,
      enemyNumbersAdvantage: 2,
    },
  }), selected)
  assert.ok(stable > tilted)
}

{
  const outcome = resolvePlayerExecution(makeContext(), selected)
  assert.equal(outcome.intendedMode, 'take_objective')
  assert.ok(outcome.successChance >= 18 && outcome.successChance <= 96)
  assert.ok(outcome.delaySeconds >= 0)
}

{
  const outcome = resolvePlayerExecution(makeContext({
    profile: {
      ...makeContext().profile,
      playerId: 'panic-player',
      discipline: 10,
      positioning: 10,
      communication: 10,
      personality: {
        ...makeContext().profile.personality,
        riskTolerance: 20,
        tiltLevel: 100,
      },
    },
    self: {
      ...makeContext().self,
      danger: 98,
    },
    local: {
      ...makeContext().local,
      enemyNumbersAdvantage: 3,
    },
  }), selected)
  assert.ok(outcome.failure === undefined || outcome.executedMode === 'retreat' || outcome.executedMode === selected.mode)
}

console.log('executionModel tests passed')
