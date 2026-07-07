# Fila de tasks — LOTA Manager Simulation

Este arquivo é a **fila única de trabalho** do projeto. Um agente (Codex) roda de forma agendada, pega a próxima task e executa. Tasks antigas já concluídas foram removidas; o histórico está no fim do arquivo.

## Protocolo de execução (leia antes de qualquer coisa)

1. **Escolha a task**: percorra a seção "Fila" de cima para baixo e pegue a **primeira** task com status `[ ]`. Execute **apenas uma task por rodada** — nunca comece a próxima.
2. **Antes de implementar**: cada task tem um bloco "Verificar primeiro". Cheque se parte do trabalho já existe no código (outras rodadas podem ter adiantado). Implemente só o que falta.
3. **Escopo**: implemente exatamente o que a task descreve. Não refatore código fora do escopo, não "aproveite para melhorar" outras áreas.
4. **Validação obrigatória** ao final de toda task:
   - `npm test` — todos os testes passam (adicione os testes que a task pedir).
   - `npm run lint` — limpo.
   - `npm run build` — compila sem erros.
   - Se a task tiver critérios manuais, valide com `npm run dev` conforme descrito.
5. **Marque o resultado neste arquivo**:
   - Sucesso: mude `[ ]` para `[x]` e acrescente uma linha `> Concluída em AAAA-MM-DD — <resumo de 1 frase do que foi feito>`.
   - Bloqueio: mude para `[!]` e acrescente `> Bloqueada — <motivo objetivo e o que falta para desbloquear>`. Não tente contornar silenciosamente.
6. **Commit**: faça um único commit com todo o trabalho da task **incluindo a atualização deste arquivo**. Mensagem no padrão do repositório (`feat:`/`fix:`/`perf:`/`refactor:` + descrição).
7. **Contexto do projeto**: simulador de MOBA (React 19 + Vite + TS). Simulação e integração em `src/App.tsx`; IA pura em `src/ai/`; fórmulas em `src/game-systems/`. A simulação é determinística por `matchSeed` — preserve isso sempre. Módulos de `src/ai/` e `src/game-systems/` não podem importar React/DOM.

---

## Fila

### [x] T1 — Completar micro-otimizações de CPU da rodada 2

> Concluída em 2026-07-07 — Reduzi churn no tick ao fundir visão/respawn, reutilizar o buffer de hitboxes e adicionar culling barato de torres/camps nos cálculos de perigo.

**Objetivo**: fechar os itens de custo que a rodada 2 não cobriu por completo.

**Verificar primeiro**: a rodada 2 já implementou cache de alvo de creep por frame (`getCachedRouteCreepTarget` + `TickFrameContext`), grade espacial de creeps (`buildSpatialGrid`/`querySpatialGrid`, usada no targeting, no `getDangerScore` e no `shouldReconsiderArcaneDecision`), memoização de `getPlayerAiProfile` (`playerAiProfileCache`) e gate no `syncLanePathIndex`. NÃO refazer nada disso.

Itens restantes (checar um a um se já existem antes de implementar):

1. **Churn de GC no tick**: `updateCreepMovement` (App.tsx, procure a função) retorna `{ ...creep }` novo mesmo quando a posição não muda — retornar o mesmo objeto quando nada mudou. Verificar também se `next.arcanes.map(...)` roda mais de uma vez por frame no `tick` e fundir passadas onde for trivial.
2. **Grade espacial em `resolveUnitHitboxes`**: a resolução de hitbox ainda é O(n²) sobre todos os corpos (arcanes+creeps+boss+camps). Usar a grade para só testar pares em células vizinhas. O array `bodies` também é realocado todo frame — reutilizar buffer se simples.
3. **`getDangerScore`**: conferir se torres e camps também ganharam culling por distância (a grade cobriu creeps); se não, adicionar um teste de bounding barato antes dos `reduce`.

**Critérios**: comportamento observável idêntico (mesmos alvos/decisões); FPS igual ou melhor com 60+ creeps (FrameCounter no canto do mapa); `npm test`/`lint`/`build` verdes.

---

### [x] T2 — Extrair a simulação de App.tsx para `src/sim/` (sem React)

> Concluída em 2026-07-07 — Extraí o motor de simulação para `src/sim/simulation.ts`, removi dependências de React/DOM/lucide da camada de sim e adicionei smoke test Node para rodar 600 ticks com invariantes básicas.

**Objetivo**: separar de vez cálculo e render. Todo o código de simulação sai de `src/App.tsx` (~9400 linhas) para módulos puros em `src/sim/`, sem NENHUM import de React/DOM/lucide. É pré-requisito da T3 (Worker) e permite rodar a sim em Node.

**O que move** (refactor mecânico — mover, não reescrever):
- Tipos do estado (`SimulationState`, `Arcane`, `Creep`, `Tower`, `Structure`, `Base`, `Camp`, `Boss`, efeitos, markers, etc.) → `src/sim/types.ts`.
- Constantes de simulação (`simulationFrameSeconds`, `decisionGateSeconds`, `maxDecisionHoldSeconds`, custos de TP, regras de mapa, `lanePaths`, `teamInfo` — a parte de dados, não cores de UI se houver) → `src/sim/constants.ts`.
- `createInitialState`, `tick` e toda a sua árvore de chamadas (movimento, combate, decisões, calls, snapshot de IA, economia, skills, hitboxes, visão, fog, memória) → módulos em `src/sim/` (ex.: `simulation.ts`, `combat.ts`, `movement.ts`, `decisions.ts`, `snapshot.ts` — use bom senso para agrupar, sem criar dezenas de arquivos minúsculos).
- `cloneSimulationStateForTick` → `src/sim/`.

**O que fica em App.tsx**: componentes React, canvas/desenho, interpolação visual (`getBufferedVisualPosition` e afins), handlers de clique, formatação de labels para UI. App.tsx importa tudo da sim de `src/sim/`.

**Regras**:
- Zero mudança de comportamento — é mover código. O jogo deve rodar idêntico.
- `src/sim/` não importa React/DOM/`lucide-react`/CSS. Funções que hoje misturam sim+UI (ex.: labels de decisão em PT usados no inspector) podem ficar na sim como strings puras — strings não são DOM.
- Adicionar um smoke test `src/sim/simulation.test.ts`: criar estado inicial com seed fixa, rodar ~600 ticks em Node e assertar invariantes (tempo avança, arcanes vivos, sem NaN em posições/HP, algum creep spawnou). Incluir no script `test` do package.json.
- Helper de debug `window.__lotaStateRef` (App.tsx) continua funcionando.

**Critérios**: `npm test` (incluindo o novo smoke test em Node), `lint`, `build` verdes; partida roda visualmente idêntica; App.tsx substancialmente menor.

---

### [ ] T3 — Partida pré-computada: Worker simula, jogador assiste sem lag

**Objetivo**: ao iniciar a partida, um Web Worker roda a simulação em fast-forward e o jogador assiste um playback fluido — sem lag, sem acoplamento com FPS, funcionando até com a aba oculta. O jogador não interage com a partida (só pausar/velocidade/pular, que são controles do player, não da sim). Depende da T2.

**Arquitetura**:
1. **Worker** (`src/sim/matchWorker.ts`, criado com `new Worker(new URL(...), { type: 'module' })` — Vite suporta nativamente): recebe `{ seed }`, roda `tick` em loop o mais rápido possível (sem rAF, com `setTimeout(0)`/chunks para não bloquear mensagens) e emite:
   - **Frames de render** a 10Hz de tempo de jogo: por arcane (pos, hp, mana, level, gold, itens, cooldowns resumidos, macro/micro/modo — o que os painéis e o inspector mostram), creeps compactos (id, pos, hpRatio, team, type, lane), HP de torres/estruturas/bases, boss, runas, camps, markers/efeitos ativos, planos/calls dos times, eventos novos.
   - **Progresso** (`{ simTime, done }`) para a barra de loading/buffer.
   - Fim de partida (`winner`, tempo total).
2. **Main thread**: guarda os frames num array (buffer) e roda um **relógio de playback**: rAF lê o frame ≤ tempo do cursor e alimenta o desenho. O buffer de interpolação visual existente (`getBufferedVisualPosition`, delay 120ms) consome as posições dos frames — aumentar o delay de interpolação para ~250ms para suavizar os 10Hz.
3. **Streaming, não loader completo**: começar o playback quando houver ~5s de buffer à frente ("Preparando a partida..." com barra); se o cursor alcançar o buffer (não deve acontecer — o worker corre 20×+ mais rápido), pausar com "buffering" até abrir folga.
4. **Controles**: pausar/retomar = congelar o cursor; velocidade 1x–16x = multiplicador do cursor; "pular para o fim" opcional = mover cursor para o último frame disponível (habilitar só quando `done`).
5. **UI de painéis/inspector**: passam a ler o frame corrente (não mais `stateRef`). Seleção/hit-test do mapa usa as posições do frame. O `window.__lotaStateRef` de debug pode apontar para o último frame recebido.

**Cuidados**:
- NÃO usar `postMessage` com o `SimulationState` completo por frame — só o frame compacto descrito. Medir: uma partida de 40 min a 10Hz deve ficar < ~80MB de frames; se passar, reduzir para 5Hz e/ou compactar creeps em arrays numéricos.
- Auditar que a sim não usa `performance.now()`/`Math.random()`/`Date` em NENHUM caminho (só tempo de jogo + `matchSeed`) — falhas disso quebram o determinismo do replay. Corrigir o que encontrar.
- O modo atual (sim ao vivo no main) pode ser removido depois que o playback estiver estável — remover também o loop `animate` do main e os acumuladores associados.

**Critérios**: partida inicia com barra de "preparando" de poucos segundos e roda perfeitamente lisa em 1x–16x; minimizar/ocultar a aba não afeta nada; FPS de render estável (FrameCounter); reiniciar gera outra partida (seed nova); `npm test`/`lint`/`build` verdes.

---

### [ ] T4 — Parar de redesenhar quando nada muda

**Objetivo**: com o playback pausado (ou sem frame novo + sem mudança de seleção/resize), as camadas de canvas não devem limpar/redesenhar a cada rAF.

Adicionar um early-out barato por camada: guardar (timestamp do último frame desenhado + id de seleção + tamanho do canvas) e pular o redraw se nada mudou. Atenção: animações próprias do canvas (fade de FX, texto flutuante) dependem de tempo — camadas com animação em andamento continuam redesenhando até a animação expirar.

**Critérios**: pausado e sem interação, uso de CPU/GPU cai visivelmente (checar no Task Manager/DevTools Performance); nenhuma diferença visual ao pausar/retomar/selecionar/redimensionar.

---

### [ ] T5 — Nitidez HiDPI com DPR adaptativo

**Objetivo**: reintroduzir a nitidez em telas com escala 125/150% sem trazer de volta o stutter. Depende da T3 (com a sim no worker, queda de FPS não afeta mais a velocidade do jogo).

`maxCanvasDevicePixelRatio` (App.tsx) volta a permitir 2, mas de forma adaptativa: medir FPS médio numa janela de ~3s (o FrameCounter já mede); se ficar abaixo de ~50 por 3s seguidos com DPR 2, cair para 1 (e não voltar a subir na mesma partida). Remover o comentário de "manter em 1" e documentar a lógica nova no lugar.

**Critérios**: em máquina capaz, canvases nítidos em HiDPI; em máquina no limite, degrada para DPR 1 sozinho sem stutter; `lint`/`build` verdes.

---

### [ ] T6 — (Opcional) Simulador de balanceamento em lote

**Objetivo**: aproveitar a sim extraída (T2) para rodar partidas em massa em Node e gerar estatísticas de balanceamento. Depende da T2.

Criar `scripts/batch-sim.mjs`: roda N partidas (seeds sequenciais) até o fim ou até um teto de tempo de jogo (~50 min), e imprime: taxa de vitória por time, duração média, distribuição de winrate por herói (com os rosters aleatórios), kills médios, % de partidas que terminam antes do teto. Usar `--experimental-strip-types` como os testes. Adicionar script `npm run batch-sim -- --matches 100`.

**Critérios**: `npm run batch-sim -- --matches 20` completa em tempo razoável e imprime o relatório; nenhuma partida trava (teto de segurança de ticks).

---

## Histórico (não retrabalhar)

Concluído em rodadas anteriores — mantido aqui só como registro:

- **Input do mapa**: cliques unificados via hit-test no `.map-panel`; canvases com `pointer-events: none` (torres/camps/runas/creeps/boss selecionáveis de novo).
- **Render**: prune de posições visuais por-mapa (WeakMap) + prune do attack-range. DPR cap 2 foi implementado e **revertido** (stutter) — retorna só via T5.
- **IA rodada 1**: cache do snapshot analisado por tick; ruído humano interpolado por disciplina; `delaySeconds` aplicado ao `nextDecisionAt`; pesos de role só em score positivo; `matchSeed` para variedade entre partidas; remoção de constantes/campos mortos; eventos de memória agora emitidos (`failed_gank`, `lost_objective`, `won_fight`, `lost_fight`).
- **Bug crítico**: congelamento de arcanes ranged na base (chegada ao ponto de formação nunca disparava reconsideração) — corrigido com checagem do `formationPoint` + teto de hold de 6s (`maxDecisionHoldSeconds`).
- **IA rodada 2**: alvo de creep 1×/frame (`getCachedRouteCreepTarget`); grade espacial de creeps (targeting, `getDangerScore`, `shouldReconsiderArcaneDecision`); memo de `getPlayerAiProfile`; gate no `syncLanePathIndex`; fase de jogo nos planos (penalidade de push no laning + `hasHighValueObjectiveOpportunity` real); conversão de vantagem (lead relativo, power play com 2+ mortos, comeback com `comebackPatience`); `group_push` com alvo de lane via `getLaneWinAssessment`; janela de boss no call; memória de morte 240s→100s; `averageHealthPct` só com vivos; `gankRisk` do retreat 0.45→0.2.
- **Task descartada**: "sim num setInterval no main thread" (antiga R2) — superada pela T3, que resolve o mesmo problema de forma definitiva.
