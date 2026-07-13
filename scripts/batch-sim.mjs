// Simulador de balanceamento em lote (T6): roda N partidas headless com seeds
// sequenciais e imprime estatísticas agregadas. Uso:
//   npm run batch-sim -- --matches 20 [--seed prefixo]
import {
  createInitialState,
  loadGameData,
  matchPreparationStartSeconds,
  simulationFrameSeconds,
} from '../src/sim/simulation.ts'
import { advanceSimulationClock, createSimulationClock } from '../src/sim/simulationClock.ts'
import { advanceSimulationState } from '../src/sim/simulationRuntime.ts'

const args = process.argv.slice(2)

function getArg(name, fallback) {
  const index = args.indexOf(`--${name}`)
  if (index === -1 || index + 1 >= args.length) return fallback
  return args[index + 1]
}

const matchCount = Math.max(1, Number(getArg('matches', 20)) || 20)
const seedPrefix = getArg('seed', 'batch')
const clockMode = getArg('clock', 'event')
if (clockMode !== 'fixed' && clockMode !== 'event') {
  throw new Error(`Modo de relogio invalido: ${clockMode}`)
}

const watchdogMinutes = Math.max(60, Number(getArg('watchdog-minutes', 90)) || 90)
const watchdogSeconds = watchdogMinutes * 60
// O watchdog apenas denuncia simulações travadas; nunca declara vencedor ou empate.
const maxSimulationSteps = Math.ceil((watchdogSeconds - matchPreparationStartSeconds) / simulationFrameSeconds) + 100
const checkpointMinutes = [6, 10, 20, 40]

await loadGameData()

const results = []
const heroStats = new Map()
const batchStartedAt = performance.now()

for (let matchIndex = 0; matchIndex < matchCount; matchIndex += 1) {
  const seed = `${seedPrefix}-${matchIndex + 1}`
  const matchStartedAt = performance.now()
  let state = createInitialState(seed)
  const simulationClock = createSimulationClock(clockMode)
  const rosters = { dawn: [], dusk: [] }
  for (const arcane of state.arcanes) rosters[arcane.team].push(arcane.name)

  let steps = 0
  let checkpointIndex = 0
  const checkpoints = {}
  let leaderAt20
  let deathsAtLateStart
  while (!state.winner && state.time < watchdogSeconds && steps < maxSimulationSteps) {
    const advance = advanceSimulationClock(state, simulationClock)
    state = advanceSimulationState(state, advance)
    steps += 1
    if (checkpointIndex < checkpointMinutes.length && state.time >= checkpointMinutes[checkpointIndex] * 60) {
      const minute = checkpointMinutes[checkpointIndex]
      checkpoints[minute] = state.arcanes.map((arcane) => ({
        role: arcane.role,
        level: arcane.stats.level,
        gpm: arcane.earnedGold / Math.max(1, state.time) * 60,
      }))
      if (minute === 20) {
        const netWorth = Object.fromEntries(['dawn', 'dusk'].map((team) => [
          team,
          state.arcanes.filter((arcane) => arcane.team === team).reduce((sum, arcane) => sum + arcane.earnedGold, 0),
        ]))
        leaderAt20 = Math.abs(netWorth.dawn - netWorth.dusk) < 500 ? undefined : netWorth.dawn > netWorth.dusk ? 'dawn' : 'dusk'
      }
      checkpointIndex += 1
    }
    if (deathsAtLateStart === undefined && state.time >= 28 * 60) {
      deathsAtLateStart = state.arcanes.reduce((sum, arcane) => sum + arcane.deaths, 0)
    }
  }

  const wallSeconds = (performance.now() - matchStartedAt) / 1000
  results.push({
    seed,
    winner: state.winner,
    durationSeconds: state.time,
    kills: { ...state.kills },
    wallSeconds,
    checkpoints,
    leaderAt20,
    lateDeaths: Math.max(0, state.arcanes.reduce((sum, arcane) => sum + arcane.deaths, 0) - (deathsAtLateStart ?? 0)),
    stalled: !state.winner,
    finalState: !state.winner ? {
      bases: state.bases.map((base) => ({ id: base.id, hp: Math.round(base.hp) })),
      towersAlive: state.towers.filter((tower) => tower.hp > 0).map((tower) => tower.id),
      structuresAlive: state.structures.filter((structure) => structure.hp > 0).map((structure) => structure.id),
      plans: state.teamPlans,
      calls: state.teamCalls,
      arcanes: state.arcanes.map((arcane) => ({
        team: arcane.team,
        role: arcane.role,
        level: arcane.stats.level,
        hp: Math.round(arcane.stats.hp / Math.max(1, arcane.stats.maxHp) * 100),
        macro: arcane.macroDecision,
        micro: arcane.microDecision,
      })),
    } : undefined,
  })

  for (const team of ['dawn', 'dusk']) {
    for (const heroName of rosters[team]) {
      const stats = heroStats.get(heroName) ?? { games: 0, wins: 0 }
      stats.games += 1
      if (state.winner === team) stats.wins += 1
      heroStats.set(heroName, stats)
    }
  }

  console.log(
    `[${matchIndex + 1}/${matchCount}] ${seed}: ${state.winner ?? 'travada no watchdog'} ` +
    `em ${(state.time / 60).toFixed(1)}min | kills ${state.kills.dawn}/${state.kills.dusk} | ${wallSeconds.toFixed(0)}s de CPU`,
  )
}

const finished = results.filter((result) => result.winner)
const dawnWins = finished.filter((result) => result.winner === 'dawn').length
const duskWins = finished.length - dawnWins
const averageMinutes = finished.length > 0
  ? finished.reduce((total, result) => total + result.durationSeconds, 0) / finished.length / 60
  : 0
const averageKills = results.reduce((total, result) => total + result.kills.dawn + result.kills.dusk, 0) / results.length
const totalWallMinutes = (performance.now() - batchStartedAt) / 60000
const durations = finished.map((result) => result.durationSeconds).sort((a, b) => a - b)
const percentile = (values, ratio) => values.length === 0 ? 0 : values[Math.min(values.length - 1, Math.floor((values.length - 1) * ratio))]
const above60 = results.filter((result) => result.durationSeconds > 60 * 60).length
const conversionCandidates = results.filter((result) => result.leaderAt20 && result.winner)
const convertedLeads = conversionCandidates.filter((result) => result.leaderAt20 === result.winner).length
const averageLateDeaths = results.reduce((sum, result) => sum + result.lateDeaths, 0) / results.length

console.log('')
console.log('=== Relatório de balanceamento ===')
console.log(`Partidas: ${results.length} (${totalWallMinutes.toFixed(1)}min de CPU)`)
console.log(`Relogio: ${clockMode}`)
console.log(`Terminaram organicamente: ${finished.length}/${results.length} (${Math.round((finished.length / results.length) * 100)}%)`)
console.log(`Watchdog de diagnóstico (${watchdogMinutes}min): ${results.length - finished.length} partida(s) travada(s)`)
console.log(`Duração p50/p90: ${(percentile(durations, 0.5) / 60).toFixed(1)} / ${(percentile(durations, 0.9) / 60).toFixed(1)}min`)
console.log(`Acima de 60min: ${above60}/${results.length} (${Math.round((above60 / results.length) * 100)}%)`)
if (finished.length > 0) {
  console.log(`Vitórias — dawn: ${dawnWins} (${Math.round((dawnWins / finished.length) * 100)}%) | dusk: ${duskWins} (${Math.round((duskWins / finished.length) * 100)}%)`)
  console.log(`Duração média (partidas com vencedor): ${averageMinutes.toFixed(1)}min`)
}
console.log(`Kills médios por partida (somando os dois times): ${averageKills.toFixed(1)}`)
console.log(`Mortes médias após 28min: ${averageLateDeaths.toFixed(1)}`)
console.log(`Conversão da liderança aos 20min: ${convertedLeads}/${conversionCandidates.length} (${conversionCandidates.length > 0 ? Math.round((convertedLeads / conversionCandidates.length) * 100) : 0}%)`)
results.filter((result) => result.stalled).forEach((result) => {
  console.log(`Diagnóstico ${result.seed}: ${JSON.stringify(result.finalState)}`)
})

console.log('')
console.log('Progressão média por role (nível | GPM):')
for (const minute of checkpointMinutes) {
  const rows = results.flatMap((result) => result.checkpoints[minute] ?? [])
  const roles = ['Safe Lane', 'Mid', 'Offlane', 'Greedy Support', 'Dedicated Support']
  console.log(`  ${minute}min`)
  for (const role of roles) {
    const roleRows = rows.filter((row) => row.role === role)
    if (roleRows.length === 0) continue
    const level = roleRows.reduce((sum, row) => sum + row.level, 0) / roleRows.length
    const gpm = roleRows.reduce((sum, row) => sum + row.gpm, 0) / roleRows.length
    console.log(`    ${role.padEnd(18)} ${level.toFixed(1).padStart(4)} | ${Math.round(gpm).toString().padStart(4)}`)
  }
}

console.log('')
console.log('Winrate por herói (jogos | vitórias | %):')
const heroRows = [...heroStats.entries()]
  .map(([name, stats]) => ({ name, ...stats, winRate: stats.games > 0 ? stats.wins / stats.games : 0 }))
  .sort((a, b) => b.winRate - a.winRate || b.games - a.games)
for (const row of heroRows) {
  console.log(`  ${row.name.padEnd(24)} ${String(row.games).padStart(3)} | ${String(row.wins).padStart(3)} | ${Math.round(row.winRate * 100)}%`)
}
