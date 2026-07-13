# Referencia de balanceamento de GPM

Atualizado em 2026-07-12.

## Base externa

- Regras e valores de unidades continuam derivados dos dados oficiais importados e das notas de gameplay do Dota 2: https://www.dota2.com/patches
- Amostra competitiva: 24 partidas profissionais recentes obtidas em `https://api.opendota.com/api/proMatches` e detalhadas por `https://api.opendota.com/api/matches/{match_id}`.
- Filtro: partidas entre 20 e 90 minutos, 240 jogadores. Duracao mediana: 43,7 minutos.
- Como os replays nem sempre rotulam a posicao, os cinco jogadores de cada equipe foram ordenados por GPM. Essa ordem e uma aproximacao economica, nao uma identificacao de role.

| Rank economico no time | P25 | Mediana | P75 | Media |
| --- | ---: | ---: | ---: | ---: |
| 1 | 670 | 760 | 847 | 761 |
| 2 | 556 | 649 | 713 | 643 |
| 3 | 484 | 593 | 635 | 567 |
| 4 | 312 | 365 | 405 | 367 |
| 5 | 281 | 317 | 363 | 318 |

Metas de 40 minutos adotadas: HC 760, Mid 650, Offlane 590, Support 4 365 e Support 5 317 GPM. A curva interna interpola checkpoints de 6/10/20/40/60 minutos; ela orienta decisoes, mas nunca concede ouro diretamente.

## Diagnostico da simulacao

Baseline de duas partidas antes desta passada, aos 40 minutos: HC 331, Mid 271, Offlane 275, Support 4 289 e Support 5 261 GPM. O problema principal nao era a recompensa basica das creeps, que ja estava proxima dos dados oficiais, mas baixa conversao do mapa em farm:

- cores abandonavam waves por foco coletivo, ganks e chamadas de baixo valor;
- uma skill ofensiva podia consumir a janela de last hit;
- expectativas antigas de item timing assumiam somente 430/390/330 GPM para os cores;
- waves nao recebiam melees adicionais aos 15/30/45 minutos;
- o bonus em area do flagbearer estava catalogado, mas nao era pago.

## Ajustes desta passada

- Necessidade economica individual por role e minuto passou a reforcar lane/jungle/push e a reduzir lutas/objetivos de baixo valor.
- Times com os tres cores atrasados adotam `farm_map` e cancelam chamadas antigas, preservando defesa urgente e finalizacao real.
- Last hit alcancavel tem prioridade em modo de farm/controle e nao e perdido para cast ofensivo.
- Lane trade ou jungle skirmish segura nao sequestra automaticamente um core atrasado.
- Waves ganham um melee adicional aos 15, 30 e 45 minutos.
- Flagbearer concede os 10 de ouro em area definidos no dado importado.

## Proximas medicoes

- Rodar lotes maiores, separados por duracao, e comparar GPM por role aos 10/20/40 minutos.
- Reduzir mortes repetidas e snowball de lado; GPM baixo de cores mortos nao deve ser mascarado por multiplicador de bounty.
- Auditar rotas de jungle e tempo ocioso entre camps para elevar CS/clear dos tres cores.
- Calibrar assistencias e ouro de estruturas contra replays profissionais depois que o farm de unidades convergir.
