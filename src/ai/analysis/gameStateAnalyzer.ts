import type { AnalyzedGameState, AnalyzedTeamState, RawAiGameSnapshot, RawTeamSnapshot } from '../types/aiTypes.ts'

export function analyzeGameState(snapshot: RawAiGameSnapshot): AnalyzedGameState {
  const teamIds = Object.keys(snapshot.teams)
  const analyzedTeams = Object.fromEntries(teamIds.map((teamId) => {
    const team = snapshot.teams[teamId]
    const opponents = teamIds
      .filter((candidateId) => candidateId !== teamId)
      .map((candidateId) => snapshot.teams[candidateId])
    const primaryOpponent = opponents[0]

    return [teamId, analyzeTeam(team, primaryOpponent)]
  }))

  return {
    gameTime: {
      seconds: snapshot.timeSeconds,
      minutes: snapshot.timeSeconds / 60,
      phase: getAnalyzedPhase(snapshot.timeSeconds),
    },
    teams: analyzedTeams,
    objectives: snapshot.objectives,
  }
}

function analyzeTeam(team: RawTeamSnapshot, opponent?: RawTeamSnapshot): AnalyzedTeamState {
  const netWorthLead = opponent ? team.netWorth - opponent.netWorth : 0
  const numbersAdvantage = opponent ? team.aliveHeroes - opponent.aliveHeroes : team.aliveHeroes
  const fightReadiness = clamp(
    team.averageHealthPct * 45 +
      team.averageManaPct * 18 +
      team.aliveHeroes * 7 +
      Math.max(0, numbersAdvantage) * 9 +
      Math.max(0, netWorthLead / 800),
    0,
    100,
  )
  const lowResourcePressure = clamp((1 - team.averageHealthPct) * 65 + (1 - team.averageManaPct) * 22 + team.deadHeroes * 10, 0, 100)
  const throwRisk = clamp(
    Math.max(0, netWorthLead / 650) +
      team.deadHeroes * 9 +
      (1 - team.averageHealthPct) * 35 +
      team.baseThreat * 0.25,
    0,
    100,
  )

  return {
    ...team,
    netWorthLead,
    numbersAdvantage,
    fightReadiness,
    lowResourcePressure,
    throwRisk,
  }
}

function getAnalyzedPhase(timeSeconds: number): AnalyzedGameState['gameTime']['phase'] {
  const minutes = timeSeconds / 60
  if (minutes < 8) return 'laning'
  if (minutes < 16) return 'early_mid'
  if (minutes < 28) return 'mid_game'
  if (minutes < 45) return 'late_game'
  return 'ultra_late'
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}
