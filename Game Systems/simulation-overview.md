# Visao Geral da Simulacao

## Estado da Partida

O estado central da partida contem:

- tempo de jogo;
- proxima onda de creeps;
- placar de abates;
- vencedor, quando uma base cai;
- chamadas de time;
- auras temporarias de equipe;
- log de eventos;
- efeitos visuais de ataque;
- marcadores de morte;
- Arcanes;
- creeps de rota;
- torres;
- bases;
- campos neutros;
- chefe do mapa.

## Loop

A partida inteira e pre-calculada em um Web Worker antes da arena ser liberada. A simulacao usa passo fixo de 30 Hz; o `requestAnimationFrame` pertence somente ao playback e nunca controla regras, movimento ou IA.

O gate tatico materializa posicoes e atualiza percepcao a 10 Hz. Cada Arcane conserva seu proprio scheduler de decisao, normalmente entre 0,28s e 1,8s conforme role, modo e atributos. Nos frames intermediarios, uma via cinematica aplica apenas movimento e regeneracao usando o ultimo destino autorizado pela IA.

Fora de combate, deslocamentos estaveis para base, lane, objetivo ou formacao podem virar `ArcaneTravelPlan`: origem, destino, velocidade, chegada e deadline da proxima decisao. O replay amostra esse segmento diretamente, enquanto dano, controle, perigo visivel, mudanca de call ou de decisao materializam e cancelam o plano imediatamente.

Sequencia atual do tick:

1. Avanca o tempo.
2. Spawna ondas se chegou no tempo da proxima wave.
3. Limpa efeitos visuais expirados.
4. Limpa marcadores de morte expirados.
5. Limpa auras expiradas.
6. Atualiza ciclo dia/noite e visao dos Arcanes.
7. Respawna Arcanes prontos.
8. Respawna campos neutros prontos.
9. Atualiza o chefe.
10. Materializa trajetorias e coleta ativacoes taticas no gate de 10 Hz.
11. Atualiza chamadas de time quando ha decisao.
12. Atualiza movimento/decisao dos Arcanes.
13. Atualiza movimento das creeps de rota.
14. Resolve hitboxes, combate e eventos criticos.
15. Resolve mortes, recompensas, respawn e level up.
16. Verifica vitoria pela queda da base.

## Fases de Jogo

- **Early Game**: antes de 8:00. Prioridade de rotas, patrimonio, ganks e rotacoes pontuais.
- **Mid Game**: 8:00 ate 24:00. Mais chamadas de time, objetivos, rotacoes e lutas.
- **Late Game**: apos 24:00. Objetivos de finalizacao, pickoffs, avancos e iniciacoes mais decisivas.

## Dia e Noite

O ciclo alterna a cada 5 minutos de partida.

- Dia: usa o valor de visao diurna do Arcane.
- Noite: usa o valor de visao noturna do Arcane.

Esses valores vem do sistema de atributos e sao convertidos para a escala visual do mapa.
