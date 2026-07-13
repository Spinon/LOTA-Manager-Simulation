import type {
  CombatControlReservation,
  CombatDamageReservation,
  CombatFormationPlan,
  CombatPoint,
  CombatRoleAssignment,
  CombatSaveReservation,
  DynamicCombatRole,
} from '../types/combatAiTypes.ts'

export interface CombatCoordinationHeroInput {
  id: string
  role: string
  attackRange: number
  hasControl: boolean
  hasSave: boolean
  hasInterrupt: boolean
  hasBurst: boolean
}

export function assignDynamicCombatRoles(heroes: CombatCoordinationHeroInput[]): CombatRoleAssignment[] {
  return heroes.map((hero) => {
    const support = hero.role.includes('Support')
    const frontline = hero.role === 'Offlane'
    let primaryRole: DynamicCombatRole = hero.role === 'Safe Lane'
      ? 'sustained_damage'
      : hero.role === 'Mid'
        ? 'burst_damage'
        : frontline
          ? 'primary_initiator'
          : hero.hasSave
            ? 'save'
            : hero.hasControl
              ? 'follow_up_controller'
              : 'peel'
    const secondaryRoles = new Set<DynamicCombatRole>()
    if (frontline) secondaryRoles.add('frontline')
    if (hero.hasControl && primaryRole !== 'follow_up_controller') secondaryRoles.add('follow_up_controller')
    if (hero.hasSave && primaryRole !== 'save') secondaryRoles.add('save')
    if (hero.hasInterrupt) secondaryRoles.add('interrupt')
    if (hero.hasBurst && primaryRole !== 'burst_damage') secondaryRoles.add('burst_damage')
    if (hero.role === 'Safe Lane' || hero.role === 'Mid') secondaryRoles.add('finisher')
    if (support) secondaryRoles.add('peel')

    return {
      heroId: hero.id,
      primaryRole,
      secondaryRoles: [...secondaryRoles],
      positioningBand: frontline
        ? 'frontline'
        : hero.role === 'Mid' && hero.attackRange < 4
          ? 'flank'
          : support || hero.attackRange >= 4
            ? 'backline'
            : 'midline',
      confidence: hero.hasControl || hero.hasSave || hero.hasBurst ? 0.9 : 0.72,
    }
  })
}

export function createCombatFormationPlan(
  anchorPosition: CombatPoint,
  assignments: CombatRoleAssignment[],
  protectHeroId?: string,
): CombatFormationPlan {
  const ids = (band: CombatRoleAssignment['positioningBand']) => assignments
    .filter((assignment) => assignment.positioningBand === band)
    .map((assignment) => assignment.heroId)
  return {
    anchorPosition: { ...anchorPosition },
    minimumSpacing: 1.8,
    maximumSupportDistance: 7.5,
    frontlineHeroIds: ids('frontline'),
    midlineHeroIds: ids('midline'),
    backlineHeroIds: ids('backline'),
    flankHeroIds: ids('flank'),
    protectHeroId,
  }
}

export function canReserveControl(
  reservations: CombatControlReservation[],
  targetId: string,
  time: number,
  urgentInterrupt: boolean,
) {
  if (urgentInterrupt) return true
  return !reservations.some((reservation) => (
    reservation.targetId === targetId &&
    reservation.expectedStart <= time + 0.45 &&
    reservation.expectedEnd > time + 0.35
  ))
}

export function canReserveDamage(
  reservations: CombatDamageReservation[],
  targetId: string,
  targetHp: number,
  time: number,
  isUltimate: boolean,
) {
  if (!isUltimate) return true
  const committedDamage = reservations
    .filter((reservation) => reservation.targetId === targetId && reservation.expectedImpactTime <= time + 1.1)
    .reduce((total, reservation) => total + reservation.expectedDamage * reservation.reliability, 0)
  return committedDamage < targetHp * 0.9
}

export function canReserveSave(
  reservations: CombatSaveReservation[],
  targetAllyId: string,
  time: number,
  allyHealthPct: number,
) {
  if (allyHealthPct <= 0.28) return true
  return !reservations.some((reservation) => (
    reservation.targetAllyId === targetAllyId &&
    reservation.isPrimarySave &&
    reservation.expectedImpactTime <= time + 0.65
  ))
}
