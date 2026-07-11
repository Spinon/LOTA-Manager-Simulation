import type { AiMemoryEvent } from '../types/aiTypes.ts'

const DANGER_EVENT_TYPES = new Set<AiMemoryEvent['type']>([
  'hero_death',
  'failed_gank',
  'lost_objective',
  'lost_fight',
])

export function pruneAiMemory(events: AiMemoryEvent[], gameTime: number) {
  return events.filter((event) => event.expiresAtGameTime > gameTime)
}

export function addAiMemoryEvent(events: AiMemoryEvent[], event: AiMemoryEvent, limit = 24) {
  return [event, ...events.filter((current) => current.id !== event.id)]
    .sort((a, b) => b.gameTime - a.gameTime)
    .slice(0, limit)
}

export function areaDangerFromMemory(
  events: AiMemoryEvent[],
  point: { x: number; y: number },
  gameTime: number,
  radius = 18,
) {
  const danger = events.reduce((total, event) => {
    if (!DANGER_EVENT_TYPES.has(event.type) || event.expiresAtGameTime <= gameTime) return total
    const distanceFalloff = Math.max(0, 1 - distance(point, event.position) / radius)
    if (distanceFalloff <= 0) return total
    const duration = Math.max(1, event.expiresAtGameTime - event.gameTime)
    const age = Math.max(0, gameTime - event.gameTime)
    const timeFalloff = Math.max(0.2, 1 - age / duration)
    return total + event.value * distanceFalloff * timeFalloff
  }, 0)

  return Math.round(clamp(danger, 0, 100))
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.sqrt(dx * dx + dy * dy)
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}
