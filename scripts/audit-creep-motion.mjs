import { createHash } from 'node:crypto'
import { writeFile } from 'node:fs/promises'

import {
  beginCreepMotionDiagnostics,
  createInitialState,
  decisionGateSeconds,
  endCreepMotionDiagnostics,
  loadGameData,
  simulationFrameSeconds,
  tick,
} from '../src/sim/simulation.ts'

const args = process.argv.slice(2)
const getArg = (name, fallback) => {
  const index = args.indexOf(`--${name}`)
  return index >= 0 && index + 1 < args.length ? args[index + 1] : fallback
}

const matchCount = Math.max(1, Number(getArg('matches', 3)) || 3)
const minutes = Math.max(1, Number(getArg('minutes', 10)) || 10)
const baseSeed = getArg('seed', 'creep-motion-audit')
const outputPath = getArg('output', '')

await loadGameData()

function runSimulation(seed, creepMotionMode) {
  beginCreepMotionDiagnostics()
  let state = createInitialState(seed, { creepMotionMode })
  let decisionAccumulator = 0
  const firstContacts = { top: undefined, mid: undefined, bot: undefined }
  const targetTime = minutes * 60
  const startedAt = performance.now()

  while (!state.winner && state.time < targetTime) {
    decisionAccumulator += simulationFrameSeconds
    const shouldDecide = decisionAccumulator >= decisionGateSeconds
    if (shouldDecide) decisionAccumulator %= decisionGateSeconds
    state = tick(state, simulationFrameSeconds, shouldDecide)

    for (const effect of state.effects) {
      if (effect.kind !== 'creep' || effect.action !== 'attack' || effect.targetKind !== 'creep') continue
      if (Math.abs(effect.createdAt - state.time) > 0.0001) continue
      const lane = effect.sourceId.split('-')[1]
      if (lane in firstContacts && firstContacts[lane] === undefined) firstContacts[lane] = state.time
    }

    for (const creep of state.creeps) {
      if (!Number.isFinite(creep.pos.x) || !Number.isFinite(creep.pos.y)) {
        throw new Error(`${seed}/${creepMotionMode}: posicao invalida em ${creep.id}`)
      }
      if (creep.pos.x < 0 || creep.pos.x > 100 || creep.pos.y < 0 || creep.pos.y > 100) {
        throw new Error(`${seed}/${creepMotionMode}: creep fora do mapa em ${creep.id}`)
      }
    }
  }

  const wallSeconds = (performance.now() - startedAt) / 1000
  const teamEconomy = { dawn: { gold: 0, xp: 0 }, dusk: { gold: 0, xp: 0 } }
  for (const arcane of state.arcanes) {
    teamEconomy[arcane.team].gold += arcane.stats.gold
    teamEconomy[arcane.team].xp += arcane.stats.xp
  }
  const summary = {
    time: state.time,
    winner: state.winner,
    kills: state.kills,
    creepCount: state.creeps.length,
    firstContacts,
    teamEconomy,
    towerHp: state.towers.map((tower) => [tower.id, tower.hp]),
    structureHp: state.structures.map((structure) => [structure.id, structure.hp]),
    baseHp: state.bases.map((base) => [base.id, base.hp]),
    arcanes: state.arcanes.map((arcane) => ({
      id: arcane.id,
      gold: arcane.stats.gold,
      xp: arcane.stats.xp,
      kills: arcane.kills,
      deaths: arcane.deaths,
      assists: arcane.assists,
      laneCreepKills: arcane.laneCreepKills,
      denies: arcane.denies,
    })),
  }
  const diagnostics = endCreepMotionDiagnostics()
  return {
    wallSeconds,
    diagnostics,
    digest: createHash('sha256').update(JSON.stringify({
      ...summary,
      creeps: state.creeps.map((creep) => [
        creep.id, creep.pos.x, creep.pos.y, creep.hp, creep.pathIndex,
        creep.routeTargetId, creep.motionPlan,
      ]),
      events: state.events,
    })).digest('hex').slice(0, 16),
    summary,
  }
}

function createDivergence(fixed, planned) {
  const contactDelta = Object.fromEntries(['top', 'mid', 'bot'].map((lane) => {
    const fixedTime = fixed.summary.firstContacts[lane]
    const plannedTime = planned.summary.firstContacts[lane]
    return [lane, fixedTime === undefined || plannedTime === undefined ? undefined : plannedTime - fixedTime]
  }))
  return {
    winnerChanged: fixed.summary.winner !== planned.summary.winner,
    killDelta: {
      dawn: planned.summary.kills.dawn - fixed.summary.kills.dawn,
      dusk: planned.summary.kills.dusk - fixed.summary.kills.dusk,
    },
    creepCountDelta: planned.summary.creepCount - fixed.summary.creepCount,
    teamGoldDelta: {
      dawn: planned.summary.teamEconomy.dawn.gold - fixed.summary.teamEconomy.dawn.gold,
      dusk: planned.summary.teamEconomy.dusk.gold - fixed.summary.teamEconomy.dusk.gold,
    },
    teamXpDelta: {
      dawn: planned.summary.teamEconomy.dawn.xp - fixed.summary.teamEconomy.dawn.xp,
      dusk: planned.summary.teamEconomy.dusk.xp - fixed.summary.teamEconomy.dusk.xp,
    },
    contactDelta,
  }
}

const results = []
for (let index = 0; index < matchCount; index += 1) {
  const seed = `${baseSeed}-${index + 1}`
  const fixed = runSimulation(seed, 'fixed')
  const planned = runSimulation(seed, 'planned')
  const plannedRepeat = runSimulation(seed, 'planned')
  if (planned.digest !== plannedRepeat.digest) {
    throw new Error(`${seed}: movimento planejado nao deterministico (${planned.digest} != ${plannedRepeat.digest})`)
  }
  const divergence = createDivergence(fixed, planned)
  results.push({ seed, fixed, planned, plannedRepeatDigest: plannedRepeat.digest, divergence })
  const gain = (fixed.wallSeconds - planned.wallSeconds) / fixed.wallSeconds * 100
  console.log(
    `${seed}: fixed ${fixed.wallSeconds.toFixed(2)}s | planned ${planned.wallSeconds.toFixed(2)}s | ` +
    `ganho ${gain.toFixed(1)}% | contatos ${JSON.stringify(divergence.contactDelta)} | ` +
    `creeps ${divergence.creepCountDelta >= 0 ? '+' : ''}${divergence.creepCountDelta}`,
  )
}

const fixedTotal = results.reduce((sum, result) => sum + result.fixed.wallSeconds, 0)
const plannedTotal = results.reduce((sum, result) => sum + result.planned.wallSeconds, 0)
const report = {
  generatedAt: new Date().toISOString(),
  matches: matchCount,
  minutes,
  fixedWallSeconds: fixedTotal,
  plannedWallSeconds: plannedTotal,
  gainPct: (fixedTotal - plannedTotal) / fixedTotal * 100,
  movementUpdateReductionPct: (() => {
    const fixedUpdates = results.reduce((sum, result) => sum + result.fixed.diagnostics.movementUpdates, 0)
    const plannedUpdates = results.reduce((sum, result) => sum + result.planned.diagnostics.movementUpdates, 0)
    return (fixedUpdates - plannedUpdates) / fixedUpdates * 100
  })(),
  deterministic: true,
  results,
}

console.log('')
console.log(`Ganho agregado: ${report.gainPct.toFixed(1)}%`)
console.log(`Reducao de updateCreepMovement: ${report.movementUpdateReductionPct.toFixed(1)}%`)
console.log(`Movimento planejado deterministico em ${matchCount} seed(s).`)

if (outputPath) {
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  console.log(`Relatorio: ${outputPath}`)
}
