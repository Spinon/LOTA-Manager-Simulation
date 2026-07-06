import assert from 'node:assert/strict'
import { aggroTriggered, laneWinChance, updateLanePosition } from './laneControlFormulas.ts'

{
  assert.equal(updateLanePosition({
    currentLaneEquilibrium: 95,
    pushPower: 10,
    pullPower: 0,
    towerPressure: 0,
    deltaSeconds: 2,
  }), 100)
  assert.equal(updateLanePosition({
    currentLaneEquilibrium: 0,
    pushPower: 4,
    pullPower: 6,
    towerPressure: 1,
    deltaSeconds: 5,
  }), -15)
}

{
  assert.equal(aggroTriggered({
    distanceToTarget: 450,
    aggroRadius: 500,
    issuedAttackCommand: true,
    targetIsEnemyHero: true,
  }), true)
  assert.equal(aggroTriggered({
    distanceToTarget: 550,
    aggroRadius: 500,
    issuedAttackCommand: true,
    targetIsEnemyHero: true,
  }), false)
  assert.ok(laneWinChance(10) > 0.5)
  assert.ok(laneWinChance(-10) < 0.5)
}

console.log('laneControlFormulas tests passed')
