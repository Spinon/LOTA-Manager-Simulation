# Visao, Perigo e Fog of War

## Visao

Cada Arcane tem alcance de visao vindo dos atributos:

- visao diurna;
- visao noturna.

O time compartilha visao. A IA so considera Arcanes inimigos visiveis pelo time em varias decisoes.

Creeps de rota tambem tem visao:

- melee: visao atual 11;
- mage: visao atual 13.

A visao das creeps ajuda a impedir que elas passem direto por Arcanes ou torres.

## Dia e Noite

O ciclo alterna a cada 5 minutos.

O valor de visao dos Arcanes e atualizado conforme o ciclo.

## Score de Perigo

Arcanes calculam perigo considerando:

- torres inimigas;
- Arcanes inimigos visiveis;
- creeps inimigas;
- campos neutros;
- chefe, somente se o chefe estiver em aggro naquele Arcane;
- aliados proximos reduzem parte do perigo.

Esse score afeta:

- recuo por perigo alto;
- decisao de entrar ou nao em area de acao inimiga;
- aceitacao de gank, rotate e initiate;
- respeito a torres;
- profundidade permitida no territorio inimigo.

## Agressividade

Agressividade controla o quanto um Arcane aceita:

- invadir territorio inimigo;
- avancar alem da T1;
- pressionar inimigos;
- participar de jogadas arriscadas.

Mais agressividade aumenta tolerancia a profundidade e risco. Menos agressividade prioriza ficar do lado seguro do mapa.

## Torre e Territorio

A IA evita entrar em torre inimiga sem wave aliada ou sem condicao de vida suficiente.

Quando o avanco esta bloqueado por torre, o fallback atual e:

- escoltar creeps aliadas;
- aguardar wave aliada;
- recuar para ponto seguro da rota.

## Fog of War Futuro

Hoje a visao ja influencia as decisoes. Ainda falta uma representacao visual completa do fog of war para o jogador.

Quando for implementado visualmente, a regra de design deve seguir:

- informacao da IA baseada na visao compartilhada;
- jogador assistindo pode receber visualizacao clara do que cada time enxerga;
- possivel modo alternavel por time ou visao global.
