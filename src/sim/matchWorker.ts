import {
  createInitialState,
  createMatchRenderFrame,
  decisionGateSeconds,
  loadGameData,
  simulationFrameSeconds,
  tick,
  type MatchRenderFrame,
  type TeamId,
} from './simulation.ts'

export type MatchWorkerRequest =
  | { type: 'start'; seed: string; runId: number }
  | { type: 'cancel'; runId: number }
  | { type: 'cursor'; runId: number; cursor: number }

export type MatchWorkerResponse =
  | { type: 'frame'; runId: number; frame: MatchRenderFrame }
  | { type: 'progress'; runId: number; simTime: number; frameCount: number; done: boolean }
  | { type: 'done'; runId: number; winner?: TeamId; simTime: number; frameCount: number }
  | { type: 'error'; runId: number; message: string }

const renderFrameIntervalSeconds = 0.1
const maxSimulationSeconds = 50 * 60
const simulationChunkSteps = 2400
const maxBufferedAheadSeconds = 180

let activeRunId = 0
let playbackCursor = 0

self.onmessage = (event: MessageEvent<MatchWorkerRequest>) => {
  const message = event.data
  if (message.type === 'cursor') {
    if (message.runId === activeRunId) playbackCursor = message.cursor
    return
  }

  if (message.type === 'cancel') {
    if (message.runId === activeRunId) activeRunId = 0
    return
  }

  activeRunId = message.runId
  playbackCursor = 0
  void runMatch(message.seed, message.runId)
}

async function runMatch(seed: string, runId: number) {
  try {
    await loadGameData()
    if (runId !== activeRunId) return

    let state = createInitialState(seed)
    let decisionAccumulator = 0
    let nextFrameAt = renderFrameIntervalSeconds
    let frameCount = 0

    const postFrame = () => {
      const response: MatchWorkerResponse = {
        type: 'frame',
        runId,
        frame: createMatchRenderFrame(state),
      }
      self.postMessage(response)
      frameCount += 1
    }

    postFrame()

    const runChunk = () => {
      if (runId !== activeRunId) return

      if (!state.winner && state.time - playbackCursor >= maxBufferedAheadSeconds) {
        const progress: MatchWorkerResponse = {
          type: 'progress',
          runId,
          simTime: state.time,
          frameCount,
          done: false,
        }
        self.postMessage(progress)
        setTimeout(runChunk, 50)
        return
      }

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
