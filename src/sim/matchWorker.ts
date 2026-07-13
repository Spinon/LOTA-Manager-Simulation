import {
  createInitialState,
  createMatchStaticData,
  createMatchRenderFrame,
  loadGameData,
  type MatchRenderFrame,
  type MatchStaticData,
  type TeamId,
} from './simulation.ts'
import { getReplayChunkTransferables, ReplayChunkEncoder, type EncodedReplayChunk } from './replayStore.ts'
import {
  defaultSimulationChunkSteps,
  getNextSimulationChunkSteps,
} from './precomputeScheduling.ts'
import { advanceSimulationClock, createSimulationClock } from './simulationClock.ts'
import { advanceSimulationState } from './simulationRuntime.ts'

export type MatchWorkerRequest =
  | { type: 'start'; seed: string; runId: number }
  | { type: 'cancel'; runId: number }
  | { type: 'cursor'; runId: number; cursor: number }

export type MatchWorkerResponse =
  | { type: 'static'; runId: number; data: MatchStaticData }
  | { type: 'replayChunk'; runId: number; chunk: EncodedReplayChunk }
  | { type: 'progress'; runId: number; simTime: number; frameCount: number; done: boolean }
  | { type: 'done'; runId: number; winner?: TeamId; simTime: number; frameCount: number }
  | { type: 'error'; runId: number; message: string }

const renderFrameIntervalSeconds = 0.2
const renderDetailsIntervalSeconds = 2
let activeRunId = 0
self.onmessage = (event: MessageEvent<MatchWorkerRequest>) => {
  const message = event.data
  if (message.type === 'cursor') {
    return
  }

  if (message.type === 'cancel') {
    if (message.runId === activeRunId) activeRunId = 0
    return
  }

  activeRunId = message.runId
  void runMatch(message.seed, message.runId)
}

async function runMatch(seed: string, runId: number) {
  try {
    await loadGameData()
    if (runId !== activeRunId) return

    let state = createInitialState(seed)
    self.postMessage({ type: 'static', runId, data: createMatchStaticData(state) } satisfies MatchWorkerResponse)
    const simulationClock = createSimulationClock('event')
    let nextFrameAt = state.time + renderFrameIntervalSeconds
    let frameCount = 0
    let lastFrameTime = state.time
    let nextDetailsAt = state.time
    let pendingFrames: MatchRenderFrame[] = []
    let simulationChunkSteps = defaultSimulationChunkSteps
    const replayEncoder = new ReplayChunkEncoder()

    const postFrame = () => {
      const includeDetails = state.time + 0.0001 >= nextDetailsAt
      pendingFrames.push(createMatchRenderFrame(state, includeDetails))
      if (includeDetails) nextDetailsAt = state.time + renderDetailsIntervalSeconds
      frameCount += 1
      lastFrameTime = state.time
    }

    const flushFrames = () => {
      if (pendingFrames.length === 0) return
      const chunk = replayEncoder.encode(pendingFrames)
      const response: MatchWorkerResponse = {
        type: 'replayChunk',
        runId,
        chunk,
      }
      self.postMessage(response, { transfer: getReplayChunkTransferables(chunk) })
      pendingFrames = []
    }

    postFrame()
    flushFrames()

    const runChunk = () => {
      if (runId !== activeRunId) return

      const chunkStartedAt = performance.now()
      for (let step = 0; step < simulationChunkSteps && !state.winner; step += 1) {
        // Replay keyframes are observational. They must never shorten a simulation
        // step or alter combat outcomes; the player reconstructs motion between them.
        const advance = advanceSimulationClock(state, simulationClock)
        state = advanceSimulationState(state, advance)
        if (state.time + 0.0001 >= nextFrameAt) {
          postFrame()
          nextFrameAt += renderFrameIntervalSeconds
        }
      }
      const chunkElapsedMilliseconds = performance.now() - chunkStartedAt
      simulationChunkSteps = getNextSimulationChunkSteps(simulationChunkSteps, chunkElapsedMilliseconds)
      // A vitória pode ocorrer entre dois frames de 0,2s. Sem este snapshot
      // final, o replay para no estado anterior à queda da base.
      if (state.winner && lastFrameTime + 0.0001 < state.time) {
        postFrame()
      }
      flushFrames()

      const progress: MatchWorkerResponse = {
        type: 'progress',
        runId,
        simTime: state.time,
        frameCount,
        done: Boolean(state.winner),
      }
      self.postMessage(progress)

      if (state.winner) {
        const done: MatchWorkerResponse = {
          type: 'done',
          runId,
          winner: state.winner,
          simTime: state.time,
          frameCount,
        }
        self.postMessage(done)
        return
      }

      setTimeout(runChunk, 0)
    }

    setTimeout(runChunk, 0)
  } catch (error) {
    const response: MatchWorkerResponse = {
      type: 'error',
      runId,
      message: error instanceof Error ? error.message : 'Falha ao simular partida',
    }
    self.postMessage(response)
  }
}
