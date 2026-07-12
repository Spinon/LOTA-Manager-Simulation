import {
  createInitialState,
  createMatchStaticData,
  createMatchRenderFrame,
  decisionGateSeconds,
  loadGameData,
  simulationFrameSeconds,
  tick,
  type MatchRenderFrame,
  type MatchStaticData,
  type TeamId,
} from './simulation.ts'
import { getReplayChunkTransferables, ReplayChunkEncoder, type EncodedReplayChunk } from './replayStore.ts'

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
const maxSimulationSeconds = 50 * 60
// Chunks curtos: cada flush vira um postMessage que o main thread precisa
// desserializar de forma síncrona — lotes de ~5s de jogo (~25 frames) mantêm
// esse bloqueio abaixo de ~15ms e deixam o worker responder rápido ao cursor.
const simulationChunkSteps = 150

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
    let decisionAccumulator = 0
    let nextFrameAt = renderFrameIntervalSeconds
    let frameCount = 0
    let lastFrameTime = -1
    let nextDetailsAt = 0
    let pendingFrames: MatchRenderFrame[] = []
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

      for (let step = 0; step < simulationChunkSteps && !state.winner && state.time < maxSimulationSeconds; step += 1) {
        decisionAccumulator += simulationFrameSeconds
        const shouldDecide = decisionAccumulator >= decisionGateSeconds
        if (shouldDecide) decisionAccumulator %= decisionGateSeconds

        state = tick(state, simulationFrameSeconds, shouldDecide)
        if (state.time + 0.0001 >= nextFrameAt) {
          postFrame()
          nextFrameAt += renderFrameIntervalSeconds
        }
      }
      // A vitória pode ocorrer entre dois frames de 0,2s. Sem este snapshot
      // final, o replay para no estado anterior à queda da base.
      if ((state.winner || state.time >= maxSimulationSeconds) && lastFrameTime + 0.0001 < state.time) {
        postFrame()
      }
      flushFrames()

      const progress: MatchWorkerResponse = {
        type: 'progress',
        runId,
        simTime: state.time,
        frameCount,
        done: Boolean(state.winner) || state.time >= maxSimulationSeconds,
      }
      self.postMessage(progress)

      if (state.winner || state.time >= maxSimulationSeconds) {
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
