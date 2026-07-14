import assert from 'node:assert/strict'
import {
  getBossSeed,
  getLaneCreepReward,
  getLaneCreepStats,
  getLaneCreepWaveKinds,
  getNeutralCampReward,
  getNeutralCampStats,
  getSummonUnitRuntimeSeed,
} from './unitSeedsAdapter.ts'

{
  assert.deepEqual(getLaneCreepWaveKinds(0), ['melee', 'melee', 'melee', 'mage'])
  assert.deepEqual(getLaneCreepWaveKinds(120), ['melee', 'melee', 'melee', 'mage', 'flagbearer'])
  assert.deepEqual(getLaneCreepWaveKinds(300), ['melee', 'melee', 'melee', 'mage', 'siege', 'flagbearer'])
  assert.equal(getLaneCreepWaveKinds(15 * 60).filter((kind) => kind === 'melee').length, 4)
  assert.equal(getLaneCreepWaveKinds(30 * 60).filter((kind) => kind === 'melee').length, 5)
  assert.equal(getLaneCreepWaveKinds(45 * 60).filter((kind) => kind === 'melee').length, 6)
}

{
  const meleeStats = getLaneCreepStats('melee', 0)
  const mageReward = getLaneCreepReward('mage', 0)
  assert.equal(meleeStats.health, 550)
  assert.equal(mageReward.xp, 69)
  assert.ok(mageReward.gold >= 43)
}

{
  const weakStats = getNeutralCampStats('small')
  const mediumStats = getNeutralCampStats('medium')
  const ancientStats = getNeutralCampStats('ancient')
  const ancientReward = getNeutralCampReward('ancient', 0)
  assert.ok(weakStats.hp > 500)
  assert.ok(weakStats.damage > 24, 'camp damage should represent multiple creatures retaliating after mitigation')
  assert.ok(mediumStats.damage > weakStats.damage)
  assert.ok(ancientStats.damage > mediumStats.damage)
  assert.ok(weakStats.range >= 5.2, 'neutral camps should retaliate beyond their static marker radius')
  assert.ok(ancientReward.xp >= 120)
}

{
  assert.equal(getBossSeed().id, 'ancient_boss_roshan_like')
}

{
  const familiar = getSummonUnitRuntimeSeed('summon_stone_familiar')!
  const bear = getSummonUnitRuntimeSeed('summon_spirit_bear')!
  assert.equal(familiar.damage, 30)
  assert.equal(familiar.abilities.find((ability) => ability.id === 'stone_drop')?.values?.cooldown, 20)
  assert.equal(bear.damage, 55)
  assert.equal(bear.abilities.find((ability) => ability.id === 'entangling_claws')?.values?.chance, 20)
  assert.equal(getSummonUnitRuntimeSeed('missing-summon'), undefined)
}

console.log('unitSeedsAdapter tests passed')
