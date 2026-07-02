# LOTA Manager Simulation - Game Systems

Este diretorio guarda os guias de sistema do simulador. A ideia e servir como memoria tecnica e de design para iteracoes futuras.

## Guias

- [Visao Geral da Simulacao](./simulation-overview.md)
- [Mapa, Rotas e Objetivos](./map-and-objectives.md)
- [Arcanes, Atributos e Progressao](./arcanes-attributes-progression.md)
- [IA, Prioridades e Fases de Jogo](./ai-priorities.md)
- [Combate, Economia e Morte](./combat-economy-death.md)
- [Visao, Perigo e Fog of War](./vision-danger-fog.md)
- [Interface e Feedback Visual](./ui-feedback.md)

## Fonte atual

O simulador principal esta implementado em `src/App.tsx`.

O sistema formal de atributos esta implementado em `src/game-systems/heroAttributes.ts` e foi criado a partir do PDF `Sistema de Atributos para Simulador de MOBA.pdf`.

## Convencoes

- Herois/campeoes deste MOBA sao chamados de **Arcanes**.
- O jogo simulado e **assistivel**: o jogador participa principalmente da selecao de Arcanes e de ajustes estrategicos entre partidas/series.
- A partida padrao e **5v5**.
- A simulacao visual roda em tempo real com movimento continuo, enquanto as decisoes da IA rodam em janelas de decisao.
- Habilidades ainda ficam para uma etapa posterior.
