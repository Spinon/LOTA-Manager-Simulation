import type { LaneCreepKind } from '../game-systems/unitSeedsAdapter.ts'
import type { Creep, LaneId, TeamId } from './simulation.ts'

export type CreepStorageMode = 'object' | 'soa'

export type CreepComponentStore = {
  capacity: number
  length: number
  ids: string[]
  slotByFacade: WeakMap<Creep, number>
  updateBuffer: Creep[]
  updateDirty: Uint8Array
  drafts: Array<Creep | undefined>
  targetIds: string[]
  targetIndex: Map<string, number>
  posX: Float64Array
  posY: Float64Array
  hp: Float64Array
  maxHp: Float64Array
  pathIndex: Uint16Array
  team: Uint8Array
  lane: Uint8Array
  type: Uint8Array
  routeTarget: Int32Array
  lastAttack: Float64Array
  nextRouteTargetEvaluationAt: Float64Array
}

const teamValues: TeamId[] = ['dawn', 'dusk']
const laneValues: LaneId[] = ['top', 'mid', 'bot']
const typeValues: LaneCreepKind[] = ['melee', 'mage', 'siege', 'flagbearer']
const initialCapacity = 128

export function createCreepComponentStore(capacity = initialCapacity): CreepComponentStore {
  const safeCapacity = Math.max(1, capacity)
  const routeTarget = new Int32Array(safeCapacity)
  routeTarget.fill(-1)
  const nextRouteTargetEvaluationAt = new Float64Array(safeCapacity)
  nextRouteTargetEvaluationAt.fill(Number.NaN)
  return {
    capacity: safeCapacity,
    length: 0,
    ids: [],
    slotByFacade: new WeakMap(),
    updateBuffer: [],
    updateDirty: new Uint8Array(safeCapacity),
    drafts: [],
    targetIds: [],
    targetIndex: new Map(),
    posX: new Float64Array(safeCapacity),
    posY: new Float64Array(safeCapacity),
    hp: new Float64Array(safeCapacity),
    maxHp: new Float64Array(safeCapacity),
    pathIndex: new Uint16Array(safeCapacity),
    team: new Uint8Array(safeCapacity),
    lane: new Uint8Array(safeCapacity),
    type: new Uint8Array(safeCapacity),
    routeTarget,
    lastAttack: new Float64Array(safeCapacity),
    nextRouteTargetEvaluationAt,
  }
}

export function appendCreepComponents(store: CreepComponentStore, creeps: Creep[]) {
  ensureCapacity(store, store.length + creeps.length)
  for (const creep of creeps) {
    const slot = store.length
    store.length += 1
    store.ids[slot] = creep.id
    store.slotByFacade.set(creep, slot)
    writeCreepComponents(store, slot, creep)
  }
  return creeps
}

export function replaceCreepComponentFacade(store: CreepComponentStore, current: Creep, replacement: Creep) {
  const slot = store.slotByFacade.get(current)
  if (slot === undefined) {
    appendCreepComponents(store, [replacement])
    return replacement
  }
  store.drafts[slot] = current
  store.slotByFacade.set(replacement, slot)
  writeCreepComponents(store, slot, replacement)
  return replacement
}

export function getCreepUpdateDraft(store: CreepComponentStore, creep: Creep) {
  const slot = store.slotByFacade.get(creep)
  if (slot === undefined) return undefined
  let draft = store.drafts[slot]
  if (!draft || draft === creep) {
    draft = { ...creep }
    store.drafts[slot] = draft
  }
  return draft
}

export function syncCreepComponents(store: CreepComponentStore, creep: Creep) {
  const slot = store.slotByFacade.get(creep)
  if (slot === undefined) {
    appendCreepComponents(store, [creep])
    return store.length - 1
  }
  writeCreepComponents(store, slot, creep)
  return slot
}

export function syncCreepPositionComponents(store: CreepComponentStore, creep: Creep) {
  const slot = store.slotByFacade.get(creep)
  if (slot === undefined) return syncCreepComponents(store, creep)
  store.posX[slot] = creep.pos.x
  store.posY[slot] = creep.pos.y
  store.pathIndex[slot] = creep.pathIndex
  return slot
}

export function syncCreepAttackSchedule(store: CreepComponentStore, creep: Creep) {
  const slot = store.slotByFacade.get(creep)
  if (slot === undefined) return syncCreepComponents(store, creep)
  store.lastAttack[slot] = creep.lastAttack
  store.routeTarget[slot] = internTargetId(store, creep.routeTargetId)
  store.nextRouteTargetEvaluationAt[slot] = creep.nextRouteTargetEvaluationAt ?? Number.NaN
  return slot
}

export function getCreepComponentSlot(store: CreepComponentStore, creep: Creep) {
  return store.slotByFacade.get(creep)
}

export function cloneCreepsIntoComponentStore(creeps: Creep[]) {
  const store = createCreepComponentStore(Math.max(initialCapacity, creeps.length))
  const clones = creeps.map((creep) => ({
    ...creep,
    pos: { ...creep.pos },
    motionPlan: creep.motionPlan ? {
      ...creep.motionPlan,
      from: { ...creep.motionPlan.from },
      destination: { ...creep.motionPlan.destination },
    } : undefined,
    lastHitBy: creep.lastHitBy ? { ...creep.lastHitBy } : undefined,
  }))
  return { store, creeps: appendCreepComponents(store, clones) }
}

function writeCreepComponents(store: CreepComponentStore, slot: number, creep: Creep) {
  store.posX[slot] = creep.pos.x
  store.posY[slot] = creep.pos.y
  store.hp[slot] = creep.hp
  store.maxHp[slot] = creep.maxHp
  store.pathIndex[slot] = creep.pathIndex
  store.team[slot] = teamValues.indexOf(creep.team)
  store.lane[slot] = laneValues.indexOf(creep.lane)
  store.type[slot] = typeValues.indexOf(creep.type)
  store.routeTarget[slot] = internTargetId(store, creep.routeTargetId)
  store.lastAttack[slot] = creep.lastAttack
  store.nextRouteTargetEvaluationAt[slot] = creep.nextRouteTargetEvaluationAt ?? Number.NaN
}

function internTargetId(store: CreepComponentStore, id: string | undefined) {
  if (id === undefined) return -1
  const cached = store.targetIndex.get(id)
  if (cached !== undefined) return cached
  const index = store.targetIds.length
  store.targetIds.push(id)
  store.targetIndex.set(id, index)
  return index
}

function ensureCapacity(store: CreepComponentStore, required: number) {
  if (required <= store.capacity) return
  const capacity = Math.max(required, store.capacity * 2)
  store.posX = growTypedArray(store.posX, capacity)
  store.posY = growTypedArray(store.posY, capacity)
  store.hp = growTypedArray(store.hp, capacity)
  store.maxHp = growTypedArray(store.maxHp, capacity)
  store.pathIndex = growTypedArray(store.pathIndex, capacity)
  store.team = growTypedArray(store.team, capacity)
  store.lane = growTypedArray(store.lane, capacity)
  store.type = growTypedArray(store.type, capacity)
  store.routeTarget = growTypedArray(store.routeTarget, capacity, -1)
  store.lastAttack = growTypedArray(store.lastAttack, capacity)
  store.nextRouteTargetEvaluationAt = growTypedArray(store.nextRouteTargetEvaluationAt, capacity, Number.NaN)
  store.updateDirty = growTypedArray(store.updateDirty, capacity)
  store.capacity = capacity
}

function growTypedArray<T extends Float64Array | Uint16Array | Uint8Array | Int32Array>(
  source: T,
  capacity: number,
  fillValue?: number,
) {
  const Constructor = source.constructor as { new(length: number): T }
  const result = new Constructor(capacity)
  if (fillValue !== undefined) result.fill(fillValue)
  result.set(source)
  return result
}
