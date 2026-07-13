import { tick, tickTacticalIslands, type SimulationState } from './simulation.ts'
import type { SimulationAdvance } from './simulationClock.ts'

export function advanceSimulationState(
  state: SimulationState,
  advance: SimulationAdvance,
  tacticalSubsteps = true,
) {
  const tacticalEntityIds = new Set(advance.tacticalEntityIds)
  if (
    !tacticalSubsteps || advance.virtualFrames <= 1 || tacticalEntityIds.size === 0 ||
    advance.tacticalEvents.length === 0
  ) {
    return tick(state, advance.elapsedSeconds, advance.shouldDecide, advance.clockSeconds, {
      decisionElapsedSeconds: advance.decisionElapsedSeconds,
      deferArcaneSafetyUntilDecision: advance.eventDriven,
    })
  }

  const previousWorldTime = state.time
  const elapsedPerFrame = advance.elapsedSeconds / advance.virtualFrames
  const clockPerFrame = advance.clockSeconds / advance.virtualFrames
  let consumedFrames = 0
  for (const event of advance.tacticalEvents) {
    if (state.winner) break
    const elapsedFrames = event.frame - consumedFrames
    state = tickTacticalIslands(
      state,
      elapsedPerFrame * elapsedFrames,
      clockPerFrame * elapsedFrames,
      new Set(event.actorIds),
    )
    consumedFrames = event.frame
  }
  if (state.winner) return state

  return tick(
    state,
    advance.elapsedSeconds,
    advance.shouldDecide,
    clockPerFrame * (advance.virtualFrames - consumedFrames),
    {
      decisionElapsedSeconds: advance.decisionElapsedSeconds,
      previousWorldTime,
      deferArcaneSafetyUntilDecision: advance.eventDriven,
    },
  )
}
