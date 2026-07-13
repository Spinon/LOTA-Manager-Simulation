import {
  decisionGateSeconds,
  getCombatTargetById,
  getEffectiveArcaneAttackCooldown,
  simulationFrameSeconds,
  type Arcane,
  type CombatTarget,
  type Point,
  type SimulationState,
} from './simulation.ts'

export type SimulationClockMode = 'fixed' | 'event'

export type TacticalIsland = {
  id: string
  center: Point
  radius: number
  memberIds: string[]
  reasons: string[]
  requiresFixedStep: boolean
}

export type SimulationScheduleSnapshot = {
  islands: TacticalIsland[]
  nextEventAt: number
}

export type SimulationClockDiagnostics = {
  ticks: number
  virtualFrames: number
  skippedFrames: number
  fixedStepTicks: number
  eventTicks: number
  eventWakeups: number
  islandSamples: number
  peakIslandCount: number
  tacticalEntitySamples: number
  peakTacticalEntityCount: number
  maxFramesPerTick: number
}

export type SimulationClock = {
  mode: SimulationClockMode
  maximumEventJumpFrames: number
  decisionAccumulator: number
  diagnostics: SimulationClockDiagnostics
}

export type SimulationAdvance = {
  eventDriven: boolean
  elapsedSeconds: number
  clockSeconds: number
  shouldDecide: boolean
  decisionElapsedSeconds: number
  virtualFrames: number
  islandCount: number
  requiresFixedStep: boolean
  tacticalEntityIds: string[]
  tacticalEvents: TacticalEventBucket[]
}

export type TacticalEventBucket = {
  frame: number
  actorIds: string[]
}

type TacticalIslandSeed = Omit<TacticalIsland, 'id' | 'memberIds' | 'reasons'> & {
  memberIds: Set<string>
  reasons: Set<string>
}

const timeEpsilon = 0.0001
const fixedClockFrameSeconds = Number(simulationFrameSeconds.toFixed(3))
const tacticalMergePadding = 0.75
export const defaultMaximumEventJumpFrames = 9

export function createSimulationClock(
  mode: SimulationClockMode = 'event',
  maximumEventJumpFrames = defaultMaximumEventJumpFrames,
): SimulationClock {
  return {
    mode,
    maximumEventJumpFrames: Math.max(1, Math.floor(maximumEventJumpFrames)),
    decisionAccumulator: 0,
    diagnostics: {
      ticks: 0,
      virtualFrames: 0,
      skippedFrames: 0,
      fixedStepTicks: 0,
      eventTicks: 0,
      eventWakeups: 0,
      islandSamples: 0,
      peakIslandCount: 0,
      tacticalEntitySamples: 0,
      peakTacticalEntityCount: 0,
      maxFramesPerTick: 1,
    },
  }
}

export function readSimulationClockDiagnostics(clock: SimulationClock): SimulationClockDiagnostics {
  return { ...clock.diagnostics }
}

export function advanceSimulationClock(
  state: SimulationState,
  clock: SimulationClock,
  nextExternalEventAt = Number.POSITIVE_INFINITY,
): SimulationAdvance {
  const schedule = clock.mode === 'event'
    ? inspectSimulationSchedule(state)
    : { islands: [], nextEventAt: Number.POSITIVE_INFINITY }
  const fixedStepIslands = schedule.islands.filter((island) => island.requiresFixedStep)
  const requiresFixedStep = fixedStepIslands.length > 0
  const tacticalEntityIds = [...new Set(fixedStepIslands.flatMap((island) => island.memberIds))].sort()
  const nextEventAt = Math.min(schedule.nextEventAt, nextExternalEventAt)
  const framesUntilEvent = getFramesUntilTime(state.time, nextEventAt)
  const virtualFrames = clock.mode === 'fixed'
    ? 1
    : Math.max(1, Math.min(clock.maximumEventJumpFrames, framesUntilEvent))
  const tacticalEvents = clock.mode === 'event'
    ? collectTacticalEventBuckets(state, tacticalEntityIds, virtualFrames)
    : []

  const accumulated = clock.decisionAccumulator + simulationFrameSeconds * virtualFrames
  const decisionSteps = Math.floor((accumulated + Number.EPSILON) / decisionGateSeconds)
  const shouldDecide = decisionSteps > 0
  const decisionElapsedSeconds = Number((decisionSteps * decisionGateSeconds).toFixed(6))
  clock.decisionAccumulator = accumulated - decisionElapsedSeconds

  const diagnostics = clock.diagnostics
  diagnostics.ticks += 1
  diagnostics.virtualFrames += virtualFrames
  diagnostics.skippedFrames += virtualFrames - 1
  diagnostics.maxFramesPerTick = Math.max(diagnostics.maxFramesPerTick, virtualFrames)
  diagnostics.peakIslandCount = Math.max(diagnostics.peakIslandCount, schedule.islands.length)
  diagnostics.tacticalEntitySamples += tacticalEvents.reduce((sum, event) => sum + event.actorIds.length, 0)
  diagnostics.peakTacticalEntityCount = Math.max(diagnostics.peakTacticalEntityCount, tacticalEntityIds.length)
  if (clock.mode === 'fixed') {
    diagnostics.fixedStepTicks += 1
  } else if (requiresFixedStep) {
    diagnostics.fixedStepTicks += 1
    diagnostics.islandSamples += schedule.islands.length
  } else {
    diagnostics.eventTicks += 1
    if (framesUntilEvent < clock.maximumEventJumpFrames) diagnostics.eventWakeups += 1
  }

  return {
    eventDriven: clock.mode === 'event',
    elapsedSeconds: Number((simulationFrameSeconds * virtualFrames).toFixed(9)),
    clockSeconds: Number((fixedClockFrameSeconds * virtualFrames).toFixed(6)),
    shouldDecide,
    decisionElapsedSeconds,
    virtualFrames,
    islandCount: schedule.islands.length,
    requiresFixedStep,
    tacticalEntityIds,
    tacticalEvents,
  }
}

function collectTacticalEventBuckets(
  state: SimulationState,
  tacticalEntityIds: string[],
  virtualFrames: number,
) {
  if (virtualFrames <= 1 || tacticalEntityIds.length === 0) return []
  const tacticalIds = new Set(tacticalEntityIds)
  const actorsByFrame = new Map<number, Set<string>>()
  const offer = (actorId: string, eventAt: number) => {
    const frame = getFramesUntilTime(state.time, eventAt)
    if (frame >= virtualFrames) return
    let actors = actorsByFrame.get(frame)
    if (!actors) {
      actors = new Set<string>()
      actorsByFrame.set(frame, actors)
    }
    actors.add(actorId)
  }

  for (const arcane of state.arcanes) {
    if (!tacticalIds.has(arcane.id) || !arcane.combatTargetId || arcane.stats.hp <= 0 || arcane.respawn > state.time) continue
    offer(arcane.id, arcane.lastAttack + getEffectiveArcaneAttackCooldown(state, arcane))
  }
  for (const creep of state.creeps) {
    if (!tacticalIds.has(creep.id) || !creep.routeTargetId || creep.hp <= 0 || creep.motionPlan?.kind === 'route') continue
    offer(creep.id, creep.lastAttack + 1.25)
  }
  for (const tower of state.towers) {
    if (tacticalIds.has(tower.id) && tower.hp > 0) offer(tower.id, tower.lastAttack + 1.2)
  }
  for (const structure of state.structures) {
    if (tacticalIds.has(structure.id) && structure.hp > 0 && structure.kind === 'tower_tier_4') {
      offer(structure.id, structure.lastAttack + 1.05)
    }
  }
  for (const camp of state.camps) {
    if (tacticalIds.has(camp.id) && camp.hp > 0) offer(camp.id, camp.lastAttack + 1.35)
  }
  if (tacticalIds.has(state.boss.id) && state.boss.hp > 0) offer(state.boss.id, state.boss.lastAttack + 1.05)
  return [...actorsByFrame.entries()]
    .sort(([left], [right]) => left - right)
    .map(([frame, actorIds]) => ({ frame, actorIds: [...actorIds].sort() }))
}

export function inspectSimulationSchedule(state: SimulationState): SimulationScheduleSnapshot {
  const seeds = collectTacticalIslandSeeds(state)
  const islands = mergeTacticalIslandSeeds(seeds)
  return {
    islands,
    nextEventAt: collectNextSimulationEventAt(state),
  }
}

export function getFramesUntilDecision(decisionAccumulator: number) {
  const remaining = Math.max(0, decisionGateSeconds - decisionAccumulator)
  return Math.max(1, Math.ceil((remaining - Number.EPSILON) / simulationFrameSeconds))
}

export function getFramesUntilTime(time: number, eventAt: number) {
  if (!Number.isFinite(eventAt)) return Number.POSITIVE_INFINITY
  if (eventAt <= time + timeEpsilon) return 1
  return Math.max(1, Math.ceil((eventAt - time - timeEpsilon) / fixedClockFrameSeconds))
}

function collectNextSimulationEventAt(state: SimulationState) {
  let nextEventAt = Number.POSITIVE_INFINITY
  const offer = (eventAt: number | undefined) => {
    if (eventAt === undefined || !Number.isFinite(eventAt) || eventAt <= state.time + timeEpsilon) return
    if (eventAt < nextEventAt) nextEventAt = eventAt
  }

  offer(state.nextWave)
  for (const arcane of state.arcanes) {
    if (arcane.stats.hp <= 0) offer(arcane.respawn)
    offer(arcane.channeling?.completesAt)
    for (const skillState of Object.values(arcane.skillStates)) offer(skillState.activeUntil)
  }

  offer(state.boss.respawn)

  for (const effect of state.timedEffects) {
    offer(effect.nextTickAt)
    offer(effect.expiresAt)
  }
  for (const call of Object.values(state.teamCalls)) offer(call?.expiresAt)
  for (const aura of Object.values(state.teamAuras)) offer(aura?.expiresAt)
  for (const fortification of Object.values(state.teamFortifications)) {
    offer(fortification.activeUntil)
  }

  return nextEventAt
}

function collectTacticalIslandSeeds(state: SimulationState) {
  const seeds: TacticalIslandSeed[] = []
  const movingArcaneIds = new Set(
    state.arcanes.filter((arcane) => isArcaneMoving(arcane, state.time)).map((arcane) => arcane.id),
  )

  for (const team of ['dawn', 'dusk'] as const) {
    for (const board of state.combatBlackboards[team]) {
      if (board.phase === 'disengage' || board.phase === 'reset' || board.expiresAt <= state.time) continue
      const members = [...board.alliedHeroIds, ...board.enemyHeroIds]
      seeds.push(createIslandSeed(
        board.center,
        Math.max(1.25, board.radius + tacticalMergePadding),
        members,
        `combat:${board.encounterType}`,
        true,
      ))
    }
  }

  for (const arcane of state.arcanes) {
    if (arcane.stats.hp <= 0 || arcane.respawn > state.time) continue
    const target = arcane.combatTargetId ? getCombatTargetById(state, arcane.combatTargetId) : undefined
    if (target) {
      seeds.push(createLinkIsland(
        arcane,
        target,
        `target:${getTargetCategory(target)}`,
        true,
      ))
    }
    if (!movingArcaneIds.has(arcane.id)) continue
    collectNearbyObjectiveSeeds(state, arcane, seeds)
  }

  for (const creep of state.creeps) {
    if (creep.hp <= 0 || !creep.routeTargetId) continue
    const target = getCombatTargetById(state, creep.routeTargetId)
    if (!target) continue
    seeds.push(createLinkIsland(creep, target, 'lane-contact', creep.motionPlan?.kind !== 'route'))
  }

  for (const camp of state.camps) {
    if (camp.hp <= 0 || !camp.aggroTargetId || (camp.aggroUntil ?? 0) <= state.time) continue
    const target = getCombatTargetById(state, camp.aggroTargetId)
    if (target) seeds.push(createLinkIsland(camp, target, `camp:${camp.strength}`, true))
  }
  if (state.boss.hp > 0 && state.boss.aggroTargetId && (state.boss.aggroUntil ?? 0) > state.time) {
    const target = getCombatTargetById(state, state.boss.aggroTargetId)
    if (target) seeds.push(createLinkIsland(state.boss, target, 'boss', true))
  }

  collectConvergentArcaneSeeds(state, movingArcaneIds, seeds)
  return seeds
}

function collectNearbyObjectiveSeeds(state: SimulationState, arcane: Arcane, seeds: TacticalIslandSeed[]) {
  const destination = arcane.movementDestination ?? arcane.target
  const objectives: CombatTarget[] = [
    ...state.towers.filter((tower) => tower.team !== arcane.team && tower.hp > 0),
    ...state.structures.filter((structure) => structure.team !== arcane.team && structure.hp > 0),
    ...state.bases.filter((base) => base.team !== arcane.team && base.hp > 0),
  ]
  if (arcane.microDecision.includes('campo') || arcane.microDecision.includes('chefe')) {
    objectives.push(...state.camps.filter((camp) => camp.hp > 0), state.boss)
  }

  for (const objective of objectives) {
    const activationRadius = 'range' in objective ? objective.range + 2 : 3
    if (
      pointDistance(arcane.pos, objective.pos) > activationRadius &&
      pointDistance(destination, objective.pos) > activationRadius
    ) continue
    seeds.push(createLinkIsland(arcane, objective, `approach:${getTargetCategory(objective)}`, true))
  }
}

function collectConvergentArcaneSeeds(
  state: SimulationState,
  movingArcaneIds: Set<string>,
  seeds: TacticalIslandSeed[],
) {
  const alive = state.arcanes.filter((arcane) => arcane.stats.hp > 0 && arcane.respawn <= state.time)
  for (let leftIndex = 0; leftIndex < alive.length; leftIndex += 1) {
    const left = alive[leftIndex]
    for (let rightIndex = leftIndex + 1; rightIndex < alive.length; rightIndex += 1) {
      const right = alive[rightIndex]
      if (left.team === right.team) continue
      const distanceNow = pointDistance(left.pos, right.pos)
      const leftDestination = left.movementDestination ?? left.target
      const rightDestination = right.movementDestination ?? right.target
      const converging = pointDistance(leftDestination, rightDestination) <= 4.5
      if (distanceNow > 8 && !converging) continue
      const moving = movingArcaneIds.has(left.id) || movingArcaneIds.has(right.id)
      seeds.push(createLinkIsland(left, right, 'convergent-trajectory', moving))
    }
  }
}

function mergeTacticalIslandSeeds(seeds: TacticalIslandSeed[]): TacticalIsland[] {
  const merged: TacticalIslandSeed[] = []
  for (const seed of seeds) {
    let target = merged.find((island) => (
      pointDistance(island.center, seed.center) <= island.radius + seed.radius
    ))
    if (!target) {
      merged.push(seed)
      continue
    }
    mergeIslandInto(target, seed)

    for (let index = merged.length - 1; index >= 0; index -= 1) {
      const candidate = merged[index]
      if (candidate === target) continue
      if (pointDistance(target.center, candidate.center) > target.radius + candidate.radius) continue
      mergeIslandInto(target, candidate)
      merged.splice(index, 1)
    }
  }

  return merged.map((island, index) => ({
    id: `island-${index}`,
    center: island.center,
    radius: island.radius,
    memberIds: [...island.memberIds].sort(),
    reasons: [...island.reasons].sort(),
    requiresFixedStep: island.requiresFixedStep,
  }))
}

function mergeIslandInto(target: TacticalIslandSeed, source: TacticalIslandSeed) {
  const targetWeight = Math.max(1, target.memberIds.size)
  const sourceWeight = Math.max(1, source.memberIds.size)
  const totalWeight = targetWeight + sourceWeight
  const center = {
    x: (target.center.x * targetWeight + source.center.x * sourceWeight) / totalWeight,
    y: (target.center.y * targetWeight + source.center.y * sourceWeight) / totalWeight,
  }
  const radius = Math.max(
    pointDistance(center, target.center) + target.radius,
    pointDistance(center, source.center) + source.radius,
  )
  target.center = center
  target.radius = radius
  target.requiresFixedStep ||= source.requiresFixedStep
  for (const memberId of source.memberIds) target.memberIds.add(memberId)
  for (const reason of source.reasons) target.reasons.add(reason)
}

function createLinkIsland(
  left: { id: string; pos: Point },
  right: { id: string; pos: Point },
  reason: string,
  requiresFixedStep: boolean,
) {
  const center = midpoint(left.pos, right.pos)
  return createIslandSeed(
    center,
    Math.max(1.1, pointDistance(left.pos, right.pos) / 2 + tacticalMergePadding),
    [left.id, right.id],
    reason,
    requiresFixedStep,
  )
}

function createIslandSeed(
  center: Point,
  radius: number,
  memberIds: string[],
  reason: string,
  requiresFixedStep: boolean,
): TacticalIslandSeed {
  return {
    center: { ...center },
    radius,
    memberIds: new Set(memberIds),
    reasons: new Set([reason]),
    requiresFixedStep,
  }
}

function isArcaneMoving(arcane: Arcane, time: number) {
  if (arcane.stats.hp <= 0 || arcane.respawn > time || arcane.channeling || arcane.travelPlan) return false
  return pointDistance(arcane.pos, arcane.movementDestination ?? arcane.target) > 0.08
}

function getTargetCategory(target: CombatTarget) {
  if ('player' in target) return 'arcane'
  if ('type' in target) return 'creep'
  if ('tier' in target) return 'tower'
  if ('kind' in target) return 'structure'
  if ('strength' in target) return 'camp'
  if ('pathIndex' in target) return 'boss'
  return 'base'
}

function midpoint(left: Point, right: Point): Point {
  return { x: (left.x + right.x) / 2, y: (left.y + right.y) / 2 }
}

function pointDistance(left: Point, right: Point) {
  return Math.hypot(left.x - right.x, left.y - right.y)
}
