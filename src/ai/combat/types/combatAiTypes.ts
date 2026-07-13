export type CombatTeamId = 'dawn' | 'dusk'
export type CombatLaneId = 'top' | 'mid' | 'bot'

export type CombatEncounterType =
  | 'lane_trade'
  | 'lane_all_in'
  | 'tower_dive'
  | 'counter_dive'
  | 'river_skirmish'
  | 'rune_skirmish'
  | 'jungle_skirmish'
  | 'camp_contest'
  | 'objective_skirmish'
  | 'full_teamfight'
  | 'high_ground_fight'
  | 'base_defense'
  | 'chase'
  | 'disengage'

export type CombatPhase =
  | 'pre_contact'
  | 'poke'
  | 'opening'
  | 'commit'
  | 'sustain'
  | 'collapse'
  | 'chase'
  | 'disengage'
  | 'reset'

export type CombatPoint = { x: number; y: number }

export interface CombatHeroSnapshot {
  id: string
  team: CombatTeamId
  lane: CombatLaneId
  pos: CombatPoint
  alive: boolean
  healthPct: number
  manaPct: number
  level: number
  attackRange: number
  currentMode?: string
}

export interface CombatMapObjectSnapshot {
  id: string
  kind: 'tower' | 'base' | 'camp' | 'boss' | 'rune'
  pos: CombatPoint
  active: boolean
  team?: CombatTeamId
  range?: number
}

export interface CombatDetectionInput {
  matchSeed: string
  gameTime: number
  heroes: CombatHeroSnapshot[]
  mapObjects: CombatMapObjectSnapshot[]
}

export interface CombatEncounterSnapshot {
  candidateId: string
  encounterType: CombatEncounterType
  center: CombatPoint
  radius: number
  heroIds: string[]
  teamHeroIds: Record<CombatTeamId, string[]>
  averageHealthPct: Record<CombatTeamId, number>
  closestEnemyDistance: number
  reasonTags: string[]
}

export interface CombatTargetScoreInput {
  targetId: string
  strategicValue: number
  currentThreat: number
  killProbability: number
  accessibility: number
  allyFollowUp: number
  positioningError: number
  cooldownPunishValue: number
  interruptValue: number
  objectiveConversionValue: number
  defensiveResources: number
  enemySaveCoverage: number
  overextensionRisk: number
  baitRisk: number
  expectedOverkill: number
  targetSwitchCost: number
  dangerScore: number
  towerExposure: number
  reasons: string[]
}

export interface CombatTargetScoreBreakdown extends CombatTargetScoreInput {
  finalScore: number
}

export interface CombatBlackboard {
  encounterId: string
  teamId: CombatTeamId
  encounterType: CombatEncounterType
  phase: CombatPhase
  startedAt: number
  phaseStartedAt: number
  lastUpdatedAt: number
  expiresAt: number
  center: CombatPoint
  radius: number
  alliedHeroIds: string[]
  enemyHeroIds: string[]
  primaryTargetId?: string
  secondaryTargetId?: string
  primaryTargetScore?: number
  primaryTargetDanger?: number
  targetFocusConfidence: number
  targetReasons: string[]
  protectedAllyId?: string
  closestEnemyDistance: number
  alliedAverageHealthPct: number
  enemyAverageHealthPct: number
  reasonTags: string[]
}

export type CombatBlackboardState = Record<CombatTeamId, CombatBlackboard[]>

export interface CombatBlackboardUpdateInput {
  gameTime: number
  previous: CombatBlackboardState
  encounters: CombatEncounterSnapshot[]
}
