export const NON_COMBAT_RULES = {
  passiveGold: {
    earlyGpm: 100,
    midGpm: 106,
    lateGpm: 112,
    ultraLateGpm: 120,
  },
  economy: {
    killBaseGold: 125,
    killLevelGold: 8,
    firstBloodGold: 135,
    assistBaseGold: 30,
    assistNetWorthCoefficient: 0.038,
    comebackKillGoldCoefficient: 0.12,
    comebackKillGoldCap: 600,
    killBaseXp: 40,
    killLevelXp: 12,
    comebackXpCoefficient: 0.002,
    deathGoldLossDivisor: 40,
    buybackBaseCost: 200,
    buybackNetWorthDivisor: 13,
  },
  map: {
    waveIntervalSeconds: 30,
    jungleRespawnIntervalSeconds: 60,
    bossRespawnIntervalSeconds: 60,
    powerRuneIntervalSeconds: 120,
    powerRuneStartTimeSeconds: 360,
    bountyRuneIntervalSeconds: 180,
    wisdomRuneIntervalSeconds: 420,
    wisdomRuneStartTimeSeconds: 420,
    lotusIntervalSeconds: 180,
    maxLotusStored: 6,
    jungleStackValueMultiplier: 0.85,
    jungleStackWindowSecond: 52,
    maxJungleStacks: 4,
  },
  respawn: {
    minimumSeconds: 8,
    buybackPenaltySeconds: 0,
  },
  regeneration: {
    baseHealthRegenPerSecond: 180,
    baseManaRegenPerSecond: 150,
    outOfCombatManaRegenPerSecond: 1.5,
  },
} as const

export const XP_TO_REACH_LEVEL: Record<number, number> = {
  1: 0,
  2: 240,
  3: 640,
  4: 1160,
  5: 1760,
  6: 2440,
  7: 3200,
  8: 4000,
  9: 4900,
  10: 5900,
  11: 7000,
  12: 8200,
  13: 9500,
  14: 10900,
  15: 12400,
  16: 14000,
  17: 15700,
  18: 17500,
  19: 19400,
  20: 21400,
  21: 23600,
  22: 26000,
  23: 28600,
  24: 31400,
  25: 34400,
  26: 38400,
  27: 43400,
  28: 49400,
  29: 56400,
  30: 63900,
}

const RESPAWN_TABLE_SECONDS: Record<number, number> = {
  1: 8,
  2: 10,
  3: 12,
  4: 14,
  5: 16,
  6: 18,
  7: 20,
  8: 24,
  9: 28,
  10: 32,
  11: 36,
  12: 40,
  13: 44,
  14: 48,
  15: 52,
  16: 56,
  17: 60,
  18: 64,
  19: 68,
  20: 72,
  21: 76,
  22: 80,
  23: 84,
  24: 88,
  25: 92,
  26: 96,
  27: 100,
  28: 104,
  29: 108,
  30: 112,
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x))
}

export function passiveGpmAtMinute(minute: number): number {
  if (minute >= 40) return NON_COMBAT_RULES.passiveGold.ultraLateGpm
  if (minute >= 20) return NON_COMBAT_RULES.passiveGold.lateGpm
  if (minute >= 5) return NON_COMBAT_RULES.passiveGold.midGpm
  return NON_COMBAT_RULES.passiveGold.earlyGpm
}

export function passiveGoldForTick(gameTimeSeconds: number, tickDurationSeconds: number): number {
  return passiveGpmAtMinute(Math.floor(gameTimeSeconds / 60)) / 60 * tickDurationSeconds
}

export function bountyRuneGold(gameTimeMinutes: number): number {
  return 40 + 6 * Math.floor(gameTimeMinutes / 4)
}

export function wisdomRuneXp(spawnIndex: number): number {
  return 280 + 280 * Math.max(0, Math.floor(spawnIndex))
}

export function healingLotusValue(lotusCount = 1): number {
  if (lotusCount >= 6) return 900
  if (lotusCount >= 3) return 400
  return 125 * Math.max(1, Math.floor(lotusCount))
}

export function stackSuccessChance(
  playerSupportSkill: number,
  heroStackModifier: number,
  visionSafety: number,
  enemyContestRisk: number,
): number {
  return clamp(playerSupportSkill + heroStackModifier + visionSafety - enemyContestRisk, 0, 1)
}

export function stackedCampValue(baseCampValue: number, stackCount: number): number {
  return baseCampValue * (1 + Math.max(0, stackCount) * NON_COMBAT_RULES.map.jungleStackValueMultiplier)
}

export function buybackCost(netWorth: number): number {
  return Math.floor(NON_COMBAT_RULES.economy.buybackBaseCost + netWorth / NON_COMBAT_RULES.economy.buybackNetWorthDivisor)
}

export function deathGoldLoss(netWorth: number): number {
  return netWorth / NON_COMBAT_RULES.economy.deathGoldLossDivisor
}

export function killGold(victimLevel: number, streakGold = 0, isFirstBlood = false): number {
  return NON_COMBAT_RULES.economy.killBaseGold +
    victimLevel * NON_COMBAT_RULES.economy.killLevelGold +
    streakGold +
    (isFirstBlood ? NON_COMBAT_RULES.economy.firstBloodGold : 0)
}

export function comebackKillGoldBonus(
  victimNetWorth: number,
  killingTeamNetWorth: number,
  victimTeamNetWorth: number,
): number {
  if (victimTeamNetWorth <= killingTeamNetWorth || victimTeamNetWorth <= 0) return 0
  const teamDeficitPct = (victimTeamNetWorth - killingTeamNetWorth) / victimTeamNetWorth
  const victimShare = clamp(victimNetWorth / victimTeamNetWorth, 0, 1)
  return clamp(
    victimNetWorth *
      NON_COMBAT_RULES.economy.comebackKillGoldCoefficient *
      teamDeficitPct *
      (0.75 + victimShare),
    0,
    NON_COMBAT_RULES.economy.comebackKillGoldCap,
  )
}

export function assistGoldPerHero(
  victimNetWorth: number,
  killingTeamNetWorth: number,
  victimTeamNetWorth: number,
  numberOfAssistingHeroes: number,
): number {
  if (numberOfAssistingHeroes <= 0) return 0
  const rawFactor = killingTeamNetWorth < victimTeamNetWorth
    ? 1 + (victimTeamNetWorth - killingTeamNetWorth) / Math.max(1, victimTeamNetWorth)
    : 1 - (killingTeamNetWorth - victimTeamNetWorth) / Math.max(1, killingTeamNetWorth)
  const factor = clamp(rawFactor, 0.6, 1.8)
  return (
    (NON_COMBAT_RULES.economy.assistBaseGold + victimNetWorth * NON_COMBAT_RULES.economy.assistNetWorthCoefficient) *
    factor
  ) / numberOfAssistingHeroes
}

export function killXp(
  victimLevel: number,
  killingTeamXp = 0,
  victimTeamXp = 0,
  numberOfEligibleHeroes = 1,
): number {
  const comebackXpBonus = killingTeamXp < victimTeamXp
    ? (victimTeamXp - killingTeamXp) * NON_COMBAT_RULES.economy.comebackXpCoefficient
    : 0
  return (
    NON_COMBAT_RULES.economy.killBaseXp +
    victimLevel * NON_COMBAT_RULES.economy.killLevelXp +
    comebackXpBonus
  ) / Math.max(1, numberOfEligibleHeroes)
}

export function expectedTimeToItemSeconds(itemCost: number, currentGold: number, expectedGpm: number): number {
  const goldNeeded = Math.max(0, itemCost - currentGold)
  if (expectedGpm <= 0) return Number.POSITIVE_INFINITY
  return goldNeeded / (expectedGpm / 60)
}

export function getLevelFromXp(totalXp: number, xpTable = XP_TO_REACH_LEVEL): number {
  let level = 1

  for (let nextLevel = 2; nextLevel <= 30; nextLevel += 1) {
    if (totalXp >= xpTable[nextLevel]) {
      level = nextLevel
    } else {
      break
    }
  }

  return level
}

export function getLevelProgress(totalXp: number, xpTable = XP_TO_REACH_LEVEL): number {
  const level = getLevelFromXp(totalXp, xpTable)
  if (level >= 30) return 1

  const currentLevelXp = xpTable[level]
  const nextLevelXp = xpTable[level + 1]
  return clamp((totalXp - currentLevelXp) / (nextLevelXp - currentLevelXp), 0, 1)
}

export function respawnDurationSeconds(level: number, extraPenaltySeconds = 0, respawnReductionSeconds = 0): number {
  const validatedLevel = Math.floor(clamp(level, 1, 30))
  return Math.max(
    NON_COMBAT_RULES.respawn.minimumSeconds,
    RESPAWN_TABLE_SECONDS[validatedLevel] + extraPenaltySeconds - respawnReductionSeconds,
  )
}

export function resourceRegenForTick(
  baseRegenPerSecond: number,
  tickDurationSeconds: number,
  regenAmpPct = 0,
  regenReductionPct = 0,
): number {
  return baseRegenPerSecond *
    (1 + regenAmpPct / 100) *
    (1 - clamp(regenReductionPct, 0, 100) / 100) *
    tickDurationSeconds
}

export function bestOfThreeWinProbability(singleGameWinProbability: number): number {
  const p = clamp(singleGameWinProbability, 0, 1)
  return p * p * (3 - 2 * p)
}

export function bestOfFiveWinProbability(singleGameWinProbability: number): number {
  const p = clamp(singleGameWinProbability, 0, 1)
  return Math.pow(p, 3) + 3 * Math.pow(p, 3) * (1 - p) + 6 * Math.pow(p, 3) * Math.pow(1 - p, 2)
}
