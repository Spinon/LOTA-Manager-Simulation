export const defaultSimulationChunkSteps = 900
export const minimumSimulationChunkSteps = 300
export const maximumSimulationChunkSteps = 3_600
export const targetSimulationChunkMilliseconds = 250

export function getNextSimulationChunkSteps(currentSteps: number, elapsedMilliseconds: number) {
  if (!Number.isFinite(elapsedMilliseconds) || elapsedMilliseconds <= 0) return currentSteps

  const measuredTarget = currentSteps * targetSimulationChunkMilliseconds / elapsedMilliseconds
  const smoothedTarget = Math.round(currentSteps * 0.5 + measuredTarget * 0.5)
  return Math.min(
    maximumSimulationChunkSteps,
    Math.max(minimumSimulationChunkSteps, smoothedTarget),
  )
}
