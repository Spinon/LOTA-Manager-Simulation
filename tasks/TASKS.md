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

**Revisão de comportamento (2026-07-12)**: removido o chase programado ao primeiro inimigo encontrado. A runa permanece como waypoint; perigo, HP e números locais escolhem entre contestar, fazer staging ou ceder até a base. Invasores deixaram de ser fixos por role e agora variam com agressividade, comunicação, defesa observada e seed. Auditoria de oito aberturas registrou zero waypoints inimigos e zero mortes, com 0-2 invasores por partida; contato direto ainda produz combate, mas não é obrigatório para a abertura prosseguir.

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

### [x] T14.6 - Calibração de GPM profissional

> Concluída em 2026-07-12 - Calibrei metas por role com 24 partidas profissionais recentes, corrigi a oferta crescente das waves e dei autoridade real à recuperação econômica da IA.

**Resultado**: metas de 40 minutos em 760/650/590/365/317 GPM para HC/Mid/Off/Sup4/Sup5. A IA agora compara GPM atual com uma curva por minuto, protege last hits contra foco/casts, força `farm_map` quando os cores estão atrasados e mantém defesa urgente. Foram integrados melees extras aos 15/30/45 minutos e o bônus em área do flagbearer. Metodologia, amostra e próximos ajustes estão em `tasks/GPM_BALANCE.md`; testes, lint e build verdes.

---

### [x] T15 - Integração da IA de combate coletivo

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
- [x] **Coordenação**: papéis dinâmicos, formação, reservas de CC/dano/save/interrupt, anti-overkill e uso contextual de ultimates.
- [x] **Cenários**: skirmishes/reforços, trades de lane, level timings, influência da wave, runas/camps/pulls, dive, counter-dive e transferência de aggro.
- [x] **Humanização e tuning**: integrar mechanics, laning, map awareness, teamfight, positioning, communication, discipline, clutch, mastery, fatigue e tilt ao modelo de execução.

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

**Progresso da coordenação (2026-07-12)**:
- Cada encontro atribui iniciador, controle de follow-up, burst, dano sustentado, peel/save e finisher a partir da role, alcance e kit carregado; frontline, midline, backline e flank recebem pontos de espera distintos.
- Skills ofensivas priorizam o foco compartilhado quando ele está alcançável. Reservas temporais impedem overlap de controle e saves, salvo interrupt urgente ou aliado crítico; controles reais também cancelam channeling.
- Dano confirmado entra no blackboard e bloqueia ultimate redundante quando o alvo já possui dano letal reservado. Skills comuns permanecem disponíveis para não congelar a execução por estimativa imperfeita.
- Removida a barreira genérica concedida pela movimentação de suporte: proteção agora exige uma skill real. O estado de coordenação é clonado nos frames detalhados e reservas vencidas são podadas a cada atualização.
- Testes cobrem atribuição de papéis/formação, fila de CC, interrupt urgente, anti-overkill de ultimate e overlap emergencial de saves; regressão de staging sob torre também permanece coberta.
- Benchmark determinístico após a integração: 57,7x wall / 53,0x CPU, digest `810ed3fb5e8af9b1` estável nas três rodadas; testes, lint e build verdes.

**Progresso dos cenários (2026-07-13)**:
- O blackboard agora calcula poder local e projetado, ETA de reforços, influência de waves, torres, objetivos e timings de nível antes de escolher `engage`, `hold`, `reinforce` ou `disengage`.
- Reforços inimigos só entram na previsão quando visíveis; aliados usam informação de equipe. Custo de rotação preserva o farm de cores em lutas pequenas, mas perde peso em teamfights e defesa de base.
- O mesmo encontro sob torre é lido por time: atacante vê `tower_dive`, defensor vê `counter_dive`. Dive sem wave/tank recua; tank validado permite staging; holder frágil pede transferência de aggro.
- A intenção ganhou autoridade de movimento: participantes esperam reforços, reforços viajam ao encontro e um `disengage` coletivo interrompe a aproximação. O inspetor mostra intenção, poder atual/projetado, wave e reforços.
- Dez cenários puros e integrações runtime cobrem fog, reforços, custo do HC, wave inimiga, level timing, dive, counter-dive e troca de tank. Uma partida de auditoria terminou organicamente em 41,9min (36-27), sem watchdog.
- Benchmark determinístico: 66,0x wall / 60,2x CPU, digest `8e32e8bb28c2bccb` estável em três rodadas; baseline da rodada era 53,3x / 46,5x.
- O primeiro recorte deixou pendentes pulls/contest de pull, ranged creep como objetivo explícito, teleporte de reforço e cenários completos de chase/counter-initiation; os três primeiros entram na rodada abaixo.

**Progresso dos cenários de lane e reforço (2026-07-13)**:
- Pull passou a existir como mecânica: o Dedicated Support avalia janela, equilíbrio, segurança do core, campo e contestação; a wave desvia temporariamente, luta com os neutros e sincroniza novamente seu waypoint ao retornar para a lane.
- Campos respondem ao ataque de creeps puxados. Quando a wave finaliza o campo, aliados próximos recebem o XP neutro; o Greedy Support adversário reconhece pulls expostos e pode contestá-los.
- Ranged creeps ganharam prioridade explícita sobre melees quando ambos são finalizáveis, tanto em last hit quanto deny. Cores podem usar uma skill simples não-ultimate para garantir o ranged em timing de nível, preservando uma reserva de mana e respeitando alcance, custo e cooldown.
- Reforços aprovados pelo blackboard podem usar TP quando canal + trecho final economizam pelo menos dois segundos sobre caminhar. Rotação rejeitada pelo custo econômico continua sem autoridade para teleportar.
- Auditoria headless de 12min produziu pull real com quatro creeps desviados. Testes cobrem planejamento, desvio, combate bilateral, retorno à lane, contestação, ranged last hit/deny, spell secure e canal de TP.
- Benchmark determinístico: 62,9x wall / 60,3x CPU, digest `88d5b9ccd239aba0` estável; uma partida terminou organicamente em 49,4min, sem watchdog. O placar 9-63 desta única seed fica registrado como outlier para a próxima amostra de balanceamento.
**Conclusão dos cenários de chase e counter-initiation (2026-07-13)**:
- Chase ganhou score próprio para chance de kill, escape do alvo, conversão, valor da vítima, overextension, reforços/TPs, formação e custo de abandonar um objetivo. Fog perigosa, suporte isolado, recursos gastos, reforços inimigos e objetivo melhor encerram a perseguição explicitamente.
- Integridade de formação usa a distância ao aliado mais próximo e pune especialmente suporte isolado. O movimento recebe autoridade de `Encerrar perseguicao` mesmo quando o foco já desapareceu, impedindo que a seleção oportunista reabra o chase no mesmo ciclo.
- Counter-initiation considera controles e escapes realmente aprendidos, com mana e cooldown disponíveis, status de disable, torre, poder local/projetado e teletransportes recentes. A IA distingue uma janela aliada para virar a luta do risco de avançar sobre controle inimigo preparado.
- Inimigos locais fora da visão deixaram de vazar poder para a análise do cenário. O inspetor mostra chase, formação e oportunidade/risco de counter sem ampliar os frames compactos do replay.
- A matriz automatizada agora supera 30 casos comportamentais entre detecção, cenários, ciclo de vida, foco e coordenação; há regressão runtime específica para fim de chase sem alvo visível. Testes, lint e build verdes.
- Benchmark determinístico: 50,7x wall / 45,6x CPU, digest `fb9c6b45dee0bc55`. Uma partida de auditoria terminou organicamente em 58,1min (53-34), sem watchdog; o volume alto de kills desta seed permanece para o rebalance geral.

**Conclusão da humanização e tuning (2026-07-13)**:
- Cada jogador ganhou perfil determinístico de mechanics, laning, map awareness, teamfight, positioning, communication, discipline e clutch. `heroMastery` varia pela combinação jogador + Arcane, complexidade do kit e aderência à role; trocar o herói invalida corretamente o cache do perfil.
- O modelo escolhe a habilidade relevante por ação: laning/mechanics pesam no farm, teamfight/communication no follow-up, positioning/map awareness no recuo, e discipline/communication nos objetivos. Clutch reduz a perda sob pressão.
- Fadiga, tilt, pressão e incerteza são derivados de tempo, status de decisão, KDA, desvantagem, perigo, visão e estado da base. Esses valores não são persistidos nem serializados, preservando frames compactos e uma única fonte de verdade.
- Falhas deixaram de ser quatro resultados genéricos: casts/TPs atrasados, skillshot perdido, alvo errado, overlap de CC/save, posição ruim, recuo precoce, chase longo, falha de aggro, ausência de follow-up e uso de item em pânico possuem afinidade com as deficiências do jogador e continuam determinísticos por seed.
- Reservas coletivas agora têm confiabilidade de 68–97% conforme comunicação, teamfight, disciplina, fadiga e tilt. Uma falha de comunicação pode produzir overlap real sem remover a coordenação predominante dos times profissionais.
- O inspetor mostra os nove atributos, fadiga, tilt e confiabilidade de coordenação. Testes cobrem especialização contextual, clutch, degradação mental, taxonomia de falhas, cache de mastery e determinismo; testes, lint e build verdes.
- Comparação A/B na mesma estação e seed: commit anterior 37,4x, versão humanizada 38,1x, sem regressão mensurável; digest novo `b51a7547e7d62408` estável. A auditoria terminou organicamente em 41,7min (6-52), sem watchdog; o placar unilateral permanece registrado para amostragem de balanceamento, não como falha de término.

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

**Progresso da auditoria e controles nomeados (2026-07-13)**:
- A matriz automática passou a catalogar as 734 habilidades oficiais dos 127 heróis, incluindo inatas, habilidades ocultas/invocadas e concessões de Scepter/Shard. O relatório humano está em `tasks/SKILL_RUNTIME_AUDIT.md` e a matriz integral revisável em `tasks/SKILL_RUNTIME_AUDIT.json`.
- O teste compara fingerprints do catálogo vivo com a matriz persistida. Uma skill nova, alteração de targeting ou mudança de suporte agora falha até a classificação ser revisada e regenerada com `npm run audit:skill-runtime`.
- O adaptador normaliza durações oficiais de fear, taunt, sleep, hex, disarm, break e leash; `does_mute` também produz a tag canônica. O runtime aplica a duração específica de cada controle em vez de reutilizar uma duração genérica para todos.
- Baseline inicial: 3 skills completas, 564 parciais, 11 aproximações intencionais e 156 com bloqueio ausente. O principal bloco ausente era a ativação das skills suplementares; channeling, summons, transformações, auras e passivas especiais permaneciam explicitamente parciais/aproximadas.

**Progresso dos unlocks de Scepter/Shard (2026-07-13)**:
- O inventário agora lê semanticamente `upgradeSlot=scepter|shard` dos efeitos dos itens e monta um único kit runtime por Arcane. Comprar ou vender o item adiciona/remove imediatamente as skills concedidas sem gastar pontos de habilidade.
- As 69 skills concedidas (32 Scepter e 37 Shard) entraram no seletor da IA, readiness de combate, análise de papéis, passivas, auras, ameaça ofensiva e painel detalhado. Skills concedidas com vários níveis escalam pela curva 6/12/18; as demais entram no nível 1.
- O plano de compras injeta Shard depois dos três primeiros itens de build e Scepter antes do fechamento do inventário quando o herói possui a concessão correspondente. O cache do kit usa máscara de upgrades e o cache de passivas também invalida pela referência do inventário.
- Testes cobrem compra, venda, separação dos slots, nível concedido, seleção/cast real pela IA, mana, cooldown, stun e bloqueio das subskills contextuais. A ativação catalogada subiu de 638 para 707 skills; restam 27 subskills/invocadas que exigem máquina de estado própria.
- Auditoria atual: 3 completas, 612 parciais, 13 aproximações intencionais e 106 ausentes. Próxima rodada: modelar subskills contextuais/invocadas; depois resolver channeling no término do canal e summons como entidades reais.
- Testes, lint e build verdes. Benchmark determinístico mediano: 56,1x wall / 52,6x CPU, digest `9ebd3080f5fadc7e` estável nas três rodadas.

**Progresso das skills contextuais/invocadas (2026-07-13)**:
- As 27 subskills restantes foram classificadas pelo gatilho real. A ativação agora separa loadout invocado, canção escolhida, utilidade situacional, recurso de souvenir, stance alternativa e estado da habilidade-pai; a auditoria deixou de tratar todo o grupo como um único bloqueio genérico.
- O mago complexo prepara no máximo dois dos dez feitiços cujas receitas de orbes foram aprendidas. O par muda conforme lane, farm, gank, teamfight, recuo, push, save ou objetivo; nível, mana e cooldown usam os dados importados. Os três orbes passaram a ser componentes passivos no runtime e não podem mais ser disparados como ataques genéricos.
- Estalo Glacial, Passo Espectral, Ciclone, Pulso de Mana, Alacridade, Meteoro Caótico, Golpe Solar, Espírito Forjado, Muralha de Gelo e Onda Ensurdecedora receberam nomes e normalizações runtime para controle, mana burn, buff, summon, mobilidade e deslocamento. As aproximações continuam declaradas na matriz, sem fingir geometria ou invocação manual completa.
- As três canções entram uma por vez depois de aprender a ultimate: dano para combate/objetivo, velocidade para recuo e cura para vida baixa/save. O nível acompanha a ultimate e os efeitos, mana e cooldown chegam ao mesmo seletor usado pela IA e pelo painel. O disfarce contextual do guerreiro macaco também entra apenas durante recuo.
- Ativação atual: 707 completas, 14 aproximadas e 13 ausentes. Permanecem bloqueadas quatro souvenirs que precisam de aquisição/charges, quatro skills da stance alternativa e cinco subskills que dependem de Spirit Form, Spirits, remnant colocado ou árvore carregada.
- Auditoria atual: 3 completas, 628 parciais, 13 aproximações intencionais e 90 ausentes. Testes cobrem receitas, limite de dois feitiços, troca por contexto, orbes não-castáveis, escala, mana, cooldown, cura e utilidade de recuo.
- O kit runtime passou a ter cache por Arcane, invalidado por herói, inventário, níveis, situação e faixa de vida. Benchmark A/B sob a mesma carga: `HEAD` em 37,4x wall e esta rodada em 50,7x wall / 47,1x CPU; digest `9ebd3080f5fadc7e` permaneceu estável.

**Progresso dos estados de habilidade-pai (2026-07-13)**:
- Cinco subskills deixaram de ser botões soltos e passaram a depender de um estado compacto no próprio Arcane. O estado guarda duração, cargas, modo e posições quando necessário; é clonado pelo tick, removido na expiração/morte e serializado apenas nos frames detalhados do replay.
- Forma Radiante libera Vínculo Radiante durante seus 40-50s sem encerrar a transformação. Espíritos Guardiões libera somente a mudança de raio necessária para a situação atual e não repete o toggle enquanto o modo já estiver correto.
- Remanescente Ardente registra até três posições. Ativar Remanescente escolhe a posição mais útil para o alvo, move o Arcane exatamente até ela, causa o dano em área importado e consome somente aquele remnant.
- Agarrar Árvore registra as 5-8 cargas oficiais e libera Arremessar Árvore no mesmo nível da habilidade-pai; o arremesso consome a árvore carregada. O buff de ataques por carga continua classificado como parcial até a resolução de ataques básicos consumir uma carga por hit.
- Ativação atual: 712 completas, 14 aproximadas e 8 ausentes. Restam apenas os quatro souvenirs com aquisição/charges e as quatro skills da stance alternativa. Auditoria geral: 3 completas, 631 parciais, 15 aproximações intencionais e 85 ausentes.
- Testes cobrem bloqueio antes do pai, unlock, escala, troca de modo, posição/dano/consumo do remnant, cargas da árvore, expiração e ida/volta pelo replay.
- Testes, lint e build verdes. Benchmark determinístico: 52,5x wall / 47,6x CPU, digest `9ebd3080f5fadc7e` estável; o estado vazio não alterou o resultado da partida de referência.

**Progresso da postura Katana/Sai (2026-07-13)**:
- `Switch Discipline` deixou de ser tratada como passiva genérica e passou a comandar uma postura persistente. Katana é o estado inicial; a IA prefere Sai para gank, recuo e save, usa o cooldown oficial de 8s como histerese e mantém Katana para lane, farm, push e objetivos.
- Sai substitui integralmente Q/W/E/R em vez de acrescentar quatro botões ao kit. Os quatro níveis espelham os slots aprendidos da Katana, os nomes e efeitos importados foram normalizados e a postura atravessa os frames detalhados do replay.
- Cada par de habilidades compartilha cooldown mesmo quando uma delas está oculta. O Scepter preserva a exceção oficial da primeira habilidade usada na janela de 3s depois da troca; o bônus de movimento do Sai e o primeiro dano da Katana entram no sistema comum de efeitos temporários.
- O Sai aplica o BAT 1,5 importado contra o BAT 1,9 da Katana. Testes cobrem prioridade da troca pela IA, substituição sem oito skills simultâneas, níveis, mana, cooldown pareado, exceção do Scepter, bônus, velocidade de ataque e replay.
- Ativação atual: 716 completas, 14 aproximadas e 4 ausentes. Restam apenas os quatro souvenirs com aquisição e charges. Auditoria geral: 4 completas, 635 parciais, 15 aproximações intencionais e 80 ausentes.
- Testes, lint e build verdes. Benchmark determinístico: 52,5x wall / 48,8x CPU, digest `9ebd3080f5fadc7e` estável.

**Progresso dos Souvenirs do Carnaval Sombrio (2026-07-13)**:
- A inata do controlador circense agora concede deterministicamente um dos quatro souvenirs quando um herói inimigo morre dentro das 925 unidades importadas. Mortes múltiplas acumulam até 99 cargas por tipo; somente prêmios possuídos aparecem no kit e cada cast consome exatamente uma carga.
- Cargas são recursos persistentes: sobrevivem à morte, respawn e replay detalhado. Se o próprio controlador morrer sem nenhum prêmio, a inata concede um imediatamente, conforme a regra oficial. Aquisições também recebem marcador visual com o tipo obtido.
- Espelho Distorcido cria pressão temporária da ilusão por 18s; Tônico do Homem-Forte converte o ganho de força escalado pelo nível em durabilidade e dano; Almofada Surpresa executa o salto de 400 unidades e deixa a nuvem de slow; Monociclo concede o estado de mobilidade por 10s. As abstrações de ilusão, força e colisão continuam declaradas como parciais/aproximadas até as respectivas famílias ganharem runtime dedicado.
- A IA avalia cada prêmio por contexto: tônico para save/teamfight, almofada e monociclo para retreat/mobilidade, espelho para luta, push e objetivo. Testes cobrem aquisição por alcance, kit condicionado à posse, stacking, consumo, quatro efeitos, escolha de fuga pela IA, concessão na própria morte e persistência no respawn.
- Todas as 734 skills agora possuem caminho de ativação declarado: 720 completas, 14 aproximações intencionais e 0 ausentes. Auditoria geral: 4 completas, 639 parciais, 15 aproximações intencionais e 76 ausentes por mecânicas internas ainda não executadas integralmente.
- Testes, lint e build verdes. Benchmark determinístico: 52,4x wall / 48,1x CPU, digest `9ebd3080f5fadc7e` estável. Próxima rodada da T16: concluir efeitos no término de channeling; depois materializar summons como entidades reais.

**Progresso de channeling integral (2026-07-14)**:
- As 22 skills canalizadas usam o `channelTime` oficial por nível. Mana, cooldown, marker e reserva tática são comprometidos no início; dano, controle, cura, mobilidade e utilidade ficam pendentes até a conclusão.
- O canal preserva skill, nível, alvo e posição. Controle forte interrompe sem resolver o efeito; conclusão limpa o estado, aplica o efeito uma vez e não cobra mana novamente. TP continua usando a mesma infraestrutura genérica.
- A família `channeling` passou de 0 completas/22 parciais para 22 completas/0 parciais. A auditoria geral avançou para 5 completas, 638 parciais, 15 aproximações e 76 ausentes, mantendo explícitas as lacunas de outras famílias.
- Em três partidas de 10 minutos, o auditor observou 1.292 casts de 68 skills, incluindo 91 canais de cinco skills: 86 concluídos, quatro interrompidos, um ativo no horizonte e zero violações de cooldown.
- A partida completa `performance-reference` terminou organicamente em 43:38, vitória Dusk por 4-57, digest `0ca82ffc583e9c37`, a 248,3x wall/175,6x CPU nesta execução. Dados em `reports/skill-channeling-audit.json`.
- Próxima rodada da T16: substituir pressão temporária de summons por entidades reais, começando por um contrato genérico de unidade invocada antes das famílias específicas de ilusões, wards e summons persistentes.

**Progresso de summons como entidades (2026-07-14)**:
- Skills ativas de summon deixaram de conceder um buff abstrato ao caster. O runtime agora cria `SummonedUnit` independentes com owner, skill de origem, vida, dano, alcance, visão, movimento, intervalo de ataque, duração e bounty.
- Summons seguem o dono quando ociosos, escolhem alvos visíveis por proximidade, atacam Arcanes, creeps, outros summons e objetivos liberados. Creeps, torres e Arcanes também podem revidar; ouro vai ao last hitter e XP é dividido entre Arcanes próximos.
- A coleção separada evita misturar summons com pathfinding, deny, lane equilibrium e armazenamento SoA dos creeps. A decisão é deliberadamente simples para preservar a velocidade do pré-cálculo.
- Replay compacto, interpolação visual, fog compartilhado, relógio dirigido a eventos, expiração e serialização foram integrados. Testes cobrem spawn, autoria, duração, ataque, bounty, despawn e ida/volta pelo replay comprimido.
- O import deixou de tratar todo `count`, todo `spirit` e todo parâmetro de ilusão como summon. A família auditada caiu de 105 falsos/ambíguos para 39 skills reais: 32 ativas parciais e sete passivas ausentes. Auditoria geral: 6 completas, 624 parciais, 12 aproximações e 92 ausentes.
- Suíte completa, lint e build verdes. Benchmark de 5 minutos: mediana 291,5x wall / 259,0x CPU, digest `534bd00e225a74ea`. Próxima rodada: templates por unidade, wards imóveis, ilusões, clones e gatilhos passivos.

**Progresso de arquétipos de summon (2026-07-14)**:
- A classificação passou a usar uma tabela semântica por habilidade oficial. Spirits orbitais, Fire Spirits, Searing Chains, Dissimilate, skills comuns de Skeleton King/Treant e o monociclo deixaram de gerar unidades indevidas; a família caiu de 39 para 25 skills reais.
- As 21 skills de cast ou canal usam arquétipos próprios: unidade móvel, ward imóvel, healing ward móvel sem ataque, ilusão com dano causado/recebido oficial e clone com atributos integrais do dono. Spirit Bear e Familiars persistem durante a partida.
- HP, dano, alcance, movimento, intervalo de ataque, visão e bounty usam os campos oficiais quando disponíveis. Death Ward nasce no início do canal e desaparece quando ele termina ou é interrompido; Healing Ward aplica cura percentual por segundo aos aliados próximos.
- Replay, interpolação, seleção e painel de dados preservam e exibem o arquétipo. A auditoria agora registra 21 summons materializados e quatro gatilhos pendentes (`on_death`, `target_death` e `on_attack`), sem confundi-los com casts imediatos.
- Auditoria geral: 6 completas, 627 parciais, 12 aproximações e 89 ausentes. Próxima rodada: implementar os quatro gatilhos condicionais e as habilidades próprias das unidades invocadas.
- Suíte completa, lint, build e smoke visual verdes. Benchmark de 5 minutos: mediana 315,8x wall / 242,6x CPU, digest `534bd00e225a74ea` preservado.

**Progresso de gatilhos condicionais de summon (2026-07-14)**:
- Os quatro gatilhos restantes foram conectados aos eventos reais da simulação. Spawn Spiderlings marca o alvo por 20s e materializa 4/5/6 unidades se ele morrer; Eldritch Summoning marca inimigos afetados pelas skills do Warlock e cria um imp na morte.
- Reincarnation deixou de entrar no seletor de casts comuns. Na morte do Arcane, valida break, nível, mana e cooldown antes de criar 2/3/4 skeletons; o cooldown oficial permanece no estado durante o respawn.
- Flesh Golem virou uma transformação temporária de 40s. Cada ataque básico conectado durante o efeito cria um zombie de 15s, com limite de 12 summons vivos por dono para impedir crescimento irrestrito.
- Quantidade, duração, janela de gatilho, HP, dano e velocidade usam aliases oficiais. O dano inicial de Spawn Spiderlings foi separado do ataque das unidades; quando o seed não traz dano próprio, o summon usa o escalonamento genérico.
- Os hooks possuem fast path por herói e só consultam o kit relevante. Testes headless cobrem os quatro gatilhos, mana/cooldown, ausência do efeito fora da transformação, limite por dono e normalização dos valores.
- Todos os 25 summons reais agora são materializados. Auditoria geral: 6 completas, 631 parciais, 12 aproximações e 85 ausentes. Suíte completa, lint e build verdes; benchmark de 5 minutos: mediana 294,0x wall / 258,8x CPU, digest `534bd00e225a74ea` preservado.
- Próxima rodada da T16: implementar habilidades próprias das unidades invocadas, começando por explosão do imp, comportamento dos skeletons e propagação de spiderlings.

**Progresso de habilidades dos summons condicionais (2026-07-14)**:
- Minor Imps agora perseguem unidades até alcance de contato, explodem uma única vez com o raio oficial de 400 unidades, causam dano mágico em área e são consumidos. Sem unidades próximas, seguem o dono em vez de desperdiçar a explosão em estruturas.
- Reincarnation aplica o slow oficial de 75% por 4s dentro de 600 unidades. Os skeletons nascem com `targetId` distribuído entre os Arcanes inimigos próximos e começam a persegui-los imediatamente.
- Last hits de spiderlings propagam uma unidade adicional no local da morte. A propagação reutiliza duração e stats importados, continua sujeita ao limite de 12 summons vivos por dono e não executa polling fora da resolução de mortes.
- Os efeitos são derivados da `sourceSkillId` já presente no replay; nenhum metadado por frame foi adicionado. Raio de explosão, raio de slow, intensidade e duração foram normalizados como valores runtime consumidos.
- Testes headless cobrem dano em área e distância segura, consumo/despawn do imp, slow e foco dos skeletons, propagação por autoria do last hit e limites existentes. Auditoria permanece em 6 completas, 631 parciais, 12 aproximações e 85 ausentes.
- Suíte completa, lint e build verdes. Benchmark de 5 minutos: mediana 287,3x wall / 248,0x CPU, digest `534bd00e225a74ea` preservado.
- Próxima rodada da T16: auditar habilidades próprias dos outros summons, começando por Tombstone zombies, Familiars, Spirit Bear e wards com ataques especiais.

**Progresso de habilidades dos summons persistentes (2026-07-14)**:
- Tombstone deixou de atacar como uma ward comum. A cada intervalo oficial de 4/3,6/3,2/2,8s, cria um zombie para cada Arcane inimigo dentro das 1200 unidades oficiais; dano, hits de vida, alvo inicial e duração são preservados, com o limite global de 12 summons por dono.
- Spirit Bear usa regeneração plana de 1,5 HP/s, respeita o leash oficial de 1100 unidades durante targeting e perseguição e retorna ao dono quando ultrapassa esse limite. Sua morte por dano aplica backlash puro de 20% da vida máxima ao dono no mesmo ciclo de resolução; expiração não ativa o efeito.
- Cada Familiar aplica e renova sua própria redução de armadura por 6s. O valor `-1` é uma aproximação declarada porque o seed informa `armor_reduction_per_hit`, mas não fornece o número; efeitos de Familiars diferentes empilham.
- Death Ward com Scepter ricocheteia em um segundo Arcane dentro das 575 unidades importadas e cura o dono em 10% do dano de cada ataque conectado. O ataque primário mantém lifesteal mesmo sem alvo secundário. Serpent Wards permanecem com ataques básicos porque o seed atual não declara multi-target ativo fora dos valores de upgrade.
- O replay ganhou apenas um discriminador opcional de variante para os zombies da Tombstone; os demais comportamentos continuam derivados de `sourceSkillId`, sem polling global ou snapshots pesados. Testes headless cobrem import, spawn periódico, replay, debuff empilhável, leash, regen, backlash, ricochete e lifesteal.
- Auditoria permanece em 6 completas, 631 parciais, 12 aproximações e 85 ausentes. Suíte completa, lint e build verdes; benchmark headless de 5 minutos: mediana 314,2x wall / 232,9x CPU, digest `534bd00e225a74ea` preservado.
- Próxima rodada da T16: auditar subskills ausentes do seed principal (Stone Form, Return e equivalentes) e as habilidades próprias das famílias restantes de summons.

**Progresso de subskills via unit seeds (2026-07-14)**:
- Vinte skills oficiais agora apontam para o `summonUnitSeedId` correspondente. HP, dano, alcance, visão, movimento, BAT e bounty do import oficial continuam prioritários; o unit seed preenche somente valores ausentes. Isso corrige, por exemplo, o ataque-base do Spirit Bear para a média adaptada de 55 sem sobrescrever HP, velocidade ou BAT oficiais.
- Familiars usam `stone_drop` do unit seed: 60 de dano mágico, stun de 1s, raio de 250 e cooldown independente de 20s por unidade. A forma invulnerável com regeneração continua pendente porque nem o feed oficial do herói nem o unit seed adaptado fornecem duração/ritmo de cura; a aproximação atual cobre apenas o impacto declarado pelo seed.
- O alt-cast de Summon Familiars virou recall automático da IA: ao ultrapassar as 1200 unidades importadas, o Familiar deixa de agir por 4s e reaparece na formação do dono. Estado de cooldown, recall e identidade do unit seed atravessam o replay.
- Spirit Bear usa `entangling_claws` do unit seed em ataques: chance determinística de 20% e root de 1,2s. Seu Return defensivo continua representado pelo leash já implementado, que cancela alvos fora das 1100 unidades e o move de volta ao dono sem criar um cooldown inexistente no seed.
- Testes headless cobrem mapeamento, prioridade de valores, fallback de stats, Stone Form/cooldown, recall/replay e proc de Entangling Claws. Auditoria permanece em 6 completas, 631 parciais, 12 aproximações e 85 ausentes. Suíte completa, lint e build verdes; benchmark de 5 minutos: mediana 302,9x wall / 239,9x CPU, digest `534bd00e225a74ea` preservado.
- Próxima rodada da T16: executar as passivas restantes dos unit seeds: crítico dos wolves, slow do boar, venenos de wards/spiderlings, Melting Attack, splash/on-death do golem e split dos eidolons.

**Progresso de passivas dos unit seeds (2026-07-14)**:
- Ataques de Spirit Wolves rolam crítico determinístico de 20% por 160% de dano. Boars aplicam slow de 20% por 3s; Plague Wards e spiderlings aplicam DoTs mágicos de 8 por 3s e 4 por 2s, respectivamente.
- Forged Spirits acumulam Melting Attack em `-1` de armadura por ataque, duração de 5s e teto de 10 stacks. Os debuffs usam `TimedEffect`, logo respeitam resistência, dispel, expiração e o cache de modificadores já existente.
- Burning Fists causa 40% do dano do golem em 250 unidades ao redor do alvo primário. Golem Impact dispara somente em morte por dano, causa 150 mágico em 400 unidades e resolve cadeias de golems antes da coleta de mortos; expiração natural não explode.
- Eidolons contam ataques conectados e, no sexto, substituem a unidade por dois filhos com a duração restante. O contador atravessa replay normal/comprimido e os filhos carregam uma variante explícita que impede split recursivo.
- Todos os handlers partem dos eventos de ataque/morte existentes; não há polling global. Slow, DoT e redução de armadura persistentes ainda afetam somente Arcanes porque creeps e summons não possuem container de status próprio; crítico, splash e impacto causam dano em qualquer unidade suportada.
- Testes headless cobrem valores, procs, ticks, stacks, splash, explosão, split, replay e limite de geração. Suíte completa, lint e build verdes; benchmark de 5 minutos: mediana 294,5x wall / 258,8x CPU, digest `534bd00e225a74ea` preservado.
- Próxima rodada da T16: integrar efeitos compartilhados entre dono e summon (Grave Chill/Cloak nos Familiars e Spirit Link/Savage Roar no Bear) e revisar as regras adaptadas de clones/ilusões.

**Progresso de efeitos compartilhados entre owner e summon (2026-07-14)**:
- Spirit Link agora aplica ao Druid e ao Spirit Bear os bônus distintos de movimento importados. Ataques de qualquer um curam os dois lados do vínculo com o lifesteal oficial por nível; alvos não heroicos recebem a penalidade importada de 40% e estruturas não geram cura.
- Savage Roar nasce simultaneamente no Druid e no Spirit Bear. Inimigos dentro dos 350 pontos oficiais de qualquer origem recebem fear pela duração de cada nível, com um único custo e cooldown no owner.
- Grave Chill rouba movimento e attack speed do alvo por 5s, fortalece o caster e compartilha o mesmo buff com Familiars dentro das 900 unidades oficiais. Movimento e intervalo de ataque dos summons consultam o buff apenas quando necessário.
- Familiars nascem com as quatro camadas de Gravekeeper's Cloak aprendidas pelo owner. Cada camada usa a redução oficial por nível, impactos a partir de 40 consomem uma camada e a recuperação sequencial respeita 7/6/5/4s enquanto o Familiar permanece na aura de 900 unidades.
- O replay compacto preserva somente timestamp do buff, camadas e próxima recuperação. Testes headless cobrem import, movimento, intervalos de ataque, lifesteal nos dois sentidos, Roar pelo Bear, mitigação/recuperação do Cloak e replay normal/comprimido.
- Auditoria: 6 completas, 633 parciais, 12 aproximações e 83 ausentes. Suíte completa, lint e build verdes; benchmark de 5 minutos: mediana 306,6x wall / 240,0x CPU, digest `51a125c1f69f4a2a`.
- Próxima rodada da T16: revisar clones e ilusões contra as regras adaptadas, começando por cópia de atributos/itens, restrições de skills e tratamento de morte/XP/bounty.

**Progresso de clones e ilusões (2026-07-14)**:
- Unidades hero-like agora copiam o snapshot efetivo do owner: vida, dano após itens/passivas, armadura, resistência mágica, alcance, visão, movimento e intervalo de ataque. Tempest Double usa as restrições do unit seed para 75% de dano causado e 150% recebido; ilusões preservam seus multiplicadores específicos.
- Dano recebido por summons passa pela armadura/resistência antes da amplificação da ilusão. O dano contra estruturas usa a restrição do unit seed, com fallback de 35% para ilusões, sem penalizar ataques de summons comuns.
- Spirit Lance, Doppelwalk e Conjure Image foram ligados ao runtime de ilusões com quantidade, duração e escalas oficiais. O Doppelwalk converte corretamente os campos negativos de redução de dano para 20% causado e 600% recebido.
- Bounty e XP usam primeiro os valores da skill, depois o unit seed e por fim um fallback próprio para ilusões. Os novos atributos atravessam replay normal/comprimido com fallback compatível para frames anteriores e aparecem no painel de dados.
- Testes headless cobrem import, herança, mitigação, dano estrutural, bounty do Tempest Double e replay. Auditoria: 6 completas, 634 parciais, 12 aproximações e 82 ausentes. Suíte completa, lint e build verdes; benchmark de 5 minutos: mediana 309,9x wall / 230,5x CPU, digest `51a125c1f69f4a2a` preservado.
- Próxima rodada da T16: modelar ilusões que copiam inimigos ou nascem de gatilhos passivos/diferidos, como Reflection, Disruption, Dark Portrait, Haunt e Juxtapose; depois revisar restrições de skills e itens por família de clone.

**Progresso de ilusões por cópia e gatilho (2026-08-17)**:
- Reflection, Disruption, Dark Portrait e Haunt agora copiam o snapshot efetivo do Arcane alvo, incluindo vida, dano, armadura, resistência mágica, alcance, visão, movimento e intervalo de ataque, em vez de herdarem o caster.
- Reflection cria uma ilusão para cada inimigo na área oficial, mantém cada cópia vinculada à sua fonte e é invulnerável/não adquirível como alvo. Haunt cria uma cópia vinculada para cada Arcane inimigo vivo, sem depender da visão do caster, e encerra a ilusão quando o alvo morre.
- Disruption materializa duas cópias somente após os 2,75s oficiais e preserva duração, dano base adicional e multiplicadores por nível. O banimento do alvo durante esse intervalo ainda será tratado junto à revisão de estados especiais; a geração diferida já não aparece nem fornece visão antes da ativação.
- Dark Portrait usa 125% do dano do alvo, 275% de dano recebido, 30% de movimento adicional e duração de 25s. O desbloqueio permanece condicionado ao Scepter pelo runtime existente.
- Juxtapose passou a executar o proc passivo em ataques do herói, o proc reduzido de 9% em ataques das próprias ilusões, duração secundária de 4s e limite oficial de 6/8/10 cópias. Break impede novos procs do herói.
- Cópia, alvo vinculado, expiração conjunta e intangibilidade atravessam replay normal/comprimido. Testes cobrem os valores importados e as cinco famílias; auditoria: 6 completas, 635 parciais, 12 aproximações e 81 ausentes.
- Próxima rodada da T16: revisar por família quais skills, passivas de item, auras e procs clones/ilusões podem copiar; depois modelar o banimento de Disruption e subskills de controle como Reality sem poluir o replay.

**Progresso das regras de herança de clones e ilusões (2026-08-17)**:
- O runtime ganhou políticas explícitas para summon comum, ilusão, ilusão forte e clone. Ilusões deixaram de copiar silenciosamente buffs temporários, dano bruto dos itens e passivas genéricas do herói; seu dano-base herdado conserva atributos e stats permitidos antes de aplicar o multiplicador da skill.
- O inventário elegível é congelado no nascimento da unidade. Ilusões copiam somente crítico passivo e mana burn adaptado, reduzido para 20% do valor em melee e 10% em ranged; procs de magia, bash, lifesteal, cleave e modificadores de ataque ficam fora dessa família.
- Clones copiam a contribuição das passivas do herói e os efeitos ofensivos passivos/toggle sem cooldown que o runtime já executa, incluindo crítico, mana burn, proc mágico, bash, lifesteal, cleave e debuffs de ataque. Ativos, consumíveis, cooldowns e buffs temporários continuam deliberadamente não herdados.
- Summons hero-like recebem a aura coletiva dinâmica do time; summons comuns não. A classificação de efeitos herdáveis é cacheada pela composição do inventário, sem acrescentar dados aos frames do replay.
- Testes cobrem isolamento de buffs, dano de atributo, snapshot do inventário, allowlist de ilusão, diferenças melee/ranged, passivos de clone, exclusão de ativos e aura. Suíte completa, lint e build verdes; benchmark de 5 minutos em 156,6x wall / 118,2x CPU, com digest `51a125c1f69f4a2a` preservado. Próxima rodada da T16: implementar banimento de Disruption e Reality; depois auditar exceções específicas de clone, uso de skills e compartilhamento de cooldowns sem confundir isso com itens ativos.

**Progresso de Disruption e Reality (2026-08-17)**:
- Disruption aplica banimento real durante a duração importada: o alvo interrompe channeling e viagem, não move, ataca, usa skills, fornece visão, participa de auras, colide, recebe dano nem pode ser adquirido por Arcanes, creeps, summons, torres, campos ou boss. A duração respeita status resistance quando hostil e as duas ilusões aparecem exatamente no retorno do alvo.
- O estado usa `TimedEffect`, já suportado pelo replay detalhado, sem criar payload paralelo. A invulnerabilidade também protege contra dano periódico; ticks ocorridos durante o banimento são ignorados em vez de acumulados para explodir no retorno.
- Reality passou a ser executada pela IA durante Haunt. Ela compara vida do alvo, foco coletivo, distância economizada, vantagem local e medidor de perigo; vida baixa abre uma janela de execução maior, mas vida própria baixa ou desvantagem numérica ainda bloqueiam o teleporte.
- A ativação move o Arcane até a ilusão escolhida, consome somente essa cópia e só pode ocorrer uma vez por Haunt. Com Scepter, os valores oficiais exclusivos de upgrade foram importados separadamente e Reality aplica fear de 2s, slow de 50% e raio de 400, sem contaminar o cast base de Haunt.
- Testes cobrem interrupção, invulnerabilidade, bloqueio de movimento/targeting, retorno sincronizado, escolha e consumo da Reality, uso único e efeito do Scepter. Suíte completa, lint e build verdes; benchmark de 5 minutos em 151,7x wall / 114,6x CPU, digest `51a125c1f69f4a2a` preservado. Próxima rodada da T16: auditar exceções específicas do Tempest Double, incluindo skills disponíveis, itens proibidos e compartilhamento de cooldowns; depois ampliar estados especiais além de Disruption.

**Progresso do Tempest Double (2026-08-17)**:
- O clone agora congela no nascimento os níveis aprendidos, inventário, mana atual e mana máxima do owner. Q, W e E usam esse snapshot, gastam a mana do clone e mantêm cooldowns próprios inicialmente disponíveis; a ultimate Tempest Double é excluída para impedir recursão.
- Flux aplica o dano periódico, slow, duração e cadência importados. Magnetic Field cria uma área com duração e raio oficiais, concede attack speed aos aliados próximos e dá ao clone a evasão física enquanto ele permanece dentro do campo. Spark Wraith arma após 1,5s, persiste por até 16s e dispara uma vez contra a unidade visível mais próxima no raio, com dano e ministun por nível.
- A degradação oficial do clone foi ligada à duração restante: movimento e precisão caem progressivamente até 35%. Erros de ataque são determinísticos e aparecem como `MISS`; summons comuns não entram nessa rolagem. O estado de mana, cooldowns, campo e armadilhas fica somente na simulação, sem aumentar os frames do replay.
- Os aliases oficiais passaram a reconhecer `move_speed_slow_pct`, `attack_speed_bonus` e evasão do Magnetic Field. A auditoria permanece em 6 completas, 635 parciais, 12 aproximações e 81 ausentes, mas Flux e Spark Wraith agora classificam seus slows corretamente.
- Testes cobrem snapshot, mana, cooldown independente do owner, bloqueio da ultimate, Flux, Magnetic Field, Spark Wraith e degradação. Suíte completa, lint e build verdes; benchmark de 5 minutos em 135,9x wall / 108,7x CPU, digest `51a125c1f69f4a2a` preservado. Próxima rodada da T16: implementar a allowlist de ativos de item do Tempest Double, excluindo consumíveis, Refresher e itens perdidos na morte; depois ampliar estados especiais além de Disruption.

**Progresso dos itens do Tempest Double (2026-08-17)**:
- O clone passou a decidir e usar ativos já suportados pelo runtime com mana, custo de vida, targeting, efeitos e cooldown próprios. O cooldown do owner não é consumido nem compartilhado; buffs de movimento/attack speed e barriers usados no próprio clone são mantidos em estado local compacto.
- A allowlist bloqueia consumíveis, itens baseados em charges, upgrades consumidos permanentemente, Refresher e itens perdidos na morte. Itens de charges continuam fornecendo atributos passivos válidos, mas não copiam as cargas nem liberam o ativo.
- Consumíveis e itens perdidos na morte não entram no snapshot do inventário do clone. A remoção também desconta seus atributos do snapshot sem apagar modificações legítimas já presentes no Arcane; o owner preserva integralmente o item original.
- Testes cobrem classificação, inventário filtrado, exclusão de atributos da Relíquia Divina, uso ofensivo da Burst Wand, barrier defensiva, gasto de mana e independência de cooldown. Suíte completa, lint e build verdes; benchmark de 5 minutos em 162,6x wall / 125,9x CPU, digest `51a125c1f69f4a2a` preservado.
- Próxima rodada da T16: ampliar estados especiais além de Disruption e revisar famílias de skills ainda parciais na matriz automática.

**Progresso de imunidades e estados especiais (2026-08-17)**:
- O contrato de `TimedEffect` passou a representar invulnerabilidade, imunidade a debuffs e estado etéreo como regras próprias. Invulnerabilidade impede aquisição e dano; etéreo impede ataque e dano físico, reduz a resistência mágica pelo valor importado; imunidade a debuffs rejeita novos efeitos negativos que não declaram perfuração.
- As quatro skills que declaram imunidade direta a debuffs recebem o estado durante a janela correta, com piso de resistência mágica importado. Nightmare, as duas skills de criação de ilusões, a ultimate multigolpe do Twin Blade Duelist e o souvenir de ilusões usam suas janelas específicas de invulnerabilidade; a skill concedida ao Plague Saint aplica o estado etéreo de 2,5s.
- Skills com `pierces_*` ou `can_target_magic_immune` deixaram de ser classificadas falsamente como concessão de imunidade. A matriz agora separa dez skills completas em nível de regra de doze casos condicionais/direcionais ainda aproximados.
- O minimapa e o painel ganharam glifos, cores e nomes próprios para os três estados. Testes cobrem bloqueio e perfuração de debuff, resistência mágica, dano puro, aquisição de alvo, imunidade física etérea e exposição mágica.
- Auditoria atual: 7 completas, 634 parciais, 12 aproximações e 81 ausentes; família `immunity`: 10 completas e 12 aproximações. Suíte completa, lint e build verdes; benchmark de 5 minutos em 164,7x wall / 137,2x CPU, digest `51a125c1f69f4a2a` preservado.
- Próxima rodada da T16: implementar as imunidades condicionais restantes, começando por área, posição, upgrades e janelas direcionais, sem promover reduções defensivas comuns a imunidade total.

**Progresso de imunidades condicionais (2026-08-17)**:
- A imunidade a debuffs de Cogs agora depende da permanência do Arcane na área criada pela habilidade: o estado e o piso de 50% de resistência mágica são suspensos ao sair e restaurados ao retornar durante a duração original.
- Dark Portrait materializa sua ilusão hero-like com os 90% de resistência mágica importados. Reflection foi auditada como inalvejável durante a janela já executada pelo runtime, sem confundir a regra com invulnerabilidade genérica.
- Parry do Twin Blade Duelist intercepta e consome a primeira carga contra ataque básico ou habilidade unit-target inimiga, nega o dano e responde com crítico físico e stun importados. O painel identifica a janela com efeito próprio.
- O índice de efeitos temporários passou a agrupar também por alvo e tipo e reutiliza uma lista vazia compartilhada. Isso manteve o Parry fora do caminho caro de todo dano e elevou o benchmark A/B de 105,2x para 136,6x wall e de 85,7x para 107,2x CPU, com digest `51a125c1f69f4a2a` preservado.
- Auditoria atual: 7 completas, 634 parciais, 12 aproximações e 81 ausentes; família `immunity`: 14 completas e 7 aproximações. Próxima rodada da T16: tratar os sete casos restantes de upgrades, passivas disparadas e defesa direcional somente onde os valores importados permitirem execução fiel.

**Progresso de imunidades condicionadas a upgrades (2026-08-17)**:
- Hand of God foi corrigida como habilidade global. Sem Scepter, cura imediatamente e não concede imunidade; com Scepter, canaliza por 6s e cria ao redor do caster a aura importada de 800 unidades, 60% de resistência e HoT com bônus de 200%. Aliados suspendem imunidade e cura ao sair da área e recuperam ambas ao retornar durante a canalização.
- O Shard de Starbreaker concede imunidade a debuffs e piso de 50% de resistência mágica durante os 1,1s importados da sequência. A habilidade base permanece sem imunidade.
- Valores de upgrade antes descartados agora chegam ao runtime com aliases explícitos, sem alterar as habilidades concedidas por Scepter/Shard nem aplicar o bônus quando o item não está no inventário.
- Efeitos sustentados por canal agora declaram a fonte e a skill mantenedora. Controle forte interrompe canais imediatamente, e a aura/HoT deixa de funcionar no mesmo instante em vez de sobreviver até o prazo original.
- Auditoria atual: 7 completas, 634 parciais, 12 aproximações e 81 ausentes; família `immunity`: 16 completas e 5 aproximações. Os casos restantes são Fowl Play por gatilho de morte, Nether Strike com valores de Shard zerados, retorno do Astral Spirit, Press the Attack com duração/resistência vazias e Bulwark direcional sem orientação persistida.
- Suíte completa, lint e build verdes. Benchmark de 5 minutos em 141,9x wall / 115,8x CPU, digest `51a125c1f69f4a2a` preservado. Próxima rodada da T16: modelar orientação persistente para Bulwark ou avançar o gatilho de morte de Fowl Play, escolhendo o contrato que também sirva às outras habilidades pendentes.

**Progresso de orientação e defesa direcional (2026-08-17)**:
- Arcanes agora mantêm um vetor de orientação desde o spawn, atualizam-no em movimento normal, viagem planejada, fast path cinemático e ataques básicos, e preservam esse estado nos clones de tick. Frames materializados recebem uma orientação determinística compatível.
- Todo ataque básico de Arcane, creep, summon, torre, T4, campo neutro e Boss declara posição de origem e natureza do ataque. Dano físico de skills, procs e splash não entra acidentalmente na regra direcional.
- Bulwark usa os valores oficiais por nível: cone frontal de 140 graus com 40/50/60/70% de redução física e faixa lateral de 240 graus com 20/25/30/35%. Ataques pelas costas, dano mágico e físico não básico continuam integrais; Break suspende a passiva.
- As estimativas da IA para tankar torre e limpar campo usam a mesma mitigação direcional do combate efetivo. O caminho quente retorna antes de consultar skills para qualquer herói que não seja o Arena Sentinel.
- A família `immunity` permanece em 16 completas e 5 aproximações: a redução direcional de Bulwark está executada, mas `forced_movement_immunity` continua pendente porque a fonte importada não traz valor, duração nem contrato confiável de ativação.
- Suíte completa, lint e build verdes. Benchmark de 5 minutos em 149,9x wall / 120,0x CPU, digest `51a125c1f69f4a2a` preservado. Próxima rodada da T16: implementar o gatilho de morte de Fowl Play e então reavaliar os três casos cujos upgrades importados estão vazios.

**Progresso de prevenção de morte e Fowl Play (2026-08-17)**:
- Fowl Play agora intercepta dano letal antes da resolução da morte, deixa o Hex Warden com 1 HP, aplica strong dispel aos efeitos negativos e entra na recarga oficial de 120s. Break impede o disparo, e a recarga é removida no respawn.
- A forma de 3s bloqueia ataques e skills, preserva movimento com os 5% importados e impede uso de itens sem Shard. A janela inicial reduz dano recebido em 100% por 1s; com Shard, os 0,1s importados de invulnerabilidade e o uso de itens durante a forma também são habilitados.
- As galinhas falsas são summons inofensivos e selecionáveis, recebem 200% de dano, não concedem ouro/XP e escalam em uma imagem adicional a cada seis níveis. O minimapa e o painel identificam separadamente a forma e a imunidade a dano.
- Culling Blade e Reaper's Scythe usam o novo contrato explícito de execução e ignoram prevenção de morte. Testes cobrem disparo letal, dispel, restrições da forma, Shard, imagens, recarga, respawn, imunidade temporária e bypass de execução.
- Auditoria atual: 7 completas, 634 parciais, 12 aproximações e 81 ausentes; família `immunity`: 17 completas e 4 aproximações. Restam Nether Strike com valores de Shard zerados, retorno do Astral Spirit, Press the Attack com duração/resistência vazias e a imunidade a movimento forçado de Bulwark sem contrato importado suficiente.
- Suíte completa, lint e build verdes. Benchmark de 5 minutos em 161,2x wall / 118,8x CPU, com digest `51a125c1f69f4a2a` preservado.
- Próxima rodada da T16: modelar o retorno do Astral Spirit, que possui comportamento acionável, e manter os três upgrades sem dados confiáveis como aproximações documentadas até a fonte importada ser completada.

**Progresso de Astral Spirit e retorno de summons (2026-08-17)**:
- Astral Spirit agora é uma unidade intangível própria: percorre o segmento até o ponto escolhido, causa os 50 de dano mágico importados uma única vez por unidade atravessada e retorna dinamicamente à posição atual do dono. A IA aciona o retorno após uma janela curta de uso, mantendo os 10s oficiais como limite máximo.
- O espírito separa contatos com heróis e creeps, incluindo ilusões/clones e neutros, e converte a contagem no retorno em dano plano e velocidade por 10s. Os valores por nível e o teto de 40% são consumidos diretamente do catálogo; o novo modificador de dano plano também alimenta a faixa exibida e o combate efetivo.
- O Scepter deixou de ler o valor-base zero e recebe um alias explícito para os 2s importados por herói. No retorno, aplica imunidade a debuffs com piso de 50% de resistência mágica pela duração acumulada; sem Scepter, nenhum estado de imunidade é criado.
- O minimapa representa o espírito com variante circular translúcida, contorno interrompido e núcleo próprio, preservando seleção e cor de equipe sem torná-lo alvo. O snapshot profundo mantém rota e contatos isolados, enquanto o replay continua transportando apenas a variante visual necessária.
- Testes cobrem ausência de dano instantâneo, ida e volta, contato único, dois heróis e duas creeps, bônus exatos de 190 de dano e 17% de movimento, expiração, Scepter e ausência de imunidade sem upgrade.
- Auditoria atual: 7 completas, 633 parciais, 13 aproximações e 81 ausentes; família `immunity`: 18 completas e 3 aproximações. Astral Spirit agora só permanece aproximado pelo targeting genérico de área; Nether Strike, Press the Attack e a imunidade a movimento forçado de Bulwark seguem sem valores/contrato importado suficientes.
- Suíte completa, lint e build verdes. Benchmark de 5 minutos em 149,2x wall / 119,4x CPU, com digest `51a125c1f69f4a2a` preservado.
- Próxima rodada: executar a T16.1 para consolidar a linguagem visual de ilusões, clones e criaturas controladas antes de abrir a auditoria integral de itens.

---

### [x] T16.1 - Linguagem visual de ilusões, clones e criaturas controladas

**Objetivo**: tornar cada família de unidade invocada reconhecível imediatamente no minimapa sem depender apenas de cor, mantendo a leitura da equipe, seleção e HP.

**Estado atual**:
- O preenchimento de todos os summons já varia a opacidade com a vida. Ilusões usam círculo e contorno tracejado; clones usam geometria interna própria; wards e healing wards possuem forma/glifo específicos. A distinção existe, mas a transparência ainda não identifica o tipo e a leitura não separa claramente ilusão comum, ilusão forte, clone heroico e criatura controlada.

**Escopo**:
- Preservar a cor da equipe e combinar forma, padrão de contorno e opacidade: ilusão comum com silhueta translúcida/tracejada, ilusão forte com segundo aro ou padrão reforçado, clone com opacidade próxima ao original e assinatura própria, criaturas/wards com glifos sólidos por família.
- Separar a opacidade de identidade do indicador de HP, evitando que uma ilusão com vida cheia pareça uma criatura comum ou que uma unidade ferida pareça uma ilusão.
- Derivar o estilo de `archetype`, `unitSeedId` e variante já existentes, sem adicionar payload visual redundante ao replay.
- Exibir no painel de dados o tipo, owner, skill de origem e duração restante; manter a aura de seleção sem aumentar o tamanho da entidade.
- Usar animação sutil somente quando ela acrescentar leitura e respeitar a carga de renderização em 1x e 16x. Nenhuma família deve depender exclusivamente de mudança de cor, favorecendo acessibilidade e leitura em teamfights.

**Critérios**: ilusões, clones, wards e criaturas são distinguíveis em movimento e paradas, nos dois times e sob seleção; screenshots desktop/mobile, smoke visual e benchmark não mostram sobreposição nem regressão perceptível de FPS.

**Entrega (2026-08-17)**:
- Uma classificação única derivada de `archetype`, `unitSeedId` e `variant` separa ilusão comum, ilusão forte, clone heroico, ward ofensiva, ward de cura, criatura controlada e espírito astral. Testes travam as sete famílias sem adicionar campos ao replay.
- O corpo de cada família usa forma e contorno próprios: círculos tracejados simples/duplos para ilusões, hexágono duplo para clone, quadrados com glifos para wards, losango sólido para criaturas e círculo pontilhado com núcleo para Astral Spirit. Cor continua representando a equipe, mas não é o único identificador.
- Opacidade de identidade agora é fixa por família. HP deixou de alterar transparência e passou para um aro independente, iniciado em 12 horas e consumido no sentido horário; seleção usa somente uma aura externa e não aumenta o token.
- O Inspector identifica tipo, equipe, dono, skill de origem, targetability e duração restante. A assinatura visual do ícone repete a geometria do minimapa, mantendo leitura consistente entre arena e painel.
- Smoke em Edge headless passou sem erros de console: desktop 1440x1000 com canvas 848x848 e 102 FPS aos 10:25; mobile 390x844 com canvas 360x186, 116 FPS no frame inicial e nenhum overflow horizontal.
- Suíte completa, lint e build verdes. Benchmark de 5 minutos em 158,7x wall / 116,4x CPU, com digest `51a125c1f69f4a2a` preservado.
- Próxima etapa: T17, começando pela matriz automática item x efeitos/tags x suporte runtime antes de alterar comportamento de compra ou combate.

---

### [ ] T17 - Auditoria e implementação integral de itens

**Objetivo**: verificar todos os itens importados, incluindo consumíveis, e garantir funcionamento completo de atributos, passivas, procs, auras, toggles, ativos, custos, cooldowns, charges, targeting e decisões de compra/uso da IA.

**Escopo**:
- Gerar matriz automática item × efeitos/tags × implementação runtime e separar itens completos, parciais, aproximados e ausentes.
- Validar inventário único de seis slots, consumo/charges, receitas/upgrades, restrições melee/ranged, stacking e interações com dispel, imunidade, barriers e status effects.
- Verificar se bots compram e usam consumíveis/ativos conforme valor esperado, fase, role, perigo e oportunidade, sem inventário paralelo.
- Implementar lacunas e adicionar testes por família de item e auditoria que falha para itens novos sem suporte declarado.

**Critérios**: 100% dos itens catalogados com status explícito; nenhum ativo sem efeito/custo/cooldown; consumíveis integrados ao inventário normal; relatório persistido e testes/lint/build verdes.

**Progresso da matriz automática e custos de ativação (2026-08-17)**:
- `npm run audit:item-runtime` agora classifica os 210 itens e 352 efeitos importados em catálogo, aquisição, atributos, receitas, stacking, restrições, IA de compra, ativos, passivas, auras, toggles, consumíveis, cargas, targeting, custos e regras especiais. O relatório humano está em `tasks/ITEM_RUNTIME_AUDIT.md` e a baseline integral em `tasks/ITEM_RUNTIME_AUDIT.json`.
- O teste compara fingerprints do catálogo vivo com a matriz persistida. Item novo, mudança de dados ou mudança de suporte passa a exigir revisão explícita e regeneração da auditoria.
- Baseline conservadora: 0 itens completos, 121 parciais e 89 com ao menos uma família ausente. As maiores lacunas estruturais são aquisição de neutros/enchantments, cargas persistentes, toggles, consumíveis utilitários e passivas especiais; dados apenas preservados não contam como implementados.
- Ativos agora verificam e pagam custo de mana/vida pelo mesmo caminho em Arcanes, dispels e clones. A Soul Battery não pode matar o usuário, desconta seu custo uma única vez, aplica o ganho de mana e respeita o cooldown importado.
- Suíte completa, lint e build verdes. Benchmark de 5 minutos em 126,4x wall / 102,9x CPU, digest `51a125c1f69f4a2a` preservado.
- Próxima rodada da T17: criar estado serializável de instância/charges dentro do inventário único de seis slots, sem reintroduzir inventário separado para consumíveis.

**Progresso do inventário com cargas (2026-08-17)**:
- `itemCharges` agora é estado dinâmico do mesmo inventário de seis slots, não um inventário paralelo. A contagem nasce no spawn/compra, persiste em clones de tick e no replay compacto, permanece após a morte e é removida quando o item deixa o inventário.
- Consumíveis gastam uma carga por uso e só liberam o slot na última. Ativos permanentes de cargas fixas permanecem no slot ao chegar a zero e deixam de ser selecionados pela IA; cooldown e custo de recurso continuam independentes da contagem.
- Rations, Bottle e Drums possuem ciclo fixo completo. Wand e Locket agora recebem cargas por casts inimigos próximos e convertem todo o estoque em cura/mana; Urn e Vessel recebem uma carga na morte inimiga para o portador elegível mais próximo e escolhem cura ou dano gradual; Raindrops bloqueia dano mágico acima do limiar, gasta uma carga e libera o slot ao zerar.
- Os sete itens que declaram cargas na fonte estão completos nessa família, incluindo persistência no replay e indicadores no inventário. A matriz passou para 128 itens parciais e 82 com família ausente; as pendências restantes não pertencem mais ao ciclo de charges.
- Testes cobrem consumo parcial/final, replay, limite por casts, seleção única por morte, escala de Wand, escolha ofensiva da Urn e barreira automática. Suíte completa, lint e build verdes; benchmark determinístico de 5 minutos em 170,5x wall / 134,0x CPU, digest `3f80541c0f6fea34`.
- O HUD compacto e o Inspector mostram a quantidade no próprio slot e no detalhe do item. Testes cobrem uso intermediário/final, ativo zerado e round-trip pelo replay.
- Próxima rodada da T17: integrar consumíveis utilitários, aquisição de wards e toggles persistentes, começando pelos itens que hoje ainda não entram no catálogo de compra/uso.

**Progresso dos toggles persistentes (2026-08-17)**:
- `itemToggleStates` acompanha o inventário no spawn, compra/venda, clone de tick e replay compacto. Replays anteriores continuam válidos com estado vazio por padrão; o HUD mostra `STR/AGI/INT` ou `ON/OFF` no próprio slot.
- Attribute Treads alterna o bônus importado entre força, agilidade e inteligência conforme vida, mana, atributo primário e perigo, preservando a proporção de recursos para impedir cura por troca repetida.
- Armlet aplica +25 de força e +35 de dano enquanto ativa, drena 45 HP/s sem matar o portador e impede o fast path de viagem durante o upkeep. A IA liga em combate quando há margem de vida e desliga ao perder a janela segura.
- Revenant Brooch converte o ataque básico inteiro em dano mágico, atinge alvos etéreos e gasta 75 de mana exatamente uma vez por ataque; a IA o reserva para combate com mana suficiente e alvos de armadura alta/etéreos.
- Os três toggles importados estão completos nessa família. A matriz passou para 131 itens parciais e 79 com família ausente.
- O caminho quente ignora contexto e upkeep quando não há toggle relevante; benchmark determinístico de 5 minutos em 155,1x wall / 125,2x CPU, digest `4a30d919e126418d`.
- Próxima rodada da T17: entidade e estoque de wards, seguidos por Smoke, Dust, Recall e Tome no inventário normal.

**Progresso de wards e consumíveis utilitários (2026-08-17)**:
- O adaptador deixou de descartar consumíveis sem cura/mana e agora preserva efeito, alvo, tags e valores de todos os utilitários, incluindo o Observer gratuito. Eles continuam no inventário normal de seis slots e usam o mesmo contador persistente de cargas.
- Observer e Sentry possuem estoque compartilhado por equipe, limites e reposição determinística. O estoque considera as wards distribuídas no início, é debitado somente na compra e atravessa clone de tick e replay compacto.
- A IA de supports compra wards quando a cobertura cai e coloca somente em pontos estratégicos próximos, respeitando risco, fase, cobertura existente e oportunidade de deward. Auditoria headless de seis minutos registrou cinco Observers e cinco Sentries colocados sem chamada forçada.
- Wards são entidades imóveis com duração importada, bounty e identidade visual existente. Observer fornece 1600 de visão na escala comum e fica oculto para inimigos; Sentry fornece 900 de True Sight e libera seleção/ataque do Observer detectado.
- Testes cobrem catálogo de custo zero, carga/slot, colocação, visão, ocultação, True Sight, estoque, compra e round-trip de entidade/estoque no replay. A matriz passou para 133 itens parciais e 77 com família ausente.
- Benchmark determinístico de 5 minutos em 157,3x wall / 127,3x CPU, digest `3a59effa8a401a53`.
- Próxima rodada da T17: Smoke e Dust; depois Recall e Tome, preservando o inventário único e adicionando decisões por objetivo/fase.

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

**Progresso de visão (2026-07-12)**:
- Corrigida a escala comum para 140 unidades importadas por unidade do mapa: visão padrão 1800/800 agora corresponde a 12,86/5,71, em vez de 18/8 para heróis e 11,43 para creeps.
- A preparação em `-01:00` passa a iniciar realmente com visão noturna e troca para visão diurna em `00:00`.
- Fog de equipe inclui Arcanes, creeps, torres, estruturas e base aliados. Foco coletivo, ataques, skills, itens e perseguição não podem adquirir ou atualizar a posição de um Arcane fora da visão.
- Testes cobrem limite dentro/fora do raio, diferença dia/noite, provedores aliados e bloqueio/liberação de foco pelo fog.
- Pendente para paridade avançada: árvores/obstrução, diferença de elevação no highground, wards e efeitos específicos que concedem visão aérea ou True Sight.

---

### [ ] T19 - Campos neutros compostos por criaturas individuais

**Objetivo**: substituir cada campo agregado por uma composição real de criaturas neutras, preservando stacks e pull, com comportamento, atributos, habilidades e recompensas próprios por unidade.

**Escopo**:
- Importar/catalogar cada criatura neutra com família, tier, quantidade por campo, HP, mana, dano, BAT/attack speed, armor, resistências, alcance, movimento, visão, collision size, bounty e XP individuais.
- Gerar composições válidas por campo e minuto, incluindo variantes e criaturas especiais, sem representar o stack como multiplicador de um único círculo.
- Implementar runtime por criatura: aquisição e prioridade de alvo, aggro compartilhado, leash, perseguição, retorno ao spawn, reset, regen, ataque, cast de skills, morte individual e distribuição correta de ouro/XP.
- Adaptar pull e stack para grupos reais: spawn box, bloqueio, horário de stack, neutral creep aggro, interação com lane creeps, dispersão e retorno independente sem duplicar recompensas.
- Integrar avaliação da IA pela composição efetiva do campo, dano recebido projetado, tempo de clear, resistências, disables e risco de contestação; suportar last hit/steal de criaturas individuais.
- Renderizar cada criatura e seu HP/respawn sem perder desempenho, usando dados compactos no replay e índices espaciais compartilhados.

**Critérios**: nenhum campo ativo usa HP/dano agregado; stacks contêm grupos completos; criaturas atacam, usam habilidades, resetam e recompensam individualmente; pull/stack/farm continuam determinísticos; testes de composição e benchmark, lint e build verdes.

---

### [x] T20 - Benchmark fiel do pré-cálculo

> Concluída em 2026-07-13 - O benchmark usa o encoder binário e transferência reais, mede componentes e replay, segmenta a partida e possui modo completo sem aquecimento artificial.

**Objetivo**: medir o caminho real do Worker e impedir que regressões tardias sejam escondidas por amostras curtas.

**Escopo**:
- Usar `ReplayChunkEncoder`, buffers transferíveis, frames a 5Hz e detalhes a 0,5Hz, como o Worker.
- Suportar partida completa e segmentos de cinco minutos, reportando taxa, população de creeps, bytes do replay e custo de tick/frame/encode/transfer.
- Registrar baseline de uma partida completa e preservar digest determinístico entre execuções equivalentes.

**Critérios**: benchmark reproduz o transporte atual; modo curto continua adequado a regressão; modo completo expõe degradação por fase; testes, lint e build verdes.

**Medição**: a seed `performance-reference` terminou organicamente em `47:47`; foram 2.927,4s simulados em 55,05s (`53,2x`) e replay de 88,6 MB. O `tick` respondeu por 97,8% do caminho medido; frame 0,9%, encode 1,2% e transferência 0,1%. O trecho final caiu para `41,5x` com 124 creeps, confirmando T22 como próximo gargalo estrutural.

---

### [x] T21 - Scheduler de combate dos Arcanes

> Concluída em 2026-07-13 - Avaliações rodam por evento/10Hz e alvos válidos persistem por intenção, com invalidação econômica, tática, de visão, alcance e vida.

**Objetivo**: parar de reconstruir alvos e ordenar skills a 30Hz quando ataque, cooldown ou contexto ainda não permitem uma nova ação.

**Escopo**:
- Registrar o próximo instante relevante de avaliação por Arcane.
- Conservar alvo válido e invalidar por morte, alcance, visão, perigo ou evento crítico.
- Avaliar skills em cadência tática, preservando mana, cooldown, prioridade e resposta imediata a emergências.

**Critérios**: reduzir materialmente `resolveCombat` e `tryCastSimpleSkill`; nenhuma skill dispara fora do cooldown; determinismo e testes de last hit/deny/combat ficam verdes.

**Progresso (2026-07-13)**:
- Cada Arcane ganhou um instante determinístico para a próxima avaliação de combate; movimento continua em 30Hz, enquanto a árvore completa de alvo/skill roda no máximo a 10Hz sem evento relevante.
- Dano recebido desperta imediatamente o Arcane; dano em creep desperta Arcanes próximos da lane para preservar janelas e prioridade `last hit > deny`.
- A/B no mesmo runtime e seed: mediana de 7,46s sem gate para 6,11s com gate, ganho de 21,9% (`56,3x -> 68,8x`) no cenário até 06:00. Testes, lint e build verdes.

**Conclusão da retenção (2026-07-13)**:
- O estado interno preserva ID e intenção (`last_hit`, `deny`, foco, objetivo, campo, chefe ou fallback) sem aumentar o frame do replay.
- Reuso exige alvo vivo, alcançável, visível e compatível com a decisão atual. Last hit/deny revalidam seus limiares, foco acompanha o blackboard e objetivos continuam sujeitos a tier/desbloqueio.
- Dano em Arcane ou creep próximo limpa a retenção e antecipa a avaliação; retreat, troca de objetivo e troca de foco também invalidam o alvo antigo.
- A retenção adicionou 1,9% de ganho mediano sobre o gate já otimizado. O ganho combinado da T21 permanece dominado pelos 21,9% do scheduler, com testes específicos de validade, janela de last hit e despertar por dano.

---

### [x] T22 - Percepção persistente das creeps

> Concluída em 2026-07-13 - Movimento permanece em 30Hz, enquanto percepção e grade espacial são atualizadas em janelas de 0,1s ou por invalidação imediata.

**Objetivo**: manter movimento em 30Hz sem refazer aquisição de alvo e consultas espaciais completas em todo tick.

**Escopo**:
- Persistir alvo de rota por creep e reavaliar em 10Hz ou por invalidação.
- Reutilizar grade espacial por janela curta com margem de movimento.
- Invalidar imediatamente em morte, saída de alcance, pull, troca de aggro ou desbloqueio de objetivo.

**Critérios**: movimento e ataques visualmente idênticos; pulls e aggro preservados; redução mensurável de `updateCreepMovement/getRouteCreepTarget`.

**Medição**: A/B no mesmo runtime e seed até 06:00 reduziu a mediana de 12,61s para 10,25s, ganho de 23,0% (`33,3x -> 41,0x`) sobre o estado já otimizado pela T21. Alvo morto, mudança de aggro, pull e desbloqueio de objetivo furam a janela e reavaliam imediatamente; testes cobrem retenção, aggro e descarte por morte.

---

### [x] T23 - Cadências internas e estado sujo do tick

> Concluída em 2026-07-13 - Manutenção administrativa e refresh de auras passaram a 10Hz; estados mecânicos, movimento, combate e ticks periódicos permanecem em 30Hz/evento.

**Objetivo**: reservar 30Hz para integração sensível ao tempo e executar manutenção de estado apenas quando necessário.

**Escopo**:
- Agendar expiração de efeitos, auras, memória e limpeza de marcadores.
- Evitar `filter/map/Object.entries` quando a coleção estiver vazia ou nenhuma expiração puder ocorrer.
- Preservar durações e dano por segundo sem reduzir a precisão observável.

**Critérios**: reduzir custo residual do `tick`, manter fórmulas temporais e digest aprovado, testes/lint/build verdes.

**Medição**: comparação pareada contra `1f1dd11`, na mesma execução e seed até 06:00, reduziu a mediana de 11,05s para 9,63s, ganho de 14,7%. DoT/HoT agora retornam antes de alocar quando nenhum tick venceu; auras preservam a mesma regeneração integrada pelo intervalo de 0,1s; testes garantem expiração imediata dos estados de habilidade-pai.

---

### [x] T24 - Pré-carregamento integral otimizado

> Concluída em 2026-07-13 - O playback aguarda o replay completo e Worker/benchmark usam lotes adaptativos à velocidade da máquina, preservando cancelamento, determinismo e velocidades até 32x.

**Objetivo**: calcular e armazenar a partida inteira antes de abrir a arena, reduzindo ao máximo essa espera sem simplificar a simulação.

**Escopo**:
- Liberar o playback somente com `workerDone`; nenhuma simulação concorrente durante a partida assistida.
- Manter todas as velocidades de 1x a 32x disponíveis após o carregamento.
- Reduzir custo interno do `tick`, preservando cadências, regras e digest determinístico.
- Usar lotes maiores durante o pré-cálculo para reduzir mensagens sem comprometer restart/cancelamento.

**Critérios**: arena nunca aparece antes do replay completo; nenhuma parada por buffer em qualquer velocidade; digest preservado; loading e restart confiáveis; benchmark completo, testes, lint e build verdes.

**Medição final (2026-07-13)**: a seed `performance-reference` simulou 51:52 em 27,24s nesta rodada (`114,2x`) e preservou o digest `45a6bc737cc8a8cb`; o baseline da T20 levava 55,05s. O replay ocupou 93,1 MB e o `tick` permaneceu como próximo gargalo, com 96,7%. No navegador, partidas aleatórias de 63+ minutos ficaram no carregador até `workerDone`, restart recalculou do zero, 1x-32x ficaram disponíveis e não houve erro de console.

---

### [x] T25 - Planos cinemáticos para creeps de rota

**Objetivo**: eliminar atualizações de movimento a 30Hz quando uma creep apenas percorre um trecho previsível da rota.

**Escopo**:
- Representar deslocamento livre por um `MotionPlan` quantizado, com origem, destino, início, chegada e próximo instante de ativação.
- Materializar a posição somente quando combate, visão, replay, waypoint, pull, aggro ou invalidação precisarem dela.
- Manter cada creep individual para last hit, deny, ouro, XP e render.
- Criar modo A/B headless entre movimento fixo e planejado, usando seeds douradas e relatório de divergências.

**Critérios**: contatos de wave, ataques, pulls e objetivos permanecem determinísticos; nenhuma creep atravessa um alvo; reduzir ao menos 10% do tempo total ou 35% de `updateCreepMovement` na partida completa; testes, lint e build verdes.

**Resultado (2026-07-13)**:
- Creeps livres agora usam `MotionPlan` quantizado de rota ou espera. A posição fica analítica entre ativações e é materializada em percepção tática, aggro, pull, combate com estruturas, hitbox e captura do replay; last hit, deny, ouro e XP continuam pertencendo a entidades individuais.
- O modo A/B `fixed|planned` entrou no benchmark e no auditor `audit:creep-motion`. O relatório de duas seeds por 10 minutos registrou 14,9% de ganho total e 66,5% menos chamadas de `updateCreepMovement`; a repetição do modo planejado produziu o mesmo digest em todas as seeds.
- Na partida completa `creep-motion-full-1`, o motor fixo simulou 65:49 em 44,33s e o planejado 48:47 em 30,63s, ambos com vitória de Dusk. Como a duração da partida divergiu, a comparação normalizada é a evidência principal: 69,5% menos atualizações por segundo simulado e taxa de simulação 7,3% maior (89,1x para 95,6x).
- Os primeiros contatos diferiram entre -3,96s e +1,75s conforme seed e rota; as cascatas econômicas e de duração estão preservadas nos relatórios `reports/creep-motion-audit.json` e `reports/creep-motion-audit-full.json`, em vez de serem tratadas como equivalência artificial ao motor antigo.
- Testes cobrem amostragem, chegada, espera, rebase, sono a 30Hz, posição exata no replay e waves opostas sem atravessamento. Suíte completa, lint, build e verificação do replay no navegador em 1x/32x ficaram verdes e sem erros de console.

---

### [x] T26 - Ativação tática e índice espacial persistente

**Objetivo**: acordar trajetórias antes de qualquer interação e parar de reconstruir grades espaciais completas por tick.

**Escopo**:
- Manter buckets espaciais persistentes e atualizar uma entidade somente ao cruzar uma célula.
- Usar margem conservadora de movimento para ativar creeps antes de visão, ataque, torre, Arcane, neutro ou colisão.
- Reutilizar buffers de consulta sem criar arrays temporários.
- Invalidar imediatamente por morte, teleporte, deslocamento, aggro, pull ou mudança de objetivo.

**Critérios**: nenhuma aquisição de alvo atrasada; digest/eventos aprovados no A/B; ganho incremental mensurável na partida completa.

**Resultado (2026-07-13)**:
- O índice de creeps agora mantém buckets por ID através de um token estável de runtime, inclusive quando decisões retornam uma nova referência de `state`. A sincronização acontece por revisão tática e só altera membership ao cruzar célula; mortes e remoções são filtradas imediatamente contra o array vivo.
- Consultas quentes usam buffers de IDs e creeps reutilizados e resolvem a entidade atual pelo índice ID→posição, sem criar arrays por consulta nem conservar HP/posição obsoletos. Na partida completa auditada, 1.174.050 permanências reutilizaram o bucket e somente 32.565 movimentos cruzaram célula.
- Planos livres podem dormir por até 1,5s. Uma varredura a 10Hz usa margem conservadora de 6 unidades e acorda a creep antes da visão/ataque de creeps, Arcanes e objetivos; aggro, pull, morte, waypoint e invalidação do alvo continuam acordando imediatamente.
- O auditor `audit:spatial-activation` compara `rebuild` (T25) e `persistent` (T26), repete a candidata para validar digest e reprova atraso de primeiro contato acima de 0,3s. Duas seeds de 10 minutos ganharam 17,5% de taxa normalizada, com 26,2% menos `updateCreepMovement` e atraso máximo de 0,132s.
- Na partida completa dourada, ambos os modos mantiveram vitória de Dusk: ganho normalizado de 4,0%, 33,3% menos atualizações e diferença máxima de primeiro contato de 0,231s. Os eventos e divergências de economia estão em `reports/spatial-activation-audit.json` e `reports/spatial-activation-audit-full.json`.
- Na seed de performance usada antes da implementação, a taxa subiu de 102,2x para 126,1x (+23,4%); wall caiu de 26,91s para 20,56s e CPU de 36,72s para 29,98s. Testes, lint, build e replay no navegador em 1x/32x ficaram verdes, sem erros de console.

---

### [x] T27 - Planos de viagem para Arcanes fora de combate

**Objetivo**: usar movimento analítico em retornos à base, avanços de rota e deslocamentos longos, mantendo micro tático em alta frequência.

**Escopo**:
- Planejar trechos estáveis para base, lane, objetivo, formação e saída de TP.
- Cancelar o plano imediatamente por perigo visível, dano, controle, call, mudança de decisão ou entrada em ilha tática.
- Preservar o scheduler atual de IA e a autoridade das decisões de combate.

**Critérios**: Arcanes não oscilam nem ignoram perigo; decisões e tempos de chegada permanecem auditáveis; ganho total acumulado de movimento chega a pelo menos 1,5x sobre o baseline da T24.

**Resultado (2026-07-13)**:
- Arcanes fora de combate agora usam segmentos analíticos para base, lane, objetivo e formação. Frames intermediários reutilizam o destino resolvido no último gate tático; o destino é renovado a 10 Hz e a árvore completa continua respeitando `nextDecisionAt` e `forceDecision`.
- Dano, DoT, controle de movimento, call, mudança de alvo/decisão, perigo visível, torre, creep, campo e chefe cancelam ou impedem o plano. O replay amostra a posição analítica sem acordar a unidade; respawn, canalização e morte limpam o segmento.
- O auditor `audit:arcane-travel` repetiu duas seeds de 10 minutos deterministicamente: ganho normalizado agregado de 13,1%, zero planos em alcance hostil, zero clusters de oscilação e as mesmas 11 reversões rápidas do baseline.
- As travessias completas de movimento/IA caíram 59,4% no auditor (2,46x). Na partida dourada completa, caíram de 646.018 para 232.293 (2,78x); o fim mudou apenas de 42:13 para 42:15, wall rate subiu de 115,4x para 119,3x e CPU rate de 82,8x para 89,3x.
- Testes cobrem matemática do segmento, deadline, rebase, sono com regeneração, replay, despertar por dano/controle/perigo e a via cinemática de 30 Hz. Suíte completa, lint e build ficaram verdes.

---

### [!] T28 - Ilhas táticas e timing wheel de eventos

> Bloqueada - A arquitetura, o estado SoA, o replay por trajetórias e os frames compartilhados chegaram a aproximadamente 2,62x o baseline T24, mas o critério desta task exige 3x.

**Objetivo**: reservar 30Hz para regiões realmente contestadas e saltar períodos sem interação relevante.

**Escopo**:
- Formar ilhas ativas em torno de combate, torres, campos, boss e trajetórias convergentes.
- Agendar ataques, cooldowns, efeitos, respawns, waves, chegadas e decisões em buckets temporais quantizados.
- Avançar o relógio diretamente ao próximo evento quando nenhuma ilha exigir passo fixo.
- Manter ordem determinística para eventos simultâneos.

**Critérios**: DoT/HoT, channeling, controle, ataque e economia preservam seus instantes; nenhuma luta perde fidelidade; alvo de 3x sobre o baseline da T24 em partida completa.

**Progresso (2026-07-13)**:
- Timing wheel determinístico implementado com saltos de até 9 frames virtuais e interrupção em eventos críticos.
- Ilhas táticas identificam combate, estruturas, campos, boss e trajetórias convergentes; ataques intermediários são processados apenas para atores agendados.
- Worker, simulação headless e benchmark usam o mesmo runtime; modo `fixed` permanece disponível para auditoria A/B.
- Benchmark completo (`performance-reference`): `fixed` 100,2x wall / 79,3x CPU; `event` 144,3x wall / 116,1x CPU, com 77,0% menos ticks globais.
- Ganho normalizado da primeira entrega: +44,0% wall e +46,4% CPU. Naquele estágio, o candidato alcançou 1,26x o baseline T24 (114,2x) e abriu as T29/T30.
- Após T29-T31, a comparação controlada alcançou 291,9x wall, ou 2,56x o baseline T24. O próximo custo relevante está nas passadas de combate/blackboard e no targeting de rota; ainda faltam 17,4% sobre a taxa atual para atingir 342,6x.
- A T32 adicionou +2,5% wall e +4,7% CPU em comparação controlada. Aplicado ao melhor resultado normalizado anterior, o acumulado estimado chega a 299,3x (2,62x T24); ainda faltam cerca de 14,5% para 342,6x.
- T33 e T34 acrescentaram aproximadamente +2,0% e +4,8% de taxa wall em comparações controladas. Aplicados ao acumulado anterior, levam a estimativa a 319,9x (2,80x T24); faltam cerca de 7,1% para 342,6x.
- A T35 acrescentou +4,1% wall e +3,7% CPU em uma comparação pareada conservadora. O acumulado estimado chegou a 332,9x (2,91x T24); faltam cerca de 2,9% para 342,6x.
- Soltar o relógio da cadência do replay chegou a 172,8x, porém alterou a partida de 56:13/29-48 para 41:50/7-59; a variante foi mantida apenas como opção de benchmark e não foi adotada no Worker.
- Testes, lint, build, digest determinístico curto e smoke test visual aprovados. Dados completos em `reports/timing-wheel-audit.json`.

---

### [x] T29 - Estado orientado a dados para unidades numerosas

> Concluída em 2026-07-13 - Canais quentes das creeps agora possuem armazenamento SoA em arrays tipados, com fachadas estáveis para os sistemas existentes e buffers reutilizados no movimento.

**Objetivo**: reduzir alocações e melhorar localidade de cache depois que as fronteiras de movimento estiverem estáveis.

**Escopo**:
- Migrar canais quentes de creeps para arrays tipados por componente: posição, HP, time, lane, alvo e agenda.
- Manter IDs e fachadas de leitura compatíveis para IA, combate e replay.
- Evitar conversão objeto/array dentro do tick.

**Critérios**: queda mensurável de GC e heap; replay e inspector continuam funcionais; testes e digests aprovados.

**Resultado (2026-07-13)**:
- Posição, HP, time, lane, tipo, alvo, waypoint e agenda de ataque/percepção das creeps foram migrados para um `CreepComponentStore` com arrays tipados, crescimento geométrico, IDs de alvo internados e slots estáveis. As fachadas de objetos continuam disponíveis para IA, combate e replay, sem reconstrução objeto/array por tick.
- Movimento usa drafts e buffers reutilizados; dano, aggro, spawn, clone e materialização de planos sincronizam somente os componentes afetados. A auditoria também encontrou e corrigiu uma referência obsoleta que permitia à mesma creep atacar duas vezes em 132ms após uma troca do array de entidades.
- Em simulação pura, o pico de heap caiu de 147,8 MB para 132,7 MB (-10,2%). Sob `--trace-gc`, as pausas acumuladas caíram de 405,07ms para 368,19ms (-9,1%), apesar de uma pequena variação na quantidade de coletas.
- Com captura binária real do replay, a taxa da partida completa subiu de 157,9x para 162,8x (+3,1%). A candidata repetiu exatamente o modo de objetos: 46:37, vitória Dusk, 9-53 e digest `9b15acd1421f3008`.
- O replay completo, seek, inspector, painéis e mapa foram validados no navegador sem erros de console. Testes, lint e build ficaram verdes. Medições completas em `reports/creep-components-audit.json`.

---

### [x] T30 - Replay por trajetórias e cache endereçado por conteúdo

> Concluída em 2026-07-13 - O replay deixou de limitar o scheduler, passou a reconstruir movimento entre keyframes compactos e ganhou cache IndexedDB compatível por conteúdo.

**Objetivo**: reduzir custo e memória do replay e evitar recalcular partidas idênticas.

**Escopo**:
- Gravar segmentos de movimento e eventos, mantendo keyframes periódicos para seek.
- Reconstruir posições no player sem snapshots redundantes.
- Armazenar replays completos em IndexedDB por versão do motor, regras, seed, escalações e estratégias.

**Critérios**: seek e replay completos permanecem determinísticos; cache nunca reutiliza regras incompatíveis; memória fica abaixo do baseline binário atual.

**Resultado (2026-07-13)**:
- O Worker não oferece mais a próxima amostra visual como deadline da simulação. Keyframes são observacionais e irregulares; o player interpola trajetórias de Arcanes, creeps e chefe no tempo exato do cursor, mantendo eventos e atributos discretos no keyframe anterior.
- Metadados imutáveis de creeps (time, lane, tipo, HP máximo e alcance) passaram para um dicionário compartilhado. Payloads consecutivos de eventos/detalhes são referenciados sem nova serialização. No mesmo match da T29, o replay caiu de 85,2 MB para 79,3 MB (-6,9%); normalizado por segundo no caminho canônico, caiu 23,5%.
- A mediana de três partidas completas foi 9,56s wall / 12,08s CPU para 42:43 simulados: 268,0x wall / 212,2x CPU, digest `0870297d913be664`. Contra a T29, o ganho normalizado foi 64,6%; isolando o relógio no encoder novo, 207,3x -> 268,0x (+29,3%).
- Replays completos são salvos no IndexedDB por fingerprint estável de versão do motor/regras, seed, escalações e estratégias. A seed ativa permanece na sessão: reload da mesma partida reutilizou 17.320 keyframes e abriu o replay completo em menos de dois segundos. Mudanças de conteúdo ou compatibilidade produzem outra chave; o cache retém no máximo três partidas/220 MB.
- Navegador validado com seek ao resultado, vencedor correto, pós-jogo e retorno ao replay, sem erros de console. Testes cobrem fingerprint, incompatibilidade de regras, round-trip binário, deduplicação e interpolação de trajetórias. Dados completos em `reports/trajectory-replay-audit.json`.

---

### [x] T31 - Campos de ameaça sem alocações intermediárias

> Concluída em 2026-07-13 - Os cálculos de segurança dos Arcanes deixaram de criar arrays temporários para cada candidato avaliado.

**Objetivo**: reduzir o custo da IA dos Arcanes sem alterar decisões, resultados ou a cadência do simulador.

**Escopo**:
- Perfilar uma partida completa e localizar o custo dominante dentro de `updateArcaneMovement`.
- Remover cadeias `filter().reduce()` dos campos de perigo e ameaça sem mudar a ordem dos cálculos.
- Auditar índices e memoização por frame antes de adotá-los.
- Medir a partida canônica sem render e comparar digest, vencedor, placar e duração.

**Critérios**: ganho mensurável no benchmark completo; digest canônico preservado; testes, lint e build verdes.

**Resultado (2026-07-13)**:
- O perfil apontou `updateArcaneMovement` com 29,2% do tempo inclusivo e `getEnemyActionThreatScore` entre os principais custos próprios. Os dois campos de segurança agora percorrem torres, Arcanes, creeps, campos e aliados diretamente, sem arrays intermediários; a ordem de soma e todas as fórmulas foram preservadas.
- Índices compartilhados de Arcanes foram rejeitados porque atualizações transitórias durante o `.map` tornam referências anteriores obsoletas. Um índice persistente de creeps também foi rejeitado porque a coleção pode trocar membros mantendo referência e tamanho. Ambos foram removidos após o digest detectar a diferença.
- Em comparação A/B de três partidas no mesmo ambiente, a mediana caiu de 9,34s para 8,78s wall (-6,0%) e de 12,31s para 10,63s CPU (-13,6%). A taxa subiu de 274,4x para 291,9x wall e de 208,1x para 241,2x CPU.
- Os dois lados terminaram em 42:43, vitória Dusk, placar 14-50 e digest `0870297d913be664`. Dados completos em `reports/arcane-threat-hotpath-audit.json`.

---

### [x] T32 - Frames compartilhados de percepção da IA

> Concluída em 2026-07-13 - Cenários de combate e targeting de rota passaram a compartilhar dados estáveis dentro do frame sem alterar a partida.

**Objetivo**: eliminar reconstruções idênticas de dados dos Arcanes, visão e objetivos dentro do mesmo frame de IA.

**Escopo**:
- Preparar uma vez por atualização os descritores estáveis de prontidão, poder, resistência e movimento dos Arcanes.
- Reutilizar visibilidade de heróis e creeps por equipe entre encontros simultâneos.
- Manter dentro de cada encontro apenas os campos que dependem do tipo, centro ou torre daquele combate.
- Reutilizar candidatos de Arcanes e estruturas por time/rota entre creeps no mesmo frame.
- Comparar a partida canônica sem render contra o baseline controlado da T31: 8,78s wall / 10,63s CPU.

**Critérios**: digest, duração, vencedor e placar preservados; redução mensurável do custo de `enrichCombatScenarioBlackboards`; testes, lint e build verdes.

**Resultado (2026-07-13)**:
- Descritores de prontidão, poder, resistência e movimento dos Arcanes são preparados uma vez por atualização de combate. Visibilidade de heróis e creeps é reutilizada por equipe; apenas rotação e tank de torre continuam específicos do encontro.
- Creeps da mesma equipe/rota compartilham candidatos visíveis e objetivos estruturais no frame. O cache de Arcanes é renovado depois do movimento dos heróis; aggro explícito continua sendo validado individualmente.
- Contextos individuais reutilizam a seleção de creeps da própria rota e calculam GPM/contagem de luta sem arrays temporários. Uma tentativa de transportar o snapshot global através de `updateTeamPlans` alterou o digest e foi integralmente removida.
- Em três partidas A/B no mesmo ambiente, a mediana caiu de 10,18s para 9,93s wall (-2,5%) e de 12,80s para 12,22s CPU (-4,5%). As taxas subiram de 251,8x para 258,2x wall e de 200,2x para 209,7x CPU.
- O perfil reduziu o custo próprio de `getRouteCreepTarget` de 2,57% para 1,79%; `createPlayerAiContext` caiu de 6,49% para 6,09% e `updateCombatAiFoundation` de 11,40% para 10,90%.
- Baseline e candidata terminaram em 42:43, vitória Dusk, placar 14-50 e digest `0870297d913be664`. Dados completos em `reports/shared-ai-frame-audit.json`.

---

### [x] T33 - Targeting e invalidação seletiva de visão

> Concluída em 2026-07-13 - O combate deixou de consultar fog para alvos fora do alcance e de reconstruir toda a visão após dano não letal em creeps.

**Objetivo**: reduzir o custo dominante de visibilidade dentro de `resolveCombat` sem alterar informação disponível, seleção de alvo ou resultado da partida.

**Escopo**:
- Rejeitar candidatos fora do alcance antes de consultar fog of war, sem alterar desempates.
- Reutilizar a lista de skills do Arcane entre o gate de cooldown e a tentativa de cast.
- Invalidar provedores de visão de creeps apenas quando HP cruza para zero.
- Comparar a partida canônica sem render contra o commit da T32 no mesmo ambiente.

**Critérios**: digest, duração, vencedor e placar preservados; ganho mensurável no benchmark completo; testes, lint e build verdes.

**Resultado (2026-07-13)**:
- Buscas de alvo de ataque e skill agora descartam candidatos fora do alcance antes do fog. A seleção continua percorrendo os Arcanes na mesma ordem e preserva o desempate anterior.
- Dano parcial em creep conserva a grade de visão; somente a morte invalida o cache. Movimento, spawn e materialização tática continuam renovando os provedores normalmente. Um teste dedicado cobre dano não letal e morte.
- Quando o ataque básico ainda está em cooldown, o gate e o seletor de cast compartilham a mesma lista de skills runtime.
- Em três partidas A/B alternadas no mesmo ambiente, a mediana caiu de 13,05s para 12,79s wall (-2,0%) e de 17,30s para 17,11s CPU (-1,1%). A taxa subiu de 196,4x para 200,4x wall e de 148,1x para 149,8x CPU.
- No perfil, `isPointVisibleToTeam` caiu de 5,16% para 3,92% inclusivo, `nearestReachableEnemyArcane` de 1,21% para 0,29% e `resolveCombat` de 17,94% para 17,39%.
- Consultar buckets manualmente e construir os dois times em uma passagem ficaram cerca de 3-4% mais lentos no V8 e foram removidos. Baseline e candidata terminaram em 42:43, vitória Dusk, placar 14-50 e digest `0870297d913be664`.

---

### [x] T34 - Percepção incremental dos Arcanes

> Concluída em 2026-07-13 - Ameaça por ponto passou a ser compartilhada no frame e itens ativos deixaram de reconstruir percepção que não utilizam.

**Objetivo**: reduzir o custo de `updateArcaneMovement` compartilhando percepção exata dentro do frame e evitando trabalho que a ação avaliada não utiliza.

**Escopo**:
- Memoizar ameaça por Arcane e ponto durante o frame de decisão.
- Reutilizar perigo e inimigos visíveis entre decisão e avaliação de itens ativos.
- Avaliar aliados, perigo e alvos de itens somente para categorias que usam esses dados.
- Preservar cadência, alcance, prioridade e desempates da IA.

**Critérios**: digest, duração, vencedor e placar preservados; ganho total mensurável e queda nos custos de ameaça/contexto; testes, lint e build verdes.

**Resultado (2026-07-13)**:
- `TickFrameContext` agora memoiza o score exato de ameaça por Arcane e referência de ponto. Decisão principal, danger score, gank, rotate e initiate reutilizam o mesmo valor sem mudar alcance ou fórmula.
- A avaliação de itens ativos reutiliza perigo e inimigos já percebidos pela decisão. Aliados, perigo e alvos ofensivos só são calculados para tags que realmente dependem deles; seleção de item e desempates mantêm a ordem do inventário.
- Em três partidas A/B alternadas no mesmo ambiente, a mediana caiu de 14,64s para 13,97s wall (-4,6%) e de 19,02s para 18,34s CPU (-3,6%). A taxa subiu de 175,0x para 183,4x wall (+4,8%) e de 134,7x para 139,7x CPU (+3,7%).
- No perfil, `getDangerScore` caiu de 2,63% para 1,93% inclusivo, `applySimpleActiveItemIfNeeded` de 2,39% para 1,48%, `getSimpleActiveItemCandidate` de 2,08% para 1,29% e `queryCreepSpatialGridInto` de 5,32% para 4,68%.
- Reescrever os agregados do snapshot global com loops diretos ficou cerca de 5% mais lento no V8 e foi removido. O próximo gargalo isolado é `createAiGameSnapshot`, com aproximadamente 6,3% do perfil candidato.
- Baseline e candidata terminaram em 42:43, vitória Dusk, placar 14-50 e digest `0870297d913be664`.

---

### [x] T35 - Snapshot global por dependências reais

> Concluída em 2026-07-13 - O snapshot analisado agora atravessa cópias de estado cujas fontes reais permanecem idênticas, com invalidação explícita e telemetria opt-in no benchmark.

**Objetivo**: evitar reconstruções de `createAiGameSnapshot` causadas apenas por cópias de `SimulationState` que não alteram nenhuma entrada da análise.

**Escopo**:
- Reutilizar o estado analisado entre cópias com o mesmo runtime, tempo e fontes de snapshot.
- Invalidar por revisão espacial, entidades, efeitos, aura e boss.
- Preservar o cache local por objeto e toda a cadência de decisão existente.
- Rejeitar qualquer chave que altere o digest canônico.

**Critérios**: digest, duração, vencedor e placar preservados; queda mensurável de `createAiGameSnapshot`; testes, lint e build verdes.

**Resultado (2026-07-13)**:
- O cache por objeto continua sendo a primeira via. Uma segunda chave por `runtimeToken` reaproveita a análise somente quando tempo, revisão espacial, entidades, efeitos, auras e boss mantêm as mesmas referências.
- A partida de referência registrou 23.336 acertos locais, 1.643 acertos por dependência e 9.713 reconstruções. Isso evita 14,5% das construções de snapshot que ocorreriam sem a nova camada.
- Em três partidas A/B pareadas, a mediana caiu de 18,19s para 17,48s wall e de 22,27s para 21,48s CPU. A taxa subiu 4,1% wall e 3,7% CPU.
- Baseline e candidata terminaram em 42:43, vitória Dusk, placar 14-50 e digest `0870297d913be664`. O teste de regressão cobre tanto reutilização quanto invalidação por mudança de dependência.
- O acumulado estimado alcança 332,9x (2,91x T24), a aproximadamente 2,9% da meta da T28. Dados completos em `reports/dependency-analyzed-state-audit.json`.

---

## Histórico (não retrabalhar)

Concluído em rodadas anteriores — mantido aqui só como registro:

- **Input do mapa**: cliques unificados via hit-test no `.map-panel`; canvases com `pointer-events: none` (torres/camps/runas/creeps/boss selecionáveis de novo).
- **Render**: prune de posições visuais por-mapa (WeakMap) + prune do attack-range. DPR cap 2 foi implementado e **revertido** (stutter) — retorna só via T5.
- **IA rodada 1**: cache do snapshot analisado por tick; ruído humano interpolado por disciplina; `delaySeconds` aplicado ao `nextDecisionAt`; pesos de role só em score positivo; `matchSeed` para variedade entre partidas; remoção de constantes/campos mortos; eventos de memória agora emitidos (`failed_gank`, `lost_objective`, `won_fight`, `lost_fight`).
- **Bug crítico**: congelamento de arcanes ranged na base (chegada ao ponto de formação nunca disparava reconsideração) — corrigido com checagem do `formationPoint` + teto de hold de 6s (`maxDecisionHoldSeconds`).
- **IA rodada 2**: alvo de creep 1×/frame (`getCachedRouteCreepTarget`); grade espacial de creeps (targeting, `getDangerScore`, `shouldReconsiderArcaneDecision`); memo de `getPlayerAiProfile`; gate no `syncLanePathIndex`; fase de jogo nos planos (penalidade de push no laning + `hasHighValueObjectiveOpportunity` real); conversão de vantagem (lead relativo, power play com 2+ mortos, comeback com `comebackPatience`); `group_push` com alvo de lane via `getLaneWinAssessment`; janela de boss no call; memória de morte 240s→100s; `averageHealthPct` só com vivos; `gankRisk` do retreat 0.45→0.2.
- **Task descartada**: "sim num setInterval no main thread" (antiga R2) — superada pela T3, que resolve o mesmo problema de forma definitiva.
