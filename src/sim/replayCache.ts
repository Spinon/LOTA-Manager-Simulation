import type { MatchStaticData, TeamId } from './simulation.ts'
import type { EncodedReplayChunk } from './replayStore.ts'

export const replayCompatibilityVersion = 'lota-t30-trajectory-v1'

export type ReplayCacheIdentity = {
  seed: string
  lineups?: readonly string[]
  strategies?: unknown
}

export type CachedReplay = {
  key: string
  compatibilityVersion: string
  createdAt: number
  byteLength: number
  staticData: MatchStaticData
  chunks: EncodedReplayChunk[]
  winner?: TeamId
  simTime: number
  frameCount: number
}

const databaseName = 'lota-replay-cache'
const objectStoreName = 'replays'
const databaseVersion = 1
const maximumCachedReplays = 3
const maximumCachedBytes = 220 * 1024 * 1024

export function createReplayCacheKey(
  identity: ReplayCacheIdentity,
  compatibilityVersion = replayCompatibilityVersion,
) {
  const content = stableSerialize({ compatibilityVersion, ...identity })
  return `${compatibilityVersion}:${fnv1a64(content)}`
}

export function isCompatibleCachedReplay(
  replay: CachedReplay,
  identity: ReplayCacheIdentity,
  compatibilityVersion = replayCompatibilityVersion,
) {
  return replay.compatibilityVersion === compatibilityVersion &&
    replay.key === createReplayCacheKey(identity, compatibilityVersion)
}

export async function loadCachedReplay(identity: ReplayCacheIdentity) {
  const database = await openReplayDatabase()
  if (!database) return undefined
  const key = createReplayCacheKey(identity)
  try {
    const replay = await requestResult<CachedReplay | undefined>(
      database.transaction(objectStoreName, 'readonly').objectStore(objectStoreName).get(key),
    )
    return replay && isCompatibleCachedReplay(replay, identity) ? replay : undefined
  } finally {
    database.close()
  }
}

export async function saveCachedReplay(
  identity: ReplayCacheIdentity,
  replay: Omit<CachedReplay, 'key' | 'compatibilityVersion' | 'createdAt'>,
) {
  const database = await openReplayDatabase()
  if (!database) return
  const record: CachedReplay = {
    ...replay,
    key: createReplayCacheKey(identity),
    compatibilityVersion: replayCompatibilityVersion,
    createdAt: Date.now(),
  }
  try {
    await requestResult(database.transaction(objectStoreName, 'readwrite').objectStore(objectStoreName).put(record))
    await pruneReplayCache(database)
  } finally {
    database.close()
  }
}

async function pruneReplayCache(database: IDBDatabase) {
  const store = database.transaction(objectStoreName, 'readonly').objectStore(objectStoreName)
  const records = await requestResult<CachedReplay[]>(store.getAll())
  records.sort((left, right) => right.createdAt - left.createdAt)
  let retainedBytes = 0
  const expired = records.filter((record, index) => {
    retainedBytes += record.byteLength
    return index >= maximumCachedReplays || retainedBytes > maximumCachedBytes
  })
  if (expired.length === 0) return
  const transaction = database.transaction(objectStoreName, 'readwrite')
  const writableStore = transaction.objectStore(objectStoreName)
  for (const record of expired) writableStore.delete(record.key)
  await transactionDone(transaction)
}

function openReplayDatabase() {
  if (!('indexedDB' in globalThis)) return Promise.resolve<IDBDatabase | undefined>(undefined)
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(databaseName, databaseVersion)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(objectStoreName)) {
        request.result.createObjectStore(objectStoreName, { keyPath: 'key' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Falha ao abrir cache de replays'))
  })
}

function requestResult<T = IDBValidKey>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Falha ao acessar cache de replays'))
  })
}

function transactionDone(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error('Falha ao atualizar cache de replays'))
    transaction.onabort = () => reject(transaction.error ?? new Error('Atualizacao do cache de replays cancelada'))
  })
}

function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'undefined'
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(',')}]`
  const record = value as Record<string, unknown>
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableSerialize(record[key])}`).join(',')}}`
}

function fnv1a64(value: string) {
  let hash = 0xcbf29ce484222325n
  for (let index = 0; index < value.length; index += 1) {
    hash ^= BigInt(value.charCodeAt(index))
    hash = BigInt.asUintN(64, hash * 0x100000001b3n)
  }
  return hash.toString(36).padStart(13, '0')
}
