# LOTA Manager Simulator

LOTA, ou **Legends of the Arcane**, e um simulador de manager/coach de uma equipe de MOBA inspirado pela logica de progressao e gestao de jogos como Elifoot.

O foco inicial do projeto e construir um jogo web de gestao: calendario, elenco, staff, mercado, diretoria, campeonatos, roster de herois/itens e uma simulacao de partidas que evoluira para um minimapa em tempo real.

## Stack

- React
- TypeScript
- Vite
- Zustand para estado local futuro
- Recharts para visualizacao de estatisticas
- Lucide React para iconografia

## Scripts

```bash
npm install
npm run dev
npm run build
npm run lint
npm run check:sync
```

## Codex startup sync check

Before starting work in a new Codex session, run:

```bash
npm run check:sync
```

The command fetches `origin`, compares the current branch with its upstream, and reports whether the local branch is up to date, behind, ahead, or diverged.

## Repositorio remoto

Este workspace esta configurado com o remoto:

```bash
origin https://github.com/Spinon/LOTA-Manager-Simulation.git
```

## Direcao inicial

A primeira tela ja nasce preparada para login/senha futuro, mas o desenvolvimento deve priorizar o **modo local com save/load** antes de qualquer autenticacao real.

Veja o planejamento detalhado em [ROADMAP.md](./tasks/ROADMAP.md).
