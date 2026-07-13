import { createHash } from 'node:crypto'

import {
  beginArcaneTravelDiagnostics,
  createInitialState,
  createMatchRenderFrame,
  createMatchStaticData,
  endArcaneTravelDiagnostics,
  loadGameData,
  matchPreparationStartSeconds,
} from '../src/sim/simulation.ts'
import { getReplayChunkTransferables, ReplayChunkEncoder } from '../src/sim/replayStore.ts'
import {
  defaultSimulationChunkSteps,
  getNextSimulationChunkSteps,
} from '../src/sim/precomputeScheduling.ts'
import {
  advanceSimulationClock,
  createSimulationClock,
  readSimulationClockDiagnostics,
} from '../src/sim/simulationClock.ts'
import { advanceSimulationState } from '../src/sim/simulationRuntime.ts'

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
const creepStorageMode = getArg('creep-storage', 'soa')
if (creepStorageMode !== 'object' && creepStorageMode !== 'soa') {
  throw new Error(`Modo de armazenamento de creeps invalido: ${creepStorageMode}`)
}
const arcaneTravelMode = getArg('arcane-travel', 'planned')
if (arcaneTravelMode !== 'fixed' && arcaneTravelMode !== 'planned') {
  throw new Error(`Modo de viagem dos Arcanes invalido: ${arcaneTravelMode}`)
}
const clockMode = getArg('clock', 'event')
if (clockMode !== 'fixed' && clockMode !== 'event') {
  throw new Error(`Modo de relogio invalido: ${clockMode}`)
}
const tacticalSubsteps = getArg('tactical-substeps', 'on')
if (tacticalSubsteps !== 'on' && tacticalSubsteps !== 'off') {
  throw new Error(`Modo de substeps taticos invalido: ${tacticalSubsteps}`)
}
const clockMaxFrames = Math.max(1, Math.floor(Number(getArg('clock-max-frames', 9)) || 9))
const replayClockBound = getArg('replay-clock-bound', 'on')
if (replayClockBound !== 'on' && replayClockBound !== 'off') {
  throw new Error(`Acoplamento do replay invalido: ${replayClockBound}`)
}
const replayCapture = getArg('replay-capture', 'on')
if (replayCapture !== 'on' && replayCapture !== 'off') {
  throw new Error(`Captura do replay invalida: ${replayCapture}`)
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
  if (typeof global.gc === 'function') global.gc()
  beginArcaneTravelDiagnostics()
  let state = createInitialState(seed, { creepMotionMode, creepSpatialMode, creepStorageMode, arcaneTravelMode })
  const simulationClock = createSimulationClock(clockMode, clockMaxFrames)
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
  const initialMemory = process.memoryUsage()
  let peakHeapUsed = initialMemory.heapUsed
  let peakArrayBuffers = initialMemory.arrayBuffers
  let segmentStartedAt = performance.now()
  let segmentStartTime = state.time
  let nextSegmentAt = state.time + segmentSeconds
  const segments = []
  const replayEncoder = new ReplayChunkEncoder()

  if (replayCapture === 'on') structuredClone(createMatchStaticData(state))
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
    const advance = advanceSimulationClock(
      state,
      simulationClock,
      replayClockBound === 'on' ? nextFrameAt : Number.POSITIVE_INFINITY,
    )
    let measuredAt = performance.now()
    state = advanceSimulationState(state, advance, tacticalSubsteps === 'on')
    tickMilliseconds += performance.now() - measuredAt
    stepCount += 1
    stepsInCurrentChunk += 1

    if (state.time + 0.0001 >= nextFrameAt) {
      const includeDetails = state.time + 0.0001 >= nextDetailsAt
      measuredAt = performance.now()
      if (replayCapture === 'on') {
        pendingFrames.push(createMatchRenderFrame(state, includeDetails))
        frameMilliseconds += performance.now() - measuredAt
      }
      if (includeDetails) nextDetailsAt = state.time + renderDetailsIntervalSeconds
      do nextFrameAt += renderFrameIntervalSeconds
      while (nextFrameAt <= state.time + 0.0001)
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
      const memory = process.memoryUsage()
      peakHeapUsed = Math.max(peakHeapUsed, memory.heapUsed)
      peakArrayBuffers = Math.max(peakArrayBuffers, memory.arrayBuffers)
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
  const endingMemory = process.memoryUsage()
  peakHeapUsed = Math.max(peakHeapUsed, endingMemory.heapUsed)
  peakArrayBuffers = Math.max(peakArrayBuffers, endingMemory.arrayBuffers)

  const wallSeconds = (performance.now() - startedAt) / 1000
  const cpuUsage = process.cpuUsage(cpuStartedAt)
  const cpuSeconds = (cpuUsage.user + cpuUsage.system) / 1_000_000
  if (typeof global.gc === 'function') global.gc()
  const finalMemory = process.memoryUsage()
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
    clockDiagnostics: readSimulationClockDiagnostics(simulationClock),
    memory: {
      initialHeapUsed: initialMemory.heapUsed,
      peakHeapUsed,
      finalHeapUsed: finalMemory.heapUsed,
      peakArrayBuffers,
      finalArrayBuffers: finalMemory.arrayBuffers,
    },
    winner: state.winner,
    kills: state.kills,
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
  if (result.winner) console.log(`    resultado: ${result.winner} | kills ${result.kills.dawn}-${result.kills.dusk}`)
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
  const clock = result.clockDiagnostics
  console.log(
    `    clock ${clockMode}: ${clock.ticks} ticks / ${clock.virtualFrames} frames virtuais, ` +
    `${clock.skippedFrames} frames saltados, ${clock.fixedStepTicks} ticks em ilhas, ` +
    `${clock.eventWakeups} despertares por evento, pico ${clock.peakIslandCount} ilhas / ` +
    `${clock.peakTacticalEntityCount} entidades, ${clock.tacticalEntitySamples} microamostras`,
  )
  console.log(
    `    memoria: heap ${formatBytes(result.memory.initialHeapUsed)} inicial / ` +
    `${formatBytes(result.memory.peakHeapUsed)} pico / ${formatBytes(result.memory.finalHeapUsed)} final; ` +
    `array buffers ${formatBytes(result.memory.peakArrayBuffers)} pico`,
  )
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
console.log(`Armazenamento de creeps: ${creepStorageMode}`)
console.log(`Viagem dos Arcanes: ${arcaneTravelMode}`)
console.log(`Relogio: ${clockMode}`)
console.log(`Horizonte maximo do relogio: ${clockMaxFrames} frames`)
console.log(`Relogio preso ao replay: ${replayClockBound}`)
console.log(`Captura do replay: ${replayCapture}`)
console.log(`Substeps taticos: ${tacticalSubsteps}`)
console.log(`Mediana: ${medianWallSeconds.toFixed(2)}s`)
console.log(`Taxa mediana: ${medianRate.toFixed(1)} segundos simulados/segundo real`)
console.log(`CPU mediana: ${medianCpuSeconds.toFixed(2)}s (${medianCpuRate.toFixed(1)} segundos simulados/segundo de CPU)`)
console.log(`Digest: ${results[0].digest}`)

function formatShare(value, total) {
  return `${(value / 1000).toFixed(2)}s (${(value / Math.max(1, total) * 100).toFixed(1)}%)`
}

function formatBytes(value) {
  return `${(value / 1024 / 1024).toFixed(1)} MB`
}

function formatClock(time) {
  const sign = time < 0 ? '-' : ''
  const absolute = Math.abs(Math.round(time))
  return `${sign}${String(Math.floor(absolute / 60)).padStart(2, '0')}:${String(absolute % 60).padStart(2, '0')}`
}
