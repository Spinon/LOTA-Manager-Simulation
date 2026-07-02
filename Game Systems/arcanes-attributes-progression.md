# Arcanes, Atributos e Progressao

## Conceito

Os herois/campeoes deste MOBA sao chamados de **Arcanes**.

Cada Arcane tem:

- equipe;
- jogador;
- nome do Arcane;
- role;
- rota;
- retrato;
- posicao;
- alvo de movimento;
- nivel;
- XP;
- ouro;
- itens;
- vida;
- mana;
- dano;
- alcance;
- intervalo de ataque;
- velocidade de movimento;
- visao;
- agressividade;
- shotcalling;
- decisao atual.

## Sistema de Atributos

O sistema formal fica em `src/game-systems/heroAttributes.ts`.

O PDF original esta em `Game Systems/Sistema de Atributos para Simulador de MOBA.pdf`.

Atributos principais:

- Strength;
- Agility;
- Intelligence;
- Universal.

Subatributos calculados:

- vida maxima;
- regeneracao de vida;
- mana maxima;
- regeneracao de mana;
- dano minimo;
- dano maximo;
- dano medio;
- velocidade de ataque;
- ataques por segundo;
- alcance de ataque;
- alcance de aquisicao;
- armadura;
- reducao fisica;
- resistencia magica;
- resistencia a status;
- resistencia a slow;
- evasao;
- bloqueio de dano;
- velocidade de movimento;
- turn rate;
- tamanho de colisao;
- visao diurna;
- visao noturna.

## Conversao para a Simulacao

Os valores do sistema de atributos sao convertidos para escala de mapa:

- alcance de ataque: `attackRange / 100`;
- visao: `dayVision / 100` ou `nightVision / 100`;
- velocidade de movimento: `movementSpeed / 45`;
- intervalo de ataque: `1 / attacksPerSecond`.

## Level Up

O XP necessario atual e `level * 100`.

Quando o Arcane sobe de nivel:

- recalcula atributos pelo sistema formal;
- preserva proporcao de vida;
- preserva proporcao de mana;
- preserva ouro e XP acumulados.

## Respawn

Tempo de respawn escala com o nivel:

`8 + level * 3.5 + max(0, level - 6) * 2`

Quando morre:

- o Arcane sai do mapa;
- aparece uma caveira no local da morte por 10s;
- o painel lateral mostra overlay com tempo restante;
- o Arcane respawna na base ao final do tempo;
- vida e mana voltam cheias no respawn.

## Itens

Compra de itens acontece na base.

Catalogo atual:

- Blade;
- Boots;
- Wand;
- Shield;
- Charm;
- Ward.

Itens aumentam dano, vida maxima ou mana maxima conforme configuracao atual.
