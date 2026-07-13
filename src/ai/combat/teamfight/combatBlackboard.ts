import { COMBAT_AI_RULES } from '../config/combatAiConstants.ts'
import { pointDistance } from '../analysis/combatContextAnalyzer.ts'
import type {
  CombatBlackboard,
  CombatBlackboardState,
  CombatBlackboardUpdateInput,
  CombatEncounterSnapshot,
  CombatPhase,
  CombatTeamId,
} from '../types/combatAiTypes.ts'

const teams: CombatTeamId[] = ['dawn', 'dusk']

export function createEmptyCombatBlackboards(): CombatBlackboardState {
  return { dawn: [], dusk: [] }
}

export function updateCombatBlackboards(input: CombatBlackboardUpdateInput): CombatBlackboardState {
  return {
    dawn: updateTeamBlackboards(input, 'dawn'),
    dusk: updateTeamBlackboards(input, 'dusk'),
  }
}

function updateTeamBlackboards(input: CombatBlackboardUpdateInput, team: CombatTeamId) {
  const previous = input.previous[team] ?? []
  const matchedIds = new Set<string>()
  const active = input.encounters.map((encounter) => {
    const match = findBestMatch(previous, encounter, matchedIds)
    if (match) matchedIds.add(match.encounterId)
    return buildBlackboard(input.gameTime, team, encounter, match)
  })
  const disengaging = previous
    .filter((board) => !matchedIds.has(board.encounterId))
    .map((board) => transitionMissingBoard(board, input.gameTime))
    .filter((board) => board.expiresAt > input.gameTime)

  return [...active, ...disengaging]
    .sort((a, b) => b.lastUpdatedAt - a.lastUpdatedAt || a.encounterId.localeCompare(b.encounterId))
    .slice(0, COMBAT_AI_RULES.maxActiveEncountersPerTeam)
}

function findBestMatch(previous: CombatBlackboard[], encounter: CombatEncounterSnapshot, matchedIds: Set<string>) {
  return previous
    .filter((board) => !matchedIds.has(board.encounterId) && board.phase !== 'reset')
    .map((board) => ({
      board,
      participantScore: participantSimilarity([...board.alliedHeroIds, ...board.enemyHeroIds], encounter.heroIds),
      centerDistance: pointDistance(board.center, encounter.center),
    }))
    .filter(({ participantScore, centerDistance }) => (
      participantScore >= COMBAT_AI_RULES.detection.participantMatchThreshold ||
      centerDistance <= COMBAT_AI_RULES.detection.matchCenterRange
    ))
    .sort((a, b) => b.participantScore - a.participantScore || a.centerDistance - b.centerDistance)[0]?.board
}

function buildBlackboard(
  time: number,
  team: CombatTeamId,
  encounter: CombatEncounterSnapshot,
  previous?: CombatBlackboard,
): CombatBlackboard {
  const enemyTeam = teams.find((candidate) => candidate !== team)!
  const phase = selectCombatPhase(time, team, encounter, previous)
  const phaseChanged = previous?.phase !== phase

  return {
    encounterId: previous?.encounterId ?? encounter.candidateId,
    teamId: team,
    encounterType: encounter.encounterType,
    phase,
    startedAt: previous?.startedAt ?? time,
    phaseStartedAt: phaseChanged ? time : previous?.phaseStartedAt ?? time,
    lastUpdatedAt: time,
    expiresAt: time + COMBAT_AI_RULES.phases.resetRetentionSeconds,
    center: { ...encounter.center },
    radius: encounter.radius,
    alliedHeroIds: [...encounter.teamHeroIds[team]],
    enemyHeroIds: [...encounter.teamHeroIds[enemyTeam]],
    primaryTargetId: previous?.primaryTargetId,
    secondaryTargetId: previous?.secondaryTargetId,
    primaryTargetScore: previous?.primaryTargetScore,
    primaryTargetDanger: previous?.primaryTargetDanger,
    targetFocusConfidence: previous?.targetFocusConfidence ?? 0,
    targetReasons: [...(previous?.targetReasons ?? [])],
    protectedAllyId: previous?.protectedAllyId,
    closestEnemyDistance: encounter.closestEnemyDistance,
    alliedAverageHealthPct: encounter.averageHealthPct[team],
    enemyAverageHealthPct: encounter.averageHealthPct[enemyTeam],
    reasonTags: [...encounter.reasonTags, phase],
  }
}

function selectCombatPhase(
  time: number,
  team: CombatTeamId,
  encounter: CombatEncounterSnapshot,
  previous?: CombatBlackboard,
): CombatPhase {
  const enemyTeam: CombatTeamId = team === 'dawn' ? 'dusk' : 'dawn'
  const alliedHealth = encounter.averageHealthPct[team]
  const enemyHealth = encounter.averageHealthPct[enemyTeam]
  if (alliedHealth <= COMBAT_AI_RULES.phases.disengageHealthThreshold && enemyHealth > alliedHealth + 0.12) return 'disengage'
  if (enemyHealth <= COMBAT_AI_RULES.phases.chaseHealthThreshold && alliedHealth > enemyHealth + 0.12) return 'chase'
  if (!previous || previous.phase === 'reset' || previous.phase === 'disengage') {
    return encounter.closestEnemyDistance <= COMBAT_AI_RULES.phases.openingDistance ? 'opening' : 'pre_contact'
  }
  if (previous.phase === 'pre_contact' || previous.phase === 'poke') {
    return encounter.closestEnemyDistance <= COMBAT_AI_RULES.phases.openingDistance ? 'opening' : previous.phase
  }
  if (previous.phase === 'opening' && time - previous.phaseStartedAt >= COMBAT_AI_RULES.phases.openingSeconds) return 'commit'
  if (previous.phase === 'commit' && time - previous.phaseStartedAt >= COMBAT_AI_RULES.phases.commitSeconds) return 'sustain'
  return previous.phase
}

function transitionMissingBoard(board: CombatBlackboard, time: number): CombatBlackboard {
  if (board.phase === 'disengage' || board.phase === 'reset') {
    return time >= board.expiresAt ? { ...board, phase: 'reset' } : board
  }
  return {
    ...board,
    encounterType: 'disengage',
    phase: 'disengage',
    phaseStartedAt: time,
    lastUpdatedAt: time,
    expiresAt: time + COMBAT_AI_RULES.phases.resetRetentionSeconds,
    reasonTags: [...board.reasonTags.filter((tag) => tag !== 'disengage'), 'contact_lost', 'disengage'],
  }
}

function participantSimilarity(left: string[], right: string[]) {
  const leftSet = new Set(left)
  const rightSet = new Set(right)
  const union = new Set([...leftSet, ...rightSet])
  if (union.size === 0) return 0
  let intersection = 0
  leftSet.forEach((id) => {
    if (rightSet.has(id)) intersection += 1
  })
  return intersection / union.size
}
