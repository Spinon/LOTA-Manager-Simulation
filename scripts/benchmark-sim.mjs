import { createHash } from 'node:crypto'

import {
  beginArcaneTravelDiagnostics,
  createInitialState,
  createMatchRenderFrame,
  createMatchStaticData,
  decisionGateSeconds,
  endArcaneTravelDiagnostics,
  loadGameData,
  matchPreparationStartSeconds,
  simulationFrameSeconds,
  tick,
} from '../src/sim/simulation.ts'
import { getReplayChunkTransferables, ReplayChunkEncoder } from '../src/sim/replayStore.ts'
import {
  defaultSimulationChunkSteps,
  getNextSimulationChunkSteps,
} from '../src/sim/precomputeScheduling.ts'

const args = process.argv.slice(2)

function hasArg(name) {
  return args.includes(`--${name}`)
}

function getArg(name, fallback) {
  const index = args.indexOf(`--${name}`)
  return index >= 0 && index + 1 < args.length ? args[index + 1] : fallback
}

const simulatedSeconds = Math.max(30, Number(getArg('seconds', 300)) || 300)
const fullMatch = hasArg('full')
const runCount = Math.max(1, Number(getArg('runs', fullMatch ? 1 : 3)) || 1)
const seed = getArg('seed', 'performance-reference')
const creepMotionMode = getArg('creep-motion', 'planned')
if (creepMotionMode !== 'fixed' && creepMotionMode !== 'planned') {
  throw new Error(`Modo de movimento invalido: ${creepMotionMode}`)
}
const creepSpatialMode = getArg('creep-spatial', 'persistent')
if (creepSpatialMode !== 'rebuild' && creepSpatialMode !== 'persistent') {
  throw new Error(`Modo de indice espacial invalido: ${creepSpatialMode}`)
}
const arcaneTravelMode = getArg('arcane-travel', 'planned')
if (arcaneTravelMode !== 'fixed' && arcaneTravelMode !== 'planned') {
  throw new Error(`Modo de viagem dos Arcanes invalido: ${arcaneTravelMode}`)
}
const segmentSeconds = Math.max(60, Number(getArg('segment-seconds', 300)) || 300)
const renderFrameIntervalSeconds = 0.2
const renderDetailsIntervalSeconds = 2

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
  beginArcaneTravelDiagnostics()
  let state = createInitialState(seed, { creepMotionMode, creepSpatialMode, arcaneTravelMode })
  let decisionAccumulator = 0
  let nextFrameAt = state.time
  let nextDetailsAt = state.time
  let pendingFrames = []
  let frameCount = 0
  let stepCount = 0
  let replayBytes = 0
  let tickMilliseconds = 0
  let frameMilliseconds = 0
  let encodeMilliseconds = 0
  let transferMilliseconds = 0
  let simulationChunkSteps = defaultSimulationChunkSteps
  let stepsInCurrentChunk = 0
  let chunkStartedAt = 0
  let segmentStartedAt = performance.now()
  let segmentStartTime = state.time
  let nextSegmentAt = state.time + segmentSeconds
  const segments = []
  const replayEncoder = new ReplayChunkEncoder()

  structuredClone(createMatchStaticData(state))
  const cpuStartedAt = process.cpuUsage()
  const startedAt = performance.now()
  segmentStartedAt = startedAt
  chunkStartedAt = startedAt

  const flushFrames = () => {
    if (pendingFrames.length === 0) return
    let measuredAt = performance.now()
    const chunk = replayEncoder.encode(pendingFrames)
    encodeMilliseconds += performance.now() - measuredAt
    const transferables = getReplayChunkTransferables(chunk)
    replayBytes += transferables.reduce((sum, buffer) => sum + buffer.byteLength, 0)
    measuredAt = performance.now()
    structuredClone(chunk, { transfer: transferables })
    transferMilliseconds += performance.now() - measuredAt
    pendingFrames = []
  }

  while (!state.winner && (fullMatch || state.time < simulatedSeconds)) {
    decisionAccumulator += simulationFrameSeconds
    const shouldDecide = decisionAccumulator >= decisionGateSeconds
    if (shouldDecide) decisionAccumulator %= decisionGateSeconds

    let measuredAt = performance.now()
    state = tick(state, simulationFrameSeconds, shouldDecide)
    tickMilliseconds += performance.now() - measuredAt
    stepCount += 1
    stepsInCurrentChunk += 1

    if (state.time + 0.0001 >= nextFrameAt) {
      const includeDetails = state.time + 0.0001 >= nextDetailsAt
      measuredAt = performance.now()
      pendingFrames.push(createMatchRenderFrame(state, includeDetails))
      frameMilliseconds += performance.now() - measuredAt
      if (includeDetails) nextDetailsAt = state.time + renderDetailsIntervalSeconds
      nextFrameAt += renderFrameIntervalSeconds
      frameCount += 1
    }

    if (stepsInCurrentChunk >= simulationChunkSteps) {
      const chunkElapsedMilliseconds = performance.now() - chunkStartedAt
      simulationChunkSteps = getNextSimulationChunkSteps(simulationChunkSteps, chunkElapsedMilliseconds)
      flushFrames()
      stepsInCurrentChunk = 0
      chunkStartedAt = performance.now()
    }

    if (state.time + 0.0001 >= nextSegmentAt || state.winner) {
      const now = performance.now()
      const elapsedSimulation = state.time - segmentStartTime
      const elapsedWall = (now - segmentStartedAt) / 1000
      segments.push({
        from: segmentStartTime,
        to: state.time,
        wallSeconds: elapsedWall,
        simulationRate: elapsedSimulation / elapsedWall,
        creeps: state.creeps.length,
      })
      segmentStartedAt = now
      segmentStartTime = state.time
      nextSegmentAt += segmentSeconds
    }
  }

  if (state.time > segmentStartTime + 0.0001) {
    const now = performance.now()
    const elapsedSimulation = state.time - segmentStartTime
    const elapsedWall = (now - segmentStartedAt) / 1000
    segments.push({
      from: segmentStartTime,
      to: state.time,
      wallSeconds: elapsedWall,
      simulationRate: elapsedSimulation / elapsedWall,
      creeps: state.creeps.length,
    })
  }
  flushFrames()

  const wallSeconds = (performance.now() - startedAt) / 1000
  const cpuUsage = process.cpuUsage(cpuStartedAt)
  const cpuSeconds = (cpuUsage.user + cpuUsage.system) / 1_000_000
  const arcaneTravelDiagnostics = endArcaneTravelDiagnostics()
  return {
    wallSeconds,
    cpuSeconds,
    simulatedSeconds: state.time - matchPreparationStartSeconds,
    simulationRate: (state.time - matchPreparationStartSeconds) / wallSeconds,
    cpuSimulationRate: (state.time - matchPreparationStartSeconds) / cpuSeconds,
    steps: stepCount,
    frames: frameCount,
    replayBytes,
    componentMilliseconds: {
      tick: tickMilliseconds,
      frame: frameMilliseconds,
      encode: encodeMilliseconds,
      transfer: transferMilliseconds,
    },
    segments,
    arcaneTravelDiagnostics,
    digest: createStateDigest(state),
  }
}

// O modo completo mede a experiência real do primeiro Worker. Aquecer outra
// partida inteira dobraria o tempo do comando e esconderia o custo de partida fria.
if (!fullMatch) runBenchmark()
const results = Array.from({ length: runCount }, (_, index) => {
  const result = runBenchmark()
  console.log(
    `[${index + 1}/${runCount}] ${result.simulatedSeconds.toFixed(1)}s simulados em ` +
    `${result.wallSeconds.toFixed(2)}s wall / ${result.cpuSeconds.toFixed(2)}s CPU ` +
    `(${result.simulationRate.toFixed(1)}x wall; ${result.cpuSimulationRate.toFixed(1)}x CPU) | digest ${result.digest}`,
  )
  if (result.arcaneTravelDiagnostics) {
    const diagnostics = result.arcaneTravelDiagnostics
    console.log(
      `    arcane travel: ${diagnostics.plansStarted}/${diagnostics.candidates} planos, ` +
      `${diagnostics.sleepingSkips} sleeps, ${diagnostics.materializations} materializacoes, ` +
      `${diagnostics.tacticalActivations} ativacoes, ` +
      `${diagnostics.cancelledByDamage} dano / ${diagnostics.cancelledByControl} controle / ` +
      `${diagnostics.cancelledByDecision} decisao / ${diagnostics.cancelledByCall} call; ` +
      `rejeicoes ${diagnostics.rejectedAtBase} base / ${diagnostics.rejectedKind} tipo / ` +
      `${diagnostics.rejectedDeadline} prazo / ${diagnostics.rejectedDistance} distancia / ${diagnostics.rejectedThreat} ameaca; ` +
      `${diagnostics.kinematicUpdates} cinemáticos / ${diagnostics.fullUpdates} completos`,
    )
  }
  const measuredTotal = Object.values(result.componentMilliseconds).reduce((sum, value) => sum + value, 0)
  console.log(
    `    tick ${formatShare(result.componentMilliseconds.tick, measuredTotal)} | ` +
    `frame ${formatShare(result.componentMilliseconds.frame, measuredTotal)} | ` +
    `encode ${formatShare(result.componentMilliseconds.encode, measuredTotal)} | ` +
    `transfer ${formatShare(result.componentMilliseconds.transfer, measuredTotal)} | ` +
    `replay ${(result.replayBytes / 1024 / 1024).toFixed(1)} MB`,
  )
  for (const segment of result.segments) {
    console.log(
      `    ${formatClock(segment.from)} -> ${formatClock(segment.to)}: ` +
      `${segment.wallSeconds.toFixed(2)}s (${segment.simulationRate.toFixed(1)}x), ${segment.creeps} creeps`,
    )
  }
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
console.log(`Modo: ${fullMatch ? 'partida completa' : `até ${formatClock(simulatedSeconds)}`}`)
console.log(`Movimento de creeps: ${creepMotionMode}`)
console.log(`Indice espacial de creeps: ${creepSpatialMode}`)
console.log(`Viagem dos Arcanes: ${arcaneTravelMode}`)
console.log(`Mediana: ${medianWallSeconds.toFixed(2)}s`)
console.log(`Taxa mediana: ${medianRate.toFixed(1)} segundos simulados/segundo real`)
console.log(`CPU mediana: ${medianCpuSeconds.toFixed(2)}s (${medianCpuRate.toFixed(1)} segundos simulados/segundo de CPU)`)
console.log(`Digest: ${results[0].digest}`)

function formatShare(value, total) {
  return `${(value / 1000).toFixed(2)}s (${(value / Math.max(1, total) * 100).toFixed(1)}%)`
}

function formatClock(time) {
  const sign = time < 0 ? '-' : ''
  const absolute = Math.abs(Math.round(time))
  return `${sign}${String(Math.floor(absolute / 60)).padStart(2, '0')}:${String(absolute % 60).padStart(2, '0')}`
}
