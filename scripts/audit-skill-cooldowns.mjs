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
const observedChanneledSkills = new Set()
let totalCasts = 0
let channelStarts = 0
let channelCompletions = 0
let channelInterruptions = 0

await loadGameData()

for (let matchIndex = 0; matchIndex < matchCount; matchIndex += 1) {
  const seed = `${seedPrefix}-${matchIndex + 1}`
  let state = createInitialState(seed)
  let decisionAccumulator = 0
  const seenMarkers = new Set()
  const lastCastBySkill = new Map()
  const activeSkillChannels = new Map()

  while (!state.winner && state.time < minutes * 60) {
    decisionAccumulator += simulationFrameSeconds
    const shouldDecide = decisionAccumulator >= decisionGateSeconds
    if (shouldDecide) decisionAccumulator %= decisionGateSeconds
    state = tick(state, simulationFrameSeconds, shouldDecide)

    for (const arcane of state.arcanes) {
      const previous = activeSkillChannels.get(arcane.id)
      const current = arcane.channeling?.kind === 'skill' ? arcane.channeling : undefined
      if (previous && (!current || current.skillId !== previous.skillId)) {
        if (state.time + 0.002 >= previous.completesAt) channelCompletions += 1
        else channelInterruptions += 1
      }
      if (current && (!previous || previous.skillId !== current.skillId)) {
        channelStarts += 1
        if (current.skillId) observedChanneledSkills.add(current.skillId)
      }
      if (current) activeSkillChannels.set(arcane.id, current)
      else activeSkillChannels.delete(arcane.id)
    }

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
  channeling: {
    observedSkills: observedChanneledSkills.size,
    starts: channelStarts,
    completions: channelCompletions,
    interruptions: channelInterruptions,
  },
  violations: violations.length,
  samples: violations.slice(0, 20),
}, null, 2))

if (violations.length > 0) process.exitCode = 1
