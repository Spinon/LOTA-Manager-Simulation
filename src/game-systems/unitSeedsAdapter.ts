import {
  BOSS_UNIT_SEEDS,
  LANE_CREEP_SEEDS,
  NEUTRAL_CREEP_SEEDS,
  STRUCTURE_UNIT_SEEDS,
  type CampTier,
  type UnitSeed,
} from '../data/unitSeeds.ts'

export type LaneCreepKind = 'melee' | 'mage' | 'siege' | 'flagbearer'

const laneSeedByKind: Record<LaneCreepKind, string> = {
  melee: 'lane_melee_creep',
  mage: 'lane_ranged_creep',
  siege: 'lane_siege_creep',
  flagbearer: 'lane_flagbearer_creep',
}

const upgradedLaneSeedByKind: Partial<Record<LaneCreepKind, { super: string; mega: string }>> = {
  melee: { super: 'super_melee_creep', mega: 'mega_melee_creep' },
  mage: { super: 'super_ranged_creep', mega: 'mega_ranged_creep' },
}

export function getLaneCreepWaveKinds(gameTimeSeconds: number): LaneCreepKind[] {
  const kinds: LaneCreepKind[] = []

  const meleeSeed = getLaneCreepSeed('melee')
  const mageSeed = getLaneCreepSeed('mage')
  const siegeSeed = getLaneCreepSeed('siege')
  const flagbearerSeed = getLaneCreepSeed('flagbearer')

  for (let index = 0; index < (meleeSeed.spawn.maxCount ?? 3); index += 1) {
    kinds.push('melee')
  }
  for (let index = 0; index < (mageSeed.spawn.maxCount ?? 1); index += 1) {
    kinds.push('mage')
  }

  if (shouldSpawnTimedWaveUnit(gameTimeSeconds, siegeSeed)) {
    kinds.push('siege')
  }
  if (shouldSpawnTimedWaveUnit(gameTimeSeconds, flagbearerSeed)) {
    kinds.push('flagbearer')
  }

  return kinds
}

export function getLaneCreepSeed(kind: LaneCreepKind, upgrade: 'normal' | 'super' | 'mega' = 'normal') {
  const upgradedSeedId = upgrade === 'normal' ? undefined : upgradedLaneSeedByKind[kind]?.[upgrade]
  const seedId = upgradedSeedId ?? laneSeedByKind[kind]
  const seed = LANE_CREEP_SEEDS.find((candidate) => candidate.id === seedId)
  if (!seed) throw new Error(`Missing lane creep seed: ${seedId}`)
  return seed
}

export function getLaneCreepStats(kind: LaneCreepKind, gameTimeSeconds: number, upgrade: 'normal' | 'super' | 'mega' = 'normal') {
  const seed = getLaneCreepSeed(kind, upgrade)
  const minute = gameTimeSeconds / 60
  const health = seed.baseStats.maxHealth + (seed.scaling?.healthPerMinute ?? 0) * minute
  const damage = average(seed.baseStats.damageMin, seed.baseStats.damageMax) + (seed.scaling?.damagePerMinute ?? 0) * minute

  return {
    seedId: seed.id,
    health: Math.round(health),
    damage: Math.round(damage),
    range: convertRange(seed.baseStats.attackRange),
    visionRange: convertVision(seed.baseStats.dayVision),
    attackType: seed.attackType,
  }
}

export function getLaneCreepReward(kind: LaneCreepKind, gameTimeSeconds: number, upgrade: 'normal' | 'super' | 'mega' = 'normal') {
  const seed = getLaneCreepSeed(kind, upgrade)
  const minute = gameTimeSeconds / 60
  return {
    gold: Math.round(average(seed.bounty.goldMin, seed.bounty.goldMax) + (seed.scaling?.bountyGoldPerMinute ?? 0) * minute),
    xp: Math.round(seed.bounty.xp + (seed.scaling?.bountyXpPerMinute ?? 0) * minute),
  }
}

export function getNeutralCampStats(tier: CampTier) {
  const seeds = getNeutralSeedsForTier(tier)
  const leader = seeds.reduce((best, seed) => (seed.baseStats.maxHealth > best.baseStats.maxHealth ? seed : best), seeds[0])
  const aggregateDamage = seeds.reduce((sum, seed) => sum + average(seed.baseStats.damageMin, seed.baseStats.damageMax), 0)
  const minimumRetaliationRange = tier === 'ancient' || tier === 'large' ? 6 : tier === 'medium' ? 5.6 : 5.2
  return {
    hp: seeds.reduce((sum, seed) => sum + seed.baseStats.maxHealth, 0),
    damage: Math.round(aggregateDamage * 0.62),
    range: Math.max(minimumRetaliationRange, convertRange(Math.max(...seeds.map((seed) => seed.baseStats.attackRange)))),
    level: tier === 'ancient' || tier === 'large' ? 3 : tier === 'medium' ? 2 : 1,
    leaderSeedId: leader.id,
  }
}

export function getNeutralCampReward(tier: CampTier, gameTimeSeconds: number) {
  const minute = gameTimeSeconds / 60
  return getNeutralSeedsForTier(tier).reduce((reward, seed) => ({
    gold: reward.gold + Math.round(average(seed.bounty.goldMin, seed.bounty.goldMax) + (seed.scaling?.bountyGoldPerMinute ?? 0) * minute),
    xp: reward.xp + Math.round(seed.bounty.xp + (seed.scaling?.bountyXpPerMinute ?? 0) * minute),
  }), { gold: 0, xp: 0 })
}

export function getBossSeed() {
  const seed = BOSS_UNIT_SEEDS.find((candidate) => candidate.id === 'ancient_boss_roshan_like') ?? BOSS_UNIT_SEEDS[0]
  if (!seed) throw new Error('Missing boss seed')
  return seed
}

export function getStructureSeedByRole(team: 'blue' | 'red', lane: 'top' | 'mid' | 'bottom' | 'base', tier: number, structureType = 'tower') {
  return STRUCTURE_UNIT_SEEDS.find((seed) => (
    seed.structure?.teamId === team &&
    seed.structure.lane === lane &&
    seed.structure.tier === tier &&
    seed.structure.structureType === structureType
  ))
}

export function getStructureStatsByRole(
  team: 'blue' | 'red',
  lane: 'top' | 'mid' | 'bottom' | 'base',
  tier: number,
  structureType = 'tower',
  side: 'left' | 'right' | 'none' = 'none',
) {
  const seed = STRUCTURE_UNIT_SEEDS.find((candidate) => (
    candidate.structure?.teamId === team &&
    candidate.structure.lane === lane &&
    candidate.structure.tier === tier &&
    candidate.structure.structureType === structureType &&
    candidate.structure.side === side
  )) ?? getStructureSeedByRole(team, lane, tier, structureType)

  if (!seed) throw new Error(`Missing structure seed: ${team}/${lane}/${tier}/${structureType}/${side}`)

  return {
    seedId: seed.id,
    hp: seed.baseStats.maxHealth,
    damage: Math.round(average(seed.baseStats.damageMin, seed.baseStats.damageMax)),
    range: convertStructureRange(seed.baseStats.attackRange),
    armor: seed.baseStats.armor,
    magicResistance: seed.baseStats.magicResistance,
    bountyGold: Math.round(average(seed.bounty.goldMin, seed.bounty.goldMax)),
    teamGold: seed.bounty.teamGold ?? 0,
    xp: seed.bounty.xp,
  }
}

function getNeutralSeedsForTier(tier: CampTier) {
  const seeds = NEUTRAL_CREEP_SEEDS.filter((seed) => seed.campTier === tier)
  if (seeds.length > 0) return seeds.slice(0, tier === 'small' ? 3 : tier === 'medium' ? 3 : 2)
  return NEUTRAL_CREEP_SEEDS.filter((seed) => seed.campTier === 'medium').slice(0, 3)
}

function shouldSpawnTimedWaveUnit(gameTimeSeconds: number, seed: UnitSeed) {
  const firstSpawnSecond = seed.spawn.firstSpawnSecond
  const interval = seed.spawn.waveIntervalSecond ?? seed.spawn.respawnIntervalSecond
  if (gameTimeSeconds < firstSpawnSecond || interval <= 0) return false
  return Math.floor(gameTimeSeconds) % interval < 1
}

function average(min: number, max: number) {
  return (min + max) / 2
}

function convertRange(seedRange: number) {
  if (seedRange <= 0) return 0
  return Math.max(1.35, seedRange / 115)
}

function convertVision(seedVision: number) {
  return Math.max(8, seedVision / 70)
}

function convertStructureRange(seedRange: number) {
  if (seedRange <= 0) return 0
  return seedRange / 75
}
