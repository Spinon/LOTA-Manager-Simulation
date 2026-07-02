# Combate, Economia e Morte

## Alcance e Ataque

Unidades que atacam possuem:

- dano;
- alcance de ataque;
- intervalo de ataque;
- ultimo tempo de ataque.

O alcance de ataque aparece:

- no painel inferior;
- como overlay visual no mapa quando a unidade esta selecionada.

## Arcanes

Arcanes atacam automaticamente alvos inimigos dentro do alcance:

- Arcanes;
- creeps;
- torres;
- bases;
- campos neutros;
- chefe, somente se a decisao envolve o chefe ou se o chefe ja esta em aggro no Arcane.

Se um Arcane ataca outro Arcane:

- torres aliadas do alvo podem ganhar aggro no atacante;
- creeps aliadas do alvo podem ganhar aggro no atacante.

## Creeps de Rota

Cada wave nasce a cada 30s.

Composicao atual:

- 3 creeps corpo a corpo;
- 1 creep mago.

Creeps de rota:

- avancam pela rota ate a base inimiga;
- param para atacar;
- nao tem score de perigo;
- nao fogem;
- tem alcance de ataque separado de alcance de visao.

Prioridade de ataque:

1. alvo de aggro, se ainda valido;
2. creeps inimigas;
3. Arcanes inimigos na rota;
4. torres;
5. base.

## Torres

Prioridade:

1. Arcane inimigo com aggro por atacar Arcane aliado no alcance.
2. Creeps inimigas.
3. Arcanes inimigos.

## Neutros

Campos neutros atacam Arcanes dentro do alcance.

O chefe e passivo ate ser atacado.

## Recompensas

### Creeps de Rota

Ouro:

- vai apenas para o jogador que deu o ultimo hit.

XP:

- compartilhada entre Arcanes inimigos dentro do raio de visao do creep morto;
- dividida entre os recipientes.

Valores atuais:

- melee: 8 de ouro, 18 de XP;
- mage: 12 de ouro, 24 de XP.

### Campos Neutros

O time que da o ultimo hit recebe a recompensa.

Recompensas escalam com o tempo de jogo:

- fraco: 14 ouro / 7 XP base;
- medio: 24 ouro / 12 XP base;
- forte: 34 ouro / 18 XP base.

### Chefe

O time que da o ultimo hit recebe:

- 120 de ouro por Arcane;
- 60 de XP por Arcane;
- aura temporaria de +20% nos atributos por 120s.

## Eventos Importantes

O log mostra eventos importantes no canto inferior direito.

Abates usam nomes coloridos por equipe e icone de espada.

O log e movel e pode ser minimizado.
