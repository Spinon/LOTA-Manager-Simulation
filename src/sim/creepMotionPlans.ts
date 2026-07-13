export type MotionPoint = {
  x: number
  y: number
}

export type CreepMotionPlan = {
  kind: 'route' | 'hold'
  from: MotionPoint
  destination: MotionPoint
  startedAt: number
  endsAt: number
  wakeAt: number
  speed: number
}

const motionEpsilon = 0.000001

export function createCreepMotionPlan(
  kind: CreepMotionPlan['kind'],
  from: MotionPoint,
  destination: MotionPoint,
  speed: number,
  startedAt: number,
  wakeAt: number,
): CreepMotionPlan {
  return scheduleCreepMotionPlan(undefined, kind, from, destination, speed, startedAt, wakeAt)
}

export function scheduleCreepMotionPlan(
  existing: CreepMotionPlan | undefined,
  kind: CreepMotionPlan['kind'],
  from: MotionPoint,
  destination: MotionPoint,
  speed: number,
  startedAt: number,
  wakeAt: number,
): CreepMotionPlan {
  const boundedWakeAt = Math.max(startedAt, wakeAt)
  const travelSeconds = kind === 'hold' || speed <= 0
    ? Number.POSITIVE_INFINITY
    : pointDistance(from, destination) / speed
  const reachesDestinationAt = Number.isFinite(travelSeconds)
    ? startedAt + travelSeconds
    : boundedWakeAt
  const endsAt = kind === 'route' && travelSeconds > motionEpsilon
    ? Math.min(boundedWakeAt, reachesDestinationAt)
    : boundedWakeAt

  if (!existing) {
    return {
      kind,
      from: { ...from },
      destination: { ...destination },
      startedAt,
      endsAt,
      wakeAt: boundedWakeAt,
      speed,
    }
  }

  existing.kind = kind
  existing.from.x = from.x
  existing.from.y = from.y
  existing.destination.x = destination.x
  existing.destination.y = destination.y
  existing.startedAt = startedAt
  existing.endsAt = endsAt
  existing.wakeAt = boundedWakeAt
  existing.speed = speed
  return existing
}

export function sampleCreepMotionPlan(plan: CreepMotionPlan, time: number): MotionPoint {
  if (plan.kind === 'hold' || plan.speed <= 0 || time <= plan.startedAt) return { ...plan.from }

  const totalDistance = pointDistance(plan.from, plan.destination)
  if (totalDistance <= motionEpsilon) return { ...plan.destination }
  const travelledDistance = Math.min(totalDistance, plan.speed * Math.max(0, time - plan.startedAt))
  const ratio = travelledDistance / totalDistance
  return {
    x: plan.from.x + (plan.destination.x - plan.from.x) * ratio,
    y: plan.from.y + (plan.destination.y - plan.from.y) * ratio,
  }
}

export function rebaseCreepMotionPlan(plan: CreepMotionPlan, position: MotionPoint, time: number) {
  return scheduleCreepMotionPlan(
    plan,
    plan.kind,
    position,
    plan.kind === 'hold' ? position : plan.destination,
    plan.speed,
    time,
    plan.wakeAt,
  )
}

function pointDistance(a: MotionPoint, b: MotionPoint) {
  const x = a.x - b.x
  const y = a.y - b.y
  return Math.sqrt(x * x + y * y)
}
