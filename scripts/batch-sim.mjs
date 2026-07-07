// Simulador de balanceamento em lote (T6): roda N partidas headless com seeds
// sequenciais e imprime estatísticas agregadas. Uso:
//   npm run batch-sim -- --matches 20 [--seed prefixo]
import {
  createInitialState,
  decisionGateSeconds,
  loadGameData,
  simulationFrameSeconds,
  tick,
} from '../src/sim/simulation.ts'

const args = process.argv.slice(2)

function getArg(name, fallback) {
  const index = args.indexOf(`--${name}`)
  if (index === -1 || index + 1 >= args.length) return fallback
  return args[index + 1]
}

const matchCount = Math.max(1, Number(getArg('matches', 20)) || 20)
const seedPrefix = getArg('seed', 'batch')

const maxSimulationSeconds = 50 * 60
// Teto de segurança de ticks: garante término mesmo se state.time parar de avançar.
const maxSimulationSteps = Math.ceil(maxSimulationSeconds / simulationFrameSeconds) + 100

await loadGameData()

const results = []
const heroStats = new Map()
const batchStartedAt = performance.now()

for (let matchIndex = 0; matchIndex < matchCount; matchIndex += 1) {
  const seed = `${seedPrefix}-${matchIndex + 1}`
  const matchStartedAt = performance.now()
  let state = createInitialState(seed)
  const rosters = { dawn: [], dusk: [] }
  for (const arcane of state.arcanes) rosters[arcane.team].push(arcane.name)

  let decisionAccumulator = 0
  let steps = 0
  while (!state.winner && state.time < maxSimulationSeconds && steps < maxSimulationSteps) {
    decisionAccumulator += simulationFrameSeconds
    const shouldDecide = decisionAccumulator >= decisionGateSeconds
    if (shouldDecide) decisionAccumulator %= decisionGateSeconds
    state = tick(state, simulationFrameSeconds, shouldDecide)
    steps += 1
  }

  const wallSeconds = (performance.now() - matchStartedAt) / 1000
  results.push({
    seed,
    winner: state.winner,
    durationSeconds: state.time,
    kills: { ...state.kills },
    wallSeconds,
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
    `[${matchIndex + 1}/${matchCount}] ${seed}: ${state.winner ?? 'sem vencedor (teto)'} ` +
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

console.log('')
console.log('=== Relatório de balanceamento ===')
console.log(`Partidas: ${results.length} (${totalWallMinutes.toFixed(1)}min de CPU)`)
console.log(`Terminaram antes do teto de ${maxSimulationSeconds / 60}min: ${finished.length}/${results.length} (${Math.round((finished.length / results.length) * 100)}%)`)
if (finished.length > 0) {
  console.log(`Vitórias — dawn: ${dawnWins} (${Math.round((dawnWins / finished.length) * 100)}%) | dusk: ${duskWins} (${Math.round((duskWins / finished.length) * 100)}%)`)
  console.log(`Duração média (partidas com vencedor): ${averageMinutes.toFixed(1)}min`)
}
console.log(`Kills médios por partida (somando os dois times): ${averageKills.toFixed(1)}`)

console.log('')
console.log('Winrate por herói (jogos | vitórias | %):')
const heroRows = [...heroStats.entries()]
  .map(([name, stats]) => ({ name, ...stats, winRate: stats.games > 0 ? stats.wins / stats.games : 0 }))
  .sort((a, b) => b.winRate - a.winRate || b.games - a.games)
for (const row of heroRows) {
  console.log(`  ${row.name.padEnd(24)} ${String(row.games).padStart(3)} | ${String(row.wins).padStart(3)} | ${Math.round(row.winRate * 100)}%`)
}
