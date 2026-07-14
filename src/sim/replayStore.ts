import type { ChannelingAction, MatchRenderFrame, TeamId } from './simulation.ts'

const numberScale = 1000
const teamCodes: Record<TeamId, number> = { dawn: 0, dusk: 1 }
const teams: TeamId[] = ['dawn', 'dusk']
const laneCodes = { top: 0, mid: 1, bot: 2 } as const
const lanes = ['top', 'mid', 'bot'] as const
const creepTypeCodes = { melee: 0, mage: 1, siege: 2, flagbearer: 3 } as const
const creepTypes = ['melee', 'mage', 'siege', 'flagbearer'] as const
const textDecoder = new TextDecoder()

type FrameExtras = Pick<
  MatchRenderFrame,
  'effects' | 'timedEffects' | 'deathMarkers' | 'denyMarkers' | 'goldMarkers' | 'skillMarkers' | 'recentTeleports' | 'runes' | 'summons' | 'details'
> & { channels: Array<ChannelingAction | null> }

export type EncodedReplayChunk = {
  matchSeed: string
  frameCount: number
  arcaneCount: number
  towerCount: number
  structureCount: number
  baseCount: number
  campCount: number
  dictionaryAdditions: string[]
  dictionaryEnums: Uint8Array
  dictionaryNumbers: Int32Array
  times: Int32Array
  kills: Uint16Array
  winners: Int8Array
  hasDetails: Uint8Array
  arcanes: Int32Array
  towerHp: Int32Array
  structureHp: Int32Array
  baseHp: Int32Array
  camps: Int32Array
  bosses: Int32Array
  creepOffsets: Uint32Array
  creepIds: Uint32Array
  creepNumbers: Int32Array
  extrasIndices: Uint32Array
  extrasOffsets: Uint32Array
  extrasBytes: Uint8Array
}

export class ReplayChunkEncoder {
  private readonly stringIds = new Map<string, number>()
  private dictionarySize = 0
  private extrasDictionarySize = 0
  private previousExtrasSerialized?: string
  private previousExtrasId = -1

  encode(frames: MatchRenderFrame[]): EncodedReplayChunk {
    if (frames.length === 0) throw new Error('Cannot encode an empty replay chunk')
    const first = frames[0]
    const frameCount = frames.length
    const arcaneCount = first.arcanes.length
    const towerCount = first.towerHp.length
    const structureCount = first.structureHp.length
    const baseCount = first.baseHp.length
    const campCount = first.camps.length
    const dictionaryAdditions: string[] = []
    const dictionaryEnums: number[] = []
    const dictionaryNumbers: number[] = []
    const creepCount = frames.reduce((sum, frame) => sum + frame.creeps.length, 0)
    const times = new Int32Array(frameCount)
    const kills = new Uint16Array(frameCount * 2)
    const winners = new Int8Array(frameCount)
    const hasDetails = new Uint8Array(frameCount)
    const arcanes = new Int32Array(frameCount * arcaneCount * 8)
    const towerHp = new Int32Array(frameCount * towerCount)
    const structureHp = new Int32Array(frameCount * structureCount)
    const baseHp = new Int32Array(frameCount * baseCount)
    const camps = new Int32Array(frameCount * campCount * 4)
    const bosses = new Int32Array(frameCount * 5)
    const creepOffsets = new Uint32Array(frameCount + 1)
    const creepIds = new Uint32Array(creepCount)
    const creepNumbers = new Int32Array(creepCount * 3)
    const extrasIndices = new Uint32Array(frameCount)
    const encodedExtras: Uint8Array[] = []
    const textEncoder = new TextEncoder()
    let creepCursor = 0

    const getCreepId = (creep: MatchRenderFrame['creeps'][number]) => {
      const value = creep[0]
      const existing = this.stringIds.get(value)
      if (existing !== undefined) return existing
      const id = this.dictionarySize
      this.dictionarySize += 1
      this.stringIds.set(value, id)
      dictionaryAdditions.push(value)
      dictionaryEnums.push(teamCodes[creep[1]], laneCodes[creep[2]], creepTypeCodes[creep[3]])
      dictionaryNumbers.push(packNumber(creep[7]), packNumber(creep[8]))
      return id
    }

    const getExtrasId = (extras: FrameExtras) => {
      const serialized = JSON.stringify(extras)
      if (serialized === this.previousExtrasSerialized) return this.previousExtrasId
      const id = this.extrasDictionarySize
      this.extrasDictionarySize += 1
      this.previousExtrasSerialized = serialized
      this.previousExtrasId = id
      encodedExtras.push(textEncoder.encode(serialized))
      return id
    }

    frames.forEach((frame, frameIndex) => {
      if (frame.arcanes.length !== arcaneCount || frame.towerHp.length !== towerCount || frame.structureHp.length !== structureCount || frame.baseHp.length !== baseCount || frame.camps.length !== campCount) {
        throw new Error('Replay fixed entity counts changed inside a chunk')
      }
      times[frameIndex] = packNumber(frame.time)
      kills[frameIndex * 2] = frame.kills[0]
      kills[frameIndex * 2 + 1] = frame.kills[1]
      winners[frameIndex] = frame.winner === undefined ? -1 : teamCodes[frame.winner]
      hasDetails[frameIndex] = frame.details ? 1 : 0
      frame.arcanes.forEach((arcane, arcaneIndex) => {
        const offset = (frameIndex * arcaneCount + arcaneIndex) * 8
        for (let index = 0; index < 8; index += 1) arcanes[offset + index] = packNumber(arcane[index] as number)
      })
      writeNumbers(towerHp, frameIndex * towerCount, frame.towerHp)
      writeNumbers(structureHp, frameIndex * structureCount, frame.structureHp)
      writeNumbers(baseHp, frameIndex * baseCount, frame.baseHp)
      frame.camps.forEach((camp, campIndex) => writeNumbers(camps, (frameIndex * campCount + campIndex) * 4, camp))
      writeNumbers(bosses, frameIndex * 5, frame.boss)
      creepOffsets[frameIndex] = creepCursor
      frame.creeps.forEach((creep) => {
        creepIds[creepCursor] = getCreepId(creep)
        writeNumbers(creepNumbers, creepCursor * 3, creep.slice(4, 7) as number[])
        creepCursor += 1
      })
      const extras: FrameExtras = {
        effects: frame.effects,
        timedEffects: frame.timedEffects,
        deathMarkers: frame.deathMarkers,
        denyMarkers: frame.denyMarkers,
        goldMarkers: frame.goldMarkers,
        skillMarkers: frame.skillMarkers,
        recentTeleports: frame.recentTeleports,
        runes: frame.runes,
        summons: frame.summons ?? [],
        details: frame.details,
        channels: frame.arcanes.map((arcane) => arcane[8] ?? null),
      }
      extrasIndices[frameIndex] = getExtrasId(extras)
    })
    creepOffsets[frameCount] = creepCursor
    const extrasOffsets = new Uint32Array(encodedExtras.length + 1)
    let extrasLength = 0
    encodedExtras.forEach((bytes, index) => {
      extrasOffsets[index] = extrasLength
      extrasLength += bytes.byteLength
    })
    extrasOffsets[encodedExtras.length] = extrasLength
    const extrasBytes = new Uint8Array(extrasLength)
    let extrasCursor = 0
    for (const bytes of encodedExtras) {
      extrasBytes.set(bytes, extrasCursor)
      extrasCursor += bytes.byteLength
    }

    return {
      matchSeed: first.matchSeed,
      frameCount,
      arcaneCount,
      towerCount,
      structureCount,
      baseCount,
      campCount,
      dictionaryAdditions,
      dictionaryEnums: Uint8Array.from(dictionaryEnums),
      dictionaryNumbers: Int32Array.from(dictionaryNumbers),
      times,
      kills,
      winners,
      hasDetails,
      arcanes,
      towerHp,
      structureHp,
      baseHp,
      camps,
      bosses,
      creepOffsets,
      creepIds,
      creepNumbers,
      extrasIndices,
      extrasOffsets,
      extrasBytes,
    }
  }
}

export class ReplayFrameStore {
  private readonly chunks: Array<{ start: number; chunk: EncodedReplayChunk }> = []
  private readonly creepDictionary: Array<{
    id: string
    team: TeamId
    lane: typeof lanes[number]
    type: typeof creepTypes[number]
    maxHp: number
    range: number
  }> = []
  private readonly extrasPayloads: Uint8Array[] = []
  private readonly detailFrameIndices: number[] = []
  private cachedIndex = -1
  private cachedFrame?: MatchRenderFrame
  private cachedExtrasIndex = -1
  private cachedExtras?: FrameExtras
  length = 0
  estimatedByteLength = 0

  appendChunk(chunk: EncodedReplayChunk) {
    const start = this.length
    chunk.dictionaryAdditions.forEach((id, index) => {
      const enumOffset = index * 3
      const numberOffset = index * 2
      this.creepDictionary.push({
        id,
        team: teams[chunk.dictionaryEnums[enumOffset]],
        lane: lanes[chunk.dictionaryEnums[enumOffset + 1]],
        type: creepTypes[chunk.dictionaryEnums[enumOffset + 2]],
        maxHp: unpackNumber(chunk.dictionaryNumbers[numberOffset]),
        range: unpackNumber(chunk.dictionaryNumbers[numberOffset + 1]),
      })
    })
    for (let index = 0; index < chunk.extrasOffsets.length - 1; index += 1) {
      this.extrasPayloads.push(chunk.extrasBytes.subarray(chunk.extrasOffsets[index], chunk.extrasOffsets[index + 1]))
    }
    this.chunks.push({ start, chunk })
    for (let localIndex = 0; localIndex < chunk.frameCount; localIndex += 1) {
      if (chunk.hasDetails[localIndex]) this.detailFrameIndices.push(start + localIndex)
    }
    this.length += chunk.frameCount
    this.estimatedByteLength += getChunkByteLength(chunk)
    this.cachedIndex = -1
    this.cachedFrame = undefined
  }

  getChunks() {
    return this.chunks.map(({ chunk }) => chunk)
  }

  getTime(index: number) {
    const located = this.locate(index)
    return unpackNumber(located.chunk.times[located.localIndex])
  }

  get(index: number) {
    if (index === this.cachedIndex && this.cachedFrame) return this.cachedFrame
    const { chunk, localIndex } = this.locate(index)
    const extras = this.decodeExtras(chunk, localIndex)
    const arcanes: MatchRenderFrame['arcanes'] = Array.from({ length: chunk.arcaneCount }, (_, arcaneIndex) => {
      const offset = (localIndex * chunk.arcaneCount + arcaneIndex) * 8
      return [
        unpackNumber(chunk.arcanes[offset]), unpackNumber(chunk.arcanes[offset + 1]), unpackNumber(chunk.arcanes[offset + 2]), unpackNumber(chunk.arcanes[offset + 3]),
        unpackNumber(chunk.arcanes[offset + 4]), unpackNumber(chunk.arcanes[offset + 5]), unpackNumber(chunk.arcanes[offset + 6]), unpackNumber(chunk.arcanes[offset + 7]),
        extras.channels[arcaneIndex] ?? undefined,
      ]
    })
    const creepStart = chunk.creepOffsets[localIndex]
    const creepEnd = chunk.creepOffsets[localIndex + 1]
    const creeps: MatchRenderFrame['creeps'] = []
    for (let creepIndex = creepStart; creepIndex < creepEnd; creepIndex += 1) {
      const metadata = this.creepDictionary[chunk.creepIds[creepIndex]]
      const numberOffset = creepIndex * 3
      creeps.push([
        metadata.id, metadata.team, metadata.lane, metadata.type,
        unpackNumber(chunk.creepNumbers[numberOffset]), unpackNumber(chunk.creepNumbers[numberOffset + 1]), unpackNumber(chunk.creepNumbers[numberOffset + 2]),
        metadata.maxHp, metadata.range,
      ])
    }
    const winnerCode = chunk.winners[localIndex]
    const frame: MatchRenderFrame = {
      matchSeed: chunk.matchSeed,
      time: unpackNumber(chunk.times[localIndex]),
      kills: [chunk.kills[localIndex * 2], chunk.kills[localIndex * 2 + 1]],
      winner: winnerCode < 0 ? undefined : teams[winnerCode],
      details: extras.details,
      effects: extras.effects,
      timedEffects: extras.timedEffects,
      deathMarkers: extras.deathMarkers,
      denyMarkers: extras.denyMarkers,
      goldMarkers: extras.goldMarkers,
      skillMarkers: extras.skillMarkers,
      recentTeleports: extras.recentTeleports,
      arcanes,
      creeps,
      summons: extras.summons ?? [],
      towerHp: readNumbers(chunk.towerHp, localIndex * chunk.towerCount, chunk.towerCount),
      structureHp: readNumbers(chunk.structureHp, localIndex * chunk.structureCount, chunk.structureCount),
      baseHp: readNumbers(chunk.baseHp, localIndex * chunk.baseCount, chunk.baseCount),
      camps: Array.from({ length: chunk.campCount }, (_, campIndex) => readNumbers(chunk.camps, (localIndex * chunk.campCount + campIndex) * 4, 4) as [number, number, number, number]),
      runes: extras.runes,
      boss: readNumbers(chunk.bosses, localIndex * 5, 5) as [number, number, number, number, number],
    }
    this.cachedIndex = index
    this.cachedFrame = frame
    return frame
  }

  sampleAtTime(time: number): MatchRenderFrame {
    const leftIndex = this.findIndexAtOrBefore(time)
    const left = this.get(leftIndex)
    if (leftIndex >= this.length - 1 || time <= left.time + Number.EPSILON) return left
    const right = this.get(leftIndex + 1)
    if (time >= right.time - Number.EPSILON) return right
    const duration = right.time - left.time
    if (duration <= Number.EPSILON) return left
    const progress = Math.max(0, Math.min(1, (time - left.time) / duration))
    const rightCreeps = new Map(right.creeps.map((creep) => [creep[0], creep]))
    const rightSummons = new Map(right.summons.map((summon) => [summon[0], summon]))
    return {
      ...left,
      time,
      arcanes: left.arcanes.map((arcane, index) => {
        const target = right.arcanes[index]
        if (!target) return arcane
        return [
          interpolate(arcane[0], target[0], progress),
          interpolate(arcane[1], target[1], progress),
          ...arcane.slice(2),
        ] as MatchRenderFrame['arcanes'][number]
      }),
      creeps: left.creeps.map((creep) => {
        const target = rightCreeps.get(creep[0])
        if (!target) return creep
        return [
          creep[0], creep[1], creep[2], creep[3],
          interpolate(creep[4], target[4], progress),
          interpolate(creep[5], target[5], progress),
          ...creep.slice(6),
        ] as MatchRenderFrame['creeps'][number]
      }),
      summons: left.summons.map((summon) => {
        const target = rightSummons.get(summon[0])
        if (!target) return summon
        return [
          ...summon.slice(0, 5),
          interpolate(summon[5], target[5], progress),
          interpolate(summon[6], target[6], progress),
          ...summon.slice(7),
        ] as MatchRenderFrame['summons'][number]
      }),
      boss: [
        interpolate(left.boss[0], right.boss[0], progress),
        interpolate(left.boss[1], right.boss[1], progress),
        left.boss[2], left.boss[3], left.boss[4],
      ] as MatchRenderFrame['boss'],
    }
  }

  findIndexAtOrBefore(time: number) {
    let low = 0
    let high = Math.max(0, this.length - 1)
    while (low < high) {
      const middle = Math.ceil((low + high) / 2)
      if (this.getTime(middle) <= time) low = middle
      else high = middle - 1
    }
    return low
  }

  findDetailsAtOrBefore(index: number) {
    let low = 0
    let high = this.detailFrameIndices.length - 1
    let found = -1
    while (low <= high) {
      const middle = Math.floor((low + high) / 2)
      if (this.detailFrameIndices[middle] <= index) {
        found = this.detailFrameIndices[middle]
        low = middle + 1
      } else {
        high = middle - 1
      }
    }
    return found >= 0 ? this.get(found).details : undefined
  }

  private locate(index: number) {
    if (index < 0 || index >= this.length) throw new RangeError(`Replay frame ${index} is outside 0..${this.length - 1}`)
    let low = 0
    let high = this.chunks.length - 1
    while (low <= high) {
      const middle = Math.floor((low + high) / 2)
      const entry = this.chunks[middle]
      if (index < entry.start) high = middle - 1
      else if (index >= entry.start + entry.chunk.frameCount) low = middle + 1
      else return { chunk: entry.chunk, localIndex: index - entry.start }
    }
    throw new RangeError(`Replay frame ${index} was not found`)
  }

  private decodeExtras(chunk: EncodedReplayChunk, localIndex: number): FrameExtras {
    const index = chunk.extrasIndices[localIndex]
    if (index === this.cachedExtrasIndex && this.cachedExtras) return this.cachedExtras
    const extras = JSON.parse(textDecoder.decode(this.extrasPayloads[index])) as FrameExtras
    this.cachedExtrasIndex = index
    this.cachedExtras = extras
    return extras
  }
}

export function getReplayChunkTransferables(chunk: EncodedReplayChunk): ArrayBuffer[] {
  return [
    chunk.dictionaryEnums.buffer, chunk.dictionaryNumbers.buffer, chunk.times.buffer, chunk.kills.buffer, chunk.winners.buffer, chunk.hasDetails.buffer, chunk.arcanes.buffer,
    chunk.towerHp.buffer, chunk.structureHp.buffer, chunk.baseHp.buffer, chunk.camps.buffer,
    chunk.bosses.buffer, chunk.creepOffsets.buffer, chunk.creepIds.buffer, chunk.creepNumbers.buffer,
    chunk.extrasIndices.buffer, chunk.extrasOffsets.buffer, chunk.extrasBytes.buffer,
  ] as ArrayBuffer[]
}

function interpolate(from: number, to: number, progress: number) {
  return from + (to - from) * progress
}

function packNumber(value: number) {
  return Math.round(value * numberScale)
}

function unpackNumber(value: number) {
  return value / numberScale
}

function writeNumbers(target: Int32Array, offset: number, values: readonly number[]) {
  for (let index = 0; index < values.length; index += 1) target[offset + index] = packNumber(values[index])
}

function readNumbers(source: Int32Array, offset: number, count: number) {
  return Array.from({ length: count }, (_, index) => unpackNumber(source[offset + index]))
}

function getChunkByteLength(chunk: EncodedReplayChunk) {
  return getReplayChunkTransferables(chunk).reduce((sum, buffer) => sum + buffer.byteLength, 0) +
    chunk.dictionaryAdditions.reduce((sum, value) => sum + value.length * 2, 0)
}
