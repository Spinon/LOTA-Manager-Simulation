import { createHash } from 'node:crypto'

import {
  createInitialState,
  createMatchRenderFrame,
  createMatchStaticData,
  decisionGateSeconds,
  loadGameData,
  simulationFrameSeconds,
  tick,
} from '../src/sim/simulation.ts'

const args = process.argv.slice(2)

function getArg(name, fallback) {
  const index = args.indexOf(`--${name}`)
  return index >= 0 && index + 1 < args.length ? args[index + 1] : fallback
}

const simulatedSeconds = Math.max(30, Number(getArg('seconds', 300)) || 300)
const runCount = Math.max(1, Number(getArg('runs', 3)) || 3)
const seed = getArg('seed', 'performance-reference')
const renderFrameIntervalSeconds = 0.2
const renderDetailsIntervalSeconds = 2
const simulationChunkSteps = 150

await loadGameData()

function createStateDigest(state) {
  const payload = {
    time: state.time,
    winner: state.winner,
    kills: state.kills,
    arcanes: state.arcanes.map((arcane) => ({
      id: arcane.id,
      pos: arcane.pos,
      hp: arcane.stats.hp,
      mana: arcane.stats.mana,
      gold: arcane.stats.gold,
      xp: arcane.stats.xp,
      items: arcane.items,
      cooldowns: arcane.itemCooldowns,
      decision: [arcane.macroDecision, arcane.microDecision, arcane.aiMode],
      score: [arcane.kills, arcane.deaths, arcane.assists, arcane.laneCreepKills, arcane.denies],
    })),
    creeps: state.creeps.map((creep) => [creep.id, creep.pos.x, creep.pos.y, creep.hp]),
    towers: state.towers.map((tower) => [tower.id, tower.hp]),
    structures: state.structures.map((structure) => [structure.id, structure.hp]),
    bases: state.bases.map((base) => [base.id, base.hp]),
    camps: state.camps.map((camp) => [camp.id, camp.hp, camp.respawn, camp.stackCount]),
    boss: [state.boss.pos.x, state.boss.pos.y, state.boss.hp, state.boss.respawn],
    events: state.events,
  }
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex').slice(0, 16)
}

function runBenchmark() {
  let state = createInitialState(seed)
  let decisionAccumulator = 0
  let nextFrameAt = 0
  let nextDetailsAt = 0
  let pendingFrames = []
  let frameCount = 0
  let stepCount = 0

  structuredClone(createMatchStaticData(state))
  const cpuStartedAt = process.cpuUsage()
  const startedAt = performance.now()

  while (!state.winner && state.time < simulatedSeconds) {
    decisionAccumulator += simulationFrameSeconds
    const shouldDecide = decisionAccumulator >= decisionGateSeconds
    if (shouldDecide) decisionAccumulator %= decisionGateSeconds

    state = tick(state, simulationFrameSeconds, shouldDecide)
    stepCount += 1

    if (state.time + 0.0001 >= nextFrameAt) {
      const includeDetails = state.time + 0.0001 >= nextDetailsAt
      pendingFrames.push(createMatchRenderFrame(state, includeDetails))
      if (includeDetails) nextDetailsAt = state.time + renderDetailsIntervalSeconds
      nextFrameAt += renderFrameIntervalSeconds
      frameCount += 1
    }

    if (stepCount % simulationChunkSteps === 0 && pendingFrames.length > 0) {
      structuredClone(pendingFrames)
      pendingFrames = []
    }
  }

  if (pendingFrames.length > 0) structuredClone(pendingFrames)

  const wallSeconds = (performance.now() - startedAt) / 1000
  const cpuUsage = process.cpuUsage(cpuStartedAt)
  const cpuSeconds = (cpuUsage.user + cpuUsage.system) / 1_000_000
  return {
    wallSeconds,
    cpuSeconds,
    simulatedSeconds: state.time,
    simulationRate: state.time / wallSeconds,
    cpuSimulationRate: state.time / cpuSeconds,
    steps: stepCount,
    frames: frameCount,
    digest: createStateDigest(state),
  }
}

runBenchmark() // warm-up do JIT e dos caches de dados
const results = Array.from({ length: runCount }, (_, index) => {
  const result = runBenchmark()
  console.log(
    `[${index + 1}/${runCount}] ${result.simulatedSeconds.toFixed(1)}s simulados em ` +
    `${result.wallSeconds.toFixed(2)}s wall / ${result.cpuSeconds.toFixed(2)}s CPU ` +
    `(${result.simulationRate.toFixed(1)}x wall; ${result.cpuSimulationRate.toFixed(1)}x CPU) | digest ${result.digest}`,
  )
  return result
})

const digests = new Set(results.map((result) => result.digest))
if (digests.size !== 1) {
  throw new Error(`Benchmark não determinístico: ${[...digests].join(', ')}`)
}

const orderedWallTimes = results.map((result) => result.wallSeconds).sort((a, b) => a - b)
const orderedCpuTimes = results.map((result) => result.cpuSeconds).sort((a, b) => a - b)
function median(values) {
  const middle = Math.floor(values.length / 2)
  return values.length % 2 === 0 ? (values[middle - 1] + values[middle]) / 2 : values[middle]
}
const medianWallSeconds = median(orderedWallTimes)
const medianCpuSeconds = median(orderedCpuTimes)
const medianRate = results[0].simulatedSeconds / medianWallSeconds
const medianCpuRate = results[0].simulatedSeconds / medianCpuSeconds

console.log('')
console.log('=== Benchmark da simulação ===')
console.log(`Seed: ${seed}`)
console.log(`Mediana: ${medianWallSeconds.toFixed(2)}s`)
console.log(`Taxa mediana: ${medianRate.toFixed(1)} segundos simulados/segundo real`)
console.log(`CPU mediana: ${medianCpuSeconds.toFixed(2)}s (${medianCpuRate.toFixed(1)} segundos simulados/segundo de CPU)`)
console.log(`Digest: ${results[0].digest}`)
