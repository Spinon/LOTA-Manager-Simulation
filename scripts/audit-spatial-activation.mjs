import { createHash } from 'node:crypto'
import { writeFile } from 'node:fs/promises'

import {
  beginCreepMotionDiagnostics,
  createInitialState,
  decisionGateSeconds,
  endCreepMotionDiagnostics,
  getCreepSpatialGrid,
  isPersistentSpatialGrid,
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
const baseSeed = getArg('seed', 'spatial-activation-audit')
const outputPath = getArg('output', '')

await loadGameData()

function runSimulation(seed, creepSpatialMode) {
  beginCreepMotionDiagnostics()
  let state = createInitialState(seed, { creepMotionMode: 'planned', creepSpatialMode })
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
        throw new Error(`${seed}/${creepSpatialMode}: posicao invalida em ${creep.id}`)
      }
      if (creep.pos.x < 0 || creep.pos.x > 100 || creep.pos.y < 0 || creep.pos.y > 100) {
        throw new Error(`${seed}/${creepSpatialMode}: creep fora do mapa em ${creep.id}`)
      }
    }
  }

  const wallSeconds = (performance.now() - startedAt) / 1000
  const diagnostics = endCreepMotionDiagnostics()
  const grid = getCreepSpatialGrid(state)
  const spatialStats = isPersistentSpatialGrid(grid) ? { ...grid.stats } : undefined
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
  }
  return {
    wallSeconds,
    diagnostics,
    spatialStats,
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

function createDivergence(baseline, candidate) {
  const contactDelta = Object.fromEntries(['top', 'mid', 'bot'].map((lane) => {
    const baselineTime = baseline.summary.firstContacts[lane]
    const candidateTime = candidate.summary.firstContacts[lane]
    return [lane, baselineTime === undefined || candidateTime === undefined ? undefined : candidateTime - baselineTime]
  }))
  return {
    winnerChanged: baseline.summary.winner !== candidate.summary.winner,
    killDelta: {
      dawn: candidate.summary.kills.dawn - baseline.summary.kills.dawn,
      dusk: candidate.summary.kills.dusk - baseline.summary.kills.dusk,
    },
    creepCountDelta: candidate.summary.creepCount - baseline.summary.creepCount,
    teamGoldDelta: {
      dawn: candidate.summary.teamEconomy.dawn.gold - baseline.summary.teamEconomy.dawn.gold,
      dusk: candidate.summary.teamEconomy.dusk.gold - baseline.summary.teamEconomy.dusk.gold,
    },
    teamXpDelta: {
      dawn: candidate.summary.teamEconomy.dawn.xp - baseline.summary.teamEconomy.dawn.xp,
      dusk: candidate.summary.teamEconomy.dusk.xp - baseline.summary.teamEconomy.dusk.xp,
    },
    contactDelta,
  }
}

const results = []
for (let index = 0; index < matchCount; index += 1) {
  const seed = `${baseSeed}-${index + 1}`
  const baseline = runSimulation(seed, 'rebuild')
  const candidate = runSimulation(seed, 'persistent')
  const candidateRepeat = runSimulation(seed, 'persistent')
  if (candidate.digest !== candidateRepeat.digest) {
    throw new Error(`${seed}: indice persistente nao deterministico (${candidate.digest} != ${candidateRepeat.digest})`)
  }
  const divergence = createDivergence(baseline, candidate)
  results.push({ seed, baseline, candidate, candidateRepeatDigest: candidateRepeat.digest, divergence })
  const baselineRate = baseline.summary.time / baseline.wallSeconds
  const candidateRate = candidate.summary.time / candidate.wallSeconds
  console.log(
    `${seed}: rebuild ${baselineRate.toFixed(1)}x | persistent ${candidateRate.toFixed(1)}x | ` +
    `ganho ${((candidateRate - baselineRate) / baselineRate * 100).toFixed(1)}% | ` +
    `contatos ${JSON.stringify(divergence.contactDelta)}`,
  )
}

const baselineWallSeconds = results.reduce((sum, result) => sum + result.baseline.wallSeconds, 0)
const candidateWallSeconds = results.reduce((sum, result) => sum + result.candidate.wallSeconds, 0)
const baselineSimulatedSeconds = results.reduce((sum, result) => sum + result.baseline.summary.time, 0)
const candidateSimulatedSeconds = results.reduce((sum, result) => sum + result.candidate.summary.time, 0)
const baselineRate = baselineSimulatedSeconds / baselineWallSeconds
const candidateRate = candidateSimulatedSeconds / candidateWallSeconds
const maxContactDelaySeconds = Math.max(0, ...results.flatMap((result) => (
  Object.values(result.divergence.contactDelta).filter((value) => value !== undefined)
)))
const report = {
  generatedAt: new Date().toISOString(),
  matches: matchCount,
  minutes,
  baselineRate,
  candidateRate,
  normalizedGainPct: (candidateRate - baselineRate) / baselineRate * 100,
  movementUpdateReductionPct: (() => {
    const baselineUpdates = results.reduce((sum, result) => sum + result.baseline.diagnostics.movementUpdates, 0)
    const candidateUpdates = results.reduce((sum, result) => sum + result.candidate.diagnostics.movementUpdates, 0)
    return (baselineUpdates - candidateUpdates) / baselineUpdates * 100
  })(),
  maxContactDelaySeconds,
  acquisitionTimingApproved: maxContactDelaySeconds <= 0.3,
  deterministic: true,
  results,
}

console.log('')
console.log(`Ganho normalizado agregado: ${report.normalizedGainPct.toFixed(1)}%`)
console.log(`Reducao incremental de updateCreepMovement: ${report.movementUpdateReductionPct.toFixed(1)}%`)
console.log(`Maior atraso de primeiro contato: ${report.maxContactDelaySeconds.toFixed(3)}s`)
console.log(`Indice persistente deterministico em ${matchCount} seed(s).`)

if (!report.acquisitionTimingApproved) {
  throw new Error(`Atraso de aquisicao acima do limite: ${report.maxContactDelaySeconds.toFixed(3)}s`)
}

if (outputPath) {
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  console.log(`Relatorio: ${outputPath}`)
}
