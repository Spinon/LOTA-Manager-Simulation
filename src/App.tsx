import { startTransition, useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { Brain, Coins, Eye, Gauge, HeartPulse, Package, Pause, Play, RotateCcw, Swords, Target, TowerControl, Zap } from 'lucide-react'
import {
  campStrengthLabel,
  convertImportedSkillRange,
  formatCompactGold,
  getArcaneBarrierAmount,
  getArcaneDamageRangeLabel,
  getArcaneSlowPercent,
  getAuraMultiplier,
  getBossStats,
  getCampRewards,
  getConsumableByName,
  getCreepDisplayName,
  getCreepVisionRange,
  getDayCycle,
  getDayCycleLabel,
  getEffectiveArcaneArmor,
  getEffectiveArcaneAttackCooldown,
  getEffectiveArcaneDamage,
  getGamePhase,
  getGamePhaseLabel,
  getHeroDefinition,
  getItemStatModifiers,
  getItemTimingUrgency,
  getLaneWinAssessment,
  getLevelProgress,
  loadGameData,
  getRuneGlyph,
  getRuneInspectorSubtitle,
  getRuneKindLabel,
  getRuneLabel,
  getRuneRewardLabel,
  getRuneTitle,
  getSimpleSkillLevel,
  getSimpleSkillManaCost,
  getStatBonusModifiers,
  getStructureLabel,
  getStructureMapLabel,
  getTeamNetWorth,
  hasBackdoorProtection,
  isStructureBackdoorProtectedForTeam,
  isStructureFortified,
  laneNames,
  lanePaths,
  nearest,
  getTeamMemoryDanger,
  getEntityPosition,
  getEntityAttackRange,
  getDangerScore,
  distance,
  clampToMapBounds,
  clampNumber,
  calculateHeroStats,
  maxCanvasDevicePixelRatio,
  nextShopItem,
  shopCatalog,
  teamInfo,
  teleportManaCost,
  teleportScrollCost,
  type Arcane,
  type AttackEffect,
  type Base,
  type Boss,
  type Camp,
  type ChannelingAction,
  type ConsumableItem,
  type Creep,
  type DayCycle,
  type DeathMarker,
  type DecisionStatus,
  type DenyMarker,
  type ExecutionFailureType,
  type GoldMarker,
  type HeroSkillDefinition,
  type LaneId,
  type MapRune,
  type MatchEvent,
  type PlayerModeType,
  type Point,
  type RuntimeItemEffect,
  type Selected,
  type ShopItem,
  type SimulationState,
  type SkillMarker,
  type Structure,
  type StructureKind,
  type TeamId,
  type TeamPlan,
  type TimedEffect,
  type Tower,
  XP_TO_REACH_LEVEL
} from './sim/simulation'
import type { MatchWorkerResponse } from './sim/matchWorker'
import './App.css'

type PlaybackStatus = 'loading' | 'ready' | 'buffering' | 'ended' | 'error'

// Partida standby: enquanto o jogador assiste a atual, um segundo worker
// pré-simula a próxima seed até o teto de buffer. No restart, o worker e os
// frames são adotados e o playback começa sem tela de loading.
type StandbyMatch = {
  seed: string
  worker: Worker
  runId: number
  frames: SimulationState[]
  workerDone: boolean
  simTime: number
}

const startupBufferSeconds = 100
const minimumStartupWaitMs = 10_000
const resumeBufferSeconds = 1.5
// Começa a pré-simular a próxima partida quando o buffer da atual está quase
// no teto (worker ativo já ocioso) ou quando a partida atual terminou de simular.
const prefetchBufferAheadSeconds = 150
// Desativado por ora a pedido (2026-07-07): manter o mecanismo inerte até
// ganhar confiança; reativar trocando esta flag.
const standbyPrefetchEnabled = false

function createBrowserMatchSeed() {
  const values = new Uint32Array(2)
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(values)
  } else {
    values[0] = Math.floor(Math.random() * 0xffffffff)
    values[1] = Math.floor(Math.random() * 0xffffffff)
  }
  return `lota-${values[0].toString(36)}-${values[1].toString(36)}`
}

function getFrameKey(frame: SimulationState) {
  return `${frame.matchSeed}:${frame.time}:${frame.events.length}:${frame.effects.length}:${frame.winner ?? 'playing'}`
}

function getPlaybackStatusLabel(status: PlaybackStatus) {
  if (status === 'loading') return 'Preparando'
  if (status === 'buffering') return 'Buffer'
  if (status === 'ended') return 'Encerrado'
  if (status === 'error') return 'Erro'
  return 'Playback'
}

function prunePlaybackFrames(
  frames: SimulationState[],
  frameIndexRef: React.MutableRefObject<number>,
  olderThan: number,
) {
  let removeCount = 0
  while (removeCount < frames.length - 2 && frames[removeCount + 1].time < olderThan) {
    removeCount += 1
  }
  if (removeCount <= 0) return
  frames.splice(0, removeCount)
  frameIndexRef.current = Math.max(0, frameIndexRef.current - removeCount)
}

function paintBufferInfoThrottled(
  lastPaintRef: React.MutableRefObject<number>,
  setBufferInfo: React.Dispatch<React.SetStateAction<{ simTime: number; frameCount: number; bufferAhead: number }>>,
  next: { simTime: number; frameCount: number; bufferAhead: number },
  force = false,
) {
  const now = performance.now()
  if (!force && now - lastPaintRef.current < 250) return
  lastPaintRef.current = now
  setBufferInfo(next)
}

function App() {
  const [state, setState] = useState<SimulationState | undefined>(undefined)
  const [loadingError, setLoadingError] = useState<string | undefined>(undefined)
  const [running, setRunning] = useState(true)
  const [speed, setSpeed] = useState(1)
  const [matchSeed, setMatchSeed] = useState(() => createBrowserMatchSeed())
  const [playbackStatus, setPlaybackStatus] = useState<PlaybackStatus>('loading')
  const [uiDataReady, setUiDataReady] = useState(false)
  const [startupWaitDone, setStartupWaitDone] = useState(false)
  const [startupWaitProgress, setStartupWaitProgress] = useState(0)
  const [bufferInfo, setBufferInfo] = useState({ simTime: 0, frameCount: 0, bufferAhead: 0 })
  const [selected, setSelected] = useState<Selected>({ kind: 'arcane', id: 'd-quasar' })
  const [dataPanelOpen, setDataPanelOpen] = useState(false)
  const frameBufferRef = useRef<SimulationState[]>([])
  const frameIndexRef = useRef(0)
  const playbackCursorRef = useRef(0)
  const lastPlaybackTick = useRef<number | null>(null)
  const lastCursorPostRef = useRef(0)
  const lastStatePaintRef = useRef(0)
  const lastBufferInfoPaintRef = useRef(0)
  const runIdRef = useRef(0)
  const runSeqRef = useRef(0)
  const workerRef = useRef<Worker | undefined>(undefined)
  const workerDoneRef = useRef(false)
  const standbyRef = useRef<StandbyMatch | undefined>(undefined)
  const currentFrameKeyRef = useRef('')
  const stateRef = useRef<SimulationState | undefined>(undefined)
  if (import.meta.env.DEV) {
    ;(window as unknown as { __lotaStateRef?: typeof stateRef }).__lotaStateRef = stateRef
    ;(window as unknown as { __lotaPlayback?: unknown }).__lotaPlayback = {
      bufferInfo,
      playbackStatus,
      startupWaitDone,
      startupWaitProgress,
      frameCount: frameBufferRef.current.length,
      cursor: playbackCursorRef.current,
      workerDone: workerDoneRef.current,
      standby: standbyRef.current
        ? { seed: standbyRef.current.seed, simTime: standbyRef.current.simTime, frames: standbyRef.current.frames.length, done: standbyRef.current.workerDone }
        : undefined,
    }
  }
  const hasState = state !== undefined
  const phase = state ? getGamePhase(state.time) : 'early'
  const dayCycle = state ? getDayCycle(state.time) : 'day'

  useEffect(() => {
    let cancelled = false
    loadGameData()
      .then(() => {
        if (!cancelled) setUiDataReady(true)
      })
      .catch((error: unknown) => {
        if (!cancelled) setLoadingError(error instanceof Error ? error.message : 'Falha ao carregar dados do jogo')
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const standby = standbyRef.current
    const adopting = standby && standby.seed === matchSeed ? standby : undefined
    if (standby) {
      standbyRef.current = undefined
      if (!adopting) standby.worker.terminate()
    }

    const worker = adopting ? adopting.worker : new Worker(new URL('./sim/matchWorker.ts', import.meta.url), { type: 'module' })
    const runId = adopting ? adopting.runId : (runSeqRef.current += 1)
    runIdRef.current = runId
    workerDoneRef.current = adopting?.workerDone ?? false
    frameBufferRef.current = adopting?.frames ?? []
    frameIndexRef.current = 0
    playbackCursorRef.current = 0
    lastPlaybackTick.current = null
    currentFrameKeyRef.current = ''
    lastCursorPostRef.current = 0
    lastStatePaintRef.current = 0
    lastBufferInfoPaintRef.current = 0
    workerRef.current = worker
    stateRef.current = undefined
    setState(undefined)
    setLoadingError(undefined)

    // Standby com buffer de largada completo: entra direto no playback,
    // sem tela de loading nem espera mínima.
    const adoptedReady = Boolean(adopting && adopting.frames.length > 0 &&
      (adopting.workerDone || adopting.simTime >= startupBufferSeconds))
    if (adopting && adoptedReady) {
      const firstFrame = adopting.frames[0]
      stateRef.current = firstFrame
      currentFrameKeyRef.current = getFrameKey(firstFrame)
      setState(firstFrame)
      setPlaybackStatus('ready')
      setStartupWaitDone(true)
      setStartupWaitProgress(1)
      setBufferInfo({ simTime: adopting.simTime, frameCount: adopting.frames.length, bufferAhead: adopting.simTime })
    } else {
      setPlaybackStatus('loading')
      setStartupWaitDone(false)
      setStartupWaitProgress(0)
      setBufferInfo({
        simTime: adopting?.simTime ?? 0,
        frameCount: adopting?.frames.length ?? 0,
        bufferAhead: adopting?.simTime ?? 0,
      })
    }
    const startupStartedAt = performance.now()
    const startupTimer = adoptedReady ? undefined : window.setTimeout(() => setStartupWaitDone(true), minimumStartupWaitMs)
    const startupProgressTimer = adoptedReady
      ? undefined
      : window.setInterval(() => {
          setStartupWaitProgress(Math.min(1, (performance.now() - startupStartedAt) / minimumStartupWaitMs))
        }, 100)

    const startStandbyPrefetch = () => {
      if (!standbyPrefetchEnabled || standbyRef.current) return
      const seed = createBrowserMatchSeed()
      const standbyWorker = new Worker(new URL('./sim/matchWorker.ts', import.meta.url), { type: 'module' })
      const standbyRunId = (runSeqRef.current += 1)
      const nextStandby: StandbyMatch = {
        seed,
        worker: standbyWorker,
        runId: standbyRunId,
        frames: [],
        workerDone: false,
        simTime: 0,
      }
      standbyWorker.onmessage = (event: MessageEvent<MatchWorkerResponse>) => {
        const message = event.data
        if (message.runId !== standbyRunId) return
        if (message.type === 'error') {
          standbyWorker.terminate()
          if (standbyRef.current === nextStandby) standbyRef.current = undefined
          return
        }
        if (message.type === 'frame' || message.type === 'frames') {
          const incomingFrames = message.type === 'frame' ? [message.frame] : message.frames
          nextStandby.frames.push(...incomingFrames)
          const latestFrame = incomingFrames[incomingFrames.length - 1]
          if (latestFrame) nextStandby.simTime = Math.max(nextStandby.simTime, latestFrame.time)
          return
        }
        nextStandby.simTime = Math.max(nextStandby.simTime, message.simTime)
        nextStandby.workerDone = message.type === 'done' || (message.type === 'progress' && message.done)
      }
      standbyWorker.postMessage({ type: 'start', seed, runId: standbyRunId })
      standbyRef.current = nextStandby
    }

    worker.onmessage = (event: MessageEvent<MatchWorkerResponse>) => {
      const message = event.data
      if (message.runId !== runIdRef.current) return

      if (message.type === 'error') {
        setLoadingError(message.message)
        setPlaybackStatus('error')
        return
      }

      if (message.type === 'frame' || message.type === 'frames') {
        const incomingFrames = message.type === 'frame' ? [message.frame] : message.frames
        frameBufferRef.current.push(...incomingFrames)
        const latestFrame = incomingFrames[incomingFrames.length - 1]
        if (!latestFrame) return
        const latestTime = latestFrame.time
        const bufferAhead = Math.max(0, latestTime - playbackCursorRef.current)
        paintBufferInfoThrottled(lastBufferInfoPaintRef, setBufferInfo, {
          simTime: latestTime,
          frameCount: frameBufferRef.current.length,
          bufferAhead,
        })

        if (!stateRef.current) {
          const firstFrame = frameBufferRef.current[0]
          stateRef.current = firstFrame
          currentFrameKeyRef.current = getFrameKey(firstFrame)
          setState(firstFrame)
          paintBufferInfoThrottled(lastBufferInfoPaintRef, setBufferInfo, {
            simTime: latestTime,
            frameCount: frameBufferRef.current.length,
            bufferAhead,
          }, true)
          setPlaybackStatus(workerDoneRef.current ? 'ready' : 'buffering')
        } else if (
          stateRef.current &&
          playbackStatusRef.current === 'buffering' &&
          bufferAhead >= (playbackCursorRef.current <= 0.001 ? startupBufferSeconds : resumeBufferSeconds)
        ) {
          setPlaybackStatus('ready')
        }
        return
      }

      if (message.type === 'progress') {
        workerDoneRef.current = message.done
        const bufferAhead = Math.max(0, message.simTime - playbackCursorRef.current)
        paintBufferInfoThrottled(lastBufferInfoPaintRef, setBufferInfo, {
          simTime: message.simTime,
          frameCount: message.frameCount,
          bufferAhead,
        }, message.done)
        const requiredBufferAhead = playbackCursorRef.current <= 0.001 ? startupBufferSeconds : resumeBufferSeconds
        if (stateRef.current && playbackStatusRef.current === 'buffering' && (bufferAhead >= requiredBufferAhead || message.done)) {
          setPlaybackStatus('ready')
        }
        if (stateRef.current && (message.done || bufferAhead >= prefetchBufferAheadSeconds)) {
          startStandbyPrefetch()
        }
        return
      }

      workerDoneRef.current = true
      const bufferAhead = Math.max(0, message.simTime - playbackCursorRef.current)
      paintBufferInfoThrottled(lastBufferInfoPaintRef, setBufferInfo, {
        simTime: message.simTime,
        frameCount: message.frameCount,
        bufferAhead,
      }, true)
      if (!stateRef.current && frameBufferRef.current[0]) {
        const firstFrame = frameBufferRef.current[0]
        stateRef.current = firstFrame
        currentFrameKeyRef.current = getFrameKey(firstFrame)
        setState(firstFrame)
      }
      setPlaybackStatus((status) => status === 'loading' || status === 'buffering' ? 'ready' : status)
      startStandbyPrefetch()
    }

    if (!adopting) {
      worker.postMessage({ type: 'start', seed: matchSeed, runId })
    } else if (adoptedReady) {
      // O worker standby terminou de simular? Então não haverá mais mensagens
      // de progresso; dispara a pré-simulação da próxima já na adoção.
      if (workerDoneRef.current) startStandbyPrefetch()
    }

    return () => {
      window.clearTimeout(startupTimer)
      window.clearInterval(startupProgressTimer)
      worker.postMessage({ type: 'cancel', runId })
      worker.terminate()
      if (workerRef.current === worker) workerRef.current = undefined
    }
  }, [matchSeed])

  useEffect(() => () => {
    standbyRef.current?.worker.terminate()
    standbyRef.current = undefined
  }, [])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setSelected(undefined)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    if (
      stateRef.current &&
      startupWaitDone &&
      playbackStatus === 'buffering' &&
      (workerDoneRef.current || bufferInfo.bufferAhead >= startupBufferSeconds)
    ) {
      setPlaybackStatus('ready')
    }
  }, [bufferInfo.bufferAhead, playbackStatus, startupWaitDone])

  const playbackStatusRef = useRef(playbackStatus)
  playbackStatusRef.current = playbackStatus

  useEffect(() => {
    if (!hasState || !startupWaitDone || playbackStatus === 'loading' || playbackStatus === 'error') return undefined

    let frame = 0
    const playbackTick = () => {
      const now = performance.now()
      if (lastPlaybackTick.current === null) {
        lastPlaybackTick.current = now
        frame = window.requestAnimationFrame(playbackTick)
        return
      }

      const elapsed = Math.min(0.25, (now - lastPlaybackTick.current) / 1000)
      lastPlaybackTick.current = now

      if (running && playbackStatusRef.current !== 'buffering' && playbackStatusRef.current !== 'ended') {
        const frames = frameBufferRef.current
        const latestFrame = frames[frames.length - 1]
        if (latestFrame) {
          const targetCursor = playbackCursorRef.current + elapsed * speed
          const hasBufferedTarget = targetCursor <= latestFrame.time || workerDoneRef.current

          if (!hasBufferedTarget) {
            setPlaybackStatus('buffering')
          } else {
            playbackCursorRef.current = Math.min(targetCursor, latestFrame.time)
            while (
              frameIndexRef.current < frames.length - 1 &&
              frames[frameIndexRef.current + 1].time <= playbackCursorRef.current
            ) {
              frameIndexRef.current += 1
            }

            const currentFrame = frames[frameIndexRef.current]
            if (currentFrame) {
              stateRef.current = currentFrame
              const frameKey = getFrameKey(currentFrame)
              const reachedEnd = workerDoneRef.current && frameIndexRef.current >= frames.length - 1 && Boolean(currentFrame.winner)
              // Os canvases leem stateRef a cada rAF; o setState só alimenta os
              // painéis React, que não mostram nada com granularidade menor que
              // ~1s (relógio mm:ss, ouro, kills, barras). Re-renderizar a árvore
              // inteira a cada frame de 0.2s custa dezenas de ms por passada e
              // rouba frames do canvas — 3 updates/s bastam, e startTransition
              // deixa o React fatiar o render sem congelar a animação.
              if (frameKey !== currentFrameKeyRef.current && (reachedEnd || now - lastStatePaintRef.current >= 300)) {
                currentFrameKeyRef.current = frameKey
                lastStatePaintRef.current = now
                startTransition(() => setState(currentFrame))
              }
              if (reachedEnd) {
                setPlaybackStatus('ended')
              }
            }

            prunePlaybackFrames(frameBufferRef.current, frameIndexRef, playbackCursorRef.current - 2)
            if (now - lastCursorPostRef.current >= 500) {
              lastCursorPostRef.current = now
              workerRef.current?.postMessage({ type: 'cursor', runId: runIdRef.current, cursor: playbackCursorRef.current })
            }
          }
        }
      }

      frame = window.requestAnimationFrame(playbackTick)
    }

    frame = window.requestAnimationFrame(playbackTick)
    return () => window.cancelAnimationFrame(frame)
  }, [running, speed, hasState, startupWaitDone, playbackStatus])

  const selectedEntity = useMemo(() => state ? findSelected(state, selected) : undefined, [selected, state])
  const teamNetWorth = useMemo(() => ({
    dawn: state ? getTeamNetWorth(state, 'dawn') : 0,
    dusk: state ? getTeamNetWorth(state, 'dusk') : 0,
  }), [state])

  const isInitialBuffering = playbackCursorRef.current <= 0.001 && playbackStatus === 'buffering'

  if (!state || !uiDataReady || !startupWaitDone || playbackStatus === 'loading' || isInitialBuffering) {
    return (
      <main className="sim-shell loading-shell">
        <div className="loading-panel">
          <strong>{loadingError ? 'Erro ao carregar LOTA' : 'Carregando'}</strong>
          {!loadingError && <progress value={startupWaitProgress} max={1} />}
        </div>
      </main>
    )
  }

  return (
    <main className="sim-shell">
      <header className="scorebar">
        <TeamBadge team="dawn" side="left" />
        <ScoreStat team="dawn" icon="gold" value={formatCompactGold(teamNetWorth.dawn)} label="Net worth Aurora Forge" />
        <ScoreStat team="dawn" icon="kills" value={state.kills.dawn} label="Eliminações Aurora Forge" />
        <div className="match-clock" aria-label={`${formatTime(state.time)} - ${getGamePhaseLabel(phase)} - ${getDayCycleLabel(dayCycle)}`}>
          <strong>{formatTime(state.time)}</strong>
          <div className="match-meta">
            <small>{getGamePhaseLabel(phase)}</small>
            <small className={`cycle-label ${dayCycle}`}>{getDayCycleLabel(dayCycle)}</small>
          </div>
          {state.winner && <em>{teamInfo[state.winner].name} venceu</em>}
        </div>
        <ScoreStat team="dusk" icon="kills" value={state.kills.dusk} label="Eliminações Crimson Veil" reverse />
        <ScoreStat team="dusk" icon="gold" value={formatCompactGold(teamNetWorth.dusk)} label="Net worth Crimson Veil" reverse />
        <TeamBadge team="dusk" side="right" />
      </header>

      <section className="sim-layout">
        <TeamPanel
          arcanes={state.arcanes.filter((arcane) => arcane.team === 'dawn')}
          selected={selected}
          team="dawn"
          teamPlan={state.teamPlans.dawn}
          time={state.time}
          onSelect={setSelected}
        />
        <MapPanel
          dayCycle={dayCycle}
          state={state}
          stateRef={stateRef}
          selected={selected}
          onSelect={setSelected}
        />
        <TeamPanel
          arcanes={state.arcanes.filter((arcane) => arcane.team === 'dusk')}
          selected={selected}
          team="dusk"
          teamPlan={state.teamPlans.dusk}
          time={state.time}
          onSelect={setSelected}
        />
      </section>

      <div className="bottom-hud">
        <div className="sim-controls">
          <div className="control-buttons" aria-label="Controles da partida">
            <button type="button" onClick={() => setRunning((value) => !value)} title={running ? 'Pausar' : 'Continuar'}>
              {running ? <Pause size={17} /> : <Play size={17} />}
            </button>
            <button
              type="button"
              onClick={() => {
                setRunning(true)
                setSelected({ kind: 'arcane', id: 'd-quasar' })
                setMatchSeed(standbyRef.current?.seed ?? createBrowserMatchSeed())
              }}
              title="Reiniciar partida"
            >
              <RotateCcw size={17} />
            </button>
          </div>
          <label className="speed-control">
            <span>Vel.</span>
            <select value={speed} onChange={(event) => setSpeed(Number(event.target.value))}>
              <option value={1}>1x</option>
              <option value={2}>2x</option>
              <option value={4}>4x</option>
              <option value={8}>8x</option>
              <option value={16}>16x</option>
            </select>
          </label>
          <span className={`playback-chip ${playbackStatus}`} title={`Seed ${matchSeed} / ${bufferInfo.frameCount} frames`}>
            {getPlaybackStatusLabel(playbackStatus)} · buffer {bufferInfo.bufferAhead.toFixed(1)}s
          </span>
          <button
            className={dataPanelOpen ? 'data-toggle active' : 'data-toggle'}
            type="button"
            onClick={() => setDataPanelOpen((value) => !value)}
            title={dataPanelOpen ? 'Fechar dados' : 'Abrir dados'}
          >
            Dados
          </button>
          <button
            className="clear-selection"
            type="button"
            onClick={() => setSelected(undefined)}
            title="Remover selecao"
            disabled={!selected}
          >
            Limpar
          </button>
        </div>
      </div>

      <footer className={dataPanelOpen ? 'inspector open' : 'inspector'} aria-hidden={!dataPanelOpen}>
        <div className="inspector-layout">
          <Inspector entity={selectedEntity} state={state} />
          <EventFeed events={state.events} />
        </div>
      </footer>
    </main>
  )
}

function TeamBadge({ team, side }: { team: TeamId; side: 'left' | 'right' }) {
  return (
    <div className={`team-badge ${side}`} style={{ '--team': teamInfo[team].primary } as React.CSSProperties}>
      <span>{teamInfo[team].short}</span>
      <strong>{teamInfo[team].name}</strong>
    </div>
  )
}

function ScoreStat({
  team,
  icon,
  value,
  label,
  reverse = false,
}: {
  team: TeamId
  icon: 'gold' | 'kills'
  value: number | string
  label: string
  reverse?: boolean
}) {
  const Icon = icon === 'gold' ? Coins : Swords

  return (
    <div className={reverse ? 'score-stat reverse' : 'score-stat'} style={{ '--team': teamInfo[team].primary } as React.CSSProperties} title={label} aria-label={label}>
      <Icon size={15} />
      <strong>{value}</strong>
    </div>
  )
}

function TeamPanel({
  team,
  teamPlan,
  time,
  arcanes,
  selected,
  onSelect,
}: {
  team: TeamId
  teamPlan?: TeamPlan
  time: number
  arcanes: Arcane[]
  selected: Selected
  onSelect: (selected: Selected) => void
}) {
  return (
    <aside className={`team-panel ${team}`}>
      <div className="panel-heading">
        <strong>{teamInfo[team].name}</strong>
        <span>5 Arcanes</span>
      </div>
      <div
        className="team-plan-chip"
        title={teamPlan ? `EV ${teamPlan.expectedValue} / chance ${Math.round((teamPlan.decisionChance ?? 0) * 100)}% / risco ${teamPlan.risk} / ${teamPlan.reasonTags.join(', ')}` : 'Plano ainda nao calculado'}
      >
        <em>Plano</em>
        <strong>{teamPlan ? getTeamPlanLabel(teamPlan.type) : 'Lendo mapa'}</strong>
      </div>
      <div className="arcane-list">
        {arcanes.map((arcane) => {
          const respawnRemaining = Math.max(0, Math.ceil(arcane.respawn - time))
          const nextLevelXp = XP_TO_REACH_LEVEL[Math.min(30, arcane.stats.level + 1)] ?? XP_TO_REACH_LEVEL[30]
          const currentLevelXp = Math.round(getLevelProgress(arcane.stats.xp) * 100)
          return (
            <button
              className={selected?.kind === 'arcane' && selected.id === arcane.id ? 'arcane-row selected' : 'arcane-row'}
              key={arcane.id}
              type="button"
              onClick={() => onSelect({ kind: 'arcane', id: arcane.id })}
            >
              <div className="portrait-stack">
                <span className="portrait-shell">
                  <Portrait arcane={arcane} />
                  {respawnRemaining > 0 && <span className="respawn-overlay">{respawnRemaining}</span>}
                </span>
                <span className="portrait-level">Lv {arcane.stats.level}</span>
                <div className="portrait-xp" title={`${Math.round(arcane.stats.xp)} / ${nextLevelXp} XP`}>
                  <Meter value={currentLevelXp} max={100} tone="xp" />
                  <span>XP {Math.round(arcane.stats.xp)}/{nextLevelXp}</span>
                </div>
                <span className="portrait-gold" title={`${Math.round(arcane.stats.gold)} ouro`}>
                  <Coins size={12} />
                  {Math.round(arcane.stats.gold)}
                </span>
              </div>
              <div className="arcane-readout">
                <div className="name-line">
                  <strong>{arcane.player}</strong>
                  <span>{arcane.name}</span>
                </div>
                <div className="role-line">
                  <em>{arcane.role}</em>
                  <span title={`Macro: ${arcane.macroDecision}`}>{getShortDecision(arcane.macroDecision)}</span>
                </div>
                <Meter value={arcane.stats.hp} max={arcane.stats.maxHp} tone="hp" />
                <Meter value={arcane.stats.mana} max={arcane.stats.maxMana} tone="mana" />
                <div className="slot-row" aria-label="Inventario">
                  {Array.from({ length: 6 }, (_, index) => {
                    const item = arcane.items[index]
                    const cooldown = item ? getCooldownRemaining(arcane.itemCooldowns, item, time) : 0
                    return (
                      <i key={index} title={getInventorySlotTitle(item, arcane.itemCooldowns, time)} className={getInventorySlotClassName(item, cooldown)}>
                        {getInventoryGlyph(item)}
                        {cooldown > 0 && <span className="cooldown-badge">{Math.ceil(cooldown)}</span>}
                      </i>
                    )
                  })}
                  <TpSlot arcane={arcane} now={time} compact />
                </div>
                <SkillKeyRow skills={getHeroDefinition(arcane.heroDefinitionId).skills ?? []} compact arcane={arcane} now={time} />
              </div>
            </button>
          )
        })}
      </div>
    </aside>
  )
}

function MapPanel({
  dayCycle,
  state,
  stateRef,
  selected,
  onSelect,
}: {
  dayCycle: DayCycle
  state: SimulationState
  stateRef: React.RefObject<SimulationState | undefined>
  selected: Selected
  onSelect: (selected: Selected) => void
}) {
  function handleMapPanelClick(event: MouseEvent<HTMLElement>) {
    const target = event.target as HTMLElement | null
    if (target?.closest('button')) return

    const rect = event.currentTarget.getBoundingClientRect()
    const point = {
      x: ((event.clientX - rect.left) / Math.max(1, rect.width)) * 100,
      y: ((event.clientY - rect.top) / Math.max(1, rect.height)) * 100,
    }
    const currentState = stateRef.current
    if (!currentState) return

    const aliveArcanes = currentState.arcanes.filter((arcane) => arcane.respawn <= currentState.time && arcane.stats.hp > 0)
    const arcane = nearest(point, aliveArcanes, 3.2)
    if (arcane) {
      onSelect({ kind: 'arcane', id: arcane.id })
      return
    }

    if (currentState.boss.hp > 0 && currentState.boss.respawn <= currentState.time && distance(point, currentState.boss.pos) <= 4.2) {
      onSelect({ kind: 'boss', id: currentState.boss.id })
      return
    }

    const creep = nearest(point, currentState.creeps, 2.4)
    if (creep) onSelect({ kind: 'creep', id: creep.id })
  }

  return (
    <section className={`map-panel ${dayCycle}`} aria-label="Mapa da partida" onClick={handleMapPanelClick}>
      <FrameCounter />
      <svg className="map-lines" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <linearGradient id="river" x1="0" x2="1" y1="1" y2="0">
            <stop offset="0%" stopColor="#1a6b83" />
            <stop offset="100%" stopColor="#61d7ff" />
          </linearGradient>
        </defs>
        <path className="river" d="M 6 8 C 27 26, 39 38, 50 50 S 73 74, 94 92" />
        <path className="highground highground-dawn" d="M 3.5 79 L 9 73 L 18 80 L 28 88 L 32 92 L 25 96 L 3.5 96 Z" />
        <path className="highground-rim highground-rim-dawn" d="M 6 78 C 12 78, 18 81, 24 86 S 29 90, 32 92" />
        <path className="highground highground-dusk" d="M 75 4 L 96.5 4 L 96.5 21 L 91 27 L 82 20 L 72 12 L 68 8 Z" />
        <path className="highground-rim highground-rim-dusk" d="M 68 8 C 72 10, 78 13, 84 18 S 90 22, 94 22" />
        {(['top', 'mid', 'bot'] as LaneId[]).map((lane) => (
          <polyline key={lane} className={`lane-line ${lane}`} points={lanePaths.dawn[lane].map((point) => `${point.x},${point.y}`).join(' ')} />
        ))}
      </svg>

      <span className="lane-label top">Topo</span>
      <span className="lane-label mid">Meio</span>
      <span className="lane-label bot">Baixo</span>

      <AttackRangeCanvasLayer stateRef={stateRef} selected={selected} />

      <FxCanvasLayer
        stateRef={stateRef}
      />

      {state.bases.map((base) => (
        <MapNode
          key={base.id}
          type="base"
          point={base.pos}
          team={base.team}
          hp={base.hp}
          maxHp={base.maxHp}
          backdoorProtected={isStructureBackdoorProtectedForTeam(state, base.team === 'dawn' ? 'dusk' : 'dawn', base)}
          fortified={isStructureFortified(state, base)}
          selected={selected?.kind === 'base' && selected.id === base.id}
          title={`Base ${teamInfo[base.team].name}`}
          onClick={() => onSelect({ kind: 'base', id: base.id })}
        />
      ))}
      {state.towers.filter((tower) => tower.hp > 0).map((tower) => (
        <MapNode
          key={tower.id}
          type="tower"
          point={tower.pos}
          team={tower.team}
          hp={tower.hp}
          maxHp={tower.maxHp}
          backdoorProtected={isStructureBackdoorProtectedForTeam(state, tower.team === 'dawn' ? 'dusk' : 'dawn', tower)}
          fortified={isStructureFortified(state, tower)}
          selected={selected?.kind === 'tower' && selected.id === tower.id}
          label={`T${tower.tier}`}
          title={`Torre T${tower.tier} ${laneNames[tower.lane]} - ${teamInfo[tower.team].name}`}
          onClick={() => onSelect({ kind: 'tower', id: tower.id })}
        />
      ))}
      {state.structures.filter((structure) => structure.hp > 0).map((structure) => (
        <MapNode
          key={structure.id}
          type="structure"
          point={structure.pos}
          team={structure.team}
          hp={structure.hp}
          maxHp={structure.maxHp}
          backdoorProtected={isStructureBackdoorProtectedForTeam(state, structure.team === 'dawn' ? 'dusk' : 'dawn', structure)}
          fortified={isStructureFortified(state, structure)}
          selected={selected?.kind === 'structure' && selected.id === structure.id}
          variant={structure.kind}
          label={getStructureMapLabel(structure)}
          title={`${getStructureLabel(structure)} - ${teamInfo[structure.team].name}`}
          onClick={() => onSelect({ kind: 'structure', id: structure.id })}
        />
      ))}
      {state.camps.map((camp) => (
        <button
          key={camp.id}
          className={selected?.kind === 'camp' && selected.id === camp.id ? `camp-node ${camp.strength} selected` : `camp-node ${camp.strength}`}
          style={{
            ...place(camp.pos),
            '--hp-empty': `${getHealthRingEmptyAngle(camp.hp, camp.maxHp)}deg`,
          } as React.CSSProperties}
          type="button"
          title={`${camp.name} - campo ${campStrengthLabel(camp.strength)}${camp.stackCount > 0 ? ` / stack x${camp.stackCount + 1}` : ''}`}
          aria-label={`${camp.name} - campo ${campStrengthLabel(camp.strength)}${camp.stackCount > 0 ? ` / stack x${camp.stackCount + 1}` : ''}`}
          onClick={() => onSelect({ kind: 'camp', id: camp.id })}
        >
          <Zap size={12} />
          {camp.stackCount > 0 && camp.hp > 0 && <span className="camp-stack-badge">x{camp.stackCount + 1}</span>}
          {camp.hp <= 0 && camp.respawn > state.time && (
            <span className="respawn-timer">{Math.ceil(camp.respawn - state.time)}</span>
          )}
        </button>
      ))}
      {state.runes.map((rune) => (
        <button
          key={rune.id}
          className={selected?.kind === 'rune' && selected.id === rune.id ? `rune-node ${rune.kind} selected` : `rune-node ${rune.kind}`}
          style={place(rune.pos) as React.CSSProperties}
          type="button"
          title={getRuneTitle(rune)}
          aria-label={getRuneTitle(rune)}
          onClick={() => onSelect({ kind: 'rune', id: rune.id })}
        >
          <span>{getRuneGlyph(rune)}</span>
        </button>
      ))}
      {state.boss.hp > 0 && (
        <BossCanvasLayer
          stateRef={stateRef}
          selected={selected}
        />
      )}
      <CreepCanvasLayer
        stateRef={stateRef}
        selected={selected}
      />
      <ArcaneCanvasLayer
        stateRef={stateRef}
        selected={selected}
      />
    </section>
  )
}

function FrameCounter() {
  const [fps, setFps] = useState(0)

  useEffect(() => {
    let frame = 0
    let frames = 0
    let lastSample = performance.now()

    const tick = (now: number) => {
      frames += 1
      const elapsed = now - lastSample
      if (elapsed >= 500) {
        setFps(Math.round((frames * 1000) / elapsed))
        frames = 0
        lastSample = now
      }
      frame = window.requestAnimationFrame(tick)
    }

    frame = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frame)
  }, [])

  return (
    <div className="frame-counter" aria-label={`FPS ${fps}`}>
      <strong>{fps}</strong>
      <span>FPS</span>
    </div>
  )
}

const drawStats: Record<string, { ms: number; calls: number }> = {}
if (import.meta.env.DEV) {
  ;(window as unknown as { __lotaDrawStats?: typeof drawStats }).__lotaDrawStats = drawStats
}

function timeDraw(name: string, draw: () => void) {
  if (!import.meta.env.DEV) {
    draw()
    return
  }
  const start = performance.now()
  draw()
  const bucket = drawStats[name] ?? (drawStats[name] = { ms: 0, calls: 0 })
  bucket.ms += performance.now() - start
  bucket.calls += 1
}

function CreepCanvasLayer({
  stateRef,
  selected,
}: {
  stateRef: React.RefObject<SimulationState | undefined>
  selected: Selected
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const visualPositions = useRef(new Map<string, VisualPosition>())
  const latest = useRef({ selected })

  latest.current = { selected }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined

    let frame = 0
    // Desenha a cada rAF: a interpolação visual (getBufferedVisualPosition)
    // gera posições novas entre os frames de 0.2s do worker — qualquer gate
    // por "frame novo" derruba o movimento para 5 FPS.
    const draw = () => {
      const current = latest.current
      const currentState = stateRef.current
      if (!currentState) {
        frame = window.requestAnimationFrame(draw)
        return
      }
      const selectedId = current.selected?.kind === 'creep' ? current.selected.id : undefined
      timeDraw('creep', () => drawCreepCanvas(
        canvas,
        currentState.creeps,
        selectedId,
        visualPositions.current,
      ))
      frame = window.requestAnimationFrame(draw)
    }

    frame = window.requestAnimationFrame(draw)
    return () => window.cancelAnimationFrame(frame)
  }, [stateRef])

  return (
    <canvas
      ref={canvasRef}
      className="creep-canvas"
      aria-label="Creeps da rota"
    />
  )
}

type VisualPosition = {
  samples: Array<{ pos: Point; at: number }>
}

const visualInterpolationDelayMs = 250
const visualExtrapolationLimitMs = 90
const visualPruneSchedule = new WeakMap<Map<string, VisualPosition>, number>()

function pruneVisualPositionsOccasionally(visualPositions: Map<string, VisualPosition>, liveIds: string[]) {
  const now = performance.now()
  const nextVisualPruneAt = visualPruneSchedule.get(visualPositions) ?? 0
  if (now < nextVisualPruneAt) return
  visualPruneSchedule.set(visualPositions, now + 1000)
  const live = new Set(liveIds)
  for (const id of visualPositions.keys()) {
    if (!live.has(id)) visualPositions.delete(id)
  }
}

function getBufferedVisualPosition(
  id: string,
  target: Point,
  visualPositions: Map<string, VisualPosition>,
  snapDistance: number,
) {
  const now = performance.now()
  const track = visualPositions.get(id)
  const lastSample = track?.samples.at(-1)
  if (!track || !lastSample || distance(lastSample.pos, target) > snapDistance) {
    visualPositions.set(id, { samples: [{ pos: { ...target }, at: now }] })
    return target
  }

  if (distance(lastSample.pos, target) > 0.015) {
    track.samples.push({ pos: { ...target }, at: now })
    if (track.samples.length > 14) track.samples.splice(0, track.samples.length - 14)
  }

  const renderAt = now - visualInterpolationDelayMs
  const samples = track.samples
  if (samples.length === 1 || renderAt <= samples[0].at) return samples[0].pos

  for (let index = 1; index < samples.length; index += 1) {
    const previous = samples[index - 1]
    const next = samples[index]
    if (renderAt <= next.at) {
      const duration = Math.max(1, next.at - previous.at)
      const ratio = clampNumber((renderAt - previous.at) / duration, 0, 1)
      return {
        x: previous.pos.x + (next.pos.x - previous.pos.x) * ratio,
        y: previous.pos.y + (next.pos.y - previous.pos.y) * ratio,
      }
    }
  }

  if (samples.length >= 2) {
    const previous = samples[samples.length - 2]
    const latest = samples[samples.length - 1]
    const sampleDelta = Math.max(1, latest.at - previous.at)
    const extrapolateMs = Math.min(visualExtrapolationLimitMs, Math.max(0, renderAt - latest.at))
    const ratio = extrapolateMs / sampleDelta
    return {
      x: latest.pos.x + (latest.pos.x - previous.pos.x) * ratio,
      y: latest.pos.y + (latest.pos.y - previous.pos.y) * ratio,
    }
  }

  return samples[samples.length - 1].pos
}

function drawCreepCanvas(
  canvas: HTMLCanvasElement,
  creeps: Creep[],
  selectedId: string | undefined,
  visualPositions: Map<string, VisualPosition>,
) {
  const { viewport, dpr, width, height } = prepareCanvasForDraw(canvas)
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width
    canvas.height = height
  }

  const context = canvas.getContext('2d')
  if (!context) return

  context.clearRect(0, 0, width, height)
  context.save()
  context.scale(dpr, dpr)

  pruneVisualPositionsOccasionally(visualPositions, creeps.map((creep) => creep.id))

  for (const creep of creeps) {
    const visual = getBufferedVisualPosition(
      creep.id,
      creep.pos,
      visualPositions,
      9,
    )
    const point = clampToMapBounds(visual)
    const x = (point.x / 100) * viewport.width
    const y = (point.y / 100) * viewport.height
    const radius = creep.type === 'siege' ? 5.6 : creep.type === 'mage' || creep.type === 'flagbearer' ? 4.8 : 4.2
    const teamColor = teamInfo[creep.team].primary
    const hpRatio = Math.max(0, Math.min(1, creep.hp / Math.max(1, creep.maxHp)))
    const fillHeight = radius * 2 * hpRatio

    context.beginPath()
    context.arc(x, y, radius + 1.5, 0, Math.PI * 2)
    context.fillStyle = 'rgba(0, 0, 0, 0.62)'
    context.fill()

    context.save()
    context.beginPath()
    context.arc(x, y, radius, 0, Math.PI * 2)
    context.clip()
    context.fillStyle = 'rgba(255, 255, 255, 0.16)'
    context.fillRect(x - radius, y - radius, radius * 2, radius * 2)
    context.fillStyle = teamColor
    context.fillRect(x - radius, y + radius - fillHeight, radius * 2, fillHeight)
    context.restore()

    context.lineWidth = creep.id === selectedId ? 2.2 : 1
    context.strokeStyle = creep.id === selectedId ? '#f6c85d' : 'rgba(0, 0, 0, 0.74)'
    context.beginPath()
    context.arc(x, y, radius + (creep.id === selectedId ? 2 : 0.5), 0, Math.PI * 2)
    context.stroke()
  }

  context.restore()
}

function ArcaneCanvasLayer({
  stateRef,
  selected,
}: {
  stateRef: React.RefObject<SimulationState | undefined>
  selected: Selected
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const visualPositions = useRef(new Map<string, VisualPosition>())
  const latest = useRef({ selected })

  latest.current = { selected }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined

    let frame = 0
    // Sem gate por frame: ver comentário no CreepCanvasLayer.
    const draw = () => {
      const current = latest.current
      const currentState = stateRef.current
      if (!currentState) {
        frame = window.requestAnimationFrame(draw)
        return
      }
      const selectedId = current.selected?.kind === 'arcane' ? current.selected.id : undefined
      timeDraw('arcane', () => drawArcaneCanvas(
        canvas,
        currentState.arcanes,
        selectedId,
        currentState.timedEffects,
        currentState.time,
        visualPositions.current,
      ))
      frame = window.requestAnimationFrame(draw)
    }

    frame = window.requestAnimationFrame(draw)
    return () => window.cancelAnimationFrame(frame)
  }, [stateRef])

  return (
    <canvas
      ref={canvasRef}
      className="arcane-canvas"
      aria-label="Arcanes no mapa"
    />
  )
}

function drawArcaneCanvas(
  canvas: HTMLCanvasElement,
  arcanes: Arcane[],
  selectedId: string | undefined,
  timedEffects: TimedEffect[],
  now: number,
  visualPositions: Map<string, VisualPosition>,
) {
  const { viewport, dpr, width, height } = prepareCanvasForDraw(canvas)
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width
    canvas.height = height
  }

  const context = canvas.getContext('2d')
  if (!context) return

  const aliveArcanes = arcanes.filter((arcane) => arcane.respawn <= now && arcane.stats.hp > 0)
  pruneVisualPositionsOccasionally(visualPositions, aliveArcanes.map((arcane) => arcane.id))

  context.clearRect(0, 0, width, height)
  context.save()
  context.scale(dpr, dpr)
  const activeEffectsByTarget = groupActiveEffectsByTarget(timedEffects, now)

  for (const arcane of aliveArcanes) {
    const visual = getArcaneVisualPosition(arcane, visualPositions)
    drawArcaneToken(context, viewport, arcane, visual, selectedId === arcane.id, activeEffectsByTarget, now)
  }

  context.restore()
}

function getArcaneVisualPosition(arcane: Arcane, visualPositions: Map<string, VisualPosition>) {
  return getBufferedVisualPosition(
    arcane.id,
    arcane.pos,
    visualPositions,
    18,
  )
}

function drawArcaneToken(
  context: CanvasRenderingContext2D,
  viewport: CanvasViewport,
  arcane: Arcane,
  visualPos: Point,
  selected: boolean,
  activeEffectsByTarget: Map<string, TimedEffect['kind'][]>,
  now: number,
) {
  const point = toCanvasPoint(visualPos, viewport)
  const teamColor = teamInfo[arcane.team].primary
  const radius = 14
  const hpRatio = Math.max(0, Math.min(1, arcane.stats.hp / Math.max(1, arcane.stats.maxHp)))
  const emptyAngle = (1 - hpRatio) * Math.PI * 2

  context.save()
  context.translate(point.x, point.y)

  context.fillStyle = 'rgba(0, 0, 0, 0.56)'
  context.beginPath()
  context.arc(0, 0, radius + 2, 0, Math.PI * 2)
  context.fill()

  context.strokeStyle = 'rgba(255, 255, 255, 0.16)'
  context.lineWidth = 4
  context.beginPath()
  context.arc(0, 0, radius, -Math.PI / 2, Math.PI * 1.5)
  context.stroke()

  context.strokeStyle = teamColor
  context.lineWidth = 4
  context.beginPath()
  context.arc(0, 0, radius, -Math.PI / 2 + emptyAngle, Math.PI * 1.5)
  context.stroke()

  context.fillStyle = '#10161b'
  context.beginPath()
  context.arc(0, 0, radius - 4, 0, Math.PI * 2)
  context.fill()

  context.fillStyle = '#fffdf5'
  context.font = '900 9px Inter, system-ui, sans-serif'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(arcane.portrait, 0, 0)

  if (selected) {
    context.strokeStyle = 'rgba(246, 200, 93, 0.78)'
    context.lineWidth = 2.5
    context.beginPath()
    context.arc(0, 0, radius + 5, 0, Math.PI * 2)
    context.stroke()
  }

  drawChannelingBar(context, arcane, radius, now)
  drawArcaneEffectBadges(context, activeEffectsByTarget.get(arcane.id) ?? [])
  context.restore()
}

function drawChannelingBar(context: CanvasRenderingContext2D, arcane: Arcane, radius: number, now: number) {
  const channel = arcane.channeling
  if (!channel) return

  const barWidth = 34
  const barHeight = 5
  const x = -barWidth / 2
  const y = -radius - 15
  const visibleProgress = getChannelingProgress(channel, now)

  context.save()
  context.fillStyle = 'rgba(2, 8, 11, 0.82)'
  roundRect(context, x - 1, y - 1, barWidth + 2, barHeight + 2, 3)
  context.fill()

  const fillWidth = barWidth * visibleProgress
  context.fillStyle = channel.kind === 'teleport' ? '#55e2ff' : '#f6c85d'
  roundRect(context, x, y, fillWidth, barHeight, 2.5)
  context.fill()

  context.fillStyle = '#fffdf5'
  context.font = '900 6px Inter, system-ui, sans-serif'
  context.textAlign = 'center'
  context.textBaseline = 'bottom'
  context.fillText(channel.kind === 'teleport' ? 'TP' : 'CAST', 0, y - 2)
  context.restore()
}

function getChannelingProgress(channel: ChannelingAction, now: number) {
  const duration = Math.max(0.1, channel.completesAt - channel.startedAt)
  return clampNumber((now - channel.startedAt) / duration, 0, 1)
}

function roundRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  const safeRadius = Math.min(radius, width / 2, height / 2)
  context.beginPath()
  context.moveTo(x + safeRadius, y)
  context.lineTo(x + width - safeRadius, y)
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius)
  context.lineTo(x + width, y + height - safeRadius)
  context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height)
  context.lineTo(x + safeRadius, y + height)
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius)
  context.lineTo(x, y + safeRadius)
  context.quadraticCurveTo(x, y, x + safeRadius, y)
  context.closePath()
}

function drawArcaneEffectBadges(
  context: CanvasRenderingContext2D,
  activeKinds: TimedEffect['kind'][],
) {
  const uniqueKinds = Array.from(new Set(activeKinds)).slice(0, 4)

  uniqueKinds.forEach((kind, index) => {
    const angle = -Math.PI / 4 + index * (Math.PI / 5)
    const x = Math.cos(angle) * 17
    const y = Math.sin(angle) * 17
    const label = getEffectGlyph(kind)
    context.fillStyle = getEffectCanvasColor(kind)
    context.beginPath()
    context.arc(x, y, 5.2, 0, Math.PI * 2)
    context.fill()
    context.fillStyle = '#091016'
    context.font = '900 7px Inter, system-ui, sans-serif'
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillText(label, x, y + 0.2)
  })
}

function groupActiveEffectsByTarget(timedEffects: TimedEffect[], now: number) {
  const grouped = new Map<string, TimedEffect['kind'][]>()
  for (const effect of timedEffects) {
    if (effect.expiresAt <= now) continue
    const current = grouped.get(effect.targetId)
    if (current) {
      current.push(effect.kind)
    } else {
      grouped.set(effect.targetId, [effect.kind])
    }
  }
  return grouped
}

function getEffectGlyph(kind: TimedEffect['kind']) {
  if (kind === 'stun') return 'Z'
  if (kind === 'silence') return 'S'
  if (kind === 'slow') return '*'
  if (kind === 'dot') return 'D'
  if (kind === 'barrier') return 'B'
  if (kind === 'buff') return '+'
  return 'H'
}

function getEffectCanvasColor(kind: TimedEffect['kind']) {
  if (kind === 'dot' || kind === 'silence') return '#ff5b6e'
  if (kind === 'barrier' || kind === 'buff' || kind === 'hot') return '#d7f171'
  if (kind === 'stun') return '#f6c85d'
  return '#9fd0ff'
}

function BossCanvasLayer({
  stateRef,
  selected,
}: {
  stateRef: React.RefObject<SimulationState | undefined>
  selected: Selected
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const visualPositions = useRef(new Map<string, VisualPosition>())
  const latest = useRef({ selected })

  latest.current = { selected }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined

    let frame = 0
    // Sem gate por frame: ver comentário no CreepCanvasLayer.
    const draw = () => {
      const currentState = stateRef.current
      if (currentState) {
        timeDraw('boss', () => drawBossCanvas(
          canvas,
          currentState.boss,
          latest.current.selected?.kind === 'boss' && latest.current.selected.id === currentState.boss.id,
          currentState.time,
          visualPositions.current,
        ))
      }
      frame = window.requestAnimationFrame(draw)
    }

    frame = window.requestAnimationFrame(draw)
    return () => window.cancelAnimationFrame(frame)
  }, [stateRef])

  return (
    <canvas
      ref={canvasRef}
      className="boss-canvas"
      aria-label="Serpente do Eclipse"
    />
  )
}

function drawBossCanvas(
  canvas: HTMLCanvasElement,
  boss: Boss,
  selected: boolean,
  now: number,
  visualPositions: Map<string, VisualPosition>,
) {
  const { viewport, dpr, width, height } = prepareCanvasForDraw(canvas)
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width
    canvas.height = height
  }

  const context = canvas.getContext('2d')
  if (!context) return

  context.clearRect(0, 0, width, height)
  if (boss.hp <= 0 || boss.respawn > now) return

  context.save()
  context.scale(dpr, dpr)
  const visual = getBufferedVisualPosition(boss.id, boss.pos, visualPositions, 20)
  const point = toCanvasPoint(visual, viewport)
  const radius = 22
  const hpRatio = Math.max(0, Math.min(1, boss.hp / Math.max(1, boss.maxHp)))
  const emptyAngle = (1 - hpRatio) * Math.PI * 2

  context.translate(point.x, point.y)
  context.fillStyle = 'rgba(0, 0, 0, 0.56)'
  context.beginPath()
  context.arc(0, 0, radius + 2, 0, Math.PI * 2)
  context.fill()

  context.strokeStyle = 'rgba(255, 255, 255, 0.16)'
  context.lineWidth = 5
  context.beginPath()
  context.arc(0, 0, radius, -Math.PI / 2, Math.PI * 1.5)
  context.stroke()

  context.strokeStyle = '#ff8e50'
  context.beginPath()
  context.arc(0, 0, radius, -Math.PI / 2 + emptyAngle, Math.PI * 1.5)
  context.stroke()

  context.fillStyle = '#271114'
  context.beginPath()
  context.arc(0, 0, radius - 5, 0, Math.PI * 2)
  context.fill()

  context.fillStyle = '#fff8d8'
  context.font = '900 16px Inter, system-ui, sans-serif'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText('S', 0, 0)

  if (selected) {
    context.strokeStyle = 'rgba(246, 200, 93, 0.86)'
    context.lineWidth = 2.5
    context.beginPath()
    context.arc(0, 0, radius + 6, 0, Math.PI * 2)
    context.stroke()
  }
  context.restore()
}

function FxCanvasLayer({ stateRef }: { stateRef: React.RefObject<SimulationState | undefined> }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined

    let frame = 0
    // Sem gate por frame: ver comentário no CreepCanvasLayer.
    const draw = () => {
      const currentState = stateRef.current
      if (currentState) {
        timeDraw('fx', () => drawFxCanvas(
          canvas,
          currentState.effects,
          currentState.deathMarkers,
          currentState.denyMarkers,
          currentState.goldMarkers,
          currentState.skillMarkers ?? [],
          currentState.time,
        ))
      }
      frame = window.requestAnimationFrame(draw)
    }

    frame = window.requestAnimationFrame(draw)
    return () => window.cancelAnimationFrame(frame)
  }, [stateRef])

  return <canvas ref={canvasRef} className="fx-canvas" aria-hidden="true" />
}

function drawFxCanvas(
  canvas: HTMLCanvasElement,
  effects: AttackEffect[],
  deathMarkers: DeathMarker[],
  denyMarkers: DenyMarker[],
  goldMarkers: GoldMarker[],
  skillMarkers: SkillMarker[],
  now: number,
) {
  const { viewport, dpr, width, height } = prepareCanvasForDraw(canvas)
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width
    canvas.height = height
  }

  const context = canvas.getContext('2d')
  if (!context) return

  context.clearRect(0, 0, width, height)
  context.save()
  context.scale(dpr, dpr)

  for (const effect of effects) {
    drawAttackFx(context, viewport, effect, now)
  }
  for (const marker of deathMarkers) {
    drawFloatingText(context, viewport, marker.pos, 'X', teamInfo[marker.team].primary, marker.createdAt, marker.expiresAt, now, 18, 0)
  }
  for (const marker of denyMarkers) {
    drawFloatingText(context, viewport, marker.pos, '!', teamInfo[marker.team].primary, marker.createdAt, marker.expiresAt, now, 19, -4)
  }
  for (const marker of goldMarkers) {
    drawFloatingText(context, viewport, marker.pos, `+${marker.amount}g`, teamInfo[marker.team].primary, marker.createdAt, marker.expiresAt, now, 12, -8)
  }
  for (const marker of skillMarkers) {
    drawFloatingText(context, viewport, marker.pos, marker.label, teamInfo[marker.team].primary, marker.createdAt, marker.expiresAt, now, 11, -18)
  }

  context.restore()
}

function drawAttackFx(context: CanvasRenderingContext2D, viewport: CanvasViewport, effect: AttackEffect, now: number) {
  const progress = Math.min(1, Math.max(0, (now - effect.createdAt) / effect.duration))
  const alpha = Math.max(0, 1 - progress)
  if (alpha <= 0) return

  const from = toCanvasPoint(effect.from, viewport)
  const to = toCanvasPoint(effect.to, viewport)
  const teamColor = teamInfo[effect.team].primary
  const targetRadius = effect.targetKind === 'tower' || effect.targetKind === 'structure' || effect.targetKind === 'base'
    ? 5.8
    : effect.targetKind === 'boss'
      ? 7.5
      : 4.8

  context.save()
  context.globalAlpha = alpha
  context.strokeStyle = teamColor
  context.lineWidth = effect.kind === 'tower' ? 2.4 : effect.kind === 'arcane' ? 1.8 : 1.2
  context.beginPath()
  context.moveTo(from.x, from.y)
  const beamX = from.x + (to.x - from.x) * Math.min(1, progress + 0.35)
  const beamY = from.y + (to.y - from.y) * Math.min(1, progress + 0.35)
  context.lineTo(beamX, beamY)
  context.stroke()

  context.globalAlpha = alpha * 0.8
  context.fillStyle = teamColor
  context.beginPath()
  context.arc(to.x, to.y, targetRadius * (0.55 + progress * 0.7), 0, Math.PI * 2)
  context.fill()
  context.restore()
}

function drawFloatingText(
  context: CanvasRenderingContext2D,
  viewport: CanvasViewport,
  point: Point,
  label: string,
  color: string,
  createdAt: number,
  expiresAt: number,
  now: number,
  size: number,
  yOffset: number,
) {
  const lifetime = Math.max(0.01, expiresAt - createdAt)
  const progress = Math.min(1, Math.max(0, (now - createdAt) / lifetime))
  const alpha = Math.max(0, 1 - progress)
  if (alpha <= 0) return

  const canvasPoint = toCanvasPoint(point, viewport)
  const y = canvasPoint.y + yOffset - progress * 16
  context.save()
  context.globalAlpha = alpha
  context.font = `700 ${size}px Inter, system-ui, sans-serif`
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.lineWidth = 3
  context.strokeStyle = 'rgba(0, 0, 0, 0.72)'
  context.strokeText(label, canvasPoint.x, y)
  context.fillStyle = color
  context.fillText(label, canvasPoint.x, y)
  context.restore()
}

function toCanvasPoint(point: Point, viewport: CanvasViewport) {
  const clamped = clampToMapBounds(point)
  return {
    x: (clamped.x / 100) * viewport.width,
    y: (clamped.y / 100) * viewport.height,
  }
}

function AttackRangeCanvasLayer({
  stateRef,
  selected,
}: {
  stateRef: React.RefObject<SimulationState | undefined>
  selected: Selected
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const visualPositions = useRef(new Map<string, VisualPosition>())
  const latest = useRef({ selected })

  latest.current = { selected }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined

    let frame = 0
    // Sem gate por frame: ver comentário no CreepCanvasLayer.
    const draw = () => {
      const currentState = stateRef.current
      if (currentState) {
        timeDraw('range', () => drawAttackRangeCanvas(canvas, currentState, latest.current.selected, visualPositions.current))
      }
      frame = window.requestAnimationFrame(draw)
    }

    frame = window.requestAnimationFrame(draw)
    return () => window.cancelAnimationFrame(frame)
  }, [stateRef])

  return <canvas ref={canvasRef} className="attack-range-canvas" aria-hidden="true" />
}

function drawAttackRangeCanvas(
  canvas: HTMLCanvasElement,
  state: SimulationState,
  selected: Selected,
  visualPositions: Map<string, VisualPosition>,
) {
  const { viewport, dpr, width, height } = prepareCanvasForDraw(canvas)
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width
    canvas.height = height
  }

  const context = canvas.getContext('2d')
  if (!context) return
  context.clearRect(0, 0, width, height)

  const entity = findSelected(state, selected)
  const range = getEntityAttackRange(entity)
  const pos = getEntityPosition(entity)
  if (!entity || !pos || range === undefined || range <= 0) {
    pruneVisualPositionsOccasionally(visualPositions, [])
    return
  }
  pruneVisualPositionsOccasionally(visualPositions, [`range-${entity.id}`])

  const visualPos = shouldBufferRangeEntity(entity)
    ? getBufferedVisualPosition(`range-${entity.id}`, pos, visualPositions, getRangeSnapDistance(entity))
    : pos
  const point = toCanvasPoint(visualPos, viewport)
  const radius = (range / 100) * viewport.width

  context.save()
  context.scale(dpr, dpr)
  context.fillStyle = 'rgba(246, 200, 93, 0.08)'
  context.strokeStyle = 'rgba(246, 200, 93, 0.58)'
  context.lineWidth = 1.25
  context.setLineDash([5, 4])
  context.beginPath()
  context.arc(point.x, point.y, radius, 0, Math.PI * 2)
  context.fill()
  context.stroke()
  context.restore()
}

type CanvasViewport = {
  width: number
  height: number
}

function prepareCanvasForDraw(canvas: HTMLCanvasElement) {
  const dpr = Math.min(maxCanvasDevicePixelRatio, window.devicePixelRatio || 1)
  const viewport = {
    width: Math.max(1, canvas.clientWidth),
    height: Math.max(1, canvas.clientHeight),
  }
  return {
    viewport,
    dpr,
    width: Math.max(1, Math.floor(viewport.width * dpr)),
    height: Math.max(1, Math.floor(viewport.height * dpr)),
  }
}

function shouldBufferRangeEntity(entity: Arcane | Creep | Tower | Structure | Base | Camp | Boss | MapRune) {
  if (isMapRune(entity)) return false
  return 'player' in entity || 'type' in entity || isBoss(entity)
}

function getRangeSnapDistance(entity: Arcane | Creep | Tower | Structure | Base | Camp | Boss | MapRune) {
  if (isBoss(entity)) return 20
  if ('player' in entity) return 18
  if ('type' in entity) return 9
  return 1
}

function EventFeed({ events }: { events: MatchEvent[] }) {
  return (
    <aside className="event-feed" aria-label="Eventos importantes">
      <div className="event-feed-title">
        <Swords size={14} />
        <strong>Eventos</strong>
      </div>
      {events.length === 0 ? (
        <p>Aguardando primeiro abate</p>
      ) : (
        <ol>
          {events.slice(0, 8).map((event) => (
            <li key={event.id} style={{ '--team': teamInfo[event.team].primary } as React.CSSProperties}>
              <time>{formatTime(event.time)}</time>
              <span>
                <strong className="kill-line">
                  <b style={{ '--name-color': teamInfo[event.actorTeam].primary } as React.CSSProperties}>{event.actor}</b>
                  <Swords size={12} aria-label="abateu" />
                  <b style={{ '--name-color': teamInfo[event.victimTeam].primary } as React.CSSProperties}>{event.victim}</b>
                </strong>
                <em>{event.detail}</em>
              </span>
            </li>
          ))}
        </ol>
      )}
    </aside>
  )
}

function MapNode({
  hp,
  maxHp,
  backdoorProtected = false,
  fortified = false,
  point,
  team,
  type,
  variant,
  label,
  title,
  selected,
  onClick,
}: {
  hp: number
  maxHp: number
  backdoorProtected?: boolean
  fortified?: boolean
  point: Point
  team: TeamId
  type: 'tower' | 'structure' | 'base'
  variant?: StructureKind
  label?: string
  title: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      className={selected ? `map-node ${type} ${variant ?? ''} ${team} selected` : `map-node ${type} ${variant ?? ''} ${team}`}
      style={{
        ...place(point),
        '--team': teamInfo[team].primary,
        '--hp-empty': `${getHealthRingEmptyAngle(hp, maxHp)}deg`,
      } as React.CSSProperties}
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
    >
      {type === 'base'
        ? <Swords size={16} />
        : variant?.startsWith('barracks')
          ? <span className="barracks-icon" aria-hidden="true" />
          : <TowerControl size={13} />}
      {(backdoorProtected || fortified) && (
        <span className="structure-protection">
          {backdoorProtected && <b title="Backdoor ativo">BD</b>}
          {fortified && <b className="fortified" title="Fortification ativa">G</b>}
        </span>
      )}
      {label && <span className="node-label">{label}</span>}
    </button>
  )
}

function Inspector({ entity, state }: { entity: Arcane | Creep | Tower | Structure | Base | Camp | Boss | MapRune | undefined; state: SimulationState }) {
  if (!entity) return <div className="detail-empty">Selecione um Arcane, torre, base, creep ou campo neutro.</div>

  if ('player' in entity) {
    const heroDefinition = getHeroDefinition(entity.heroDefinitionId)
    const calculated = calculateHeroStats(heroDefinition, entity.stats.level, [
      ...getItemStatModifiers(entity.items, heroDefinition),
      ...getStatBonusModifiers(entity.statBonusLevels),
    ])
    const auraMultiplier = getAuraMultiplier(state, entity.team)
    const damageRange = getArcaneDamageRangeLabel(state, entity, auraMultiplier)
    const teamPlan = state.teamPlans[entity.team]
    const activeEffects = getActiveEffectLabels(state, entity)
    const hpPercent = Math.round((entity.stats.hp / Math.max(1, entity.stats.maxHp * auraMultiplier)) * 100)
    const manaPercent = Math.round((entity.stats.mana / Math.max(1, entity.stats.maxMana * auraMultiplier)) * 100)
    return (
      <div className="detail-panel arcane-detail">
        <div className="arcane-hero-card" style={{ '--team': teamInfo[entity.team].primary } as React.CSSProperties}>
          <Portrait arcane={entity} />
          <div className="detail-title">
            <span>{teamInfo[entity.team].name} / {entity.role} / {laneNames[entity.lane]}</span>
            <strong>{entity.player}</strong>
            <em>{entity.name}</em>
          </div>
          <div className="hero-card-meta">
            <DataChip label="Level" value={`${entity.stats.level}`} />
            <DataChip label="Dano" value={damageRange} />
            <DataChip label="Ouro" value={formatCompactGold(entity.stats.gold)} />
            <DataChip label="XP" value={`${Math.round(entity.stats.xp)}`} />
            <DataChip label="Pontos" value={`${entity.unspentSkillPoints}`} />
            <DataChip label="Stats" value={`+${entity.statBonusLevels}`} />
          </div>
        </div>
        <section className="data-card resource-card">
          <DataCardTitle icon={<HeartPulse size={15} />} title="Estado" />
          <ResourceLine label="Vida" value={entity.stats.hp} max={entity.stats.maxHp * auraMultiplier} tone="hp" detail={`${hpPercent}%`} />
          <ResourceLine label="Mana" value={entity.stats.mana} max={entity.stats.maxMana * auraMultiplier} tone="mana" detail={`${manaPercent}%`} />
          <div className="resource-meta">
            <DataChip label="Regen HP" value={calculated.resources.healthRegen.toFixed(1)} />
            <DataChip label="Regen MP" value={calculated.resources.manaRegen.toFixed(1)} />
            <DataChip label="Respawn" value={entity.respawn > state.time ? `${Math.ceil(entity.respawn - state.time)}s` : 'Vivo'} />
          </div>
        </section>
        <section className="data-card inventory-card">
          <ArcaneInventoryCard arcane={entity} now={state.time} />
        </section>
        <section className="data-card skills-card">
          <DataCardTitle icon={<Zap size={15} />} title="Skills" />
          <SkillKeyRow skills={heroDefinition.skills ?? []} arcane={entity} now={state.time} />
          <SkillSummary skills={heroDefinition.skills ?? []} arcane={entity} />
        </section>
        <section className="data-card">
          <DataCardTitle icon={<Target size={15} />} title="Combate" />
          <MetricGroup
            title="Ataque"
            items={[
              ['Dano', damageRange],
              ['Efet.', `${Math.round(getEffectiveArcaneDamage(state, entity) * auraMultiplier)}`],
              ['Alcance', `${entity.stats.range.toFixed(1)}`],
              ['Atk/s', `${(1 / getEffectiveArcaneAttackCooldown(state, entity)).toFixed(2)}`],
            ]}
          />
          <MetricGroup
            title="Defesa"
            items={[
              ['Armad.', `${getEffectiveArcaneArmor(state, entity).toFixed(1)}`],
              ['Barrier', `${getArcaneBarrierAmount(state, entity)}`],
              ['Fis.', `${Math.round(calculated.defense.physicalDamageReduction * 100)}%`],
              ['Mag.', `${Math.round(calculated.defense.magicResistance)}%`],
            ]}
          />
        </section>
        <section className="data-card">
          <DataCardTitle icon={<Brain size={15} />} title="IA" />
          <DecisionSummary macroDecision={entity.macroDecision} microDecision={entity.microDecision} />
          <MetricGroup
            title="Decisao"
            items={[
              ['Status', getDecisionStatusLabel(entity.decisionStatus)],
              ['Think', `${Math.max(0, entity.nextDecisionAt - state.time).toFixed(1)}s`],
              ['Modo', getPlayerModeLabel(entity.aiMode)],
              ['Exec.', `${entity.aiExecutionChance}% / ${entity.aiExecutionDelay.toFixed(1)}s`],
              ['Falha', entity.aiFailure ? getExecutionFailureLabel(entity.aiFailure) : 'Nao'],
              ['Razao', entity.aiReason],
            ]}
          />
        </section>
        <section className="data-card">
          <DataCardTitle icon={<Gauge size={15} />} title="Mapa" />
          <MetricGroup
            title="Leitura"
            items={[
              ['Agr.', `${entity.aggression}`],
              ['Call', `${entity.shotcalling}`],
              ['Perigo', `${getDangerScore(state, entity)}`],
              ['Memoria', `${getTeamMemoryDanger(state, entity.team, entity.pos)}`],
              ['Lane', `${Math.round(getLaneWinAssessment(state, entity.team, entity.lane).winChance * 100)}%`],
              ['Item', `${getItemTimingUrgency(entity, state.time)}`],
            ]}
          />
          <MetricGroup
            title="Plano"
            items={[
              ['Tipo', teamPlan ? getTeamPlanLabel(teamPlan.type) : 'Lendo mapa'],
              ['Alvo', getTeamPlanTargetLabel(state, teamPlan)],
              ['EV', teamPlan ? `${teamPlan.expectedValue}` : '-'],
              ['Chance', teamPlan?.decisionChance !== undefined ? `${Math.round(teamPlan.decisionChance * 100)}%` : '-'],
              ['Risco', teamPlan ? `${teamPlan.risk}` : '-'],
              ['Tags', teamPlan ? formatReasonTags(teamPlan.reasonTags) : '-'],
            ]}
          />
        </section>
        <section className="data-card">
          <DataCardTitle icon={<Eye size={15} />} title="Atributos e efeitos" />
          <AttributeSummary stats={calculated} />
          <MetricGroup
            title="Efeitos"
            items={[
              ['Move', `${entity.stats.moveSpeed.toFixed(1)}`],
              ['Visao', `${entity.visionRange.toFixed(1)}`],
              ['Slow', `${getArcaneSlowPercent(state, entity)}%`],
              ['Ativos', activeEffects.length ? activeEffects.join(', ') : 'Nenhum'],
            ]}
          />
        </section>
      </div>
    )
  }

  if ('tier' in entity) {
    return (
      <DetailLine
        title={`Torre T${entity.tier} - ${laneNames[entity.lane]}`}
        subtitle={`${teamInfo[entity.team].name} / ${getBackdoorInspectorLabel(state, entity)}`}
        hp={entity.hp}
        maxHp={entity.maxHp}
        damage={entity.damage}
        attackRange={entity.range}
      />
    )
  }

  if (isMapRune(entity)) {
    return (
      <div className="detail-panel unit-detail rune-detail">
        <div className={`detail-icon rune-icon ${entity.kind}`}>{getRuneGlyph(entity)}</div>
        <div className="detail-title">
          <strong>{getRuneLabel(entity)}</strong>
          <span>{getRuneInspectorSubtitle(entity, state.time)}</span>
        </div>
        <MetricGroup
          title="Recompensa"
          items={[
            ['Tipo', getRuneKindLabel(entity.kind)],
            ['Valor', getRuneRewardLabel(entity, state.time)],
            ['Spawn', formatTime(entity.spawnedAt)],
            ['Expira', entity.expiresAt ? `${Math.max(0, Math.ceil(entity.expiresAt - state.time))}s` : 'Acumula'],
          ]}
        />
      </div>
    )
  }

  if ('kind' in entity) {
    return (
      <DetailLine
        title={getStructureLabel(entity)}
        subtitle={`${teamInfo[entity.team].name} / ${getBackdoorInspectorLabel(state, entity)}`}
        hp={entity.hp}
        maxHp={entity.maxHp}
        damage={entity.damage}
        attackRange={entity.range}
      />
    )
  }

  if (isBoss(entity)) {
    const stats = getBossStats(state.time)
    return (
      <DetailLine
        title={entity.name}
        subtitle={`Chefe itinerante / escala com tempo / respawn ${entity.respawn > state.time ? `${Math.ceil(entity.respawn - state.time)}s` : 'ativo'}`}
        hp={entity.hp}
        maxHp={stats.hp}
        damage={stats.damage}
        attackRange={stats.range}
      />
    )
  }

  if ('level' in entity) {
    const rewards = getCampRewards(entity, state.time)
    return (
      <DetailLine
        title={entity.name}
        subtitle={`Campo ${campStrengthLabel(entity.strength)} / nivel ${entity.level} / stack x${entity.stackCount + 1} / ${rewards.gold}g ${rewards.xp}xp`}
        hp={entity.hp}
        maxHp={entity.maxHp}
        damage={entity.damage}
        attackRange={entity.range}
      />
    )
  }

  if ('lane' in entity) {
    return (
      <div className="detail-panel unit-detail">
        <div className="detail-icon"><Swords size={21} /></div>
        <div className="detail-title">
          <strong>{getCreepDisplayName(entity)} - {laneNames[entity.lane]}</strong>
          <span>{teamInfo[entity.team].name}</span>
        </div>
        <MetricGroup
          title="Combate"
          items={[
            ['Vida', `${Math.round(entity.hp)} / ${entity.maxHp}`],
            ['Dano', `${entity.damage}`],
            ['Alcance', `${entity.range}`],
            ['Visao', `${getCreepVisionRange(entity)}`],
          ]}
        />
        <Meter value={entity.hp} max={entity.maxHp} tone="hp" />
      </div>
    )
  }

  if ('team' in entity) {
    return <DetailLine title={`Base ${teamInfo[entity.team].name}`} subtitle="Estrutura principal" hp={entity.hp} maxHp={entity.maxHp} />
  }

  return null
}

function isBoss(entity: Arcane | Creep | Tower | Structure | Base | Camp | Boss | MapRune): entity is Boss {
  return entity.id === 'boss-world-serpent'
}

function isMapRune(entity: Arcane | Creep | Tower | Structure | Base | Camp | Boss | MapRune): entity is MapRune {
  return entity.id.startsWith('rune-')
}

function getBackdoorInspectorLabel(state: SimulationState, target: Tower | Structure | Base) {
  const attackingTeam: TeamId = target.team === 'dawn' ? 'dusk' : 'dawn'
  const fortifiedLabel = isStructureFortified(state, target)
    ? ` / fortificado ${Math.ceil(state.teamFortifications[target.team].activeUntil - state.time)}s`
    : state.teamFortifications[target.team].cooldownUntil > state.time
      ? ` / glyph cd ${Math.ceil(state.teamFortifications[target.team].cooldownUntil - state.time)}s`
      : ' / glyph pronto'
  if (!hasBackdoorProtection(target)) return `sem backdoor${fortifiedLabel}`
  const backdoorLabel = isStructureBackdoorProtectedForTeam(state, attackingTeam, target)
    ? 'backdoor ativo'
    : 'backdoor aberto'
  return `${backdoorLabel}${fortifiedLabel}`
}

function DetailLine({ title, subtitle, hp, maxHp, damage, attackRange }: { title: string; subtitle: string; hp: number; maxHp: number; damage?: number; attackRange?: number }) {
  return (
    <div className="detail-panel unit-detail">
      <div className="detail-icon"><Swords size={21} /></div>
      <div className="detail-title">
        <strong>{title}</strong>
        <span>{subtitle}</span>
      </div>
      <MetricGroup
        title="Resumo"
        items={[
          ['Vida', `${Math.round(hp)} / ${maxHp}`],
          ...(damage !== undefined ? [['Dano', `${damage}`] as [string, string]] : []),
          ...(attackRange !== undefined ? [['Alcance', `${attackRange}`] as [string, string]] : []),
        ]}
      />
      <Meter value={hp} max={maxHp} tone="hp" />
    </div>
  )
}

function AttributeSummary({ stats }: { stats: ReturnType<typeof calculateHeroStats> }) {
  return (
    <MetricGroup
      title="Atributos"
      items={[
        ['Str', stats.attributes.strength.toFixed(1)],
        ['Agi', stats.attributes.agility.toFixed(1)],
        ['Int', stats.attributes.intelligence.toFixed(1)],
        ['Total', stats.attributes.totalAttributes.toFixed(1)],
      ]}
    />
  )
}

function DataCardTitle({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="data-card-title">
      {icon}
      <strong>{title}</strong>
    </div>
  )
}

function DataChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="data-chip">
      <em>{label}</em>
      <strong>{value}</strong>
    </span>
  )
}

function ResourceLine({ label, value, max, tone, detail }: { label: string; value: number; max: number; tone: 'hp' | 'mana'; detail: string }) {
  return (
    <div className="resource-line">
      <div>
        <span>{label}</span>
        <strong>{Math.round(value)} / {Math.round(max)}</strong>
        <em>{detail}</em>
      </div>
      <Meter value={value} max={max} tone={tone} />
    </div>
  )
}

function ArcaneInventoryCard({ arcane, now }: { arcane: Arcane; now: number }) {
  const [selectedItem, setSelectedItem] = useState<string | undefined>(() => arcane.items.find(Boolean))
  const selectedStillOwned = selectedItem && arcane.items.includes(selectedItem)
  const activeItem = selectedStillOwned ? selectedItem : arcane.items.find(Boolean)

  useEffect(() => {
    if (selectedItem && arcane.items.includes(selectedItem)) return
    setSelectedItem(arcane.items.find(Boolean))
  }, [arcane.items, selectedItem])

  return (
    <>
      <DataCardTitle icon={<Package size={15} />} title="Inventario" />
      <div className="inventory-with-tp">
        <InventoryStrip
          items={arcane.items}
          cooldowns={arcane.itemCooldowns}
          now={now}
          selectedItem={activeItem}
          onItemSelect={setSelectedItem}
        />
        <TpSlot arcane={arcane} now={now} />
      </div>
      <ItemDetail itemName={activeItem} cooldowns={arcane.itemCooldowns} now={now} />
      <span className="inventory-note">{getNextPurchaseLabel(arcane)}</span>
    </>
  )
}

function InventoryStrip({
  items,
  cooldowns = {},
  now = 0,
  selectedItem,
  onItemSelect,
}: {
  items: string[]
  cooldowns?: Record<string, number>
  now?: number
  selectedItem?: string
  onItemSelect?: (item: string) => void
}) {
  return (
    <div className="inventory-strip">
      {Array.from({ length: 6 }, (_, index) => {
        const item = items[index]
        const cooldown = item ? getCooldownRemaining(cooldowns, item, now) : 0
        const className = [
          getInventorySlotClassName(item, cooldown),
          item && item === selectedItem ? 'selected' : '',
          item && onItemSelect ? 'clickable' : '',
        ].filter(Boolean).join(' ')
        if (!item) {
          return (
            <span key={index} className={className} title="Slot vazio">
              {getInventoryGlyph(item)}
            </span>
          )
        }
        return (
          <button
            key={index}
            type="button"
            className={className}
            title={getInventorySlotTitle(item, cooldowns, now)}
            aria-pressed={item === selectedItem}
            onClick={() => onItemSelect?.(item)}
          >
            {getInventoryGlyph(item)}
            {cooldown > 0 && <span className="cooldown-badge">{Math.ceil(cooldown)}</span>}
          </button>
        )
      })}
    </div>
  )
}

function ItemDetail({ itemName, cooldowns, now }: { itemName?: string; cooldowns: Record<string, number>; now: number }) {
  if (!itemName) return <div className="item-detail empty">Clique em um item para ver detalhes.</div>
  const shopItem = shopCatalog.find((item) => item.name === itemName)
  const consumable = getConsumableByName(itemName)
  const cooldown = getCooldownRemaining(cooldowns, itemName, now)

  if (!shopItem && !consumable) {
    return (
      <div className="item-detail">
        <strong>{itemName}</strong>
        <p>Item importado ainda sem detalhes de runtime.</p>
      </div>
    )
  }

  return (
    <div className="item-detail">
      <div className="item-detail-head">
        <strong>{itemName}</strong>
        <span>{consumable ? `${consumable.cost}g / consumivel` : `${shopItem?.cost ?? 0}g`}</span>
        {cooldown > 0 && <em>CD {cooldown.toFixed(1)}s</em>}
      </div>
      {shopItem && <ItemStatSummary item={shopItem} />}
      {consumable && <ConsumableSummary item={consumable} />}
      {shopItem && <ItemEffectSummary item={shopItem} />}
    </div>
  )
}

function ItemStatSummary({ item }: { item: ShopItem }) {
  const entries = [
    ['For', item.summary.strength],
    ['Agi', item.summary.agility],
    ['Int', item.summary.intelligence],
    ['Dano', item.summary.damage],
    ['AtkSpd', item.summary.attackSpeed],
    ['HP', item.summary.maxHp],
    ['Mana', item.summary.maxMana],
    ['Armor', item.summary.armor],
    ['MR', item.summary.magicResistance],
    ['Move', item.summary.moveSpeed],
    ['Move%', item.summary.moveSpeedPct],
    ['Spell', item.summary.spellAmpPct],
    ['Lifesteal', item.summary.lifestealPct],
    ['CDR', item.summary.cooldownReductionPct],
  ].filter(([, value]) => Number(value) !== 0)

  if (entries.length === 0) return <p>Sem atributos diretos relevantes.</p>
  return (
    <div className="item-stat-grid">
      {entries.map(([label, value]) => (
        <span key={label}>
          <em>{label}</em>
          <b>{Number(value) > 0 ? `+${value}` : value}</b>
        </span>
      ))}
    </div>
  )
}

function ConsumableSummary({ item }: { item: ConsumableItem }) {
  const parts = [
    item.heal ? `cura ${Math.round(item.heal)}` : '',
    item.mana ? `mana ${Math.round(item.mana)}` : '',
    item.duration ? `${item.duration}s` : 'instantaneo',
    item.charges > 1 ? `${item.charges} cargas` : '',
  ].filter(Boolean)
  return <p>{parts.join(' / ')}</p>
}

function ItemEffectSummary({ item }: { item: ShopItem }) {
  if (item.effects.length === 0) return <p>Sem efeito ativo/passivo importado.</p>
  return (
    <div className="item-effect-list">
      {item.effects.map((effect) => (
        <span key={`${effect.kind}-${effect.effectId}`}>
          <b>{getItemEffectKindLabel(effect.kind)}</b>
          <em>{getItemEffectLine(effect)}</em>
        </span>
      ))}
    </div>
  )
}

function TpSlot({ arcane, now, compact = false }: { arcane: Arcane; now: number; compact?: boolean }) {
  const cooldown = Math.max(0, arcane.tpCooldownUntil - now)
  const tpChannel = arcane.channeling?.kind === 'teleport' ? arcane.channeling : undefined
  const channelRemaining = tpChannel ? Math.max(0, tpChannel.completesAt - now) : 0
  const isEmpty = arcane.tpScrolls <= 0
  const className = [
    compact ? 'tp-slot compact' : 'tp-slot',
    isEmpty ? 'empty' : '',
    cooldown > 0 ? 'cooling' : '',
    channelRemaining > 0 ? 'channeling' : '',
  ].filter(Boolean).join(' ')
  const title = isEmpty
    ? `TP vazio. Compra na base por ${teleportScrollCost} ouro.`
    : channelRemaining > 0
      ? `${tpChannel?.label}: ${channelRemaining.toFixed(1)}s`
      : cooldown > 0
        ? `TP em recarga: ${Math.ceil(cooldown)}s`
        : `${arcane.tpScrolls} TP disponivel${arcane.tpScrolls > 1 ? 's' : ''}. Custa ${teleportManaCost} mana.`

  return (
    <span className={className} title={title} aria-label="Town Portal Scroll">
      <strong>TP</strong>
      <em>{arcane.tpScrolls}</em>
      {channelRemaining > 0 && <span className="cooldown-badge">{Math.ceil(channelRemaining)}</span>}
      {channelRemaining <= 0 && cooldown > 0 && <span className="cooldown-badge">{Math.ceil(cooldown)}</span>}
    </span>
  )
}

function SkillKeyRow({
  skills,
  compact = false,
  arcane,
  now = 0,
}: {
  skills: HeroSkillDefinition[]
  compact?: boolean
  arcane?: Arcane
  now?: number
}) {
  const orderedKeys: HeroSkillDefinition['key'][] = ['Q', 'W', 'E', 'R']
  return (
    <div className={compact ? 'ability-row compact' : 'ability-row'}>
      {orderedKeys.map((key) => {
        const skill = skills.find((candidate) => candidate.key === key)
        const cooldown = skill && arcane ? getCooldownRemaining(arcane.itemCooldowns, skill.id, now) : 0
        const skillLevel = skill && arcane ? getSimpleSkillLevel(arcane, skill) : 0
        const manaCost = skill && arcane ? getSimpleSkillManaCost(arcane, skill, Math.max(1, skillLevel)) : 0
        const outOfMana = Boolean(skill && arcane && skillLevel > 0 && arcane.stats.mana < manaCost)
        return (
          <b
            key={key}
            className={[
              key === 'R' ? 'ultimate' : '',
              cooldown > 0 ? 'cooling' : '',
              outOfMana ? 'oom' : '',
              skillLevel <= 0 && skill ? 'locked' : '',
            ].filter(Boolean).join(' ')}
            title={skill ? getSkillTooltip(skill, arcane, now) : `${key} sem skill importada`}
          >
            {compact ? key : skill ? `${key} ${getSkillShortName(skill)}` : key}
            {skill && arcane && <span className="skill-level-badge">{skillLevel}</span>}
            {cooldown > 0 && <span className="cooldown-badge">{Math.ceil(cooldown)}</span>}
          </b>
        )
      })}
    </div>
  )
}

function SkillSummary({ skills, arcane }: { skills: HeroSkillDefinition[]; arcane?: Arcane }) {
  if (skills.length === 0) return <span className="inventory-note">Kit ainda nao importado.</span>

  return (
    <div className="skill-summary-list">
      {skills.map((skill) => (
        <div key={skill.id} className="skill-summary-item">
          <strong>{arcane ? `${skill.key}${getSimpleSkillLevel(arcane, skill)}` : skill.key}</strong>
          <span>
            <b>{skill.name}</b>
            <em>{getSkillMetaLine(skill)}</em>
          </span>
        </div>
      ))}
    </div>
  )
}

function DecisionSummary({ macroDecision, microDecision }: { macroDecision: string; microDecision: string }) {
  return (
    <div className="metric-group decision-summary">
      <span>Decisao</span>
      <div>
        <p>
          <em>Macro</em>
          <strong className="decision-pill" title={macroDecision}>{getShortDecision(macroDecision)}</strong>
        </p>
        <p>
          <em>Micro</em>
          <strong className="decision-pill subtle" title={microDecision}>{getShortDecision(microDecision)}</strong>
        </p>
      </div>
    </div>
  )
}

function getItemEffectKindLabel(kind: string) {
  if (kind === 'active') return 'Ativo'
  if (kind === 'passive') return 'Passivo'
  if (kind === 'toggle') return 'Toggle'
  if (kind === 'aura') return 'Aura'
  if (kind === 'consumable') return 'Consumivel'
  return kind
}

function getItemEffectLine(effect: RuntimeItemEffect) {
  const values = formatItemEffectValues(effect.values)
  const tags = effect.tags
    .filter((tag) => !['component', 'neutral', 'late_component'].includes(tag))
    .slice(0, 5)
    .join(', ')
  const target = getItemTargetLabel(effect.target)
  const cooldown = effect.cooldown ? ` / cd ${effect.cooldown}s` : ''
  const duration = effect.duration ? ` / ${effect.duration}s` : ''
  return `${target}${cooldown}${duration}${values ? ` / ${values}` : ''}${tags ? ` / ${tags}` : ''}`
}

function getItemTargetLabel(target: string) {
  if (target === 'self') return 'em si'
  if (target === 'unit') return 'unidade'
  if (target === 'enemy') return 'inimigo'
  if (target === 'area') return 'area'
  if (target === 'point') return 'ponto'
  if (target === 'unit_or_structure') return 'unidade/estrutura'
  return target
}

function formatItemEffectValues(values: Record<string, number | number[] | string | boolean>) {
  return Object.entries(values)
    .filter(([key]) => !['cooldown', 'duration'].includes(key))
    .slice(0, 4)
    .map(([key, value]) => `${formatItemValueKey(key)} ${value}`)
    .join(' / ')
}

function formatItemValueKey(key: string) {
  return key
    .replace(/Pct$/, '%')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase()
}

function getActiveEffectLabels(state: SimulationState, arcane: Arcane) {
  return state.timedEffects
    .filter((effect) => effect.targetId === arcane.id && effect.expiresAt > state.time)
    .map((effect) => {
      const remaining = Math.max(0, effect.expiresAt - state.time).toFixed(1)
      return `${getEffectKindLabel(effect.kind)} ${remaining}s`
    })
}

function getEffectKindLabel(kind: TimedEffect['kind']) {
  if (kind === 'dot') return 'DoT'
  if (kind === 'hot') return 'HoT'
  if (kind === 'buff') return 'Buff'
  if (kind === 'barrier') return 'Barrier'
  if (kind === 'slow') return 'Slow'
  if (kind === 'stun') return 'Stun'
  return 'Silence'
}

function getNextPurchaseLabel(arcane: Arcane) {
  if (arcane.items.length >= 6) return 'Inventario cheio'
  const nextItem = nextShopItem(arcane)
  return nextItem ? `Proximo item: ${nextItem.name} (${nextItem.cost}g)` : 'Sem proximo item'
}

function getSkillShortName(skill: HeroSkillDefinition) {
  return skill.name
    .split(' ')
    .slice(0, 2)
    .join(' ')
}

function getSkillTooltip(skill: HeroSkillDefinition, arcane?: Arcane, now = 0) {
  if (!arcane) return `${skill.key} - ${skill.name}\n${getSkillMetaLine(skill)}\nTags: ${skill.tags.join(', ')}`

  const level = getSimpleSkillLevel(arcane, skill)
  const manaCost = level > 0 ? getSimpleSkillManaCost(arcane, skill, level) : 0
  const cooldownRemaining = getCooldownRemaining(arcane.itemCooldowns, skill.id, now)
  const status = level <= 0
    ? 'bloqueada'
    : cooldownRemaining > 0
      ? `cd ${cooldownRemaining.toFixed(1)}s`
      : arcane.stats.mana < manaCost
        ? `sem mana (${Math.round(arcane.stats.mana)}/${manaCost})`
        : 'pronta'

  return `${skill.key} - ${skill.name}\n${getSkillMetaLine(skill)}\nMana: ${manaCost} / atual ${Math.round(arcane.stats.mana)}\nEstado: ${status}\nTags: ${skill.tags.join(', ')}`
}

function getSkillMetaLine(skill: HeroSkillDefinition) {
  const parts = [
    getSkillKindLabel(skill.kind),
    getSkillTargetLabel(skill.target),
    getSkillDamageTypeLabel(skill.damageType),
    getSkillValueLabel(skill, 'damage', 'dmg'),
    getSkillValueLabel(skill, 'cooldown', 'cd'),
    getSkillValueLabel(skill, 'range', 'range'),
  ].filter(Boolean)

  return parts.join(' / ')
}

function getSkillValueLabel(skill: HeroSkillDefinition, key: string, label: string) {
  const value = skill.values[key]
  if (value === undefined) return ''
  if (key === 'range') {
    if (skill.target === 'self' || skill.target === 'passive') return ''
    if (Array.isArray(value)) return `${label} ${value.map((range) => convertImportedSkillRange(range).toFixed(1)).join('/')}`
    if (typeof value === 'number') return `${label} ${convertImportedSkillRange(value).toFixed(1)}`
  }
  if (Array.isArray(value)) return `${label} ${value.join('/')}`
  if (typeof value === 'number') return `${label} ${value}`
  return `${label} ${value}`
}

function getSkillKindLabel(kind: HeroSkillDefinition['kind']) {
  if (kind === 'passive') return 'passiva'
  if (kind === 'toggle') return 'toggle'
  return 'ativa'
}

function getSkillTargetLabel(target: HeroSkillDefinition['target']) {
  if (target === 'self') return 'self'
  if (target === 'unit') return 'alvo'
  if (target === 'point') return 'ponto'
  if (target === 'area') return 'area'
  if (target === 'global') return 'global'
  return 'passiva'
}

function getSkillDamageTypeLabel(damageType: HeroSkillDefinition['damageType']) {
  if (damageType === 'none') return ''
  if (damageType === 'physical') return 'fisico'
  if (damageType === 'magical') return 'magico'
  return 'puro'
}

function MetricGroup({ title, items, wide = false }: { title: string; items: Array<[string, string]>; wide?: boolean }) {
  return (
    <div className={wide ? 'metric-group wide' : 'metric-group'}>
      <span>{title}</span>
      <div>
        {items.map(([label, value]) => (
          <p key={label}>
            <em>{label}</em>
            <strong>{value}</strong>
          </p>
        ))}
      </div>
    </div>
  )
}

function Portrait({ arcane }: { arcane: Arcane }) {
  return (
    <span
      className="portrait"
      style={{
        '--team': teamInfo[arcane.team].primary,
        '--hp-empty': `${getHealthRingEmptyAngle(arcane.stats.hp, arcane.stats.maxHp)}deg`,
      } as React.CSSProperties}
    >
      <span>{arcane.portrait}</span>
    </span>
  )
}

function Meter({ value, max, tone }: { value: number; max: number; tone: 'hp' | 'mana' | 'xp' }) {
  // scaleX em vez de width: transições de width invalidam o layout do documento
  // inteiro a cada frame de animação, e as leituras de clientWidth dos canvases
  // pagam esse reflow; transform anima só no compositor.
  const ratio = Math.max(0, Math.min(1, value / max))
  return <span className={`meter ${tone}`}><i style={{ transform: `scaleX(${ratio})` }} /></span>
}

function getHealthRingEmptyAngle(value: number, max: number) {
  if (max <= 0) return 360
  return Math.round((1 - Math.max(0, Math.min(1, value / max))) * 360)
}

function getInventoryGlyph(name?: string) {
  if (!name) return ''
  const consumable = getConsumableByName(name)
  if (consumable?.heal && consumable?.mana) return '+'
  if (consumable?.heal) return 'H'
  if (consumable?.mana) return 'M'
  return name.slice(0, 1)
}

function getInventorySlotClassName(item: string | undefined, cooldown: number) {
  const classes = [
    getConsumableByName(item ?? '') ? 'consumable consumable-slot' : item ? 'filled' : '',
    cooldown > 0 ? 'cooling' : '',
  ].filter(Boolean)
  return classes.join(' ')
}

function getInventorySlotTitle(item: string | undefined, cooldowns: Record<string, number>, now: number) {
  if (!item) return 'Slot vazio'
  const cooldown = getCooldownRemaining(cooldowns, item, now)
  const shopItem = shopCatalog.find((candidate) => candidate.name === item)
  const activeLine = shopItem?.active ? ` / cd ${shopItem.active.cooldown}s` : ''
  const remainingLine = cooldown > 0 ? ` / pronto em ${cooldown.toFixed(1)}s` : ''
  return `${item}${activeLine}${remainingLine}`
}

function getCooldownRemaining(cooldowns: Record<string, number>, key: string, now: number) {
  return Math.max(0, (cooldowns[key] ?? 0) - now)
}

function getShortDecision(decision: string) {
  if (decision.startsWith('Avancar rota')) return 'Avancar'
  if (decision.startsWith('Controlar wave')) return 'Wave'
  if (decision.startsWith('Farmar selva')) return 'Selva'
  if (decision.startsWith('Pressionar torre')) return 'Torre'
  if (decision.startsWith('Fazer chefe')) return 'Chefe'
  if (decision.startsWith('Fazer objetivo')) return 'Objetivo'
  if (decision.startsWith('Juntar com o time')) return 'Juntar'
  if (decision.startsWith('Chamar objetivo')) return 'Call'
  if (decision.startsWith('Criar vantagem')) return 'Gank'
  if (decision.startsWith('Rotacionar')) return 'Rotate'
  if (decision.startsWith('Lutar em equipe')) return 'Luta'
  if (decision.startsWith('Defender aliado')) return 'Defender'
  if (decision.startsWith('Recuperar recursos')) return 'Base'
  if (decision.startsWith('Fora de combate')) return 'Respawn'
  if (decision.startsWith('Segurar rota')) return 'Segurar'
  if (decision.startsWith('Manter rota')) return 'Rota'
  if (decision.startsWith('Recuar')) return 'Recuar'
  if (decision.startsWith('Pressionar inimigo')) return 'Pressao'
  if (decision.startsWith('Respawn')) return 'Respawn'
  if (decision.startsWith('Saindo da base')) return 'Avançando'
  if (decision.startsWith('Saindo do alcance da torre') || decision.startsWith('Saindo do Range da torre')) return 'Recuando'
  if (decision.startsWith('Segurando fora da torre')) return 'Fora torre'
  if (decision.startsWith('Chamando time')) return 'Call'
  if (decision.startsWith('Juntando com o time')) return 'Juntar'
  if (decision.startsWith('Atacar chefe')) return 'Chefe'
  if (decision.startsWith('Fazendo objetivo')) return 'Objetivo'
  if (decision.startsWith('Gank')) return 'Gank'
  if (decision.startsWith('Ajudando side lane')) return 'Rotate'
  if (decision.startsWith('Iniciando luta')) return 'Initiate'
  if (decision.startsWith('Pressionando')) return 'Pressao'
  if (decision.startsWith('Batendo torre')) return 'Torre'
  if (decision.startsWith('Recuando')) return 'Recuando'
  if (decision.includes('base')) return 'Base'
  if (decision.includes('neutro') || decision.includes('selva')) return 'Selva'
  if (decision.includes('wave') || decision.includes('rota') || decision.includes('patrimonio')) return 'Rota'
  if (decision.startsWith('Defendendo')) return 'Defender'
  if (decision.startsWith('Escoltando')) return 'Escolta'
  return decision.slice(0, 10)
}

function getPlayerModeLabel(mode: PlayerModeType) {
  if (mode === 'retreat') return 'Recuar'
  if (mode === 'farm_lane') return 'Farm lane'
  if (mode === 'farm_jungle') return 'Selva'
  if (mode === 'join_fight') return 'Luta'
  if (mode === 'save_ally') return 'Save'
  if (mode === 'finish_enemy') return 'Pickoff'
  if (mode === 'take_objective') return 'Objetivo'
  return 'Push'
}

function getDecisionStatusLabel(status: DecisionStatus) {
  if (status === 'sharp') return 'Rapido'
  if (status === 'hesitant') return 'Hesitante'
  if (status === 'tilted') return 'Tiltado'
  return 'Estavel'
}

function getTeamPlanLabel(plan: TeamPlan['type']) {
  if (plan === 'farm_map') return 'Farmar mapa'
  if (plan === 'group_push') return 'Agrupar push'
  if (plan === 'defend_tower') return 'Defender torre'
  if (plan === 'take_boss') return 'Fazer chefe'
  if (plan === 'pickoff') return 'Cacar alvo'
  if (plan === 'avoid_fight') return 'Evitar luta'
  if (plan === 'defend_high_ground') return 'Defender HG'
  return 'Fechar jogo'
}

function getTeamPlanTargetLabel(state: SimulationState, plan: TeamPlan | undefined) {
  if (!plan) return '-'
  if (plan.targetId) {
    const tower = state.towers.find((candidate) => candidate.id === plan.targetId)
    if (tower) return `T${tower.tier} ${laneNames[tower.lane]}`

    const structure = state.structures.find((candidate) => candidate.id === plan.targetId)
    if (structure) return getStructureMapLabel(structure)

    const arcane = state.arcanes.find((candidate) => candidate.id === plan.targetId)
    if (arcane) return arcane.player

    if (state.boss.id === plan.targetId) return state.boss.name

    const base = state.bases.find((candidate) => candidate.id === plan.targetId)
    if (base) return `Base ${teamInfo[base.team].short}`

    return plan.targetId
  }

  if (plan.targetPosition) {
    return `${Math.round(plan.targetPosition.x)}, ${Math.round(plan.targetPosition.y)}`
  }

  return 'Mapa'
}

function formatReasonTags(tags: string[]) {
  return tags.length > 0 ? tags.join(', ') : '-'
}

function getExecutionFailureLabel(failure: ExecutionFailureType) {
  if (failure === 'overcommit') return 'Overcommit'
  if (failure === 'panic_retreat') return 'Panico'
  if (failure === 'wrong_target') return 'Alvo ruim'
  return 'Atraso'
}

function findSelected(state: SimulationState, selected: Selected) {
  if (!selected) return undefined
  if (selected.kind === 'arcane') return state.arcanes.find((entity) => entity.id === selected.id)
  if (selected.kind === 'creep') return state.creeps.find((entity) => entity.id === selected.id)
  if (selected.kind === 'tower') return state.towers.find((entity) => entity.id === selected.id)
  if (selected.kind === 'structure') return state.structures.find((entity) => entity.id === selected.id)
  if (selected.kind === 'base') return state.bases.find((entity) => entity.id === selected.id)
  if (selected.kind === 'boss') return state.boss.id === selected.id ? state.boss : undefined
  if (selected.kind === 'rune') return state.runes.find((entity) => entity.id === selected.id)
  return state.camps.find((entity) => entity.id === selected.id)
}

function place(point: Point) {
  const bounded = clampToMapBounds(point)
  return { '--map-x': `${bounded.x}%`, '--map-y': `${bounded.y}%` }
}

function formatTime(time: number) {
  const total = Math.floor(time)
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export default App
