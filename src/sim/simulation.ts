import type { ItemSeed } from '../data/itemSeeds.ts'
import { analyzeGameState } from '../ai/analysis/gameStateAnalyzer.ts'
import { DEFAULT_TEAM_AI_PROFILES } from '../ai/config/aiConstants.ts'
import { getCoordinationReliability, resolvePlayerExecution } from '../ai/execution/executionModel.ts'
import { addAiMemoryEvent, areaDangerFromMemory, pruneAiMemory } from '../ai/memory/memorySystem.ts'
import { selectPlayerMode } from '../ai/player/playerAgent.ts'
import { selectTeamPlan } from '../ai/team/teamBrain.ts'
import type { AiMemoryEvent, AnalyzedGameState, ExecutionFailureType, PlayerModeType, RawAiGameSnapshot, TeamPlan } from '../ai/types/aiTypes.ts'
import { detectCombatEncounters } from '../ai/combat/analysis/combatContextAnalyzer.ts'
import { scoreCombatTarget, selectCombatFocus } from '../ai/combat/analysis/targetPriorityAnalyzer.ts'
import { COMBAT_AI_RULES } from '../ai/combat/config/combatAiConstants.ts'
import {
  assignDynamicCombatRoles,
  canReserveControl,
  canReserveDamage,
  canReserveSave,
  createCombatFormationPlan,
} from '../ai/combat/coordination/combatCoordination.ts'
import { analyzeCombatScenario, getTeamEncounterType } from '../ai/combat/scenarios/combatScenarioAnalyzer.ts'
import { createEmptyCombatBlackboards, updateCombatBlackboards } from '../ai/combat/teamfight/combatBlackboard.ts'
import type { CombatBlackboard, CombatBlackboardState, CombatChaseStopReason, CombatControlType, CombatDetectionInput } from '../ai/combat/types/combatAiTypes.ts'
import { resolveDamage, type CombatDamageType } from '../game-systems/combatFormulas.ts'
import { applyBarrier, applyFlatAndPercentModifiers, canDispelEffect, finalDebuffDuration, finalSlowValue, type DispelPower, type DispelType } from '../game-systems/effectFormulas.ts'
import { calculateHeroStats, type AttackType, type HeroDefinition, type HeroRole, type HeroSkillDefinition, type PrimaryAttribute, type StatModifier } from '../game-systems/heroAttributes.ts'
import { laneWinChance } from '../game-systems/laneControlFormulas.ts'
import {
  NON_COMBAT_RULES,
  assistGoldPerHero,
  bountyRuneGold,
  comebackKillGoldBonus,
  deathGoldLoss,
  getLevelFromXp,
  getLevelProgress,
  healingLotusValue,
  expectedTimeToItemSeconds,
  killGold,
  killXp,
  passiveGoldForTick,
  resourceRegenForTick,
  respawnDurationSeconds,
  scaledExperienceReward,
  stackSuccessChance,
  stackedCampValue,
  wisdomRuneXp,
} from '../game-systems/nonCombatFormulas.ts'
import { expectedTimeToKillStructure, isBackdoorProtected, structureDamageTaken } from '../game-systems/structureFormulas.ts'
import { getPrimarySkillUsageSituation, getSkillAiUsageScore, getSkillEffectProfile, hasSkillTag, isConfirmedGlobalSkill, type SkillSummonArchetype, type SkillSummonMode } from '../game-systems/skillRuntime.ts'
import {
  abilityUpgradeItemIds,
  getContextualSkillIds,
  getContextualSkillLevel,
  getGrantedSkillLevel,
  getPreferredTwinBladeStance,
  getRingmasterSouvenirCharges,
  hasAutomaticContextualSkillSelection,
  getRuntimeHeroSkills,
  getSkillRuntimeUnlockRule,
  getTwinBladePairedAbilityId,
  getTwinBladeStance,
  parentSkillStateKey,
  ringmasterSouvenirAbilityIds,
  ringmasterSouvenirStateKey,
  twinBladeStanceStateKey,
  type AbilityUpgradeSlot,
  type RuntimeParentSkillState,
} from '../game-systems/skillUnlocks.ts'
import {
  getLaneCreepReward,
  getLaneCreepStats,
  getLaneCreepWaveKinds,
  getNeutralCampReward,
  getNeutralCampStats,
  getSummonUnitRuntimeSeed,
  getStructureStatsByRole,
  type LaneCreepKind,
} from '../game-systems/unitSeedsAdapter.ts'
import { currentVision, isDay, worldVisionToMapRadius } from '../game-systems/visionFormulas.ts'
import {
  rebaseCreepMotionPlan,
  scheduleCreepMotionPlan,
  sampleCreepMotionPlan,
  type CreepMotionPlan,
} from './creepMotionPlans.ts'
import {
  appendCreepComponents,
  cloneCreepsIntoComponentStore,
  createCreepComponentStore,
  getCreepComponentSlot,
  getCreepUpdateDraft,
  replaceCreepComponentFacade,
  syncCreepAttackSchedule,
  syncCreepPositionComponents,
  type CreepComponentStore,
  type CreepStorageMode,
} from './creepComponents.ts'
import {
  createPersistentSpatialGrid,
  queryPersistentSpatialGridIdsInto,
  queryPersistentSpatialGridInto,
  syncPersistentSpatialGrid,
  type PersistentSpatialGrid,
} from './persistentSpatialGrid.ts'
import {
  rebaseArcaneTravelPlan,
  sampleArcaneTravelPlan,
  scheduleArcaneTravelPlan,
  type ArcaneTravelKind,
  type ArcaneTravelPlan,
} from './arcaneTravelPlans.ts'

export type TeamId = 'dawn' | 'dusk'
export type TeamMatchOutcome = 'winner' | 'loser' | 'draw'
export type LaneId = 'top' | 'mid' | 'bot'
export type EntityKind = 'arcane' | 'creep' | 'summon' | 'tower' | 'structure' | 'base' | 'camp' | 'boss' | 'rune'
export type GamePhase = 'early' | 'mid' | 'late'
export type DayCycle = 'day' | 'night'
export type CampStrength = 'weak' | 'medium' | 'strong'
export type ArcaneCombatTargetIntent = 'last_hit' | 'deny' | 'focus' | 'objective' | 'camp' | 'boss' | 'fallback'
export type RuneKind = 'bounty' | 'power' | 'wisdom' | 'lotus'
export type PowerRuneKind = 'haste' | 'arcane' | 'shield' | 'damage'
export type StructureKind = 'barracks_melee' | 'barracks_ranged' | 'tower_tier_4'
export type TeamObjectiveKind = 'tower' | 'structure' | 'base' | 'boss' | 'pickoff'
export type DecisionStatus = 'sharp' | 'steady' | 'hesitant' | 'tilted'
export type CreepMotionMode = 'fixed' | 'planned'
export type CreepSpatialMode = 'rebuild' | 'persistent'
export type ArcaneTravelMode = 'fixed' | 'planned'
export type SimulationOptions = {
  creepMotionMode?: CreepMotionMode
  creepSpatialMode?: CreepSpatialMode
  creepStorageMode?: CreepStorageMode
  arcaneTravelMode?: ArcaneTravelMode
}
export type ArcaneTravelDiagnostics = {
  candidates: number
  plansStarted: number
  sleepingSkips: number
  materializations: number
  tacticalActivations: number
  cancelledByDamage: number
  cancelledByControl: number
  cancelledByDecision: number
  cancelledByCall: number
  rejectedAtBase: number
  rejectedKind: number
  rejectedDeadline: number
  rejectedDistance: number
  rejectedThreat: number
  kinematicUpdates: number
  fullUpdates: number
}
export type AnalyzedGameStateCacheDiagnostics = {
  objectHits: number
  dependencyHits: number
  misses: number
}
export type CreepMotionDiagnostics = {
  candidates: number
  movementUpdates: number
  sleepingSkips: number
  materializations: number
  activationScans: number
  tacticalActivations: number
}
export type Selected = { kind: EntityKind; id: string } | undefined

let activeCreepMotionDiagnostics: CreepMotionDiagnostics | undefined
let activeArcaneTravelDiagnostics: ArcaneTravelDiagnostics | undefined
let activeAnalyzedGameStateCacheDiagnostics: AnalyzedGameStateCacheDiagnostics | undefined

export function beginAnalyzedGameStateCacheDiagnostics() {
  activeAnalyzedGameStateCacheDiagnostics = {
    objectHits: 0,
    dependencyHits: 0,
    misses: 0,
  }
}

export function endAnalyzedGameStateCacheDiagnostics() {
  const diagnostics = activeAnalyzedGameStateCacheDiagnostics
    ? { ...activeAnalyzedGameStateCacheDiagnostics }
    : undefined
  activeAnalyzedGameStateCacheDiagnostics = undefined
  return diagnostics
}

export function beginCreepMotionDiagnostics() {
  activeCreepMotionDiagnostics = {
    candidates: 0,
    movementUpdates: 0,
    sleepingSkips: 0,
    materializations: 0,
    activationScans: 0,
    tacticalActivations: 0,
  }
}

export function readCreepMotionDiagnostics(): CreepMotionDiagnostics | undefined {
  return activeCreepMotionDiagnostics ? { ...activeCreepMotionDiagnostics } : undefined
}

export function endCreepMotionDiagnostics() {
  const diagnostics = readCreepMotionDiagnostics()
  activeCreepMotionDiagnostics = undefined
  return diagnostics
}

export function beginArcaneTravelDiagnostics() {
  activeArcaneTravelDiagnostics = {
    candidates: 0,
    plansStarted: 0,
    sleepingSkips: 0,
    materializations: 0,
    tacticalActivations: 0,
    cancelledByDamage: 0,
    cancelledByControl: 0,
    cancelledByDecision: 0,
    cancelledByCall: 0,
    rejectedAtBase: 0,
    rejectedKind: 0,
    rejectedDeadline: 0,
    rejectedDistance: 0,
    rejectedThreat: 0,
    kinematicUpdates: 0,
    fullUpdates: 0,
  }
}

export function endArcaneTravelDiagnostics() {
  const diagnostics = activeArcaneTravelDiagnostics ? { ...activeArcaneTravelDiagnostics } : undefined
  activeArcaneTravelDiagnostics = undefined
  return diagnostics
}

export type Point = { x: number; y: number }
export type Stats = {
  maxHp: number
  hp: number
  maxMana: number
  mana: number
  damage: number
  damageMin: number
  damageMax: number
  range: number
  attackType: AttackType
  // Seconds between basic attacks, derived from imported attack speed and BAT.
  attackSpeed: number
  armor: number
  magicResistance: number
  statusResistance: number
  slowResistance: number
  moveSpeed: number
  level: number
  xp: number
  gold: number
}
export type SkillLevels = Partial<Record<HeroSkillDefinition['key'], number>>
export type ChannelingKind = 'teleport' | 'skill' | 'item' | 'objective'
export type ChannelingAction = {
  kind: ChannelingKind
  target: Point
  startedAt: number
  completesAt: number
  label: string
  effectLabel: string
  skillId?: string
  skillLevel?: number
  targetId?: string
}
export type RecentTeleport = {
  team: TeamId
  pos: Point
  startedAt: number
}
export type Arcane = {
  id: string
  team: TeamId
  player: string
  name: string
  heroDefinitionId: string
  role: string
  lane: LaneId
  portrait: string
  pos: Point
  target: Point
  movementDestination?: Point
  pathIndex: number
  respawn: number
  lastAttack: number
  nextCombatEvaluationAt: number
  combatTargetId?: string
  combatTargetIntent?: ArcaneCombatTargetIntent
  lastHitBy?: CombatSource
  aggression: number
  visionRange: number
  shotcalling: number
  macroDecision: string
  microDecision: string
  aiMode: PlayerModeType
  aiReason: string
  aiExecutionChance: number
  aiExecutionDelay: number
  aiFailure?: ExecutionFailureType
  decisionStatus: DecisionStatus
  decisionTempo: number
  nextDecisionAt: number
  lastDecisionAt: number
  forceDecision: boolean
  lastDecisionHpRatio: number
  lastDecisionManaRatio: number
  lastDecisionPos: Point
  decision: string
  items: string[]
  itemCooldowns: Record<string, number>
  skillStates: Record<string, RuntimeParentSkillState>
  tpScrolls: number
  tpCooldownUntil: number
  channeling?: ChannelingAction
  travelPlan?: ArcaneTravelPlan
  skillLevels: SkillLevels
  unspentSkillPoints: number
  statBonusLevels: number
  earnedGold: number
  kills: number
  deaths: number
  assists: number
  damageDealt: number
  heroDamageDealt: number
  structureDamageDealt: number
  damageTaken: number
  healingDone: number
  healingReceived: number
  laneCreepKills: number
  denies: number
  neutralKills: number
  objectiveKills: number
  stats: Stats
}
export type Creep = {
  id: string
  team: TeamId
  lane: LaneId
  type: LaneCreepKind
  seedId: string
  pos: Point
  pathIndex: number
  hp: number
  maxHp: number
  damage: number
  range: number
  visionRange: number
  goldReward: number
  xpReward: number
  lastAttack: number
  routeTargetId?: string
  nextRouteTargetEvaluationAt?: number
  lastHitBy?: CombatSource
  aggroTargetId?: string
  aggroUntil?: number
  pullCampId?: string
  pullUntil?: number
  motionPlan?: CreepMotionPlan
}
export type SummonVariant = 'tombstone_zombie' | 'eidolon_split_child'
export type SummonedUnit = {
  id: string
  ownerId: string
  sourceSkillId: string
  name: string
  archetype: SkillSummonArchetype
  team: TeamId
  pos: Point
  hp: number
  maxHp: number
  damage: number
  range: number
  visionRange: number
  moveSpeed: number
  attackInterval: number
  lastAttack: number
  spawnedAt: number
  expiresAt: number
  goldReward: number
  xpReward: number
  canMove: boolean
  canAttack: boolean
  damageTakenMultiplier: number
  healingAuraPct: number
  channelBound: boolean
  variant?: SummonVariant
  unitSeedId?: string
  nextAbilityAt?: number
  recallStartedAt?: number
  abilityCounter?: number
  sharedBuffUntil?: number
  cloakLayers?: number
  cloakNextRecoveryAt?: number
  targetId?: string
  lastHitBy?: CombatSource
}
export type Tower = {
  id: string
  team: TeamId
  lane: LaneId
  tier: 1 | 2 | 3
  pos: Point
  hp: number
  maxHp: number
  damage: number
  range: number
  lastAttack: number
  aggroTargetId?: string
  aggroUntil?: number
}
export type Structure = {
  id: string
  team: TeamId
  kind: StructureKind
  lane?: LaneId
  side?: 'left' | 'right'
  pos: Point
  hp: number
  maxHp: number
  damage: number
  range: number
  lastAttack: number
  aggroTargetId?: string
  aggroUntil?: number
}
export type Base = {
  id: string
  team: TeamId
  pos: Point
  hp: number
  maxHp: number
}
export type Camp = {
  id: string
  name: string
  strength: CampStrength
  pos: Point
  hp: number
  maxHp: number
  damage: number
  range: number
  lastAttack: number
  level: number
  respawn: number
  stackCount: number
  lastStackAttemptAt: number
  lastHitBy?: CombatSource
  aggroTargetId?: string
  aggroUntil?: number
  lastDamagedAt?: number
}
export type Boss = {
  id: string
  name: string
  pos: Point
  pathIndex: number
  hp: number
  maxHp: number
  damage: number
  range: number
  lastAttack: number
  respawn: number
  lastHitBy?: CombatSource
  aggroTargetId?: string
  aggroUntil?: number
  lastDamagedAt?: number
}
export type CombatTarget = Arcane | Creep | SummonedUnit | Tower | Structure | Base | Camp | Boss
export type RouteCreepTargetMode = 'attack' | 'vision'
export type TickFrameContext = {
  routeCreepTargetCache: Record<RouteCreepTargetMode, Map<string, CombatTarget | null>>
  creepSpatialQueryBuffer: Creep[]
  creepSpatialIdBuffer: string[]
  tacticalActivationCreepIds?: Set<string>
  tacticalActivationArcaneIds?: Set<string>
  // Caches válidos dentro de um único tick (mesma semântica do cache de alvo
  // acima: pequenas mutações de posição/hp no meio do tick são ignoradas).
  arcaneNearRouteCache: Map<Point[], Map<string, boolean>>
  attackableTowersCache: Partial<Record<TeamId, Tower[]>>
  attackableStructuresCache: Partial<Record<TeamId, Structure[]>>
  routeArcanesCache?: Map<string, Arcane[]>
  routeObjectivesCache?: Map<string, Array<Tower | Structure | Base>>
  visibleEnemiesCache?: Map<TeamId, Arcane[]>
  baseThreatCache?: Map<TeamId, ReturnType<typeof getBaseThreat>>
  actionThreatCache?: WeakMap<Point, Map<string, number>>
}
export type SpatialGrid<T extends { pos: Point }> = {
  cellSize: number
  cells: Map<number, T[]>
}
export type TickExecutionOptions = {
  fineStepEntityIds?: ReadonlySet<string>
  fineStepDelta?: number
  decisionElapsedSeconds?: number
  previousWorldTime?: number
  deferArcaneSafetyUntilDecision?: boolean
}
export const tickCreepSpatialQueryBuffer: Creep[] = []
export const tickCreepSpatialIdBuffer: string[] = []
export type MapRune = {
  id: string
  kind: RuneKind
  pos: Point
  spawnedAt: number
  expiresAt?: number
  power?: PowerRuneKind
  side?: TeamId
  spawnIndex: number
}
export type TeamCall = {
  team: TeamId
  callerId: string
  callerName: string
  kind: TeamObjectiveKind
  targetId: string
  targetName: string
  pos: Point
  createdAt: number
  expiresAt: number
}
export type TeamAura = {
  name: string
  attributeMultiplier: number
  expiresAt: number
}
export type TeamFortification = {
  activeUntil: number
  cooldownUntil: number
  targetId?: string
}
export type SimulationState = {
  runtimeToken: object
  matchSeed: string
  creepMotionMode: CreepMotionMode
  creepSpatialMode: CreepSpatialMode
  creepStorageMode: CreepStorageMode
  creepComponents?: CreepComponentStore
  creepSpatialRevision: number
  arcaneTravelMode: ArcaneTravelMode
  time: number
  nextWave: number
  kills: Record<TeamId, number>
  winner?: TeamId
  nextTeamDecisionAt: number
  nextCombatAiAt: number
  teamPlans: Partial<Record<TeamId, TeamPlan>>
  combatBlackboards: CombatBlackboardState
  teamMemory: Record<TeamId, AiMemoryEvent[]>
  teamCalls: Partial<Record<TeamId, TeamCall>>
  teamAuras: Partial<Record<TeamId, TeamAura>>
  teamFortifications: Record<TeamId, TeamFortification>
  events: MatchEvent[]
  effects: AttackEffect[]
  timedEffects: TimedEffect[]
  deathMarkers: DeathMarker[]
  denyMarkers: DenyMarker[]
  goldMarkers: GoldMarker[]
  skillMarkers: SkillMarker[]
  recentTeleports: RecentTeleport[]
  arcanes: Arcane[]
  creeps: Creep[]
  summons: SummonedUnit[]
  towers: Tower[]
  structures: Structure[]
  bases: Base[]
  camps: Camp[]
  runes: MapRune[]
  boss: Boss
}

export const analyzedGameStateCache = new WeakMap<SimulationState, { time: number; analyzed: AnalyzedGameState }>()
const analyzedGameStateDependencyCache = new WeakMap<object, {
  time: number
  creepSpatialRevision: number
  arcanes: Arcane[]
  creeps: Creep[]
  towers: Tower[]
  structures: Structure[]
  bases: Base[]
  camps: Camp[]
  boss: Boss
  timedEffects: TimedEffect[]
  teamAuras: Partial<Record<TeamId, TeamAura>>
  analyzed: AnalyzedGameState
}>()
export const playerAiProfileCache = new Map<string, ReturnType<typeof buildPlayerAiProfile>>()
export type CreepSpatialGrid = SpatialGrid<Creep> | PersistentSpatialGrid<Creep>
export const creepSpatialGridCache = new WeakMap<object, { revision: number; time: number; grid: CreepSpatialGrid }>()
export const aliveTowersByLaneCache = new WeakMap<SimulationState, { time: number; byTeamLane: Map<string, Tower[]> }>()
export const offensiveThreatCache = new WeakMap<Arcane, { time: number; range: number; readyDamage: number }>()
type TeamVisionProvider = { pos: Point; range: number }
const teamVisionProviderCache = new WeakMap<SimulationState, {
  time: number
  arcanes: Arcane[]
  creeps: Creep[]
  summons: SummonedUnit[]
  grids: Record<TeamId, SpatialGrid<TeamVisionProvider>>
  maxRanges: Record<TeamId, number>
}>()

export type SimulationEntityIndexes = {
  arcane: Map<string, number>
  creep: Map<string, number>
  summon: Map<string, number>
  tower: Map<string, number>
  structure: Map<string, number>
  base: Map<string, number>
  camp: Map<string, number>
  arcaneIds: string[]
}

const simulationEntityIndexesCache = new WeakMap<object, {
  indexes: SimulationEntityIndexes
  creepCount: number
  firstCreepId?: string
  lastCreepId?: string
  summonCount: number
  firstSummonId?: string
  lastSummonId?: string
}>()
const timedEffectsByTargetCache = new WeakMap<SimulationState, { source: TimedEffect[]; byTarget: Map<string, TimedEffect[]> }>()

export type CombatSource = {
  id: string
  label: string
  team: TeamId
  damageType?: CombatDamageType
}
export type MatchEvent = {
  id: string
  time: number
  team: TeamId
  actor: string
  actorTeam: TeamId
  victim: string
  victimTeam: TeamId
  detail: string
}
export type AttackEffect = {
  id: string
  kind: 'creep' | 'arcane' | 'tower' | 'neutral'
  action: 'attack' | 'skill' | 'item' | 'mobility'
  sourceId: string
  targetKind: EntityKind
  team: TeamId
  from: Point
  to: Point
  createdAt: number
  duration: number
}
export type DenyMarker = {
  id: string
  team: TeamId
  pos: Point
  createdAt: number
  expiresAt: number
}
export type GoldMarker = {
  id: string
  team: TeamId
  pos: Point
  amount: number
  createdAt: number
  expiresAt: number
}
export type SkillMarker = {
  id: string
  team: TeamId
  pos: Point
  label: string
  createdAt: number
  expiresAt: number
}
export type TimedEffect = {
  id: string
  targetId: string
  sourceId: string
  sourceName: string
  sourceTeam: TeamId
  kind: 'slow' | 'stun' | 'silence' | 'root' | 'disarm' | 'hex' | 'fear' | 'taunt' | 'sleep' | 'break' | 'mute' | 'buff' | 'barrier' | 'dot' | 'hot' | 'summon_mark'
  polarity: 'positive' | 'negative'
  value: number
  stacks: number
  modifiers?: {
    damagePct?: number
    armorFlat?: number
    moveSpeedPct?: number
    attackSpeedPct?: number
    incomingDamagePct?: number
  }
  barrierRemaining?: number
  damageType?: CombatDamageType
  tickInterval?: number
  nextTickAt?: number
  dispelType: DispelType
  createdAt: number
  expiresAt: number
}
export type DeathMarker = {
  id: string
  arcane: string
  team: TeamId
  pos: Point
  createdAt: number
  expiresAt: number
}
export type ShopItem = {
  id: string
  name: string
  cost: number
  modifier: StatModifier
  effects: RuntimeItemEffect[]
  active?: {
    effectId: string
    target: string
    tags: string[]
    values: Record<string, number | number[] | string | boolean>
    dispelPower?: DispelPower
    cooldown: number
    duration?: number
  }
  summary: {
    damage: number
    maxHp: number
    maxMana: number
    armor: number
    magicResistance: number
    statusResistance: number
    slowResistance: number
    strength: number
    agility: number
    intelligence: number
    attackSpeed: number
    moveSpeedPct: number
    spellAmpPct: number
    lifestealPct: number
    cooldownReductionPct: number
    moveSpeed: number
  }
}
export type ConsumableItem = {
  id: string
  name: string
  cost: number
  charges: number
  heal?: number
  mana?: number
  duration?: number
  instant: boolean
}

export const teamInfo = {
  dawn: {
    name: 'Aurora Forge',
    short: 'AF',
    primary: '#38d6cc',
    secondary: '#f6c85d',
    base: { x: 4.5, y: 95.5 },
  },
  dusk: {
    name: 'Crimson Veil',
    short: 'CV',
    primary: '#ff5b6e',
    secondary: '#9fd0ff',
    base: { x: 95.5, y: 4.5 },
  },
} satisfies Record<TeamId, { name: string; short: string; primary: string; secondary: string; base: Point }>

export const laneNames: Record<LaneId, string> = {
  top: 'Topo',
  mid: 'Meio',
  bot: 'Baixo',
}

export const baseServiceRange = 6
export const matchPreparationStartSeconds = -60
export const aliveRespawnTimestamp = matchPreparationStartSeconds
export const mapWallPadding = 3
export const minimumMeleeMapAttackRange = 4
export const teleportScrollCost = 100
export const teleportScrollMaxCharges = 3
export const teleportBaseCooldownSeconds = 80
export const teleportChannelSeconds = 3
export const teleportNearbyPenaltyRadius = 10
export const teleportNearbyPenaltySeconds = 25
export const teleportArrivalOffset = 2.8
export const teleportManaCost = 75
export const lanePullStartSecond = 38
export const lanePullCommitSecond = 43
export const lanePullEndSecond = 55
export const lanePullDurationSeconds = 14
export const itemResaleRate = 0.5
// 30Hz é suficiente para a física da sim: o playback consome frames a 5Hz com
// interpolação visual, e as decisões de IA já são gated a 0.1s (decisionGateSeconds).
// Dobrar o passo corta ~metade do custo de CPU da partida no worker.
export const simulationFrameSeconds = 1 / 30
export const decisionGateSeconds = 0.1
export const arcaneCombatEvaluationIntervalSeconds = 0.1
export const creepTargetEvaluationIntervalSeconds = 0.1
export const maxDecisionHoldSeconds = 6
export const teamDecisionIntervalSeconds = 1.2
export const fortificationDurationSeconds = 7
export const fortificationCooldownSeconds = 300
export const fortificationDamageMultiplier = 0.35
export const maxSimulationTimerElapsedSeconds = 2
export const maxSimulationStepsPerTimer = 240
export const baseMaxSimulationStepsPerFrame = 5
export const maxAttackEffects = 28
export const bossPath: Point[] = [
  { x: 15, y: 8 },
  { x: 50, y: 5 },
  { x: 85, y: 10 },
  { x: 96, y: 45 },
  { x: 86, y: 88 },
  { x: 50, y: 96 },
  { x: 14, y: 90 },
  { x: 5, y: 52 },
]
export const runeSpawnPoints = {
  bounty: [
    { x: 13, y: 70 },
    { x: 87, y: 30 },
    { x: 34, y: 86 },
    { x: 66, y: 14 },
    { x: 38, y: 44 },
    { x: 62, y: 56 },
  ],
  power: [
    { x: 43, y: 47 },
    { x: 57, y: 53 },
  ],
  wisdom: [
    { x: 12, y: 83 },
    { x: 88, y: 17 },
  ],
  lotus: [
    { x: 32, y: 73 },
    { x: 68, y: 27 },
  ],
} satisfies Record<RuneKind, Point[]>
export const powerRuneCycle: PowerRuneKind[] = ['haste', 'arcane', 'shield', 'damage']
export function getArcaneRespawnDuration(level: number) {
  return respawnDurationSeconds(level)
}

export function getAuraMultiplier(state: SimulationState, team: TeamId) {
  return state.teamAuras[team]?.attributeMultiplier ?? 1
}

export function getRoleAggression(role: string) {
  if (role === 'Offlane') return 68
  if (role === 'Mid') return 58
  if (role === 'Safe Lane') return 48
  if (role === 'Greedy Support') return 42
  return 34
}

export function getRoleShotcalling(role: string) {
  if (role === 'Dedicated Support') return 76
  if (role === 'Greedy Support') return 68
  if (role === 'Mid') return 52
  if (role === 'Offlane') return 42
  return 36
}

export function getRoleDecisionStatus(role: string): DecisionStatus {
  if (role === 'Dedicated Support') return 'sharp'
  if (role === 'Mid') return 'sharp'
  if (role === 'Offlane') return 'steady'
  if (role === 'Greedy Support') return 'steady'
  return 'hesitant'
}

export function getRoleDecisionTempo(role: string) {
  if (role === 'Dedicated Support') return 0.78
  if (role === 'Mid') return 0.86
  if (role === 'Offlane') return 0.96
  if (role === 'Greedy Support') return 1.04
  return 1.12
}

export function getRoleFarmPriority(role: string) {
  if (role === 'Safe Lane') return 100
  if (role === 'Mid') return 82
  if (role === 'Offlane') return 62
  if (role === 'Greedy Support') return 34
  return 16
}

export function getRoleFarmAppetite(role: string) {
  return getRoleFarmPriority(role) / 100
}

export function getRoleGpmDecisionBias(role: string) {
  if (role === 'Safe Lane') return 86
  if (role === 'Mid') return 78
  if (role === 'Offlane') return 58
  if (role === 'Greedy Support') return 42
  return 24
}

export function getRoleLevelTarget(role: string, time: number) {
  const minutes = Math.max(0, time / 60)
  const core = !role.includes('Support')
  const checkpoints = core
    ? [[0, 1], [6, 6], [10, 9], [20, 15], [40, 25], [60, 30]]
    : [[0, 1], [6, 4], [10, 7], [20, 12], [40, 21], [60, 26]]
  const upperIndex = checkpoints.findIndex(([minute]) => minute >= minutes)
  if (upperIndex === -1) return checkpoints[checkpoints.length - 1][1]
  if (upperIndex === 0) return checkpoints[0][1]
  const [lowerMinute, lowerLevel] = checkpoints[upperIndex - 1]
  const [upperMinute, upperLevel] = checkpoints[upperIndex]
  return lowerLevel + (upperLevel - lowerLevel) * ((minutes - lowerMinute) / (upperMinute - lowerMinute))
}

export function getArcaneDevelopmentNeed(arcane: Arcane, time: number) {
  return clampNumber((getRoleLevelTarget(arcane.role, time) - arcane.stats.level) * 10, 0, 100)
}

const roleGpmTargets: Record<string, ReadonlyArray<readonly [number, number]>> = {
  'Safe Lane': [[0, 0], [6, 360], [10, 480], [20, 620], [40, 760], [60, 800]],
  Mid: [[0, 0], [6, 400], [10, 500], [20, 560], [40, 650], [60, 690]],
  Offlane: [[0, 0], [6, 300], [10, 380], [20, 480], [40, 590], [60, 620]],
  'Greedy Support': [[0, 0], [6, 260], [10, 275], [20, 320], [40, 365], [60, 390]],
  'Dedicated Support': [[0, 0], [6, 230], [10, 240], [20, 280], [40, 317], [60, 340]],
}

export function getRoleGpmTarget(role: string, time: number) {
  const minutes = Math.max(0, time / 60)
  const checkpoints = roleGpmTargets[role] ?? roleGpmTargets['Dedicated Support']
  const upperIndex = checkpoints.findIndex(([minute]) => minute >= minutes)
  if (upperIndex === -1) return checkpoints[checkpoints.length - 1][1]
  if (upperIndex === 0) return checkpoints[0][1]
  const [lowerMinute, lowerGpm] = checkpoints[upperIndex - 1]
  const [upperMinute, upperGpm] = checkpoints[upperIndex]
  return lowerGpm + (upperGpm - lowerGpm) * ((minutes - lowerMinute) / (upperMinute - lowerMinute))
}

export function getArcaneEconomyNeed(arcane: Arcane, time: number) {
  if (time <= 0) return 0
  const targetGpm = getRoleGpmTarget(arcane.role, time)
  const currentGpm = arcane.earnedGold / Math.max(60, time) * 60
  return clampNumber((targetGpm - currentGpm) / Math.max(1, targetGpm) * 125, 0, 100)
}

export function getGamePhase(time: number): GamePhase {
  if (time < 10 * 60) return 'early'
  if (time < 28 * 60) return 'mid'
  return 'late'
}

export function getGamePhaseLabel(phase: GamePhase) {
  if (phase === 'early') return 'Early Game'
  if (phase === 'mid') return 'Mid Game'
  return 'Late Game'
}

export function formatCompactGold(value: number) {
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(1)}k`
  return `${Math.round(value)}g`
}

export function formatMatchTime(time: number) {
  const negative = time < 0
  const total = negative ? Math.ceil(Math.abs(time)) : Math.floor(time)
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${negative ? '-' : ''}${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function getDayCycle(time: number): DayCycle {
  return isDay(time) ? 'day' : 'night'
}

export function getDayCycleLabel(cycle: DayCycle) {
  return cycle === 'day' ? 'Dia' : 'Noite'
}

export const lanePaths: Record<TeamId, Record<LaneId, Point[]>> = {
  dawn: {
    top: [
      { x: 4.5, y: 95.5 },
      { x: 10, y: 68 },
      { x: 17, y: 34 },
      { x: 41, y: 18 },
      { x: 69, y: 10 },
      { x: 95.5, y: 4.5 },
    ],
    mid: [
      { x: 4.5, y: 95.5 },
      { x: 28, y: 72 },
      { x: 50, y: 50 },
      { x: 72, y: 28 },
      { x: 95.5, y: 4.5 },
    ],
    bot: [
      { x: 4.5, y: 95.5 },
      { x: 33, y: 93 },
      { x: 64, y: 84 },
      { x: 87, y: 63 },
      { x: 95.5, y: 4.5 },
    ],
  },
  dusk: {
    top: [
      { x: 95.5, y: 4.5 },
      { x: 69, y: 10 },
      { x: 41, y: 18 },
      { x: 17, y: 34 },
      { x: 10, y: 68 },
      { x: 4.5, y: 95.5 },
    ],
    mid: [
      { x: 95.5, y: 4.5 },
      { x: 72, y: 28 },
      { x: 50, y: 50 },
      { x: 28, y: 72 },
      { x: 4.5, y: 95.5 },
    ],
    bot: [
      { x: 95.5, y: 4.5 },
      { x: 87, y: 63 },
      { x: 64, y: 84 },
      { x: 33, y: 93 },
      { x: 4.5, y: 95.5 },
    ],
  },
}

export function createArcaneDefinition(
  id: string,
  name: string,
  primaryAttribute: PrimaryAttribute,
  attackType: 'melee' | 'ranged',
  roles: HeroRole[],
  baseAttributes: { strength: number; agility: number; intelligence: number },
  attributeGrowth: { strengthGain: number; agilityGain: number; intelligenceGain: number },
  baseProfile: {
    damageMin: number
    damageMax: number
    armor: number
    attackRange: number
    acquisitionRange: number
    movementSpeed: number
    dayVision: number
    nightVision: number
  },
): HeroDefinition {
  return {
    id,
    name,
    primaryAttribute,
    attackType,
    roles,
    complexity: 1,
    baseAttributes,
    attributeGrowth,
    baseStats: {
      baseHealth: 120,
      baseHealthRegen: 1.2,
      baseMana: 75,
      baseManaRegen: 0,
      baseDamageMin: baseProfile.damageMin,
      baseDamageMax: baseProfile.damageMax,
      baseArmor: baseProfile.armor,
      baseMagicResistance: 25,
      baseStatusResistance: 0,
      baseSlowResistance: 0,
      baseAttackSpeed: 100,
      baseAttackTime: 1.7,
      attackRange: baseProfile.attackRange,
      acquisitionRange: baseProfile.acquisitionRange,
      movementSpeed: baseProfile.movementSpeed,
      turnRate: 0.6,
      collisionSize: 24,
      dayVision: baseProfile.dayVision,
      nightVision: baseProfile.nightVision,
    },
  }
}

export const heroDefinitions: Record<string, HeroDefinition> = {
  ember_warden: createArcaneDefinition(
    'ember_warden',
    'Ember Warden',
    'agility',
    'melee',
    ['carry', 'escape'],
    { strength: 22, agility: 25, intelligence: 16 },
    { strengthGain: 2.5, agilityGain: 3.2, intelligenceGain: 1.6 },
    { damageMin: 24, damageMax: 30, armor: 2, attackRange: 160, acquisitionRange: 650, movementSpeed: 305, dayVision: 1800, nightVision: 800 },
  ),
  river_saint: createArcaneDefinition(
    'river_saint',
    'River Saint',
    'intelligence',
    'ranged',
    ['nuker', 'disabler'],
    { strength: 19, agility: 18, intelligence: 26 },
    { strengthGain: 2.1, agilityGain: 2, intelligenceGain: 3.4 },
    { damageMin: 22, damageMax: 28, armor: 1, attackRange: 560, acquisitionRange: 720, movementSpeed: 330, dayVision: 1900, nightVision: 900 },
  ),
  stone_oracle: createArcaneDefinition(
    'stone_oracle',
    'Stone Oracle',
    'strength',
    'melee',
    ['durable', 'initiator'],
    { strength: 27, agility: 14, intelligence: 17 },
    { strengthGain: 3.6, agilityGain: 1.5, intelligenceGain: 1.8 },
    { damageMin: 27, damageMax: 34, armor: 3, attackRange: 150, acquisitionRange: 600, movementSpeed: 290, dayVision: 1800, nightVision: 800 },
  ),
  astral_pike: createArcaneDefinition(
    'astral_pike',
    'Astral Pike',
    'universal',
    'ranged',
    ['support', 'pusher'],
    { strength: 20, agility: 21, intelligence: 20 },
    { strengthGain: 2.2, agilityGain: 2.4, intelligenceGain: 2.2 },
    { damageMin: 14, damageMax: 20, armor: 1, attackRange: 575, acquisitionRange: 700, movementSpeed: 310, dayVision: 1900, nightVision: 1000 },
  ),
  moon_scribe: createArcaneDefinition(
    'moon_scribe',
    'Moon Scribe',
    'intelligence',
    'ranged',
    ['support', 'disabler'],
    { strength: 18, agility: 16, intelligence: 25 },
    { strengthGain: 2, agilityGain: 1.7, intelligenceGain: 3.1 },
    { damageMin: 18, damageMax: 24, armor: 0, attackRange: 600, acquisitionRange: 760, movementSpeed: 300, dayVision: 2000, nightVision: 1100 },
  ),
  iron_matriarch: createArcaneDefinition(
    'iron_matriarch',
    'Iron Matriarch',
    'agility',
    'melee',
    ['carry', 'durable'],
    { strength: 24, agility: 24, intelligence: 15 },
    { strengthGain: 2.8, agilityGain: 3, intelligenceGain: 1.5 },
    { damageMin: 25, damageMax: 31, armor: 2, attackRange: 160, acquisitionRange: 650, movementSpeed: 300, dayVision: 1800, nightVision: 800 },
  ),
  glass_revenant: createArcaneDefinition(
    'glass_revenant',
    'Glass Revenant',
    'intelligence',
    'ranged',
    ['nuker', 'escape'],
    { strength: 17, agility: 20, intelligence: 27 },
    { strengthGain: 1.8, agilityGain: 2.1, intelligenceGain: 3.5 },
    { damageMin: 21, damageMax: 27, armor: 1, attackRange: 580, acquisitionRange: 720, movementSpeed: 335, dayVision: 1900, nightVision: 900 },
  ),
  thorn_regent: createArcaneDefinition(
    'thorn_regent',
    'Thorn Regent',
    'strength',
    'melee',
    ['durable', 'disabler'],
    { strength: 28, agility: 13, intelligence: 18 },
    { strengthGain: 3.7, agilityGain: 1.4, intelligenceGain: 1.9 },
    { damageMin: 28, damageMax: 35, armor: 3, attackRange: 150, acquisitionRange: 600, movementSpeed: 288, dayVision: 1800, nightVision: 800 },
  ),
  void_cantor: createArcaneDefinition(
    'void_cantor',
    'Void Cantor',
    'universal',
    'ranged',
    ['support', 'nuker'],
    { strength: 19, agility: 20, intelligence: 22 },
    { strengthGain: 2.1, agilityGain: 2.2, intelligenceGain: 2.6 },
    { damageMin: 14, damageMax: 20, armor: 1, attackRange: 575, acquisitionRange: 700, movementSpeed: 312, dayVision: 1900, nightVision: 1000 },
  ),
  sunless_clerk: createArcaneDefinition(
    'sunless_clerk',
    'Sunless Clerk',
    'intelligence',
    'ranged',
    ['support', 'disabler'],
    { strength: 18, agility: 17, intelligence: 24 },
    { strengthGain: 2, agilityGain: 1.8, intelligenceGain: 3.2 },
    { damageMin: 18, damageMax: 24, armor: 0, attackRange: 600, acquisitionRange: 760, movementSpeed: 302, dayVision: 2000, nightVision: 1100 },
  ),
}

export let shopCatalog: ShopItem[] = []
export let consumableCatalog: ConsumableItem[] = []
let shopItemById = new Map<string, ShopItem>()
let shopItemByName = new Map<string, ShopItem>()
let shopItemsByInventory = new WeakMap<string[], ShopItem[]>()
let abilityUpgradeSlotsByInventory = new WeakMap<string[], Set<AbilityUpgradeSlot>>()
let runtimeSkillsByArcane = new WeakMap<object, {
  heroDefinitionId: string
  items: string[]
  skillLevels?: SkillLevels
  skillStates?: Record<string, RuntimeParentSkillState>
  situation?: ReturnType<typeof getPrimarySkillUsageSituation>
  lowHealthSong?: boolean
  skills: HeroSkillDefinition[]
}>()
let itemPurchasePlanByInventory = new WeakMap<string[], { plan?: ItemPurchasePlan }>()
let shopCandidatePoolByHero = new Map<string, ShopItem[]>()
export let getRecommendedBuildItemIdsForHero = (_heroDefinitionId: string): string[] => []
export let getRecommendedStartingItemNamesForHero = (_heroDefinitionId: string, role: string): string[] => getFallbackStartingItemNames(role)
export let getRuntimeItemSeedById: (id: string) => ItemSeed | undefined = () => undefined
export let toRuntimeItemModifier: (
  seed: ItemSeed,
  context: { primaryAttribute?: PrimaryAttribute; attackType?: AttackType },
) => StatModifier = (seed) => ({ id: seed.id, source: 'item' })

export async function loadGameData() {
  const [heroModule, itemModule] = await Promise.all([
    import('../game-systems/heroSeedsAdapter.ts'),
    import('../game-systems/itemSeedsAdapter.ts'),
  ])
  Object.assign(heroDefinitions, heroModule.seedHeroDefinitions)
  shopCatalog = itemModule.itemShopCatalog
  shopItemById = new Map(shopCatalog.map((item) => [item.id, item]))
  shopItemByName = new Map(shopCatalog.map((item) => [item.name, item]))
  shopItemsByInventory = new WeakMap()
  abilityUpgradeSlotsByInventory = new WeakMap()
  runtimeSkillsByArcane = new WeakMap()
  itemPurchasePlanByInventory = new WeakMap()
  shopCandidatePoolByHero = new Map()
  consumableCatalog = itemModule.consumableCatalog
  getRecommendedBuildItemIdsForHero = itemModule.getRecommendedBuildItemIds
  getRecommendedStartingItemNamesForHero = itemModule.getRecommendedStartingItemNames
  getRuntimeItemSeedById = itemModule.getItemSeedById
  toRuntimeItemModifier = itemModule.toItemModifier
}

export const rosterSeed: Omit<Arcane, 'pos' | 'target' | 'pathIndex' | 'respawn' | 'lastAttack' | 'nextCombatEvaluationAt' | 'aggression' | 'visionRange' | 'shotcalling' | 'macroDecision' | 'microDecision' | 'aiMode' | 'aiReason' | 'aiExecutionChance' | 'aiExecutionDelay' | 'aiFailure' | 'decisionStatus' | 'decisionTempo' | 'nextDecisionAt' | 'lastDecisionAt' | 'forceDecision' | 'lastDecisionHpRatio' | 'lastDecisionManaRatio' | 'lastDecisionPos' | 'decision' | 'itemCooldowns' | 'skillStates' | 'tpScrolls' | 'tpCooldownUntil' | 'channeling' | 'skillLevels' | 'unspentSkillPoints' | 'statBonusLevels' | 'earnedGold' | 'kills' | 'deaths' | 'assists' | 'damageDealt' | 'heroDamageDealt' | 'structureDamageDealt' | 'damageTaken' | 'healingDone' | 'healingReceived' | 'laneCreepKills' | 'denies' | 'neutralKills' | 'objectiveKills' | 'stats'>[] = [
  { id: 'd-quasar', team: 'dawn', player: 'Quasar', name: 'Sword Tempest', heroDefinitionId: 'h007_sword_tempest', role: 'Safe Lane', lane: 'bot', portrait: 'ST', items: ['Blade', 'Boots'] },
  { id: 'd-aster', team: 'dawn', player: 'Aster', name: 'Storm Channeler', heroDefinitionId: 'h014_storm_channeler', role: 'Mid', lane: 'mid', portrait: 'SC', items: ['Wand'] },
  { id: 'd-bulwark', team: 'dawn', player: 'Bulwark', name: 'Tide Colossus', heroDefinitionId: 'h022_tide_colossus', role: 'Offlane', lane: 'top', portrait: 'TC', items: ['Shield'] },
  { id: 'd-orbit', team: 'dawn', player: 'Orbit', name: 'Stone Monk', heroDefinitionId: 'h099_stone_monk', role: 'Greedy Support', lane: 'top', portrait: 'SM', items: ['Charm'] },
  { id: 'd-bloom', team: 'dawn', player: 'Bloom', name: 'Grave Savior', heroDefinitionId: 'h042_grave_savior', role: 'Dedicated Support', lane: 'bot', portrait: 'GS', items: ['Ward'] },
  { id: 'r-ignis', team: 'dusk', player: 'Ignis', name: 'Blood Duelist', heroDefinitionId: 'h004_blood_duelist', role: 'Safe Lane', lane: 'top', portrait: 'BD', items: ['Blade', 'Boots'] },
  { id: 'r-vega', team: 'dusk', player: 'Vega', name: 'Fire Invoker', heroDefinitionId: 'h018_fire_invoker', role: 'Mid', lane: 'mid', portrait: 'FI', items: ['Wand'] },
  { id: 'r-mara', team: 'dusk', player: 'Mara', name: 'Dragon Knight', heroDefinitionId: 'h041_dragon_knight', role: 'Offlane', lane: 'bot', portrait: 'DK', items: ['Shield'] },
  { id: 'r-noct', team: 'dusk', player: 'Noct', name: 'Hex Warden', heroDefinitionId: 'h020_hex_warden', role: 'Greedy Support', lane: 'bot', portrait: 'HW', items: ['Charm'] },
  { id: 'r-cinder', team: 'dusk', player: 'Cinder', name: 'Winter Controller', heroDefinitionId: 'h104_winter_controller', role: 'Dedicated Support', lane: 'top', portrait: 'WC', items: ['Ward'] },
]

export function createInitialState(seed = 'lota-default-seed', options: SimulationOptions = {}): SimulationState {
  const randomizedRoster = createRandomizedTestRoster(seed)
  const arcanes = randomizedRoster.map((arcane, index) => {
    const spawn = teamInfo[arcane.team].base
    const pos = spreadPoint(spawn, index)
    const startingItems = getRecommendedStartingItemNamesForHero(arcane.heroDefinitionId, arcane.role)
    const stats = buildArcaneStats(arcane.heroDefinitionId, 1, 600, 0, 1, 1, startingItems)
    const baseArcane = {
      ...arcane,
      pos,
      target: lanePaths[arcane.team][arcane.lane][1],
      pathIndex: 1,
      respawn: aliveRespawnTimestamp,
      lastAttack: matchPreparationStartSeconds - 10,
      nextCombatEvaluationAt: matchPreparationStartSeconds,
      combatTargetId: undefined,
      combatTargetIntent: undefined,
      aggression: getRoleAggression(arcane.role),
      visionRange: getArcaneDefinitionVisionRange(arcane.heroDefinitionId, getDayCycle(matchPreparationStartSeconds)),
      shotcalling: getRoleShotcalling(arcane.role),
      macroDecision: 'Avancar rota',
      microDecision: 'Saindo da base',
      aiMode: 'push_lane' as PlayerModeType,
      aiReason: 'spawn',
      aiExecutionChance: 100,
      aiExecutionDelay: 0,
      decisionStatus: getRoleDecisionStatus(arcane.role),
      decisionTempo: getRoleDecisionTempo(arcane.role),
      nextDecisionAt: 0,
      lastDecisionAt: -99,
      forceDecision: true,
      lastDecisionHpRatio: 1,
      lastDecisionManaRatio: 1,
      lastDecisionPos: pos,
      decision: 'Saindo da base',
      items: startingItems,
      itemCooldowns: {},
      skillStates: {},
      tpScrolls: 1,
      tpCooldownUntil: teleportBaseCooldownSeconds,
      skillLevels: {},
      unspentSkillPoints: 1,
      statBonusLevels: 0,
      earnedGold: stats.gold,
      kills: 0,
      deaths: 0,
      assists: 0,
      damageDealt: 0,
      heroDamageDealt: 0,
      structureDamageDealt: 0,
      damageTaken: 0,
      healingDone: 0,
      healingReceived: 0,
      laneCreepKills: 0,
      denies: 0,
      neutralKills: 0,
      objectiveKills: 0,
      stats,
    }
    return allocateArcaneSkillPoints(baseArcane)
  })

  const creepStorageMode = options.creepStorageMode ?? 'soa'
  return {
    runtimeToken: {},
    matchSeed: seed,
    creepMotionMode: options.creepMotionMode ?? 'planned',
    creepSpatialMode: options.creepSpatialMode ?? 'persistent',
    creepStorageMode,
    creepComponents: creepStorageMode === 'soa' ? createCreepComponentStore() : undefined,
    creepSpatialRevision: 0,
    arcaneTravelMode: options.arcaneTravelMode ?? 'planned',
    time: matchPreparationStartSeconds,
    nextWave: 0,
    kills: { dawn: 0, dusk: 0 },
    nextTeamDecisionAt: 0,
    nextCombatAiAt: matchPreparationStartSeconds,
    teamPlans: {},
    combatBlackboards: createEmptyCombatBlackboards(),
    teamMemory: { dawn: [], dusk: [] },
    teamCalls: {},
    teamAuras: {},
    teamFortifications: {
      dawn: { activeUntil: 0, cooldownUntil: 0 },
      dusk: { activeUntil: 0, cooldownUntil: 0 },
    },
    events: [],
    effects: [],
    timedEffects: [],
    deathMarkers: [],
    denyMarkers: [],
    goldMarkers: [],
    skillMarkers: [],
    recentTeleports: [],
    arcanes,
    creeps: [],
    summons: [],
    towers: createTowers(),
    structures: createStructures(),
    bases: [
      createBase('dawn'),
      createBase('dusk'),
    ],
    camps: createNeutralCamps(),
    runes: createInitialRunes(),
    boss: createBoss(),
  }
}

export function createRandomizedTestRoster(seed = 'lota-default-seed') {
  const usedHeroIds = new Set<string>()
  return rosterSeed.map((slot, index) => {
    const hero = pickRandomHeroForSlot(slot.role, usedHeroIds, `${seed}:roster:${index}:${slot.id}`)
    if (!hero) return slot
    usedHeroIds.add(hero.id)

    return {
      ...slot,
      heroDefinitionId: hero.id,
      name: hero.name,
      portrait: getHeroPortraitCode(hero),
    }
  })
}

export function pickRandomHeroForSlot(role: string, usedHeroIds: Set<string>, seed = 'lota-default-seed') {
  const pool = getRandomHeroPool().filter((hero) => !usedHeroIds.has(hero.id))
  const preferredPool = pool.filter((hero) => isHeroPreferredForSlot(hero, role))
  return pickRandom(preferredPool.length > 0 ? preferredPool : pool, seed)
}

export function getRandomHeroPool() {
  const importedHeroes = Object.values(heroDefinitions).filter((hero) => hero.id.startsWith('h') && (hero.skills?.length ?? 0) >= 4)
  return importedHeroes.length > 0 ? importedHeroes : Object.values(heroDefinitions)
}

export function createMatchSeed() {
  return 'lota-default-seed'
}

export function seededRandomUnit(seed: string, salt: string) {
  const input = `${seed}:${salt}`
  let hash = 2166136261
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  hash += hash << 13
  hash ^= hash >>> 7
  hash += hash << 3
  hash ^= hash >>> 17
  hash += hash << 5
  return (hash >>> 0) / 4294967296
}

export function isHeroPreferredForSlot(hero: HeroDefinition, role: string) {
  if (role === 'Safe Lane') return hero.roles.includes('carry')
  if (role === 'Mid') return hero.roles.includes('nuker') || hero.attackType === 'ranged'
  if (role === 'Offlane') return hero.roles.includes('initiator') || hero.roles.includes('durable') || hero.roles.includes('disabler')
  if (role === 'Greedy Support') return hero.roles.includes('support') || hero.roles.includes('nuker') || hero.roles.includes('disabler')
  return hero.roles.includes('support') || hero.roles.includes('disabler')
}

export function pickRandom<T>(items: T[], seed = 'lota-default-seed') {
  if (items.length === 0) return undefined
  return items[Math.floor(seededRandomUnit(seed, 'pick') * items.length)]
}

export function getHeroPortraitCode(hero: HeroDefinition) {
  const words = hero.name.split(' ').filter(Boolean)
  const code = words.length >= 2
    ? `${words[0][0]}${words[1][0]}`
    : hero.name.slice(0, 2)
  return code.toUpperCase()
}

export function createInitialRunes(): MapRune[] {
  return []
}

export function getFallbackStartingItemNames(role: string) {
  if (role === 'Mid') return ['Mana Clarity', 'Burst Mango']
  if (role.includes('Support')) return ['Regen Rations', 'Mana Clarity']
  return ['Regen Rations', 'Healing Salve']
}

export function buildArcaneStats(heroDefinitionId: string, level: number, gold: number, xp: number, hpRatio = 1, manaRatio = 1, itemNames: string[] = [], statBonusLevels = 0): Stats {
  const definition = getHeroDefinition(heroDefinitionId)
  const calculated = calculateHeroStats(definition, level, [
    ...getItemStatModifiers(itemNames, definition),
    ...getStatBonusModifiers(statBonusLevels),
  ])
  const maxHp = Math.round(calculated.resources.maxHealth)
  const maxMana = Math.round(calculated.resources.maxMana)
  const mapAttackRange = calculated.offense.attackRange / 100
  const effectiveMapAttackRange = calculated.offense.attackType === 'melee'
    ? Math.max(minimumMeleeMapAttackRange, mapAttackRange)
    : mapAttackRange

  return {
    maxHp,
    hp: Math.round(maxHp * hpRatio),
    maxMana,
    mana: Math.round(maxMana * manaRatio),
    damage: Math.round(calculated.offense.averageDamage),
    damageMin: Math.round(calculated.offense.damageMin),
    damageMax: Math.round(calculated.offense.damageMax),
    range: effectiveMapAttackRange,
    attackType: calculated.offense.attackType,
    attackSpeed: 1 / Math.max(0.1, calculated.offense.attacksPerSecond),
    armor: calculated.defense.armor,
    magicResistance: calculated.defense.magicResistance,
    statusResistance: calculated.defense.statusResistance,
    slowResistance: calculated.defense.slowResistance,
    moveSpeed: calculated.movement.movementSpeed / 45,
    level,
    xp,
    gold,
  }
}

export function getItemStatModifiers(itemNames: string[], hero?: HeroDefinition) {
  return itemNames
    .map((name) => {
      const item = shopCatalog.find((candidate) => candidate.name === name)
      if (!item) return undefined
      const seed = getRuntimeItemSeedById(item.id)
      if (!seed || !hero) return item.modifier
      return toRuntimeItemModifier(seed, {
        primaryAttribute: hero.primaryAttribute,
        attackType: hero.attackType,
      })
    })
    .filter((modifier): modifier is StatModifier => modifier !== undefined)
}

export function getStatBonusModifiers(statBonusLevels: number): StatModifier[] {
  if (statBonusLevels <= 0) return []
  const attributeBonus = statBonusLevels * 2
  return [{
    id: `stat-bonus-${statBonusLevels}`,
    source: 'training',
    flat: {
      strength: attributeBonus,
      agility: attributeBonus,
      intelligence: attributeBonus,
    },
  }]
}

export function rebuildArcaneStatsAfterItemChange(arcane: Arcane, nextItems: string[], nextGold: number) {
  const nextStats = buildArcaneStats(arcane.heroDefinitionId, arcane.stats.level, nextGold, arcane.stats.xp, 1, 1, nextItems, arcane.statBonusLevels)
  const gainedMaxHp = Math.max(0, nextStats.maxHp - arcane.stats.maxHp)
  const gainedMaxMana = Math.max(0, nextStats.maxMana - arcane.stats.maxMana)

  return {
    ...nextStats,
    hp: Math.min(nextStats.maxHp, arcane.stats.hp + gainedMaxHp),
    mana: Math.min(nextStats.maxMana, arcane.stats.mana + gainedMaxMana),
  }
}

export function getArcaneDefinitionVisionRange(heroDefinitionId: string, cycle: DayCycle) {
  const calculated = calculateHeroStats(getHeroDefinition(heroDefinitionId), 1, [])
  return worldVisionToMapRadius(cycle === 'day' ? calculated.vision.dayVision : calculated.vision.nightVision)
}

export function getHeroDefinition(heroDefinitionId: string) {
  const definition = heroDefinitions[heroDefinitionId]
  if (!definition) {
    throw new Error(`Hero definition not loaded: ${heroDefinitionId}`)
  }
  return definition
}

export function getArcaneAbilityUpgradeSlots(arcane: Pick<Arcane, 'items'>) {
  const cached = abilityUpgradeSlotsByInventory.get(arcane.items)
  if (cached) return cached
  const slots = new Set<AbilityUpgradeSlot>()
  getShopItemsForInventory(arcane.items).forEach((item) => {
    item.effects.forEach((effect) => {
      const slot = effect.values.upgradeSlot
      if (slot === 'scepter' || slot === 'shard') slots.add(slot)
    })
  })
  abilityUpgradeSlotsByInventory.set(arcane.items, slots)
  return slots
}

export function getArcaneRuntimeSkills(
  arcane: Pick<Arcane, 'heroDefinitionId' | 'items' | 'skillLevels' | 'skillStates' | 'stats' | 'aiMode' | 'macroDecision'>,
) {
  const definition = getHeroDefinition(arcane.heroDefinitionId)
  const usesContextualSelection = hasAutomaticContextualSkillSelection(definition)
  const cached = runtimeSkillsByArcane.get(arcane)
  if (
    !usesContextualSelection &&
    cached?.heroDefinitionId === arcane.heroDefinitionId &&
    cached.items === arcane.items
  ) {
    return cached.skills
  }
  const upgradeSlots = getArcaneAbilityUpgradeSlots(arcane)
  if (!usesContextualSelection) {
    const skills = getRuntimeHeroSkills(definition, upgradeSlots)
    runtimeSkillsByArcane.set(arcane, {
      heroDefinitionId: arcane.heroDefinitionId,
      items: arcane.items,
      skills,
    })
    return skills
  }
  const hpRatio = arcane.stats.hp / Math.max(1, arcane.stats.maxHp)
  const situation = getPrimarySkillUsageSituation({
    phase: arcane.stats.level <= 8 ? 'early' : arcane.stats.level <= 18 ? 'mid' : 'late',
    aiMode: arcane.aiMode,
    macroDecision: arcane.macroDecision,
    hpRatio,
  })
  const lowHealthSong = hpRatio < 0.58
  if (
    cached?.heroDefinitionId === arcane.heroDefinitionId &&
    cached.items === arcane.items &&
    cached.skillLevels === arcane.skillLevels &&
    cached.skillStates === arcane.skillStates &&
    cached.situation === situation &&
    cached.lowHealthSong === lowHealthSong
  ) {
    return cached.skills
  }
  const contextualSkillIds = getContextualSkillIds(definition, {
    skillLevels: arcane.skillLevels,
    situation,
    hpRatio,
    skillStates: arcane.skillStates,
  })
  const skills = getRuntimeHeroSkills(definition, upgradeSlots, contextualSkillIds)
  runtimeSkillsByArcane.set(arcane, {
    heroDefinitionId: arcane.heroDefinitionId,
    items: arcane.items,
    skillLevels: arcane.skillLevels,
    skillStates: arcane.skillStates,
    situation,
    lowHealthSong,
    skills,
  })
  return skills
}

export function createBoss(): Boss {
  const stats = getBossStats(0)
  return {
    id: 'boss-world-serpent',
    name: 'Serpente do Eclipse',
    pos: bossPath[0],
    pathIndex: 1,
    hp: stats.hp,
    maxHp: stats.hp,
    damage: stats.damage,
    range: stats.range,
    lastAttack: -10,
    respawn: 0,
  }
}

export function getBossStats(time: number) {
  const minutes = Math.floor(time / 60)
  const scale = 1 + minutes * 0.065
  return {
    hp: Math.round(2800 * scale),
    damage: Math.round(135 * scale),
    range: 5.8,
    moveSpeed: 2.1 + Math.min(0.55, minutes * 0.015),
  }
}

export function createNeutralCamps(): Camp[] {
  const campPairs: Array<[string, string, string, CampStrength, number, number]> = [
    ['ancient-river', 'Ancientes do Rio Oeste', 'Ancientes do Rio Leste', 'strong', 31, 43],
    ['ancient-lowland', 'Colossos do Baixo Oeste', 'Colossos do Topo Leste', 'strong', 44, 66],
    ['sentinel-edge', 'Sentinelas da Borda Oeste', 'Sentinelas da Borda Leste', 'medium', 18, 72],
    ['rune-cliff', 'Guardas do Penhasco Sul', 'Guardas do Penhasco Norte', 'medium', 48, 88],
    ['echo-grove', 'Ecos do Bosque Oeste', 'Ecos do Bosque Leste', 'weak', 38, 78],
    ['scout-edge', 'Vigias da Borda Norte', 'Vigias da Borda Sul', 'weak', 13, 28],
    ['crossroads', 'Predadores da Encruzilhada Oeste', 'Predadores da Encruzilhada Leste', 'medium', 27, 60],
    ['outer-grove', 'Espiritos do Bosque Sul', 'Espiritos do Bosque Norte', 'weak', 58, 74],
  ]
  const campData = campPairs.flatMap(([id, dawnName, duskName, strength, x, y]) => [
    [`camp-${id}-dawn`, dawnName, strength, x, y],
    [`camp-${id}-dusk`, duskName, strength, 100 - x, 100 - y],
  ] satisfies Array<[string, string, CampStrength, number, number]>)

  return campData.map(([id, name, strength, x, y]) => {
    const stats = getCampStats(strength)
    return {
      id,
      name,
      strength,
      pos: { x, y },
      hp: 0,
      maxHp: stats.hp,
      damage: stats.damage,
      range: stats.range,
      lastAttack: -10,
      level: stats.level,
      respawn: NON_COMBAT_RULES.map.jungleStartTimeSeconds,
      stackCount: 0,
      lastStackAttemptAt: -999,
    }
  })
}

export function getCampStats(strength: CampStrength) {
  return getNeutralCampStats(getCampTier(strength))
}

export function getCampRewards(camp: Camp, time: number) {
  const reward = getNeutralCampReward(getCampTier(camp.strength), time)
  return {
    gold: Math.round(stackedCampValue(reward.gold, camp.stackCount)),
    xp: scaledExperienceReward(stackedCampValue(reward.xp, camp.stackCount), time),
  }
}

export function getCampTier(strength: CampStrength) {
  if (strength === 'strong') return 'ancient'
  if (strength === 'medium') return 'medium'
  return 'small'
}

export function campStrengthLabel(strength: CampStrength) {
  if (strength === 'strong') return 'forte'
  if (strength === 'medium') return 'medio'
  return 'fraco'
}

export function createTowers(): Tower[] {
  const towerData: Array<[TeamId, LaneId, 1 | 2 | 3, number, number]> = [
    ['dawn', 'top', 1, 24, 40],
    ['dawn', 'top', 2, 12, 55],
    ['dawn', 'mid', 1, 42, 58],
    ['dawn', 'mid', 2, 28, 72],
    ['dawn', 'bot', 1, 56, 82],
    ['dawn', 'bot', 2, 39, 92],
    ['dawn', 'top', 3, 8, 76],
    ['dawn', 'mid', 3, 19, 81],
    ['dawn', 'bot', 3, 26, 91],
    ['dusk', 'top', 1, 44, 18],
    ['dusk', 'top', 2, 62, 8],
    ['dusk', 'mid', 1, 58, 42],
    ['dusk', 'mid', 2, 72, 28],
    ['dusk', 'bot', 1, 76, 60],
    ['dusk', 'bot', 2, 88, 45],
    ['dusk', 'top', 3, 74, 9],
    ['dusk', 'mid', 3, 81, 19],
    ['dusk', 'bot', 3, 92, 24],
  ]

  return towerData.map(([team, lane, tier, x, y]) => {
    const stats = getStructureStatsByRole(getSeedTeam(team), getSeedLane(lane), tier)
    return {
      id: `${team}-${lane}-t${tier}`,
      team,
      lane,
      tier,
      pos: { x, y },
      hp: stats.hp,
      maxHp: stats.hp,
      damage: stats.damage,
      range: stats.range,
      lastAttack: -10,
    }
  })
}

export function createStructures(): Structure[] {
  const barracksData: Array<[TeamId, LaneId, StructureKind, number, number]> = [
    ['dawn', 'top', 'barracks_melee', 8.5, 82],
    ['dawn', 'top', 'barracks_ranged', 13, 79],
    ['dawn', 'mid', 'barracks_melee', 14, 88],
    ['dawn', 'mid', 'barracks_ranged', 19, 85],
    ['dawn', 'bot', 'barracks_melee', 22, 94],
    ['dawn', 'bot', 'barracks_ranged', 27, 91],
    ['dusk', 'top', 'barracks_melee', 73, 9],
    ['dusk', 'top', 'barracks_ranged', 78, 12],
    ['dusk', 'mid', 'barracks_melee', 81, 15],
    ['dusk', 'mid', 'barracks_ranged', 86, 12],
    ['dusk', 'bot', 'barracks_melee', 88, 20],
    ['dusk', 'bot', 'barracks_ranged', 91.5, 25],
  ]
  const tierFourData: Array<[TeamId, 'left' | 'right', number, number]> = [
    ['dawn', 'left', 7, 91],
    ['dawn', 'right', 13, 96],
    ['dusk', 'left', 87, 4],
    ['dusk', 'right', 93, 9],
  ]

  return [
    ...barracksData.map(([team, lane, kind, x, y]) => {
      const stats = getStructureStatsByRole(getSeedTeam(team), getSeedLane(lane), 0, kind)
      return {
        id: `${team}-${lane}-${kind}`,
        team,
        kind,
        lane,
        pos: { x, y },
        hp: stats.hp,
        maxHp: stats.hp,
        damage: stats.damage,
        range: stats.range,
        lastAttack: -10,
      }
    }),
    ...tierFourData.map(([team, side, x, y]) => {
      const stats = getStructureStatsByRole(getSeedTeam(team), 'base', 4, 'tower', side)
      return {
        id: `${team}-base-t4-${side}`,
        team,
        kind: 'tower_tier_4' as const,
        side,
        pos: { x, y },
        hp: stats.hp,
        maxHp: stats.hp,
        damage: stats.damage,
        range: stats.range,
        lastAttack: -10,
      }
    }),
  ]
}

export function createBase(team: TeamId): Base {
  const stats = getStructureStatsByRole(getSeedTeam(team), 'base', 0, 'ancient_core')
  return {
    id: `base-${team}`,
    team,
    pos: teamInfo[team].base,
    hp: stats.hp,
    maxHp: stats.hp,
  }
}

export function getSeedTeam(team: TeamId) {
  return team === 'dawn' ? 'blue' : 'red'
}

export function getTeamMatchOutcome(winner: TeamId | undefined, team: TeamId): TeamMatchOutcome {
  if (!winner) return 'draw'
  return winner === team ? 'winner' : 'loser'
}

export function getSeedLane(lane: LaneId) {
  return lane === 'bot' ? 'bottom' : lane
}

export function getLaneCreepUpgradeMultiplier(state: SimulationState, team: TeamId, lane: LaneId, type: Creep['type']) {
  const enemyTeam = team === 'dawn' ? 'dusk' : 'dawn'
  const targetBarracksKind = type === 'melee' || type === 'flagbearer' ? 'barracks_melee' : 'barracks_ranged'
  const laneBarracksDown = state.structures.some((structure) => (
    structure.team === enemyTeam &&
    structure.lane === lane &&
    structure.kind === targetBarracksKind &&
    structure.hp <= 0
  ))
  const allEnemyBarracksDown = state.structures
    .filter((structure) => structure.team === enemyTeam && structure.kind.startsWith('barracks'))
    .every((structure) => structure.hp <= 0)

  if (allEnemyBarracksDown) return { health: 2.25, damage: 2.1 }
  if (laneBarracksDown) return type === 'melee' || type === 'flagbearer'
    ? { health: 1.75, damage: 1.65 }
    : { health: 1.55, damage: 1.45 }
  return { health: 1, damage: 1 }
}

export function getLaneCreepUpgradeLevel(state: SimulationState, team: TeamId, lane: LaneId, type: Creep['type']) {
  if (type === 'siege' || type === 'flagbearer') return 'normal'
  const enemyTeam = team === 'dawn' ? 'dusk' : 'dawn'
  const targetBarracksKind = type === 'melee' ? 'barracks_melee' : 'barracks_ranged'
  const laneBarracksDown = state.structures.some((structure) => (
    structure.team === enemyTeam &&
    structure.lane === lane &&
    structure.kind === targetBarracksKind &&
    structure.hp <= 0
  ))
  const allEnemyBarracksDown = state.structures
    .filter((structure) => structure.team === enemyTeam && structure.kind.startsWith('barracks'))
    .every((structure) => structure.hp <= 0)

  if (allEnemyBarracksDown) return 'mega'
  if (laneBarracksDown) return 'super'
  return 'normal'
}

export function spawnWave(state: SimulationState): Creep[] {
  const waveNumber = Math.floor(state.time / NON_COMBAT_RULES.map.waveIntervalSeconds)
  return (['dawn', 'dusk'] as TeamId[]).flatMap((team) =>
    (['top', 'mid', 'bot'] as LaneId[]).flatMap((lane) =>
      getLaneCreepWaveKinds(state.time).map((type, index) => {
        const upgradeLevel = getLaneCreepUpgradeLevel(state, team, lane, type)
        const seedStats = getLaneCreepStats(type, state.time, upgradeLevel)
        const seedReward = getLaneCreepReward(type, state.time, upgradeLevel)
        const upgrade = getLaneCreepUpgradeMultiplier(state, team, lane, type)
        return {
          id: `${team}-${lane}-${waveNumber}-${index}`,
          team,
          lane,
          type,
          seedId: seedStats.seedId,
          pos: spreadPoint(lanePaths[team][lane][0], index),
          pathIndex: 1,
          hp: Math.round(seedStats.health * upgrade.health),
          maxHp: Math.round(seedStats.health * upgrade.health),
          damage: Math.round(seedStats.damage * upgrade.damage),
          range: seedStats.range,
          visionRange: seedStats.visionRange,
          goldReward: seedReward.gold,
          xpReward: seedReward.xp,
          lastAttack: -10,
          routeTargetId: undefined,
          nextRouteTargetEvaluationAt: state.time,
        }
      }),
    ),
  )
}

export function hasExpiredArcaneSkillState(arcane: Arcane, time: number) {
  for (const key in arcane.skillStates) {
    if (arcane.skillStates[key].activeUntil <= time) return true
  }
  return false
}

export function pruneExpiredArcaneSkillStates(arcane: Arcane, time: number) {
  if (!hasExpiredArcaneSkillState(arcane, time)) return arcane
  const skillStates: Arcane['skillStates'] = {}
  for (const key in arcane.skillStates) {
    const skillState = arcane.skillStates[key]
    if (skillState.activeUntil > time) skillStates[key] = skillState
  }
  return { ...arcane, skillStates }
}

export function tick(
  state: SimulationState,
  delta: number,
  shouldDecide: boolean,
  clockDelta = delta,
  executionOptions: TickExecutionOptions = {},
): SimulationState {
  if (state.winner) return state

  let next: SimulationState = state
  const hasActiveCombatEncounter = state.combatBlackboards.dawn.some((board) => board.phase !== 'disengage' && board.phase !== 'reset') ||
    state.combatBlackboards.dusk.some((board) => board.phase !== 'disengage' && board.phase !== 'reset')
  const previousCombatEventSignature = shouldDecide && hasActiveCombatEncounter
    ? getCombatCriticalEventSignature(next)
    : undefined
  const frameContext = createTickFrameContext()
  const previousTime = executionOptions.previousWorldTime ?? next.time
  const previousDayCycle = getDayCycle(previousTime)
  next.time = Number((next.time + clockDelta).toFixed(3))
  if (next.time >= 0 && next.time >= next.nextWave) {
    const wave = spawnWave(next)
    next.creeps.push(...(
      next.creepStorageMode === 'soa' && next.creepComponents
        ? appendCreepComponents(next.creepComponents, wave)
        : wave
    ))
    next.nextWave += NON_COMBAT_RULES.map.waveIntervalSeconds
    next.creepSpatialRevision += 1
  }
  next.runes = spawnRunesForTick(next, previousTime)
  // Ouro passivo acumula na cadência do gate de decisão (mesma taxa por
  // segundo): conceder a cada tick clonava 10 arcanes/tick só para somar ouro.
  const decisionElapsedSeconds = executionOptions.decisionElapsedSeconds ?? decisionGateSeconds
  const passiveGold = shouldDecide && next.time >= 0 ? passiveGoldForTick(next.time, decisionElapsedSeconds) : 0
  if (next.timedEffects.some((effect) => effect.expiresAt <= next.time)) {
    next.timedEffects = next.timedEffects.filter((effect) => effect.expiresAt > next.time)
  }
  next = processTimedEffects(next)
  next = resolveCompletedChannels(next)
  if (next.arcanes.some((arcane) => hasExpiredArcaneSkillState(arcane, next.time))) {
    next.arcanes = next.arcanes.map((arcane) => pruneExpiredArcaneSkillStates(arcane, next.time))
  }
  if (shouldDecide) {
    next.effects = next.effects.filter((effect) => next.time - effect.createdAt < effect.duration)
    next.deathMarkers = next.deathMarkers.filter((marker) => marker.expiresAt > next.time)
    next.denyMarkers = next.denyMarkers.filter((marker) => marker.expiresAt > next.time)
    next.goldMarkers = next.goldMarkers.filter((marker) => marker.expiresAt > next.time)
    next.skillMarkers = (next.skillMarkers ?? []).filter((marker) => marker.expiresAt > next.time)
    next.recentTeleports = (next.recentTeleports ?? []).filter((record) => next.time - record.startedAt <= teleportNearbyPenaltySeconds)
    next.teamMemory = {
      dawn: pruneAiMemory(next.teamMemory.dawn, next.time),
      dusk: pruneAiMemory(next.teamMemory.dusk, next.time),
    }
    next.teamAuras = Object.fromEntries(
      Object.entries(next.teamAuras).filter(([, aura]) => aura && aura.expiresAt > next.time),
    ) as Partial<Record<TeamId, TeamAura>>
  }
  const dayCycle = getDayCycle(next.time)
  if (shouldDecide) {
    applyItemAuraEffects(next)
    applySkillAuraEffects(next, decisionElapsedSeconds)
  }
  const dayCycleChanged = dayCycle !== previousDayCycle
  const hasReadyRespawn = next.arcanes.some((arcane) => (
    arcane.respawn > matchPreparationStartSeconds && arcane.respawn <= next.time
  ))
  if (dayCycleChanged || hasReadyRespawn) {
    next.arcanes = next.arcanes.map((arcane, index) => {
      const current = dayCycleChanged
        ? {
            ...arcane,
            visionRange: getArcaneDefinitionVisionRange(arcane.heroDefinitionId, dayCycle),
          }
        : arcane
      return respawnArcaneIfReady(current, next.time, index)
    })
  }

  if (shouldDecide) next.camps = resetDisengagedNeutralCamps(next.camps, next.time).map((camp) => {
    if (camp.hp > 0) {
      return camp
    }
    if (camp.respawn > next.time) return camp
    const stats = getCampStats(camp.strength)
    return {
      ...camp,
      hp: stats.hp,
      maxHp: stats.hp,
      damage: stats.damage,
      stackCount: 0,
      lastHitBy: undefined,
      aggroTargetId: undefined,
      aggroUntil: undefined,
      lastDamagedAt: undefined,
    }
  })
  next = processJungleStacks(next, previousTime)
  const fineStepDelta = executionOptions.fineStepDelta ?? delta
  const bossDelta = executionOptions.fineStepEntityIds?.has(next.boss.id) ? fineStepDelta : delta
  next.boss = updateBoss(next.boss, next.time, bossDelta)
  if (shouldDecide) {
    materializeCreepMotionPlansForTacticalWindow(next)
    materializeArcaneTravelPlansForTacticalWindow(next)
    next.creepSpatialRevision += 1
    collectTacticalCreepActivations(next, frameContext)
    collectTacticalArcaneTravelActivations(next, frameContext)
  }

  const needsInitialTeamPlan = next.teamPlans.dawn === undefined || next.teamPlans.dusk === undefined
  if ((shouldDecide || needsInitialTeamPlan) && (needsInitialTeamPlan || next.time >= next.nextTeamDecisionAt)) {
    next = updateTeamPlans(next)
    next = updateTeamCalls(next)
    next.nextTeamDecisionAt = next.time + teamDecisionIntervalSeconds
  }

  next.arcanes = next.arcanes.map((arcane) => updateArcaneMovement(
    arcane,
    next,
    executionOptions.fineStepEntityIds?.has(arcane.id) ? fineStepDelta : delta,
    shouldDecide,
    frameContext,
    executionOptions.deferArcaneSafetyUntilDecision,
  ))
  frameContext.routeArcanesCache?.clear()
  if (next.time >= 0) next = collectRunes(next)
  if (passiveGold > 0) {
    next.arcanes = next.arcanes.map((arcane) => (
      arcane.stats.hp > 0 && arcane.respawn <= next.time
        ? grantArcaneEconomy(arcane, passiveGold, 0)
        : arcane
    ))
  }
  next.creeps = updateCreepsForTick(
    next,
    delta,
    frameContext,
    executionOptions.fineStepEntityIds,
    fineStepDelta,
  )
  updateSummonedUnits(next, delta)
  // Separação de hitbox é cosmética (evita unidades empilhadas); rodar só nos
  // ticks de decisão (10Hz) é indistinguível no playback de 5Hz e poupa CPU.
  if (shouldDecide) {
    resolveUnitHitboxes(next)
    rebaseCreepMotionPlansAfterHitboxes(next)
    rebaseArcaneTravelPlansAfterHitboxes(next)
  }
  if (shouldDecide && next.time >= next.nextCombatAiAt) {
    next = updateCombatAiFoundation(next)
    next.nextCombatAiAt = next.time + COMBAT_AI_RULES.updateIntervalSeconds
  }
  next = updateTeamFortifications(next)
  next = resolveCombat(next, frameContext)
  next = resolveDeaths(next)
  if (previousCombatEventSignature !== undefined && getCombatCriticalEventSignature(next) !== previousCombatEventSignature) {
    next = updateCombatAiFoundation(next)
    next.nextCombatAiAt = next.time + COMBAT_AI_RULES.updateIntervalSeconds
  }
  next.winner = next.bases.find((base) => base.hp <= 0)?.team === 'dawn' ? 'dusk' : next.bases.find((base) => base.hp <= 0)?.team === 'dusk' ? 'dawn' : undefined
  return next
}

export function createTickFrameContext(): TickFrameContext {
  tickCreepSpatialQueryBuffer.length = 0
  tickCreepSpatialIdBuffer.length = 0
  return {
    routeCreepTargetCache: { attack: new Map(), vision: new Map() },
    creepSpatialQueryBuffer: tickCreepSpatialQueryBuffer,
    creepSpatialIdBuffer: tickCreepSpatialIdBuffer,
    arcaneNearRouteCache: new Map(),
    attackableTowersCache: {},
    attackableStructuresCache: {},
    routeArcanesCache: new Map(),
    routeObjectivesCache: new Map(),
    visibleEnemiesCache: new Map(),
    baseThreatCache: new Map(),
    actionThreatCache: new WeakMap(),
  }
}

export function tickTacticalIslands(
  state: SimulationState,
  _delta: number,
  clockDelta: number,
  entityIds: ReadonlySet<string>,
): SimulationState {
  if (state.winner || entityIds.size === 0) return state

  state.time = Number((state.time + clockDelta).toFixed(3))
  const hasExpiredEffect = state.timedEffects.some((effect) => effect.expiresAt <= state.time)
  const hasDuePeriodicEffect = state.timedEffects.some((effect) => (
    (effect.kind === 'dot' || effect.kind === 'hot') &&
    (effect.nextTickAt ?? Number.POSITIVE_INFINITY) <= state.time
  ))
  if (hasExpiredEffect) {
    state.timedEffects = state.timedEffects.filter((effect) => effect.expiresAt > state.time)
  }
  if (hasDuePeriodicEffect) state = processTimedEffects(state)
  if (state.arcanes.some((arcane) => entityIds.has(arcane.id) && hasExpiredArcaneSkillState(arcane, state.time))) {
    state.arcanes = state.arcanes.map((arcane) => (
      entityIds.has(arcane.id) ? pruneExpiredArcaneSkillStates(arcane, state.time) : arcane
    ))
  }

  const dueCombatActorIds = getDueTacticalCombatActorIds(state, entityIds)
  const dueArcaneAttackIds = getDueTacticalArcaneAttackIds(state, entityIds)
  const needsFrameContext = dueCombatActorIds.size > 0
  const frameContext = needsFrameContext ? createTickFrameContext() : undefined
  if (dueArcaneAttackIds.size > 0) resolveTacticalArcaneBasicAttacks(state, dueArcaneAttackIds)
  if (dueCombatActorIds.size > 0) state = resolveCombat(state, frameContext!, dueCombatActorIds)
  if (hasDuePeriodicEffect || dueArcaneAttackIds.size > 0 || hasDeadSimulationEntity(state)) state = resolveDeaths(state)
  state.winner = getMatchWinner(state)
  return state
}

function getDueTacticalCombatActorIds(state: SimulationState, entityIds: ReadonlySet<string>) {
  const due = new Set<string>()
  for (const creep of state.creeps) {
    if (
      !entityIds.has(creep.id) || creep.hp <= 0 || creep.motionPlan?.kind === 'route' ||
      state.time + 0.0001 < creep.lastAttack + 1.25
    ) continue
    const target = creep.routeTargetId ? getCombatTargetById(state, creep.routeTargetId) : undefined
    if (target && isCachedRouteCreepAttackTargetValid(creep, target, state)) due.add(creep.id)
  }
  for (const tower of state.towers) {
    if (!entityIds.has(tower.id) || tower.hp <= 0 || state.time + 0.0001 < tower.lastAttack + 1.2) continue
    const hasTarget = state.creeps.some((creep) => creep.team !== tower.team && creep.hp > 0 && distanceSquared(creep.pos, tower.pos) <= tower.range ** 2) ||
      state.arcanes.some((arcane) => arcane.team !== tower.team && arcane.stats.hp > 0 && arcane.respawn <= state.time && distanceSquared(arcane.pos, tower.pos) <= tower.range ** 2)
    if (hasTarget) due.add(tower.id)
  }
  for (const structure of state.structures) {
    if (
      !entityIds.has(structure.id) || structure.hp <= 0 || structure.kind !== 'tower_tier_4' ||
      state.time + 0.0001 < structure.lastAttack + 1.05
    ) continue
    const hasTarget = state.creeps.some((creep) => creep.team !== structure.team && creep.hp > 0 && distanceSquared(creep.pos, structure.pos) <= structure.range ** 2) ||
      state.arcanes.some((arcane) => arcane.team !== structure.team && arcane.stats.hp > 0 && arcane.respawn <= state.time && distanceSquared(arcane.pos, structure.pos) <= structure.range ** 2)
    if (hasTarget) due.add(structure.id)
  }
  for (const camp of state.camps) {
    if (!entityIds.has(camp.id) || camp.hp <= 0 || state.time + 0.0001 < camp.lastAttack + 1.35) continue
    const leashRange = Math.max(8, camp.range + 2.5)
    const hasTarget = state.arcanes.some((arcane) => arcane.stats.hp > 0 && arcane.respawn <= state.time && distanceSquared(arcane.pos, camp.pos) <= leashRange ** 2) ||
      state.creeps.some((creep) => creep.hp > 0 && creep.pullCampId === camp.id && distanceSquared(creep.pos, camp.pos) <= leashRange ** 2)
    if (hasTarget) due.add(camp.id)
  }
  if (
    entityIds.has(state.boss.id) && state.boss.hp > 0 &&
    state.time + 0.0001 >= state.boss.lastAttack + 1.05
  ) {
    const bossLeashRange = Math.max(10, state.boss.range + 3.5)
    const bossHasTarget = state.arcanes.some((arcane) => arcane.stats.hp > 0 && arcane.respawn <= state.time && distanceSquared(arcane.pos, state.boss.pos) <= bossLeashRange ** 2)
    if (bossHasTarget) due.add(state.boss.id)
  }
  return due
}

function getDueTacticalArcaneAttackIds(state: SimulationState, entityIds: ReadonlySet<string>) {
  const due = new Set<string>()
  for (const arcane of state.arcanes) {
    if (
      entityIds.has(arcane.id) && arcane.combatTargetId &&
      arcane.stats.hp > 0 && arcane.respawn <= state.time && !arcane.channeling &&
      state.time + 0.0001 >= arcane.lastAttack + getEffectiveArcaneAttackCooldown(state, arcane)
    ) due.add(arcane.id)
  }
  return due
}

function resolveTacticalArcaneBasicAttacks(state: SimulationState, arcaneIds: ReadonlySet<string>) {
  for (const arcane of state.arcanes) {
    if (!arcaneIds.has(arcane.id) || isArcaneAttackDisabled(state, arcane)) continue
    const retainedTarget = getRetainedArcaneCombatTarget(state, arcane)
    if (!retainedTarget) continue
    performArcaneBasicAttack(state, arcane, retainedTarget.target)
  }
}

function hasDeadSimulationEntity(state: SimulationState) {
  return state.creeps.some((creep) => creep.hp <= 0) ||
    state.summons.some((summon) => summon.hp <= 0 || summon.expiresAt <= state.time) ||
    state.camps.some((camp) => camp.hp <= 0 && camp.respawn <= state.time) ||
    (state.boss.hp <= 0 && state.boss.respawn <= state.time) ||
    state.arcanes.some((arcane) => arcane.stats.hp <= 0 && arcane.respawn <= state.time)
}

function getMatchWinner(state: SimulationState): TeamId | undefined {
  return state.bases.find((base) => base.hp <= 0)?.team === 'dawn'
    ? 'dusk'
    : state.bases.find((base) => base.hp <= 0)?.team === 'dusk'
      ? 'dawn'
      : undefined
}

export function resetDisengagedNeutralCamps(camps: Camp[], time: number) {
  return camps.map((camp) => {
    const disengaged = camp.hp > 0 && camp.lastDamagedAt !== undefined && time - camp.lastDamagedAt >= 8
    if (!disengaged) return camp
    return {
      ...camp,
      hp: camp.maxHp,
      lastHitBy: undefined,
      aggroTargetId: undefined,
      aggroUntil: undefined,
      lastDamagedAt: undefined,
    }
  })
}

export function cloneSimulationStateForTick(state: SimulationState): SimulationState {
  const creepSnapshots = state.creeps.map((creep) => ({
    ...creep,
    pos: { ...creep.pos },
    motionPlan: creep.motionPlan ? {
      ...creep.motionPlan,
      from: { ...creep.motionPlan.from },
      destination: { ...creep.motionPlan.destination },
    } : undefined,
    lastHitBy: creep.lastHitBy ? { ...creep.lastHitBy } : undefined,
  }))
  const clonedCreeps = state.creepStorageMode === 'soa'
    ? cloneCreepsIntoComponentStore(creepSnapshots)
    : undefined
  return {
    ...state,
    kills: { ...state.kills },
    teamPlans: { ...state.teamPlans },
    combatBlackboards: cloneCombatBlackboardState(state.combatBlackboards),
    teamMemory: {
      dawn: [...state.teamMemory.dawn],
      dusk: [...state.teamMemory.dusk],
    },
    teamCalls: { ...state.teamCalls },
    teamAuras: { ...state.teamAuras },
    teamFortifications: {
      dawn: { ...state.teamFortifications.dawn },
      dusk: { ...state.teamFortifications.dusk },
    },
    events: [...state.events],
    effects: state.effects.map((effect) => ({ ...effect, from: { ...effect.from }, to: { ...effect.to } })),
    timedEffects: state.timedEffects.map((effect) => ({ ...effect, modifiers: effect.modifiers ? { ...effect.modifiers } : undefined })),
    deathMarkers: state.deathMarkers.map((marker) => ({ ...marker, pos: { ...marker.pos } })),
    denyMarkers: state.denyMarkers.map((marker) => ({ ...marker, pos: { ...marker.pos } })),
    goldMarkers: state.goldMarkers.map((marker) => ({ ...marker, pos: { ...marker.pos } })),
    skillMarkers: (state.skillMarkers ?? []).map((marker) => ({ ...marker, pos: { ...marker.pos } })),
    recentTeleports: (state.recentTeleports ?? []).map((record) => ({ ...record, pos: { ...record.pos } })),
    arcanes: state.arcanes.map((arcane) => ({
      ...arcane,
      pos: { ...arcane.pos },
      target: { ...arcane.target },
      movementDestination: arcane.movementDestination ? { ...arcane.movementDestination } : undefined,
      lastDecisionPos: { ...arcane.lastDecisionPos },
      itemCooldowns: { ...arcane.itemCooldowns },
      skillStates: Object.fromEntries(Object.entries(arcane.skillStates).map(([key, value]) => [key, {
        ...value,
        ...(value.positions ? { positions: value.positions.map((position) => ({ ...position })) } : {}),
      }])),
      skillLevels: { ...arcane.skillLevels },
      channeling: arcane.channeling ? { ...arcane.channeling, target: { ...arcane.channeling.target } } : undefined,
      travelPlan: arcane.travelPlan ? {
        ...arcane.travelPlan,
        from: { ...arcane.travelPlan.from },
        destination: { ...arcane.travelPlan.destination },
      } : undefined,
      items: [...arcane.items],
      stats: { ...arcane.stats },
      lastHitBy: arcane.lastHitBy ? { ...arcane.lastHitBy } : undefined,
    })),
    creepComponents: clonedCreeps?.store,
    creeps: clonedCreeps?.creeps ?? creepSnapshots,
    summons: state.summons.map((summon) => ({
      ...summon,
      pos: { ...summon.pos },
      lastHitBy: summon.lastHitBy ? { ...summon.lastHitBy } : undefined,
    })),
    towers: state.towers.map((tower) => ({ ...tower, pos: { ...tower.pos } })),
    structures: state.structures.map((structure) => ({ ...structure, pos: { ...structure.pos } })),
    bases: state.bases.map((base) => ({ ...base, pos: { ...base.pos } })),
    camps: state.camps.map((camp) => ({
      ...camp,
      pos: { ...camp.pos },
      lastHitBy: camp.lastHitBy ? { ...camp.lastHitBy } : undefined,
    })),
    runes: state.runes.map((rune) => ({ ...rune, pos: { ...rune.pos } })),
    boss: {
      ...state.boss,
      pos: { ...state.boss.pos },
      lastHitBy: state.boss.lastHitBy ? { ...state.boss.lastHitBy } : undefined,
    },
  }
}

// O frame de replay é deliberadamente uma projeção, não uma cópia do estado de
// simulação. O tipo mantém compatibilidade estrutural com os leitores da UI,
// enquanto `createMatchRenderFrame` só materializa os campos que eles exibem.
// Campos de mecânica (pathfinding, aggro, last-hit e decisões antigas) nunca
// cruzam a fronteira do worker.
type RenderStatsFrame = [
  number, number, number, number, number, number, number, number, AttackType,
  number, number, number, number, number, number, number, number, number,
]

type RenderArcaneDetailFrame = [
  number, number, number, number, number, number, string, string, PlayerModeType,
  string, number, number, ExecutionFailureType | undefined, DecisionStatus, number,
  string[], Record<string, number>, number, number, ChannelingAction | undefined,
  SkillLevels, number, number, number, number, number, number, number, number,
  number, number, number, number, number, number, number, number, RenderStatsFrame,
  Record<string, RuntimeParentSkillState>,
]

type RenderArcaneFrame = [
  number, number, number, number, number, number, number, number,
  ChannelingAction | undefined,
]

type RenderCreepFrame = [string, TeamId, LaneId, LaneCreepKind, number, number, number, number, number]
type RenderSummonFrame = [
  string, string, string, string, TeamId, number, number, number, number, number,
  number, number, number, number, number, number, number, number, number,
  SkillSummonArchetype, boolean, boolean, number, number, boolean, string | undefined,
  SummonVariant | undefined, string | undefined, number | undefined, number | undefined, number | undefined,
  number | undefined, number | undefined, number | undefined,
]
type RenderAttackEffectFrame = [AttackEffect['kind'], EntityKind, TeamId, number, number, number, number, number, number, AttackEffect['action'], string]
type RenderMarkerFrame = [TeamId, number, number, number, number]
type RenderGoldMarkerFrame = [...RenderMarkerFrame, number]
type RenderSkillMarkerFrame = [...RenderMarkerFrame, string]
type RenderRuneFrame = [string, RuneKind, number, number, number, number | undefined, PowerRuneKind | undefined, TeamId | undefined, number]

// Compact worker-to-UI transport. Stable entities use MatchStaticData and only
// dynamic values cross the worker boundary on every frame.
export type MatchRenderFrame = {
  matchSeed: string
  time: number
  kills: [number, number]
  winner?: TeamId
  details?: MatchRenderDetails
  effects: RenderAttackEffectFrame[]
  timedEffects: TimedEffect[]
  deathMarkers: Array<[string, ...RenderMarkerFrame]>
  denyMarkers: RenderMarkerFrame[]
  goldMarkers: RenderGoldMarkerFrame[]
  skillMarkers: RenderSkillMarkerFrame[]
  recentTeleports: Array<[TeamId, number, number, number]>
  arcanes: RenderArcaneFrame[]
  creeps: RenderCreepFrame[]
  summons: RenderSummonFrame[]
  towerHp: number[]
  structureHp: number[]
  baseHp: number[]
  camps: Array<[number, number, number, number]>
  runes: RenderRuneFrame[]
  boss: [number, number, number, number, number]
}

export type MatchRenderDetails = {
  teamPlans: Partial<Record<TeamId, TeamPlan>>
  combatBlackboards: CombatBlackboardState
  teamMemory: Record<TeamId, AiMemoryEvent[]>
  teamAuras: Partial<Record<TeamId, TeamAura>>
  teamFortifications: [TeamFortification, TeamFortification]
  events: MatchEvent[]
  arcanes: RenderArcaneDetailFrame[]
  creeps: Array<[string, number, number]>
}

// Dados cuja identidade não muda durante uma partida. Este catálogo é enviado
// uma única vez antes do replay; a próxima etapa troca as cópias por-frame por
// índices deste pacote ao materializar o frame ativo na UI.
export type MatchStaticData = {
  matchSeed: string
  arcanes: Array<Pick<Arcane, 'id' | 'team' | 'player' | 'name' | 'heroDefinitionId' | 'role' | 'lane' | 'portrait'>>
  towers: Array<Pick<Tower, 'id' | 'team' | 'lane' | 'tier' | 'pos' | 'maxHp' | 'damage' | 'range'>>
  structures: Array<Pick<Structure, 'id' | 'team' | 'kind' | 'lane' | 'side' | 'pos' | 'maxHp' | 'damage' | 'range'>>
  bases: Array<Pick<Base, 'id' | 'team' | 'pos' | 'maxHp'>>
  camps: Array<Pick<Camp, 'id' | 'name' | 'strength' | 'pos' | 'maxHp' | 'damage' | 'range'>>
  boss: Pick<Boss, 'id' | 'name' | 'damage' | 'range'>
}

export function createMatchStaticData(state: SimulationState): MatchStaticData {
  return {
    matchSeed: state.matchSeed,
    arcanes: state.arcanes.map(({ id, team, player, name, heroDefinitionId, role, lane, portrait }) => ({ id, team, player, name, heroDefinitionId, role, lane, portrait })),
    towers: state.towers.map(({ id, team, lane, tier, pos, maxHp, damage, range }) => ({ id, team, lane, tier, pos: { ...pos }, maxHp, damage, range })),
    structures: state.structures.map(({ id, team, kind, lane, side, pos, maxHp, damage, range }) => ({ id, team, kind, lane, side, pos: { ...pos }, maxHp, damage, range })),
    bases: state.bases.map(({ id, team, pos, maxHp }) => ({ id, team, pos: { ...pos }, maxHp })),
    camps: state.camps.map(({ id, name, strength, pos, maxHp, damage, range }) => ({ id, name, strength, pos: { ...pos }, maxHp, damage, range })),
    boss: { id: state.boss.id, name: state.boss.name, damage: state.boss.damage, range: state.boss.range },
  }
}

function renderNumber(value: number) {
  return Math.round(value * 1000) / 1000
}

function createMatchRenderDetails(state: SimulationState): MatchRenderDetails {
  return {
    teamPlans: Object.fromEntries(Object.entries(state.teamPlans).map(([team, plan]) => [
      team,
      plan ? { ...plan, targetPosition: plan.targetPosition ? { ...plan.targetPosition } : undefined, reasonTags: [...plan.reasonTags] } : undefined,
    ])) as Partial<Record<TeamId, TeamPlan>>,
    combatBlackboards: cloneCombatBlackboardState(state.combatBlackboards),
    teamMemory: {
      dawn: state.teamMemory.dawn.map((event) => ({ ...event, position: { ...event.position }, tags: [...event.tags] })),
      dusk: state.teamMemory.dusk.map((event) => ({ ...event, position: { ...event.position }, tags: [...event.tags] })),
    },
    teamAuras: { ...state.teamAuras },
    teamFortifications: [{ ...state.teamFortifications.dawn }, { ...state.teamFortifications.dusk }],
    events: state.events.map((event) => ({ ...event })),
    arcanes: state.arcanes.map((arcane) => [
      renderNumber(arcane.pos.x), renderNumber(arcane.pos.y), renderNumber(arcane.respawn), arcane.aggression,
      arcane.visionRange, arcane.shotcalling, arcane.macroDecision,
      arcane.microDecision, arcane.aiMode, arcane.aiReason,
      arcane.aiExecutionChance, arcane.aiExecutionDelay, arcane.aiFailure,
      arcane.decisionStatus, arcane.nextDecisionAt, [...arcane.items],
      { ...arcane.itemCooldowns }, arcane.tpScrolls, arcane.tpCooldownUntil,
      arcane.channeling ? { ...arcane.channeling, target: { ...arcane.channeling.target } } : undefined,
      { ...arcane.skillLevels }, arcane.unspentSkillPoints, arcane.statBonusLevels,
      arcane.earnedGold, arcane.kills, arcane.deaths, arcane.assists,
      arcane.damageDealt, arcane.heroDamageDealt, arcane.structureDamageDealt,
      arcane.damageTaken, arcane.healingDone, arcane.healingReceived,
      arcane.laneCreepKills, arcane.denies, arcane.neutralKills,
      arcane.objectiveKills, statsToRenderFrame(arcane.stats),
      Object.fromEntries(Object.entries(arcane.skillStates).map(([key, value]) => [key, {
        ...value,
        ...(value.positions ? { positions: value.positions.map((position) => ({ ...position })) } : {}),
      }])),
    ]),
    creeps: state.creeps.map((creep) => [creep.id, renderNumber(creep.damage), renderNumber(creep.visionRange)]),
  }
}

export function createMatchRenderFrame(state: SimulationState, includeDetails = true): MatchRenderFrame {
  return {
    matchSeed: state.matchSeed,
    time: state.time,
    kills: [state.kills.dawn, state.kills.dusk],
    winner: state.winner,
    details: includeDetails ? createMatchRenderDetails(state) : undefined,
    effects: state.effects.map((effect) => [effect.kind, effect.targetKind, effect.team, renderNumber(effect.from.x), renderNumber(effect.from.y), renderNumber(effect.to.x), renderNumber(effect.to.y), renderNumber(effect.createdAt), effect.duration, effect.action, effect.sourceId]),
    timedEffects: state.timedEffects.map((effect) => ({ ...effect, modifiers: effect.modifiers ? { ...effect.modifiers } : undefined })),
    deathMarkers: state.deathMarkers.map((marker) => [marker.arcane, marker.team, marker.pos.x, marker.pos.y, marker.createdAt, marker.expiresAt]),
    denyMarkers: state.denyMarkers.map((marker) => [marker.team, marker.pos.x, marker.pos.y, marker.createdAt, marker.expiresAt]),
    goldMarkers: state.goldMarkers.map((marker) => [marker.team, marker.pos.x, marker.pos.y, marker.createdAt, marker.expiresAt, marker.amount]),
    skillMarkers: state.skillMarkers.map((marker) => [marker.team, marker.pos.x, marker.pos.y, marker.createdAt, marker.expiresAt, marker.label]),
    recentTeleports: state.recentTeleports.map((record) => [record.team, record.pos.x, record.pos.y, record.startedAt]),
    arcanes: state.arcanes.map((arcane) => {
      const position = arcane.travelPlan ? sampleArcaneTravelPlan(arcane.travelPlan, state.time) : arcane.pos
      return [
        renderNumber(position.x), renderNumber(position.y), renderNumber(arcane.respawn), renderNumber(arcane.stats.maxHp),
        renderNumber(arcane.stats.hp), renderNumber(arcane.stats.maxMana), renderNumber(arcane.stats.mana), renderNumber(arcane.stats.range),
        arcane.channeling ? { ...arcane.channeling, target: { ...arcane.channeling.target } } : undefined,
      ]
    }),
    creeps: state.creeps.map((creep) => {
      const position = creep.motionPlan ? sampleCreepMotionPlan(creep.motionPlan, state.time) : creep.pos
      return [
        creep.id, creep.team, creep.lane, creep.type, renderNumber(position.x),
        renderNumber(position.y), renderNumber(creep.hp), renderNumber(creep.maxHp),
        renderNumber(creep.range),
      ]
    }),
    summons: state.summons.map((summon) => [
      summon.id, summon.ownerId, summon.sourceSkillId, summon.name, summon.team,
      renderNumber(summon.pos.x), renderNumber(summon.pos.y), renderNumber(summon.hp),
      renderNumber(summon.maxHp), renderNumber(summon.damage), renderNumber(summon.range),
      renderNumber(summon.visionRange), renderNumber(summon.moveSpeed), renderNumber(summon.attackInterval),
      renderNumber(summon.lastAttack), renderNumber(summon.spawnedAt), renderNumber(summon.expiresAt),
      renderNumber(summon.goldReward), renderNumber(summon.xpReward), summon.archetype,
      summon.canMove, summon.canAttack, renderNumber(summon.damageTakenMultiplier),
      renderNumber(summon.healingAuraPct), summon.channelBound, summon.targetId,
      summon.variant,
      summon.unitSeedId, summon.nextAbilityAt, summon.recallStartedAt, summon.abilityCounter,
      summon.sharedBuffUntil, summon.cloakLayers, summon.cloakNextRecoveryAt,
    ]),
    towerHp: state.towers.map((tower) => renderNumber(tower.hp)),
    structureHp: state.structures.map((structure) => renderNumber(structure.hp)),
    baseHp: state.bases.map((base) => renderNumber(base.hp)),
    camps: state.camps.map((camp) => [renderNumber(camp.hp), camp.level, renderNumber(camp.respawn), camp.stackCount]),
    runes: state.runes.map((rune) => [rune.id, rune.kind, renderNumber(rune.pos.x), renderNumber(rune.pos.y), renderNumber(rune.spawnedAt), rune.expiresAt === undefined ? undefined : renderNumber(rune.expiresAt), rune.power, rune.side, rune.spawnIndex]),
    boss: [renderNumber(state.boss.pos.x), renderNumber(state.boss.pos.y), renderNumber(state.boss.hp), renderNumber(state.boss.maxHp), renderNumber(state.boss.respawn)],
  }
}

function statsToRenderFrame(stats: Stats): RenderStatsFrame {
  return [
    renderNumber(stats.maxHp), renderNumber(stats.hp), renderNumber(stats.maxMana), renderNumber(stats.mana), renderNumber(stats.damage),
    renderNumber(stats.damageMin), renderNumber(stats.damageMax), renderNumber(stats.range), stats.attackType,
    renderNumber(stats.attackSpeed), renderNumber(stats.armor), renderNumber(stats.magicResistance),
    renderNumber(stats.statusResistance), renderNumber(stats.slowResistance), renderNumber(stats.moveSpeed),
    stats.level, renderNumber(stats.xp), renderNumber(stats.gold),
  ]
}

function statsFromRenderFrame(stats: RenderStatsFrame): Stats {
  return {
    maxHp: stats[0], hp: stats[1], maxMana: stats[2], mana: stats[3],
    damage: stats[4], damageMin: stats[5], damageMax: stats[6], range: stats[7],
    attackType: stats[8], attackSpeed: stats[9], armor: stats[10],
    magicResistance: stats[11], statusResistance: stats[12],
    slowResistance: stats[13], moveSpeed: stats[14], level: stats[15],
    xp: stats[16], gold: stats[17],
  }
}

// Only the currently displayed frame is expanded. Buffered frames remain in
// their compact transport form, sharing immutable data from this catalog.
export function materializeMatchRenderFrame(frame: MatchRenderFrame, staticData: MatchStaticData, details = frame.details): SimulationState {
  if (!details) throw new Error('Frame de detalhes ausente durante a materialização')
  const creepDetails = new Map(details.creeps.map(([id, damage, visionRange]) => [id, [damage, visionRange] as const]))
  const arcanes = details.arcanes.map((arcane, index): Arcane => {
    const fixed = staticData.arcanes[index]
    const motion = frame.arcanes[index]
    const pos = { x: motion[0], y: motion[1] }
    const stats = statsFromRenderFrame(arcane[37])
    stats.maxHp = motion[3]
    stats.hp = motion[4]
    stats.maxMana = motion[5]
    stats.mana = motion[6]
    stats.range = motion[7]
    return {
      ...fixed,
      pos,
      target: { ...pos },
      pathIndex: 0,
      respawn: motion[2],
      lastAttack: 0,
      nextCombatEvaluationAt: frame.time,
      combatTargetId: undefined,
      combatTargetIntent: undefined,
      aggression: arcane[3],
      visionRange: arcane[4],
      shotcalling: arcane[5],
      macroDecision: arcane[6],
      microDecision: arcane[7],
      aiMode: arcane[8],
      aiReason: arcane[9],
      aiExecutionChance: arcane[10],
      aiExecutionDelay: arcane[11],
      aiFailure: arcane[12],
      decisionStatus: arcane[13],
      decisionTempo: 1,
      nextDecisionAt: arcane[14],
      lastDecisionAt: 0,
      forceDecision: false,
      lastDecisionHpRatio: 1,
      lastDecisionManaRatio: 1,
      lastDecisionPos: { ...pos },
      decision: arcane[7],
      items: arcane[15],
      itemCooldowns: arcane[16],
      skillStates: arcane[38] ?? {},
      tpScrolls: arcane[17],
      tpCooldownUntil: arcane[18],
      channeling: motion[8],
      skillLevels: arcane[20],
      unspentSkillPoints: arcane[21],
      statBonusLevels: arcane[22],
      earnedGold: arcane[23],
      kills: arcane[24], deaths: arcane[25], assists: arcane[26],
      damageDealt: arcane[27], heroDamageDealt: arcane[28],
      structureDamageDealt: arcane[29], damageTaken: arcane[30],
      healingDone: arcane[31], healingReceived: arcane[32],
      laneCreepKills: arcane[33], denies: arcane[34], neutralKills: arcane[35],
      objectiveKills: arcane[36], stats,
    }
  })

  return {
    runtimeToken: {},
    matchSeed: frame.matchSeed,
    creepMotionMode: 'planned',
    creepSpatialMode: 'persistent',
    creepStorageMode: 'object',
    creepComponents: undefined,
    creepSpatialRevision: 0,
    arcaneTravelMode: 'planned',
    time: frame.time,
    nextWave: 0,
    kills: { dawn: frame.kills[0], dusk: frame.kills[1] },
    winner: frame.winner,
    nextTeamDecisionAt: 0,
    nextCombatAiAt: frame.time + COMBAT_AI_RULES.updateIntervalSeconds,
    teamPlans: details.teamPlans,
    combatBlackboards: cloneCombatBlackboardState(details.combatBlackboards),
    teamMemory: details.teamMemory,
    teamCalls: {},
    teamAuras: details.teamAuras,
    teamFortifications: { dawn: details.teamFortifications[0], dusk: details.teamFortifications[1] },
    events: details.events,
    effects: frame.effects.map((effect, index) => ({
      id: `fx-${frame.time}-${index}`,
      kind: effect[0], targetKind: effect[1], team: effect[2],
      from: { x: effect[3], y: effect[4] }, to: { x: effect[5], y: effect[6] },
      createdAt: effect[7], duration: effect[8], action: effect[9], sourceId: effect[10],
    })),
    timedEffects: frame.timedEffects,
    deathMarkers: frame.deathMarkers.map((marker, index) => ({ id: `death-${frame.time}-${index}`, arcane: marker[0], team: marker[1], pos: { x: marker[2], y: marker[3] }, createdAt: marker[4], expiresAt: marker[5] })),
    denyMarkers: frame.denyMarkers.map((marker, index) => ({ id: `deny-${frame.time}-${index}`, team: marker[0], pos: { x: marker[1], y: marker[2] }, createdAt: marker[3], expiresAt: marker[4] })),
    goldMarkers: frame.goldMarkers.map((marker, index) => ({ id: `gold-${frame.time}-${index}`, team: marker[0], pos: { x: marker[1], y: marker[2] }, createdAt: marker[3], expiresAt: marker[4], amount: marker[5] })),
    skillMarkers: frame.skillMarkers.map((marker, index) => ({ id: `skill-${frame.time}-${index}`, team: marker[0], pos: { x: marker[1], y: marker[2] }, createdAt: marker[3], expiresAt: marker[4], label: marker[5] })),
    recentTeleports: frame.recentTeleports.map((record) => ({ team: record[0], pos: { x: record[1], y: record[2] }, startedAt: record[3] })),
    arcanes,
    creeps: frame.creeps.map((creep): Creep => {
      const detail = creepDetails.get(creep[0])
      const fallback = detail ? undefined : getLaneCreepStats(creep[3], frame.time, 'normal')
      return {
        id: creep[0], team: creep[1], lane: creep[2], type: creep[3], seedId: fallback?.seedId ?? creep[3],
        pos: { x: creep[4], y: creep[5] }, pathIndex: 0, hp: creep[6], maxHp: creep[7],
        damage: detail?.[0] ?? fallback?.damage ?? 0, range: creep[8],
        visionRange: detail?.[1] ?? fallback?.visionRange ?? 0,
        goldReward: 0, xpReward: 0, lastAttack: 0,
      }
    }),
    summons: frame.summons.map((summon): SummonedUnit => ({
      id: summon[0], ownerId: summon[1], sourceSkillId: summon[2], name: summon[3], team: summon[4],
      pos: { x: summon[5], y: summon[6] }, hp: summon[7], maxHp: summon[8], damage: summon[9],
      range: summon[10], visionRange: summon[11], moveSpeed: summon[12], attackInterval: summon[13],
      lastAttack: summon[14], spawnedAt: summon[15], expiresAt: summon[16], goldReward: summon[17],
      xpReward: summon[18], archetype: summon[19], canMove: summon[20], canAttack: summon[21],
      damageTakenMultiplier: summon[22], healingAuraPct: summon[23], channelBound: summon[24],
      targetId: summon[25], variant: summon[26], unitSeedId: summon[27],
      nextAbilityAt: summon[28], recallStartedAt: summon[29], abilityCounter: summon[30],
      sharedBuffUntil: summon[31], cloakLayers: summon[32], cloakNextRecoveryAt: summon[33],
    })),
    towers: staticData.towers.map((tower, index): Tower => ({ ...tower, pos: tower.pos, hp: frame.towerHp[index] ?? 0, lastAttack: 0 })),
    structures: staticData.structures.map((structure, index): Structure => ({ ...structure, pos: structure.pos, hp: frame.structureHp[index] ?? 0, lastAttack: 0 })),
    bases: staticData.bases.map((base, index): Base => ({ ...base, pos: base.pos, hp: frame.baseHp[index] ?? 0 })),
    camps: staticData.camps.map((camp, index): Camp => ({
      ...camp, pos: camp.pos, hp: frame.camps[index]?.[0] ?? 0,
      level: frame.camps[index]?.[1] ?? 1, respawn: frame.camps[index]?.[2] ?? 0,
      stackCount: frame.camps[index]?.[3] ?? 0, lastAttack: 0, lastStackAttemptAt: 0,
    })),
    runes: frame.runes.map((rune): MapRune => ({ id: rune[0], kind: rune[1], pos: { x: rune[2], y: rune[3] }, spawnedAt: rune[4], expiresAt: rune[5], power: rune[6], side: rune[7], spawnIndex: rune[8] })),
    boss: {
      ...staticData.boss, pos: { x: frame.boss[0], y: frame.boss[1] }, pathIndex: 0,
      hp: frame.boss[2], maxHp: frame.boss[3], respawn: frame.boss[4], lastAttack: 0,
    },
  }
}

export function spawnRunesForTick(state: SimulationState, previousTime: number) {
  let runes = state.runes.filter((rune) => rune.expiresAt === undefined || rune.expiresAt > state.time)
  const addRunes = (newRunes: MapRune[]) => {
    const existingIds = new Set(runes.map((rune) => rune.id))
    runes = [
      ...runes,
      ...newRunes.filter((rune) => !existingIds.has(rune.id)),
    ]
  }

  if (crossedInterval(previousTime, state.time, NON_COMBAT_RULES.map.bountyRuneIntervalSeconds, 0)) {
    const spawnIndex = Math.floor(state.time / NON_COMBAT_RULES.map.bountyRuneIntervalSeconds)
    addRunes(createBountyRunes(spawnIndex, state.time))
  }

  if (crossedInterval(previousTime, state.time, NON_COMBAT_RULES.map.powerRuneIntervalSeconds, NON_COMBAT_RULES.map.powerRuneStartTimeSeconds)) {
    const spawnIndex = Math.floor((state.time - NON_COMBAT_RULES.map.powerRuneStartTimeSeconds) / NON_COMBAT_RULES.map.powerRuneIntervalSeconds)
    addRunes(createPowerRunes(spawnIndex, state.time))
  }

  if (crossedInterval(previousTime, state.time, NON_COMBAT_RULES.map.wisdomRuneIntervalSeconds, NON_COMBAT_RULES.map.wisdomRuneStartTimeSeconds)) {
    const spawnIndex = Math.floor((state.time - NON_COMBAT_RULES.map.wisdomRuneStartTimeSeconds) / NON_COMBAT_RULES.map.wisdomRuneIntervalSeconds)
    addRunes(createWisdomRunes(spawnIndex, state.time))
  }

  if (crossedInterval(previousTime, state.time, NON_COMBAT_RULES.map.lotusIntervalSeconds, NON_COMBAT_RULES.map.lotusIntervalSeconds)) {
    const spawnIndex = Math.floor(state.time / NON_COMBAT_RULES.map.lotusIntervalSeconds)
    addRunes(createLotusRunes(runes, spawnIndex, state.time))
  }

  return runes
}

export function crossedInterval(previousTime: number, currentTime: number, interval: number, startTime: number) {
  if (currentTime < startTime) return false
  const previousBucket = previousTime < startTime ? -1 : Math.floor((previousTime - startTime) / interval)
  const currentBucket = Math.floor((currentTime - startTime) / interval)
  return currentBucket > previousBucket
}

export function createBountyRunes(spawnIndex: number, time: number): MapRune[] {
  return runeSpawnPoints.bounty.map((pos, index) => ({
    id: `rune-bounty-${spawnIndex}-${index}`,
    kind: 'bounty',
    pos,
    side: getBountyRuneSide(pos),
    spawnedAt: time,
    expiresAt: time + NON_COMBAT_RULES.map.bountyRuneIntervalSeconds,
    spawnIndex,
  }))
}

export function getBountyRuneSide(point: Point): TeamId {
  return distance(point, teamInfo.dawn.base) <= distance(point, teamInfo.dusk.base) ? 'dawn' : 'dusk'
}

export function createPowerRunes(spawnIndex: number, time: number): MapRune[] {
  const pointIndex = spawnIndex % runeSpawnPoints.power.length
  return [{
    id: `rune-power-${spawnIndex}-${pointIndex}`,
    kind: 'power',
    pos: runeSpawnPoints.power[pointIndex],
    spawnedAt: time,
    expiresAt: time + NON_COMBAT_RULES.map.powerRuneIntervalSeconds,
    power: powerRuneCycle[spawnIndex % powerRuneCycle.length],
    spawnIndex,
  }]
}

export function createWisdomRunes(spawnIndex: number, time: number): MapRune[] {
  return runeSpawnPoints.wisdom.map((pos, index) => ({
    id: `rune-wisdom-${spawnIndex}-${index}`,
    kind: 'wisdom',
    pos,
    side: index === 0 ? 'dawn' : 'dusk',
    spawnedAt: time,
    expiresAt: time + NON_COMBAT_RULES.map.wisdomRuneIntervalSeconds,
    spawnIndex,
  }))
}

export function createLotusRunes(existingRunes: MapRune[], spawnIndex: number, time: number): MapRune[] {
  return runeSpawnPoints.lotus.flatMap((pos, index) => {
    const side: TeamId = index === 0 ? 'dawn' : 'dusk'
    const stored = existingRunes.filter((rune) => rune.kind === 'lotus' && rune.side === side).length
    if (stored >= NON_COMBAT_RULES.map.maxLotusStored) return []
    return [{
      id: `rune-lotus-${side}-${spawnIndex}`,
      kind: 'lotus' as const,
      pos,
      side,
      spawnedAt: time,
      spawnIndex,
    }]
  })
}

export function processJungleStacks(state: SimulationState, previousTime: number): SimulationState {
  if (!crossedMinuteSecond(previousTime, state.time, NON_COMBAT_RULES.map.jungleStackWindowSecond)) return state

  const next = state
  const stackMinute = Math.floor(state.time / 60)
  const assignedStackers = new Set<string>()
  next.camps = next.camps.map((camp) => {
    if (camp.hp <= 0 || camp.stackCount >= NON_COMBAT_RULES.map.maxJungleStacks) return camp
    if (Math.floor(camp.lastStackAttemptAt / 60) === stackMinute) return camp

    const stacker = getJungleStacker(next, camp, assignedStackers)
    if (!stacker) return { ...camp, lastStackAttemptAt: next.time }
    assignedStackers.add(stacker.id)

    const chance = getJungleStackChance(next, camp, stacker)
    const roll = deterministicPercent(`${camp.id}-${stacker.id}`, stackMinute)
    if (roll > chance * 100) return { ...camp, lastStackAttemptAt: next.time }

    const baseStats = getCampStats(camp.strength)
    const newStackCount = camp.stackCount + 1
    const extraHp = Math.round(baseStats.hp * NON_COMBAT_RULES.map.jungleStackValueMultiplier)
    addJungleStackEvent(next, camp, stacker, newStackCount)

    return {
      ...camp,
      hp: camp.hp + extraHp,
      maxHp: Math.round(stackedCampValue(baseStats.hp, newStackCount)),
      damage: Math.round(baseStats.damage * (1 + newStackCount * 0.1)),
      stackCount: newStackCount,
      lastStackAttemptAt: next.time,
    }
  })

  return next
}

export function crossedMinuteSecond(previousTime: number, currentTime: number, second: number) {
  if (currentTime < second) return false
  const previousBucket = Math.floor((previousTime - second) / 60)
  const currentBucket = Math.floor((currentTime - second) / 60)
  return currentBucket > previousBucket
}

export function getJungleStacker(state: SimulationState, camp: Camp, excludedArcaneIds = new Set<string>()) {
  return state.arcanes
    .filter((arcane) => (
      !excludedArcaneIds.has(arcane.id) &&
      arcane.stats.hp > 0 &&
      arcane.respawn <= state.time &&
      distance(arcane.pos, camp.pos) <= getJungleStackRadius(arcane, camp) &&
      !arcane.microDecision.startsWith('Limpando campo') &&
      !arcane.microDecision.startsWith('Atacando campo')
    ))
    .map((arcane) => ({
      arcane,
      score: getJungleStackerScore(arcane, camp),
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)[0]?.arcane
}

export function getJungleStackRadius(arcane: Arcane, camp: Camp) {
  const supportBonus = arcane.role.includes('Support') ? 4 : 0
  const campBonus = camp.strength === 'strong' ? 2 : camp.strength === 'medium' ? 1 : 0
  return 10 + supportBonus + campBonus
}

export function getJungleStackerScore(arcane: Arcane, camp: Camp) {
  const roleScore = arcane.role === 'Dedicated Support'
    ? 42
    : arcane.role === 'Greedy Support'
      ? 34
      : arcane.role === 'Offlane'
        ? 14
        : arcane.role === 'Mid'
          ? 8
          : 4
  const hpRatio = arcane.stats.hp / Math.max(1, arcane.stats.maxHp)
  const distancePenalty = distance(arcane.pos, camp.pos) * 1.4
  const stackValue = camp.strength === 'strong' ? 16 : camp.strength === 'medium' ? 10 : 5
  return roleScore + stackValue + arcane.shotcalling * 0.18 - distancePenalty - (hpRatio < 0.45 ? 40 : 0)
}

export function getJungleStackChance(state: SimulationState, camp: Camp, stacker: Arcane) {
  const supportSkill = clampNumber((stacker.shotcalling + getRoleFarmPriority(stacker.role) * 0.35) / 140, 0.12, 0.78)
  const heroModifier = stacker.role === 'Dedicated Support'
    ? 0.18
    : stacker.role === 'Greedy Support'
      ? 0.13
      : stacker.role === 'Offlane'
        ? 0.06
        : 0.02
  const nearbyEnemyPressure = state.arcanes.filter((arcane) => (
    arcane.team !== stacker.team &&
    arcane.stats.hp > 0 &&
    arcane.respawn <= state.time &&
    distance(arcane.pos, camp.pos) <= 18
  )).length
  const visionSafety = isPointVisibleToTeam(state, stacker.team, camp.pos) ? 0.16 : 0.05
  const enemyContestRisk = nearbyEnemyPressure * 0.18 + getTeamMemoryDanger(state, stacker.team, camp.pos) / 260
  return clampNumber(stackSuccessChance(supportSkill, heroModifier, visionSafety, enemyContestRisk) * 0.55, 0.08, 0.5)
}

export function getBestJungleCampForArcane(state: SimulationState, arcane: Arcane, range: number, visibleEnemies: Arcane[]) {
  return state.camps
    .filter((camp) => camp.hp > 0 && distance(arcane.pos, camp.pos) <= range)
    .map((camp) => ({
      camp,
      assessment: getCampClearAssessment(state, arcane, camp),
      score: getCampFarmDesireScore(state, arcane, camp, visibleEnemies),
    }))
    .filter(({ assessment, score }) => assessment.canClear && score > 8)
    .sort((a, b) => (
      b.score - a.score ||
      b.assessment.healthAfterClear - a.assessment.healthAfterClear
    ))[0]?.camp
}

export function getCampClearAssessment(state: SimulationState, arcane: Arcane, camp: Camp) {
  const effectiveDamage = Math.max(1, getEffectiveArcaneDamage(state, arcane))
  const attackCooldown = Math.max(0.25, getEffectiveArcaneAttackCooldown(state, arcane))
  const damagePerSecond = effectiveDamage / attackCooldown
  const clearSeconds = camp.hp / Math.max(20, damagePerSecond)
  const incomingDamage = Math.max(1, resolveIncomingArcaneDamage(state, arcane, camp.damage, 'physical'))
  const expectedHits = Math.max(1, Math.floor(clearSeconds / 1.35))
  const expectedDamage = incomingDamage * expectedHits
  const healthAfterClear = arcane.stats.hp - expectedDamage
  const reserveHp = Math.max(arcane.stats.maxHp * 0.18, incomingDamage * 1.25)
  const canClear = clearSeconds <= 52 && healthAfterClear >= reserveHp

  return {
    canClear,
    clearSeconds,
    incomingDamage,
    expectedHits,
    expectedDamage,
    healthAfterClear,
    reserveHp,
  }
}

export function getCampFarmDesireScore(state: SimulationState, arcane: Arcane, camp: Camp, visibleEnemies: Arcane[]) {
  const farmAppetite = getRoleFarmAppetite(arcane.role)
  const farmPriority = getRoleFarmPriority(arcane.role)
  const campValue = getCampFarmValueForAi(state, arcane, camp)
  const distancePenalty = distance(arcane.pos, camp.pos) * (arcane.role === 'Safe Lane' || arcane.role === 'Mid' ? 1.05 : 1.35)
  const enemyPressure = visibleEnemies.filter((enemy) => distance(enemy.pos, camp.pos) <= 16).length * 18
  const memoryDanger = getTeamMemoryDanger(state, arcane.team, camp.pos) * 0.26
  const supportTax = farmPriority < 34 ? 42 : farmPriority < 62 ? 18 : 0
  const stackCoreBonus = camp.stackCount * farmAppetite * 18

  return campValue + stackCoreBonus - distancePenalty - enemyPressure - memoryDanger - supportTax
}

export function getCampFarmValueForAi(state: SimulationState, arcane: Arcane, camp: Camp) {
  const baseValue = camp.strength === 'strong' ? 72 : camp.strength === 'medium' ? 54 : 36
  const rewards = getCampRewards(camp, state.time)
  const rewardValue = clampNumber((rewards.gold + rewards.xp * 0.32) / 7.5, 0, 100)
  const stackUrgency = camp.stackCount * (arcane.role === 'Safe Lane' ? 24 : arcane.role === 'Mid' ? 20 : arcane.role === 'Offlane' ? 14 : arcane.role === 'Greedy Support' ? 8 : 2)

  return clampNumber(baseValue * 0.48 + rewardValue * 0.52 + stackUrgency, 0, 100)
}

export function getEstimatedLaneFarmGpm(state: SimulationState, arcane: Arcane, laneCreeps: Creep[]) {
  let firstFarmableCreep: Creep | undefined
  let expectedGold = 0
  const lastHitDamage = getArcaneLastHitDamage(state, arcane)
  for (const creep of laneCreeps) {
    if (creep.hp <= 0) continue
    firstFarmableCreep ??= creep
    const lastHitReadiness = creep.hp <= lastHitDamage * 1.8 ? 0.82 : 0.38
    expectedGold += getCreepGoldReward(creep) * lastHitReadiness
  }
  if (!firstFarmableCreep) return 0

  const travelSeconds = Math.min(8, distance(arcane.pos, firstFarmableCreep.pos) / Math.max(0.8, arcane.stats.moveSpeed))
  const cycleSeconds = clampNumber(16 + travelSeconds, 14, 36)

  return Math.round((expectedGold / cycleSeconds) * 60)
}

export function getEstimatedLanePushGpm(arcane: Arcane, creeps: Creep[]) {
  let firstVisibleCreep: Creep | undefined
  let visibleCreepCount = 0
  let expectedGold = 0
  for (const creep of creeps) {
    if (creep.hp <= 0) continue
    firstVisibleCreep ??= creep
    visibleCreepCount += 1
    expectedGold += getCreepGoldReward(creep) * 0.44
  }
  if (!firstVisibleCreep) return 0

  const waveDensityBonus = Math.min(1.28, 1 + visibleCreepCount * 0.035)
  const cycleSeconds = clampNumber(20 + distance(arcane.pos, firstVisibleCreep.pos) / Math.max(0.9, arcane.stats.moveSpeed), 18, 44)

  return Math.round((expectedGold * waveDensityBonus / cycleSeconds) * 60)
}

export function getEstimatedJungleFarmGpm(state: SimulationState, arcane: Arcane, camp: Camp) {
  const rewards = getCampRewards(camp, state.time)
  const assessment = getCampClearAssessment(state, arcane, camp)
  if (!assessment.canClear) return 0
  const clearSeconds = clampNumber(assessment.clearSeconds, 5, 45)
  const travelSeconds = distance(arcane.pos, camp.pos) / Math.max(0.8, arcane.stats.moveSpeed)
  const dangerTax = getEnemyActionThreatScore(state, arcane, camp.pos) * 0.08
  const cycleSeconds = clampNumber(clearSeconds + travelSeconds + dangerTax, 8, 58)

  return Math.round((rewards.gold / cycleSeconds) * 60)
}

export function deterministicPercent(seed: string, bucket: number) {
  let hash = 0
  const key = `${seed}-${bucket}`
  for (let index = 0; index < key.length; index += 1) {
    hash = (hash * 31 + key.charCodeAt(index)) % 10007
  }
  return (hash / 10007) * 100
}

export function addJungleStackEvent(state: SimulationState, camp: Camp, stacker: Arcane, stackCount: number) {
  state.events = addEvent(state.events, {
    id: `stack-${camp.id}-${stackCount}-${state.time}`,
    time: state.time,
    team: stacker.team,
    actor: stacker.player,
    actorTeam: stacker.team,
    victim: camp.name,
    victimTeam: stacker.team,
    detail: `stack x${stackCount}`,
  })
}

export function collectRunes(state: SimulationState): SimulationState {
  const next = state
  const collectedIds = new Set<string>()

  for (const rune of next.runes) {
    const collector = nearest(
      rune.pos,
      next.arcanes.filter((arcane) => arcane.stats.hp > 0 && arcane.respawn <= next.time),
      getRuneCollectRadius(rune),
    )
    if (!collector) continue
    collectedIds.add(rune.id)
    applyRuneReward(next, collector, rune)
  }

  if (collectedIds.size > 0) {
    next.runes = next.runes.filter((rune) => !collectedIds.has(rune.id))
  }

  return next
}

export function getRuneCollectRadius(rune: MapRune) {
  return rune.kind === 'lotus' ? 3 : 3.5
}

export function applyRuneReward(state: SimulationState, collector: Arcane, rune: MapRune) {
  if (rune.kind === 'bounty') {
    const gold = bountyRuneGold(Math.floor(state.time / 60))
    state.arcanes = state.arcanes.map((arcane) => (
      arcane.team === collector.team ? grantArcaneEconomy(arcane, gold, 0) : arcane
    ))
    addGoldMarker(state, collector.team, rune.pos, gold)
    addRuneEvent(state, collector, rune, `+${gold}g para cada Arcane`)
    return
  }

  if (rune.kind === 'wisdom') {
    const xp = wisdomRuneXp(rune.spawnIndex)
    const lowestXpAlly = [...state.arcanes]
      .filter((arcane) => arcane.team === collector.team)
      .sort((a, b) => a.stats.xp - b.stats.xp)[0]
    state.arcanes = state.arcanes.map((arcane) => {
      if (arcane.id === collector.id) return grantArcaneEconomy(arcane, 0, xp)
      if (lowestXpAlly && lowestXpAlly.id !== collector.id && arcane.id === lowestXpAlly.id) return grantArcaneEconomy(arcane, 0, Math.round(xp * 0.5))
      return arcane
    })
    addRuneEvent(state, collector, rune, `+${xp} XP`)
    return
  }

  if (rune.kind === 'lotus') {
    const value = healingLotusValue(1)
    state.arcanes = state.arcanes.map((arcane) => {
      if (arcane.id !== collector.id) return arcane
      return {
        ...arcane,
        stats: {
          ...arcane.stats,
          hp: Math.min(arcane.stats.maxHp, arcane.stats.hp + value),
          mana: Math.min(arcane.stats.maxMana, arcane.stats.mana + value),
        },
      }
    })
    addRuneEvent(state, collector, rune, `+${value} vida/mana`)
    return
  }

  const power = rune.power ?? 'damage'
  addTimedEffect(state, collector, {
    sourceId: rune.id,
    sourceName: getRuneLabel(rune),
    sourceTeam: collector.team,
    kind: 'buff',
    polarity: 'positive',
    value: 1,
    modifiers: getPowerRuneModifiers(power),
    duration: 45,
  })
  addRuneEvent(state, collector, rune, `${getPowerRuneLabel(power)} por 45s`)
}

export function getPowerRuneModifiers(power: PowerRuneKind) {
  if (power === 'haste') return { moveSpeedPct: 0.22 }
  if (power === 'arcane') return { attackSpeedPct: 0.14 }
  if (power === 'shield') return { armorFlat: 4 }
  return { damagePct: 0.18 }
}

export function getRuneGlyph(rune: MapRune) {
  if (rune.kind === 'bounty') return 'G'
  if (rune.kind === 'wisdom') return 'XP'
  if (rune.kind === 'lotus') return '+'
  if (rune.power === 'haste') return 'H'
  if (rune.power === 'arcane') return 'A'
  if (rune.power === 'shield') return 'S'
  return 'D'
}

export function getRuneTitle(rune: MapRune) {
  return `${getRuneLabel(rune)} - ${getRuneKindLabel(rune.kind)}`
}

export function getRuneLabel(rune: MapRune) {
  if (rune.kind === 'bounty') return 'Runa de Ouro'
  if (rune.kind === 'wisdom') return 'Runa de Sabedoria'
  if (rune.kind === 'lotus') return 'Lotus de Cura'
  return `Runa de Poder: ${getPowerRuneLabel(rune.power ?? 'damage')}`
}

export function getRuneKindLabel(kind: RuneKind) {
  if (kind === 'bounty') return 'Bounty'
  if (kind === 'wisdom') return 'Wisdom'
  if (kind === 'lotus') return 'Lotus'
  return 'Power'
}

export function getPowerRuneLabel(power: PowerRuneKind) {
  if (power === 'haste') return 'Haste'
  if (power === 'arcane') return 'Arcane'
  if (power === 'shield') return 'Shield'
  return 'Damage'
}

export function getRuneInspectorSubtitle(rune: MapRune, time: number) {
  const timer = rune.expiresAt ? `expira em ${Math.max(0, Math.ceil(rune.expiresAt - time))}s` : 'acumula no mapa'
  if (rune.side) return `${teamInfo[rune.side].name} side / ${timer}`
  return timer
}

export function getRuneRewardLabel(rune: MapRune, time: number) {
  if (rune.kind === 'bounty') return `${bountyRuneGold(Math.floor(time / 60))}g/time`
  if (rune.kind === 'wisdom') return `${wisdomRuneXp(rune.spawnIndex)} XP`
  if (rune.kind === 'lotus') return `${healingLotusValue(1)} vida/mana`
  return getPowerRuneLabel(rune.power ?? 'damage')
}

export function addRuneEvent(state: SimulationState, collector: Arcane, rune: MapRune, detail: string) {
  state.events = addEvent(state.events, {
    id: `${rune.id}-collected-${state.time}`,
    time: state.time,
    team: collector.team,
    actor: collector.player,
    actorTeam: collector.team,
    victim: getRuneLabel(rune),
    victimTeam: collector.team,
    detail,
  })
}

export function updateBoss(boss: Boss, time: number, delta: number): Boss {
  const stats = getBossStats(time)
  if (boss.hp <= 0) {
    if (boss.respawn > time) return boss
    return {
      ...boss,
      pos: bossPath[0],
      pathIndex: 1,
      hp: stats.hp,
      maxHp: stats.hp,
      damage: stats.damage,
      range: stats.range,
      lastHitBy: undefined,
      aggroTargetId: undefined,
      aggroUntil: undefined,
      lastDamagedAt: undefined,
    }
  }

  if (boss.lastDamagedAt !== undefined && time - boss.lastDamagedAt >= 12) {
    return {
      ...boss,
      hp: stats.hp,
      maxHp: stats.hp,
      damage: stats.damage,
      range: stats.range,
      lastHitBy: undefined,
      aggroTargetId: undefined,
      aggroUntil: undefined,
      lastDamagedAt: undefined,
    }
  }

  let pathIndex = boss.pathIndex
  let target = bossPath[pathIndex]
  if (distance(boss.pos, target) < 1.4) {
    pathIndex = (pathIndex + 1) % bossPath.length
    target = bossPath[pathIndex]
  }

  const hpRatio = boss.hp / Math.max(1, boss.maxHp)
  return {
    ...boss,
    pathIndex,
    maxHp: stats.hp,
    hp: Math.min(stats.hp, Math.max(1, Math.round(stats.hp * hpRatio))),
    damage: stats.damage,
    range: stats.range,
    pos: moveToward(boss.pos, target, stats.moveSpeed * delta),
  }
}

export function respawnArcaneIfReady(arcane: Arcane, time: number, index: number): Arcane {
  if (arcane.respawn <= matchPreparationStartSeconds || arcane.respawn > time) return arcane
  const spawn = spreadPoint(teamInfo[arcane.team].base, index)
  return {
    ...arcane,
    pos: spawn,
    target: lanePaths[arcane.team][arcane.lane][1],
    movementDestination: undefined,
    pathIndex: 1,
    respawn: aliveRespawnTimestamp,
    nextCombatEvaluationAt: time,
    combatTargetId: undefined,
    combatTargetIntent: undefined,
    travelPlan: undefined,
    lastHitBy: undefined,
    skillStates: getPersistentSkillStatesAfterDeath(arcane),
    macroDecision: 'Avancar rota',
    microDecision: 'Renasceu na base',
    aiMode: 'push_lane',
    aiReason: 'respawn',
    aiExecutionChance: 100,
    aiExecutionDelay: 0,
    aiFailure: undefined,
    nextDecisionAt: time,
    lastDecisionAt: -99,
    forceDecision: true,
    lastDecisionHpRatio: 1,
    lastDecisionManaRatio: 1,
    lastDecisionPos: spawn,
    decision: 'Renasceu na base',
    stats: {
      ...arcane.stats,
      hp: arcane.stats.maxHp,
      mana: arcane.stats.maxMana,
    },
  }
}

export function updateCombatAiFoundation(state: SimulationState): SimulationState {
  const encounters = detectCombatEncounters(createCombatDetectionInput(state))
  const detectedBlackboards = updateCombatBlackboards({
    gameTime: state.time,
    previous: state.combatBlackboards,
    encounters,
  })
  const scenarioBlackboards = enrichCombatScenarioBlackboards(state, detectedBlackboards)
  const focusedBlackboards = assignCombatFocusTargets(state, scenarioBlackboards)
  return {
    ...state,
    combatBlackboards: coordinateCombatBlackboards(state, focusedBlackboards),
  }
}

function createCombatScenarioHeroInput(state: SimulationState, arcane: Arcane) {
  return {
    arcane,
    readiness: getCombatScenarioHeroReadiness(state, arcane),
    id: arcane.id,
    team: arcane.team,
    role: arcane.role,
    pos: arcane.pos,
    healthPct: arcane.stats.hp / Math.max(1, arcane.stats.maxHp),
    manaPct: arcane.stats.maxMana > 0 ? arcane.stats.mana / arcane.stats.maxMana : 1,
    level: arcane.stats.level,
    levelProgress: getLevelProgress(arcane.stats.xp),
    moveSpeed: getEffectiveArcaneMoveSpeed(state, arcane),
    combatPower: getCombatScenarioPower(state, arcane),
    effectiveHealth: arcane.stats.maxHp * (1 + Math.max(0, getEffectiveArcaneArmor(state, arcane)) * 0.055),
  }
}

export function enrichCombatScenarioBlackboards(state: SimulationState, blackboards: CombatBlackboardState): CombatBlackboardState {
  const towers = [
    ...state.towers.map((tower) => ({
      id: tower.id,
      team: tower.team,
      pos: tower.pos,
      range: tower.range,
      active: tower.hp > 0,
      aggroTargetId: tower.aggroTargetId,
    })),
    ...state.structures
      .filter((structure) => structure.kind === 'tower_tier_4')
      .map((tower) => ({
        id: tower.id,
        team: tower.team,
        pos: tower.pos,
        range: tower.range,
        active: tower.hp > 0,
        aggroTargetId: tower.aggroTargetId,
      })),
  ]
  const creeps = state.creeps
    .filter((creep) => creep.hp > 0)
    .map((creep) => ({
      team: creep.team,
      pos: creep.pos,
      healthPct: creep.hp / Math.max(1, creep.maxHp),
      damage: creep.damage,
    }))
  let heroInputs: ReturnType<typeof createCombatScenarioHeroInput>[] | undefined
  const heroVisibility: Record<TeamId, Map<string, boolean>> = { dawn: new Map(), dusk: new Map() }
  const visibleCreeps: Partial<Record<TeamId, typeof creeps>> = {}

  const getHeroInputs = () => {
    heroInputs ??= state.arcanes
      .filter((arcane) => arcane.stats.hp > 0 && arcane.respawn <= state.time)
      .map((arcane) => createCombatScenarioHeroInput(state, arcane))
    return heroInputs
  }
  const isHeroVisible = (team: TeamId, arcane: Arcane) => {
    if (arcane.team === team) return true
    const cached = heroVisibility[team].get(arcane.id)
    if (cached !== undefined) return cached
    const visible = isPointVisibleToTeam(state, team, arcane.pos)
    heroVisibility[team].set(arcane.id, visible)
    return visible
  }
  const getVisibleCreeps = (team: TeamId) => {
    visibleCreeps[team] ??= creeps.filter((creep) => creep.team === team || isPointVisibleToTeam(state, team, creep.pos))
    return visibleCreeps[team]
  }

  const enrichTeam = (team: TeamId) => blackboards[team].map((board) => {
    if (board.phase === 'disengage' || board.phase === 'reset') return board
    const enemyTower = state.towers
      .filter((tower) => tower.team !== team && tower.hp > 0 && distance(tower.pos, board.center) <= tower.range + 3)
      .sort((left, right) => distance(left.pos, board.center) - distance(right.pos, board.center))[0]
    const towerTankId = enemyTower ? getTowerTankCandidate(state, team, enemyTower)?.id : undefined
    const heroes = getHeroInputs()
      .map(({ arcane, readiness, ...hero }) => {
        return {
          ...hero,
          rotationCost: getCombatRotationCost(state, arcane, board.encounterType),
          visibleToTeam: isHeroVisible(team, arcane),
          canTankTower: towerTankId === arcane.id,
          ...readiness,
        }
      })
    const scenario = analyzeCombatScenario({
      teamId: team,
      encounterType: board.encounterType,
      center: board.center,
      radius: board.radius,
      alliedHeroIds: board.alliedHeroIds,
      enemyHeroIds: board.enemyHeroIds,
      heroes,
      creeps: getVisibleCreeps(team),
      towers,
      phase: board.phase,
      primaryTargetId: board.primaryTargetId,
      objectiveOpportunityValue: getCombatObjectiveOpportunityValue(state, team, board.center),
      recentEnemyTeleportCount: getRecentEnemyCombatTeleports(state, team, board.center),
    })
    return {
      ...board,
      encounterType: getTeamEncounterType(board.encounterType, team, scenario, towers),
      scenario,
      reasonTags: [...board.reasonTags.filter((tag) => !tag.startsWith('scenario_')), ...scenario.reasonTags],
    }
  })
  return { dawn: enrichTeam('dawn'), dusk: enrichTeam('dusk') }
}

export function getCombatScenarioHeroReadiness(state: SimulationState, arcane: Arcane) {
  const disabled = isArcaneStunned(state, arcane)
  const silenced = isArcaneSilenced(state, arcane)
  const readySkills = silenced
    ? []
    : getArcaneRuntimeSkills(arcane).filter((skill) => {
        if (skill.kind === 'passive') return false
        const level = getSimpleSkillLevel(arcane, skill)
        return level > 0 &&
          arcane.stats.mana >= getSimpleSkillManaCost(arcane, skill, level) &&
          (arcane.itemCooldowns[skill.id] ?? 0) <= state.time
      })
  return {
    disabled,
    controlReady: !disabled && readySkills.some((skill) => hasAnySimpleSkillTag(skill, ['stun', 'disable', 'taunt', 'root', 'leash', 'hex', 'sleep', 'fear', 'silence'])),
    escapeReady: !disabled && readySkills.some((skill) => hasAnySimpleSkillTag(skill, ['mobility', 'escape', 'blink', 'dash', 'leap', 'jump', 'teleport', 'invisibility', 'haste'])),
    combatResourceReady: !disabled && readySkills.some((skill) => !isPositiveSimpleSkill(skill) || hasSimpleStatusTag(skill)),
  }
}

export function getRecentEnemyCombatTeleports(state: SimulationState, team: TeamId, center: Point) {
  return (state.recentTeleports ?? []).filter((record) => (
    record.team !== team &&
    state.time - record.startedAt <= 12 &&
    distance(record.pos, center) <= 20
  )).length
}

export function getCombatObjectiveOpportunityValue(state: SimulationState, team: TeamId, center: Point) {
  const attackableStructures: Array<Tower | Structure | Base> = [
    ...getAttackableEnemyTowers(state, team),
    ...getAttackableEnemyStructures(state, team),
    ...state.bases.filter((base) => base.team !== team && base.hp > 0 && isEnemyBaseUnlocked(state, team)),
  ]
  const structureValue = attackableStructures
    .filter((objective) => distance(objective.pos, center) <= 22 && !isStructureBackdoorProtectedForTeam(state, team, objective))
    .reduce((best, objective) => {
      if (!('kind' in objective) && !('tier' in objective)) return Math.max(best, 60)
      if ('tier' in objective) return Math.max(best, 22 + objective.tier * 7)
      return Math.max(best, objective.kind === 'tower_tier_4' ? 48 : 38)
    }, 0)
  const bossValue = state.boss.hp > 0 && state.boss.respawn <= state.time && distance(state.boss.pos, center) <= 20 ? 46 : 0
  const activeRunes = state.time < 0
    ? runeSpawnPoints.bounty
    : state.runes
        .filter((rune) => rune.expiresAt === undefined || rune.expiresAt > state.time)
        .map((rune) => rune.pos)
  const runeValue = activeRunes.some((rune) => distance(rune, center) <= 11) ? 36 : 0
  return Math.max(structureValue, bossValue, runeValue)
}

export function getCombatScenarioPower(state: SimulationState, arcane: Arcane) {
  const damage = getEffectiveArcaneDamage(state, arcane)
  const attackRate = 1 / Math.max(0.35, getEffectiveArcaneAttackCooldown(state, arcane))
  const durability = arcane.stats.maxHp * (1 + Math.max(0, getEffectiveArcaneArmor(state, arcane)) * 0.04)
  return damage * attackRate * 0.72 + durability * 0.055 + arcane.stats.maxMana * 0.018 + arcane.stats.level * 7
}

export function getCombatRotationCost(state: SimulationState, arcane: Arcane, encounterType: CombatBlackboard['encounterType']) {
  const roleCost = arcane.role === 'Safe Lane'
    ? 54
    : arcane.role === 'Mid'
      ? 40
      : arcane.role === 'Offlane'
        ? 24
        : arcane.role === 'Greedy Support'
          ? 14
          : 7
  const economyCost = getArcaneEconomyNeed(arcane, state.time) * 0.42
  const urgentTeamfightDiscount = encounterType === 'high_ground_fight' || encounterType === 'base_defense'
    ? 58
    : encounterType === 'full_teamfight' || encounterType === 'counter_dive'
      ? 28
      : 0
  return clampNumber(roleCost + economyCost - urgentTeamfightDiscount, 0, 100)
}

export function coordinateCombatBlackboards(state: SimulationState, blackboards: CombatBlackboardState): CombatBlackboardState {
  const coordinateTeam = (team: TeamId) => blackboards[team].map((board) => {
    const allies = board.alliedHeroIds
      .map((id) => state.arcanes.find((arcane) => arcane.id === id))
      .filter((arcane): arcane is Arcane => arcane !== undefined && arcane.stats.hp > 0 && arcane.respawn <= state.time)
    const roleAssignments = assignDynamicCombatRoles(allies.map((arcane) => {
      const skills = getArcaneRuntimeSkills(arcane)
      return {
        id: arcane.id,
        role: arcane.role,
        attackRange: arcane.stats.range,
        hasControl: skills.some((skill) => hasSimpleStatusTag(skill)),
        hasSave: skills.some((skill) => isPositiveSimpleSkill(skill) && (isSimpleHealingSkill(skill) || hasAnySimpleSkillTag(skill, ['save', 'shield', 'barrier', 'cleanse', 'dispel']))),
        hasInterrupt: skills.some((skill) => hasAnySimpleSkillTag(skill, ['stun', 'disable', 'silence', 'hex', 'taunt'])),
        hasBurst: skills.some((skill) => skill.damageType !== 'none' && (isUltimateSkill(skill) || hasAnySimpleSkillTag(skill, ['nuke', 'burst', 'execute']))),
      }
    }))
    const protectedAlly = [...allies].sort((left, right) => {
      const leftPriority = getCombatRoleStrategicValue(left.role) * (1 - left.stats.hp / Math.max(1, left.stats.maxHp))
      const rightPriority = getCombatRoleStrategicValue(right.role) * (1 - right.stats.hp / Math.max(1, right.stats.maxHp))
      return rightPriority - leftPriority
    })[0]
    return {
      ...board,
      protectedAllyId: protectedAlly?.id,
      roleAssignments,
      formationPlan: createCombatFormationPlan(board.center, roleAssignments, protectedAlly?.id),
    }
  })
  return { dawn: coordinateTeam('dawn'), dusk: coordinateTeam('dusk') }
}

export function assignCombatFocusTargets(state: SimulationState, blackboards: CombatBlackboardState): CombatBlackboardState {
  const assignTeam = (team: TeamId) => blackboards[team].map((board) => {
    const chaseStopped = board.phase === 'chase' && board.scenario?.chaseAllowed === false
    if (board.phase === 'disengage' || board.phase === 'reset' || board.scenario?.intent === 'disengage' || chaseStopped) {
      return {
        ...board,
        primaryTargetId: undefined,
        secondaryTargetId: undefined,
        primaryTargetScore: undefined,
        primaryTargetDanger: undefined,
        targetFocusConfidence: 0,
        targetReasons: chaseStopped ? [`chase_stop_${board.scenario?.chaseStopReason ?? 'low_value'}`] : ['disengage'],
      }
    }
    const allies = board.alliedHeroIds
      .map((id) => state.arcanes.find((arcane) => arcane.id === id))
      .filter((arcane): arcane is Arcane => arcane !== undefined && arcane.stats.hp > 0 && arcane.respawn <= state.time)
    const enemies = board.enemyHeroIds
      .map((id) => state.arcanes.find((arcane) => arcane.id === id))
      .filter((arcane): arcane is Arcane => (
        arcane !== undefined &&
        arcane.stats.hp > 0 &&
        arcane.respawn <= state.time &&
        isPointVisibleToTeam(state, board.teamId, arcane.pos)
      ))
    const targetScores = enemies.map((target) => createCombatTargetScore(state, board, allies, target))
    const focus = selectCombatFocus(targetScores, board.primaryTargetId)
    return {
      ...board,
      primaryTargetId: focus.primary?.targetId,
      secondaryTargetId: focus.secondary?.targetId,
      primaryTargetScore: focus.primary?.finalScore,
      primaryTargetDanger: focus.primary?.dangerScore,
      targetFocusConfidence: focus.confidence,
      targetReasons: focus.primary?.reasons ?? ['no_viable_target'],
    }
  })
  return { dawn: assignTeam('dawn'), dusk: assignTeam('dusk') }
}

export function createCombatTargetScore(
  state: SimulationState,
  board: CombatBlackboard,
  allies: Arcane[],
  target: Arcane,
) {
  const hpRatio = target.stats.hp / Math.max(1, target.stats.maxHp)
  const allHostiles = state.arcanes.filter((enemy) => enemy.team !== board.teamId && enemy.stats.hp > 0 && enemy.respawn <= state.time)
  const nearbyAllies = allies.filter((ally) => distance(ally.pos, target.pos) <= 14)
  const targetProtectors = allHostiles.filter((enemy) => enemy.id !== target.id && distance(enemy.pos, target.pos) <= 9)
  const localNumbers = getLocalNumbers(state, board.teamId, target.pos, 14, allHostiles)
  const dangerValues = allies.map((ally) => getEnemyActionThreatScore(state, ally, target.pos, allHostiles))
  const dangerScore = average(dangerValues)
  const towerExposure = getCombatTargetTowerExposure(state, board.teamId, target.pos)
  const alliedDamageWindow = allies.reduce((sum, ally) => {
    const threat = getArcaneOffensiveThreat(state, ally)
    const arrivalPenalty = clampNumber(1 - Math.max(0, distance(ally.pos, target.pos) - 5) / 22, 0.2, 1)
    return sum + (getEffectiveArcaneDamage(state, ally) * 2 + threat.readyDamage) * arrivalPenalty
  }, 0)
  const expectedOverkill = Math.max(0, alliedDamageWindow - target.stats.hp) / Math.max(1, target.stats.maxHp) * 100
  const killProbability = clampNumber(
    (1 - hpRatio) * 55 + alliedDamageWindow / Math.max(1, target.stats.hp) * 38 + Math.max(0, localNumbers.advantage) * 10,
    0,
    100,
  )
  const averageApproachGap = average(allies.map((ally) => Math.max(0, distance(ally.pos, target.pos) - getArcaneAttackCenterRange(ally, target))))
  const accessibility = clampNumber(100 - averageApproachGap * 6 - towerExposure * 0.28, 0, 100)
  const targetThreat = getArcaneOffensiveThreat(state, target)
  const currentThreat = clampNumber(
    getEffectiveArcaneDamage(state, target) / Math.max(1, average(allies.map((ally) => ally.stats.maxHp))) * 260 +
      targetThreat.readyDamage / Math.max(1, average(allies.map((ally) => ally.stats.maxHp))) * 120,
    0,
    100,
  )
  const strategicValue = getCombatRoleStrategicValue(target.role)
  const allyFollowUp = clampNumber(nearbyAllies.length * 22 + Math.max(0, localNumbers.advantage) * 12, 0, 100)
  const positioningError = clampNumber((3 - targetProtectors.length) * 18 + Math.max(0, 8 - distance(target.pos, board.center)) * 3, 0, 100)
  const interruptValue = target.channeling ? 100 : 0
  const defensiveResources = clampNumber(hpRatio * 32 + Math.max(0, target.stats.armor) * 1.2 + target.stats.magicResistance * 0.35 + getArcaneBarrierAmount(state, target) / Math.max(1, target.stats.maxHp) * 80, 0, 100)
  const enemySaveCoverage = clampNumber(targetProtectors.filter((enemy) => enemy.role.includes('Support')).length * 28 + targetProtectors.length * 8, 0, 100)
  const overextensionRisk = clampNumber(dangerScore + Math.max(0, -localNumbers.advantage) * 22, 0, 100)
  const baitRisk = clampNumber(towerExposure * 0.7 + targetProtectors.length * 9 + (hpRatio < 0.25 ? 12 : 0), 0, 100)
  const objectiveConversionValue = board.encounterType === 'high_ground_fight' || board.encounterType === 'base_defense'
    ? strategicValue * 0.55
    : board.encounterType === 'objective_skirmish' || board.encounterType === 'tower_dive'
      ? strategicValue * 0.34
      : 12
  const reasons = [
    killProbability >= 65 ? 'kill_window' : 'durable_target',
    accessibility >= 62 ? 'accessible' : 'hard_to_reach',
    dangerScore >= COMBAT_AI_RULES.targetSelection.unsafeDangerThreshold ? 'high_danger' : 'manageable_danger',
    towerExposure >= 60 ? 'tower_exposure' : 'no_tower_exposure',
    localNumbers.advantage >= 0 ? 'numbers_ok' : 'outnumbered',
    interruptValue > 0 ? 'interrupt' : 'focus',
  ]

  return scoreCombatTarget({
    targetId: target.id,
    strategicValue,
    currentThreat,
    killProbability,
    accessibility,
    allyFollowUp,
    positioningError,
    cooldownPunishValue: target.stats.mana / Math.max(1, target.stats.maxMana) < 0.25 ? 24 : 6,
    interruptValue,
    objectiveConversionValue,
    defensiveResources,
    enemySaveCoverage,
    overextensionRisk,
    baitRisk,
    expectedOverkill: clampNumber(expectedOverkill, 0, 100),
    targetSwitchCost: board.primaryTargetId === target.id ? -COMBAT_AI_RULES.targetSelection.currentTargetStickiness : 0,
    dangerScore,
    towerExposure,
    reasons,
  })
}

export function getCombatTargetTowerExposure(state: SimulationState, attackingTeam: TeamId, point: Point) {
  const defendingTeam: TeamId = attackingTeam === 'dawn' ? 'dusk' : 'dawn'
  const tower = state.towers.find((candidate) => (
    candidate.team === defendingTeam && candidate.hp > 0 && distance(candidate.pos, point) <= candidate.range + 1.5
  ))
  const tierFour = state.structures.find((candidate) => (
    candidate.kind === 'tower_tier_4' && candidate.team === defendingTeam && candidate.hp > 0 && distance(candidate.pos, point) <= candidate.range + 1.5
  ))
  const structure = tower ?? tierFour
  if (!structure) return 0
  const alliedWave = state.creeps.some((creep) => creep.team === attackingTeam && creep.hp > 0 && distance(creep.pos, structure.pos) <= structure.range + 2)
  const tankCommitted = structure.aggroTargetId && state.arcanes.some((arcane) => (
    arcane.id === structure.aggroTargetId && arcane.team === attackingTeam && arcane.stats.hp / Math.max(1, arcane.stats.maxHp) >= 0.58
  ))
  return alliedWave || tankCommitted ? 28 : 100
}

export function getCombatRoleStrategicValue(role: string) {
  if (role === 'Safe Lane') return 100
  if (role === 'Mid') return 92
  if (role === 'Offlane') return 68
  if (role === 'Greedy Support') return 58
  return 52
}

const criticalCombatEffectKinds = new Set<TimedEffect['kind']>(['stun', 'root', 'hex', 'fear', 'taunt', 'sleep'])

export function getCombatCriticalEventSignature(state: SimulationState) {
  let hash = 2166136261
  const mix = (value: number) => {
    hash ^= value
    hash = Math.imul(hash, 16777619)
  }
  const mixText = (value: string | undefined) => {
    if (!value) {
      mix(0)
      return
    }
    for (let index = 0; index < value.length; index += 1) mix(value.charCodeAt(index))
  }

  state.arcanes.forEach((arcane) => {
    const hpRatio = arcane.stats.hp / Math.max(1, arcane.stats.maxHp)
    const healthBand = arcane.stats.hp <= 0 || arcane.respawn > state.time
      ? 0
      : hpRatio <= 0.3
        ? 1
        : hpRatio <= 0.5
          ? 2
          : 3
    mix(healthBand)
    mixText(arcane.channeling?.kind)
  })
  state.timedEffects.forEach((effect) => {
    if (!criticalCombatEffectKinds.has(effect.kind)) return
    mixText(effect.targetId)
    mixText(effect.kind)
    mixText(effect.sourceId)
  })
  state.towers.forEach((tower) => mixText(tower.aggroTargetId))
  state.structures.forEach((structure) => {
    if (structure.kind === 'tower_tier_4') mixText(structure.aggroTargetId)
  })
  return hash >>> 0
}

export function createCombatDetectionInput(state: SimulationState): CombatDetectionInput {
  const runeObjects = state.time < 0
    ? runeSpawnPoints.bounty.map((pos, index) => ({
        id: `pregame-bounty-${index}`,
        kind: 'rune' as const,
        pos: { ...pos },
        active: true,
      }))
    : state.runes.map((rune) => ({
        id: rune.id,
        kind: 'rune' as const,
        pos: { ...rune.pos },
        active: rune.expiresAt === undefined || rune.expiresAt > state.time,
        team: rune.side,
      }))

  return {
    matchSeed: state.matchSeed,
    gameTime: state.time,
    heroes: state.arcanes.map((arcane) => ({
      id: arcane.id,
      team: arcane.team,
      lane: arcane.lane,
      pos: { ...arcane.pos },
      alive: arcane.stats.hp > 0 && arcane.respawn <= state.time,
      healthPct: arcane.stats.hp / Math.max(1, arcane.stats.maxHp),
      manaPct: arcane.stats.maxMana > 0 ? arcane.stats.mana / arcane.stats.maxMana : 1,
      level: arcane.stats.level,
      attackRange: arcane.stats.range,
      currentMode: arcane.aiMode,
    })),
    mapObjects: [
      ...state.towers.map((tower) => ({
        id: tower.id,
        kind: 'tower' as const,
        pos: { ...tower.pos },
        active: tower.hp > 0,
        team: tower.team,
        range: tower.range,
      })),
      ...state.bases.map((base) => ({
        id: base.id,
        kind: 'base' as const,
        pos: { ...base.pos },
        active: base.hp > 0,
        team: base.team,
      })),
      ...state.camps.map((camp) => ({
        id: camp.id,
        kind: 'camp' as const,
        pos: { ...camp.pos },
        active: camp.hp > 0 && camp.respawn <= state.time,
        range: camp.range,
      })),
      {
        id: state.boss.id,
        kind: 'boss' as const,
        pos: { ...state.boss.pos },
        active: state.boss.hp > 0 && state.boss.respawn <= state.time,
        range: state.boss.range,
      },
      ...runeObjects,
    ],
  }
}

export function cloneCombatBlackboardState(state: CombatBlackboardState): CombatBlackboardState {
  const cloneBoard = (board: CombatBlackboard): CombatBlackboard => ({
    ...board,
    center: { ...board.center },
    alliedHeroIds: [...board.alliedHeroIds],
    enemyHeroIds: [...board.enemyHeroIds],
    reasonTags: [...board.reasonTags],
    targetReasons: [...board.targetReasons],
    roleAssignments: (board.roleAssignments ?? []).map((assignment) => ({
      ...assignment,
      secondaryRoles: [...assignment.secondaryRoles],
    })),
    controlReservations: (board.controlReservations ?? []).map((reservation) => ({ ...reservation })),
    damageReservations: (board.damageReservations ?? []).map((reservation) => ({ ...reservation })),
    saveReservations: (board.saveReservations ?? []).map((reservation) => ({ ...reservation })),
    formationPlan: board.formationPlan ? {
      ...board.formationPlan,
      anchorPosition: { ...board.formationPlan.anchorPosition },
      frontlineHeroIds: [...board.formationPlan.frontlineHeroIds],
      midlineHeroIds: [...board.formationPlan.midlineHeroIds],
      backlineHeroIds: [...board.formationPlan.backlineHeroIds],
      flankHeroIds: [...board.formationPlan.flankHeroIds],
    } : undefined,
    scenario: board.scenario ? {
      ...board.scenario,
      alliedReinforcements: board.scenario.alliedReinforcements.map((reinforcement) => ({ ...reinforcement })),
      enemyReinforcements: board.scenario.enemyReinforcements.map((reinforcement) => ({ ...reinforcement })),
      reasonTags: [...board.scenario.reasonTags],
    } : undefined,
  })
  return {
    dawn: state.dawn.map(cloneBoard),
    dusk: state.dusk.map(cloneBoard),
  }
}

export function updateTeamPlans(state: SimulationState): SimulationState {
  const analyzed = getAnalyzedGameState(state)
  const teamPlans = Object.fromEntries((['dawn', 'dusk'] as TeamId[]).map((team) => [
    team,
    applyTeamEconomyRecoveryPlan(state, team, enrichTeamPlanWithMapTarget(state, team, selectTeamPlan({
      analyzed,
      teamId: team,
      teamProfile: DEFAULT_TEAM_AI_PROFILES[team],
      previousPlan: state.teamPlans[team],
    }))),
  ])) as Partial<Record<TeamId, TeamPlan>>

  return { ...state, teamPlans }
}

export function getTeamCoreEconomyNeed(state: SimulationState, team: TeamId) {
  const cores = state.arcanes.filter((arcane) => arcane.team === team && !arcane.role.includes('Support'))
  return average(cores.map((arcane) => getArcaneEconomyNeed(arcane, state.time)))
}

export function applyTeamEconomyRecoveryPlan(
  state: SimulationState,
  team: TeamId,
  plan: TeamPlan | undefined,
): TeamPlan | undefined {
  if (!plan || state.time < 8 * 60) return plan
  const economyNeed = getTeamCoreEconomyNeed(state, team)
  const baseThreat = getBaseThreat(state, team)
  const urgentDefense = (baseThreat?.pressure ?? 0) >= 2 || plan.type === 'defend_high_ground' || plan.type === 'defend_tower'
  if (economyNeed < 42 || urgentDefense || plan.type === 'end_game') return plan
  return {
    type: 'farm_map',
    urgency: Math.round(clampNumber(48 + economyNeed * 0.38, 55, 86)),
    risk: Math.round(clampNumber(30 - economyNeed * 0.16, 10, 28)),
    expectedValue: Math.round(75 + economyNeed * 0.45),
    decisionChance: plan.decisionChance,
    reasonTags: ['economy_recovery', `core_gpm_deficit_${Math.round(economyNeed)}`],
  }
}

export function enrichTeamPlanWithMapTarget(state: SimulationState, team: TeamId, plan: TeamPlan | undefined): TeamPlan | undefined {
  if (!plan) return undefined
  if ((plan.type !== 'group_push' && plan.type !== 'end_game') || plan.targetPosition) return plan
  const objective = getBestGroupPushObjective(state, team)
  if (!objective) return plan
  return {
    ...plan,
    targetId: getStructureId(objective),
    targetPosition: objective.pos,
    reasonTags: [...plan.reasonTags, 'lane_target'],
  }
}

export function getAnalyzedGameState(state: SimulationState) {
  const cached = analyzedGameStateCache.get(state)
  if (cached && cached.time === state.time) {
    if (activeAnalyzedGameStateCacheDiagnostics) activeAnalyzedGameStateCacheDiagnostics.objectHits += 1
    return cached.analyzed
  }
  const dependencyCached = analyzedGameStateDependencyCache.get(state.runtimeToken)
  if (
    dependencyCached?.time === state.time &&
    dependencyCached.creepSpatialRevision === state.creepSpatialRevision &&
    dependencyCached.arcanes === state.arcanes &&
    dependencyCached.creeps === state.creeps &&
    dependencyCached.towers === state.towers &&
    dependencyCached.structures === state.structures &&
    dependencyCached.bases === state.bases &&
    dependencyCached.camps === state.camps &&
    dependencyCached.boss === state.boss &&
    dependencyCached.timedEffects === state.timedEffects &&
    dependencyCached.teamAuras === state.teamAuras
  ) {
    if (activeAnalyzedGameStateCacheDiagnostics) activeAnalyzedGameStateCacheDiagnostics.dependencyHits += 1
    analyzedGameStateCache.set(state, { time: state.time, analyzed: dependencyCached.analyzed })
    return dependencyCached.analyzed
  }
  if (activeAnalyzedGameStateCacheDiagnostics) activeAnalyzedGameStateCacheDiagnostics.misses += 1
  const analyzed = analyzeGameState(createAiGameSnapshot(state))
  analyzedGameStateCache.set(state, { time: state.time, analyzed })
  analyzedGameStateDependencyCache.set(state.runtimeToken, {
    time: state.time,
    creepSpatialRevision: state.creepSpatialRevision,
    arcanes: state.arcanes,
    creeps: state.creeps,
    towers: state.towers,
    structures: state.structures,
    bases: state.bases,
    camps: state.camps,
    boss: state.boss,
    timedEffects: state.timedEffects,
    teamAuras: state.teamAuras,
    analyzed,
  })
  return analyzed
}

export function updateTeamCalls(state: SimulationState): SimulationState {
  const phase = getGamePhase(state.time)
  const activeCalls = Object.fromEntries(
    Object.entries(state.teamCalls).filter(([team, call]) => (
      call &&
      call.expiresAt > state.time &&
      isTeamCallTargetAlive(state, call) &&
      !(state.teamPlans[team as TeamId]?.type === 'farm_map' && getTeamCoreEconomyNeed(state, team as TeamId) >= 42)
    )),
  ) as Partial<Record<TeamId, TeamCall>>

  if (phase === 'early') {
    return { ...state, teamCalls: activeCalls }
  }

  const nextCalls = { ...activeCalls }
  ;(['dawn', 'dusk'] as TeamId[]).forEach((team) => {
    if (nextCalls[team]) return

    const caller = state.arcanes
      .filter((arcane) => arcane.team === team && arcane.stats.hp > 0 && arcane.respawn <= state.time)
      .sort((a, b) => b.shotcalling - a.shotcalling)[0]
    if (!caller) return

    const call = createTeamCall(state, caller, phase)
    if (call) {
      nextCalls[team] = call
    }
  })

  return { ...state, teamCalls: nextCalls }
}

export function isTeamCallTargetAlive(state: SimulationState, call: TeamCall) {
  if (call.kind === 'tower') return state.towers.some((tower) => tower.id === call.targetId && tower.hp > 0 && isTowerUnlocked(state, call.team, tower))
  if (call.kind === 'structure') return state.structures.some((structure) => structure.id === call.targetId && structure.hp > 0 && isStructureUnlocked(state, call.team, structure))
  if (call.kind === 'base') return state.bases.some((base) => base.id === call.targetId && base.hp > 0 && base.team !== call.team && isEnemyBaseUnlocked(state, call.team))
  if (call.kind === 'boss') return state.boss.id === call.targetId && state.boss.hp > 0
  return state.arcanes.some((arcane) => arcane.id === call.targetId && arcane.stats.hp > 0 && arcane.respawn <= state.time)
}

export function getPlannedMapObjective(state: SimulationState, team: TeamId, targetId: string): Tower | Structure | Base | undefined {
  const tower = state.towers.find((candidate) => candidate.id === targetId && candidate.team !== team && candidate.hp > 0)
  if (tower) return tower
  const structure = state.structures.find((candidate) => candidate.id === targetId && candidate.team !== team && candidate.hp > 0)
  if (structure) return structure
  return state.bases.find((candidate) => candidate.id === targetId && candidate.team !== team && candidate.hp > 0)
}

export function getTeamObjectiveKind(objective: Tower | Structure | Base): Exclude<TeamObjectiveKind, 'boss' | 'pickoff'> {
  if ('tier' in objective) return 'tower'
  return 'kind' in objective ? 'structure' : 'base'
}

export function getRelativeTeamLead(analyzed: AnalyzedGameState, team: TeamId) {
  const teamState = analyzed.teams[team]
  const opponent = Object.entries(analyzed.teams).find(([teamId]) => teamId !== team)?.[1]
  if (!teamState || !opponent) return 0
  return teamState.netWorthLead / Math.max(1, opponent.netWorth)
}

export function createAiGameSnapshot(state: SimulationState): RawAiGameSnapshot {
  const teams = Object.fromEntries((['dawn', 'dusk'] as TeamId[]).map((team) => {
    const arcanes = state.arcanes.filter((arcane) => arcane.team === team)
    const aliveArcanes = arcanes.filter((arcane) => arcane.stats.hp > 0 && arcane.respawn <= state.time)
    const averageHealthPct = average(aliveArcanes.map((arcane) => arcane.stats.maxHp > 0 ? arcane.stats.hp / arcane.stats.maxHp : 0))
    const averageManaPct = average(aliveArcanes.map((arcane) => arcane.stats.maxMana > 0 ? arcane.stats.mana / arcane.stats.maxMana : 1))
    const baseThreat = getBaseThreat(state, team)

    return [team, {
      teamId: team,
      netWorth: getTeamNetWorth(state, team),
      xp: getTeamXp(state, team),
      aliveHeroes: aliveArcanes.length,
      deadHeroes: arcanes.length - aliveArcanes.length,
      averageHealthPct,
      averageManaPct,
      pushPower: getTeamPushPower(state, team),
      bossDamage: getTeamBossDamage(state, team),
      defensivePower: getTeamDefensivePower(state, team),
      safeFarm: getTeamSafeFarmValue(state, team),
      lanePressure: getTeamLanePressure(state, team),
      structureAtRisk: getTeamStructureRisk(state, team),
      baseThreat: baseThreat ? Math.min(100, baseThreat.pressure * 14 + (1 - baseThreat.hpRatio) * 70) : 0,
      visionControl: getTeamVisionControl(state, team),
    }]
  }))

  return {
    timeSeconds: state.time,
    teams,
    objectives: {
      bossAvailable: state.boss.hp > 0,
      bossBuffActiveByTeam: {
        dawn: state.teamAuras.dawn !== undefined,
        dusk: state.teamAuras.dusk !== undefined,
      },
      bossId: state.boss.id,
      bossPosition: state.boss.pos,
      enemyBaseOpenByTeam: {
        dawn: isEnemyBaseUnlocked(state, 'dawn'),
        dusk: isEnemyBaseUnlocked(state, 'dusk'),
      },
      highValueObjectiveAvailableByTeam: {
        dawn: hasHighValueObjectiveOpportunity(state, 'dawn'),
        dusk: hasHighValueObjectiveOpportunity(state, 'dusk'),
      },
    },
  }
}

export function hasHighValueObjectiveOpportunity(state: SimulationState, team: TeamId) {
  const enemyTeam: TeamId = team === 'dawn' ? 'dusk' : 'dawn'
  const aliveAllies = state.arcanes.filter((arcane) => arcane.team === team && arcane.stats.hp > 0 && arcane.respawn <= state.time).length
  const aliveEnemies = state.arcanes.filter((arcane) => arcane.team === enemyTeam && arcane.stats.hp > 0 && arcane.respawn <= state.time).length
  if (aliveAllies - aliveEnemies >= 2) return true

  return getObjectiveCandidates(state, team).some((objective) => {
    if (objective.hp <= 0) return false
    if (objective.hp / Math.max(1, objective.maxHp) < 0.65) return true
    const objectiveLane = 'lane' in objective ? objective.lane : nearestLaneId(team, objective.pos)
    const alliedWave = nearest(objective.pos, state.creeps.filter((creep) => (
      creep.team === team &&
      creep.hp > 0 &&
      creep.lane === objectiveLane
    )), 10)
    return alliedWave !== undefined
  })
}

export function createTeamCall(state: SimulationState, caller: Arcane, phase: GamePhase): TeamCall | undefined {
  const objectives: Array<{ kind: TeamObjectiveKind; targetId: string; targetName: string; pos: Point; score: number }> = []
  const visibleEnemies = state.arcanes.filter((enemy) => (
    enemy.team !== caller.team &&
    enemy.stats.hp > 0 &&
    enemy.respawn <= state.time &&
    isPointVisibleToTeam(state, caller.team, enemy.pos)
  ))
  const teamPlan = state.teamPlans[caller.team] ?? selectTeamPlan({
    analyzed: getAnalyzedGameState(state),
    teamId: caller.team,
    teamProfile: DEFAULT_TEAM_AI_PROFILES[caller.team],
  })
  const analyzed = getAnalyzedGameState(state)
  const teamState = analyzed.teams[caller.team]
  const relativeLead = getRelativeTeamLead(analyzed, caller.team)
  const planWantsQuietMap = teamPlan?.type === 'farm_map' || teamPlan?.type === 'avoid_fight'
  const planWantsDefense = teamPlan?.type === 'defend_tower' || teamPlan?.type === 'defend_high_ground'
  const planWantsPickoff = teamPlan?.type === 'pickoff'
  const planCallThreshold = planWantsQuietMap
    ? 72
    : planWantsDefense
      ? 66
      : planWantsPickoff
        ? 50
      : teamPlan?.type === 'group_push' || teamPlan?.type === 'take_boss' || teamPlan?.type === 'end_game'
        ? 52
        : 58

  const plannedObjective = teamPlan?.targetId ? getPlannedMapObjective(state, caller.team, teamPlan.targetId) : undefined
  if (plannedObjective && (teamPlan?.type === 'group_push' || teamPlan?.type === 'end_game')) {
    objectives.push({
      kind: getTeamObjectiveKind(plannedObjective),
      targetId: getStructureId(plannedObjective),
      targetName: 'Executar plano de rota',
      pos: plannedObjective.pos,
      score: 122 + teamPlan.urgency * 0.35 + Math.max(0, teamState?.numbersAdvantage ?? 0) * 10,
    })
  }

  if (teamPlan?.type === 'take_boss' && state.boss.hp > 0 && !state.teamAuras[caller.team]) {
    objectives.push({
      kind: 'boss',
      targetId: state.boss.id,
      targetName: `${state.boss.name} (20%)`,
      pos: mapEdgeApproachPoint(state.boss.pos),
      score: 138 + teamPlan.urgency * 0.35 + Math.max(0, teamState?.numbersAdvantage ?? 0) * 10,
    })
  }

  const vulnerableEnemy = visibleEnemies
    .map((enemy) => {
      const hpRatio = enemy.stats.hp / enemy.stats.maxHp
      const unsafePenalty = isUnsafeUnderEnemyTower(state, caller.team, enemy.pos, enemy.lane) ? 28 : 0
      const distancePenalty = distance(caller.pos, enemy.pos) * 1.15
      const localNumbers = getLocalNumbers(state, caller.team, enemy.pos, 12, visibleEnemies)
      const numbersBonus = Math.max(0, localNumbers.advantage) * 10
      const numbersPenalty = Math.max(0, -localNumbers.advantage) * 18
      return {
        enemy,
        score: 92 - hpRatio * 68 - distancePenalty - unsafePenalty + numbersBonus - numbersPenalty + (planWantsPickoff ? 18 : 0) + (teamPlan?.type === 'avoid_fight' ? -18 : 0) + (phase === 'late' ? 14 : 0),
      }
    })
    .filter((entry) => entry.score > 32)
    .sort((a, b) => b.score - a.score)[0]

  if (vulnerableEnemy) {
    objectives.push({
      kind: 'pickoff',
      targetId: vulnerableEnemy.enemy.id,
      targetName: `Finalizar ${vulnerableEnemy.enemy.player}`,
      pos: vulnerableEnemy.enemy.pos,
      score: vulnerableEnemy.score,
    })
  }

  const attackableTowers = getAttackableEnemyTowers(state, caller.team)
  const hasLowerTierObjective = attackableTowers.some((tower) => tower.tier < 3)
  const towerTarget = attackableTowers
    .filter((tower) => !(tower.tier === 3 && hasLowerTierObjective))
    .map((tower) => {
      const alliedWave = nearest(tower.pos, state.creeps.filter((creep) => creep.team === caller.team && creep.lane === tower.lane), 11)
      const localNumbers = getLocalNumbers(state, caller.team, tower.pos, tower.tier === 3 ? 20 : 16, visibleEnemies)
      const outerPriority = tower.tier === 1 ? 24 : tower.tier === 2 ? 12 : -18
      const planBonus = teamPlan?.type === 'group_push' || teamPlan?.type === 'end_game'
        ? 14
        : planWantsQuietMap
          ? -16
          : planWantsDefense
            ? -8
            : 0
      const laneBonus = tower.lane === caller.lane ? 10 : 0
      const siegeEstimate = getStructureSiegeEstimate(state, caller.team, tower)
      const waveBonus = alliedWave ? 22 : 0
      const hpBonus = (1 - tower.hp / tower.maxHp) * 18
      const numbersBonus = Math.max(0, localNumbers.advantage) * (tower.tier === 3 ? 15 : 11)
      const numbersPenalty = Math.max(0, -localNumbers.advantage) * (tower.tier === 3 ? 24 : 17)
      const tierThreeTimingPenalty = tower.tier === 3 && phase !== 'late' ? 26 : 0
      const backdoorPenalty = siegeEstimate.protectedByBackdoor
        ? tower.tier === 3 ? 42 : tower.tier === 2 ? 32 : 0
        : 0
      const conversionPenalty = Math.min(36, siegeEstimate.timeToKill * 0.22)
      return {
        tower,
        localNumbers,
        siegeEstimate,
        score: 46 + outerPriority + planBonus + laneBonus + waveBonus + hpBonus + numbersBonus - numbersPenalty - tierThreeTimingPenalty - backdoorPenalty - conversionPenalty - distance(caller.pos, tower.pos) * 0.55,
      }
    })
    .filter(({ tower, localNumbers, score, siegeEstimate }) => (
      tower.tier === 1 ||
      (!siegeEstimate.protectedByBackdoor && (
        tower.tier !== 3 ||
        (phase === 'late' && localNumbers.advantage >= 0.85 && score > 48)
      ))
    ))
    .sort((a, b) => b.score - a.score)[0]

  if (towerTarget && towerTarget.score > 34) {
    objectives.push({
      kind: 'tower',
      targetId: towerTarget.tower.id,
      targetName: `Levar T${towerTarget.tower.tier} ${laneNames[towerTarget.tower.lane]}`,
      pos: towerTarget.tower.pos,
      score: towerTarget.score,
    })
  }

  const structureTarget = getAttackableEnemyStructures(state, caller.team)
    .map((structure) => {
      const localNumbers = getLocalNumbers(state, caller.team, structure.pos, structure.kind === 'tower_tier_4' ? 22 : 18, visibleEnemies)
      const alliedWave = structure.lane
        ? nearest(structure.pos, state.creeps.filter((creep) => creep.team === caller.team && creep.lane === structure.lane), 12)
        : nearest(structure.pos, state.creeps.filter((creep) => creep.team === caller.team), 13)
      const kindValue = structure.kind === 'barracks_melee'
        ? 34
        : structure.kind === 'barracks_ranged'
          ? 24
          : phase === 'late'
            ? 30
            : 6
      const planBonus = teamPlan?.type === 'group_push' || teamPlan?.type === 'end_game'
        ? structure.kind === 'tower_tier_4' ? 18 : 12
        : planWantsQuietMap
          ? -14
          : 0
      const siegeEstimate = getStructureSiegeEstimate(state, caller.team, structure)
      const hpBonus = (1 - structure.hp / structure.maxHp) * 18
      const waveBonus = alliedWave ? 18 : structure.kind === 'tower_tier_4' ? -12 : -4
      const numbersBonus = Math.max(0, localNumbers.advantage) * (structure.kind === 'tower_tier_4' ? 18 : 12)
      const numbersPenalty = Math.max(0, -localNumbers.advantage) * (structure.kind === 'tower_tier_4' ? 28 : 18)
      const backdoorPenalty = siegeEstimate.protectedByBackdoor
        ? structure.kind === 'tower_tier_4' ? 46 : 30
        : 0
      const conversionPenalty = Math.min(40, siegeEstimate.timeToKill * 0.24)

      return {
        structure,
        localNumbers,
        siegeEstimate,
        score: 44 + kindValue + planBonus + hpBonus + waveBonus + numbersBonus - numbersPenalty - backdoorPenalty - conversionPenalty - distance(caller.pos, structure.pos) * 0.48,
      }
    })
    .filter(({ structure, localNumbers, score, siegeEstimate }) => (
      !siegeEstimate.protectedByBackdoor &&
      (structure.kind !== 'tower_tier_4' ||
      (phase === 'late' && localNumbers.advantage >= 0.75 && score > 56)
      )
    ))
    .sort((a, b) => b.score - a.score)[0]

  if (structureTarget && structureTarget.score > 42) {
    objectives.push({
      kind: 'structure',
      targetId: structureTarget.structure.id,
      targetName: getStructureLabel(structureTarget.structure),
      pos: structureTarget.structure.pos,
      score: structureTarget.score,
    })
  }

  const bossTarget = state.boss.hp > 0
    ? (() => {
      const localNumbers = getLocalNumbers(state, caller.team, state.boss.pos, 22, visibleEnemies)
      const bossWindowOpen = localNumbers.advantage >= 1 ||
        (teamState?.numbersAdvantage ?? 0) >= 2 ||
        relativeLead >= 0.3
      const resourcePenalty = (teamState?.lowResourcePressure ?? 0) > 60 ? 36 : 0
      return {
        boss: state.boss,
        localNumbers,
        bossWindowOpen,
        score: 58 + (teamPlan?.type === 'take_boss' ? 62 : planWantsQuietMap ? -12 : 0) + (phase === 'late' ? 22 : 0) + Math.max(0, localNumbers.advantage) * 14 - Math.max(0, -localNumbers.advantage) * 22 - distance(caller.pos, state.boss.pos) * 0.42 - resourcePenalty,
      }
    })()
    : undefined

  if (bossTarget && bossTarget.bossWindowOpen && bossTarget.score > 38 && bossTarget.localNumbers.advantage >= (phase === 'late' ? -0.1 : 0.5)) {
    objectives.push({
      kind: 'boss',
      targetId: bossTarget.boss.id,
      targetName: `${bossTarget.boss.name} (20%)`,
      pos: mapEdgeApproachPoint(bossTarget.boss.pos),
      score: bossTarget.score,
    })
  }

  const bestObjective = objectives
    .map((objective) => ({ ...objective, score: objective.score + caller.shotcalling * 0.35 }))
    .sort((a, b) => b.score - a.score)[0]

  if (!bestObjective || bestObjective.score < planCallThreshold) return undefined

  return {
    team: caller.team,
    callerId: caller.id,
    callerName: caller.player,
    kind: bestObjective.kind,
    targetId: bestObjective.targetId,
    targetName: bestObjective.targetName,
    pos: bestObjective.pos,
    createdAt: state.time,
    expiresAt: state.time + (phase === 'mid' ? 24 : 30),
  }
}

export function getTeamCallPoint(state: SimulationState, call: TeamCall): Point | undefined {
  if (call.kind === 'tower') {
    const tower = state.towers.find((candidate) => candidate.id === call.targetId && candidate.hp > 0)
    return tower ? getObjectiveRallyPoint(state, call.team, tower) : undefined
  }
  if (call.kind === 'structure') {
    const structure = state.structures.find((candidate) => candidate.id === call.targetId && candidate.hp > 0)
    return structure ? getObjectiveRallyPoint(state, call.team, structure) : undefined
  }
  if (call.kind === 'base') {
    const base = state.bases.find((candidate) => candidate.id === call.targetId && candidate.hp > 0)
    return base ? getObjectiveRallyPoint(state, call.team, base) : undefined
  }
  if (call.kind === 'boss') return state.boss.id === call.targetId && state.boss.hp > 0 ? mapEdgeApproachPoint(state.boss.pos) : undefined
  return state.arcanes.find((arcane) => arcane.id === call.targetId && arcane.stats.hp > 0 && arcane.respawn <= state.time)?.pos
}

export function getTeamCallObjectivePoint(state: SimulationState, call: TeamCall): Point | undefined {
  if (call.kind === 'boss') return state.boss.id === call.targetId && state.boss.hp > 0 ? state.boss.pos : undefined
  if (call.kind === 'tower') return state.towers.find((tower) => tower.id === call.targetId && tower.hp > 0)?.pos
  if (call.kind === 'structure') return state.structures.find((structure) => structure.id === call.targetId && structure.hp > 0)?.pos
  if (call.kind === 'base') return state.bases.find((base) => base.id === call.targetId && base.hp > 0)?.pos
  return state.arcanes.find((arcane) => arcane.id === call.targetId && arcane.stats.hp > 0 && arcane.respawn <= state.time)?.pos
}

export function getObjectiveRallyPoint(state: SimulationState, team: TeamId, objective: Tower | Structure | Base) {
  const lane = 'lane' in objective && objective.lane ? objective.lane : nearestLaneId(team, objective.pos)
  const alliedWave = nearest(objective.pos, state.creeps.filter((creep) => (
    creep.team === team && creep.hp > 0 && creep.lane === lane
  )), 20)
  if (alliedWave) return alliedWave.pos
  const ownBase = teamInfo[team].base
  const deltaX = ownBase.x - objective.pos.x
  const deltaY = ownBase.y - objective.pos.y
  const length = Math.max(0.01, Math.hypot(deltaX, deltaY))
  return {
    x: objective.pos.x + deltaX / length * 12,
    y: objective.pos.y + deltaY / length * 12,
  }
}

export function isTowerUnlocked(state: SimulationState, team: TeamId, tower: Tower) {
  return !state.towers.some((other) => (
    other.team !== team &&
    other.lane === tower.lane &&
    other.tier < tower.tier &&
    other.hp > 0
  ))
}

export function getAttackableEnemyTowers(state: SimulationState, team: TeamId) {
  return state.towers.filter((tower) => tower.team !== team && tower.hp > 0 && isTowerUnlocked(state, team, tower))
}

export function getNextEnemyTowerInLane(state: SimulationState, team: TeamId, lane: LaneId) {
  return getAttackableEnemyTowers(state, team)
    .filter((tower) => tower.lane === lane)
    .sort((a, b) => a.tier - b.tier)[0]
}

export function isEnemyBaseUnlocked(state: SimulationState, team: TeamId) {
  return !state.structures.some((structure) => structure.team !== team && structure.hp > 0 && structure.kind === 'tower_tier_4')
}

export function isStructureUnlocked(state: SimulationState, team: TeamId, structure: Structure) {
  if (structure.kind === 'tower_tier_4') {
    return !state.towers.some((tower) => tower.team !== team && tower.hp > 0 && tower.tier === 3)
  }

  if (structure.lane) {
    return !state.towers.some((tower) => (
      tower.team !== team &&
      tower.lane === structure.lane &&
      tower.tier === 3 &&
      tower.hp > 0
    ))
  }

  return true
}

export function getAttackableEnemyStructures(state: SimulationState, team: TeamId) {
  return state.structures.filter((structure) => (
    structure.team !== team &&
    structure.hp > 0 &&
    isStructureUnlocked(state, team, structure)
  ))
}

export function getNextEnemyStructureInLane(state: SimulationState, team: TeamId, lane: LaneId) {
  return getAttackableEnemyStructures(state, team)
    .filter((structure) => structure.lane === lane)
    .sort((a, b) => getStructureObjectivePriority(a) - getStructureObjectivePriority(b))[0]
}

export function getStructureObjectivePriority(structure: Structure) {
  if (structure.kind === 'barracks_melee') return 1
  if (structure.kind === 'barracks_ranged') return 2
  return 3
}

export function getStructureLabel(structure: Structure) {
  if (structure.kind === 'barracks_melee') return `Barraca melee ${structure.lane ? laneNames[structure.lane] : ''}`
  if (structure.kind === 'barracks_ranged') return `Barraca ranged ${structure.lane ? laneNames[structure.lane] : ''}`
  return `T4 ${structure.side === 'left' ? 'esquerda' : 'direita'}`
}

export function getStructureMapLabel(structure: Structure) {
  if (structure.kind === 'barracks_melee') return 'BM'
  if (structure.kind === 'barracks_ranged') return 'BR'
  return 'T4'
}

export function getBaseThreat(state: SimulationState, team: TeamId) {
  const base = state.bases.find((candidate) => candidate.team === team && candidate.hp > 0)
  if (!base) return undefined

  const enemyArcane = nearest(base.pos, state.arcanes.filter((arcane) => (
    arcane.team !== team &&
    arcane.stats.hp > 0 &&
    arcane.respawn <= state.time
  )), 18)
  const nearBaseEnemyCreeps = queryCreepSpatialGrid(state, base.pos, 12)
    .filter((creep) => creep.team !== team)
  const enemyCreep = nearest(base.pos, nearBaseEnemyCreeps, 12)
  const pressure = state.arcanes.filter((arcane) => arcane.team !== team && arcane.stats.hp > 0 && arcane.respawn <= state.time && distance(arcane.pos, base.pos) <= 20).length * 2 +
    nearBaseEnemyCreeps.filter((creep) => distance(creep.pos, base.pos) <= 12).length
  const hpRatio = base.hp / base.maxHp

  if (!enemyArcane && !enemyCreep && hpRatio > 0.45) return undefined
  return {
    base,
    target: enemyArcane ?? enemyCreep,
    pressure,
    hpRatio,
    urgent: hpRatio < 0.45 || pressure >= 3 || enemyArcane !== undefined,
  }
}

export function getCachedBaseThreat(state: SimulationState, team: TeamId, frameContext?: TickFrameContext) {
  if (!frameContext?.baseThreatCache) return getBaseThreat(state, team)
  if (frameContext.baseThreatCache.has(team)) return frameContext.baseThreatCache.get(team)
  const threat = getBaseThreat(state, team)
  frameContext.baseThreatCache.set(team, threat)
  return threat
}

export function getLocalNumbers(state: SimulationState, team: TeamId, point: Point, radius: number, visibleEnemies?: Arcane[]) {
  const allies = state.arcanes.filter((arcane) => arcane.team === team && arcane.stats.hp > 0 && arcane.respawn <= state.time && distance(arcane.pos, point) <= radius)
  const enemies = (visibleEnemies ?? state.arcanes.filter((arcane) => (
    arcane.team !== team &&
    arcane.stats.hp > 0 &&
    arcane.respawn <= state.time &&
    isPointVisibleToTeam(state, team, arcane.pos)
  ))).filter((arcane) => distance(arcane.pos, point) <= radius)

  const weightArcane = (arcane: Arcane) => {
    const hpRatio = arcane.stats.hp / arcane.stats.maxHp
    const distanceFactor = Math.max(0.35, 1 - distance(arcane.pos, point) / Math.max(1, radius) * 0.65)
    const levelFactor = 1 + arcane.stats.level * 0.035
    return hpRatio * distanceFactor * levelFactor
  }
  const weightedAllies = allies.reduce((sum, ally) => sum + weightArcane(ally), 0)
  const weightedEnemies = enemies.reduce((sum, enemy) => sum + weightArcane(enemy), 0)

  return {
    allies: allies.length,
    enemies: enemies.length,
    weightedAllies,
    weightedEnemies,
    advantage: weightedAllies - weightedEnemies,
  }
}

export function getLaneWinAssessment(state: SimulationState, team: TeamId, lane: LaneId) {
  const ownPath = lanePaths[team][lane]
  const enemyTeam: TeamId = team === 'dawn' ? 'dusk' : 'dawn'
  const enemyPath = lanePaths[enemyTeam][lane]
  const heroScore = state.arcanes.reduce((score, arcane) => {
    if (arcane.stats.hp <= 0 || arcane.respawn > state.time || arcane.lane !== lane) return score
    const path = arcane.team === team ? ownPath : enemyPath
    if (!isNearRoute(arcane.pos, path, 13)) return score
    const hpRatio = arcane.stats.hp / Math.max(1, arcane.stats.maxHp)
    const value = 16 * hpRatio + arcane.stats.level * 1.2 + getEffectiveArcaneDamage(state, arcane) / 18
    return score + (arcane.team === team ? value : -value)
  }, 0)
  const creepScore = state.creeps.reduce((score, creep) => {
    if (creep.lane !== lane) return score
    const progress = laneProgress(creep.pos, lanePaths[creep.team][lane])
    const value = getCreepLaneValue(creep) + progress * 2
    return score + (creep.team === team ? value : -value)
  }, 0)
  const towerScore = state.towers.reduce((score, tower) => {
    if (tower.lane !== lane || tower.hp <= 0) return score
    const hpLoss = (1 - tower.hp / tower.maxHp) * (tower.tier === 1 ? 10 : tower.tier === 2 ? 14 : 20)
    return score + (tower.team === team ? -hpLoss : hpLoss)
  }, 0)
  const score = heroScore + creepScore + towerScore
  const winChance = laneWinChance(score, 18)

  return {
    score,
    winChance,
    losing: winChance < 0.42,
    winning: winChance > 0.62,
  }
}

export function getBestGroupPushObjective(state: SimulationState, team: TeamId): Tower | Structure | Base | undefined {
  const objectiveCandidates = getObjectiveCandidates(state, team)
  if (objectiveCandidates.length === 0) return undefined

  const lanes = (['top', 'mid', 'bot'] as LaneId[])
    .map((lane) => {
      const laneObjective = objectiveCandidates
        .filter((objective) => ('lane' in objective ? objective.lane === lane : true))
        .sort((a, b) => laneProgress(a.pos, lanePaths[team][lane]) - laneProgress(b.pos, lanePaths[team][lane]))[0]
      if (!laneObjective) return undefined
      const assessment = getLaneWinAssessment(state, team, lane)
      const alliedWave = nearest(laneObjective.pos, state.creeps.filter((creep) => creep.team === team && creep.hp > 0 && creep.lane === lane), 13)
      const hpPressure = (1 - laneObjective.hp / Math.max(1, laneObjective.maxHp)) * 32
      const waveBonus = alliedWave ? 18 : 0
      return {
        lane,
        objective: laneObjective,
        score: assessment.winChance * 100 + assessment.score * 0.12 + hpPressure + waveBonus,
      }
    })
    .filter((entry): entry is { lane: LaneId; objective: Tower | Structure | Base; score: number } => entry !== undefined)
    .sort((a, b) => b.score - a.score)

  return lanes[0]?.objective ?? objectiveCandidates[0]
}

export function nearestLaneId(team: TeamId, point: Point): LaneId {
  return (['top', 'mid', 'bot'] as LaneId[])
    .map((lane) => ({ lane, distance: distance(point, nearestLanePoint(point, lanePaths[team][lane])) }))
    .sort((a, b) => a.distance - b.distance)[0].lane
}

export function getTeamPushPower(state: SimulationState, team: TeamId) {
  const livingDamage = state.arcanes
    .filter((arcane) => arcane.team === team && arcane.stats.hp > 0 && arcane.respawn <= state.time)
    .reduce((sum, arcane) => sum + getEffectiveArcaneDamage(state, arcane) * (arcane.stats.hp / Math.max(1, arcane.stats.maxHp)), 0)
  const advancedCreeps = state.creeps.filter((creep) => creep.team === team && laneProgress(creep.pos, lanePaths[team][creep.lane]) > 0.55).length
  return Math.min(100, livingDamage / 12 + advancedCreeps * 7)
}

export function getTeamBossDamage(state: SimulationState, team: TeamId) {
  const bossDamage = state.arcanes
    .filter((arcane) => arcane.team === team && arcane.stats.hp > 0 && arcane.respawn <= state.time)
    .reduce((sum, arcane) => {
      const hpRatio = arcane.stats.hp / Math.max(1, arcane.stats.maxHp)
      const rangeBonus = arcane.stats.attackType === 'ranged' ? 1.08 : 1
      return sum + getEffectiveArcaneDamage(state, arcane) * hpRatio * rangeBonus
    }, 0)

  return Math.min(100, bossDamage / 10)
}

export function getTeamDefensivePower(state: SimulationState, team: TeamId) {
  const livingHeroes = state.arcanes.filter((arcane) => arcane.team === team && arcane.stats.hp > 0 && arcane.respawn <= state.time)
  const livingTowers = state.towers.filter((tower) => tower.team === team && tower.hp > 0).length
  const tierFour = state.structures.filter((structure) => structure.team === team && structure.kind === 'tower_tier_4' && structure.hp > 0).length
  return Math.min(100, livingHeroes.length * 12 + livingTowers * 3 + tierFour * 8)
}

export function getTeamSafeFarmValue(state: SimulationState, team: TeamId) {
  const safeLaneCreeps = state.creeps.filter((creep) => (
    creep.team !== team &&
    laneProgress(creep.pos, lanePaths[team][creep.lane]) < 0.55 &&
    !state.towers.some((tower) => tower.team !== team && tower.hp > 0 && distance(tower.pos, creep.pos) <= tower.range + 1)
  )).length
  const availableCamps = state.camps.filter((camp) => camp.hp > 0).length
  return Math.min(100, safeLaneCreeps * 6 + availableCamps * 4)
}

export function getTeamLanePressure(state: SimulationState, team: TeamId) {
  const pressure = state.creeps
    .filter((creep) => creep.team === team)
    .reduce((sum, creep) => sum + laneProgress(creep.pos, lanePaths[team][creep.lane]) * getCreepPressureValue(creep), 0)
  return Math.min(100, pressure * 8)
}

export function getTeamStructureRisk(state: SimulationState, team: TeamId) {
  const enemyTeam = team === 'dawn' ? 'dusk' : 'dawn'
  const lowTowerRisk = state.towers
    .filter((tower) => tower.team === team && tower.hp > 0)
    .reduce((sum, tower) => {
      const enemyPressure = state.creeps.filter((creep) => creep.team === enemyTeam && creep.lane === tower.lane && distance(creep.pos, tower.pos) <= 12).length
      const hpPressure = (1 - tower.hp / tower.maxHp) * 22
      return sum + enemyPressure * 8 + hpPressure
    }, 0)
  const highGroundRisk = state.structures
    .filter((structure) => structure.team === team && structure.hp > 0)
    .reduce((sum, structure) => {
      const enemyPressure = state.creeps.filter((creep) => creep.team === enemyTeam && distance(creep.pos, structure.pos) <= 12).length
      return sum + enemyPressure * 7 + (1 - structure.hp / structure.maxHp) * 18
    }, 0)

  return Math.min(100, lowTowerRisk + highGroundRisk)
}

export function getTeamVisionControl(state: SimulationState, team: TeamId) {
  const livingHeroes = state.arcanes.filter((arcane) => arcane.team === team && arcane.stats.hp > 0 && arcane.respawn <= state.time)
  const visibleEnemies = state.arcanes.filter((arcane) => (
    arcane.team !== team &&
    arcane.stats.hp > 0 &&
    arcane.respawn <= state.time &&
    isPointVisibleToTeam(state, team, arcane.pos)
  )).length
  const bossVision = isPointVisibleToTeam(state, team, state.boss.pos) ? 18 : 0
  return Math.min(100, livingHeroes.length * 9 + visibleEnemies * 10 + bossVision)
}

export function average(values: number[]) {
  if (values.length === 0) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

export function createPlayerAiContext(input: {
  state: SimulationState
  arcane: Arcane
  visibleEnemies: Arcane[]
  teamPlan: ReturnType<typeof selectTeamPlan>
  dangerScore: number
  hpRatio: number
  atBase: boolean
  safeEnemyCreeps: Creep[]
  laneCreep?: Creep
  economyCamp?: Camp
  allyToDefend?: Arcane
  nearbyEnemy?: Arcane
  enemyTower?: Tower
}) {
  const analyzed = getAnalyzedGameState(input.state)
  const team = analyzed.teams[input.arcane.team]
  const nearestEnemy = input.nearbyEnemy ?? nearest(input.arcane.pos, input.visibleEnemies, 14)
  const localNumbers = getLocalNumbers(input.state, input.arcane.team, input.arcane.pos, 14, input.visibleEnemies)
  const itemTimingUrgency = getItemTimingUrgency(input.arcane, input.state.time)
  const farmAppetite = getRoleFarmAppetite(input.arcane.role)
  const laneFarmCreeps = input.safeEnemyCreeps.filter((creep) => creep.lane === input.arcane.lane)
  const laneFarmValue = Math.min(100, laneFarmCreeps.length * 18 + (input.laneCreep ? 22 : 0))
  const jungleFarmValue = input.economyCamp ? getCampFarmValueForAi(input.state, input.arcane, input.economyCamp) : 0
  const estimatedLaneFarmGpm = getEstimatedLaneFarmGpm(input.state, input.arcane, laneFarmCreeps)
  const estimatedJungleFarmGpm = input.economyCamp ? getEstimatedJungleFarmGpm(input.state, input.arcane, input.economyCamp) : 0
  const estimatedLanePushGpm = getEstimatedLanePushGpm(input.arcane, input.safeEnemyCreeps)
  const mentalState = getPlayerMentalState(input.state, input.arcane, input.dangerScore, Math.max(0, -localNumbers.advantage))
  let nearbyFightCount = 0
  for (const enemy of input.visibleEnemies) {
    if (distance(enemy.pos, input.arcane.pos) <= 14) nearbyFightCount += 1
  }

  return {
    gameTime: analyzed.gameTime,
    matchSeed: input.state.matchSeed,
    teamPlan: input.teamPlan,
    team,
    profile: getPlayerAiProfile(input.arcane),
    self: {
      healthPct: input.hpRatio,
      manaPct: input.arcane.stats.maxMana > 0 ? input.arcane.stats.mana / input.arcane.stats.maxMana : 1,
      currentMode: input.arcane.aiMode,
      danger: input.dangerScore,
      itemTimingUrgency,
      developmentNeed: getArcaneDevelopmentNeed(input.arcane, input.state.time),
      economyNeed: getArcaneEconomyNeed(input.arcane, input.state.time),
      ...mentalState,
    },
    local: {
      enemyNumbersAdvantage: Math.max(0, -localNumbers.advantage),
      allySaveNeed: input.allyToDefend ? (1 - input.allyToDefend.stats.hp / input.allyToDefend.stats.maxHp) * 100 : 0,
      nearbyFightValue: nearbyFightCount * 24,
      finishEnemyValue: nearestEnemy ? (1 - nearestEnemy.stats.hp / nearestEnemy.stats.maxHp) * 100 : 0,
      objectivePressure: input.enemyTower ? 62 + (1 - input.enemyTower.hp / input.enemyTower.maxHp) * 35 : input.teamPlan?.type === 'take_boss' ? 72 : 0,
    },
    map: {
      safeLaneFarmValue: Math.round(laneFarmValue * (0.35 + farmAppetite * 0.8)),
      jungleFarmValue: Math.round(jungleFarmValue * (0.25 + farmAppetite * 0.85)),
      lanePushValue: Math.round(Math.min(100, input.safeEnemyCreeps.length * 12 + team.lanePressure * 0.35) * (0.55 + farmAppetite * 0.45)),
      laneFarmGpm: estimatedLaneFarmGpm,
      jungleFarmGpm: estimatedJungleFarmGpm,
      lanePushGpm: estimatedLanePushGpm,
      gankRisk: Math.round(input.dangerScore * 0.58),
    },
  }
}

export function getPlayerAiProfile(arcane: Arcane) {
  const cacheKey = `${arcane.id}:${arcane.heroDefinitionId}:${arcane.role}:${arcane.aggression}:${arcane.shotcalling}`
  const cached = playerAiProfileCache.get(cacheKey)
  if (cached) return cached
  const profile = buildPlayerAiProfile(arcane)
  playerAiProfileCache.set(cacheKey, profile)
  return profile
}

export function buildPlayerAiProfile(arcane: Arcane) {
  const role = getPlayerAiRole(arcane.role)
  const baselines = getPlayerSkillBaselines(arcane.role)
  const mechanics = getStablePlayerSkill(arcane.id, 'mechanics', baselines.mechanics)
  const laning = getStablePlayerSkill(arcane.id, 'laning', baselines.laning)
  const mapAwareness = getStablePlayerSkill(arcane.id, 'map_awareness', baselines.mapAwareness)
  const teamfight = getStablePlayerSkill(arcane.id, 'teamfight', baselines.teamfight)
  const positioning = getStablePlayerSkill(arcane.id, 'positioning', baselines.positioning)
  const communication = Math.round(clampNumber(
    arcane.shotcalling * 0.55 + getStablePlayerSkill(arcane.id, 'communication', baselines.communication) * 0.45,
    20,
    96,
  ))
  const discipline = getStablePlayerSkill(arcane.id, 'discipline', baselines.discipline)
  const clutch = getStablePlayerSkill(arcane.id, 'clutch', baselines.clutch)
  const hero = getHeroDefinition(arcane.heroDefinitionId)
  const roleFit = getHeroRoleMasteryFit(arcane.role, hero.roles)
  const heroMastery = getStablePlayerSkill(
    `${arcane.id}:${arcane.heroDefinitionId}`,
    'hero_mastery',
    80 - (hero.complexity - 1) * 5 + roleFit,
    10,
  )
  const farmPriority = getRoleFarmPriority(arcane.role)
  const greed = arcane.role === 'Safe Lane' ? 84 : arcane.role === 'Mid' ? 66 : arcane.role === 'Offlane' ? 46 : arcane.role === 'Greedy Support' ? 30 : 14
  return {
    playerId: arcane.id,
    role,
    farmPriority,
    farmingEfficiency: getStablePlayerSkill(arcane.id, 'farming', arcane.role === 'Safe Lane' ? 86 : arcane.role === 'Mid' ? 76 : arcane.role === 'Offlane' ? 60 : arcane.role === 'Greedy Support' ? 44 : 34, 6),
    gpmDecisionBias: getRoleGpmDecisionBias(arcane.role),
    mechanics,
    laning,
    mapAwareness,
    teamfight,
    positioning,
    communication,
    discipline,
    clutch,
    heroMastery,
    aggression: arcane.aggression,
    personality: {
      riskTolerance: arcane.aggression,
      greed,
      obedienceToCalls: arcane.shotcalling,
      playmakingBias: arcane.role === 'Offlane' || arcane.role === 'Greedy Support' ? 72 : 42,
      saveAllyBias: arcane.role === 'Dedicated Support' ? 86 : arcane.role === 'Greedy Support' ? 54 : 28,
      farmBias: greed,
      objectiveBias: arcane.role === 'Offlane' ? 70 : arcane.role === 'Safe Lane' ? 58 : 52,
      tiltLevel: 0,
    },
  } as const
}

export function getPlayerSkillBaselines(role: string) {
  if (role === 'Safe Lane') return { mechanics: 82, laning: 84, mapAwareness: 68, teamfight: 72, positioning: 74, communication: 62, discipline: 70, clutch: 76 }
  if (role === 'Mid') return { mechanics: 86, laning: 86, mapAwareness: 76, teamfight: 80, positioning: 75, communication: 70, discipline: 68, clutch: 78 }
  if (role === 'Offlane') return { mechanics: 74, laning: 78, mapAwareness: 76, teamfight: 86, positioning: 80, communication: 76, discipline: 76, clutch: 80 }
  if (role === 'Greedy Support') return { mechanics: 76, laning: 72, mapAwareness: 86, teamfight: 82, positioning: 78, communication: 84, discipline: 74, clutch: 76 }
  return { mechanics: 70, laning: 72, mapAwareness: 90, teamfight: 80, positioning: 84, communication: 92, discipline: 82, clutch: 80 }
}

export function getStablePlayerSkill(playerId: string, skill: string, baseline: number, spread = 8) {
  const variation = (seededRandomUnit(playerId, `player-skill:${skill}`) * 2 - 1) * spread
  return Math.round(clampNumber(baseline + variation, 20, 98))
}

export function getHeroRoleMasteryFit(role: string, heroRoles: HeroRole[]) {
  if (role === 'Safe Lane') return heroRoles.includes('carry') ? 5 : heroRoles.includes('pusher') ? 2 : -3
  if (role === 'Mid') return heroRoles.some((heroRole) => heroRole === 'nuker' || heroRole === 'escape' || heroRole === 'carry') ? 4 : -2
  if (role === 'Offlane') return heroRoles.some((heroRole) => heroRole === 'durable' || heroRole === 'initiator' || heroRole === 'disabler') ? 5 : -3
  return heroRoles.some((heroRole) => heroRole === 'support' || heroRole === 'disabler') ? 5 : -3
}

export function getPlayerMentalState(
  state: SimulationState,
  arcane: Arcane,
  danger = getDangerScore(state, arcane),
  enemyNumbersAdvantage = 0,
) {
  const team = getAnalyzedGameState(state).teams[arcane.team]
  const minutes = Math.max(0, state.time) / 60
  const statusFatigue = arcane.decisionStatus === 'hesitant' ? 8 : arcane.decisionStatus === 'tilted' ? 12 : arcane.decisionStatus === 'sharp' ? -4 : 0
  const fatigue = clampNumber(
    Math.max(0, minutes - 22) * 1.05 + Math.max(0, minutes - 45) * 0.75 + statusFatigue,
    0,
    68,
  )
  const netWorthDeficitPct = Math.max(0, -team.netWorthLead) / Math.max(1, team.netWorth) * 100
  const statusTilt = arcane.decisionStatus === 'tilted' ? 34 : arcane.decisionStatus === 'hesitant' ? 8 : arcane.decisionStatus === 'sharp' ? -5 : 0
  const tilt = clampNumber(
    arcane.deaths * 3.4 - arcane.kills * 1.25 - arcane.assists * 0.22 + netWorthDeficitPct * 0.75 + team.throwRisk * 0.12 + statusTilt,
    0,
    82,
  )
  const pressure = clampNumber(
    danger * 0.48 + enemyNumbersAdvantage * 12 + (1 - arcane.stats.hp / Math.max(1, arcane.stats.maxHp)) * 28 + team.baseThreat * 0.18 + (minutes >= 40 ? 8 : 0),
    0,
    100,
  )
  const informationUncertainty = clampNumber(
    (100 - team.visionControl) * 0.66 + (team.deadHeroes > 0 ? team.deadHeroes * 5 : 0) + (state.time < 0 ? 8 : 0),
    0,
    100,
  )
  return { fatigue, tilt, pressure, informationUncertainty }
}

export function getArcaneCoordinationReliability(state: SimulationState, arcane: Arcane) {
  const mentalState = getPlayerMentalState(state, arcane)
  return getCoordinationReliability(getPlayerAiProfile(arcane), mentalState.fatigue, mentalState.tilt)
}

export function getPlayerAiRole(role: string) {
  if (role === 'Safe Lane') return 'safe_lane'
  if (role === 'Mid') return 'mid'
  if (role === 'Offlane') return 'offlane'
  if (role === 'Greedy Support') return 'greedy_support'
  return 'dedicated_support'
}

export function recordFailedExecutionMemory(
  state: SimulationState,
  arcane: Arcane,
  intendedMode: PlayerModeType,
  failure?: ExecutionFailureType,
) {
  if (!failure) return
  if (intendedMode !== 'finish_enemy' && intendedMode !== 'join_fight') return
  if (failure !== 'overcommit' && failure !== 'wrong_target' && failure !== 'panic_retreat') return

  state.teamMemory[arcane.team] = addAiMemoryEvent(state.teamMemory[arcane.team], {
    id: `memory-failed-gank-${arcane.id}-${Math.floor(state.time / 8)}`,
    type: 'failed_gank',
    teamId: arcane.team,
    gameTime: state.time,
    position: arcane.pos,
    value: failure === 'overcommit' ? 58 : 44,
    expiresAtGameTime: state.time + 150,
    tags: ['gank', 'danger', failure, arcane.lane],
  })
}

export function getItemTimingUrgency(arcane: Arcane, time: number) {
  const purchase = getItemPurchasePlan(arcane)
  if (!purchase) return 0

  const expectedGpm = getExpectedItemTimingGpm(arcane, time)
  const timeToItem = expectedTimeToItemSeconds(purchase.netCost, arcane.stats.gold, expectedGpm)
  const progressScore = Math.min(100, (arcane.stats.gold / Math.max(1, purchase.netCost)) * 100)
  const timeScore = timeToItem <= 0
    ? 100
    : timeToItem <= 30
      ? 94
      : timeToItem <= 60
        ? 82
        : timeToItem <= 120
          ? 62
          : timeToItem <= 240
            ? 42
            : 24

  return Math.round(Math.max(timeScore, progressScore * 0.65))
}

export function getExpectedItemTimingGpm(arcane: Arcane, time: number) {
  const roleTarget = getRoleGpmTarget(arcane.role, time)
  const farmSkillMultiplier = arcane.role === 'Safe Lane'
    ? 1.04
    : arcane.role === 'Mid'
      ? 1.01
      : arcane.role.includes('Support')
        ? 0.96
        : 0.99

  return roleTarget * farmSkillMultiplier
}

export function nextShopItem(arcane: Arcane) {
  return getItemPurchasePlan(arcane)?.item
}

export type ItemPurchasePlan = {
  item: ShopItem
  soldItemName?: string
  resaleGold: number
  netCost: number
}

export function getItemPurchasePlan(arcane: Arcane): ItemPurchasePlan | undefined {
  const cached = itemPurchasePlanByInventory.get(arcane.items)
  if (cached) return cached.plan
  const plan = calculateItemPurchasePlan(arcane)
  itemPurchasePlanByInventory.set(arcane.items, { plan })
  return plan
}

export function calculateItemPurchasePlan(arcane: Arcane): ItemPurchasePlan | undefined {
  const candidates = getShopCandidatePool(arcane)
    .filter((item) => !arcane.items.includes(item.name) && canRoleBuyItem(arcane, item))

  if (arcane.items.length < 6) {
    const item = candidates[0]
    return item ? { item, resaleGold: 0, netCost: item.cost } : undefined
  }

  for (const item of candidates) {
    const replacement = getItemReplacementCandidate(arcane, item)
    if (!replacement) continue
    const minimumUpgrade = Math.max(300, replacement.value * 0.35)
    if (item.cost < replacement.value + minimumUpgrade) continue
    const resaleGold = Math.floor(replacement.value * itemResaleRate)
    return {
      item,
      soldItemName: replacement.name,
      resaleGold,
      netCost: Math.max(0, item.cost - resaleGold),
    }
  }

  return undefined
}

export function getShopCandidatePool(arcane: Arcane) {
  const cacheKey = `${arcane.heroDefinitionId}:${arcane.role}:${arcane.stats.attackType}`
  const cached = shopCandidatePoolByHero.get(cacheKey)
  if (cached) return cached
  const seen = new Set<string>()
  const candidates: ShopItem[] = []
  const addCandidate = (item: ShopItem | undefined) => {
    if (!item || seen.has(item.id)) return
    seen.add(item.id)
    candidates.push(item)
  }
  const recommendedIds = getRecommendedBuildItemIdsForHero(arcane.heroDefinitionId)
  const supplemental = getHeroDefinition(arcane.heroDefinitionId).supplementalSkills ?? []
  recommendedIds.slice(0, 3).forEach((id) => addCandidate(shopItemById.get(id)))
  if (supplemental.some((skill) => skill.category === 'shard_granted')) {
    addCandidate(shopItemById.get(abilityUpgradeItemIds.shard))
  }
  recommendedIds.slice(3, 4).forEach((id) => addCandidate(shopItemById.get(id)))
  if (supplemental.some((skill) => skill.category === 'scepter_granted')) {
    addCandidate(shopItemById.get(abilityUpgradeItemIds.scepter))
  }
  recommendedIds.slice(4).forEach((id) => addCandidate(shopItemById.get(id)))
  shopCatalog.forEach(addCandidate)
  shopCandidatePoolByHero.set(cacheKey, candidates)
  return candidates
}

export function getItemReplacementCandidate(arcane: Arcane, upgrade: ShopItem) {
  const owned = arcane.items.map((name, index) => {
    const item = shopItemByName.get(name)
    const consumable = getConsumableByName(name)
    return {
      name,
      index,
      item,
      consumable,
      value: item?.cost ?? consumable?.cost ?? 0,
    }
  })
  const ownedBoots = owned.filter(({ item, name }) => item ? isBootItem(item) : name.toLowerCase().includes('boot'))
  if (isBootItem(upgrade) && ownedBoots.length > 0) {
    return ownedBoots.sort((a, b) => a.value - b.value || a.index - b.index)[0]
  }
  return owned.sort((a, b) => (
    Number(Boolean(b.consumable)) - Number(Boolean(a.consumable)) ||
    a.value - b.value ||
    a.index - b.index
  ))[0]
}

export function canRoleBuyItem(arcane: Arcane, item: ShopItem) {
  if (arcane.items.includes(item.name)) return false
  if (isBootItem(item)) {
    const ownedBootCosts = arcane.items.flatMap((name) => {
      const owned = shopItemByName.get(name)
      return owned && isBootItem(owned) ? [owned.cost] : name.toLowerCase().includes('boot') ? [0] : []
    })
    if (ownedBootCosts.length > 0 && item.cost <= Math.max(...ownedBootCosts) + 250) return false
  }
  if (arcane.role.includes('Support') && item.cost > 4000 && getInventoryPowerItemCount(arcane) < 4) return false
  if (arcane.stats.attackType === 'melee' && item.id.includes('ranged')) return false
  if (arcane.stats.attackType === 'ranged' && item.id.includes('cleave')) return false
  return true
}

export function isBootItem(item: ShopItem) {
  return item.id.includes('boot') || item.name.toLowerCase().includes('boot')
}

export function getInventoryPowerItemCount(arcane: Arcane) {
  return getShopItemsForInventory(arcane.items).length
}

export function getGankTarget(
  state: SimulationState,
  arcane: Arcane,
  visibleEnemies: Arcane[],
  targetThreatLimit: number,
  currentDanger: number,
  frameContext?: TickFrameContext,
) {
  if (getGamePhase(state.time) !== 'early') return undefined
  if (currentDanger > 56) return undefined
  if (arcane.stats.hp / arcane.stats.maxHp < 0.68) return undefined
  if (arcane.stats.mana / arcane.stats.maxMana < 0.18) return undefined

  const roleBias = arcane.role === 'Greedy Support'
    ? 38
    : arcane.role === 'Dedicated Support'
      ? 15
      : arcane.role === 'Mid'
        ? 8
        : -12

  if (roleBias < 0) return undefined

  const maxTravel = arcane.role === 'Greedy Support' ? 32 : arcane.role === 'Dedicated Support' ? 22 : 14
  const ownLaneAnchor = nearestLanePoint(arcane.pos, lanePaths[arcane.team][arcane.lane])
  const ownLaneDistance = distance(arcane.pos, ownLaneAnchor)
  const laneLeashPenalty = arcane.role === 'Greedy Support' ? Math.max(0, ownLaneDistance - 16) * 0.55 : Math.max(0, ownLaneDistance - 10) * 1.2

  return visibleEnemies
    .filter((enemy) => (
      enemy.lane !== arcane.lane &&
      distance(arcane.pos, enemy.pos) <= maxTravel &&
      !isUnsafeUnderEnemyTower(state, arcane.team, enemy.pos, enemy.lane) &&
      !isTooDeepForAggression(state, arcane, enemy.pos, enemy.lane, 'early')
    ))
    .map((enemy) => {
      const hpRatio = enemy.stats.hp / enemy.stats.maxHp
      const travelDistance = distance(arcane.pos, enemy.pos)
      const allyNearTarget = nearest(enemy.pos, state.arcanes.filter((ally) => (
        ally.team === arcane.team &&
        ally.id !== arcane.id &&
        ally.stats.hp > 0 &&
        ally.respawn <= state.time
      )), 9)
      const targetDanger = getEnemyActionThreatScore(state, arcane, enemy.pos, visibleEnemies, frameContext)
      const effectiveTargetDanger = getEffectiveDangerScore(0, targetDanger, arcane.stats.hp / arcane.stats.maxHp)
      const localNumbers = getLocalNumbers(state, arcane.team, enemy.pos, 12, visibleEnemies)
      const ownLane = getLaneWinAssessment(state, arcane.team, arcane.lane)
      const targetLane = getLaneWinAssessment(state, arcane.team, enemy.lane)
      const numbersBonus = Math.max(0, localNumbers.advantage) * 12
      const numbersPenalty = Math.max(0, -localNumbers.advantage) * 18
      const laneHelpBonus = targetLane.losing ? 18 : targetLane.winChance < 0.5 ? 9 : 0
      const abandonLanePenalty = ownLane.losing ? 18 : ownLane.winChance < 0.5 ? 8 : 0
      const score = roleBias +
        (1 - hpRatio) * 42 +
        (allyNearTarget ? 18 : 0) +
        laneHelpBonus +
        numbersBonus -
        numbersPenalty +
        (enemy.lane === 'mid' ? 5 : 0) +
        arcane.aggression * 0.16 -
        travelDistance * 0.62 -
        laneLeashPenalty -
        abandonLanePenalty -
        Math.max(0, effectiveTargetDanger - targetThreatLimit) * 1.35

      return { enemy, score, targetDanger: effectiveTargetDanger, localNumbers }
    })
    .filter(({ score, targetDanger, localNumbers }) => score >= 38 && targetDanger <= targetThreatLimit + 6 && localNumbers.advantage > -0.35)
    .sort((a, b) => b.score - a.score)[0]?.enemy
}

export function getRotateTarget(
  state: SimulationState,
  arcane: Arcane,
  visibleEnemies: Arcane[],
  targetThreatLimit: number,
  currentDanger: number,
  frameContext?: TickFrameContext,
) {
  const phase = getGamePhase(state.time)
  if (arcane.role !== 'Mid' || phase === 'late') return undefined
  if (currentDanger > 58) return undefined
  if (arcane.stats.hp / arcane.stats.maxHp < 0.64) return undefined
  if (arcane.stats.mana / arcane.stats.maxMana < 0.22) return undefined

  const maxTravel = phase === 'early' ? 28 : 36
  return visibleEnemies
    .filter((enemy) => (
      enemy.lane !== 'mid' &&
      distance(arcane.pos, enemy.pos) <= maxTravel &&
      !isUnsafeUnderEnemyTower(state, arcane.team, enemy.pos, enemy.lane) &&
      !isTooDeepForAggression(state, arcane, enemy.pos, enemy.lane, phase)
    ))
    .map((enemy) => {
      const hpRatio = enemy.stats.hp / enemy.stats.maxHp
      const travelDistance = distance(arcane.pos, enemy.pos)
      const allyNearTarget = nearest(enemy.pos, state.arcanes.filter((ally) => (
        ally.team === arcane.team &&
        ally.id !== arcane.id &&
        ally.stats.hp > 0 &&
        ally.respawn <= state.time
      )), phase === 'early' ? 10 : 13)
      const alliedPressure = state.creeps.some((creep) => creep.team === arcane.team && creep.lane === enemy.lane && distance(creep.pos, enemy.pos) <= 8)
      const targetDanger = getEnemyActionThreatScore(state, arcane, enemy.pos, visibleEnemies, frameContext)
      const effectiveTargetDanger = getEffectiveDangerScore(0, targetDanger, arcane.stats.hp / arcane.stats.maxHp)
      const localNumbers = getLocalNumbers(state, arcane.team, enemy.pos, phase === 'early' ? 12 : 14, visibleEnemies)
      const midLane = getLaneWinAssessment(state, arcane.team, 'mid')
      const targetLane = getLaneWinAssessment(state, arcane.team, enemy.lane)
      const numbersBonus = Math.max(0, localNumbers.advantage) * 12
      const numbersPenalty = Math.max(0, -localNumbers.advantage) * 18
      const laneHelpBonus = targetLane.losing ? 20 : targetLane.winChance < 0.52 ? 10 : 0
      const midAbandonPenalty = midLane.losing ? 16 : midLane.winChance < 0.48 ? 8 : 0
      const score =
        24 +
        (phase === 'mid' ? 10 : 0) +
        (1 - hpRatio) * 40 +
        (allyNearTarget ? 18 : 0) +
        (alliedPressure ? 8 : 0) +
        laneHelpBonus +
        numbersBonus -
        numbersPenalty +
        arcane.aggression * 0.14 -
        travelDistance * 0.52 -
        midAbandonPenalty -
        Math.max(0, effectiveTargetDanger - targetThreatLimit) * 1.25

      return { enemy, score, targetDanger: effectiveTargetDanger, localNumbers }
    })
    .filter(({ score, targetDanger, localNumbers }) => score >= 38 && targetDanger <= targetThreatLimit + 6 && localNumbers.advantage > -0.35)
    .sort((a, b) => b.score - a.score)[0]?.enemy
}

export function getInitiateTarget(
  state: SimulationState,
  arcane: Arcane,
  visibleEnemies: Arcane[],
  targetThreatLimit: number,
  currentDanger: number,
  frameContext?: TickFrameContext,
) {
  const phase = getGamePhase(state.time)
  if (arcane.role !== 'Offlane' || phase === 'early') return undefined
  if (currentDanger > 54) return undefined
  if (arcane.stats.hp / arcane.stats.maxHp < 0.76) return undefined

  const alliesReady = state.arcanes.filter((ally) => (
    ally.team === arcane.team &&
    ally.id !== arcane.id &&
    ally.stats.hp > 0 &&
    ally.stats.hp / ally.stats.maxHp > 0.48 &&
    ally.respawn <= state.time &&
    distance(ally.pos, arcane.pos) <= (phase === 'mid' ? 15 : 18)
  ))
  if (alliesReady.length < 2) return undefined

  return visibleEnemies
    .filter((enemy) => (
      distance(arcane.pos, enemy.pos) <= (phase === 'mid' ? 13 : 16) &&
      !isUnsafeUnderEnemyTower(state, arcane.team, enemy.pos, enemy.lane)
    ))
    .map((enemy) => {
      const enemyCluster = visibleEnemies.filter((other) => distance(other.pos, enemy.pos) <= 8).length
      const allyCluster = alliesReady.filter((ally) => distance(ally.pos, enemy.pos) <= 13).length
      const targetDanger = getEnemyActionThreatScore(state, arcane, enemy.pos, visibleEnemies, frameContext)
      const effectiveTargetDanger = getEffectiveDangerScore(0, targetDanger, arcane.stats.hp / arcane.stats.maxHp)
      const localNumbers = getLocalNumbers(state, arcane.team, enemy.pos, phase === 'mid' ? 14 : 16, visibleEnemies)
      const numbersBonus = Math.max(0, localNumbers.advantage) * 13
      const numbersPenalty = Math.max(0, -localNumbers.advantage) * 20
      const score =
        28 +
        (phase === 'late' ? 12 : 0) +
        enemyCluster * 12 +
        allyCluster * 10 +
        numbersBonus -
        numbersPenalty +
        arcane.aggression * 0.22 -
        distance(arcane.pos, enemy.pos) * 0.7 -
        Math.max(0, effectiveTargetDanger - targetThreatLimit - 8) * 1.1

      return { enemy, score, targetDanger: effectiveTargetDanger, localNumbers }
    })
    .filter(({ score, targetDanger, localNumbers }) => score >= 52 && targetDanger <= targetThreatLimit + 12 && localNumbers.advantage >= 0)
    .sort((a, b) => b.score - a.score)[0]?.enemy
}

export function getDecisionStatusMultiplier(status: DecisionStatus) {
  if (status === 'sharp') return 0.78
  if (status === 'hesitant') return 1.28
  if (status === 'tilted') return 0.68
  return 1
}

export function getArcaneDecisionInterval(arcane: Arcane, mode: PlayerModeType, macroDecision: string) {
  const roleBase = arcane.role === 'Dedicated Support'
    ? 0.52
    : arcane.role === 'Mid'
      ? 0.58
      : arcane.role === 'Offlane'
        ? 0.68
        : arcane.role === 'Greedy Support'
          ? 0.74
          : 0.88
  const modeMultiplier = mode === 'retreat' || mode === 'join_fight' || mode === 'finish_enemy'
    ? 0.62
    : mode === 'take_objective' || macroDecision.startsWith('Fazer')
      ? 0.82
      : mode === 'farm_lane' || mode === 'farm_jungle'
        ? 1.22
        : 1

  return clampNumber(roleBase * modeMultiplier * arcane.decisionTempo * getDecisionStatusMultiplier(arcane.decisionStatus), 0.28, 1.8)
}

export function getArcaneHoldDecisionInterval(arcane: Arcane) {
  return clampNumber(0.34 * arcane.decisionTempo * getDecisionStatusMultiplier(arcane.decisionStatus), 0.18, 0.75)
}

export function shouldReconsiderArcaneDecision(state: SimulationState, arcane: Arcane, atBase: boolean, canBuyAtBase: boolean) {
  if (arcane.lastDecisionAt < 0) return true
  if (atBase && canBuyAtBase) return true

  const hpRatio = arcane.stats.hp / Math.max(1, arcane.stats.maxHp)
  const manaRatio = arcane.stats.mana / Math.max(1, arcane.stats.maxMana)
  const emergencyRecovery = getArcaneEmergencyRecoveryRatio(state, arcane)
  const hardRetreatHpRatio = Math.max(0.22, 0.36 - emergencyRecovery * 0.6)
  if (atBase && arcane.macroDecision === 'Recuperar recursos' && hpRatio >= 0.84 && manaRatio >= 0.65) return true
  if (atBase && distance(arcane.target, teamInfo[arcane.team].base) < baseServiceRange && hpRatio >= 0.84 && manaRatio >= 0.65 && !canBuyAtBase) return true
  if (hpRatio < hardRetreatHpRatio || arcane.lastDecisionHpRatio - hpRatio > 0.19) return true
  if (manaRatio < 0.2 && arcane.lastDecisionManaRatio - manaRatio > 0.18) return true
  if (distance(arcane.pos, arcane.target) <= 1.15) return true
  if (distance(arcane.pos, formationPoint(arcane.target, arcane.id)) <= 1.15) return true
  if (distance(arcane.pos, arcane.lastDecisionPos) <= 0.3 && state.time - arcane.lastDecisionAt > 1.45) return true
  if (state.time - arcane.lastDecisionAt > maxDecisionHoldSeconds) return true

  const visibleThreat = state.arcanes.some((enemy) => (
    enemy.team !== arcane.team &&
    enemy.stats.hp > 0 &&
    enemy.respawn <= state.time &&
    isPointVisibleToTeam(state, arcane.team, enemy.pos) &&
    distance(enemy.pos, arcane.pos) <= (hpRatio < 0.65 ? 11 : 7)
  ))
  if (visibleThreat) return true

  const nearbyTowerThreat = state.towers.some((tower) => tower.team !== arcane.team && tower.hp > 0 && distance(tower.pos, arcane.pos) <= tower.range + 0.8)
  if (nearbyTowerThreat && hpRatio < 0.84) return true

  const lastHitDamage = getArcaneLastHitDamage(state, arcane)
  for (const creep of state.creeps) {
    if (creep.lane !== arcane.lane || creep.hp <= 0) continue
    if (
      creep.team !== arcane.team &&
      creep.hp <= lastHitDamage * 1.12 &&
      distance(creep.pos, arcane.pos) <= Math.max(getArcaneAttackCenterRange(arcane, creep) + 2, 7)
    ) {
      return true
    }
    if (
      creep.team === arcane.team &&
      creep.hp <= creep.maxHp * 0.5 &&
      distance(creep.pos, arcane.pos) <= Math.max(arcane.stats.range + 2, 7)
    ) {
      return true
    }
  }

  if (arcane.microDecision.startsWith('Atacar chefe') && state.boss.hp <= 0) return true
  if ((arcane.macroDecision.startsWith('Pressionar torre') || arcane.macroDecision.startsWith('Fazer objetivo')) && !getFocusedObjectiveTarget(state, arcane)) return true
  if (isTeamCallDecision(arcane)) {
    const activeCall = state.teamCalls[arcane.team]
    if (!activeCall || activeCall.expiresAt <= state.time || !isTeamCallTargetAlive(state, activeCall)) return true
    if (state.time - activeCall.createdAt > 8 && arcane.macroDecision.startsWith('Juntar com o time')) return true
    if (state.time - activeCall.createdAt > 4 && arcane.macroDecision.startsWith('Chamar objetivo')) return true
  }

  const baseThreat = getBaseThreat(state, arcane.team)
  if (baseThreat?.urgent && baseThreat.hpRatio < 0.42) return true

  return false
}

export type TeleportTarget = {
  label: string
  buildingPos: Point
  arrival: Point
  isFountain: boolean
}

export function updateChannelingArcane(state: SimulationState, arcane: Arcane): Arcane {
  const channel = arcane.channeling
  if (!channel) return arcane

  if (isArcaneStunned(state, arcane)) {
    return {
      ...arcane,
      channeling: undefined,
      macroDecision: getChannelMacroDecision(channel),
      microDecision: `${channel.label} interrompido`,
      aiReason: `${channel.kind}_interrupted`,
      decision: `${channel.label} interrompido`,
      forceDecision: true,
      nextDecisionAt: state.time + 0.1,
    }
  }

  if (state.time >= channel.completesAt) {
    return {
      ...arcane,
      channeling: undefined,
      macroDecision: getChannelMacroDecision(channel),
      microDecision: channel.effectLabel,
      aiReason: `${channel.kind}_complete`,
      decision: channel.effectLabel,
      forceDecision: true,
      nextDecisionAt: state.time + 0.1,
    }
  }

  const remaining = Math.ceil(channel.completesAt - state.time)
  return {
    ...arcane,
    target: channel.target,
    macroDecision: getChannelMacroDecision(channel),
    microDecision: `Canalizando ${channel.label} ${remaining}s`,
    aiReason: `${channel.kind}_channel`,
    decision: `Canalizando ${channel.label} ${remaining}s`,
    forceDecision: false,
    nextDecisionAt: Math.max(arcane.nextDecisionAt, channel.completesAt),
  }
}
export type RuntimeItemEffect = {
  effectId: string
  kind: string
  target: string
  tags: string[]
  values: Record<string, number | number[] | string | boolean>
  cooldown?: number
  duration?: number
}

export function completeTeleportChannel(state: SimulationState, arcane: Arcane, channel: ChannelingAction): Arcane {
  const arrival = clampToMapBounds(channel.target)
  return {
    ...arcane,
    pos: arrival,
    target: arrival,
    channeling: undefined,
    macroDecision: getChannelMacroDecision(channel),
    microDecision: channel.effectLabel,
    aiReason: 'teleport_complete',
    decision: channel.effectLabel,
    forceDecision: true,
    nextDecisionAt: state.time + 0.1,
    lastDecisionAt: -99,
    lastDecisionPos: arrival,
    pathIndex: syncLanePathIndex(arrival, lanePaths[arcane.team][arcane.lane], arcane.pathIndex),
  }
}

export function getChannelMacroDecision(channel: ChannelingAction) {
  if (channel.kind === 'teleport') return 'Teleportar'
  return 'Canalizar'
}

export function startTeleportIfUseful(
  state: SimulationState,
  arcane: Arcane,
  desiredTarget: Point,
  macroDecision: string,
  microDecision: string,
  atBase: boolean,
  canBuyAtBase: boolean,
): Arcane | undefined {
  if (!canStartTeleport(state, arcane)) return undefined
  if (canBuyAtBase) return undefined
  const teleportTarget = getBestTeleportTarget(state, arcane, desiredTarget, macroDecision, microDecision, atBase)
  if (!teleportTarget) return undefined

  const channelSeconds = getTeleportChannelDuration(state, arcane.team, teleportTarget)
  state.recentTeleports = [
    ...(state.recentTeleports ?? []).slice(-23),
    { team: arcane.team, pos: teleportTarget.buildingPos, startedAt: state.time },
  ]

  return {
    ...arcane,
    tpScrolls: Math.max(0, arcane.tpScrolls - 1),
    tpCooldownUntil: state.time + teleportBaseCooldownSeconds,
    channeling: {
      kind: 'teleport',
      target: teleportTarget.arrival,
      startedAt: state.time,
      completesAt: state.time + channelSeconds,
      label: `TP ${teleportTarget.label}`,
      effectLabel: `TP: ${teleportTarget.label}`,
    },
    target: teleportTarget.arrival,
    macroDecision: 'Teleportar',
    microDecision: `Canalizando TP: ${teleportTarget.label}`,
    aiReason: 'teleport_start',
    decision: `Canalizando TP: ${teleportTarget.label}`,
    forceDecision: false,
    nextDecisionAt: state.time + channelSeconds,
    stats: {
      ...arcane.stats,
      mana: Math.max(0, arcane.stats.mana - teleportManaCost),
    },
  }
}

export function canStartTeleport(state: SimulationState, arcane: Arcane) {
  return arcane.stats.hp > 0 &&
    arcane.respawn <= state.time &&
    !arcane.channeling &&
    arcane.tpScrolls > 0 &&
    arcane.tpCooldownUntil <= state.time &&
    arcane.stats.mana >= teleportManaCost &&
    !hasTimedEffect(state, arcane.id, 'mute') &&
    !isArcaneStunned(state, arcane)
}

export function getBestTeleportTarget(
  state: SimulationState,
  arcane: Arcane,
  desiredTarget: Point,
  macroDecision: string,
  microDecision: string,
  atBase: boolean,
): TeleportTarget | undefined {
  const ownBase = teamInfo[arcane.team].base
  const wantsFountain = distance(desiredTarget, ownBase) < baseServiceRange ||
    macroDecision.startsWith('Recuar') ||
    macroDecision.startsWith('Recuperar') ||
    macroDecision.startsWith('Defender base')
  const reinforcesFight = macroDecision.startsWith('Reforcar luta')
  const distanceToDesired = distance(arcane.pos, desiredTarget)
  const travelThreshold = reinforcesFight ? 24 : atBase ? 28 : wantsFountain ? 24 : 34
  if (distanceToDesired < travelThreshold) return undefined

  const candidates = getAlliedTeleportTargets(state, arcane)
  if (candidates.length === 0) return undefined
  const selected = wantsFountain
    ? candidates.find((candidate) => candidate.isFountain)
    : candidates.reduce<TeleportTarget | undefined>((best, candidate) => {
      if (!best) return candidate
      return distance(candidate.buildingPos, desiredTarget) < distance(best.buildingPos, desiredTarget) ? candidate : best
    }, undefined)

  if (!selected) return undefined
  if (distance(arcane.pos, selected.arrival) < travelThreshold) return undefined
  if (!wantsFountain && distance(selected.buildingPos, desiredTarget) > 42 && !macroDecision.startsWith('Juntar') && !macroDecision.startsWith('Fazer objetivo') && !reinforcesFight) return undefined
  if (reinforcesFight) {
    const moveSpeed = Math.max(0.6, getEffectiveArcaneMoveSpeed(state, arcane))
    const walkSeconds = distanceToDesired / moveSpeed
    const teleportSeconds = getTeleportChannelDuration(state, arcane.team, selected) + distance(selected.arrival, desiredTarget) / moveSpeed
    if (teleportSeconds + 2 >= walkSeconds) return undefined
  }
  if (microDecision.includes('Regenerando') || microDecision.includes('Comprando')) return undefined
  return selected
}

export function getAlliedTeleportTargets(state: SimulationState, arcane: Arcane): TeleportTarget[] {
  const base = state.bases.find((candidate) => candidate.team === arcane.team && candidate.hp > 0)
  const baseTarget: TeleportTarget[] = base
    ? [{
      label: 'Fonte',
      buildingPos: base.pos,
      arrival: getTeleportArrivalPoint(base.pos, arcane.id),
      isFountain: true,
    }]
    : []
  const towerTargets = state.towers
    .filter((tower) => tower.team === arcane.team && tower.hp > 0)
    .map((tower) => ({
      label: `${laneNames[tower.lane]} T${tower.tier}`,
      buildingPos: tower.pos,
      arrival: getTeleportArrivalPoint(tower.pos, arcane.id),
      isFountain: false,
    }))
  const structureTargets = state.structures
    .filter((structure) => structure.team === arcane.team && structure.hp > 0)
    .map((structure) => ({
      label: structure.kind === 'tower_tier_4' ? `Base T4 ${structure.side ?? ''}`.trim() : `${structure.lane ? laneNames[structure.lane] : 'Base'} barraca`,
      buildingPos: structure.pos,
      arrival: getTeleportArrivalPoint(structure.pos, arcane.id),
      isFountain: false,
    }))

  return [...baseTarget, ...towerTargets, ...structureTargets]
}

export function getTeleportArrivalPoint(buildingPos: Point, arcaneId: string): Point {
  let hash = 0
  for (let index = 0; index < arcaneId.length; index += 1) {
    hash = (hash + arcaneId.charCodeAt(index) * (index + 5)) % 360
  }
  const angle = (hash / 180) * Math.PI
  return clampToMapBounds({
    x: buildingPos.x + Math.cos(angle) * teleportArrivalOffset,
    y: buildingPos.y + Math.sin(angle) * teleportArrivalOffset,
  })
}

export function getTeleportChannelDuration(state: SimulationState, team: TeamId, target: TeleportTarget) {
  if (target.isFountain) return teleportChannelSeconds
  const recentCount = (state.recentTeleports ?? []).filter((record) => (
    record.team === team &&
    state.time - record.startedAt <= teleportNearbyPenaltySeconds &&
    distance(record.pos, target.buildingPos) <= teleportNearbyPenaltyRadius
  )).length
  if (recentCount <= 0) return teleportChannelSeconds
  if (recentCount === 1) return 5
  return 5 + (recentCount - 1) * 0.5
}

export type LanePullPlan = {
  camp: Camp
  score: number
  commit: boolean
}

export function getLanePullCamp(state: SimulationState, team: TeamId) {
  return state.camps.find((camp) => camp.id === `camp-outer-grove-${team}` && camp.hp > 0 && camp.respawn <= state.time)
}

export function getLanePullPlan(
  state: SimulationState,
  arcane: Arcane,
  visibleEnemies = state.arcanes.filter((enemy) => enemy.team !== arcane.team && enemy.stats.hp > 0 && enemy.respawn <= state.time && isPointVisibleToTeam(state, arcane.team, enemy.pos)),
): LanePullPlan | undefined {
  if (arcane.role !== 'Dedicated Support' || state.time < 60 || state.time > 11 * 60) return undefined
  const second = ((state.time % 60) + 60) % 60
  if (second < lanePullStartSecond || second > lanePullEndSecond) return undefined
  const camp = getLanePullCamp(state, arcane.team)
  if (!camp) return undefined
  const core = state.arcanes.find((ally) => (
    ally.team === arcane.team &&
    ally.role === 'Safe Lane' &&
    ally.lane === arcane.lane &&
    ally.stats.hp > ally.stats.maxHp * 0.38 &&
    ally.respawn <= state.time
  ))
  if (!core) return undefined
  const wave = state.creeps.filter((creep) => (
    creep.team === arcane.team &&
    creep.lane === arcane.lane &&
    creep.hp > 0 &&
    distance(creep.pos, camp.pos) <= 18
  ))
  if (wave.length === 0) return undefined
  const combatBoard = getArcaneCombatBlackboard(state, arcane)
  const committedFight = combatBoard &&
    (combatBoard.phase === 'commit' || combatBoard.phase === 'sustain' || combatBoard.phase === 'chase') &&
    combatBoard.scenario?.intent === 'engage'
  if (committedFight) return undefined
  const contestingEnemies = visibleEnemies.filter((enemy) => distance(enemy.pos, camp.pos) <= 13)
  const averageWaveProgress = average(wave.map((creep) => laneProgress(creep.pos, lanePaths[arcane.team][arcane.lane])))
  const coreSafety = core.stats.hp / Math.max(1, core.stats.maxHp) >= 0.58 ? 12 : -18
  const score = 38 + averageWaveProgress * 34 + camp.stackCount * 9 + coreSafety - contestingEnemies.length * 22
  if (score < 48) return undefined
  return {
    camp,
    score: Math.round(score),
    commit: second >= lanePullCommitSecond || distance(arcane.pos, camp.pos) <= 7,
  }
}

export function getEnemyPullContestPlan(
  state: SimulationState,
  arcane: Arcane,
  visibleEnemies = state.arcanes.filter((enemy) => enemy.team !== arcane.team && enemy.stats.hp > 0 && enemy.respawn <= state.time && isPointVisibleToTeam(state, arcane.team, enemy.pos)),
) {
  if (arcane.role !== 'Greedy Support' || state.time < 60 || state.time > 11 * 60) return undefined
  const puller = visibleEnemies.find((enemy) => (
    enemy.role === 'Dedicated Support' &&
    enemy.lane === arcane.lane &&
    enemy.microDecision.startsWith('Puxando wave')
  ))
  if (!puller) return undefined
  const camp = getLanePullCamp(state, puller.team)
  if (!camp || distance(arcane.pos, camp.pos) > 30) return undefined
  const localNumbers = getLocalNumbers(state, arcane.team, camp.pos, 13, visibleEnemies)
  const score = 54 + camp.stackCount * 10 + Math.max(0, localNumbers.advantage) * 14 - Math.max(0, -localNumbers.advantage) * 20
  return score >= 42 ? { camp, puller, score: Math.round(score) } : undefined
}

export function getActivePullCampForCreep(state: SimulationState, creep: Creep) {
  if (creep.pullCampId && (creep.pullUntil ?? 0) > state.time) {
    const active = state.camps.find((camp) => camp.id === creep.pullCampId && camp.hp > 0 && camp.respawn <= state.time)
    if (active) return active
  }
  if (state.time < 60 || state.time > 11 * 60) return undefined
  const camp = getLanePullCamp(state, creep.team)
  if (!camp || distance(creep.pos, camp.pos) > 15) return undefined
  const puller = state.arcanes.find((arcane) => (
    arcane.team === creep.team &&
    arcane.role === 'Dedicated Support' &&
    arcane.lane === creep.lane &&
    arcane.stats.hp > 0 &&
    arcane.respawn <= state.time &&
    arcane.microDecision.startsWith('Puxando wave') &&
    distance(arcane.pos, camp.pos) <= 8
  ))
  return puller ? camp : undefined
}

export function updateArcaneMovement(
  arcane: Arcane,
  state: SimulationState,
  delta: number,
  shouldDecide: boolean,
  frameContext?: TickFrameContext,
  deferSafetyUntilDecision = false,
): Arcane {
  if (arcane.respawn > state.time) {
    const microDecision = `Respawn em ${Math.ceil(arcane.respawn - state.time)}s`
    if (arcane.macroDecision === 'Fora de combate' && arcane.microDecision === microDecision) return arcane
    return {
      ...arcane,
      macroDecision: 'Fora de combate',
      microDecision,
      decision: microDecision,
      travelPlan: undefined,
    }
  }
  if (arcane.stats.hp <= 0) return arcane.travelPlan ? { ...arcane, travelPlan: undefined } : arcane
  if (arcane.channeling) return updateChannelingArcane(state, arcane.travelPlan ? { ...arcane, travelPlan: undefined } : arcane)

  if (arcane.travelPlan) {
    const wakeReason = getArcaneTravelWakeReason(arcane, state, frameContext)
    if (!wakeReason) {
      if (activeArcaneTravelDiagnostics) activeArcaneTravelDiagnostics.sleepingSkips += 1
      const manaRegen = resourceRegenForTick(NON_COMBAT_RULES.regeneration.outOfCombatManaRegenPerSecond, delta)
      if (manaRegen <= 0 || arcane.stats.mana >= arcane.stats.maxMana) return arcane
      return {
        ...arcane,
        stats: {
          ...arcane.stats,
          mana: Math.min(arcane.stats.maxMana, arcane.stats.mana + manaRegen),
        },
      }
    }
    recordArcaneTravelWake(wakeReason)
    arcane = materializeArcaneTravelPlan(arcane, state.time)
  }

  if (canUseArcaneKinematicFastPath(arcane, state, shouldDecide, deferSafetyUntilDecision)) {
    if (activeArcaneTravelDiagnostics) activeArcaneTravelDiagnostics.kinematicUpdates += 1
    return updateArcaneKinematics(arcane, state, delta, shouldDecide)
  }
  if (activeArcaneTravelDiagnostics) activeArcaneTravelDiagnostics.fullUpdates += 1

  let target = arcane.target
  let macroDecision = arcane.macroDecision
  let microDecision = arcane.microDecision
  let aiMode = arcane.aiMode
  let aiReason = arcane.aiReason
  let aiExecutionChance = arcane.aiExecutionChance
  let aiExecutionDelay = arcane.aiExecutionDelay
  let aiFailure = arcane.aiFailure
  let decisionDangerScore: number | undefined
  let decisionVisibleEnemies: Arcane[] | undefined
  const ownBase = teamInfo[arcane.team].base
  const path = lanePaths[arcane.team][arcane.lane]
  if (state.time < 0) {
    if (isArcaneMovementDisabled(state, arcane)) {
      const controlledBy = isArcaneStunned(state, arcane) ? 'Atordoado' : 'Enraizado'
      return {
        ...arcane,
        macroDecision: 'Disputar runa de ouro',
        microDecision: controlledBy,
        aiReason: 'pre_game_rune_contest, controle',
        decision: controlledBy,
        nextDecisionAt: 0,
      }
    }
    const runePlan = getPregameBountyRunePlan(state, arcane)
    const enemies = getVisibleEnemyArcanes(state, arcane.team, frameContext)
      .filter((candidate) => distance(candidate.pos, runePlan.point) <= 12)
    const contestedEnemy = nearest(arcane.pos, enemies, 10)
    const contest = getPregameRuneContestAssessment(state, arcane, runePlan, enemies)
    const retreating = contest.mustRetreat
    const enemyInRange = contestedEnemy && distance(arcane.pos, contestedEnemy.pos) <= getArcaneAttackCenterRange(arcane, contestedEnemy)
    const objectivePosition = contest.canContest
      ? runePlan.point
      : getPregameRuneStagingPoint(runePlan.point, ownBase, 3.2)
    const movementTarget = retreating
      ? ownBase
      : enemyInRange && contest.canContest
        ? arcane.pos
        : objectivePosition
    const nextPos = moveToward(arcane.pos, movementTarget, getEffectiveArcaneMoveSpeed(state, arcane) * delta)
    const contesting = Boolean(contestedEnemy) && contest.canContest
    return {
      ...arcane,
      target: movementTarget,
      pathIndex: Math.min(2, path.length - 1),
      macroDecision: retreating
        ? 'Recuar da disputa'
        : runePlan.kind === 'invade' ? 'Invadir runa de ouro' : 'Defender runa de ouro',
      microDecision: retreating
        ? 'Cedendo runa para preservar vida'
        : contesting
          ? `Disputando espaco da runa contra ${contestedEnemy!.player}`
          : !contest.canContest
            ? 'Aguardando janela segura para a runa'
          : runePlan.kind === 'invade'
        ? `Avancando para runa inimiga (${laneNames[arcane.lane]})`
        : runePlan.threatened
          ? 'Respondendo invasao na runa aliada'
          : `Protegendo runa aliada (${laneNames[arcane.lane]})`,
      aiMode: 'take_objective',
      aiReason: `${runePlan.threatened ? 'pre_game_rune_defense, enemy_pressure' : `pre_game_rune_${runePlan.kind}`}, danger_${Math.round(contest.danger)}, numbers_${contest.localNumbers.advantage.toFixed(1)}`,
      nextDecisionAt: 0,
      forceDecision: state.time + delta >= 0,
      lastDecisionPos: nextPos,
      decision: retreating
        ? 'Recuando da disputa'
        : contesting
          ? 'Controlando a area da runa'
          : runePlan.kind === 'invade' ? 'Disputando runa inimiga' : 'Protegendo runa aliada',
      pos: nextPos,
    }
  }
  const phase = getGamePhase(state.time)
  const atBase = distance(arcane.pos, ownBase) < baseServiceRange
  const canBuyAtBase = atBase && hasBasePurchaseOpportunity(state, arcane)
  const isSupport = arcane.role.includes('Support')
  const decisionDue = arcane.forceDecision || (shouldDecide && state.time >= arcane.nextDecisionAt)
  const shouldRunDecision = decisionDue && (arcane.forceDecision || shouldReconsiderArcaneDecision(state, arcane, atBase, canBuyAtBase))
  const shouldRefreshLaneProgress = shouldDecide ||
    arcane.forceDecision ||
    distance(arcane.pos, arcane.target) <= 1.35 ||
    distance(arcane.pos, arcane.lastDecisionPos) > 1.2
  let pathIndex = shouldRefreshLaneProgress
    ? syncLanePathIndex(arcane.pos, path, arcane.pathIndex)
    : arcane.pathIndex

  if (isArcaneMovementDisabled(state, arcane)) {
    const hpRegen = atBase
      ? resourceRegenForTick(NON_COMBAT_RULES.regeneration.baseHealthRegenPerSecond, delta)
      : 0
    const manaRegen = resourceRegenForTick(
      atBase
        ? NON_COMBAT_RULES.regeneration.baseManaRegenPerSecond
        : NON_COMBAT_RULES.regeneration.outOfCombatManaRegenPerSecond,
      delta,
    )
    return {
      ...arcane,
      macroDecision: 'Controlado',
      microDecision: isArcaneStunned(state, arcane) ? 'Atordoado' : 'Enraizado',
      aiReason: isArcaneStunned(state, arcane) ? 'stun, controle' : 'root, controle',
      decision: isArcaneStunned(state, arcane) ? 'Atordoado' : 'Enraizado',
      stats: {
        ...arcane.stats,
        hp: Math.min(arcane.stats.maxHp, arcane.stats.hp + hpRegen),
        mana: Math.min(arcane.stats.maxMana, arcane.stats.mana + manaRegen),
      },
    }
  }

  if (shouldRunDecision) {
    const visibleEnemies = getVisibleEnemyArcanes(state, arcane.team, frameContext)
    const dangerScore = getDangerScore(state, arcane, visibleEnemies, frameContext)
    const actionDanger = getEnemyActionThreatScore(state, arcane, arcane.pos, visibleEnemies, frameContext)
    decisionDangerScore = dangerScore
    decisionVisibleEnemies = visibleEnemies
    const memoryDanger = getTeamMemoryDanger(state, arcane.team, arcane.pos)
    const hpRatio = arcane.stats.hp / arcane.stats.maxHp
    const isWounded = hpRatio < 0.62
    const nearbyBurstThreat = visibleEnemies.reduce((highestThreat, enemy) => {
      const threat = getArcaneOffensiveThreat(state, enemy)
      const threatRange = Math.max(enemy.stats.range + 2.2, threat.range + 1.4)
      if (distance(arcane.pos, enemy.pos) > threatRange) return highestThreat
      const projectedDamage = threat.readyDamage + enemy.stats.damage * 2
      return Math.max(highestThreat, projectedDamage / Math.max(1, arcane.stats.maxHp))
    }, 0)
    const repeatedDeathCaution = Math.min(0.16, arcane.deaths * 0.018)
    const tacticalRetreatThreshold = Math.min(0.74, Math.max(0.38, nearbyBurstThreat + 0.12 + repeatedDeathCaution))
    const shouldTacticallyDisengage = nearbyBurstThreat > 0 && hpRatio <= tacticalRetreatThreshold
    const effectiveDanger = getEffectiveDangerScore(Math.max(dangerScore, memoryDanger), actionDanger, hpRatio)
    const targetThreatLimit = Math.min(
      isWounded ? 62 : 78,
      42 + arcane.aggression * 0.38 + (phase === 'late' ? 12 : phase === 'mid' ? 8 : 0) - (isWounded ? 10 : 0),
    )
    const combatBoard = getArcaneCombatBlackboard(state, arcane)
    const combatScenarioIntent = combatBoard?.scenario?.intent
    const combatChaseStopped = combatBoard?.phase === 'chase' && combatBoard.scenario?.chaseAllowed === false
    const isCombatReinforcement = combatScenarioIntent === 'reinforce' && (
      combatBoard?.scenario?.alliedReinforcements.some((reinforcement) => reinforcement.heroId === arcane.id) ?? false
    )
    const combatFocusTarget = getCombatFocusTarget(state, arcane, combatBoard)
    const combatFocusAssessment = combatFocusTarget && combatBoard
      ? getCombatFocusAssessment(state, arcane, combatFocusTarget, combatBoard, visibleEnemies)
      : undefined
    const laneAnchor = nearestLanePoint(arcane.pos, path)
    const laneDistance = distance(arcane.pos, laneAnchor)
    const shouldRespectLane = phase === 'early' && laneDistance > (isSupport ? 14 : 8) && !atBase
    const safeEnemyCreeps = state.creeps.filter((creep) => (
      creep.team !== arcane.team &&
      (phase !== 'early' || creep.lane === arcane.lane) &&
      !isUnsafeUnderEnemyTower(state, arcane.team, creep.pos, creep.lane) &&
      !isTooDeepForAggression(state, arcane, creep.pos, creep.lane, phase) &&
      getEffectiveDangerScore(0, getEnemyActionThreatScore(state, arcane, creep.pos, visibleEnemies, frameContext), hpRatio) <= targetThreatLimit
    ))
    const nearbyEnemy = nearest(
      arcane.pos,
      visibleEnemies.filter((enemy) => (
        !isUnsafeUnderEnemyTower(state, arcane.team, enemy.pos, enemy.lane) &&
        !isTooDeepForAggression(state, arcane, enemy.pos, enemy.lane, phase) &&
        getEffectiveDangerScore(0, getEnemyActionThreatScore(state, arcane, enemy.pos, visibleEnemies, frameContext), hpRatio) <= targetThreatLimit + 5
      )),
      phase === 'early' ? 8 : phase === 'mid' ? 13 : 16,
    )
    const gankTarget = getGankTarget(state, arcane, visibleEnemies, targetThreatLimit, effectiveDanger, frameContext)
    const rotateTarget = getRotateTarget(state, arcane, visibleEnemies, targetThreatLimit, effectiveDanger, frameContext)
    const initiateTarget = getInitiateTarget(state, arcane, visibleEnemies, targetThreatLimit, effectiveDanger, frameContext)
    const laneEnemyCreeps = safeEnemyCreeps.filter((creep) => creep.lane === arcane.lane)
    const claimableLaneCreeps = laneEnemyCreeps.filter((creep) => canArcaneClaimFarmAt(state, arcane, creep.pos))
    const laneCreep = nearest(arcane.pos, claimableLaneCreeps, phase === 'early' ? 13 : 10)
    const lastHitCreep = getLastHitCandidateFromCreeps(state, arcane, claimableLaneCreeps, 1.06)
    const prepareLastHitCreep = getLastHitCandidateFromCreeps(state, arcane, claimableLaneCreeps, 1.85) ?? getWavePushTarget(arcane, claimableLaneCreeps)
    const wavePushCreep = getWavePushTarget(arcane, claimableLaneCreeps)
    const distantLaneCreep = nearest(arcane.pos, safeEnemyCreeps.filter((creep) => canArcaneClaimFarmAt(state, arcane, creep.pos)), phase === 'early' ? 18 : phase === 'mid' ? 28 : 34)
    const denyCreep = getDenyCandidateFromCreeps(arcane, state.creeps.filter((creep) => (
      creep.team === arcane.team &&
      creep.lane === arcane.lane &&
      creep.hp > 0 &&
      creep.hp <= creep.maxHp * 0.5
    )).filter((creep) => distance(arcane.pos, creep.pos) <= (phase === 'early' ? 14 : 9)))
    const attackableLaneTowers = getAttackableEnemyTowers(state, arcane.team).filter((tower) => tower.lane === arcane.lane)
    const enemyTower = nearest(arcane.pos, attackableLaneTowers, Math.max(18, arcane.stats.range + 8))
    const blockingTower = getNextEnemyTowerInLane(state, arcane.team, arcane.lane)
    const blockingStructure = getNextEnemyStructureInLane(state, arcane.team, arcane.lane)
    const alliedLaneCreep = nearest(arcane.pos, state.creeps.filter((creep) => creep.team === arcane.team && creep.lane === arcane.lane), 24)
    const laneBlocker = blockingTower ?? blockingStructure
    const alliedLaneCreepNearBlockingTower = laneBlocker
      ? getAlliedWaveNearObjective(state, arcane.team, arcane.lane, laneBlocker)
      : undefined
    const allyToDefend = nearest(
      arcane.pos,
      state.arcanes.filter((ally) => (
        ally.team === arcane.team &&
        ally.id !== arcane.id &&
        ally.stats.hp > 0 &&
        ally.respawn <= state.time &&
        ally.stats.hp / ally.stats.maxHp < 0.58 &&
        nearest(ally.pos, visibleEnemies, 9) !== undefined &&
        (phase !== 'early' || ally.lane === arcane.lane || isSupport)
      )),
      isSupport ? 18 : 12,
    )
    const alliedLaneCreepNearTower = enemyTower
      ? getAlliedWaveNearObjective(state, arcane.team, arcane.lane, enemyTower)
      : laneBlocker
        ? getAlliedWaveNearObjective(state, arcane.team, arcane.lane, laneBlocker)
        : undefined
    const weakCamp = getBestJungleCampForArcane(state, arcane, phase === 'early' ? isSupport ? 10 : 7.5 : isSupport ? 10 : 14, visibleEnemies)
    const economyCamp = getBestJungleCampForArcane(state, arcane, phase === 'early' ? isSupport ? 17 : 11 : isSupport ? 17 : 24, visibleEnemies)
    const lanePullPlan = getLanePullPlan(state, arcane, visibleEnemies)
    const enemyPullContest = getEnemyPullContestPlan(state, arcane, visibleEnemies)
    const committedCamp = isJungleFarmMicroDecision(arcane.microDecision)
      ? nearest(arcane.target, state.camps.filter((camp) => camp.hp > 0), 7)
      : undefined
    const committedCampAssessment = committedCamp ? getCampClearAssessment(state, arcane, committedCamp) : undefined
    const canFinishCommittedCamp = committedCamp !== undefined && committedCampAssessment !== undefined &&
      committedCampAssessment.clearSeconds <= 60 &&
      committedCampAssessment.healthAfterClear >= Math.max(arcane.stats.maxHp * 0.12, committedCampAssessment.incomingDamage) &&
      effectiveDanger < 60
    const emergencyRecovery = getArcaneEmergencyRecoveryRatio(state, arcane)
    const lowHp = hpRatio < Math.max(0.22, 0.36 - emergencyRecovery * 0.6)
    const alreadyPressuringTower = arcane.macroDecision.startsWith('Pressionar torre') || arcane.microDecision.startsWith('Batendo torre')
    const towerThreat = nearest(arcane.pos, state.towers.filter((tower) => tower.team !== arcane.team && tower.hp > 0), 10.5)
    const towerTankCandidate = enemyTower ? getTowerTankCandidate(state, arcane.team, enemyTower) : undefined
    const towerTankCommitted = Boolean(enemyTower && enemyTower.aggroTargetId === towerTankCandidate?.id && (enemyTower.aggroUntil ?? 0) > state.time)
    const canUseTowerTank = towerTankCandidate !== undefined && (towerTankCandidate.id === arcane.id || towerTankCommitted)
    const threatTankCandidate = towerThreat ? getTowerTankCandidate(state, arcane.team, towerThreat) : undefined
    const threatTankCommitted = Boolean(towerThreat && towerThreat.aggroTargetId === threatTankCandidate?.id && (towerThreat.aggroUntil ?? 0) > state.time)
    const protectedTowerThreat = towerThreat ? isStructureBackdoorProtectedForTeam(state, arcane.team, towerThreat) : false
    const canUseThreatTank = !protectedTowerThreat && threatTankCandidate !== undefined && (threatTankCandidate.id === arcane.id || threatTankCommitted)
    const towerDiveRisk = towerThreat && !canUseThreatTank && (!alliedLaneCreepNearTower || hpRatio < (alreadyPressuringTower ? 0.62 : 0.82))
    const towerNumbers = enemyTower ? getLocalNumbers(state, arcane.team, enemyTower.pos, enemyTower.tier === 3 ? 20 : 16, visibleEnemies) : undefined
    const nextAdvancePoint = getLaneAdvancePoint(arcane, path, pathIndex)
    const nextAdvanceBlockedByTower = laneBlocker &&
      !alliedLaneCreepNearTower &&
      laneProgress(nextAdvancePoint, path) >= laneProgress(laneBlocker.pos, path) - 0.015
    const advanceBlockedByTower = laneBlocker &&
      !alliedLaneCreepNearTower &&
      !(blockingTower && getTowerTankCandidate(state, arcane.team, blockingTower)) &&
      (distance(arcane.pos, laneBlocker.pos) <= 25 || nextAdvanceBlockedByTower)
    const laneBlockerProtected = laneBlocker ? isStructureBackdoorProtectedForTeam(state, arcane.team, laneBlocker) : false
    const cannotAdvanceLane = laneBlocker !== undefined &&
      !alliedLaneCreepNearTower &&
      (laneBlockerProtected || !blockingTower || getTowerTankCandidate(state, arcane.team, blockingTower) === undefined)
    const needsBaseRecovery = atBase && (
      arcane.stats.hp < arcane.stats.maxHp * 0.84 ||
      arcane.stats.mana < arcane.stats.maxMana * 0.65
    )
    const teamCall = state.teamCalls[arcane.team]
    const teamPlan = state.teamPlans[arcane.team] ?? selectTeamPlan({
      analyzed: getAnalyzedGameState(state),
      teamId: arcane.team,
      teamProfile: DEFAULT_TEAM_AI_PROFILES[arcane.team],
    })
    const teamCallPoint = teamCall ? getTeamCallPoint(state, teamCall) : undefined
    const teamCallObjectivePoint = teamCall ? getTeamCallObjectivePoint(state, teamCall) : undefined
    const callerArcane = teamCall ? state.arcanes.find((ally) => ally.id === teamCall.callerId && ally.stats.hp > 0 && ally.respawn <= state.time) : undefined
    const baseThreat = phase !== 'early' ? getCachedBaseThreat(state, arcane.team, frameContext) : undefined
    const plannedObjective = teamPlan?.targetId ? getPlannedMapObjective(state, arcane.team, teamPlan.targetId) : undefined
    const preparingHighGround = phase === 'late' && (
      teamPlan?.type === 'end_game' ||
      (teamPlan?.type === 'group_push' && plannedObjective !== undefined && (
        !('tier' in plannedObjective) || plannedObjective.tier === 3
      )) ||
      teamCall?.kind === 'base' ||
      teamCall?.kind === 'structure'
    )
    const needsHighGroundRecovery = preparingHighGround && hpRatio < 0.78 && !baseThreat?.urgent
    const shouldDefendBase = baseThreat?.urgent &&
      baseThreat.target &&
      hpRatio > 0.48 &&
      (distance(arcane.pos, baseThreat.base.pos) < distance(arcane.pos, teamInfo[arcane.team === 'dawn' ? 'dusk' : 'dawn'].base) + 22 || baseThreat.hpRatio < 0.32)
    const creepToEscort = alliedLaneCreepNearBlockingTower ?? alliedLaneCreep
    const playerContext = createPlayerAiContext({
      state,
      arcane,
      visibleEnemies,
      teamPlan,
      dangerScore: effectiveDanger,
      hpRatio,
      atBase,
      safeEnemyCreeps,
      laneCreep,
      economyCamp,
      allyToDefend,
      nearbyEnemy,
      enemyTower,
    })
    const playerMode = selectPlayerMode(playerContext)
    const execution = resolvePlayerExecution(playerContext, playerMode)
    aiMode = execution.executedMode
    aiReason = execution.reasonTags.join(', ')
    aiExecutionChance = execution.successChance
    aiExecutionDelay = execution.delaySeconds
    aiFailure = execution.failure
    recordFailedExecutionMemory(state, arcane, playerMode.mode, execution.failure)
    const modeWantsRetreat = execution.executedMode === 'retreat'
    const modeWantsLaneFarm = execution.executedMode === 'farm_lane'
    const modeWantsJungle = execution.executedMode === 'farm_jungle'
    const modeWantsObjective = execution.executedMode === 'take_objective'
    const modeWantsSave = execution.executedMode === 'save_ally'
    const modeWantsFight = execution.executedMode === 'join_fight' || execution.executedMode === 'finish_enemy'
    const economyNeed = getArcaneEconomyNeed(arcane, state.time)
    const canPrioritizeEconomy = economyNeed >= 34 &&
      (modeWantsLaneFarm || modeWantsJungle) &&
      effectiveDanger < 48 &&
      (combatBoard?.encounterType === 'lane_trade' || combatBoard?.encounterType === 'jungle_skirmish')
    const scenarioAllowsCommit = combatScenarioIntent === undefined || combatScenarioIntent === 'engage' || combatScenarioIntent === 'reinforce'
    const combatPhaseWantsFight = !canPrioritizeEconomy && scenarioAllowsCommit && (
      combatBoard?.phase === 'opening' || combatBoard?.phase === 'commit' || combatBoard?.phase === 'sustain' || combatBoard?.phase === 'chase'
    )
    const wantsCombatFocus = combatFocusTarget !== undefined && !canPrioritizeEconomy && (
      modeWantsFight ||
      combatPhaseWantsFight ||
      distance(arcane.pos, combatFocusTarget.pos) <= getArcaneAttackCenterRange(arcane, combatFocusTarget) + 2
    )
    const farmPriority = getRoleFarmPriority(arcane.role)
    const canTakeOpportunisticJungle = farmPriority >= 62 || (arcane.role === 'Greedy Support' && phase !== 'early')
    const canTakeAssignedJungle = modeWantsJungle && farmPriority >= 34
    const teamPlanType = teamPlan?.type
    const isLaningPhase = phase === 'early' &&
      !teamCall &&
      teamPlanType !== 'take_boss' &&
      teamPlanType !== 'pickoff' &&
      !modeWantsObjective
    const wantsWavePush = !isLaningPhase || execution.executedMode === 'push_lane' || teamPlanType === 'defend_tower'
    const canPressureTower = enemyTower &&
      (alliedLaneCreepNearTower || (!isStructureBackdoorProtectedForTeam(state, arcane.team, enemyTower) && canUseTowerTank)) &&
      hpRatio > (alreadyPressuringTower ? enemyTower.tier === 3 ? 0.74 : 0.68 : modeWantsObjective ? enemyTower.tier === 3 ? 0.82 : 0.76 : enemyTower.tier === 3 ? 0.9 : 0.84) &&
      effectiveDanger < (alreadyPressuringTower ? enemyTower.tier === 3 ? 58 : 64 : modeWantsObjective ? enemyTower.tier === 3 ? 48 : 56 : enemyTower.tier === 3 ? 34 : 42) &&
      (towerNumbers?.advantage ?? -99) >= (alreadyPressuringTower ? enemyTower.tier === 3 ? 0.25 : -0.65 : modeWantsObjective ? enemyTower.tier === 3 ? 0.55 : -0.35 : enemyTower.tier === 3 ? 1.1 : -0.15) &&
      (enemyTower.tier !== 3 || (towerNumbers?.allies ?? 0) >= 4)

    if (needsBaseRecovery) {
      target = ownBase
      macroDecision = 'Recuperar recursos'
      microDecision = canBuyAtBase ? 'Comprando itens na base' : 'Regenerando na base'
    } else if (shouldDefendBase && baseThreat?.target) {
      target = baseThreat.target.pos
      macroDecision = 'Defender base'
      microDecision = baseThreat.target && 'player' in baseThreat.target
        ? `Defendendo base contra ${baseThreat.target.player}`
        : 'Limpando invasao na base'
    } else if (needsHighGroundRecovery) {
      target = ownBase
      macroDecision = 'Preparar highground'
      microDecision = 'Recuperando recursos antes de agrupar'
    } else if (shouldTacticallyDisengage) {
      const laneDistance = getLaneDistanceAlongPath(arcane.pos, path)
      target = formationPoint(getLanePointAtDistance(path, Math.max(0, laneDistance - (8 + repeatedDeathCaution * 30))), arcane.id)
      macroDecision = 'Segurar rota'
      microDecision = 'Reposicionando por risco de burst'
    } else if (lowHp || effectiveDanger >= 68 || (modeWantsRetreat && effectiveDanger >= (emergencyRecovery > 0 ? 60 : 48))) {
      target = ownBase
      macroDecision = 'Recuar'
      microDecision = effectiveDanger >= 68 || modeWantsRetreat ? 'Recuando por perigo alto' : 'Recuando para curar'
    } else if (combatChaseStopped && combatBoard?.alliedHeroIds.includes(arcane.id)) {
      const retreatDistance = combatScenarioIntent === 'disengage' ? 9 : 5
      target = moveToward(arcane.pos, ownBase, retreatDistance)
      macroDecision = 'Encerrar perseguicao'
      microDecision = getCombatChaseStopDecisionLabel(combatBoard.scenario?.chaseStopReason)
      aiReason = `${aiReason}${aiReason ? ', ' : ''}chase_stop_${combatBoard.scenario?.chaseStopReason ?? 'low_value'}, chase_score_${combatBoard.scenario?.chaseScore ?? 0}`
    } else if (combatScenarioIntent === 'disengage' && combatBoard?.alliedHeroIds.includes(arcane.id)) {
      target = moveToward(arcane.pos, ownBase, 9)
      macroDecision = 'Recuar da luta'
      microDecision = 'Encerrando encontro desfavoravel'
      aiReason = `${aiReason}${aiReason ? ', ' : ''}scenario_disengage, score_${combatBoard.scenario?.engageScore ?? 0}`
    } else if (canFinishCommittedCamp && committedCamp && !nearbyEnemy && !teamCall) {
      target = mapEdgeApproachPoint(committedCamp.pos)
      macroDecision = 'Farmar selva'
      microDecision = 'Limpando campo neutro'
    } else if (cannotAdvanceLane && !teamCall && !modeWantsFight && !modeWantsObjective && economyCamp && hpRatio > 0.68 && effectiveDanger < 52) {
      target = mapEdgeApproachPoint(economyCamp.pos)
      macroDecision = 'Farmar enquanto aguarda wave'
      microDecision = 'Limpando campo neutro'
    } else if (cannotAdvanceLane && !teamCall && !modeWantsFight && !modeWantsObjective && laneBlocker) {
      target = safeLaneObjectiveHoldPoint(arcane, path, laneBlocker)
      macroDecision = 'Aguardar wave'
      microDecision = laneBlockerProtected ? 'Mantendo distancia do backdoor' : 'Mantendo distancia da torre'
    } else if (towerDiveRisk) {
      target = safeLaneRetreatPoint(arcane, path, towerThreat)
      macroDecision = alliedLaneCreep ? 'Segurar rota' : 'Recuar'
      microDecision = alliedLaneCreep ? 'Segurando fora da torre' : 'Saindo do alcance da torre'
    } else if (allyToDefend && (modeWantsSave || isSupport)) {
      target = allyToDefend.pos
      macroDecision = 'Defender aliado'
      microDecision = `Defendendo ${allyToDefend.player}`
    } else if (isCombatReinforcement && combatBoard && distance(arcane.pos, combatBoard.center) > Math.max(5, combatBoard.radius * 0.65)) {
      target = combatBoard.center
      macroDecision = 'Reforcar luta'
      microDecision = `Chegando em ${getCombatScenarioDecisionLabel(combatBoard.encounterType)}`
      aiReason = `${aiReason}${aiReason ? ', ' : ''}scenario_reinforce, eta_${combatBoard.scenario?.alliedReinforcements.find((reinforcement) => reinforcement.heroId === arcane.id)?.etaSeconds ?? 0}`
    } else if (wantsCombatFocus && combatFocusTarget && combatFocusAssessment && !combatFocusAssessment.canApproach) {
      target = getCombatStagingPoint(state, arcane, combatFocusTarget, combatBoard, combatFocusAssessment)
      macroDecision = combatFocusAssessment.mustDisengage ? 'Recuar da luta' : 'Manter formacao'
      microDecision = combatFocusAssessment.mustDisengage
        ? `Rompendo foco em ${combatFocusTarget.player}`
        : `Aguardando janela contra ${combatFocusTarget.player}`
      aiReason = `${aiReason}${aiReason ? ', ' : ''}combat_focus_blocked, danger_${Math.round(combatFocusAssessment.danger)}`
    } else if (wantsCombatFocus && combatFocusTarget && combatFocusAssessment?.canApproach) {
      target = combatFocusTarget.pos
      macroDecision = 'Lutar em equipe'
      microDecision = `Foco em ${combatFocusTarget.player}`
      aiReason = `${aiReason}${aiReason ? ', ' : ''}combat_focus, danger_${Math.round(combatFocusAssessment.danger)}`
    } else if (initiateTarget && hpRatio > 0.74 && effectiveDanger < (modeWantsFight ? 62 : 54)) {
      target = initiateTarget.pos
      macroDecision = 'Lutar em equipe'
      microDecision = `Iniciando luta em ${initiateTarget.name}`
    } else if (teamCall && teamCallPoint && teamCallObjectivePoint && phase !== 'early' && hpRatio > (teamCall.kind === 'boss' ? 0.72 : teamCall.kind === 'base' ? 0.78 : 0.58) && effectiveDanger < (teamCall.kind === 'boss' ? 48 : teamCall.kind === 'base' ? 50 : 60)) {
      const callAge = state.time - teamCall.createdAt
      const callerNearObjective = callerArcane ? distance(callerArcane.pos, teamCallPoint) <= 12 : false
      const gatherPoint = callerArcane && callerNearObjective && callAge < 6 ? callerArcane.pos : teamCallPoint
      const isCaller = teamCall.callerId === arcane.id
      const farFromGroup = !isCaller && distance(arcane.pos, gatherPoint) > 9 && distance(arcane.pos, teamCallPoint) > 7
      const bossReadyToHit = teamCall.kind === 'boss' && distance(arcane.pos, teamCallPoint) <= 7
      const alliesAtCall = state.arcanes.filter((ally) => (
        ally.team === arcane.team &&
        ally.stats.hp > 0 &&
        ally.respawn <= state.time &&
        distance(ally.pos, teamCallPoint) <= 12
      )).length
      const calledTower = teamCall.kind === 'tower' ? state.towers.find((tower) => tower.id === teamCall.targetId) : undefined
      const isHighGroundCall = teamCall.kind === 'base' || teamCall.kind === 'structure' || calledTower?.tier === 3
      const requiredAllies = teamCall.kind === 'boss' ? 3 : isHighGroundCall ? 4 : 2
      const requiresSiegeWave = teamCall.kind === 'tower' || teamCall.kind === 'structure' || teamCall.kind === 'base'
      const hasSiegeWave = !requiresSiegeWave || state.creeps.some((creep) => (
        creep.team === arcane.team && creep.hp > 0 && distance(creep.pos, teamCallObjectivePoint) <= 14
      ))
      const calledTowerTank = calledTower && !isStructureBackdoorProtectedForTeam(state, arcane.team, calledTower)
        ? getTowerTankCandidate(state, arcane.team, calledTower)
        : undefined
      const calledTowerTankCommitted = calledTower?.aggroTargetId === calledTowerTank?.id && (calledTower?.aggroUntil ?? 0) > state.time
      const canExecuteTankSiege = calledTowerTank !== undefined && (arcane.id === calledTowerTank.id || calledTowerTankCommitted)
      const hasSiegeAccess = hasSiegeWave || canExecuteTankSiege
      const readyToExecuteCall = teamCall.kind === 'boss'
        ? bossReadyToHit && alliesAtCall >= requiredAllies
        : !farFromGroup && hasSiegeAccess && alliesAtCall >= requiredAllies && (callAge > 2.5 || distance(arcane.pos, teamCallPoint) <= 6)
      target = farFromGroup ? gatherPoint : readyToExecuteCall ? teamCallObjectivePoint : teamCallPoint
      macroDecision = isCaller
        ? readyToExecuteCall
          ? `Fazer chefe: ${teamCall.targetName}`
          : `Chamar objetivo: ${teamCall.targetName}`
        : farFromGroup
          ? `Juntar com o time: ${teamCall.targetName}`
          : teamCall.kind === 'boss'
            ? `Fazer chefe: ${teamCall.targetName}`
            : `Fazer objetivo: ${teamCall.targetName}`
      microDecision = isCaller
        ? readyToExecuteCall
          ? `Atacar chefe: ${teamCall.targetName}`
          : `Chamando time: ${teamCall.targetName}`
        : teamCall.kind === 'boss' && !farFromGroup
          ? `Atacar chefe: ${teamCall.targetName}`
          : farFromGroup
            ? `Movendo para agrupamento: ${teamCall.targetName}`
            : `Executando objetivo: ${teamCall.targetName}`
    } else if (enemyPullContest && hpRatio > 0.58 && effectiveDanger < 58) {
      target = enemyPullContest.puller.pos
      macroDecision = 'Contestar pull'
      microDecision = `Contestando pull de ${enemyPullContest.puller.player}`
      aiReason = `${aiReason}${aiReason ? ', ' : ''}contest_pull, value_${enemyPullContest.score}`
    } else if (gankTarget && economyNeed < 34 && hpRatio > 0.68 && effectiveDanger < 56) {
      target = gankTarget.pos
      macroDecision = 'Criar vantagem'
      microDecision = `Gank em ${gankTarget.player}`
    } else if (rotateTarget && economyNeed < 34 && hpRatio > 0.64 && effectiveDanger < 58) {
      target = rotateTarget.pos
      macroDecision = `Rotacionar para ${laneNames[rotateTarget.lane]}`
      microDecision = `Ajudando side lane: ${laneNames[rotateTarget.lane]}`
    } else if (nearbyEnemy && hpRatio > 0.58 && effectiveDanger < (modeWantsFight ? 60 : 52) && nearbyEnemy.stats.hp / nearbyEnemy.stats.maxHp < (modeWantsFight ? 0.72 : 0.58)) {
      target = nearbyEnemy.pos
      macroDecision = 'Pressionar inimigo'
      microDecision = `Pressionando ${nearbyEnemy.name}`
    } else if (lanePullPlan && effectiveDanger < 48) {
      target = lanePullPlan.camp.pos
      macroDecision = lanePullPlan.commit ? 'Executar pull' : 'Preparar pull'
      microDecision = lanePullPlan.commit ? 'Puxando wave no campo' : 'Preparando pull da safelane'
      aiReason = `${aiReason}${aiReason ? ', ' : ''}lane_pull, value_${lanePullPlan.score}`
    } else if (lastHitCreep && isLaningPhase && (!modeWantsJungle || modeWantsLaneFarm) && effectiveDanger < 62) {
      target = lastHitCreep.pos
      macroDecision = 'Controlar wave'
      microDecision = 'Last hit'
    } else if (denyCreep && isLaningPhase && (!modeWantsJungle || modeWantsLaneFarm) && effectiveDanger < 58) {
      target = denyCreep.pos
      macroDecision = 'Controlar wave'
      microDecision = 'Preparando deny'
    } else if (prepareLastHitCreep && isLaningPhase && (!modeWantsJungle || modeWantsLaneFarm) && effectiveDanger < 58) {
      target = prepareLastHitCreep.pos
      macroDecision = 'Controlar wave'
      microDecision = 'Preparando last hit'
    } else if (wavePushCreep && wantsWavePush && (!modeWantsJungle || modeWantsLaneFarm) && effectiveDanger < 62) {
      target = wavePushCreep.pos
      macroDecision = 'Push wave'
      microDecision = 'Acelerando wave'
    } else if (laneCreep && !isLaningPhase && (!modeWantsJungle || modeWantsLaneFarm)) {
      target = laneCreep.pos
      macroDecision = 'Push wave'
      microDecision = 'Acelerando wave'
    } else if (weakCamp && hpRatio > 0.68 && effectiveDanger < (modeWantsJungle ? 58 : 50) && (canTakeAssignedJungle || (canTakeOpportunisticJungle && phase !== 'early'))) {
      target = mapEdgeApproachPoint(weakCamp.pos)
      macroDecision = 'Farmar selva'
      microDecision = 'Limpando campo neutro'
    } else if (canPressureTower && enemyTower) {
      target = enemyTower.pos
      macroDecision = `Pressionar torre T${enemyTower.tier}`
      microDecision = `Batendo torre T${enemyTower.tier}`
    } else if (distantLaneCreep && !towerThreat && effectiveDanger < 58) {
      target = distantLaneCreep.pos
      macroDecision = wantsWavePush ? 'Push wave' : 'Farmar lane'
      microDecision = wantsWavePush ? 'Acelerando wave' : 'Acumulando patrimonio na rota'
    } else if (economyCamp && (canTakeAssignedJungle || (canTakeOpportunisticJungle && phase !== 'early')) && !towerThreat && hpRatio > 0.72 && effectiveDanger < (modeWantsJungle ? 56 : 46)) {
      target = mapEdgeApproachPoint(economyCamp.pos)
      macroDecision = 'Farmar selva'
      microDecision = 'Acumulando patrimonio na selva'
    } else if (advanceBlockedByTower && creepToEscort) {
      target = creepToEscort.pos
      macroDecision = 'Segurar rota'
      microDecision = 'Escoltando wave aliada'
    } else if (advanceBlockedByTower && blockingTower) {
      target = safeLaneRetreatPoint(arcane, path, blockingTower)
      macroDecision = 'Segurar rota'
      microDecision = 'Segurando fora da torre'
    } else if (shouldRespectLane) {
      target = laneAnchor
      macroDecision = 'Manter rota'
      microDecision = 'Priorizando rota no early game'
    } else {
      target = nextAdvancePoint
      macroDecision = 'Avancar rota'
      microDecision = 'Avancando rota'
    }
  }

  if (isLaneAdvanceMicroDecision(microDecision) && shouldRefreshLaneProgress) {
    pathIndex = syncLanePathIndex(arcane.pos, path, pathIndex)
    target = getLaneAdvancePoint(arcane, path, pathIndex)
  }

  const recoveredAtBase = atBase &&
    arcane.stats.hp >= arcane.stats.maxHp * 0.94 &&
    arcane.stats.mana >= arcane.stats.maxMana * 0.82
  const stillPointingAtBase = distance(target, ownBase) < baseServiceRange
  const advancingWithBaseTarget = macroDecision.startsWith('Avancar') && stillPointingAtBase
  const baseThreatNow = recoveredAtBase || advancingWithBaseTarget
    ? getCachedBaseThreat(state, arcane.team, frameContext)
    : undefined
  if (((recoveredAtBase && !canBuyAtBase) || advancingWithBaseTarget) && stillPointingAtBase && !baseThreatNow?.urgent) {
    pathIndex = Math.max(1, pathIndex)
    target = getLaneAdvancePoint(arcane, path, pathIndex)
    macroDecision = 'Avancar rota'
    microDecision = 'Saindo da base'
    aiMode = 'push_lane'
    aiReason = 'base_exit'
    aiExecutionChance = 100
    aiExecutionDelay = 0
    aiFailure = undefined
  }

  if (microDecision.startsWith('Foco em')) {
    const liveFocusBoard = getArcaneCombatBlackboard(state, arcane)
    const liveFocusTarget = getCombatFocusTarget(state, arcane, liveFocusBoard)
    if (!liveFocusBoard || !liveFocusTarget) {
      target = arcane.pos
      macroDecision = 'Reavaliar luta'
      microDecision = 'Foco encerrado'
      aiReason = `${aiReason}${aiReason ? ', ' : ''}combat_focus_invalid`
    } else {
      const liveFocusAssessment = getCombatFocusAssessment(state, arcane, liveFocusTarget, liveFocusBoard)
      if (!liveFocusAssessment.canApproach) {
        target = getCombatStagingPoint(state, arcane, liveFocusTarget, liveFocusBoard, liveFocusAssessment)
        macroDecision = liveFocusAssessment.mustDisengage ? 'Recuar da luta' : 'Manter formacao'
        microDecision = liveFocusAssessment.mustDisengage
          ? `Rompendo foco em ${liveFocusTarget.player}`
          : `Aguardando janela contra ${liveFocusTarget.player}`
        aiReason = `${aiReason}${aiReason ? ', ' : ''}live_danger_guard, danger_${Math.round(liveFocusAssessment.danger)}`
      }
    }
  }

  const shouldShopAtBase = shouldDecide && atBase && (canBuyAtBase || !macroDecision.startsWith('Avancar'))
  const shoppedArcane = shouldShopAtBase ? buyAtBase(state, arcane) : arcane
  const dispelResult = shouldDecide ? applyDispelItemIfNeeded(state, shoppedArcane) : { arcane: shoppedArcane, used: undefined }
  const activeItemResult = shouldDecide
    ? applySimpleActiveItemIfNeeded(state, dispelResult.arcane, decisionDangerScore, decisionVisibleEnemies, frameContext)
    : { arcane: dispelResult.arcane, used: undefined, interruptsDecision: false }
  const consumableResult = shouldDecide && !atBase ? consumeItemIfNeeded(state, activeItemResult.arcane) : { arcane: activeItemResult.arcane, used: undefined }
  const activeArcane = consumableResult.arcane
  const channelingArcane = shouldDecide
    ? startTeleportIfUseful(state, activeArcane, target, macroDecision, microDecision, atBase, canBuyAtBase)
    : undefined
  if (channelingArcane) return channelingArcane
  const hpRegen = atBase
    ? resourceRegenForTick(NON_COMBAT_RULES.regeneration.baseHealthRegenPerSecond, delta)
    : 0
  const manaRegen = resourceRegenForTick(
    atBase
      ? NON_COMBAT_RULES.regeneration.baseManaRegenPerSecond
      : NON_COMBAT_RULES.regeneration.outOfCombatManaRegenPerSecond,
    delta,
  )
  const auraMultiplier = getAuraMultiplier(state, arcane.team)
  const effectiveMoveSpeed = getEffectiveArcaneMoveSpeed(state, activeArcane)
  const moveMultiplier = getArcaneMovementEffectMultiplier(state, activeArcane)
  const moveDestination = getArcaneMoveDestination(activeArcane, state, target, microDecision)
  const boughtItem = shoppedArcane.items.length > arcane.items.length
  const boughtTeleport = shoppedArcane.tpScrolls > arcane.tpScrolls
  const usedDispel = dispelResult.used !== undefined
  const activeItemInterruptedDecision = activeItemResult.interruptsDecision === true
  const usedConsumable = consumableResult.used !== undefined
  const boughtWhileHoldingBase = (boughtItem || boughtTeleport) && distance(target, ownBase) < baseServiceRange
  const finalMacroDecision = boughtWhileHoldingBase ? 'Recuperar recursos' : macroDecision
  const rawFinalMicroDecision = boughtTeleport ? 'Comprou TP na base' : boughtItem ? 'Comprou item na base' : usedDispel ? `Dissipou com ${dispelResult.used}` : activeItemInterruptedDecision ? `Ativou ${activeItemResult.used}` : usedConsumable ? `Usou ${consumableResult.used}` : microDecision
  const invalidAdvanceBaseState = finalMacroDecision.startsWith('Avancar') &&
    rawFinalMicroDecision.toLowerCase().includes('base') &&
    distance(target, ownBase) < baseServiceRange
  const finalMicroDecision = invalidAdvanceBaseState ? 'Saindo da base' : rawFinalMicroDecision
  const nextPos = moveToward(arcane.pos, moveDestination, effectiveMoveSpeed * auraMultiplier * moveMultiplier * delta)
  const movementDelta = distance(arcane.pos, nextPos)
  const stalledAdvance = finalMacroDecision.startsWith('Avancar') &&
    movementDelta < 0.03 &&
    distance(arcane.pos, moveDestination) > 0.8
  const nextStats = {
    ...activeArcane.stats,
    hp: Math.min(activeArcane.stats.maxHp, activeArcane.stats.hp + hpRegen),
    mana: Math.min(activeArcane.stats.maxMana, activeArcane.stats.mana + manaRegen),
  }
  const nextDecisionAt = stalledAdvance || invalidAdvanceBaseState
    ? state.time + 0.12
    : boughtItem || boughtTeleport || usedDispel || activeItemInterruptedDecision || usedConsumable
    ? state.time + 0.22
    : shouldRunDecision
      ? state.time + getArcaneDecisionInterval(activeArcane, aiMode, finalMacroDecision) + (arcane.forceDecision ? 0 : aiExecutionDelay)
      : decisionDue
        ? state.time + getArcaneHoldDecisionInterval(activeArcane)
      : activeArcane.nextDecisionAt

  const travelPlan = createArcaneTravelPlanIfUseful(
    state,
    activeArcane,
    nextPos,
    target,
    moveDestination,
    finalMacroDecision,
    finalMicroDecision,
    aiMode,
    effectiveMoveSpeed * auraMultiplier * moveMultiplier,
    nextDecisionAt,
    atBase,
    frameContext,
  )

  return {
    ...activeArcane,
    pathIndex,
    target,
    macroDecision: finalMacroDecision,
    microDecision: finalMicroDecision,
    aiMode,
    aiReason: stalledAdvance || invalidAdvanceBaseState
      ? `${aiReason}${aiReason ? ', ' : ''}${stalledAdvance ? 'stalled_advance' : 'advance_base_state'}`
      : aiReason,
    aiExecutionChance,
    aiExecutionDelay,
    aiFailure,
    nextDecisionAt,
    forceDecision: stalledAdvance || invalidAdvanceBaseState,
    lastDecisionAt: shouldRunDecision ? state.time : activeArcane.lastDecisionAt,
    lastDecisionHpRatio: shouldRunDecision ? nextStats.hp / Math.max(1, nextStats.maxHp) : activeArcane.lastDecisionHpRatio,
    lastDecisionManaRatio: shouldRunDecision ? nextStats.mana / Math.max(1, nextStats.maxMana) : activeArcane.lastDecisionManaRatio,
    lastDecisionPos: shouldRunDecision ? nextPos : activeArcane.lastDecisionPos,
    decision: finalMicroDecision,
    pos: nextPos,
    movementDestination: moveDestination,
    stats: nextStats,
    travelPlan,
  }
}

export function resolveCompletedChannels(state: SimulationState): SimulationState {
  const completedIds = state.arcanes
    .filter((arcane) => arcane.channeling && arcane.channeling.completesAt <= state.time)
    .map((arcane) => arcane.id)

  for (const arcaneId of completedIds) {
    const arcane = state.arcanes.find((candidate) => candidate.id === arcaneId)
    const channel = arcane?.channeling
    if (!arcane || !channel) continue

    if (isArcaneStunned(state, arcane)) {
      replaceArcaneInState(state, {
        ...arcane,
        channeling: undefined,
        macroDecision: getChannelMacroDecision(channel),
        microDecision: `${channel.label} interrompido`,
        aiReason: `${channel.kind}_interrupted`,
        decision: `${channel.label} interrompido`,
        forceDecision: true,
        nextDecisionAt: state.time + 0.1,
      })
      continue
    }

    if (channel.kind === 'teleport') {
      replaceArcaneInState(state, completeTeleportChannel(state, arcane, channel))
      continue
    }

    if (channel.kind === 'skill') completeSkillChannel(state, arcane, channel)
    else replaceArcaneInState(state, completeGenericChannel(state, arcane, channel))
  }

  return state
}

function completeSkillChannel(state: SimulationState, arcane: Arcane, channel: ChannelingAction) {
  const skill = channel.skillId
    ? getArcaneRuntimeSkills(arcane).find((candidate) => candidate.id === channel.skillId)
    : undefined
  const level = channel.skillLevel ?? (skill ? getSimpleSkillLevel(arcane, skill) : 0)

  replaceArcaneInState(state, completeGenericChannel(state, arcane, channel))
  const liveArcane = state.arcanes.find((candidate) => candidate.id === arcane.id)
  const liveTarget = channel.targetId ? getCombatTargetById(state, channel.targetId) : undefined
  const target = liveTarget ?? (skill && liveArcane && (skill.target === 'self' || skill.target === 'point' || skill.target === 'area' || skill.target === 'global') ? liveArcane : undefined)
  if (!skill || !liveArcane || level <= 0 || !target) return

  const targetAlive = 'player' in target
    ? target.stats.hp > 0 && target.respawn <= state.time
    : target.hp > 0
  if (!targetAlive && skill.target === 'unit') return
  const profile = getSkillEffectProfile(skill, level)
  if (profile.summonMode === 'channel') return

  resolveSimpleSkillEffects(
    state,
    liveArcane,
    skill,
    level,
    target,
    profile,
    false,
    channel.target,
  )
}

function completeGenericChannel(state: SimulationState, arcane: Arcane, channel: ChannelingAction): Arcane {
  return {
    ...arcane,
    channeling: undefined,
    macroDecision: getChannelMacroDecision(channel),
    microDecision: channel.effectLabel,
    aiReason: `${channel.kind}_complete`,
    decision: channel.effectLabel,
    forceDecision: true,
    nextDecisionAt: state.time + 0.1,
  }
}

function replaceArcaneInState(state: SimulationState, replacement: Arcane) {
  const index = state.arcanes.findIndex((arcane) => arcane.id === replacement.id)
  if (index < 0) return
  const arcanes = [...state.arcanes]
  arcanes[index] = replacement
  state.arcanes = arcanes
}

export type PregameBountyRunePlan = {
  point: Point
  kind: 'defend' | 'invade'
  threatened: boolean
}

export function getPregameRuneContestAssessment(
  state: SimulationState,
  arcane: Arcane,
  plan: PregameBountyRunePlan,
  enemies = state.arcanes.filter((candidate) => (
    candidate.team !== arcane.team &&
    candidate.stats.hp > 0 &&
    candidate.respawn <= state.time &&
    isPointVisibleToTeam(state, arcane.team, candidate.pos)
  )),
) {
  const hpRatio = arcane.stats.hp / Math.max(1, arcane.stats.maxHp)
  const localNumbers = getLocalNumbers(state, arcane.team, plan.point, 12, enemies)
  const dangerAtRune = getEnemyActionThreatScore(state, arcane, plan.point, enemies)
  const dangerHere = getEnemyActionThreatScore(state, arcane, arcane.pos, enemies)
  const danger = Math.max(dangerAtRune, dangerHere)
  const healthPenalty = Math.max(0, 0.78 - hpRatio) * 58
  const dangerTolerance = clampNumber(46 + arcane.aggression * 0.24 + localNumbers.advantage * 9 - healthPenalty, 34, 72)
  const mustRetreat = hpRatio < 0.48 || (hpRatio < 0.72 && danger >= dangerTolerance + 8) || localNumbers.advantage <= -0.9
  const healthyObjectiveCommit = hpRatio >= 0.82 && localNumbers.advantage >= -0.45
  const canContest = !mustRetreat && localNumbers.advantage >= -0.45 && (
    healthyObjectiveCommit || (hpRatio >= 0.62 && danger <= dangerTolerance + 14)
  )
  return { canContest, mustRetreat, danger, dangerTolerance, localNumbers }
}

export function getPregameRuneStagingPoint(point: Point, ownBase: Point, distanceFromRune: number) {
  const direction = getNormalizedDirection(point, ownBase)
  return clampToMapBounds({
    x: point.x + direction.x * distanceFromRune,
    y: point.y + direction.y * distanceFromRune,
  })
}

export function getPregameBountyRunePlan(state: SimulationState, arcane: Arcane): PregameBountyRunePlan {
  const ownedPoints = runeSpawnPoints.bounty.filter((point) => getBountyRuneSide(point) === arcane.team)
  const enemyPoints = runeSpawnPoints.bounty.filter((point) => getBountyRuneSide(point) !== arcane.team)
  const lanePath = lanePaths[arcane.team][arcane.lane]
  const closestToLane = (points: Point[]) => [...points].sort((a, b) => {
    if (arcane.lane === 'mid') {
      return distance(a, { x: 50, y: 50 }) - distance(b, { x: 50, y: 50 })
    }
    return distance(a, nearestLanePoint(a, lanePath)) - distance(b, nearestLanePoint(b, lanePath)) ||
      distance(arcane.pos, a) - distance(arcane.pos, b)
  })[0]
  const ownLanePoint = closestToLane(ownedPoints) ?? ownedPoints[0]
  const enemyLanePoint = closestToLane(enemyPoints) ?? enemyPoints[0]
  const enemies = state.arcanes.filter((candidate) => (
    candidate.team !== arcane.team &&
    candidate.stats.hp > 0 &&
    candidate.respawn <= state.time &&
    isPointVisibleToTeam(state, arcane.team, candidate.pos)
  ))
  const allies = state.arcanes.filter((candidate) => (
    candidate.team === arcane.team &&
    candidate.id !== arcane.id &&
    candidate.stats.hp > 0 &&
    candidate.respawn <= state.time
  ))
  const threatenedPoint = ownedPoints
    .map((point) => {
      const enemyCount = enemies.filter((enemy) => distance(enemy.pos, point) <= 16).length
      const allyCount = allies.filter((ally) => distance(ally.pos, point) <= 14).length
      return { point, enemyCount, allyCount, score: enemyCount * 30 - allyCount * 14 - distance(arcane.pos, point) * 0.2 }
    })
    .filter(({ enemyCount, allyCount }) => enemyCount > 0 && enemyCount >= allyCount)
    .sort((a, b) => b.score - a.score)[0]
  const supportInvasionBase = arcane.role === 'Greedy Support' ? 28 : arcane.role === 'Dedicated Support' ? 12 : -40
  const invasionPersonality = supportInvasionBase + arcane.aggression * 0.2 + arcane.shotcalling * 0.16
  const invasionVariation = seededRandomUnit(state.matchSeed, `${arcane.id}:pregame-rune-invasion`) * 24
  const enemyDefense = enemies.filter((enemy) => distance(enemy.pos, enemyLanePoint) <= 14).length
  const assignedInvader = invasionPersonality + invasionVariation - enemyDefense * 12 >= 58
  const threatOnAssignedRune = threatenedPoint && distance(threatenedPoint.point, ownLanePoint) < 1
  const canReactToThreat = threatenedPoint && (threatOnAssignedRune || distance(arcane.pos, threatenedPoint.point) <= 22)

  if (canReactToThreat && threatenedPoint) {
    return { point: threatenedPoint.point, kind: 'defend', threatened: true }
  }
  if (assignedInvader) {
    return { point: enemyLanePoint, kind: 'invade', threatened: false }
  }
  return { point: ownLanePoint, kind: 'defend', threatened: false }
}

export function buyAtBase(state: SimulationState, arcane: Arcane): Arcane {
  if (arcane.tpScrolls < teleportScrollMaxCharges && arcane.stats.gold >= teleportScrollCost) {
    return {
      ...arcane,
      tpScrolls: arcane.tpScrolls + 1,
      stats: {
        ...arcane.stats,
        gold: arcane.stats.gold - teleportScrollCost,
      },
    }
  }
  const itemPurchase = buyItemAtBase(arcane)
  if (itemPurchase !== arcane) return itemPurchase
  if (arcane.items.length >= 6) return arcane
  const consumable = getAffordableWantedConsumable(state, arcane)
  if (consumable) {
    return {
      ...arcane,
      items: [...arcane.items, consumable.name],
      stats: {
        ...arcane.stats,
        gold: arcane.stats.gold - consumable.cost,
      },
    }
  }

  return arcane
}

export function hasBasePurchaseOpportunity(state: SimulationState, arcane: Arcane) {
  return (arcane.tpScrolls < teleportScrollMaxCharges && arcane.stats.gold >= teleportScrollCost) ||
    getAffordableItemPurchasePlan(arcane) !== undefined ||
    getAffordableWantedConsumable(state, arcane) !== undefined
}

export function buyItemAtBase(arcane: Arcane): Arcane {
  const purchase = getAffordableItemPurchasePlan(arcane)
  if (!purchase) return arcane
  const retainedItems = purchase.soldItemName ? removeFirstByName(arcane.items, purchase.soldItemName) : arcane.items
  const items = [...retainedItems, purchase.item.name]

  return {
    ...arcane,
    items,
    stats: rebuildArcaneStatsAfterItemChange(arcane, items, arcane.stats.gold - purchase.netCost),
  }
}

export function consumeItemIfNeeded(state: SimulationState, arcane: Arcane): { arcane: Arcane; used?: string } {
  const hpRatio = arcane.stats.hp / Math.max(1, arcane.stats.maxHp)
  const manaRatio = arcane.stats.mana / Math.max(1, arcane.stats.maxMana)
  const needsHeal = hpRatio < 0.52 && !hasTimedEffect(state, arcane.id, 'hot')
  const needsMana = manaRatio < 0.32
  if (!needsHeal && !needsMana) return { arcane }

  const consumable = arcane.items
    .map((name) => getConsumableByName(name))
    .find((item) => item && ((needsHeal && item.heal) || (needsMana && item.mana)))
  if (!consumable) return { arcane }

  const items = removeFirstByName(arcane.items, consumable.name)
  let stats = arcane.stats
  if (consumable.heal) {
    if (consumable.duration && consumable.duration > 1) {
      addTimedEffect(state, arcane, {
        sourceId: consumable.id,
        sourceName: consumable.name,
        sourceTeam: arcane.team,
        kind: 'hot',
        polarity: 'positive',
        value: Math.max(1, consumable.heal / consumable.duration),
        tickInterval: 1,
        duration: consumable.duration,
      })
    } else {
      stats = {
        ...stats,
        hp: Math.min(stats.maxHp, stats.hp + consumable.heal),
      }
    }
  }
  if (consumable.mana) {
    stats = {
      ...stats,
      mana: Math.min(stats.maxMana, stats.mana + consumable.mana),
    }
  }

  return {
    arcane: {
      ...arcane,
      items,
      stats,
    },
    used: consumable.name,
  }
}

export function applyDispelItemIfNeeded(state: SimulationState, arcane: Arcane): { arcane: Arcane; used?: string } {
  const candidate = getDispelItemCandidate(state, arcane)
  if (!candidate?.item.active?.dispelPower) return { arcane }

  const removed = dispelTimedEffects(state, arcane.id, candidate.item.active.dispelPower, 'negative')
  if (removed === 0) return { arcane }

  return {
    arcane: {
      ...arcane,
      itemCooldowns: {
        ...arcane.itemCooldowns,
        [candidate.item.name]: state.time + candidate.item.active.cooldown,
      },
    },
    used: candidate.item.name,
  }
}

export function applySimpleActiveItemIfNeeded(
  state: SimulationState,
  arcane: Arcane,
  knownDanger?: number,
  visibleEnemies?: Arcane[],
  frameContext?: TickFrameContext,
): { arcane: Arcane; used?: string; interruptsDecision?: boolean } {
  if (hasTimedEffect(state, arcane.id, 'mute')) return { arcane }
  const candidate = getSimpleActiveItemCandidate(state, arcane, knownDanger, visibleEnemies, frameContext)
  const active = candidate?.item.active
  if (!candidate || !active) return { arcane }

  const item = candidate.item
  let nextArcane = arcane
  let applied = false
  let interruptsDecision = false
  const hpRatio = arcane.stats.hp / Math.max(1, arcane.stats.maxHp)
  const tags = active.tags
  let cachedAllyTargets: Arcane[] | undefined
  const getAllyTargets = () => cachedAllyTargets ??= getSimpleActiveItemAllyTargets(state, arcane, item)

  if (hasAnyItemTag(tags, ['restore_health', 'heal_over_time', 'healing', 'heal'])) {
    const allyTargets = getAllyTargets()
    const healing = getActiveItemNumber(active.values, 'health') ?? getActiveItemNumber(active.values, 'heal') ?? 180
    if (hasAnyItemTag(tags, ['team']) || active.target === 'area') {
      applyHealthToArcanes(state, allyTargets, healing, arcane.id)
      applied = allyTargets.length > 0
    } else if (allyTargets.some((target) => target.id !== arcane.id)) {
      applyHealthToArcanes(state, allyTargets.slice(0, 1), healing, arcane.id)
      applied = true
    } else {
      nextArcane = healArcaneDirectly(nextArcane, healing)
      applied = true
    }
  }

  if (hasAnyItemTag(tags, ['restore_mana'])) {
    const allyTargets = getAllyTargets()
    const mana = getActiveItemNumber(active.values, 'mana') ?? 120
    if (hasAnyItemTag(tags, ['team']) || active.target === 'area') {
      applyManaToArcanes(state, allyTargets, mana)
      applied = allyTargets.length > 0
    } else {
      nextArcane = restoreManaDirectly(nextArcane, mana)
      applied = true
    }
  }

  if (hasAnyItemTag(tags, ['magic_barrier', 'physical_barrier', 'team_barrier', 'barrier', 'damage_immunity', 'link_barrier', 'debuff_immunity', 'ethereal', 'physical_immunity'])) {
    const allyTargets = getAllyTargets()
    const barrier = getActiveItemNumber(active.values, 'barrier') ??
      getActiveItemNumber(active.values, 'magicBarrier') ??
      getActiveItemNumber(active.values, 'block') ??
      (hpRatio < 0.45 ? 280 : 180)
    const targets = hasAnyItemTag(tags, ['team', 'team_barrier']) || active.target === 'area'
      ? allyTargets
      : allyTargets.length > 0
        ? allyTargets.slice(0, 1)
        : [arcane]
    targets.forEach((target) => addTimedEffect(state, target, {
      sourceId: item.id,
      sourceName: item.name,
      sourceTeam: arcane.team,
      kind: 'barrier',
      polarity: 'positive',
      value: barrier,
      duration: active.duration ?? getActiveItemNumber(active.values, 'duration') ?? 4.5,
    }))
    applied = targets.length > 0
  }

  if (hasAnyItemTag(tags, ['blink'])) {
    nextArcane = blinkArcaneWithItem(state, nextArcane, item)
    applied = distance(nextArcane.pos, arcane.pos) > 0.05
    interruptsDecision = applied
    state.effects = addAttackEffect(state.effects, {
      kind: 'arcane',
      action: 'mobility',
      sourceId: arcane.id,
      targetKind: 'arcane',
      team: arcane.team,
      from: arcane.pos,
      to: nextArcane.pos,
      createdAt: state.time,
    })
  }

  if (hasAnyItemTag(tags, ['displacement']) && !hasAnyItemTag(tags, ['blink'])) {
    nextArcane = forceMoveArcaneWithItem(state, nextArcane, item)
    const moved = distance(nextArcane.pos, arcane.pos) > 0.05
    applied = applied || moved
    interruptsDecision = interruptsDecision || moved
  }

  if (hasAnyItemTag(tags, ['movement', 'mobility', 'haste', 'attack_speed', 'slow_immunity'])) {
    const allyTargets = getAllyTargets()
    const targets = hasAnyItemTag(tags, ['team']) || active.target === 'area' ? allyTargets : [nextArcane]
    targets.forEach((target) => addTimedEffect(state, target, {
      sourceId: item.id,
      sourceName: item.name,
      sourceTeam: arcane.team,
      kind: 'buff',
      polarity: 'positive',
      value: 1,
      modifiers: {
        moveSpeedPct: (getActiveItemNumber(active.values, 'moveSpeedPct') ?? (hasAnyItemTag(tags, ['haste']) ? 25 : 15)) / 100,
        attackSpeedPct: (getActiveItemNumber(active.values, 'attackSpeed') ?? 0) / 100,
      },
      duration: active.duration ?? getActiveItemNumber(active.values, 'duration') ?? 2.8,
    }))
    applied = targets.length > 0
  }

  if (hasAnyItemTag(tags, ['gold', 'xp', 'creep_only'])) {
    const creepTarget = getSimpleActiveItemCreepTarget(state, arcane, item)
    if (creepTarget) {
      const bonusGold = getActiveItemNumber(active.values, 'bonusGold') ?? 120
      const bonusXpPct = getActiveItemNumber(active.values, 'bonusXpPct') ?? 100
      nextArcane = grantArcaneEconomy(nextArcane, bonusGold, Math.round(getCreepXpReward(creepTarget, state.time) * (bonusXpPct / 100)))
      damageEntity(state, creepTarget.id, creepTarget.hp + 1, {
        id: item.id,
        label: `${arcane.player}: ${item.name}`,
        team: arcane.team,
        damageType: 'pure',
      })
      addGoldMarker(state, arcane.team, creepTarget.pos, bonusGold)
      addSimpleItemEffect(state, arcane, creepTarget)
      applied = true
      interruptsDecision = true
    }
  }

  const activeDamage = getActiveItemDamage(arcane, item)
  const enemyTarget = activeDamage > 0 || hasAnyItemTag(tags, ['slow', 'attack_slow', 'disarm', 'stun', 'disable', 'hex', 'cyclone', 'root', 'silence', 'armor_reduction', 'heal_reduction'])
    ? getSimpleActiveItemEnemyTarget(state, arcane, item)
    : undefined
  if (enemyTarget) {
    if (activeDamage > 0) {
      damageEntity(state, enemyTarget.id, activeDamage, {
        id: item.id,
        label: `${arcane.player}: ${item.name}`,
        team: arcane.team,
        damageType: hasAnyItemTag(tags, ['physical_damage']) ? 'physical' : 'magical',
      })
      addSimpleItemEffect(state, arcane, enemyTarget)
      applied = true
      interruptsDecision = true
    }
    if (hasAnyItemTag(tags, ['slow', 'attack_slow', 'disarm'])) {
      addTimedEffect(state, enemyTarget, {
        sourceId: item.id,
        sourceName: item.name,
        sourceTeam: arcane.team,
        kind: 'slow',
        polarity: 'negative',
        value: Math.min(0.75, (getActiveItemNumber(active.values, 'slowPct') ?? 35) / 100),
        duration: getActiveItemNumber(active.values, 'slowDuration') ?? active.duration ?? 2.2,
      })
      applied = true
      interruptsDecision = true
    }
    if (hasAnyItemTag(tags, ['stun', 'disable', 'hex', 'cyclone', 'root'])) {
      addTimedEffect(state, enemyTarget, {
        sourceId: item.id,
        sourceName: item.name,
        sourceTeam: arcane.team,
        kind: 'stun',
        polarity: 'negative',
        value: 1,
        duration: getActiveItemNumber(active.values, 'stun') ??
          getActiveItemNumber(active.values, 'root') ??
          active.duration ??
          getActiveItemNumber(active.values, 'duration') ??
          1.5,
      })
      applied = true
      interruptsDecision = true
    }
    if (hasAnyItemTag(tags, ['silence'])) {
      addTimedEffect(state, enemyTarget, {
        sourceId: item.id,
        sourceName: item.name,
        sourceTeam: arcane.team,
        kind: 'silence',
        polarity: 'negative',
        value: 1,
        duration: active.duration ?? 3,
      })
      applied = true
      interruptsDecision = true
    }
    if (hasAnyItemTag(tags, ['armor_reduction'])) {
      addTimedEffect(state, enemyTarget, {
        sourceId: item.id,
        sourceName: item.name,
        sourceTeam: arcane.team,
        kind: 'buff',
        polarity: 'negative',
        value: 1,
        modifiers: { armorFlat: -(getActiveItemNumber(active.values, 'armorReduction') ?? 4) },
        duration: active.duration ?? 5,
      })
      applied = true
      interruptsDecision = true
    }
    if (hasAnyItemTag(tags, ['heal_reduction'])) {
      addTimedEffect(state, enemyTarget, {
        sourceId: item.id,
        sourceName: item.name,
        sourceTeam: arcane.team,
        kind: 'dot',
        polarity: 'negative',
        value: Math.max(10, enemyTarget.stats.maxHp * ((getActiveItemNumber(active.values, 'currentHealthDamagePct') ?? 2) / 100)),
        damageType: 'magical',
        tickInterval: 1,
        duration: active.duration ?? 6,
      })
      applied = true
      interruptsDecision = true
    }
  }

  if (!applied) return { arcane }

  return {
    arcane: {
      ...nextArcane,
      itemCooldowns: {
        ...nextArcane.itemCooldowns,
        [item.name]: state.time + active.cooldown,
      },
    },
    used: item.name,
    interruptsDecision,
  }
}

export function getSimpleActiveItemCandidate(
  state: SimulationState,
  arcane: Arcane,
  knownDanger?: number,
  visibleEnemies?: Arcane[],
  frameContext?: TickFrameContext,
) {
  for (const item of getShopItemsForInventory(arcane.items)) {
    if (!item.active || (arcane.itemCooldowns[item.name] ?? 0) > state.time) continue
    if (shouldUseSimpleActiveItem(state, arcane, item, knownDanger, visibleEnemies, frameContext)) {
      return { name: item.name, item }
    }
  }
  return undefined
}

export function shouldUseSimpleActiveItem(
  state: SimulationState,
  arcane: Arcane,
  item: ShopItem,
  knownDanger?: number,
  visibleEnemies?: Arcane[],
  frameContext?: TickFrameContext,
) {
  const active = item.active
  if (!active) return false
  const tags = active.tags
  const hpRatio = arcane.stats.hp / Math.max(1, arcane.stats.maxHp)
  const manaRatio = arcane.stats.mana / Math.max(1, arcane.stats.maxMana)

  if (active.dispelPower && getDispelItemCandidate(state, arcane)?.item.id === item.id) return false
  if (hasAnyItemTag(tags, ['restore_health', 'heal_over_time', 'healing', 'heal'])) {
    const allyTargets = getSimpleActiveItemAllyTargets(state, arcane, item)
    return hpRatio < 0.48 || allyTargets.some((ally) => ally.stats.hp / Math.max(1, ally.stats.maxHp) < 0.48)
  }
  if (hasAnyItemTag(tags, ['magic_barrier', 'physical_barrier', 'team_barrier', 'barrier', 'damage_immunity', 'link_barrier', 'debuff_immunity', 'ethereal', 'physical_immunity'])) {
    const danger = knownDanger ?? getDangerScore(state, arcane, visibleEnemies, frameContext)
    const allyTargets = getSimpleActiveItemAllyTargets(state, arcane, item)
    const teamBarrier = hasAnyItemTag(tags, ['team', 'team_barrier']) || active.target === 'area'
    const targetsNeedBarrier = allyTargets.some((ally) => (
      !hasTimedEffect(state, ally.id, 'barrier') &&
      (ally.stats.hp / Math.max(1, ally.stats.maxHp) < 0.48 || danger > 66)
    ))
    if (teamBarrier) return targetsNeedBarrier
    if (hasTimedEffect(state, arcane.id, 'barrier')) return false
    return hpRatio < 0.5 || danger > 66
  }
  if (hasAnyItemTag(tags, ['blink', 'mobility', 'haste', 'displacement', 'movement'])) {
    const danger = knownDanger ?? getDangerScore(state, arcane, visibleEnemies, frameContext)
    const activeCombatIntent = arcane.microDecision.includes('Atacando') ||
      arcane.microDecision.includes('Iniciando') ||
      arcane.microDecision.includes('Gank') ||
      arcane.microDecision.includes('Pressionando')
    const urgentRotation = arcane.microDecision.includes('Juntando') && distance(arcane.pos, arcane.target) > 12
    return danger > 68 || activeCombatIntent || urgentRotation
  }
  if (hasAnyItemTag(tags, ['damage', 'magic_damage', 'magical_damage', 'nuke', 'slow', 'attack_slow', 'silence', 'disarm', 'stun', 'disable', 'hex', 'cyclone', 'root', 'armor_reduction', 'heal_reduction'])) return getSimpleActiveItemEnemyTarget(state, arcane, item) !== undefined
  if (hasAnyItemTag(tags, ['restore_mana'])) return manaRatio < 0.28
  if (hasAnyItemTag(tags, ['gold', 'xp', 'creep_only'])) return getSimpleActiveItemCreepTarget(state, arcane, item) !== undefined
  return false
}

export function getSimpleActiveItemEnemyTarget(state: SimulationState, arcane: Arcane, item: ShopItem) {
  const range = Math.max(arcane.stats.range + 3, (getActiveItemNumber(item.active?.values ?? {}, 'range') ?? 650) / 100)
  return nearestVisibleEnemyArcane(state, arcane.pos, arcane.team, range)
}

export function getSimpleActiveItemCreepTarget(state: SimulationState, arcane: Arcane, item: ShopItem) {
  const range = Math.max(arcane.stats.range + 2, (getActiveItemNumber(item.active?.values ?? {}, 'range') ?? 650) / 100)
  let closest: Creep | undefined
  let closestDistanceSquared = range * range
  for (const creep of state.creeps) {
    if (creep.team === arcane.team || creep.hp <= 0) continue
    const creepDistanceSquared = distanceSquared(arcane.pos, creep.pos)
    if (creepDistanceSquared > closestDistanceSquared) continue
    closest = creep
    closestDistanceSquared = creepDistanceSquared
  }
  return closest
}

export function getSimpleActiveItemAllyTargets(state: SimulationState, arcane: Arcane, item: ShopItem) {
  const active = item.active
  if (!active) return [arcane]
  const radius = (getActiveItemNumber(active.values, 'radius') ?? 900) / 100
  const targetAllies = state.arcanes.filter((ally) => (
    ally.team === arcane.team &&
    ally.stats.hp > 0 &&
    ally.respawn <= state.time &&
    distance(ally.pos, arcane.pos) <= radius
  ))
  if (active.target === 'unit') {
    const wounded = targetAllies
      .filter((ally) => ally.id !== arcane.id)
      .sort((a, b) => (a.stats.hp / Math.max(1, a.stats.maxHp)) - (b.stats.hp / Math.max(1, b.stats.maxHp)))[0]
    return wounded ? [wounded] : [arcane]
  }
  return targetAllies.length > 0 ? targetAllies : [arcane]
}

export function healArcaneDirectly(arcane: Arcane, amount: number) {
  const appliedHealing = Math.min(amount, Math.max(0, arcane.stats.maxHp - arcane.stats.hp))
  return {
    ...arcane,
    healingDone: arcane.healingDone + appliedHealing,
    healingReceived: arcane.healingReceived + appliedHealing,
    stats: {
      ...arcane.stats,
      hp: Math.min(arcane.stats.maxHp, arcane.stats.hp + amount),
    },
  }
}

export function restoreManaDirectly(arcane: Arcane, amount: number) {
  return {
    ...arcane,
    stats: {
      ...arcane.stats,
      mana: Math.min(arcane.stats.maxMana, arcane.stats.mana + amount),
    },
  }
}

export function applyHealthToArcanes(state: SimulationState, targets: Arcane[], amount: number, sourceArcaneId?: string) {
  const targetIds = new Set(targets.map((target) => target.id))
  let totalHealing = 0
  state.arcanes = state.arcanes.map((arcane) => {
    if (!targetIds.has(arcane.id)) return arcane
    const appliedHealing = Math.min(amount, Math.max(0, arcane.stats.maxHp - arcane.stats.hp))
    totalHealing += appliedHealing
    return {
      ...arcane,
      healingReceived: arcane.healingReceived + appliedHealing,
      stats: { ...arcane.stats, hp: arcane.stats.hp + appliedHealing },
    }
  })
  if (sourceArcaneId && totalHealing > 0) {
    state.arcanes = state.arcanes.map((arcane) => arcane.id === sourceArcaneId
      ? { ...arcane, healingDone: arcane.healingDone + totalHealing }
      : arcane)
  }
}

export function applyManaToArcanes(state: SimulationState, targets: Arcane[], amount: number) {
  const targetIds = new Set(targets.map((target) => target.id))
  state.arcanes = state.arcanes.map((arcane) => targetIds.has(arcane.id)
    ? { ...arcane, stats: { ...arcane.stats, mana: Math.min(arcane.stats.maxMana, arcane.stats.mana + amount) } }
    : arcane)
}

export function blinkArcaneWithItem(state: SimulationState, arcane: Arcane, item: ShopItem) {
  const range = (getActiveItemNumber(item.active?.values ?? {}, 'range') ?? 900) / 100
  const danger = getDangerScore(state, arcane)
  const destination = danger > 58 ? teamInfo[arcane.team].base : arcane.target
  return {
    ...arcane,
    pos: moveToward(arcane.pos, destination, range),
    target: destination,
  }
}

export function forceMoveArcaneWithItem(state: SimulationState, arcane: Arcane, item: ShopItem) {
  const distanceMap = (getActiveItemNumber(item.active?.values ?? {}, 'distance') ?? 450) / 100
  const destination = getDangerScore(state, arcane) > 58 ? teamInfo[arcane.team].base : arcane.target
  return {
    ...arcane,
    pos: moveToward(arcane.pos, destination, distanceMap),
  }
}

export function getActiveItemDamage(arcane: Arcane, item: ShopItem) {
  const values = item.active?.values ?? {}
  const levelDamage = getActiveItemLevelDamage(values, arcane.stats.level)
  if (levelDamage > 0) return levelDamage
  const base = getActiveItemNumber(values, 'damage') ??
    getActiveItemNumber(values, 'damageBase') ??
    getActiveItemNumber(values, 'procDamage') ??
    0
  const primaryPct = getActiveItemNumber(values, 'damageFromPrimaryAttributePct') ?? 0
  if (primaryPct <= 0) return base
  const hero = getHeroDefinition(arcane.heroDefinitionId)
  const calculated = calculateHeroStats(hero, arcane.stats.level, getItemStatModifiers(arcane.items, hero))
  const primary = getPrimaryAttributeValue(hero, calculated.attributes)
  return Math.round(base + primary * (primaryPct / 100))
}

export function getActiveItemLevelDamage(values: Record<string, number | number[] | string | boolean>, level: number) {
  const damageByLevel = values.damageByLevel
  if (typeof damageByLevel !== 'string') return 0
  const valuesByLevel = damageByLevel
    .split('/')
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isFinite(value))
  if (valuesByLevel.length === 0) return 0
  const bracket = Math.min(valuesByLevel.length - 1, Math.max(0, Math.floor((level - 1) / 6)))
  return valuesByLevel[bracket]
}

export function getPrimaryAttributeValue(hero: HeroDefinition, attributes: { strength: number; agility: number; intelligence: number; totalAttributes: number }) {
  if (hero.primaryAttribute === 'strength') return attributes.strength
  if (hero.primaryAttribute === 'agility') return attributes.agility
  if (hero.primaryAttribute === 'intelligence') return attributes.intelligence
  return attributes.totalAttributes / 3
}

export function addSimpleItemEffect(state: SimulationState, arcane: Arcane, target: CombatTarget) {
  state.effects = addAttackEffect(state.effects, {
    kind: 'arcane',
    action: 'item',
    sourceId: arcane.id,
    targetKind: getCombatTargetKind(target),
    team: arcane.team,
    from: arcane.pos,
    to: target.pos,
    createdAt: state.time,
  })
}

export function hasAnyItemTag(tags: string[], candidates: string[]) {
  return candidates.some((tag) => tags.includes(tag))
}

export function getActiveItemNumber(values: Record<string, number | number[] | string | boolean>, key: string) {
  const value = values[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

export function getTimedEffectsForTarget(state: SimulationState, targetId: string) {
  let cached = timedEffectsByTargetCache.get(state)
  if (!cached || cached.source !== state.timedEffects) {
    const byTarget = new Map<string, TimedEffect[]>()
    for (const effect of state.timedEffects) {
      const targetEffects = byTarget.get(effect.targetId)
      if (targetEffects) targetEffects.push(effect)
      else byTarget.set(effect.targetId, [effect])
    }
    cached = { source: state.timedEffects, byTarget }
    timedEffectsByTargetCache.set(state, cached)
  }
  return cached.byTarget.get(targetId) ?? []
}

export function getDispelItemCandidate(state: SimulationState, arcane: Arcane) {
  const activeDebuffs = getTimedEffectsForTarget(state, arcane.id).filter((effect) => (
    effect.polarity === 'negative' &&
    effect.expiresAt > state.time
  ))
  if (activeDebuffs.length === 0) return undefined

  return getShopItemsForInventory(arcane.items)
    .filter((item) => item.active?.dispelPower !== undefined)
    .filter((item) => (arcane.itemCooldowns[item.name] ?? 0) <= state.time)
    .map((item) => ({ name: item.name, item }))
    .find((candidate) => shouldUseDispelPower(activeDebuffs, candidate.item.active?.dispelPower ?? 'basic'))
}

export function shouldUseDispelPower(effects: TimedEffect[], power: DispelPower) {
  return effects.some((effect) => {
    if (!canDispelEffect(effect.dispelType, power)) return false
    if (effect.kind === 'stun') return power === 'strong'
    return effect.kind === 'silence' || effect.kind === 'slow' || effect.kind === 'dot'
  })
}

export function dispelTimedEffects(state: SimulationState, targetId: string, power: DispelPower, polarity: TimedEffect['polarity']) {
  let removed = 0
  state.timedEffects = state.timedEffects.filter((effect) => {
    const shouldRemove = effect.targetId === targetId &&
      effect.polarity === polarity &&
      effect.expiresAt > state.time &&
      canDispelEffect(effect.dispelType, power)
    if (shouldRemove) {
      removed += 1
      return false
    }
    return true
  })
  return removed
}

export function affordableShopItem(arcane: Arcane) {
  return getAffordableItemPurchasePlan(arcane)?.item
}

export function getAffordableItemPurchasePlan(arcane: Arcane) {
  const purchase = getItemPurchasePlan(arcane)
  return purchase && arcane.stats.gold >= purchase.netCost ? purchase : undefined
}

export function getWantedConsumable(state: SimulationState, arcane: Arcane) {
  if (arcane.items.length >= 6) return undefined
  const carriedConsumables = arcane.items
    .map((name) => getConsumableByName(name))
    .filter((item): item is ConsumableItem => item !== undefined)
  const consumableBudget = getConsumableSlotBudget(state, arcane)
  if (carriedConsumables.length >= consumableBudget) return undefined

  const hasHeal = carriedConsumables.some((item) => item.heal)
  const hasMana = carriedConsumables.some((item) => item.mana)
  const wantsMana = arcane.role === 'Mid' || arcane.role.includes('Support')
  const hpRatio = arcane.stats.hp / Math.max(1, arcane.stats.maxHp)
  const manaRatio = arcane.stats.mana / Math.max(1, arcane.stats.maxMana)
  const needsHealSoon = hpRatio < 0.78 || state.time < 420
  const needsManaSoon = manaRatio < 0.58 || state.time < 540
  const permanentItem = affordableShopItem(arcane)
  const keepSlotForPermanent = permanentItem !== undefined && arcane.items.length >= 5

  if (keepSlotForPermanent && !needsHealSoon && !needsManaSoon) return undefined

  const candidate = wantsMana && !hasMana
    ? needsManaSoon
      ? getConsumableByName('Mana Clarity') ?? getConsumableByName('Burst Mango')
      : undefined
    : !hasHeal && needsHealSoon
      ? getConsumableByName('Regen Rations') ?? getConsumableByName('Healing Salve')
      : !hasMana && needsManaSoon
        ? getConsumableByName('Mana Clarity') ?? getConsumableByName('Burst Mango')
        : undefined

  return candidate
}

export function getAffordableWantedConsumable(state: SimulationState, arcane: Arcane) {
  const consumable = getWantedConsumable(state, arcane)
  return consumable && arcane.stats.gold >= consumable.cost ? consumable : undefined
}

export function getArcaneCombatBlackboard(state: SimulationState, arcane: Arcane, includeDisengaging = false) {
  return state.combatBlackboards[arcane.team].find((board) => (
    (board.alliedHeroIds.includes(arcane.id) || board.scenario?.alliedReinforcements.some((reinforcement) => reinforcement.heroId === arcane.id)) &&
    (includeDisengaging || (board.phase !== 'disengage' && board.phase !== 'reset'))
  ))
}

export function getCombatScenarioDecisionLabel(type: CombatBlackboard['encounterType']) {
  if (type === 'rune_skirmish') return 'disputa de runa'
  if (type === 'camp_contest' || type === 'jungle_skirmish') return 'disputa na selva'
  if (type === 'tower_dive') return 'dive'
  if (type === 'counter_dive') return 'counter-dive'
  if (type === 'objective_skirmish') return 'disputa de objetivo'
  if (type === 'full_teamfight' || type === 'high_ground_fight' || type === 'base_defense') return 'luta coletiva'
  return 'skirmish'
}

export function getCombatChaseStopDecisionLabel(reason: CombatChaseStopReason | undefined) {
  if (reason === 'dangerous_fog') return 'Reagrupando sem visao do alvo'
  if (reason === 'formation_break') return 'Recompondo a formacao'
  if (reason === 'resources_spent') return 'Encerrando sem recursos de combate'
  if (reason === 'enemy_reinforcements') return 'Recuando de reforcos inimigos'
  if (reason === 'counter_initiation') return 'Evitando contra-iniciacao'
  if (reason === 'better_objective') return 'Convertendo para objetivo melhor'
  return 'Abandonando perseguicao de baixo valor'
}

export function getCombatFocusTarget(state: SimulationState, arcane: Arcane, board = getArcaneCombatBlackboard(state, arcane)) {
  if (!board?.primaryTargetId) return undefined
  return state.arcanes.find((target) => (
    target.id === board.primaryTargetId &&
    target.team !== arcane.team &&
    target.stats.hp > 0 &&
    target.respawn <= state.time &&
    isPointVisibleToTeam(state, arcane.team, target.pos)
  ))
}

export function getCombatFocusAssessment(
  state: SimulationState,
  arcane: Arcane,
  target: Arcane,
  board: CombatBlackboard,
  visibleEnemies = state.arcanes.filter((enemy) => enemy.team !== arcane.team && enemy.stats.hp > 0 && enemy.respawn <= state.time),
) {
  const hpRatio = arcane.stats.hp / Math.max(1, arcane.stats.maxHp)
  const actionDanger = getEnemyActionThreatScore(state, arcane, target.pos, visibleEnemies)
  const towerExposure = getCombatTargetTowerExposure(state, arcane.team, target.pos)
  const localNumbers = getLocalNumbers(state, arcane.team, target.pos, 14, visibleEnemies)
  const danger = Math.max(actionDanger, board.primaryTargetDanger ?? 0, towerExposure * 0.82)
  const chaseBlocked = board.phase === 'chase' && board.scenario?.chaseAllowed === false
  const phaseAllowance = board.phase === 'chase' && !chaseBlocked ? 12 : board.phase === 'commit' || board.phase === 'sustain' ? 8 : 0
  const healthPenalty = hpRatio < 0.7 ? (0.7 - hpRatio) * 55 : 0
  const dangerTolerance = clampNumber(42 + arcane.aggression * 0.34 + phaseAllowance - healthPenalty, 38, 78)
  const isReinforcement = board.scenario?.alliedReinforcements.some((reinforcement) => reinforcement.heroId === arcane.id) ?? false
  const targetAlreadyReachable = distance(arcane.pos, target.pos) <= getArcaneAttackCenterRange(arcane, target) + 0.7
  const waitingForReinforcement = board.scenario?.intent === 'reinforce' && !isReinforcement && !targetAlreadyReachable
  const holdingScenario = board.scenario?.intent === 'hold' && !targetAlreadyReachable
  const mustDropTowerAggro = board.scenario?.requestTowerAggroDrop === true && board.scenario.towerAggroTargetId === arcane.id
  const mustDisengage = board.phase === 'disengage' || board.scenario?.intent === 'disengage' || mustDropTowerAggro || hpRatio < 0.34 || danger >= 86 || localNumbers.advantage <= -1.5
  const canApproach = !mustDisengage &&
    !chaseBlocked &&
    !waitingForReinforcement &&
    !holdingScenario &&
    danger <= dangerTolerance &&
    towerExposure < 60 &&
    localNumbers.advantage >= -0.5

  return { canApproach, mustDisengage, danger, dangerTolerance, towerExposure, localNumbers, waitingForReinforcement, holdingScenario, mustDropTowerAggro, chaseBlocked }
}

export function getCombatStagingPoint(
  state: SimulationState,
  arcane: Arcane,
  target: Arcane,
  board = getArcaneCombatBlackboard(state, arcane, true),
  assessment = board ? getCombatFocusAssessment(state, arcane, target, board) : undefined,
) {
  if (!board) return arcane.pos
  if (assessment?.mustDisengage) {
    return moveToward(arcane.pos, teamInfo[arcane.team].base, 8)
  }
  const defendingTeam: TeamId = arcane.team === 'dawn' ? 'dusk' : 'dawn'
  const threateningStructure = [
    ...state.towers.filter((tower) => tower.team === defendingTeam && tower.hp > 0),
    ...state.structures.filter((structure) => structure.kind === 'tower_tier_4' && structure.team === defendingTeam && structure.hp > 0),
  ].find((structure) => distance(structure.pos, target.pos) <= structure.range + 1.5)
  if (threateningStructure) {
    return getPointOutsideThreatRadius(
      arcane.pos,
      threateningStructure.pos,
      threateningStructure.range + getEntityCollisionRadius(arcane) + 2.8,
      teamInfo[arcane.team].base,
    )
  }
  if (assessment && (assessment.danger > assessment.dangerTolerance + 8 || assessment.localNumbers.advantage < -0.5)) {
    return getCombatFormationStagingPoint(arcane, target, board)
  }
  return arcane.pos
}

export function getCombatFormationStagingPoint(arcane: Arcane, target: Arcane, board: CombatBlackboard) {
  const assignment = (board.roleAssignments ?? []).find((candidate) => candidate.heroId === arcane.id)
  const band = assignment?.positioningBand ?? 'midline'
  const away = getNormalizedDirection(target.pos, teamInfo[arcane.team].base)
  const perpendicular = { x: -away.y, y: away.x }
  const depth = band === 'frontline' ? 4.2 : band === 'midline' ? 6 : band === 'flank' ? 5.4 : 7.5
  const flankSide = seededRandomUnit(arcane.id, board.encounterId) >= 0.5 ? 1 : -1
  const lateral = band === 'flank' ? 3.4 * flankSide : (seededRandomUnit(board.encounterId, arcane.id) - 0.5) * 2.4
  return clampToMapBounds({
    x: target.pos.x + away.x * depth + perpendicular.x * lateral,
    y: target.pos.y + away.y * depth + perpendicular.y * lateral,
  })
}

export function getPointOutsideThreatRadius(point: Point, threat: Point, radius: number, fallback: Point) {
  const currentDistance = distance(point, threat)
  if (currentDistance >= radius) return point
  const direction = currentDistance > 0.001
    ? { x: (point.x - threat.x) / currentDistance, y: (point.y - threat.y) / currentDistance }
    : getNormalizedDirection(threat, fallback)
  return clampToMapBounds({ x: threat.x + direction.x * radius, y: threat.y + direction.y * radius })
}

export function getPointAwayFromThreat(point: Point, threat: Point, distanceToCreate: number, fallback: Point) {
  const currentDistance = distance(point, threat)
  const direction = currentDistance > 0.001
    ? { x: (point.x - threat.x) / currentDistance, y: (point.y - threat.y) / currentDistance }
    : getNormalizedDirection(threat, fallback)
  return clampToMapBounds({ x: point.x + direction.x * distanceToCreate, y: point.y + direction.y * distanceToCreate })
}

function getNormalizedDirection(from: Point, to: Point) {
  const directionDistance = distance(from, to)
  if (directionDistance <= 0.001) return { x: 1, y: 0 }
  return { x: (to.x - from.x) / directionDistance, y: (to.y - from.y) / directionDistance }
}

export function getConsumableSlotBudget(state: SimulationState, arcane: Arcane) {
  if (state.time > 900) return arcane.role.includes('Support') ? 1 : 0
  if (arcane.role === 'Mid' || arcane.role.includes('Support')) return 2
  return 1
}

export function getConsumableByName(name: string) {
  return consumableCatalog.find((item) => item.name === name)
}

export function removeFirstByName(items: string[], name: string) {
  let removed = false
  return items.filter((item) => {
    if (!removed && item === name) {
      removed = true
      return false
    }
    return true
  })
}

export function getArcaneMoveDestination(arcane: Arcane, state: SimulationState, target: Point, microDecision: string) {
  if (isObjectiveMicroDecision(microDecision)) {
    const objective = getObjectiveEntityNearPoint(state, arcane.team, target, 7)
    if (objective) {
      if (distance(arcane.pos, objective.pos) <= getStructureAttackHoldRange(arcane, objective)) {
        return arcane.pos
      }
      return getAttackApproachPoint(arcane.pos, objective, arcane.stats.range, getEntityCollisionRadius(arcane))
    }
  }

  const combatTarget = getCombatMoveTargetNearPoint(state, arcane, target, microDecision)
  if (combatTarget) {
    const holdRange = getArcaneAttackCenterRange(arcane, combatTarget) * 0.94
    if (distance(arcane.pos, combatTarget.pos) <= holdRange) {
      return arcane.pos
    }
    return getAttackApproachPoint(arcane.pos, combatTarget, arcane.stats.range, getEntityCollisionRadius(arcane))
  }

  return arcane.stats.attackType === 'melee'
    ? target
    : formationPoint(target, arcane.id)
}

export function getCombatMoveTargetNearPoint(state: SimulationState, arcane: Arcane, target: Point, microDecision: string) {
  if (microDecision.startsWith('Atacar chefe')) {
    return state.boss.hp > 0 && distance(state.boss.pos, target) <= 8 ? state.boss : undefined
  }

  if (isLaneCreepMicroDecision(microDecision)) {
    return nearest(target, state.creeps.filter((creep) => (
      creep.hp > 0 &&
      creep.lane === arcane.lane &&
      (microDecision.startsWith('Preparando deny') ? creep.team === arcane.team : creep.team !== arcane.team)
    )), 5)
  }

  if (isJungleFarmMicroDecision(microDecision) || isLanePullMicroDecision(microDecision)) {
    return nearest(target, state.camps.filter((camp) => camp.hp > 0), 6)
  }

  if (
    microDecision.startsWith('Gank em') ||
    microDecision.startsWith('Pressionando') ||
    microDecision.startsWith('Iniciando luta')
  ) {
    return nearest(target, state.arcanes.filter((other) => (
      other.team !== arcane.team &&
      other.stats.hp > 0 &&
      other.respawn <= state.time &&
      isPointVisibleToTeam(state, arcane.team, other.pos)
    )), 6)
  }

  return undefined
}

export function isJungleFarmMicroDecision(microDecision: string) {
  return microDecision.startsWith('Limpando campo') || microDecision.startsWith('Acumulando patrimonio na selva')
}

export function isLanePullMicroDecision(microDecision: string) {
  return microDecision.startsWith('Puxando wave') || microDecision.startsWith('Preparando pull')
}

export function getFocusedObjectiveTarget(state: SimulationState, arcane: Arcane): Tower | Structure | Base | undefined {
  if (!isObjectiveMicroDecision(arcane.microDecision)) return undefined
  const candidates = getObjectiveCandidates(state, arcane.team)
  const intended = nearest(arcane.target, candidates, 7)
  const target = intended && distance(arcane.pos, intended.pos) <= getArcaneAttackCenterRange(arcane, intended)
    ? intended
    : nearestReachableByArcane(arcane, candidates)

  if (!target || distance(arcane.pos, target.pos) > getArcaneAttackCenterRange(arcane, target)) return undefined
  return target
}

export function getObjectiveEntityNearPoint(state: SimulationState, team: TeamId, point: Point, range: number) {
  return nearest(point, getObjectiveCandidates(state, team), range)
}

export function getObjectiveCandidates(state: SimulationState, team: TeamId): Array<Tower | Structure | Base> {
  return [
    ...getAttackableEnemyTowers(state, team),
    ...getAttackableEnemyStructures(state, team),
    ...(isEnemyBaseUnlocked(state, team) ? state.bases.filter((base) => base.team !== team && base.hp > 0) : []),
  ]
}

export function isObjectiveMicroDecision(microDecision: string) {
  return microDecision.startsWith('Batendo torre') ||
    microDecision.startsWith('Executando objetivo') ||
    microDecision.startsWith('Atacar chefe') ||
    microDecision.startsWith('Fazendo objetivo')
}

export function isLaneCreepMicroDecision(microDecision: string) {
  return microDecision.startsWith('Last hit') ||
    microDecision.startsWith('Preparando last hit') ||
    microDecision.startsWith('Preparando deny') ||
    microDecision.startsWith('Farmando wave') ||
    microDecision.startsWith('Acelerando wave') ||
    microDecision.startsWith('Acumulando patrimonio na rota')
}

export function isLaneAdvanceMicroDecision(microDecision: string) {
  return microDecision.startsWith('Avancando rota') ||
    microDecision.startsWith('Saindo da base')
}

export function isTeamCallDecision(arcane: Arcane) {
  return arcane.macroDecision.startsWith('Juntar com o time') ||
    arcane.macroDecision.startsWith('Chamar objetivo') ||
    arcane.microDecision.startsWith('Movendo para agrupamento') ||
    arcane.microDecision.startsWith('Chamando time')
}

export function isLaningControlMicroDecision(microDecision: string) {
  return microDecision.startsWith('Last hit') ||
    microDecision.startsWith('Preparando last hit') ||
    microDecision.startsWith('Preparando deny')
}

export function getStructureAttackHoldRange(arcane: Arcane, target: Tower | Structure | Base) {
  return Math.max(1.4, getArcaneAttackCenterRange(arcane, target) * 0.92)
}

export function getAttackApproachPoint(from: Point, target: { pos: Point }, attackRange: number, attackerRadius = 0) {
  const desiredDistance = Math.max(1.5, attackRange + attackerRadius + getEntityCollisionRadius(target) * 0.75)
  const currentDistance = distance(from, target.pos)
  if (currentDistance <= desiredDistance) return from
  if (currentDistance === 0) return target.pos

  return clampToMapBounds({
    x: target.pos.x + ((from.x - target.pos.x) / currentDistance) * desiredDistance,
    y: target.pos.y + ((from.y - target.pos.y) / currentDistance) * desiredDistance,
  })
}

export function getArcaneMovementEffectMultiplier(state: SimulationState, arcane: Arcane) {
  const slows = getTimedEffectsForTarget(state, arcane.id)
    .filter((effect) => effect.kind === 'slow' && effect.expiresAt > state.time)
    .map((effect) => finalSlowValue(effect.value, [arcane.stats.slowResistance / 100]))
  if (slows.length === 0) return 1

  const combinedSlow = 1 - slows.reduce((product, slow) => product * (1 - Math.max(0, Math.min(0.9, slow))), 1)
  return Math.max(0.35, 1 - combinedSlow)
}

export function getArcaneStatModifierEffects(state: SimulationState, arcane: Arcane) {
  return getTimedEffectsForTarget(state, arcane.id).filter((effect) => (
    effect.expiresAt > state.time &&
    effect.modifiers
  ))
}

export type ArcanePassiveCombatModifiers = {
  flatDamage: number
  damagePct: number
  armorFlat: number
  moveSpeedPct: number
  attackSpeedPct: number
  lifestealPct: number
  incomingDamagePct: number
}

const emptyArcanePassiveCombatModifiers: ArcanePassiveCombatModifiers = {
  flatDamage: 0,
  damagePct: 0,
  armorFlat: 0,
  moveSpeedPct: 0,
  attackSpeedPct: 0,
  lifestealPct: 0,
  incomingDamagePct: 0,
}
const arcanePassiveCombatModifiersCache = new Map<string, WeakMap<SkillLevels, WeakMap<string[], ArcanePassiveCombatModifiers>>>()

export function getArcanePassiveCombatModifiers(state: SimulationState, arcane: Arcane) {
  if (hasTimedEffect(state, arcane.id, 'break')) {
    return emptyArcanePassiveCombatModifiers
  }

  let bySkillLevels = arcanePassiveCombatModifiersCache.get(arcane.heroDefinitionId)
  if (!bySkillLevels) {
    bySkillLevels = new WeakMap()
    arcanePassiveCombatModifiersCache.set(arcane.heroDefinitionId, bySkillLevels)
  }
  let byItems = bySkillLevels.get(arcane.skillLevels)
  if (!byItems) {
    byItems = new WeakMap()
    bySkillLevels.set(arcane.skillLevels, byItems)
  }
  const cached = byItems.get(arcane.items)
  if (cached) return cached

  const modifiers = getArcaneRuntimeSkills(arcane)
    .filter((skill) => skill.kind === 'passive')
    .map((skill) => ({ skill, level: getSimpleSkillLevel(arcane, skill) }))
    .filter(({ level }) => level > 0)
    .reduce((modifiers, { skill, level }) => {
      const profile = getSkillEffectProfile(skill, level)
      const hasCrit = profile.critChance > 0 && profile.critMultiplier > 1
      const expectedCritPct = hasCrit ? profile.critChance * (profile.critMultiplier - 1) : 0
      const flatDamage = !hasCrit && profile.damage > 0 ? Math.min(55, profile.damage * 0.12) : 0
      const auraDamage = hasSkillTag(skill, ['damage_aura', 'vengeance_aura', 'aura']) ? 0.025 * level : 0
      const defensiveReduction = hasSkillTag(skill, ['dispersion', 'untouchable', 'damage_reduction', 'evasion'])
        ? Math.min(0.28, 0.06 + level * 0.035)
        : 0
      return {
        flatDamage: modifiers.flatDamage + flatDamage,
        damagePct: modifiers.damagePct + expectedCritPct + auraDamage,
        armorFlat: modifiers.armorFlat + profile.armorDelta,
        moveSpeedPct: modifiers.moveSpeedPct + profile.moveSpeedPct,
        attackSpeedPct: modifiers.attackSpeedPct + profile.attackSpeedPct,
        lifestealPct: Math.max(modifiers.lifestealPct, profile.lifestealPct),
        incomingDamagePct: Math.max(modifiers.incomingDamagePct, defensiveReduction),
      }
    }, { ...emptyArcanePassiveCombatModifiers })
  byItems.set(arcane.items, modifiers)
  return modifiers
}

export function getEffectiveArcaneDamage(state: SimulationState, arcane: Arcane) {
  const modifiers = getArcaneStatModifierEffects(state, arcane)
  const passive = getArcanePassiveCombatModifiers(state, arcane)
  return applyFlatAndPercentModifiers(
    arcane.stats.damage,
    [passive.flatDamage],
    [...modifiers.map((effect) => effect.modifiers?.damagePct ?? 0), passive.damagePct],
  )
}

export function getEffectiveArcaneDamageRange(state: SimulationState, arcane: Arcane) {
  const modifiers = getArcaneStatModifierEffects(state, arcane)
  const passive = getArcanePassiveCombatModifiers(state, arcane)
  const percents = [...modifiers.map((effect) => effect.modifiers?.damagePct ?? 0), passive.damagePct]
  return {
    min: applyFlatAndPercentModifiers(arcane.stats.damageMin, [passive.flatDamage], percents),
    max: applyFlatAndPercentModifiers(arcane.stats.damageMax, [passive.flatDamage], percents),
  }
}

export function getArcaneDamageRangeLabel(state: SimulationState, arcane: Arcane, multiplier = 1) {
  const range = getEffectiveArcaneDamageRange(state, arcane)
  return `${Math.round(range.min * multiplier)}~${Math.round(range.max * multiplier)}`
}

export function getEffectiveArcaneArmor(state: SimulationState, arcane: Arcane) {
  const modifiers = getArcaneStatModifierEffects(state, arcane)
  const passive = getArcanePassiveCombatModifiers(state, arcane)
  return applyFlatAndPercentModifiers(
    arcane.stats.armor,
    [...modifiers.map((effect) => effect.modifiers?.armorFlat ?? 0), passive.armorFlat],
  )
}

export function getEffectiveArcaneMoveSpeed(state: SimulationState, arcane: Arcane) {
  const modifiers = getArcaneStatModifierEffects(state, arcane)
  const passive = getArcanePassiveCombatModifiers(state, arcane)
  return applyFlatAndPercentModifiers(
    arcane.stats.moveSpeed,
    [],
    [...modifiers.map((effect) => effect.modifiers?.moveSpeedPct ?? 0), passive.moveSpeedPct],
  )
}

export function getEffectiveArcaneAttackCooldown(state: SimulationState, arcane: Arcane) {
  const modifiers = getArcaneStatModifierEffects(state, arcane)
  const passive = getArcanePassiveCombatModifiers(state, arcane)
  const attackSpeedPct = modifiers.reduce((sum, effect) => sum + (effect.modifiers?.attackSpeedPct ?? 0), passive.attackSpeedPct)
  const stanceBatMultiplier = arcane.heroDefinitionId === 'h119_twin_blade_duelist' && getTwinBladeStance(arcane.skillStates) === 'sai'
    ? 1.5 / 1.9
    : 1
  return arcane.stats.attackSpeed * stanceBatMultiplier / Math.max(0.2, 1 + attackSpeedPct)
}

export function getArcaneSlowPercent(state: SimulationState, arcane: Arcane) {
  return Math.round((1 - getArcaneMovementEffectMultiplier(state, arcane)) * 100)
}

export function getArcaneBarrierAmount(state: SimulationState, arcane: Arcane) {
  return Math.round(getTimedEffectsForTarget(state, arcane.id)
    .filter((effect) => effect.kind === 'barrier' && effect.expiresAt > state.time)
    .reduce((sum, effect) => sum + Math.max(0, effect.barrierRemaining ?? effect.value), 0))
}

export function resolveIncomingArcaneDamage(state: SimulationState, target: Arcane, damage: number, damageType: CombatDamageType) {
  const passive = getArcanePassiveCombatModifiers(state, target)
  const temporaryReduction = getArcaneStatModifierEffects(state, target)
    .reduce((sum, effect) => sum + (effect.modifiers?.incomingDamagePct ?? 0), 0)
  const resolvedDamage = resolveDamage({
    baseDamage: damage * (1 - Math.min(0.8, passive.incomingDamagePct + temporaryReduction)),
    damageType,
    targetArmor: getEffectiveArcaneArmor(state, target),
    targetMagicResistance: target.stats.magicResistance,
  })

  return absorbDamageWithBarriers(state, target.id, resolvedDamage)
}

export function hasTimedEffect(state: SimulationState, targetId: string, kind: TimedEffect['kind']) {
  return getTimedEffectsForTarget(state, targetId).some((effect) => effect.kind === kind && effect.expiresAt > state.time)
}

export function isArcaneStunned(state: SimulationState, arcane: Arcane) {
  return getTimedEffectsForTarget(state, arcane.id).some((effect) => (
    effect.expiresAt > state.time && (
      effect.kind === 'stun' ||
      effect.kind === 'hex' ||
      effect.kind === 'sleep' ||
      effect.kind === 'fear' ||
      effect.kind === 'taunt'
    )
  ))
}

export function isArcaneMovementDisabled(state: SimulationState, arcane: Arcane) {
  return getTimedEffectsForTarget(state, arcane.id).some((effect) => (
    effect.expiresAt > state.time && (
      effect.kind === 'stun' ||
      effect.kind === 'hex' ||
      effect.kind === 'sleep' ||
      effect.kind === 'fear' ||
      effect.kind === 'taunt' ||
      effect.kind === 'root'
    )
  ))
}

export function isArcaneAttackDisabled(state: SimulationState, arcane: Arcane) {
  return isArcaneStunned(state, arcane) || hasTimedEffect(state, arcane.id, 'disarm')
}

export function processTimedEffects(state: SimulationState): SimulationState {
  const hasDuePeriodicEffect = state.timedEffects.some((effect) => (
    (effect.kind === 'dot' || effect.kind === 'hot') &&
    (effect.nextTickAt ?? Number.POSITIVE_INFINITY) <= state.time
  ))
  if (!hasDuePeriodicEffect) return state

  const tickedEffectIds = new Set<string>()
  state.timedEffects.forEach((effect) => {
    if ((effect.kind !== 'dot' && effect.kind !== 'hot') || (effect.nextTickAt ?? Number.POSITIVE_INFINITY) > state.time) {
      return
    }

    const target = state.arcanes.find((arcane) => arcane.id === effect.targetId && arcane.stats.hp > 0 && arcane.respawn <= state.time)
    if (!target) return
    if (effect.kind === 'dot' && target.travelPlan) {
      materializeArcaneTravelPlan(target, state.time)
      if (activeArcaneTravelDiagnostics) activeArcaneTravelDiagnostics.cancelledByDamage += 1
    }
    const sourceArcane = state.arcanes.find((arcane) => effect.sourceId === arcane.id || effect.sourceId.startsWith(`${arcane.id}-`))
    const rawTickValue = effect.value * effect.stacks
    const resolvedTickValue = effect.kind === 'dot'
      ? resolveIncomingArcaneDamage(state, target, rawTickValue, effect.damageType ?? 'magical')
      : rawTickValue
    const appliedValue = effect.kind === 'dot'
      ? Math.min(target.stats.hp, resolvedTickValue)
      : Math.min(resolvedTickValue, Math.max(0, target.stats.maxHp - target.stats.hp))

    state.arcanes = state.arcanes.map((arcane) => {
      const isTarget = arcane.id === target.id
      const isSource = arcane.id === sourceArcane?.id
      if (!isTarget && !isSource) return arcane
      return {
        ...arcane,
        lastHitBy: isTarget && effect.kind === 'dot'
          ? { id: effect.sourceId, label: effect.sourceName, team: effect.sourceTeam }
          : arcane.lastHitBy,
        damageDealt: arcane.damageDealt + (isSource && effect.kind === 'dot' ? appliedValue : 0),
        heroDamageDealt: arcane.heroDamageDealt + (isSource && effect.kind === 'dot' ? appliedValue : 0),
        damageTaken: arcane.damageTaken + (isTarget && effect.kind === 'dot' ? appliedValue : 0),
        healingDone: arcane.healingDone + (isSource && effect.kind === 'hot' ? appliedValue : 0),
        healingReceived: arcane.healingReceived + (isTarget && effect.kind === 'hot' ? appliedValue : 0),
        travelPlan: isTarget && effect.kind === 'dot' ? undefined : arcane.travelPlan,
        stats: isTarget ? {
          ...arcane.stats,
          hp: effect.kind === 'dot' ? arcane.stats.hp - appliedValue : arcane.stats.hp + appliedValue,
        } : arcane.stats,
      }
    })
    tickedEffectIds.add(effect.id)
  })

  state.timedEffects = state.timedEffects.map((effect) => {
    if (!tickedEffectIds.has(effect.id)) return effect
    return {
      ...effect,
      nextTickAt: state.time + (effect.tickInterval ?? 1),
    }
  })

  return state
}

export function addTimedEffect(state: SimulationState, target: Arcane, effect: Omit<TimedEffect, 'id' | 'targetId' | 'createdAt' | 'expiresAt' | 'stacks' | 'nextTickAt' | 'dispelType'> & { duration: number; dispelType?: DispelType }) {
  const duration = effect.polarity === 'negative'
    ? finalDebuffDuration(effect.duration, [target.stats.statusResistance / 100])
    : effect.duration
  const id = `${effect.kind}-${target.id}-${effect.sourceId}`
  const existing = state.timedEffects.find((current) => current.id === id)
  const timedEffect: TimedEffect = {
    id,
    targetId: target.id,
    sourceId: effect.sourceId,
    sourceName: effect.sourceName,
    sourceTeam: effect.sourceTeam,
    kind: effect.kind,
    polarity: effect.polarity,
    value: effect.value,
    stacks: 1,
    modifiers: effect.modifiers,
    barrierRemaining: effect.kind === 'barrier' ? effect.value : effect.barrierRemaining,
    damageType: effect.damageType,
    tickInterval: effect.tickInterval,
    nextTickAt: effect.kind === 'dot' || effect.kind === 'hot'
      ? existing?.nextTickAt ?? state.time + (effect.tickInterval ?? 1)
      : undefined,
    dispelType: effect.dispelType ?? getDefaultDispelType(effect.kind, effect.polarity),
    createdAt: state.time,
    expiresAt: state.time + duration,
  }

  state.timedEffects = [
    timedEffect,
    ...state.timedEffects.filter((current) => current.id !== id),
  ].slice(0, 160)

  if (
    target.travelPlan &&
    (effect.kind === 'stun' || effect.kind === 'hex' || effect.kind === 'sleep' || effect.kind === 'fear' || effect.kind === 'taunt' || effect.kind === 'root')
  ) {
    const liveTarget = state.arcanes.find((arcane) => arcane.id === target.id)
    if (liveTarget?.travelPlan) {
      materializeArcaneTravelPlan(liveTarget, state.time)
      if (activeArcaneTravelDiagnostics) activeArcaneTravelDiagnostics.cancelledByControl += 1
    }
  }
}

export function getDefaultDispelType(kind: TimedEffect['kind'], polarity: TimedEffect['polarity']): DispelType {
  if (polarity === 'positive') return kind === 'barrier' || kind === 'buff' || kind === 'hot' ? 'basic' : 'none'
  if (kind === 'stun' || kind === 'hex' || kind === 'sleep' || kind === 'fear' || kind === 'taunt') return 'strong'
  if (kind === 'slow' || kind === 'silence' || kind === 'root' || kind === 'disarm' || kind === 'break' || kind === 'mute' || kind === 'dot') return 'basic'
  return 'basic'
}

export function applyItemAuraEffects(state: SimulationState) {
  state.arcanes
    .filter((holder) => holder.stats.hp > 0 && holder.respawn <= state.time)
    .forEach((holder) => {
      getArcaneItemEffects(holder, ['aura']).forEach((effect) => applyItemAuraEffect(state, holder, effect))
    })
}

export function applyItemAuraEffect(state: SimulationState, holder: Arcane, effect: RuntimeItemEffect) {
  const radius = (getActiveItemNumber(effect.values, 'radius') ?? 900) / 100
  const allies = state.arcanes.filter((arcane) => arcane.team === holder.team && arcane.stats.hp > 0 && arcane.respawn <= state.time && distance(arcane.pos, holder.pos) <= radius)
  const enemies = state.arcanes.filter((arcane) => arcane.team !== holder.team && arcane.stats.hp > 0 && arcane.respawn <= state.time && distance(arcane.pos, holder.pos) <= radius)
  const auraDuration = 0.85

  if (hasAnyItemTag(effect.tags, ['armor_aura', 'attack_speed_aura', 'damage', 'mana_regen', 'lifesteal'])) {
    allies.forEach((ally) => addTimedEffect(state, ally, {
      sourceId: effect.effectId,
      sourceName: `${holder.player} aura`,
      sourceTeam: holder.team,
      kind: 'buff',
      polarity: 'positive',
      value: 1,
      modifiers: {
        armorFlat: getActiveItemNumber(effect.values, 'allyArmor') ?? 0,
        attackSpeedPct: (getActiveItemNumber(effect.values, 'allyAttackSpeed') ?? 0) / 100,
        damagePct: (getActiveItemNumber(effect.values, 'damagePct') ?? 0) / 100,
      },
      duration: auraDuration,
      dispelType: 'none',
    }))
  }

  if (hasAnyItemTag(effect.tags, ['armor_aura', 'blind'])) {
    enemies.forEach((enemy) => addTimedEffect(state, enemy, {
      sourceId: `${effect.effectId}-enemy`,
      sourceName: `${holder.player} aura`,
      sourceTeam: holder.team,
      kind: 'buff',
      polarity: 'negative',
      value: 1,
      modifiers: {
        armorFlat: -(getActiveItemNumber(effect.values, 'enemyArmorReduction') ?? 0),
        damagePct: hasAnyItemTag(effect.tags, ['blind']) ? -0.12 : 0,
      },
      duration: auraDuration,
      dispelType: 'none',
    }))
  }

  if (hasAnyItemTag(effect.tags, ['magical_damage'])) {
    const dps = getActiveItemNumber(effect.values, 'dps') ?? 0
    if (dps > 0) {
      enemies.forEach((enemy) => addTimedEffect(state, enemy, {
        sourceId: `${effect.effectId}-burn`,
        sourceName: `${holder.player} aura`,
        sourceTeam: holder.team,
        kind: 'dot',
        polarity: 'negative',
        value: dps,
        damageType: 'magical',
        tickInterval: 1,
        duration: 1.1,
        dispelType: 'none',
      }))
    }
  }
}

export function absorbDamageWithBarriers(state: SimulationState, targetId: string, incomingDamage: number) {
  let remainingDamage = incomingDamage
  state.timedEffects = state.timedEffects.map((effect) => {
    if (effect.targetId !== targetId || effect.kind !== 'barrier' || effect.expiresAt <= state.time || remainingDamage <= 0) {
      return effect
    }

    const barrier = applyBarrier(remainingDamage, effect.barrierRemaining ?? effect.value)
    remainingDamage = barrier.damageAfterBarrier
    return {
      ...effect,
      barrierRemaining: barrier.barrierRemaining,
    }
  }).filter((effect) => effect.kind !== 'barrier' || (effect.barrierRemaining ?? effect.value) > 0)

  return remainingDamage
}

export type ArcaneTravelWakeReason = 'arrival' | 'damage' | 'control' | 'decision' | 'call' | 'danger'

export function canUseArcaneKinematicFastPath(
  arcane: Arcane,
  state: SimulationState,
  shouldDecide: boolean,
  deferSafetyUntilDecision = false,
) {
  if (state.arcaneTravelMode !== 'planned' || arcane.forceDecision || state.time < 0) return false
  if (isArcaneMovementDisabled(state, arcane)) return false
  if (deferSafetyUntilDecision && shouldDecide && state.time + 0.0001 < arcane.nextDecisionAt) return true
  if (arcane.microDecision.startsWith('Foco em')) return false
  if (!shouldDecide) return true
  if (state.time + 0.0001 >= arcane.nextDecisionAt) return false

  const ownBase = teamInfo[arcane.team].base
  if (distanceSquared(arcane.pos, ownBase) < baseServiceRange * baseServiceRange) return false
  const hpRatio = arcane.stats.hp / Math.max(1, arcane.stats.maxHp)
  const manaRatio = arcane.stats.mana / Math.max(1, arcane.stats.maxMana)
  if (hpRatio < 0.82 || manaRatio < 0.62) return false
  if (arcane.tpScrolls > 0 && arcane.tpCooldownUntil <= state.time && arcane.stats.mana >= teleportManaCost) return false
  if (state.timedEffects.some((effect) => (
    effect.targetId === arcane.id && effect.polarity === 'negative' && effect.expiresAt > state.time
  ))) return false
  const board = getArcaneCombatBlackboard(state, arcane)
  return !board || board.phase === 'disengage' || board.phase === 'reset'
}

export function updateArcaneKinematics(arcane: Arcane, state: SimulationState, delta: number, refreshDestination = false): Arcane {
  const ownBase = teamInfo[arcane.team].base
  const atBase = distanceSquared(arcane.pos, ownBase) < baseServiceRange * baseServiceRange
  const shouldRefreshLane = isLaneAdvanceMicroDecision(arcane.microDecision) && (
    distanceSquared(arcane.pos, arcane.target) <= 1.35 * 1.35 ||
    distanceSquared(arcane.pos, arcane.lastDecisionPos) > 1.2 * 1.2
  )
  const path = lanePaths[arcane.team][arcane.lane]
  const pathIndex = shouldRefreshLane
    ? syncLanePathIndex(arcane.pos, path, arcane.pathIndex)
    : arcane.pathIndex
  const target = shouldRefreshLane
    ? getLaneAdvancePoint(arcane, path, pathIndex)
    : arcane.target
  const destination = refreshDestination || shouldRefreshLane || !arcane.movementDestination
    ? getArcaneMoveDestination(arcane, state, target, arcane.microDecision)
    : arcane.movementDestination
  const moveSpeed = getEffectiveArcaneMoveSpeed(state, arcane) *
    getAuraMultiplier(state, arcane.team) *
    getArcaneMovementEffectMultiplier(state, arcane)
  const nextPos = moveToward(arcane.pos, destination, moveSpeed * delta)
  const hpRegen = atBase
    ? resourceRegenForTick(NON_COMBAT_RULES.regeneration.baseHealthRegenPerSecond, delta)
    : 0
  const manaRegen = resourceRegenForTick(
    atBase
      ? NON_COMBAT_RULES.regeneration.baseManaRegenPerSecond
      : NON_COMBAT_RULES.regeneration.outOfCombatManaRegenPerSecond,
    delta,
  )
  arcane.pathIndex = pathIndex
  arcane.target = target
  arcane.movementDestination = destination
  arcane.pos = nextPos
  if (hpRegen > 0 || manaRegen > 0) {
    arcane.stats.hp = Math.min(arcane.stats.maxHp, arcane.stats.hp + hpRegen)
    arcane.stats.mana = Math.min(arcane.stats.maxMana, arcane.stats.mana + manaRegen)
  }
  return arcane
}

export function getArcaneTravelTargetSignature(point: Point) {
  return `${point.x.toFixed(3)}:${point.y.toFixed(3)}`
}

export function getArcaneTravelDecisionSignature(arcane: Pick<Arcane, 'macroDecision' | 'microDecision' | 'aiMode'>) {
  return `${arcane.macroDecision}|${arcane.microDecision}|${arcane.aiMode}`
}

export function getArcaneTravelTeamCallSignature(state: SimulationState, team: TeamId) {
  const call = state.teamCalls[team]
  return call ? `${call.callerId}|${call.targetId}|${call.createdAt}|${call.expiresAt}` : '-'
}

export function materializeArcaneTravelPlan(arcane: Arcane, time: number, preservePlan = false): Arcane {
  if (!arcane.travelPlan) return arcane
  if (activeArcaneTravelDiagnostics) activeArcaneTravelDiagnostics.materializations += 1
  const pos = sampleArcaneTravelPlan(arcane.travelPlan, time)
  arcane.pos.x = pos.x
  arcane.pos.y = pos.y
  if (!preservePlan) arcane.travelPlan = undefined
  return arcane
}

export function materializeArcaneTravelPlansForTacticalWindow(state: SimulationState) {
  if (state.arcaneTravelMode !== 'planned') return
  for (const arcane of state.arcanes) materializeArcaneTravelPlan(arcane, state.time, true)
}

export function rebaseArcaneTravelPlansAfterHitboxes(state: SimulationState) {
  if (state.arcaneTravelMode !== 'planned') return
  for (const arcane of state.arcanes) {
    const plan = arcane.travelPlan
    if (!plan) continue
    const expectedPosition = sampleArcaneTravelPlan(plan, state.time)
    if (distanceSquared(expectedPosition, arcane.pos) < 0.00000001) continue
    arcane.travelPlan = rebaseArcaneTravelPlan(plan, arcane.pos, state.time)
  }
}

export function getArcaneTravelWakeReason(
  arcane: Arcane,
  state: SimulationState,
  frameContext?: TickFrameContext,
): ArcaneTravelWakeReason | undefined {
  const plan = arcane.travelPlan
  if (!plan) return 'decision'
  if (state.time + 0.0001 >= plan.endsAt) return 'arrival'
  if (arcane.damageTaken !== plan.damageTakenAtStart) return 'damage'
  if (isArcaneMovementDisabled(state, arcane)) return 'control'
  if (arcane.forceDecision || getArcaneTravelTargetSignature(arcane.target) !== plan.targetSignature) return 'decision'
  if (getArcaneTravelDecisionSignature(arcane) !== plan.decisionSignature) return 'decision'
  if (getArcaneTravelTeamCallSignature(state, arcane.team) !== plan.teamCallSignature) return 'call'
  if (frameContext?.tacticalActivationArcaneIds?.has(arcane.id)) return 'danger'
  return undefined
}

export function recordArcaneTravelWake(reason: ArcaneTravelWakeReason) {
  if (!activeArcaneTravelDiagnostics) return
  if (reason === 'damage') activeArcaneTravelDiagnostics.cancelledByDamage += 1
  else if (reason === 'control') activeArcaneTravelDiagnostics.cancelledByControl += 1
  else if (reason === 'decision') activeArcaneTravelDiagnostics.cancelledByDecision += 1
  else if (reason === 'call') activeArcaneTravelDiagnostics.cancelledByCall += 1
}

export function hasArcaneTravelTacticalThreat(
  state: SimulationState,
  arcane: Arcane,
  point: Point,
  frameContext?: TickFrameContext,
) {
  const board = getArcaneCombatBlackboard(state, arcane)
  if (board && board.phase !== 'disengage' && board.phase !== 'reset') return true
  if (arcane.combatTargetId) return true
  if (getTeamMemoryDanger(state, arcane.team, point) >= 28) return true

  const visibleEnemies = getVisibleEnemyArcanes(state, arcane.team, frameContext)
  if (visibleEnemies.some((enemy) => {
    const awarenessRange = Math.max(arcane.visionRange + 2, enemy.visionRange * 0.55, enemy.stats.range + 5)
    return distanceSquared(point, enemy.pos) <= awarenessRange * awarenessRange
  })) return true

  const nearbyEnemyCreeps = queryCreepSpatialGrid(state, point, 9)
  if (nearbyEnemyCreeps.some((creep) => creep.team !== arcane.team && creep.hp > 0)) return true

  if (state.towers.some((tower) => (
    tower.team !== arcane.team &&
    tower.hp > 0 &&
    distanceSquared(point, tower.pos) <= (tower.range + 4) ** 2
  ))) return true
  if (state.structures.some((structure) => (
    structure.team !== arcane.team &&
    structure.kind === 'tower_tier_4' &&
    structure.hp > 0 &&
    distanceSquared(point, structure.pos) <= (structure.range + 4) ** 2
  ))) return true
  if (state.camps.some((camp) => (
    camp.hp > 0 &&
    camp.respawn <= state.time &&
    distanceSquared(point, camp.pos) <= Math.max(8, camp.range + 4) ** 2
  ))) return true
  return state.boss.hp > 0 &&
    state.boss.respawn <= state.time &&
    distanceSquared(point, state.boss.pos) <= (state.boss.range + 6) ** 2
}

export function collectTacticalArcaneTravelActivations(state: SimulationState, frameContext: TickFrameContext) {
  if (state.arcaneTravelMode !== 'planned') return
  let activations: Set<string> | undefined
  for (const arcane of state.arcanes) {
    const plan = arcane.travelPlan
    if (!plan) continue
    const effectiveSpeed = getEffectiveArcaneMoveSpeed(state, arcane) *
      getAuraMultiplier(state, arcane.team) *
      getArcaneMovementEffectMultiplier(state, arcane)
    const speedChanged = Math.abs(effectiveSpeed - plan.speed) > 0.02
    const shouldActivate = speedChanged ||
      arcane.damageTaken !== plan.damageTakenAtStart ||
      isArcaneMovementDisabled(state, arcane) ||
      getArcaneTravelTeamCallSignature(state, arcane.team) !== plan.teamCallSignature ||
      hasArcaneTravelTacticalThreat(state, arcane, arcane.pos, frameContext)
    if (!shouldActivate) continue
    activations ??= new Set<string>()
    activations.add(arcane.id)
    if (activeArcaneTravelDiagnostics) activeArcaneTravelDiagnostics.tacticalActivations += 1
  }
  frameContext.tacticalActivationArcaneIds = activations
}

export function getArcaneTravelKind(
  arcane: Arcane,
  target: Point,
  macroDecision: string,
  microDecision: string,
): ArcaneTravelKind | undefined {
  const ownBase = teamInfo[arcane.team].base
  if (distanceSquared(target, ownBase) < baseServiceRange * baseServiceRange) return 'base'
  if (
    microDecision === 'Saindo da base' ||
    microDecision === 'Avancando rota' ||
    microDecision === 'Priorizando rota no early game' ||
    macroDecision.includes('rota') ||
    macroDecision.includes('lane') ||
    macroDecision.includes('wave')
  ) return 'lane'
  if (microDecision.startsWith('Movendo para agrupamento:')) return 'objective'
  if (microDecision.startsWith('Chegando em ')) return 'formation'
  const tacticalDecision = [
    'Last hit', 'deny', 'Atacando', 'Batendo', 'Pressionando', 'Gank',
    'Limpando', 'Puxando', 'Executando', 'Atacar chefe', 'Foco em',
    'Rompendo foco', 'Aguardando janela', 'Disputando', 'runa',
  ].some((token) => microDecision.toLowerCase().includes(token.toLowerCase()))
  return tacticalDecision ? undefined : 'formation'
}

export function getArcaneBaseTravelDestination(from: Point, base: Point) {
  const baseDistance = distance(from, base)
  const serviceEdge = baseServiceRange - 0.2
  if (baseDistance <= serviceEdge || baseDistance <= 0.0001) return { ...from }
  return moveToward(from, base, baseDistance - serviceEdge)
}

export function createArcaneTravelPlanIfUseful(
  state: SimulationState,
  arcane: Arcane,
  from: Point,
  target: Point,
  moveDestination: Point,
  macroDecision: string,
  microDecision: string,
  aiMode: PlayerModeType,
  speed: number,
  nextDecisionAt: number,
  atBase: boolean,
  frameContext?: TickFrameContext,
) {
  if (activeArcaneTravelDiagnostics) activeArcaneTravelDiagnostics.candidates += 1
  if (state.arcaneTravelMode !== 'planned' || speed <= 0.01 || arcane.channeling) return undefined
  if (atBase) {
    if (activeArcaneTravelDiagnostics) activeArcaneTravelDiagnostics.rejectedAtBase += 1
    return undefined
  }
  const kind = getArcaneTravelKind(arcane, target, macroDecision, microDecision)
  if (!kind) {
    if (activeArcaneTravelDiagnostics) activeArcaneTravelDiagnostics.rejectedKind += 1
    return undefined
  }
  if (nextDecisionAt <= state.time + 0.065) {
    if (activeArcaneTravelDiagnostics) activeArcaneTravelDiagnostics.rejectedDeadline += 1
    return undefined
  }
  const destination = kind === 'base'
    ? getArcaneBaseTravelDestination(from, teamInfo[arcane.team].base)
    : moveDestination
  if (distanceSquared(from, destination) < 0.45 * 0.45) {
    if (activeArcaneTravelDiagnostics) activeArcaneTravelDiagnostics.rejectedDistance += 1
    return undefined
  }
  if (hasArcaneTravelTacticalThreat(state, arcane, from, frameContext)) {
    if (activeArcaneTravelDiagnostics) activeArcaneTravelDiagnostics.rejectedThreat += 1
    return undefined
  }

  const wakeAt = Math.min(nextDecisionAt, state.time + 2.5)
  const decisionSignature = `${macroDecision}|${microDecision}|${aiMode}`
  const plan = scheduleArcaneTravelPlan(
    undefined,
    kind,
    from,
    destination,
    speed,
    state.time,
    wakeAt,
    getArcaneTravelTargetSignature(target),
    decisionSignature,
    getArcaneTravelTeamCallSignature(state, arcane.team),
    arcane.damageTaken,
  )
  if (plan.endsAt <= state.time + 0.065) return undefined
  if (activeArcaneTravelDiagnostics) activeArcaneTravelDiagnostics.plansStarted += 1
  return plan
}

export function materializeCreepMotionPlan(creep: Creep, time: number, preservePlan = false): Creep {
  if (!creep.motionPlan) return creep
  if (activeCreepMotionDiagnostics) activeCreepMotionDiagnostics.materializations += 1
  const pos = sampleCreepMotionPlan(creep.motionPlan, time)
  creep.pos.x = pos.x
  creep.pos.y = pos.y
  if (!preservePlan) creep.motionPlan = undefined
  return creep
}

export function materializeCreepMotionPlansForTacticalWindow(state: SimulationState) {
  if (state.creepMotionMode !== 'planned' || !state.creeps.some((creep) => creep.motionPlan)) return
  for (const creep of state.creeps) {
    if (!creep.motionPlan) continue
    materializeCreepMotionPlan(creep, state.time, true)
    if (state.creepComponents) syncCreepPositionComponents(state.creepComponents, creep)
  }
}

export function rebaseCreepMotionPlansAfterHitboxes(state: SimulationState) {
  if (state.creepMotionMode !== 'planned') return
  for (const creep of state.creeps) {
    const plan = creep.motionPlan
    if (!plan) continue
    const expectedPosition = sampleCreepMotionPlan(plan, state.time)
    if (distanceSquared(expectedPosition, creep.pos) < 0.00000001) continue
    creep.motionPlan = rebaseCreepMotionPlan(plan, creep.pos, state.time)
  }
}

export function shouldWakeCreepMotionPlan(creep: Creep, state: SimulationState, frameContext?: TickFrameContext) {
  const plan = creep.motionPlan
  if (!plan) return true
  if (state.time + 0.0001 >= plan.endsAt || creep.pullCampId || creep.pullUntil) return true
  if (creep.aggroTargetId && (creep.aggroUntil ?? 0) > state.time) return true
  if (frameContext?.tacticalActivationCreepIds?.has(creep.id)) return true
  if (!creep.routeTargetId) return false

  const target = getCombatTargetById(state, creep.routeTargetId)
  if (!target) return true
  if ('player' in target) return target.stats.hp <= 0 || target.respawn > state.time || plan.kind === 'route'
  return target.hp <= 0 || plan.kind === 'route'
}

export function updateCreepsForTick(
  state: SimulationState,
  delta: number,
  frameContext: TickFrameContext,
  fineStepEntityIds?: ReadonlySet<string>,
  fineStepDelta = delta,
) {
  const planned = state.creepMotionMode === 'planned'
  if (activeCreepMotionDiagnostics) activeCreepMotionDiagnostics.candidates += state.creeps.length
  if (state.creepStorageMode === 'soa' && state.creepComponents) {
    const updates = state.creepComponents.updateBuffer
    updates.length = state.creeps.length
    for (let creepIndex = 0; creepIndex < state.creeps.length; creepIndex += 1) {
      state.creepComponents.updateDirty[creepIndex] = 0
      let creep = state.creeps[creepIndex]
      if (getCreepComponentSlot(state.creepComponents, creep) === undefined) {
        appendCreepComponents(state.creepComponents, [creep])
      }
      const draft = getCreepUpdateDraft(state.creepComponents, creep)
      const movementDelta = fineStepEntityIds?.has(creep.id) ? fineStepDelta : delta
      let updated = creep
      if (!planned || !creep.motionPlan) {
        if (activeCreepMotionDiagnostics) activeCreepMotionDiagnostics.movementUpdates += 1
        updated = updateCreepMovement(creep, state, movementDelta, frameContext, draft)
      } else if (!shouldWakeCreepMotionPlan(creep, state, frameContext)) {
        if (activeCreepMotionDiagnostics) activeCreepMotionDiagnostics.sleepingSkips += 1
      } else {
        const materialized = materializeCreepMotionPlan(creep, state.time, true)
        state.creepComponents.updateDirty[creepIndex] = 1
        if (activeCreepMotionDiagnostics) activeCreepMotionDiagnostics.movementUpdates += 1
        updated = updateCreepMovement(materialized, state, 0, frameContext, draft)
      }
      updates[creepIndex] = updated
    }
    for (let creepIndex = 0; creepIndex < state.creeps.length; creepIndex += 1) {
      const current = state.creeps[creepIndex]
      const updated = updates[creepIndex]
      if (updated === current) {
        if (state.creepComponents.updateDirty[creepIndex]) {
          syncCreepPositionComponents(state.creepComponents, current)
        }
      } else {
        state.creeps[creepIndex] = replaceCreepComponentFacade(state.creepComponents, current, updated)
      }
    }
    updates.length = 0
    teamVisionProviderCache.delete(state)
    return state.creeps
  }
  if (!planned) return state.creeps.map((creep) => {
    if (activeCreepMotionDiagnostics) activeCreepMotionDiagnostics.movementUpdates += 1
    const movementDelta = fineStepEntityIds?.has(creep.id) ? fineStepDelta : delta
    return updateCreepMovement(creep, state, movementDelta, frameContext)
  })

  return state.creeps.map((creep) => {
    const movementDelta = fineStepEntityIds?.has(creep.id) ? fineStepDelta : delta
    if (!creep.motionPlan) {
      if (activeCreepMotionDiagnostics) activeCreepMotionDiagnostics.movementUpdates += 1
      return updateCreepMovement(creep, state, movementDelta, frameContext)
    }
    if (!shouldWakeCreepMotionPlan(creep, state, frameContext)) {
      if (activeCreepMotionDiagnostics) activeCreepMotionDiagnostics.sleepingSkips += 1
      return creep
    }
    const materialized = materializeCreepMotionPlan(creep, state.time, true)
    if (activeCreepMotionDiagnostics) activeCreepMotionDiagnostics.movementUpdates += 1
    return updateCreepMovement(materialized, state, 0, frameContext)
  })
}

export function canHoldCreepMotionTarget(target: CombatTarget) {
  return !('player' in target) && !('strength' in target) && !isBoss(target)
}

export function getCreepMotionWakeAt(
  creep: Creep,
  time: number,
  kind: CreepMotionPlan['kind'],
  spatialMode: CreepSpatialMode,
) {
  if (kind === 'route' && spatialMode === 'persistent') return time + 1.5
  const scheduledEvaluation = creep.nextRouteTargetEvaluationAt ?? time + creepTargetEvaluationIntervalSeconds
  return scheduledEvaluation > time + 0.0001
    ? Math.min(scheduledEvaluation, time + creepTargetEvaluationIntervalSeconds)
    : time + creepTargetEvaluationIntervalSeconds
}

export function updateCreepMovement(
  creep: Creep,
  state: SimulationState,
  delta: number,
  frameContext: TickFrameContext,
  draft?: Creep,
): Creep {
  const pullCamp = getActivePullCampForCreep(state, creep)
  if (pullCamp) {
    const moveTarget = getCreepMoveDestination(creep, pullCamp)
    const nextPos = moveToward(creep.pos, moveTarget, 4.2 * delta)
    return writeCreepMovementUpdate(creep, {
      pos: nextPos,
      pullCampId: pullCamp.id,
      routeTargetId: pullCamp.id,
      nextRouteTargetEvaluationAt: state.time + creepTargetEvaluationIntervalSeconds,
      pullUntil: creep.pullUntil && creep.pullUntil > state.time
        ? creep.pullUntil
        : state.time + lanePullDurationSeconds,
      motionPlan: undefined,
    }, draft)
  }
  if (creep.pullCampId || creep.pullUntil) {
    creep = writeCreepMovementUpdate(creep, {
      pathIndex: syncLanePathIndex(creep.pos, lanePaths[creep.team][creep.lane], creep.pathIndex),
      pullCampId: undefined,
      pullUntil: undefined,
      routeTargetId: undefined,
      nextRouteTargetEvaluationAt: state.time,
      motionPlan: undefined,
    }, draft)
  }

  const retainedTarget = creep.routeTargetId ? getCombatTargetById(state, creep.routeTargetId) : undefined
  const retainedAttackTarget = retainedTarget && isCreepRouteTargetValid(creep, retainedTarget, state, 'attack') ? retainedTarget : undefined
  const retainedVisionTarget = retainedTarget && isCreepRouteTargetValid(creep, retainedTarget, state, 'vision') ? retainedTarget : undefined
  const evaluationDue = state.time + 0.0001 >= (creep.nextRouteTargetEvaluationAt ?? state.time)
  let attackTarget = !evaluationDue ? retainedAttackTarget : undefined
  let visibleTarget = !evaluationDue ? retainedVisionTarget : undefined

  if (evaluationDue || (creep.routeTargetId && !retainedVisionTarget)) {
    attackTarget = getCachedRouteCreepTarget(creep, state, 'attack', frameContext)
    visibleTarget = attackTarget ?? getCachedRouteCreepTarget(creep, state, 'vision', frameContext)
    creep = writeCreepMovementUpdate(creep, {
      routeTargetId: (attackTarget ?? visibleTarget)?.id,
      nextRouteTargetEvaluationAt: state.time + creepTargetEvaluationIntervalSeconds,
    }, draft)
  } else {
    frameContext.routeCreepTargetCache.attack.set(creep.id, attackTarget ?? null)
    frameContext.routeCreepTargetCache.vision.set(creep.id, visibleTarget ?? null)
  }

  if (attackTarget) {
    if (state.creepMotionMode === 'planned' && canHoldCreepMotionTarget(attackTarget)) {
      return writeCreepMovementUpdate(creep, {
        motionPlan: scheduleCreepMotionPlan(
          creep.motionPlan,
          'hold',
          creep.pos,
          creep.pos,
          0,
          state.time,
          getCreepMotionWakeAt(creep, state.time, 'hold', state.creepSpatialMode),
        ),
      }, draft)
    }
    return creep.motionPlan ? writeCreepMovementUpdate(creep, { motionPlan: undefined }, draft) : creep
  }

  if (visibleTarget) {
    const moveTarget = getCreepMoveDestination(creep, visibleTarget)
    const nextPos = moveToward(creep.pos, moveTarget, 4.2 * delta)
    if (distanceSquared(nextPos, creep.pos) < 0.0001) {
      return creep.motionPlan ? writeCreepMovementUpdate(creep, { motionPlan: undefined }, draft) : creep
    }
    return writeCreepMovementUpdate(creep, { pos: nextPos, motionPlan: undefined }, draft)
  }

  const path = lanePaths[creep.team][creep.lane]
  let pathIndex = creep.pathIndex
  if (distance(creep.pos, formationPoint(path[pathIndex], creep.id)) < 1.8 && pathIndex < path.length - 1) {
    pathIndex += 1
  }
  const nextPos = moveToward(creep.pos, formationPoint(path[pathIndex], creep.id), 4.2 * delta)
  if (state.creepMotionMode === 'planned') {
    const destination = formationPoint(path[pathIndex], creep.id)
    return writeCreepMovementUpdate(creep, {
      pathIndex,
      pos: nextPos,
      motionPlan: scheduleCreepMotionPlan(
        creep.motionPlan,
        'route',
        nextPos,
        destination,
        4.2,
        state.time,
        getCreepMotionWakeAt(creep, state.time, 'route', state.creepSpatialMode),
      ),
    }, draft)
  }
  if (pathIndex === creep.pathIndex && distanceSquared(nextPos, creep.pos) < 0.0001) return creep
  return writeCreepMovementUpdate(creep, { pathIndex, pos: nextPos }, draft)
}

function writeCreepMovementUpdate(creep: Creep, changes: Partial<Creep>, draft?: Creep) {
  if (!draft) return { ...creep, ...changes }
  Object.assign(draft, creep, changes)
  return draft
}

export function getCachedRouteCreepTarget(creep: Creep, state: SimulationState, mode: RouteCreepTargetMode, frameContext: TickFrameContext) {
  const cache = frameContext.routeCreepTargetCache[mode]
  const cached = cache.get(creep.id)
  if (cached !== undefined) {
    return cached ?? undefined
  }
  const target = getRouteCreepTarget(creep, state, mode, frameContext)
  cache.set(creep.id, target ?? null)
  return target
}

export function getCachedAttackableEnemyTowers(state: SimulationState, team: TeamId, frameContext: TickFrameContext) {
  const cached = frameContext.attackableTowersCache[team]
  if (cached) return cached
  const towers = getAttackableEnemyTowers(state, team)
  frameContext.attackableTowersCache[team] = towers
  return towers
}

export function getCachedAttackableEnemyStructures(state: SimulationState, team: TeamId, frameContext: TickFrameContext) {
  const cached = frameContext.attackableStructuresCache[team]
  if (cached) return cached
  const structures = getAttackableEnemyStructures(state, team)
  frameContext.attackableStructuresCache[team] = structures
  return structures
}

export function isArcaneNearRouteCached(arcane: Arcane, path: Point[], frameContext: TickFrameContext) {
  let perPath = frameContext.arcaneNearRouteCache.get(path)
  if (!perPath) {
    perPath = new Map()
    frameContext.arcaneNearRouteCache.set(path, perPath)
  }
  const cached = perPath.get(arcane.id)
  if (cached !== undefined) return cached
  const result = isNearRoute(arcane.pos, path, 12)
  perPath.set(arcane.id, result)
  return result
}

export function getCachedRouteEnemyArcanes(
  state: SimulationState,
  creep: Creep,
  frameContext: TickFrameContext,
) {
  const key = `${creep.team}:${creep.lane}`
  const cache = frameContext.routeArcanesCache ??= new Map()
  const cached = cache.get(key)
  if (cached) return cached
  const path = lanePaths[creep.team][creep.lane]
  const arcanes = state.arcanes.filter((arcane) => (
    arcane.team !== creep.team &&
    arcane.stats.hp > 0 &&
    arcane.respawn <= state.time &&
    isArcaneNearRouteCached(arcane, path, frameContext)
  ))
  cache.set(key, arcanes)
  return arcanes
}

export function getCachedRouteObjectives(
  state: SimulationState,
  creep: Creep,
  frameContext: TickFrameContext,
) {
  const key = `${creep.team}:${creep.lane}`
  const cache = frameContext.routeObjectivesCache ??= new Map()
  const cached = cache.get(key)
  if (cached) return cached
  const objectives: Array<Tower | Structure | Base> = [
    ...getCachedAttackableEnemyTowers(state, creep.team, frameContext).filter((tower) => tower.lane === creep.lane),
    ...getCachedAttackableEnemyStructures(state, creep.team, frameContext).filter((structure) => structure.lane === creep.lane || structure.kind === 'tower_tier_4'),
    ...(isEnemyBaseUnlocked(state, creep.team) ? state.bases.filter((base) => base.team !== creep.team && base.hp > 0) : []),
  ]
  cache.set(key, objectives)
  return objectives
}

export function getRouteCreepTarget(
  creep: Creep,
  state: SimulationState,
  mode: RouteCreepTargetMode = 'attack',
  frameContext?: TickFrameContext,
  activationMargin = 0,
): CombatTarget | undefined {
  const structureRange = isMeleeCreep(creep) ? 3.2 : creep.range
  const visionRange = getCreepVisionRange(creep)
  const unitRange = (mode === 'attack' ? creep.range : visionRange) + activationMargin
  const objectiveRange = (mode === 'attack' ? structureRange : visionRange) + activationMargin
  const lanePath = lanePaths[creep.team][creep.lane]
  const isArcaneNearLane = (arcane: Arcane) => (
    frameContext
      ? isArcaneNearRouteCached(arcane, lanePath, frameContext)
      : isNearRoute(arcane.pos, lanePath, 12)
  )
  const selectTarget = <T extends CombatTarget>(entities: T[], range: number) => (
    mode === 'attack'
      ? nearestReachableByCreep(creep, entities, range)
      : nearest(creep.pos, entities, range)
  )
  const nearbyCreeps = queryCreepSpatialGridInto(
    state,
    creep.pos,
    unitRange + 2.5,
    frameContext?.creepSpatialQueryBuffer ?? [],
    frameContext?.creepSpatialIdBuffer ?? [],
  )
  const pullCamp = getActivePullCampForCreep(state, creep)
  if (pullCamp) {
    const pullTarget = selectTarget([pullCamp], unitRange)
    if (pullTarget) return pullTarget
  }
  const aggroArcane = creep.aggroUntil && creep.aggroUntil > state.time
    ? state.arcanes.find((arcane) => (
        arcane.id === creep.aggroTargetId &&
        arcane.stats.hp > 0 &&
        arcane.respawn <= state.time &&
        isArcaneNearLane(arcane)
      ))
    : undefined
  const aggroTarget = aggroArcane ? selectTarget([aggroArcane], unitRange) : undefined
  if (aggroTarget) return aggroTarget

  const enemyCreep = nearestRouteEnemyCreep(creep, nearbyCreeps, unitRange, mode)
  if (enemyCreep) return enemyCreep
  const enemySummon = selectTarget(state.summons.filter((summon) => (
    summon.team !== creep.team && summon.hp > 0 && summon.expiresAt > state.time &&
    isNearRoute(summon.pos, lanePath, 12)
  )), unitRange)
  if (enemySummon) return enemySummon

  const attackableTowers = frameContext
    ? getCachedAttackableEnemyTowers(state, creep.team, frameContext)
    : getAttackableEnemyTowers(state, creep.team)
  const attackableStructures = frameContext
    ? getCachedAttackableEnemyStructures(state, creep.team, frameContext)
    : getAttackableEnemyStructures(state, creep.team)

  const routeArcanes = frameContext
    ? getCachedRouteEnemyArcanes(state, creep, frameContext)
    : state.arcanes.filter((arcane) => (
        arcane.team !== creep.team &&
        arcane.stats.hp > 0 &&
        arcane.respawn <= state.time &&
        isArcaneNearLane(arcane)
      ))
  const routeObjectives = frameContext
    ? getCachedRouteObjectives(state, creep, frameContext)
    : [
        ...attackableTowers.filter((tower) => tower.lane === creep.lane),
        ...attackableStructures.filter((structure) => structure.lane === creep.lane || structure.kind === 'tower_tier_4'),
        ...(isEnemyBaseUnlocked(state, creep.team) ? state.bases.filter((base) => base.team !== creep.team && base.hp > 0) : []),
      ]

  return selectTarget(routeArcanes, unitRange) ?? selectTarget(routeObjectives, objectiveRange)
}

export function isCachedRouteCreepAttackTargetValid(creep: Creep, target: CombatTarget, state: SimulationState) {
  return isCreepRouteTargetValid(creep, target, state, 'attack')
}

export function isCreepRouteTargetValid(creep: Creep, target: CombatTarget, state: SimulationState, mode: RouteCreepTargetMode) {
  if ('team' in target && target.team === creep.team) return false
  if ('lane' in target && 'type' in target && target.lane !== creep.lane) return false
  if ('player' in target && (target.stats.hp <= 0 || target.respawn > state.time)) return false
  if ('ownerId' in target && (target.hp <= 0 || target.expiresAt <= state.time)) return false
  if ('type' in target && target.hp <= 0) return false
  if ('tier' in target && target.hp <= 0) return false
  if ('kind' in target && 'hp' in target && target.hp <= 0) return false
  if ('maxHp' in target && !('player' in target) && !('type' in target) && !('ownerId' in target) && !('tier' in target) && target.hp <= 0) return false
  if (isBoss(target)) return false
  if ('strength' in target && target.id !== creep.pullCampId) return false
  if (creep.aggroUntil && creep.aggroUntil > state.time && creep.aggroTargetId && target.id !== creep.aggroTargetId) return false
  if ('player' in target && !isNearRoute(target.pos, lanePaths[creep.team][creep.lane], 12)) return false
  if ('tier' in target && !isTowerUnlocked(state, creep.team, target as Tower)) return false
  if ('kind' in target && !isStructureUnlocked(state, creep.team, target as Structure)) return false
  if ('maxHp' in target && !('player' in target) && !('type' in target) && !('ownerId' in target) && !('tier' in target) && !('kind' in target) && !('strength' in target) && !isEnemyBaseUnlocked(state, creep.team)) return false

  if (mode === 'vision') {
    const visionRange = getCreepVisionRange(creep)
    return distanceSquared(creep.pos, target.pos) <= visionRange * visionRange
  }

  const attackRange = isStructureLikeTarget(target)
    ? isMeleeCreep(creep) ? 3.2 : creep.range
    : creep.range
  const reach = getCreepAttackCenterRange(creep, target, attackRange)
  return distanceSquared(creep.pos, target.pos) <= reach * reach
}

export function getCreepMoveDestination(creep: Creep, target: { pos: Point }) {
  const attackRange = isStructureLikeTarget(target)
    ? isMeleeCreep(creep) ? 3.2 : creep.range
    : creep.range
  const holdRange = getCreepAttackCenterRange(creep, target, attackRange) * 0.94
  if (distance(creep.pos, target.pos) <= holdRange) return creep.pos
  return getAttackApproachPoint(creep.pos, target, attackRange, getEntityCollisionRadius(creep))
}

export function nearestReachableByCreep<T extends { pos: Point }>(creep: Creep, entities: T[], attackRange: number): T | undefined {
  let closest: T | undefined
  let closestDistanceSquared = Number.POSITIVE_INFINITY

  for (const entity of entities) {
    const entityDistanceSquared = distanceSquared(creep.pos, entity.pos)
    const reach = getCreepAttackCenterRange(creep, entity, attackRange)
    if (entityDistanceSquared > closestDistanceSquared || entityDistanceSquared > reach * reach) continue
    closest = entity
    closestDistanceSquared = entityDistanceSquared
  }

  return closest
}

export function getCreepAttackCenterRange(creep: Creep, target: { pos: Point }, attackRange = creep.range) {
  return attackRange + getEntityCollisionRadius(creep) + getEntityCollisionRadius(target) * 0.8
}

export function isStructureLikeTarget(target: { pos: Point }) {
  return 'tier' in target || 'kind' in target || ('maxHp' in target && !('type' in target) && !('player' in target))
}

export type UnitHitboxBody = {
  id: string
  index: number
  pos: Point
  radius: number
  movable: boolean
  mass: number
}

export const unitHitboxGridSize = 4
export const proximityGridCellSize = 10
export const maxHitboxResolutionPasses = 2
export const unitHitboxBodyBuffer: UnitHitboxBody[] = []
const unitHitboxBodyPool: UnitHitboxBody[] = []
const unitHitboxGridBuffer = new Map<number, UnitHitboxBody[]>()
const unitHitboxGridCellPool: UnitHitboxBody[][] = []

function appendUnitHitboxBody(
  bodies: UnitHitboxBody[],
  id: string,
  pos: Point,
  radius: number,
  movable: boolean,
  mass: number,
) {
  const index = bodies.length
  let body = unitHitboxBodyPool[index]
  if (body) {
    body.id = id
    body.index = index
    body.pos = pos
    body.radius = radius
    body.movable = movable
    body.mass = mass
  } else {
    body = { id, index, pos, radius, movable, mass }
    unitHitboxBodyPool.push(body)
  }
  bodies.push(body)
}

export function resolveUnitHitboxes(state: SimulationState) {
  const bodies = unitHitboxBodyBuffer
  bodies.length = 0

  for (const arcane of state.arcanes) {
    if (arcane.stats.hp <= 0 || arcane.respawn > state.time) continue
    appendUnitHitboxBody(bodies, arcane.id, arcane.pos, getUnitHitboxRadius(arcane), true, 1.25)
  }

  for (const creep of state.creeps) {
    if (creep.hp <= 0) continue
    appendUnitHitboxBody(bodies, creep.id, creep.pos, getUnitHitboxRadius(creep), true, creep.type === 'siege' ? 1.1 : 0.72)
  }

  if (state.boss.hp > 0 && state.boss.respawn <= state.time) {
    appendUnitHitboxBody(bodies, state.boss.id, state.boss.pos, getUnitHitboxRadius(state.boss), true, 2.5)
  }

  for (const camp of state.camps) {
    if (camp.hp <= 0) continue
    appendUnitHitboxBody(bodies, camp.id, camp.pos, getUnitHitboxRadius(camp), false, 99)
  }

  if (bodies.length < 2) return

  for (let pass = 0; pass < maxHitboxResolutionPasses; pass += 1) {
    const grid = buildBufferedUnitHitboxGrid(bodies)

    for (const body of bodies) {
      const gridX = Math.floor(body.pos.x / unitHitboxGridSize)
      const gridY = Math.floor(body.pos.y / unitHitboxGridSize)
      for (let y = gridY - 1; y <= gridY + 1; y += 1) {
        for (let x = gridX - 1; x <= gridX + 1; x += 1) {
          const cell = grid.get(getUnitHitboxGridKey(x, y))
          if (!cell) continue
          for (const other of cell) {
            // Cada corpo vive numa única célula, então o par (a, b) aparece uma
            // única vez na varredura de vizinhança de cada lado; processar só
            // quando other vem depois no buffer resolve cada par exatamente uma vez.
            if (other.index <= body.index) continue
            separateUnitHitboxes(body, other)
          }
        }
      }
    }
  }

  for (const body of bodies) {
    if (!body.movable) continue
    const bounded = clampToMapBounds(body.pos)
    body.pos.x = bounded.x
    body.pos.y = bounded.y
  }
}

function buildBufferedUnitHitboxGrid(bodies: UnitHitboxBody[]) {
  unitHitboxGridBuffer.clear()
  let usedCells = 0
  for (const body of bodies) {
    const key = getUnitHitboxGridKey(
      Math.floor(body.pos.x / unitHitboxGridSize),
      Math.floor(body.pos.y / unitHitboxGridSize),
    )
    const existing = unitHitboxGridBuffer.get(key)
    if (existing) {
      existing.push(body)
      continue
    }
    let cell = unitHitboxGridCellPool[usedCells]
    if (cell) cell.length = 0
    else {
      cell = []
      unitHitboxGridCellPool.push(cell)
    }
    usedCells += 1
    cell.push(body)
    unitHitboxGridBuffer.set(key, cell)
  }
  return unitHitboxGridBuffer
}

export function buildUnitHitboxGrid(bodies: UnitHitboxBody[]) {
  const grid = new Map<number, UnitHitboxBody[]>()
  for (const body of bodies) {
    const x = Math.floor(body.pos.x / unitHitboxGridSize)
    const y = Math.floor(body.pos.y / unitHitboxGridSize)
    const key = getUnitHitboxGridKey(x, y)
    const cell = grid.get(key)
    if (cell) {
      cell.push(body)
    } else {
      grid.set(key, [body])
    }
  }
  return grid
}

export function getUnitHitboxGridKey(x: number, y: number) {
  return x * 128 + y
}

export function separateUnitHitboxes(a: UnitHitboxBody, b: UnitHitboxBody) {
  if (!a.movable && !b.movable) return

  const minDistance = a.radius + b.radius
  const dx = b.pos.x - a.pos.x
  const dy = b.pos.y - a.pos.y
  const distanceSq = dx * dx + dy * dy
  if (distanceSq >= minDistance * minDistance) return

  const currentDistance = Math.sqrt(Math.max(0.0001, distanceSq))
  const overlap = minDistance - currentDistance
  const nx = dx / currentDistance
  const ny = dy / currentDistance
  const aShare = a.movable && b.movable ? b.mass / (a.mass + b.mass) : a.movable ? 1 : 0
  const bShare = a.movable && b.movable ? a.mass / (a.mass + b.mass) : b.movable ? 1 : 0
  const push = overlap * 0.72

  if (a.movable) {
    a.pos.x -= nx * push * aShare
    a.pos.y -= ny * push * aShare
  }
  if (b.movable) {
    b.pos.x += nx * push * bShare
    b.pos.y += ny * push * bShare
  }
}

export function getUnitHitboxRadius(entity: Arcane | Creep | Camp | Boss) {
  if ('player' in entity) return 1.25
  if ('type' in entity) {
    if (entity.type === 'siege') return 0.72
    if (entity.type === 'mage' || entity.type === 'flagbearer') return 0.62
    return 0.56
  }
  if ('strength' in entity) {
    const stackBonus = entity.stackCount * 0.12
    if (entity.strength === 'strong') return 1.04 + stackBonus
    if (entity.strength === 'medium') return 0.9 + stackBonus
    return 0.78 + stackBonus
  }
  return 1.75
}

export function isArcaneSilenced(state: SimulationState, arcane: Arcane) {
  return hasTimedEffect(state, arcane.id, 'silence') || hasTimedEffect(state, arcane.id, 'hex') || hasTimedEffect(state, arcane.id, 'sleep')
}

export function hasAnyCastableSkill(
  state: SimulationState,
  arcane: Arcane,
  skills = getArcaneRuntimeSkills(arcane),
) {
  if (isArcaneSilenced(state, arcane)) return false

  for (const skill of skills) {
    if (skill.kind === 'passive') continue
    const level = getSimpleSkillLevel(arcane, skill)
    if (level <= 0) continue
    if (arcane.stats.mana < getSimpleSkillManaCost(arcane, skill, level)) continue
    if ((arcane.itemCooldowns[skill.id] ?? 0) > state.time) continue
    return true
  }

  return false
}

export function tryCastSimpleSkill(
  state: SimulationState,
  arcane: Arcane,
  fallbackTarget: CombatTarget | undefined,
  skills = getArcaneRuntimeSkills(arcane),
) {
  if (isArcaneSilenced(state, arcane)) return false

  const situation = getPrimarySkillUsageSituation({
    phase: getGamePhase(state.time),
    aiMode: arcane.aiMode,
    macroDecision: arcane.macroDecision,
    hpRatio: arcane.stats.hp / Math.max(1, arcane.stats.maxHp),
  })
  const usableSkills = skills
    .filter((skill) => skill.kind !== 'passive')
    .map((skill) => ({ skill, level: getSimpleSkillLevel(arcane, skill) }))
    .filter(({ skill, level }) => level > 0 && arcane.stats.mana >= getSimpleSkillManaCost(arcane, skill, level) && (arcane.itemCooldowns[skill.id] ?? 0) <= state.time)
    .sort((a, b) => (
      getSimpleSkillPriority(b.skill) + getSkillAiUsageScore(b.skill, situation) * 0.45
    ) - (
      getSimpleSkillPriority(a.skill) + getSkillAiUsageScore(a.skill, situation) * 0.45
    ))

  for (const { skill, level } of usableSkills) {
    const previousCooldown = arcane.itemCooldowns[skill.id]
    const cooldownUntil = state.time + getSimpleSkillCooldown(skill, level)
    setArcaneSkillCooldown(state, arcane, skill.id, cooldownUntil)
    if (castSimpleSkill(state, arcane, skill, level, fallbackTarget)) {
      setArcaneSkillCooldown(state, arcane, skill.id, cooldownUntil)
      return true
    }
    restoreArcaneSkillCooldown(state, arcane, skill.id, previousCooldown)
  }

  return false
}

export function getRangedCreepSkillSecureTarget(state: SimulationState, arcane: Arcane, creeps: Creep[]) {
  if (state.time > 12 * 60 || arcane.role.includes('Support')) return undefined
  const timingValue = arcane.stats.level <= 6 || getLevelProgress(arcane.stats.xp) >= 0.72
  if (!timingValue) return undefined
  const skills = getArcaneRuntimeSkills(arcane)
  const availableDamageSkills = skills
    .filter((skill) => skill.kind !== 'passive' && !isUltimateSkill(skill) && !isPositiveSimpleSkill(skill))
    .map((skill) => ({ skill, level: getSimpleSkillLevel(arcane, skill) }))
    .filter(({ skill, level }) => (
      level > 0 &&
      getSimpleSkillDamage(arcane, skill, level) > 0 &&
      arcane.stats.mana >= getSimpleSkillManaCost(arcane, skill, level) &&
      (arcane.itemCooldowns[skill.id] ?? 0) <= state.time
    ))
  if (availableDamageSkills.length === 0) return undefined

  return creeps
    .filter((creep) => (
      creep.type === 'mage' &&
      creep.team !== arcane.team &&
      creep.lane === arcane.lane &&
      creep.hp > 0 &&
      canArcaneClaimFarmAt(state, arcane, creep.pos) &&
      availableDamageSkills.some(({ skill, level }) => {
        const manaCost = getSimpleSkillManaCost(arcane, skill, level)
        const manaReserve = arcane.stats.maxMana * (arcane.role === 'Mid' ? 0.18 : 0.26)
        return arcane.stats.mana - manaCost >= manaReserve &&
          getSimpleSkillDamage(arcane, skill, level) >= creep.hp &&
          canTargetWithSimpleDamageSkill(arcane, skill, creep) &&
          distance(arcane.pos, creep.pos) <= getSimpleSkillRange(arcane, skill, level) + getEntityCollisionRadius(creep)
      })
    ))
    .sort((left, right) => left.hp - right.hp || distance(arcane.pos, left.pos) - distance(arcane.pos, right.pos))[0]
}

export function tryCastRangedCreepSecureSkill(state: SimulationState, arcane: Arcane, target: Creep) {
  if (target.type !== 'mage' || target.team === arcane.team || isArcaneSilenced(state, arcane)) return false
  const skills = getArcaneRuntimeSkills(arcane)
    .filter((skill) => skill.kind !== 'passive' && !isUltimateSkill(skill) && !isPositiveSimpleSkill(skill))
    .map((skill) => ({ skill, level: getSimpleSkillLevel(arcane, skill) }))
    .filter(({ skill, level }) => {
      if (level <= 0 || (arcane.itemCooldowns[skill.id] ?? 0) > state.time) return false
      const manaCost = getSimpleSkillManaCost(arcane, skill, level)
      const manaReserve = arcane.stats.maxMana * (arcane.role === 'Mid' ? 0.18 : 0.26)
      return arcane.stats.mana - manaCost >= manaReserve &&
        getSimpleSkillDamage(arcane, skill, level) >= target.hp &&
        canTargetWithSimpleDamageSkill(arcane, skill, target) &&
        distance(arcane.pos, target.pos) <= getSimpleSkillRange(arcane, skill, level) + getEntityCollisionRadius(target)
    })
    .sort((left, right) => (
      getSimpleSkillManaCost(arcane, left.skill, left.level) - getSimpleSkillManaCost(arcane, right.skill, right.level) ||
      getSimpleSkillCooldown(left.skill, left.level) - getSimpleSkillCooldown(right.skill, right.level)
    ))

  for (const { skill, level } of skills) {
    const previousCooldown = arcane.itemCooldowns[skill.id]
    const cooldownUntil = state.time + getSimpleSkillCooldown(skill, level)
    setArcaneSkillCooldown(state, arcane, skill.id, cooldownUntil)
    if (castSimpleSkill(state, arcane, skill, level, target, true)) return true
    restoreArcaneSkillCooldown(state, arcane, skill.id, previousCooldown)
  }
  return false
}

export function setArcaneSkillCooldown(state: SimulationState, arcane: Arcane, skillId: string, cooldownUntil: number) {
  const liveArcane = state.arcanes.find((candidate) => candidate.id === arcane.id) ?? arcane
  liveArcane.itemCooldowns = {
    ...liveArcane.itemCooldowns,
    [skillId]: cooldownUntil,
  }
  if (liveArcane !== arcane) arcane.itemCooldowns = liveArcane.itemCooldowns
}

export function restoreArcaneSkillCooldown(state: SimulationState, arcane: Arcane, skillId: string, previousCooldown: number | undefined) {
  const liveArcane = state.arcanes.find((candidate) => candidate.id === arcane.id) ?? arcane
  const cooldowns = { ...liveArcane.itemCooldowns }
  if (previousCooldown === undefined) delete cooldowns[skillId]
  else cooldowns[skillId] = previousCooldown
  liveArcane.itemCooldowns = cooldowns
  if (liveArcane !== arcane) arcane.itemCooldowns = cooldowns
}

export function getSimpleSkillLevel(arcane: Arcane, skill: HeroSkillDefinition) {
  if (skill.category === 'innate') {
    return Math.min(skill.maxLevel ?? 1, Math.max(1, Math.floor((arcane.stats.level + 4) / 5)))
  }
  if (skill.category === 'scepter_granted' || skill.category === 'shard_granted') {
    const unlocked = getArcaneRuntimeSkills(arcane).some((candidate) => candidate.id === skill.id)
    return unlocked ? getGrantedSkillLevel(skill, arcane.stats.level) : 0
  }
  if (skill.category === 'standard' && skill.learnable === false) {
    const rule = getSkillRuntimeUnlockRule(skill, 'supplemental')
    if (rule !== 'unsupported_contextual') {
      const unlocked = getArcaneRuntimeSkills(arcane).some((candidate) => candidate.id === skill.id)
      return unlocked ? getContextualSkillLevel(skill, arcane.skillLevels) : 0
    }
  }
  return arcane.skillLevels[skill.key] ?? 0
}

export function getAvailableSkillPointsForLevel(level: number) {
  return Math.max(0, Math.min(30, level))
}

export function getMaxSkillLevelAllowed(skill: HeroSkillDefinition, heroLevel: number) {
  if (skill.category === 'innate' || skill.learnable === false) return 0
  const maxLevel = skill.maxLevel ?? (isUltimateSkill(skill) ? 3 : 4)
  if (isUltimateSkill(skill)) {
    if (heroLevel >= 18) return Math.min(maxLevel, 3)
    if (heroLevel >= 12) return Math.min(maxLevel, 2)
    if (heroLevel >= 6) return Math.min(maxLevel, 1)
    return 0
  }

  return Math.min(maxLevel, Math.ceil(heroLevel / 2))
}

export function isUltimateSkill(skill: HeroSkillDefinition) {
  return skill.key === 'R' || (skill.category === 'standard' && skill.maxLevel === 3)
}

export function getSpentSkillPoints(arcane: Pick<Arcane, 'skillLevels' | 'statBonusLevels'>) {
  return Object.values(arcane.skillLevels).reduce<number>((total, level) => total + (level ?? 0), 0) + arcane.statBonusLevels
}

export function allocateArcaneSkillPoints(arcane: Arcane): Arcane {
  const definition = getHeroDefinition(arcane.heroDefinitionId)
  const skills = definition.skills ?? []
  if (skills.length === 0) return arcane

  let nextArcane = {
    ...arcane,
    skillLevels: { ...arcane.skillLevels },
    unspentSkillPoints: Math.max(0, getAvailableSkillPointsForLevel(arcane.stats.level) - getSpentSkillPoints(arcane)),
  }

  while (nextArcane.unspentSkillPoints > 0) {
    const candidate = getBestSkillPointAllocation(nextArcane, skills)
    if (!candidate) {
      nextArcane = {
        ...nextArcane,
        statBonusLevels: nextArcane.statBonusLevels + 1,
        unspentSkillPoints: nextArcane.unspentSkillPoints - 1,
      }
      continue
    }

    nextArcane = {
      ...nextArcane,
      skillLevels: {
        ...nextArcane.skillLevels,
        [candidate.key]: (nextArcane.skillLevels[candidate.key] ?? 0) + 1,
      },
      unspentSkillPoints: nextArcane.unspentSkillPoints - 1,
    }
  }

  return nextArcane
}

export function getBestSkillPointAllocation(arcane: Arcane, skills: HeroSkillDefinition[]) {
  const candidates = skills
    .filter((skill) => canLevelSimpleSkill(arcane, skill))
    .map((skill) => ({ skill, score: getSkillLevelUpScore(arcane, skill) }))
    .sort((a, b) => b.score - a.score)
  const bestSkill = candidates[0]
  if (!bestSkill) return undefined

  if (shouldPreferStatBonusOverSkill(arcane, bestSkill.score)) return undefined
  return bestSkill.skill
}

export function canLevelSimpleSkill(arcane: Arcane, skill: HeroSkillDefinition) {
  const currentLevel = arcane.skillLevels[skill.key] ?? 0
  return currentLevel < getMaxSkillLevelAllowed(skill, arcane.stats.level)
}

export function getSkillLevelUpScore(arcane: Arcane, skill: HeroSkillDefinition) {
  const currentLevel = arcane.skillLevels[skill.key] ?? 0
  const tags = new Set(skill.tags)
  const role = arcane.role
  const isSupport = role.includes('Support')
  const isCore = role === 'Safe Lane' || role === 'Mid'
  const controlScore = ['stun', 'disable', 'silence', 'slow', 'taunt'].some((tag) => tags.has(tag)) ? (isSupport || role === 'Offlane' ? 20 : 13) : 0
  const sustainScore = ['heal', 'healer', 'regen', 'shield', 'barrier', 'spell_parry'].some((tag) => tags.has(tag)) ? (isSupport ? 22 : 9) : 0
  const damageScore = skill.damageType !== 'none' || getSimpleSkillNumericValue(skill, 'damage', currentLevel + 1, 0) > 0 ? (isCore || role === 'Greedy Support' ? 18 : 11) : 0
  const mobilityScore = ['mobility', 'escape', 'haste'].some((tag) => tags.has(tag)) ? (role === 'Safe Lane' || role === 'Mid' ? 13 : 8) : 0
  const ultimateScore = isUltimateSkill(skill) ? 34 : 0
  const levelCurveScore = currentLevel === 0 ? 16 : 10 - currentLevel * 1.5
  const laningNeedScore = arcane.stats.level <= 5 && !isUltimateSkill(skill) ? 9 : 0

  return ultimateScore + controlScore + sustainScore + damageScore + mobilityScore + levelCurveScore + laningNeedScore
}

export function shouldPreferStatBonusOverSkill(arcane: Arcane, bestSkillScore: number) {
  if (arcane.stats.level < 10) return false
  return bestSkillScore < getStatBonusLevelUpScore(arcane)
}

export function getStatBonusLevelUpScore(arcane: Arcane) {
  const lateBonus = arcane.stats.level >= 12 ? 8 : 0
  const roleBonus = arcane.role === 'Safe Lane' ? 8 : arcane.role === 'Offlane' ? 6 : 3
  return 24 + roleBonus + lateBonus + arcane.statBonusLevels * 2
}

export function getSimpleSkillPriority(skill: HeroSkillDefinition) {
  const tags = new Set(skill.tags)
  const stanceScore = tags.has('stance_switch') ? 80 : 0
  const controlScore = ['stun', 'disable', 'silence', 'slow', 'taunt'].some((tag) => tags.has(tag)) ? 16 : 0
  const sustainScore = ['heal', 'healer', 'regen', 'shield', 'barrier', 'spell_parry'].some((tag) => tags.has(tag)) ? 12 : 0
  const damageScore = skill.damageType !== 'none' || getSimpleSkillNumericValue(skill, 'damage', 1, 0) > 0 ? 10 : 0
  const ultimateScore = isUltimateSkill(skill) ? 20 : 0
  return stanceScore + ultimateScore + controlScore + sustainScore + damageScore
}

export function getSimpleSkillCooldown(skill: HeroSkillDefinition, level: number) {
  const fallback = isUltimateSkill(skill) ? 70 : 13
  return Math.max(2.5, getSimpleSkillNumericValue(skill, 'cooldown', level, fallback))
}

export function getSimpleSkillManaCost(arcane: Arcane, skill: HeroSkillDefinition, level: number) {
  const explicitCost = getSimpleSkillNumericValue(skill, 'manaCost', level, Number.NaN)
  if (Number.isFinite(explicitCost)) return explicitCost

  const roleDiscount = arcane.role.includes('Support') ? 0.92 : arcane.role === 'Mid' ? 0.96 : 1
  const baseCost = isUltimateSkill(skill)
    ? 140 + level * 45
    : 48 + level * 18 + (skill.damageType === 'none' ? 8 : 0)
  const maxManaGuard = Math.max(28, arcane.stats.maxMana * (isUltimateSkill(skill) ? 0.32 : 0.18))
  return Math.round(Math.min(baseCost * roleDiscount, maxManaGuard))
}

export function getSimpleSkillRange(arcane: Arcane, skill: HeroSkillDefinition, level: number) {
  if (skill.target === 'self' || skill.target === 'passive') return 0
  if (isConfirmedGlobalSkill(skill)) return 200
  const importedRange = getSimpleSkillNumericValue(skill, 'range', level, 620)
  const minimumRange = arcane.stats.attackType === 'ranged' ? 3.4 : 2.65

  return Math.max(
    minimumRange,
    convertImportedSkillRange(importedRange),
  )
}

export function convertImportedSkillRange(range: number) {
  return Math.max(1.8, Math.min(7.2, range / 140))
}

export function getSimpleSkillNumericValue(skill: HeroSkillDefinition, key: string, level: number, fallback: number) {
  const value = skill.values[key]
  if (Array.isArray(value)) {
    const picked = value[Math.max(0, Math.min(value.length - 1, level - 1))]
    return typeof picked === 'number' && Number.isFinite(picked) ? picked : fallback
  }
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

export function castSimpleSkill(
  state: SimulationState,
  arcane: Arcane,
  skill: HeroSkillDefinition,
  level: number,
  fallbackTarget: CombatTarget | undefined,
  preferFallbackTarget = false,
) {
  if (ringmasterSouvenirAbilityIds.includes(skill.sourceAbilityId as typeof ringmasterSouvenirAbilityIds[number])) {
    return castRingmasterSouvenirSkill(state, arcane, skill, level, fallbackTarget)
  }
  if (skill.sourceAbilityId === 1497) return castTwinBladeStanceSwitch(state, arcane, skill, level)
  if (skill.sourceAbilityId === 5607) return castStoredRemnantSkill(state, arcane, skill, level, fallbackTarget)
  if (isConfirmedGlobalSkill(skill) && !shouldCastGlobalSkill(state, arcane, skill)) return false
  const profile = getSkillEffectProfile(skill, level)
  const target = profile.summonMode === 'on_attack'
    ? fallbackTarget ? arcane : undefined
    : getSimpleSkillTarget(state, arcane, skill, level, fallbackTarget, preferFallbackTarget)
  if (!target) return false
  if ('player' in target && target.team !== arcane.team && !shouldCommitOffensiveSkill(state, arcane, target, skill)) {
    return false
  }
  const manaCost = getSimpleSkillManaCost(arcane, skill, level)
  if (arcane.stats.mana < manaCost) return false
  if (!canCommitCoordinatedSkill(state, arcane, skill, level, target, profile)) return false
  if (isSimpleSkillChanneled(skill)) {
    return startSimpleSkillChannel(state, arcane, skill, level, target, profile, manaCost)
  }
  return resolveSimpleSkillEffects(state, arcane, skill, level, target, profile)
}

export function isSimpleSkillChanneled(skill: HeroSkillDefinition) {
  return hasAnySimpleSkillTag(skill, ['channel', 'aoe_channel', 'channel_disable']) ||
    getSimpleSkillNumericValue(skill, 'channelTime', 1, 0) > 0
}

export function getSimpleSkillChannelDuration(skill: HeroSkillDefinition, level: number) {
  return Math.max(0.1, getSimpleSkillNumericValue(skill, 'channelTime', level, 0))
}

export function startSimpleSkillChannel(
  state: SimulationState,
  arcane: Arcane,
  skill: HeroSkillDefinition,
  level: number,
  target: CombatTarget,
  profile = getSkillEffectProfile(skill, level),
  manaCost = getSimpleSkillManaCost(arcane, skill, level),
) {
  const channelDuration = getSimpleSkillChannelDuration(skill, level)
  if (channelDuration <= 0 || arcane.channeling) return false

  finishSimpleSkillCast(state, arcane, skill, manaCost, target)
  registerCombatSkillReservation(state, arcane, skill, level, target, profile, channelDuration)
  const liveArcane = state.arcanes.find((candidate) => candidate.id === arcane.id) ?? arcane
  liveArcane.channeling = {
    kind: 'skill',
    target: { ...target.pos },
    startedAt: state.time,
    completesAt: state.time + channelDuration,
    label: skill.name,
    effectLabel: `${skill.name} concluida`,
    skillId: skill.id,
    skillLevel: level,
    targetId: target.id,
  }
  liveArcane.macroDecision = getChannelMacroDecision(liveArcane.channeling)
  liveArcane.microDecision = `Canalizando ${skill.name} ${Math.ceil(channelDuration)}s`
  liveArcane.aiReason = 'skill_channel'
  liveArcane.decision = liveArcane.microDecision
  liveArcane.forceDecision = false
  liveArcane.nextDecisionAt = Math.max(liveArcane.nextDecisionAt, liveArcane.channeling.completesAt)
  if (profile.summonMode === 'channel' && profile.summonCount > 0) {
    applySimpleSkillSummonPressure(state, liveArcane, skill, profile, target.pos)
  }
  if (liveArcane !== arcane) {
    arcane.stats = liveArcane.stats
    arcane.channeling = liveArcane.channeling
    arcane.itemCooldowns = liveArcane.itemCooldowns
    arcane.skillStates = liveArcane.skillStates
  }
  return true
}

export function resolveSimpleSkillEffects(
  state: SimulationState,
  arcane: Arcane,
  skill: HeroSkillDefinition,
  level: number,
  target: CombatTarget,
  profile = getSkillEffectProfile(skill, level),
  commitCast = true,
  centerOverride?: Point,
) {
  const manaCost = getSimpleSkillManaCost(arcane, skill, level)
  const affectedTargets = getSimpleSkillAffectedTargets(state, arcane, skill, profile, target, centerOverride)

  const source: CombatSource = {
    id: `${arcane.id}-${skill.id}`,
    label: `${arcane.player}: ${skill.name}`,
    team: arcane.team,
    damageType: getSimpleSkillDamageType(skill),
  }

  if (profile.summonMode === 'on_attack' && profile.summonCount > 0) {
    addTimedEffect(state, arcane, {
      sourceId: source.id,
      sourceName: skill.name,
      sourceTeam: arcane.team,
      kind: 'buff',
      polarity: 'positive',
      value: 1,
      modifiers: {
        damagePct: Math.min(0.35, profile.damage / 100),
        moveSpeedPct: Math.min(0.25, getSimpleSkillNumericValue(skill, 'movement_bonus', level, 0) / 100),
      },
      duration: profile.duration,
    })
    addSimpleSkillEffect(state, arcane, arcane)
    if (commitCast) {
      finishSimpleSkillCast(state, arcane, skill, manaCost, arcane)
      registerCombatSkillReservation(state, arcane, skill, level, arcane, profile)
    }
    return true
  }

  const linkedSummonResolution = resolveLinkedSummonSkillEffects(
    state,
    arcane,
    skill,
    level,
    target,
    profile,
    manaCost,
    commitCast,
  )
  if (linkedSummonResolution !== undefined) return linkedSummonResolution

  if (isPositiveSimpleSkill(skill)) {
    const alliedTargets = affectedTargets.filter((candidate): candidate is Arcane => 'player' in candidate && candidate.team === arcane.team)
    if (alliedTargets.length === 0) return false
    alliedTargets.forEach((ally) => applySimplePositiveSkill(state, arcane, skill, level, ally))
    applySimpleSkillMobility(state, arcane, target, skill, profile)
    applySimpleSkillSummonPressure(state, arcane, skill, profile, target.pos)
    addSimpleSkillEffect(state, arcane, target)
    if (commitCast) {
      finishSimpleSkillCast(state, arcane, skill, manaCost, target)
      registerCombatSkillReservation(state, arcane, skill, level, target, profile)
    }
    return true
  }

  const damage = getSimpleSkillDamage(arcane, skill, level)
  affectedTargets.forEach((affectedTarget) => {
    const expectedCritMultiplier = skill.flags?.canCrit && profile.critChance > 0
      ? 1 + profile.critChance * (profile.critMultiplier - 1)
      : 1
    const executeMultiplier = 'player' in affectedTarget && hasAnySimpleSkillTag(skill, ['execute'])
      ? getSimpleSkillExecuteMultiplier(affectedTarget, level)
      : 1
    const globalDamageScale = profile.isGlobal ? (isUltimateSkill(skill) ? 0.55 : 0.3) : 1
    const directDamage = (profile.isDamageOverTime ? damage * 0.35 : damage) * expectedCritMultiplier * executeMultiplier * globalDamageScale
    if (directDamage > 0 && skill.damageType !== 'none') {
      if ('player' in affectedTarget && affectedTarget.team !== arcane.team) {
        applyTowerAggro(state, affectedTarget.team, arcane.id)
        applyCreepAggro(state, affectedTarget.team, arcane.id)
      }
      damageEntity(state, affectedTarget.id, directDamage, source)
      if (skill.flags?.canSpellLifesteal && 'player' in affectedTarget) {
        const healing = directDamage * 0.1
        arcane.stats.hp = Math.min(arcane.stats.maxHp, arcane.stats.hp + healing)
        arcane.healingDone += healing
        arcane.healingReceived += healing
      }
    }

    if ('player' in affectedTarget && affectedTarget.team !== arcane.team) {
      applySimpleNegativeSkillEffects(state, arcane, skill, level, affectedTarget)
      applySimpleSkillManaEffect(state, arcane, affectedTarget, profile)
      applySimpleSkillDispel(state, skill, affectedTarget, 'positive')
      if (profile.isDamageOverTime && damage > 0) {
        addTimedEffect(state, affectedTarget, {
          sourceId: source.id,
          sourceName: source.label,
          sourceTeam: source.team,
          kind: 'dot',
          polarity: 'negative',
          value: (damage * 0.65 * genericHeroSkillDamageMultiplier) / Math.max(1, profile.duration),
          damageType: getSimpleSkillDamageType(skill),
          tickInterval: 1,
          duration: profile.duration,
        })
      }
    }
    markConditionalSummonDeathTarget(state, arcane, skill, profile, affectedTarget)
  })

  applySimpleSkillMobility(state, arcane, target, skill, profile)
  applySimpleSkillSummonPressure(state, arcane, skill, profile, target.pos)

  if (isBoss(target)) {
    state.boss = {
      ...state.boss,
      aggroTargetId: arcane.id,
      aggroUntil: state.time + 6,
    }
  }

  addSimpleSkillEffect(state, arcane, target)
  const casted = damage > 0 || affectedTargets.some((candidate) => 'player' in candidate && hasSimpleStatusTag(skill)) || profile.manaDelta !== 0 || profile.isMobility || profile.summonCount > 0 || hasAnySimpleSkillTag(skill, ['purge', 'dispel']) || isParentSkillStateCreator(skill)
  if (casted && commitCast) {
    finishSimpleSkillCast(state, arcane, skill, manaCost, target)
    registerCombatSkillReservation(state, arcane, skill, level, target, profile)
  }
  return casted
}

export function canCommitCoordinatedSkill(
  state: SimulationState,
  arcane: Arcane,
  skill: HeroSkillDefinition,
  level: number,
  target: CombatTarget,
  profile = getSkillEffectProfile(skill, level),
) {
  if (!('player' in target)) return true
  const board = getArcaneCombatBlackboard(state, arcane)
  if (!board) return true
  const sourceId = `${arcane.id}-${skill.id}`
  const honorsReservations = honorsCombatReservations(state, arcane, skill.id, target.id)
  if (target.team === arcane.team) {
    const isSave = isSimpleHealingSkill(skill) || profile.isSave || profile.barrier > 0 || hasAnySimpleSkillTag(skill, ['save', 'shield', 'barrier', 'cleanse', 'dispel'])
    return !isSave || !honorsReservations || canReserveSave(
      (board.saveReservations ?? []).filter((reservation) => reservation.sourceId !== sourceId),
      target.id,
      state.time,
      target.stats.hp / Math.max(1, target.stats.maxHp),
    )
  }

  const controlDuration = getSimpleSkillControlDuration(skill, profile)
  if (controlDuration > 0 && honorsReservations && !canReserveControl(
    (board.controlReservations ?? []).filter((reservation) => reservation.sourceId !== sourceId),
    target.id,
    state.time,
    Boolean(target.channeling),
  )) return false

  const damage = getSimpleSkillDamage(arcane, skill, level)
  return damage <= 0 || !honorsReservations || canReserveDamage(
    (board.damageReservations ?? []).filter((reservation) => reservation.sourceId !== sourceId),
    target.id,
    target.stats.hp,
    state.time,
    isUltimateSkill(skill),
  )
}

export function honorsCombatReservations(
  state: SimulationState,
  arcane: Arcane,
  sourceId: string,
  targetId: string,
) {
  const reliability = getArcaneCoordinationReliability(state, arcane)
  const window = Math.floor(state.time * 2)
  return seededRandomUnit(state.matchSeed, `combat-coordination:${arcane.id}:${sourceId}:${targetId}:${window}`) <= reliability
}

export function registerCombatSkillReservation(
  state: SimulationState,
  arcane: Arcane,
  skill: HeroSkillDefinition,
  level: number,
  target: CombatTarget,
  profile = getSkillEffectProfile(skill, level),
  impactDelay = 0.1,
) {
  if (!('player' in target)) return
  const board = getArcaneCombatBlackboard(state, arcane)
  if (!board) return
  const sourceId = `${arcane.id}-${skill.id}`
  if (target.team === arcane.team) {
    const expectedSave = Math.max(profile.heal, profile.barrier, isSimpleHealingSkill(skill) ? 75 + level * 35 : 0)
    if (expectedSave <= 0 && !profile.isSave && !hasAnySimpleSkillTag(skill, ['save', 'cleanse', 'dispel'])) return
    board.saveReservations = [
      ...(board.saveReservations ?? []).filter((reservation) => reservation.sourceId !== sourceId),
      {
        targetAllyId: target.id,
        sourceHeroId: arcane.id,
        sourceId,
        expectedImpactTime: state.time + impactDelay,
        expectedPreventedDamage: Math.max(80, expectedSave),
        reliability: 0.9,
        saveType: profile.heal > 0 || isSimpleHealingSkill(skill)
          ? 'heal'
          : profile.barrier > 0 || hasAnySimpleSkillTag(skill, ['shield', 'barrier'])
            ? 'barrier'
            : hasAnySimpleSkillTag(skill, ['cleanse', 'dispel'])
              ? 'dispel'
              : profile.isMobility
                ? 'mobility'
                : 'defensive_buff',
        isPrimarySave: true,
      },
    ]
    return
  }

  const controlDuration = getSimpleSkillControlDuration(skill, profile)
  if (controlDuration > 0) {
    board.controlReservations = [
      ...(board.controlReservations ?? []).filter((reservation) => reservation.sourceId !== sourceId),
      {
        targetId: target.id,
        sourceHeroId: arcane.id,
        sourceId,
        controlType: getSimpleSkillControlType(skill, target),
        expectedStart: state.time + impactDelay,
        expectedEnd: state.time + impactDelay + controlDuration,
        priority: target.channeling ? 100 : 65,
        reliability: 0.9,
      },
    ]
  }
  const expectedDamage = getSimpleSkillDamage(arcane, skill, level)
  if (expectedDamage > 0) {
    board.damageReservations = [
      ...(board.damageReservations ?? []).filter((reservation) => reservation.sourceId !== sourceId),
      {
        targetId: target.id,
        sourceHeroId: arcane.id,
        sourceId,
        expectedImpactTime: state.time + impactDelay + 0.05,
        expectedDamage,
        reliability: profile.isArea ? 0.76 : 0.9,
        isUltimate: isUltimateSkill(skill),
      },
    ]
  }
}

export function getSimpleSkillControlDuration(skill: HeroSkillDefinition, profile: ReturnType<typeof getSkillEffectProfile>) {
  const explicit = Math.max(profile.stunDuration, profile.rootDuration, profile.silenceDuration)
  return explicit > 0 ? explicit : hasSimpleStatusTag(skill) ? Math.max(0.8, profile.duration) : 0
}

export function getSimpleSkillControlType(skill: HeroSkillDefinition, target: Arcane): CombatControlType {
  if (target.channeling) return 'interrupt'
  if (hasAnySimpleSkillTag(skill, ['stun', 'hex', 'sleep', 'fear', 'taunt'])) return 'stun'
  if (hasAnySimpleSkillTag(skill, ['root', 'net', 'leash'])) return 'root'
  if (hasAnySimpleSkillTag(skill, ['silence', 'mute'])) return 'silence'
  return 'disable'
}

export function applySkillAuraEffects(state: SimulationState, elapsedSeconds = simulationFrameSeconds) {
  state.arcanes
    .filter((holder) => holder.stats.hp > 0 && holder.respawn <= state.time && !hasTimedEffect(state, holder.id, 'break'))
    .forEach((holder) => {
      const auraSkills = getArcaneRuntimeSkills(holder)
        .filter((skill) => skill.kind === 'passive' && hasSkillTag(skill, ['aura', 'aura_dot', 'damage_aura', 'vengeance_aura', 'mana_aura']))
        .map((skill) => ({ skill, level: getSimpleSkillLevel(holder, skill) }))
        .filter(({ level }) => level > 0)

      auraSkills.forEach(({ skill, level }) => {
        const allies = state.arcanes.filter((arcane) => arcane.team === holder.team && arcane.stats.hp > 0 && arcane.respawn <= state.time && distance(arcane.pos, holder.pos) <= 9)
        const enemies = state.arcanes.filter((arcane) => arcane.team !== holder.team && arcane.stats.hp > 0 && arcane.respawn <= state.time && distance(arcane.pos, holder.pos) <= 9)

        if (hasSkillTag(skill, ['aura_dot'])) {
          enemies.forEach((enemy) => addTimedEffect(state, enemy, {
            sourceId: `${holder.id}-${skill.id}`,
            sourceName: `${holder.player}: ${skill.name}`,
            sourceTeam: holder.team,
            kind: 'dot',
            polarity: 'negative',
            value: 3 + level * 2.5,
            damageType: skill.damageType === 'none' ? 'magical' : getSimpleSkillDamageType(skill),
            tickInterval: 1,
            duration: 0.85,
            dispelType: 'none',
          }))
          return
        }

        allies.forEach((ally) => {
          if (hasSkillTag(skill, ['mana_aura'])) {
            ally.stats.mana = Math.min(ally.stats.maxMana, ally.stats.mana + elapsedSeconds * (0.65 + level * 0.35))
          }
          addTimedEffect(state, ally, {
            sourceId: `${holder.id}-${skill.id}`,
            sourceName: `${holder.player}: ${skill.name}`,
            sourceTeam: holder.team,
            kind: 'buff',
            polarity: 'positive',
            value: 1,
            modifiers: {
              damagePct: 0.015 + level * 0.012,
              attackSpeedPct: 0.012 + level * 0.01,
            },
            duration: 0.85,
            dispelType: 'none',
          })
        })
      })
    })
}

export function getSimpleSkillAffectedTargets(
  state: SimulationState,
  caster: Arcane,
  skill: HeroSkillDefinition,
  profile: ReturnType<typeof getSkillEffectProfile>,
  primaryTarget: CombatTarget,
  centerOverride?: Point,
): CombatTarget[] {
  if ((!profile.isArea && !profile.isGlobal) || !('player' in primaryTarget)) return [primaryTarget]

  const positive = isPositiveSimpleSkill(skill)
  const radius = profile.isGlobal ? Number.POSITIVE_INFINITY : Math.max(2.5, profile.radius)
  const center = profile.isGlobal ? caster.pos : centerOverride ?? primaryTarget.pos
  const candidates = state.arcanes.filter((candidate) => (
    candidate.stats.hp > 0 &&
    candidate.respawn <= state.time &&
    (positive ? candidate.team === caster.team : candidate.team !== caster.team) &&
    (positive || !profile.isGlobal || hasAnySimpleSkillTag(skill, ['global_silence']) || isPointVisibleToTeam(state, caster.team, candidate.pos)) &&
    distance(candidate.pos, center) <= radius
  ))
  return candidates.length > 0 ? candidates : [primaryTarget]
}

export function applySimpleSkillManaEffect(
  state: SimulationState,
  caster: Arcane,
  target: Arcane,
  profile: ReturnType<typeof getSkillEffectProfile>,
) {
  if (profile.manaDelta === 0) return
  const targetManaBefore = target.stats.mana
  target.stats.mana = Math.max(0, Math.min(target.stats.maxMana, target.stats.mana + profile.manaDelta))
  if (profile.manaDelta < 0) {
    const burnedMana = targetManaBefore - target.stats.mana
    if (burnedMana > 0) {
      damageEntity(state, target.id, burnedMana * 0.35, {
        id: `${caster.id}-mana-burn`,
        label: `${caster.player}: Mana Burn`,
        team: caster.team,
        damageType: 'magical',
      })
    }
  }
}

export function applySimpleSkillMobility(
  _state: SimulationState,
  caster: Arcane,
  target: CombatTarget,
  skill: HeroSkillDefinition,
  profile: ReturnType<typeof getSkillEffectProfile>,
) {
  if (!profile.isMobility || skill.target === 'self' || distance(caster.pos, target.pos) < 0.5) return
  const travel = Math.min(6.5, getSimpleSkillRange(caster, skill, getSimpleSkillLevel(caster, skill)) * 0.78)
  caster.pos = clampToMapBounds(moveToward(caster.pos, target.pos, travel))
  caster.target = caster.pos
}

export function applySimpleSkillDisplacement(caster: Arcane, target: Arcane, skill: HeroSkillDefinition, level: number) {
  const currentDistance = distance(caster.pos, target.pos)
  if (currentDistance < 0.2) return

  if (hasAnySimpleSkillTag(skill, ['hook', 'hookshot', 'pull', 'drag'])) {
    const pullDistance = Math.min(currentDistance - 0.1, 2.8 + level * 0.55)
    target.pos = clampToMapBounds(moveToward(target.pos, caster.pos, Math.max(0, pullDistance)))
    target.target = target.pos
    return
  }

  if (hasAnySimpleSkillTag(skill, ['knockback', 'push'])) {
    const pushDistance = 2.2 + level * 0.45
    const directionX = (target.pos.x - caster.pos.x) / currentDistance
    const directionY = (target.pos.y - caster.pos.y) / currentDistance
    target.pos = clampToMapBounds({
      x: target.pos.x + directionX * pushDistance,
      y: target.pos.y + directionY * pushDistance,
    })
    target.target = target.pos
  }
}

export function getSimpleSkillExecuteMultiplier(target: Arcane, level: number) {
  const hpRatio = target.stats.hp / Math.max(1, target.stats.maxHp)
  const threshold = Math.min(0.42, 0.24 + level * 0.04)
  return hpRatio <= threshold ? 1.55 : 1
}

export function shouldCastGlobalSkill(state: SimulationState, caster: Arcane, skill: HeroSkillDefinition) {
  const allies = state.arcanes.filter((arcane) => arcane.team === caster.team && arcane.stats.hp > 0 && arcane.respawn <= state.time)
  const enemies = state.arcanes.filter((arcane) => (
    arcane.team !== caster.team &&
    arcane.stats.hp > 0 &&
    arcane.respawn <= state.time &&
    isPointVisibleToTeam(state, caster.team, arcane.pos)
  ))
  const positive = isPositiveSimpleSkill(skill) || hasAnySimpleSkillTag(skill, ['global_stealth', 'stampede'])

  if (positive) {
    const wounded = allies.filter((ally) => ally.stats.hp / Math.max(1, ally.stats.maxHp) < 0.65)
    const critical = wounded.some((ally) => ally.stats.hp / Math.max(1, ally.stats.maxHp) < 0.34)
    const teamfight = enemies.filter((enemy) => allies.some((ally) => distance(ally.pos, enemy.pos) <= 11)).length >= 2
    return critical || wounded.length >= 2 || teamfight
  }

  const engagedEnemies = enemies.filter((enemy) => allies.some((ally) => distance(ally.pos, enemy.pos) <= 11))
  const vulnerableEnemy = enemies.some((enemy) => enemy.stats.hp / Math.max(1, enemy.stats.maxHp) < 0.28)
  const committed = caster.aiMode === 'join_fight' || caster.aiMode === 'finish_enemy' || caster.macroDecision.includes('Lutar')
  const globalMobility = hasAnySimpleSkillTag(skill, ['global_charge', 'global_recall']) || getSkillEffectProfile(skill, getSimpleSkillLevel(caster, skill)).isMobility
  if (globalMobility) return committed && engagedEnemies.length >= 1
  if (isUltimateSkill(skill)) return engagedEnemies.length >= 2 || (committed && engagedEnemies.length >= 1) || vulnerableEnemy
  return engagedEnemies.length >= 2
}

export function applySimpleSkillDispel(
  state: SimulationState,
  skill: HeroSkillDefinition,
  target: Arcane,
  polarity: TimedEffect['polarity'],
) {
  if (!hasAnySimpleSkillTag(skill, ['purge', 'dispel', 'cleanse'])) return 0
  const power: DispelPower = hasAnySimpleSkillTag(skill, ['strong_dispel', 'strong_cleanse']) ? 'strong' : 'basic'
  return dispelTimedEffects(state, target.id, power, polarity)
}

export function applySimpleSkillSummonPressure(
  state: SimulationState,
  caster: Arcane,
  skill: HeroSkillDefinition,
  profile: ReturnType<typeof getSkillEffectProfile>,
  center: Point = caster.pos,
  triggerMode?: SkillSummonMode,
  countOverride?: number,
) {
  const requestedCount = countOverride ?? profile.summonCount
  const supportsTrigger = triggerMode
    ? profile.summonMode === triggerMode
    : profile.summonMode === 'cast' || profile.summonMode === 'channel'
  if (requestedCount <= 0 || !supportsTrigger) return []
  const duration = Math.max(4, Math.min(7200, profile.summonDuration || profile.duration))
  if (duration >= 3600) {
    state.summons = state.summons.filter((summon) => (
      summon.ownerId !== caster.id || summon.sourceSkillId !== skill.id
    ))
  }
  const ownerSummons = state.summons.filter((summon) => summon.ownerId === caster.id && summon.hp > 0)
  const ownerLimit = profile.summonArchetype === 'ward' ? 24 : 12
  const castLimit = profile.summonArchetype === 'ward' ? 12 : 10
  const count = Math.min(castLimit, requestedCount, Math.max(0, ownerLimit - ownerSummons.length))
  if (count <= 0) return []
  const levelScale = 1 + Math.max(0, caster.stats.level - 1) * 0.035
  const swarmScale = 1 / Math.sqrt(Math.max(1, count))
  const archetype = profile.summonArchetype
  const illusion = archetype === 'illusion'
  const clone = archetype === 'clone'
  const ward = archetype === 'ward'
  const healingWard = archetype === 'healing_ward'
  const unitSeed = profile.summonUnitSeedId ? getSummonUnitRuntimeSeed(profile.summonUnitSeedId) : undefined
  const importedHp = profile.summonHits > 0 ? profile.summonHits * 90 : profile.summonHp
  const genericHp = (115 + caster.stats.maxHp * 0.16) * levelScale * (0.72 + swarmScale * 0.28)
  const maxHp = Math.max(1, Math.round(illusion || clone ? caster.stats.maxHp : importedHp || unitSeed?.hp || genericHp))
  const outgoingDamage = profile.summonOutgoingDamagePct > 0 ? profile.summonOutgoingDamagePct / 100 : illusion ? 0.35 : 1
  const genericDamage = (12 + caster.stats.damage * 0.24) * levelScale * (0.7 + swarmScale * 0.3)
  const baseDamage = clone ? caster.stats.damage : illusion ? caster.stats.damage * outgoingDamage : profile.summonDamage || unitSeed?.damage || genericDamage
  const damage = healingWard ? 0 : Math.max(0, Math.round(baseDamage))
  const seedRange = unitSeed?.range ?? 0
  const ranged = ward || profile.summonRange >= 300 || seedRange >= 300 || hasAnySimpleSkillTag(skill, ['spirit', 'archer', 'ranged'])
  const canMove = !ward && (healingWard || profile.summonMoveSpeed > 0 || illusion || clone || archetype === 'unit')
  const canAttack = damage > 0 && !healingWard && skill.id !== tombstoneSkillId
  const timestamp = Math.round(state.time * 1000)
  const sequence = state.summons.length
  const familiarCloak = skill.sourceAbilityId === 5483
    ? getOwnerSkillProfileByAbility(state, caster.id, 5482)
    : undefined
  const spawned = Array.from({ length: count }, (_, index): SummonedUnit => {
    const angle = ((index + 1) / count) * Math.PI * 2
    const radius = 1.5 + (index % 2) * 0.55
    const pos = clampToMapBounds({ x: center.x + Math.cos(angle) * radius, y: center.y + Math.sin(angle) * radius })
    return {
      id: `${caster.id}-summon-${skill.id}-${timestamp}-${sequence}-${index}`,
      ownerId: caster.id,
      sourceSkillId: skill.id,
      name: `${skill.name} ${index + 1}`,
      archetype,
      team: caster.team,
      pos,
      hp: maxHp,
      maxHp,
      damage,
      range: profile.summonRange > 0 ? profile.summonRange / 140 : seedRange > 0 ? seedRange / 140 : ranged ? 5.8 : 2.2,
      visionRange: profile.summonVision > 0 ? profile.summonVision / 140 : unitSeed?.vision ? unitSeed.vision / 140 : ranged ? 8.5 : 7,
      moveSpeed: canMove ? (profile.summonMoveSpeed > 0 ? profile.summonMoveSpeed / 45 : unitSeed?.movementSpeed ? unitSeed.movementSpeed / 45 : ranged ? 3.8 : 4.4) : 0,
      attackInterval: profile.summonAttackInterval > 0 ? profile.summonAttackInterval : unitSeed?.attackInterval || (ranged ? 1.35 : 1.05),
      lastAttack: state.time - 0.5,
      spawnedAt: state.time,
      expiresAt: state.time + duration,
      goldReward: Math.max(0, Math.round(profile.summonGoldBounty || unitSeed?.goldBounty || (12 + caster.stats.level * 1.5) * swarmScale)),
      xpReward: Math.max(0, Math.round(profile.summonXpBounty || unitSeed?.xpBounty || (18 + caster.stats.level * 2) * swarmScale)),
      canMove,
      canAttack,
      damageTakenMultiplier: profile.summonIncomingDamagePct > 0 ? profile.summonIncomingDamagePct / 100 : illusion ? 3 : 1,
      healingAuraPct: healingWard ? Math.max(0.01, profile.summonHealPct / 100) : 0,
      channelBound: profile.summonMode === 'channel',
      unitSeedId: unitSeed?.id,
      cloakLayers: familiarCloak?.profile.cloakMaxLayers,
    }
  })
  state.summons = [...state.summons, ...spawned]
  teamVisionProviderCache.delete(state)
  return spawned
}

const eldritchSummoningSkillId = 'h029_soul_warlock_innate_1_1274'
const reincarnationSummonSkillId = 'h034_skeleton_monarch_standard_4_5089'
const soulWarlockHeroId = 'h029_soul_warlock'
const decayZombieHeroId = 'h077_decay_zombie'
const fleshGolemSkillId = 'h077_decay_zombie_standard_4_5447'
const spawnSpiderlingsSkillId = 'h053_brood_matriarch_standard_4_5279'
const tombstoneSkillId = 'h077_decay_zombie_standard_3_5444'
const spiritBearSkillId = 'h072_druid_dual_innate_1_1342'
const summonFamiliarsSkillId = 'h084_gargoyle_brood_standard_4_5483'
const deathWardSkillId = 'h023_witch_shaman_standard_4_5141'
const spiritLinkAbilityId = 7309
const savageRoarAbilityId = 5414
const graveChillAbilityId = 5480
const gravekeepersCloakAbilityId = 5482

function getOwnerSkillProfileByAbility(state: SimulationState, ownerId: string, sourceAbilityId: number) {
  const caster = state.arcanes.find((arcane) => arcane.id === ownerId)
  const skill = caster && getArcaneRuntimeSkills(caster).find((candidate) => candidate.sourceAbilityId === sourceAbilityId)
  const level = caster && skill ? getSimpleSkillLevel(caster, skill) : 0
  if (!caster || !skill || level <= 0) return undefined
  return { caster, skill, profile: getSkillEffectProfile(skill, level) }
}

function resolveLinkedSummonSkillEffects(
  state: SimulationState,
  caster: Arcane,
  skill: HeroSkillDefinition,
  level: number,
  target: CombatTarget,
  profile: ReturnType<typeof getSkillEffectProfile>,
  manaCost: number,
  commitCast: boolean,
) {
  if (skill.sourceAbilityId === graveChillAbilityId) {
    if (!('player' in target) || target.team === caster.team) return false
    applyTowerAggro(state, target.team, caster.id)
    applyCreepAggro(state, target.team, caster.id)
    addTimedEffect(state, target, {
      sourceId: `${caster.id}-${skill.id}`,
      sourceName: skill.name,
      sourceTeam: caster.team,
      kind: 'slow',
      polarity: 'negative',
      value: profile.moveSpeedPct,
      modifiers: { attackSpeedPct: -profile.attackSpeedPct },
      duration: profile.duration,
    })
    addTimedEffect(state, caster, {
      sourceId: `${caster.id}-${skill.id}`,
      sourceName: skill.name,
      sourceTeam: caster.team,
      kind: 'buff',
      polarity: 'positive',
      value: 1,
      modifiers: { moveSpeedPct: profile.moveSpeedPct, attackSpeedPct: profile.attackSpeedPct },
      duration: profile.duration,
    })
    const sharedRadiusSquared = profile.radius * profile.radius
    state.summons.forEach((summon) => {
      if (
        summon.ownerId === caster.id &&
        summon.sourceSkillId === summonFamiliarsSkillId &&
        summon.hp > 0 &&
        summon.expiresAt > state.time &&
        distanceSquared(summon.pos, caster.pos) <= sharedRadiusSquared
      ) {
        summon.sharedBuffUntil = state.time + profile.duration
      }
    })
    addSimpleSkillEffect(state, caster, target)
    if (commitCast) {
      finishSimpleSkillCast(state, caster, skill, manaCost, target)
      registerCombatSkillReservation(state, caster, skill, level, target, profile)
    }
    return true
  }

  if (skill.sourceAbilityId !== savageRoarAbilityId) return undefined
  const centers = [
    caster.pos,
    ...state.summons
      .filter((summon) => summon.ownerId === caster.id && summon.sourceSkillId === spiritBearSkillId && summon.hp > 0 && summon.expiresAt > state.time)
      .map((summon) => summon.pos),
  ]
  const radiusSquared = profile.radius * profile.radius
  const enemies = state.arcanes.filter((enemy) => (
    enemy.team !== caster.team &&
    enemy.stats.hp > 0 &&
    enemy.respawn <= state.time &&
    centers.some((center) => distanceSquared(center, enemy.pos) <= radiusSquared)
  ))
  if (enemies.length === 0) return false
  enemies.forEach((enemy) => addTimedEffect(state, enemy, {
    sourceId: `${caster.id}-${skill.id}-fear`,
    sourceName: skill.name,
    sourceTeam: caster.team,
    kind: 'fear',
    polarity: 'negative',
    value: 1,
    duration: profile.fearDuration,
  }))
  centers.forEach((center) => {
    state.effects = addAttackEffect(state.effects, {
      kind: 'arcane',
      action: 'skill',
      sourceId: caster.id,
      targetKind: 'arcane',
      team: caster.team,
      from: center,
      to: center,
      createdAt: state.time,
    })
  })
  if (commitCast) {
    finishSimpleSkillCast(state, caster, skill, manaCost, caster)
    registerCombatSkillReservation(state, caster, skill, level, enemies[0], profile)
  }
  return true
}

type ConditionalSummonDeathTarget = {
  id: string
  pos: Point
  lastHitBy?: CombatSource
}

export function markConditionalSummonDeathTarget(
  state: SimulationState,
  caster: Arcane,
  skill: HeroSkillDefinition,
  profile: ReturnType<typeof getSkillEffectProfile>,
  target: CombatTarget,
) {
  if (target.id === caster.id || ('team' in target && target.team === caster.team)) return

  if (profile.summonMode === 'target_death' && profile.summonCount > 0) {
    addSummonDeathMark(state, target.id, caster, skill, Math.max(1, profile.summonTriggerDuration || profile.duration))
  }

  if (skill.id === eldritchSummoningSkillId || caster.heroDefinitionId !== soulWarlockHeroId) return
  const deathTrigger = getArcaneRuntimeSkills(caster).find((candidate) => {
    if (candidate.id !== eldritchSummoningSkillId) return false
    const candidateLevel = getSimpleSkillLevel(caster, candidate)
    return candidateLevel > 0 && getSkillEffectProfile(candidate, candidateLevel).summonMode === 'on_death'
  })
  if (deathTrigger) {
    addSummonDeathMark(state, target.id, caster, deathTrigger, Math.max(1, profile.duration))
  }
}

function addSummonDeathMark(
  state: SimulationState,
  targetId: string,
  caster: Arcane,
  skill: HeroSkillDefinition,
  duration: number,
) {
  const sourceId = `${caster.id}-${skill.id}`
  const id = `summon_mark-${targetId}-${sourceId}`
  const mark: TimedEffect = {
    id,
    targetId,
    sourceId,
    sourceName: skill.name,
    sourceTeam: caster.team,
    kind: 'summon_mark',
    polarity: 'negative',
    value: 1,
    stacks: 1,
    dispelType: 'basic',
    createdAt: state.time,
    expiresAt: state.time + duration,
  }
  state.timedEffects = [mark, ...state.timedEffects.filter((effect) => effect.id !== id)].slice(0, 160)
}

export function resolveConditionalSummonDeathTriggers(
  state: SimulationState,
  deadTargets: ConditionalSummonDeathTarget[],
  deadArcanes: Arcane[],
) {
  const deadTargetIds = new Set(deadTargets.map((target) => target.id))
  const consumedMarkIds = new Set<string>()

  for (const mark of state.timedEffects) {
    if (mark.kind !== 'summon_mark' || mark.expiresAt <= state.time || !deadTargetIds.has(mark.targetId)) continue
    const caster = state.arcanes.find((arcane) => mark.sourceId.startsWith(`${arcane.id}-`))
    const target = deadTargets.find((candidate) => candidate.id === mark.targetId)
    const skill = caster && getArcaneRuntimeSkills(caster).find((candidate) => mark.sourceId === `${caster.id}-${candidate.id}`)
    if (!caster || !target || !skill) continue
    const level = getSimpleSkillLevel(caster, skill)
    if (level <= 0) continue
    const profile = getSkillEffectProfile(skill, level)
    if (profile.summonMode !== 'target_death' && profile.summonMode !== 'on_death') continue
    applySimpleSkillSummonPressure(state, caster, skill, profile, target.pos, profile.summonMode)
    consumedMarkIds.add(mark.id)
  }

  if (consumedMarkIds.size > 0) {
    state.timedEffects = state.timedEffects.filter((effect) => !consumedMarkIds.has(effect.id))
  }

  for (const target of deadTargets) {
    const sourceSummon = target.lastHitBy
      ? state.summons.find((summon) => summon.id === target.lastHitBy?.id && summon.sourceSkillId === spawnSpiderlingsSkillId)
      : undefined
    if (!sourceSummon) continue
    const caster = state.arcanes.find((arcane) => arcane.id === sourceSummon.ownerId)
    const skill = caster && getArcaneRuntimeSkills(caster).find((candidate) => candidate.id === spawnSpiderlingsSkillId)
    if (!caster || !skill) continue
    const level = getSimpleSkillLevel(caster, skill)
    if (level <= 0) continue
    const profile = getSkillEffectProfile(skill, level)
    applySimpleSkillSummonPressure(state, caster, skill, profile, target.pos, 'target_death', 1)
  }

  for (const caster of deadArcanes) {
    if (hasTimedEffect(state, caster.id, 'break')) continue
    const skill = getArcaneRuntimeSkills(caster).find((candidate) => candidate.id === reincarnationSummonSkillId)
    if (!skill) continue
    const level = getSimpleSkillLevel(caster, skill)
    if (level <= 0 || caster.stats.mana < getSimpleSkillManaCost(caster, skill, level)) continue
    if ((caster.itemCooldowns[skill.id] ?? 0) > state.time) continue
    const profile = getSkillEffectProfile(skill, level)
    if (profile.summonMode !== 'on_death' || profile.summonCount <= 0) continue
    caster.stats.mana -= getSimpleSkillManaCost(caster, skill, level)
    setArcaneSkillCooldown(state, caster, skill.id, state.time + getSimpleSkillCooldown(skill, level))
    const triggerRadius = profile.summonTriggerRadius > 0 ? profile.summonTriggerRadius / 140 : 600 / 140
    const nearbyEnemies = state.arcanes.filter((arcane) => (
      arcane.team !== caster.team && arcane.stats.hp > 0 && arcane.respawn <= state.time &&
      distanceSquared(arcane.pos, caster.pos) <= triggerRadius * triggerRadius
    ))
    nearbyEnemies.forEach((enemy) => addTimedEffect(state, enemy, {
      sourceId: `${caster.id}-${skill.id}`,
      sourceName: skill.name,
      sourceTeam: caster.team,
      kind: 'slow',
      polarity: 'negative',
      value: profile.summonTriggerSlowPct || 0.75,
      duration: profile.summonTriggerSlowDuration || 4,
    }))
    const spawned = applySimpleSkillSummonPressure(state, caster, skill, profile, caster.pos, 'on_death')
    if (nearbyEnemies.length > 0) {
      spawned.forEach((summon, index) => {
        summon.targetId = nearbyEnemies[index % nearbyEnemies.length].id
      })
    }
  }
}

export function triggerOnAttackSummons(state: SimulationState, caster: Arcane, target: CombatTarget) {
  if (caster.heroDefinitionId !== decayZombieHeroId) return
  for (const skill of getArcaneRuntimeSkills(caster)) {
    if (skill.id !== fleshGolemSkillId) continue
    const level = getSimpleSkillLevel(caster, skill)
    if (level <= 0) continue
    const profile = getSkillEffectProfile(skill, level)
    if (profile.summonMode !== 'on_attack' || profile.summonCount <= 0) continue
    const sourceId = `${caster.id}-${skill.id}`
    const active = state.timedEffects.some((effect) => (
      effect.targetId === caster.id && effect.sourceId === sourceId && effect.kind === 'buff' && effect.expiresAt > state.time
    ))
    if (!active) continue
    applySimpleSkillSummonPressure(state, caster, skill, profile, target.pos, 'on_attack')
  }
}

function getSummonOwnerSkillProfile(state: SimulationState, summon: SummonedUnit) {
  const caster = state.arcanes.find((arcane) => arcane.id === summon.ownerId)
  const skill = caster && getArcaneRuntimeSkills(caster).find((candidate) => candidate.id === summon.sourceSkillId)
  const level = caster && skill ? getSimpleSkillLevel(caster, skill) : 0
  if (!caster || !skill || level <= 0) return undefined
  return { caster, skill, profile: getSkillEffectProfile(skill, level) }
}

function getSummonUnitAbility(summon: SummonedUnit, abilityId: string) {
  return summon.unitSeedId
    ? getSummonUnitRuntimeSeed(summon.unitSeedId)?.abilities.find((ability) => ability.id === abilityId)
    : undefined
}

function getSummonAbilityNumber(
  ability: ReturnType<typeof getSummonUnitAbility>,
  key: string,
  fallback = 0,
) {
  const value = ability?.values?.[key]
  if (Array.isArray(value)) return typeof value[0] === 'number' ? value[0] : fallback
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function updateFamiliarRecall(state: SimulationState, familiar: SummonedUnit) {
  const source = getSummonOwnerSkillProfile(state, familiar)
  if (!source) return false
  const recallDuration = source.profile.summonRecallDuration
  const returnDistance = source.profile.summonReturnDistance / 140
  if (recallDuration <= 0 || returnDistance <= 0) return false

  if (familiar.recallStartedAt !== undefined) {
    if (state.time < familiar.recallStartedAt + recallDuration) return true
    familiar.pos = clampToMapBounds(formationPoint(source.caster.pos, familiar.id))
    familiar.targetId = undefined
    familiar.recallStartedAt = undefined
    state.skillMarkers = [
      ...state.skillMarkers.slice(-23),
      {
        id: `familiar-recall-${familiar.id}-${state.time}`,
        team: familiar.team,
        pos: { ...familiar.pos },
        label: 'Recall do Familiar',
        createdAt: state.time,
        expiresAt: state.time + 0.8,
      },
    ]
    return true
  }

  if (distanceSquared(familiar.pos, source.caster.pos) <= returnDistance * returnDistance) return false
  familiar.targetId = undefined
  familiar.recallStartedAt = state.time
  return true
}

export function tryUseSummonActiveAbility(state: SimulationState, summon: SummonedUnit) {
  if (summon.unitSeedId !== 'summon_stone_familiar') return false
  const stoneDrop = getSummonUnitAbility(summon, 'stone_drop')
  if (!stoneDrop || (summon.nextAbilityAt ?? 0) > state.time) return false
  const radius = getSummonAbilityNumber(stoneDrop, 'radius', 250) / 140
  const targets = state.arcanes.filter((arcane) => (
    arcane.team !== summon.team && arcane.stats.hp > 0 && arcane.respawn <= state.time &&
    distanceSquared(arcane.pos, summon.pos) <= radius * radius
  ))
  if (targets.length === 0) return false

  const damage = getSummonAbilityNumber(stoneDrop, 'damage', 60)
  const stunDuration = getSummonAbilityNumber(stoneDrop, 'stun', 1)
  summon.nextAbilityAt = state.time + getSummonAbilityNumber(stoneDrop, 'cooldown', 20)
  targets.forEach((target) => {
    damageEntity(state, target.id, damage, {
      id: summon.id,
      label: `${summon.name}: Stone Form`,
      team: summon.team,
      damageType: 'magical',
    })
    addTimedEffect(state, target, {
      sourceId: `${summon.id}:stone_drop`,
      sourceName: `${summon.name}: Stone Form`,
      sourceTeam: summon.team,
      kind: 'stun',
      polarity: 'negative',
      value: 1,
      duration: stunDuration,
    })
  })
  state.skillMarkers = [
    ...state.skillMarkers.slice(-23),
    {
      id: `stone-form-${summon.id}-${state.time}`,
      team: summon.team,
      pos: { ...summon.pos },
      label: 'Stone Form',
      createdAt: state.time,
      expiresAt: state.time + 0.9,
    },
  ]
  return true
}

export function updateTombstoneZombieSpawning(state: SimulationState, tombstone: SummonedUnit) {
  const source = getSummonOwnerSkillProfile(state, tombstone)
  if (!source) return
  const interval = source.profile.summonSpawnInterval || 4
  if (state.time < tombstone.lastAttack + interval) return
  tombstone.lastAttack = state.time
  const radius = (source.profile.summonEffectRadius || 1200) / 140
  const targets = state.arcanes.filter((arcane) => (
    arcane.team !== tombstone.team && arcane.stats.hp > 0 && arcane.respawn <= state.time &&
    distanceSquared(arcane.pos, tombstone.pos) <= radius * radius
  ))
  const ownerSummonCount = state.summons.filter((summon) => summon.ownerId === tombstone.ownerId && summon.hp > 0).length
  const capacity = Math.max(0, 12 - ownerSummonCount)
  const spawnTargets = targets.slice(0, capacity)
  if (spawnTargets.length === 0) return
  const remainingDuration = Math.max(0.25, tombstone.expiresAt - state.time)
  const childDuration = Math.min(remainingDuration, interval * 2.5)
  const timestamp = Math.round(state.time * 1000)
  const sequence = state.summons.length
  const maxHp = Math.max(1, Math.round((source.profile.summonChildHits || 2) * 90))
  const damage = Math.max(1, Math.round(source.profile.summonChildDamage || 34))
  const zombies = spawnTargets.map((target, index): SummonedUnit => ({
    id: `${tombstone.id}-zombie-${timestamp}-${sequence}-${index}`,
    ownerId: tombstone.ownerId,
    sourceSkillId: tombstone.sourceSkillId,
    name: `Zombie da ${source.skill.name} ${index + 1}`,
    archetype: 'unit',
    variant: 'tombstone_zombie',
    team: tombstone.team,
    pos: clampToMapBounds({ x: target.pos.x + (index % 2 === 0 ? -1 : 1), y: target.pos.y + 0.7 }),
    hp: maxHp,
    maxHp,
    damage,
    range: 2.2,
    visionRange: 7,
    moveSpeed: 4.4,
    attackInterval: 1.1,
    lastAttack: state.time - 0.5,
    spawnedAt: state.time,
    expiresAt: state.time + childDuration,
    goldReward: 6,
    xpReward: 8,
    canMove: true,
    canAttack: true,
    damageTakenMultiplier: 1,
    healingAuraPct: 0,
    channelBound: false,
    targetId: target.id,
  }))
  state.summons = [...state.summons, ...zombies]
  teamVisionProviderCache.delete(state)
}

function updateSpiritBearRuntime(state: SimulationState, bear: SummonedUnit, delta: number) {
  const source = getSummonOwnerSkillProfile(state, bear)
  if (!source) return false
  if (source.profile.summonRegen > 0 && bear.hp < bear.maxHp) {
    bear.hp = Math.min(bear.maxHp, bear.hp + source.profile.summonRegen * delta)
  }
  const leashRange = (source.profile.summonLeashRange || 1100) / 140
  if (distanceSquared(bear.pos, source.caster.pos) <= leashRange * leashRange) return false
  bear.targetId = undefined
  bear.pos = moveToward(bear.pos, source.caster.pos, getEffectiveSummonMoveSpeed(state, bear) * delta)
  return true
}

function updateFamiliarCloak(state: SimulationState, familiar: SummonedUnit) {
  if (familiar.sourceSkillId !== summonFamiliarsSkillId) return
  const cloak = getOwnerSkillProfileByAbility(state, familiar.ownerId, gravekeepersCloakAbilityId)
  if (!cloak || cloak.profile.cloakMaxLayers <= 0) return
  if (distanceSquared(familiar.pos, cloak.caster.pos) > cloak.profile.radius * cloak.profile.radius) return
  if (familiar.cloakLayers === undefined) familiar.cloakLayers = cloak.profile.cloakMaxLayers
  if (familiar.cloakLayers >= cloak.profile.cloakMaxLayers) {
    familiar.cloakNextRecoveryAt = undefined
    return
  }
  if (familiar.cloakNextRecoveryAt === undefined) {
    familiar.cloakNextRecoveryAt = state.time + cloak.profile.cloakRecoveryTime
    return
  }
  if (state.time < familiar.cloakNextRecoveryAt) return
  familiar.cloakLayers = Math.min(cloak.profile.cloakMaxLayers, familiar.cloakLayers + 1)
  familiar.cloakNextRecoveryAt = familiar.cloakLayers < cloak.profile.cloakMaxLayers
    ? state.time + cloak.profile.cloakRecoveryTime
    : undefined
}

export function getEffectiveSummonMoveSpeed(state: SimulationState, summon: SummonedUnit) {
  let bonusPct = 0
  if (summon.sourceSkillId === spiritBearSkillId) {
    bonusPct += getOwnerSkillProfileByAbility(state, summon.ownerId, spiritLinkAbilityId)?.profile.linkedSummonMoveSpeedPct ?? 0
  }
  if (summon.sourceSkillId === summonFamiliarsSkillId && (summon.sharedBuffUntil ?? 0) > state.time) {
    bonusPct += getOwnerSkillProfileByAbility(state, summon.ownerId, graveChillAbilityId)?.profile.moveSpeedPct ?? 0
  }
  return summon.moveSpeed * (1 + bonusPct)
}

export function getEffectiveSummonAttackInterval(state: SimulationState, summon: SummonedUnit) {
  const attackSpeedPct = summon.sourceSkillId === summonFamiliarsSkillId && (summon.sharedBuffUntil ?? 0) > state.time
    ? getOwnerSkillProfileByAbility(state, summon.ownerId, graveChillAbilityId)?.profile.attackSpeedPct ?? 0
    : 0
  return summon.attackInterval / Math.max(0.2, 1 + attackSpeedPct)
}

function getSpiritLinkLifestealScale(target: CombatTarget) {
  return isStructureLikeTarget(target) ? 0 : 'player' in target ? 1 : 0.6
}

function applySpiritLinkSummonLifesteal(
  state: SimulationState,
  summon: SummonedUnit,
  target: CombatTarget,
  dealtDamage: number,
) {
  if (summon.sourceSkillId !== spiritBearSkillId) return
  const link = getOwnerSkillProfileByAbility(state, summon.ownerId, spiritLinkAbilityId)
  const scale = getSpiritLinkLifestealScale(target)
  if (!link || link.profile.linkedLifestealPct <= 0 || scale <= 0) return
  const healing = dealtDamage * link.profile.linkedLifestealPct * scale
  const liveBear = state.summons.find((candidate) => candidate.id === summon.id)
  const liveOwner = state.arcanes.find((arcane) => arcane.id === summon.ownerId)
  if (liveBear) liveBear.hp = Math.min(liveBear.maxHp, liveBear.hp + healing)
  if (liveOwner) {
    const applied = Math.min(liveOwner.stats.maxHp - liveOwner.stats.hp, healing)
    liveOwner.stats.hp += applied
    liveOwner.healingReceived += applied
    liveOwner.healingDone += applied
  }
}

function applySpiritLinkOwnerLifestealToBear(
  state: SimulationState,
  owner: Arcane,
  target: CombatTarget,
  dealtDamage: number,
) {
  const link = getOwnerSkillProfileByAbility(state, owner.id, spiritLinkAbilityId)
  const scale = getSpiritLinkLifestealScale(target)
  if (!link || link.profile.linkedLifestealPct <= 0 || scale <= 0) return
  const bear = state.summons.find((summon) => (
    summon.ownerId === owner.id &&
    summon.sourceSkillId === spiritBearSkillId &&
    summon.hp > 0 &&
    summon.expiresAt > state.time
  ))
  if (!bear) return
  bear.hp = Math.min(bear.maxHp, bear.hp + dealtDamage * link.profile.linkedLifestealPct * scale)
}

export function updateSummonedUnits(state: SimulationState, delta: number) {
  for (const summon of state.summons) {
    if (summon.hp <= 0 || summon.expiresAt <= state.time) continue
    if (summon.channelBound) {
      const owner = state.arcanes.find((arcane) => arcane.id === summon.ownerId)
      if (owner?.channeling?.skillId !== summon.sourceSkillId) {
        summon.expiresAt = state.time
        continue
      }
    }
    if (summon.sourceSkillId === tombstoneSkillId && summon.variant !== 'tombstone_zombie') {
      updateTombstoneZombieSpawning(state, summon)
      continue
    }
    updateFamiliarCloak(state, summon)
    if (summon.sourceSkillId === spiritBearSkillId && updateSpiritBearRuntime(state, summon, delta)) continue
    if (summon.sourceSkillId === summonFamiliarsSkillId && updateFamiliarRecall(state, summon)) continue
    if (summon.healingAuraPct > 0) applySummonHealingAura(state, summon, delta)
    if (tryUseSummonActiveAbility(state, summon)) continue
    const retained = summon.canAttack && summon.targetId ? getCombatTargetById(state, summon.targetId) : undefined
    const target = summon.canAttack
      ? retained && isSummonTargetValid(state, summon, retained)
        ? retained
        : getSummonTarget(state, summon)
      : undefined
    summon.targetId = target?.id
    if (target) {
      const stopDistance = getSummonAttackCenterRange(summon, target)
      if (summon.canMove && distanceSquared(summon.pos, target.pos) > stopDistance * stopDistance) {
        summon.pos = moveToward(summon.pos, target.pos, getEffectiveSummonMoveSpeed(state, summon) * delta)
      }
      continue
    }
    if (!summon.canMove) continue
    const owner = state.arcanes.find((arcane) => arcane.id === summon.ownerId)
    if (!owner || owner.stats.hp <= 0 || owner.respawn > state.time) continue
    const followPoint = formationPoint(owner.pos, summon.id)
    if (distanceSquared(summon.pos, followPoint) > 4 * 4) {
      summon.pos = moveToward(summon.pos, followPoint, getEffectiveSummonMoveSpeed(state, summon) * delta)
    }
  }
}

function applySummonHealingAura(state: SimulationState, summon: SummonedUnit, delta: number) {
  const radiusSquared = summon.visionRange * summon.visionRange
  const owner = state.arcanes.find((arcane) => arcane.id === summon.ownerId)
  for (const ally of state.arcanes) {
    if (ally.team !== summon.team || ally.stats.hp <= 0 || ally.respawn > state.time) continue
    if (distanceSquared(ally.pos, summon.pos) > radiusSquared) continue
    const healing = Math.min(ally.stats.maxHp - ally.stats.hp, ally.stats.maxHp * summon.healingAuraPct * delta)
    if (healing <= 0) continue
    ally.stats.hp += healing
    ally.healingReceived += healing
    if (owner) owner.healingDone += healing
  }
}

export function getSummonTarget(state: SimulationState, summon: SummonedUnit): CombatTarget | undefined {
  const enemyArcanes = state.arcanes.filter((arcane) => (
    arcane.team !== summon.team && arcane.stats.hp > 0 && arcane.respawn <= state.time &&
    isPointVisibleToTeam(state, summon.team, arcane.pos)
  ))
  const unitCandidates: CombatTarget[] = [
    ...enemyArcanes,
    ...state.creeps.filter((creep) => creep.team !== summon.team && creep.hp > 0),
    ...state.summons.filter((other) => other.team !== summon.team && other.hp > 0 && other.expiresAt > state.time),
  ]
  const units = summon.sourceSkillId === spiritBearSkillId
    ? unitCandidates.filter((target) => isWithinSpiritBearLeash(state, summon, target.pos))
    : unitCandidates
  const unit = nearest(summon.pos, units, summon.visionRange)
  if (unit) return unit
  if (summon.sourceSkillId === eldritchSummoningSkillId) return undefined
  const objectiveCandidates: CombatTarget[] = [
    ...getAttackableEnemyTowers(state, summon.team),
    ...getAttackableEnemyStructures(state, summon.team),
    ...(isEnemyBaseUnlocked(state, summon.team) ? state.bases.filter((base) => base.team !== summon.team && base.hp > 0) : []),
  ]
  const objectives = summon.sourceSkillId === spiritBearSkillId
    ? objectiveCandidates.filter((target) => isWithinSpiritBearLeash(state, summon, target.pos))
    : objectiveCandidates
  return nearest(summon.pos, objectives, summon.visionRange)
}

export function isSummonTargetValid(state: SimulationState, summon: SummonedUnit, target: CombatTarget) {
  if ('team' in target && target.team === summon.team) return false
  if ('player' in target && (target.stats.hp <= 0 || target.respawn > state.time || !isPointVisibleToTeam(state, summon.team, target.pos))) return false
  if (!('player' in target) && target.hp <= 0) return false
  if (distanceSquared(summon.pos, target.pos) > summon.visionRange * summon.visionRange) return false
  if ('tier' in target && !isTowerUnlocked(state, summon.team, target)) return false
  if ('kind' in target && !isStructureUnlocked(state, summon.team, target)) return false
  if (isBoss(target) || 'strength' in target) return false
  if (summon.sourceSkillId === spiritBearSkillId && !isWithinSpiritBearLeash(state, summon, target.pos)) return false
  return true
}

function isWithinSpiritBearLeash(state: SimulationState, bear: SummonedUnit, point: Point) {
  const owner = state.arcanes.find((arcane) => arcane.id === bear.ownerId)
  return !owner || distanceSquared(owner.pos, point) <= (1100 / 140) ** 2
}

export function getSummonAttackCenterRange(summon: SummonedUnit, target: CombatTarget) {
  const attackRange = summon.sourceSkillId === eldritchSummoningSkillId ? 0.65 : summon.range
  return attackRange + getEntityCollisionRadius(target) * 0.7
}

export function resolveSummonExplosion(state: SimulationState, summon: SummonedUnit) {
  const caster = state.arcanes.find((arcane) => arcane.id === summon.ownerId)
  const skill = caster && getArcaneRuntimeSkills(caster).find((candidate) => candidate.id === summon.sourceSkillId)
  const level = caster && skill ? getSimpleSkillLevel(caster, skill) : 0
  const profile = skill && level > 0 ? getSkillEffectProfile(skill, level) : undefined
  const radius = (profile?.summonEffectRadius || 400) / 140
  const radiusSquared = radius * radius
  const targets: CombatTarget[] = [
    ...state.arcanes.filter((arcane) => arcane.team !== summon.team && arcane.stats.hp > 0 && arcane.respawn <= state.time),
    ...state.creeps.filter((creep) => creep.team !== summon.team && creep.hp > 0),
    ...state.summons.filter((candidate) => candidate.id !== summon.id && candidate.team !== summon.team && candidate.hp > 0),
  ]
  const source: CombatSource = {
    id: summon.id,
    label: summon.name,
    team: summon.team,
    damageType: 'magical',
  }
  targets.forEach((target) => {
    if (distanceSquared(summon.pos, target.pos) <= radiusSquared) damageEntity(state, target.id, summon.damage, source)
  })
  const liveIndex = state.summons.findIndex((candidate) => candidate.id === summon.id)
  if (liveIndex >= 0) {
    state.summons[liveIndex] = { ...state.summons[liveIndex], hp: 0 }
    teamVisionProviderCache.delete(state)
  }
  state.skillMarkers = [
    ...state.skillMarkers.slice(-23),
    {
      id: `summon-explosion-${summon.id}-${state.time}`,
      team: summon.team,
      pos: { ...summon.pos },
      label: 'Explosao do imp',
      createdAt: state.time,
      expiresAt: state.time + 0.8,
    },
  ]
}

function didSummonAbilityProc(
  state: SimulationState,
  summon: SummonedUnit,
  target: CombatTarget,
  abilityId: string,
  chancePct: number,
) {
  return seededRandomUnit(
    state.matchSeed,
    `summon-proc:${abilityId}:${summon.id}:${target.id}:${Math.round(state.time * 1000)}`,
  ) < chancePct / 100
}

function applySummonDamageOverTime(
  state: SimulationState,
  summon: SummonedUnit,
  target: Arcane,
  abilityId: string,
  label: string,
) {
  const ability = getSummonUnitAbility(summon, abilityId)
  if (!ability) return
  addTimedEffect(state, target, {
    sourceId: `${summon.id}:${abilityId}`,
    sourceName: `${summon.name}: ${label}`,
    sourceTeam: summon.team,
    kind: 'dot',
    polarity: 'negative',
    value: getSummonAbilityNumber(ability, 'dps'),
    duration: getSummonAbilityNumber(ability, 'duration'),
    damageType: 'magical',
    tickInterval: 1,
  })
}

function applyMeltingAttack(state: SimulationState, summon: SummonedUnit, target: Arcane) {
  const ability = getSummonUnitAbility(summon, 'melting_attack')
  if (!ability) return
  const sourceId = `${summon.id}:melting_attack`
  const effectId = `buff-${target.id}-${sourceId}`
  const existing = state.timedEffects.find((effect) => effect.id === effectId)
  const stacks = Math.min(
    getSummonAbilityNumber(ability, 'maxStacks', 10),
    (existing?.stacks ?? 0) + 1,
  )
  addTimedEffect(state, target, {
    sourceId,
    sourceName: `${summon.name}: Melting Attack`,
    sourceTeam: summon.team,
    kind: 'buff',
    polarity: 'negative',
    value: stacks,
    modifiers: { armorFlat: -getSummonAbilityNumber(ability, 'armorReduction', 1) * stacks },
    duration: getSummonAbilityNumber(ability, 'duration', 5),
  })
  const liveEffect = state.timedEffects.find((effect) => effect.id === effectId)
  if (liveEffect) liveEffect.stacks = stacks
}

function applyBurningFistsSplash(state: SimulationState, summon: SummonedUnit, target: CombatTarget) {
  const ability = getSummonUnitAbility(summon, 'burning_fists')
  if (!ability) return
  const radius = getSummonAbilityNumber(ability, 'radius', 250) / 140
  const damage = summon.damage * getSummonAbilityNumber(ability, 'damagePct', 40) / 100
  const secondaryTargets: CombatTarget[] = [
    ...state.arcanes.filter((arcane) => arcane.team !== summon.team && arcane.stats.hp > 0 && arcane.respawn <= state.time),
    ...state.creeps.filter((creep) => creep.team !== summon.team && creep.hp > 0),
    ...state.summons.filter((candidate) => candidate.id !== summon.id && candidate.team !== summon.team && candidate.hp > 0),
  ]
  secondaryTargets.forEach((secondary) => {
    if (secondary.id === target.id || distanceSquared(secondary.pos, target.pos) > radius * radius) return
    damageEntity(state, secondary.id, damage, {
      id: summon.id,
      label: `${summon.name}: Burning Fists`,
      team: summon.team,
      damageType: 'magical',
    })
  })
}

function applyEidolonSplit(state: SimulationState, summon: SummonedUnit) {
  const ability = getSummonUnitAbility(summon, 'eidolon_split')
  if (!ability || summon.variant === 'eidolon_split_child') return
  summon.abilityCounter = (summon.abilityCounter ?? 0) + 1
  if (summon.abilityCounter < getSummonAbilityNumber(ability, 'attacksToSplit', 6)) return

  const count = Math.max(1, Math.round(getSummonAbilityNumber(ability, 'summons', 2)))
  const timestamp = Math.round(state.time * 1000)
  const children = Array.from({ length: count }, (_, index): SummonedUnit => ({
    ...summon,
    id: `${summon.id}-split-${timestamp}-${index}`,
    name: `${summon.name} dividido ${index + 1}`,
    variant: 'eidolon_split_child',
    pos: clampToMapBounds({ x: summon.pos.x + (index === 0 ? -0.7 : 0.7), y: summon.pos.y + 0.45 }),
    hp: summon.maxHp,
    lastAttack: state.time,
    spawnedAt: state.time,
    abilityCounter: 0,
    lastHitBy: undefined,
  }))
  summon.hp = 0
  summon.lastHitBy = undefined
  state.summons = [...state.summons, ...children]
  teamVisionProviderCache.delete(state)
  state.skillMarkers = [
    ...state.skillMarkers.slice(-23),
    {
      id: `eidolon-split-${summon.id}-${state.time}`,
      team: summon.team,
      pos: { ...summon.pos },
      label: 'Eidolon Split',
      createdAt: state.time,
      expiresAt: state.time + 0.9,
    },
  ]
}

export function applySummonAttackSpecials(state: SimulationState, summon: SummonedUnit, target: CombatTarget) {
  const entanglingClaws = summon.unitSeedId === 'summon_spirit_bear'
    ? getSummonUnitAbility(summon, 'entangling_claws')
    : undefined
  if (
    entanglingClaws &&
    'player' in target &&
    didSummonAbilityProc(state, summon, target, entanglingClaws.id, getSummonAbilityNumber(entanglingClaws, 'chance', 20))
  ) {
    addTimedEffect(state, target, {
      sourceId: `${summon.id}:entangling_claws`,
      sourceName: `${summon.name}: Entangling Claws`,
      sourceTeam: summon.team,
      kind: 'root',
      polarity: 'negative',
      value: 1,
      duration: getSummonAbilityNumber(entanglingClaws, 'root', 1.2),
    })
  }

  const wolfCrit = summon.unitSeedId === 'summon_spirit_wolf'
    ? getSummonUnitAbility(summon, 'wolf_crit')
    : undefined
  if (wolfCrit && didSummonAbilityProc(state, summon, target, wolfCrit.id, getSummonAbilityNumber(wolfCrit, 'critChance', 20))) {
    const extraDamage = summon.damage * (getSummonAbilityNumber(wolfCrit, 'critMultiplier', 160) / 100 - 1)
    damageEntity(state, target.id, extraDamage, {
      id: summon.id,
      label: `${summon.name}: critico`,
      team: summon.team,
      damageType: 'physical',
    })
  }

  if ('player' in target) {
    const boarSlow = summon.unitSeedId === 'summon_alpha_boar'
      ? getSummonUnitAbility(summon, 'boar_poison_slow')
      : undefined
    if (boarSlow) {
      addTimedEffect(state, target, {
        sourceId: `${summon.id}:boar_poison_slow`,
        sourceName: `${summon.name}: veneno`,
        sourceTeam: summon.team,
        kind: 'slow',
        polarity: 'negative',
        value: getSummonAbilityNumber(boarSlow, 'slowPct', 20) / 100,
        duration: getSummonAbilityNumber(boarSlow, 'duration', 3),
      })
    }
    if (summon.unitSeedId === 'summon_plague_ward') {
      applySummonDamageOverTime(state, summon, target, 'ward_poison', 'Ward Poison')
    } else if (summon.unitSeedId === 'summon_spiderling') {
      applySummonDamageOverTime(state, summon, target, 'minor_poison', 'Minor Poison')
    } else if (summon.unitSeedId === 'summon_forged_spirit') {
      applyMeltingAttack(state, summon, target)
    }
  }

  if (summon.unitSeedId === 'summon_infernal_golem') applyBurningFistsSplash(state, summon, target)
  if (summon.unitSeedId === 'summon_eidolon') applyEidolonSplit(state, summon)

  if (summon.sourceSkillId === summonFamiliarsSkillId && 'player' in target) {
    addTimedEffect(state, target, {
      sourceId: summon.id,
      sourceName: `${summon.name}: corrosao`,
      sourceTeam: summon.team,
      kind: 'buff',
      polarity: 'negative',
      value: 1,
      modifiers: { armorFlat: -1 },
      duration: 6,
    })
  }

  if (summon.sourceSkillId !== deathWardSkillId) return
  const source = getSummonOwnerSkillProfile(state, summon)
  if (!source || !getArcaneAbilityUpgradeSlots(source.caster).has('scepter')) return
  const radius = source.profile.summonScepterBounceRadius / 140
  const secondary = radius > 0
    ? nearest(
        target.pos,
        state.arcanes.filter((arcane) => (
          arcane.team !== summon.team && arcane.id !== target.id && arcane.stats.hp > 0 && arcane.respawn <= state.time
        )),
        radius,
      )
    : undefined
  if (secondary) {
    state.effects = addAttackEffect(state.effects, {
      kind: 'creep',
      action: 'skill',
      sourceId: summon.id,
      targetKind: 'arcane',
      team: summon.team,
      from: { ...target.pos },
      to: { ...secondary.pos },
      createdAt: state.time,
    })
    damageEntity(state, secondary.id, summon.damage, {
      id: summon.id,
      label: `${summon.name}: ricochete`,
      team: summon.team,
      damageType: 'physical',
    })
  }
  const liveOwner = state.arcanes.find((arcane) => arcane.id === summon.ownerId)
  if (liveOwner && source.profile.summonScepterLifestealPct > 0) {
    const healing = Math.min(
      liveOwner.stats.maxHp - liveOwner.stats.hp,
      summon.damage * (secondary ? 2 : 1) * source.profile.summonScepterLifestealPct,
    )
    liveOwner.stats.hp += healing
    liveOwner.healingDone += healing
    liveOwner.healingReceived += healing
  }
}

export function shouldCommitOffensiveSkill(
  state: SimulationState,
  arcane: Arcane,
  target: Arcane,
  skill: HeroSkillDefinition,
) {
  if (isPositiveSimpleSkill(skill)) return true

  const committedDecision = arcane.aiMode === 'join_fight' ||
    arcane.aiMode === 'finish_enemy' ||
    arcane.macroDecision.startsWith('Criar vantagem') ||
    arcane.macroDecision.startsWith('Pressionar inimigo') ||
    arcane.macroDecision.startsWith('Lutar em equipe')
  if (committedDecision) return true

  const nearbyAllies = state.arcanes.filter((candidate) => (
    candidate.team === arcane.team &&
    candidate.stats.hp > 0 &&
    candidate.respawn <= state.time &&
    distance(candidate.pos, target.pos) <= 12
  )).length
  const nearbyEnemies = state.arcanes.filter((candidate) => (
    candidate.team !== arcane.team &&
    candidate.stats.hp > 0 &&
    candidate.respawn <= state.time &&
    isPointVisibleToTeam(state, arcane.team, candidate.pos) &&
    distance(candidate.pos, target.pos) <= 12
  )).length
  if (nearbyAllies >= 2 && nearbyEnemies >= 2) return true

  const phase = getGamePhase(state.time)
  const targetHpRatio = target.stats.hp / Math.max(1, target.stats.maxHp)
  const manaRatio = arcane.stats.mana / Math.max(1, arcane.stats.maxMana)
  const executeThreshold = phase === 'early' ? 0.56 : phase === 'mid' ? 0.68 : 0.76

  return targetHpRatio <= executeThreshold && manaRatio >= 0.3
}

export function finishSimpleSkillCast(state: SimulationState, arcane: Arcane, skill: HeroSkillDefinition, manaCost: number, target: CombatTarget) {
  const liveArcane = state.arcanes.find((candidate) => candidate.id === arcane.id) ?? arcane
  liveArcane.stats = {
    ...liveArcane.stats,
    mana: Math.max(0, liveArcane.stats.mana - manaCost),
  }
  liveArcane.decision = `Castou ${skill.key}`
  updateParentSkillStateAfterCast(state, liveArcane, skill, target)
  consumeRingmasterSouvenirCharge(liveArcane, skill.sourceAbilityId ?? 0)
  syncTwinBladePairedCooldown(state, liveArcane, skill)
  if (skill.sourceAbilityId !== 1497) consumeTwinBladeKatanaSwapBuff(state, liveArcane)
  state.skillMarkers = [
    ...state.skillMarkers.slice(-23),
    {
      id: `skill-${arcane.id}-${skill.id}-${state.time}`,
      team: arcane.team,
      pos: target.pos,
      label: `${skill.key} ${getSkillShortName(skill)}`,
      createdAt: state.time,
      expiresAt: state.time + 1.15,
    },
  ]
  if (liveArcane !== arcane) {
    arcane.stats = liveArcane.stats
    arcane.microDecision = liveArcane.microDecision
    arcane.decision = liveArcane.decision
    arcane.channeling = liveArcane.channeling
    arcane.itemCooldowns = liveArcane.itemCooldowns
    arcane.skillStates = liveArcane.skillStates
  }
}

export function updateParentSkillStateAfterCast(
  state: SimulationState,
  arcane: Arcane,
  skill: HeroSkillDefinition,
  target: CombatTarget,
) {
  const sourceAbilityId = skill.sourceAbilityId ?? 0
  const level = Math.max(1, getSimpleSkillLevel(arcane, skill))
  const nextStates = { ...arcane.skillStates }
  if (sourceAbilityId === 5474) {
    nextStates[parentSkillStateKey(5474)] = {
      activeUntil: state.time + getSimpleSkillNumericValue(skill, 'duration', level, 40),
    }
  } else if (sourceAbilityId === 5486) {
    nextStates[parentSkillStateKey(5486)] = {
      activeUntil: state.time + getSimpleSkillNumericValue(skill, 'spirit_duration', level, 15),
      mode: 'out',
    }
  } else if (sourceAbilityId === 5606) {
    const key = parentSkillStateKey(5606)
    const previous = nextStates[key]
    const positions = [...(previous?.positions ?? []), { ...target.pos }].slice(-3)
    nextStates[key] = {
      activeUntil: state.time + getSimpleSkillNumericValue(skill, 'duration', level, 45),
      charges: positions.length,
      positions,
    }
  } else if (sourceAbilityId === 5108) {
    nextStates[parentSkillStateKey(5108)] = {
      activeUntil: state.time + 120,
      charges: Math.max(1, Math.round(getSimpleSkillNumericValue(skill, 'attack_count', level, 5))),
    }
  } else if (sourceAbilityId === 5490 || sourceAbilityId === 5493) {
    const key = parentSkillStateKey(5486)
    const previous = nextStates[key]
    if (previous) nextStates[key] = { ...previous, mode: sourceAbilityId === 5490 ? 'in' : 'out' }
  } else if (sourceAbilityId === 5607) {
    const key = parentSkillStateKey(5606)
    const previous = nextStates[key]
    if (previous?.positions?.length) {
      const consumedIndex = previous.positions.reduce((bestIndex, position, index, positions) => (
        distance(position, arcane.pos) < distance(positions[bestIndex], arcane.pos) ? index : bestIndex
      ), 0)
      const positions = previous.positions.filter((_, index) => index !== consumedIndex)
      if (positions.length === 0) delete nextStates[key]
      else nextStates[key] = { ...previous, charges: positions.length, positions }
    }
  } else if (sourceAbilityId === 6937) {
    delete nextStates[parentSkillStateKey(5108)]
  } else if (sourceAbilityId === 1497) {
    const currentMode = getTwinBladeStance(nextStates)
    const nextMode = currentMode === 'katana' ? 'sai' : 'katana'
    nextStates[twinBladeStanceStateKey()] = {
      activeUntil: Number.MAX_SAFE_INTEGER,
      mode: nextMode,
      graceUntil: getArcaneAbilityUpgradeSlots(arcane).has('scepter')
        ? state.time + getSimpleSkillNumericValue(skill, 'scepter_cooldown_timer', level, 3)
        : undefined,
    }
    applyTwinBladeSwapBuff(state, arcane, skill, level, nextMode)
  } else {
    return
  }
  arcane.skillStates = nextStates
}

export function castTwinBladeStanceSwitch(
  state: SimulationState,
  arcane: Arcane,
  skill: HeroSkillDefinition,
  level: number,
) {
  const hpRatio = arcane.stats.hp / Math.max(1, arcane.stats.maxHp)
  const situation = getPrimarySkillUsageSituation({
    phase: arcane.stats.level <= 8 ? 'early' : arcane.stats.level <= 18 ? 'mid' : 'late',
    aiMode: arcane.aiMode,
    macroDecision: arcane.macroDecision,
    hpRatio,
  })
  if (getPreferredTwinBladeStance({ situation, hpRatio }) === getTwinBladeStance(arcane.skillStates)) return false
  const manaCost = getSimpleSkillManaCost(arcane, skill, level)
  if (arcane.stats.mana < manaCost) return false
  finishSimpleSkillCast(state, arcane, skill, manaCost, arcane)
  return true
}

function applyTwinBladeSwapBuff(
  state: SimulationState,
  arcane: Arcane,
  skill: HeroSkillDefinition,
  level: number,
  mode: 'katana' | 'sai',
) {
  const sourceId = mode === 'sai' ? 'twin-blade-sai-swap' : 'twin-blade-katana-swap'
  state.timedEffects = state.timedEffects.filter((effect) => (
    effect.targetId !== arcane.id || !effect.sourceId.startsWith('twin-blade-')
  ))
  addTimedEffect(state, arcane, {
    sourceId,
    sourceName: skill.name,
    sourceTeam: arcane.team,
    kind: 'buff',
    polarity: 'positive',
    value: 1,
    modifiers: mode === 'sai'
      ? { moveSpeedPct: getSimpleSkillNumericValue(skill, 'sai_swap_bonus_movement_speed', level, 12) / 100 }
      : { damagePct: getSimpleSkillNumericValue(skill, 'katana_swap_bonus_damage', level, 12) / 100 },
    duration: mode === 'sai'
      ? getSimpleSkillNumericValue(skill, 'sai_swap_duration', level, 2)
      : 8,
  })
}

function consumeTwinBladeKatanaSwapBuff(state: SimulationState, arcane: Arcane) {
  state.timedEffects = state.timedEffects.filter((effect) => (
    effect.targetId !== arcane.id || effect.sourceId !== 'twin-blade-katana-swap'
  ))
}

function syncTwinBladePairedCooldown(state: SimulationState, arcane: Arcane, skill: HeroSkillDefinition) {
  const pairedAbilityId = getTwinBladePairedAbilityId(skill.sourceAbilityId ?? 0)
  if (!pairedAbilityId) return
  const definition = getHeroDefinition(arcane.heroDefinitionId)
  const pairedSkill = [...(definition.skills ?? []), ...(definition.supplementalSkills ?? [])]
    .find((candidate) => candidate.sourceAbilityId === pairedAbilityId)
  if (!pairedSkill) return

  const stanceState = arcane.skillStates[twinBladeStanceStateKey()]
  const pairedCooldown = arcane.itemCooldowns[pairedSkill.id] ?? 0
  if (getArcaneAbilityUpgradeSlots(arcane).has('scepter')) {
    const consumesGrace = (stanceState?.graceUntil ?? 0) > state.time
    if (consumesGrace) {
      arcane.skillStates = {
        ...arcane.skillStates,
        [twinBladeStanceStateKey()]: { ...stanceState, graceUntil: 0 },
      }
    }
    if (consumesGrace || pairedCooldown > state.time) return
  }

  const level = Math.max(1, getSimpleSkillLevel(arcane, skill))
  setArcaneSkillCooldown(state, arcane, pairedSkill.id, Math.max(
    pairedCooldown,
    state.time + getSimpleSkillCooldown(skill, level),
  ))
}

export function castRingmasterSouvenirSkill(
  state: SimulationState,
  arcane: Arcane,
  skill: HeroSkillDefinition,
  level: number,
  fallbackTarget?: CombatTarget,
) {
  const sourceAbilityId = skill.sourceAbilityId ?? 0
  if (getRingmasterSouvenirCharges(arcane.skillStates, sourceAbilityId) <= 0) return false
  const manaCost = getSimpleSkillManaCost(arcane, skill, level)
  if (arcane.stats.mana < manaCost) return false

  if (sourceAbilityId === 389) {
    const duration = getSimpleSkillNumericValue(skill, 'illusion_duration', level, 18)
    addTimedEffect(state, arcane, {
      sourceId: `${arcane.id}-${skill.id}-illusion`,
      sourceName: skill.name,
      sourceTeam: arcane.team,
      kind: 'buff',
      polarity: 'positive',
      value: 1,
      modifiers: {
        damagePct: arcane.stats.attackType === 'ranged' ? 0.55 : 0.24,
        attackSpeedPct: 0.08,
      },
      duration,
    })
    finishSimpleSkillCast(state, arcane, skill, manaCost, arcane)
    return true
  }

  if (sourceAbilityId === 392) {
    const target = getSimpleSkillTarget(state, arcane, skill, level, fallbackTarget)
    if (!target || !('player' in target) || target.team !== arcane.team) return false
    const strengthBonus = getSimpleSkillNumericValue(skill, 'strength_bonus_base', level, 5) +
      getSimpleSkillNumericValue(skill, 'strength_bonus_per_level', level, 1) * arcane.stats.level
    const duration = getSimpleSkillNumericValue(skill, 'duration', level, 8)
    addTimedEffect(state, target, {
      sourceId: `${arcane.id}-${skill.id}-strength`,
      sourceName: skill.name,
      sourceTeam: arcane.team,
      kind: 'barrier',
      polarity: 'positive',
      value: strengthBonus * 22,
      modifiers: { damagePct: Math.min(0.15, strengthBonus * 0.004) },
      duration,
    })
    finishSimpleSkillCast(state, arcane, skill, manaCost, target)
    return true
  }

  if (sourceAbilityId === 390) {
    const origin = { ...arcane.pos }
    const hpRatio = arcane.stats.hp / Math.max(1, arcane.stats.maxHp)
    const situation = getPrimarySkillUsageSituation({
      phase: arcane.stats.level <= 8 ? 'early' : arcane.stats.level <= 18 ? 'mid' : 'late',
      aiMode: arcane.aiMode,
      macroDecision: arcane.macroDecision,
      hpRatio,
    })
    const destination = situation === 'retreat' || situation === 'save'
      ? teamInfo[arcane.team].base
      : distance(arcane.pos, arcane.target) > 0.5 ? arcane.target : teamInfo[arcane.team].base
    const travel = getSimpleSkillNumericValue(skill, 'leap_distance', level, 400) / 140
    arcane.pos = clampToMapBounds(moveToward(arcane.pos, destination, travel))
    arcane.target = destination
    const cloudRadius = Math.max(1.5, getSimpleSkillNumericValue(skill, 'fart_cloud_radius', level, 250) / 140)
    const cloudDuration = getSimpleSkillNumericValue(skill, 'fart_cloud_duration', level, 3)
    state.arcanes
      .filter((candidate) => candidate.team !== arcane.team && candidate.stats.hp > 0 && candidate.respawn <= state.time && distance(candidate.pos, origin) <= cloudRadius)
      .forEach((enemy) => addTimedEffect(state, enemy, {
        sourceId: `${arcane.id}-${skill.id}-cloud`,
        sourceName: skill.name,
        sourceTeam: arcane.team,
        kind: 'slow',
        polarity: 'negative',
        value: 0.3,
        duration: cloudDuration,
      }))
    finishSimpleSkillCast(state, arcane, skill, manaCost, arcane)
    return true
  }

  if (sourceAbilityId === 196) {
    const duration = getSimpleSkillNumericValue(skill, 'mount_duration', level, 10)
    addTimedEffect(state, arcane, {
      sourceId: `${arcane.id}-${skill.id}-mount`,
      sourceName: skill.name,
      sourceTeam: arcane.team,
      kind: 'buff',
      polarity: 'positive',
      value: 1,
      modifiers: { moveSpeedPct: 0.6 },
      duration,
    })
    finishSimpleSkillCast(state, arcane, skill, manaCost, arcane)
    return true
  }

  return false
}

function consumeRingmasterSouvenirCharge(arcane: Arcane, sourceAbilityId: number) {
  if (!ringmasterSouvenirAbilityIds.includes(sourceAbilityId as typeof ringmasterSouvenirAbilityIds[number])) return
  const key = ringmasterSouvenirStateKey(sourceAbilityId)
  const current = arcane.skillStates[key]
  if (!current?.charges) return
  const skillStates = { ...arcane.skillStates }
  if (current.charges <= 1) delete skillStates[key]
  else skillStates[key] = { ...current, charges: current.charges - 1 }
  arcane.skillStates = skillStates
}

function isParentSkillStateCreator(skill: HeroSkillDefinition) {
  return [5474, 5486, 5606, 5108].includes(skill.sourceAbilityId ?? 0)
}

export function castStoredRemnantSkill(
  state: SimulationState,
  arcane: Arcane,
  skill: HeroSkillDefinition,
  level: number,
  fallbackTarget: CombatTarget | undefined,
) {
  const remnantState = arcane.skillStates[parentSkillStateKey(5606)]
  if (!remnantState?.positions?.length) return false
  const manaCost = getSimpleSkillManaCost(arcane, skill, level)
  if (arcane.stats.mana < manaCost) return false
  const destination = [...remnantState.positions].sort((left, right) => {
    if (!fallbackTarget) return distance(left, arcane.pos) - distance(right, arcane.pos)
    return distance(left, fallbackTarget.pos) - distance(right, fallbackTarget.pos)
  })[0]
  const from = { ...arcane.pos }
  const radius = Math.max(1.8, getSimpleSkillNumericValue(skill, 'radius', level, 450) / 140)
  const damage = getSimpleSkillDamage(arcane, skill, level)
  const source: CombatSource = {
    id: `${arcane.id}-${skill.id}`,
    label: `${arcane.player}: ${skill.name}`,
    team: arcane.team,
    damageType: getSimpleSkillDamageType(skill),
  }
  const targets: Array<Arcane | Creep | Camp> = [
    ...state.arcanes.filter((target) => target.team !== arcane.team && target.stats.hp > 0 && distance(target.pos, destination) <= radius),
    ...state.creeps.filter((target) => target.team !== arcane.team && target.hp > 0 && distance(target.pos, destination) <= radius),
    ...state.camps.filter((target) => target.hp > 0 && distance(target.pos, destination) <= radius),
  ]
  targets.forEach((target) => damageEntity(state, target.id, damage, source))
  const liveArcane = state.arcanes.find((candidate) => candidate.id === arcane.id) ?? arcane
  liveArcane.pos = { ...destination }
  liveArcane.target = { ...destination }
  state.effects = addAttackEffect(state.effects, {
    kind: 'arcane',
    action: 'skill',
    sourceId: arcane.id,
    targetKind: 'arcane',
    team: arcane.team,
    from,
    to: destination,
    createdAt: state.time,
  })
  finishSimpleSkillCast(state, liveArcane, skill, manaCost, liveArcane)
  if (liveArcane !== arcane) {
    arcane.pos = liveArcane.pos
    arcane.target = liveArcane.target
    arcane.stats = liveArcane.stats
    arcane.skillStates = liveArcane.skillStates
  }
  return true
}

export function getSimpleSkillTarget(
  state: SimulationState,
  arcane: Arcane,
  skill: HeroSkillDefinition,
  level: number,
  fallbackTarget: CombatTarget | undefined,
  preferFallbackTarget = false,
): CombatTarget | undefined {
  if (isPositiveSimpleSkill(skill)) {
    return getSimplePositiveSkillTarget(state, arcane, skill, level)
  }

  const range = getSimpleSkillRange(arcane, skill, level)
  if (
    preferFallbackTarget &&
    fallbackTarget &&
    canTargetWithSimpleDamageSkill(arcane, skill, fallbackTarget) &&
    distance(arcane.pos, fallbackTarget.pos) <= range + getEntityCollisionRadius(fallbackTarget)
  ) {
    return fallbackTarget
  }
  const focusTarget = getCombatFocusTarget(state, arcane)
  if (
    focusTarget &&
    canTargetWithSimpleDamageSkill(arcane, skill, focusTarget) &&
    isPointVisibleToTeam(state, arcane.team, focusTarget.pos) &&
    distance(arcane.pos, focusTarget.pos) <= range + getEntityCollisionRadius(focusTarget)
  ) {
    return focusTarget
  }
  const enemyArcane = nearestVisibleEnemyArcane(
    state,
    arcane.pos,
    arcane.team,
    range + getEntityCollisionRadius(arcane),
  )
  if (enemyArcane) return enemyArcane

  if (
    fallbackTarget &&
    canTargetWithSimpleDamageSkill(arcane, skill, fallbackTarget) &&
    distance(arcane.pos, fallbackTarget.pos) <= range + getEntityCollisionRadius(fallbackTarget)
  ) {
    return fallbackTarget
  }

  return undefined
}

export function getSimplePositiveSkillTarget(
  state: SimulationState,
  arcane: Arcane,
  skill: HeroSkillDefinition,
  level: number,
): Arcane | undefined {
  if (skill.target === 'self') {
    const hpRatio = arcane.stats.hp / Math.max(1, arcane.stats.maxHp)
    const threatened = nearestVisibleEnemyArcane(state, arcane.pos, arcane.team, 12)
    return threatened || hpRatio < 0.78 || arcane.aiMode === 'retreat' ? arcane : undefined
  }
  const range = getSimpleSkillRange(arcane, skill, level)
  const allies = state.arcanes.filter((ally) => (
    ally.team === arcane.team &&
    ally.stats.hp > 0 &&
    ally.respawn <= state.time &&
    (ally.id === arcane.id || distance(arcane.pos, ally.pos) <= range + getEntityCollisionRadius(ally))
  ))

  if (isSimpleHealingSkill(skill) || hasAnySimpleSkillTag(skill, ['regen', 'shield', 'barrier', 'spell_parry'])) {
    const protectedAllyId = getArcaneCombatBlackboard(state, arcane)?.protectedAllyId
    const protectedAlly = allies.find((ally) => (
      ally.id === protectedAllyId &&
      ally.stats.hp / Math.max(1, ally.stats.maxHp) < 0.72
    ))
    if (protectedAlly) return protectedAlly
    return allies
      .filter((ally) => ally.stats.hp / Math.max(1, ally.stats.maxHp) < (ally.id === arcane.id ? 0.78 : 0.66))
      .sort((a, b) => (a.stats.hp / Math.max(1, a.stats.maxHp)) - (b.stats.hp / Math.max(1, b.stats.maxHp)))[0]
  }

  const fighting = nearestVisibleEnemyArcane(
    state,
    arcane.pos,
    arcane.team,
    Math.max(arcane.visionRange * 0.65, 8),
  )

  return fighting ? arcane : undefined
}

export function canTargetWithSimpleDamageSkill(arcane: Arcane, skill: HeroSkillDefinition, target: CombatTarget) {
  if (isStructureLikeTarget(target)) {
    const canDamageBuildings = skill.flags?.affectsBuildings || hasAnySimpleSkillTag(skill, ['affects_buildings', 'building_damage', 'tower_damage'])
    return canDamageBuildings && 'team' in target && 'hp' in target && target.team !== arcane.team && target.hp > 0
  }
  if ('team' in target) return target.team !== arcane.team && ('hp' in target ? target.hp > 0 : true)
  if ('strength' in target) return target.hp > 0
  return isBoss(target) && target.hp > 0
}

export function getSimpleSkillDamage(arcane: Arcane, skill: HeroSkillDefinition, level: number) {
  if (hasAnySimpleSkillTag(skill, ['global_silence'])) return 0
  const baseDamage = getSimpleSkillNumericValue(skill, 'damage', level, 0)
  const scaling = skill.scaling
  if (baseDamage <= 0 && (!scaling?.attribute || !scaling.coefficient)) return 0
  if (!scaling?.attribute || !scaling.coefficient) return Math.round(baseDamage)

  const calculated = calculateHeroStats(getHeroDefinition(arcane.heroDefinitionId), arcane.stats.level, [])
  const attributeValue = scaling.attribute === 'highest'
    ? Math.max(calculated.attributes.strength, calculated.attributes.agility, calculated.attributes.intelligence)
    : scaling.attribute === 'total'
      ? calculated.attributes.totalAttributes
      : scaling.attribute === 'universal'
        ? calculated.attributes.totalAttributes / 3
        : calculated.attributes[scaling.attribute]

  return Math.round(baseDamage + attributeValue * scaling.coefficient)
}

export function getSimpleSkillDamageType(skill: HeroSkillDefinition): CombatDamageType {
  if (skill.damageType === 'physical' || skill.damageType === 'pure') return skill.damageType
  return 'magical'
}

export function applySimplePositiveSkill(
  state: SimulationState,
  caster: Arcane,
  skill: HeroSkillDefinition,
  level: number,
  target: Arcane,
) {
  const profile = getSkillEffectProfile(skill, level)
  applySimpleSkillDispel(state, skill, target, 'negative')
  if (profile.heal > 0 || isSimpleHealingSkill(skill) || hasAnySimpleSkillTag(skill, ['regen'])) {
    const healing = profile.heal || Math.max(75, getSimpleSkillDamage(caster, skill, level) * 0.65)
    const directHealing = profile.isHealingOverTime ? healing * 0.4 : healing
    const appliedHealing = Math.min(Math.round(directHealing), Math.max(0, target.stats.maxHp - target.stats.hp))
    target.stats.hp += appliedHealing
    target.healingReceived += appliedHealing
    const liveCaster = state.arcanes.find((arcane) => arcane.id === caster.id)
    if (liveCaster) liveCaster.healingDone += appliedHealing
    addTimedEffect(state, target, {
      sourceId: `${caster.id}-${skill.id}`,
      sourceName: skill.name,
      sourceTeam: caster.team,
      kind: 'hot',
      polarity: 'positive',
      value: Math.max(8, Math.round((profile.isHealingOverTime ? healing * 0.6 : healing * 0.24) / 3)),
      tickInterval: 1,
      duration: 3,
    })
  }

  if (profile.barrier > 0 || hasAnySimpleSkillTag(skill, ['shield', 'barrier', 'spell_parry'])) {
    addTimedEffect(state, target, {
      sourceId: `${caster.id}-${skill.id}`,
      sourceName: skill.name,
      sourceTeam: caster.team,
      kind: 'barrier',
      polarity: 'positive',
      value: profile.barrier || 90 + level * 45,
      duration: profile.duration,
    })
  }

  if (profile.moveSpeedPct > 0 || profile.isMobility || hasAnySimpleSkillTag(skill, ['haste'])) {
    addTimedEffect(state, target, {
      sourceId: `${caster.id}-${skill.id}`,
      sourceName: skill.name,
      sourceTeam: caster.team,
      kind: 'buff',
      polarity: 'positive',
      value: 1,
      modifiers: { moveSpeedPct: profile.moveSpeedPct || 0.18 },
      duration: profile.duration,
    })
  }

  const selfTransformation = skill.target === 'self' && profile.damage > 0
  const damageBuffPct = hasAnySimpleSkillTag(skill, ['damage_buff'])
    ? Math.min(0.3, Math.max(0.08, profile.damage / 600))
    : 0
  const teamMobility = hasAnySimpleSkillTag(skill, ['stampede', 'global_stealth', 'global_recall'])
  const defensiveState = hasAnySimpleSkillTag(skill, ['untargetable', 'spell_immunity', 'damage_reduction', 'borrowed_life', 'phase_shift', 'global_stealth'])
  if (profile.armorDelta > 0 || profile.attackSpeedPct > 0 || profile.summonCount > 0 || selfTransformation || defensiveState || teamMobility || hasAnySimpleSkillTag(skill, ['armor', 'durable', 'damage_buff'])) {
    addTimedEffect(state, target, {
      sourceId: `${caster.id}-${skill.id}`,
      sourceName: skill.name,
      sourceTeam: caster.team,
      kind: 'buff',
      polarity: 'positive',
      value: 1,
      modifiers: {
        armorFlat: profile.armorDelta || (hasAnySimpleSkillTag(skill, ['armor', 'durable']) ? 2 + level : 0),
        moveSpeedPct: teamMobility ? 0.2 : 0,
        attackSpeedPct: profile.attackSpeedPct + Math.min(0.24, profile.summonCount * 0.03),
        damagePct: Math.min(0.3, damageBuffPct + profile.summonCount * 0.035 + (selfTransformation ? profile.damage / 1000 : 0)),
        incomingDamagePct: defensiveState ? 0.3 : 0,
      },
      duration: profile.summonDuration || profile.duration,
    })
  }

  if (profile.manaDelta > 0) {
    target.stats.mana = Math.min(target.stats.maxMana, target.stats.mana + profile.manaDelta)
  }
}

export function applySimpleNegativeSkillEffects(
  state: SimulationState,
  caster: Arcane,
  skill: HeroSkillDefinition,
  level: number,
  target: Arcane,
) {
  const sourceId = `${caster.id}-${skill.id}`
  const profile = getSkillEffectProfile(skill, level)
  applySimpleSkillDisplacement(caster, target, skill, level)
  if (profile.stunDuration > 0 && !hasAnySimpleSkillTag(skill, ['hex', 'sleep', 'taunt', 'fear'])) {
    addTimedEffect(state, target, {
      sourceId,
      sourceName: skill.name,
      sourceTeam: caster.team,
      kind: 'stun',
      polarity: 'negative',
      value: 1,
      duration: profile.stunDuration,
    })
  }

  if (profile.rootDuration > 0) {
    addTimedEffect(state, target, {
      sourceId,
      sourceName: skill.name,
      sourceTeam: caster.team,
      kind: 'root',
      polarity: 'negative',
      value: 1,
      duration: profile.rootDuration,
    })
  }

  if (profile.slowPct > 0) {
    addTimedEffect(state, target, {
      sourceId,
      sourceName: skill.name,
      sourceTeam: caster.team,
      kind: 'slow',
      polarity: 'negative',
      value: profile.slowPct,
      duration: profile.duration,
    })
  }

  if (profile.silenceDuration > 0) {
    addTimedEffect(state, target, {
      sourceId,
      sourceName: skill.name,
      sourceTeam: caster.team,
      kind: 'silence',
      polarity: 'negative',
      value: 1,
      duration: profile.silenceDuration,
    })
  }

  applySimpleNamedControl(state, caster, skill, target, profile)
  if (target.channeling && getSimpleSkillControlDuration(skill, profile) > 0) {
    target.channeling = undefined
  }

  if (profile.armorDelta < 0) {
    addTimedEffect(state, target, {
      sourceId: `${sourceId}-armor`,
      sourceName: skill.name,
      sourceTeam: caster.team,
      kind: 'buff',
      polarity: 'negative',
      value: 1,
      modifiers: { armorFlat: profile.armorDelta },
      duration: profile.duration,
    })
  }
}

export function applySimpleNamedControl(
  state: SimulationState,
  caster: Arcane,
  skill: HeroSkillDefinition,
  target: Arcane,
  profile: ReturnType<typeof getSkillEffectProfile>,
) {
  const controls: Array<{ tags: string[]; kind: TimedEffect['kind']; duration: number }> = [
    { tags: ['hex'], kind: 'hex', duration: profile.hexDuration },
    { tags: ['sleep'], kind: 'sleep', duration: profile.sleepDuration },
    { tags: ['fear'], kind: 'fear', duration: profile.fearDuration },
    { tags: ['taunt'], kind: 'taunt', duration: profile.tauntDuration },
    { tags: ['disarm'], kind: 'disarm', duration: profile.disarmDuration },
    { tags: ['break'], kind: 'break', duration: profile.breakDuration },
    { tags: ['mute'], kind: 'mute', duration: profile.muteDuration },
  ]
  controls.forEach((control) => {
    if (!hasAnySimpleSkillTag(skill, control.tags) || control.duration <= 0) return
    addTimedEffect(state, target, {
      sourceId: `${caster.id}-${skill.id}-${control.kind}`,
      sourceName: skill.name,
      sourceTeam: caster.team,
      kind: control.kind,
      polarity: 'negative',
      value: 1,
      duration: control.duration,
    })
  })
}

export function addSimpleSkillEffect(state: SimulationState, arcane: Arcane, target: CombatTarget) {
  state.effects = addAttackEffect(state.effects, {
    kind: 'arcane',
    action: 'skill',
    sourceId: arcane.id,
    targetKind: getCombatTargetKind(target),
    team: arcane.team,
    from: arcane.pos,
    to: target.pos,
    createdAt: state.time,
  })
}

export function isPositiveSimpleSkill(skill: HeroSkillDefinition) {
  if (skill.target === 'self') return true
  if (isSimpleHealingSkill(skill)) return true
  const positiveTags = ['regen', 'shield', 'barrier', 'spell_parry', 'armor', 'durable', 'mobility', 'escape', 'haste', 'save', 'cleanse', 'false_promise', 'fate_edict', 'overcharge', 'relocate', 'tether', 'stampede', 'global_stealth', 'global_recall', 'ally_target']
  const negativeTags = ['anti_heal', 'armor_reduction', 'movement_control', 'spell_lockout', 'purge', 'dispel']
  const manaRestore = 'manaValue' in skill.values && !hasAnySimpleSkillTag(skill, ['mana_burn', 'mana_drain'])
  const defensiveUtility = hasAnySimpleSkillTag(skill, ['defensive_utility']) && skill.damageType === 'none' && !hasAnySimpleSkillTag(skill, negativeTags)
  return hasAnySimpleSkillTag(skill, positiveTags) || defensiveUtility || (skill.damageType === 'none' && manaRestore)
}

export function isSimpleHealingSkill(skill: HeroSkillDefinition) {
  return hasAnySimpleSkillTag(skill, [
    'heal',
    'healer',
    'global_heal',
    'armor_heal',
    'heal_damage',
    'heal_nuke',
    'heal_share',
    'heal_over_time',
    'purifying_flames',
  ])
}

export function getCombatTargetById(state: SimulationState, id: string): CombatTarget | undefined {
  const indexes = getSimulationEntityIndexes(state)
  const arcaneIndex = indexes.arcane.get(id)
  if (arcaneIndex !== undefined) return state.arcanes[arcaneIndex]
  const creepIndex = indexes.creep.get(id)
  if (creepIndex !== undefined) return state.creeps[creepIndex]
  const summonIndex = indexes.summon.get(id)
  if (summonIndex !== undefined) return state.summons[summonIndex]
  const towerIndex = indexes.tower.get(id)
  if (towerIndex !== undefined) return state.towers[towerIndex]
  const structureIndex = indexes.structure.get(id)
  if (structureIndex !== undefined) return state.structures[structureIndex]
  const baseIndex = indexes.base.get(id)
  if (baseIndex !== undefined) return state.bases[baseIndex]
  const campIndex = indexes.camp.get(id)
  if (campIndex !== undefined) return state.camps[campIndex]
  return state.boss.id === id ? state.boss : undefined
}

export function getRetainedArcaneCombatTarget(state: SimulationState, arcane: Arcane) {
  if (!arcane.combatTargetId || !arcane.combatTargetIntent) return undefined
  const target = getCombatTargetById(state, arcane.combatTargetId)
  if (!target || ('player' in target ? target.stats.hp <= 0 : target.hp <= 0)) return undefined
  if (distanceSquared(arcane.pos, target.pos) > getArcaneAttackCenterRange(arcane, target) ** 2) return undefined

  const intent = arcane.combatTargetIntent
  if ('player' in target) {
    if (target.team === arcane.team || target.respawn > state.time || !isPointVisibleToTeam(state, arcane.team, target.pos)) return undefined
  }

  if (intent === 'last_hit') {
    if (!('type' in target) || target.team === arcane.team) return undefined
    return getLastHitCandidateFromCreeps(state, arcane, [target], 1.06, true) ? { target, intent } : undefined
  }
  if (intent === 'deny') {
    if (!('type' in target) || target.team !== arcane.team) return undefined
    return getDenyCandidateFromCreeps(arcane, [target], true) ? { target, intent } : undefined
  }
  if (intent === 'focus') {
    const board = getArcaneCombatBlackboard(state, arcane)
    return 'player' in target && board?.primaryTargetId === target.id ? { target, intent } : undefined
  }
  if (intent === 'objective') {
    if (!isObjectiveMicroDecision(arcane.microDecision) || !('team' in target) || target.team === arcane.team) return undefined
    const unlocked = 'tier' in target
      ? isTowerUnlocked(state, arcane.team, target)
      : 'kind' in target
        ? isStructureUnlocked(state, arcane.team, target)
        : isEnemyBaseUnlocked(state, arcane.team)
    return unlocked ? { target, intent } : undefined
  }
  if (intent === 'camp') {
    return 'strength' in target && (isJungleFarmMicroDecision(arcane.microDecision) || isLanePullMicroDecision(arcane.microDecision))
      ? { target, intent }
      : undefined
  }
  if (intent === 'boss') {
    return isBoss(target) && arcane.microDecision.startsWith('Atacar chefe') ? { target, intent } : undefined
  }

  if (arcane.aiMode === 'retreat' || arcane.macroDecision.startsWith('Recuar') || isObjectiveMicroDecision(arcane.microDecision)) return undefined
  if ('player' in target) {
    const board = getArcaneCombatBlackboard(state, arcane)
    if (board?.primaryTargetId && board.primaryTargetId !== target.id) return undefined
    return { target, intent }
  }
  if ('type' in target && target.team !== arcane.team) {
    if (isLaningControlMicroDecision(arcane.microDecision) && target.lane === arcane.lane) return undefined
    return { target, intent }
  }
  if ('ownerId' in target && target.team !== arcane.team && target.expiresAt > state.time) {
    return { target, intent }
  }
  return undefined
}

export function hasSimpleStatusTag(skill: HeroSkillDefinition) {
  return hasAnySimpleSkillTag(skill, ['stun', 'disable', 'taunt', 'slow', 'silence', 'anti_magic', 'root', 'net', 'leash', 'hex', 'sleep', 'fear', 'disarm', 'break', 'mute'])
}

export function hasAnySimpleSkillTag(skill: HeroSkillDefinition, tags: string[]) {
  return tags.some((tag) => skill.tags.includes(tag))
}

export function resolveCombat(
  state: SimulationState,
  frameContext: TickFrameContext,
  actorFilter?: ReadonlySet<string>,
): SimulationState {
  const next = state
  const pregame = next.time < 0
  const enemyCreepIndicesByTeam: Record<TeamId, number[]> = { dawn: [], dusk: [] }
  const creepIndicesByTeamLane: Record<TeamId, Record<LaneId, number[]>> = {
    dawn: { top: [], mid: [], bot: [] },
    dusk: { top: [], mid: [], bot: [] },
  }
  const needsCreepCombatIndexes = !actorFilter ||
    next.arcanes.some((arcane) => actorFilter.has(arcane.id)) ||
    next.towers.some((tower) => actorFilter.has(tower.id)) ||
    next.structures.some((structure) => actorFilter.has(structure.id))
  if (needsCreepCombatIndexes) {
    for (let index = 0; index < next.creeps.length; index += 1) {
      const creep = next.creeps[index]
      enemyCreepIndicesByTeam[creep.team === 'dawn' ? 'dusk' : 'dawn'].push(index)
      creepIndicesByTeamLane[creep.team][creep.lane].push(index)
    }
  }

  next.creeps.forEach((creep) => {
    if (actorFilter && !actorFilter.has(creep.id)) return
    if (pregame) return
    if (creep.motionPlan?.kind === 'route') return
    if (next.time < creep.lastAttack + 1.25) return
    const target = getCachedRouteCreepTarget(creep, next, 'attack', frameContext)
    if (target) {
      if (!isCachedRouteCreepAttackTargetValid(creep, target, next)) return
      creep.lastAttack = next.time
      if (next.creepComponents) syncCreepAttackSchedule(next.creepComponents, creep)
      next.effects = addAttackEffect(next.effects, {
        kind: 'creep',
        action: 'attack',
        sourceId: creep.id,
        targetKind: getCombatTargetKind(target),
        team: creep.team,
        from: creep.pos,
        to: target.pos,
        createdAt: next.time,
      })
      damageEntity(next, target.id, creep.damage, {
        id: creep.id,
        label: `Creep de ${laneNames[creep.lane]}`,
        team: creep.team,
        damageType: getCreepDamageType(creep),
      })
    }
  })

  for (const summon of next.summons) {
    if (actorFilter && !actorFilter.has(summon.id)) continue
    if (pregame || !summon.canAttack || summon.hp <= 0 || summon.expiresAt <= next.time) continue
    if (next.time < summon.lastAttack + getEffectiveSummonAttackInterval(next, summon)) continue
    const target = summon.targetId ? getCombatTargetById(next, summon.targetId) : undefined
    if (!target || !isSummonTargetValid(next, summon, target)) continue
    const attackRange = getSummonAttackCenterRange(summon, target)
    if (distanceSquared(summon.pos, target.pos) > attackRange * attackRange) continue
    summon.lastAttack = next.time
    const explodingImp = summon.sourceSkillId === eldritchSummoningSkillId
    next.effects = addAttackEffect(next.effects, {
      kind: 'creep',
      action: explodingImp ? 'skill' : 'attack',
      sourceId: summon.id,
      targetKind: getCombatTargetKind(target),
      team: summon.team,
      from: summon.pos,
      to: target.pos,
      createdAt: next.time,
    })
    if (explodingImp) {
      resolveSummonExplosion(next, summon)
      continue
    }
    damageEntity(next, target.id, summon.damage, {
      id: summon.id,
      label: summon.name,
      team: summon.team,
      damageType: 'physical',
    })
    applySpiritLinkSummonLifesteal(next, summon, target, summon.damage)
    applySummonAttackSpecials(next, summon, target)
  }

  for (const tower of next.towers) {
    if (actorFilter && !actorFilter.has(tower.id)) continue
    if (pregame) break
    if (tower.hp <= 0) continue
    if (next.time < tower.lastAttack + 1.2) continue
    const aggroTarget = tower.aggroUntil && tower.aggroUntil > next.time
      ? next.arcanes.find((arcane) => arcane.id === tower.aggroTargetId && arcane.stats.hp > 0 && arcane.respawn <= next.time && distance(tower.pos, arcane.pos) <= tower.range)
      : undefined
    const target = aggroTarget
      ?? nearestCreepAtIndices(tower.pos, next.creeps, enemyCreepIndicesByTeam[tower.team], tower.range, next.time)
      ?? nearest(tower.pos, next.summons.filter((summon) => summon.team !== tower.team && summon.hp > 0), tower.range)
      ?? nearestAliveEnemyArcane(tower.pos, next.arcanes, tower.team, next.time, tower.range)
    if (target) {
      tower.lastAttack = next.time
      if ('player' in target) {
        tower.aggroTargetId = target.id
        tower.aggroUntil = next.time + 2.6
      }
      next.effects = addAttackEffect(next.effects, {
        kind: 'tower',
        action: 'attack',
        sourceId: tower.id,
        targetKind: getCombatTargetKind(target),
        team: tower.team,
        from: tower.pos,
        to: target.pos,
        createdAt: next.time,
      })
      damageEntity(next, target.id, tower.damage, {
        id: tower.id,
        label: `Torre T${tower.tier}`,
        team: tower.team,
        damageType: 'physical',
      })
    }
  }

  for (const structure of next.structures) {
    if (actorFilter && !actorFilter.has(structure.id)) continue
    if (pregame) break
    if (structure.kind !== 'tower_tier_4' || structure.hp <= 0) continue
    if (next.time < structure.lastAttack + 1.05) continue
    const aggroTarget = structure.aggroUntil && structure.aggroUntil > next.time
      ? next.arcanes.find((arcane) => arcane.id === structure.aggroTargetId && arcane.stats.hp > 0 && arcane.respawn <= next.time && distance(structure.pos, arcane.pos) <= structure.range)
      : undefined
    const target = aggroTarget
      ?? nearestCreepAtIndices(structure.pos, next.creeps, enemyCreepIndicesByTeam[structure.team], structure.range, next.time)
      ?? nearest(structure.pos, next.summons.filter((summon) => summon.team !== structure.team && summon.hp > 0), structure.range)
      ?? nearestAliveEnemyArcane(structure.pos, next.arcanes, structure.team, next.time, structure.range)
    if (target) {
      structure.lastAttack = next.time
      next.effects = addAttackEffect(next.effects, {
        kind: 'tower',
        action: 'attack',
        sourceId: structure.id,
        targetKind: getCombatTargetKind(target),
        team: structure.team,
        from: structure.pos,
        to: target.pos,
        createdAt: next.time,
      })
      damageEntity(next, target.id, structure.damage, {
        id: structure.id,
        label: 'Torre T4',
        team: structure.team,
        damageType: 'physical',
      })
    }
  }

  for (const camp of next.camps) {
    if (actorFilter && !actorFilter.has(camp.id)) continue
    if (pregame) break
    if (camp.hp <= 0) continue
    if (next.time < camp.lastAttack + 1.35) continue
    const leashRange = Math.max(8, camp.range + 2.5)
    const aggroArcane = camp.aggroUntil && camp.aggroUntil > next.time
      ? next.arcanes.find((arcane) => (
          arcane.id === camp.aggroTargetId &&
          arcane.stats.hp > 0 &&
          arcane.respawn <= next.time &&
          distance(camp.pos, arcane.pos) <= leashRange
        ))
      : undefined
    const aggroCreep = camp.aggroUntil && camp.aggroUntil > next.time
      ? next.creeps.find((creep) => (
          creep.id === camp.aggroTargetId &&
          creep.hp > 0 &&
          creep.pullCampId === camp.id &&
          (creep.pullUntil ?? 0) > next.time &&
          distance(camp.pos, creep.pos) <= leashRange
        ))
      : undefined
    const pulledCreep = nearest(
      camp.pos,
      next.creeps.filter((creep) => creep.hp > 0 && creep.pullCampId === camp.id && (creep.pullUntil ?? 0) > next.time),
      camp.range,
    )
    const target = aggroArcane ?? aggroCreep ?? pulledCreep
      ?? (camp.aggroUntil && camp.aggroUntil > next.time
        ? nearestAliveArcane(camp.pos, next.arcanes, next.time, leashRange)
        : nearestAliveArcane(camp.pos, next.arcanes, next.time, camp.range))
    if (target) {
      camp.lastAttack = next.time
      camp.aggroTargetId = target.id
      camp.aggroUntil = next.time + 8
      next.effects = addAttackEffect(next.effects, {
        kind: 'neutral',
        action: 'attack',
        sourceId: camp.id,
        targetKind: getCombatTargetKind(target),
        team: target.team === 'dawn' ? 'dusk' : 'dawn',
        from: camp.pos,
        to: target.pos,
        createdAt: next.time,
      })
      damageEntity(next, target.id, camp.damage, {
        id: camp.id,
        label: camp.name,
        team: target.team === 'dawn' ? 'dusk' : 'dawn',
        damageType: 'physical',
      })
      if ('player' in target) {
        addTimedEffect(next, target, {
          sourceId: camp.id,
          sourceName: camp.name,
          sourceTeam: target.team === 'dawn' ? 'dusk' : 'dawn',
          kind: 'slow',
          polarity: 'negative',
          value: camp.strength === 'strong' ? 0.22 : camp.strength === 'medium' ? 0.16 : 0.1,
          duration: camp.strength === 'strong' ? 1.6 : 1.15,
        })
      }
    }
  }

  if (
    (!actorFilter || actorFilter.has(next.boss.id)) &&
    !pregame &&
    next.boss.hp > 0 &&
    next.boss.aggroUntil &&
    next.boss.aggroUntil > next.time &&
    next.time >= next.boss.lastAttack + 1.05
  ) {
    const bossLeashRange = Math.max(10, next.boss.range + 3.5)
    const aggroTarget = next.arcanes.find((arcane) => (
      arcane.id === next.boss.aggroTargetId &&
      arcane.stats.hp > 0 &&
      arcane.respawn <= next.time &&
      distance(next.boss.pos, arcane.pos) <= bossLeashRange
    ))
    const target = aggroTarget ?? nearestAliveArcane(next.boss.pos, next.arcanes, next.time, bossLeashRange)
    if (target) {
      next.boss.lastAttack = next.time
      next.boss.aggroTargetId = target.id
      next.boss.aggroUntil = next.time + 8
      next.effects = addAttackEffect(next.effects, {
        kind: 'neutral',
        action: 'attack',
        sourceId: next.boss.id,
        targetKind: getCombatTargetKind(target),
        team: target.team === 'dawn' ? 'dusk' : 'dawn',
        from: next.boss.pos,
        to: target.pos,
        createdAt: next.time,
      })
      damageEntity(next, target.id, next.boss.damage, {
        id: next.boss.id,
        label: next.boss.name,
        team: target.team === 'dawn' ? 'dusk' : 'dawn',
        damageType: 'physical',
      })
      addTimedEffect(next, target, {
        sourceId: next.boss.id,
        sourceName: next.boss.name,
        sourceTeam: target.team === 'dawn' ? 'dusk' : 'dawn',
        kind: 'stun',
        polarity: 'negative',
        value: 1,
        duration: 0.55,
      })
      addTimedEffect(next, target, {
        sourceId: next.boss.id,
        sourceName: next.boss.name,
        sourceTeam: target.team === 'dawn' ? 'dusk' : 'dawn',
        kind: 'slow',
        polarity: 'negative',
        value: 0.34,
        duration: 2.2,
      })
      addTimedEffect(next, target, {
        sourceId: `${next.boss.id}-venom`,
        sourceName: `${next.boss.name} veneno`,
        sourceTeam: target.team === 'dawn' ? 'dusk' : 'dawn',
        kind: 'dot',
        polarity: 'negative',
        value: 16,
        damageType: 'magical',
        tickInterval: 1,
        duration: 3,
      })
    }
  }

  next.arcanes.forEach((arcane) => {
    if (actorFilter && !actorFilter.has(arcane.id)) return
    if (arcane.stats.hp <= 0 || arcane.respawn > next.time) return
    if (arcane.channeling) return
    if (isArcaneAttackDisabled(next, arcane)) return
    if (pregame && (arcane.microDecision.startsWith('Cedendo runa') || arcane.microDecision.startsWith('Aguardando janela segura'))) return
    if (next.time + 0.0001 < arcane.nextCombatEvaluationAt) return
    arcane.nextCombatEvaluationAt = next.time + arcaneCombatEvaluationIntervalSeconds
    const attackCooldown = getEffectiveArcaneAttackCooldown(next, arcane)
    const attackReady = next.time - arcane.lastAttack >= attackCooldown
    const runtimeSkills = attackReady ? undefined : getArcaneRuntimeSkills(arcane)
    if (!attackReady && !hasAnyCastableSkill(next, arcane, runtimeSkills)) return
    const retainedTarget = getRetainedArcaneCombatTarget(next, arcane)
    const canAttackBoss = !pregame && next.boss.hp > 0 && arcane.microDecision.startsWith('Atacar chefe')
    const bossTarget = retainedTarget ? undefined : canAttackBoss && distance(arcane.pos, next.boss.pos) <= getArcaneAttackCenterRange(arcane, next.boss) ? next.boss : undefined
    const objectiveTarget = retainedTarget || pregame ? undefined : getFocusedObjectiveTarget(next, arcane)
    const enemyTeam = arcane.team === 'dawn' ? 'dusk' : 'dawn'
    const pullingLane = isLanePullMicroDecision(arcane.microDecision)
    const farmingJungle = isJungleFarmMicroDecision(arcane.microDecision) || pullingLane
    const lastHitTarget = retainedTarget || pregame || farmingJungle ? undefined : getLastHitTarget(next, arcane, creepIndicesByTeamLane[enemyTeam][arcane.lane])
    const denyTarget = retainedTarget || pregame || farmingJungle ? undefined : getDenyTarget(next, arcane, creepIndicesByTeamLane[arcane.team][arcane.lane])
    const laneControl = isLaningControlMicroDecision(arcane.microDecision)
    const rangedCreepSkillTarget = !retainedTarget && !pregame && laneControl && !lastHitTarget
      ? getRangedCreepSkillSecureTarget(
          next,
          arcane,
          creepIndicesByTeamLane[enemyTeam][arcane.lane].map((index) => next.creeps[index]),
        )
      : undefined
    const focusTarget = retainedTarget ? undefined : getCombatFocusTarget(next, arcane)
    const reachableFocusTarget = focusTarget && distance(arcane.pos, focusTarget.pos) <= getArcaneAttackCenterRange(arcane, focusTarget)
      ? focusTarget
      : undefined
    const protectsLastHitWindow = retainedTarget?.intent === 'last_hit' || (laneControl || arcane.aiMode === 'farm_lane') && lastHitTarget !== undefined
    let target: CombatTarget | undefined = retainedTarget?.target ?? bossTarget ?? objectiveTarget ?? (
      protectsLastHitWindow
        ? lastHitTarget
        : reachableFocusTarget ?? lastHitTarget ?? denyTarget
    )
    if (!target) {
      const enemyArcaneTarget = nearestReachableEnemyArcane(next, arcane, next.arcanes)
      const fallbackEnemyCreeps: Creep[] = []
      for (const index of enemyCreepIndicesByTeam[arcane.team]) {
        const creep = next.creeps[index]
        if (!laneControl || creep.lane !== arcane.lane) fallbackEnemyCreeps.push(creep)
      }
      const intendedCamp = !pregame && farmingJungle
        ? nearest(arcane.target, next.camps.filter((camp) => camp.hp > 0), 7)
        : undefined
      const campTarget = intendedCamp && distance(arcane.pos, intendedCamp.pos) <= getArcaneAttackCenterRange(arcane, intendedCamp)
        ? intendedCamp
        : farmingJungle
          ? nearestReachableByArcane(arcane, next.camps.filter((camp) => camp.hp > 0))
          : undefined
      const enemySummonTarget = nearestReachableByArcane(arcane, next.summons.filter((summon) => (
        summon.team !== arcane.team && summon.hp > 0 && summon.expiresAt > next.time
      )))
      target = enemyArcaneTarget ?? campTarget ?? enemySummonTarget ?? nearestReachableByArcane(arcane, [
        ...fallbackEnemyCreeps,
        ...(canAttackBoss ? [next.boss] : []),
      ])
    }
    const targetIntent: ArcaneCombatTargetIntent | undefined = retainedTarget?.intent ?? (
      !target ? undefined
        : target.id === bossTarget?.id ? 'boss'
          : target.id === objectiveTarget?.id ? 'objective'
            : target.id === lastHitTarget?.id ? 'last_hit'
              : target.id === denyTarget?.id ? 'deny'
                : target.id === reachableFocusTarget?.id ? 'focus'
                  : 'strength' in target ? 'camp' : 'fallback'
    )
    arcane.combatTargetId = target?.id
    arcane.combatTargetIntent = targetIntent
    if (rangedCreepSkillTarget && tryCastRangedCreepSecureSkill(next, arcane, rangedCreepSkillTarget)) return
    if (!protectsLastHitWindow && tryCastSimpleSkill(next, arcane, target, runtimeSkills)) return
    if (!target || next.time - arcane.lastAttack < attackCooldown) return

    performArcaneBasicAttack(next, arcane, target)
  })

  return next
}

export type ItemAttackResolution = {
  physicalDamage: number
  magicDamage: number
  lifestealPct: number
  cleavePct: number
  multiTargetPct: number
  effects: RuntimeItemEffect[]
}

export function resolveArcaneItemAttackEffects(state: SimulationState, arcane: Arcane, target: CombatTarget): ItemAttackResolution {
  const effects = getArcaneItemEffects(arcane, ['passive', 'toggle'])
  const passiveSkills = getArcanePassiveCombatModifiers(state, arcane)
  let physicalDamage = getEffectiveArcaneDamage(state, arcane)
  let magicDamage = 0
  let lifestealPct = Math.max(
    getItemPassiveNumber(effects, ['lifesteal', 'lifesteal_amp'], 'lifestealPct') ?? 0,
    passiveSkills.lifestealPct * 100,
  )
  let cleavePct = 0
  let multiTargetPct = 0

  for (const effect of effects) {
    const tags = effect.tags
    if (hasAnyItemTag(tags, ['critical', 'critical_scaling']) && rollChance(state, getItemEffectChance(effect, arcane), `${arcane.id}:${target.id}:${effect.effectId}:critical`)) {
      const multiplier = (getActiveItemNumber(effect.values, 'critMultiplier') ?? 160) / 100
      physicalDamage *= multiplier
    }
    if (hasAnyItemTag(tags, ['attack_proc', 'magic_damage', 'magical', 'chain_lightning']) && rollChance(state, getItemEffectChance(effect, arcane), `${arcane.id}:${target.id}:${effect.effectId}:magic-proc`)) {
      magicDamage += getItemProcDamage(arcane, effect)
    }
    if (hasAnyItemTag(tags, ['bash']) && rollChance(state, getItemEffectChance(effect, arcane), `${arcane.id}:${target.id}:${effect.effectId}:bash-damage`)) {
      magicDamage += getActiveItemNumber(effect.values, 'bonusDamage') ?? 60
    }
    if (hasAnyItemTag(tags, ['mana_burn']) && 'player' in target) {
      const burn = getActiveItemNumber(effect.values, 'manaBurn') ?? 28
      target.stats.mana = Math.max(0, target.stats.mana - burn)
      physicalDamage += burn * ((getActiveItemNumber(effect.values, 'damageFromBurnPct') ?? 80) / 100)
    }
    if (hasAnyItemTag(tags, ['cleave']) && arcane.stats.attackType === 'melee') {
      cleavePct = Math.max(cleavePct, getActiveItemNumber(effect.values, 'cleavePct') ?? 35)
    }
    if (hasAnyItemTag(tags, ['multi_target_attack', 'extra_projectiles']) && arcane.stats.attackType === 'ranged' && rollChance(state, getItemEffectChance(effect, arcane), `${arcane.id}:${target.id}:${effect.effectId}:multi-target`)) {
      multiTargetPct = Math.max(multiTargetPct, getActiveItemNumber(effect.values, 'damagePct') ?? 55)
    }
  }

  return {
    physicalDamage,
    magicDamage,
    lifestealPct,
    cleavePct,
    multiTargetPct,
    effects,
  }
}

export function applyPostAttackItemEffects(
  state: SimulationState,
  arcane: Arcane,
  target: CombatTarget,
  resolution: ItemAttackResolution,
  dealtPhysicalDamage: number,
) {
  if (resolution.magicDamage > 0) {
    damageEntity(state, target.id, resolution.magicDamage, {
      id: `${arcane.id}-item-proc`,
      label: `${arcane.player}: proc item`,
      team: arcane.team,
      damageType: 'magical',
    })
  }

  if ('player' in target) {
    applyItemAttackDebuffs(state, arcane, target, resolution.effects)
  }

  if (resolution.lifestealPct > 0 && dealtPhysicalDamage > 0) {
    arcane.stats.hp = Math.min(arcane.stats.maxHp, arcane.stats.hp + dealtPhysicalDamage * (resolution.lifestealPct / 100))
  }

  if (resolution.cleavePct > 0 || resolution.multiTargetPct > 0) {
    const splashPct = Math.max(resolution.cleavePct, resolution.multiTargetPct)
    const splashTargets = getItemSplashTargets(state, arcane, target).slice(0, resolution.multiTargetPct > 0 ? 3 : 5)
    splashTargets.forEach((splashTarget) => damageEntity(state, splashTarget.id, dealtPhysicalDamage * (splashPct / 100), {
      id: `${arcane.id}-item-splash`,
      label: `${arcane.player}: ataque em area`,
      team: arcane.team,
      damageType: 'physical',
    }))
  }
}

export function applyItemAttackDebuffs(state: SimulationState, arcane: Arcane, target: Arcane, effects: RuntimeItemEffect[]) {
  effects.forEach((effect) => {
    const tags = effect.tags
    if (hasAnyItemTag(tags, ['slow', 'attack_modifier'])) {
      const slowPct = getActiveItemNumber(effect.values, 'slowPct') ??
        getActiveItemNumber(effect.values, 'moveSlowPct') ??
        0
      if (slowPct > 0) {
        addTimedEffect(state, target, {
          sourceId: effect.effectId,
          sourceName: `${arcane.player} item`,
          sourceTeam: arcane.team,
          kind: 'slow',
          polarity: 'negative',
          value: Math.min(0.8, slowPct / 100),
          duration: getActiveItemNumber(effect.values, 'duration') ?? 2.5,
        })
      }
    }
    if (hasAnyItemTag(tags, ['armor_reduction'])) {
      addTimedEffect(state, target, {
        sourceId: effect.effectId,
        sourceName: `${arcane.player} item`,
        sourceTeam: arcane.team,
        kind: 'buff',
        polarity: 'negative',
        value: 1,
        modifiers: { armorFlat: -(getActiveItemNumber(effect.values, 'armorReduction') ?? 2) },
        duration: getActiveItemNumber(effect.values, 'duration') ?? 5,
      })
    }
    if (hasAnyItemTag(tags, ['dot', 'max_health_dot'])) {
      const dps = getActiveItemNumber(effect.values, 'dps') ??
        target.stats.maxHp * ((getActiveItemNumber(effect.values, 'maxHealthDpsPct') ?? 0) / 100)
      if (dps > 0) {
        addTimedEffect(state, target, {
          sourceId: effect.effectId,
          sourceName: `${arcane.player} item`,
          sourceTeam: arcane.team,
          kind: 'dot',
          polarity: 'negative',
          value: dps,
          damageType: 'magical',
          tickInterval: 1,
          duration: getActiveItemNumber(effect.values, 'duration') ?? 3,
        })
      }
    }
    if (hasAnyItemTag(tags, ['bash']) && rollChance(state, getItemEffectChance(effect, arcane), `${arcane.id}:${target.id}:${effect.effectId}:bash-stun`)) {
      addTimedEffect(state, target, {
        sourceId: effect.effectId,
        sourceName: `${arcane.player} item`,
        sourceTeam: arcane.team,
        kind: 'stun',
        polarity: 'negative',
        value: 1,
        duration: getActiveItemNumber(effect.values, 'stun') ?? 0.8,
      })
    }
    if (hasAnyItemTag(tags, ['spell_damage_reduction', 'magic_resistance_reduction'])) {
      addTimedEffect(state, target, {
        sourceId: effect.effectId,
        sourceName: `${arcane.player} item`,
        sourceTeam: arcane.team,
        kind: 'buff',
        polarity: 'negative',
        value: 1,
        modifiers: { damagePct: -0.08 },
        duration: getActiveItemNumber(effect.values, 'duration') ?? 4,
      })
    }
  })
}

export function getItemSplashTargets(state: SimulationState, arcane: Arcane, primaryTarget: CombatTarget): CombatTarget[] {
  const candidates: CombatTarget[] = [
    ...state.arcanes.filter((target) => target.team !== arcane.team && target.id !== primaryTarget.id && target.stats.hp > 0 && target.respawn <= state.time),
    ...state.creeps.filter((target) => target.team !== arcane.team && target.id !== primaryTarget.id && target.hp > 0),
    ...state.summons.filter((target) => target.team !== arcane.team && target.id !== primaryTarget.id && target.hp > 0),
    ...state.camps.filter((target) => target.id !== primaryTarget.id && target.hp > 0),
  ]
  return candidates
    .filter((target) => distance(target.pos, primaryTarget.pos) <= 5.5)
    .sort((a, b) => distance(a.pos, primaryTarget.pos) - distance(b.pos, primaryTarget.pos))
}

export function getArcaneItemEffects(arcane: Arcane, kinds?: string[]) {
  const kindSet = kinds ? new Set(kinds) : undefined
  return getShopItemsForInventory(arcane.items)
    .flatMap((item) => item.effects)
    .filter((effect) => !kindSet || kindSet.has(effect.kind))
}

export function getShopItemsForInventory(items: string[]) {
  const cached = shopItemsByInventory.get(items)
  if (cached) return cached
  const resolved = items.flatMap((name) => {
    const item = shopItemByName.get(name)
    return item ? [item] : []
  })
  shopItemsByInventory.set(items, resolved)
  return resolved
}

export function getItemPassiveNumber(effects: RuntimeItemEffect[], tags: string[], key: string) {
  return effects
    .filter((effect) => hasAnyItemTag(effect.tags, tags))
    .map((effect) => getActiveItemNumber(effect.values, key) ?? 0)
    .reduce((best, value) => Math.max(best, value), 0)
}

export function getItemEffectChance(effect: RuntimeItemEffect, arcane: Arcane) {
  const chance = arcane.stats.attackType === 'ranged'
    ? getActiveItemNumber(effect.values, 'chanceRangedPct')
    : getActiveItemNumber(effect.values, 'chanceMeleePct')
  return chance ?? getActiveItemNumber(effect.values, 'chancePct') ?? 100
}

export function getItemProcDamage(arcane: Arcane, effect: RuntimeItemEffect) {
  const baseDamage = getActiveItemNumber(effect.values, 'damage') ??
    getActiveItemNumber(effect.values, 'procDamage') ??
    getActiveItemNumber(effect.values, 'baseDamage') ??
    0
  const intPct = getActiveItemNumber(effect.values, 'damageFromIntPct') ?? 0
  if (intPct <= 0) return baseDamage
  const hero = getHeroDefinition(arcane.heroDefinitionId)
  const calculated = calculateHeroStats(hero, arcane.stats.level, getItemStatModifiers(arcane.items, hero))
  return baseDamage + calculated.attributes.intelligence * (intPct / 100)
}

export function rollChance(state: SimulationState, chancePct: number, salt: string) {
  return seededRandomUnit(state.matchSeed, `${salt}:${state.time.toFixed(3)}`) * 100 < chancePct
}

export function applyTowerAggro(state: SimulationState, defendingTeam: TeamId, attackerId: string) {
  const attacker = state.arcanes.find((arcane) => arcane.id === attackerId)
  if (!attacker) return

  state.towers = state.towers.map((tower) => {
    if (tower.team !== defendingTeam || tower.hp <= 0 || distance(tower.pos, attacker.pos) > tower.range) {
      return tower
    }

    return {
      ...tower,
      aggroTargetId: attackerId,
      aggroUntil: state.time + 4,
    }
  })

  state.structures = state.structures.map((structure) => {
    if (structure.kind !== 'tower_tier_4' || structure.team !== defendingTeam || structure.hp <= 0 || distance(structure.pos, attacker.pos) > structure.range) {
      return structure
    }

    return {
      ...structure,
      aggroTargetId: attackerId,
      aggroUntil: state.time + 4,
    }
  })
}

export function applyCreepAggro(state: SimulationState, defendingTeam: TeamId, attackerId: string) {
  const attacker = state.arcanes.find((arcane) => arcane.id === attackerId)
  if (!attacker) return

  if (state.creepStorageMode === 'soa') {
    for (let index = 0; index < state.creeps.length; index += 1) {
      const creep = state.creeps[index]
      if (creep.team !== defendingTeam || distance(creep.pos, attacker.pos) > creep.range) continue
      const replacement = {
        ...creep,
        aggroTargetId: attackerId,
        aggroUntil: state.time + 3.2,
        motionPlan: undefined,
      }
      state.creeps[index] = state.creepComponents
        ? replaceCreepComponentFacade(state.creepComponents, creep, replacement)
        : replacement
    }
    return
  }

  state.creeps = state.creeps.map((creep) => {
    if (creep.team !== defendingTeam || distance(creep.pos, attacker.pos) > creep.range) {
      return creep
    }

    return {
      ...creep,
      aggroTargetId: attackerId,
      aggroUntil: state.time + 3.2,
      motionPlan: undefined,
    }
  })
}

export function getCreepGoldReward(creep: Creep) {
  return creep.goldReward
}

export function getCreepXpReward(creep: Creep, time = 0) {
  return scaledExperienceReward(creep.xpReward, time)
}

export function getCreepVisionRange(creep: Creep) {
  return creep.visionRange
}

export function getCreepDisplayName(creep: Creep) {
  if (creep.type === 'mage') return 'Creep ranged'
  if (creep.type === 'siege') return 'Creep siege'
  if (creep.type === 'flagbearer') return 'Creep bandeira'
  return 'Creep melee'
}

export function isMeleeCreep(creep: Creep) {
  return creep.type === 'melee' || creep.type === 'flagbearer'
}

export function getCreepDamageType(creep: Creep): CombatDamageType {
  return creep.type === 'mage' ? 'magical' : 'physical'
}

export function getCreepLaneValue(creep: Creep) {
  if (creep.type === 'siege') return 5
  if (creep.type === 'mage') return 3.6
  if (creep.type === 'flagbearer') return 3
  return 2.4
}

export function getCreepPressureValue(creep: Creep) {
  if (creep.type === 'siege') return 1.8
  if (creep.type === 'mage') return 1.4
  if (creep.type === 'flagbearer') return 1.2
  return 1
}

export function getCreepAttackCycle(creep: Creep) {
  if (creep.type === 'siege') return 2.7
  return isMeleeCreep(creep) ? 1.35 : 1.7
}

export function getCreepXpRecipients(state: SimulationState, creep: Creep) {
  return state.arcanes.filter((arcane) => (
    arcane.team !== creep.team &&
    arcane.stats.hp > 0 &&
    arcane.respawn <= state.time &&
    distance(arcane.pos, creep.pos) <= getCreepVisionRange(creep)
  ))
}

export function getCreepXpShare(state: SimulationState, creep: Creep, arcane: Arcane) {
  const recipients = getCreepXpRecipients(state, creep)
  if (!recipients.some((recipient) => recipient.id === arcane.id)) return 0
  const getWeight = (recipient: Arcane) => {
    if (recipient.role === 'Safe Lane') return 1.35
    if (recipient.role === 'Mid') return 1.25
    if (recipient.role === 'Offlane') return 1.3
    if (recipient.role === 'Greedy Support') return 0.55
    return 0.45
  }
  const totalWeight = recipients.reduce((sum, recipient) => sum + getWeight(recipient), 0)
  return getWeight(arcane) / Math.max(0.01, totalWeight)
}

export function getDenyTarget(state: SimulationState, arcane: Arcane, creepIndices?: number[]) {
  const laneCreeps = creepIndices
    ? creepIndices.map((index) => state.creeps[index])
    : state.creeps.filter((creep) => creep.team === arcane.team && creep.lane === arcane.lane)
  return getDenyCandidateFromCreeps(arcane, laneCreeps, true)
}

export function getDenyCandidateFromCreeps(arcane: Arcane, creeps: Creep[], reachableOnly = false) {
  return creeps
    .filter((creep) => (
      creep.hp > 0 &&
      creep.hp <= creep.maxHp * 0.5 &&
      (!reachableOnly || distance(arcane.pos, creep.pos) <= getArcaneAttackCenterRange(arcane, creep))
    ))
    .sort((left, right) => (
      getLaneCreepContestPriority(right) - getLaneCreepContestPriority(left) ||
      left.hp - right.hp ||
      distance(arcane.pos, left.pos) - distance(arcane.pos, right.pos)
    ))[0]
}

export function getLastHitTarget(state: SimulationState, arcane: Arcane, creepIndices?: number[]) {
  const laneCreeps = creepIndices
    ? creepIndices.map((index) => state.creeps[index])
    : state.creeps.filter((creep) => creep.team !== arcane.team && creep.lane === arcane.lane)
  return getLastHitCandidateFromCreeps(
    state,
    arcane,
    laneCreeps,
    1.06,
    true,
  )
}

export function getHigherPriorityFarmAlly(state: SimulationState, arcane: Arcane, point: Point, radius = 12) {
  const ownPriority = getRoleFarmPriority(arcane.role)
  return state.arcanes
    .filter((ally) => (
      ally.team === arcane.team &&
      ally.id !== arcane.id &&
      ally.stats.hp > ally.stats.maxHp * 0.38 &&
      ally.respawn <= state.time &&
      getRoleFarmPriority(ally.role) > ownPriority &&
      distance(ally.pos, point) <= radius &&
      ally.aiMode !== 'retreat' &&
      !ally.macroDecision.startsWith('Recuar')
    ))
    .sort((a, b) => (
      getRoleFarmPriority(b.role) - getRoleFarmPriority(a.role) ||
      distance(a.pos, point) - distance(b.pos, point)
    ))[0]
}

export function canArcaneClaimFarmAt(state: SimulationState, arcane: Arcane, point: Point, radius = 12) {
  return getHigherPriorityFarmAlly(state, arcane, point, radius) === undefined
}

export function getLastHitCandidateFromCreeps(
  state: SimulationState,
  arcane: Arcane,
  creeps: Creep[],
  damageWindow: number,
  reachableOnly = false,
) {
  const hitDamage = getArcaneLastHitDamage(state, arcane)
  return creeps
    .filter((creep) => (
      creep.hp > 0 &&
      creep.hp <= hitDamage * damageWindow &&
      canArcaneClaimFarmAt(state, arcane, creep.pos) &&
      (!reachableOnly || distance(arcane.pos, creep.pos) <= getArcaneAttackCenterRange(arcane, creep))
    ))
    .sort((a, b) => {
      const priorityDelta = getLaneCreepContestPriority(b) - getLaneCreepContestPriority(a)
      if (priorityDelta !== 0) return priorityDelta
      const hpDelta = a.hp - b.hp
      if (Math.abs(hpDelta) > 3) return hpDelta
      return distance(arcane.pos, a.pos) - distance(arcane.pos, b.pos)
    })[0]
}

export function getLaneCreepContestPriority(creep: Creep) {
  if (creep.type === 'mage') return 4
  if (creep.type === 'flagbearer') return 3
  if (creep.type === 'siege') return 2
  return 1
}

export function getWavePushTarget(arcane: Arcane, creeps: Creep[]) {
  return creeps
    .filter((creep) => creep.hp > 0)
    .sort((a, b) => {
      const hpDelta = a.hp - b.hp
      if (Math.abs(hpDelta) > 12) return hpDelta
      return distance(arcane.pos, a.pos) - distance(arcane.pos, b.pos)
    })[0]
}

export function getArcaneLastHitDamage(state: SimulationState, arcane: Arcane) {
  return Math.max(1, Math.round(getEffectiveArcaneDamage(state, arcane) * getAuraMultiplier(state, arcane.team)))
}

export function isDeniedCreep(creep: Creep) {
  return creep.lastHitBy?.team === creep.team
}

export function addGoldMarker(state: SimulationState, team: TeamId, pos: Point, amount: number) {
  if (amount <= 0) return
  state.goldMarkers = [
    ...state.goldMarkers.slice(-17),
    {
      id: `gold-${team}-${state.time}-${state.goldMarkers.length}`,
      team,
      pos,
      amount: Math.round(amount),
      createdAt: state.time,
      expiresAt: state.time + 1.15,
    },
  ]
}

export function grantArcaneEconomy(arcane: Arcane, gold: number, xp: number): Arcane {
  if (gold === 0 && xp === 0) return arcane
  return {
    ...arcane,
    earnedGold: arcane.earnedGold + Math.max(0, gold),
    stats: {
      ...arcane.stats,
      gold: arcane.stats.gold + gold,
      xp: arcane.stats.xp + xp,
    },
  }
}

export function getArcaneNetWorth(arcane: Arcane) {
  return Math.round(Math.max(arcane.earnedGold, arcane.stats.gold))
}

export function getTeamNetWorth(state: SimulationState, team: TeamId) {
  return state.arcanes
    .filter((arcane) => arcane.team === team)
    .reduce((total, arcane) => total + getArcaneNetWorth(arcane), 0)
}

export function getTeamXp(state: SimulationState, team: TeamId) {
  return state.arcanes
    .filter((arcane) => arcane.team === team)
    .reduce((total, arcane) => total + arcane.stats.xp, 0)
}

export function getAssistRecipients(state: SimulationState, victim: Arcane, killerId?: string) {
  const assistRadius = 16
  return state.arcanes.filter((arcane) => (
    arcane.team !== victim.team &&
    arcane.id !== killerId &&
    arcane.stats.hp > 0 &&
    arcane.respawn <= state.time &&
    distance(arcane.pos, victim.pos) <= assistRadius
  ))
}

export function getPersistentSkillStatesAfterDeath(arcane: Pick<Arcane, 'heroDefinitionId' | 'skillStates'>) {
  if (arcane.heroDefinitionId !== 'h118_circus_controller') return {}
  return Object.fromEntries(Object.entries(arcane.skillStates).filter(([key, skillState]) => (
    key.startsWith('souvenir:') && (skillState.charges ?? 0) > 0
  )))
}

export function grantRingmasterSouvenir(
  state: SimulationState,
  arcane: Arcane,
  sourceAbilityId: typeof ringmasterSouvenirAbilityIds[number],
) {
  const key = ringmasterSouvenirStateKey(sourceAbilityId)
  const current = arcane.skillStates[key]
  const charges = Math.min(99, (current?.charges ?? 0) + 1)
  arcane.skillStates = {
    ...arcane.skillStates,
    [key]: {
      activeUntil: Number.MAX_SAFE_INTEGER,
      charges,
    },
  }
  const labels: Record<typeof ringmasterSouvenirAbilityIds[number], string> = {
    389: 'Espelho Distorcido',
    392: 'Tonico do Homem-Forte',
    390: 'Almofada Surpresa',
    196: 'Monociclo',
  }
  state.skillMarkers = [
    ...state.skillMarkers.slice(-23),
    {
      id: `souvenir-${arcane.id}-${sourceAbilityId}-${charges}-${state.time}`,
      team: arcane.team,
      pos: arcane.pos,
      label: `Souvenir + ${labels[sourceAbilityId]}`,
      createdAt: state.time,
      expiresAt: state.time + 1.6,
    },
  ]
}

export function collectRingmasterSouvenirsFromDeaths(state: SimulationState, deadArcanes: Arcane[]) {
  const collectionRange = worldVisionToMapRadius(925)
  deadArcanes.forEach((victim) => {
    state.arcanes
      .filter((candidate) => (
        candidate.heroDefinitionId === 'h118_circus_controller' &&
        candidate.team !== victim.team &&
        candidate.stats.hp > 0 &&
        candidate.respawn <= state.time &&
        distance(candidate.pos, victim.pos) <= collectionRange
      ))
      .forEach((collector) => {
        const roll = seededRandomUnit(state.matchSeed, `souvenir:${collector.id}:${victim.id}:${state.time.toFixed(3)}`)
        const sourceAbilityId = ringmasterSouvenirAbilityIds[Math.min(
          ringmasterSouvenirAbilityIds.length - 1,
          Math.floor(roll * ringmasterSouvenirAbilityIds.length),
        )]
        grantRingmasterSouvenir(state, collector, sourceAbilityId)
      })
  })

  deadArcanes
    .filter((arcane) => arcane.heroDefinitionId === 'h118_circus_controller')
    .filter((arcane) => ringmasterSouvenirAbilityIds.every((sourceAbilityId) => getRingmasterSouvenirCharges(arcane.skillStates, sourceAbilityId) <= 0))
    .forEach((arcane) => {
      const roll = seededRandomUnit(state.matchSeed, `souvenir-on-death:${arcane.id}:${state.time.toFixed(3)}`)
      const sourceAbilityId = ringmasterSouvenirAbilityIds[Math.min(
        ringmasterSouvenirAbilityIds.length - 1,
        Math.floor(roll * ringmasterSouvenirAbilityIds.length),
      )]
      grantRingmasterSouvenir(state, arcane, sourceAbilityId)
    })
}

export function applySpiritBearBacklash(state: SimulationState, deadSummons: SummonedUnit[]) {
  for (const summon of deadSummons) {
    if (summon.sourceSkillId !== spiritBearSkillId || summon.hp > 0 || !summon.lastHitBy) continue
    const source = getSummonOwnerSkillProfile(state, summon)
    if (!source || source.caster.stats.hp <= 0 || source.caster.respawn > state.time) continue
    const backlashDamage = source.caster.stats.maxHp * source.profile.summonBacklashPct
    if (backlashDamage <= 0) continue
    damageEntity(state, source.caster.id, backlashDamage, {
      ...summon.lastHitBy,
      label: `${summon.name}: backlash`,
      damageType: 'pure',
    })
  }
}

export function applySummonDeathAbilities(state: SimulationState, initialDeadSummons: SummonedUnit[]) {
  const pending = [...initialDeadSummons]
  const queued = new Set(pending.map((summon) => summon.id))
  const processed = new Set<string>()
  for (let index = 0; index < pending.length; index += 1) {
    const summon = pending[index]
    if (processed.has(summon.id) || summon.hp > 0) continue
    processed.add(summon.id)
    const impact = getSummonUnitAbility(summon, 'golem_impact')
    if (!impact) continue
    const radius = getSummonAbilityNumber(impact, 'radius', 400) / 140
    const damage = getSummonAbilityNumber(impact, 'damage', 150)
    const targets: CombatTarget[] = [
      ...state.arcanes.filter((arcane) => arcane.team !== summon.team && arcane.stats.hp > 0 && arcane.respawn <= state.time),
      ...state.creeps.filter((creep) => creep.team !== summon.team && creep.hp > 0),
      ...state.summons.filter((candidate) => candidate.id !== summon.id && candidate.team !== summon.team && candidate.hp > 0),
    ]
    targets.forEach((target) => {
      if (distanceSquared(target.pos, summon.pos) > radius * radius) return
      damageEntity(state, target.id, damage, {
        id: summon.id,
        label: `${summon.name}: Golem Impact`,
        team: summon.team,
        damageType: 'magical',
      })
    })
    state.skillMarkers = [
      ...state.skillMarkers.slice(-23),
      {
        id: `golem-impact-${summon.id}-${state.time}`,
        team: summon.team,
        pos: { ...summon.pos },
        label: 'Golem Impact',
        createdAt: state.time,
        expiresAt: state.time + 0.9,
      },
    ]
    state.summons
      .filter((candidate) => candidate.hp <= 0 && !queued.has(candidate.id))
      .forEach((candidate) => {
        queued.add(candidate.id)
        pending.push(candidate)
      })
  }
}

export function resolveDeaths(state: SimulationState): SimulationState {
  const next = state
  const triggeringDeadSummons = next.summons.filter((summon) => summon.hp <= 0)
  applySummonDeathAbilities(next, triggeringDeadSummons)
  const deadCreeps = next.creeps.filter((creep) => creep.hp <= 0)
  const deadCreepIds = new Set(deadCreeps.map((creep) => creep.id))
  const deadSummons = next.summons.filter((summon) => summon.hp <= 0 || summon.expiresAt <= next.time)
  const deadCamps = next.camps.filter((camp) => camp.hp <= 0 && camp.respawn <= next.time)
  const deadBoss = next.boss.hp <= 0 && next.boss.respawn <= next.time ? next.boss : undefined
  applySpiritBearBacklash(next, deadSummons)
  const deadArcanes = next.arcanes.filter((arcane) => arcane.stats.hp <= 0 && arcane.respawn <= next.time)

  resolveConditionalSummonDeathTriggers(next, [
    ...deadCreeps,
    ...deadSummons.filter((summon) => summon.hp <= 0),
    ...deadCamps,
    ...(deadBoss ? [deadBoss] : []),
    ...deadArcanes,
  ], deadArcanes)

  if (deadCreeps.length) {
    const deniedCreeps = deadCreeps.filter(isDeniedCreep)
    deniedCreeps.forEach((creep) => {
      const denier = creep.lastHitBy
      if (!denier) return
      next.denyMarkers.push({
        id: `deny-${creep.id}-${next.time}`,
        team: denier.team,
        pos: creep.pos,
        createdAt: next.time,
        expiresAt: next.time + 1.15,
      })
    })
    deadCreeps
      .filter((creep) => !isDeniedCreep(creep) && creep.lastHitBy?.id)
      .forEach((creep) => {
        const lastHitArcane = next.arcanes.find((arcane) => arcane.id === creep.lastHitBy?.id)
        if (lastHitArcane) addGoldMarker(next, lastHitArcane.team, creep.pos, getCreepGoldReward(creep))
      })
    next.arcanes = next.arcanes.map((arcane) => {
      const laneCreepKills = deadCreeps.filter((creep) => !isDeniedCreep(creep) && creep.lastHitBy?.id === arcane.id).length
      const denies = deniedCreeps.filter((creep) => creep.lastHitBy?.id === arcane.id).length
      const creepRewards = deadCreeps.reduce((total, creep) => {
        if (isDeniedCreep(creep)) return total
        const lastHitGold = creep.lastHitBy?.id === arcane.id ? getCreepGoldReward(creep) : 0
        const flagbearerAuraGold = creep.type === 'flagbearer' && creep.team !== arcane.team && distance(creep.pos, arcane.pos) <= 15
          ? 10
          : 0
        const xpShare = getCreepXpShare(next, creep, arcane)
        const sharedXp = xpShare > 0 ? Math.ceil(getCreepXpReward(creep, next.time) * xpShare) : 0

        return {
          gold: total.gold + lastHitGold + flagbearerAuraGold,
          xp: total.xp + sharedXp,
        }
      }, { gold: 0, xp: 0 })

      if (creepRewards.gold === 0 && creepRewards.xp === 0 && laneCreepKills === 0 && denies === 0) return arcane
      return grantArcaneEconomy({
        ...arcane,
        laneCreepKills: arcane.laneCreepKills + laneCreepKills,
        denies: arcane.denies + denies,
      }, creepRewards.gold, creepRewards.xp)
    })
    next.creeps = next.creeps.filter((creep) => !deadCreepIds.has(creep.id))
  }

  if (deadSummons.length) {
    const rewardByArcane = new Map<string, { gold: number; xp: number }>()
    deadSummons.filter((summon) => summon.hp <= 0 && summon.lastHitBy).forEach((summon) => {
      const source = summon.lastHitBy!
      const killer = next.arcanes.find((arcane) => arcane.id === source.id || source.id.startsWith(`${arcane.id}-`))
      if (!killer || killer.team === summon.team) return
      const nearby = next.arcanes.filter((arcane) => (
        arcane.team === killer.team && arcane.stats.hp > 0 && arcane.respawn <= next.time &&
        distanceSquared(arcane.pos, summon.pos) <= 14 * 14
      ))
      const recipients = nearby.length > 0 ? nearby : [killer]
      const killerReward = rewardByArcane.get(killer.id) ?? { gold: 0, xp: 0 }
      rewardByArcane.set(killer.id, { ...killerReward, gold: killerReward.gold + summon.goldReward })
      const sharedXp = Math.ceil(summon.xpReward / recipients.length)
      recipients.forEach((recipient) => {
        const reward = rewardByArcane.get(recipient.id) ?? { gold: 0, xp: 0 }
        rewardByArcane.set(recipient.id, { ...reward, xp: reward.xp + sharedXp })
      })
      addGoldMarker(next, killer.team, summon.pos, summon.goldReward)
    })
    if (rewardByArcane.size > 0) {
      next.arcanes = next.arcanes.map((arcane) => {
        const reward = rewardByArcane.get(arcane.id)
        return reward ? grantArcaneEconomy(arcane, reward.gold, reward.xp) : arcane
      })
    }
    const deadIds = new Set(deadSummons.map((summon) => summon.id))
    next.summons = next.summons.filter((summon) => !deadIds.has(summon.id))
    teamVisionProviderCache.delete(next)
  }

  if (deadCamps.length) {
    next.camps = next.camps.map((camp) => camp.hp <= 0 ? { ...camp, respawn: next.time + NON_COMBAT_RULES.map.jungleRespawnIntervalSeconds } : camp)
    const rewardsByArcane = new Map<string, { gold: number; xp: number; neutralKills: number }>()
    const addCampReward = (arcaneId: string, gold: number, xp: number, neutralKills = 0) => {
      const current = rewardsByArcane.get(arcaneId) ?? { gold: 0, xp: 0, neutralKills: 0 }
      rewardsByArcane.set(arcaneId, {
        gold: current.gold + gold,
        xp: current.xp + xp,
        neutralKills: current.neutralKills + neutralKills,
      })
    }
    deadCamps.forEach((camp) => {
      const source = camp.lastHitBy
      if (!source) return
      const killer = next.arcanes.find((arcane) => (
        arcane.team === source.team &&
        (arcane.id === source.id || source.id.startsWith(`${arcane.id}-`))
      ))
      const reward = getCampRewards(camp, next.time)
      if (!killer) {
        const killerCreep = next.creeps.find((creep) => creep.id === source.id && creep.team === source.team)
        if (!killerCreep) return
        const nearbyRecipients = next.arcanes.filter((arcane) => (
          arcane.team === killerCreep.team &&
          arcane.stats.hp > 0 &&
          arcane.respawn <= next.time &&
          distance(arcane.pos, camp.pos) <= 14
        ))
        if (nearbyRecipients.length === 0) return
        const sharedXp = Math.ceil(reward.xp / nearbyRecipients.length)
        nearbyRecipients.forEach((recipient) => addCampReward(recipient.id, 0, sharedXp))
        return
      }
      const nearbyRecipients = next.arcanes.filter((arcane) => (
        arcane.team === killer.team &&
        arcane.stats.hp > 0 &&
        arcane.respawn <= next.time &&
        distance(arcane.pos, camp.pos) <= 14
      ))
      const xpRecipients = nearbyRecipients.length > 0 ? nearbyRecipients : [killer]
      addCampReward(killer.id, reward.gold, 0, 1)
      const sharedXp = Math.ceil(reward.xp / xpRecipients.length)
      xpRecipients.forEach((recipient) => addCampReward(recipient.id, 0, sharedXp))
    })
    next.arcanes = next.arcanes.map((arcane) => {
      const reward = rewardsByArcane.get(arcane.id)
      if (!reward) return arcane
      return grantArcaneEconomy({ ...arcane, neutralKills: arcane.neutralKills + reward.neutralKills }, reward.gold, reward.xp)
    })
  }

  if (deadBoss?.lastHitBy) {
    const rewardTeam = deadBoss.lastHitBy.team
    next.boss = { ...deadBoss, hp: 0, respawn: next.time + NON_COMBAT_RULES.map.bossRespawnIntervalSeconds }
    next.teamAuras[rewardTeam] = {
      name: `${deadBoss.name} +20%`,
      attributeMultiplier: 1.2,
      expiresAt: next.time + 120,
    }
    next.arcanes = next.arcanes.map((arcane) => {
      if (arcane.team !== rewardTeam) return arcane
      const securedBoss = deadBoss.lastHitBy?.id === arcane.id || deadBoss.lastHitBy?.id.startsWith(`${arcane.id}-`)
      return grantArcaneEconomy({
        ...arcane,
        neutralKills: arcane.neutralKills + (securedBoss ? 1 : 0),
        objectiveKills: arcane.objectiveKills + (securedBoss ? 1 : 0),
      }, 120, scaledExperienceReward(400, next.time))
    })
    next.arcanes
      .filter((arcane) => arcane.team === rewardTeam && arcane.stats.hp > 0 && arcane.respawn <= next.time)
      .forEach((arcane) => addTimedEffect(next, arcane, {
        sourceId: `${deadBoss.id}-aura-buff`,
        sourceName: `${deadBoss.name} aura`,
        sourceTeam: rewardTeam,
        kind: 'buff',
        polarity: 'positive',
        value: 1,
        modifiers: {
          damagePct: 0.08,
          armorFlat: 2,
          moveSpeedPct: 0.04,
          attackSpeedPct: 0.08,
        },
        duration: 120,
      }))
    next.events = addEvent(next.events, {
      id: `boss-${rewardTeam}-${next.time}`,
      time: next.time,
      team: rewardTeam,
      actor: deadBoss.lastHitBy.label,
      actorTeam: rewardTeam,
      victim: deadBoss.name,
      victimTeam: rewardTeam === 'dawn' ? 'dusk' : 'dawn',
      detail: `${teamInfo[rewardTeam].short} conquistou aura de 20%`,
    })
  }

  if (deadArcanes.length) {
    collectRingmasterSouvenirsFromDeaths(next, deadArcanes)
    const arcaneRewards = new Map<string, { gold: number; xp: number }>()
    const kdaChanges = new Map<string, { kills: number; deaths: number; assists: number }>()
    const addArcaneReward = (arcaneId: string, gold: number, xp: number) => {
      const current = arcaneRewards.get(arcaneId) ?? { gold: 0, xp: 0 }
      arcaneRewards.set(arcaneId, { gold: current.gold + gold, xp: current.xp + xp })
    }
    const deathGoldLosses = new Map<string, number>()
    const addKda = (arcaneId: string, change: Partial<{ kills: number; deaths: number; assists: number }>) => {
      const current = kdaChanges.get(arcaneId) ?? { kills: 0, deaths: 0, assists: 0 }
      kdaChanges.set(arcaneId, {
        kills: current.kills + (change.kills ?? 0),
        deaths: current.deaths + (change.deaths ?? 0),
        assists: current.assists + (change.assists ?? 0),
      })
    }

    deadArcanes.forEach((arcane) => {
      const killerTeam: TeamId = arcane.team === 'dawn' ? 'dusk' : 'dawn'
      const killerSource = arcane.lastHitBy
      const killer = killerSource ?? { label: teamInfo[killerTeam].name, team: killerTeam }
      const killerArcane = killerSource
        ? next.arcanes.find((candidate) => (
          candidate.team === killerTeam &&
          (candidate.id === killerSource.id || killerSource.id.startsWith(`${candidate.id}-`))
        ))
        : undefined
      const isArcaneKill = killerArcane !== undefined
      if (isArcaneKill) next.kills[killerTeam] += 1
      const assists = killerArcane ? getAssistRecipients(next, arcane, killerArcane.id) : []
      const eligibleXpRecipients = killerArcane ? [killerArcane, ...assists] : assists
      const killerTeamNetWorth = getTeamNetWorth(next, killerTeam)
      const victimTeamNetWorth = getTeamNetWorth(next, arcane.team)
      const victimNetWorth = getArcaneNetWorth(arcane)
      const comebackGold = killerArcane
        ? comebackKillGoldBonus(victimNetWorth, killerTeamNetWorth, victimTeamNetWorth)
        : 0
      const killerRewardGold = killerArcane
        ? killGold(arcane.stats.level, comebackGold, next.kills.dawn + next.kills.dusk === 1 && isArcaneKill)
        : 0
      const assistRewardGold = assistGoldPerHero(
        victimNetWorth,
        killerTeamNetWorth,
        victimTeamNetWorth,
        assists.length,
      )
      const xpPerEligibleHero = scaledExperienceReward(killXp(
        arcane.stats.level,
        getTeamXp(next, killerTeam),
        getTeamXp(next, arcane.team),
        eligibleXpRecipients.length,
      ), next.time)
      const lostGold = Math.min(arcane.stats.gold, deathGoldLoss(getArcaneNetWorth(arcane)))

      if (killerArcane) addArcaneReward(killerArcane.id, killerRewardGold, xpPerEligibleHero)
      assists.forEach((assist) => addArcaneReward(assist.id, assistRewardGold, xpPerEligibleHero))
      if (killerArcane) addKda(killerArcane.id, { kills: 1 })
      assists.forEach((assist) => addKda(assist.id, { assists: 1 }))
      addKda(arcane.id, { deaths: 1 })
      deathGoldLosses.set(arcane.id, lostGold)
      next.teamMemory[arcane.team] = addAiMemoryEvent(next.teamMemory[arcane.team], {
        id: `memory-death-${arcane.id}-${next.time}`,
        type: 'hero_death',
        teamId: arcane.team,
        gameTime: next.time,
        position: arcane.pos,
        value: Math.min(88, 42 + arcane.stats.level * 2 + (killerArcane ? 10 : 0)),
        expiresAtGameTime: next.time + 100,
        tags: ['death', 'danger', arcane.lane],
      })

      next.deathMarkers.push({
        id: `death-${arcane.id}-${next.time}`,
        arcane: arcane.player,
        team: arcane.team,
        pos: arcane.pos,
        createdAt: next.time,
        expiresAt: next.time + 10,
      })
      next.events = addEvent(next.events, {
        id: `kill-${arcane.id}-${next.time}`,
        time: next.time,
        team: killer.team,
        actor: killer.label,
        actorTeam: killer.team,
        victim: arcane.player,
        victimTeam: arcane.team,
        detail: `${teamInfo[killer.team].short} eliminou ${arcane.name} (+${Math.round(killerRewardGold)}g${comebackGold > 0 ? `, comeback +${Math.round(comebackGold)}g` : ''} / ${Math.round(xpPerEligibleHero)}xp)`,
      })
    })
    recordFightMemoryEvents(next, deadArcanes)
    const deadArcaneIds = new Set(deadArcanes.map((arcane) => arcane.id))
    next.timedEffects = next.timedEffects.filter((effect) => !deadArcaneIds.has(effect.targetId))
    next.arcanes = next.arcanes.map((arcane) => {
      const reward = arcaneRewards.get(arcane.id)
      const lostGold = deathGoldLosses.get(arcane.id) ?? 0
      const kda = kdaChanges.get(arcane.id)
      const withKda = kda ? { ...arcane, kills: arcane.kills + kda.kills, deaths: arcane.deaths + kda.deaths, assists: arcane.assists + kda.assists } : arcane
      if (arcane.stats.hp > 0) {
        if (!reward) return withKda
        return grantArcaneEconomy(withKda, reward.gold, reward.xp)
      }
      return {
        ...withKda,
        respawn: next.time + getArcaneRespawnDuration(arcane.stats.level),
        lastHitBy: undefined,
        channeling: undefined,
        skillStates: getPersistentSkillStatesAfterDeath(arcane),
        tpScrolls: Math.min(teleportScrollMaxCharges, arcane.tpScrolls + 1),
        macroDecision: 'Fora de combate',
        microDecision: 'Aguardando respawn',
        aiExecutionChance: 0,
        aiExecutionDelay: 0,
        aiFailure: undefined,
        decision: 'Aguardando respawn',
        stats: { ...arcane.stats, gold: Math.max(0, arcane.stats.gold - lostGold), hp: 0, mana: 0 },
      }
    })
  }

  next.arcanes = next.arcanes.map((arcane) => {
    const nextLevel = getLevelFromXp(arcane.stats.xp)
    if (nextLevel <= arcane.stats.level) return arcane
    const hpRatio = arcane.stats.maxHp > 0 ? arcane.stats.hp / arcane.stats.maxHp : 1
    const manaRatio = arcane.stats.maxMana > 0 ? arcane.stats.mana / arcane.stats.maxMana : 1
    const leveledArcane = {
      ...arcane,
      stats: buildArcaneStats(arcane.heroDefinitionId, nextLevel, arcane.stats.gold, arcane.stats.xp, hpRatio, manaRatio, arcane.items, arcane.statBonusLevels),
    }
    const allocatedArcane = allocateArcaneSkillPoints(leveledArcane)

    if (allocatedArcane.statBonusLevels === arcane.statBonusLevels) return allocatedArcane

    return {
      ...allocatedArcane,
      stats: buildArcaneStats(
        allocatedArcane.heroDefinitionId,
        nextLevel,
        allocatedArcane.stats.gold,
        allocatedArcane.stats.xp,
        hpRatio,
        manaRatio,
        allocatedArcane.items,
        allocatedArcane.statBonusLevels,
      ),
    }
  })

  return next
}

export function recordFightMemoryEvents(state: SimulationState, deadArcanes: Arcane[]) {
  ;(['dawn', 'dusk'] as TeamId[]).forEach((team) => {
    const teamDeaths = deadArcanes.filter((arcane) => arcane.team === team)
    if (teamDeaths.length < 2) return
    const center = getPointCentroid(teamDeaths.map((arcane) => arcane.pos))
    const maxSpread = Math.max(...teamDeaths.map((arcane) => distance(arcane.pos, center)))
    if (maxSpread > 18) return

    const winner: TeamId = team === 'dawn' ? 'dusk' : 'dawn'
    const value = Math.min(95, 52 + teamDeaths.length * 14 + average(teamDeaths.map((arcane) => arcane.stats.level)) * 1.4)
    state.teamMemory[team] = addAiMemoryEvent(state.teamMemory[team], {
      id: `memory-lost-fight-${team}-${state.time}`,
      type: 'lost_fight',
      teamId: team,
      gameTime: state.time,
      position: center,
      value,
      expiresAtGameTime: state.time + 180,
      tags: ['fight', 'danger', 'numbers'],
    })
    state.teamMemory[winner] = addAiMemoryEvent(state.teamMemory[winner], {
      id: `memory-won-fight-${winner}-${state.time}`,
      type: 'won_fight',
      teamId: winner,
      gameTime: state.time,
      position: center,
      value: Math.round(value * 0.75),
      expiresAtGameTime: state.time + 120,
      tags: ['fight', 'advantage', 'tempo'],
    })
  })
}

export function getPointCentroid(points: Point[]): Point {
  if (points.length === 0) return { x: 50, y: 50 }
  return {
    x: average(points.map((point) => point.x)),
    y: average(points.map((point) => point.y)),
  }
}

export function getSimulationEntityIndexes(state: SimulationState) {
  const cached = simulationEntityIndexesCache.get(state.runtimeToken)
  const firstCreepId = state.creeps[0]?.id
  const lastCreepId = state.creeps.at(-1)?.id
  const firstSummonId = state.summons[0]?.id
  const lastSummonId = state.summons.at(-1)?.id
  if (cached) {
    if (
      cached.creepCount !== state.creeps.length ||
      cached.firstCreepId !== firstCreepId ||
      cached.lastCreepId !== lastCreepId
    ) {
      rebuildCreepIndexes(cached.indexes, state.creeps)
      cached.creepCount = state.creeps.length
      cached.firstCreepId = firstCreepId
      cached.lastCreepId = lastCreepId
    }
    if (
      cached.summonCount !== state.summons.length ||
      cached.firstSummonId !== firstSummonId ||
      cached.lastSummonId !== lastSummonId
    ) {
      cached.indexes.summon = createEntityIndex(state.summons)
      cached.summonCount = state.summons.length
      cached.firstSummonId = firstSummonId
      cached.lastSummonId = lastSummonId
    }
    return cached.indexes
  }

  const indexes: SimulationEntityIndexes = {
    arcane: createEntityIndex(state.arcanes),
    creep: createEntityIndex(state.creeps),
    summon: createEntityIndex(state.summons),
    tower: createEntityIndex(state.towers),
    structure: createEntityIndex(state.structures),
    base: createEntityIndex(state.bases),
    camp: createEntityIndex(state.camps),
    arcaneIds: state.arcanes.map((arcane) => arcane.id),
  }
  rebuildCreepIndexes(indexes, state.creeps)
  simulationEntityIndexesCache.set(state.runtimeToken, {
    indexes,
    creepCount: state.creeps.length,
    firstCreepId,
    lastCreepId,
    summonCount: state.summons.length,
    firstSummonId,
    lastSummonId,
  })
  return indexes
}

function createEntityIndex(entities: Array<{ id: string }>) {
  const indexById = new Map<string, number>()
  for (let index = 0; index < entities.length; index += 1) {
    indexById.set(entities[index].id, index)
  }
  return indexById
}

function rebuildCreepIndexes(indexes: SimulationEntityIndexes, creeps: Creep[]) {
  indexes.creep = new Map()
  for (let index = 0; index < creeps.length; index += 1) {
    const creep = creeps[index]
    indexes.creep.set(creep.id, index)
  }
}

function getSourceArcaneIndex(indexes: SimulationEntityIndexes, sourceId: string) {
  const exact = indexes.arcane.get(sourceId)
  if (exact !== undefined) return exact
  return indexes.arcaneIds.findIndex((arcaneId) => sourceId.startsWith(`${arcaneId}-`))
}

export function damageEntity(state: SimulationState, id: string, damage: number, source: CombatSource) {
  const indexes = getSimulationEntityIndexes(state)
  const targetArcaneIndex = indexes.arcane.get(id)
  const targetCreepIndex = indexes.creep.get(id)
  const targetSummonIndex = indexes.summon.get(id)
  const targetTowerIndex = indexes.tower.get(id)
  const targetStructureIndex = indexes.structure.get(id)
  const targetBaseIndex = indexes.base.get(id)
  const targetCampIndex = indexes.camp.get(id)
  const targetArcane = targetArcaneIndex === undefined ? undefined : state.arcanes[targetArcaneIndex]
  const targetCreep = targetCreepIndex === undefined ? undefined : state.creeps[targetCreepIndex]
  const targetSummon = targetSummonIndex === undefined ? undefined : state.summons[targetSummonIndex]
  const targetTower = targetTowerIndex === undefined ? undefined : state.towers[targetTowerIndex]
  const targetStructure = targetStructureIndex === undefined ? undefined : state.structures[targetStructureIndex]
  const targetBase = targetBaseIndex === undefined ? undefined : state.bases[targetBaseIndex]
  const targetCamp = targetCampIndex === undefined ? undefined : state.camps[targetCampIndex]
  const targetBoss = state.boss.id === id ? state.boss : undefined
  const sourceArcaneIndex = getSourceArcaneIndex(indexes, source.id)
  const sourceArcane = sourceArcaneIndex < 0 ? undefined : state.arcanes[sourceArcaneIndex]
  const damageType = source.damageType ?? 'physical'
  let finalDamage = damage

  if (targetArcane) {
    finalDamage = resolveIncomingArcaneDamage(state, targetArcane, damage, damageType)
    if (sourceArcane && source.id !== sourceArcane.id) {
      finalDamage *= genericHeroSkillDamageMultiplier
    }
  } else if (targetTower) {
    finalDamage = getStructureIncomingDamage(state, targetTower, damage, source, damageType)
  } else if (targetStructure) {
    finalDamage = getStructureIncomingDamage(state, targetStructure, damage, source, damageType)
  } else if (targetBase) {
    finalDamage = getStructureIncomingDamage(state, targetBase, damage, source, damageType)
  }
  const targetCurrentHp = targetArcane?.stats.hp ?? targetCreep?.hp ?? targetSummon?.hp ?? targetTower?.hp ?? targetStructure?.hp ?? targetBase?.hp ?? targetCamp?.hp ?? targetBoss?.hp ?? finalDamage

  if (targetArcane?.travelPlan) {
    materializeArcaneTravelPlan(targetArcane, state.time)
    if (activeArcaneTravelDiagnostics) activeArcaneTravelDiagnostics.cancelledByDamage += 1
  }

  const hit = (value: number) => Math.max(0, value - finalDamage)
  recordObjectiveLossIfDestroyed(state, targetTower, finalDamage, source)
  recordObjectiveLossIfDestroyed(state, targetStructure, finalDamage, source)
  recordObjectiveLossIfDestroyed(state, targetBase, finalDamage, source)
  if (targetCreep && targetCreepIndex !== undefined) {
    const remainingHp = hit(targetCreep.hp)
    if (state.creepStorageMode === 'soa') {
      const replacement = { ...targetCreep, hp: remainingHp, lastHitBy: source }
      state.creeps[targetCreepIndex] = state.creepComponents
        ? replaceCreepComponentFacade(state.creepComponents, targetCreep, replacement)
        : replacement
    } else {
      state.creeps[targetCreepIndex] = { ...targetCreep, hp: remainingHp, lastHitBy: source }
    }
    if (remainingHp <= 0) {
      teamVisionProviderCache.delete(state)
    }
  } else if (targetSummon && targetSummonIndex !== undefined) {
    const summons = [...state.summons]
    const updatedSummon = { ...targetSummon }
    let summonDamage = finalDamage * Math.max(0, targetSummon.damageTakenMultiplier)
    if (targetSummon.sourceSkillId === summonFamiliarsSkillId) {
      const cloak = getOwnerSkillProfileByAbility(state, targetSummon.ownerId, gravekeepersCloakAbilityId)
      const withinAura = cloak && distanceSquared(targetSummon.pos, cloak.caster.pos) <= cloak.profile.radius * cloak.profile.radius
      const layers = withinAura ? Math.max(0, targetSummon.cloakLayers ?? cloak.profile.cloakMaxLayers) : 0
      if (cloak && layers > 0) {
        summonDamage *= Math.max(0.05, 1 - layers * cloak.profile.cloakDamageReductionPct)
        if (finalDamage >= cloak.profile.cloakMinimumDamage) {
          updatedSummon.cloakLayers = layers - 1
          updatedSummon.cloakNextRecoveryAt ??= state.time + cloak.profile.cloakRecoveryTime
        }
      }
    }
    summons[targetSummonIndex] = { ...updatedSummon, hp: Math.max(0, targetSummon.hp - summonDamage), lastHitBy: source }
    state.summons = summons
    if (summons[targetSummonIndex].hp <= 0) teamVisionProviderCache.delete(state)
  } else if (targetTower && targetTowerIndex !== undefined) {
    const towers = [...state.towers]
    towers[targetTowerIndex] = { ...targetTower, hp: hit(targetTower.hp) }
    state.towers = towers
  } else if (targetStructure && targetStructureIndex !== undefined) {
    const structures = [...state.structures]
    structures[targetStructureIndex] = { ...targetStructure, hp: hit(targetStructure.hp) }
    state.structures = structures
  } else if (targetBase && targetBaseIndex !== undefined) {
    const bases = [...state.bases]
    bases[targetBaseIndex] = { ...targetBase, hp: hit(targetBase.hp) }
    state.bases = bases
  } else if (targetCamp && targetCampIndex !== undefined) {
    const camps = [...state.camps]
    camps[targetCampIndex] = {
      ...targetCamp,
      hp: hit(targetCamp.hp),
      lastHitBy: source,
      aggroTargetId: sourceArcane?.id ?? source.id,
      aggroUntil: state.time + 8,
      lastDamagedAt: state.time,
    }
    state.camps = camps
  } else if (targetBoss) {
    state.boss = {
      ...state.boss,
      hp: hit(state.boss.hp),
      lastHitBy: source,
      aggroTargetId: sourceArcane?.id ?? source.id,
      aggroUntil: state.time + 8,
      lastDamagedAt: state.time,
    }
  }
  const appliedDamage = Math.min(Math.max(0, targetCurrentHp), Math.max(0, finalDamage))
  const updateArcane = (arcane: Arcane) => {
    const isTarget = arcane.id === id
    const isSource = sourceArcane?.id === arcane.id
    if (!isTarget && !isSource) return arcane
    return {
      ...arcane,
      nextCombatEvaluationAt: isTarget ? Math.min(arcane.nextCombatEvaluationAt, state.time) : arcane.nextCombatEvaluationAt,
      combatTargetId: isTarget ? undefined : arcane.combatTargetId,
      combatTargetIntent: isTarget ? undefined : arcane.combatTargetIntent,
      travelPlan: isTarget ? undefined : arcane.travelPlan,
      lastHitBy: isTarget ? source : arcane.lastHitBy,
      damageDealt: arcane.damageDealt + (isSource ? appliedDamage : 0),
      heroDamageDealt: arcane.heroDamageDealt + (isSource && targetArcane ? appliedDamage : 0),
      structureDamageDealt: arcane.structureDamageDealt + (isSource && (targetTower || targetStructure || targetBase) ? appliedDamage : 0),
      damageTaken: arcane.damageTaken + (isTarget ? appliedDamage : 0),
      stats: isTarget ? { ...arcane.stats, hp: hit(arcane.stats.hp) } : arcane.stats,
    }
  }
  if (targetArcaneIndex !== undefined || sourceArcaneIndex >= 0) {
    const arcanes = [...state.arcanes]
    if (targetArcaneIndex !== undefined) {
      arcanes[targetArcaneIndex] = updateArcane(arcanes[targetArcaneIndex])
    }
    if (sourceArcaneIndex >= 0 && sourceArcaneIndex !== targetArcaneIndex) {
      arcanes[sourceArcaneIndex] = updateArcane(arcanes[sourceArcaneIndex])
    }
    state.arcanes = arcanes
  }
  if (targetCreep) {
    state.arcanes.forEach((arcane) => {
      if (arcane.lane !== targetCreep.lane || arcane.stats.hp <= 0 || arcane.respawn > state.time) return
      if (distanceSquared(arcane.pos, targetCreep.pos) > 14 * 14) return
      arcane.nextCombatEvaluationAt = Math.min(arcane.nextCombatEvaluationAt, state.time)
      arcane.combatTargetId = undefined
      arcane.combatTargetIntent = undefined
    })
  }
}

export function recordObjectiveLossIfDestroyed(
  state: SimulationState,
  objective: Tower | Structure | Base | undefined,
  damage: number,
  source: CombatSource,
) {
  if (!objective || objective.hp <= 0 || objective.hp - damage > 0 || objective.team === source.team) return
  state.arcanes = state.arcanes.map((arcane) => source.id === arcane.id || source.id.startsWith(`${arcane.id}-`)
    ? { ...arcane, objectiveKills: arcane.objectiveKills + 1 }
    : arcane)
  const label = getObjectiveMemoryLabel(objective)
  const lane = 'lane' in objective ? objective.lane : undefined
  const objectiveValue = 'tier' in objective
    ? objective.tier === 1 ? 46 : objective.tier === 2 ? 58 : 72
    : 'kind' in objective
      ? objective.kind === 'tower_tier_4' ? 84 : 64
      : 95
  state.teamMemory[objective.team] = addAiMemoryEvent(state.teamMemory[objective.team], {
    id: `memory-objective-${objective.id}-${state.time}`,
    type: 'lost_objective',
    teamId: objective.team,
    gameTime: state.time,
    position: objective.pos,
    value: objectiveValue,
    expiresAtGameTime: state.time + 210,
    tags: ['objective', 'structure', ...(lane ? [lane] : [])],
  })
  state.events = addEvent(state.events, {
    id: `objective-${objective.id}-${state.time}`,
    time: state.time,
    team: source.team,
    actor: source.label,
    actorTeam: source.team,
    victim: label,
    victimTeam: objective.team,
    detail: `${teamInfo[source.team].short} destruiu ${label}`,
  })
}

export function getObjectiveMemoryLabel(objective: Tower | Structure | Base) {
  if ('tier' in objective) return `Torre T${objective.tier} ${laneNames[objective.lane]}`
  if ('kind' in objective) return getStructureLabel(objective)
  return `Base ${teamInfo[objective.team].name}`
}

export function addEvent(events: MatchEvent[], event: MatchEvent) {
  return [event, ...events].slice(0, 8)
}

export function addAttackEffect(
  effects: AttackEffect[],
  effect: Omit<AttackEffect, 'id' | 'duration'>,
) {
  const duration = effect.kind === 'tower' ? 0.9 : effect.kind === 'arcane' ? 0.68 : effect.kind === 'neutral' ? 0.62 : 0.52
  return [
    ...effects.slice(-(maxAttackEffects - 1)),
    {
      ...effect,
      id: `${effect.action}-${effect.sourceId}-${effect.createdAt}-${effects.length}`,
      duration,
    },
  ]
}

export function getCombatTargetKind(target: CombatTarget): EntityKind {
  if ('player' in target) return 'arcane'
  if ('ownerId' in target) return 'summon'
  if ('tier' in target) return 'tower'
  if ('kind' in target && ('side' in target || target.kind.startsWith('barracks'))) return 'structure'
  if ('level' in target) return 'camp'
  if ('type' in target) return 'creep'
  if (isBoss(target)) return 'boss'
  return 'base'
}

export function getStructureArmor(target: Tower | Structure | Base) {
  if ('tier' in target) {
    if (target.tier === 1) return 10
    if (target.tier === 2) return 14
    return 18
  }
  if ('kind' in target) {
    if (target.kind === 'barracks_melee') return 15
    if (target.kind === 'barracks_ranged') return 12
    return 22
  }

  return 22
}

export function getStructureMagicResistance(target: Tower | Structure | Base) {
  return 'tier' in target && target.tier === 1 ? 0.2 : 0.25
}

export function getStructureId(target: Tower | Structure | Base) {
  return target.id
}

export function getStructureTeam(target: Tower | Structure | Base) {
  return target.team
}

export function isStructureFortified(state: SimulationState, target: Tower | Structure | Base) {
  const fortification = state.teamFortifications[getStructureTeam(target)]
  return fortification.activeUntil > state.time && (!fortification.targetId || fortification.targetId === getStructureId(target))
}

export function getFortificationTargetLabel(state: SimulationState, targetId: string) {
  const tower = state.towers.find((candidate) => candidate.id === targetId)
  if (tower) return `T${tower.tier} ${laneNames[tower.lane]}`
  const structure = state.structures.find((candidate) => candidate.id === targetId)
  if (structure) return getStructureLabel(structure)
  const base = state.bases.find((candidate) => candidate.id === targetId)
  if (base) return `Base ${teamInfo[base.team].short}`
  return 'estrutura'
}

export function getStructurePressureScore(state: SimulationState, target: Tower | Structure | Base) {
  const enemyTeam: TeamId = getStructureTeam(target) === 'dawn' ? 'dusk' : 'dawn'
  const hpRatio = target.hp / Math.max(1, target.maxHp)
  const enemyHeroes = state.arcanes.filter((arcane) => (
    arcane.team === enemyTeam &&
    arcane.stats.hp > 0 &&
    arcane.respawn <= state.time &&
    distance(arcane.pos, target.pos) <= ('tier' in target ? 13 : 16)
  )).length
  const enemyCreeps = state.creeps.filter((creep) => creep.team === enemyTeam && distance(creep.pos, target.pos) <= 9).length
  const aggroPressure = 'aggroUntil' in target && target.aggroUntil !== undefined && target.aggroUntil > state.time ? 20 : 0

  return enemyHeroes * 18 + enemyCreeps * 4 + aggroPressure + Math.max(0, 0.62 - hpRatio) * 80
}

export function shouldFortifyStructure(state: SimulationState, target: Tower | Structure | Base) {
  if (target.hp <= 0) return false
  const hpRatio = target.hp / Math.max(1, target.maxHp)
  const threshold = 'tier' in target
    ? target.tier === 1 ? 0.34 : target.tier === 2 ? 0.5 : 0.72
    : 'kind' in target
      ? target.kind === 'tower_tier_4' ? 0.78 : 0.66
      : 0.82

  return hpRatio <= threshold && getStructurePressureScore(state, target) >= 22
}

export function updateTeamFortifications(state: SimulationState): SimulationState {
  const next = state
  ;(['dawn', 'dusk'] as TeamId[]).forEach((team) => {
    const current = next.teamFortifications[team]
    if (current.activeUntil > next.time || current.cooldownUntil > next.time) return

    const targets: Array<Tower | Structure | Base> = [
      ...next.towers.filter((tower) => tower.team === team),
      ...next.structures.filter((structure) => structure.team === team),
      ...next.bases.filter((base) => base.team === team),
    ]
    const target = targets
      .filter((candidate) => shouldFortifyStructure(next, candidate))
      .sort((a, b) => getStructurePressureScore(next, b) - getStructurePressureScore(next, a))[0]
    if (!target) return

    next.teamFortifications[team] = {
      activeUntil: next.time + fortificationDurationSeconds,
      cooldownUntil: next.time + fortificationCooldownSeconds,
      targetId: getStructureId(target),
    }
    next.events = addEvent(next.events, {
      id: `fortification-${team}-${next.time}`,
      time: next.time,
      team,
      actor: teamInfo[team].name,
      actorTeam: team,
      victim: getFortificationTargetLabel(next, getStructureId(target)),
      victimTeam: team,
      detail: `${teamInfo[team].short} ativou fortification por ${fortificationDurationSeconds}s`,
    })
  })

  return next
}

export function getCreepsNearStructure(state: SimulationState, team: TeamId, target: Tower | Structure | Base) {
  return state.creeps.filter((creep) => (
    creep.team === team &&
    distance(creep.pos, target.pos) <= ('tier' in target ? 8 : 10)
  )).length
}

export function hasBackdoorProtection(target: Tower | Structure | Base) {
  return 'tier' in target ? target.tier >= 2 : true
}

export function isStructureBackdoorProtectedForTeam(state: SimulationState, team: TeamId, target: Tower | Structure | Base) {
  return isBackdoorProtected({
    hasBackdoorProtection: hasBackdoorProtection(target),
    alliedCreepsNearby: getCreepsNearStructure(state, team, target),
  })
}

export function getStructureSiegeEstimate(state: SimulationState, team: TeamId, target: Tower | Structure | Base) {
  const protectedByBackdoor = isStructureBackdoorProtectedForTeam(state, team, target)
  const nearbyHeroDps = state.arcanes
    .filter((arcane) => arcane.team === team && arcane.stats.hp > 0 && arcane.respawn <= state.time && distance(arcane.pos, target.pos) <= 20)
    .reduce((sum, arcane) => {
      const hpRatio = arcane.stats.hp / Math.max(1, arcane.stats.maxHp)
      return sum + (getEffectiveArcaneDamage(state, arcane) * getAuraMultiplier(state, team) * hpRatio) / Math.max(0.25, getEffectiveArcaneAttackCooldown(state, arcane))
    }, 0)
  const nearbyCreepDps = state.creeps
    .filter((creep) => creep.team === team && distance(creep.pos, target.pos) <= 12)
    .reduce((sum, creep) => sum + creep.damage / getCreepAttackCycle(creep), 0)
  const rawDps = nearbyHeroDps + nearbyCreepDps
  const fortified = isStructureFortified(state, target)
  const netSiegeDps = structureDamageTaken({
    rawDamage: rawDps,
    damageType: 'physical',
    armor: getStructureArmor(target),
    magicResistance: getStructureMagicResistance(target),
    backdoorMultiplier: protectedByBackdoor ? 0.25 : 1,
  }) * (fortified ? fortificationDamageMultiplier : 1)

  return {
    protectedByBackdoor,
    fortified,
    netSiegeDps,
    timeToKill: expectedTimeToKillStructure(target.hp, netSiegeDps),
  }
}

export function getTowerTankAssessment(state: SimulationState, arcane: Arcane, tower: Tower) {
  const protectedByBackdoor = isStructureBackdoorProtectedForTeam(state, arcane.team, tower)
  const incomingDamage = Math.max(1, resolveIncomingArcaneDamage(state, arcane, tower.damage, 'physical'))
  const reserveRatio = tower.tier === 3 ? 0.36 : tower.tier === 2 ? 0.3 : 0.24
  const reserveHp = Math.max(arcane.stats.maxHp * reserveRatio, incomingDamage * 1.25)
  const tankableHp = Math.max(0, arcane.stats.hp - reserveHp)
  const survivableHits = Math.floor(tankableHp / incomingDamage)
  const tankWindow = survivableHits * 1.2
  const siege = getStructureSiegeEstimate(state, arcane.team, tower)
  const canTank = !protectedByBackdoor &&
    arcane.stats.hp / Math.max(1, arcane.stats.maxHp) >= 0.62 &&
    survivableHits >= 3 &&
    Number.isFinite(siege.timeToKill) &&
    siege.timeToKill <= 40 &&
    tankWindow >= siege.timeToKill + 1.2

  return {
    canTank,
    incomingDamage,
    survivableHits,
    tankWindow,
    timeToKill: siege.timeToKill,
    reserveHp,
    protectedByBackdoor,
  }
}

export function getTowerTankCandidate(state: SimulationState, team: TeamId, tower: Tower) {
  return state.arcanes
    .filter((arcane) => (
      arcane.team === team &&
      arcane.stats.hp > 0 &&
      arcane.respawn <= state.time &&
      distance(arcane.pos, tower.pos) <= 26
    ))
    .map((arcane) => ({ arcane, assessment: getTowerTankAssessment(state, arcane, tower) }))
    .filter(({ assessment }) => assessment.canTank)
    .sort((a, b) => (
      b.assessment.tankWindow - a.assessment.tankWindow ||
      b.arcane.stats.hp - a.arcane.stats.hp
    ))[0]?.arcane
}

export function getStructureIncomingDamage(
  state: SimulationState,
  target: Tower | Structure | Base,
  damage: number,
  source: CombatSource,
  damageType: CombatDamageType = source.damageType ?? 'physical',
) {
  const protectedByBackdoor = isStructureBackdoorProtectedForTeam(state, source.team, target)
  const fortified = isStructureFortified(state, target)

  const mitigatedDamage = structureDamageTaken({
    rawDamage: damage,
    damageType,
    armor: getStructureArmor(target),
    magicResistance: getStructureMagicResistance(target),
    sourceVsBuildingMultiplier: getSourceVsBuildingMultiplier(state, source),
    backdoorMultiplier: protectedByBackdoor ? 0.25 : 1,
  })
  const timingMultiplier = getStructureTimingMultiplier(state, target)

  return (fortified ? mitigatedDamage * fortificationDamageMultiplier : mitigatedDamage) * timingMultiplier
}

export function getStructureTimingMultiplier(state: SimulationState, target: Tower | Structure | Base) {
  const minutes = state.time / 60
  if ('tier' in target) {
    if (target.tier === 1) return minutes < 8 ? 0.5 : 1
    if (target.tier === 2) return minutes < 16 ? 0.62 : 1
    if (minutes < 24) return 0.34
    if (minutes < 28) return 0.7
    return 1
  }

  if (minutes < 24) return 0.28
  if (minutes < 28) return 0.62
  return 1
}

export function getSourceVsBuildingMultiplier(state: SimulationState, source: CombatSource) {
  const creep = state.creeps.find((candidate) => candidate.id === source.id)
  if (creep) return creep.type === 'siege' ? 1.5 : 0.5

  const arcane = state.arcanes.find((candidate) => candidate.id === source.id || source.id.startsWith(`${candidate.id}-`))
  if (arcane) return source.id === arcane.id ? 0.5 : 0.15

  return 1
}

export function getMaxSimulationStepsPerFrame(speed: number) {
  return Math.max(baseMaxSimulationStepsPerFrame, Math.ceil(speed * 1.25))
}

export const uiSnapshotIntervalSeconds = 0.5
// Teto de DPR dos canvases. Com a sim no worker (T3), frame drops de render
// nao afetam mais a velocidade do jogo, entao HiDPI voltou: o App aplica este
// teto de forma ADAPTATIVA (T5) — comeca nitido e cai para 1 se o FPS medio
// ficar < 50 por ~3s seguidos (ver getCanvasDpr/reportRenderFps no App.tsx).
export const maxCanvasDevicePixelRatio = 2
export const genericHeroSkillDamageMultiplier = 0.2

export function getEntityPosition(entity: Arcane | Creep | Tower | Structure | Base | Camp | Boss | MapRune | undefined) {
  if (!entity || !('pos' in entity)) return undefined
  return entity.pos
}

export function getEntityAttackRange(entity: Arcane | Creep | Tower | Structure | Base | Camp | Boss | MapRune | undefined) {
  if (!entity) return undefined
  if (isMapRune(entity)) return undefined
  if ('player' in entity) return entity.stats.range
  if ('range' in entity) return entity.range
  return undefined
}

export function nearest<T extends { pos: Point }>(point: Point, entities: T[], range: number): T | undefined {
  let closest: T | undefined
  let closestDistanceSquared = range * range

  for (const entity of entities) {
    const entityDistanceSquared = distanceSquared(point, entity.pos)
    if (entityDistanceSquared > closestDistanceSquared) continue
    closest = entity
    closestDistanceSquared = entityDistanceSquared
  }

  return closest
}

export function nearestCreepAtIndices(point: Point, creeps: Creep[], indices: number[], range: number, time?: number) {
  let closest: Creep | undefined
  let closestDistanceSquared = range * range
  for (const index of indices) {
    const creep = creeps[index]
    const creepPosition = creep.motionPlan && time !== undefined
      ? sampleCreepMotionPlan(creep.motionPlan, time)
      : creep.pos
    const creepDistanceSquared = distanceSquared(point, creepPosition)
    if (creepDistanceSquared > closestDistanceSquared) continue
    closest = creep
    closestDistanceSquared = creepDistanceSquared
  }
  if (closest?.motionPlan && time !== undefined) materializeCreepMotionPlan(closest, time, true)
  return closest
}

export function performArcaneBasicAttack(state: SimulationState, arcane: Arcane, target: CombatTarget) {
  arcane.lastAttack = state.time
  const itemAttack = resolveArcaneItemAttackEffects(state, arcane, target)
  consumeTwinBladeKatanaSwapBuff(state, arcane)
  if ('player' in target && 'team' in target) {
    applyTowerAggro(state, target.team, arcane.id)
    applyCreepAggro(state, target.team, arcane.id)
  }
  if (isBoss(target)) {
    state.boss = {
      ...state.boss,
      aggroTargetId: arcane.id,
      aggroUntil: state.time + 5,
    }
  }
  state.effects = addAttackEffect(state.effects, {
    kind: 'arcane',
    action: 'attack',
    sourceId: arcane.id,
    targetKind: getCombatTargetKind(target),
    team: arcane.team,
    from: arcane.pos,
    to: target.pos,
    createdAt: state.time,
  })
  const dealtPhysicalDamage = Math.round(itemAttack.physicalDamage * getAuraMultiplier(state, arcane.team))
  damageEntity(state, target.id, dealtPhysicalDamage, {
    id: arcane.id,
    label: arcane.player,
    team: arcane.team,
    damageType: 'physical',
  })
  applyPostAttackItemEffects(state, arcane, target, itemAttack, dealtPhysicalDamage)
  applySpiritLinkOwnerLifestealToBear(state, arcane, target, dealtPhysicalDamage)
  triggerOnAttackSummons(state, arcane, target)
}

export const creepTacticalActivationMargin = 6

export function collectTacticalCreepActivations(state: SimulationState, frameContext: TickFrameContext) {
  if (state.creepMotionMode !== 'planned' || state.creepSpatialMode !== 'persistent') return
  const activations = frameContext.tacticalActivationCreepIds ?? new Set<string>()
  activations.clear()
  frameContext.tacticalActivationCreepIds = activations

  for (const creep of state.creeps) {
    if (creep.hp <= 0 || creep.motionPlan?.kind !== 'route') continue
    if (activeCreepMotionDiagnostics) activeCreepMotionDiagnostics.activationScans += 1
    const target = getRouteCreepTarget(creep, state, 'vision', frameContext, creepTacticalActivationMargin)
    if (!target) continue
    activations.add(creep.id)
    if (activeCreepMotionDiagnostics) activeCreepMotionDiagnostics.tacticalActivations += 1
  }
}

export function nearestRouteEnemyCreep(
  creep: Creep,
  candidates: Creep[],
  range: number,
  mode: RouteCreepTargetMode,
) {
  let closest: Creep | undefined
  let closestDistanceSquared = Number.POSITIVE_INFINITY
  for (const candidate of candidates) {
    if (candidate.team === creep.team || candidate.lane !== creep.lane || candidate.hp <= 0) continue
    const candidateDistanceSquared = distanceSquared(creep.pos, candidate.pos)
    const reach = mode === 'attack' ? getCreepAttackCenterRange(creep, candidate, range) : range
    if (candidateDistanceSquared > closestDistanceSquared || candidateDistanceSquared > reach * reach) continue
    closest = candidate
    closestDistanceSquared = candidateDistanceSquared
  }
  return closest
}

export function nearestAliveArcane(point: Point, arcanes: Arcane[], time: number, range: number) {
  let closest: Arcane | undefined
  let closestDistanceSquared = range * range
  for (const arcane of arcanes) {
    if (arcane.stats.hp <= 0 || arcane.respawn > time) continue
    const arcaneDistanceSquared = distanceSquared(point, arcane.pos)
    if (arcaneDistanceSquared > closestDistanceSquared) continue
    closest = arcane
    closestDistanceSquared = arcaneDistanceSquared
  }
  return closest
}

export function nearestAliveEnemyArcane(point: Point, arcanes: Arcane[], team: TeamId, time: number, range: number) {
  let closest: Arcane | undefined
  let closestDistanceSquared = range * range
  for (const arcane of arcanes) {
    if (arcane.team === team || arcane.stats.hp <= 0 || arcane.respawn > time) continue
    const arcaneDistanceSquared = distanceSquared(point, arcane.pos)
    if (arcaneDistanceSquared > closestDistanceSquared) continue
    closest = arcane
    closestDistanceSquared = arcaneDistanceSquared
  }
  return closest
}

export function nearestVisibleEnemyArcane(
  state: SimulationState,
  point: Point,
  team: TeamId,
  range: number,
) {
  let closest: Arcane | undefined
  let closestDistanceSquared = range * range
  for (const candidate of state.arcanes) {
    if (candidate.team === team || candidate.stats.hp <= 0 || candidate.respawn > state.time) continue
    const candidateDistanceSquared = distanceSquared(point, candidate.pos)
    if (candidateDistanceSquared > closestDistanceSquared) continue
    if (!isPointVisibleToTeam(state, team, candidate.pos)) continue
    closest = candidate
    closestDistanceSquared = candidateDistanceSquared
  }
  return closest
}

export function nearestReachableEnemyArcane(state: SimulationState, arcane: Arcane, candidates: Arcane[]) {
  let closest: Arcane | undefined
  let closestDistanceSquared = Number.POSITIVE_INFINITY
  for (const candidate of candidates) {
    if (
      candidate.team === arcane.team ||
      candidate.stats.hp <= 0 ||
      candidate.respawn > state.time
    ) continue
    const candidateDistanceSquared = distanceSquared(arcane.pos, candidate.pos)
    const reach = getArcaneAttackCenterRange(arcane, candidate)
    if (candidateDistanceSquared > closestDistanceSquared || candidateDistanceSquared > reach * reach) continue
    if (!isPointVisibleToTeam(state, arcane.team, candidate.pos)) continue
    closest = candidate
    closestDistanceSquared = candidateDistanceSquared
  }
  return closest
}

export function nearestReachableByArcane<T extends { pos: Point }>(arcane: Arcane, entities: T[]): T | undefined {
  let closest: T | undefined
  let closestDistanceSquared = Number.POSITIVE_INFINITY

  for (const entity of entities) {
    const entityDistanceSquared = distanceSquared(arcane.pos, entity.pos)
    const reach = getArcaneAttackCenterRange(arcane, entity)
    if (entityDistanceSquared > closestDistanceSquared || entityDistanceSquared > reach * reach) continue
    closest = entity
    closestDistanceSquared = entityDistanceSquared
  }

  return closest
}

export function getCreepSpatialGrid(state: SimulationState) {
  const cached = creepSpatialGridCache.get(state.runtimeToken)
  if (state.creepSpatialMode === 'persistent' && cached?.revision === state.creepSpatialRevision && isPersistentSpatialGrid(cached.grid)) {
    return cached.grid
  }
  if (state.creepSpatialMode === 'rebuild' && cached?.time === state.time && !isPersistentSpatialGrid(cached.grid)) return cached.grid

  if (state.creepSpatialMode === 'persistent') {
    const grid = cached?.grid && isPersistentSpatialGrid(cached.grid)
      ? cached.grid
      : createPersistentSpatialGrid<Creep>(proximityGridCellSize)
    syncPersistentSpatialGrid(grid, state.creeps, (creep) => creep.hp > 0)
    creepSpatialGridCache.set(state.runtimeToken, { revision: state.creepSpatialRevision, time: state.time, grid })
    return grid
  }

  const rebuilt = buildSpatialGrid(state.creeps.filter((creep) => creep.hp > 0), proximityGridCellSize)
  creepSpatialGridCache.set(state.runtimeToken, { revision: state.creepSpatialRevision, time: state.time, grid: rebuilt })
  return rebuilt
}

export function queryCreepSpatialGrid(
  state: SimulationState,
  point: Point,
  radius: number,
) {
  return queryCreepSpatialGridInto(state, point, radius, [], [])
}

export function queryCreepSpatialGridInto(
  state: SimulationState,
  point: Point,
  radius: number,
  results: Creep[],
  idBuffer: string[],
) {
  const grid = getCreepSpatialGrid(state)
  if (!isPersistentSpatialGrid(grid)) return querySpatialGridInto(grid, point, radius, results)

  queryPersistentSpatialGridIdsInto(grid, point, radius, idBuffer)
  results.length = 0
  const creepIndexes = getSimulationEntityIndexes(state).creep
  for (const id of idBuffer) {
    const index = creepIndexes.get(id)
    if (index === undefined) continue
    const creep = state.creeps[index]
    if (creep?.hp > 0) results.push(creep)
  }
  return results
}

export function buildSpatialGrid<T extends { pos: Point }>(entities: T[], cellSize: number): SpatialGrid<T> {
  const cells = new Map<number, T[]>()
  for (const entity of entities) {
    const key = getSpatialGridKey(entity.pos, cellSize)
    const cell = cells.get(key)
    if (cell) {
      cell.push(entity)
    } else {
      cells.set(key, [entity])
    }
  }
  return { cellSize, cells }
}

export function querySpatialGrid<T extends { id?: string; pos: Point }>(grid: SpatialGrid<T> | PersistentSpatialGrid<T & { id: string }>, point: Point, radius: number): T[] {
  return querySpatialGridInto(grid, point, radius, [])
}

export function querySpatialGridInto<T extends { id?: string; pos: Point }>(
  grid: SpatialGrid<T> | PersistentSpatialGrid<T & { id: string }>,
  point: Point,
  radius: number,
  results: T[],
) {
  if (isPersistentSpatialGrid(grid)) {
    return queryPersistentSpatialGridInto(grid, point, radius, results as Array<T & { id: string }>)
  }
  const minX = Math.floor((point.x - radius) / grid.cellSize)
  const maxX = Math.floor((point.x + radius) / grid.cellSize)
  const minY = Math.floor((point.y - radius) / grid.cellSize)
  const maxY = Math.floor((point.y + radius) / grid.cellSize)
  results.length = 0

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const cell = grid.cells.get(getSpatialGridCellKey(x, y))
      if (cell) results.push(...cell)
    }
  }

  return results
}

export function isPersistentSpatialGrid<T extends { id?: string; pos: Point }>(
  grid: SpatialGrid<T> | PersistentSpatialGrid<T & { id: string }>,
): grid is PersistentSpatialGrid<T & { id: string }> {
  return 'entityById' in grid
}

export function getSpatialGridKey(point: Point, cellSize: number) {
  return getSpatialGridCellKey(Math.floor(point.x / cellSize), Math.floor(point.y / cellSize))
}

export function getSpatialGridCellKey(x: number, y: number) {
  return x * 256 + y
}

export function getArcaneAttackCenterRange(arcane: Arcane, target: { pos: Point }) {
  return arcane.stats.range + getEntityCollisionRadius(arcane) + getEntityCollisionRadius(target) * 0.85
}

export function getEntityCollisionRadius(entity: { pos: Point }) {
  if ('player' in entity) return 1.7
  if ('ownerId' in entity) return 0.78
  if ('type' in entity) {
    if (entity.type === 'siege') return 0.95
    if (entity.type === 'mage' || entity.type === 'flagbearer') return 0.82
    return 0.72
  }
  if ('strength' in entity) {
    if (entity.strength === 'strong') return 1.25
    if (entity.strength === 'medium') return 1.08
    return 0.94
  }
  if ('tier' in entity) return 1.35
  if ('kind' in entity) return entity.kind === 'tower_tier_4' ? 1.25 : 1.05
  if (isBoss(entity as Boss)) return 2.2
  if ('maxHp' in entity) return 2
  return 0.8
}

export function isPointVisibleToTeam(state: SimulationState, team: TeamId, point: Point) {
  const providers = getTeamVisionProviders(state)
  return querySpatialGrid(providers.grids[team], point, providers.maxRanges[team]).some((provider) => (
    distance(provider.pos, point) <= provider.range
  ))
}

export function getVisibleEnemyArcanes(state: SimulationState, team: TeamId, frameContext?: TickFrameContext) {
  const cached = frameContext?.visibleEnemiesCache?.get(team)
  if (cached) return cached
  const visible = state.arcanes.filter((arcane) => (
    arcane.team !== team &&
    arcane.stats.hp > 0 &&
    arcane.respawn <= state.time &&
    isPointVisibleToTeam(state, team, arcane.pos)
  ))
  frameContext?.visibleEnemiesCache?.set(team, visible)
  return visible
}

export function getTeamVisionProviders(state: SimulationState) {
  const cached = teamVisionProviderCache.get(state)
  if (cached && cached.time === state.time && cached.arcanes === state.arcanes && cached.creeps === state.creeps && cached.summons === state.summons) return cached
  const buildingVision = worldVisionToMapRadius(currentVision(1800, 800, state.time))
  const makeProviders = (team: TeamId): TeamVisionProvider[] => [
    ...state.arcanes
      .filter((arcane) => arcane.team === team && arcane.stats.hp > 0 && arcane.respawn <= state.time)
      .map((arcane) => ({ pos: arcane.pos, range: arcane.visionRange })),
    ...state.creeps
      .filter((creep) => creep.team === team && creep.hp > 0)
      .map((creep) => ({ pos: creep.pos, range: getCreepVisionRange(creep) })),
    ...state.summons
      .filter((summon) => summon.team === team && summon.hp > 0 && summon.expiresAt > state.time)
      .map((summon) => ({ pos: summon.pos, range: summon.visionRange })),
    ...state.towers
      .filter((tower) => tower.team === team && tower.hp > 0)
      .map((tower) => ({ pos: tower.pos, range: buildingVision })),
    ...state.structures
      .filter((structure) => structure.team === team && structure.hp > 0)
      .map((structure) => ({ pos: structure.pos, range: buildingVision })),
    ...state.bases
      .filter((base) => base.team === team && base.hp > 0)
      .map((base) => ({ pos: base.pos, range: buildingVision })),
  ]
  const dawn = makeProviders('dawn')
  const dusk = makeProviders('dusk')
  const next = {
    time: state.time,
    arcanes: state.arcanes,
    creeps: state.creeps,
    summons: state.summons,
    grids: {
      dawn: buildSpatialGrid(dawn, proximityGridCellSize),
      dusk: buildSpatialGrid(dusk, proximityGridCellSize),
    },
    maxRanges: {
      dawn: Math.max(0, ...dawn.map((provider) => provider.range)),
      dusk: Math.max(0, ...dusk.map((provider) => provider.range)),
    },
  }
  teamVisionProviderCache.set(state, next)
  return next
}

export function getTeamMemoryDanger(state: SimulationState, team: TeamId, point: Point) {
  return areaDangerFromMemory(state.teamMemory[team] ?? [], point, state.time, 20)
}

export function getArcaneOffensiveThreat(state: SimulationState, arcane: Arcane) {
  const cached = offensiveThreatCache.get(arcane)
  if (cached?.time === state.time) return cached

  const offensiveSkills = getArcaneRuntimeSkills(arcane)
    .filter((skill) => skill.kind !== 'passive' && !isPositiveSimpleSkill(skill))
    .map((skill) => ({ skill, level: getSimpleSkillLevel(arcane, skill) }))
    .filter(({ skill, level }) => (
      level > 0 &&
      arcane.stats.mana >= getSimpleSkillManaCost(arcane, skill, level) &&
      (arcane.itemCooldowns[skill.id] ?? 0) <= state.time
    ))

  const threat = {
    time: state.time,
    range: offensiveSkills.reduce(
      (range, { skill, level }) => Math.max(range, getSimpleSkillRange(arcane, skill, level)),
      arcane.stats.range,
    ),
    readyDamage: offensiveSkills.reduce(
      (damage, { skill, level }) => damage + getSimpleSkillDamage(arcane, skill, level),
      0,
    ) * genericHeroSkillDamageMultiplier,
  }
  offensiveThreatCache.set(arcane, threat)
  return threat
}

export function getDangerScore(
  state: SimulationState,
  arcane: Arcane,
  visibleEnemies = state.arcanes.filter((enemy) => (
    enemy.team !== arcane.team &&
    enemy.stats.hp > 0 &&
    enemy.respawn <= state.time &&
    isPointVisibleToTeam(state, arcane.team, enemy.pos)
  )),
  frameContext?: TickFrameContext,
) {
  const nearbyEnemyCreeps = queryCreepSpatialGrid(state, arcane.pos, 8)
  let enemyHeroPressure = 0
  for (const enemy of visibleEnemies) {
    const range = 16
    const proximity = Math.max(0, 1 - distance(arcane.pos, enemy.pos) / range)
    enemyHeroPressure += proximity * (enemy.stats.damage / Math.max(1, arcane.stats.maxHp)) * 180
  }
  let towerPressure = 0
  for (const tower of state.towers) {
    if (tower.team === arcane.team || tower.hp <= 0) continue
    const radius = tower.range + 2
    const distanceSq = distanceSquared(arcane.pos, tower.pos)
    if (distanceSq > radius * radius) continue
    const proximity = 1 - Math.sqrt(distanceSq) / radius
    towerPressure += proximity * 38
  }
  let creepPressure = 0
  for (const creep of nearbyEnemyCreeps) {
    if (creep.team === arcane.team) continue
    const proximity = Math.max(0, 1 - distance(arcane.pos, creep.pos) / 8)
    creepPressure += proximity * 5
  }
  let neutralPressure = 0
  for (const camp of state.camps) {
    if (camp.hp <= 0) continue
    const radius = camp.range + 3
    const distanceSq = distanceSquared(arcane.pos, camp.pos)
    if (distanceSq > radius * radius) continue
    const proximity = 1 - Math.sqrt(distanceSq) / radius
    neutralPressure += proximity * (camp.strength === 'strong' ? 16 : camp.strength === 'medium' ? 11 : 7)
  }
  const bossPressure = state.boss.hp > 0 && state.boss.aggroTargetId === arcane.id && state.boss.aggroUntil && state.boss.aggroUntil > state.time
    ? Math.max(0, 1 - distance(arcane.pos, state.boss.pos) / (state.boss.range + 5)) * 26
    : 0
  const actionRadiusPressure = getEnemyActionThreatScore(state, arcane, arcane.pos, visibleEnemies, frameContext) * 0.38
  let allyRelief = 0
  for (const ally of state.arcanes) {
    if (ally.team !== arcane.team || ally.id === arcane.id || ally.stats.hp <= 0 || ally.respawn > state.time) continue
    allyRelief += Math.max(0, 1 - distance(arcane.pos, ally.pos) / 12) * 9
  }

  return Math.max(0, Math.round(Math.min(100, enemyHeroPressure + towerPressure + creepPressure + neutralPressure + bossPressure + actionRadiusPressure - allyRelief)))
}

export function getEnemyActionThreatScore(
  state: SimulationState,
  arcane: Arcane,
  point: Point,
  visibleEnemies = state.arcanes.filter((enemy) => (
    enemy.team !== arcane.team &&
    enemy.stats.hp > 0 &&
    enemy.respawn <= state.time &&
    isPointVisibleToTeam(state, arcane.team, enemy.pos)
  )),
  frameContext?: TickFrameContext,
) {
  const pointCache = frameContext?.actionThreatCache?.get(point)
  const cached = pointCache?.get(arcane.id)
  if (cached !== undefined) return cached
  const nearbyEnemyCreeps = queryCreepSpatialGrid(state, point, 20)
  let towerThreat = 0
  for (const tower of state.towers) {
    if (tower.team === arcane.team || tower.hp <= 0) continue
    const radius = tower.range + 1.2
    if (distanceSquared(point, tower.pos) <= radius * radius) towerThreat += 42
  }
  let visibleArcaneThreat = 0
  for (const enemy of visibleEnemies) {
    const threat = getArcaneOffensiveThreat(state, enemy)
    const radius = Math.max(enemy.stats.range + 2.2, threat.range + 1.4)
    if (distance(point, enemy.pos) > radius) continue
    const attackPressure = enemy.stats.hp / enemy.stats.maxHp > 0.45 ? 18 : 11
    const spellPressure = Math.min(44, (threat.readyDamage / Math.max(1, arcane.stats.maxHp)) * 65)
    const lethalPressure = threat.readyDamage >= arcane.stats.hp * 0.7 ? 24 : 0
    visibleArcaneThreat += attackPressure + spellPressure + lethalPressure
  }
  let creepThreat = 0
  for (const creep of nearbyEnemyCreeps) {
    if (creep.team === arcane.team) continue
    const radius = getCreepVisionRange(creep)
    if (distance(point, creep.pos) <= radius) creepThreat += getCreepLaneValue(creep)
  }
  let neutralThreat = 0
  for (const camp of state.camps) {
    if (camp.hp <= 0) continue
    const radius = camp.range + 1.5
    if (distanceSquared(point, camp.pos) <= radius * radius) {
      neutralThreat += camp.strength === 'strong' ? 22 : camp.strength === 'medium' ? 15 : 9
    }
  }
  const bossThreat = state.boss.hp > 0 && state.boss.aggroTargetId === arcane.id && state.boss.aggroUntil && state.boss.aggroUntil > state.time && distance(point, state.boss.pos) <= state.boss.range + 2
    ? 32
    : 0
  let nearbyAllyRelief = 0
  for (const ally of state.arcanes) {
    if (ally.team !== arcane.team || ally.id === arcane.id || ally.stats.hp <= 0 || ally.respawn > state.time) continue
    if (distance(point, ally.pos) <= 8) nearbyAllyRelief += 4
  }

  const score = Math.max(0, Math.min(100, towerThreat + visibleArcaneThreat + creepThreat + neutralThreat + bossThreat - nearbyAllyRelief))
  if (frameContext?.actionThreatCache) {
    const cache = pointCache ?? new Map<string, number>()
    cache.set(arcane.id, score)
    if (!pointCache) frameContext.actionThreatCache.set(point, cache)
  }
  return score
}

export function getEffectiveDangerScore(dangerScore: number, actionDanger: number, hpRatio: number) {
  const healthPressure = hpRatio >= 0.82
    ? 0
    : hpRatio >= 0.62
      ? (0.82 - hpRatio) * 120
      : 24 + (0.62 - hpRatio) * 155

  return Math.round(Math.max(dangerScore, actionDanger, Math.min(100, healthPressure)))
}

export function nearestLanePoint(point: Point, path: Point[]) {
  let nearest = path[0]
  let nearestDistance = Number.POSITIVE_INFINITY

  for (let index = 0; index < path.length - 1; index += 1) {
    const projected = projectPointToSegment(point, path[index], path[index + 1])
    const projectedDistance = distance(point, projected)
    if (projectedDistance < nearestDistance) {
      nearest = projected
      nearestDistance = projectedDistance
    }
  }

  return nearest
}

export function isNearRoute(point: Point, path: Point[], maxDistance: number) {
  return distance(point, nearestLanePoint(point, path)) <= maxDistance
}

// Torres vivas por (time, lane), cacheado por tick: as checagens de decisão
// (isUnsafeUnderEnemyTower/isTooDeepForAggression) rodam por creep candidato e
// filtravam state.towers inteiro a cada chamada.
export function getAliveTowersInLane(state: SimulationState, team: TeamId, lane: LaneId) {
  let cached = aliveTowersByLaneCache.get(state)
  if (!cached || cached.time !== state.time) {
    cached = { time: state.time, byTeamLane: new Map() }
    aliveTowersByLaneCache.set(state, cached)
  }
  const key = `${team}:${lane}`
  let towers = cached.byTeamLane.get(key)
  if (!towers) {
    towers = state.towers.filter((tower) => tower.team === team && tower.hp > 0 && tower.lane === lane)
    cached.byTeamLane.set(key, towers)
  }
  return towers
}

export function isUnsafeUnderEnemyTower(state: SimulationState, team: TeamId, point: Point, lane: LaneId) {
  const enemyTeam: TeamId = team === 'dawn' ? 'dusk' : 'dawn'
  const enemyTower = nearest(point, getAliveTowersInLane(state, enemyTeam, lane), 9.8)
  if (!enemyTower) return false

  const nearbyCreeps = queryCreepSpatialGrid(state, enemyTower.pos, 8)
  const alliedWave = nearest(enemyTower.pos, nearbyCreeps.filter((creep) => creep.team === team && creep.lane === lane), 8)
  return !alliedWave
}

export function isTooDeepForAggression(state: SimulationState, arcane: Arcane, point: Point, lane: LaneId, phase: GamePhase) {
  const enemyTeam: TeamId = arcane.team === 'dawn' ? 'dusk' : 'dawn'
  const enemyTierOne = getAliveTowersInLane(state, enemyTeam, lane).find((tower) => tower.tier === 1)
  if (!enemyTierOne) return false

  const path = lanePaths[arcane.team][lane]
  const targetProgress = laneProgress(point, path)
  const towerProgress = laneProgress(enemyTierOne.pos, path)
  const phaseMultiplier = phase === 'early' ? 0.55 : phase === 'mid' ? 0.85 : 1.1
  const allowedAfterTower = (0.04 + (arcane.aggression / 100) * 0.18) * phaseMultiplier

  if (targetProgress <= towerProgress + allowedAfterTower) return false

  const nearbyCreeps = queryCreepSpatialGrid(state, point, 9)
  const alliedWave = nearest(point, nearbyCreeps.filter((creep) => creep.team === arcane.team && creep.lane === lane), 9)
  return !alliedWave
}

export function getAlliedWaveNearObjective(state: SimulationState, team: TeamId, lane: LaneId, target: Tower | Structure | Base) {
  const path = lanePaths[team][lane]
  const targetProgress = laneProgress(target.pos, path)
  const searchRadius = 'tier' in target
    ? target.range + (target.tier >= 3 ? 8 : 6)
    : 'kind' in target && target.kind === 'tower_tier_4'
      ? target.range + 7
      : 13

  return nearest(
    target.pos,
    state.creeps.filter((creep) => {
      if (creep.team !== team || creep.lane !== lane || creep.hp <= 0) return false
      const progress = laneProgress(creep.pos, path)
      return progress >= targetProgress - 0.08 && progress <= targetProgress + 0.08
    }),
    searchRadius,
  )
}

export function laneProgress(point: Point, path: Point[]) {
  const totalLength = getLaneTotalLength(path)
  if (totalLength === 0) return 0
  return Math.max(0, Math.min(1, getLaneDistanceAlongPath(point, path) / totalLength))
}

export function getLaneDistanceAlongPath(point: Point, path: Point[]) {
  let totalLength = 0
  let distanceToProjection = 0
  let bestDistance = Number.POSITIVE_INFINITY
  let lengthBeforeSegment = 0

  for (let index = 0; index < path.length - 1; index += 1) {
    const start = path[index]
    const end = path[index + 1]
    const segmentLength = distance(start, end)
    const projected = projectPointToSegment(point, start, end)
    const projectedDistance = distance(point, projected)
    const projectedLength = distance(start, projected)

    if (projectedDistance < bestDistance) {
      bestDistance = projectedDistance
      distanceToProjection = lengthBeforeSegment + projectedLength
    }

    lengthBeforeSegment += segmentLength
    totalLength += segmentLength
  }

  return distanceToProjection
}

export function getLaneTotalLength(path: Point[]) {
  return path.slice(0, -1).reduce((total, point, index) => total + distance(point, path[index + 1]), 0)
}

export function getLanePointAtDistance(path: Point[], targetDistance: number) {
  let remaining = Math.max(0, targetDistance)

  for (let index = 0; index < path.length - 1; index += 1) {
    const start = path[index]
    const end = path[index + 1]
    const segmentLength = distance(start, end)
    if (remaining <= segmentLength) {
      const ratio = segmentLength === 0 ? 0 : remaining / segmentLength
      return {
        x: start.x + (end.x - start.x) * ratio,
        y: start.y + (end.y - start.y) * ratio,
      }
    }
    remaining -= segmentLength
  }

  return path[path.length - 1]
}

export function syncLanePathIndex(point: Point, path: Point[], currentIndex: number) {
  const currentProgress = laneProgress(point, path)
  const nextIndex = path.findIndex((pathPoint, index) => index > 0 && laneProgress(pathPoint, path) > currentProgress + 0.018)
  if (nextIndex === -1) return path.length - 1
  return Math.max(1, Math.min(path.length - 1, nextIndex || currentIndex))
}

export function getLaneAdvancePoint(arcane: Arcane, path: Point[], pathIndex: number) {
  const currentDistance = getLaneDistanceAlongPath(arcane.pos, path)
  const targetPathPoint = path[Math.max(1, Math.min(path.length - 1, pathIndex))]
  const targetDistance = getLaneDistanceAlongPath(targetPathPoint, path)
  const lookAhead = arcane.stats.attackType === 'melee' ? 7.5 : 9.5
  const advanceDistance = Math.min(targetDistance, currentDistance + lookAhead)
  return getLanePointAtDistance(path, advanceDistance)
}

export function safeLaneRetreatPoint(arcane: Arcane, path: Point[], tower: Tower) {
  const towerDistance = getLaneDistanceAlongPath(tower.pos, path)
  const safeDistanceFromTower = tower.range + getEntityCollisionRadius(arcane) + 2.4
  const targetDistance = Math.max(0, towerDistance - safeDistanceFromTower)
  let point = formationPoint(getLanePointAtDistance(path, targetDistance), arcane.id)

  for (let attempts = 0; attempts < 6 && distance(point, tower.pos) <= tower.range + 1.8; attempts += 1) {
    point = formationPoint(getLanePointAtDistance(path, Math.max(0, targetDistance - attempts * 1.8)), arcane.id)
  }

  return clampToMapBounds(point)
}

export function safeLaneObjectiveHoldPoint(arcane: Arcane, path: Point[], objective: Tower | Structure) {
  const objectiveDistance = getLaneDistanceAlongPath(objective.pos, path)
  const safeDistance = objective.range + getEntityCollisionRadius(arcane) + 3.2
  const targetDistance = Math.max(0, objectiveDistance - safeDistance)
  return clampToMapBounds(formationPoint(getLanePointAtDistance(path, targetDistance), arcane.id))
}

export function projectPointToSegment(point: Point, start: Point, end: Point): Point {
  const segmentX = end.x - start.x
  const segmentY = end.y - start.y
  const lengthSquared = segmentX * segmentX + segmentY * segmentY
  if (lengthSquared === 0) return start

  const ratio = Math.max(0, Math.min(1, ((point.x - start.x) * segmentX + (point.y - start.y) * segmentY) / lengthSquared))
  return {
    x: start.x + segmentX * ratio,
    y: start.y + segmentY * ratio,
  }
}

export function distance(a: Point, b: Point) {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.sqrt(dx * dx + dy * dy)
}

export function getArcaneEmergencyRecoveryRatio(state: SimulationState, arcane: Arcane) {
  const consumableHealing = arcane.items.reduce((total, name) => total + (getConsumableByName(name)?.heal ?? 0), 0)
  const activeHot = state.timedEffects.reduce((total, effect) => (
    effect.targetId === arcane.id && effect.kind === 'hot' && effect.expiresAt > state.time
      ? total + effect.value * Math.max(0, effect.expiresAt - state.time)
      : total
  ), 0)
  return Math.min(0.24, (consumableHealing + activeHot) / Math.max(1, arcane.stats.maxHp))
}

export function distanceSquared(a: Point, b: Point) {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return dx * dx + dy * dy
}

export function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function moveToward(from: Point, to: Point, amount: number): Point {
  const total = distance(from, to)
  if (total <= amount || total === 0) return clampToMapBounds(to)
  return clampToMapBounds({ x: from.x + ((to.x - from.x) / total) * amount, y: from.y + ((to.y - from.y) / total) * amount })
}

export function spreadPoint(point: Point, index: number): Point {
  const offsets = [
    [0, 0],
    [1.6, -1.2],
    [-1.4, 1.3],
    [2.4, 1.4],
    [-2.2, -1.5],
  ]
  const [x, y] = offsets[index % offsets.length]
  return clampToMapBounds({ x: point.x + x, y: point.y + y })
}

export function formationPoint(point: Point, id: string): Point {
  let hash = 0
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash + id.charCodeAt(index) * (index + 3)) % 997
  }

  return spreadPoint(point, hash)
}


export function clampToMapBounds(point: Point): Point {
  return {
    x: Math.max(mapWallPadding, Math.min(100 - mapWallPadding, point.x)),
    y: Math.max(mapWallPadding, Math.min(100 - mapWallPadding, point.y)),
  }
}

export function mapEdgeApproachPoint(point: Point): Point {
  const approachPadding = 9
  return {
    x: Math.max(approachPadding, Math.min(100 - approachPadding, point.x)),
    y: Math.max(approachPadding, Math.min(100 - approachPadding, point.y)),
  }
}

export function isBoss(entity: Arcane | Creep | Tower | Structure | Base | Camp | Boss | MapRune): entity is Boss {
  return entity.id === 'boss-world-serpent'
}

export function isMapRune(entity: Arcane | Creep | Tower | Structure | Base | Camp | Boss | MapRune): entity is MapRune {
  return entity.id.startsWith('rune-')
}

export function getSkillShortName(skill: HeroSkillDefinition) {
  return skill.name
    .split(' ')
    .slice(0, 2)
    .join(' ')
}


export { calculateHeroStats }
export { XP_TO_REACH_LEVEL, getLevelProgress } from '../game-systems/nonCombatFormulas.ts'
export type { HeroDefinition, HeroSkillDefinition } from '../game-systems/heroAttributes.ts'
export type { ExecutionFailureType, PlayerModeType, TeamPlan } from '../ai/types/aiTypes.ts'
