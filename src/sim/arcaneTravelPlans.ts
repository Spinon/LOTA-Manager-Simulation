export type TravelPoint = {
  x: number
  y: number
}

export type ArcaneTravelKind = 'base' | 'lane' | 'objective' | 'formation'

export type ArcaneTravelPlan = {
  kind: ArcaneTravelKind
  from: TravelPoint
  destination: TravelPoint
  startedAt: number
  endsAt: number
  wakeAt: number
  speed: number
  targetSignature: string
  decisionSignature: string
  teamCallSignature: string
  damageTakenAtStart: number
}

const travelEpsilon = 0.000001

export function scheduleArcaneTravelPlan(
  existing: ArcaneTravelPlan | undefined,
  kind: ArcaneTravelKind,
  from: TravelPoint,
  destination: TravelPoint,
  speed: number,
  startedAt: number,
  wakeAt: number,
  targetSignature: string,
  decisionSignature: string,
  teamCallSignature: string,
  damageTakenAtStart: number,
): ArcaneTravelPlan {
  const boundedWakeAt = Math.max(startedAt, wakeAt)
  const travelSeconds = speed <= 0 ? 0 : pointDistance(from, destination) / speed
  const arrivalAt = startedAt + travelSeconds
  const endsAt = travelSeconds > travelEpsilon ? Math.min(boundedWakeAt, arrivalAt) : startedAt

  if (!existing) {
    return {
      kind,
      from: { ...from },
      destination: { ...destination },
      startedAt,
      endsAt,
      wakeAt: boundedWakeAt,
      speed,
      targetSignature,
      decisionSignature,
      teamCallSignature,
      damageTakenAtStart,
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
  existing.targetSignature = targetSignature
  existing.decisionSignature = decisionSignature
  existing.teamCallSignature = teamCallSignature
  existing.damageTakenAtStart = damageTakenAtStart
  return existing
}

export function sampleArcaneTravelPlan(plan: ArcaneTravelPlan, time: number): TravelPoint {
  if (plan.speed <= 0 || time <= plan.startedAt) return { ...plan.from }
  const totalDistance = pointDistance(plan.from, plan.destination)
  if (totalDistance <= travelEpsilon) return { ...plan.destination }
  const travelledDistance = Math.min(totalDistance, plan.speed * Math.max(0, time - plan.startedAt))
  const ratio = travelledDistance / totalDistance
  return {
    x: plan.from.x + (plan.destination.x - plan.from.x) * ratio,
    y: plan.from.y + (plan.destination.y - plan.from.y) * ratio,
  }
}

export function rebaseArcaneTravelPlan(plan: ArcaneTravelPlan, position: TravelPoint, time: number) {
  return scheduleArcaneTravelPlan(
    plan,
    plan.kind,
    position,
    plan.destination,
    plan.speed,
    time,
    plan.wakeAt,
    plan.targetSignature,
    plan.decisionSignature,
    plan.teamCallSignature,
    plan.damageTakenAtStart,
  )
}

function pointDistance(a: TravelPoint, b: TravelPoint) {
  const x = a.x - b.x
  const y = a.y - b.y
  return Math.sqrt(x * x + y * y)
}
