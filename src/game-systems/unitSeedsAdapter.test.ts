import assert from 'node:assert/strict'
import {
  getBossSeed,
  getLaneCreepReward,
  getLaneCreepStats,
  getLaneCreepWaveKinds,
  getNeutralCampReward,
  getNeutralCampStats,
} from './unitSeedsAdapter.ts'

{
  assert.deepEqual(getLaneCreepWaveKinds(0), ['melee', 'melee', 'melee', 'mage'])
  assert.deepEqual(getLaneCreepWaveKinds(120), ['melee', 'melee', 'melee', 'mage', 'flagbearer'])
  assert.deepEqual(getLaneCreepWaveKinds(300), ['melee', 'melee', 'melee', 'mage', 'siege', 'flagbearer'])
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

console.log('unitSeedsAdapter tests passed')
