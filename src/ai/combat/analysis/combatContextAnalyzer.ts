import { COMBAT_AI_RULES } from '../config/combatAiConstants.ts'
import type {
  CombatDetectionInput,
  CombatEncounterSnapshot,
  CombatEncounterType,
  CombatHeroSnapshot,
  CombatMapObjectSnapshot,
  CombatPoint,
  CombatTeamId,
} from '../types/combatAiTypes.ts'

export function detectCombatEncounters(input: CombatDetectionInput): CombatEncounterSnapshot[] {
  const heroes = input.heroes.filter((hero) => hero.alive)
  const components = buildCombatComponents(heroes)

  return components
    .filter((component) => hasBothTeams(component))
    .map((component) => createEncounterSnapshot(input, component))
    .sort((a, b) => a.candidateId.localeCompare(b.candidateId))
}

function buildCombatComponents(heroes: CombatHeroSnapshot[]) {
  const visited = new Set<string>()
  const components: CombatHeroSnapshot[][] = []

  for (const hero of heroes) {
    if (visited.has(hero.id)) continue
    const component: CombatHeroSnapshot[] = []
    const queue = [hero]
    visited.add(hero.id)

    while (queue.length > 0) {
      const current = queue.shift()!
      component.push(current)
      for (const candidate of heroes) {
        if (visited.has(candidate.id)) continue
        const linkRange = current.team === candidate.team
          ? COMBAT_AI_RULES.detection.allyLinkRange
          : COMBAT_AI_RULES.detection.enemyLinkRange
        if (pointDistance(current.pos, candidate.pos) > linkRange) continue
        visited.add(candidate.id)
        queue.push(candidate)
      }
    }
    components.push(component)
  }

  return components
}

function createEncounterSnapshot(input: CombatDetectionInput, heroes: CombatHeroSnapshot[]): CombatEncounterSnapshot {
  const center = averagePoint(heroes.map((hero) => hero.pos))
  const heroIds = heroes.map((hero) => hero.id).sort()
  const teamHeroIds: Record<CombatTeamId, string[]> = {
    dawn: heroes.filter((hero) => hero.team === 'dawn').map((hero) => hero.id).sort(),
    dusk: heroes.filter((hero) => hero.team === 'dusk').map((hero) => hero.id).sort(),
  }
  const averageHealthPct: Record<CombatTeamId, number> = {
    dawn: average(heroes.filter((hero) => hero.team === 'dawn').map((hero) => hero.healthPct)),
    dusk: average(heroes.filter((hero) => hero.team === 'dusk').map((hero) => hero.healthPct)),
  }
  const closestEnemyDistance = getClosestEnemyDistance(heroes)
  const classification = classifyEncounter(input, heroes, center, closestEnemyDistance)

  return {
    candidateId: createCandidateId(input.matchSeed, input.gameTime, heroIds, center),
    encounterType: classification.type,
    center,
    radius: Math.max(2, ...heroes.map((hero) => pointDistance(center, hero.pos))) + 2,
    heroIds,
    teamHeroIds,
    averageHealthPct,
    closestEnemyDistance,
    reasonTags: classification.reasonTags,
  }
}

function classifyEncounter(
  input: CombatDetectionInput,
  heroes: CombatHeroSnapshot[],
  center: CombatPoint,
  closestEnemyDistance: number,
): { type: CombatEncounterType; reasonTags: string[] } {
  const nearby = (kind: CombatMapObjectSnapshot['kind'], range: number) => input.mapObjects
    .filter((object) => object.kind === kind && object.active && pointDistance(center, object.pos) <= range)
    .sort((a, b) => pointDistance(center, a.pos) - pointDistance(center, b.pos))[0]
    ?.pos
  const nearRune = nearby('rune', COMBAT_AI_RULES.detection.runeInfluenceRange)
  if (nearRune && pointDistance(center, nearRune) <= COMBAT_AI_RULES.detection.runeInfluenceRange) {
    return { type: 'rune_skirmish', reasonTags: ['rune', input.gameTime < 0 ? 'pregame' : 'contest'] }
  }
  const nearBoss = nearby('boss', COMBAT_AI_RULES.detection.bossInfluenceRange)
  if (nearBoss && pointDistance(center, nearBoss) <= COMBAT_AI_RULES.detection.bossInfluenceRange) {
    return { type: 'objective_skirmish', reasonTags: ['boss', 'objective'] }
  }
  const nearCamp = nearby('camp', COMBAT_AI_RULES.detection.campInfluenceRange)
  if (nearCamp && pointDistance(center, nearCamp) <= COMBAT_AI_RULES.detection.campInfluenceRange) {
    return { type: 'camp_contest', reasonTags: ['camp', 'jungle'] }
  }
  const base = nearestActiveObject(center, input.mapObjects, 'base')
  if (base && pointDistance(center, base.pos) <= COMBAT_AI_RULES.detection.highGroundInfluenceRange) {
    return { type: 'high_ground_fight', reasonTags: ['base', 'high_ground'] }
  }
  if (heroes.length >= 8 || Math.min(countTeam(heroes, 'dawn'), countTeam(heroes, 'dusk')) >= 4) {
    return { type: 'full_teamfight', reasonTags: ['large_engagement', 'teamfight'] }
  }
  const tower = nearestActiveObject(center, input.mapObjects, 'tower')
  if (tower && pointDistance(center, tower.pos) <= Math.max(7, (tower.range ?? 0) + 3)) {
    return { type: 'tower_dive', reasonTags: ['tower', 'aggro_risk'] }
  }
  const commonLane = getCommonLane(heroes)
  if (input.gameTime <= COMBAT_AI_RULES.detection.lanePhaseEndSeconds && commonLane) {
    const lowHealth = heroes.some((hero) => hero.healthPct <= 0.35)
    return {
      type: lowHealth && closestEnemyDistance <= COMBAT_AI_RULES.phases.openingDistance ? 'lane_all_in' : 'lane_trade',
      reasonTags: ['lane', commonLane, lowHealth ? 'all_in_pressure' : 'trade'],
    }
  }
  return { type: 'river_skirmish', reasonTags: ['local_fight', 'rotation'] }
}

function nearestActiveObject(center: CombatPoint, objects: CombatMapObjectSnapshot[], kind: CombatMapObjectSnapshot['kind']) {
  return objects
    .filter((object) => object.kind === kind && object.active)
    .sort((a, b) => pointDistance(center, a.pos) - pointDistance(center, b.pos))[0]
}

function hasBothTeams(heroes: CombatHeroSnapshot[]) {
  return heroes.some((hero) => hero.team === 'dawn') && heroes.some((hero) => hero.team === 'dusk')
}

function getCommonLane(heroes: CombatHeroSnapshot[]) {
  const lanes = new Set(heroes.map((hero) => hero.lane))
  return lanes.size === 1 ? heroes[0]?.lane : undefined
}

function countTeam(heroes: CombatHeroSnapshot[], team: CombatTeamId) {
  return heroes.filter((hero) => hero.team === team).length
}

function getClosestEnemyDistance(heroes: CombatHeroSnapshot[]) {
  let closest = Number.POSITIVE_INFINITY
  for (const hero of heroes) {
    for (const enemy of heroes) {
      if (enemy.team === hero.team) continue
      closest = Math.min(closest, pointDistance(hero.pos, enemy.pos))
    }
  }
  return closest
}

function createCandidateId(matchSeed: string, gameTime: number, heroIds: string[], center: CombatPoint) {
  const key = `${matchSeed}:${Math.floor(gameTime * 2)}:${heroIds.join(',')}:${Math.round(center.x / 5)}:${Math.round(center.y / 5)}`
  let hash = 2166136261
  for (let index = 0; index < key.length; index += 1) {
    hash ^= key.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return `enc-${(hash >>> 0).toString(36)}`
}

function averagePoint(points: CombatPoint[]): CombatPoint {
  return {
    x: average(points.map((point) => point.x)),
    y: average(points.map((point) => point.y)),
  }
}

function average(values: number[]) {
  if (values.length === 0) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

export function pointDistance(a: CombatPoint, b: CombatPoint) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}
