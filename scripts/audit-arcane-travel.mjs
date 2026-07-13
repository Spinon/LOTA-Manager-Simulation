import { createHash } from 'node:crypto'
import { writeFile } from 'node:fs/promises'

import {
  beginArcaneTravelDiagnostics,
  createInitialState,
  decisionGateSeconds,
  distanceSquared,
  endArcaneTravelDiagnostics,
  isPointVisibleToTeam,
  loadGameData,
  simulationFrameSeconds,
  tick,
} from '../src/sim/simulation.ts'
import { sampleArcaneTravelPlan } from '../src/sim/arcaneTravelPlans.ts'

const args = process.argv.slice(2)
const getArg = (name, fallback) => {
  const index = args.indexOf(`--${name}`)
  return index >= 0 && index + 1 < args.length ? args[index + 1] : fallback
}

const matchCount = Math.max(1, Number(getArg('matches', 2)) || 2)
const minutes = Math.max(1, Number(getArg('minutes', 10)) || 10)
const baseSeed = getArg('seed', 'arcane-travel-audit')
const outputPath = getArg('output', '')

await loadGameData()

function classifyDirection(macroDecision) {
  const normalized = macroDecision.toLowerCase()
  if (normalized.includes('recu') || normalized.includes('recuper') || normalized.includes('ceder')) return 'retreat'
  if (normalized.includes('avanc') || normalized.includes('push') || normalized.includes('farm') || normalized.includes('juntar')) return 'advance'
  return undefined
}

function createDigest(state) {
  return createHash('sha256').update(JSON.stringify({
    time: state.time,
    winner: state.winner,
    kills: state.kills,
    arcanes: state.arcanes.map((arcane) => {
      const pos = arcane.travelPlan ? sampleArcaneTravelPlan(arcane.travelPlan, state.time) : arcane.pos
      return [arcane.id, pos.x, pos.y, arcane.stats.hp, arcane.stats.mana, arcane.stats.gold, arcane.macroDecision, arcane.microDecision]
    }),
    creeps: state.creeps.map((creep) => [creep.id, creep.pos.x, creep.pos.y, creep.hp]),
    objectives: [
      ...state.towers.map((tower) => [tower.id, tower.hp]),
      ...state.structures.map((structure) => [structure.id, structure.hp]),
      ...state.bases.map((base) => [base.id, base.hp]),
    ],
    events: state.events,
  })).digest('hex').slice(0, 16)
}

function runSimulation(seed, arcaneTravelMode) {
  beginArcaneTravelDiagnostics()
  let state = createInitialState(seed, { arcaneTravelMode })
  let decisionAccumulator = 0
  let dangerViolations = 0
  let rapidDirectionReversals = 0
  const reversalEvents = []
  let oscillationClusters = 0
  const oscillationEvents = []
  const reversalHistory = new Map()
  const previousDirections = new Map()
  const targetTime = minutes * 60
  const startedAt = performance.now()

  while (!state.winner && state.time < targetTime) {
    decisionAccumulator += simulationFrameSeconds
    const shouldDecide = decisionAccumulator >= decisionGateSeconds
    if (shouldDecide) decisionAccumulator %= decisionGateSeconds
    state = tick(state, simulationFrameSeconds, shouldDecide)

    if (shouldDecide) {
      for (const arcane of state.arcanes) {
        const direction = classifyDirection(arcane.macroDecision)
        if (!direction) continue
        const previous = previousDirections.get(arcane.id)
        if (previous && previous.direction !== direction && state.time - previous.time <= 2) {
          rapidDirectionReversals += 1
          reversalEvents.push({
            arcaneId: arcane.id,
            time: state.time,
            elapsed: state.time - previous.time,
            from: previous.direction,
            to: direction,
            macroDecision: arcane.macroDecision,
          })
          const recentReversals = [...(reversalHistory.get(arcane.id) ?? []), state.time]
            .filter((time) => state.time - time <= 6)
          if (recentReversals.length >= 4) {
            oscillationClusters += 1
            oscillationEvents.push({ arcaneId: arcane.id, from: recentReversals[0], to: state.time })
            reversalHistory.set(arcane.id, [])
          } else {
            reversalHistory.set(arcane.id, recentReversals)
          }
        }
        if (!previous || previous.direction !== direction) previousDirections.set(arcane.id, { direction, time: state.time })
      }
    }

    for (const arcane of state.arcanes) {
      if (!arcane.travelPlan) continue
      const pos = sampleArcaneTravelPlan(arcane.travelPlan, state.time)
      const visibleEnemyInThreatRange = state.arcanes.some((enemy) => (
        enemy.team !== arcane.team &&
        enemy.stats.hp > 0 &&
        enemy.respawn <= state.time &&
        isPointVisibleToTeam(state, arcane.team, enemy.pos) &&
        distanceSquared(pos, enemy.pos) <= (enemy.stats.range + 3) ** 2
      ))
      const towerInThreatRange = state.towers.some((tower) => (
        tower.team !== arcane.team &&
        tower.hp > 0 &&
        distanceSquared(pos, tower.pos) <= (tower.range + 1) ** 2
      ))
      if (visibleEnemyInThreatRange || towerInThreatRange) dangerViolations += 1
    }
  }

  const wallSeconds = (performance.now() - startedAt) / 1000
  const diagnostics = endArcaneTravelDiagnostics()
  return {
    wallSeconds,
    simulationRate: (state.time + 60) / wallSeconds,
    digest: createDigest(state),
    dangerViolations,
    rapidDirectionReversals,
    reversalEvents,
    oscillationClusters,
    oscillationEvents,
    diagnostics,
    summary: {
      time: state.time,
      winner: state.winner,
      kills: state.kills,
      teamGold: state.arcanes.reduce((gold, arcane) => {
        gold[arcane.team] += arcane.stats.gold
        return gold
      }, { dawn: 0, dusk: 0 }),
    },
  }
}

const results = []
for (let index = 0; index < matchCount; index += 1) {
  const seed = `${baseSeed}-${index + 1}`
  const baseline = runSimulation(seed, 'fixed')
  const candidate = runSimulation(seed, 'planned')
  const repeat = runSimulation(seed, 'planned')
  if (candidate.digest !== repeat.digest) {
    throw new Error(`${seed}: viagem planejada nao deterministica (${candidate.digest} != ${repeat.digest})`)
  }
  results.push({ seed, baseline, candidate, candidateRepeatDigest: repeat.digest })
  console.log(
    `${seed}: fixed ${baseline.simulationRate.toFixed(1)}x | planned ${candidate.simulationRate.toFixed(1)}x | ` +
    `travessias ${baseline.diagnostics.fullUpdates} -> ${candidate.diagnostics.fullUpdates} | ` +
    `reversoes ${baseline.rapidDirectionReversals} -> ${candidate.rapidDirectionReversals} | perigo ${candidate.dangerViolations}`,
  )
}

const sum = (selector) => results.reduce((total, result) => total + selector(result), 0)
const baselineSeconds = sum((result) => result.baseline.summary.time + 60)
const candidateSeconds = sum((result) => result.candidate.summary.time + 60)
const baselineWall = sum((result) => result.baseline.wallSeconds)
const candidateWall = sum((result) => result.candidate.wallSeconds)
const baselineTraversals = sum((result) => result.baseline.diagnostics.fullUpdates)
const candidateTraversals = sum((result) => result.candidate.diagnostics.fullUpdates)
const report = {
  generatedAt: new Date().toISOString(),
  matches: matchCount,
  minutes,
  baselineRate: baselineSeconds / baselineWall,
  candidateRate: candidateSeconds / candidateWall,
  normalizedGainPct: ((candidateSeconds / candidateWall) / (baselineSeconds / baselineWall) - 1) * 100,
  fullTraversalReductionPct: (1 - candidateTraversals / baselineTraversals) * 100,
  movementTraversalSpeedup: baselineTraversals / candidateTraversals,
  dangerViolations: sum((result) => result.candidate.dangerViolations),
  baselineRapidDirectionReversals: sum((result) => result.baseline.rapidDirectionReversals),
  candidateRapidDirectionReversals: sum((result) => result.candidate.rapidDirectionReversals),
  baselineOscillationClusters: sum((result) => result.baseline.oscillationClusters),
  candidateOscillationClusters: sum((result) => result.candidate.oscillationClusters),
  deterministic: true,
  results,
}

console.log('')
console.log(`Ganho normalizado agregado: ${report.normalizedGainPct.toFixed(1)}%`)
console.log(`Reducao de travessias completas: ${report.fullTraversalReductionPct.toFixed(1)}% (${report.movementTraversalSpeedup.toFixed(2)}x)`)
console.log(`Reversoes rapidas: ${report.baselineRapidDirectionReversals} -> ${report.candidateRapidDirectionReversals}`)
console.log(`Clusters de oscilacao: ${report.baselineOscillationClusters} -> ${report.candidateOscillationClusters}`)
console.log(`Planos em alcance hostil: ${report.dangerViolations}`)

if (report.dangerViolations > 0) throw new Error(`Foram encontrados ${report.dangerViolations} planos em alcance hostil`)
if (report.movementTraversalSpeedup < 1.5) throw new Error(`Ganho estrutural abaixo de 1.5x: ${report.movementTraversalSpeedup.toFixed(2)}x`)
if (report.candidateOscillationClusters > report.baselineOscillationClusters) {
  console.log(JSON.stringify(results.flatMap((result) => result.candidate.oscillationEvents), null, 2))
  throw new Error('A viagem planejada aumentou os clusters de oscilacao')
}

if (outputPath) {
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  console.log(`Relatorio: ${outputPath}`)
}
