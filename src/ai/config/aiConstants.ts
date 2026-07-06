import type { PlayerModeType, PlayerRole, TeamAiProfile } from '../types/aiTypes.ts'

export const AI_RULES = {
  modeSelection: {
    defaultModeStickiness: 10,
    retreatStickiness: 20,
    objectiveStickiness: 15,
  },
  noise: {
    professionalBaseNoise: 5,
    amateurBaseNoise: 15,
    maxNoise: 30,
    decisionWindowSeconds: 8,
  },
  teamPlans: {
    planStickinessBonus: 15,
    minimumCallExpectedValue: 58,
    highGroundRiskMultiplier: 1.4,
  },
} as const

export const DEFAULT_TEAM_AI_PROFILES: Record<string, TeamAiProfile> = {
  dawn: {
    teamId: 'dawn',
    style: 'objective_focused',
    aggression: 55,
    discipline: 68,
    greed: 48,
    objectiveFocus: 76,
    coordination: 68,
    tempoAwareness: 62,
    comebackPatience: 56,
    highGroundDiscipline: 70,
    bossPriority: 62,
    preferredPlans: ['group_push', 'take_boss', 'defend_tower'],
  },
  dusk: {
    teamId: 'dusk',
    style: 'aggressive',
    aggression: 68,
    discipline: 54,
    greed: 52,
    objectiveFocus: 60,
    coordination: 58,
    tempoAwareness: 66,
    comebackPatience: 44,
    highGroundDiscipline: 50,
    bossPriority: 56,
    preferredPlans: ['group_push', 'take_boss', 'avoid_fight'],
  },
}

export const ROLE_MODE_WEIGHTS: Record<PlayerRole, Partial<Record<PlayerModeType, number>>> = {
  safe_lane: {
    farm_lane: 1.45,
    farm_jungle: 1.35,
    join_fight: 0.85,
    take_objective: 1.05,
    retreat: 1.05,
  },
  mid: {
    farm_lane: 1.18,
    farm_jungle: 1,
    finish_enemy: 1.15,
    join_fight: 1.1,
    push_lane: 1.05,
  },
  offlane: {
    farm_lane: 0.92,
    farm_jungle: 0.72,
    push_lane: 1.15,
    join_fight: 1.2,
    take_objective: 1.1,
    retreat: 0.95,
  },
  greedy_support: {
    finish_enemy: 1.18,
    join_fight: 1.15,
    save_ally: 0.95,
    farm_lane: 0.55,
    farm_jungle: 0.45,
    push_lane: 0.9,
  },
  dedicated_support: {
    save_ally: 1.35,
    retreat: 1.1,
    join_fight: 1.05,
    farm_lane: 0.22,
    farm_jungle: 0.12,
    push_lane: 0.72,
  },
}
