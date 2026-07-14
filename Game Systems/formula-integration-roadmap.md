# Roadmap de Integracao de Formulas

## Objetivo

Transformar os arquivos de formulas em sistemas testaveis e visiveis na simulacao, mantendo cada bloco pequeno o bastante para balancear sem reescrever o jogo.

## Fase 1 - Fundacao Matematica

- [x] Criar `combatFormulas.ts` com armor, resistencia magica, critico esperado e pipeline basico de dano.
- [x] Criar `nonCombatFormulas.ts` com tempo, ouro passivo, XP, respawn, regen e probabilidades de serie.
- [x] Criar `effectFormulas.ts` com duracao de buffs/debuffs, resistencias, dispel, barreiras, DoT/HoT e stacks.
- [x] Criar `spellFormulas.ts` com projectile travel, uptime, casts por minuto, talento de cooldown e valor de ativo.
- [x] Criar `structureFormulas.ts` com dano em estruturas, armor, backdoor e tempo esperado para destruir.
- [x] Criar `visionFormulas.ts` com ciclo dia/noite, alcance atual, smoke break e score de visao.
- [x] Criar `laneControlFormulas.ts` com lane equilibrium, aggro e chance de vencer lane.
- [x] Criar `unitControlFormulas.ts` com ilusoes, summons e multiplicador de micro.
- [x] Criar `decisionFormulas.ts` com chance de decisao e valor esperado de objetivo.
- [x] Criar `ratingFormulas.ts` com Elo, BO3/BO5 e confianca por tamanho de amostra.
- [x] Adicionar testes unitarios para formulas de combate.
- [x] Adicionar testes unitarios para formulas fora de combate.
- [x] Adicionar testes unitarios para formulas de efeitos favoraveis/adversos.
- [x] Adicionar testes unitarios para formulas de spells, estruturas, visao, lane, unidades, decisao e rating.

## Fase 2 - Simulacao Visivel Atual

- [x] Aplicar armor em dano fisico contra Arcanes.
- [x] Aplicar XP por tabela acumulada.
- [x] Aplicar respawn por tabela.
- [x] Aplicar ouro passivo por minuto.
- [x] Aplicar intervalos configuraveis de wave, selva e boss.
- [x] Aplicar regeneracao via formula.
- [x] Aplicar kill gold, assist gold, kill XP e death gold loss.
- [x] Aplicar ciclo dia/noite via formula de visao.
- [x] Aplicar armor e protecao de backdoor em dano contra torres/base.
- [x] Adicionar barracas melee/ranged, T4 e nucleo como camada de objetivos.
- [x] Aplicar unlock de objetivos: T3 libera barracas, T3 de todas as lanes libera T4, T4 libera nucleo.
- [x] Aplicar upgrade simplificado de creeps por barraca destruida e mega creeps quando todas cairem.
- [x] Separar dano fisico, magico e puro por fonte.
- [x] Aplicar resistencia magica em fontes magicas.
- [x] Aplicar damage block/barriers quando existirem itens/skills ativos.
- [x] Carregar status resistance e slow resistance nos stats dos Arcanes.
- [x] Criar modelo `TimedEffect` no estado da simulacao.
- [x] Aplicar duracao de debuffs com status resistance.
- [x] Aplicar slows com slow resistance no movimento.
- [x] Aplicar buffs/debuffs de armor, dano, movimento e attack speed como modificadores.
- [x] Aplicar DoT/HoT por tick.
- [x] Aplicar barreiras antes do dano entrar no HP.
- [x] Aplicar dispel basico/forte.
- [x] Mostrar badges/overlays de stun, slow, silence, buff e barrier no mapa.
- [ ] Aplicar projectile travel time em efeitos de ataque/spell quando existirem projeteis reais.
- [ ] Aplicar uptime/casts per minute no cooldown de skills e itens ativos.
- [ ] Aplicar active item value na IA de compra/uso de itens.
- [x] Integrar consumiveis basicos de vida/mana dos item seeds com compra na base, uso automatico e visual no HUD/inspetor.
- [ ] Expandir consumiveis para wards, smoke, dust, TP, bottle e comandos de mapa.
- [x] Aplicar summons ativos como entidades de combate separadas.
- [ ] Especializar ilusoes, wards, clones, summons persistentes e gatilhos passivos.
- [ ] Aplicar micro performance em controle de summons e clones.

## Fase 3 - Economia e Mapa

- [x] Net worth por Arcane e por equipe.
- [x] Bounty/comeback por diferenca de net worth em kill gold e assist gold. XP comeback ja estava aplicado.
- [x] Runes: bounty, power, wisdom e lotus.
- [x] Stacks de jungle e valor esperado por stack.
- [ ] Buyback: custo, cooldown e penalidade de respawn.
- [ ] Death gold loss confiavel/nao confiavel quando o modelo de carteira existir.
- [ ] Sistema de fog of war com celulas de mapa e vision score por equipe.
- [ ] Smoke/invisibility com break radius, revelacao por sentry e comportamento da IA.
- [ ] Lane equilibrium persistente por rota, influenciando pathing, farm e pressao de torre.
- [ ] Aggro de lane completo por prioridade de alvo, reset e manipulacao de wave. Parcial: deny de creep aliada abaixo de 50% com marcador visual.
- [x] Backdoor protection visual no minimapa/HUD quando uma estrutura estiver protegida.
- [x] Importar `moba_unit_and_structure_seeds_dota_like.txt` para `src/data/unitSeeds.ts` com adapter real.
- [x] Substituir numeros hardcoded de creeps/estruturas pelos seeds de unidade. Posicoes do mapa continuam customizadas no LOTA.
- [x] Adicionar glyph/fortification automatico para estruturas, com cooldown, reducao de dano, evento e indicador visual.
- [ ] Adicionar shrines/outposts/lotus/wisdom/wards como entidades de mapa quando o escopo visual pedir.

## Fase 4 - IA Usando Formulas

- [ ] Decisao de fight baseada em expected value de kill/assist/death.
- [x] Decisao de objetivo baseada em valor esperado de torre, boss e mapa.
- [x] Decisao de farm baseada em tempo ate item.
- [x] Decisao de defesa baseada em net worth em risco e dano esperado na base.
- [x] Decisao de boss usando custo esperado de vida/tempo versus aura/recompensa.
- [ ] IA considerar controle ativo: stunned/silenced/rooted/disarmed. Parcial: stun ja bloqueia movimento e ataque; silence ja aparece no estado visual.
- [ ] IA valorizar alvo com debuff forte ativo.
- [x] IA usar `decisionChance` para reduzir decisoes deterministicas demais.
- [x] IA usar `objectiveConversionValue` para comparar torre, boss, base, defesa e pickoff.
- [x] IA recusar troca de base quando o valor esperado de defesa for maior que o race inimigo.
- [x] IA considerar backdoor protection antes de chamar objetivo em T2/T3/base.
- [x] IA usar lane win chance para escolher ajuda, troca de lane ou pressao cruzada.

## Fase 5 - Arquitetura Utility AI

Base: `moba_manager_ai_design_codex.txt`.

Objetivo: migrar a IA atual de `updateArcaneMovement`/`createTeamCall` para uma arquitetura em camadas, sem reescrita total imediata.

- [x] Criar `src/ai/types/aiTypes.ts` com `TeamPlan`, `PlayerModeScore`, `BotAction`, perfis de time e perfis de jogador.
- [x] Criar `src/ai/config/aiConstants.ts` com stickiness, noise, memoria, execution e pesos por role.
- [x] Criar `GameStateAnalyzer` simples reaproveitando dados atuais: fase, vida/mana media, vivos/mortos, net worth aproximado, vantagem numerica, pressao de lane, perigo, objetivos e visao.
- [x] Criar `TeamBrain` inicial para gerar planos: `farm_map`, `group_push`, `defend_tower`, `take_boss`, `avoid_fight`, `defend_high_ground`, `end_game`.
- [x] Migrar gradualmente `createTeamCall` para usar `TeamBrain`, mantendo fallback na chamada atual.
- [x] Criar `PlayerAgent` inicial para pontuar modos: `retreat`, `farm_lane`, `farm_jungle`, `join_fight`, `save_ally`, `finish_enemy`, `take_objective`, `push_lane`.
- [x] Migrar gradualmente o bloco de `if/else` de `updateArcaneMovement` para `PlayerAgent`, mantendo o movimento/ataque atual.
- [x] Adicionar hysteresis de modo para impedir troca de decisao a cada tick.
- [x] Adicionar role weights para Safe Lane, Mid, Offlane, Greedy Support e Dedicated Support.
- [x] Adicionar perfis de personalidade: agressividade, disciplina, ganancia, obediencia a calls, playmaking, save ally e tilt.
- [x] Adicionar decision noise escalado por disciplina/tilt para a IA nao parecer perfeita.
- [x] Criar `ExecutionModel` simples com sucesso/falha, delay e falhas como overcommit, panic_retreat, wrong_target e late_reaction.
- [x] Criar `MemorySystem` curto para mortes recentes e areas perigosas.
- [ ] Expandir `MemorySystem` para ganks falhos, objetivos perdidos, fights vencidas/perdidas e danger spikes sem morte.
- [x] Criar testes unitarios para TeamBrain escolher boss com visao/vantagem e evitar highground arriscado.
- [x] Criar testes unitarios para PlayerAgent: carry farma item quase pronto, suporte prioriza save/ward, jogador agressivo persegue mais, disciplinado recua mais cedo.
- [x] Expor no inspetor do Arcane: plano do time, modo individual, acao escolhida, razoes principais e chance de execucao.
- [x] Adicionar estilos de time: balanced, aggressive, methodical, greedy, pickoff, teamfight, split_push, objective_focused, defensive e chaotic.
- [ ] Adicionar heatmaps posteriores: danger, farm value, vision value, objective value e enemy probability.
- [ ] Integrar fog inference, wards/dewards, smoke e missing enemy threat quando o sistema de visao estiver pronto.
- [ ] Integrar cooldowns, ultimates, buyback, item timings e draft identity quando esses sistemas existirem.

## Fase 6 - Manager

- [ ] Mastery/hero pool por jogador.
- [ ] Fadiga, moral e forma.
- [ ] Sinergia por lane e por time.
- [ ] Treino, scrim e ganho de atributos gerenciais.
- [ ] Scouting e draft scoring.
- [ ] Probabilidade de serie BO3/BO5 em campeonatos.
- [ ] Rating Elo/Glicko-like por time, jogador e treinador.
- [ ] Confianca por sample size para estatisticas de jogador, heroi e draft.
- [ ] Talentos/upgrades por Arcane usando impacto esperado de spell e cooldown.

## Politica De Integracao

1. Cada formula nova entra primeiro em modulo testavel.
2. Depois entra em uma superficie visivel da simulacao.
3. A UI mostra o resultado sem expor conta demais.
4. Balanceamento fica em constantes, nao espalhado pelo loop.
