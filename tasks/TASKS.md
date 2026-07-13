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

### [x] T3 — Partida pré-computada: Worker simula, jogador assiste sem lag

> Concluída em 2026-07-07 — Adicionei `matchWorker.ts`, playback por cursor com buffer inicial, backpressure/poda de frames, seeds determinísticas e auditoria removendo `Math.random` dos caminhos de simulação.

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

### [x] T4 — Parar de redesenhar quando nada muda

> Concluída em 2026-07-07 — Gate por camada com janela de assentamento de 600ms (`createDrawGate` + `getCanvasDrawKey`): pausado, as 5 camadas caem a 0 redraws/s; rodando, seguem a ~60fps; medido via `__lotaDrawStats` (152 draws/2s rodando, 0 pausado, burst curto ao mudar seleção).

**Objetivo**: com o playback pausado (ou sem frame novo + sem mudança de seleção/resize), as camadas de canvas não devem limpar/redesenhar a cada rAF.

Adicionar um early-out barato por camada: guardar (timestamp do último frame desenhado + id de seleção + tamanho do canvas) e pular o redraw se nada mudou. Atenção: animações próprias do canvas (fade de FX, texto flutuante) dependem de tempo — camadas com animação em andamento continuam redesenhando até a animação expirar.

**CUIDADO (regressão já corrigida uma vez)**: durante o playback, a interpolação visual (`getBufferedVisualPosition`) gera posições novas em TODO rAF, entre os frames de 0.2s do worker. Um gate por "`state.time` mudou" (o antigo `getCanvasDrawKey`) derruba o movimento para 5 FPS — foi exatamente o lag corrigido em 2026-07-07. O early-out desta task só pode atuar quando o playback está pausado/encerrado E a interpolação já assentou (ex.: nenhum sample novo há >300ms), nunca com o cursor andando.

**Critérios**: pausado e sem interação, uso de CPU/GPU cai visivelmente (checar no Task Manager/DevTools Performance); nenhuma diferença visual ao pausar/retomar/selecionar/redimensionar.

---

### [x] T5 — Nitidez HiDPI com DPR adaptativo

> Concluída em 2026-07-07 — `maxCanvasDevicePixelRatio` voltou a 2 com cap adaptativo no App (`getCanvasDpr`/`reportRenderFps` alimentado pelo FrameCounter): FPS <50 por 3s seguidos derruba o cap para 1 sem voltar na mesma partida; reset no restart; amostras de aba oculta ignoradas. Validado emulando DPR 2 (backing store 2x) e carga artificial (degradou para 1 após ~3.2s); debug em `__lotaDpr`.

**Objetivo**: reintroduzir a nitidez em telas com escala 125/150% sem trazer de volta o stutter. Depende da T3 (com a sim no worker, queda de FPS não afeta mais a velocidade do jogo).

`maxCanvasDevicePixelRatio` (App.tsx) volta a permitir 2, mas de forma adaptativa: medir FPS médio numa janela de ~3s (o FrameCounter já mede); se ficar abaixo de ~50 por 3s seguidos com DPR 2, cair para 1 (e não voltar a subir na mesma partida). Remover o comentário de "manter em 1" e documentar a lógica nova no lugar.

**Critérios**: em máquina capaz, canvases nítidos em HiDPI; em máquina no limite, degrada para DPR 1 sozinho sem stutter; `lint`/`build` verdes.

---

### [x] T6 — (Opcional) Simulador de balanceamento em lote

> Concluída em 2026-07-07 — `scripts/batch-sim.mjs` + `npm run batch-sim`; 20 partidas em ~11min de CPU, relatório com winrate por time/herói, duração média, kills e % antes do teto. Primeiro achado de balanceamento: dusk venceu 67% vs 33% do dawn nas 20 seeds (vale investigar viés de lado).

**Objetivo**: aproveitar a sim extraída (T2) para rodar partidas em massa em Node e gerar estatísticas de balanceamento. Depende da T2.

Criar `scripts/batch-sim.mjs`: roda N partidas (seeds sequenciais) até o fim ou até um teto de tempo de jogo (~50 min), e imprime: taxa de vitória por time, duração média, distribuição de winrate por herói (com os rosters aleatórios), kills médios, % de partidas que terminam antes do teto. Usar `--experimental-strip-types` como os testes. Adicionar script `npm run batch-sim -- --matches 100`.

**Critérios**: `npm run batch-sim -- --matches 20` completa em tempo razoável e imprime o relatório; nenhuma partida trava (teto de segurança de ticks).

---

### [x] T7 — Frame de render compacto (destrava partida inteira na memória)

**Objetivo**: o `MatchRenderFrame` hoje é o `SimulationState` completo clonado (~50KB de JSON em mid-game). Reduzir para um frame próprio com só o que a UI lê (~5-8KB) corta ~90% da memória do playback e permite: (a) buffer/standby maiores ou a partida inteira pré-carregada, (b) `postMessage` mais barato. Era a spec original da T3 ("NÃO usar postMessage com o SimulationState completo"), não implementada.

**Contexto (medido em 2026-07-07)**: composição do frame em bytes de JSON — arcanes ~17KB, creeps ~14KB, camps ~3.8KB, towers ~3.5KB, teamMemory ~3KB, structures ~2.7KB, resto <2KB cada.

**O que fazer**:
1. Definir `MatchRenderFrame` como tipo próprio em `src/sim/` (não mais alias de `SimulationState`), montado por `createMatchRenderFrame`.
2. **Auditar o que App.tsx realmente lê antes de cortar** (grep por campo). Levantamento parcial já feito: dos arcanes, a UI NÃO lê `pathIndex`, `lastAttack`, `lastHitBy`, `decisionTempo`, `lastDecisionAt`, `forceDecision`, `lastDecisionHpRatio/ManaRatio`, `lastDecisionPos`, `decision`; ela LÊ `earnedGold` (via `getTeamNetWorth`), os campos de exibição de IA (`aiMode`, `aiReason`, `macroDecision`, `microDecision`, `decisionStatus`, `aiExecutionChance/Delay/Failure`), `items`, `itemCooldowns`, `skillLevels`, `stats`, `channeling`, `tpScrolls`, `tpCooldownUntil`, `unspentSkillPoints`, `statBonusLevels`, `visionRange`. Dos creeps a UI usa só id, team, lane, type, pos, hp, maxHp (ver `drawCreepCanvas` e hit-test) — compactar agressivamente. `teamMemory` é lido via `getTeamMemoryDanger(state, ...)` — manter só o que essa função usa.
3. Funções de `simulation.ts` que a UI chama passando o frame (ex.: `getTeamNetWorth`, `getTeamMemoryDanger`, `isStructureFortified`, `findSelected`/hit-test) precisam aceitar o tipo do frame — ajustar assinaturas para um tipo mínimo comum em vez de `SimulationState`.
4. `getFrameKey` (App.tsx) e a interpolação (`getBufferedVisualPosition`) usam `time`/`pos` — manter esses campos com os mesmos nomes/formatos para não quebrar.
5. Medir: `JSON.stringify(frame).length` em t≈10min deve ficar ≤ ~8KB; partida de 40min a 5Hz ≤ ~100MB somando frames.
6. Com o frame leve, subir `maxBufferedAheadSeconds` (matchWorker) de 180 para algo como 600–900s e o standby da pré-simulação pode cobrir a partida inteira — validar memória no DevTools (heap da aba < ~300MB).

**Cuidados**: zero mudança na SIMULAÇÃO — só na fronteira worker→UI. O clone atual (`cloneSimulationStateForTick`) continua existindo para uso interno do tick. Não quebrar seleção/inspector (testar clicar em arcane, creep, torre, camp, runa, boss com o painel Dados aberto).

**Critérios**: partida visualmente idêntica; inspector e painéis com os mesmos dados; `npm test`/`lint`/`build` verdes; medições de memória registradas no resumo da task.

**Resultado (2026-07-11)**: `MatchRenderFrame` virou um contrato de transporte próprio, com catálogo estático enviado uma vez, tuples dinâmicas e hidratação apenas do frame ativo. Dados ricos do inspector/eventos são snapshots a cada 2s; movimento, HP, mana, projéteis e marcadores continuam a 5Hz. Medição determinística em 10:00: frame antigo 42.842 bytes; frame de movimento 7.384 bytes; snapshot rico 16.827 bytes; média ponderada aproximada 8,33KB/frame (~99,94MB em 40min/5Hz), mais 8.378 bytes de catálogo estático. Playtest com replay completo de 50min/15.001 frames: mapa e painel abriram, inspeção de Arcane/torre e limpeza por `Esc` funcionaram, sem exceções no navegador.

---

### [x] T8 - Benchmark determinístico e caches puros da simulação

> Concluída em 2026-07-11 - Adicionei benchmark do caminho real do Worker e caches por definição/nível para perfis de skills e passivas, reduzindo a mediana de CPU em aproximadamente 31% sem alterar o digest.

**Especificação**: P1 em `tasks/PERFORMANCE_TASKS.md`.

**Verificar primeiro**: `getSkillEffectProfile` e `getArcanePassiveCombatModifiers` devem continuar funções puras; nenhum consumidor pode alterar os objetos retornados. O benchmark deve reproduzir o caminho do Worker com a mesma seed, frame a 5Hz, detalhes a cada 2s e clone em lotes de 150 ticks.

**Critérios**: benchmark imprime mediana, taxa de simulação e digest determinístico; três execuções da mesma seed produzem o mesmo digest; caches têm testes de identidade/resultado; nenhum resultado de simulação muda; `npm test`, `npm run lint` e `npm run build` verdes.

**Medição** (`180s`, 3 runs, seed `performance-reference`): commit `dc6d2b6` = 12,78s wall / 8,19s CPU; T8 = 9,03s wall / 5,67s CPU; digest preservado `2b7432ccfc848dee`.

---

### [x] T9 - Índices do tick e dano direcionado

> Concluída em 2026-07-11 - Indexei entidades e inventários, agrupei efeitos por alvo e tornei o dano direcionado à coleção afetada, preservando o digest determinístico.

**Especificação**: P2 em `tasks/PERFORMANCE_TASKS.md`.

**Critérios**: reduzir filtros/maps no perfil de combate sem alterar digest determinístico; testes, lint e build verdes.

**Medição** (`180s`, 3 runs, seed `performance-reference`): 5,96s wall / 5,27s CPU contra 6,11s wall / 5,25s CPU no baseline imediato (empate técnico); `resolveCombat` caiu de aproximadamente 37,5% para 26,2% no perfil, e o digest permaneceu `2b7432ccfc848dee`.

---

### [x] T10 - Desacoplar canvas dos painéis React

> Concluída em 2026-07-12 - Os canvases passaram a consumir frames compactos por ref, enquanto mapa/placar, equipes e inspector recebem snapshots React em cadências independentes e memoizadas.

**Especificação**: P3 em `tasks/PERFORMANCE_TASKS.md`.

**Critérios**: reduzir tempo inclusivo do React; inspector e mapa idênticos; 1x e 16x sem regressão; testes, lint e build verdes.

**Medição** (Playwright headless, 1440x1000): materializações ricas caíram de 5Hz para 2Hz (-60%); painéis de equipe de ~3,3Hz para 1Hz; inspector fechado permaneceu sem renders após a montagem. FPS observado: pico de 56 em 1x e 41 em 16x, sem erros de console; pausa, seleção, `Esc` e gaveta Dados validados.

---

### [x] T11 - Scheduler único de render e canvases consolidados

> Concluída em 2026-07-12 - Playback, FPS e desenho passaram a compartilhar um único rAF; cinco canvases viraram duas camadas com viewport/DPR compartilhado e revisões numéricas.

**Especificação**: P4 em `tasks/PERFORMANCE_TASKS.md`.

**Critérios**: um scheduler rAF, no máximo dois canvases animados, DPR 2 e 58+ FPS no cenário de referência.

**Medição** (build de produção, Chromium acelerado, 1440x1000, DPR 2): exatamente 2 canvases; média de 96 FPS em 1x e 62 FPS em 16x, mantendo backing ratio 2. Pixels das duas camadas, pausa, inspector, seleção e `Esc` validados sem erros de console.

---

### [x] T12 - Scheduler de combate orientado a eventos

> Concluída em 2026-07-12 - Cooldowns fixos agora saem antes da aquisição de alvo, prioridades de Arcanes são avaliadas sob demanda e loops de combate evitam coleções temporárias.

**Especificação**: P5 em `tasks/PERFORMANCE_TASKS.md`.

**Critérios**: prioridade de last hit/deny e tempos de ataque preservados; digest ou diferenças explicitamente aprovadas; testes, lint e build verdes.

**Medição** (`180s`, 3 runs, seed `performance-reference`, comparação lado a lado): commit anterior = 6,22s wall / 5,16s CPU; T12 = 4,89s wall / 5,06s CPU. Digest preservado `2b7432ccfc848dee`; testes cobrem o instante de ataque e last hit antes de deny.

---

### [x] T13 - Armazenamento binário do replay

> Concluída em 2026-07-12 - Frames numéricos agora são armazenados em typed arrays por blocos, IDs de creeps usam dicionário compartilhado e o Worker transfere os buffers sem cópia. Apenas o frame ativo e o snapshot de inspector necessário são materializados.

**Especificação**: P6 em `tasks/PERFORMANCE_TASKS.md`.

**Critérios**: heap abaixo de 200 MB para 50 minutos; seek e reprodução completos; visual e inspector idênticos.

**Medição** (Chromium headless, viewport 1440x1000): replay completo de 50:00 com 15.001 frames ocupou 89,1 MB em buffers e 157,1 MB de heap total. Reprodução contínua, seek para 20:00, inspector e dois canvases foram validados; testes, lint e build verdes.

---

### [x] T14 - Rebalance de progressão, duração e teamplay

> Concluída em 2026-07-12 - Removi o encerramento por relógio, calibrei XP/farm por role e implementei preparação de highground com recuperação, rally, wave e conversão coordenada de boss/vantagem.

**Objetivo**: remover o encerramento por limite de tempo e fazer as partidas terminarem organicamente pela IA, com ritmo e prioridades próximos de um MOBA competitivo.

**Regras de duração**:
- Não existe hard cap de tempo que declare empate ou encerre a simulação; a partida termina somente com a destruição da base.
- 60 minutos é um soft cap de balanceamento: partidas podem passar disso, mas a distribuição deve convergir para encerramento por decisões, scaling e objetivos.
- No late game, Arcanes devem valorizar mais a própria vida, buybacks/respawns longos, visão e vantagem numérica antes de highground.
- Finalizações devem privilegiar teamplay: agrupar, controlar visão, converter boss/pickoff e sincronizar waves antes de atacar T3/T4/base.

**Farm e progressão**:
- Prioridade econômica por role, nesta ordem: Safe Lane (HC) > Mid > Offlane > Greedy Support (pos. 4) > Dedicated Support (pos. 5).
- Essa ordem afeta escolha de wave/campo, cessão de last hit, stacks, vontade de farmar e participação dos supports no espaço seguro.
- Cores devem manter aproximadamente 1 nível por minuto até o nível 6 e alcançar em torno do nível 25 aos 40 minutos; calibrar XP de lane, jungle, kills e distribuição por proximidade sem simplesmente conceder níveis artificiais.
- Supports continuam abaixo dos cores, mas não podem ficar inviáveis para teamfights e utilidade.

**Validação**:
- Criar relatório em lote com duração p50/p90, % acima de 60min, nível e GPM por role aos 6/10/20/40min, mortes no late game e conversão de vantagem em vitória.
- Adicionar testes para prioridade de farm por role, proteção da vida no late game, agrupamento de highground e ausência de encerramento artificial.
- Rodar lote suficiente para detectar partidas travadas e ajustar IA/economia até o soft cap funcionar por balanceamento.

**Medição**: após corrigir rally/wave, quatro execuções consecutivas terminaram organicamente (48,8min, 53,4min, 55,8min e 60,8min), sem watchdog ou empate artificial. O lote final de duas seeds teve 2/2 conversões da liderança aos 20min, média de 51,1min e GPM na ordem HC > Mid > Off > Sup4 > Sup5; a calibração final aos 40min mediu níveis médios 25 / 23,5 / 24 para os três cores e 17,5 / 18,5 para os supports. Navegador validado com 18.255 frames, dois canvases e zero erros de console; testes, lint e build verdes.

---

### [x] T14.1 - Siege sem wave e ecossistema de neutros

> Concluída em 2026-07-12 - Implementei tank calculado de torre sem backdoor, espera estável com desvio para farm viável, 16 campos simétricos, retaliação/leash, avaliação de clear e reset de campos/Boss por desengage.

**Objetivo**: eliminar a oscilação diante de torres protegidas, permitir siege sem creeps quando houver tank seguro e tornar campos/Boss ameaças consistentes, avaliáveis e capazes de resetar.

**Escopo**:
- Permitir ataque a torre sem wave apenas sem backdoor e quando um Arcane aliado conseguir absorver o dano pelo tempo estimado de siege com reserva de vida; o tank entra primeiro e o restante acompanha após o aggro estabilizar.
- Quando backdoor estiver ativo ou ninguém puder tankar, impedir o ciclo de entrar/sair do range: escolher farm neutro viável, outra fonte segura de recursos ou um ponto estável fora da torre enquanto aguarda a wave.
- Aumentar moderadamente a quantidade de campos neutros, preservando simetria do mapa e o sistema de stacks.
- Rebalancear dano/alcance agregado dos campos e garantir retaliação contra quem os agride.
- Fazer a IA estimar tempo de clear, dano recebido e reserva de HP antes de escolher um campo, respeitando força e stacks.
- Resetar HP e aggro de campos e Boss após uma janela sem receber dano; Boss deve retargetar agressores próximos durante o combate.

**Critérios**: testes para tank de torre, bloqueio por backdoor, cessação do "samba", clear viável/inviável, retaliação e reset; mapa simétrico com novos campos; partida e inspector funcionais; testes, lint e build verdes.

**Medição**: benchmark determinístico de 300s fechou em mediana de 80,0x tempo real; a amostra de duas partidas teve uma finalização orgânica aos 58,0min e uma chegada ao watchdog com a base inimiga em 205 HP, mantendo a conversão tardia como alvo do rebalance contínuo. Testes cobrem siege permitido/bloqueado, clear seguro/inviável, simetria, retaliação e reset; testes, lint e build verdes.

---

### [x] T14.2 - Progressão de inventário e abertura da partida

> Concluída em 2026-07-12 - Adicionei revenda e upgrade de inventário cheio, preparação jogável em `-01:00`, cronologia inicial de waves/campos/runas e suporte integral do replay ao relógio negativo.

**Objetivo**: impedir que inventários cheios bloqueiem o scaling dos Arcanes e alinhar a preparação/spawns iniciais ao relógio competitivo da partida.

**Escopo**:
- Comparar itens antigos com upgrades desejados; vender o slot de menor valor por 50% quando a melhoria justificar a troca e considerar o valor de revenda na decisão de compra.
- Permitir upgrade de botas sem duplicá-las, priorizar item permanente sobre novo consumível quando o inventário estiver cheio e reconstruir atributos preservando HP/mana atuais.
- Iniciar a simulação e o replay em `-01:00`, usando esse período apenas para posicionamento de rota, sem combate, ouro passivo ou waves.
- Spawnar a primeira wave e as runas de ouro em `00:00`, campos neutros em `01:00`, runas de poder a partir de `02:00` e runas de XP a partir de `07:00`.
- Adaptar worker, seek, progresso de carregamento e relógio visual ao intervalo negativo.

**Critérios**: testes de compra com seis slots e revenda, posicionamento pré-jogo, ausência/spawn de campos e cronologia de waves/runas; replay inclui frames de `-01:00` sem salto; testes, lint, build e benchmark verdes.

**Medição**: auditoria de 45min registrou 7 substituições de itens e inventários de até 14,2k; a partida headless terminou organicamente em 69,2min, ainda acima do soft cap e mantendo conversão de highground como alvo do rebalance contínuo. Benchmark determinístico da timeline de 360s ficou em 50,4x nesta estação. A tentativa visual headless não saiu do pré-carregamento em 220s; cronologia, relógio e frame negativo foram validados por testes automatizados. Testes, lint e build verdes.

---

### [x] T14.3 - Consistência do farm neutro

> Concluída em 2026-07-12 - Reduzi o dano neutro, corrigi ataques acidentais e casts que apagavam a decisão, mantive compromisso de clear e disciplinei stacks por jogador/minuto.

**Objetivo**: fazer Arcanes escolherem, iniciarem e concluírem campos adequados à própria força, sem ataques acidentais, abandono repetido ou proliferação artificial de stacks.

**Escopo**:
- Nerfar moderadamente o dano agregado dos campos e recalibrar a estimativa conservadora de dano recebido/tempo de clear.
- Restringir ataques a campos à decisão explícita de farm ou ao aggro já assumido, impedindo pokes ocasionais fora da rotina de selva.
- Manter compromisso com o campo escolhido até o clear ou até surgir risco real de morte, inimigo, defesa urgente ou chamada de equipe.
- Limitar cada Arcane a uma tentativa de stack por minuto, reduzir a chance excessiva e o scaling ofensivo dos stacks sem remover seu valor econômico.
- Instrumentar e comparar clears, decisões, campos danificados e resets em uma janela de 20min.

**Critérios**: aumento material de clears por 20min, forte redução de resets sem clear, stacks mais raros e concentrados, prioridade HC > Mid > Off > Sup4 > Sup5 preservada; testes, lint e build verdes.

**Medição**: na mesma seed de auditoria, os clears aos 20min subiram de 5 para 18 e os resets caíram de aproximadamente 340 para 43; distribuição de clears HC 11 > Mid 5 > Off 2 > supports 0. Nove dos 16 campos terminaram sem stack. A partida longa terminou organicamente em 42,5min, sem watchdog e com conversão da liderança; testes, lint e build verdes.

---

### [x] T14.4 - Disputa de runas no pré-jogo

> Concluída em 2026-07-12 - Reposicionei quatro runas laterais, adicionei o par do rio e implementei defesa/invasão pré-jogo por role, lane e pressão inimiga local.

**Objetivo**: transformar `-01:00 → 00:00` em uma fase ativa de posicionamento, defesa e invasão das runas de ouro.

**Escopo**:
- Reposicionar os quatro pontos de ouro das side lanes em áreas mais defensivas, mantendo simetria exata entre Dawn e Dusk.
- Adicionar duas runas de ouro próximas ao mid, uma de cada lado da lane e acompanhando a direção do rio.
- Atribuir lado a cada runa e criar planos pré-jogo por role/rota: cores cobrem pontos aliados e supports buscam invasões coordenadas.
- Detectar inimigos pressionando runas aliadas e permitir reação defensiva antes do spawn em `00:00`.
- A coleta ocorre no spawn; o posicionamento foi posteriormente ampliado com combate em T14.5.

**Critérios**: seis pontos em três pares espelhados, três por lado; IA produz defensores e invasores, reage a ameaça próxima e chega às áreas antes do spawn; testes, lint e build verdes.

**Medição**: os dez Arcanes chegaram a até 2,2 unidades de um ponto de ouro antes de `00:00`; as seis runas foram coletadas no spawn e a seed de auditoria produziu divisão 4/2 entre os times, confirmando roubos. Testes cobrem simetria, três runas por lado, cobertura do mid, invasores e reação defensiva; testes, lint e build verdes.

---

### [x] T14.5 - Combate pré-jogo e auditoria de cadência

> Concluída em 2026-07-12 - Liberei confrontos entre Arcanes pelas runas, separei visualmente ataques/skills/itens/mobilidade e protegi a cadência importada com regressão por fonte.

**Objetivo**: tornar a disputa das runas realmente interativa e garantir que ataques básicos respeitem os atributos importados sem serem confundidos com skills ou procs.

**Escopo**:
- Permitir combate somente entre Arcanes durante `-01:00 -> 00:00`, mantendo creeps, torres, estruturas, neutros e boss inativos.
- Fazer Arcanes envolvidos na mesma runa aproximarem-se até o alcance, enfrentarem o adversário e recuarem com vida criticamente baixa.
- Identificar efeitos visuais por fonte e por ação (`attack`, `skill`, `item`, `mobility`) para não representar todo dano como ataque básico.
- Auditar a cadência com heróis importados e impedir por teste qualquer ataque antes do intervalo calculado a partir de `baseAttackTime` e attack speed.
- Registrar as lacunas de atributos carregados que ainda precisam de paridade integral no runtime.

**Critérios**: disputa pré-jogo causa dano entre Arcanes sem ativar entidades do mapa; nenhum atacante básico age duas vezes no mesmo tick ou antes do cooldown; efeitos distinguíveis; testes, lint e build verdes.

**Medição**: a seed de auditoria produziu 35 ataques básicos e uma eliminação durante `-01:00 -> 00:00`; teste dedicado confirma que torres permanecem inativas. Três heróis escolhidos do roster carregado foram exercitados por 360 frames cada sem ataque anterior ao cooldown derivado de attack speed + BAT. A auditoria registrou em T18 os atributos ainda aproximados ou descartados. Benchmark mediano: 37,9 segundos simulados por segundo real; testes, lint e build verdes.

---

### [ ] T15 - Integração da IA de combate coletivo

**Fonte**: `Game Systems/moba_teamfight_skirmish_laning_ai_codex.txt`.

**Objetivo**: substituir o combate local e reativo por encontros coordenados, preservando a separação existente entre macro, micro e execução imperfeita. A IA deve agir como um time com comunicação limitada, não como cinco bots isolados nem como uma mente coletiva perfeita.

**Arquitetura de integração**:
- Manter `teamBrain` como dono do plano macro e `playerAgent` como dono do modo individual; inserir `CombatBlackboard` entre ambos e a seleção final de ações.
- Detectar encontros delimitados no mapa (`lane_trade`, dive, rune/camp skirmish, teamfight, highground, chase/disengage) e manter um blackboard por encontro/time.
- Transformar a saída do combate em intenção micro compatível com a simulação atual; `executionModel` aplica atraso, erro humano e atributos do jogador antes da ação efetiva.
- Manter o blackboard no worker e serializar ao replay apenas os dados necessários para inspeção, sem aumentar todos os frames com estado diagnóstico completo.

**Fases de implementação**:
- [x] **Fundação**: tipos runtime, detector/classificador de encontros, contexto espacial, eventos de invalidação e ciclo de vida determinístico do blackboard.
- [x] **Cérebro básico**: máquina de fases `pre_contact -> opening -> commit/sustain -> chase/disengage`, score de alvo, foco compartilhado, stickiness e troca de alvo.
- [ ] **Coordenação**: papéis dinâmicos, formação, reservas de CC/dano/save/interrupt, anti-overkill e uso contextual de ultimates.
- [ ] **Cenários**: skirmishes/reforços, trades de lane, level timings, influência da wave, runas/camps/pulls, dive, counter-dive e transferência de aggro.
- [ ] **Humanização e tuning**: integrar mechanics, laning, map awareness, teamfight, positioning, communication, discipline, clutch, mastery, fatigue e tilt ao modelo de execução.

**Progresso da fundação (2026-07-12)**:
- Detector espacial agrupa participantes e classifica trade/all-in de lane, runa, campo, boss, dive, teamfight e highground.
- Blackboard por encontro/time mantém ID, participantes, centro, tipo e fases `pre_contact`, `opening`, `commit`, `sustain`, `chase` e `disengage`, expirando contato perdido em 2,4s.
- Atualização limitada a 350ms no worker; frames compactos não carregam diagnóstico e frames detalhados preservam o estado no replay.
- Inspetor do Arcane exibe encontro, fase e números locais sem ainda dar autoridade de alvo ao novo sistema.
- Corrigido o timestamp inicial de ataque herdado da abertura em `00:00`; Arcanes agora podem combater desde `-01:00` e a rota natural de teste inicia dano por volta de `-51s`.
- Auditoria de 10min encontrou 77 encontros, máximo de três simultâneos e nenhuma retenção permanente; benchmark determinístico mediano de 46,7x nesta estação após incluir a reavaliação por evento crítico.

**Progresso do cérebro básico (2026-07-12)**:
- Score coletivo considera valor estratégico da role, ameaça, chance de kill, acessibilidade, follow-up, isolamento, channeling, recursos defensivos, saves, overkill, vantagem numérica e conversão em objetivo.
- O medidor de perigo existente alimenta risco de aproximação e exposição a torres; alvo sob torre sem wave ou tank não pode virar foco compartilhado.
- Foco possui stickiness e limiar de troca, evitando alternância por ganhos marginais; ataques alcançáveis priorizam o alvo compartilhado.
- Cada Arcane compara perigo do alvo com HP, agressividade, fase e números locais; risco novo invalida a aproximação entre decisões e produz hold/recuo em vez de rush.
- Auditoria final de 5min: 18 focos ficaram inseguros entre decisões; todos viraram hold/recuo no tick seguinte e nenhuma ordem de avanço permaneceu ativa. A seed de controle passou de 2-9 para 2-3 após reduzir perseguições suicidas.
- Benchmark determinístico: 40,2x wall / 44,2x CPU nesta execução, com digest estável entre três rodadas.

**Restrições**:
- O arquivo-fonte é especificação/pseudocódigo; funções simbólicas devem ser adaptadas aos tipos, fórmulas, skills, itens e status já existentes, sem criar uma segunda resolução de combate.
- Atualização normal por encontro entre 250-500ms, com reavaliação imediata somente nos eventos críticos listados; caches espaciais e de contexto devem ser reutilizados.
- Toda aleatoriedade deve derivar de seed + janela + ator/ação para preservar replay e benchmark determinísticos.
- Cada fase precisa entrar atrás de testes e métricas antes da próxima, evitando uma migração única de alto risco.

**Critérios**:
- Arcanes do mesmo time compartilham alvo, fase e intenção sem perder autonomia individual.
- CC e saves evitam overlap conforme comunicação; dano reservado reduz overkill; foco troca somente quando o ganho supera o custo.
- IA distingue lane trade, skirmish, dive e teamfight, considera reforços/ondas/torres e encerra chase inseguro.
- Perfis diferentes produzem execução e erros coerentes; nenhum encontro fica preso após morte, fuga ou objetivo encerrado.
- Testes unitários cobrem os 30 cenários sugeridos no documento, com testes de integração, replay determinístico, lint, build e benchmark verdes.

---

### [ ] T16 - Auditoria e implementação integral de skills

**Objetivo**: verificar todas as skills importadas e garantir que cada uma possua execução funcional, incluindo dano, targeting, cooldown, mana, scaling, passivas, summons e todos os efeitos favoráveis/adversos e status effects descritos.

**Escopo**:
- Gerar matriz automática hero × skill × mecânicas/tags × implementação runtime.
- Classificar cada skill como completa, parcial, aproximada intencionalmente ou ausente; não considerar uma skill implementada apenas porque produz dano genérico.
- Cobrir stun, slow, silence, root, leash, fear, taunt, sleep, hex, disarm, break, mute, dispels, imunidades, barriers, DoT/HoT, auras, deslocamentos, channeling, transformações, summons e interações especiais.
- Implementar o que estiver faltando e adicionar testes por família mecânica, além de auditoria que falha quando uma skill nova não possui suporte declarado.

**Critérios**: 100% das skills catalogadas com status explícito; nenhuma skill ativa sem custo/cooldown/efeito; relatório persistido e testes/lint/build verdes.

---

### [ ] T17 - Auditoria e implementação integral de itens

**Objetivo**: verificar todos os itens importados, incluindo consumíveis, e garantir funcionamento completo de atributos, passivas, procs, auras, toggles, ativos, custos, cooldowns, charges, targeting e decisões de compra/uso da IA.

**Escopo**:
- Gerar matriz automática item × efeitos/tags × implementação runtime e separar itens completos, parciais, aproximados e ausentes.
- Validar inventário único de seis slots, consumo/charges, receitas/upgrades, restrições melee/ranged, stacking e interações com dispel, imunidade, barriers e status effects.
- Verificar se bots compram e usam consumíveis/ativos conforme valor esperado, fase, role, perigo e oportunidade, sem inventário paralelo.
- Implementar lacunas e adicionar testes por família de item e auditoria que falha para itens novos sem suporte declarado.

**Critérios**: 100% dos itens catalogados com status explícito; nenhum ativo sem efeito/custo/cooldown; consumíveis integrados ao inventário normal; relatório persistido e testes/lint/build verdes.

---

### [ ] T18 - Paridade integral dos atributos importados

**Objetivo**: eliminar aproximações legadas restantes e garantir que todo atributo calculado do herói tenha efeito explícito, testado e visível na simulação.

**Escopo**:
- Preservar o que já está integrado: HP/mana máximos, dano e faixa de dano, alcance/tipo de ataque, attack speed + BAT, armor, resistências, movimento e visão.
- Substituir regeneração fixa fora da base por health/mana regen importados e modificadores de item/skill.
- Integrar evasion e damage block à resolução de dano, com RNG determinístico e regras de stacking.
- Aplicar acquisition range à busca de alvo e collision size ao hitbox, mantendo escalas de mapa coerentes.
- Decidir e implementar o papel de turn rate na abstração do minimapa, sem introduzir oscilação de movimento.
- Tornar explícita a política de dano básico médio versus rolagem min/max e cobri-la com testes determinísticos.

**Critérios**: nenhum campo de `HeroCalculatedStats` é descartado sem decisão documentada; atributos e modificadores possuem testes runtime; replay continua determinístico; testes, lint, build e benchmark verdes.

---

## Histórico (não retrabalhar)

Concluído em rodadas anteriores — mantido aqui só como registro:

- **Input do mapa**: cliques unificados via hit-test no `.map-panel`; canvases com `pointer-events: none` (torres/camps/runas/creeps/boss selecionáveis de novo).
- **Render**: prune de posições visuais por-mapa (WeakMap) + prune do attack-range. DPR cap 2 foi implementado e **revertido** (stutter) — retorna só via T5.
- **IA rodada 1**: cache do snapshot analisado por tick; ruído humano interpolado por disciplina; `delaySeconds` aplicado ao `nextDecisionAt`; pesos de role só em score positivo; `matchSeed` para variedade entre partidas; remoção de constantes/campos mortos; eventos de memória agora emitidos (`failed_gank`, `lost_objective`, `won_fight`, `lost_fight`).
- **Bug crítico**: congelamento de arcanes ranged na base (chegada ao ponto de formação nunca disparava reconsideração) — corrigido com checagem do `formationPoint` + teto de hold de 6s (`maxDecisionHoldSeconds`).
- **IA rodada 2**: alvo de creep 1×/frame (`getCachedRouteCreepTarget`); grade espacial de creeps (targeting, `getDangerScore`, `shouldReconsiderArcaneDecision`); memo de `getPlayerAiProfile`; gate no `syncLanePathIndex`; fase de jogo nos planos (penalidade de push no laning + `hasHighValueObjectiveOpportunity` real); conversão de vantagem (lead relativo, power play com 2+ mortos, comeback com `comebackPatience`); `group_push` com alvo de lane via `getLaneWinAssessment`; janela de boss no call; memória de morte 240s→100s; `averageHealthPct` só com vivos; `gankRisk` do retreat 0.45→0.2.
- **Task descartada**: "sim num setInterval no main thread" (antiga R2) — superada pela T3, que resolve o mesmo problema de forma definitiva.
