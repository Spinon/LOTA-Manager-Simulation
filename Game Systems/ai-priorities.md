# IA, Prioridades e Fases de Jogo

## Modelo Geral

Cada Arcane escolhe o proximo passo por prioridade. A decisao e recalculada periodicamente, enquanto o movimento ate o alvo e continuo.

A IA considera:

- fase do jogo;
- role;
- rota;
- vida;
- mana;
- posicao;
- visao compartilhada do time;
- perigo local;
- torres inimigas;
- creeps;
- aliados em risco;
- objetivos de mapa;
- chamadas de time;
- agressividade;
- shotcalling.

## Roles Atuais

Roles de partida:

- Safe Lane;
- Mid;
- Offlane;
- Greedy Support;
- Dedicated Support.

Tendencias atuais:

- Offlane tem mais agressividade e pode iniciar lutas.
- Mid tem agressividade media e pode rotacionar para side lanes.
- Safe Lane prioriza patrimonio e seguranca.
- Greedy Support tem mais liberdade para gank e selva.
- Dedicated Support tem mais shotcalling e defesa de aliados.

## Ordem Geral de Prioridade

A ordem atual, simplificada:

1. Ficar na base para regenerar/comprar quando necessario.
2. Recuar por vida baixa ou perigo alto.
3. Sair do alcance de torre quando o dive nao e seguro.
4. Defender aliado em risco.
5. Initiate, se for Offlane no mid/late e houver follow-up.
6. Responder chamada de time no mid/late.
7. Gank, especialmente Greedy Support no early.
8. Rotate / Help Sidelanes, especialmente Mid no early/mid.
9. Pressionar inimigo vulneravel proximo.
10. Farmar wave.
11. Limpar campo neutro.
12. Bater torre com wave aliada.
13. Acumular patrimonio na rota.
14. Acumular patrimonio na selva.
15. Escoltar creeps aliadas quando o avanco esta bloqueado.
16. Aguardar wave aliada.
17. Respeitar rota no early.
18. Avancar rota.

## Early Game

Foco:

- fase de rotas;
- acumulo de patrimonio;
- preparacao de build;
- respeito maior a lane assignment;
- suportes com leash mais flexivel.

O leash de rota nao e regra absoluta. Ele altera prioridades.

### Gank

Prioridade mais prevalente nos Greedy Supports.

Conds atuais:

- apenas no Early Game;
- alvo visivel;
- alvo em outra rota;
- Arcane com vida e mana suficientes;
- distancia de viagem aceitavel;
- sem dive inseguro em torre;
- sem entrar fundo demais no territorio inimigo;
- alvo vulneravel ou com aliado proximo aumenta score.

Dedicated Support pode gankar, mas com menos peso. Mid tem chance baixa dentro desse mesmo avaliador.

### Rotate / Help Sidelanes

Prioridade do Mid no Early/Mid Game.

Conds atuais:

- Mid vivo, com vida e mana suficientes;
- alvo visivel em side lane;
- distancia razoavel;
- sem dive inseguro;
- aliado perto do alvo, alvo vulneravel ou pressao de wave aumentam score.

Chip exibido: `Rotate`.

## Mid Game

Foco:

- lutas em equipe;
- avancar rotas;
- conquistar objetivos;
- chamadas de time.

### Chamar o Time

Prioridade mais forte nos suportes, principalmente Dedicated Support.

O caller tenta convencer aliados a juntarem para:

- levar torre;
- matar o chefe;
- encontrar inimigo vulneravel e abrir espaco.

Aliados passam a priorizar:

- juntar com o time;
- fazer objetivo.

## Late Game

Foco:

- builds avancadas/finalizadas;
- avancar rotas;
- pickoff;
- finalizar partida.

### Initiate

Prioridade do Offlane no Mid/Late Game.

Conds atuais:

- Offlane vivo;
- vida suficiente;
- pelo menos dois aliados proximos para acompanhar;
- inimigo visivel em alcance razoavel;
- inimigos agrupados aumentam score;
- aliados perto do alvo aumentam score;
- perigo extremo reduz ou bloqueia a decisao.

Chip exibido: `Initiate`.
