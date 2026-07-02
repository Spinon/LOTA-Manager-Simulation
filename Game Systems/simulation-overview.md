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

O jogo avanca por `requestAnimationFrame`.

O movimento e continuo e usa o delta real do frame. As decisoes de IA sao avaliadas em intervalos de aproximadamente 0,5s. Isso evita movimento truncado sem fazer a IA recalcular tudo a cada frame.

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
10. Atualiza chamadas de time quando ha decisao.
11. Atualiza movimento/decisao dos Arcanes.
12. Atualiza movimento das creeps de rota.
13. Resolve combate.
14. Resolve mortes, recompensas, respawn e level up.
15. Verifica vitoria pela queda da base.

## Fases de Jogo

- **Early Game**: antes de 8:00. Prioridade de rotas, patrimonio, ganks e rotacoes pontuais.
- **Mid Game**: 8:00 ate 24:00. Mais chamadas de time, objetivos, rotacoes e lutas.
- **Late Game**: apos 24:00. Objetivos de finalizacao, pickoffs, avancos e iniciacoes mais decisivas.

## Dia e Noite

O ciclo alterna a cada 5 minutos de partida.

- Dia: usa o valor de visao diurna do Arcane.
- Noite: usa o valor de visao noturna do Arcane.

Esses valores vem do sistema de atributos e sao convertidos para a escala visual do mapa.
