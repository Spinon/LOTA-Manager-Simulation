# Programa de performance da simulação

Este documento registra o diagnóstico, as metas e a ordem técnica da nova fase de otimização. A fila executável continua em `tasks/TASKS.md`; cada rodada implementa apenas a primeira task aberta daquele arquivo.

## Baseline de 2026-07-11

- Pré-cálculo completo: aproximadamente 60 segundos para 50 minutos de jogo nesta estação, com variação relevante por carga.
- Perfil do Worker: combate 37,5%; movimento/decisão dos Arcanes 28%; creeps/targeting 12,4%; colisão 2,2%.
- Render em 1440x1000: 53-54 FPS; cinco canvases somaram aproximadamente 4% de CPU, React aproximadamente 23%.
- Heap após 15.001 frames: aproximadamente 305 MB.
- DPR solicitado 2, mas o fallback adaptativo caiu para 1 durante o teste.

## Metas globais

1. Preservar determinismo por `matchSeed`; otimizações sem mudança intencional de regra devem manter o mesmo digest final.
2. Pré-calcular 50 minutos em até 40 segundos nesta estação de referência.
3. Sustentar 58-60 FPS em 1x e 16x com DPR 2, sem reduzir a qualidade visual.
4. Manter p95 de frame abaixo de 16,7ms e heap do replay abaixo de 200 MB.
5. Validar cada etapa com `npm test`, `npm run lint`, `npm run build` e benchmark correspondente.

## Etapas

### P1 / T8: benchmark e caches puros

Status: concluída em 2026-07-11. No cenário de 180s, a mediana caiu de 12,78s wall / 8,19s CPU para 9,03s wall / 5,67s CPU; digest `2b7432ccfc848dee` preservado.

- Criar benchmark determinístico do caminho do Worker, incluindo frames e clonagem em lotes.
- Cachear perfis derivados de skills por definição+nível.
- Cachear modificadores passivos por herói+objeto de níveis de skill.
- Registrar baseline, resultado e digest para impedir regressão funcional.

### P2 / T9: índices do tick e dano direcionado

Status: concluída em 2026-07-11. Índices por id e time, efeitos agrupados por alvo, catálogos de itens indexados e atualização direcionada de dano reduziram `resolveCombat` de aproximadamente 37,5% para 26,2% do perfil. No benchmark curto, a CPU permaneceu estável (5,25s antes; 5,27s depois) e o digest `2b7432ccfc848dee` foi preservado.

- Indexar entidades por id, time e lane uma vez por tick.
- Agrupar efeitos temporários por alvo.
- Remover filtros repetidos nos loops de combate e movimento.
- Atualizar somente a coleção do alvo em `damageEntity`, sem mapear todas as entidades a cada hit.

### P3 / T10: desacoplar canvas e painéis React

- Canvas consome movimento compacto sem hidratar `SimulationState` completo.
- Relógio, placar, equipes e inspector recebem cadências independentes.
- Memoizar componentes densos e evitar render da árvore inteira a cada atualização visual.

### P4 / T11: scheduler único de render

- Substituir os loops rAF independentes por um scheduler compartilhado.
- Remover chaves de desenho baseadas em arrays/strings por revisão numérica.
- Compartilhar viewport e DPR por frame.
- Consolidar unidades em um canvas e manter FX separado, preservando ordem visual.

### P5 / T12: scheduler de combate

- Manter alvo enquanto válido e registrar o próximo instante relevante de ataque/skill.
- Evitar reconstruir todos os candidatos quando nenhuma ação pode ocorrer.
- Preservar precisão temporal, prioridade de last hit/deny e determinismo.

### P6 / T13: replay binário e memória

- Armazenar canais numéricos em typed arrays por blocos.
- Dicionarizar strings e transferir blocos com `ArrayBuffer` transferível.
- Manter seek, inspector e reprodução completa sem depender do Worker após o carregamento.

## Fora de prioridade

- WebGPU para IA: fluxo muito ramificado e pouco adequado a processamento vetorial.
- OffscreenCanvas antes de reduzir React e coordenação: o desenho bruto não é o gargalo atual.
- Reduzir Hz ou precisão da simulação antes das otimizações estruturais acima.
