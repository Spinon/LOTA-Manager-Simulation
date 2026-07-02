import { useState, type DragEvent } from 'react'
import {
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  Gamepad2,
  Globe2,
  Lock,
  LogOut,
  Play,
  Shield,
  Sparkles,
  Trophy,
  User,
  Users,
} from 'lucide-react'
import './App.css'

const tabs = [
  { id: 'club', label: 'Equipe', icon: Users },
  { id: 'market', label: 'Mercado', icon: Globe2 },
  { id: 'board', label: 'Diretoria', icon: Shield },
  { id: 'tournaments', label: 'Campeonatos', icon: Trophy },
  { id: 'roster', label: 'Roster', icon: Sparkles },
  { id: 'manager', label: 'Treinador', icon: BarChart3 },
] as const

type TabId = (typeof tabs)[number]['id']

const positions = ['Safe Lane', 'Mid', 'Offlane', 'Greedy Support', 'Dedicated Support'] as const

type Position = (typeof positions)[number]

type Player = {
  id: string
  name: string
  role: string
  trait: string
  rating: number
}

const players: Player[] = [
  {
    id: 'quasar',
    name: 'Rafael "Quasar" Nogueira',
    role: 'Safe Lane',
    trait: 'Carry macro',
    rating: 86,
  },
  {
    id: 'aster',
    name: 'Lina "Aster" Duarte',
    role: 'Mid',
    trait: 'Controle de ritmo',
    rating: 84,
  },
  {
    id: 'bulwark',
    name: 'Mateo "Bulwark" Rojas',
    role: 'Offlane',
    trait: 'Iniciacao',
    rating: 81,
  },
  {
    id: 'orbit',
    name: 'Noah "Orbit" Klein',
    role: 'Greedy Support',
    trait: 'Mapa e economia',
    rating: 79,
  },
  {
    id: 'bloom',
    name: 'Yuki "Bloom" Tanaka',
    role: 'Dedicated Support',
    trait: 'Visao e disciplina',
    rating: 83,
  },
  {
    id: 'flux',
    name: 'Bruno "Flux" Martins',
    role: 'Safe Lane',
    trait: 'Prospecto',
    rating: 73,
  },
  {
    id: 'rune',
    name: 'Mila "Rune" Novak',
    role: 'Mid',
    trait: 'Reserva imediato',
    rating: 76,
  },
  {
    id: 'anchor',
    name: 'Elias "Anchor" Costa',
    role: 'Support',
    trait: 'Shotcaller secundario',
    rating: 74,
  },
]

const initialLineup: Record<Position, string | null> = {
  'Safe Lane': 'quasar',
  Mid: 'aster',
  Offlane: 'bulwark',
  'Greedy Support': 'orbit',
  'Dedicated Support': 'bloom',
}

const staff = [
  ['Assistant Coach', 'Helena Prado', 'Draft e revisao de partidas'],
  ['Psicologia', 'Dr. Caio Neves', 'Moral e burnout'],
  ['Infraestrutura', 'Marta Sato', 'Rotina, nutricao e recuperacao'],
]

const marketTeams = [
  ['Brazil', 'Manaus Wardens', '2nd Division', 'Aberto a propostas'],
  ['Korea', 'Seoul Astrals', '1st Division', 'Elenco fechado'],
  ['Germany', 'Rhine Golems', '3rd Division', 'Reformulacao'],
  ['Peru', 'Lima Sunbreakers', '2nd Division', 'Buscando offlane'],
]

const tournamentStats = [
  ['Maior KDR', 'Aster', '8.4'],
  ['Maior dano medio', 'Quasar', '38.2k'],
  ['Maior GPM', 'Quasar', '742'],
  ['Controle de mapa', 'Bloom', '91%'],
]

const rosterMeta = [
  ['Ember Warden', 'Mid / Safe Lane', 'Meta alta'],
  ['Stone Oracle', 'Dedicated Support', 'Estavel'],
  ['Iron Matriarch', 'Offlane', 'Counter pick'],
  ['Astral Pike', 'Item', 'Core situacional'],
]

function LoginScreen({ onStartLocal }: { onStartLocal: () => void }) {
  return (
    <main className="login-screen">
      <section className="login-panel" aria-labelledby="game-title">
        <div className="brand-lockup">
          <div className="brand-mark">
            <Gamepad2 size={28} aria-hidden="true" />
          </div>
          <div>
            <p className="studio-name">Legends of the Arcane</p>
            <h1 id="game-title">LOTA Manager Simulator</h1>
          </div>
        </div>

        <form className="login-form">
          <label>
            <span>Usuario</span>
            <div className="input-shell">
              <User size={18} aria-hidden="true" />
              <input type="text" placeholder="coach@lota.gg" autoComplete="username" />
            </div>
          </label>
          <label>
            <span>Senha</span>
            <div className="input-shell">
              <Lock size={18} aria-hidden="true" />
              <input type="password" placeholder="Ainda nao conectado" autoComplete="current-password" />
            </div>
          </label>
          <button className="secondary-action" type="button">
            Preparado para login futuro
          </button>
        </form>

        <button className="primary-action" type="button" onClick={onStartLocal}>
          <Play size={19} aria-hidden="true" />
          Jogar modo local
        </button>
      </section>

      <section className="login-art" aria-label="Resumo do jogo">
        <div>
          <p className="eyebrow">Primeira temporada</p>
          <h2>Construa uma equipe, leia o meta e sobreviva ao calendario.</h2>
        </div>
        <div className="login-preview">
          <div className="preview-stat">
            <strong>5</strong>
            <span>posicoes</span>
          </div>
          <div className="preview-stat">
            <strong>3</strong>
            <span>divisoes regionais</span>
          </div>
          <div className="preview-stat">
            <strong>1</strong>
            <span>The Incredible</span>
          </div>
        </div>
      </section>
    </main>
  )
}

function GameScreen({ onExit }: { onExit: () => void }) {
  const [activeTab, setActiveTab] = useState<TabId>('club')
  const [day, setDay] = useState(1)
  const [lineup, setLineup] = useState<Record<Position, string | null>>(initialLineup)
  const missingPositions = positions.filter((position) => !lineup[position])
  const canAdvanceDay = missingPositions.length === 0

  function movePlayerToPosition(playerId: string, targetPosition: Position) {
    setLineup((currentLineup) => {
      const nextLineup = { ...currentLineup }
      for (const position of positions) {
        if (nextLineup[position] === playerId) {
          nextLineup[position] = null
        }
      }
      nextLineup[targetPosition] = playerId
      return nextLineup
    })
  }

  function movePlayerToBench(playerId: string) {
    setLineup((currentLineup) => {
      const nextLineup = { ...currentLineup }
      for (const position of positions) {
        if (nextLineup[position] === playerId) {
          nextLineup[position] = null
        }
      }
      return nextLineup
    })
  }

  function handleAdvanceDay() {
    if (!canAdvanceDay) {
      return
    }

    setDay((currentDay) => currentDay + 1)
  }

  return (
    <main className="game-screen">
      <header className="game-topbar">
        <div className="club-strip">
          <div className="club-mark">LA</div>
          <div>
            <strong>Lisbon Arcana</strong>
            <span>Dia {String(day).padStart(2, '0')}, Semana {Math.ceil(day / 7)}</span>
          </div>
        </div>

        <nav className="top-tabs" aria-label="Menu principal do jogo">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              className={activeTab === id ? 'tab-button active' : 'tab-button'}
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
            >
              <Icon size={17} aria-hidden="true" />
              {label}
            </button>
          ))}
        </nav>

        <button
          className="advance-button"
          type="button"
          onClick={handleAdvanceDay}
          disabled={!canAdvanceDay}
          title={canAdvanceDay ? 'Avancar um dia' : 'Complete as cinco posicoes para avancar'}
        >
          <CalendarDays size={18} aria-hidden="true" />
          Avancar dia
        </button>

        <button className="exit-button" type="button" onClick={onExit} aria-label="Voltar para login">
          <LogOut size={18} aria-hidden="true" />
        </button>
      </header>

      <section className="game-content">
        {renderTab(activeTab, {
          canAdvanceDay,
          lineup,
          missingPositions,
          movePlayerToBench,
          movePlayerToPosition,
        })}
      </section>
    </main>
  )
}

function renderTab(
  activeTab: TabId,
  teamState: {
    canAdvanceDay: boolean
    lineup: Record<Position, string | null>
    missingPositions: Position[]
    movePlayerToBench: (playerId: string) => void
    movePlayerToPosition: (playerId: string, targetPosition: Position) => void
  },
) {
  if (activeTab === 'club') {
    return <TeamManagement {...teamState} />
  }

  if (activeTab === 'market') {
    return (
      <div className="content-grid">
        <DataPanel title="Equipes observadas" rows={marketTeams} wide />
        <SummaryPanel
          icon={BriefcaseBusiness}
          title="Mercado em preparacao"
          text="Scouting, salarios, buyouts e interesse de transferencia entram nesta area."
        />
      </div>
    )
  }

  if (activeTab === 'board') {
    return (
      <div className="content-grid">
        <SummaryPanel
          icon={Shield}
          title="Diretoria"
          text="Objetivo inicial: chegar aos playoffs regionais mantendo a folha salarial abaixo do teto."
          wide
        />
        <DataPanel
          title="Indicadores"
          rows={[
            ['Confianca', '67%', 'Estavel'],
            ['Orcamento', '$1.2M', 'Controlado'],
            ['Reputacao', 'Promissor', 'Em avaliacao'],
          ]}
        />
      </div>
    )
  }

  if (activeTab === 'tournaments') {
    return (
      <div className="content-grid">
        <DataPanel title="Premios estatisticos" rows={tournamentStats} wide />
        <SummaryPanel
          icon={CalendarDays}
          title="Calendario competitivo"
          text="Regionais, mundiais por divisao, Majors abertas e The Incredible serao conectados ao avanco de data."
        />
      </div>
    )
  }

  if (activeTab === 'roster') {
    return (
      <div className="content-grid">
        <DataPanel title="Herois e itens no meta" rows={rosterMeta} wide />
        <SummaryPanel
          icon={Sparkles}
          title="Patch atual"
          text="O meta deve influenciar draft, treino, comfort picks e valor de mercado dos jogadores."
        />
      </div>
    )
  }

  return (
    <div className="content-grid">
      <SummaryPanel
        icon={BarChart3}
        title="Estado do treinador"
        text="Historico, reputacao, estatisticas de carreira e relatorios do estado do jogo ficarao nesta tela."
        wide
      />
      <DataPanel
        title="Resumo atual"
        rows={[
          ['Treinador', 'Lucas Spinon', 'Rookie'],
          ['Clube', 'Lisbon Arcana', '1-0'],
          ['Moral media', '74%', 'Boa'],
        ]}
      />
    </div>
  )
}

function TeamManagement({
  canAdvanceDay,
  lineup,
  missingPositions,
  movePlayerToBench,
  movePlayerToPosition,
}: {
  canAdvanceDay: boolean
  lineup: Record<Position, string | null>
  missingPositions: Position[]
  movePlayerToBench: (playerId: string) => void
  movePlayerToPosition: (playerId: string, targetPosition: Position) => void
}) {
  const playerById = new Map(players.map((player) => [player.id, player]))
  const selectedPlayerIds = new Set(Object.values(lineup).filter(Boolean))
  const bench = players.filter((player) => !selectedPlayerIds.has(player.id))

  function handleDropOnPosition(event: DragEvent<HTMLElement>, position: Position) {
    event.preventDefault()
    const playerId = event.dataTransfer.getData('player-id')
    if (playerId) {
      movePlayerToPosition(playerId, position)
    }
  }

  function handleDropOnBench(event: DragEvent<HTMLElement>) {
    event.preventDefault()
    const playerId = event.dataTransfer.getData('player-id')
    if (playerId) {
      movePlayerToBench(playerId)
    }
  }

  return (
    <div className="content-grid">
      <section className="wide-panel management-panel">
        <div className="panel-title">
          <div>
            <h2>Gestao de equipe</h2>
            <p>Arraste jogadores entre titulares e reservas.</p>
          </div>
          <span className={canAdvanceDay ? 'status-ready' : 'status-blocked'}>
            {canAdvanceDay ? 'Escalacao valida' : 'Avanco bloqueado'}
          </span>
        </div>

        {!canAdvanceDay && (
          <div className="lineup-warning">
            Preencha {missingPositions.join(', ')} para liberar o avanço de dia.
          </div>
        )}

        <div className="lineup-slots">
          {positions.map((position) => {
            const playerId = lineup[position]
            const player = playerId ? playerById.get(playerId) : null

            return (
              <article
                className={player ? 'position-slot filled' : 'position-slot empty'}
                key={position}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => handleDropOnPosition(event, position)}
              >
                <strong>{position}</strong>
                {player ? (
                  <PlayerCard player={player} onSendToBench={() => movePlayerToBench(player.id)} />
                ) : (
                  <div className="empty-slot">Sem jogador escalado</div>
                )}
              </article>
            )
          })}
        </div>
      </section>

      <section
        className="data-panel bench-panel"
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDropOnBench}
      >
        <div className="panel-title">
          <h2>Reservas</h2>
          <span>Solte aqui para remover da posicao</span>
        </div>
        <div className="bench-list">
          {bench.map((player) => (
            <PlayerCard player={player} key={player.id} />
          ))}
        </div>
      </section>

      <DataPanel title="Staff e infraestrutura" rows={staff} />
    </div>
  )
}

function PlayerCard({
  player,
  onSendToBench,
}: {
  player: Player
  onSendToBench?: () => void
}) {
  return (
    <div
      className="player-card"
      draggable
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = 'move'
        event.dataTransfer.setData('player-id', player.id)
      }}
    >
      <div>
        <span>{player.name}</span>
        <em>{player.role} - {player.trait}</em>
      </div>
      <b>{player.rating}</b>
      {onSendToBench && (
        <button type="button" onClick={onSendToBench}>
          Remover
        </button>
      )}
    </div>
  )
}

function DataPanel({
  title,
  rows,
  wide = false,
}: {
  title: string
  rows: string[][]
  wide?: boolean
}) {
  return (
    <section className={wide ? 'data-panel wide-panel' : 'data-panel'}>
      <div className="panel-title">
        <h2>{title}</h2>
      </div>
      <div className="data-list">
        {rows.map((row) => (
          <article className="data-row" key={row.join('-')}>
            {row.map((cell) => (
              <span key={cell}>{cell}</span>
            ))}
          </article>
        ))}
      </div>
    </section>
  )
}

function SummaryPanel({
  icon: Icon,
  title,
  text,
  wide = false,
}: {
  icon: typeof Users
  title: string
  text: string
  wide?: boolean
}) {
  return (
    <section className={wide ? 'summary-panel wide-panel' : 'summary-panel'}>
      <Icon size={24} aria-hidden="true" />
      <h2>{title}</h2>
      <p>{text}</p>
    </section>
  )
}

function App() {
  const [screen, setScreen] = useState<'login' | 'game'>('login')

  if (screen === 'game') {
    return <GameScreen onExit={() => setScreen('login')} />
  }

  return <LoginScreen onStartLocal={() => setScreen('game')} />
}

export default App
