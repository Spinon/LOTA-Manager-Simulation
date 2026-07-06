import { useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { Brain, Coins, Eye, Gauge, HeartPulse, Package, Pause, Play, RotateCcw, Swords, Target, TowerControl, Zap } from 'lucide-react'
import { analyzeGameState } from './ai/analysis/gameStateAnalyzer'
import { DEFAULT_TEAM_AI_PROFILES } from './ai/config/aiConstants'
import { resolvePlayerExecution } from './ai/execution/executionModel'
import { addAiMemoryEvent, areaDangerFromMemory, pruneAiMemory } from './ai/memory/memorySystem'
import { selectPlayerMode } from './ai/player/playerAgent'
import { selectTeamPlan } from './ai/team/teamBrain'
import type { AiMemoryEvent, ExecutionFailureType, PlayerModeType, RawAiGameSnapshot, TeamPlan } from './ai/types/aiTypes'
import { resolveDamage, type CombatDamageType } from './game-systems/combatFormulas'
import { applyBarrier, applyFlatAndPercentModifiers, canDispelEffect, finalDebuffDuration, finalSlowValue, type DispelPower, type DispelType } from './game-systems/effectFormulas'
import { calculateHeroStats, type AttackType, type HeroDefinition, type HeroRole, type HeroSkillDefinition, type PrimaryAttribute, type StatModifier } from './game-systems/heroAttributes'
import { laneWinChance } from './game-systems/laneControlFormulas'
import {
  NON_COMBAT_RULES,
  assistGoldPerHero,
  bountyRuneGold,
  comebackKillGoldBonus,
  deathGoldLoss,
  getLevelFromXp,
  getLevelProgress,
  healingLotusValue,
  XP_TO_REACH_LEVEL,
  expectedTimeToItemSeconds,
  killGold,
  killXp,
  passiveGoldForTick,
  resourceRegenForTick,
  respawnDurationSeconds,
  stackSuccessChance,
  stackedCampValue,
  wisdomRuneXp,
} from './game-systems/nonCombatFormulas'
import { expectedTimeToKillStructure, isBackdoorProtected, structureDamageTaken } from './game-systems/structureFormulas'
import {
  getLaneCreepReward,
  getLaneCreepStats,
  getLaneCreepWaveKinds,
  getNeutralCampReward,
  getNeutralCampStats,
  getStructureStatsByRole,
  type LaneCreepKind,
} from './game-systems/unitSeedsAdapter'
import { isDay } from './game-systems/visionFormulas'
import './App.css'

type TeamId = 'dawn' | 'dusk'
type LaneId = 'top' | 'mid' | 'bot'
type EntityKind = 'arcane' | 'creep' | 'tower' | 'structure' | 'base' | 'camp' | 'boss' | 'rune'
type GamePhase = 'early' | 'mid' | 'late'
type DayCycle = 'day' | 'night'
type CampStrength = 'weak' | 'medium' | 'strong'
type RuneKind = 'bounty' | 'power' | 'wisdom' | 'lotus'
type PowerRuneKind = 'haste' | 'arcane' | 'shield' | 'damage'
type StructureKind = 'barracks_melee' | 'barracks_ranged' | 'tower_tier_4'
type TeamObjectiveKind = 'tower' | 'structure' | 'boss' | 'pickoff'
type DecisionStatus = 'sharp' | 'steady' | 'hesitant' | 'tilted'
type Selected = { kind: EntityKind; id: string } | undefined

type Point = { x: number; y: number }
type Stats = {
  maxHp: number
  hp: number
  maxMana: number
  mana: number
  damage: number
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
type Arcane = {
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
  earnedGold: number
  stats: Stats
}
type Creep = {
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
type Tower = {
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
type Structure = {
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
type Base = {
  id: string
  team: TeamId
  pos: Point
  hp: number
  maxHp: number
}
type Camp = {
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
type Boss = {
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
type CombatTarget = Arcane | Creep | Tower | Structure | Base | Camp | Boss
type MapRune = {
  id: string
  kind: RuneKind
  pos: Point
  spawnedAt: number
  expiresAt?: number
  power?: PowerRuneKind
  side?: TeamId
  spawnIndex: number
}
type TeamCall = {
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
type TeamAura = {
  name: string
  attributeMultiplier: number
  expiresAt: number
}
type TeamFortification = {
  activeUntil: number
  cooldownUntil: number
  targetId?: string
}
type SimulationState = {
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
  arcanes: Arcane[]
  creeps: Creep[]
  towers: Tower[]
  structures: Structure[]
  bases: Base[]
  camps: Camp[]
  runes: MapRune[]
  boss: Boss
}
type CombatSource = {
  id: string
  label: string
  team: TeamId
  damageType?: CombatDamageType
}
type MatchEvent = {
  id: string
  time: number
  team: TeamId
  actor: string
  actorTeam: TeamId
  victim: string
  victimTeam: TeamId
  detail: string
}
type AttackEffect = {
  id: string
  kind: 'creep' | 'arcane' | 'tower' | 'neutral'
  targetKind: EntityKind
  team: TeamId
  from: Point
  to: Point
  createdAt: number
  duration: number
}
type DenyMarker = {
  id: string
  team: TeamId
  pos: Point
  createdAt: number
  expiresAt: number
}
type GoldMarker = {
  id: string
  team: TeamId
  pos: Point
  amount: number
  createdAt: number
  expiresAt: number
}
type SkillMarker = {
  id: string
  team: TeamId
  pos: Point
  label: string
  createdAt: number
  expiresAt: number
}
type TimedEffect = {
  id: string
  targetId: string
  sourceId: string
  sourceName: string
  sourceTeam: TeamId
  kind: 'slow' | 'stun' | 'silence' | 'buff' | 'barrier' | 'dot' | 'hot'
  polarity: 'positive' | 'negative'
  value: number
  stacks: number
  modifiers?: {
    damagePct?: number
    armorFlat?: number
    moveSpeedPct?: number
    attackSpeedPct?: number
  }
  barrierRemaining?: number
  damageType?: CombatDamageType
  tickInterval?: number
  nextTickAt?: number
  dispelType: DispelType
  createdAt: number
  expiresAt: number
}
type DeathMarker = {
  id: string
  arcane: string
  team: TeamId
  pos: Point
  createdAt: number
  expiresAt: number
}
type ShopItem = {
  id: string
  name: string
  cost: number
  modifier: StatModifier
  active?: {
    effectId: string
    target: string
    tags: string[]
    values: Record<string, number | string | boolean>
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
    moveSpeed: number
  }
}
type ConsumableItem = {
  id: string
  name: string
  cost: number
  charges: number
  heal?: number
  mana?: number
  duration?: number
  instant: boolean
}

const teamInfo = {
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

const laneNames: Record<LaneId, string> = {
  top: 'Topo',
  mid: 'Meio',
  bot: 'Baixo',
}

const baseServiceRange = 6
const mapWallPadding = 3
const minimumMeleeMapAttackRange = 4
const simulationFrameSeconds = 1 / 60
const decisionGateSeconds = 0.1
const teamDecisionIntervalSeconds = 1.2
const fortificationDurationSeconds = 7
const fortificationCooldownSeconds = 300
const fortificationDamageMultiplier = 0.35
const maxFrameElapsedSeconds = 0.12
const baseMaxSimulationStepsPerFrame = 5
const maxAttackEffects = 28
const bossPath: Point[] = [
  { x: 15, y: 8 },
  { x: 50, y: 5 },
  { x: 85, y: 10 },
  { x: 96, y: 45 },
  { x: 86, y: 88 },
  { x: 50, y: 96 },
  { x: 14, y: 90 },
  { x: 5, y: 52 },
]
const runeSpawnPoints = {
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
const powerRuneCycle: PowerRuneKind[] = ['haste', 'arcane', 'shield', 'damage']
function getArcaneRespawnDuration(level: number) {
  return respawnDurationSeconds(level)
}

function getAuraMultiplier(state: SimulationState, team: TeamId) {
  return state.teamAuras[team]?.attributeMultiplier ?? 1
}

function getRoleAggression(role: string) {
  if (role === 'Offlane') return 68
  if (role === 'Mid') return 58
  if (role === 'Safe Lane') return 48
  if (role === 'Greedy Support') return 42
  return 34
}

function getRoleShotcalling(role: string) {
  if (role === 'Dedicated Support') return 76
  if (role === 'Greedy Support') return 68
  if (role === 'Mid') return 52
  if (role === 'Offlane') return 42
  return 36
}

function getRoleDecisionStatus(role: string): DecisionStatus {
  if (role === 'Dedicated Support') return 'sharp'
  if (role === 'Mid') return 'sharp'
  if (role === 'Offlane') return 'steady'
  if (role === 'Greedy Support') return 'steady'
  return 'hesitant'
}

function getRoleDecisionTempo(role: string) {
  if (role === 'Dedicated Support') return 0.78
  if (role === 'Mid') return 0.86
  if (role === 'Offlane') return 0.96
  if (role === 'Greedy Support') return 1.04
  return 1.12
}

function getRoleFarmPriority(role: string) {
  if (role === 'Safe Lane') return 100
  if (role === 'Mid') return 82
  if (role === 'Offlane') return 62
  if (role === 'Greedy Support') return 34
  return 16
}

function getRoleFarmAppetite(role: string) {
  return getRoleFarmPriority(role) / 100
}

function getRoleGpmDecisionBias(role: string) {
  if (role === 'Safe Lane') return 86
  if (role === 'Mid') return 78
  if (role === 'Offlane') return 58
  if (role === 'Greedy Support') return 42
  return 24
}

function getGamePhase(time: number): GamePhase {
  if (time < 8 * 60) return 'early'
  if (time < 24 * 60) return 'mid'
  return 'late'
}

function getGamePhaseLabel(phase: GamePhase) {
  if (phase === 'early') return 'Early Game'
  if (phase === 'mid') return 'Mid Game'
  return 'Late Game'
}

function formatCompactGold(value: number) {
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(1)}k`
  return `${Math.round(value)}g`
}

function getDayCycle(time: number): DayCycle {
  return isDay(time) ? 'day' : 'night'
}

function getDayCycleLabel(cycle: DayCycle) {
  return cycle === 'day' ? 'Dia' : 'Noite'
}

const lanePaths: Record<TeamId, Record<LaneId, Point[]>> = {
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

function createArcaneDefinition(
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

const heroDefinitions: Record<string, HeroDefinition> = {
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

let shopCatalog: ShopItem[] = []
let consumableCatalog: ConsumableItem[] = []
let getRecommendedBuildItemIdsForHero = (_heroDefinitionId: string): string[] => []
let getRecommendedStartingItemNamesForHero = (_heroDefinitionId: string, role: string): string[] => getFallbackStartingItemNames(role)

async function loadGameData() {
  const [heroModule, itemModule] = await Promise.all([
    import('./game-systems/heroSeedsAdapter'),
    import('./game-systems/itemSeedsAdapter'),
  ])
  Object.assign(heroDefinitions, heroModule.seedHeroDefinitions)
  shopCatalog = itemModule.itemShopCatalog
  consumableCatalog = itemModule.consumableCatalog
  getRecommendedBuildItemIdsForHero = itemModule.getRecommendedBuildItemIds
  getRecommendedStartingItemNamesForHero = itemModule.getRecommendedStartingItemNames
}

const rosterSeed: Omit<Arcane, 'pos' | 'target' | 'pathIndex' | 'respawn' | 'lastAttack' | 'aggression' | 'visionRange' | 'shotcalling' | 'macroDecision' | 'microDecision' | 'aiMode' | 'aiReason' | 'aiExecutionChance' | 'aiExecutionDelay' | 'aiFailure' | 'decisionStatus' | 'decisionTempo' | 'nextDecisionAt' | 'lastDecisionAt' | 'forceDecision' | 'lastDecisionHpRatio' | 'lastDecisionManaRatio' | 'lastDecisionPos' | 'decision' | 'itemCooldowns' | 'earnedGold' | 'stats'>[] = [
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

function createInitialState(): SimulationState {
  const randomizedRoster = createRandomizedTestRoster()
  const arcanes = randomizedRoster.map((arcane, index) => {
    const spawn = teamInfo[arcane.team].base
    const pos = spreadPoint(spawn, index)
    const startingItems = getRecommendedStartingItemNamesForHero(arcane.heroDefinitionId, arcane.role)
    const stats = buildArcaneStats(arcane.heroDefinitionId, 1, 600, 0, 1, 1, startingItems)
    return {
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
      earnedGold: stats.gold,
      stats,
    }
  })

  return {
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

function createRandomizedTestRoster() {
  const usedHeroIds = new Set<string>()
  return rosterSeed.map((slot) => {
    const hero = pickRandomHeroForSlot(slot.role, usedHeroIds)
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

function pickRandomHeroForSlot(role: string, usedHeroIds: Set<string>) {
  const pool = getRandomHeroPool().filter((hero) => !usedHeroIds.has(hero.id))
  const preferredPool = pool.filter((hero) => isHeroPreferredForSlot(hero, role))
  return pickRandom(preferredPool.length > 0 ? preferredPool : pool)
}

function getRandomHeroPool() {
  const importedHeroes = Object.values(heroDefinitions).filter((hero) => hero.id.startsWith('h') && (hero.skills?.length ?? 0) >= 4)
  return importedHeroes.length > 0 ? importedHeroes : Object.values(heroDefinitions)
}

function isHeroPreferredForSlot(hero: HeroDefinition, role: string) {
  if (role === 'Safe Lane') return hero.roles.includes('carry')
  if (role === 'Mid') return hero.roles.includes('nuker') || hero.attackType === 'ranged'
  if (role === 'Offlane') return hero.roles.includes('initiator') || hero.roles.includes('durable') || hero.roles.includes('disabler')
  if (role === 'Greedy Support') return hero.roles.includes('support') || hero.roles.includes('nuker') || hero.roles.includes('disabler')
  return hero.roles.includes('support') || hero.roles.includes('disabler')
}

function pickRandom<T>(items: T[]) {
  if (items.length === 0) return undefined
  return items[Math.floor(Math.random() * items.length)]
}

function getHeroPortraitCode(hero: HeroDefinition) {
  const words = hero.name.split(' ').filter(Boolean)
  const code = words.length >= 2
    ? `${words[0][0]}${words[1][0]}`
    : hero.name.slice(0, 2)
  return code.toUpperCase()
}

function createInitialRunes(): MapRune[] {
  return createBountyRunes(0, 0)
}

function getFallbackStartingItemNames(role: string) {
  if (role === 'Mid') return ['Mana Clarity', 'Burst Mango']
  if (role.includes('Support')) return ['Regen Rations', 'Mana Clarity']
  return ['Regen Rations', 'Healing Salve']
}

function buildArcaneStats(heroDefinitionId: string, level: number, gold: number, xp: number, hpRatio = 1, manaRatio = 1, itemNames: string[] = []): Stats {
  const definition = getHeroDefinition(heroDefinitionId)
  const calculated = calculateHeroStats(definition, level, getItemStatModifiers(itemNames))
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

function getItemStatModifiers(itemNames: string[]) {
  return itemNames
    .map((name) => shopCatalog.find((item) => item.name === name)?.modifier)
    .filter((modifier): modifier is StatModifier => modifier !== undefined)
}

function rebuildArcaneStatsAfterItemChange(arcane: Arcane, nextItems: string[], nextGold: number) {
  const nextStats = buildArcaneStats(arcane.heroDefinitionId, arcane.stats.level, nextGold, arcane.stats.xp, 1, 1, nextItems)
  const gainedMaxHp = Math.max(0, nextStats.maxHp - arcane.stats.maxHp)
  const gainedMaxMana = Math.max(0, nextStats.maxMana - arcane.stats.maxMana)

  return {
    ...nextStats,
    hp: Math.min(nextStats.maxHp, arcane.stats.hp + gainedMaxHp),
    mana: Math.min(nextStats.maxMana, arcane.stats.mana + gainedMaxMana),
  }
}

function getArcaneDefinitionVisionRange(heroDefinitionId: string, cycle: DayCycle) {
  const calculated = calculateHeroStats(getHeroDefinition(heroDefinitionId), 1, [])
  return (cycle === 'day' ? calculated.vision.dayVision : calculated.vision.nightVision) / 100
}

function getHeroDefinition(heroDefinitionId: string) {
  const definition = heroDefinitions[heroDefinitionId]
  if (!definition) {
    throw new Error(`Hero definition not loaded: ${heroDefinitionId}`)
  }
  return definition
}

function createBoss(): Boss {
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

function getBossStats(time: number) {
  const minutes = Math.floor(time / 60)
  const scale = 1 + minutes * 0.065
  return {
    hp: Math.round(2800 * scale),
    damage: Math.round(135 * scale),
    range: 5.8,
    moveSpeed: 2.1 + Math.min(0.55, minutes * 0.015),
  }
}

function createNeutralCamps(): Camp[] {
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

function getCampStats(strength: CampStrength) {
  return getNeutralCampStats(getCampTier(strength))
}

function getCampRewards(camp: Camp, time: number) {
  const reward = getNeutralCampReward(getCampTier(camp.strength), time)
  return {
    gold: Math.round(stackedCampValue(reward.gold, camp.stackCount)),
    xp: Math.round(stackedCampValue(reward.xp, camp.stackCount)),
  }
}

function getCampTier(strength: CampStrength) {
  if (strength === 'strong') return 'ancient'
  if (strength === 'medium') return 'medium'
  return 'small'
}

function campStrengthLabel(strength: CampStrength) {
  if (strength === 'strong') return 'forte'
  if (strength === 'medium') return 'medio'
  return 'fraco'
}

function createTowers(): Tower[] {
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

function createStructures(): Structure[] {
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

function createBase(team: TeamId): Base {
  const stats = getStructureStatsByRole(getSeedTeam(team), 'base', 0, 'ancient_core')
  return {
    id: `base-${team}`,
    team,
    pos: teamInfo[team].base,
    hp: stats.hp,
    maxHp: stats.hp,
  }
}

function getSeedTeam(team: TeamId) {
  return team === 'dawn' ? 'blue' : 'red'
}

function getSeedLane(lane: LaneId) {
  return lane === 'bot' ? 'bottom' : lane
}

function getLaneCreepUpgradeMultiplier(state: SimulationState, team: TeamId, lane: LaneId, type: Creep['type']) {
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

function getLaneCreepUpgradeLevel(state: SimulationState, team: TeamId, lane: LaneId, type: Creep['type']) {
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

function spawnWave(state: SimulationState): Creep[] {
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

function tick(state: SimulationState, delta: number, shouldDecide: boolean): SimulationState {
  if (state.winner) return state

  let next: SimulationState = state
  const previousDayCycle = getDayCycle(next.time)
  const previousTime = next.time
  next.time = Number((next.time + delta).toFixed(3))
  if (next.time >= next.nextWave) {
    next.creeps.push(...spawnWave(next))
    next.nextWave += NON_COMBAT_RULES.map.waveIntervalSeconds
  }
  next.runes = spawnRunesForTick(next, previousTime)
  const passiveGold = passiveGoldForTick(next.time, delta)
  next.effects = next.effects.filter((effect) => next.time - effect.createdAt < effect.duration)
  next.timedEffects = next.timedEffects.filter((effect) => effect.expiresAt > next.time)
  next = processTimedEffects(next)
  next.deathMarkers = next.deathMarkers.filter((marker) => marker.expiresAt > next.time)
  next.denyMarkers = next.denyMarkers.filter((marker) => marker.expiresAt > next.time)
  next.goldMarkers = next.goldMarkers.filter((marker) => marker.expiresAt > next.time)
  next.skillMarkers = (next.skillMarkers ?? []).filter((marker) => marker.expiresAt > next.time)
  next.teamMemory = {
    dawn: pruneAiMemory(next.teamMemory.dawn, next.time),
    dusk: pruneAiMemory(next.teamMemory.dusk, next.time),
  }
  next.teamAuras = Object.fromEntries(
    Object.entries(next.teamAuras).filter(([, aura]) => aura && aura.expiresAt > next.time),
  ) as Partial<Record<TeamId, TeamAura>>
  const dayCycle = getDayCycle(next.time)
  if (dayCycle !== previousDayCycle) {
    next.arcanes = next.arcanes.map((arcane) => ({
      ...arcane,
      visionRange: getArcaneDefinitionVisionRange(arcane.heroDefinitionId, dayCycle),
    }))
  }
  next.arcanes = next.arcanes.map((arcane, index) => respawnArcaneIfReady(arcane, next.time, index))

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
  next.arcanes = next.arcanes.map((arcane) => (
    arcane.stats.hp > 0 && arcane.respawn <= next.time
      ? grantArcaneEconomy(arcane, passiveGold, 0)
      : arcane
  ))
  next.creeps = next.creeps.map((creep) => updateCreepMovement(creep, next, delta))
  resolveUnitHitboxes(next)
  next = updateTeamFortifications(next)
  next = resolveCombat(next)
  next = resolveDeaths(next)
  next.winner = next.bases.find((base) => base.hp <= 0)?.team === 'dawn' ? 'dusk' : next.bases.find((base) => base.hp <= 0)?.team === 'dusk' ? 'dawn' : undefined
  return next
}

function cloneSimulationStateForTick(state: SimulationState): SimulationState {
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
    arcanes: state.arcanes.map((arcane) => ({
      ...arcane,
      pos: { ...arcane.pos },
      target: { ...arcane.target },
      lastDecisionPos: { ...arcane.lastDecisionPos },
      itemCooldowns: { ...arcane.itemCooldowns },
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

function spawnRunesForTick(state: SimulationState, previousTime: number) {
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

function crossedInterval(previousTime: number, currentTime: number, interval: number, startTime: number) {
  if (currentTime < startTime) return false
  const previousBucket = previousTime < startTime ? -1 : Math.floor((previousTime - startTime) / interval)
  const currentBucket = Math.floor((currentTime - startTime) / interval)
  return currentBucket > previousBucket
}

function createBountyRunes(spawnIndex: number, time: number): MapRune[] {
  return runeSpawnPoints.bounty.map((pos, index) => ({
    id: `rune-bounty-${spawnIndex}-${index}`,
    kind: 'bounty',
    pos,
    spawnedAt: time,
    expiresAt: time + NON_COMBAT_RULES.map.bountyRuneIntervalSeconds,
    spawnIndex,
  }))
}

function createPowerRunes(spawnIndex: number, time: number): MapRune[] {
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

function createWisdomRunes(spawnIndex: number, time: number): MapRune[] {
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

function createLotusRunes(existingRunes: MapRune[], spawnIndex: number, time: number): MapRune[] {
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

function processJungleStacks(state: SimulationState, previousTime: number): SimulationState {
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

function crossedMinuteSecond(previousTime: number, currentTime: number, second: number) {
  if (currentTime < second) return false
  const previousBucket = Math.floor((previousTime - second) / 60)
  const currentBucket = Math.floor((currentTime - second) / 60)
  return currentBucket > previousBucket
}

function getJungleStacker(state: SimulationState, camp: Camp) {
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

function getJungleStackRadius(arcane: Arcane, camp: Camp) {
  const supportBonus = arcane.role.includes('Support') ? 4 : 0
  const campBonus = camp.strength === 'strong' ? 2 : camp.strength === 'medium' ? 1 : 0
  return 10 + supportBonus + campBonus
}

function getJungleStackerScore(arcane: Arcane, camp: Camp) {
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

function getJungleStackChance(state: SimulationState, camp: Camp, stacker: Arcane) {
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

function getBestJungleCampForArcane(state: SimulationState, arcane: Arcane, range: number, visibleEnemies: Arcane[]) {
  return state.camps
    .filter((camp) => camp.hp > 0 && distance(arcane.pos, camp.pos) <= range)
    .map((camp) => ({
      camp,
      score: getCampFarmDesireScore(state, arcane, camp, visibleEnemies),
    }))
    .filter(({ score }) => score > 8)
    .sort((a, b) => b.score - a.score)[0]?.camp
}

function getCampFarmDesireScore(state: SimulationState, arcane: Arcane, camp: Camp, visibleEnemies: Arcane[]) {
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

function getCampFarmValueForAi(state: SimulationState, arcane: Arcane, camp: Camp) {
  const baseValue = camp.strength === 'strong' ? 72 : camp.strength === 'medium' ? 54 : 36
  const rewards = getCampRewards(camp, state.time)
  const rewardValue = clampNumber((rewards.gold + rewards.xp * 0.32) / 7.5, 0, 100)
  const stackUrgency = camp.stackCount * (arcane.role === 'Safe Lane' ? 24 : arcane.role === 'Mid' ? 20 : arcane.role === 'Offlane' ? 14 : arcane.role === 'Greedy Support' ? 8 : 2)

  return clampNumber(baseValue * 0.48 + rewardValue * 0.52 + stackUrgency, 0, 100)
}

function getEstimatedLaneFarmGpm(state: SimulationState, arcane: Arcane, laneCreeps: Creep[]) {
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

function getEstimatedLanePushGpm(arcane: Arcane, creeps: Creep[]) {
  const visibleCreeps = creeps.filter((creep) => creep.hp > 0)
  if (visibleCreeps.length === 0) return 0

  const expectedGold = visibleCreeps.reduce((total, creep) => total + getCreepGoldReward(creep) * 0.44, 0)
  const waveDensityBonus = Math.min(1.28, 1 + visibleCreeps.length * 0.035)
  const cycleSeconds = clampNumber(20 + distance(arcane.pos, visibleCreeps[0].pos) / Math.max(0.9, arcane.stats.moveSpeed), 18, 44)

  return Math.round((expectedGold * waveDensityBonus / cycleSeconds) * 60)
}

function getEstimatedJungleFarmGpm(state: SimulationState, arcane: Arcane, camp: Camp) {
  const rewards = getCampRewards(camp, state.time)
  const effectiveDamage = Math.max(1, getEffectiveArcaneDamage(state, arcane))
  const damagePerSecond = effectiveDamage / Math.max(0.25, getEffectiveArcaneAttackCooldown(state, arcane))
  const clearSeconds = clampNumber(camp.hp / Math.max(20, damagePerSecond), 5, 38)
  const travelSeconds = distance(arcane.pos, camp.pos) / Math.max(0.8, arcane.stats.moveSpeed)
  const dangerTax = getEnemyActionThreatScore(state, arcane, camp.pos) * 0.08
  const cycleSeconds = clampNumber(clearSeconds + travelSeconds + dangerTax, 8, 58)

  return Math.round((rewards.gold / cycleSeconds) * 60)
}

function deterministicPercent(seed: string, bucket: number) {
  let hash = 0
  const key = `${seed}-${bucket}`
  for (let index = 0; index < key.length; index += 1) {
    hash = (hash * 31 + key.charCodeAt(index)) % 10007
  }
  return (hash / 10007) * 100
}

function addJungleStackEvent(state: SimulationState, camp: Camp, stacker: Arcane, stackCount: number) {
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

function collectRunes(state: SimulationState): SimulationState {
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

function getRuneCollectRadius(rune: MapRune) {
  return rune.kind === 'lotus' ? 3 : 3.5
}

function applyRuneReward(state: SimulationState, collector: Arcane, rune: MapRune) {
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

function getPowerRuneModifiers(power: PowerRuneKind) {
  if (power === 'haste') return { moveSpeedPct: 0.22 }
  if (power === 'arcane') return { attackSpeedPct: 0.14 }
  if (power === 'shield') return { armorFlat: 4 }
  return { damagePct: 0.18 }
}

function getRuneGlyph(rune: MapRune) {
  if (rune.kind === 'bounty') return 'G'
  if (rune.kind === 'wisdom') return 'XP'
  if (rune.kind === 'lotus') return '+'
  if (rune.power === 'haste') return 'H'
  if (rune.power === 'arcane') return 'A'
  if (rune.power === 'shield') return 'S'
  return 'D'
}

function getRuneTitle(rune: MapRune) {
  return `${getRuneLabel(rune)} - ${getRuneKindLabel(rune.kind)}`
}

function getRuneLabel(rune: MapRune) {
  if (rune.kind === 'bounty') return 'Runa de Ouro'
  if (rune.kind === 'wisdom') return 'Runa de Sabedoria'
  if (rune.kind === 'lotus') return 'Lotus de Cura'
  return `Runa de Poder: ${getPowerRuneLabel(rune.power ?? 'damage')}`
}

function getRuneKindLabel(kind: RuneKind) {
  if (kind === 'bounty') return 'Bounty'
  if (kind === 'wisdom') return 'Wisdom'
  if (kind === 'lotus') return 'Lotus'
  return 'Power'
}

function getPowerRuneLabel(power: PowerRuneKind) {
  if (power === 'haste') return 'Haste'
  if (power === 'arcane') return 'Arcane'
  if (power === 'shield') return 'Shield'
  return 'Damage'
}

function getRuneInspectorSubtitle(rune: MapRune, time: number) {
  const timer = rune.expiresAt ? `expira em ${Math.max(0, Math.ceil(rune.expiresAt - time))}s` : 'acumula no mapa'
  if (rune.side) return `${teamInfo[rune.side].name} side / ${timer}`
  return timer
}

function getRuneRewardLabel(rune: MapRune, time: number) {
  if (rune.kind === 'bounty') return `${bountyRuneGold(Math.floor(time / 60))}g/time`
  if (rune.kind === 'wisdom') return `${wisdomRuneXp(rune.spawnIndex)} XP`
  if (rune.kind === 'lotus') return `${healingLotusValue(1)} vida/mana`
  return getPowerRuneLabel(rune.power ?? 'damage')
}

function addRuneEvent(state: SimulationState, collector: Arcane, rune: MapRune, detail: string) {
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

function updateBoss(boss: Boss, time: number, delta: number): Boss {
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

function respawnArcaneIfReady(arcane: Arcane, time: number, index: number): Arcane {
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

function updateTeamPlans(state: SimulationState): SimulationState {
  const analyzed = analyzeGameState(createAiGameSnapshot(state))
  const teamPlans = Object.fromEntries((['dawn', 'dusk'] as TeamId[]).map((team) => [
    team,
    selectTeamPlan({
      analyzed,
      teamId: team,
      teamProfile: DEFAULT_TEAM_AI_PROFILES[team],
      previousPlan: state.teamPlans[team],
    }),
  ])) as Partial<Record<TeamId, TeamPlan>>

  return { ...state, teamPlans }
}

function updateTeamCalls(state: SimulationState): SimulationState {
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

function isTeamCallTargetAlive(state: SimulationState, call: TeamCall) {
  if (call.kind === 'tower') return state.towers.some((tower) => tower.id === call.targetId && tower.hp > 0 && isTowerUnlocked(state, call.team, tower))
  if (call.kind === 'structure') return state.structures.some((structure) => structure.id === call.targetId && structure.hp > 0 && isStructureUnlocked(state, call.team, structure))
  if (call.kind === 'boss') return state.boss.id === call.targetId && state.boss.hp > 0
  return state.arcanes.some((arcane) => arcane.id === call.targetId && arcane.stats.hp > 0 && arcane.respawn <= state.time)
}

function createAiGameSnapshot(state: SimulationState): RawAiGameSnapshot {
  const teams = Object.fromEntries((['dawn', 'dusk'] as TeamId[]).map((team) => {
    const arcanes = state.arcanes.filter((arcane) => arcane.team === team)
    const aliveArcanes = arcanes.filter((arcane) => arcane.stats.hp > 0 && arcane.respawn <= state.time)
    const averageHealthPct = average(arcanes.map((arcane) => arcane.stats.maxHp > 0 ? arcane.stats.hp / arcane.stats.maxHp : 0))
    const averageManaPct = average(arcanes.map((arcane) => arcane.stats.maxMana > 0 ? arcane.stats.mana / arcane.stats.maxMana : 1))
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
        dawn: getAttackableEnemyTowers(state, 'dawn').length > 0 || getAttackableEnemyStructures(state, 'dawn').length > 0,
        dusk: getAttackableEnemyTowers(state, 'dusk').length > 0 || getAttackableEnemyStructures(state, 'dusk').length > 0,
      },
    },
  }
}

function createTeamCall(state: SimulationState, caller: Arcane, phase: GamePhase): TeamCall | undefined {
  const objectives: Array<{ kind: TeamObjectiveKind; targetId: string; targetName: string; pos: Point; score: number }> = []
  const visibleEnemies = state.arcanes.filter((enemy) => (
    enemy.team !== caller.team &&
    enemy.stats.hp > 0 &&
    enemy.respawn <= state.time &&
    isPointVisibleToTeam(state, caller.team, enemy.pos)
  ))
  const teamPlan = state.teamPlans[caller.team] ?? selectTeamPlan({
    analyzed: analyzeGameState(createAiGameSnapshot(state)),
    teamId: caller.team,
    teamProfile: DEFAULT_TEAM_AI_PROFILES[caller.team],
  })
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
      return {
        boss: state.boss,
        localNumbers,
        score: 58 + (teamPlan?.type === 'take_boss' ? 20 : planWantsQuietMap ? -12 : 0) + (phase === 'late' ? 22 : 0) + Math.max(0, localNumbers.advantage) * 14 - Math.max(0, -localNumbers.advantage) * 22 - distance(caller.pos, state.boss.pos) * 0.42,
      }
    })()
    : undefined

  if (bossTarget && bossTarget.score > 38 && bossTarget.localNumbers.advantage >= (phase === 'late' ? -0.1 : 0.5)) {
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

function getTeamCallPoint(state: SimulationState, call: TeamCall): Point | undefined {
  if (call.kind === 'tower') return state.towers.find((tower) => tower.id === call.targetId && tower.hp > 0)?.pos
  if (call.kind === 'structure') return state.structures.find((structure) => structure.id === call.targetId && structure.hp > 0)?.pos
  if (call.kind === 'boss') return state.boss.id === call.targetId && state.boss.hp > 0 ? mapEdgeApproachPoint(state.boss.pos) : undefined
  return state.arcanes.find((arcane) => arcane.id === call.targetId && arcane.stats.hp > 0 && arcane.respawn <= state.time)?.pos
}

function getTeamCallObjectivePoint(state: SimulationState, call: TeamCall): Point | undefined {
  if (call.kind === 'boss') return state.boss.id === call.targetId && state.boss.hp > 0 ? state.boss.pos : undefined
  return getTeamCallPoint(state, call)
}

function isTowerUnlocked(state: SimulationState, team: TeamId, tower: Tower) {
  return !state.towers.some((other) => (
    other.team !== team &&
    other.lane === tower.lane &&
    other.tier < tower.tier &&
    other.hp > 0
  ))
}

function getAttackableEnemyTowers(state: SimulationState, team: TeamId) {
  return state.towers.filter((tower) => tower.team !== team && tower.hp > 0 && isTowerUnlocked(state, team, tower))
}

function getNextEnemyTowerInLane(state: SimulationState, team: TeamId, lane: LaneId) {
  return getAttackableEnemyTowers(state, team)
    .filter((tower) => tower.lane === lane)
    .sort((a, b) => a.tier - b.tier)[0]
}

function isEnemyBaseUnlocked(state: SimulationState, team: TeamId) {
  return !state.structures.some((structure) => structure.team !== team && structure.hp > 0 && structure.kind === 'tower_tier_4')
}

function isStructureUnlocked(state: SimulationState, team: TeamId, structure: Structure) {
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

function getAttackableEnemyStructures(state: SimulationState, team: TeamId) {
  return state.structures.filter((structure) => (
    structure.team !== team &&
    structure.hp > 0 &&
    isStructureUnlocked(state, team, structure)
  ))
}

function getNextEnemyStructureInLane(state: SimulationState, team: TeamId, lane: LaneId) {
  return getAttackableEnemyStructures(state, team)
    .filter((structure) => structure.lane === lane)
    .sort((a, b) => getStructureObjectivePriority(a) - getStructureObjectivePriority(b))[0]
}

function getStructureObjectivePriority(structure: Structure) {
  if (structure.kind === 'barracks_melee') return 1
  if (structure.kind === 'barracks_ranged') return 2
  return 3
}

function getStructureLabel(structure: Structure) {
  if (structure.kind === 'barracks_melee') return `Barraca melee ${structure.lane ? laneNames[structure.lane] : ''}`
  if (structure.kind === 'barracks_ranged') return `Barraca ranged ${structure.lane ? laneNames[structure.lane] : ''}`
  return `T4 ${structure.side === 'left' ? 'esquerda' : 'direita'}`
}

function getStructureMapLabel(structure: Structure) {
  if (structure.kind === 'barracks_melee') return 'BM'
  if (structure.kind === 'barracks_ranged') return 'BR'
  return 'T4'
}

function getBaseThreat(state: SimulationState, team: TeamId) {
  const base = state.bases.find((candidate) => candidate.team === team && candidate.hp > 0)
  if (!base) return undefined

  const enemyArcane = nearest(base.pos, state.arcanes.filter((arcane) => (
    arcane.team !== team &&
    arcane.stats.hp > 0 &&
    arcane.respawn <= state.time
  )), 18)
  const enemyCreep = nearest(base.pos, state.creeps.filter((creep) => creep.team !== team), 12)
  const pressure = state.arcanes.filter((arcane) => arcane.team !== team && arcane.stats.hp > 0 && arcane.respawn <= state.time && distance(arcane.pos, base.pos) <= 20).length * 2 +
    state.creeps.filter((creep) => creep.team !== team && distance(creep.pos, base.pos) <= 12).length
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

function getLocalNumbers(state: SimulationState, team: TeamId, point: Point, radius: number, visibleEnemies?: Arcane[]) {
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

function getLaneWinAssessment(state: SimulationState, team: TeamId, lane: LaneId) {
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

function getTeamPushPower(state: SimulationState, team: TeamId) {
  const livingDamage = state.arcanes
    .filter((arcane) => arcane.team === team && arcane.stats.hp > 0 && arcane.respawn <= state.time)
    .reduce((sum, arcane) => sum + getEffectiveArcaneDamage(state, arcane) * (arcane.stats.hp / Math.max(1, arcane.stats.maxHp)), 0)
  const advancedCreeps = state.creeps.filter((creep) => creep.team === team && laneProgress(creep.pos, lanePaths[team][creep.lane]) > 0.55).length
  return Math.min(100, livingDamage / 12 + advancedCreeps * 7)
}

function getTeamBossDamage(state: SimulationState, team: TeamId) {
  const bossDamage = state.arcanes
    .filter((arcane) => arcane.team === team && arcane.stats.hp > 0 && arcane.respawn <= state.time)
    .reduce((sum, arcane) => {
      const hpRatio = arcane.stats.hp / Math.max(1, arcane.stats.maxHp)
      const rangeBonus = arcane.stats.attackType === 'ranged' ? 1.08 : 1
      return sum + getEffectiveArcaneDamage(state, arcane) * hpRatio * rangeBonus
    }, 0)

  return Math.min(100, bossDamage / 10)
}

function getTeamDefensivePower(state: SimulationState, team: TeamId) {
  const livingHeroes = state.arcanes.filter((arcane) => arcane.team === team && arcane.stats.hp > 0 && arcane.respawn <= state.time)
  const livingTowers = state.towers.filter((tower) => tower.team === team && tower.hp > 0).length
  const tierFour = state.structures.filter((structure) => structure.team === team && structure.kind === 'tower_tier_4' && structure.hp > 0).length
  return Math.min(100, livingHeroes.length * 12 + livingTowers * 3 + tierFour * 8)
}

function getTeamSafeFarmValue(state: SimulationState, team: TeamId) {
  const safeLaneCreeps = state.creeps.filter((creep) => (
    creep.team !== team &&
    laneProgress(creep.pos, lanePaths[team][creep.lane]) < 0.55 &&
    !state.towers.some((tower) => tower.team !== team && tower.hp > 0 && distance(tower.pos, creep.pos) <= tower.range + 1)
  )).length
  const availableCamps = state.camps.filter((camp) => camp.hp > 0).length
  return Math.min(100, safeLaneCreeps * 6 + availableCamps * 4)
}

function getTeamLanePressure(state: SimulationState, team: TeamId) {
  const pressure = state.creeps
    .filter((creep) => creep.team === team)
    .reduce((sum, creep) => sum + laneProgress(creep.pos, lanePaths[team][creep.lane]) * getCreepPressureValue(creep), 0)
  return Math.min(100, pressure * 8)
}

function getTeamStructureRisk(state: SimulationState, team: TeamId) {
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

function getTeamVisionControl(state: SimulationState, team: TeamId) {
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

function average(values: number[]) {
  if (values.length === 0) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function createPlayerAiContext(input: {
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
  const analyzed = analyzeGameState(createAiGameSnapshot(input.state))
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
    teamPlan: input.teamPlan,
    team,
    profile: getPlayerAiProfile(input.arcane),
    self: {
      healthPct: input.hpRatio,
      manaPct: input.arcane.stats.maxMana > 0 ? input.arcane.stats.mana / input.arcane.stats.maxMana : 1,
      currentMode: input.arcane.aiMode,
      danger: input.dangerScore,
      nearBase: input.atBase,
      itemTimingUrgency,
    },
    local: {
      enemyNumbersAdvantage: Math.max(0, -localNumbers.advantage),
      allySaveNeed: input.allyToDefend ? (1 - input.allyToDefend.stats.hp / input.allyToDefend.stats.maxHp) * 100 : 0,
      nearbyFightValue: input.visibleEnemies.filter((enemy) => distance(enemy.pos, input.arcane.pos) <= 14).length * 24,
      finishEnemyValue: nearestEnemy ? (1 - nearestEnemy.stats.hp / nearestEnemy.stats.maxHp) * 100 : 0,
      towerPressure: input.enemyTower ? (1 - input.enemyTower.hp / input.enemyTower.maxHp) * 100 : 0,
      objectivePressure: input.enemyTower ? 62 + (1 - input.enemyTower.hp / input.enemyTower.maxHp) * 35 : input.teamPlan?.type === 'take_boss' ? 72 : 0,
    },
    map: {
      safeLaneFarmValue: Math.round(laneFarmValue * (0.35 + farmAppetite * 0.8)),
      jungleFarmValue: Math.round(jungleFarmValue * (0.25 + farmAppetite * 0.85)),
      lanePushValue: Math.round(Math.min(100, input.safeEnemyCreeps.length * 12 + team.lanePressure * 0.35) * (0.55 + farmAppetite * 0.45)),
      laneFarmGpm: estimatedLaneFarmGpm,
      jungleFarmGpm: estimatedJungleFarmGpm,
      lanePushGpm: estimatedLanePushGpm,
      gankRisk: input.dangerScore,
    },
  }
}

function getPlayerAiProfile(arcane: Arcane) {
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
    mapAwareness: arcane.shotcalling,
    teamfight: arcane.role === 'Offlane' ? 76 : arcane.role === 'Mid' ? 68 : support ? 62 : 56,
    positioning: discipline,
    communication: arcane.shotcalling,
    discipline,
    aggression: arcane.aggression,
    heroMastery: 70,
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

function getPlayerAiRole(role: string) {
  if (role === 'Safe Lane') return 'safe_lane'
  if (role === 'Mid') return 'mid'
  if (role === 'Offlane') return 'offlane'
  if (role === 'Greedy Support') return 'greedy_support'
  return 'dedicated_support'
}

function getItemTimingUrgency(arcane: Arcane, time: number) {
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

function getExpectedItemTimingGpm(arcane: Arcane, time: number) {
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

function nextShopItem(arcane: Arcane) {
  if (arcane.items.length >= 6) return undefined
  const recommendedIds = getRecommendedBuildItemIdsForHero(arcane.heroDefinitionId)
  const recommendedItem = recommendedIds
    .map((id) => shopCatalog.find((item) => item.id === id))
    .find((item) => item && !arcane.items.includes(item.name) && canRoleBuyItem(arcane, item))
  if (recommendedItem) return recommendedItem

  return shopCatalog.find((candidate) => !arcane.items.includes(candidate.name) && canRoleBuyItem(arcane, candidate))
}

function canRoleBuyItem(arcane: Arcane, item: ShopItem) {
  if (arcane.items.includes(item.name)) return false
  if (isBootItem(item) && arcane.items.some((name) => {
    const owned = shopCatalog.find((candidate) => candidate.name === name)
    return owned ? isBootItem(owned) : name.toLowerCase().includes('boot')
  })) return false
  if (arcane.role.includes('Support') && item.cost > 4000 && getInventoryPowerItemCount(arcane) < 4) return false
  if (arcane.stats.attackType === 'melee' && item.id.includes('ranged')) return false
  if (arcane.stats.attackType === 'ranged' && item.id.includes('cleave')) return false
  return true
}

function isBootItem(item: ShopItem) {
  return item.id.includes('boot') || item.name.toLowerCase().includes('boot')
}

function getInventoryPowerItemCount(arcane: Arcane) {
  return arcane.items.filter((name) => shopCatalog.some((item) => item.name === name)).length
}

function getGankTarget(state: SimulationState, arcane: Arcane, visibleEnemies: Arcane[], targetThreatLimit: number, currentDanger: number) {
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

function getRotateTarget(state: SimulationState, arcane: Arcane, visibleEnemies: Arcane[], targetThreatLimit: number, currentDanger: number) {
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

function getInitiateTarget(state: SimulationState, arcane: Arcane, visibleEnemies: Arcane[], targetThreatLimit: number, currentDanger: number) {
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

function getDecisionStatusMultiplier(status: DecisionStatus) {
  if (status === 'sharp') return 0.78
  if (status === 'hesitant') return 1.28
  if (status === 'tilted') return 0.68
  return 1
}

function getArcaneDecisionInterval(arcane: Arcane, mode: PlayerModeType, macroDecision: string) {
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

function getArcaneHoldDecisionInterval(arcane: Arcane) {
  return clampNumber(0.34 * arcane.decisionTempo * getDecisionStatusMultiplier(arcane.decisionStatus), 0.18, 0.75)
}

function shouldReconsiderArcaneDecision(state: SimulationState, arcane: Arcane, atBase: boolean, canBuyAtBase: boolean) {
  if (arcane.lastDecisionAt < 0) return true
  if (atBase && canBuyAtBase) return true

  const hpRatio = arcane.stats.hp / Math.max(1, arcane.stats.maxHp)
  const manaRatio = arcane.stats.mana / Math.max(1, arcane.stats.maxMana)
  if (atBase && arcane.macroDecision === 'Recuperar recursos' && hpRatio >= 0.94 && manaRatio >= 0.82) return true
  if (atBase && distance(arcane.target, teamInfo[arcane.team].base) < baseServiceRange && hpRatio >= 0.94 && manaRatio >= 0.82 && !canBuyAtBase) return true
  if (hpRatio < 0.42 || arcane.lastDecisionHpRatio - hpRatio > 0.16) return true
  if (manaRatio < 0.2 && arcane.lastDecisionManaRatio - manaRatio > 0.18) return true
  if (distance(arcane.pos, arcane.target) <= 1.15) return true
  if (distance(arcane.pos, arcane.lastDecisionPos) <= 0.3 && state.time - arcane.lastDecisionAt > 1.45) return true

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
  const lastHitOpportunity = state.creeps.some((creep) => (
    creep.team !== arcane.team &&
    creep.lane === arcane.lane &&
    creep.hp > 0 &&
    creep.hp <= lastHitDamage * 1.12 &&
    distance(creep.pos, arcane.pos) <= Math.max(getArcaneAttackCenterRange(arcane, creep) + 2, 7)
  ))
  if (lastHitOpportunity) return true

  const denyOpportunity = state.creeps.some((creep) => (
    creep.team === arcane.team &&
    creep.lane === arcane.lane &&
    creep.hp > 0 &&
    creep.hp <= creep.maxHp * 0.5 &&
    distance(creep.pos, arcane.pos) <= Math.max(arcane.stats.range + 2, 7)
  ))
  if (denyOpportunity) return true

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

function updateArcaneMovement(arcane: Arcane, state: SimulationState, delta: number, shouldDecide: boolean): Arcane {
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
  let pathIndex = syncLanePathIndex(arcane.pos, path, arcane.pathIndex)
  const phase = getGamePhase(state.time)
  const atBase = distance(arcane.pos, ownBase) < baseServiceRange
  const canBuyAtBase = atBase && hasBasePurchaseOpportunity(state, arcane)
  const isSupport = arcane.role.includes('Support')
  const decisionDue = arcane.forceDecision || (shouldDecide && state.time >= arcane.nextDecisionAt)
  const shouldRunDecision = decisionDue && (arcane.forceDecision || shouldReconsiderArcaneDecision(state, arcane, atBase, canBuyAtBase))

  if (isArcaneStunned(state, arcane)) {
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
      microDecision: 'Atordoado',
      aiReason: 'stun, controle',
      decision: 'Atordoado',
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
    const lowHp = hpRatio < 0.42
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
      arcane.stats.hp < arcane.stats.maxHp * 0.94 ||
      arcane.stats.mana < arcane.stats.maxMana * 0.82
    )
    const teamCall = state.teamCalls[arcane.team]
    const teamPlan = state.teamPlans[arcane.team] ?? selectTeamPlan({
      analyzed: analyzeGameState(createAiGameSnapshot(state)),
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
    } else if (lowHp || effectiveDanger >= 68 || (modeWantsRetreat && effectiveDanger >= 48)) {
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

  if (isLaneAdvanceMicroDecision(microDecision)) {
    pathIndex = syncLanePathIndex(arcane.pos, path, pathIndex)
    target = getLaneAdvancePoint(arcane, path, pathIndex)
  }

  const baseThreatNow = getBaseThreat(state, arcane.team)
  const recoveredAtBase = atBase &&
    arcane.stats.hp >= arcane.stats.maxHp * 0.94 &&
    arcane.stats.mana >= arcane.stats.maxMana * 0.82
  const stillPointingAtBase = distance(target, ownBase) < baseServiceRange
  if (recoveredAtBase && stillPointingAtBase && !canBuyAtBase && !baseThreatNow?.urgent) {
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

  const shouldShopAtBase = shouldDecide && atBase && !macroDecision.startsWith('Avancar')
  const shoppedArcane = shouldShopAtBase ? buyAtBase(state, arcane) : arcane
  const dispelResult = shouldDecide ? applyDispelItemIfNeeded(state, shoppedArcane) : { arcane: shoppedArcane, used: undefined }
  const activeItemResult = shouldDecide ? applySimpleActiveItemIfNeeded(state, dispelResult.arcane) : { arcane: dispelResult.arcane, used: undefined }
  const consumableResult = shouldDecide && !atBase ? consumeItemIfNeeded(state, activeItemResult.arcane) : { arcane: activeItemResult.arcane, used: undefined }
  const activeArcane = consumableResult.arcane
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
  const usedDispel = dispelResult.used !== undefined
  const usedActiveItem = activeItemResult.used !== undefined
  const usedConsumable = consumableResult.used !== undefined
  const boughtWhileHoldingBase = boughtItem && distance(target, ownBase) < baseServiceRange
  const finalMacroDecision = boughtWhileHoldingBase ? 'Recuperar recursos' : macroDecision
  const rawFinalMicroDecision = boughtItem ? 'Comprou item na base' : usedDispel ? `Dissipou com ${dispelResult.used}` : usedActiveItem ? `Ativou ${activeItemResult.used}` : usedConsumable ? `Usou ${consumableResult.used}` : microDecision
  const invalidAdvanceBaseState = finalMacroDecision.startsWith('Avancar') && rawFinalMicroDecision.toLowerCase().includes('base')
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
    : boughtItem || usedDispel || usedActiveItem || usedConsumable
    ? state.time + 0.22
    : shouldRunDecision
      ? state.time + getArcaneDecisionInterval(activeArcane, aiMode, finalMacroDecision)
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

function buyAtBase(state: SimulationState, arcane: Arcane): Arcane {
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

function hasBasePurchaseOpportunity(state: SimulationState, arcane: Arcane) {
  return affordableShopItem(arcane) !== undefined || getAffordableWantedConsumable(state, arcane) !== undefined
}

function buyItemAtBase(arcane: Arcane): Arcane {
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

function consumeItemIfNeeded(state: SimulationState, arcane: Arcane): { arcane: Arcane; used?: string } {
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

function applyDispelItemIfNeeded(state: SimulationState, arcane: Arcane): { arcane: Arcane; used?: string } {
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

function applySimpleActiveItemIfNeeded(state: SimulationState, arcane: Arcane): { arcane: Arcane; used?: string } {
  const candidate = getSimpleActiveItemCandidate(state, arcane)
  const active = candidate?.item.active
  if (!candidate || !active) return { arcane }

  const item = candidate.item
  let nextArcane = arcane
  const hpRatio = arcane.stats.hp / Math.max(1, arcane.stats.maxHp)
  const tags = active.tags

  if (hasAnyItemTag(tags, ['restore_health', 'heal_over_time', 'healing', 'heal'])) {
    const healing = getActiveItemNumber(active.values, 'health') ?? getActiveItemNumber(active.values, 'heal') ?? 180
    nextArcane = {
      ...nextArcane,
      stats: {
        ...nextArcane.stats,
        hp: Math.min(nextArcane.stats.maxHp, nextArcane.stats.hp + healing),
      },
    }
  }

  if (hasAnyItemTag(tags, ['restore_mana'])) {
    const mana = getActiveItemNumber(active.values, 'mana') ?? 120
    nextArcane = {
      ...nextArcane,
      stats: {
        ...nextArcane.stats,
        mana: Math.min(nextArcane.stats.maxMana, nextArcane.stats.mana + mana),
      },
    }
  }

  if (hasAnyItemTag(tags, ['magic_barrier', 'physical_barrier', 'team_barrier', 'barrier', 'damage_immunity', 'link_barrier', 'debuff_immunity'])) {
    const barrier = getActiveItemNumber(active.values, 'barrier') ?? getActiveItemNumber(active.values, 'block') ?? (hpRatio < 0.45 ? 280 : 180)
    const targets = hasAnyItemTag(tags, ['team_barrier'])
      ? state.arcanes.filter((ally) => ally.team === arcane.team && ally.stats.hp > 0 && ally.respawn <= state.time && distance(ally.pos, arcane.pos) <= 10)
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
  }

  if (hasAnyItemTag(tags, ['blink', 'mobility', 'haste'])) {
    addTimedEffect(state, arcane, {
      sourceId: item.id,
      sourceName: item.name,
      sourceTeam: arcane.team,
      kind: 'buff',
      polarity: 'positive',
      value: 1,
      modifiers: hasAnyItemTag(tags, ['haste'])
        ? { moveSpeedPct: hasAnyItemTag(tags, ['blink']) ? 0.28 : 0.18, attackSpeedPct: 0.18 }
        : { moveSpeedPct: hasAnyItemTag(tags, ['blink']) ? 0.28 : 0.18 },
      duration: active.duration ?? getActiveItemNumber(active.values, 'duration') ?? 2.8,
    })
  }

  const enemyTarget = getSimpleActiveItemEnemyTarget(state, arcane, item)
  if (enemyTarget) {
    const damage = getActiveItemNumber(active.values, 'damage') ?? getActiveItemNumber(active.values, 'damageBase') ?? 0
    if (damage > 0) {
      damageEntity(state, enemyTarget.id, damage, {
        id: item.id,
        label: `${arcane.player}: ${item.name}`,
        team: arcane.team,
        damageType: hasAnyItemTag(tags, ['physical_damage']) ? 'physical' : 'magical',
      })
      addSimpleItemEffect(state, arcane, enemyTarget)
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
    }
  }

  return {
    arcane: {
      ...nextArcane,
      itemCooldowns: {
        ...nextArcane.itemCooldowns,
        [item.name]: state.time + active.cooldown,
      },
    },
    used: item.name,
  }
}

function getSimpleActiveItemCandidate(state: SimulationState, arcane: Arcane) {
  return arcane.items
    .map((name) => ({ name, item: shopCatalog.find((item) => item.name === name) }))
    .filter((candidate): candidate is { name: string; item: ShopItem } => candidate.item?.active !== undefined)
    .filter((candidate) => (arcane.itemCooldowns[candidate.item.name] ?? 0) <= state.time)
    .find((candidate) => shouldUseSimpleActiveItem(state, arcane, candidate.item))
}

function shouldUseSimpleActiveItem(state: SimulationState, arcane: Arcane, item: ShopItem) {
  const active = item.active
  if (!active) return false
  const tags = active.tags
  const hpRatio = arcane.stats.hp / Math.max(1, arcane.stats.maxHp)
  const manaRatio = arcane.stats.mana / Math.max(1, arcane.stats.maxMana)
  const danger = getDangerScore(state, arcane)

  if (active.dispelPower && getDispelItemCandidate(state, arcane)?.item.id === item.id) return false
  if (hasAnyItemTag(tags, ['restore_health', 'heal_over_time', 'healing', 'heal'])) return hpRatio < 0.48
  if (hasAnyItemTag(tags, ['magic_barrier', 'physical_barrier', 'team_barrier', 'barrier', 'damage_immunity', 'link_barrier', 'debuff_immunity'])) return hpRatio < 0.62 || danger > 58
  if (hasAnyItemTag(tags, ['blink', 'mobility', 'haste'])) return danger > 64 || arcane.microDecision.includes('Juntando') || arcane.microDecision.includes('Atacando')
  if (hasAnyItemTag(tags, ['damage', 'magic_damage', 'slow', 'attack_slow', 'silence', 'disarm'])) return getSimpleActiveItemEnemyTarget(state, arcane, item) !== undefined
  if (hasAnyItemTag(tags, ['restore_mana'])) return manaRatio < 0.28
  return false
}

function getSimpleActiveItemEnemyTarget(state: SimulationState, arcane: Arcane, item: ShopItem) {
  const range = Math.max(arcane.stats.range + 3, (getActiveItemNumber(item.active?.values ?? {}, 'range') ?? 650) / 100)
  return nearest(arcane.pos, state.arcanes.filter((target) => (
    target.team !== arcane.team &&
    target.stats.hp > 0 &&
    target.respawn <= state.time &&
    isPointVisibleToTeam(state, arcane.team, target.pos)
  )), range)
}

function addSimpleItemEffect(state: SimulationState, arcane: Arcane, target: CombatTarget) {
  state.effects = addAttackEffect(state.effects, {
    kind: 'arcane',
    targetKind: getCombatTargetKind(target),
    team: arcane.team,
    from: arcane.pos,
    to: target.pos,
    createdAt: state.time,
  })
}

function hasAnyItemTag(tags: string[], candidates: string[]) {
  return candidates.some((tag) => tags.includes(tag))
}

function getActiveItemNumber(values: Record<string, number | string | boolean>, key: string) {
  const value = values[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function getDispelItemCandidate(state: SimulationState, arcane: Arcane) {
  const activeDebuffs = state.timedEffects.filter((effect) => (
    effect.targetId === arcane.id &&
    effect.polarity === 'negative' &&
    effect.expiresAt > state.time
  ))
  if (activeDebuffs.length === 0) return undefined

  return arcane.items
    .map((name) => ({ name, item: shopCatalog.find((item) => item.name === name) }))
    .filter((candidate): candidate is { name: string; item: ShopItem } => candidate.item?.active?.dispelPower !== undefined)
    .filter((candidate) => (arcane.itemCooldowns[candidate.item.name] ?? 0) <= state.time)
    .find((candidate) => shouldUseDispelPower(activeDebuffs, candidate.item.active?.dispelPower ?? 'basic'))
}

function shouldUseDispelPower(effects: TimedEffect[], power: DispelPower) {
  return effects.some((effect) => {
    if (!canDispelEffect(effect.dispelType, power)) return false
    if (effect.kind === 'stun') return power === 'strong'
    return effect.kind === 'silence' || effect.kind === 'slow' || effect.kind === 'dot'
  })
}

function dispelTimedEffects(state: SimulationState, targetId: string, power: DispelPower, polarity: TimedEffect['polarity']) {
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

function affordableShopItem(arcane: Arcane) {
  if (arcane.items.length >= 6) return undefined
  const item = nextShopItem(arcane)
  return item && arcane.stats.gold >= item.cost ? item : undefined
}

function getWantedConsumable(state: SimulationState, arcane: Arcane) {
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

function getAffordableWantedConsumable(state: SimulationState, arcane: Arcane) {
  const consumable = getWantedConsumable(state, arcane)
  return consumable && arcane.stats.gold >= consumable.cost ? consumable : undefined
}

function getConsumableSlotBudget(state: SimulationState, arcane: Arcane) {
  if (state.time > 900) return arcane.role.includes('Support') ? 1 : 0
  if (arcane.role === 'Mid' || arcane.role.includes('Support')) return 2
  return 1
}

function getConsumableByName(name: string) {
  return consumableCatalog.find((item) => item.name === name)
}

function removeFirstByName(items: string[], name: string) {
  let removed = false
  return items.filter((item) => {
    if (!removed && item === name) {
      removed = true
      return false
    }
    return true
  })
}

function getArcaneMoveDestination(arcane: Arcane, state: SimulationState, target: Point, microDecision: string) {
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

function getCombatMoveTargetNearPoint(state: SimulationState, arcane: Arcane, target: Point, microDecision: string) {
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

function getFocusedObjectiveTarget(state: SimulationState, arcane: Arcane): Tower | Structure | Base | undefined {
  if (!isObjectiveMicroDecision(arcane.microDecision)) return undefined
  const candidates = getObjectiveCandidates(state, arcane.team)
  const intended = nearest(arcane.target, candidates, 7)
  const target = intended && distance(arcane.pos, intended.pos) <= getArcaneAttackCenterRange(arcane, intended)
    ? intended
    : nearestReachableByArcane(arcane, candidates)

  if (!target || distance(arcane.pos, target.pos) > getArcaneAttackCenterRange(arcane, target)) return undefined
  return target
}

function getObjectiveEntityNearPoint(state: SimulationState, team: TeamId, point: Point, range: number) {
  return nearest(point, getObjectiveCandidates(state, team), range)
}

function getObjectiveCandidates(state: SimulationState, team: TeamId): Array<Tower | Structure | Base> {
  return [
    ...getAttackableEnemyTowers(state, team),
    ...getAttackableEnemyStructures(state, team),
    ...(isEnemyBaseUnlocked(state, team) ? state.bases.filter((base) => base.team !== team && base.hp > 0) : []),
  ]
}

function isObjectiveMicroDecision(microDecision: string) {
  return microDecision.startsWith('Batendo torre') ||
    microDecision.startsWith('Executando objetivo') ||
    microDecision.startsWith('Atacar chefe') ||
    microDecision.startsWith('Fazendo objetivo')
}

function isLaneCreepMicroDecision(microDecision: string) {
  return microDecision.startsWith('Last hit') ||
    microDecision.startsWith('Preparando last hit') ||
    microDecision.startsWith('Preparando deny') ||
    microDecision.startsWith('Farmando wave') ||
    microDecision.startsWith('Acelerando wave') ||
    microDecision.startsWith('Acumulando patrimonio na rota')
}

function isLaneAdvanceMicroDecision(microDecision: string) {
  return microDecision.startsWith('Avancando rota') ||
    microDecision.startsWith('Saindo da base')
}

function isTeamCallDecision(arcane: Arcane) {
  return arcane.macroDecision.startsWith('Juntar com o time') ||
    arcane.macroDecision.startsWith('Chamar objetivo') ||
    arcane.microDecision.startsWith('Movendo para agrupamento') ||
    arcane.microDecision.startsWith('Chamando time')
}

function isLaningControlMicroDecision(microDecision: string) {
  return microDecision.startsWith('Last hit') ||
    microDecision.startsWith('Preparando last hit') ||
    microDecision.startsWith('Preparando deny')
}

function getStructureAttackHoldRange(arcane: Arcane, target: Tower | Structure | Base) {
  return Math.max(1.4, getArcaneAttackCenterRange(arcane, target) * 0.92)
}

function getAttackApproachPoint(from: Point, target: { pos: Point }, attackRange: number, attackerRadius = 0) {
  const desiredDistance = Math.max(1.5, attackRange + attackerRadius + getEntityCollisionRadius(target) * 0.75)
  const currentDistance = distance(from, target.pos)
  if (currentDistance <= desiredDistance) return from
  if (currentDistance === 0) return target.pos

  return clampToMapBounds({
    x: target.pos.x + ((from.x - target.pos.x) / currentDistance) * desiredDistance,
    y: target.pos.y + ((from.y - target.pos.y) / currentDistance) * desiredDistance,
  })
}

function getArcaneMovementEffectMultiplier(state: SimulationState, arcane: Arcane) {
  const slows = state.timedEffects
    .filter((effect) => effect.targetId === arcane.id && effect.kind === 'slow' && effect.expiresAt > state.time)
    .map((effect) => finalSlowValue(effect.value, [arcane.stats.slowResistance / 100]))
  if (slows.length === 0) return 1

  const combinedSlow = 1 - slows.reduce((product, slow) => product * (1 - Math.max(0, Math.min(0.9, slow))), 1)
  return Math.max(0.35, 1 - combinedSlow)
}

function getArcaneStatModifierEffects(state: SimulationState, arcane: Arcane) {
  return state.timedEffects.filter((effect) => (
    effect.targetId === arcane.id &&
    effect.expiresAt > state.time &&
    effect.modifiers
  ))
}

function getEffectiveArcaneDamage(state: SimulationState, arcane: Arcane) {
  const modifiers = getArcaneStatModifierEffects(state, arcane)
  return applyFlatAndPercentModifiers(
    arcane.stats.damage,
    [],
    modifiers.map((effect) => effect.modifiers?.damagePct ?? 0),
  )
}

function getEffectiveArcaneArmor(state: SimulationState, arcane: Arcane) {
  const modifiers = getArcaneStatModifierEffects(state, arcane)
  return applyFlatAndPercentModifiers(
    arcane.stats.armor,
    modifiers.map((effect) => effect.modifiers?.armorFlat ?? 0),
  )
}

function getEffectiveArcaneMoveSpeed(state: SimulationState, arcane: Arcane) {
  const modifiers = getArcaneStatModifierEffects(state, arcane)
  return applyFlatAndPercentModifiers(
    arcane.stats.moveSpeed,
    [],
    modifiers.map((effect) => effect.modifiers?.moveSpeedPct ?? 0),
  )
}

function getEffectiveArcaneAttackCooldown(state: SimulationState, arcane: Arcane) {
  const modifiers = getArcaneStatModifierEffects(state, arcane)
  const attackSpeedPct = modifiers.reduce((sum, effect) => sum + (effect.modifiers?.attackSpeedPct ?? 0), 0)
  return arcane.stats.attackSpeed / Math.max(0.2, 1 + attackSpeedPct)
}

function getArcaneSlowPercent(state: SimulationState, arcane: Arcane) {
  return Math.round((1 - getArcaneMovementEffectMultiplier(state, arcane)) * 100)
}

function getArcaneBarrierAmount(state: SimulationState, arcane: Arcane) {
  return Math.round(state.timedEffects
    .filter((effect) => effect.targetId === arcane.id && effect.kind === 'barrier' && effect.expiresAt > state.time)
    .reduce((sum, effect) => sum + Math.max(0, effect.barrierRemaining ?? effect.value), 0))
}

function resolveIncomingArcaneDamage(state: SimulationState, target: Arcane, damage: number, damageType: CombatDamageType) {
  const resolvedDamage = resolveDamage({
    baseDamage: damage,
    damageType,
    targetArmor: getEffectiveArcaneArmor(state, target),
    targetMagicResistance: target.stats.magicResistance,
  })

  return absorbDamageWithBarriers(state, target.id, resolvedDamage)
}

function hasTimedEffect(state: SimulationState, targetId: string, kind: TimedEffect['kind']) {
  return state.timedEffects.some((effect) => effect.targetId === targetId && effect.kind === kind && effect.expiresAt > state.time)
}

function isArcaneStunned(state: SimulationState, arcane: Arcane) {
  return hasTimedEffect(state, arcane.id, 'stun')
}

function processTimedEffects(state: SimulationState): SimulationState {
  const tickedEffectIds = new Set<string>()
  state.timedEffects.forEach((effect) => {
    if ((effect.kind !== 'dot' && effect.kind !== 'hot') || (effect.nextTickAt ?? Number.POSITIVE_INFINITY) > state.time) {
      return
    }

    state.arcanes = state.arcanes.map((arcane) => {
      if (arcane.id !== effect.targetId || arcane.stats.hp <= 0 || arcane.respawn > state.time) return arcane
      const rawTickValue = effect.value * effect.stacks
      const tickValue = effect.kind === 'dot'
        ? resolveIncomingArcaneDamage(state, arcane, rawTickValue, effect.damageType ?? 'magical')
        : rawTickValue
      const nextHp = effect.kind === 'dot'
        ? Math.max(0, arcane.stats.hp - tickValue)
        : Math.min(arcane.stats.maxHp, arcane.stats.hp + tickValue)
      return {
        ...arcane,
        lastHitBy: effect.kind === 'dot'
          ? { id: effect.sourceId, label: effect.sourceName, team: effect.sourceTeam }
          : arcane.lastHitBy,
        stats: { ...arcane.stats, hp: nextHp },
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

function addTimedEffect(state: SimulationState, target: Arcane, effect: Omit<TimedEffect, 'id' | 'targetId' | 'createdAt' | 'expiresAt' | 'stacks' | 'nextTickAt' | 'dispelType'> & { duration: number; dispelType?: DispelType }) {
  const duration = effect.polarity === 'negative'
    ? finalDebuffDuration(effect.duration, [target.stats.statusResistance / 100])
    : effect.duration
  const id = `${effect.kind}-${target.id}-${effect.sourceId}`
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
    nextTickAt: effect.kind === 'dot' || effect.kind === 'hot' ? state.time + (effect.tickInterval ?? 1) : undefined,
    dispelType: effect.dispelType ?? getDefaultDispelType(effect.kind, effect.polarity),
    createdAt: state.time,
    expiresAt: state.time + duration,
  }

  state.timedEffects = [
    timedEffect,
    ...state.timedEffects.filter((current) => current.id !== id),
  ].slice(0, 40)
}

function getDefaultDispelType(kind: TimedEffect['kind'], polarity: TimedEffect['polarity']): DispelType {
  if (polarity === 'positive') return kind === 'barrier' || kind === 'buff' || kind === 'hot' ? 'basic' : 'none'
  if (kind === 'stun') return 'strong'
  if (kind === 'slow' || kind === 'silence' || kind === 'dot') return 'basic'
  return 'basic'
}

function absorbDamageWithBarriers(state: SimulationState, targetId: string, incomingDamage: number) {
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

function updateCreepMovement(creep: Creep, state: SimulationState, delta: number): Creep {
  if (getRouteCreepTarget(creep, state, 'attack')) {
    return creep
  }

  const visibleTarget = getRouteCreepTarget(creep, state, 'vision')
  if (visibleTarget) {
    const moveTarget = getCreepMoveDestination(creep, visibleTarget)
    return { ...creep, pos: moveToward(creep.pos, moveTarget, 4.2 * delta) }
  }

  const path = lanePaths[creep.team][creep.lane]
  let pathIndex = creep.pathIndex
  if (distance(creep.pos, formationPoint(path[pathIndex], creep.id)) < 1.8 && pathIndex < path.length - 1) {
    pathIndex += 1
  }
  return { ...creep, pathIndex, pos: moveToward(creep.pos, formationPoint(path[pathIndex], creep.id), 4.2 * delta) }
}

function getRouteCreepTarget(creep: Creep, state: SimulationState, mode: 'attack' | 'vision' = 'attack') {
  const structureRange = isMeleeCreep(creep) ? 3.2 : creep.range
  const visionRange = getCreepVisionRange(creep)
  const unitRange = mode === 'attack' ? creep.range : visionRange
  const objectiveRange = mode === 'attack' ? structureRange : visionRange
  const selectTarget = <T extends { pos: Point }>(entities: T[], range: number) => (
    mode === 'attack'
      ? nearestReachableByCreep(creep, entities, range)
      : nearest(creep.pos, entities, range)
  )
  const aggroTarget = creep.aggroUntil && creep.aggroUntil > state.time
    ? selectTarget(state.arcanes.filter((arcane) => (
        arcane.id === creep.aggroTargetId &&
        arcane.stats.hp > 0 &&
        arcane.respawn <= state.time &&
        isNearRoute(arcane.pos, lanePaths[creep.team][creep.lane], 12)
      )), unitRange)
    : undefined
  if (aggroTarget) return aggroTarget

  const enemyCreep = selectTarget(
    state.creeps.filter((other) => other.team !== creep.team && other.lane === creep.lane),
    unitRange,
  )
  if (enemyCreep) return enemyCreep

  return selectTarget(
    state.arcanes.filter((arcane) => (
      arcane.team !== creep.team &&
      arcane.stats.hp > 0 &&
      arcane.respawn <= state.time &&
      isNearRoute(arcane.pos, lanePaths[creep.team][creep.lane], 12)
    )),
    unitRange,
  ) ?? selectTarget([
    ...getAttackableEnemyTowers(state, creep.team).filter((tower) => tower.lane === creep.lane),
    ...getAttackableEnemyStructures(state, creep.team).filter((structure) => structure.lane === creep.lane || structure.kind === 'tower_tier_4'),
    ...(isEnemyBaseUnlocked(state, creep.team) ? state.bases.filter((base) => base.team !== creep.team && base.hp > 0) : []),
  ], objectiveRange)
}

function getCreepMoveDestination(creep: Creep, target: { pos: Point }) {
  const attackRange = isStructureLikeTarget(target)
    ? isMeleeCreep(creep) ? 3.2 : creep.range
    : creep.range
  const holdRange = getCreepAttackCenterRange(creep, target, attackRange) * 0.94
  if (distance(creep.pos, target.pos) <= holdRange) return creep.pos
  return getAttackApproachPoint(creep.pos, target, attackRange, getEntityCollisionRadius(creep))
}

function nearestReachableByCreep<T extends { pos: Point }>(creep: Creep, entities: T[], attackRange: number): T | undefined {
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

function getCreepAttackCenterRange(creep: Creep, target: { pos: Point }, attackRange = creep.range) {
  return attackRange + getEntityCollisionRadius(creep) + getEntityCollisionRadius(target) * 0.8
}

function isStructureLikeTarget(target: { pos: Point }) {
  return 'tier' in target || 'kind' in target || ('maxHp' in target && !('type' in target) && !('player' in target))
}

type UnitHitboxBody = {
  id: string
  pos: Point
  radius: number
  movable: boolean
  mass: number
}

const unitHitboxGridSize = 4
const maxHitboxResolutionPasses = 2

function resolveUnitHitboxes(state: SimulationState) {
  const bodies: UnitHitboxBody[] = [
    ...state.arcanes
      .filter((arcane) => arcane.stats.hp > 0 && arcane.respawn <= state.time)
      .map((arcane) => ({
        id: arcane.id,
        pos: arcane.pos,
        radius: getUnitHitboxRadius(arcane),
        movable: true,
        mass: 1.25,
      })),
    ...state.creeps
      .filter((creep) => creep.hp > 0)
      .map((creep) => ({
        id: creep.id,
        pos: creep.pos,
        radius: getUnitHitboxRadius(creep),
        movable: true,
        mass: creep.type === 'siege' ? 1.1 : 0.72,
      })),
    ...(state.boss.hp > 0 && state.boss.respawn <= state.time ? [{
      id: state.boss.id,
      pos: state.boss.pos,
      radius: getUnitHitboxRadius(state.boss),
      movable: true,
      mass: 2.5,
    }] : []),
    ...state.camps
      .filter((camp) => camp.hp > 0)
      .map((camp) => ({
        id: camp.id,
        pos: camp.pos,
        radius: getUnitHitboxRadius(camp),
        movable: false,
        mass: 99,
      })),
  ]

  if (bodies.length < 2) return

  for (let pass = 0; pass < maxHitboxResolutionPasses; pass += 1) {
    const grid = buildUnitHitboxGrid(bodies)
    const resolvedPairs = new Set<string>()

    for (const body of bodies) {
      const gridX = Math.floor(body.pos.x / unitHitboxGridSize)
      const gridY = Math.floor(body.pos.y / unitHitboxGridSize)
      for (let y = gridY - 1; y <= gridY + 1; y += 1) {
        for (let x = gridX - 1; x <= gridX + 1; x += 1) {
          const cell = grid.get(getUnitHitboxGridKey(x, y))
          if (!cell) continue
          for (const other of cell) {
            if (body.id === other.id) continue
            const pairKey = body.id < other.id ? `${body.id}:${other.id}` : `${other.id}:${body.id}`
            if (resolvedPairs.has(pairKey)) continue
            resolvedPairs.add(pairKey)
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

function buildUnitHitboxGrid(bodies: UnitHitboxBody[]) {
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

function getUnitHitboxGridKey(x: number, y: number) {
  return x * 128 + y
}

function separateUnitHitboxes(a: UnitHitboxBody, b: UnitHitboxBody) {
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

function getUnitHitboxRadius(entity: Arcane | Creep | Camp | Boss) {
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

function isArcaneSilenced(state: SimulationState, arcane: Arcane) {
  return hasTimedEffect(state, arcane.id, 'silence')
}

function tryCastSimpleSkill(state: SimulationState, arcane: Arcane, fallbackTarget: CombatTarget | undefined) {
  if (isArcaneSilenced(state, arcane)) return false

  const skills = getHeroDefinition(arcane.heroDefinitionId).skills ?? []
  const usableSkills = skills
    .filter((skill) => skill.kind !== 'passive')
    .map((skill) => ({ skill, level: getSimpleSkillLevel(arcane, skill) }))
    .filter(({ skill, level }) => level > 0 && arcane.stats.mana >= getSimpleSkillManaCost(arcane, skill, level) && (arcane.itemCooldowns[skill.id] ?? 0) <= state.time)
    .sort((a, b) => getSimpleSkillPriority(b.skill) - getSimpleSkillPriority(a.skill))

  for (const { skill, level } of usableSkills) {
    if (castSimpleSkill(state, arcane, skill, level, fallbackTarget)) {
      arcane.itemCooldowns = {
        ...arcane.itemCooldowns,
        [skill.id]: state.time + getSimpleSkillCooldown(skill, level),
      }
      return true
    }
  }

  return false
}

function getSimpleSkillLevel(arcane: Arcane, skill: HeroSkillDefinition) {
  if (skill.key === 'R') {
    if (arcane.stats.level >= 18) return 3
    if (arcane.stats.level >= 12) return 2
    if (arcane.stats.level >= 6) return 1
    return 0
  }

  return Math.min(4, 1 + Math.floor(Math.max(0, arcane.stats.level - 1) / 4))
}

function getSimpleSkillPriority(skill: HeroSkillDefinition) {
  const tags = new Set(skill.tags)
  const controlScore = ['stun', 'disable', 'silence', 'slow', 'taunt'].some((tag) => tags.has(tag)) ? 16 : 0
  const sustainScore = ['heal', 'healer', 'regen', 'shield', 'barrier', 'spell_parry'].some((tag) => tags.has(tag)) ? 12 : 0
  const damageScore = skill.damageType !== 'none' || getSimpleSkillNumericValue(skill, 'damage', 1, 0) > 0 ? 10 : 0
  const ultimateScore = skill.key === 'R' ? 20 : 0
  return ultimateScore + controlScore + sustainScore + damageScore
}

function getSimpleSkillCooldown(skill: HeroSkillDefinition, level: number) {
  const fallback = skill.key === 'R' ? 70 : 13
  return Math.max(2.5, getSimpleSkillNumericValue(skill, 'cooldown', level, fallback))
}

function getSimpleSkillManaCost(arcane: Arcane, skill: HeroSkillDefinition, level: number) {
  const explicitCost = getSimpleSkillNumericValue(skill, 'manaCost', level, Number.NaN)
  if (Number.isFinite(explicitCost)) return explicitCost

  const roleDiscount = arcane.role.includes('Support') ? 0.92 : arcane.role === 'Mid' ? 0.96 : 1
  const baseCost = skill.key === 'R'
    ? 140 + level * 45
    : 48 + level * 18 + (skill.damageType === 'none' ? 8 : 0)
  const maxManaGuard = Math.max(28, arcane.stats.maxMana * (skill.key === 'R' ? 0.32 : 0.18))
  return Math.round(Math.min(baseCost * roleDiscount, maxManaGuard))
}

function getSimpleSkillRange(arcane: Arcane, skill: HeroSkillDefinition, level: number) {
  if (skill.target === 'self' || skill.target === 'passive') return 0
  return Math.max(
    getArcaneAttackCenterRange(arcane, arcane) + 1.2,
    getSimpleSkillNumericValue(skill, 'range', level, 620) / 100,
  )
}

function getSimpleSkillNumericValue(skill: HeroSkillDefinition, key: string, level: number, fallback: number) {
  const value = skill.values[key]
  if (Array.isArray(value)) {
    const picked = value[Math.max(0, Math.min(value.length - 1, level - 1))]
    return typeof picked === 'number' && Number.isFinite(picked) ? picked : fallback
  }
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function castSimpleSkill(
  state: SimulationState,
  arcane: Arcane,
  skill: HeroSkillDefinition,
  level: number,
  fallbackTarget: CombatTarget | undefined,
) {
  const target = getSimpleSkillTarget(state, arcane, skill, level, fallbackTarget)
  if (!target) return false
  const manaCost = getSimpleSkillManaCost(arcane, skill, level)
  if (arcane.stats.mana < manaCost) return false

  const source: CombatSource = {
    id: `${arcane.id}-${skill.id}`,
    label: `${arcane.player}: ${skill.name}`,
    team: arcane.team,
    damageType: getSimpleSkillDamageType(skill),
  }

  if ('player' in target && isPositiveSimpleSkill(skill)) {
    applySimplePositiveSkill(state, arcane, skill, level, target)
    addSimpleSkillEffect(state, arcane, target)
    finishSimpleSkillCast(state, arcane, skill, manaCost, target)
    return true
  }

  const damage = getSimpleSkillDamage(arcane, skill, level)
  if (damage > 0 && skill.damageType !== 'none') {
    if ('player' in target && target.team !== arcane.team) {
      applyTowerAggro(state, target.team, arcane.id)
      applyCreepAggro(state, target.team, arcane.id)
    }
    damageEntity(state, target.id, damage, source)
  }

  if ('player' in target && target.team !== arcane.team) {
    applySimpleNegativeSkillEffects(state, arcane, skill, level, target)
  }

  if (isBoss(target)) {
    state.boss = {
      ...state.boss,
      aggroTargetId: arcane.id,
      aggroUntil: state.time + 6,
    }
  }

  addSimpleSkillEffect(state, arcane, target)
  const casted = damage > 0 || ('player' in target && hasSimpleStatusTag(skill))
  if (casted) finishSimpleSkillCast(state, arcane, skill, manaCost, target)
  return casted
}

function finishSimpleSkillCast(state: SimulationState, arcane: Arcane, skill: HeroSkillDefinition, manaCost: number, target: CombatTarget) {
  arcane.stats = {
    ...arcane.stats,
    mana: Math.max(0, arcane.stats.mana - manaCost),
  }
  arcane.microDecision = `Castou ${skill.key}`
  arcane.decision = `Castou ${skill.key}`
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
}

function getSimpleSkillTarget(
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
    canTargetWithSimpleDamageSkill(arcane, fallbackTarget) &&
    distance(arcane.pos, fallbackTarget.pos) <= range + getEntityCollisionRadius(fallbackTarget)
  ) {
    return fallbackTarget
  }

  return undefined
}

function getSimplePositiveSkillTarget(
  state: SimulationState,
  arcane: Arcane,
  skill: HeroSkillDefinition,
  level: number,
): Arcane | undefined {
  const range = skill.target === 'self' ? 0 : getSimpleSkillRange(arcane, skill, level)
  const allies = state.arcanes.filter((ally) => (
    ally.team === arcane.team &&
    ally.stats.hp > 0 &&
    ally.respawn <= state.time &&
    (ally.id === arcane.id || distance(arcane.pos, ally.pos) <= range + getEntityCollisionRadius(ally))
  ))

  if (hasAnySimpleSkillTag(skill, ['heal', 'healer', 'regen', 'shield', 'barrier', 'spell_parry'])) {
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

function canTargetWithSimpleDamageSkill(arcane: Arcane, target: CombatTarget) {
  if ('team' in target) return target.team !== arcane.team && ('hp' in target ? target.hp > 0 : true)
  if ('strength' in target) return target.hp > 0
  return isBoss(target) && target.hp > 0
}

function getSimpleSkillDamage(arcane: Arcane, skill: HeroSkillDefinition, level: number) {
  const baseDamage = getSimpleSkillNumericValue(skill, 'damage', level, skill.damageType === 'none' ? 0 : 90 + level * 34)
  const scaling = skill.scaling
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

function getSimpleSkillDamageType(skill: HeroSkillDefinition): CombatDamageType {
  if (skill.damageType === 'physical' || skill.damageType === 'pure') return skill.damageType
  return 'magical'
}

function applySimplePositiveSkill(
  state: SimulationState,
  caster: Arcane,
  skill: HeroSkillDefinition,
  level: number,
  target: Arcane,
) {
  if (hasAnySimpleSkillTag(skill, ['heal', 'healer', 'regen'])) {
    const healing = getSimpleSkillNumericValue(skill, 'heal', level, Math.max(75, getSimpleSkillDamage(caster, skill, level) * 0.65))
    target.stats.hp = Math.min(target.stats.maxHp, target.stats.hp + Math.round(healing))
    addTimedEffect(state, target, {
      sourceId: `${caster.id}-${skill.id}`,
      sourceName: skill.name,
      sourceTeam: caster.team,
      kind: 'hot',
      polarity: 'positive',
      value: Math.max(8, Math.round(healing * 0.08)),
      tickInterval: 1,
      duration: 3,
    })
  }

  if (hasAnySimpleSkillTag(skill, ['shield', 'barrier', 'spell_parry'])) {
    addTimedEffect(state, target, {
      sourceId: `${caster.id}-${skill.id}`,
      sourceName: skill.name,
      sourceTeam: caster.team,
      kind: 'barrier',
      polarity: 'positive',
      value: getSimpleSkillNumericValue(skill, 'barrier', level, 90 + level * 45),
      duration: 4.5,
    })
  }

  if (hasAnySimpleSkillTag(skill, ['mobility', 'escape', 'haste'])) {
    addTimedEffect(state, target, {
      sourceId: `${caster.id}-${skill.id}`,
      sourceName: skill.name,
      sourceTeam: caster.team,
      kind: 'buff',
      polarity: 'positive',
      value: 1,
      modifiers: { moveSpeedPct: 0.18 },
      duration: 3.2,
    })
  }

  if (hasAnySimpleSkillTag(skill, ['armor', 'durable'])) {
    addTimedEffect(state, target, {
      sourceId: `${caster.id}-${skill.id}`,
      sourceName: skill.name,
      sourceTeam: caster.team,
      kind: 'buff',
      polarity: 'positive',
      value: 1,
      modifiers: { armorFlat: 2 + level },
      duration: 4,
    })
  }
}

function applySimpleNegativeSkillEffects(
  state: SimulationState,
  caster: Arcane,
  skill: HeroSkillDefinition,
  level: number,
  target: Arcane,
) {
  const sourceId = `${caster.id}-${skill.id}`
  if (hasAnySimpleSkillTag(skill, ['stun', 'disable', 'taunt'])) {
    addTimedEffect(state, target, {
      sourceId,
      sourceName: skill.name,
      sourceTeam: caster.team,
      kind: 'stun',
      polarity: 'negative',
      value: 1,
      duration: Math.min(2.2, getSimpleSkillNumericValue(skill, 'duration', level, 0.65 + level * 0.18)),
    })
  }

  if (hasAnySimpleSkillTag(skill, ['slow'])) {
    addTimedEffect(state, target, {
      sourceId,
      sourceName: skill.name,
      sourceTeam: caster.team,
      kind: 'slow',
      polarity: 'negative',
      value: Math.min(0.55, getSimpleSkillNumericValue(skill, 'slow', level, 0.18 + level * 0.04)),
      duration: getSimpleSkillNumericValue(skill, 'duration', level, 2.4),
    })
  }

  if (hasAnySimpleSkillTag(skill, ['silence', 'anti_magic'])) {
    addTimedEffect(state, target, {
      sourceId,
      sourceName: skill.name,
      sourceTeam: caster.team,
      kind: 'silence',
      polarity: 'negative',
      value: 1,
      duration: Math.min(3.2, getSimpleSkillNumericValue(skill, 'duration', level, 1.3 + level * 0.25)),
    })
  }
}

function addSimpleSkillEffect(state: SimulationState, arcane: Arcane, target: CombatTarget) {
  state.effects = addAttackEffect(state.effects, {
    kind: 'arcane',
    targetKind: getCombatTargetKind(target),
    team: arcane.team,
    from: arcane.pos,
    to: target.pos,
    createdAt: state.time,
  })
}

function isPositiveSimpleSkill(skill: HeroSkillDefinition) {
  const positiveTags = ['heal', 'healer', 'regen', 'shield', 'barrier', 'spell_parry', 'armor', 'durable', 'mobility', 'escape', 'haste']
  return hasAnySimpleSkillTag(skill, positiveTags)
}

function hasSimpleStatusTag(skill: HeroSkillDefinition) {
  return hasAnySimpleSkillTag(skill, ['stun', 'disable', 'taunt', 'slow', 'silence', 'anti_magic'])
}

function hasAnySimpleSkillTag(skill: HeroSkillDefinition, tags: string[]) {
  return tags.some((tag) => skill.tags.includes(tag))
}

function resolveCombat(state: SimulationState): SimulationState {
  const next = state

  next.creeps.forEach((creep) => {
    const target = getRouteCreepTarget(creep, next, 'attack')
    if (target && next.time - creep.lastAttack >= 1.25) {
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
      ?? nearest(tower.pos, next.creeps.filter((creep) => creep.team !== tower.team), tower.range)
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
      ?? nearest(structure.pos, next.creeps.filter((creep) => creep.team !== structure.team), structure.range)
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
    if (isArcaneStunned(next, arcane)) return
    const canAttackBoss = next.boss.hp > 0 && arcane.microDecision.startsWith('Atacar chefe')
    const bossTarget = canAttackBoss && distance(arcane.pos, next.boss.pos) <= getArcaneAttackCenterRange(arcane, next.boss) ? next.boss : undefined
    const objectiveTarget = getFocusedObjectiveTarget(next, arcane)
    const lastHitTarget = getLastHitTarget(next, arcane)
    const denyTarget = getDenyTarget(next, arcane)
    const enemyArcaneTarget = nearestReachableByArcane(arcane, next.arcanes.filter((other) => (
      other.team !== arcane.team &&
      other.stats.hp > 0 &&
      other.respawn <= next.time
    )))
    const laneControl = isLaningControlMicroDecision(arcane.microDecision)
    const fallbackEnemyCreeps = next.creeps.filter((creep) => (
      creep.team !== arcane.team &&
      (!laneControl || creep.lane !== arcane.lane)
    ))
    const target = bossTarget ?? objectiveTarget ?? lastHitTarget ?? denyTarget ?? enemyArcaneTarget ?? nearestReachableByArcane(arcane, [
      ...fallbackEnemyCreeps,
      ...getAttackableEnemyTowers(next, arcane.team),
      ...getAttackableEnemyStructures(next, arcane.team),
      ...(isEnemyBaseUnlocked(next, arcane.team) ? next.bases.filter((base) => base.team !== arcane.team && base.hp > 0) : []),
      ...next.camps.filter((camp) => camp.hp > 0),
      ...(canAttackBoss ? [next.boss] : []),
    ])
    if (tryCastSimpleSkill(next, arcane, target)) return
      if (target && next.time - arcane.lastAttack >= getEffectiveArcaneAttackCooldown(next, arcane)) {
      arcane.lastAttack = next.time
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
      damageEntity(next, target.id, Math.round(getEffectiveArcaneDamage(next, arcane) * getAuraMultiplier(next, arcane.team)), {
        id: arcane.id,
        label: arcane.player,
        team: arcane.team,
        damageType: 'physical',
      })
    }
  })

  return next
}

function applyTowerAggro(state: SimulationState, defendingTeam: TeamId, attackerId: string) {
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

function applyCreepAggro(state: SimulationState, defendingTeam: TeamId, attackerId: string) {
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

function getCreepGoldReward(creep: Creep) {
  return creep.goldReward
}

function getCreepXpReward(creep: Creep) {
  return creep.xpReward
}

function getCreepVisionRange(creep: Creep) {
  return creep.visionRange
}

function getCreepDisplayName(creep: Creep) {
  if (creep.type === 'mage') return 'Creep ranged'
  if (creep.type === 'siege') return 'Creep siege'
  if (creep.type === 'flagbearer') return 'Creep bandeira'
  return 'Creep melee'
}

function isMeleeCreep(creep: Creep) {
  return creep.type === 'melee' || creep.type === 'flagbearer'
}

function getCreepDamageType(creep: Creep): CombatDamageType {
  return creep.type === 'mage' ? 'magical' : 'physical'
}

function getCreepLaneValue(creep: Creep) {
  if (creep.type === 'siege') return 5
  if (creep.type === 'mage') return 3.6
  if (creep.type === 'flagbearer') return 3
  return 2.4
}

function getCreepPressureValue(creep: Creep) {
  if (creep.type === 'siege') return 1.8
  if (creep.type === 'mage') return 1.4
  if (creep.type === 'flagbearer') return 1.2
  return 1
}

function getCreepAttackCycle(creep: Creep) {
  if (creep.type === 'siege') return 2.7
  return isMeleeCreep(creep) ? 1.35 : 1.7
}

function getCreepXpRecipients(state: SimulationState, creep: Creep) {
  return state.arcanes.filter((arcane) => (
    arcane.team !== creep.team &&
    arcane.stats.hp > 0 &&
    arcane.respawn <= state.time &&
    distance(arcane.pos, creep.pos) <= getCreepVisionRange(creep)
  ))
}

function getDenyTarget(state: SimulationState, arcane: Arcane) {
  return nearestReachableByArcane(
    arcane,
    state.creeps.filter((creep) => (
      creep.team === arcane.team &&
      creep.hp > 0 &&
      creep.hp <= creep.maxHp * 0.5 &&
      creep.lane === arcane.lane
    )),
  )
}

function getLastHitTarget(state: SimulationState, arcane: Arcane) {
  return getLastHitCandidateFromCreeps(
    state,
    arcane,
    state.creeps.filter((creep) => creep.team !== arcane.team && creep.lane === arcane.lane),
    1.06,
    true,
  )
}

function getLastHitCandidateFromCreeps(
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

function getWavePushTarget(arcane: Arcane, creeps: Creep[]) {
  return creeps
    .filter((creep) => creep.hp > 0)
    .sort((a, b) => {
      const hpDelta = a.hp - b.hp
      if (Math.abs(hpDelta) > 12) return hpDelta
      return distance(arcane.pos, a.pos) - distance(arcane.pos, b.pos)
    })[0]
}

function getArcaneLastHitDamage(state: SimulationState, arcane: Arcane) {
  return Math.max(1, Math.round(getEffectiveArcaneDamage(state, arcane) * getAuraMultiplier(state, arcane.team)))
}

function isDeniedCreep(creep: Creep) {
  return creep.lastHitBy?.team === creep.team
}

function addGoldMarker(state: SimulationState, team: TeamId, pos: Point, amount: number) {
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

function grantArcaneEconomy(arcane: Arcane, gold: number, xp: number): Arcane {
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

function getArcaneNetWorth(arcane: Arcane) {
  return Math.round(Math.max(arcane.earnedGold, arcane.stats.gold))
}

function getTeamNetWorth(state: SimulationState, team: TeamId) {
  return state.arcanes
    .filter((arcane) => arcane.team === team)
    .reduce((total, arcane) => total + getArcaneNetWorth(arcane), 0)
}

function getTeamXp(state: SimulationState, team: TeamId) {
  return state.arcanes
    .filter((arcane) => arcane.team === team)
    .reduce((total, arcane) => total + arcane.stats.xp, 0)
}

function getAssistRecipients(state: SimulationState, victim: Arcane, killerId?: string) {
  const assistRadius = 16
  return state.arcanes.filter((arcane) => (
    arcane.team !== victim.team &&
    arcane.id !== killerId &&
    arcane.stats.hp > 0 &&
    arcane.respawn <= state.time &&
    distance(arcane.pos, victim.pos) <= assistRadius
  ))
}

function resolveDeaths(state: SimulationState): SimulationState {
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

      if (creepRewards.gold === 0 && creepRewards.xp === 0) return arcane
      return grantArcaneEconomy(arcane, creepRewards.gold, creepRewards.xp)
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
      return grantArcaneEconomy(arcane, reward.gold, reward.xp)
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
      return grantArcaneEconomy(arcane, 120, 400)
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
    const addArcaneReward = (arcaneId: string, gold: number, xp: number) => {
      const current = arcaneRewards.get(arcaneId) ?? { gold: 0, xp: 0 }
      arcaneRewards.set(arcaneId, { gold: current.gold + gold, xp: current.xp + xp })
    }
    const deathGoldLosses = new Map<string, number>()

    deadArcanes.forEach((arcane) => {
      const killerTeam: TeamId = arcane.team === 'dawn' ? 'dusk' : 'dawn'
      const killerSource = arcane.lastHitBy
      const killer = killerSource ?? { label: teamInfo[killerTeam].name, team: killerTeam }
      const killerArcane = killerSource
        ? next.arcanes.find((candidate) => candidate.id === killerSource.id && candidate.team === killerTeam)
        : undefined
      const isArcaneKill = killerArcane !== undefined
      if (isArcaneKill) next.kills[killerTeam] += 1
      const assists = getAssistRecipients(next, arcane, killerArcane?.id)
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
      deathGoldLosses.set(arcane.id, lostGold)
      next.teamMemory[arcane.team] = addAiMemoryEvent(next.teamMemory[arcane.team], {
        id: `memory-death-${arcane.id}-${next.time}`,
        type: 'hero_death',
        teamId: arcane.team,
        gameTime: next.time,
        position: arcane.pos,
        value: Math.min(88, 42 + arcane.stats.level * 2 + (killerArcane ? 10 : 0)),
        expiresAtGameTime: next.time + 240,
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
    const deadArcaneIds = new Set(deadArcanes.map((arcane) => arcane.id))
    next.timedEffects = next.timedEffects.filter((effect) => !deadArcaneIds.has(effect.targetId))
    next.arcanes = next.arcanes.map((arcane) => {
      const reward = arcaneRewards.get(arcane.id)
      const lostGold = deathGoldLosses.get(arcane.id) ?? 0
      if (arcane.stats.hp > 0) {
        if (!reward) return arcane
        return grantArcaneEconomy(arcane, reward.gold, reward.xp)
      }
      return {
        ...arcane,
        respawn: next.time + getArcaneRespawnDuration(arcane.stats.level),
        lastHitBy: undefined,
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
    return {
      ...arcane,
      stats: buildArcaneStats(arcane.heroDefinitionId, nextLevel, arcane.stats.gold, arcane.stats.xp, hpRatio, manaRatio, arcane.items),
    }
  })

  return next
}

function damageEntity(state: SimulationState, id: string, damage: number, source: CombatSource) {
  const targetArcane = state.arcanes.find((arcane) => arcane.id === id)
  const targetTower = state.towers.find((tower) => tower.id === id)
  const targetStructure = state.structures.find((structure) => structure.id === id)
  const targetBase = state.bases.find((base) => base.id === id)
  const damageType = source.damageType ?? 'physical'
  let finalDamage = damage

  if (targetArcane) {
    finalDamage = resolveIncomingArcaneDamage(state, targetArcane, damage, damageType)
  } else if (targetTower) {
    finalDamage = getStructureIncomingDamage(state, targetTower, damage, source, damageType)
  } else if (targetStructure) {
    finalDamage = getStructureIncomingDamage(state, targetStructure, damage, source, damageType)
  } else if (targetBase) {
    finalDamage = getStructureIncomingDamage(state, targetBase, damage, source, damageType)
  }

  const hit = (value: number) => Math.max(0, value - finalDamage)
  state.creeps = state.creeps.map((creep) => creep.id === id ? { ...creep, hp: hit(creep.hp), lastHitBy: source } : creep)
  state.towers = state.towers.map((tower) => tower.id === id ? { ...tower, hp: hit(tower.hp) } : tower)
  state.structures = state.structures.map((structure) => structure.id === id ? { ...structure, hp: hit(structure.hp) } : structure)
  state.bases = state.bases.map((base) => base.id === id ? { ...base, hp: hit(base.hp) } : base)
  state.camps = state.camps.map((camp) => camp.id === id ? { ...camp, hp: hit(camp.hp), lastHitBy: source } : camp)
  state.boss = state.boss.id === id
    ? {
      ...state.boss,
      hp: hit(state.boss.hp),
      lastHitBy: source,
      aggroTargetId: source.id,
      aggroUntil: state.time + 8,
    }
    : state.boss
  state.arcanes = state.arcanes.map((arcane) => arcane.id === id ? { ...arcane, lastHitBy: source, stats: { ...arcane.stats, hp: hit(arcane.stats.hp) } } : arcane)
}

function addEvent(events: MatchEvent[], event: MatchEvent) {
  return [event, ...events].slice(0, 8)
}

function addAttackEffect(
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

function getCombatTargetKind(target: Arcane | Creep | Tower | Structure | Base | Camp | Boss): EntityKind {
  if ('player' in target) return 'arcane'
  if ('tier' in target) return 'tower'
  if ('kind' in target && ('side' in target || target.kind.startsWith('barracks'))) return 'structure'
  if ('level' in target) return 'camp'
  if ('type' in target) return 'creep'
  if (isBoss(target)) return 'boss'
  return 'base'
}

function getStructureArmor(target: Tower | Structure | Base) {
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

function getStructureMagicResistance(target: Tower | Structure | Base) {
  return 'tier' in target && target.tier === 1 ? 0.2 : 0.25
}

function getStructureId(target: Tower | Structure | Base) {
  return target.id
}

function getStructureTeam(target: Tower | Structure | Base) {
  return target.team
}

function isStructureFortified(state: SimulationState, target: Tower | Structure | Base) {
  const fortification = state.teamFortifications[getStructureTeam(target)]
  return fortification.activeUntil > state.time && (!fortification.targetId || fortification.targetId === getStructureId(target))
}

function getFortificationTargetLabel(state: SimulationState, targetId: string) {
  const tower = state.towers.find((candidate) => candidate.id === targetId)
  if (tower) return `T${tower.tier} ${laneNames[tower.lane]}`
  const structure = state.structures.find((candidate) => candidate.id === targetId)
  if (structure) return getStructureLabel(structure)
  const base = state.bases.find((candidate) => candidate.id === targetId)
  if (base) return `Base ${teamInfo[base.team].short}`
  return 'estrutura'
}

function getStructurePressureScore(state: SimulationState, target: Tower | Structure | Base) {
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

function shouldFortifyStructure(state: SimulationState, target: Tower | Structure | Base) {
  if (target.hp <= 0) return false
  const hpRatio = target.hp / Math.max(1, target.maxHp)
  const threshold = 'tier' in target
    ? target.tier === 1 ? 0.34 : target.tier === 2 ? 0.5 : 0.72
    : 'kind' in target
      ? target.kind === 'tower_tier_4' ? 0.78 : 0.66
      : 0.82

  return hpRatio <= threshold && getStructurePressureScore(state, target) >= 22
}

function updateTeamFortifications(state: SimulationState): SimulationState {
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

function getCreepsNearStructure(state: SimulationState, team: TeamId, target: Tower | Structure | Base) {
  return state.creeps.filter((creep) => (
    creep.team === team &&
    distance(creep.pos, target.pos) <= ('tier' in target ? 8 : 10)
  )).length
}

function hasBackdoorProtection(target: Tower | Structure | Base) {
  return 'tier' in target ? target.tier >= 2 : true
}

function isStructureBackdoorProtectedForTeam(state: SimulationState, team: TeamId, target: Tower | Structure | Base) {
  return isBackdoorProtected({
    hasBackdoorProtection: hasBackdoorProtection(target),
    alliedCreepsNearby: getCreepsNearStructure(state, team, target),
  })
}

function getStructureSiegeEstimate(state: SimulationState, team: TeamId, target: Tower | Structure | Base) {
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

function getStructureIncomingDamage(
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
    backdoorMultiplier: protectedByBackdoor ? 0.25 : 1,
  })

  return fortified ? mitigatedDamage * fortificationDamageMultiplier : mitigatedDamage
}

function getMaxSimulationStepsPerFrame(speed: number) {
  return Math.max(baseMaxSimulationStepsPerFrame, Math.ceil(speed * 1.25))
}

const uiSnapshotIntervalSeconds = 0.5
const maxCanvasDevicePixelRatio = 1

function App() {
  const [state, setState] = useState<SimulationState | undefined>(undefined)
  const [loadingError, setLoadingError] = useState<string | undefined>(undefined)
  const [running, setRunning] = useState(true)
  const [speed, setSpeed] = useState(1)
  const [selected, setSelected] = useState<Selected>({ kind: 'arcane', id: 'd-quasar' })
  const [dataPanelOpen, setDataPanelOpen] = useState(false)
  const lastFrame = useRef<number | null>(null)
  const frameAccumulator = useRef(0)
  const decisionAccumulator = useRef(0)
  const uiSnapshotAccumulator = useRef(0)
  const stateRef = useRef<SimulationState | undefined>(undefined)
  const hasState = state !== undefined
  const phase = state ? getGamePhase(state.time) : 'early'
  const dayCycle = state ? getDayCycle(state.time) : 'day'

  useEffect(() => {
    let cancelled = false
    loadGameData()
      .then(() => {
        if (cancelled) return
        const initialState = createInitialState()
        stateRef.current = initialState
        setState(cloneSimulationStateForTick(initialState))
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setLoadingError(error instanceof Error ? error.message : 'Falha ao carregar dados do jogo')
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setSelected(undefined)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    if (!running || !hasState) {
      if (!running && stateRef.current) {
        setState(cloneSimulationStateForTick(stateRef.current))
      }
      lastFrame.current = null
      frameAccumulator.current = 0
      decisionAccumulator.current = 0
      uiSnapshotAccumulator.current = 0
      return undefined
    }

    let frameId = 0
    function animate(now: number) {
      if (lastFrame.current === null) {
        lastFrame.current = now
      }

      const frameElapsed = Math.min(maxFrameElapsedSeconds, (now - lastFrame.current) / 1000)
      lastFrame.current = now
      frameAccumulator.current += frameElapsed * speed
      const maxStepsThisFrame = getMaxSimulationStepsPerFrame(speed)
      frameAccumulator.current = Math.min(frameAccumulator.current, simulationFrameSeconds * maxStepsThisFrame)

      if (frameAccumulator.current >= simulationFrameSeconds) {
        const steps = Math.min(maxStepsThisFrame, Math.floor(frameAccumulator.current / simulationFrameSeconds))
        frameAccumulator.current -= steps * simulationFrameSeconds

        const currentState = stateRef.current
        if (currentState) {
          let next = currentState
          for (let step = 0; step < steps; step += 1) {
            decisionAccumulator.current += simulationFrameSeconds
            const shouldDecide = decisionAccumulator.current >= decisionGateSeconds
            if (shouldDecide) {
              decisionAccumulator.current %= decisionGateSeconds
            }
            next = tick(next, simulationFrameSeconds, shouldDecide)
            uiSnapshotAccumulator.current += simulationFrameSeconds
          }
          stateRef.current = next
          if (uiSnapshotAccumulator.current >= uiSnapshotIntervalSeconds || next.winner) {
            uiSnapshotAccumulator.current %= uiSnapshotIntervalSeconds
            setState(cloneSimulationStateForTick(next))
          }
        }
      }

      frameId = window.requestAnimationFrame(animate)
    }

    frameId = window.requestAnimationFrame(animate)
    return () => window.cancelAnimationFrame(frameId)
  }, [running, speed, hasState])

  const selectedEntity = useMemo(() => state ? findSelected(state, selected) : undefined, [selected, state])
  const teamNetWorth = useMemo(() => ({
    dawn: state ? getTeamNetWorth(state, 'dawn') : 0,
    dusk: state ? getTeamNetWorth(state, 'dusk') : 0,
  }), [state])

  if (!state) {
    return (
      <main className="sim-shell loading-shell">
        <div className="loading-panel">
          <strong>{loadingError ? 'Erro ao carregar LOTA' : 'Carregando LOTA'}</strong>
          <span>{loadingError ?? 'Preparando herois, itens e simulacao...'}</span>
        </div>
      </main>
    )
  }

  return (
    <main className="sim-shell">
      <header className="scorebar">
        <TeamBadge team="dawn" side="left" />
        <ScoreStat team="dawn" icon="gold" value={formatCompactGold(teamNetWorth.dawn)} label="Net worth Aurora Forge" />
        <ScoreStat team="dawn" icon="kills" value={state.kills.dawn} label="Eliminações Aurora Forge" />
        <div className="match-clock" aria-label={`${formatTime(state.time)} - ${getGamePhaseLabel(phase)} - ${getDayCycleLabel(dayCycle)}`}>
          <strong>{formatTime(state.time)}</strong>
          <div className="match-meta">
            <small>{getGamePhaseLabel(phase)}</small>
            <small className={`cycle-label ${dayCycle}`}>{getDayCycleLabel(dayCycle)}</small>
          </div>
          {state.winner && <em>{teamInfo[state.winner].name} venceu</em>}
        </div>
        <ScoreStat team="dusk" icon="kills" value={state.kills.dusk} label="Eliminações Crimson Veil" reverse />
        <ScoreStat team="dusk" icon="gold" value={formatCompactGold(teamNetWorth.dusk)} label="Net worth Crimson Veil" reverse />
        <TeamBadge team="dusk" side="right" />
      </header>

      <section className="sim-layout">
        <TeamPanel
          arcanes={state.arcanes.filter((arcane) => arcane.team === 'dawn')}
          selected={selected}
          team="dawn"
          teamPlan={state.teamPlans.dawn}
          time={state.time}
          onSelect={setSelected}
        />
        <MapPanel
          dayCycle={dayCycle}
          state={state}
          stateRef={stateRef}
          selected={selected}
          onSelect={setSelected}
        />
        <TeamPanel
          arcanes={state.arcanes.filter((arcane) => arcane.team === 'dusk')}
          selected={selected}
          team="dusk"
          teamPlan={state.teamPlans.dusk}
          time={state.time}
          onSelect={setSelected}
        />
      </section>

      <div className="bottom-hud">
        <div className="sim-controls">
          <div className="control-buttons" aria-label="Controles da partida">
            <button type="button" onClick={() => setRunning((value) => !value)} title={running ? 'Pausar' : 'Continuar'}>
              {running ? <Pause size={17} /> : <Play size={17} />}
            </button>
            <button
              type="button"
              onClick={() => {
                const initialState = createInitialState()
                stateRef.current = initialState
                setState(cloneSimulationStateForTick(initialState))
              }}
              title="Reiniciar partida"
            >
              <RotateCcw size={17} />
            </button>
          </div>
          <label className="speed-control">
            <span>Vel.</span>
            <select value={speed} onChange={(event) => setSpeed(Number(event.target.value))}>
              <option value={1}>1x</option>
              <option value={2}>2x</option>
              <option value={4}>4x</option>
              <option value={8}>8x</option>
            </select>
          </label>
          <button
            className={dataPanelOpen ? 'data-toggle active' : 'data-toggle'}
            type="button"
            onClick={() => setDataPanelOpen((value) => !value)}
            title={dataPanelOpen ? 'Fechar dados' : 'Abrir dados'}
          >
            Dados
          </button>
          <button
            className="clear-selection"
            type="button"
            onClick={() => setSelected(undefined)}
            title="Remover selecao"
            disabled={!selected}
          >
            Limpar
          </button>
        </div>
      </div>

      <footer className={dataPanelOpen ? 'inspector open' : 'inspector'} aria-hidden={!dataPanelOpen}>
        <div className="inspector-layout">
          <Inspector entity={selectedEntity} state={state} />
          <EventFeed events={state.events} />
        </div>
      </footer>
    </main>
  )
}

function TeamBadge({ team, side }: { team: TeamId; side: 'left' | 'right' }) {
  return (
    <div className={`team-badge ${side}`} style={{ '--team': teamInfo[team].primary } as React.CSSProperties}>
      <span>{teamInfo[team].short}</span>
      <strong>{teamInfo[team].name}</strong>
    </div>
  )
}

function ScoreStat({
  team,
  icon,
  value,
  label,
  reverse = false,
}: {
  team: TeamId
  icon: 'gold' | 'kills'
  value: number | string
  label: string
  reverse?: boolean
}) {
  const Icon = icon === 'gold' ? Coins : Swords

  return (
    <div className={reverse ? 'score-stat reverse' : 'score-stat'} style={{ '--team': teamInfo[team].primary } as React.CSSProperties} title={label} aria-label={label}>
      <Icon size={15} />
      <strong>{value}</strong>
    </div>
  )
}

function TeamPanel({
  team,
  teamPlan,
  time,
  arcanes,
  selected,
  onSelect,
}: {
  team: TeamId
  teamPlan?: TeamPlan
  time: number
  arcanes: Arcane[]
  selected: Selected
  onSelect: (selected: Selected) => void
}) {
  return (
    <aside className={`team-panel ${team}`}>
      <div className="panel-heading">
        <strong>{teamInfo[team].name}</strong>
        <span>5 Arcanes</span>
      </div>
      <div
        className="team-plan-chip"
        title={teamPlan ? `EV ${teamPlan.expectedValue} / chance ${Math.round((teamPlan.decisionChance ?? 0) * 100)}% / risco ${teamPlan.risk} / ${teamPlan.reasonTags.join(', ')}` : 'Plano ainda nao calculado'}
      >
        <em>Plano</em>
        <strong>{teamPlan ? getTeamPlanLabel(teamPlan.type) : 'Lendo mapa'}</strong>
      </div>
      <div className="arcane-list">
        {arcanes.map((arcane) => {
          const respawnRemaining = Math.max(0, Math.ceil(arcane.respawn - time))
          const nextLevelXp = XP_TO_REACH_LEVEL[Math.min(30, arcane.stats.level + 1)] ?? XP_TO_REACH_LEVEL[30]
          const currentLevelXp = Math.round(getLevelProgress(arcane.stats.xp) * 100)
          return (
            <button
              className={selected?.kind === 'arcane' && selected.id === arcane.id ? 'arcane-row selected' : 'arcane-row'}
              key={arcane.id}
              type="button"
              onClick={() => onSelect({ kind: 'arcane', id: arcane.id })}
            >
              <div className="portrait-stack">
                <span className="portrait-shell">
                  <Portrait arcane={arcane} />
                  {respawnRemaining > 0 && <span className="respawn-overlay">{respawnRemaining}</span>}
                </span>
                <span className="portrait-level">Lv {arcane.stats.level}</span>
                <div className="portrait-xp" title={`${Math.round(arcane.stats.xp)} / ${nextLevelXp} XP`}>
                  <Meter value={currentLevelXp} max={100} tone="xp" />
                  <span>XP {Math.round(arcane.stats.xp)}/{nextLevelXp}</span>
                </div>
                <span className="portrait-gold" title={`${Math.round(arcane.stats.gold)} ouro`}>
                  <Coins size={12} />
                  {Math.round(arcane.stats.gold)}
                </span>
              </div>
              <div className="arcane-readout">
                <div className="name-line">
                  <strong>{arcane.player}</strong>
                  <span>{arcane.name}</span>
                </div>
                <div className="role-line">
                  <em>{arcane.role}</em>
                  <span title={`Macro: ${arcane.macroDecision}`}>{getShortDecision(arcane.macroDecision)}</span>
                </div>
                <Meter value={arcane.stats.hp} max={arcane.stats.maxHp} tone="hp" />
                <Meter value={arcane.stats.mana} max={arcane.stats.maxMana} tone="mana" />
                <div className="slot-row" aria-label="Inventario">
                  {Array.from({ length: 6 }, (_, index) => {
                    const item = arcane.items[index]
                    const cooldown = item ? getCooldownRemaining(arcane.itemCooldowns, item, time) : 0
                    return (
                      <i key={index} title={getInventorySlotTitle(item, arcane.itemCooldowns, time)} className={getInventorySlotClassName(item, cooldown)}>
                        {getInventoryGlyph(item)}
                        {cooldown > 0 && <span className="cooldown-badge">{Math.ceil(cooldown)}</span>}
                      </i>
                    )
                  })}
                </div>
                <SkillKeyRow skills={getHeroDefinition(arcane.heroDefinitionId).skills ?? []} compact arcane={arcane} now={time} />
              </div>
            </button>
          )
        })}
      </div>
    </aside>
  )
}

function MapPanel({
  dayCycle,
  state,
  stateRef,
  selected,
  onSelect,
}: {
  dayCycle: DayCycle
  state: SimulationState
  stateRef: React.RefObject<SimulationState | undefined>
  selected: Selected
  onSelect: (selected: Selected) => void
}) {
  return (
    <section className={`map-panel ${dayCycle}`} aria-label="Mapa da partida">
      <FrameCounter />
      <svg className="map-lines" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <linearGradient id="river" x1="0" x2="1" y1="1" y2="0">
            <stop offset="0%" stopColor="#1a6b83" />
            <stop offset="100%" stopColor="#61d7ff" />
          </linearGradient>
        </defs>
        <path className="river" d="M 6 8 C 27 26, 39 38, 50 50 S 73 74, 94 92" />
        <path className="highground highground-dawn" d="M 3.5 79 L 9 73 L 18 80 L 28 88 L 32 92 L 25 96 L 3.5 96 Z" />
        <path className="highground-rim highground-rim-dawn" d="M 6 78 C 12 78, 18 81, 24 86 S 29 90, 32 92" />
        <path className="highground highground-dusk" d="M 75 4 L 96.5 4 L 96.5 21 L 91 27 L 82 20 L 72 12 L 68 8 Z" />
        <path className="highground-rim highground-rim-dusk" d="M 68 8 C 72 10, 78 13, 84 18 S 90 22, 94 22" />
        {(['top', 'mid', 'bot'] as LaneId[]).map((lane) => (
          <polyline key={lane} className={`lane-line ${lane}`} points={lanePaths.dawn[lane].map((point) => `${point.x},${point.y}`).join(' ')} />
        ))}
      </svg>

      <span className="lane-label top">Topo</span>
      <span className="lane-label mid">Meio</span>
      <span className="lane-label bot">Baixo</span>

      <AttackRangeCanvasLayer stateRef={stateRef} selected={selected} />

      <FxCanvasLayer
        stateRef={stateRef}
      />

      {state.bases.map((base) => (
        <MapNode
          key={base.id}
          type="base"
          point={base.pos}
          team={base.team}
          hp={base.hp}
          maxHp={base.maxHp}
          backdoorProtected={isStructureBackdoorProtectedForTeam(state, base.team === 'dawn' ? 'dusk' : 'dawn', base)}
          fortified={isStructureFortified(state, base)}
          selected={selected?.kind === 'base' && selected.id === base.id}
          title={`Base ${teamInfo[base.team].name}`}
          onClick={() => onSelect({ kind: 'base', id: base.id })}
        />
      ))}
      {state.towers.filter((tower) => tower.hp > 0).map((tower) => (
        <MapNode
          key={tower.id}
          type="tower"
          point={tower.pos}
          team={tower.team}
          hp={tower.hp}
          maxHp={tower.maxHp}
          backdoorProtected={isStructureBackdoorProtectedForTeam(state, tower.team === 'dawn' ? 'dusk' : 'dawn', tower)}
          fortified={isStructureFortified(state, tower)}
          selected={selected?.kind === 'tower' && selected.id === tower.id}
          label={`T${tower.tier}`}
          title={`Torre T${tower.tier} ${laneNames[tower.lane]} - ${teamInfo[tower.team].name}`}
          onClick={() => onSelect({ kind: 'tower', id: tower.id })}
        />
      ))}
      {state.structures.filter((structure) => structure.hp > 0).map((structure) => (
        <MapNode
          key={structure.id}
          type="structure"
          point={structure.pos}
          team={structure.team}
          hp={structure.hp}
          maxHp={structure.maxHp}
          backdoorProtected={isStructureBackdoorProtectedForTeam(state, structure.team === 'dawn' ? 'dusk' : 'dawn', structure)}
          fortified={isStructureFortified(state, structure)}
          selected={selected?.kind === 'structure' && selected.id === structure.id}
          variant={structure.kind}
          label={getStructureMapLabel(structure)}
          title={`${getStructureLabel(structure)} - ${teamInfo[structure.team].name}`}
          onClick={() => onSelect({ kind: 'structure', id: structure.id })}
        />
      ))}
      {state.camps.map((camp) => (
        <button
          key={camp.id}
          className={selected?.kind === 'camp' && selected.id === camp.id ? `camp-node ${camp.strength} selected` : `camp-node ${camp.strength}`}
          style={{
            ...place(camp.pos),
            '--hp-empty': `${getHealthRingEmptyAngle(camp.hp, camp.maxHp)}deg`,
          } as React.CSSProperties}
          type="button"
          title={`${camp.name} - campo ${campStrengthLabel(camp.strength)}${camp.stackCount > 0 ? ` / stack x${camp.stackCount + 1}` : ''}`}
          aria-label={`${camp.name} - campo ${campStrengthLabel(camp.strength)}${camp.stackCount > 0 ? ` / stack x${camp.stackCount + 1}` : ''}`}
          onClick={() => onSelect({ kind: 'camp', id: camp.id })}
        >
          <Zap size={12} />
          {camp.stackCount > 0 && camp.hp > 0 && <span className="camp-stack-badge">x{camp.stackCount + 1}</span>}
          {camp.hp <= 0 && camp.respawn > state.time && (
            <span className="respawn-timer">{Math.ceil(camp.respawn - state.time)}</span>
          )}
        </button>
      ))}
      {state.runes.map((rune) => (
        <button
          key={rune.id}
          className={selected?.kind === 'rune' && selected.id === rune.id ? `rune-node ${rune.kind} selected` : `rune-node ${rune.kind}`}
          style={place(rune.pos) as React.CSSProperties}
          type="button"
          title={getRuneTitle(rune)}
          aria-label={getRuneTitle(rune)}
          onClick={() => onSelect({ kind: 'rune', id: rune.id })}
        >
          <span>{getRuneGlyph(rune)}</span>
        </button>
      ))}
      {state.boss.hp > 0 && (
        <BossCanvasLayer
          stateRef={stateRef}
          selected={selected}
          onSelect={onSelect}
        />
      )}
      <CreepCanvasLayer
        stateRef={stateRef}
        selected={selected}
        onSelect={onSelect}
      />
      <ArcaneCanvasLayer
        stateRef={stateRef}
        selected={selected}
        onSelect={onSelect}
      />
    </section>
  )
}

function FrameCounter() {
  const [fps, setFps] = useState(0)

  useEffect(() => {
    let frame = 0
    let frames = 0
    let lastSample = performance.now()

    const tick = (now: number) => {
      frames += 1
      const elapsed = now - lastSample
      if (elapsed >= 500) {
        setFps(Math.round((frames * 1000) / elapsed))
        frames = 0
        lastSample = now
      }
      frame = window.requestAnimationFrame(tick)
    }

    frame = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frame)
  }, [])

  return (
    <div className="frame-counter" aria-label={`FPS ${fps}`}>
      <strong>{fps}</strong>
      <span>FPS</span>
    </div>
  )
}

function CreepCanvasLayer({
  stateRef,
  selected,
  onSelect,
}: {
  stateRef: React.RefObject<SimulationState | undefined>
  selected: Selected
  onSelect: (selected: Selected) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const visualPositions = useRef(new Map<string, VisualPosition>())
  const latest = useRef({ selected })

  latest.current = { selected }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined

    let frame = 0
    const draw = () => {
      const current = latest.current
      const currentState = stateRef.current
      if (!currentState) {
        frame = window.requestAnimationFrame(draw)
        return
      }
      drawCreepCanvas(
        canvas,
        currentState.creeps,
        current.selected?.kind === 'creep' ? current.selected.id : undefined,
        visualPositions.current,
      )
      frame = window.requestAnimationFrame(draw)
    }

    frame = window.requestAnimationFrame(draw)
    return () => window.cancelAnimationFrame(frame)
  }, [stateRef])

  function handleClick(event: MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const point = {
      x: ((event.clientX - rect.left) / Math.max(1, rect.width)) * 100,
      y: ((event.clientY - rect.top) / Math.max(1, rect.height)) * 100,
    }
    const creep = nearest(point, stateRef.current?.creeps ?? [], 2.4)
    if (creep) onSelect({ kind: 'creep', id: creep.id })
  }

  return (
    <canvas
      ref={canvasRef}
      className="creep-canvas"
      aria-label="Creeps da rota"
      onClick={handleClick}
    />
  )
}

type VisualPosition = {
  samples: Array<{ pos: Point; at: number }>
}

const visualInterpolationDelayMs = 120
const visualExtrapolationLimitMs = 90
let nextVisualPruneAt = 0

function pruneVisualPositionsOccasionally(visualPositions: Map<string, VisualPosition>, liveIds: string[]) {
  const now = performance.now()
  if (now < nextVisualPruneAt) return
  nextVisualPruneAt = now + 1000
  const live = new Set(liveIds)
  for (const id of visualPositions.keys()) {
    if (!live.has(id)) visualPositions.delete(id)
  }
}

function getBufferedVisualPosition(
  id: string,
  target: Point,
  visualPositions: Map<string, VisualPosition>,
  snapDistance: number,
) {
  const now = performance.now()
  const track = visualPositions.get(id)
  const lastSample = track?.samples.at(-1)
  if (!track || !lastSample || distance(lastSample.pos, target) > snapDistance) {
    visualPositions.set(id, { samples: [{ pos: { ...target }, at: now }] })
    return target
  }

  if (distance(lastSample.pos, target) > 0.015) {
    track.samples.push({ pos: { ...target }, at: now })
    if (track.samples.length > 14) track.samples.splice(0, track.samples.length - 14)
  }

  const renderAt = now - visualInterpolationDelayMs
  const samples = track.samples
  if (samples.length === 1 || renderAt <= samples[0].at) return samples[0].pos

  for (let index = 1; index < samples.length; index += 1) {
    const previous = samples[index - 1]
    const next = samples[index]
    if (renderAt <= next.at) {
      const duration = Math.max(1, next.at - previous.at)
      const ratio = clampNumber((renderAt - previous.at) / duration, 0, 1)
      return {
        x: previous.pos.x + (next.pos.x - previous.pos.x) * ratio,
        y: previous.pos.y + (next.pos.y - previous.pos.y) * ratio,
      }
    }
  }

  if (samples.length >= 2) {
    const previous = samples[samples.length - 2]
    const latest = samples[samples.length - 1]
    const sampleDelta = Math.max(1, latest.at - previous.at)
    const extrapolateMs = Math.min(visualExtrapolationLimitMs, Math.max(0, renderAt - latest.at))
    const ratio = extrapolateMs / sampleDelta
    return {
      x: latest.pos.x + (latest.pos.x - previous.pos.x) * ratio,
      y: latest.pos.y + (latest.pos.y - previous.pos.y) * ratio,
    }
  }

  return samples[samples.length - 1].pos
}

function drawCreepCanvas(
  canvas: HTMLCanvasElement,
  creeps: Creep[],
  selectedId: string | undefined,
  visualPositions: Map<string, VisualPosition>,
) {
  const { viewport, dpr, width, height } = prepareCanvasForDraw(canvas)
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width
    canvas.height = height
  }

  const context = canvas.getContext('2d')
  if (!context) return

  context.clearRect(0, 0, width, height)
  context.save()
  context.scale(dpr, dpr)

  pruneVisualPositionsOccasionally(visualPositions, creeps.map((creep) => creep.id))

  for (const creep of creeps) {
    const visual = getBufferedVisualPosition(
      creep.id,
      creep.pos,
      visualPositions,
      9,
    )
    const point = clampToMapBounds(visual)
    const x = (point.x / 100) * viewport.width
    const y = (point.y / 100) * viewport.height
    const radius = creep.type === 'siege' ? 5.6 : creep.type === 'mage' || creep.type === 'flagbearer' ? 4.8 : 4.2
    const teamColor = teamInfo[creep.team].primary
    const hpRatio = Math.max(0, Math.min(1, creep.hp / Math.max(1, creep.maxHp)))
    const fillHeight = radius * 2 * hpRatio

    context.beginPath()
    context.arc(x, y, radius + 1.5, 0, Math.PI * 2)
    context.fillStyle = 'rgba(0, 0, 0, 0.62)'
    context.fill()

    context.save()
    context.beginPath()
    context.arc(x, y, radius, 0, Math.PI * 2)
    context.clip()
    context.fillStyle = 'rgba(255, 255, 255, 0.16)'
    context.fillRect(x - radius, y - radius, radius * 2, radius * 2)
    context.fillStyle = teamColor
    context.fillRect(x - radius, y + radius - fillHeight, radius * 2, fillHeight)
    context.restore()

    context.lineWidth = creep.id === selectedId ? 2.2 : 1
    context.strokeStyle = creep.id === selectedId ? '#f6c85d' : 'rgba(0, 0, 0, 0.74)'
    context.beginPath()
    context.arc(x, y, radius + (creep.id === selectedId ? 2 : 0.5), 0, Math.PI * 2)
    context.stroke()
  }

  context.restore()
}

function ArcaneCanvasLayer({
  stateRef,
  selected,
  onSelect,
}: {
  stateRef: React.RefObject<SimulationState | undefined>
  selected: Selected
  onSelect: (selected: Selected) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const visualPositions = useRef(new Map<string, VisualPosition>())
  const latest = useRef({ selected })

  latest.current = { selected }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined

    let frame = 0
    const draw = () => {
      const current = latest.current
      const currentState = stateRef.current
      if (!currentState) {
        frame = window.requestAnimationFrame(draw)
        return
      }
      drawArcaneCanvas(
        canvas,
        currentState.arcanes,
        current.selected?.kind === 'arcane' ? current.selected.id : undefined,
        currentState.timedEffects,
        currentState.time,
        visualPositions.current,
      )
      frame = window.requestAnimationFrame(draw)
    }

    frame = window.requestAnimationFrame(draw)
    return () => window.cancelAnimationFrame(frame)
  }, [stateRef])

  function handleClick(event: MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const point = {
      x: ((event.clientX - rect.left) / Math.max(1, rect.width)) * 100,
      y: ((event.clientY - rect.top) / Math.max(1, rect.height)) * 100,
    }
    const currentState = stateRef.current
    const aliveArcanes = currentState
      ? currentState.arcanes.filter((arcane) => arcane.respawn <= currentState.time && arcane.stats.hp > 0)
      : []
    const arcane = nearest(point, aliveArcanes, 3.2)
    if (arcane) onSelect({ kind: 'arcane', id: arcane.id })
  }

  return (
    <canvas
      ref={canvasRef}
      className="arcane-canvas"
      aria-label="Arcanes no mapa"
      onClick={handleClick}
    />
  )
}

function drawArcaneCanvas(
  canvas: HTMLCanvasElement,
  arcanes: Arcane[],
  selectedId: string | undefined,
  timedEffects: TimedEffect[],
  now: number,
  visualPositions: Map<string, VisualPosition>,
) {
  const { viewport, dpr, width, height } = prepareCanvasForDraw(canvas)
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width
    canvas.height = height
  }

  const context = canvas.getContext('2d')
  if (!context) return

  const aliveArcanes = arcanes.filter((arcane) => arcane.respawn <= now && arcane.stats.hp > 0)
  pruneVisualPositionsOccasionally(visualPositions, aliveArcanes.map((arcane) => arcane.id))

  context.clearRect(0, 0, width, height)
  context.save()
  context.scale(dpr, dpr)
  const activeEffectsByTarget = groupActiveEffectsByTarget(timedEffects, now)

  for (const arcane of aliveArcanes) {
    const visual = getArcaneVisualPosition(arcane, visualPositions)
    drawArcaneToken(context, viewport, arcane, visual, selectedId === arcane.id, activeEffectsByTarget)
  }

  context.restore()
}

function getArcaneVisualPosition(arcane: Arcane, visualPositions: Map<string, VisualPosition>) {
  return getBufferedVisualPosition(
    arcane.id,
    arcane.pos,
    visualPositions,
    18,
  )
}

function drawArcaneToken(
  context: CanvasRenderingContext2D,
  viewport: CanvasViewport,
  arcane: Arcane,
  visualPos: Point,
  selected: boolean,
  activeEffectsByTarget: Map<string, TimedEffect['kind'][]>,
) {
  const point = toCanvasPoint(visualPos, viewport)
  const teamColor = teamInfo[arcane.team].primary
  const radius = 14
  const hpRatio = Math.max(0, Math.min(1, arcane.stats.hp / Math.max(1, arcane.stats.maxHp)))
  const emptyAngle = (1 - hpRatio) * Math.PI * 2

  context.save()
  context.translate(point.x, point.y)

  context.fillStyle = 'rgba(0, 0, 0, 0.56)'
  context.beginPath()
  context.arc(0, 0, radius + 2, 0, Math.PI * 2)
  context.fill()

  context.strokeStyle = 'rgba(255, 255, 255, 0.16)'
  context.lineWidth = 4
  context.beginPath()
  context.arc(0, 0, radius, -Math.PI / 2, Math.PI * 1.5)
  context.stroke()

  context.strokeStyle = teamColor
  context.lineWidth = 4
  context.beginPath()
  context.arc(0, 0, radius, -Math.PI / 2 + emptyAngle, Math.PI * 1.5)
  context.stroke()

  context.fillStyle = '#10161b'
  context.beginPath()
  context.arc(0, 0, radius - 4, 0, Math.PI * 2)
  context.fill()

  context.fillStyle = '#fffdf5'
  context.font = '900 9px Inter, system-ui, sans-serif'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(arcane.portrait, 0, 0)

  if (selected) {
    context.strokeStyle = 'rgba(246, 200, 93, 0.78)'
    context.lineWidth = 2.5
    context.beginPath()
    context.arc(0, 0, radius + 5, 0, Math.PI * 2)
    context.stroke()
  }

  drawArcaneEffectBadges(context, activeEffectsByTarget.get(arcane.id) ?? [])
  context.restore()
}

function drawArcaneEffectBadges(
  context: CanvasRenderingContext2D,
  activeKinds: TimedEffect['kind'][],
) {
  const uniqueKinds = Array.from(new Set(activeKinds)).slice(0, 4)

  uniqueKinds.forEach((kind, index) => {
    const angle = -Math.PI / 4 + index * (Math.PI / 5)
    const x = Math.cos(angle) * 17
    const y = Math.sin(angle) * 17
    const label = getEffectGlyph(kind)
    context.fillStyle = getEffectCanvasColor(kind)
    context.beginPath()
    context.arc(x, y, 5.2, 0, Math.PI * 2)
    context.fill()
    context.fillStyle = '#091016'
    context.font = '900 7px Inter, system-ui, sans-serif'
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillText(label, x, y + 0.2)
  })
}

function groupActiveEffectsByTarget(timedEffects: TimedEffect[], now: number) {
  const grouped = new Map<string, TimedEffect['kind'][]>()
  for (const effect of timedEffects) {
    if (effect.expiresAt <= now) continue
    const current = grouped.get(effect.targetId)
    if (current) {
      current.push(effect.kind)
    } else {
      grouped.set(effect.targetId, [effect.kind])
    }
  }
  return grouped
}

function getEffectGlyph(kind: TimedEffect['kind']) {
  if (kind === 'stun') return 'Z'
  if (kind === 'silence') return 'S'
  if (kind === 'slow') return '*'
  if (kind === 'dot') return 'D'
  if (kind === 'barrier') return 'B'
  if (kind === 'buff') return '+'
  return 'H'
}

function getEffectCanvasColor(kind: TimedEffect['kind']) {
  if (kind === 'dot' || kind === 'silence') return '#ff5b6e'
  if (kind === 'barrier' || kind === 'buff' || kind === 'hot') return '#d7f171'
  if (kind === 'stun') return '#f6c85d'
  return '#9fd0ff'
}

function BossCanvasLayer({
  stateRef,
  selected,
  onSelect,
}: {
  stateRef: React.RefObject<SimulationState | undefined>
  selected: Selected
  onSelect: (selected: Selected) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const visualPositions = useRef(new Map<string, VisualPosition>())
  const latest = useRef({ selected })

  latest.current = { selected }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined

    let frame = 0
    const draw = () => {
      const currentState = stateRef.current
      if (currentState) {
        drawBossCanvas(
          canvas,
          currentState.boss,
          latest.current.selected?.kind === 'boss' && latest.current.selected.id === currentState.boss.id,
          currentState.time,
          visualPositions.current,
        )
      }
      frame = window.requestAnimationFrame(draw)
    }

    frame = window.requestAnimationFrame(draw)
    return () => window.cancelAnimationFrame(frame)
  }, [stateRef])

  function handleClick(event: MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    const currentState = stateRef.current
    if (!canvas || !currentState || currentState.boss.hp <= 0) return
    const rect = canvas.getBoundingClientRect()
    const point = {
      x: ((event.clientX - rect.left) / Math.max(1, rect.width)) * 100,
      y: ((event.clientY - rect.top) / Math.max(1, rect.height)) * 100,
    }
    if (distance(point, currentState.boss.pos) <= 4.2) onSelect({ kind: 'boss', id: currentState.boss.id })
  }

  return (
    <canvas
      ref={canvasRef}
      className="boss-canvas"
      aria-label="Serpente do Eclipse"
      onClick={handleClick}
    />
  )
}

function drawBossCanvas(
  canvas: HTMLCanvasElement,
  boss: Boss,
  selected: boolean,
  now: number,
  visualPositions: Map<string, VisualPosition>,
) {
  const { viewport, dpr, width, height } = prepareCanvasForDraw(canvas)
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width
    canvas.height = height
  }

  const context = canvas.getContext('2d')
  if (!context) return

  context.clearRect(0, 0, width, height)
  if (boss.hp <= 0 || boss.respawn > now) return

  context.save()
  context.scale(dpr, dpr)
  const visual = getBufferedVisualPosition(boss.id, boss.pos, visualPositions, 20)
  const point = toCanvasPoint(visual, viewport)
  const radius = 22
  const hpRatio = Math.max(0, Math.min(1, boss.hp / Math.max(1, boss.maxHp)))
  const emptyAngle = (1 - hpRatio) * Math.PI * 2

  context.translate(point.x, point.y)
  context.fillStyle = 'rgba(0, 0, 0, 0.56)'
  context.beginPath()
  context.arc(0, 0, radius + 2, 0, Math.PI * 2)
  context.fill()

  context.strokeStyle = 'rgba(255, 255, 255, 0.16)'
  context.lineWidth = 5
  context.beginPath()
  context.arc(0, 0, radius, -Math.PI / 2, Math.PI * 1.5)
  context.stroke()

  context.strokeStyle = '#ff8e50'
  context.beginPath()
  context.arc(0, 0, radius, -Math.PI / 2 + emptyAngle, Math.PI * 1.5)
  context.stroke()

  context.fillStyle = '#271114'
  context.beginPath()
  context.arc(0, 0, radius - 5, 0, Math.PI * 2)
  context.fill()

  context.fillStyle = '#fff8d8'
  context.font = '900 16px Inter, system-ui, sans-serif'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText('S', 0, 0)

  if (selected) {
    context.strokeStyle = 'rgba(246, 200, 93, 0.86)'
    context.lineWidth = 2.5
    context.beginPath()
    context.arc(0, 0, radius + 6, 0, Math.PI * 2)
    context.stroke()
  }
  context.restore()
}

function FxCanvasLayer({ stateRef }: { stateRef: React.RefObject<SimulationState | undefined> }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined

    let frame = 0
    const draw = () => {
      const currentState = stateRef.current
      if (currentState) {
        drawFxCanvas(
          canvas,
          currentState.effects,
          currentState.deathMarkers,
          currentState.denyMarkers,
          currentState.goldMarkers,
          currentState.skillMarkers ?? [],
          currentState.time,
        )
      }
      frame = window.requestAnimationFrame(draw)
    }

    frame = window.requestAnimationFrame(draw)
    return () => window.cancelAnimationFrame(frame)
  }, [stateRef])

  return <canvas ref={canvasRef} className="fx-canvas" aria-hidden="true" />
}

function drawFxCanvas(
  canvas: HTMLCanvasElement,
  effects: AttackEffect[],
  deathMarkers: DeathMarker[],
  denyMarkers: DenyMarker[],
  goldMarkers: GoldMarker[],
  skillMarkers: SkillMarker[],
  now: number,
) {
  const { viewport, dpr, width, height } = prepareCanvasForDraw(canvas)
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width
    canvas.height = height
  }

  const context = canvas.getContext('2d')
  if (!context) return

  context.clearRect(0, 0, width, height)
  context.save()
  context.scale(dpr, dpr)

  for (const effect of effects) {
    drawAttackFx(context, viewport, effect, now)
  }
  for (const marker of deathMarkers) {
    drawFloatingText(context, viewport, marker.pos, 'X', teamInfo[marker.team].primary, marker.createdAt, marker.expiresAt, now, 18, 0)
  }
  for (const marker of denyMarkers) {
    drawFloatingText(context, viewport, marker.pos, '!', teamInfo[marker.team].primary, marker.createdAt, marker.expiresAt, now, 19, -4)
  }
  for (const marker of goldMarkers) {
    drawFloatingText(context, viewport, marker.pos, `+${marker.amount}g`, teamInfo[marker.team].primary, marker.createdAt, marker.expiresAt, now, 12, -8)
  }
  for (const marker of skillMarkers) {
    drawFloatingText(context, viewport, marker.pos, marker.label, teamInfo[marker.team].primary, marker.createdAt, marker.expiresAt, now, 11, -18)
  }

  context.restore()
}

function drawAttackFx(context: CanvasRenderingContext2D, viewport: CanvasViewport, effect: AttackEffect, now: number) {
  const progress = Math.min(1, Math.max(0, (now - effect.createdAt) / effect.duration))
  const alpha = Math.max(0, 1 - progress)
  if (alpha <= 0) return

  const from = toCanvasPoint(effect.from, viewport)
  const to = toCanvasPoint(effect.to, viewport)
  const teamColor = teamInfo[effect.team].primary
  const targetRadius = effect.targetKind === 'tower' || effect.targetKind === 'structure' || effect.targetKind === 'base'
    ? 5.8
    : effect.targetKind === 'boss'
      ? 7.5
      : 4.8

  context.save()
  context.globalAlpha = alpha
  context.strokeStyle = teamColor
  context.lineWidth = effect.kind === 'tower' ? 2.4 : effect.kind === 'arcane' ? 1.8 : 1.2
  context.beginPath()
  context.moveTo(from.x, from.y)
  const beamX = from.x + (to.x - from.x) * Math.min(1, progress + 0.35)
  const beamY = from.y + (to.y - from.y) * Math.min(1, progress + 0.35)
  context.lineTo(beamX, beamY)
  context.stroke()

  context.globalAlpha = alpha * 0.8
  context.fillStyle = teamColor
  context.beginPath()
  context.arc(to.x, to.y, targetRadius * (0.55 + progress * 0.7), 0, Math.PI * 2)
  context.fill()
  context.restore()
}

function drawFloatingText(
  context: CanvasRenderingContext2D,
  viewport: CanvasViewport,
  point: Point,
  label: string,
  color: string,
  createdAt: number,
  expiresAt: number,
  now: number,
  size: number,
  yOffset: number,
) {
  const lifetime = Math.max(0.01, expiresAt - createdAt)
  const progress = Math.min(1, Math.max(0, (now - createdAt) / lifetime))
  const alpha = Math.max(0, 1 - progress)
  if (alpha <= 0) return

  const canvasPoint = toCanvasPoint(point, viewport)
  const y = canvasPoint.y + yOffset - progress * 16
  context.save()
  context.globalAlpha = alpha
  context.font = `700 ${size}px Inter, system-ui, sans-serif`
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.lineWidth = 3
  context.strokeStyle = 'rgba(0, 0, 0, 0.72)'
  context.strokeText(label, canvasPoint.x, y)
  context.fillStyle = color
  context.fillText(label, canvasPoint.x, y)
  context.restore()
}

function toCanvasPoint(point: Point, viewport: CanvasViewport) {
  const clamped = clampToMapBounds(point)
  return {
    x: (clamped.x / 100) * viewport.width,
    y: (clamped.y / 100) * viewport.height,
  }
}

function AttackRangeCanvasLayer({
  stateRef,
  selected,
}: {
  stateRef: React.RefObject<SimulationState | undefined>
  selected: Selected
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const visualPositions = useRef(new Map<string, VisualPosition>())
  const latest = useRef({ selected })

  latest.current = { selected }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined

    let frame = 0
    const draw = () => {
      const currentState = stateRef.current
      if (currentState) {
        drawAttackRangeCanvas(canvas, currentState, latest.current.selected, visualPositions.current)
      }
      frame = window.requestAnimationFrame(draw)
    }

    frame = window.requestAnimationFrame(draw)
    return () => window.cancelAnimationFrame(frame)
  }, [stateRef])

  return <canvas ref={canvasRef} className="attack-range-canvas" aria-hidden="true" />
}

function drawAttackRangeCanvas(
  canvas: HTMLCanvasElement,
  state: SimulationState,
  selected: Selected,
  visualPositions: Map<string, VisualPosition>,
) {
  const { viewport, dpr, width, height } = prepareCanvasForDraw(canvas)
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width
    canvas.height = height
  }

  const context = canvas.getContext('2d')
  if (!context) return
  context.clearRect(0, 0, width, height)

  const entity = findSelected(state, selected)
  const range = getEntityAttackRange(entity)
  const pos = getEntityPosition(entity)
  if (!entity || !pos || range === undefined || range <= 0) return

  const visualPos = shouldBufferRangeEntity(entity)
    ? getBufferedVisualPosition(`range-${entity.id}`, pos, visualPositions, getRangeSnapDistance(entity))
    : pos
  const point = toCanvasPoint(visualPos, viewport)
  const radius = (range / 100) * viewport.width

  context.save()
  context.scale(dpr, dpr)
  context.fillStyle = 'rgba(246, 200, 93, 0.08)'
  context.strokeStyle = 'rgba(246, 200, 93, 0.58)'
  context.lineWidth = 1.25
  context.setLineDash([5, 4])
  context.beginPath()
  context.arc(point.x, point.y, radius, 0, Math.PI * 2)
  context.fill()
  context.stroke()
  context.restore()
}

type CanvasViewport = {
  width: number
  height: number
}

function prepareCanvasForDraw(canvas: HTMLCanvasElement) {
  const dpr = Math.min(maxCanvasDevicePixelRatio, window.devicePixelRatio || 1)
  const viewport = {
    width: Math.max(1, canvas.clientWidth),
    height: Math.max(1, canvas.clientHeight),
  }
  return {
    viewport,
    dpr,
    width: Math.max(1, Math.floor(viewport.width * dpr)),
    height: Math.max(1, Math.floor(viewport.height * dpr)),
  }
}

function shouldBufferRangeEntity(entity: Arcane | Creep | Tower | Structure | Base | Camp | Boss | MapRune) {
  if (isMapRune(entity)) return false
  return 'player' in entity || 'type' in entity || isBoss(entity)
}

function getRangeSnapDistance(entity: Arcane | Creep | Tower | Structure | Base | Camp | Boss | MapRune) {
  if (isBoss(entity)) return 20
  if ('player' in entity) return 18
  if ('type' in entity) return 9
  return 1
}

function EventFeed({ events }: { events: MatchEvent[] }) {
  return (
    <aside className="event-feed" aria-label="Eventos importantes">
      <div className="event-feed-title">
        <Swords size={14} />
        <strong>Eventos</strong>
      </div>
      {events.length === 0 ? (
        <p>Aguardando primeiro abate</p>
      ) : (
        <ol>
          {events.slice(0, 8).map((event) => (
            <li key={event.id} style={{ '--team': teamInfo[event.team].primary } as React.CSSProperties}>
              <time>{formatTime(event.time)}</time>
              <span>
                <strong className="kill-line">
                  <b style={{ '--name-color': teamInfo[event.actorTeam].primary } as React.CSSProperties}>{event.actor}</b>
                  <Swords size={12} aria-label="abateu" />
                  <b style={{ '--name-color': teamInfo[event.victimTeam].primary } as React.CSSProperties}>{event.victim}</b>
                </strong>
                <em>{event.detail}</em>
              </span>
            </li>
          ))}
        </ol>
      )}
    </aside>
  )
}

function MapNode({
  hp,
  maxHp,
  backdoorProtected = false,
  fortified = false,
  point,
  team,
  type,
  variant,
  label,
  title,
  selected,
  onClick,
}: {
  hp: number
  maxHp: number
  backdoorProtected?: boolean
  fortified?: boolean
  point: Point
  team: TeamId
  type: 'tower' | 'structure' | 'base'
  variant?: StructureKind
  label?: string
  title: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      className={selected ? `map-node ${type} ${variant ?? ''} ${team} selected` : `map-node ${type} ${variant ?? ''} ${team}`}
      style={{
        ...place(point),
        '--team': teamInfo[team].primary,
        '--hp-empty': `${getHealthRingEmptyAngle(hp, maxHp)}deg`,
      } as React.CSSProperties}
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
    >
      {type === 'base'
        ? <Swords size={16} />
        : variant?.startsWith('barracks')
          ? <span className="barracks-icon" aria-hidden="true" />
          : <TowerControl size={13} />}
      {(backdoorProtected || fortified) && (
        <span className="structure-protection">
          {backdoorProtected && <b title="Backdoor ativo">BD</b>}
          {fortified && <b className="fortified" title="Fortification ativa">G</b>}
        </span>
      )}
      {label && <span className="node-label">{label}</span>}
    </button>
  )
}

function Inspector({ entity, state }: { entity: Arcane | Creep | Tower | Structure | Base | Camp | Boss | MapRune | undefined; state: SimulationState }) {
  if (!entity) return <div className="detail-empty">Selecione um Arcane, torre, base, creep ou campo neutro.</div>

  if ('player' in entity) {
    const heroDefinition = getHeroDefinition(entity.heroDefinitionId)
    const calculated = calculateHeroStats(heroDefinition, entity.stats.level, [])
    const auraMultiplier = getAuraMultiplier(state, entity.team)
    const teamPlan = state.teamPlans[entity.team]
    const activeEffects = getActiveEffectLabels(state, entity)
    const hpPercent = Math.round((entity.stats.hp / Math.max(1, entity.stats.maxHp * auraMultiplier)) * 100)
    const manaPercent = Math.round((entity.stats.mana / Math.max(1, entity.stats.maxMana * auraMultiplier)) * 100)
    return (
      <div className="detail-panel arcane-detail">
        <div className="arcane-hero-card" style={{ '--team': teamInfo[entity.team].primary } as React.CSSProperties}>
          <Portrait arcane={entity} />
          <div className="detail-title">
            <span>{teamInfo[entity.team].name} / {entity.role} / {laneNames[entity.lane]}</span>
            <strong>{entity.player}</strong>
            <em>{entity.name}</em>
          </div>
          <div className="hero-card-meta">
            <DataChip label="Level" value={`${entity.stats.level}`} />
            <DataChip label="Ouro" value={formatCompactGold(entity.stats.gold)} />
            <DataChip label="XP" value={`${Math.round(entity.stats.xp)}`} />
          </div>
        </div>
        <section className="data-card resource-card">
          <DataCardTitle icon={<HeartPulse size={15} />} title="Estado" />
          <ResourceLine label="Vida" value={entity.stats.hp} max={entity.stats.maxHp * auraMultiplier} tone="hp" detail={`${hpPercent}%`} />
          <ResourceLine label="Mana" value={entity.stats.mana} max={entity.stats.maxMana * auraMultiplier} tone="mana" detail={`${manaPercent}%`} />
          <div className="resource-meta">
            <DataChip label="Regen HP" value={calculated.resources.healthRegen.toFixed(1)} />
            <DataChip label="Regen MP" value={calculated.resources.manaRegen.toFixed(1)} />
            <DataChip label="Respawn" value={entity.respawn > state.time ? `${Math.ceil(entity.respawn - state.time)}s` : 'Vivo'} />
          </div>
        </section>
        <section className="data-card inventory-card">
          <DataCardTitle icon={<Package size={15} />} title="Inventario" />
          <InventoryStrip items={entity.items} cooldowns={entity.itemCooldowns} now={state.time} />
          <span className="inventory-note">{getNextPurchaseLabel(entity)}</span>
        </section>
        <section className="data-card skills-card">
          <DataCardTitle icon={<Zap size={15} />} title="Skills" />
          <SkillKeyRow skills={heroDefinition.skills ?? []} arcane={entity} now={state.time} />
          <SkillSummary skills={heroDefinition.skills ?? []} />
        </section>
        <section className="data-card">
          <DataCardTitle icon={<Target size={15} />} title="Combate" />
          <MetricGroup
            title="Ataque"
            items={[
              ['Dano', `${Math.round(entity.stats.damage * auraMultiplier)}`],
              ['Efet.', `${Math.round(getEffectiveArcaneDamage(state, entity) * auraMultiplier)}`],
              ['Alcance', `${entity.stats.range.toFixed(1)}`],
              ['Atk/s', `${(1 / getEffectiveArcaneAttackCooldown(state, entity)).toFixed(2)}`],
            ]}
          />
          <MetricGroup
            title="Defesa"
            items={[
              ['Armad.', `${getEffectiveArcaneArmor(state, entity).toFixed(1)}`],
              ['Barrier', `${getArcaneBarrierAmount(state, entity)}`],
              ['Fis.', `${Math.round(calculated.defense.physicalDamageReduction * 100)}%`],
              ['Mag.', `${Math.round(calculated.defense.magicResistance)}%`],
            ]}
          />
        </section>
        <section className="data-card">
          <DataCardTitle icon={<Brain size={15} />} title="IA" />
          <DecisionSummary macroDecision={entity.macroDecision} microDecision={entity.microDecision} />
          <MetricGroup
            title="Decisao"
            items={[
              ['Status', getDecisionStatusLabel(entity.decisionStatus)],
              ['Think', `${Math.max(0, entity.nextDecisionAt - state.time).toFixed(1)}s`],
              ['Modo', getPlayerModeLabel(entity.aiMode)],
              ['Exec.', `${entity.aiExecutionChance}% / ${entity.aiExecutionDelay.toFixed(1)}s`],
              ['Falha', entity.aiFailure ? getExecutionFailureLabel(entity.aiFailure) : 'Nao'],
              ['Razao', entity.aiReason],
            ]}
          />
        </section>
        <section className="data-card">
          <DataCardTitle icon={<Gauge size={15} />} title="Mapa" />
          <MetricGroup
            title="Leitura"
            items={[
              ['Agr.', `${entity.aggression}`],
              ['Call', `${entity.shotcalling}`],
              ['Perigo', `${getDangerScore(state, entity)}`],
              ['Memoria', `${getTeamMemoryDanger(state, entity.team, entity.pos)}`],
              ['Lane', `${Math.round(getLaneWinAssessment(state, entity.team, entity.lane).winChance * 100)}%`],
              ['Item', `${getItemTimingUrgency(entity, state.time)}`],
            ]}
          />
          <MetricGroup
            title="Plano"
            items={[
              ['Tipo', teamPlan ? getTeamPlanLabel(teamPlan.type) : 'Lendo mapa'],
              ['Alvo', getTeamPlanTargetLabel(state, teamPlan)],
              ['EV', teamPlan ? `${teamPlan.expectedValue}` : '-'],
              ['Chance', teamPlan?.decisionChance !== undefined ? `${Math.round(teamPlan.decisionChance * 100)}%` : '-'],
              ['Risco', teamPlan ? `${teamPlan.risk}` : '-'],
              ['Tags', teamPlan ? formatReasonTags(teamPlan.reasonTags) : '-'],
            ]}
          />
        </section>
        <section className="data-card">
          <DataCardTitle icon={<Eye size={15} />} title="Atributos e efeitos" />
          <AttributeSummary stats={calculated} />
          <MetricGroup
            title="Efeitos"
            items={[
              ['Move', `${entity.stats.moveSpeed.toFixed(1)}`],
              ['Visao', `${entity.visionRange.toFixed(1)}`],
              ['Slow', `${getArcaneSlowPercent(state, entity)}%`],
              ['Ativos', activeEffects.length ? activeEffects.join(', ') : 'Nenhum'],
            ]}
          />
        </section>
      </div>
    )
  }

  if ('tier' in entity) {
    return (
      <DetailLine
        title={`Torre T${entity.tier} - ${laneNames[entity.lane]}`}
        subtitle={`${teamInfo[entity.team].name} / ${getBackdoorInspectorLabel(state, entity)}`}
        hp={entity.hp}
        maxHp={entity.maxHp}
        damage={entity.damage}
        attackRange={entity.range}
      />
    )
  }

  if (isMapRune(entity)) {
    return (
      <div className="detail-panel unit-detail rune-detail">
        <div className={`detail-icon rune-icon ${entity.kind}`}>{getRuneGlyph(entity)}</div>
        <div className="detail-title">
          <strong>{getRuneLabel(entity)}</strong>
          <span>{getRuneInspectorSubtitle(entity, state.time)}</span>
        </div>
        <MetricGroup
          title="Recompensa"
          items={[
            ['Tipo', getRuneKindLabel(entity.kind)],
            ['Valor', getRuneRewardLabel(entity, state.time)],
            ['Spawn', formatTime(entity.spawnedAt)],
            ['Expira', entity.expiresAt ? `${Math.max(0, Math.ceil(entity.expiresAt - state.time))}s` : 'Acumula'],
          ]}
        />
      </div>
    )
  }

  if ('kind' in entity) {
    return (
      <DetailLine
        title={getStructureLabel(entity)}
        subtitle={`${teamInfo[entity.team].name} / ${getBackdoorInspectorLabel(state, entity)}`}
        hp={entity.hp}
        maxHp={entity.maxHp}
        damage={entity.damage}
        attackRange={entity.range}
      />
    )
  }

  if (isBoss(entity)) {
    const stats = getBossStats(state.time)
    return (
      <DetailLine
        title={entity.name}
        subtitle={`Chefe itinerante / escala com tempo / respawn ${entity.respawn > state.time ? `${Math.ceil(entity.respawn - state.time)}s` : 'ativo'}`}
        hp={entity.hp}
        maxHp={stats.hp}
        damage={stats.damage}
        attackRange={stats.range}
      />
    )
  }

  if ('level' in entity) {
    const rewards = getCampRewards(entity, state.time)
    return (
      <DetailLine
        title={entity.name}
        subtitle={`Campo ${campStrengthLabel(entity.strength)} / nivel ${entity.level} / stack x${entity.stackCount + 1} / ${rewards.gold}g ${rewards.xp}xp`}
        hp={entity.hp}
        maxHp={entity.maxHp}
        damage={entity.damage}
        attackRange={entity.range}
      />
    )
  }

  if ('lane' in entity) {
    return (
      <div className="detail-panel unit-detail">
        <div className="detail-icon"><Swords size={21} /></div>
        <div className="detail-title">
          <strong>{getCreepDisplayName(entity)} - {laneNames[entity.lane]}</strong>
          <span>{teamInfo[entity.team].name}</span>
        </div>
        <MetricGroup
          title="Combate"
          items={[
            ['Vida', `${Math.round(entity.hp)} / ${entity.maxHp}`],
            ['Dano', `${entity.damage}`],
            ['Alcance', `${entity.range}`],
            ['Visao', `${getCreepVisionRange(entity)}`],
          ]}
        />
        <Meter value={entity.hp} max={entity.maxHp} tone="hp" />
      </div>
    )
  }

  if ('team' in entity) {
    return <DetailLine title={`Base ${teamInfo[entity.team].name}`} subtitle="Estrutura principal" hp={entity.hp} maxHp={entity.maxHp} />
  }

  return null
}

function isBoss(entity: Arcane | Creep | Tower | Structure | Base | Camp | Boss | MapRune): entity is Boss {
  return entity.id === 'boss-world-serpent'
}

function isMapRune(entity: Arcane | Creep | Tower | Structure | Base | Camp | Boss | MapRune): entity is MapRune {
  return entity.id.startsWith('rune-')
}

function getBackdoorInspectorLabel(state: SimulationState, target: Tower | Structure | Base) {
  const attackingTeam: TeamId = target.team === 'dawn' ? 'dusk' : 'dawn'
  const fortifiedLabel = isStructureFortified(state, target)
    ? ` / fortificado ${Math.ceil(state.teamFortifications[target.team].activeUntil - state.time)}s`
    : state.teamFortifications[target.team].cooldownUntil > state.time
      ? ` / glyph cd ${Math.ceil(state.teamFortifications[target.team].cooldownUntil - state.time)}s`
      : ' / glyph pronto'
  if (!hasBackdoorProtection(target)) return `sem backdoor${fortifiedLabel}`
  const backdoorLabel = isStructureBackdoorProtectedForTeam(state, attackingTeam, target)
    ? 'backdoor ativo'
    : 'backdoor aberto'
  return `${backdoorLabel}${fortifiedLabel}`
}

function DetailLine({ title, subtitle, hp, maxHp, damage, attackRange }: { title: string; subtitle: string; hp: number; maxHp: number; damage?: number; attackRange?: number }) {
  return (
    <div className="detail-panel unit-detail">
      <div className="detail-icon"><Swords size={21} /></div>
      <div className="detail-title">
        <strong>{title}</strong>
        <span>{subtitle}</span>
      </div>
      <MetricGroup
        title="Resumo"
        items={[
          ['Vida', `${Math.round(hp)} / ${maxHp}`],
          ...(damage !== undefined ? [['Dano', `${damage}`] as [string, string]] : []),
          ...(attackRange !== undefined ? [['Alcance', `${attackRange}`] as [string, string]] : []),
        ]}
      />
      <Meter value={hp} max={maxHp} tone="hp" />
    </div>
  )
}

function AttributeSummary({ stats }: { stats: ReturnType<typeof calculateHeroStats> }) {
  return (
    <MetricGroup
      title="Atributos"
      items={[
        ['Str', stats.attributes.strength.toFixed(1)],
        ['Agi', stats.attributes.agility.toFixed(1)],
        ['Int', stats.attributes.intelligence.toFixed(1)],
        ['Total', stats.attributes.totalAttributes.toFixed(1)],
      ]}
    />
  )
}

function DataCardTitle({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="data-card-title">
      {icon}
      <strong>{title}</strong>
    </div>
  )
}

function DataChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="data-chip">
      <em>{label}</em>
      <strong>{value}</strong>
    </span>
  )
}

function ResourceLine({ label, value, max, tone, detail }: { label: string; value: number; max: number; tone: 'hp' | 'mana'; detail: string }) {
  return (
    <div className="resource-line">
      <div>
        <span>{label}</span>
        <strong>{Math.round(value)} / {Math.round(max)}</strong>
        <em>{detail}</em>
      </div>
      <Meter value={value} max={max} tone={tone} />
    </div>
  )
}

function InventoryStrip({ items, cooldowns = {}, now = 0 }: { items: string[]; cooldowns?: Record<string, number>; now?: number }) {
  return (
    <div className="inventory-strip">
      {Array.from({ length: 6 }, (_, index) => {
        const item = items[index]
        const cooldown = item ? getCooldownRemaining(cooldowns, item, now) : 0
        return (
          <span key={index} className={getInventorySlotClassName(item, cooldown)} title={getInventorySlotTitle(item, cooldowns, now)}>
            {getInventoryGlyph(item)}
            {cooldown > 0 && <span className="cooldown-badge">{Math.ceil(cooldown)}</span>}
          </span>
        )
      })}
    </div>
  )
}

function SkillKeyRow({
  skills,
  compact = false,
  arcane,
  now = 0,
}: {
  skills: HeroSkillDefinition[]
  compact?: boolean
  arcane?: Arcane
  now?: number
}) {
  const orderedKeys: HeroSkillDefinition['key'][] = ['Q', 'W', 'E', 'R']
  return (
    <div className={compact ? 'ability-row compact' : 'ability-row'}>
      {orderedKeys.map((key) => {
        const skill = skills.find((candidate) => candidate.key === key)
        const cooldown = skill && arcane ? getCooldownRemaining(arcane.itemCooldowns, skill.id, now) : 0
        const skillLevel = skill && arcane ? getSimpleSkillLevel(arcane, skill) : 0
        const manaCost = skill && arcane ? getSimpleSkillManaCost(arcane, skill, Math.max(1, skillLevel)) : 0
        const outOfMana = Boolean(skill && arcane && skillLevel > 0 && arcane.stats.mana < manaCost)
        return (
          <b
            key={key}
            className={[
              key === 'R' ? 'ultimate' : '',
              cooldown > 0 ? 'cooling' : '',
              outOfMana ? 'oom' : '',
              skillLevel <= 0 && skill ? 'locked' : '',
            ].filter(Boolean).join(' ')}
            title={skill ? getSkillTooltip(skill, arcane, now) : `${key} sem skill importada`}
          >
            {compact ? key : skill ? `${key} ${getSkillShortName(skill)}` : key}
            {cooldown > 0 && <span className="cooldown-badge">{Math.ceil(cooldown)}</span>}
          </b>
        )
      })}
    </div>
  )
}

function SkillSummary({ skills }: { skills: HeroSkillDefinition[] }) {
  if (skills.length === 0) return <span className="inventory-note">Kit ainda nao importado.</span>

  return (
    <div className="skill-summary-list">
      {skills.map((skill) => (
        <div key={skill.id} className="skill-summary-item">
          <strong>{skill.key}</strong>
          <span>
            <b>{skill.name}</b>
            <em>{getSkillMetaLine(skill)}</em>
          </span>
        </div>
      ))}
    </div>
  )
}

function DecisionSummary({ macroDecision, microDecision }: { macroDecision: string; microDecision: string }) {
  return (
    <div className="metric-group decision-summary">
      <span>Decisao</span>
      <div>
        <p>
          <em>Macro</em>
          <strong className="decision-pill" title={macroDecision}>{getShortDecision(macroDecision)}</strong>
        </p>
        <p>
          <em>Micro</em>
          <strong className="decision-pill subtle" title={microDecision}>{getShortDecision(microDecision)}</strong>
        </p>
      </div>
    </div>
  )
}

function getActiveEffectLabels(state: SimulationState, arcane: Arcane) {
  return state.timedEffects
    .filter((effect) => effect.targetId === arcane.id && effect.expiresAt > state.time)
    .map((effect) => {
      const remaining = Math.max(0, effect.expiresAt - state.time).toFixed(1)
      return `${getEffectKindLabel(effect.kind)} ${remaining}s`
    })
}

function getEffectKindLabel(kind: TimedEffect['kind']) {
  if (kind === 'dot') return 'DoT'
  if (kind === 'hot') return 'HoT'
  if (kind === 'buff') return 'Buff'
  if (kind === 'barrier') return 'Barrier'
  if (kind === 'slow') return 'Slow'
  if (kind === 'stun') return 'Stun'
  return 'Silence'
}

function getNextPurchaseLabel(arcane: Arcane) {
  if (arcane.items.length >= 6) return 'Inventario cheio'
  const nextItem = nextShopItem(arcane)
  return nextItem ? `Proximo item: ${nextItem.name} (${nextItem.cost}g)` : 'Sem proximo item'
}

function getSkillShortName(skill: HeroSkillDefinition) {
  return skill.name
    .split(' ')
    .slice(0, 2)
    .join(' ')
}

function getSkillTooltip(skill: HeroSkillDefinition, arcane?: Arcane, now = 0) {
  if (!arcane) return `${skill.key} - ${skill.name}\n${getSkillMetaLine(skill)}\nTags: ${skill.tags.join(', ')}`

  const level = getSimpleSkillLevel(arcane, skill)
  const manaCost = level > 0 ? getSimpleSkillManaCost(arcane, skill, level) : 0
  const cooldownRemaining = getCooldownRemaining(arcane.itemCooldowns, skill.id, now)
  const status = level <= 0
    ? 'bloqueada'
    : cooldownRemaining > 0
      ? `cd ${cooldownRemaining.toFixed(1)}s`
      : arcane.stats.mana < manaCost
        ? `sem mana (${Math.round(arcane.stats.mana)}/${manaCost})`
        : 'pronta'

  return `${skill.key} - ${skill.name}\n${getSkillMetaLine(skill)}\nMana: ${manaCost} / atual ${Math.round(arcane.stats.mana)}\nEstado: ${status}\nTags: ${skill.tags.join(', ')}`
}

function getSkillMetaLine(skill: HeroSkillDefinition) {
  const parts = [
    getSkillKindLabel(skill.kind),
    getSkillTargetLabel(skill.target),
    getSkillDamageTypeLabel(skill.damageType),
    getSkillValueLabel(skill, 'damage', 'dmg'),
    getSkillValueLabel(skill, 'cooldown', 'cd'),
    getSkillValueLabel(skill, 'range', 'range'),
  ].filter(Boolean)

  return parts.join(' / ')
}

function getSkillValueLabel(skill: HeroSkillDefinition, key: string, label: string) {
  const value = skill.values[key]
  if (value === undefined) return ''
  if (Array.isArray(value)) return `${label} ${value.join('/')}`
  if (typeof value === 'number') return `${label} ${value}`
  return `${label} ${value}`
}

function getSkillKindLabel(kind: HeroSkillDefinition['kind']) {
  if (kind === 'passive') return 'passiva'
  if (kind === 'toggle') return 'toggle'
  return 'ativa'
}

function getSkillTargetLabel(target: HeroSkillDefinition['target']) {
  if (target === 'self') return 'self'
  if (target === 'unit') return 'alvo'
  if (target === 'point') return 'ponto'
  if (target === 'area') return 'area'
  if (target === 'global') return 'global'
  return 'passiva'
}

function getSkillDamageTypeLabel(damageType: HeroSkillDefinition['damageType']) {
  if (damageType === 'none') return ''
  if (damageType === 'physical') return 'fisico'
  if (damageType === 'magical') return 'magico'
  return 'puro'
}

function MetricGroup({ title, items, wide = false }: { title: string; items: Array<[string, string]>; wide?: boolean }) {
  return (
    <div className={wide ? 'metric-group wide' : 'metric-group'}>
      <span>{title}</span>
      <div>
        {items.map(([label, value]) => (
          <p key={label}>
            <em>{label}</em>
            <strong>{value}</strong>
          </p>
        ))}
      </div>
    </div>
  )
}

function Portrait({ arcane }: { arcane: Arcane }) {
  return (
    <span
      className="portrait"
      style={{
        '--team': teamInfo[arcane.team].primary,
        '--hp-empty': `${getHealthRingEmptyAngle(arcane.stats.hp, arcane.stats.maxHp)}deg`,
      } as React.CSSProperties}
    >
      <span>{arcane.portrait}</span>
    </span>
  )
}

function Meter({ value, max, tone }: { value: number; max: number; tone: 'hp' | 'mana' | 'xp' }) {
  return <span className={`meter ${tone}`}><i style={{ width: `${Math.max(0, Math.min(100, (value / max) * 100))}%` }} /></span>
}

function getHealthRingEmptyAngle(value: number, max: number) {
  if (max <= 0) return 360
  return Math.round((1 - Math.max(0, Math.min(1, value / max))) * 360)
}

function getInventoryGlyph(name?: string) {
  if (!name) return ''
  const consumable = getConsumableByName(name)
  if (consumable?.heal && consumable?.mana) return '+'
  if (consumable?.heal) return 'H'
  if (consumable?.mana) return 'M'
  return name.slice(0, 1)
}

function getInventorySlotClassName(item: string | undefined, cooldown: number) {
  const classes = [
    getConsumableByName(item ?? '') ? 'consumable consumable-slot' : item ? 'filled' : '',
    cooldown > 0 ? 'cooling' : '',
  ].filter(Boolean)
  return classes.join(' ')
}

function getInventorySlotTitle(item: string | undefined, cooldowns: Record<string, number>, now: number) {
  if (!item) return 'Slot vazio'
  const cooldown = getCooldownRemaining(cooldowns, item, now)
  const shopItem = shopCatalog.find((candidate) => candidate.name === item)
  const activeLine = shopItem?.active ? ` / cd ${shopItem.active.cooldown}s` : ''
  const remainingLine = cooldown > 0 ? ` / pronto em ${cooldown.toFixed(1)}s` : ''
  return `${item}${activeLine}${remainingLine}`
}

function getCooldownRemaining(cooldowns: Record<string, number>, key: string, now: number) {
  return Math.max(0, (cooldowns[key] ?? 0) - now)
}

function getShortDecision(decision: string) {
  if (decision.startsWith('Avancar rota')) return 'Avancar'
  if (decision.startsWith('Controlar wave')) return 'Wave'
  if (decision.startsWith('Farmar selva')) return 'Selva'
  if (decision.startsWith('Pressionar torre')) return 'Torre'
  if (decision.startsWith('Fazer chefe')) return 'Chefe'
  if (decision.startsWith('Fazer objetivo')) return 'Objetivo'
  if (decision.startsWith('Juntar com o time')) return 'Juntar'
  if (decision.startsWith('Chamar objetivo')) return 'Call'
  if (decision.startsWith('Criar vantagem')) return 'Gank'
  if (decision.startsWith('Rotacionar')) return 'Rotate'
  if (decision.startsWith('Lutar em equipe')) return 'Luta'
  if (decision.startsWith('Defender aliado')) return 'Defender'
  if (decision.startsWith('Recuperar recursos')) return 'Base'
  if (decision.startsWith('Fora de combate')) return 'Respawn'
  if (decision.startsWith('Segurar rota')) return 'Segurar'
  if (decision.startsWith('Manter rota')) return 'Rota'
  if (decision.startsWith('Recuar')) return 'Recuar'
  if (decision.startsWith('Pressionar inimigo')) return 'Pressao'
  if (decision.startsWith('Respawn')) return 'Respawn'
  if (decision.startsWith('Saindo da base')) return 'Avançando'
  if (decision.startsWith('Saindo do alcance da torre') || decision.startsWith('Saindo do Range da torre')) return 'Recuando'
  if (decision.startsWith('Segurando fora da torre')) return 'Fora torre'
  if (decision.startsWith('Chamando time')) return 'Call'
  if (decision.startsWith('Juntando com o time')) return 'Juntar'
  if (decision.startsWith('Atacar chefe')) return 'Chefe'
  if (decision.startsWith('Fazendo objetivo')) return 'Objetivo'
  if (decision.startsWith('Gank')) return 'Gank'
  if (decision.startsWith('Ajudando side lane')) return 'Rotate'
  if (decision.startsWith('Iniciando luta')) return 'Initiate'
  if (decision.startsWith('Pressionando')) return 'Pressao'
  if (decision.startsWith('Batendo torre')) return 'Torre'
  if (decision.startsWith('Recuando')) return 'Recuando'
  if (decision.includes('base')) return 'Base'
  if (decision.includes('neutro') || decision.includes('selva')) return 'Selva'
  if (decision.includes('wave') || decision.includes('rota') || decision.includes('patrimonio')) return 'Rota'
  if (decision.startsWith('Defendendo')) return 'Defender'
  if (decision.startsWith('Escoltando')) return 'Escolta'
  return decision.slice(0, 10)
}

function getPlayerModeLabel(mode: PlayerModeType) {
  if (mode === 'retreat') return 'Recuar'
  if (mode === 'farm_lane') return 'Farm lane'
  if (mode === 'farm_jungle') return 'Selva'
  if (mode === 'join_fight') return 'Luta'
  if (mode === 'save_ally') return 'Save'
  if (mode === 'finish_enemy') return 'Pickoff'
  if (mode === 'take_objective') return 'Objetivo'
  return 'Push'
}

function getDecisionStatusLabel(status: DecisionStatus) {
  if (status === 'sharp') return 'Rapido'
  if (status === 'hesitant') return 'Hesitante'
  if (status === 'tilted') return 'Tiltado'
  return 'Estavel'
}

function getTeamPlanLabel(plan: TeamPlan['type']) {
  if (plan === 'farm_map') return 'Farmar mapa'
  if (plan === 'group_push') return 'Agrupar push'
  if (plan === 'defend_tower') return 'Defender torre'
  if (plan === 'take_boss') return 'Fazer chefe'
  if (plan === 'pickoff') return 'Cacar alvo'
  if (plan === 'avoid_fight') return 'Evitar luta'
  if (plan === 'defend_high_ground') return 'Defender HG'
  return 'Fechar jogo'
}

function getTeamPlanTargetLabel(state: SimulationState, plan: TeamPlan | undefined) {
  if (!plan) return '-'
  if (plan.targetId) {
    const tower = state.towers.find((candidate) => candidate.id === plan.targetId)
    if (tower) return `T${tower.tier} ${laneNames[tower.lane]}`

    const structure = state.structures.find((candidate) => candidate.id === plan.targetId)
    if (structure) return getStructureMapLabel(structure)

    const arcane = state.arcanes.find((candidate) => candidate.id === plan.targetId)
    if (arcane) return arcane.player

    if (state.boss.id === plan.targetId) return state.boss.name

    const base = state.bases.find((candidate) => candidate.id === plan.targetId)
    if (base) return `Base ${teamInfo[base.team].short}`

    return plan.targetId
  }

  if (plan.targetPosition) {
    return `${Math.round(plan.targetPosition.x)}, ${Math.round(plan.targetPosition.y)}`
  }

  return 'Mapa'
}

function formatReasonTags(tags: string[]) {
  return tags.length > 0 ? tags.join(', ') : '-'
}

function getExecutionFailureLabel(failure: ExecutionFailureType) {
  if (failure === 'overcommit') return 'Overcommit'
  if (failure === 'panic_retreat') return 'Panico'
  if (failure === 'wrong_target') return 'Alvo ruim'
  return 'Atraso'
}

function findSelected(state: SimulationState, selected: Selected) {
  if (!selected) return undefined
  if (selected.kind === 'arcane') return state.arcanes.find((entity) => entity.id === selected.id)
  if (selected.kind === 'creep') return state.creeps.find((entity) => entity.id === selected.id)
  if (selected.kind === 'tower') return state.towers.find((entity) => entity.id === selected.id)
  if (selected.kind === 'structure') return state.structures.find((entity) => entity.id === selected.id)
  if (selected.kind === 'base') return state.bases.find((entity) => entity.id === selected.id)
  if (selected.kind === 'boss') return state.boss.id === selected.id ? state.boss : undefined
  if (selected.kind === 'rune') return state.runes.find((entity) => entity.id === selected.id)
  return state.camps.find((entity) => entity.id === selected.id)
}

function getEntityPosition(entity: Arcane | Creep | Tower | Structure | Base | Camp | Boss | MapRune | undefined) {
  if (!entity || !('pos' in entity)) return undefined
  return entity.pos
}

function getEntityAttackRange(entity: Arcane | Creep | Tower | Structure | Base | Camp | Boss | MapRune | undefined) {
  if (!entity) return undefined
  if (isMapRune(entity)) return undefined
  if ('player' in entity) return entity.stats.range
  if ('range' in entity) return entity.range
  return undefined
}

function nearest<T extends { pos: Point }>(point: Point, entities: T[], range: number): T | undefined {
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

function nearestReachableByArcane<T extends { pos: Point }>(arcane: Arcane, entities: T[]): T | undefined {
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

function getArcaneAttackCenterRange(arcane: Arcane, target: { pos: Point }) {
  return arcane.stats.range + getEntityCollisionRadius(arcane) + getEntityCollisionRadius(target) * 0.85
}

function getEntityCollisionRadius(entity: { pos: Point }) {
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

function isPointVisibleToTeam(state: SimulationState, team: TeamId, point: Point) {
  return state.arcanes.some((arcane) => (
    arcane.team === team &&
    arcane.stats.hp > 0 &&
    arcane.respawn <= state.time &&
    distance(arcane.pos, point) <= arcane.visionRange
  ))
}

function getTeamMemoryDanger(state: SimulationState, team: TeamId, point: Point) {
  return areaDangerFromMemory(state.teamMemory[team] ?? [], point, state.time, 20)
}

function getDangerScore(state: SimulationState, arcane: Arcane, visibleEnemies = state.arcanes.filter((enemy) => (
  enemy.team !== arcane.team &&
  enemy.stats.hp > 0 &&
  enemy.respawn <= state.time &&
  isPointVisibleToTeam(state, arcane.team, enemy.pos)
))) {
  const enemyHeroPressure = visibleEnemies.reduce((score, enemy) => {
    const range = 16
    const proximity = Math.max(0, 1 - distance(arcane.pos, enemy.pos) / range)
    return score + proximity * (enemy.stats.damage / Math.max(1, arcane.stats.maxHp)) * 180
  }, 0)
  const towerPressure = state.towers
    .filter((tower) => tower.team !== arcane.team && tower.hp > 0)
    .reduce((score, tower) => {
      const proximity = Math.max(0, 1 - distance(arcane.pos, tower.pos) / (tower.range + 2))
      return score + proximity * 38
    }, 0)
  const creepPressure = state.creeps
    .filter((creep) => creep.team !== arcane.team)
    .reduce((score, creep) => {
      const proximity = Math.max(0, 1 - distance(arcane.pos, creep.pos) / 8)
      return score + proximity * 5
    }, 0)
  const neutralPressure = state.camps
    .filter((camp) => camp.hp > 0)
    .reduce((score, camp) => {
      const proximity = Math.max(0, 1 - distance(arcane.pos, camp.pos) / (camp.range + 3))
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

function getEnemyActionThreatScore(
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
  const towerThreat = state.towers
    .filter((tower) => tower.team !== arcane.team && tower.hp > 0)
    .reduce((score, tower) => {
      const radius = tower.range + 1.2
      if (distance(point, tower.pos) > radius) return score
      return score + 42
    }, 0)
  const visibleArcaneThreat = visibleEnemies.reduce((score, enemy) => {
    const radius = enemy.stats.range + 2.2
    if (distance(point, enemy.pos) > radius) return score
    return score + (enemy.stats.hp / enemy.stats.maxHp > 0.45 ? 20 : 12)
  }, 0)
  const creepThreat = state.creeps
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
      if (distance(point, camp.pos) > radius) return score
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

function getEffectiveDangerScore(dangerScore: number, actionDanger: number, hpRatio: number) {
  const healthPressure = hpRatio >= 0.82
    ? 0
    : hpRatio >= 0.62
      ? (0.82 - hpRatio) * 120
      : 24 + (0.62 - hpRatio) * 155

  return Math.round(Math.max(dangerScore, actionDanger, Math.min(100, healthPressure)))
}

function nearestLanePoint(point: Point, path: Point[]) {
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

function isNearRoute(point: Point, path: Point[], maxDistance: number) {
  return distance(point, nearestLanePoint(point, path)) <= maxDistance
}

function isUnsafeUnderEnemyTower(state: SimulationState, team: TeamId, point: Point, lane: LaneId) {
  const enemyTower = nearest(point, state.towers.filter((tower) => tower.team !== team && tower.hp > 0 && tower.lane === lane), 9.8)
  if (!enemyTower) return false

  const alliedWave = nearest(enemyTower.pos, state.creeps.filter((creep) => creep.team === team && creep.lane === lane), 8)
  return !alliedWave
}

function isTooDeepForAggression(state: SimulationState, arcane: Arcane, point: Point, lane: LaneId, phase: GamePhase) {
  const enemyTierOne = state.towers.find((tower) => tower.team !== arcane.team && tower.lane === lane && tower.tier === 1 && tower.hp > 0)
  if (!enemyTierOne) return false

  const path = lanePaths[arcane.team][lane]
  const targetProgress = laneProgress(point, path)
  const towerProgress = laneProgress(enemyTierOne.pos, path)
  const phaseMultiplier = phase === 'early' ? 0.55 : phase === 'mid' ? 0.85 : 1.1
  const allowedAfterTower = (0.04 + (arcane.aggression / 100) * 0.18) * phaseMultiplier

  if (targetProgress <= towerProgress + allowedAfterTower) return false

  const alliedWave = nearest(point, state.creeps.filter((creep) => creep.team === arcane.team && creep.lane === lane), 9)
  return !alliedWave
}

function getAlliedWaveNearObjective(state: SimulationState, team: TeamId, lane: LaneId, target: Tower | Structure | Base) {
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

function laneProgress(point: Point, path: Point[]) {
  const totalLength = getLaneTotalLength(path)
  if (totalLength === 0) return 0
  return Math.max(0, Math.min(1, getLaneDistanceAlongPath(point, path) / totalLength))
}

function getLaneDistanceAlongPath(point: Point, path: Point[]) {
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

function getLaneTotalLength(path: Point[]) {
  return path.slice(0, -1).reduce((total, point, index) => total + distance(point, path[index + 1]), 0)
}

function getLanePointAtDistance(path: Point[], targetDistance: number) {
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

function syncLanePathIndex(point: Point, path: Point[], currentIndex: number) {
  const currentProgress = laneProgress(point, path)
  const nextIndex = path.findIndex((pathPoint, index) => index > 0 && laneProgress(pathPoint, path) > currentProgress + 0.018)
  if (nextIndex === -1) return path.length - 1
  return Math.max(1, Math.min(path.length - 1, nextIndex || currentIndex))
}

function getLaneAdvancePoint(arcane: Arcane, path: Point[], pathIndex: number) {
  const currentDistance = getLaneDistanceAlongPath(arcane.pos, path)
  const targetPathPoint = path[Math.max(1, Math.min(path.length - 1, pathIndex))]
  const targetDistance = getLaneDistanceAlongPath(targetPathPoint, path)
  const lookAhead = arcane.stats.attackType === 'melee' ? 7.5 : 9.5
  const advanceDistance = Math.min(targetDistance, currentDistance + lookAhead)
  return getLanePointAtDistance(path, advanceDistance)
}

function safeLaneRetreatPoint(arcane: Arcane, path: Point[], tower: Tower) {
  const towerDistance = getLaneDistanceAlongPath(tower.pos, path)
  const safeDistanceFromTower = tower.range + getEntityCollisionRadius(arcane) + 2.4
  const targetDistance = Math.max(0, towerDistance - safeDistanceFromTower)
  let point = formationPoint(getLanePointAtDistance(path, targetDistance), arcane.id)

  for (let attempts = 0; attempts < 6 && distance(point, tower.pos) <= tower.range + 1.8; attempts += 1) {
    point = formationPoint(getLanePointAtDistance(path, Math.max(0, targetDistance - attempts * 1.8)), arcane.id)
  }

  return clampToMapBounds(point)
}

function projectPointToSegment(point: Point, start: Point, end: Point): Point {
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

function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function distanceSquared(a: Point, b: Point) {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return dx * dx + dy * dy
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function moveToward(from: Point, to: Point, amount: number): Point {
  const total = distance(from, to)
  if (total <= amount || total === 0) return clampToMapBounds(to)
  return clampToMapBounds({ x: from.x + ((to.x - from.x) / total) * amount, y: from.y + ((to.y - from.y) / total) * amount })
}

function spreadPoint(point: Point, index: number): Point {
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

function formationPoint(point: Point, id: string): Point {
  let hash = 0
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash + id.charCodeAt(index) * (index + 3)) % 997
  }

  return spreadPoint(point, hash)
}

function place(point: Point) {
  const bounded = clampToMapBounds(point)
  return { '--map-x': `${bounded.x}%`, '--map-y': `${bounded.y}%` }
}

function clampToMapBounds(point: Point): Point {
  return {
    x: Math.max(mapWallPadding, Math.min(100 - mapWallPadding, point.x)),
    y: Math.max(mapWallPadding, Math.min(100 - mapWallPadding, point.y)),
  }
}

function mapEdgeApproachPoint(point: Point): Point {
  const approachPadding = 9
  return {
    x: Math.max(approachPadding, Math.min(100 - approachPadding, point.x)),
    y: Math.max(approachPadding, Math.min(100 - approachPadding, point.y)),
  }
}

function formatTime(time: number) {
  const total = Math.floor(time)
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export default App
