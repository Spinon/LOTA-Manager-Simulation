export type SpatialPoint = {
  x: number
  y: number
}

export type SpatialEntity = {
  id: string
  pos: SpatialPoint
}

export type PersistentSpatialGridStats = {
  syncs: number
  additions: number
  removals: number
  crossings: number
  retained: number
  queries: number
}

export type PersistentSpatialGrid<T extends SpatialEntity> = {
  cellSize: number
  cells: Map<number, string[]>
  cellById: Map<string, number>
  entityById: Map<string, T>
  seenGenerationById: Map<string, number>
  generation: number
  stats: PersistentSpatialGridStats
}

export function createPersistentSpatialGrid<T extends SpatialEntity>(cellSize: number): PersistentSpatialGrid<T> {
  return {
    cellSize,
    cells: new Map(),
    cellById: new Map(),
    entityById: new Map(),
    seenGenerationById: new Map(),
    generation: 0,
    stats: {
      syncs: 0,
      additions: 0,
      removals: 0,
      crossings: 0,
      retained: 0,
      queries: 0,
    },
  }
}

export function syncPersistentSpatialGrid<T extends SpatialEntity>(
  grid: PersistentSpatialGrid<T>,
  entities: T[],
  isActive: (entity: T) => boolean = () => true,
  getPosition: (entity: T) => SpatialPoint = (entity) => entity.pos,
) {
  grid.generation += 1
  grid.stats.syncs += 1
  const generation = grid.generation

  for (const entity of entities) {
    if (!isActive(entity)) {
      removePersistentSpatialEntity(grid, entity.id)
      continue
    }

    grid.seenGenerationById.set(entity.id, generation)
    grid.entityById.set(entity.id, entity)
    const nextCellKey = getPersistentSpatialGridKey(getPosition(entity), grid.cellSize)
    const previousCellKey = grid.cellById.get(entity.id)
    if (previousCellKey === nextCellKey) {
      grid.stats.retained += 1
      continue
    }

    if (previousCellKey !== undefined) {
      removeIdFromCell(grid, previousCellKey, entity.id)
      grid.stats.crossings += 1
    } else {
      grid.stats.additions += 1
    }
    appendIdToCell(grid, nextCellKey, entity.id)
    grid.cellById.set(entity.id, nextCellKey)
  }

  for (const id of grid.cellById.keys()) {
    if (grid.seenGenerationById.get(id) !== generation) removePersistentSpatialEntity(grid, id)
  }
  return grid
}

export function queryPersistentSpatialGridInto<T extends SpatialEntity>(
  grid: PersistentSpatialGrid<T>,
  point: SpatialPoint,
  radius: number,
  results: T[],
) {
  results.length = 0
  grid.stats.queries += 1
  const minX = Math.floor((point.x - radius) / grid.cellSize)
  const maxX = Math.floor((point.x + radius) / grid.cellSize)
  const minY = Math.floor((point.y - radius) / grid.cellSize)
  const maxY = Math.floor((point.y + radius) / grid.cellSize)

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const cell = grid.cells.get(getPersistentSpatialGridCellKey(x, y))
      if (!cell) continue
      for (const id of cell) {
        const entity = grid.entityById.get(id)
        if (entity) results.push(entity)
      }
    }
  }
  return results
}

export function queryPersistentSpatialGridIdsInto<T extends SpatialEntity>(
  grid: PersistentSpatialGrid<T>,
  point: SpatialPoint,
  radius: number,
  results: string[],
) {
  results.length = 0
  grid.stats.queries += 1
  const minX = Math.floor((point.x - radius) / grid.cellSize)
  const maxX = Math.floor((point.x + radius) / grid.cellSize)
  const minY = Math.floor((point.y - radius) / grid.cellSize)
  const maxY = Math.floor((point.y + radius) / grid.cellSize)

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const cell = grid.cells.get(getPersistentSpatialGridCellKey(x, y))
      if (cell) results.push(...cell)
    }
  }
  return results
}

export function removePersistentSpatialEntity<T extends SpatialEntity>(grid: PersistentSpatialGrid<T>, id: string) {
  const cellKey = grid.cellById.get(id)
  if (cellKey === undefined) return false
  removeIdFromCell(grid, cellKey, id)
  grid.cellById.delete(id)
  grid.entityById.delete(id)
  grid.seenGenerationById.delete(id)
  grid.stats.removals += 1
  return true
}

export function getPersistentSpatialGridKey(point: SpatialPoint, cellSize: number) {
  return getPersistentSpatialGridCellKey(Math.floor(point.x / cellSize), Math.floor(point.y / cellSize))
}

export function getPersistentSpatialGridCellKey(x: number, y: number) {
  return x * 1024 + y
}

function appendIdToCell<T extends SpatialEntity>(grid: PersistentSpatialGrid<T>, key: number, id: string) {
  const cell = grid.cells.get(key)
  if (cell) cell.push(id)
  else grid.cells.set(key, [id])
}

function removeIdFromCell<T extends SpatialEntity>(grid: PersistentSpatialGrid<T>, key: number, id: string) {
  const cell = grid.cells.get(key)
  if (!cell) return
  const index = cell.indexOf(id)
  if (index < 0) return
  const last = cell.pop()
  if (index < cell.length && last !== undefined) cell[index] = last
  if (cell.length === 0) grid.cells.delete(key)
}
