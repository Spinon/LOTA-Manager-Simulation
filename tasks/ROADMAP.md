# Roadmap de Desenvolvimento - LOTA Manager Simulator

## Principios do projeto

- O jogo e um simulador de manager/coach de MOBA, nao um MOBA jogavel.
- A experiencia principal deve ser decisao, gestao, calendario e leitura estatistica.
- A simulacao de partida deve evoluir para um minimapa em tempo real, mas isolada em seu proprio modulo.
- Times e jogadores terao nomes ficticios, usando regioes reais do mundo competitivo.
- O modo local com save/load vem antes de login, conta online ou sincronizacao.

## Fase 0 - Fundacao do projeto

- Criar app web com React, TypeScript e Vite.
- Configurar remoto `origin` para `Spinon/LOTA-Manager-Simulation`.
- Criar tela inicial preparada para usuario e senha.
- Criar botao de jogo local.
- Definir documentacao inicial, arquitetura e roadmap.

## Fase 1 - Shell jogavel e carreira local

- Criar fluxo de nova carreira.
- Permitir nome do treinador, nacionalidade/regiao e clube inicial.
- Criar estado local serializavel para save/load.
- Definir calendario inicial com avanco por dia e semana.
- Criar tela de estado do jogo com data, treinador, clube, reputacao e objetivos.

## Fase 2 - Gestao de equipe

- Criar as cinco posicoes principais:
  - Safe Lane
  - Mid
  - Offlane
  - Greedy Support
  - Dedicated Support
- Criar elenco titular, reservas e base.
- Criar staff de apoio:
  - Assistant coaches
  - Analistas
  - Psicologos
  - Cozinheiros/nutricao
  - Infraestrutura e recuperacao
- Criar tela de micromanagement de jogadores.
- Modelar atributos de jogador:
  - Mecanica
  - Visao de mapa
  - Laning
  - Teamfight
  - Comunicacao
  - Disciplina
  - Hero pool
  - Consistencia
  - Potencial
  - Moral
  - Forma fisica/mental

## Fase 3 - Mundo, clubes e mercado

- Criar regioes reais com times ficticios.
- Dividir cada regiao em terceira, segunda e primeira divisao.
- Criar tela de outras equipes.
- Criar tela de mercado e scouting.
- Implementar contratos, salarios, buyouts e interesse de transferencia.
- Criar reputacao de clube, jogador e treinador.

## Fase 4 - Diretoria e economia

- Criar tela de interacao com diretoria.
- Definir expectativas por temporada.
- Criar orcamento, folha salarial, patrocinadores e premios.
- Implementar objetivos esportivos e financeiros.
- Implementar paciencia da diretoria e risco de demissao.

## Fase 5 - Roster, herois, itens e meta

- Criar tela de roster com herois e itens disponiveis.
- Modelar funcoes de herois por posicao.
- Criar sinergias, counters e comfort picks.
- Criar forca de meta por patch.
- Permitir mudancas de meta entre temporadas ou atualizacoes.

## Fase 6 - Campeonatos

- Criar campeonatos regionais por divisao.
- Criar campeonatos mundiais por divisao.
- Criar Majors com qualificatorias abertas.
- Criar campeonato principal: The Incredible.
- Criar tabelas de classificacao.
- Criar tela de detalhes de campeonato.
- Criar premios estatisticos:
  - Maior KDR
  - Maior dano medio por jogo
  - Maior GPM
  - Maior participacao em kills
  - Melhor controle de mapa
  - Melhor suporte do campeonato

## Fase 7 - Simulacao estatistica de partidas

- Criar motor inicial de partida baseado em atributos, moral, meta e taticas.
- Gerar resultado, duracao, placar, economia e estatisticas individuais.
- Gerar eventos principais da partida.
- Criar tela de pre-jogo com draft simplificado.
- Criar tela de pos-jogo com resumo e analise.

## Fase 8 - Simulacao em tempo real por minimapa

- Criar modulo proprio para visualizacao de partida em minimapa.
- Simular tempo de partida, lanes, objetivos, rotacoes e teamfights.
- Representar jogadores, wards, torres, objetivos e controle de mapa.
- Permitir velocidade normal, acelerada e pausa.
- Registrar eventos para replay e timeline.
- Separar o motor de simulacao da camada visual para permitir balanceamento sem refazer UI.

## Fase 9 - Taticas, treino e preparacao

- Criar estilos taticos:
  - Agressivo
  - Late game
  - Teamfight
  - Pickoff
  - Split push
  - Controle de mapa
  - Foco em farm
- Criar rotina semanal de treino.
- Criar preparacao especifica contra adversarios.
- Criar impactos de overtraining, burnout e descanso.

## Fase 10 - Eventos narrativos e profundidade

- Criar eventos de moral e vestiario.
- Criar conflitos internos e pedidos de titularidade.
- Criar lesoes, cansaco e queda de desempenho.
- Criar propostas de outros clubes.
- Criar mudancas inesperadas de patch.
- Criar eventos de torcida, midia e patrocinadores.

## Fase 11 - Polimento e expansao

- Melhorar UX de tabelas, filtros e comparativos.
- Adicionar editor de mundo para times, ligas e jogadores.
- Adicionar historico de temporadas.
- Adicionar conquistas e hall da fama.
- Avaliar login real, cloud save e recursos online.

## Decisoes confirmadas

- Stack: web app moderno, com React + TypeScript + Vite.
- Visual: mistura entre densidade de gestao estilo Elifoot e dashboard moderno de esports.
- Simulacao: tera uma etapa dedicada para minimapa em tempo real.
- Nomes: ficticios, com regioes reais.
- Posicao 1: Safe Lane.
