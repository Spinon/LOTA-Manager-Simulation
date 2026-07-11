import {
  createInitialState,
  decisionGateSeconds,
  getHeroDefinition,
  getSimpleSkillCooldown,
  getSimpleSkillLevel,
  loadGameData,
  simulationFrameSeconds,
  tick,
} from '../src/sim/simulation.ts'

const args = process.argv.slice(2)

function getArg(name, fallback) {
  const index = args.indexOf(`--${name}`)
  return index >= 0 && index + 1 < args.length ? args[index + 1] : fallback
}

const matchCount = Math.max(1, Number(getArg('matches', 3)) || 3)
const minutes = Math.max(1, Number(getArg('minutes', 10)) || 10)
const seedPrefix = getArg('seed', 'cooldown-audit')
const violations = []
const observedSkills = new Set()
let totalCasts = 0

await loadGameData()

for (let matchIndex = 0; matchIndex < matchCount; matchIndex += 1) {
  const seed = `${seedPrefix}-${matchIndex + 1}`
  let state = createInitialState(seed)
  let decisionAccumulator = 0
  const seenMarkers = new Set()
  const lastCastBySkill = new Map()

  while (!state.winner && state.time < minutes * 60) {
    decisionAccumulator += simulationFrameSeconds
    const shouldDecide = decisionAccumulator >= decisionGateSeconds
    if (shouldDecide) decisionAccumulator %= decisionGateSeconds
    state = tick(state, simulationFrameSeconds, shouldDecide)

    for (const marker of state.skillMarkers) {
      if (seenMarkers.has(marker.id)) continue
      seenMarkers.add(marker.id)
      const arcane = state.arcanes.find((candidate) => marker.id.startsWith(`skill-${candidate.id}-`))
      if (!arcane) continue
      const skill = getHeroDefinition(arcane.heroDefinitionId).skills?.find((candidate) => marker.label.startsWith(`${candidate.key} `))
      if (!skill) continue

      const level = Math.max(1, getSimpleSkillLevel(arcane, skill))
      const cooldown = getSimpleSkillCooldown(skill, level)
      const key = `${arcane.id}|${skill.id}`
      const previous = lastCastBySkill.get(key)
      totalCasts += 1
      observedSkills.add(skill.id)

      if (previous && marker.createdAt - previous.time + 0.002 < previous.cooldown) {
        violations.push({
          seed,
          time: marker.createdAt,
          hero: arcane.name,
          skill: skill.id,
          interval: marker.createdAt - previous.time,
          requiredCooldown: previous.cooldown,
        })
      }
      lastCastBySkill.set(key, { time: marker.createdAt, cooldown })
    }
  }
}

console.log(JSON.stringify({
  matches: matchCount,
  minutesPerMatch: minutes,
  totalCasts,
  observedSkills: observedSkills.size,
  violations: violations.length,
  samples: violations.slice(0, 20),
}, null, 2))

if (violations.length > 0) process.exitCode = 1
