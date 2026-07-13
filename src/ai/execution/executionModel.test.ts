import assert from 'node:assert/strict'
import {
  getCoordinationReliability,
  getExecutionDelay,
  getExecutionSuccessBreakdown,
  getExecutionSuccessChance,
  resolvePlayerExecution,
} from './executionModel.ts'
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
      mechanics: 74,
      laning: 70,
      mapAwareness: 72,
      teamfight: 76,
      positioning: 74,
      communication: 68,
      discipline: 78,
      clutch: 75,
      heroMastery: 80,
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
      economyNeed: 20,
      fatigue: 0,
      tilt: 0,
      pressure: 24,
      informationUncertainty: 20,
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
  assert.ok(outcome.successChance >= 14 && outcome.successChance <= 97)
}

{
  const laneAction: PlayerModeScore = { ...selected, mode: 'farm_lane', risk: 12, urgency: 45 }
  const fightAction: PlayerModeScore = { ...selected, mode: 'join_fight', risk: 54, urgency: 82 }
  const laner = {
    ...makeContext().profile,
    laning: 96,
    mechanics: 90,
    teamfight: 30,
    communication: 38,
  }
  const fighter = {
    ...makeContext().profile,
    laning: 34,
    mechanics: 68,
    teamfight: 96,
    communication: 92,
  }
  assert.ok(
    getExecutionSuccessChance(makeContext({ profile: laner }), laneAction) > getExecutionSuccessChance(makeContext({ profile: fighter }), laneAction),
    'laning and mechanics should matter more while farming a lane',
  )
  assert.ok(
    getExecutionSuccessChance(makeContext({ profile: fighter }), fightAction) > getExecutionSuccessChance(makeContext({ profile: laner }), fightAction),
    'teamfight and communication should matter more while joining a fight',
  )
}

{
  const composed = makeContext()
  const exhausted = makeContext({
    self: {
      ...makeContext().self,
      fatigue: 62,
      tilt: 74,
      pressure: 88,
      informationUncertainty: 76,
    },
  })
  const composedBreakdown = getExecutionSuccessBreakdown(composed, selected)
  const exhaustedBreakdown = getExecutionSuccessBreakdown(exhausted, selected)
  assert.ok(composedBreakdown.successChance > exhaustedBreakdown.successChance)
  assert.ok(getExecutionDelay(exhausted, selected, false) > getExecutionDelay(composed, selected, false))
  assert.ok(exhaustedBreakdown.fatiguePenalty > composedBreakdown.fatiguePenalty)
}

{
  const highClutch = makeContext({
    profile: { ...makeContext().profile, clutch: 96 },
    self: { ...makeContext().self, pressure: 92 },
  })
  const lowClutch = makeContext({
    profile: { ...makeContext().profile, clutch: 24 },
    self: { ...makeContext().self, pressure: 92 },
  })
  assert.ok(getExecutionSuccessChance(highClutch, selected) > getExecutionSuccessChance(lowClutch, selected))
}

{
  const reliable = { ...makeContext().profile, communication: 96, teamfight: 92, discipline: 94 }
  const unreliable = { ...makeContext().profile, communication: 22, teamfight: 35, discipline: 30 }
  assert.ok(getCoordinationReliability(reliable, 0, 0) > getCoordinationReliability(unreliable, 55, 70))
}

{
  const failures = Array.from({ length: 48 }, (_, index) => resolvePlayerExecution(makeContext({
    matchSeed: `human-failure-${index}`,
    profile: {
      ...makeContext().profile,
      mechanics: 22,
      mapAwareness: 25,
      teamfight: 28,
      positioning: 24,
      communication: 20,
      discipline: 20,
      clutch: 18,
      heroMastery: 25,
    },
    self: {
      ...makeContext().self,
      danger: 92,
      fatigue: 58,
      tilt: 72,
      pressure: 94,
      informationUncertainty: 80,
    },
  }), selected)).filter((outcome) => outcome.failure !== undefined)
  assert.ok(failures.length >= 30, 'a severely compromised player should fail consistently under pressure')
  assert.ok(failures.some((outcome) => outcome.failure === 'overcommit' || outcome.failure === 'bad_position' || outcome.failure === 'failed_aggro_drop'))
  assert.deepEqual(resolvePlayerExecution(makeContext(), selected), resolvePlayerExecution(makeContext(), selected), 'execution must remain deterministic')
}

console.log('executionModel tests passed')
