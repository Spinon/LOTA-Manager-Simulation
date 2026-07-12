export type AiTeamId = string

export type TeamPlanType =
  | 'farm_map'
  | 'group_push'
  | 'defend_tower'
  | 'take_boss'
  | 'pickoff'
  | 'avoid_fight'
  | 'defend_high_ground'
  | 'end_game'

export type TeamStyle =
  | 'balanced'
  | 'aggressive'
  | 'methodical'
  | 'greedy'
  | 'pickoff'
  | 'teamfight'
  | 'split_push'
  | 'objective_focused'
  | 'defensive'
  | 'chaotic'

export type PlayerRole =
  | 'safe_lane'
  | 'mid'
  | 'offlane'
  | 'greedy_support'
  | 'dedicated_support'

export type PlayerModeType =
  | 'retreat'
  | 'farm_lane'
  | 'farm_jungle'
  | 'join_fight'
  | 'save_ally'
  | 'finish_enemy'
  | 'take_objective'
  | 'push_lane'

export type AiMemoryEventType =
  | 'hero_death'
  | 'failed_gank'
  | 'lost_objective'
  | 'won_fight'
  | 'lost_fight'

export interface AiMemoryEvent {
  id: string
  type: AiMemoryEventType
  teamId: AiTeamId
  gameTime: number
  position: { x: number; y: number }
  value: number
  expiresAtGameTime: number
  tags: string[]
}

export interface TeamPlan {
  type: TeamPlanType
  targetId?: string
  targetPosition?: { x: number; y: number }
  urgency: number
  risk: number
  expectedValue: number
  decisionChance?: number
  reasonTags: string[]
}

export interface TeamAiProfile {
  teamId: AiTeamId
  style: TeamStyle
  aggression: number
  discipline: number
  greed: number
  objectiveFocus: number
  coordination: number
  tempoAwareness: number
  comebackPatience: number
  highGroundDiscipline: number
  bossPriority: number
  preferredPlans: TeamPlanType[]
}

export interface PlayerAiProfile {
  playerId: string
  role: PlayerRole
  farmPriority: number
  farmingEfficiency: number
  gpmDecisionBias: number
  teamfight: number
  positioning: number
  communication: number
  discipline: number
  aggression: number
  personality: {
    riskTolerance: number
    greed: number
    obedienceToCalls: number
    playmakingBias: number
    saveAllyBias: number
    farmBias: number
    objectiveBias: number
    tiltLevel: number
  }
}

export interface PlayerModeScore {
  mode: PlayerModeType
  score: number
  urgency: number
  risk: number
  reasonTags: string[]
}

export type ExecutionFailureType =
  | 'overcommit'
  | 'panic_retreat'
  | 'wrong_target'
  | 'late_reaction'

export interface ExecutionOutcome {
  intendedMode: PlayerModeType
  executedMode: PlayerModeType
  successChance: number
  failure?: ExecutionFailureType
  delaySeconds: number
  reasonTags: string[]
}

export interface PlayerContext {
  gameTime: AnalyzedGameState['gameTime']
  matchSeed: string
  teamPlan?: TeamPlan
  team: AnalyzedTeamState
  profile: PlayerAiProfile
  self: {
    healthPct: number
    manaPct: number
    currentMode?: PlayerModeType
    danger: number
    itemTimingUrgency: number
    developmentNeed: number
  }
  local: {
    enemyNumbersAdvantage: number
    allySaveNeed: number
    nearbyFightValue: number
    finishEnemyValue: number
    objectivePressure: number
  }
  map: {
    safeLaneFarmValue: number
    jungleFarmValue: number
    lanePushValue: number
    laneFarmGpm: number
    jungleFarmGpm: number
    lanePushGpm: number
    gankRisk: number
  }
}

export interface RawTeamSnapshot {
  teamId: AiTeamId
  netWorth: number
  xp: number
  aliveHeroes: number
  deadHeroes: number
  averageHealthPct: number
  averageManaPct: number
  pushPower: number
  bossDamage: number
  defensivePower: number
  safeFarm: number
  lanePressure: number
  structureAtRisk: number
  baseThreat: number
  visionControl: number
}

export interface RawObjectiveSnapshot {
  bossAvailable: boolean
  bossBuffActiveByTeam?: Record<AiTeamId, boolean>
  bossId?: string
  bossPosition?: { x: number; y: number }
  enemyBaseOpenByTeam: Record<AiTeamId, boolean>
  highValueObjectiveAvailableByTeam: Record<AiTeamId, boolean>
}

export interface RawAiGameSnapshot {
  timeSeconds: number
  teams: Record<AiTeamId, RawTeamSnapshot>
  objectives: RawObjectiveSnapshot
}

export interface AnalyzedTeamState extends RawTeamSnapshot {
  netWorthLead: number
  numbersAdvantage: number
  fightReadiness: number
  lowResourcePressure: number
  throwRisk: number
}

export interface AnalyzedGameState {
  gameTime: {
    seconds: number
    minutes: number
    phase: 'laning' | 'early_mid' | 'mid_game' | 'late_game' | 'ultra_late'
  }
  teams: Record<AiTeamId, AnalyzedTeamState>
  objectives: RawObjectiveSnapshot
}

export interface TeamBrainInput {
  analyzed: AnalyzedGameState
  teamId: AiTeamId
  teamProfile: TeamAiProfile
  previousPlan?: TeamPlan
}
