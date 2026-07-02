# Interface e Feedback Visual

## Estrutura da Tela

Layout atual:

- painel lateral esquerdo: Aurora Forge;
- mapa central;
- painel lateral direito: Crimson Veil;
- barra superior com placar e tempo;
- painel inferior com detalhes do selecionado.

## Barra Superior

Layout atual:

`Time A | ouro | abates | relogio | abates | ouro | Time B`

Mostra:

- ouro total de cada equipe;
- abates;
- tempo de jogo;
- fase de jogo;
- ciclo dia/noite;
- vencedor, se houver.

## Painel Lateral dos Arcanes

Cada card mostra:

- retrato/abreviacao do Arcane;
- jogador;
- nome do Arcane;
- role;
- chip de decisao abreviada;
- vida;
- mana;
- nivel;
- XP com barra;
- ouro com icone;
- itens;
- habilidades placeholder.

Quando o Arcane esta morto:

- aparece overlay com tempo de respawn no retrato.

## Painel Inferior

Mostra detalhes do elemento selecionado.

Para Arcanes:

- atributos;
- recursos;
- ataque;
- defesa;
- movimento/visao;
- IA;
- decisao.

Para unidades/estruturas:

- vida;
- dano, se atacar;
- alcance, se atacar.

## Overlay de Alcance

Ao selecionar uma unidade que ataca, o mapa exibe um circulo de alcance.

Aplica-se a:

- Arcanes;
- creeps;
- torres;
- campos neutros;
- chefe.

Bases nao exibem alcance porque nao atacam atualmente.

## Marcadores e Efeitos

Efeitos atuais:

- animacao simples de ataque de creeps;
- animacao mais visivel para ataque de Arcanes;
- animacao de ataque de torres;
- caveira no local de morte de Arcane por 10s;
- hover/mouseover exibe nome dos elementos do mapa.

## Log de Eventos

O log fica no canto inferior direito do mapa.

Ele:

- e movel;
- pode ser minimizado;
- mostra eventos importantes;
- colore nomes pela equipe;
- usa icone de espada em abates.

## Chips de Decisao

Mapeamentos atuais importantes:

- `Saindo do alcance da torre` -> `Recuando`;
- `Saindo da base` -> `Avancando`;
- `Gank em ...` -> `Gank`;
- `Ajudando side lane ...` -> `Rotate`;
- `Iniciando luta ...` -> `Initiate`;
- `Chamando time ...` -> `Call`;
- `Juntando com o time ...` -> `Juntar`;
- `Fazendo objetivo ...` -> `Objetivo`.
