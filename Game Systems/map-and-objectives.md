# Mapa, Rotas e Objetivos

## Estrutura do Mapa

O mapa representa um minimapa de MOBA:

- base da Aurora Forge no canto inferior esquerdo;
- base da Crimson Veil no canto superior direito;
- rio diagonal separando o mapa;
- tres rotas: Topo, Meio e Baixo;
- torres espelhadas por rota;
- campos neutros nas areas entre rotas e bordas;
- chefe itinerante circulando a borda do mapa.

Existe uma parede invisivel nas bordas por meio de `mapWallPadding`. Entidades sao clampadas para nao sairem da tela.

## Rotas

Cada time tem caminhos proprios por rota. Os caminhos definem:

- origem na base;
- pontos intermediarios;
- avanco em direcao a base inimiga.

A Safe Lane joga contra a Offlane inimiga de forma espelhada.

## Torres

Existem tres niveis defensivos por lado nas rotas:

- T1;
- T2;
- T3 proxima da base/ancient.

Torres atacam por prioridade:

1. Arcane inimigo com aggro se esse Arcane atacou outro Arcane aliado dentro do alcance da torre.
2. Creeps inimigas.
3. Arcanes inimigos.

Torres tem alcance visualizado por overlay quando selecionadas.

## Bases

Cada base tem 5000 de vida.

Na base aliada:

- o Arcane regenera vida;
- o Arcane regenera mana;
- a compra de itens acontece automaticamente se houver ouro e slot.

A partida termina quando uma base chega a 0 de vida.

## Campos Neutros

Os campos neutros sao espelhados para nao favorecer um lado.

Forcas:

- fraco;
- medio;
- forte.

Recompensas escalam com o tempo de jogo, limitadas pelo fator atual de escala.

Campos neutros:

- atacam Arcanes dentro do alcance;
- respawnam 60s depois de mortos;
- dao recompensa ao time que deu o last hit.

## Chefe: Serpente do Eclipse

O chefe:

- circula lentamente a borda do mapa;
- escala vida, dano e velocidade com o tempo;
- nao ataca sem ser atacado;
- entra em aggro contra quem o atacou;
- respawna 60s depois de morto.

O time que da o ultimo hit recebe:

- ouro e XP para os Arcanes do time;
- aura temporaria de +20% nos atributos por 120s.
