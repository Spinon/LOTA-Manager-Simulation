# Task: Correções de renderização e input do mapa

**Projeto:** `C:\Users\Spynon\Documents\LOTA-Manager Simulation` — simulador de MOBA em React 19 + Vite + TypeScript. Toda a renderização vive em `src/App.tsx` (~8400 linhas) e os estilos em `src/App.css`.

## Contexto da renderização

O mapa (`.map-panel`, quadrado, coordenadas em % de 0–100) usa camadas empilhadas: SVG de fundo (z2), `attack-range-canvas` (z3, pointer-events none), `creep-canvas` (z3, clicável), botões DOM de torres/camps/runas (`.map-node`, `.camp-node`, `.rune-node`, z4), `fx-canvas` (z6, pointer-events none), `boss-canvas` (z6, clicável), `arcane-canvas` (z7, clicável). Cada camada de canvas tem seu próprio loop de `requestAnimationFrame` e seu próprio `onClick` com hit-test por proximidade (função `nearest`). A simulação avança dentro de um rAF no componente principal (função `animate`, ~linha 5906), com `simulationFrameSeconds = 1/60`, clamp `maxFrameElapsedSeconds = 0.12` e snapshot de UI a cada 0.5s.

## Tarefas, em ordem de prioridade

### 1. BUG — cliques do mapa engolidos pelo `arcane-canvas` (corrigir primeiro)

O `arcane-canvas` (z7, pointer-events ativo) cobre o mapa inteiro e fica acima dos botões DOM (z4), do `boss-canvas` e do `creep-canvas`. Resultado verificado com `document.elementFromPoint`: cliques em torres, camps, runas, creeps e boss atingem o `arcane-canvas` e são descartados — só arcanes são selecionáveis no mapa.

Correção esperada:

- Colocar `pointer-events: none` em TODOS os canvases do mapa (`.creep-canvas`, `.arcane-canvas`, `.boss-canvas`) no `App.css`.
- Remover os `handleClick` individuais de `CreepCanvasLayer`, `ArcaneCanvasLayer` e `BossCanvasLayer`.
- Criar um único handler de clique no `<section className="map-panel">` (componente `MapPanel`, ~linha 6188) que converta o clique para coordenadas de mapa (0–100, usando `getBoundingClientRect`) e faça hit-test unificado com prioridade: arcane vivo (raio 3.2) → boss vivo (raio 4.2) → creep (raio 2.4). Usar `stateRef.current` para o estado atual (os dados vivos ficam no ref, não no state React). Arcanes vivos = `arcane.respawn <= state.time && arcane.stats.hp > 0`; boss clicável = `boss.hp > 0 && boss.respawn <= state.time`.
- Os botões DOM (torres/camps/runas/bases) continuam funcionando nativamente — não mexer neles. Importante: o clique nos botões NÃO deve também disparar o handler da section e trocar a seleção (checar `event.target` ou parar a propagação nos botões).

### 2. BUG — simulação acoplada ao rAF

Com a aba oculta o navegador reduz o rAF a ~1–2 fps e o clamp de 0.12s faz o jogo rodar a ~12–24% da velocidade (verificado: relógio da partida praticamente congela com `document.hidden`). Corrigir desacoplando o passo da simulação do desenho: mover o stepping do `animate` (~linha 5906) para um `setInterval` (ou timer em Web Worker) que continue avançando com a aba oculta, mantendo o rAF apenas para desenho. Preservar o comportamento atual de `speed`, `decisionGateSeconds`, clamp de steps por frame (`getMaxSimulationStepsPerFrame`) e snapshot de UI a 0.5s.

### 3. BUG — gate de prune global compartilhado

`nextVisualPruneAt` (~linha 6432) é variável de módulo usada por `pruneVisualPositionsOccasionally`, chamada pelas camadas de creep e arcane com Maps diferentes. A camada de creep desenha primeiro e sempre vence o gate, então o Map de arcanes nunca é podado. Tornar o gate por-mapa (ex.: guardar o timestamp dentro de uma estrutura por camada, ou um `WeakMap<Map, number>`). Aproveitar e podar também o Map do `AttackRangeCanvasLayer` (entradas `range-*` nunca são removidas).

### 4. MELHORIA — nitidez em HiDPI (REVERTIDA — só refazer depois da task 2)

Subir `maxCanvasDevicePixelRatio` de 1 para 2 foi implementado e **revertido**: quadruplicar o raster dos 5 canvases reintroduziu stutter (o frame drop vira lentidão da simulação enquanto ela estiver acoplada ao rAF — movimento acelera, lentifica, dá uma parada e retoma). Só reimplementar DEPOIS da task 2 (sim fora do rAF), e de forma adaptativa: começar em DPR 2 e cair para 1 automaticamente se o FPS médio ficar abaixo de ~50 por alguns segundos.

### 5. MELHORIA — parar de redesenhar quando nada muda

Com a partida pausada, as 5 camadas de canvas continuam limpando e redesenhando a cada frame. Adicionar early-out barato (ex.: comparar `state.time` + id de seleção com os do último frame desenhado; redesenhar também em resize).

## Restrições e verificação

- Não alterar lógica de simulação/gameplay; só renderização e input.
- Manter o estilo do código existente (funções no próprio App.tsx, sem criar libs novas).
- Rodar `npm run lint` e `npm run build` ao final — ambos devem passar.
- Testar manualmente com `npm run dev`: clicar em torre, camp, runa, creep, arcane e boss no mapa deve selecionar e abrir o inspector de cada um; a seleção com Escape/botão "Limpar" deve continuar funcionando; com a partida em 2x/4x/8x o movimento deve continuar suave; minimizar a aba por 10s e voltar — o relógio da partida deve ter continuado avançando.
