import { useEffect, useMemo, useRef, useState, type MouseEvent, type PointerEvent } from 'react'
import { ChevronDown, ChevronUp, Coins, Pause, Play, RotateCcw, Skull, Swords, TowerControl, Zap } from 'lucide-react'
import { calculateHeroStats, type HeroDefinition, type HeroRole, type PrimaryAttribute } from './game-systems/heroAttributes'
import './App.css'

type TeamId = 'dawn' | 'dusk'
type LaneId = 'top' | 'mid' | 'bot'
type EntityKind = 'arcane' | 'creep' | 'tower' | 'base' | 'camp' | 'boss'
type GamePhase = 'early' | 'mid' | 'late'
type DayCycle = 'day' | 'night'
type CampStrength = 'weak' | 'medium' | 'strong'
type TeamObjectiveKind = 'tower' | 'boss' | 'pickoff'
type Selected = { kind: EntityKind; id: string }

type Point = { x: number; y: number }
type Stats = {
  maxHp: number
  hp: number
  maxMana: number
  mana: number
  damage: number
  range: number
  attackSpeed: number
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
  decision: string
  items: string[]
  stats: Stats
}
type Creep = {
  id: string
  team: TeamId
  lane: LaneId
  type: 'melee' | 'mage'
  pos: Point
  pathIndex: number
  hp: number
  maxHp: number
  damage: number
  range: number
  visionRange: number
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
type SimulationState = {
  time: number
  nextWave: number
  kills: Record<TeamId, number>
  winner?: TeamId
  teamCalls: Partial<Record<TeamId, TeamCall>>
  teamAuras: Partial<Record<TeamId, TeamAura>>
  events: MatchEvent[]
  effects: AttackEffect[]
  deathMarkers: DeathMarker[]
  arcanes: Arcane[]
  creeps: Creep[]
  towers: Tower[]
  bases: Base[]
  camps: Camp[]
  boss: Boss
}
type CombatSource = {
  id: string
  label: string
  team: TeamId
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
  team: TeamId
  from: Point
  to: Point
  createdAt: number
  duration: number
}
type DeathMarker = {
  id: string
  arcane: string
  team: TeamId
  pos: Point
  createdAt: number
  expiresAt: number
}

const teamInfo = {
  dawn: {
    name: 'Aurora Forge',
    short: 'AF',
    primary: '#38d6cc',
    secondary: '#f6c85d',
    base: { x: 10, y: 86 },
  },
  dusk: {
    name: 'Crimson Veil',
    short: 'CV',
    primary: '#ff5b6e',
    secondary: '#9fd0ff',
    base: { x: 90, y: 14 },
  },
} satisfies Record<TeamId, { name: string; short: string; primary: string; secondary: string; base: Point }>

const laneNames: Record<LaneId, string> = {
  top: 'Topo',
  mid: 'Meio',
  bot: 'Baixo',
}

const baseServiceRange = 6
const mapWallPadding = 3
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
const shopCatalog = [
  { name: 'Blade', cost: 450, damage: 8, maxHp: 0, maxMana: 0 },
  { name: 'Boots', cost: 500, damage: 0, maxHp: 40, maxMana: 0 },
  { name: 'Wand', cost: 420, damage: 4, maxHp: 0, maxMana: 60 },
  { name: 'Shield', cost: 520, damage: 0, maxHp: 90, maxMana: 0 },
  { name: 'Charm', cost: 380, damage: 3, maxHp: 30, maxMana: 30 },
  { name: 'Ward', cost: 300, damage: 0, maxHp: 20, maxMana: 40 },
] as const

function getArcaneRespawnDuration(level: number) {
  return Math.round(8 + level * 3.5 + Math.max(0, level - 6) * 2)
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

function getDayCycle(time: number): DayCycle {
  return Math.floor(time / (5 * 60)) % 2 === 0 ? 'day' : 'night'
}

function getDayCycleLabel(cycle: DayCycle) {
  return cycle === 'day' ? 'Dia' : 'Noite'
}

const lanePaths: Record<TeamId, Record<LaneId, Point[]>> = {
  dawn: {
    top: [
      { x: 10, y: 86 },
      { x: 12, y: 58 },
      { x: 19, y: 24 },
      { x: 42, y: 19 },
      { x: 73, y: 12 },
      { x: 90, y: 14 },
    ],
    mid: [
      { x: 10, y: 86 },
      { x: 31, y: 69 },
      { x: 50, y: 50 },
      { x: 69, y: 31 },
      { x: 90, y: 14 },
    ],
    bot: [
      { x: 10, y: 86 },
      { x: 28, y: 91 },
      { x: 61, y: 84 },
      { x: 86, y: 67 },
      { x: 90, y: 14 },
    ],
  },
  dusk: {
    top: [
      { x: 90, y: 14 },
      { x: 73, y: 12 },
      { x: 42, y: 19 },
      { x: 19, y: 24 },
      { x: 12, y: 58 },
      { x: 10, y: 86 },
    ],
    mid: [
      { x: 90, y: 14 },
      { x: 69, y: 31 },
      { x: 50, y: 50 },
      { x: 31, y: 69 },
      { x: 10, y: 86 },
    ],
    bot: [
      { x: 90, y: 14 },
      { x: 86, y: 67 },
      { x: 61, y: 84 },
      { x: 28, y: 91 },
      { x: 10, y: 86 },
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

const rosterSeed: Omit<Arcane, 'pos' | 'target' | 'pathIndex' | 'respawn' | 'lastAttack' | 'aggression' | 'visionRange' | 'shotcalling' | 'decision' | 'stats'>[] = [
  { id: 'd-quasar', team: 'dawn', player: 'Quasar', name: 'Ember Warden', heroDefinitionId: 'ember_warden', role: 'Safe Lane', lane: 'bot', portrait: 'EW', items: ['Blade', 'Boots'] },
  { id: 'd-aster', team: 'dawn', player: 'Aster', name: 'River Saint', heroDefinitionId: 'river_saint', role: 'Mid', lane: 'mid', portrait: 'RS', items: ['Wand'] },
  { id: 'd-bulwark', team: 'dawn', player: 'Bulwark', name: 'Stone Oracle', heroDefinitionId: 'stone_oracle', role: 'Offlane', lane: 'top', portrait: 'SO', items: ['Shield'] },
  { id: 'd-orbit', team: 'dawn', player: 'Orbit', name: 'Astral Pike', heroDefinitionId: 'astral_pike', role: 'Greedy Support', lane: 'top', portrait: 'AP', items: ['Charm'] },
  { id: 'd-bloom', team: 'dawn', player: 'Bloom', name: 'Moon Scribe', heroDefinitionId: 'moon_scribe', role: 'Dedicated Support', lane: 'bot', portrait: 'MS', items: ['Ward'] },
  { id: 'r-ignis', team: 'dusk', player: 'Ignis', name: 'Iron Matriarch', heroDefinitionId: 'iron_matriarch', role: 'Safe Lane', lane: 'top', portrait: 'IM', items: ['Blade', 'Boots'] },
  { id: 'r-vega', team: 'dusk', player: 'Vega', name: 'Glass Revenant', heroDefinitionId: 'glass_revenant', role: 'Mid', lane: 'mid', portrait: 'GR', items: ['Wand'] },
  { id: 'r-mara', team: 'dusk', player: 'Mara', name: 'Thorn Regent', heroDefinitionId: 'thorn_regent', role: 'Offlane', lane: 'bot', portrait: 'TR', items: ['Shield'] },
  { id: 'r-noct', team: 'dusk', player: 'Noct', name: 'Void Cantor', heroDefinitionId: 'void_cantor', role: 'Greedy Support', lane: 'bot', portrait: 'VC', items: ['Charm'] },
  { id: 'r-cinder', team: 'dusk', player: 'Cinder', name: 'Sunless Clerk', heroDefinitionId: 'sunless_clerk', role: 'Dedicated Support', lane: 'top', portrait: 'SC', items: ['Ward'] },
]

function createInitialState(): SimulationState {
  const arcanes = rosterSeed.map((arcane, index) => {
    const spawn = teamInfo[arcane.team].base
    const stats = buildArcaneStats(arcane.heroDefinitionId, 1, 600, 0)
    return {
      ...arcane,
      pos: spreadPoint(spawn, index),
      target: lanePaths[arcane.team][arcane.lane][1],
      pathIndex: 1,
      respawn: 0,
      lastAttack: -10,
      aggression: getRoleAggression(arcane.role),
      visionRange: getArcaneDefinitionVisionRange(arcane.heroDefinitionId, 'day'),
      shotcalling: getRoleShotcalling(arcane.role),
      decision: 'Saindo da base',
      stats,
    }
  })

  return {
    time: 0,
    nextWave: 0,
    kills: { dawn: 0, dusk: 0 },
    teamCalls: {},
    teamAuras: {},
    events: [],
    effects: [],
    deathMarkers: [],
    arcanes,
    creeps: [],
    towers: createTowers(),
    bases: [
      { id: 'base-dawn', team: 'dawn', pos: teamInfo.dawn.base, hp: 5000, maxHp: 5000 },
      { id: 'base-dusk', team: 'dusk', pos: teamInfo.dusk.base, hp: 5000, maxHp: 5000 },
    ],
    camps: createNeutralCamps(),
    boss: createBoss(),
  }
}

function buildArcaneStats(heroDefinitionId: string, level: number, gold: number, xp: number, hpRatio = 1, manaRatio = 1): Stats {
  const calculated = calculateHeroStats(heroDefinitions[heroDefinitionId], level, [])
  const maxHp = Math.round(calculated.resources.maxHealth)
  const maxMana = Math.round(calculated.resources.maxMana)

  return {
    maxHp,
    hp: Math.round(maxHp * hpRatio),
    maxMana,
    mana: Math.round(maxMana * manaRatio),
    damage: Math.round(calculated.offense.averageDamage),
    range: calculated.offense.attackRange / 100,
    attackSpeed: 1 / Math.max(0.1, calculated.offense.attacksPerSecond),
    moveSpeed: calculated.movement.movementSpeed / 45,
    level,
    xp,
    gold,
  }
}

function getArcaneDefinitionVisionRange(heroDefinitionId: string, cycle: DayCycle) {
  const calculated = calculateHeroStats(heroDefinitions[heroDefinitionId], 1, [])
  return (cycle === 'day' ? calculated.vision.dayVision : calculated.vision.nightVision) / 100
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
    ['rune-cliff', 'Guardas do Penhasco Sul', 'Guardas do Penhasco Norte', 'medium', 27, 93],
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
    }
  })
}

function getCampStats(strength: CampStrength) {
  if (strength === 'strong') return { hp: 980, damage: 76, range: 4.2, level: 3 }
  if (strength === 'medium') return { hp: 760, damage: 58, range: 3.8, level: 2 }
  return { hp: 540, damage: 40, range: 3.3, level: 1 }
}

function getCampRewards(camp: Camp, time: number) {
  const base = camp.strength === 'strong'
    ? { gold: 34, xp: 18 }
    : camp.strength === 'medium'
      ? { gold: 24, xp: 12 }
      : { gold: 14, xp: 7 }
  const timeScale = 1 + Math.min(0.75, time / 1200)

  return {
    gold: Math.round(base.gold * timeScale),
    xp: Math.round(base.xp * timeScale),
  }
}

function campStrengthLabel(strength: CampStrength) {
  if (strength === 'strong') return 'forte'
  if (strength === 'medium') return 'medio'
  return 'fraco'
}

function createTowers(): Tower[] {
  const towerData: Array<[TeamId, LaneId, 1 | 2 | 3, number, number]> = [
    ['dawn', 'top', 1, 22, 38],
    ['dawn', 'top', 2, 16, 62],
    ['dawn', 'mid', 1, 38, 62],
    ['dawn', 'mid', 2, 24, 76],
    ['dawn', 'bot', 1, 55, 80],
    ['dawn', 'bot', 2, 29, 88],
    ['dawn', 'top', 3, 7, 78],
    ['dawn', 'bot', 3, 18, 91],
    ['dusk', 'top', 1, 45, 20],
    ['dusk', 'top', 2, 72, 12],
    ['dusk', 'mid', 1, 62, 38],
    ['dusk', 'mid', 2, 76, 24],
    ['dusk', 'bot', 1, 78, 62],
    ['dusk', 'bot', 2, 84, 38],
    ['dusk', 'top', 3, 82, 9],
    ['dusk', 'bot', 3, 93, 22],
  ]

  return towerData.map(([team, lane, tier, x, y]) => ({
    id: `${team}-${lane}-t${tier}`,
    team,
    lane,
    tier,
    pos: { x, y },
    hp: tier === 1 ? 1700 : tier === 2 ? 2200 : 2600,
    maxHp: tier === 1 ? 1700 : tier === 2 ? 2200 : 2600,
    damage: tier === 1 ? 92 : tier === 2 ? 122 : 145,
    range: tier === 3 ? 9.5 : 9,
    lastAttack: -10,
  }))
}

function spawnWave(state: SimulationState): Creep[] {
  const waveNumber = Math.floor(state.time / 30)
  return (['dawn', 'dusk'] as TeamId[]).flatMap((team) =>
    (['top', 'mid', 'bot'] as LaneId[]).flatMap((lane) =>
      Array.from({ length: 4 }, (_, index) => ({
        id: `${team}-${lane}-${waveNumber}-${index}`,
        team,
        lane,
        type: index === 3 ? 'mage' : 'melee',
        pos: spreadPoint(lanePaths[team][lane][0], index),
        pathIndex: 1,
        hp: index === 3 ? 260 : 190,
        maxHp: index === 3 ? 260 : 190,
        damage: index === 3 ? 46 : 30,
        range: index === 3 ? 4.2 : 1.25,
        visionRange: index === 3 ? 13 : 11,
        lastAttack: -10,
      })),
    ),
  )
}

function tick(state: SimulationState, delta: number, shouldDecide: boolean): SimulationState {
  if (state.winner) return state

  let next: SimulationState = structuredClone(state)
  next.time = Number((next.time + delta).toFixed(3))
  if (next.time >= next.nextWave) {
    next.creeps.push(...spawnWave(next))
    next.nextWave += 30
  }
  next.effects = next.effects.filter((effect) => next.time - effect.createdAt < effect.duration)
  next.deathMarkers = next.deathMarkers.filter((marker) => marker.expiresAt > next.time)
  next.teamAuras = Object.fromEntries(
    Object.entries(next.teamAuras).filter(([, aura]) => aura && aura.expiresAt > next.time),
  ) as Partial<Record<TeamId, TeamAura>>
  const dayCycle = getDayCycle(next.time)
  next.arcanes = next.arcanes.map((arcane) => ({
    ...arcane,
    visionRange: getArcaneDefinitionVisionRange(arcane.heroDefinitionId, dayCycle),
  }))
  next.arcanes = next.arcanes.map((arcane, index) => respawnArcaneIfReady(arcane, next.time, index))

  next.camps = next.camps.map((camp) => {
    if (camp.hp > 0 || camp.respawn > next.time) return camp
    return { ...camp, hp: camp.maxHp, lastHitBy: undefined }
  })
  next.boss = updateBoss(next.boss, next.time, delta)

  if (shouldDecide) {
    next = updateTeamCalls(next)
  }

  next.arcanes = next.arcanes.map((arcane) => updateArcaneMovement(arcane, next, delta, shouldDecide))
  next.creeps = next.creeps.map((creep) => updateCreepMovement(creep, next, delta))
  next = resolveCombat(next)
  next = resolveDeaths(next)
  next.winner = next.bases.find((base) => base.hp <= 0)?.team === 'dawn' ? 'dusk' : next.bases.find((base) => base.hp <= 0)?.team === 'dusk' ? 'dawn' : undefined
  return next
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
    decision: 'Renasceu na base',
    stats: {
      ...arcane.stats,
      hp: arcane.stats.maxHp,
      mana: arcane.stats.maxMana,
    },
  }
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
  if (call.kind === 'tower') return state.towers.some((tower) => tower.id === call.targetId && tower.hp > 0)
  if (call.kind === 'boss') return state.boss.id === call.targetId && state.boss.hp > 0
  return state.arcanes.some((arcane) => arcane.id === call.targetId && arcane.stats.hp > 0 && arcane.respawn <= state.time)
}

function createTeamCall(state: SimulationState, caller: Arcane, phase: GamePhase): TeamCall | undefined {
  const objectives: Array<{ kind: TeamObjectiveKind; targetId: string; targetName: string; pos: Point; score: number }> = []
  const visibleEnemies = state.arcanes.filter((enemy) => (
    enemy.team !== caller.team &&
    enemy.stats.hp > 0 &&
    enemy.respawn <= state.time &&
    isPointVisibleToTeam(state, caller.team, enemy.pos)
  ))

  const vulnerableEnemy = visibleEnemies
    .map((enemy) => {
      const hpRatio = enemy.stats.hp / enemy.stats.maxHp
      const unsafePenalty = isUnsafeUnderEnemyTower(state, caller.team, enemy.pos, enemy.lane) ? 28 : 0
      const distancePenalty = distance(caller.pos, enemy.pos) * 1.15
      return {
        enemy,
        score: 92 - hpRatio * 68 - distancePenalty - unsafePenalty + (phase === 'late' ? 14 : 0),
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

  const towerTarget = state.towers
    .filter((tower) => tower.team !== caller.team && tower.hp > 0)
    .map((tower) => {
      const alliedWave = nearest(tower.pos, state.creeps.filter((creep) => creep.team === caller.team && creep.lane === tower.lane), 11)
      const outerPriority = tower.tier === 1 ? 22 : tower.tier === 2 ? 12 : 4
      const laneBonus = tower.lane === caller.lane ? 10 : 0
      const waveBonus = alliedWave ? 22 : 0
      const hpBonus = (1 - tower.hp / tower.maxHp) * 18
      return {
        tower,
        score: 46 + outerPriority + laneBonus + waveBonus + hpBonus - distance(caller.pos, tower.pos) * 0.55,
      }
    })
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

  const bossTarget = state.boss.hp > 0
    ? {
      boss: state.boss,
      score: 58 + (phase === 'late' ? 22 : 0) - distance(caller.pos, state.boss.pos) * 0.42,
    }
    : undefined

  if (bossTarget && bossTarget.score > 38) {
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

  if (!bestObjective || bestObjective.score < 58) return undefined

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
  if (call.kind === 'boss') return state.boss.id === call.targetId && state.boss.hp > 0 ? mapEdgeApproachPoint(state.boss.pos) : undefined
  return state.arcanes.find((arcane) => arcane.id === call.targetId && arcane.stats.hp > 0 && arcane.respawn <= state.time)?.pos
}

function getGankTarget(state: SimulationState, arcane: Arcane, visibleEnemies: Arcane[], targetThreatLimit: number) {
  if (getGamePhase(state.time) !== 'early') return undefined
  if (arcane.stats.hp / arcane.stats.maxHp < 0.58) return undefined
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
      const score = roleBias +
        (1 - hpRatio) * 42 +
        (allyNearTarget ? 18 : 0) +
        (enemy.lane === 'mid' ? 5 : 0) +
        arcane.aggression * 0.16 -
        travelDistance * 0.62 -
        laneLeashPenalty -
        Math.max(0, targetDanger - targetThreatLimit) * 1.35

      return { enemy, score, targetDanger }
    })
    .filter(({ score, targetDanger }) => score >= 35 && targetDanger <= targetThreatLimit + 12)
    .sort((a, b) => b.score - a.score)[0]?.enemy
}

function getRotateTarget(state: SimulationState, arcane: Arcane, visibleEnemies: Arcane[], targetThreatLimit: number) {
  const phase = getGamePhase(state.time)
  if (arcane.role !== 'Mid' || phase === 'late') return undefined
  if (arcane.stats.hp / arcane.stats.maxHp < 0.55) return undefined
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
      const score =
        24 +
        (phase === 'mid' ? 10 : 0) +
        (1 - hpRatio) * 40 +
        (allyNearTarget ? 18 : 0) +
        (alliedPressure ? 8 : 0) +
        arcane.aggression * 0.14 -
        travelDistance * 0.52 -
        Math.max(0, targetDanger - targetThreatLimit) * 1.25

      return { enemy, score, targetDanger }
    })
    .filter(({ score, targetDanger }) => score >= 34 && targetDanger <= targetThreatLimit + 12)
    .sort((a, b) => b.score - a.score)[0]?.enemy
}

function getInitiateTarget(state: SimulationState, arcane: Arcane, visibleEnemies: Arcane[], targetThreatLimit: number) {
  const phase = getGamePhase(state.time)
  if (arcane.role !== 'Offlane' || phase === 'early') return undefined
  if (arcane.stats.hp / arcane.stats.maxHp < 0.68) return undefined

  const alliesReady = state.arcanes.filter((ally) => (
    ally.team === arcane.team &&
    ally.id !== arcane.id &&
    ally.stats.hp > 0 &&
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
      const score =
        28 +
        (phase === 'late' ? 12 : 0) +
        enemyCluster * 12 +
        allyCluster * 10 +
        arcane.aggression * 0.22 -
        distance(arcane.pos, enemy.pos) * 0.7 -
        Math.max(0, targetDanger - targetThreatLimit - 8) * 1.1

      return { enemy, score, targetDanger }
    })
    .filter(({ score, targetDanger }) => score >= 48 && targetDanger <= targetThreatLimit + 24)
    .sort((a, b) => b.score - a.score)[0]?.enemy
}

function updateArcaneMovement(arcane: Arcane, state: SimulationState, delta: number, shouldDecide: boolean): Arcane {
  if (arcane.respawn > state.time) return { ...arcane, decision: `Respawn em ${Math.ceil(arcane.respawn - state.time)}s` }
  if (arcane.stats.hp <= 0) return arcane

  let target = arcane.target
  let decision = arcane.decision
  let pathIndex = arcane.pathIndex
  const ownBase = teamInfo[arcane.team].base
  const path = lanePaths[arcane.team][arcane.lane]
  const phase = getGamePhase(state.time)
  const atBase = distance(arcane.pos, ownBase) < baseServiceRange
  const canBuyAtBase = atBase && affordableShopItem(arcane) !== undefined
  const isSupport = arcane.role.includes('Support')

  if (shouldDecide) {
    const visibleEnemies = state.arcanes.filter((other) => (
      other.team !== arcane.team &&
      other.stats.hp > 0 &&
      other.respawn <= state.time &&
      isPointVisibleToTeam(state, arcane.team, other.pos)
    ))
    const dangerScore = getDangerScore(state, arcane, visibleEnemies)
    const actionDanger = getEnemyActionThreatScore(state, arcane, arcane.pos, visibleEnemies)
    const targetThreatLimit = Math.min(78, 42 + arcane.aggression * 0.38 + (phase === 'late' ? 12 : phase === 'mid' ? 8 : 0))
    const laneAnchor = nearestLanePoint(arcane.pos, path)
    const laneDistance = distance(arcane.pos, laneAnchor)
    const shouldRespectLane = phase === 'early' && laneDistance > (isSupport ? 14 : 8) && !atBase
    const safeEnemyCreeps = state.creeps.filter((creep) => (
      creep.team !== arcane.team &&
      (phase !== 'early' || creep.lane === arcane.lane) &&
      !isUnsafeUnderEnemyTower(state, arcane.team, creep.pos, creep.lane) &&
      !isTooDeepForAggression(state, arcane, creep.pos, creep.lane, phase) &&
      getEnemyActionThreatScore(state, arcane, creep.pos, visibleEnemies) <= targetThreatLimit
    ))
    const nearbyEnemy = nearest(
      arcane.pos,
      visibleEnemies.filter((enemy) => (
        !isUnsafeUnderEnemyTower(state, arcane.team, enemy.pos, enemy.lane) &&
        !isTooDeepForAggression(state, arcane, enemy.pos, enemy.lane, phase) &&
        getEnemyActionThreatScore(state, arcane, enemy.pos, visibleEnemies) <= targetThreatLimit + 5
      )),
      phase === 'early' ? 8 : phase === 'mid' ? 13 : 16,
    )
    const gankTarget = getGankTarget(state, arcane, visibleEnemies, targetThreatLimit)
    const rotateTarget = getRotateTarget(state, arcane, visibleEnemies, targetThreatLimit)
    const initiateTarget = getInitiateTarget(state, arcane, visibleEnemies, targetThreatLimit)
    const laneCreep = nearest(arcane.pos, safeEnemyCreeps.filter((creep) => creep.lane === arcane.lane), phase === 'early' ? 13 : 10)
    const distantLaneCreep = nearest(arcane.pos, safeEnemyCreeps, phase === 'early' ? 18 : phase === 'mid' ? 28 : 34)
    const enemyTower = nearest(arcane.pos, state.towers.filter((tower) => tower.team !== arcane.team && tower.hp > 0 && tower.lane === arcane.lane), 12)
    const blockingTower = nearest(arcane.pos, state.towers.filter((tower) => tower.team !== arcane.team && tower.hp > 0 && tower.lane === arcane.lane), 25)
    const alliedLaneCreep = nearest(arcane.pos, state.creeps.filter((creep) => creep.team === arcane.team && creep.lane === arcane.lane), 24)
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
    const alliedLaneCreepNearTower = nearest(
      (enemyTower ?? blockingTower)?.pos ?? arcane.pos,
      state.creeps.filter((creep) => creep.team === arcane.team && creep.lane === arcane.lane),
      8,
    )
    const weakCamp = nearest(arcane.pos, state.camps.filter((camp) => camp.hp > 0), phase === 'early' ? isSupport ? 10 : 6 : isSupport ? 9 : 12)
    const economyCamp = nearest(arcane.pos, state.camps.filter((camp) => camp.hp > 0), phase === 'early' ? isSupport ? 16 : 9 : isSupport ? 15 : 22)
    const lowHp = arcane.stats.hp / arcane.stats.maxHp < 0.28
    const towerThreat = nearest(arcane.pos, state.towers.filter((tower) => tower.team !== arcane.team && tower.hp > 0), 10.5)
    const towerDiveRisk = towerThreat && (!alliedLaneCreepNearTower || arcane.stats.hp / arcane.stats.maxHp < 0.72)
    const advanceBlockedByTower = blockingTower && !alliedLaneCreepNearTower
    const needsBaseRecovery = atBase && (
      arcane.stats.hp < arcane.stats.maxHp * 0.94 ||
      arcane.stats.mana < arcane.stats.maxMana * 0.82 ||
      canBuyAtBase
    )
    const teamCall = state.teamCalls[arcane.team]
    const teamCallPoint = teamCall ? getTeamCallPoint(state, teamCall) : undefined
    const callerArcane = teamCall ? state.arcanes.find((ally) => ally.id === teamCall.callerId && ally.stats.hp > 0 && ally.respawn <= state.time) : undefined

    if (needsBaseRecovery) {
      target = ownBase
      decision = canBuyAtBase ? 'Comprando itens na base' : 'Regenerando na base'
    } else if (lowHp || dangerScore >= 76 || actionDanger >= 88) {
      target = ownBase
      decision = dangerScore >= 76 || actionDanger >= 88 ? 'Recuando por perigo alto' : 'Recuando para curar'
    } else if (towerDiveRisk) {
      target = safeLaneRetreatPoint(arcane, path, towerThreat)
      decision = 'Saindo do alcance da torre'
    } else if (allyToDefend) {
      target = allyToDefend.pos
      decision = `Defendendo ${allyToDefend.player}`
    } else if (initiateTarget) {
      target = initiateTarget.pos
      decision = `Iniciando luta em ${initiateTarget.name}`
    } else if (teamCall && teamCallPoint && phase !== 'early') {
      const gatherPoint = callerArcane?.pos ?? teamCallPoint
      const isCaller = teamCall.callerId === arcane.id
      const farFromCaller = !isCaller && distance(arcane.pos, gatherPoint) > 9 && distance(arcane.pos, teamCallPoint) > 7
      target = farFromCaller ? gatherPoint : teamCallPoint
      decision = isCaller
        ? `Chamando time: ${teamCall.targetName}`
        : farFromCaller
          ? `Juntando com o time: ${teamCall.targetName}`
          : `Fazendo objetivo: ${teamCall.targetName}`
    } else if (gankTarget) {
      target = gankTarget.pos
      decision = `Gank em ${gankTarget.player}`
    } else if (rotateTarget) {
      target = rotateTarget.pos
      decision = `Ajudando side lane: ${laneNames[rotateTarget.lane]}`
    } else if (nearbyEnemy && nearbyEnemy.stats.hp / nearbyEnemy.stats.maxHp < 0.65) {
      target = nearbyEnemy.pos
      decision = `Pressionando ${nearbyEnemy.name}`
    } else if (laneCreep) {
      target = laneCreep.pos
      decision = 'Farmando wave'
    } else if (weakCamp && (phase !== 'early' ? arcane.role === 'Safe Lane' || arcane.role === 'Greedy Support' : isSupport && arcane.stats.hp / arcane.stats.maxHp > 0.7)) {
      target = mapEdgeApproachPoint(weakCamp.pos)
      decision = 'Limpando campo neutro'
    } else if (enemyTower && alliedLaneCreepNearTower && arcane.stats.hp / arcane.stats.maxHp > 0.74) {
      target = enemyTower.pos
      decision = `Batendo torre T${enemyTower.tier}`
    } else if (distantLaneCreep && !towerThreat) {
      target = distantLaneCreep.pos
      decision = 'Acumulando patrimonio na rota'
    } else if (economyCamp && (phase !== 'early' || isSupport) && !towerThreat && arcane.stats.hp / arcane.stats.maxHp > 0.55) {
      target = mapEdgeApproachPoint(economyCamp.pos)
      decision = 'Acumulando patrimonio na selva'
    } else if (advanceBlockedByTower && alliedLaneCreep) {
      target = alliedLaneCreep.pos
      decision = 'Escoltando creeps aliadas'
    } else if (advanceBlockedByTower && blockingTower) {
      target = safeLaneRetreatPoint(arcane, path, blockingTower)
      decision = 'Aguardando wave aliada'
    } else if (shouldRespectLane) {
      target = laneAnchor
      decision = 'Priorizando rota no early game'
    } else {
      target = path[pathIndex]
      decision = 'Avancando rota'
    }
  }

  if (decision === 'Avancando rota') {
    target = path[pathIndex]
    if (distance(arcane.pos, formationPoint(target, arcane.id)) < 2.2 && pathIndex < path.length - 1) {
      pathIndex += 1
      target = path[pathIndex]
    }
  }

  const shoppedArcane = shouldDecide && atBase ? buyItemAtBase(arcane) : arcane
  const hpRegen = atBase ? 180 * delta : 0
  const manaRegen = atBase ? 150 * delta : 1.5 * delta
  const auraMultiplier = getAuraMultiplier(state, arcane.team)

  return {
    ...shoppedArcane,
    pathIndex,
    target,
    decision: shoppedArcane.items.length > arcane.items.length ? 'Comprou item na base' : decision,
    pos: moveToward(arcane.pos, formationPoint(target, arcane.id), shoppedArcane.stats.moveSpeed * auraMultiplier * delta),
    stats: {
      ...shoppedArcane.stats,
      hp: Math.min(shoppedArcane.stats.maxHp, shoppedArcane.stats.hp + hpRegen),
      mana: Math.min(shoppedArcane.stats.maxMana, shoppedArcane.stats.mana + manaRegen),
    },
  }
}

function buyItemAtBase(arcane: Arcane): Arcane {
  if (arcane.items.length >= 6) return arcane
  const item = affordableShopItem(arcane)
  if (!item) return arcane

  return {
    ...arcane,
    items: [...arcane.items, item.name],
    stats: {
      ...arcane.stats,
      gold: arcane.stats.gold - item.cost,
      damage: arcane.stats.damage + item.damage,
      maxHp: arcane.stats.maxHp + item.maxHp,
      hp: arcane.stats.hp + item.maxHp,
      maxMana: arcane.stats.maxMana + item.maxMana,
      mana: arcane.stats.mana + item.maxMana,
    },
  }
}

function affordableShopItem(arcane: Arcane) {
  if (arcane.items.length >= 6) return undefined
  return shopCatalog.find((candidate) => !arcane.items.includes(candidate.name) && arcane.stats.gold >= candidate.cost)
}

function updateCreepMovement(creep: Creep, state: SimulationState, delta: number): Creep {
  if (getRouteCreepTarget(creep, state, 'attack')) {
    return creep
  }

  const visibleTarget = getRouteCreepTarget(creep, state, 'vision')
  if (visibleTarget) {
    return { ...creep, pos: moveToward(creep.pos, visibleTarget.pos, 4.2 * delta) }
  }

  const path = lanePaths[creep.team][creep.lane]
  let pathIndex = creep.pathIndex
  if (distance(creep.pos, formationPoint(path[pathIndex], creep.id)) < 1.8 && pathIndex < path.length - 1) {
    pathIndex += 1
  }
  return { ...creep, pathIndex, pos: moveToward(creep.pos, formationPoint(path[pathIndex], creep.id), 4.2 * delta) }
}

function getRouteCreepTarget(creep: Creep, state: SimulationState, mode: 'attack' | 'vision' = 'attack') {
  const structureRange = creep.type === 'melee' ? 3.2 : creep.range
  const visionRange = getCreepVisionRange(creep)
  const unitRange = mode === 'attack' ? creep.range : visionRange
  const objectiveRange = mode === 'attack' ? structureRange : visionRange
  const aggroTarget = creep.aggroUntil && creep.aggroUntil > state.time
    ? state.arcanes.find((arcane) => (
      arcane.id === creep.aggroTargetId &&
      arcane.stats.hp > 0 &&
      arcane.respawn <= state.time &&
      distance(creep.pos, arcane.pos) <= unitRange &&
      isNearRoute(arcane.pos, lanePaths[creep.team][creep.lane], 12)
    ))
    : undefined
  if (aggroTarget) return aggroTarget

  const enemyCreep = nearest(
    creep.pos,
    state.creeps.filter((other) => other.team !== creep.team && other.lane === creep.lane),
    unitRange,
  )
  if (enemyCreep) return enemyCreep

  return nearest(
    creep.pos,
    state.arcanes.filter((arcane) => (
      arcane.team !== creep.team &&
      arcane.stats.hp > 0 &&
      arcane.respawn <= state.time &&
      isNearRoute(arcane.pos, lanePaths[creep.team][creep.lane], 12)
    )),
    unitRange,
  ) ?? nearest(creep.pos, [
    ...state.towers.filter((tower) => tower.team !== creep.team && tower.hp > 0 && tower.lane === creep.lane),
    ...state.bases.filter((base) => base.team !== creep.team && base.hp > 0),
  ], objectiveRange)
}

function resolveCombat(state: SimulationState): SimulationState {
  const next = structuredClone(state)

  next.creeps.forEach((creep) => {
    const target = getRouteCreepTarget(creep, next, 'attack')
    if (target && next.time - creep.lastAttack >= 1.25) {
      creep.lastAttack = next.time
      next.effects = addAttackEffect(next.effects, {
        kind: 'creep',
        team: creep.team,
        from: creep.pos,
        to: target.pos,
        createdAt: next.time,
      })
      damageEntity(next, target.id, creep.damage, {
        id: creep.id,
        label: `Creep de ${laneNames[creep.lane]}`,
        team: creep.team,
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
        team: tower.team,
        from: tower.pos,
        to: target.pos,
        createdAt: next.time,
      })
      damageEntity(next, target.id, tower.damage, {
        id: tower.id,
        label: `Torre T${tower.tier}`,
        team: tower.team,
      })
    }
  })

  next.camps.filter((camp) => camp.hp > 0).forEach((camp) => {
    const target = nearest(camp.pos, next.arcanes.filter((arcane) => arcane.stats.hp > 0 && arcane.respawn <= next.time), camp.range)
    if (target && next.time - camp.lastAttack >= 1.35) {
      camp.lastAttack = next.time
      next.effects = addAttackEffect(next.effects, {
        kind: 'neutral',
        team: target.team === 'dawn' ? 'dusk' : 'dawn',
        from: camp.pos,
        to: target.pos,
        createdAt: next.time,
      })
      damageEntity(next, target.id, camp.damage, {
        id: camp.id,
        label: camp.name,
        team: target.team === 'dawn' ? 'dusk' : 'dawn',
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
        team: target.team === 'dawn' ? 'dusk' : 'dawn',
        from: next.boss.pos,
        to: target.pos,
        createdAt: next.time,
      })
      damageEntity(next, target.id, next.boss.damage, {
        id: next.boss.id,
        label: next.boss.name,
        team: target.team === 'dawn' ? 'dusk' : 'dawn',
      })
    }
  }

  next.arcanes.forEach((arcane) => {
    if (arcane.stats.hp <= 0 || arcane.respawn > next.time) return
    const canAttackBoss = next.boss.hp > 0 && (
      arcane.decision.includes(next.boss.name) ||
      next.boss.aggroTargetId === arcane.id
    )
    const target = nearest(arcane.pos, [
      ...next.arcanes.filter((other) => other.team !== arcane.team && other.stats.hp > 0 && other.respawn <= next.time),
      ...next.creeps.filter((creep) => creep.team !== arcane.team),
      ...next.towers.filter((tower) => tower.team !== arcane.team && tower.hp > 0),
      ...next.bases.filter((base) => base.team !== arcane.team && base.hp > 0),
      ...next.camps.filter((camp) => camp.hp > 0),
      ...(canAttackBoss ? [next.boss] : []),
    ], arcane.stats.range)
    if (target && next.time - arcane.lastAttack >= arcane.stats.attackSpeed) {
      arcane.lastAttack = next.time
      if ('player' in target) {
        applyTowerAggro(next, target.team, arcane.id)
        applyCreepAggro(next, target.team, arcane.id)
      }
      next.effects = addAttackEffect(next.effects, {
        kind: 'arcane',
        team: arcane.team,
        from: arcane.pos,
        to: target.pos,
        createdAt: next.time,
      })
      damageEntity(next, target.id, Math.round(arcane.stats.damage * getAuraMultiplier(next, arcane.team)), {
        id: arcane.id,
        label: arcane.player,
        team: arcane.team,
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
  return creep.type === 'mage' ? 12 : 8
}

function getCreepXpReward(creep: Creep) {
  return creep.type === 'mage' ? 24 : 18
}

function getCreepVisionRange(creep: Creep) {
  return creep.visionRange ?? (creep.type === 'mage' ? 13 : 11)
}

function getCreepXpRecipients(state: SimulationState, creep: Creep) {
  return state.arcanes.filter((arcane) => (
    arcane.team !== creep.team &&
    arcane.stats.hp > 0 &&
    arcane.respawn <= state.time &&
    distance(arcane.pos, creep.pos) <= getCreepVisionRange(creep)
  ))
}

function resolveDeaths(state: SimulationState): SimulationState {
  const next = structuredClone(state)
  const deadCreeps = next.creeps.filter((creep) => creep.hp <= 0)
  const deadCreepIds = new Set(deadCreeps.map((creep) => creep.id))
  const deadCamps = next.camps.filter((camp) => camp.hp <= 0 && camp.respawn <= next.time)
  const deadBoss = next.boss.hp <= 0 && next.boss.respawn <= next.time ? next.boss : undefined
  const deadArcanes = next.arcanes.filter((arcane) => arcane.stats.hp <= 0 && arcane.respawn <= next.time)

  if (deadCreeps.length) {
    next.arcanes = next.arcanes.map((arcane) => {
      const creepRewards = deadCreeps.reduce((total, creep) => {
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
      return {
        ...arcane,
        stats: {
          ...arcane.stats,
          gold: arcane.stats.gold + creepRewards.gold,
          xp: arcane.stats.xp + creepRewards.xp,
        },
      }
    })
    next.creeps = next.creeps.filter((creep) => !deadCreepIds.has(creep.id))
  }

  if (deadCamps.length) {
    next.camps = next.camps.map((camp) => camp.hp <= 0 ? { ...camp, respawn: next.time + 60 } : camp)
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
      return { ...arcane, stats: { ...arcane.stats, gold: arcane.stats.gold + reward.gold, xp: arcane.stats.xp + reward.xp } }
    })
  }

  if (deadBoss?.lastHitBy) {
    const rewardTeam = deadBoss.lastHitBy.team
    next.boss = { ...deadBoss, hp: 0, respawn: next.time + 60 }
    next.teamAuras[rewardTeam] = {
      name: `${deadBoss.name} +20%`,
      attributeMultiplier: 1.2,
      expiresAt: next.time + 120,
    }
    next.arcanes = next.arcanes.map((arcane) => {
      if (arcane.team !== rewardTeam) return arcane
      return {
        ...arcane,
        stats: {
          ...arcane.stats,
          gold: arcane.stats.gold + 120,
          xp: arcane.stats.xp + 60,
        },
      }
    })
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
    deadArcanes.forEach((arcane) => {
      const killerTeam: TeamId = arcane.team === 'dawn' ? 'dusk' : 'dawn'
      next.kills[killerTeam] += 1
      const killer = arcane.lastHitBy ?? { label: teamInfo[killerTeam].name, team: killerTeam }
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
        detail: `${teamInfo[killer.team].short} eliminou ${arcane.name}`,
      })
    })
    next.arcanes = next.arcanes.map((arcane) => {
      if (arcane.stats.hp > 0) return arcane
      return {
        ...arcane,
        respawn: next.time + getArcaneRespawnDuration(arcane.stats.level),
        lastHitBy: undefined,
        decision: 'Aguardando respawn',
        stats: { ...arcane.stats, hp: 0, mana: 0 },
      }
    })
  }

  next.arcanes = next.arcanes.map((arcane) => {
    if (arcane.stats.xp < arcane.stats.level * 100) return arcane
    const nextLevel = arcane.stats.level + 1
    const hpRatio = arcane.stats.maxHp > 0 ? arcane.stats.hp / arcane.stats.maxHp : 1
    const manaRatio = arcane.stats.maxMana > 0 ? arcane.stats.mana / arcane.stats.maxMana : 1
    return {
      ...arcane,
      stats: buildArcaneStats(arcane.heroDefinitionId, nextLevel, arcane.stats.gold, arcane.stats.xp, hpRatio, manaRatio),
    }
  })

  return next
}

function damageEntity(state: SimulationState, id: string, damage: number, source: CombatSource) {
  const hit = (value: number) => Math.max(0, value - damage)
  state.creeps = state.creeps.map((creep) => creep.id === id ? { ...creep, hp: hit(creep.hp), lastHitBy: source } : creep)
  state.towers = state.towers.map((tower) => tower.id === id ? { ...tower, hp: hit(tower.hp) } : tower)
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
    ...effects.slice(-44),
    {
      ...effect,
      id: `${effect.kind}-${effect.team}-${effect.createdAt}-${effects.length}`,
      duration,
    },
  ]
}

function App() {
  const [state, setState] = useState(createInitialState)
  const [running, setRunning] = useState(true)
  const [speed, setSpeed] = useState(1)
  const [selected, setSelected] = useState<Selected>({ kind: 'arcane', id: 'd-quasar' })
  const [eventLogCollapsed, setEventLogCollapsed] = useState(false)
  const [eventLogOffset, setEventLogOffset] = useState({ x: 0, y: 0 })
  const lastFrame = useRef<number | null>(null)
  const decisionAccumulator = useRef(0)
  const phase = getGamePhase(state.time)
  const dayCycle = getDayCycle(state.time)

  useEffect(() => {
    if (!running) {
      lastFrame.current = null
      return undefined
    }

    let frameId = 0
    function animate(now: number) {
      if (lastFrame.current === null) {
        lastFrame.current = now
      }

      const elapsed = Math.min(0.08, ((now - lastFrame.current) / 1000) * speed)
      lastFrame.current = now

      if (elapsed > 0) {
        decisionAccumulator.current += elapsed
        const shouldDecide = decisionAccumulator.current >= 0.5
        if (shouldDecide) {
          decisionAccumulator.current %= 0.5
        }
        setState((current) => tick(current, elapsed, shouldDecide))
      }

      frameId = window.requestAnimationFrame(animate)
    }

    frameId = window.requestAnimationFrame(animate)
    return () => window.cancelAnimationFrame(frameId)
  }, [running, speed])

  const selectedEntity = useMemo(() => findSelected(state, selected), [selected, state])
  const teamGold = useMemo(() => ({
    dawn: state.arcanes
      .filter((arcane) => arcane.team === 'dawn')
      .reduce((total, arcane) => total + arcane.stats.gold, 0),
    dusk: state.arcanes
      .filter((arcane) => arcane.team === 'dusk')
      .reduce((total, arcane) => total + arcane.stats.gold, 0),
  }), [state.arcanes])

  return (
    <main className="sim-shell">
      <header className="scorebar">
        <TeamBadge team="dawn" side="left" />
        <ScoreStat team="dawn" icon="gold" value={`${teamGold.dawn}g`} label="Ouro Aurora Forge" />
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
        <ScoreStat team="dusk" icon="gold" value={`${teamGold.dusk}g`} label="Ouro Crimson Veil" reverse />
        <TeamBadge team="dusk" side="right" />
      </header>

      <section className="sim-layout">
        <TeamPanel
          arcanes={state.arcanes.filter((arcane) => arcane.team === 'dawn')}
          selected={selected}
          team="dawn"
          time={state.time}
          onSelect={setSelected}
        />
        <MapPanel
          eventLogCollapsed={eventLogCollapsed}
          eventLogOffset={eventLogOffset}
          dayCycle={dayCycle}
          onEventLogCollapsedChange={setEventLogCollapsed}
          onEventLogOffsetChange={setEventLogOffset}
          state={state}
          selected={selected}
          onSelect={setSelected}
        />
        <TeamPanel
          arcanes={state.arcanes.filter((arcane) => arcane.team === 'dusk')}
          selected={selected}
          team="dusk"
          time={state.time}
          onSelect={setSelected}
        />
      </section>

      <footer className="inspector">
        <div className="sim-controls">
          <button type="button" onClick={() => setRunning((value) => !value)} title={running ? 'Pausar' : 'Continuar'}>
            {running ? <Pause size={17} /> : <Play size={17} />}
          </button>
          <button type="button" onClick={() => setState(createInitialState())} title="Reiniciar partida">
            <RotateCcw size={17} />
          </button>
          <label>
            Velocidade
            <select value={speed} onChange={(event) => setSpeed(Number(event.target.value))}>
              <option value={0.5}>0.5x</option>
              <option value={1}>1x</option>
              <option value={2}>2x</option>
              <option value={4}>4x</option>
            </select>
          </label>
        </div>
        <Inspector entity={selectedEntity} state={state} />
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
  time,
  arcanes,
  selected,
  onSelect,
}: {
  team: TeamId
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
      <div className="arcane-list">
        {arcanes.map((arcane) => {
          const respawnRemaining = Math.max(0, Math.ceil(arcane.respawn - time))
          const nextLevelXp = arcane.stats.level * 100
          const currentLevelXp = Math.min(nextLevelXp, arcane.stats.xp)
          return (
            <button
              className={selected.kind === 'arcane' && selected.id === arcane.id ? 'arcane-row selected' : 'arcane-row'}
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
                <div className="portrait-xp" title={`${arcane.stats.xp} / ${nextLevelXp} XP`}>
                  <Meter value={currentLevelXp} max={nextLevelXp} tone="xp" />
                  <span>XP {arcane.stats.xp}/{nextLevelXp}</span>
                </div>
                <span className="portrait-gold" title={`${arcane.stats.gold} ouro`}>
                  <Coins size={12} />
                  {arcane.stats.gold}
                </span>
              </div>
              <div className="arcane-readout">
                <div className="name-line">
                  <strong>{arcane.player}</strong>
                  <span>{arcane.name}</span>
                </div>
                <div className="role-line">
                  <em>{arcane.role}</em>
                  <span title={arcane.decision}>{getShortDecision(arcane.decision)}</span>
                </div>
                <Meter value={arcane.stats.hp} max={arcane.stats.maxHp} tone="hp" />
                <Meter value={arcane.stats.mana} max={arcane.stats.maxMana} tone="mana" />
                <div className="slot-row">
                  {Array.from({ length: 6 }, (_, index) => <i key={index}>{arcane.items[index]?.slice(0, 1) ?? ''}</i>)}
                </div>
                <div className="ability-row">
                  {['Q', 'W', 'E', 'R'].map((ability, index) => <b key={ability} className={index === 3 ? 'ultimate' : ''}>{ability}</b>)}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </aside>
  )
}

function MapPanel({
  eventLogCollapsed,
  eventLogOffset,
  dayCycle,
  onEventLogCollapsedChange,
  onEventLogOffsetChange,
  state,
  selected,
  onSelect,
}: {
  eventLogCollapsed: boolean
  eventLogOffset: Point
  dayCycle: DayCycle
  onEventLogCollapsedChange: (collapsed: boolean) => void
  onEventLogOffsetChange: (offset: Point) => void
  state: SimulationState
  selected: Selected
  onSelect: (selected: Selected) => void
}) {
  return (
    <section className={`map-panel ${dayCycle}`} aria-label="Mapa da partida">
      <svg className="map-lines" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <linearGradient id="river" x1="0" x2="1" y1="1" y2="0">
            <stop offset="0%" stopColor="#1a6b83" />
            <stop offset="100%" stopColor="#61d7ff" />
          </linearGradient>
        </defs>
        <path className="river" d="M 6 8 C 27 26, 39 38, 50 50 S 73 74, 94 92" />
        {(['top', 'mid', 'bot'] as LaneId[]).map((lane) => (
          <polyline key={lane} className={`lane-line ${lane}`} points={lanePaths.dawn[lane].map((point) => `${point.x},${point.y}`).join(' ')} />
        ))}
      </svg>

      <span className="lane-label top">Topo</span>
      <span className="lane-label mid">Meio</span>
      <span className="lane-label bot">Baixo</span>

      <AttackRangeOverlay entity={findSelected(state, selected)} />

      {state.effects.map((effect) => (
        <AttackEffectView effect={effect} now={state.time} key={effect.id} />
      ))}
      {state.deathMarkers.map((marker) => (
        <span
          className="death-marker"
          key={marker.id}
          style={{
            ...place(marker.pos),
            '--team': teamInfo[marker.team].primary,
          } as React.CSSProperties}
          title={`${marker.arcane} morreu aqui`}
        >
          <Skull size={18} />
        </span>
      ))}

      {state.bases.map((base) => (
        <MapNode
          key={base.id}
          type="base"
          point={base.pos}
          team={base.team}
          selected={selected.kind === 'base' && selected.id === base.id}
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
          selected={selected.kind === 'tower' && selected.id === tower.id}
          label={`T${tower.tier}`}
          title={`Torre T${tower.tier} ${laneNames[tower.lane]} - ${teamInfo[tower.team].name}`}
          onClick={() => onSelect({ kind: 'tower', id: tower.id })}
        />
      ))}
      {state.camps.map((camp) => (
        <button
          key={camp.id}
          className={selected.kind === 'camp' && selected.id === camp.id ? `camp-node ${camp.strength} selected` : `camp-node ${camp.strength}`}
          style={place(camp.pos)}
          type="button"
          title={`${camp.name} - campo ${campStrengthLabel(camp.strength)}`}
          aria-label={`${camp.name} - campo ${campStrengthLabel(camp.strength)}`}
          onClick={() => onSelect({ kind: 'camp', id: camp.id })}
        >
          <Zap size={12} />
        </button>
      ))}
      {state.boss.hp > 0 && (
        <button
          className={selected.kind === 'boss' && selected.id === state.boss.id ? 'boss-node selected' : 'boss-node'}
          style={place(state.boss.pos)}
          type="button"
          title={state.boss.name}
          aria-label={state.boss.name}
          onClick={() => onSelect({ kind: 'boss', id: state.boss.id })}
        >
          <Zap size={18} />
        </button>
      )}
      {state.creeps.map((creep) => (
        <button
          key={creep.id}
          className={selected.kind === 'creep' && selected.id === creep.id ? `creep-node ${creep.team} selected` : `creep-node ${creep.team}`}
          style={place(creep.pos)}
          type="button"
          title={`${creep.type === 'mage' ? 'Creep mago' : 'Creep corpo a corpo'} ${laneNames[creep.lane]} - ${teamInfo[creep.team].name}`}
          aria-label={`${creep.type === 'mage' ? 'Creep mago' : 'Creep corpo a corpo'} ${laneNames[creep.lane]} - ${teamInfo[creep.team].name}`}
          onClick={() => onSelect({ kind: 'creep', id: creep.id })}
        />
      ))}
      {state.arcanes.filter((arcane) => arcane.respawn === 0 && arcane.stats.hp > 0).map((arcane) => (
        <button
          key={arcane.id}
          className={selected.kind === 'arcane' && selected.id === arcane.id ? 'arcane-token selected' : 'arcane-token'}
          style={{ ...place(arcane.pos), '--team': teamInfo[arcane.team].primary } as React.CSSProperties}
          type="button"
          title={`${arcane.player} - ${arcane.name}`}
          aria-label={`${arcane.player} - ${arcane.name}`}
          onClick={() => onSelect({ kind: 'arcane', id: arcane.id })}
        >
          {arcane.portrait}
        </button>
      ))}
      <EventLog
        collapsed={eventLogCollapsed}
        events={state.events}
        offset={eventLogOffset}
        onCollapsedChange={onEventLogCollapsedChange}
        onOffsetChange={onEventLogOffsetChange}
      />
    </section>
  )
}

function AttackEffectView({ effect, now }: { effect: AttackEffect; now: number }) {
  const dx = effect.to.x - effect.from.x
  const dy = effect.to.y - effect.from.y
  const length = Math.hypot(dx, dy)
  const angle = Math.atan2(dy, dx) * (180 / Math.PI)
  const progress = Math.min(1, Math.max(0, (now - effect.createdAt) / effect.duration))

  return (
    <>
      <span
        className={`attack-effect ${effect.kind} ${effect.team}`}
        style={{
          '--x': `${effect.from.x}%`,
          '--y': `${effect.from.y}%`,
          '--length': `${length}%`,
          '--angle': `${angle}deg`,
          '--progress': progress,
          '--team': teamInfo[effect.team].primary,
        } as React.CSSProperties}
      />
      {effect.kind !== 'creep' && (
        <span
          className={`hit-burst ${effect.kind} ${effect.team}`}
          style={{
            '--x': `${effect.to.x}%`,
            '--y': `${effect.to.y}%`,
            '--progress': progress,
            '--team': teamInfo[effect.team].primary,
          } as React.CSSProperties}
        />
      )}
    </>
  )
}

function AttackRangeOverlay({ entity }: { entity: Arcane | Creep | Tower | Base | Camp | Boss | undefined }) {
  const range = getEntityAttackRange(entity)
  const pos = getEntityPosition(entity)

  if (!entity || !pos || range === undefined || range <= 0) return null

  return (
    <svg className="attack-range-overlay" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <circle cx={pos.x} cy={pos.y} r={range} />
    </svg>
  )
}

function EventLog({
  collapsed,
  events,
  offset,
  onCollapsedChange,
  onOffsetChange,
}: {
  collapsed: boolean
  events: MatchEvent[]
  offset: Point
  onCollapsedChange: (collapsed: boolean) => void
  onOffsetChange: (offset: Point) => void
}) {
  const dragStart = useRef<{ pointerId: number; startX: number; startY: number; origin: Point } | null>(null)

  useEffect(() => {
    function handleMouseMove(event: globalThis.MouseEvent) {
      if (!dragStart.current || dragStart.current.pointerId !== -1) return
      updateDragOffset(event.clientX, event.clientY)
    }

    function handleMouseUp() {
      if (dragStart.current?.pointerId === -1) {
        dragStart.current = null
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  })

  function updateDragOffset(clientX: number, clientY: number) {
    if (!dragStart.current) return
    const nextX = dragStart.current.origin.x + clientX - dragStart.current.startX
    const nextY = dragStart.current.origin.y + clientY - dragStart.current.startY
    onOffsetChange({
      x: Math.max(-820, Math.min(24, nextX)),
      y: Math.max(-420, Math.min(18, nextY)),
    })
  }

  function handleMouseDown(event: MouseEvent<HTMLElement>) {
    dragStart.current = {
      pointerId: -1,
      startX: event.clientX,
      startY: event.clientY,
      origin: offset,
    }
  }

  function handlePointerDown(event: PointerEvent<HTMLElement>) {
    dragStart.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      origin: offset,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function handlePointerMove(event: PointerEvent<HTMLElement>) {
    updateDragOffset(event.clientX, event.clientY)
  }

  function handlePointerUp(event: PointerEvent<HTMLElement>) {
    if (dragStart.current?.pointerId === event.pointerId) {
      dragStart.current = null
    }
  }

  return (
    <aside
      className={collapsed ? 'event-log collapsed' : 'event-log'}
      style={{ '--offset-x': `${offset.x}px`, '--offset-y': `${offset.y}px` } as React.CSSProperties}
      aria-label="Eventos importantes"
    >
      <div
        className="event-title"
        onMouseDown={handleMouseDown}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <Swords size={14} />
        {!collapsed && <strong>Eventos</strong>}
        <button
          type="button"
          onMouseDown={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => onCollapsedChange(!collapsed)}
          title={collapsed ? 'Expandir eventos' : 'Minimizar eventos'}
          aria-label={collapsed ? 'Expandir eventos' : 'Minimizar eventos'}
        >
          {collapsed ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </button>
      </div>
      {!collapsed && (
        events.length === 0 ? (
          <p>Aguardando primeiro abate</p>
        ) : (
          <ol>
            {events.map((event) => (
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
        )
      )}
    </aside>
  )
}

function MapNode({
  point,
  team,
  type,
  label,
  title,
  selected,
  onClick,
}: {
  point: Point
  team: TeamId
  type: 'tower' | 'base'
  label?: string
  title: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      className={selected ? `map-node ${type} ${team} selected` : `map-node ${type} ${team}`}
      style={place(point)}
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
    >
      {type === 'tower' ? <TowerControl size={13} /> : <Swords size={16} />}
      {label && <span>{label}</span>}
    </button>
  )
}

function Inspector({ entity, state }: { entity: Arcane | Creep | Tower | Base | Camp | Boss | undefined; state: SimulationState }) {
  if (!entity) return <div className="detail-empty">Selecione um Arcane, torre, base, creep ou campo neutro.</div>

  if ('player' in entity) {
    const calculated = calculateHeroStats(heroDefinitions[entity.heroDefinitionId], entity.stats.level, [])
    const auraMultiplier = getAuraMultiplier(state, entity.team)
    return (
      <div className="detail-panel arcane-detail">
        <Portrait arcane={entity} />
        <div className="detail-title">
          <strong>{entity.player} - {entity.name}</strong>
          <span>{teamInfo[entity.team].name} / {entity.role} / {laneNames[entity.lane]}</span>
        </div>
        <AttributeSummary stats={calculated} />
        <MetricGroup
          title="Recursos"
          items={[
            ['Vida', `${Math.round(entity.stats.hp)} / ${Math.round(entity.stats.maxHp * auraMultiplier)}`],
            ['Mana', `${Math.round(entity.stats.mana)} / ${Math.round(entity.stats.maxMana * auraMultiplier)}`],
            ['Regen', `${calculated.resources.healthRegen.toFixed(1)} / ${calculated.resources.manaRegen.toFixed(1)}`],
          ]}
        />
        <MetricGroup
          title="Ataque"
          items={[
            ['Dano', `${Math.round(entity.stats.damage * auraMultiplier)}`],
            ['Alcance', `${entity.stats.range.toFixed(1)}`],
            ['Atk/s', `${calculated.offense.attacksPerSecond.toFixed(2)}`],
          ]}
        />
        <MetricGroup
          title="Defesa"
          items={[
            ['Armad.', `${calculated.defense.armor.toFixed(1)}`],
            ['Fis.', `${Math.round(calculated.defense.physicalDamageReduction * 100)}%`],
            ['Mag.', `${Math.round(calculated.defense.magicResistance)}%`],
          ]}
        />
        <MetricGroup
          title="Mov/Visao"
          items={[
            ['Move', `${entity.stats.moveSpeed.toFixed(1)}`],
            ['Visao', `${entity.visionRange.toFixed(1)}`],
            ['Turn', `${calculated.movement.turnRate}`],
          ]}
        />
        <MetricGroup
          title="IA"
          items={[
            ['Agr.', `${entity.aggression}`],
            ['Call', `${entity.shotcalling}`],
            ['Perigo', `${getDangerScore(state, entity)}`],
          ]}
        />
        <DecisionSummary decision={entity.decision} />
      </div>
    )
  }

  if ('tier' in entity) {
    return <DetailLine title={`Torre T${entity.tier} - ${laneNames[entity.lane]}`} subtitle={teamInfo[entity.team].name} hp={entity.hp} maxHp={entity.maxHp} damage={entity.damage} attackRange={entity.range} />
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
    const rewards = getCampRewards(entity, 0)
    return (
      <DetailLine
        title={entity.name}
        subtitle={`Campo ${campStrengthLabel(entity.strength)} / nivel ${entity.level} / ${rewards.gold}g ${rewards.xp}xp base`}
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
          <strong>{entity.type === 'mage' ? 'Creep mago' : 'Creep corpo a corpo'} - {laneNames[entity.lane]}</strong>
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

function isBoss(entity: Arcane | Creep | Tower | Base | Camp | Boss): entity is Boss {
  return entity.id === 'boss-world-serpent'
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

function DecisionSummary({ decision }: { decision: string }) {
  return (
    <div className="metric-group decision-summary">
      <span>Decisao</span>
      <div>
        <p>
          <em>Atual</em>
          <strong className="decision-pill" title={decision}>{getShortDecision(decision)}</strong>
        </p>
      </div>
    </div>
  )
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
  return <span className="portrait" style={{ '--team': teamInfo[arcane.team].primary } as React.CSSProperties}>{arcane.portrait}</span>
}

function Meter({ value, max, tone }: { value: number; max: number; tone: 'hp' | 'mana' | 'xp' }) {
  return <span className={`meter ${tone}`}><i style={{ width: `${Math.max(0, Math.min(100, (value / max) * 100))}%` }} /></span>
}

function getShortDecision(decision: string) {
  if (decision.startsWith('Respawn')) return 'Respawn'
  if (decision.startsWith('Saindo da base')) return 'Avançando'
  if (decision.startsWith('Saindo do alcance da torre') || decision.startsWith('Saindo do Range da torre')) return 'Recuando'
  if (decision.startsWith('Chamando time')) return 'Call'
  if (decision.startsWith('Juntando com o time')) return 'Juntar'
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

function findSelected(state: SimulationState, selected: Selected) {
  if (selected.kind === 'arcane') return state.arcanes.find((entity) => entity.id === selected.id)
  if (selected.kind === 'creep') return state.creeps.find((entity) => entity.id === selected.id)
  if (selected.kind === 'tower') return state.towers.find((entity) => entity.id === selected.id)
  if (selected.kind === 'base') return state.bases.find((entity) => entity.id === selected.id)
  if (selected.kind === 'boss') return state.boss.id === selected.id ? state.boss : undefined
  return state.camps.find((entity) => entity.id === selected.id)
}

function getEntityPosition(entity: Arcane | Creep | Tower | Base | Camp | Boss | undefined) {
  if (!entity || !('pos' in entity)) return undefined
  return entity.pos
}

function getEntityAttackRange(entity: Arcane | Creep | Tower | Base | Camp | Boss | undefined) {
  if (!entity) return undefined
  if ('player' in entity) return entity.stats.range
  if ('range' in entity) return entity.range
  return undefined
}

function nearest<T extends { pos: Point }>(point: Point, entities: T[], range: number): T | undefined {
  return entities
    .map((entity) => ({ entity, distance: distance(point, entity.pos) }))
    .filter((entry) => entry.distance <= range)
    .sort((a, b) => a.distance - b.distance)[0]?.entity
}

function isPointVisibleToTeam(state: SimulationState, team: TeamId, point: Point) {
  return state.arcanes.some((arcane) => (
    arcane.team === team &&
    arcane.stats.hp > 0 &&
    arcane.respawn <= state.time &&
    distance(arcane.pos, point) <= arcane.visionRange
  ))
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
      return score + (creep.type === 'mage' ? 4 : 2.4)
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

function laneProgress(point: Point, path: Point[]) {
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

  if (totalLength === 0) return 0
  return Math.max(0, Math.min(1, distanceToProjection / totalLength))
}

function safeLaneRetreatPoint(arcane: Arcane, path: Point[], tower: Tower) {
  const candidates = path
    .map((point) => formationPoint(point, arcane.id))
    .filter((point) => distance(point, tower.pos) > tower.range + 2)
    .map((point) => ({ point, distance: distance(arcane.pos, point) }))
    .sort((a, b) => a.distance - b.distance)

  return candidates[0]?.point ?? teamInfo[arcane.team].base
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
  return { left: `${bounded.x}%`, top: `${bounded.y}%` }
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
