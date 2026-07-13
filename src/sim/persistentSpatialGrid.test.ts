import assert from 'node:assert/strict'

import {
  createPersistentSpatialGrid,
  queryPersistentSpatialGridInto,
  syncPersistentSpatialGrid,
} from './persistentSpatialGrid.ts'

type TestEntity = {
  id: string
  pos: { x: number; y: number }
  active: boolean
}

const entities: TestEntity[] = [
  { id: 'a', pos: { x: 2, y: 2 }, active: true },
  { id: 'b', pos: { x: 8, y: 3 }, active: true },
  { id: 'c', pos: { x: 24, y: 24 }, active: true },
]
const grid = createPersistentSpatialGrid<TestEntity>(10)
const output: TestEntity[] = []

syncPersistentSpatialGrid(grid, entities, (entity) => entity.active)
assert.equal(grid.stats.additions, 3)
assert.deepEqual(queryPersistentSpatialGridInto(grid, { x: 5, y: 5 }, 3, output).map((entity) => entity.id).sort(), ['a', 'b'])
assert.equal(queryPersistentSpatialGridInto(grid, { x: 5, y: 5 }, 3, output), output, 'queries should reuse the caller buffer')

const originalCell = grid.cells.get(grid.cellById.get('a')!)
entities[0] = { ...entities[0], pos: { x: 3, y: 3 } }
entities[1] = { ...entities[1], pos: { x: 12, y: 3 } }
syncPersistentSpatialGrid(grid, entities, (entity) => entity.active)
assert.equal(grid.cells.get(grid.cellById.get('a')!), originalCell, 'same-cell movement should retain the bucket')
assert.equal(grid.stats.crossings, 1)
assert.equal(grid.entityById.get('a'), entities[0], 'entity references should refresh without rebuilding buckets')

entities[2].active = false
syncPersistentSpatialGrid(grid, entities, (entity) => entity.active)
assert.equal(grid.cellById.has('c'), false, 'inactive entities should leave the index immediately')
entities.pop()
entities.pop()
syncPersistentSpatialGrid(grid, entities, (entity) => entity.active)
assert.equal(grid.cellById.has('b'), false, 'missing entities should be removed on the next sync')

console.log('persistentSpatialGrid tests passed')
