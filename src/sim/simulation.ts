import type { ItemSeed } from '../data/itemSeeds.ts'
import { analyzeGameState } from '../ai/analysis/gameStateAnalyzer.ts'
import { DEFAULT_TEAM_AI_PROFILES } from '../ai/config/aiConstants.ts'
import { resolvePlayerExecution } from '../ai/execution/executionModel.ts'
import { addAiMemoryEvent, areaDangerFromMemory, pruneAiMemory } from '../ai/memory/memorySystem.ts'
import { selectPlayerMode } from '../ai/player/playerAgent.ts'
import { selectTeamPlan } from '../ai/team/teamBrain.ts'
import type { AiMemoryEvent, AnalyzedGameState, ExecutionFailureType, PlayerModeType, RawAiGameSnapshot, TeamPlan } from '../ai/types/aiTypes.ts'
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
  healingLotusValue,
  expectedTimeToItemSeconds,
  killGold,
  killXp,
  passiveGoldForTick,
  resourceRegenForTick,
  respawnDurationSeconds,
  stackSuccessChance,
  stackedCampValue,
  wisdomRuneXp,
} from '../game-systems/nonCombatFormulas.ts'
import { expectedTimeToKillStructure, isBackdoorProtected, structureDamageTaken } from '../game-systems/structureFormulas.ts'
import { getPrimarySkillUsageSituation, getSkillAiUsageScore, getSkillEffectProfile, hasSkillTag, isConfirmedGlobalSkill } from '../game-systems/skillRuntime.ts'
import {
  getLaneCreepReward,
  getLaneCreepStats,
  getLaneCreepWaveKinds,
  getNeutralCampReward,
  getNeutralCampStats,
  getStructureStatsByRole,
  type LaneCreepKind,
} from '../game-systems/unitSeedsAdapter.ts'
import { isDay } from '../game-systems/visionFormulas.ts'

export type TeamId = 'dawn' | 'dusk'
export type TeamMatchOutcome = 'winner' | 'loser' | 'draw'
export type LaneId = 'top' | 'mid' | 'bot'
export type EntityKind = 'arcane' | 'creep' | 'tower' | 'structure' | 'base' | 'camp' | 'boss' | 'rune'
export type GamePhase = 'early' | 'mid' | 'late'
export type DayCycle = 'day' | 'night'
export type CampStrength = 'weak' | 'medium' | 'strong'
export type RuneKind = 'bounty' | 'power' | 'wisdom' | 'lotus'
export type PowerRuneKind = 'haste' | 'arcane' | 'shield' | 'damage'
export type StructureKind = 'barracks_melee' | 'barracks_ranged' | 'tower_tier_4'
export type TeamObjectiveKind = 'tower' | 'structure' | 'boss' | 'pickoff'
export type DecisionStatus = 'sharp' | 'steady' | 'hesitant' | 'tilted'
export type Selected = { kind: EntityKind; id: string } | undefined

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
  pathIndex: number
  respawn: number
  lastAttack: number
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
  tpScrolls: number
  tpCooldownUntil: number
  channeling?: ChannelingAction
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
  lastHitBy?: CombatSource
  aggroTargetId?: string
  aggroUntil?: number
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
}
export type CombatTarget = Arcane | Creep | Tower | Structure | Base | Camp | Boss
export type RouteCreepTargetMode = 'attack' | 'vision'
export type TickFrameContext = {
  routeCreepTargetCache: Record<RouteCreepTargetMode, Map<string, CombatTarget | null>>
  // Caches válidos dentro de um único tick (mesma semântica do cache de alvo
  // acima: pequenas mutações de posição/hp no meio do tick são ignoradas).
  arcaneNearRouteCache: Map<Point[], Map<string, boolean>>
  attackableTowersCache: Partial<Record<TeamId, Tower[]>>
  attackableStructuresCache: Partial<Record<TeamId, Structure[]>>
}
export type SpatialGrid<T extends { pos: Point }> = {
  cellSize: number
  cells: Map<number, T[]>
}
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
  matchSeed: string
  time: number
  nextWave: number
  kills: Record<TeamId, number>
  winner?: TeamId
  nextTeamDecisionAt: number
  teamPlans: Partial<Record<TeamId, TeamPlan>>
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
  towers: Tower[]
  structures: Structure[]
  bases: Base[]
  camps: Camp[]
  runes: MapRune[]
  boss: Boss
}

export const analyzedGameStateCache = new WeakMap<SimulationState, { time: number; analyzed: AnalyzedGameState }>()
export const playerAiProfileCache = new Map<string, ReturnType<typeof buildPlayerAiProfile>>()
export const creepSpatialGridCache = new WeakMap<SimulationState, { time: number; grid: SpatialGrid<Creep> }>()
export const aliveTowersByLaneCache = new WeakMap<SimulationState, { time: number; byTeamLane: Map<string, Tower[]> }>()
export const offensiveThreatCache = new WeakMap<Arcane, { time: number; range: number; readyDamage: number }>()

export type SimulationEntityIndexes = {
  arcane: Map<string, number>
  creep: Map<string, number>
  tower: Map<string, number>
  structure: Map<string, number>
  base: Map<string, number>
  camp: Map<string, number>
  arcaneIds: string[]
}

const simulationEntityIndexesCache = new WeakMap<SimulationState, {
  indexes: SimulationEntityIndexes
  creepCount: number
  firstCreepId?: string
  lastCreepId?: string
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
  kind: 'slow' | 'stun' | 'silence' | 'root' | 'disarm' | 'hex' | 'fear' | 'taunt' | 'sleep' | 'break' | 'mute' | 'buff' | 'barrier' | 'dot' | 'hot'
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
// 30Hz é suficiente para a física da sim: o playback consome frames a 5Hz com
// interpolação visual, e as decisões de IA já são gated a 0.1s (decisionGateSeconds).
// Dobrar o passo corta ~metade do custo de CPU da partida no worker.
export const simulationFrameSeconds = 1 / 30
export const decisionGateSeconds = 0.1
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
    { x: 18, y: 76 },
    { x: 82, y: 24 },
    { x: 24, y: 28 },
    { x: 76, y: 72 },
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
  consumableCatalog = itemModule.consumableCatalog
  getRecommendedBuildItemIdsForHero = itemModule.getRecommendedBuildItemIds
  getRecommendedStartingItemNamesForHero = itemModule.getRecommendedStartingItemNames
  getRuntimeItemSeedById = itemModule.getItemSeedById
  toRuntimeItemModifier = itemModule.toItemModifier
}

export const rosterSeed: Omit<Arcane, 'pos' | 'target' | 'pathIndex' | 'respawn' | 'lastAttack' | 'aggression' | 'visionRange' | 'shotcalling' | 'macroDecision' | 'microDecision' | 'aiMode' | 'aiReason' | 'aiExecutionChance' | 'aiExecutionDelay' | 'aiFailure' | 'decisionStatus' | 'decisionTempo' | 'nextDecisionAt' | 'lastDecisionAt' | 'forceDecision' | 'lastDecisionHpRatio' | 'lastDecisionManaRatio' | 'lastDecisionPos' | 'decision' | 'itemCooldowns' | 'tpScrolls' | 'tpCooldownUntil' | 'channeling' | 'skillLevels' | 'unspentSkillPoints' | 'statBonusLevels' | 'earnedGold' | 'kills' | 'deaths' | 'assists' | 'damageDealt' | 'heroDamageDealt' | 'structureDamageDealt' | 'damageTaken' | 'healingDone' | 'healingReceived' | 'laneCreepKills' | 'denies' | 'neutralKills' | 'objectiveKills' | 'stats'>[] = [
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

export function createInitialState(seed = 'lota-default-seed'): SimulationState {
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
      respawn: 0,
      lastAttack: -10,
      aggression: getRoleAggression(arcane.role),
      visionRange: getArcaneDefinitionVisionRange(arcane.heroDefinitionId, 'day'),
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

  return {
    matchSeed: seed,
    time: 0,
    nextWave: 0,
    kills: { dawn: 0, dusk: 0 },
    nextTeamDecisionAt: 0,
    teamPlans: {},
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
  return createBountyRunes(0, 0)
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
  return (cycle === 'day' ? calculated.vision.dayVision : calculated.vision.nightVision) / 100
}

export function getHeroDefinition(heroDefinitionId: string) {
  const definition = heroDefinitions[heroDefinitionId]
  if (!definition) {
    throw new Error(`Hero definition not loaded: ${heroDefinitionId}`)
  }
  return definition
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
      hp: stats.hp,
      maxHp: stats.hp,
      damage: stats.damage,
      range: stats.range,
      lastAttack: -10,
      level: stats.level,
      respawn: 0,
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
    xp: Math.round(stackedCampValue(reward.xp, camp.stackCount)),
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
        }
      }),
    ),
  )
}

export function tick(state: SimulationState, delta: number, shouldDecide: boolean): SimulationState {
  if (state.winner) return state

  let next: SimulationState = state
  const frameContext: TickFrameContext = {
    routeCreepTargetCache: { attack: new Map(), vision: new Map() },
    arcaneNearRouteCache: new Map(),
    attackableTowersCache: {},
    attackableStructuresCache: {},
  }
  const previousDayCycle = getDayCycle(next.time)
  const previousTime = next.time
  next.time = Number((next.time + delta).toFixed(3))
  if (next.time >= next.nextWave) {
    next.creeps.push(...spawnWave(next))
    next.nextWave += NON_COMBAT_RULES.map.waveIntervalSeconds
  }
  next.runes = spawnRunesForTick(next, previousTime)
  // Ouro passivo acumula na cadência do gate de decisão (mesma taxa por
  // segundo): conceder a cada tick clonava 10 arcanes/tick só para somar ouro.
  const passiveGold = shouldDecide ? passiveGoldForTick(next.time, decisionGateSeconds) : 0
  next.effects = next.effects.filter((effect) => next.time - effect.createdAt < effect.duration)
  next.timedEffects = next.timedEffects.filter((effect) => effect.expiresAt > next.time)
  next = processTimedEffects(next)
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
  const dayCycle = getDayCycle(next.time)
  applyItemAuraEffects(next)
  applySkillAuraEffects(next)
  next.arcanes = next.arcanes.map((arcane, index) => {
    const current = dayCycle !== previousDayCycle
      ? {
          ...arcane,
          visionRange: getArcaneDefinitionVisionRange(arcane.heroDefinitionId, dayCycle),
        }
      : arcane
    return respawnArcaneIfReady(current, next.time, index)
  })

  next.camps = next.camps.map((camp) => {
    if (camp.hp > 0 || camp.respawn > next.time) return camp
    const stats = getCampStats(camp.strength)
    return { ...camp, hp: stats.hp, maxHp: stats.hp, damage: stats.damage, stackCount: 0, lastHitBy: undefined }
  })
  next = processJungleStacks(next, previousTime)
  next.boss = updateBoss(next.boss, next.time, delta)

  const needsInitialTeamPlan = next.teamPlans.dawn === undefined || next.teamPlans.dusk === undefined
  if ((shouldDecide || needsInitialTeamPlan) && (needsInitialTeamPlan || next.time >= next.nextTeamDecisionAt)) {
    next = updateTeamPlans(next)
    next = updateTeamCalls(next)
    next.nextTeamDecisionAt = next.time + teamDecisionIntervalSeconds
  }

  next.arcanes = next.arcanes.map((arcane) => updateArcaneMovement(arcane, next, delta, shouldDecide))
  next = collectRunes(next)
  if (passiveGold > 0) {
    next.arcanes = next.arcanes.map((arcane) => (
      arcane.stats.hp > 0 && arcane.respawn <= next.time
        ? grantArcaneEconomy(arcane, passiveGold, 0)
        : arcane
    ))
  }
  next.creeps = next.creeps.map((creep) => updateCreepMovement(creep, next, delta, frameContext))
  // Separação de hitbox é cosmética (evita unidades empilhadas); rodar só nos
  // ticks de decisão (10Hz) é indistinguível no playback de 5Hz e poupa CPU.
  if (shouldDecide) resolveUnitHitboxes(next)
  next = updateTeamFortifications(next)
  next = resolveCombat(next, frameContext)
  next = resolveDeaths(next)
  next.winner = next.bases.find((base) => base.hp <= 0)?.team === 'dawn' ? 'dusk' : next.bases.find((base) => base.hp <= 0)?.team === 'dusk' ? 'dawn' : undefined
  return next
}

export function cloneSimulationStateForTick(state: SimulationState): SimulationState {
  return {
    ...state,
    kills: { ...state.kills },
    teamPlans: { ...state.teamPlans },
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
      lastDecisionPos: { ...arcane.lastDecisionPos },
      itemCooldowns: { ...arcane.itemCooldowns },
      skillLevels: { ...arcane.skillLevels },
      channeling: arcane.channeling ? { ...arcane.channeling, target: { ...arcane.channeling.target } } : undefined,
      items: [...arcane.items],
      stats: { ...arcane.stats },
      lastHitBy: arcane.lastHitBy ? { ...arcane.lastHitBy } : undefined,
    })),
    creeps: state.creeps.map((creep) => ({
      ...creep,
      pos: { ...creep.pos },
      lastHitBy: creep.lastHitBy ? { ...creep.lastHitBy } : undefined,
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
]

type RenderArcaneFrame = [
  number, number, number, number, number, number, number, number,
  ChannelingAction | undefined,
]

type RenderCreepFrame = [string, TeamId, LaneId, LaneCreepKind, number, number, number, number, number]
type RenderAttackEffectFrame = [AttackEffect['kind'], EntityKind, TeamId, number, number, number, number, number, number]
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
  towerHp: number[]
  structureHp: number[]
  baseHp: number[]
  camps: Array<[number, number, number, number]>
  runes: RenderRuneFrame[]
  boss: [number, number, number, number, number]
}

export type MatchRenderDetails = {
  teamPlans: Partial<Record<TeamId, TeamPlan>>
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
    effects: state.effects.map((effect) => [effect.kind, effect.targetKind, effect.team, renderNumber(effect.from.x), renderNumber(effect.from.y), renderNumber(effect.to.x), renderNumber(effect.to.y), renderNumber(effect.createdAt), effect.duration]),
    timedEffects: state.timedEffects.map((effect) => ({ ...effect, modifiers: effect.modifiers ? { ...effect.modifiers } : undefined })),
    deathMarkers: state.deathMarkers.map((marker) => [marker.arcane, marker.team, marker.pos.x, marker.pos.y, marker.createdAt, marker.expiresAt]),
    denyMarkers: state.denyMarkers.map((marker) => [marker.team, marker.pos.x, marker.pos.y, marker.createdAt, marker.expiresAt]),
    goldMarkers: state.goldMarkers.map((marker) => [marker.team, marker.pos.x, marker.pos.y, marker.createdAt, marker.expiresAt, marker.amount]),
    skillMarkers: state.skillMarkers.map((marker) => [marker.team, marker.pos.x, marker.pos.y, marker.createdAt, marker.expiresAt, marker.label]),
    recentTeleports: state.recentTeleports.map((record) => [record.team, record.pos.x, record.pos.y, record.startedAt]),
    arcanes: state.arcanes.map((arcane) => [
      renderNumber(arcane.pos.x), renderNumber(arcane.pos.y), renderNumber(arcane.respawn), renderNumber(arcane.stats.maxHp),
      renderNumber(arcane.stats.hp), renderNumber(arcane.stats.maxMana), renderNumber(arcane.stats.mana), renderNumber(arcane.stats.range),
      arcane.channeling ? { ...arcane.channeling, target: { ...arcane.channeling.target } } : undefined,
    ]),
    creeps: state.creeps.map((creep) => [
      creep.id, creep.team, creep.lane, creep.type, renderNumber(creep.pos.x),
      renderNumber(creep.pos.y), renderNumber(creep.hp), renderNumber(creep.maxHp),
      renderNumber(creep.range),
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
    matchSeed: frame.matchSeed,
    time: frame.time,
    nextWave: 0,
    kills: { dawn: frame.kills[0], dusk: frame.kills[1] },
    winner: frame.winner,
    nextTeamDecisionAt: 0,
    teamPlans: details.teamPlans,
    teamMemory: details.teamMemory,
    teamCalls: {},
    teamAuras: details.teamAuras,
    teamFortifications: { dawn: details.teamFortifications[0], dusk: details.teamFortifications[1] },
    events: details.events,
    effects: frame.effects.map((effect, index) => ({
      id: `fx-${frame.time}-${index}`,
      kind: effect[0], targetKind: effect[1], team: effect[2],
      from: { x: effect[3], y: effect[4] }, to: { x: effect[5], y: effect[6] },
      createdAt: effect[7], duration: effect[8],
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
    spawnedAt: time,
    expiresAt: time + NON_COMBAT_RULES.map.bountyRuneIntervalSeconds,
    spawnIndex,
  }))
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
  next.camps = next.camps.map((camp) => {
    if (camp.hp <= 0 || camp.stackCount >= NON_COMBAT_RULES.map.maxJungleStacks) return camp
    if (Math.floor(camp.lastStackAttemptAt / 60) === stackMinute) return camp

    const stacker = getJungleStacker(next, camp)
    if (!stacker) return { ...camp, lastStackAttemptAt: next.time }

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
      damage: Math.round(baseStats.damage * (1 + newStackCount * 0.16)),
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

export function getJungleStacker(state: SimulationState, camp: Camp) {
  return state.arcanes
    .filter((arcane) => (
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
  return stackSuccessChance(supportSkill, heroModifier, visionSafety, enemyContestRisk)
}

export function getBestJungleCampForArcane(state: SimulationState, arcane: Arcane, range: number, visibleEnemies: Arcane[]) {
  return state.camps
    .filter((camp) => camp.hp > 0 && distance(arcane.pos, camp.pos) <= range)
    .map((camp) => ({
      camp,
      score: getCampFarmDesireScore(state, arcane, camp, visibleEnemies),
    }))
    .filter(({ score }) => score > 8)
    .sort((a, b) => b.score - a.score)[0]?.camp
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
  const farmableCreeps = laneCreeps.filter((creep) => creep.hp > 0)
  if (farmableCreeps.length === 0) return 0

  const expectedGold = farmableCreeps.reduce((total, creep) => {
    const lastHitReadiness = creep.hp <= getArcaneLastHitDamage(state, arcane) * 1.8 ? 0.82 : 0.38
    return total + getCreepGoldReward(creep) * lastHitReadiness
  }, 0)
  const travelSeconds = Math.min(8, distance(arcane.pos, farmableCreeps[0].pos) / Math.max(0.8, arcane.stats.moveSpeed))
  const cycleSeconds = clampNumber(16 + travelSeconds, 14, 36)

  return Math.round((expectedGold / cycleSeconds) * 60)
}

export function getEstimatedLanePushGpm(arcane: Arcane, creeps: Creep[]) {
  const visibleCreeps = creeps.filter((creep) => creep.hp > 0)
  if (visibleCreeps.length === 0) return 0

  const expectedGold = visibleCreeps.reduce((total, creep) => total + getCreepGoldReward(creep) * 0.44, 0)
  const waveDensityBonus = Math.min(1.28, 1 + visibleCreeps.length * 0.035)
  const cycleSeconds = clampNumber(20 + distance(arcane.pos, visibleCreeps[0].pos) / Math.max(0.9, arcane.stats.moveSpeed), 18, 44)

  return Math.round((expectedGold * waveDensityBonus / cycleSeconds) * 60)
}

export function getEstimatedJungleFarmGpm(state: SimulationState, arcane: Arcane, camp: Camp) {
  const rewards = getCampRewards(camp, state.time)
  const effectiveDamage = Math.max(1, getEffectiveArcaneDamage(state, arcane))
  const damagePerSecond = effectiveDamage / Math.max(0.25, getEffectiveArcaneAttackCooldown(state, arcane))
  const clearSeconds = clampNumber(camp.hp / Math.max(20, damagePerSecond), 5, 38)
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
  if (arcane.respawn === 0 || arcane.respawn > time) return arcane
  const spawn = spreadPoint(teamInfo[arcane.team].base, index)
  return {
    ...arcane,
    pos: spawn,
    target: lanePaths[arcane.team][arcane.lane][1],
    pathIndex: 1,
    respawn: 0,
    lastHitBy: undefined,
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

export function updateTeamPlans(state: SimulationState): SimulationState {
  const analyzed = getAnalyzedGameState(state)
  const teamPlans = Object.fromEntries((['dawn', 'dusk'] as TeamId[]).map((team) => [
    team,
    enrichTeamPlanWithMapTarget(state, team, selectTeamPlan({
      analyzed,
      teamId: team,
      teamProfile: DEFAULT_TEAM_AI_PROFILES[team],
      previousPlan: state.teamPlans[team],
    })),
  ])) as Partial<Record<TeamId, TeamPlan>>

  return { ...state, teamPlans }
}

export function enrichTeamPlanWithMapTarget(state: SimulationState, team: TeamId, plan: TeamPlan | undefined): TeamPlan | undefined {
  if (!plan) return undefined
  if (plan.type !== 'group_push' || plan.targetPosition) return plan
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
  if (cached && cached.time === state.time) return cached.analyzed
  const analyzed = analyzeGameState(createAiGameSnapshot(state))
  analyzedGameStateCache.set(state, { time: state.time, analyzed })
  return analyzed
}

export function updateTeamCalls(state: SimulationState): SimulationState {
  const phase = getGamePhase(state.time)
  const activeCalls = Object.fromEntries(
    Object.entries(state.teamCalls).filter(([, call]) => call && call.expiresAt > state.time && isTeamCallTargetAlive(state, call)),
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
  return 'tier' in objective ? 'tower' : 'structure'
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
      score: 76 + teamPlan.urgency * 0.35 + Math.max(0, teamState?.numbersAdvantage ?? 0) * 10,
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
        score: 58 + (teamPlan?.type === 'take_boss' ? 20 : planWantsQuietMap ? -12 : 0) + (phase === 'late' ? 22 : 0) + Math.max(0, localNumbers.advantage) * 14 - Math.max(0, -localNumbers.advantage) * 22 - distance(caller.pos, state.boss.pos) * 0.42 - resourcePenalty,
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
  if (call.kind === 'tower') return state.towers.find((tower) => tower.id === call.targetId && tower.hp > 0)?.pos
  if (call.kind === 'structure') return state.structures.find((structure) => structure.id === call.targetId && structure.hp > 0)?.pos
  if (call.kind === 'boss') return state.boss.id === call.targetId && state.boss.hp > 0 ? mapEdgeApproachPoint(state.boss.pos) : undefined
  return state.arcanes.find((arcane) => arcane.id === call.targetId && arcane.stats.hp > 0 && arcane.respawn <= state.time)?.pos
}

export function getTeamCallObjectivePoint(state: SimulationState, call: TeamCall): Point | undefined {
  if (call.kind === 'boss') return state.boss.id === call.targetId && state.boss.hp > 0 ? state.boss.pos : undefined
  return getTeamCallPoint(state, call)
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
  const nearBaseEnemyCreeps = querySpatialGrid(getCreepSpatialGrid(state), base.pos, 12)
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
  const laneFarmValue = Math.min(100, input.safeEnemyCreeps.filter((creep) => creep.lane === input.arcane.lane).length * 18 + (input.laneCreep ? 22 : 0))
  const jungleFarmValue = input.economyCamp ? getCampFarmValueForAi(input.state, input.arcane, input.economyCamp) : 0
  const estimatedLaneFarmGpm = getEstimatedLaneFarmGpm(input.state, input.arcane, input.safeEnemyCreeps.filter((creep) => creep.lane === input.arcane.lane))
  const estimatedJungleFarmGpm = input.economyCamp ? getEstimatedJungleFarmGpm(input.state, input.arcane, input.economyCamp) : 0
  const estimatedLanePushGpm = getEstimatedLanePushGpm(input.arcane, input.safeEnemyCreeps)

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
    },
    local: {
      enemyNumbersAdvantage: Math.max(0, -localNumbers.advantage),
      allySaveNeed: input.allyToDefend ? (1 - input.allyToDefend.stats.hp / input.allyToDefend.stats.maxHp) * 100 : 0,
      nearbyFightValue: input.visibleEnemies.filter((enemy) => distance(enemy.pos, input.arcane.pos) <= 14).length * 24,
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
  const cacheKey = `${arcane.id}:${arcane.role}:${arcane.aggression}:${arcane.shotcalling}`
  const cached = playerAiProfileCache.get(cacheKey)
  if (cached) return cached
  const profile = buildPlayerAiProfile(arcane)
  playerAiProfileCache.set(cacheKey, profile)
  return profile
}

export function buildPlayerAiProfile(arcane: Arcane) {
  const role = getPlayerAiRole(arcane.role)
  const support = arcane.role.includes('Support')
  const discipline = arcane.role === 'Dedicated Support' ? 76 : arcane.role === 'Safe Lane' ? 66 : 58
  const farmPriority = getRoleFarmPriority(arcane.role)
  const greed = arcane.role === 'Safe Lane' ? 84 : arcane.role === 'Mid' ? 66 : arcane.role === 'Offlane' ? 46 : arcane.role === 'Greedy Support' ? 30 : 14
  return {
    playerId: arcane.id,
    role,
    farmPriority,
    farmingEfficiency: arcane.role === 'Safe Lane' ? 86 : arcane.role === 'Mid' ? 72 : arcane.role === 'Offlane' ? 56 : arcane.role === 'Greedy Support' ? 36 : 20,
    gpmDecisionBias: getRoleGpmDecisionBias(arcane.role),
    teamfight: arcane.role === 'Offlane' ? 76 : arcane.role === 'Mid' ? 68 : support ? 62 : 56,
    positioning: discipline,
    communication: arcane.shotcalling,
    discipline,
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
  const item = nextShopItem(arcane)
  if (!item) return 0

  const expectedGpm = getExpectedItemTimingGpm(arcane, time)
  const timeToItem = expectedTimeToItemSeconds(item.cost, arcane.stats.gold, expectedGpm)
  const progressScore = Math.min(100, (arcane.stats.gold / Math.max(1, item.cost)) * 100)
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
  const phase = getGamePhase(time)
  const roleBase = arcane.role === 'Safe Lane'
    ? 430
    : arcane.role === 'Mid'
      ? 390
      : arcane.role === 'Offlane'
        ? 330
        : arcane.role === 'Greedy Support'
          ? 255
          : 210
  const phaseMultiplier = phase === 'early' ? 0.78 : phase === 'mid' ? 1 : 1.16
  const farmSkillMultiplier = arcane.role === 'Safe Lane'
    ? 1.08
    : arcane.role === 'Mid'
      ? 1.02
      : arcane.role.includes('Support')
        ? 0.88
        : 0.96

  return roleBase * phaseMultiplier * farmSkillMultiplier
}

export function nextShopItem(arcane: Arcane) {
  if (arcane.items.length >= 6) return undefined
  const recommendedIds = getRecommendedBuildItemIdsForHero(arcane.heroDefinitionId)
  const recommendedItem = recommendedIds
    .map((id) => shopItemById.get(id))
    .find((item) => item && !arcane.items.includes(item.name) && canRoleBuyItem(arcane, item))
  if (recommendedItem) return recommendedItem

  return shopCatalog.find((candidate) => !arcane.items.includes(candidate.name) && canRoleBuyItem(arcane, candidate))
}

export function canRoleBuyItem(arcane: Arcane, item: ShopItem) {
  if (arcane.items.includes(item.name)) return false
  if (isBootItem(item) && arcane.items.some((name) => {
    const owned = shopItemByName.get(name)
    return owned ? isBootItem(owned) : name.toLowerCase().includes('boot')
  })) return false
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

export function getGankTarget(state: SimulationState, arcane: Arcane, visibleEnemies: Arcane[], targetThreatLimit: number, currentDanger: number) {
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
      const targetDanger = getEnemyActionThreatScore(state, arcane, enemy.pos, visibleEnemies)
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

export function getRotateTarget(state: SimulationState, arcane: Arcane, visibleEnemies: Arcane[], targetThreatLimit: number, currentDanger: number) {
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
      const targetDanger = getEnemyActionThreatScore(state, arcane, enemy.pos, visibleEnemies)
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

export function getInitiateTarget(state: SimulationState, arcane: Arcane, visibleEnemies: Arcane[], targetThreatLimit: number, currentDanger: number) {
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
      const targetDanger = getEnemyActionThreatScore(state, arcane, enemy.pos, visibleEnemies)
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
    if (channel.kind === 'teleport') return completeTeleportChannel(state, arcane, channel)
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
  const distanceToDesired = distance(arcane.pos, desiredTarget)
  const travelThreshold = atBase ? 28 : wantsFountain ? 24 : 34
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
  if (!wantsFountain && distance(selected.buildingPos, desiredTarget) > 42 && !macroDecision.startsWith('Juntar') && !macroDecision.startsWith('Fazer objetivo')) return undefined
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

export function updateArcaneMovement(arcane: Arcane, state: SimulationState, delta: number, shouldDecide: boolean): Arcane {
  if (arcane.respawn > state.time) {
    const microDecision = `Respawn em ${Math.ceil(arcane.respawn - state.time)}s`
    return {
      ...arcane,
      macroDecision: 'Fora de combate',
      microDecision,
      decision: microDecision,
    }
  }
  if (arcane.stats.hp <= 0) return arcane
  if (arcane.channeling) return updateChannelingArcane(state, arcane)

  let target = arcane.target
  let macroDecision = arcane.macroDecision
  let microDecision = arcane.microDecision
  let aiMode = arcane.aiMode
  let aiReason = arcane.aiReason
  let aiExecutionChance = arcane.aiExecutionChance
  let aiExecutionDelay = arcane.aiExecutionDelay
  let aiFailure = arcane.aiFailure
  const ownBase = teamInfo[arcane.team].base
  const path = lanePaths[arcane.team][arcane.lane]
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
    const visibleEnemies = state.arcanes.filter((other) => (
      other.team !== arcane.team &&
      other.stats.hp > 0 &&
      other.respawn <= state.time &&
      isPointVisibleToTeam(state, arcane.team, other.pos)
    ))
    const dangerScore = getDangerScore(state, arcane, visibleEnemies)
    const actionDanger = getEnemyActionThreatScore(state, arcane, arcane.pos, visibleEnemies)
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
    const laneAnchor = nearestLanePoint(arcane.pos, path)
    const laneDistance = distance(arcane.pos, laneAnchor)
    const shouldRespectLane = phase === 'early' && laneDistance > (isSupport ? 14 : 8) && !atBase
    const safeEnemyCreeps = state.creeps.filter((creep) => (
      creep.team !== arcane.team &&
      (phase !== 'early' || creep.lane === arcane.lane) &&
      !isUnsafeUnderEnemyTower(state, arcane.team, creep.pos, creep.lane) &&
      !isTooDeepForAggression(state, arcane, creep.pos, creep.lane, phase) &&
      getEffectiveDangerScore(0, getEnemyActionThreatScore(state, arcane, creep.pos, visibleEnemies), hpRatio) <= targetThreatLimit
    ))
    const nearbyEnemy = nearest(
      arcane.pos,
      visibleEnemies.filter((enemy) => (
        !isUnsafeUnderEnemyTower(state, arcane.team, enemy.pos, enemy.lane) &&
        !isTooDeepForAggression(state, arcane, enemy.pos, enemy.lane, phase) &&
        getEffectiveDangerScore(0, getEnemyActionThreatScore(state, arcane, enemy.pos, visibleEnemies), hpRatio) <= targetThreatLimit + 5
      )),
      phase === 'early' ? 8 : phase === 'mid' ? 13 : 16,
    )
    const gankTarget = getGankTarget(state, arcane, visibleEnemies, targetThreatLimit, effectiveDanger)
    const rotateTarget = getRotateTarget(state, arcane, visibleEnemies, targetThreatLimit, effectiveDanger)
    const initiateTarget = getInitiateTarget(state, arcane, visibleEnemies, targetThreatLimit, effectiveDanger)
    const laneEnemyCreeps = safeEnemyCreeps.filter((creep) => creep.lane === arcane.lane)
    const laneCreep = nearest(arcane.pos, laneEnemyCreeps, phase === 'early' ? 13 : 10)
    const lastHitCreep = getLastHitCandidateFromCreeps(state, arcane, laneEnemyCreeps, 1.06)
    const prepareLastHitCreep = getLastHitCandidateFromCreeps(state, arcane, laneEnemyCreeps, 1.85) ?? getWavePushTarget(arcane, laneEnemyCreeps)
    const wavePushCreep = getWavePushTarget(arcane, laneEnemyCreeps)
    const distantLaneCreep = nearest(arcane.pos, safeEnemyCreeps, phase === 'early' ? 18 : phase === 'mid' ? 28 : 34)
    const denyCreep = nearest(arcane.pos, state.creeps.filter((creep) => (
      creep.team === arcane.team &&
      creep.lane === arcane.lane &&
      creep.hp > 0 &&
      creep.hp <= creep.maxHp * 0.5
    )), phase === 'early' ? 14 : 9)
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
    const weakCamp = getBestJungleCampForArcane(state, arcane, phase === 'early' ? isSupport ? 10 : 6 : isSupport ? 9 : 12, visibleEnemies)
    const economyCamp = getBestJungleCampForArcane(state, arcane, phase === 'early' ? isSupport ? 16 : 9 : isSupport ? 15 : 22, visibleEnemies)
    const emergencyRecovery = getArcaneEmergencyRecoveryRatio(state, arcane)
    const lowHp = hpRatio < Math.max(0.22, 0.36 - emergencyRecovery * 0.6)
    const alreadyPressuringTower = arcane.macroDecision.startsWith('Pressionar torre') || arcane.microDecision.startsWith('Batendo torre')
    const towerThreat = nearest(arcane.pos, state.towers.filter((tower) => tower.team !== arcane.team && tower.hp > 0), 10.5)
    const towerDiveRisk = towerThreat && (!alliedLaneCreepNearTower || hpRatio < (alreadyPressuringTower ? 0.62 : 0.82))
    const towerNumbers = enemyTower ? getLocalNumbers(state, arcane.team, enemyTower.pos, enemyTower.tier === 3 ? 20 : 16, visibleEnemies) : undefined
    const nextAdvancePoint = getLaneAdvancePoint(arcane, path, pathIndex)
    const nextAdvanceBlockedByTower = laneBlocker &&
      !alliedLaneCreepNearTower &&
      laneProgress(nextAdvancePoint, path) >= laneProgress(laneBlocker.pos, path) - 0.015
    const advanceBlockedByTower = laneBlocker &&
      !alliedLaneCreepNearTower &&
      (distance(arcane.pos, laneBlocker.pos) <= 25 || nextAdvanceBlockedByTower)
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
    const baseThreat = phase !== 'early' ? getBaseThreat(state, arcane.team) : undefined
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
      alliedLaneCreepNearTower &&
      hpRatio > (alreadyPressuringTower ? enemyTower.tier === 3 ? 0.74 : 0.68 : modeWantsObjective ? enemyTower.tier === 3 ? 0.82 : 0.76 : enemyTower.tier === 3 ? 0.9 : 0.84) &&
      effectiveDanger < (alreadyPressuringTower ? enemyTower.tier === 3 ? 58 : 64 : modeWantsObjective ? enemyTower.tier === 3 ? 48 : 56 : enemyTower.tier === 3 ? 34 : 42) &&
      (towerNumbers?.advantage ?? -99) >= (alreadyPressuringTower ? enemyTower.tier === 3 ? 0.25 : -0.65 : modeWantsObjective ? enemyTower.tier === 3 ? 0.55 : -0.35 : enemyTower.tier === 3 ? 1.1 : -0.15)

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
    } else if (shouldTacticallyDisengage) {
      const laneDistance = getLaneDistanceAlongPath(arcane.pos, path)
      target = formationPoint(getLanePointAtDistance(path, Math.max(0, laneDistance - (8 + repeatedDeathCaution * 30))), arcane.id)
      macroDecision = 'Segurar rota'
      microDecision = 'Reposicionando por risco de burst'
    } else if (lowHp || effectiveDanger >= 68 || (modeWantsRetreat && effectiveDanger >= (emergencyRecovery > 0 ? 60 : 48))) {
      target = ownBase
      macroDecision = 'Recuar'
      microDecision = effectiveDanger >= 68 || modeWantsRetreat ? 'Recuando por perigo alto' : 'Recuando para curar'
    } else if (towerDiveRisk) {
      target = safeLaneRetreatPoint(arcane, path, towerThreat)
      macroDecision = alliedLaneCreep ? 'Segurar rota' : 'Recuar'
      microDecision = alliedLaneCreep ? 'Segurando fora da torre' : 'Saindo do alcance da torre'
    } else if (allyToDefend && (modeWantsSave || isSupport)) {
      target = allyToDefend.pos
      macroDecision = 'Defender aliado'
      microDecision = `Defendendo ${allyToDefend.player}`
      addTimedEffect(state, allyToDefend, {
        sourceId: `${arcane.id}-save-barrier`,
        sourceName: `${arcane.player} save`,
        sourceTeam: arcane.team,
        kind: 'barrier',
        polarity: 'positive',
        value: 130 + arcane.stats.level * 10,
        duration: 3.5,
      })
    } else if (initiateTarget && hpRatio > 0.74 && effectiveDanger < (modeWantsFight ? 62 : 54)) {
      target = initiateTarget.pos
      macroDecision = 'Lutar em equipe'
      microDecision = `Iniciando luta em ${initiateTarget.name}`
    } else if (teamCall && teamCallPoint && teamCallObjectivePoint && phase !== 'early' && hpRatio > (teamCall.kind === 'boss' ? 0.72 : 0.58) && effectiveDanger < (teamCall.kind === 'boss' ? 48 : 60)) {
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
      const readyToExecuteCall = teamCall.kind === 'boss'
        ? bossReadyToHit
        : !farFromGroup && (callAge > 2.5 || alliesAtCall >= 2 || distance(arcane.pos, teamCallPoint) <= 6)
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
    } else if (gankTarget && hpRatio > 0.68 && effectiveDanger < 56) {
      target = gankTarget.pos
      macroDecision = 'Criar vantagem'
      microDecision = `Gank em ${gankTarget.player}`
    } else if (rotateTarget && hpRatio > 0.64 && effectiveDanger < 58) {
      target = rotateTarget.pos
      macroDecision = `Rotacionar para ${laneNames[rotateTarget.lane]}`
      microDecision = `Ajudando side lane: ${laneNames[rotateTarget.lane]}`
    } else if (nearbyEnemy && hpRatio > 0.58 && effectiveDanger < (modeWantsFight ? 60 : 52) && nearbyEnemy.stats.hp / nearbyEnemy.stats.maxHp < (modeWantsFight ? 0.72 : 0.58)) {
      target = nearbyEnemy.pos
      macroDecision = 'Pressionar inimigo'
      microDecision = `Pressionando ${nearbyEnemy.name}`
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

  const baseThreatNow = getBaseThreat(state, arcane.team)
  const recoveredAtBase = atBase &&
    arcane.stats.hp >= arcane.stats.maxHp * 0.94 &&
    arcane.stats.mana >= arcane.stats.maxMana * 0.82
  const stillPointingAtBase = distance(target, ownBase) < baseServiceRange
  const advancingWithBaseTarget = macroDecision.startsWith('Avancar') && stillPointingAtBase
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

  const shouldShopAtBase = shouldDecide && atBase && (canBuyAtBase || !macroDecision.startsWith('Avancar'))
  const shoppedArcane = shouldShopAtBase ? buyAtBase(state, arcane) : arcane
  const dispelResult = shouldDecide ? applyDispelItemIfNeeded(state, shoppedArcane) : { arcane: shoppedArcane, used: undefined }
  const activeItemResult = shouldDecide ? applySimpleActiveItemIfNeeded(state, dispelResult.arcane) : { arcane: dispelResult.arcane, used: undefined, interruptsDecision: false }
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
    stats: nextStats,
  }
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

  return buyItemAtBase(arcane)
}

export function hasBasePurchaseOpportunity(state: SimulationState, arcane: Arcane) {
  return (arcane.tpScrolls < teleportScrollMaxCharges && arcane.stats.gold >= teleportScrollCost) ||
    affordableShopItem(arcane) !== undefined ||
    getAffordableWantedConsumable(state, arcane) !== undefined
}

export function buyItemAtBase(arcane: Arcane): Arcane {
  if (arcane.items.length >= 6) return arcane
  const item = affordableShopItem(arcane)
  if (!item) return arcane
  const items = [...arcane.items, item.name]

  return {
    ...arcane,
    items,
    stats: rebuildArcaneStatsAfterItemChange(arcane, items, arcane.stats.gold - item.cost),
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

export function applySimpleActiveItemIfNeeded(state: SimulationState, arcane: Arcane): { arcane: Arcane; used?: string; interruptsDecision?: boolean } {
  if (hasTimedEffect(state, arcane.id, 'mute')) return { arcane }
  const candidate = getSimpleActiveItemCandidate(state, arcane)
  const active = candidate?.item.active
  if (!candidate || !active) return { arcane }

  const item = candidate.item
  let nextArcane = arcane
  let applied = false
  let interruptsDecision = false
  const hpRatio = arcane.stats.hp / Math.max(1, arcane.stats.maxHp)
  const tags = active.tags
  const allyTargets = getSimpleActiveItemAllyTargets(state, arcane, item)

  if (hasAnyItemTag(tags, ['restore_health', 'heal_over_time', 'healing', 'heal'])) {
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
      nextArcane = grantArcaneEconomy(nextArcane, bonusGold, Math.round(getCreepXpReward(creepTarget) * (bonusXpPct / 100)))
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

  const enemyTarget = getSimpleActiveItemEnemyTarget(state, arcane, item)
  if (enemyTarget) {
    const damage = getActiveItemDamage(arcane, item)
    if (damage > 0) {
      damageEntity(state, enemyTarget.id, damage, {
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

export function getSimpleActiveItemCandidate(state: SimulationState, arcane: Arcane) {
  return getShopItemsForInventory(arcane.items)
    .filter((item) => item.active !== undefined)
    .filter((item) => (arcane.itemCooldowns[item.name] ?? 0) <= state.time)
    .map((item) => ({ name: item.name, item }))
    .find((candidate) => shouldUseSimpleActiveItem(state, arcane, candidate.item))
}

export function shouldUseSimpleActiveItem(state: SimulationState, arcane: Arcane, item: ShopItem) {
  const active = item.active
  if (!active) return false
  const tags = active.tags
  const hpRatio = arcane.stats.hp / Math.max(1, arcane.stats.maxHp)
  const manaRatio = arcane.stats.mana / Math.max(1, arcane.stats.maxMana)
  const danger = getDangerScore(state, arcane)
  const allyTargets = getSimpleActiveItemAllyTargets(state, arcane, item)

  if (active.dispelPower && getDispelItemCandidate(state, arcane)?.item.id === item.id) return false
  if (hasAnyItemTag(tags, ['restore_health', 'heal_over_time', 'healing', 'heal'])) return hpRatio < 0.48 || allyTargets.some((ally) => ally.stats.hp / Math.max(1, ally.stats.maxHp) < 0.48)
  if (hasAnyItemTag(tags, ['magic_barrier', 'physical_barrier', 'team_barrier', 'barrier', 'damage_immunity', 'link_barrier', 'debuff_immunity', 'ethereal', 'physical_immunity'])) {
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
  return nearest(arcane.pos, state.arcanes.filter((target) => (
    target.team !== arcane.team &&
    target.stats.hp > 0 &&
    target.respawn <= state.time &&
    isPointVisibleToTeam(state, arcane.team, target.pos)
  )), range)
}

export function getSimpleActiveItemCreepTarget(state: SimulationState, arcane: Arcane, item: ShopItem) {
  const range = Math.max(arcane.stats.range + 2, (getActiveItemNumber(item.active?.values ?? {}, 'range') ?? 650) / 100)
  return nearest(arcane.pos, state.creeps.filter((creep) => creep.team !== arcane.team && creep.hp > 0), range)
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
  if (arcane.items.length >= 6) return undefined
  const item = nextShopItem(arcane)
  return item && arcane.stats.gold >= item.cost ? item : undefined
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

  if (microDecision.startsWith('Limpando campo') || microDecision.startsWith('Acumulando patrimonio na selva')) {
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
      other.respawn <= state.time
    )), 6)
  }

  return undefined
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
  attackSpeedPct: number
  lifestealPct: number
  incomingDamagePct: number
}

const emptyArcanePassiveCombatModifiers: ArcanePassiveCombatModifiers = {
  flatDamage: 0,
  damagePct: 0,
  armorFlat: 0,
  attackSpeedPct: 0,
  lifestealPct: 0,
  incomingDamagePct: 0,
}
const arcanePassiveCombatModifiersCache = new Map<string, WeakMap<SkillLevels, ArcanePassiveCombatModifiers>>()

export function getArcanePassiveCombatModifiers(state: SimulationState, arcane: Arcane) {
  if (hasTimedEffect(state, arcane.id, 'break')) {
    return emptyArcanePassiveCombatModifiers
  }

  let bySkillLevels = arcanePassiveCombatModifiersCache.get(arcane.heroDefinitionId)
  if (!bySkillLevels) {
    bySkillLevels = new WeakMap()
    arcanePassiveCombatModifiersCache.set(arcane.heroDefinitionId, bySkillLevels)
  }
  const cached = bySkillLevels.get(arcane.skillLevels)
  if (cached) return cached

  const modifiers = (getHeroDefinition(arcane.heroDefinitionId).skills ?? [])
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
        attackSpeedPct: modifiers.attackSpeedPct + profile.attackSpeedPct,
        lifestealPct: Math.max(modifiers.lifestealPct, profile.lifestealPct),
        incomingDamagePct: Math.max(modifiers.incomingDamagePct, defensiveReduction),
      }
    }, { ...emptyArcanePassiveCombatModifiers })
  bySkillLevels.set(arcane.skillLevels, modifiers)
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
  return applyFlatAndPercentModifiers(
    arcane.stats.moveSpeed,
    [],
    modifiers.map((effect) => effect.modifiers?.moveSpeedPct ?? 0),
  )
}

export function getEffectiveArcaneAttackCooldown(state: SimulationState, arcane: Arcane) {
  const modifiers = getArcaneStatModifierEffects(state, arcane)
  const passive = getArcanePassiveCombatModifiers(state, arcane)
  const attackSpeedPct = modifiers.reduce((sum, effect) => sum + (effect.modifiers?.attackSpeedPct ?? 0), passive.attackSpeedPct)
  return arcane.stats.attackSpeed / Math.max(0.2, 1 + attackSpeedPct)
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
  return hasTimedEffect(state, arcane.id, 'stun') ||
    hasTimedEffect(state, arcane.id, 'hex') ||
    hasTimedEffect(state, arcane.id, 'sleep') ||
    hasTimedEffect(state, arcane.id, 'fear') ||
    hasTimedEffect(state, arcane.id, 'taunt')
}

export function isArcaneMovementDisabled(state: SimulationState, arcane: Arcane) {
  return isArcaneStunned(state, arcane) || hasTimedEffect(state, arcane.id, 'root')
}

export function isArcaneAttackDisabled(state: SimulationState, arcane: Arcane) {
  return isArcaneStunned(state, arcane) || hasTimedEffect(state, arcane.id, 'disarm')
}

export function processTimedEffects(state: SimulationState): SimulationState {
  const tickedEffectIds = new Set<string>()
  state.timedEffects.forEach((effect) => {
    if ((effect.kind !== 'dot' && effect.kind !== 'hot') || (effect.nextTickAt ?? Number.POSITIVE_INFINITY) > state.time) {
      return
    }

    const target = state.arcanes.find((arcane) => arcane.id === effect.targetId && arcane.stats.hp > 0 && arcane.respawn <= state.time)
    if (!target) return
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

export function updateCreepMovement(creep: Creep, state: SimulationState, delta: number, frameContext: TickFrameContext): Creep {
  if (getCachedRouteCreepTarget(creep, state, 'attack', frameContext)) {
    return creep
  }

  const visibleTarget = getCachedRouteCreepTarget(creep, state, 'vision', frameContext)
  if (visibleTarget) {
    const moveTarget = getCreepMoveDestination(creep, visibleTarget)
    const nextPos = moveToward(creep.pos, moveTarget, 4.2 * delta)
    if (distanceSquared(nextPos, creep.pos) < 0.0001) return creep
    return { ...creep, pos: nextPos }
  }

  const path = lanePaths[creep.team][creep.lane]
  let pathIndex = creep.pathIndex
  if (distance(creep.pos, formationPoint(path[pathIndex], creep.id)) < 1.8 && pathIndex < path.length - 1) {
    pathIndex += 1
  }
  const nextPos = moveToward(creep.pos, formationPoint(path[pathIndex], creep.id), 4.2 * delta)
  if (pathIndex === creep.pathIndex && distanceSquared(nextPos, creep.pos) < 0.0001) return creep
  return { ...creep, pathIndex, pos: nextPos }
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

export function getRouteCreepTarget(creep: Creep, state: SimulationState, mode: RouteCreepTargetMode = 'attack', frameContext?: TickFrameContext) {
  const structureRange = isMeleeCreep(creep) ? 3.2 : creep.range
  const visionRange = getCreepVisionRange(creep)
  const unitRange = mode === 'attack' ? creep.range : visionRange
  const objectiveRange = mode === 'attack' ? structureRange : visionRange
  const lanePath = lanePaths[creep.team][creep.lane]
  const isArcaneNearLane = (arcane: Arcane) => (
    frameContext
      ? isArcaneNearRouteCached(arcane, lanePath, frameContext)
      : isNearRoute(arcane.pos, lanePath, 12)
  )
  const selectTarget = <T extends { pos: Point }>(entities: T[], range: number) => (
    mode === 'attack'
      ? nearestReachableByCreep(creep, entities, range)
      : nearest(creep.pos, entities, range)
  )
  const creepGrid = getCreepSpatialGrid(state)
  const nearbyCreeps = querySpatialGrid(creepGrid, creep.pos, unitRange + 2.5)
  const aggroTarget = creep.aggroUntil && creep.aggroUntil > state.time
    ? selectTarget(state.arcanes.filter((arcane) => (
        arcane.id === creep.aggroTargetId &&
        arcane.stats.hp > 0 &&
        arcane.respawn <= state.time &&
        isArcaneNearLane(arcane)
      )), unitRange)
    : undefined
  if (aggroTarget) return aggroTarget

  const enemyCreep = selectTarget(
    nearbyCreeps.filter((other) => other.team !== creep.team && other.lane === creep.lane),
    unitRange,
  )
  if (enemyCreep) return enemyCreep

  const attackableTowers = frameContext
    ? getCachedAttackableEnemyTowers(state, creep.team, frameContext)
    : getAttackableEnemyTowers(state, creep.team)
  const attackableStructures = frameContext
    ? getCachedAttackableEnemyStructures(state, creep.team, frameContext)
    : getAttackableEnemyStructures(state, creep.team)

  return selectTarget(
    state.arcanes.filter((arcane) => (
      arcane.team !== creep.team &&
      arcane.stats.hp > 0 &&
      arcane.respawn <= state.time &&
      isArcaneNearLane(arcane)
    )),
    unitRange,
  ) ?? selectTarget([
    ...attackableTowers.filter((tower) => tower.lane === creep.lane),
    ...attackableStructures.filter((structure) => structure.lane === creep.lane || structure.kind === 'tower_tier_4'),
    ...(isEnemyBaseUnlocked(state, creep.team) ? state.bases.filter((base) => base.team !== creep.team && base.hp > 0) : []),
  ], objectiveRange)
}

export function isCachedRouteCreepAttackTargetValid(creep: Creep, target: CombatTarget, state: SimulationState) {
  if ('player' in target && (target.stats.hp <= 0 || target.respawn > state.time)) return false
  if ('type' in target && target.hp <= 0) return false
  if ('tier' in target && target.hp <= 0) return false
  if ('kind' in target && 'hp' in target && target.hp <= 0) return false
  if ('maxHp' in target && !('player' in target) && !('type' in target) && !('tier' in target) && target.hp <= 0) return false

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

export function resolveUnitHitboxes(state: SimulationState) {
  const bodies = unitHitboxBodyBuffer
  bodies.length = 0

  for (const arcane of state.arcanes) {
    if (arcane.stats.hp <= 0 || arcane.respawn > state.time) continue
    bodies.push({
      id: arcane.id,
      index: bodies.length,
      pos: arcane.pos,
      radius: getUnitHitboxRadius(arcane),
      movable: true,
      mass: 1.25,
    })
  }

  for (const creep of state.creeps) {
    if (creep.hp <= 0) continue
    bodies.push({
      id: creep.id,
      index: bodies.length,
      pos: creep.pos,
      radius: getUnitHitboxRadius(creep),
      movable: true,
      mass: creep.type === 'siege' ? 1.1 : 0.72,
    })
  }

  if (state.boss.hp > 0 && state.boss.respawn <= state.time) {
    bodies.push({
      id: state.boss.id,
      index: bodies.length,
      pos: state.boss.pos,
      radius: getUnitHitboxRadius(state.boss),
      movable: true,
      mass: 2.5,
    })
  }

  for (const camp of state.camps) {
    if (camp.hp <= 0) continue
    bodies.push({
      id: camp.id,
      index: bodies.length,
      pos: camp.pos,
      radius: getUnitHitboxRadius(camp),
      movable: false,
      mass: 99,
    })
  }

  if (bodies.length < 2) return

  for (let pass = 0; pass < maxHitboxResolutionPasses; pass += 1) {
    const grid = buildUnitHitboxGrid(bodies)

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

export function hasAnyCastableSkill(state: SimulationState, arcane: Arcane) {
  if (isArcaneSilenced(state, arcane)) return false

  const skills = getHeroDefinition(arcane.heroDefinitionId).skills ?? []
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

export function tryCastSimpleSkill(state: SimulationState, arcane: Arcane, fallbackTarget: CombatTarget | undefined) {
  if (isArcaneSilenced(state, arcane)) return false

  const situation = getPrimarySkillUsageSituation({
    phase: getGamePhase(state.time),
    aiMode: arcane.aiMode,
    macroDecision: arcane.macroDecision,
    hpRatio: arcane.stats.hp / Math.max(1, arcane.stats.maxHp),
  })
  const skills = getHeroDefinition(arcane.heroDefinitionId).skills ?? []
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
  const controlScore = ['stun', 'disable', 'silence', 'slow', 'taunt'].some((tag) => tags.has(tag)) ? 16 : 0
  const sustainScore = ['heal', 'healer', 'regen', 'shield', 'barrier', 'spell_parry'].some((tag) => tags.has(tag)) ? 12 : 0
  const damageScore = skill.damageType !== 'none' || getSimpleSkillNumericValue(skill, 'damage', 1, 0) > 0 ? 10 : 0
  const ultimateScore = isUltimateSkill(skill) ? 20 : 0
  return ultimateScore + controlScore + sustainScore + damageScore
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
) {
  if (isConfirmedGlobalSkill(skill) && !shouldCastGlobalSkill(state, arcane, skill)) return false
  const target = getSimpleSkillTarget(state, arcane, skill, level, fallbackTarget)
  if (!target) return false
  if ('player' in target && target.team !== arcane.team && !shouldCommitOffensiveSkill(state, arcane, target, skill)) {
    return false
  }
  const manaCost = getSimpleSkillManaCost(arcane, skill, level)
  if (arcane.stats.mana < manaCost) return false
  const profile = getSkillEffectProfile(skill, level)
  const affectedTargets = getSimpleSkillAffectedTargets(state, arcane, skill, profile, target)

  const source: CombatSource = {
    id: `${arcane.id}-${skill.id}`,
    label: `${arcane.player}: ${skill.name}`,
    team: arcane.team,
    damageType: getSimpleSkillDamageType(skill),
  }

  if (isPositiveSimpleSkill(skill)) {
    const alliedTargets = affectedTargets.filter((candidate): candidate is Arcane => 'player' in candidate && candidate.team === arcane.team)
    if (alliedTargets.length === 0) return false
    alliedTargets.forEach((ally) => applySimplePositiveSkill(state, arcane, skill, level, ally))
    applySimpleSkillMobility(state, arcane, target, skill, profile)
    addSimpleSkillEffect(state, arcane, target)
    finishSimpleSkillCast(state, arcane, skill, manaCost, target)
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
  })

  applySimpleSkillMobility(state, arcane, target, skill, profile)
  applySimpleSkillSummonPressure(state, arcane, skill, profile)

  if (isBoss(target)) {
    state.boss = {
      ...state.boss,
      aggroTargetId: arcane.id,
      aggroUntil: state.time + 6,
    }
  }

  addSimpleSkillEffect(state, arcane, target)
  const casted = damage > 0 || affectedTargets.some((candidate) => 'player' in candidate && hasSimpleStatusTag(skill)) || profile.manaDelta !== 0 || profile.isMobility || profile.summonCount > 0 || hasAnySimpleSkillTag(skill, ['purge', 'dispel'])
  if (casted) finishSimpleSkillCast(state, arcane, skill, manaCost, target)
  return casted
}

export function applySkillAuraEffects(state: SimulationState) {
  state.arcanes
    .filter((holder) => holder.stats.hp > 0 && holder.respawn <= state.time && !hasTimedEffect(state, holder.id, 'break'))
    .forEach((holder) => {
      const auraSkills = (getHeroDefinition(holder.heroDefinitionId).skills ?? [])
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
            ally.stats.mana = Math.min(ally.stats.maxMana, ally.stats.mana + simulationFrameSeconds * (0.65 + level * 0.35))
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
): CombatTarget[] {
  if ((!profile.isArea && !profile.isGlobal) || !('player' in primaryTarget)) return [primaryTarget]

  const positive = isPositiveSimpleSkill(skill)
  const radius = profile.isGlobal ? Number.POSITIVE_INFINITY : Math.max(2.5, profile.radius)
  const center = profile.isGlobal ? caster.pos : primaryTarget.pos
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
) {
  if (profile.summonCount <= 0) return
  addTimedEffect(state, caster, {
    sourceId: `${caster.id}-${skill.id}-summons`,
    sourceName: `${skill.name}: summons`,
    sourceTeam: caster.team,
    kind: 'buff',
    polarity: 'positive',
    value: profile.summonCount,
    modifiers: {
      damagePct: Math.min(0.32, 0.045 * profile.summonCount),
      attackSpeedPct: Math.min(0.24, 0.035 * profile.summonCount),
    },
    duration: profile.summonDuration || profile.duration,
  })
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
  liveArcane.microDecision = `Castou ${skill.key}`
  liveArcane.decision = `Castou ${skill.key}`
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
  if (hasAnySimpleSkillTag(skill, ['channel', 'aoe_channel', 'channel_disable'])) {
    const channelDuration = Math.min(4, Math.max(0.8, getSkillEffectProfile(skill, getSimpleSkillLevel(arcane, skill)).duration * 0.45))
    liveArcane.channeling = {
      kind: 'skill',
      target: target.pos,
      startedAt: state.time,
      completesAt: state.time + channelDuration,
      label: skill.name,
      effectLabel: `${skill.name} concluida`,
    }
  }
  if (liveArcane !== arcane) {
    arcane.stats = liveArcane.stats
    arcane.microDecision = liveArcane.microDecision
    arcane.decision = liveArcane.decision
    arcane.channeling = liveArcane.channeling
  }
}

export function getSimpleSkillTarget(
  state: SimulationState,
  arcane: Arcane,
  skill: HeroSkillDefinition,
  level: number,
  fallbackTarget: CombatTarget | undefined,
): CombatTarget | undefined {
  if (isPositiveSimpleSkill(skill)) {
    return getSimplePositiveSkillTarget(state, arcane, skill, level)
  }

  const range = getSimpleSkillRange(arcane, skill, level)
  const enemyArcane = nearest(arcane.pos, state.arcanes.filter((target) => (
    target.team !== arcane.team &&
    target.stats.hp > 0 &&
    target.respawn <= state.time &&
    isPointVisibleToTeam(state, arcane.team, target.pos)
  )), range + getEntityCollisionRadius(arcane))
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
    const threatened = nearest(arcane.pos, state.arcanes.filter((enemy) => enemy.team !== arcane.team && enemy.stats.hp > 0 && enemy.respawn <= state.time), 12)
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
    return allies
      .filter((ally) => ally.stats.hp / Math.max(1, ally.stats.maxHp) < (ally.id === arcane.id ? 0.78 : 0.66))
      .sort((a, b) => (a.stats.hp / Math.max(1, a.stats.maxHp)) - (b.stats.hp / Math.max(1, b.stats.maxHp)))[0]
  }

  const fighting = nearest(arcane.pos, state.arcanes.filter((enemy) => (
    enemy.team !== arcane.team &&
    enemy.stats.hp > 0 &&
    enemy.respawn <= state.time
  )), Math.max(arcane.visionRange * 0.65, 8))

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
        damagePct: Math.min(0.3, profile.summonCount * 0.035 + (selfTransformation ? profile.damage / 1000 : 0)),
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

  applySimpleNamedControl(state, caster, skill, target, profile.duration)

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
  duration: number,
) {
  const controls: Array<{ tags: string[]; kind: TimedEffect['kind'] }> = [
    { tags: ['hex'], kind: 'hex' },
    { tags: ['sleep'], kind: 'sleep' },
    { tags: ['fear'], kind: 'fear' },
    { tags: ['taunt'], kind: 'taunt' },
    { tags: ['disarm'], kind: 'disarm' },
    { tags: ['break'], kind: 'break' },
    { tags: ['mute'], kind: 'mute' },
  ]
  controls.forEach((control) => {
    if (!hasAnySimpleSkillTag(skill, control.tags)) return
    addTimedEffect(state, target, {
      sourceId: `${caster.id}-${skill.id}-${control.kind}`,
      sourceName: skill.name,
      sourceTeam: caster.team,
      kind: control.kind,
      polarity: 'negative',
      value: 1,
      duration,
    })
  })
}

export function addSimpleSkillEffect(state: SimulationState, arcane: Arcane, target: CombatTarget) {
  state.effects = addAttackEffect(state.effects, {
    kind: 'arcane',
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

export function hasSimpleStatusTag(skill: HeroSkillDefinition) {
  return hasAnySimpleSkillTag(skill, ['stun', 'disable', 'taunt', 'slow', 'silence', 'anti_magic', 'root', 'net', 'leash', 'hex', 'sleep', 'fear', 'disarm', 'break', 'mute'])
}

export function hasAnySimpleSkillTag(skill: HeroSkillDefinition, tags: string[]) {
  return tags.some((tag) => skill.tags.includes(tag))
}

export function resolveCombat(state: SimulationState, frameContext: TickFrameContext): SimulationState {
  const next = state
  const enemyCreepIndicesByTeam: Record<TeamId, number[]> = { dawn: [], dusk: [] }
  const creepIndicesByTeamLane: Record<TeamId, Record<LaneId, number[]>> = {
    dawn: { top: [], mid: [], bot: [] },
    dusk: { top: [], mid: [], bot: [] },
  }
  for (let index = 0; index < next.creeps.length; index += 1) {
    const creep = next.creeps[index]
    enemyCreepIndicesByTeam[creep.team === 'dawn' ? 'dusk' : 'dawn'].push(index)
    creepIndicesByTeamLane[creep.team][creep.lane].push(index)
  }

  next.creeps.forEach((creep) => {
    const target = getCachedRouteCreepTarget(creep, next, 'attack', frameContext)
    if (target && next.time - creep.lastAttack >= 1.25) {
      if (!isCachedRouteCreepAttackTargetValid(creep, target, next)) return
      creep.lastAttack = next.time
      next.effects = addAttackEffect(next.effects, {
        kind: 'creep',
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

  next.towers.filter((tower) => tower.hp > 0).forEach((tower) => {
    const aggroTarget = tower.aggroUntil && tower.aggroUntil > next.time
      ? next.arcanes.find((arcane) => arcane.id === tower.aggroTargetId && arcane.stats.hp > 0 && arcane.respawn <= next.time && distance(tower.pos, arcane.pos) <= tower.range)
      : undefined
    const target = aggroTarget
      ?? nearestCreepAtIndices(tower.pos, next.creeps, enemyCreepIndicesByTeam[tower.team], tower.range)
      ?? nearest(tower.pos, next.arcanes.filter((arcane) => arcane.team !== tower.team && arcane.stats.hp > 0 && arcane.respawn <= next.time), tower.range)
    if (target && next.time - tower.lastAttack >= 1.2) {
      tower.lastAttack = next.time
      next.effects = addAttackEffect(next.effects, {
        kind: 'tower',
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
  })

  next.structures.filter((structure) => structure.kind === 'tower_tier_4' && structure.hp > 0).forEach((structure) => {
    const aggroTarget = structure.aggroUntil && structure.aggroUntil > next.time
      ? next.arcanes.find((arcane) => arcane.id === structure.aggroTargetId && arcane.stats.hp > 0 && arcane.respawn <= next.time && distance(structure.pos, arcane.pos) <= structure.range)
      : undefined
    const target = aggroTarget
      ?? nearestCreepAtIndices(structure.pos, next.creeps, enemyCreepIndicesByTeam[structure.team], structure.range)
      ?? nearest(structure.pos, next.arcanes.filter((arcane) => arcane.team !== structure.team && arcane.stats.hp > 0 && arcane.respawn <= next.time), structure.range)
    if (target && next.time - structure.lastAttack >= 1.05) {
      structure.lastAttack = next.time
      next.effects = addAttackEffect(next.effects, {
        kind: 'tower',
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
  })

  next.camps.filter((camp) => camp.hp > 0).forEach((camp) => {
    const target = nearest(camp.pos, next.arcanes.filter((arcane) => arcane.stats.hp > 0 && arcane.respawn <= next.time), camp.range)
    if (target && next.time - camp.lastAttack >= 1.35) {
      camp.lastAttack = next.time
      next.effects = addAttackEffect(next.effects, {
        kind: 'neutral',
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
  })

  if (next.boss.hp > 0 && next.boss.aggroUntil && next.boss.aggroUntil > next.time) {
    const target = next.arcanes.find((arcane) => (
      arcane.id === next.boss.aggroTargetId &&
      arcane.stats.hp > 0 &&
      arcane.respawn <= next.time &&
      distance(next.boss.pos, arcane.pos) <= next.boss.range
    ))
    if (target && next.time - next.boss.lastAttack >= 1.05) {
      next.boss.lastAttack = next.time
      next.effects = addAttackEffect(next.effects, {
        kind: 'neutral',
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
    if (arcane.stats.hp <= 0 || arcane.respawn > next.time) return
    if (arcane.channeling) return
    if (isArcaneAttackDisabled(next, arcane)) return
    const attackReady = next.time - arcane.lastAttack >= getEffectiveArcaneAttackCooldown(next, arcane)
    if (!attackReady && !hasAnyCastableSkill(next, arcane)) return
    const canAttackBoss = next.boss.hp > 0 && arcane.microDecision.startsWith('Atacar chefe')
    const bossTarget = canAttackBoss && distance(arcane.pos, next.boss.pos) <= getArcaneAttackCenterRange(arcane, next.boss) ? next.boss : undefined
    const objectiveTarget = getFocusedObjectiveTarget(next, arcane)
    const enemyTeam = arcane.team === 'dawn' ? 'dusk' : 'dawn'
    const lastHitTarget = getLastHitTarget(next, arcane, creepIndicesByTeamLane[enemyTeam][arcane.lane])
    const denyTarget = getDenyTarget(next, arcane, creepIndicesByTeamLane[arcane.team][arcane.lane])
    const enemyArcaneTarget = nearestReachableByArcane(arcane, next.arcanes.filter((other) => (
      other.team !== arcane.team &&
      other.stats.hp > 0 &&
      other.respawn <= next.time
    )))
    const laneControl = isLaningControlMicroDecision(arcane.microDecision)
    const fallbackEnemyCreeps: Creep[] = []
    for (const index of enemyCreepIndicesByTeam[arcane.team]) {
      const creep = next.creeps[index]
      if (!laneControl || creep.lane !== arcane.lane) fallbackEnemyCreeps.push(creep)
    }
    const target = bossTarget ?? objectiveTarget ?? lastHitTarget ?? denyTarget ?? enemyArcaneTarget ?? nearestReachableByArcane(arcane, [
      ...fallbackEnemyCreeps,
      ...next.camps.filter((camp) => camp.hp > 0),
      ...(canAttackBoss ? [next.boss] : []),
    ])
    if (tryCastSimpleSkill(next, arcane, target)) return
    if (!target || next.time - arcane.lastAttack < getEffectiveArcaneAttackCooldown(next, arcane)) return

    arcane.lastAttack = next.time
    const itemAttack = resolveArcaneItemAttackEffects(next, arcane, target)
    if ('player' in target && 'team' in target) {
      applyTowerAggro(next, target.team, arcane.id)
      applyCreepAggro(next, target.team, arcane.id)
    }
    if (isBoss(target)) {
      next.boss = {
        ...next.boss,
        aggroTargetId: arcane.id,
        aggroUntil: next.time + 5,
      }
    }
    next.effects = addAttackEffect(next.effects, {
      kind: 'arcane',
      targetKind: getCombatTargetKind(target),
      team: arcane.team,
      from: arcane.pos,
      to: target.pos,
      createdAt: next.time,
    })
    const dealtPhysicalDamage = Math.round(itemAttack.physicalDamage * getAuraMultiplier(next, arcane.team))
    damageEntity(next, target.id, dealtPhysicalDamage, {
      id: arcane.id,
      label: arcane.player,
      team: arcane.team,
      damageType: 'physical',
    })
    applyPostAttackItemEffects(next, arcane, target, itemAttack, dealtPhysicalDamage)
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

  state.creeps = state.creeps.map((creep) => {
    if (creep.team !== defendingTeam || distance(creep.pos, attacker.pos) > creep.range) {
      return creep
    }

    return {
      ...creep,
      aggroTargetId: attackerId,
      aggroUntil: state.time + 3.2,
    }
  })
}

export function getCreepGoldReward(creep: Creep) {
  return creep.goldReward
}

export function getCreepXpReward(creep: Creep) {
  return creep.xpReward
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

export function getDenyTarget(state: SimulationState, arcane: Arcane, creepIndices?: number[]) {
  const laneCreeps = creepIndices
    ? creepIndices.map((index) => state.creeps[index])
    : state.creeps.filter((creep) => creep.team === arcane.team && creep.lane === arcane.lane)
  return nearestReachableByArcane(
    arcane,
    laneCreeps.filter((creep) => (
      creep.hp > 0 &&
      creep.hp <= creep.maxHp * 0.5
    )),
  )
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
      (!reachableOnly || distance(arcane.pos, creep.pos) <= getArcaneAttackCenterRange(arcane, creep))
    ))
    .sort((a, b) => {
      const hpDelta = a.hp - b.hp
      if (Math.abs(hpDelta) > 3) return hpDelta
      return distance(arcane.pos, a.pos) - distance(arcane.pos, b.pos)
    })[0]
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

export function resolveDeaths(state: SimulationState): SimulationState {
  const next = state
  const deadCreeps = next.creeps.filter((creep) => creep.hp <= 0)
  const deadCreepIds = new Set(deadCreeps.map((creep) => creep.id))
  const deadCamps = next.camps.filter((camp) => camp.hp <= 0 && camp.respawn <= next.time)
  const deadBoss = next.boss.hp <= 0 && next.boss.respawn <= next.time ? next.boss : undefined
  const deadArcanes = next.arcanes.filter((arcane) => arcane.stats.hp <= 0 && arcane.respawn <= next.time)

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
        const xpRecipients = getCreepXpRecipients(next, creep)
        const sharedXp = xpRecipients.some((recipient) => recipient.id === arcane.id)
          ? Math.ceil(getCreepXpReward(creep) / xpRecipients.length)
          : 0

        return {
          gold: total.gold + lastHitGold,
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

  if (deadCamps.length) {
    next.camps = next.camps.map((camp) => camp.hp <= 0 ? { ...camp, respawn: next.time + NON_COMBAT_RULES.map.jungleRespawnIntervalSeconds } : camp)
    const rewardsByTeam = deadCamps.reduce((total, camp) => {
      const campReward = getCampRewards(camp, next.time)
      const rewardTeam = camp.lastHitBy?.team
      if (!rewardTeam) return total
      return {
        ...total,
        [rewardTeam]: {
          gold: total[rewardTeam].gold + campReward.gold,
          xp: total[rewardTeam].xp + campReward.xp,
        },
      }
    }, { dawn: { gold: 0, xp: 0 }, dusk: { gold: 0, xp: 0 } } satisfies Record<TeamId, { gold: number; xp: number }>)
    next.arcanes = next.arcanes.map((arcane) => {
      const reward = rewardsByTeam[arcane.team]
      const neutralKills = deadCamps.filter((camp) => camp.lastHitBy?.id === arcane.id).length
      return grantArcaneEconomy({ ...arcane, neutralKills: arcane.neutralKills + neutralKills }, reward.gold, reward.xp)
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
      }, 120, 400)
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
      const xpPerEligibleHero = killXp(
        arcane.stats.level,
        getTeamXp(next, killerTeam),
        getTeamXp(next, arcane.team),
        eligibleXpRecipients.length,
      )
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
  const cached = simulationEntityIndexesCache.get(state)
  const firstCreepId = state.creeps[0]?.id
  const lastCreepId = state.creeps.at(-1)?.id
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
    return cached.indexes
  }

  const indexes: SimulationEntityIndexes = {
    arcane: createEntityIndex(state.arcanes),
    creep: createEntityIndex(state.creeps),
    tower: createEntityIndex(state.towers),
    structure: createEntityIndex(state.structures),
    base: createEntityIndex(state.bases),
    camp: createEntityIndex(state.camps),
    arcaneIds: state.arcanes.map((arcane) => arcane.id),
  }
  rebuildCreepIndexes(indexes, state.creeps)
  simulationEntityIndexesCache.set(state, {
    indexes,
    creepCount: state.creeps.length,
    firstCreepId,
    lastCreepId,
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
  const targetTowerIndex = indexes.tower.get(id)
  const targetStructureIndex = indexes.structure.get(id)
  const targetBaseIndex = indexes.base.get(id)
  const targetCampIndex = indexes.camp.get(id)
  const targetArcane = targetArcaneIndex === undefined ? undefined : state.arcanes[targetArcaneIndex]
  const targetCreep = targetCreepIndex === undefined ? undefined : state.creeps[targetCreepIndex]
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
  const targetCurrentHp = targetArcane?.stats.hp ?? targetCreep?.hp ?? targetTower?.hp ?? targetStructure?.hp ?? targetBase?.hp ?? targetCamp?.hp ?? targetBoss?.hp ?? finalDamage

  const hit = (value: number) => Math.max(0, value - finalDamage)
  recordObjectiveLossIfDestroyed(state, targetTower, finalDamage, source)
  recordObjectiveLossIfDestroyed(state, targetStructure, finalDamage, source)
  recordObjectiveLossIfDestroyed(state, targetBase, finalDamage, source)
  if (targetCreep && targetCreepIndex !== undefined) {
    const creeps = [...state.creeps]
    creeps[targetCreepIndex] = { ...targetCreep, hp: hit(targetCreep.hp), lastHitBy: source }
    state.creeps = creeps
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
    camps[targetCampIndex] = { ...targetCamp, hp: hit(targetCamp.hp), lastHitBy: source }
    state.camps = camps
  } else if (targetBoss) {
    state.boss = {
      ...state.boss,
      hp: hit(state.boss.hp),
      lastHitBy: source,
      aggroTargetId: source.id,
      aggroUntil: state.time + 8,
    }
  }
  const appliedDamage = Math.min(Math.max(0, targetCurrentHp), Math.max(0, finalDamage))
  const updateArcane = (arcane: Arcane) => {
    const isTarget = arcane.id === id
    const isSource = sourceArcane?.id === arcane.id
    if (!isTarget && !isSource) return arcane
    return {
      ...arcane,
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
      id: `${effect.kind}-${effect.team}-${effect.createdAt}-${effects.length}`,
      duration,
    },
  ]
}

export function getCombatTargetKind(target: Arcane | Creep | Tower | Structure | Base | Camp | Boss): EntityKind {
  if ('player' in target) return 'arcane'
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

export function nearestCreepAtIndices(point: Point, creeps: Creep[], indices: number[], range: number) {
  let closest: Creep | undefined
  let closestDistanceSquared = range * range
  for (const index of indices) {
    const creep = creeps[index]
    const creepDistanceSquared = distanceSquared(point, creep.pos)
    if (creepDistanceSquared > closestDistanceSquared) continue
    closest = creep
    closestDistanceSquared = creepDistanceSquared
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
  const cached = creepSpatialGridCache.get(state)
  if (cached && cached.time === state.time) return cached.grid

  const grid = buildSpatialGrid(state.creeps.filter((creep) => creep.hp > 0), proximityGridCellSize)
  creepSpatialGridCache.set(state, { time: state.time, grid })
  return grid
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

export function querySpatialGrid<T extends { pos: Point }>(grid: SpatialGrid<T>, point: Point, radius: number): T[] {
  const minX = Math.floor((point.x - radius) / grid.cellSize)
  const maxX = Math.floor((point.x + radius) / grid.cellSize)
  const minY = Math.floor((point.y - radius) / grid.cellSize)
  const maxY = Math.floor((point.y + radius) / grid.cellSize)
  const results: T[] = []

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const cell = grid.cells.get(getSpatialGridCellKey(x, y))
      if (cell) results.push(...cell)
    }
  }

  return results
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
  return state.arcanes.some((arcane) => (
    arcane.team === team &&
    arcane.stats.hp > 0 &&
    arcane.respawn <= state.time &&
    distance(arcane.pos, point) <= arcane.visionRange
  ))
}

export function getTeamMemoryDanger(state: SimulationState, team: TeamId, point: Point) {
  return areaDangerFromMemory(state.teamMemory[team] ?? [], point, state.time, 20)
}

export function getArcaneOffensiveThreat(state: SimulationState, arcane: Arcane) {
  const cached = offensiveThreatCache.get(arcane)
  if (cached?.time === state.time) return cached

  const offensiveSkills = (getHeroDefinition(arcane.heroDefinitionId).skills ?? [])
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

export function getDangerScore(state: SimulationState, arcane: Arcane, visibleEnemies = state.arcanes.filter((enemy) => (
  enemy.team !== arcane.team &&
  enemy.stats.hp > 0 &&
  enemy.respawn <= state.time &&
  isPointVisibleToTeam(state, arcane.team, enemy.pos)
))) {
  const nearbyEnemyCreeps = querySpatialGrid(getCreepSpatialGrid(state), arcane.pos, 8)
  const enemyHeroPressure = visibleEnemies.reduce((score, enemy) => {
    const range = 16
    const proximity = Math.max(0, 1 - distance(arcane.pos, enemy.pos) / range)
    return score + proximity * (enemy.stats.damage / Math.max(1, arcane.stats.maxHp)) * 180
  }, 0)
  const towerPressure = state.towers
    .filter((tower) => tower.team !== arcane.team && tower.hp > 0)
    .reduce((score, tower) => {
      const radius = tower.range + 2
      const distanceSq = distanceSquared(arcane.pos, tower.pos)
      if (distanceSq > radius * radius) return score
      const proximity = 1 - Math.sqrt(distanceSq) / radius
      return score + proximity * 38
    }, 0)
  const creepPressure = nearbyEnemyCreeps
    .filter((creep) => creep.team !== arcane.team)
    .reduce((score, creep) => {
      const proximity = Math.max(0, 1 - distance(arcane.pos, creep.pos) / 8)
      return score + proximity * 5
    }, 0)
  const neutralPressure = state.camps
    .filter((camp) => camp.hp > 0)
    .reduce((score, camp) => {
      const radius = camp.range + 3
      const distanceSq = distanceSquared(arcane.pos, camp.pos)
      if (distanceSq > radius * radius) return score
      const proximity = 1 - Math.sqrt(distanceSq) / radius
      return score + proximity * (camp.strength === 'strong' ? 16 : camp.strength === 'medium' ? 11 : 7)
    }, 0)
  const bossPressure = state.boss.hp > 0 && state.boss.aggroTargetId === arcane.id && state.boss.aggroUntil && state.boss.aggroUntil > state.time
    ? Math.max(0, 1 - distance(arcane.pos, state.boss.pos) / (state.boss.range + 5)) * 26
    : 0
  const actionRadiusPressure = getEnemyActionThreatScore(state, arcane, arcane.pos, visibleEnemies) * 0.38
  const allyRelief = state.arcanes
    .filter((ally) => ally.team === arcane.team && ally.id !== arcane.id && ally.stats.hp > 0 && ally.respawn <= state.time)
    .reduce((score, ally) => score + Math.max(0, 1 - distance(arcane.pos, ally.pos) / 12) * 9, 0)

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
) {
  const nearbyEnemyCreeps = querySpatialGrid(getCreepSpatialGrid(state), point, 20)
  const towerThreat = state.towers
    .filter((tower) => tower.team !== arcane.team && tower.hp > 0)
    .reduce((score, tower) => {
      const radius = tower.range + 1.2
      if (distanceSquared(point, tower.pos) > radius * radius) return score
      return score + 42
    }, 0)
  const visibleArcaneThreat = visibleEnemies.reduce((score, enemy) => {
    const threat = getArcaneOffensiveThreat(state, enemy)
    const radius = Math.max(enemy.stats.range + 2.2, threat.range + 1.4)
    if (distance(point, enemy.pos) > radius) return score
    const attackPressure = enemy.stats.hp / enemy.stats.maxHp > 0.45 ? 18 : 11
    const spellPressure = Math.min(44, (threat.readyDamage / Math.max(1, arcane.stats.maxHp)) * 65)
    const lethalPressure = threat.readyDamage >= arcane.stats.hp * 0.7 ? 24 : 0
    return score + attackPressure + spellPressure + lethalPressure
  }, 0)
  const creepThreat = nearbyEnemyCreeps
    .filter((creep) => creep.team !== arcane.team)
    .reduce((score, creep) => {
      const radius = getCreepVisionRange(creep)
      if (distance(point, creep.pos) > radius) return score
      return score + getCreepLaneValue(creep)
    }, 0)
  const neutralThreat = state.camps
    .filter((camp) => camp.hp > 0)
    .reduce((score, camp) => {
      const radius = camp.range + 1.5
      if (distanceSquared(point, camp.pos) > radius * radius) return score
      return score + (camp.strength === 'strong' ? 22 : camp.strength === 'medium' ? 15 : 9)
    }, 0)
  const bossThreat = state.boss.hp > 0 && state.boss.aggroTargetId === arcane.id && state.boss.aggroUntil && state.boss.aggroUntil > state.time && distance(point, state.boss.pos) <= state.boss.range + 2
    ? 32
    : 0
  const nearbyAllyRelief = state.arcanes
    .filter((ally) => ally.team === arcane.team && ally.id !== arcane.id && ally.stats.hp > 0 && ally.respawn <= state.time)
    .reduce((score, ally) => {
      if (distance(point, ally.pos) > 8) return score
      return score + 4
    }, 0)

  return Math.max(0, Math.min(100, towerThreat + visibleArcaneThreat + creepThreat + neutralThreat + bossThreat - nearbyAllyRelief))
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

  const nearbyCreeps = querySpatialGrid(getCreepSpatialGrid(state), enemyTower.pos, 8)
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

  const nearbyCreeps = querySpatialGrid(getCreepSpatialGrid(state), point, 9)
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
