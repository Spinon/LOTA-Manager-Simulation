import assert from 'node:assert/strict'
import {
  bestOfFiveWinProbability,
  bestOfThreeWinProbability,
  assistGoldPerHero,
  bountyRuneGold,
  buybackCost,
  comebackKillGoldBonus,
  deathGoldLoss,
  expectedTimeToItemSeconds,
  getLevelFromXp,
  getLevelProgress,
  healingLotusValue,
  killGold,
  killXp,
  passiveGoldForTick,
  passiveGpmAtMinute,
  resourceRegenForTick,
  respawnDurationSeconds,
  stackSuccessChance,
  stackedCampValue,
  wisdomRuneXp,
} from './nonCombatFormulas.ts'

function closeTo(actual: number, expected: number, epsilon = 0.0001) {
  assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} should be close to ${expected}`)
}

{
  assert.equal(passiveGpmAtMinute(0), 100)
  assert.equal(passiveGpmAtMinute(5), 106)
  assert.equal(passiveGpmAtMinute(20), 112)
  assert.equal(passiveGpmAtMinute(40), 120)
  closeTo(passiveGoldForTick(0, 3), 5)
}

{
  assert.equal(bountyRuneGold(0), 40)
  assert.equal(bountyRuneGold(8), 52)
  assert.equal(wisdomRuneXp(0), 280)
  assert.equal(wisdomRuneXp(2), 840)
  assert.equal(healingLotusValue(1), 125)
  assert.equal(healingLotusValue(3), 400)
  assert.equal(healingLotusValue(6), 900)
  closeTo(stackSuccessChance(0.35, 0.18, 0.22, 0.16), 0.59)
  closeTo(stackSuccessChance(0.9, 0.4, 0.2, 0), 1)
  closeTo(stackedCampValue(100, 0), 100)
  closeTo(stackedCampValue(100, 2), 270)
  assert.equal(buybackCost(1300), 300)
  closeTo(deathGoldLoss(4000), 100)
  assert.equal(killGold(10), 205)
  assert.equal(killGold(10, 50, true), 390)
  closeTo(comebackKillGoldBonus(4000, 12000, 16000), 120)
  closeTo(comebackKillGoldBonus(4000, 18000, 16000), 0)
  closeTo(assistGoldPerHero(1000, 4000, 5000, 2), 40.8)
  closeTo(killXp(10), 160)
  closeTo(killXp(10, 4000, 5000, 2), 81)
}

{
  assert.equal(getLevelFromXp(0), 1)
  assert.equal(getLevelFromXp(240), 2)
  assert.equal(getLevelFromXp(63900), 30)
  closeTo(getLevelProgress(120), 0.5)
  closeTo(getLevelProgress(63900), 1)
}

{
  assert.equal(respawnDurationSeconds(1), 8)
  assert.equal(respawnDurationSeconds(10), 32)
  assert.equal(respawnDurationSeconds(30), 112)
  assert.equal(respawnDurationSeconds(10, 25, 5), 52)
}

{
  closeTo(expectedTimeToItemSeconds(1000, 500, 100), 300)
  closeTo(resourceRegenForTick(10, 2, 50, 20), 24)
}

{
  closeTo(bestOfThreeWinProbability(0.5), 0.5)
  closeTo(bestOfFiveWinProbability(0.5), 0.5)
  assert.ok(bestOfThreeWinProbability(0.6) > 0.6)
  assert.ok(bestOfFiveWinProbability(0.6) > bestOfThreeWinProbability(0.6))
}

console.log('nonCombatFormulas tests passed')
