import assert from 'node:assert/strict'
import { DEFAULT_TEAM_AI_PROFILES } from '../config/aiConstants.ts'
import { analyzeGameState } from '../analysis/gameStateAnalyzer.ts'
import { generateTeamPlans, selectTeamPlan } from './teamBrain.ts'
import type { RawAiGameSnapshot } from '../types/aiTypes.ts'

function makeSnapshot(overrides: Partial<RawAiGameSnapshot> = {}): RawAiGameSnapshot {
  return {
    timeSeconds: 24 * 60,
    teams: {
      dawn: {
        teamId: 'dawn',
        netWorth: 12000,
        xp: 11000,
        aliveHeroes: 5,
        deadHeroes: 0,
        averageHealthPct: 0.82,
        averageManaPct: 0.75,
        pushPower: 62,
        bossDamage: 70,
        defensivePower: 48,
        safeFarm: 44,
        lanePressure: 58,
        structureAtRisk: 18,
        baseThreat: 0,
        visionControl: 72,
      },
      dusk: {
        teamId: 'dusk',
        netWorth: 10800,
        xp: 10300,
        aliveHeroes: 3,
        deadHeroes: 2,
        averageHealthPct: 0.56,
        averageManaPct: 0.48,
        pushPower: 35,
        bossDamage: 42,
        defensivePower: 54,
        safeFarm: 48,
        lanePressure: 30,
        structureAtRisk: 58,
        baseThreat: 12,
        visionControl: 34,
      },
    },
    objectives: {
      bossAvailable: true,
      bossId: 'boss-world-serpent',
      bossPosition: { x: 50, y: 50 },
      enemyBaseOpenByTeam: { dawn: false, dusk: false },
      highValueObjectiveAvailableByTeam: { dawn: true, dusk: false },
    },
    ...overrides,
  }
}

{
  const analyzed = analyzeGameState(makeSnapshot())
  const plan = selectTeamPlan({
    analyzed,
    teamId: 'dawn',
    teamProfile: DEFAULT_TEAM_AI_PROFILES.dawn,
  })

  assert.equal(plan?.type, 'take_boss')
}

{
  const analyzed = analyzeGameState(makeSnapshot({
    teams: {
      dawn: {
        ...makeSnapshot().teams.dawn,
        aliveHeroes: 3,
        deadHeroes: 2,
        averageHealthPct: 0.38,
        baseThreat: 90,
        pushPower: 18,
        bossDamage: 20,
      },
      dusk: {
        ...makeSnapshot().teams.dusk,
        aliveHeroes: 5,
        deadHeroes: 0,
        lanePressure: 78,
      },
    },
  }))
  const plan = selectTeamPlan({
    analyzed,
    teamId: 'dawn',
    teamProfile: DEFAULT_TEAM_AI_PROFILES.dawn,
  })

  assert.equal(plan?.type, 'defend_high_ground')
}

{
  const analyzed = analyzeGameState(makeSnapshot({
    timeSeconds: 34 * 60,
    objectives: {
      ...makeSnapshot().objectives,
      bossAvailable: false,
      enemyBaseOpenByTeam: { dawn: true, dusk: false },
    },
  }))
  const plan = selectTeamPlan({
    analyzed,
    teamId: 'dawn',
    teamProfile: DEFAULT_TEAM_AI_PROFILES.dawn,
  })

  assert.equal(plan?.type, 'end_game')
}

{
  const analyzed = analyzeGameState(makeSnapshot({
    timeSeconds: 38 * 60,
    teams: {
      dawn: {
        ...makeSnapshot().teams.dawn,
        aliveHeroes: 4,
        deadHeroes: 1,
        averageHealthPct: 0.55,
        averageManaPct: 0.6,
        pushPower: 70,
        defensivePower: 58,
        safeFarm: 20,
        lanePressure: 70,
        structureAtRisk: 80,
        baseThreat: 95,
        visionControl: 48,
      },
      dusk: {
        ...makeSnapshot().teams.dusk,
        aliveHeroes: 5,
        deadHeroes: 0,
        lanePressure: 82,
        structureAtRisk: 20,
      },
    },
    objectives: {
      ...makeSnapshot().objectives,
      bossAvailable: false,
      enemyBaseOpenByTeam: { dawn: true, dusk: false },
    },
  }))
  const plan = selectTeamPlan({
    analyzed,
    teamId: 'dawn',
    teamProfile: DEFAULT_TEAM_AI_PROFILES.dawn,
  })

  assert.equal(plan?.type, 'defend_high_ground')
}

{
  const analyzed = analyzeGameState(makeSnapshot({
    timeSeconds: 4 * 60,
    teams: {
      dawn: {
        ...makeSnapshot().teams.dawn,
        aliveHeroes: 5,
        deadHeroes: 0,
        safeFarm: 72,
        lanePressure: 42,
      },
      dusk: {
        ...makeSnapshot().teams.dusk,
        aliveHeroes: 5,
        deadHeroes: 0,
      },
    },
    objectives: {
      ...makeSnapshot().objectives,
      highValueObjectiveAvailableByTeam: { dawn: false, dusk: false },
    },
  }))
  const plans = generateTeamPlans({
    analyzed,
    teamId: 'dawn',
    teamProfile: DEFAULT_TEAM_AI_PROFILES.dawn,
  })
  const farm = plans.find((plan) => plan.type === 'farm_map')
  const push = plans.find((plan) => plan.type === 'group_push')

  assert.ok(farm && push)
  assert.ok(farm.expectedValue > push.expectedValue, 'laning should favor farming over immediate group push')
}

{
  const analyzed = analyzeGameState(makeSnapshot({
    timeSeconds: 6 * 60,
    teams: {
      dawn: {
        ...makeSnapshot().teams.dawn,
        aliveHeroes: 5,
        deadHeroes: 0,
        safeFarm: 70,
      },
      dusk: {
        ...makeSnapshot().teams.dusk,
        aliveHeroes: 3,
        deadHeroes: 2,
      },
    },
    objectives: {
      ...makeSnapshot().objectives,
      bossAvailable: false,
      highValueObjectiveAvailableByTeam: { dawn: false, dusk: false },
    },
  }))
  const plan = selectTeamPlan({
    analyzed,
    teamId: 'dawn',
    teamProfile: DEFAULT_TEAM_AI_PROFILES.dawn,
  })

  assert.notEqual(plan?.type, 'group_push', 'an early power play should not force a five-player push')
}

{
  const analyzed = analyzeGameState(makeSnapshot({
    teams: {
      dawn: {
        ...makeSnapshot().teams.dawn,
        netWorth: 16000,
        aliveHeroes: 5,
        deadHeroes: 0,
        pushPower: 68,
        lanePressure: 70,
      },
      dusk: {
        ...makeSnapshot().teams.dusk,
        netWorth: 10000,
        aliveHeroes: 5,
        deadHeroes: 0,
      },
    },
    objectives: {
      ...makeSnapshot().objectives,
      bossAvailable: false,
      highValueObjectiveAvailableByTeam: { dawn: true, dusk: false },
    },
  }))
  const plan = selectTeamPlan({
    analyzed,
    teamId: 'dawn',
    teamProfile: DEFAULT_TEAM_AI_PROFILES.dawn,
  })

  assert.equal(plan?.type, 'group_push')
  assert.ok((plan?.urgency ?? 0) >= 70, 'large net worth lead should create objective urgency')
}

{
  const analyzed = analyzeGameState(makeSnapshot({
    timeSeconds: 20 * 60,
    objectives: {
      ...makeSnapshot().objectives,
      bossAvailable: false,
      highValueObjectiveAvailableByTeam: { dawn: true, dusk: false },
    },
  }))
  const plan = selectTeamPlan({
    analyzed,
    teamId: 'dawn',
    teamProfile: DEFAULT_TEAM_AI_PROFILES.dawn,
  })

  assert.equal(plan?.type, 'group_push')
  assert.ok(plan?.reasonTags.includes('forced_power_play'), 'numbers advantage should force map objective')
}

console.log('teamBrain tests passed')
