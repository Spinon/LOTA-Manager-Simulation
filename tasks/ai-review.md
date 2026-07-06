# Task: Correções e limpeza da IA dos bots

**Projeto:** `C:\Users\Spynon\Documents\LOTA-Manager Simulation` — simulador de MOBA em React 19 + Vite + TypeScript. A IA vive em `src/ai/` (módulos puros e testados) e se integra à simulação em `src/App.tsx` (~8400 linhas).

## Contexto da arquitetura de IA

Pipeline por decisão: `createAiGameSnapshot` (App.tsx ~linha 1963) monta um snapshot bruto dos dois times → `analyzeGameState` (`src/ai/analysis/gameStateAnalyzer.ts`) deriva leads e prontidão → `selectTeamPlan` (`src/ai/team/teamBrain.ts`) escolhe o plano de time (a cada 1.2s, `teamDecisionIntervalSeconds`) → `selectPlayerMode` (`src/ai/player/playerAgent.ts`) pontua 8 modos por jogador → `resolvePlayerExecution` (`src/ai/execution/executionModel.ts`) simula sucesso/falha da execução. Memória de perigo em `src/ai/memory/memorySystem.ts`. Constantes em `src/ai/config/aiConstants.ts`, tipos em `src/ai/types/aiTypes.ts`. Cada arcane decide a cada ~0.3–0.9s (`getArcaneDecisionInterval`, App.tsx ~linha 2803). Suíte de testes: `npm test` (18 arquivos, todos passando hoje).

## Tarefas, em ordem de prioridade

### 1. PERFORMANCE — cachear o snapshot analisado (gargalo principal)

`createPlayerAiContext` (App.tsx ~linha 2470) chama `analyzeGameState(createAiGameSnapshot(state))` **por arcane, por decisão** — ~15–30 vezes por segundo. Cada snapshot recalcula net worth, push power, vision control, lane pressure, structure risk, safe farm etc. para os DOIS times.

Correção: calcular o snapshot analisado no máximo 1× por gate de decisão (0.1s) e reutilizar em todos os arcanes e em `updateTeamPlans` (~linha 1913). Um cache simples por `state.time` resolve (ex.: comparar o time do último snapshot; se igual, reutilizar). Cuidado: o estado muta dentro do tick — cachear no início do bloco de decisões é suficiente, não precisa de precisão intra-tick.

Aproveitar e simplificar os fallbacks `state.teamPlans[team] ?? selectTeamPlan({ analyzed: analyzeGameState(createAiGameSnapshot(state)), ... })` (App.tsx ~linhas 2017 e 3266): o tick garante plano inicial (`needsInitialTeamPlan`, ~linha 1330), então o fallback caro é praticamente inalcançável — usar o cache ou remover o fallback.

Também memoizar `getPlayerAiProfile` (App.tsx ~linha 2515): é 100% derivado de role/atributos estáticos do arcane, não precisa ser reconstruído a cada decisão.

### 2. BUG — sistema de ruído humano inerte

Em `src/ai/player/playerAgent.ts` (~linha 203), `deterministicNoise` usa apenas `AI_RULES.noise.professionalBaseNoise` (5); `amateurBaseNoise` (15) nunca entra na fórmula, e `getPlayerAiProfile` (App.tsx ~linha 2542) fixa `tiltLevel: 0` para todos. Resultado: amplitude real ≤ ~2 pontos contra scores de 50–300+ — ruído e tilt não influenciam nenhuma decisão, e `maxNoise: 30` é inalcançável.

Correção: interpolar a base do ruído entre `amateurBaseNoise` e `professionalBaseNoise` pela disciplina (ex.: `lerp(amateur, professional, discipline / 100)`), mantendo o multiplicador de tilt. Ajustar os valores para que um jogador indisciplinado (discipline ~40) tenha ruído perceptível (~±8–12 pontos) sem randomizar um profissional. Manter determinismo por janela de decisão. Atualizar/estender `playerAgent.test.ts` cobrindo o novo cálculo.

### 3. BUG — `delaySeconds` da execução nunca é aplicado

`resolvePlayerExecution` calcula `delaySeconds` (0.15–2.4s, `getExecutionDelay` em `executionModel.ts`), mas o App só copia para `arcane.aiExecutionDelay` para exibição no inspector — o atraso não afeta `nextDecisionAt` (App.tsx ~linha 3526) nem o movimento. O modelo de "reação lenta" é cosmético.

Correção: somar `execution.delaySeconds` ao `nextDecisionAt` quando a decisão roda (ramo `shouldRunDecision`), de modo que jogadores indisciplinados/falhando reajam mais devagar de verdade. Garantir que isso não quebre os ramos de `forceDecision` (stall/respawn precisam continuar reagindo rápido).

### 4. BUG — pesos de role multiplicativos invertem com score negativo

Em `src/ai/player/playerAgent.ts` (~linha 180), `applyRoleAndPersonality` faz `score.score * roleWeight`. Para scores NEGATIVOS, um peso < 1 (ex.: `farm_jungle: 0.12` do dedicated_support) torna o score MENOS negativo — aproximando o farm do topo do ranking justamente quando farmar é má ideia (perigo alto, HP baixo). O inverso vale para pesos > 1.

Correção: aplicar o peso multiplicativo apenas quando `score > 0`; para score ≤ 0, manter o score (ou aplicar `roleWeight` invertido). Adicionar caso de teste em `playerAgent.test.ts` com score negativo comprovando que o peso não melhora o ranking do modo.

### 5. DECISÃO DE DESIGN — memória de time 90% dormante

Só existe um emissor de evento de memória: `hero_death` (App.tsx ~linha 6024). Os outros 5 tipos de `AiMemoryEventType` (`failed_gank`, `lost_objective`, `won_fight`, `lost_fight`, `danger_spike`) nunca são criados — e `won_fight` nem está em `DANGER_EVENT_TYPES` no `memorySystem.ts`, então seria inócuo mesmo se emitido.

Escolher UMA das opções (preferida: a primeira):
- **Emitir os eventos que faltam**: `lost_objective` quando torre/estrutura do time cai (em `resolveDeaths`/dano a estruturas), `lost_fight`/`won_fight` quando um teamfight termina com 2+ mortes de um lado num raio curto e janela de ~10s. Manter `won_fight` fora do cálculo de perigo (ou usá-lo como REDUTOR de perigo na área).
- **Ou remover** os tipos não emitidos do union `AiMemoryEventType` e de `DANGER_EVENT_TYPES`, encolhendo a API para o que é real.

### 6. LIMPEZA — código morto (remoção segura)

Remover e ajustar fixtures de teste correspondentes:

- `src/ai/config/aiConstants.ts`: `modeSelection.switchThreshold`, `noise.amateurBaseNoise` (se a tarefa 2 não o consumir), `teamPlans.bossVisionMinimum` — nunca lidos.
- `src/ai/types/aiTypes.ts` + pontos de preenchimento no App.tsx: `TeamAiProfile.visionDiscipline`, `PlayerAiProfile.mapAwareness`, `PlayerAiProfile.heroMastery`, `PlayerContext.self.nearBase`, `PlayerContext.local.towerPressure`, `AnalyzedTeamState.xpLead` — preenchidos mas nunca consumidos (só aparecem em fixtures de teste). Obs.: existe um `towerPressure` DIFERENTE em `laneControlFormulas.ts` que é usado — não tocar nele.
- `TeamPlan.confidence` (calculado em `teamBrain.ts`, nunca lido/exibido) e `TeamPlan.expiresAtGameTime` (+24s, nunca consultado — planos renovam a cada 1.2s): remover, ou passar a usar (ex.: exibir confidence no chip de plano do TeamPanel). Preferência: remover.
- `src/game-systems/decisionFormulas.ts`: `shouldTakeDecision` — usado só pelo próprio teste; remover função e teste.

### 7. OPCIONAL — seed de partida para variedade

O noise (`playerAgent.ts`) e o roll de execução (`executionModel.ts`) usam hash de `(playerId, mode, janelaDeTempo)` sem seed de partida — reiniciar reproduz exatamente o mesmo jogo. Se variedade entre partidas for desejada: gerar um `matchSeed` em `createInitialState` e incluí-lo na chave dos hashes (propagar via `PlayerContext` ou parâmetro). Manter determinismo DENTRO da mesma partida.

## Observações de tuning (avaliar, não obrigatório)

- Evento `hero_death` assombra a área por 240s com piso de 20% no falloff temporal (`memorySystem.ts`) — considerar reduzir para ~90–120s.
- `map.gankRisk` e `self.danger` recebem o mesmo `dangerScore` em `createPlayerAiContext`, e o modo retreat soma os dois (~1.3× perigo) — verificar se a dupla contagem é intencional.
- `averageHealthPct` do snapshot inclui arcanes mortos (HP 0), que já são penalizados via `deadHeroes` — punição dupla em `fightReadiness`.

## Restrições e verificação

- Não alterar renderização nem gameplay fora do escopo acima; mudanças de comportamento da IA devem ser as descritas.
- Manter os módulos de `src/ai/` puros (sem dependência de React/DOM) e o estilo existente.
- Rodar `npm test`, `npm run lint` e `npm run build` ao final — todos devem passar; adicionar os testes novos pedidos nas tarefas 2 e 4.
- Sanidade manual com `npm run dev`: partida deve fluir normalmente em 1x–8x, times devem alternar planos (chip "Plano" nos painéis), e o inspector deve continuar mostrando modo/razão/chance de execução dos arcanes.
