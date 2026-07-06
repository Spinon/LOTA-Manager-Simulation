import { AI_RULES } from '../config/aiConstants.ts'
import { decisionChance, objectiveConversionValue } from '../../game-systems/decisionFormulas.ts'
import type { TeamBrainInput, TeamPlan, TeamPlanType } from '../types/aiTypes.ts'

export function generateTeamPlans(input: TeamBrainInput): TeamPlan[] {
  const team = input.analyzed.teams[input.teamId]
  if (!team) return []

  const enemyBaseOpen = input.analyzed.objectives.enemyBaseOpenByTeam[input.teamId] ?? false
  const highValueObjectiveAvailable = input.analyzed.objectives.highValueObjectiveAvailableByTeam[input.teamId] ?? false
  const phase = input.analyzed.gameTime.phase

  return [
    makePlan(input, 'farm_map', {
      expectedValue: team.safeFarm + input.teamProfile.greed * 0.4 + team.lowResourcePressure * 0.35 - team.structureAtRisk * 0.35 - team.baseThreat * 0.4,
      urgency: team.lowResourcePressure,
      risk: 24 + team.baseThreat * 0.25,
      confidence: team.safeFarm + input.teamProfile.discipline * 0.25,
      reasonTags: ['farm', 'resources'],
    }),
    makePlan(input, 'group_push', {
      expectedValue: objectiveConversionValue({
        objectiveValue: team.pushPower + team.lanePressure * 0.7 + input.teamProfile.objectiveFocus * 0.35,
        successChance: getPlanSuccessChance(team.fightReadiness, team.visionControl, team.numbersAdvantage, input.teamProfile.coordination),
        expectedLoss: team.throwRisk * 0.55 + Math.max(0, -team.numbersAdvantage) * 12,
        mapControlValue: team.lanePressure * 0.35,
        tempoValue: highValueObjectiveAvailable ? 24 : 10,
      }),
      urgency: highValueObjectiveAvailable ? 72 : 48,
      risk: team.throwRisk,
      confidence: team.fightReadiness + input.teamProfile.coordination * 0.25,
      reasonTags: ['push', 'objective', 'tempo'],
    }),
    makePlan(input, 'defend_tower', {
      expectedValue: objectiveConversionValue({
        objectiveValue: team.structureAtRisk + team.defensivePower * 0.45 + 20,
        successChance: getPlanSuccessChance(team.defensivePower, team.visionControl, team.numbersAdvantage, input.teamProfile.coordination),
        expectedLoss: Math.max(0, -team.numbersAdvantage) * 11 + Math.max(0, 45 - team.defensivePower) * 0.35,
        mapControlValue: team.structureAtRisk * 0.45,
        tempoValue: input.teamProfile.discipline * 0.18,
      }),
      urgency: team.structureAtRisk,
      risk: Math.max(15, 55 - team.defensivePower * 0.35),
      confidence: team.defensivePower + input.teamProfile.coordination * 0.2,
      reasonTags: ['defense', 'structure'],
    }),
    makePlan(input, 'take_boss', {
      targetId: input.analyzed.objectives.bossId,
      targetPosition: input.analyzed.objectives.bossPosition,
      expectedValue: input.analyzed.objectives.bossAvailable
        ? objectiveConversionValue({
          objectiveValue: 108 + input.teamProfile.bossPriority * 0.4 + input.teamProfile.objectiveFocus * 0.25,
          successChance: getPlanSuccessChance(team.bossDamage, team.visionControl, team.numbersAdvantage, input.teamProfile.coordination),
          expectedLoss: Math.max(0, 42 - team.visionControl * 0.35 - team.numbersAdvantage * 8) + team.lowResourcePressure * 0.35,
          mapControlValue: team.visionControl * 0.45,
          tempoValue: phase === 'mid_game' || phase === 'late_game' || phase === 'ultra_late' ? 22 : 5,
        })
        : -100,
      urgency: phase === 'late_game' || phase === 'ultra_late' ? 76 : 48,
      risk: Math.max(10, 65 - team.visionControl * 0.45 - team.numbersAdvantage * 8),
      confidence: team.visionControl + input.teamProfile.coordination * 0.25,
      reasonTags: ['boss', 'objective', 'vision'],
    }),
    makePlan(input, 'pickoff', {
      expectedValue: objectiveConversionValue({
        objectiveValue: 54 + team.numbersAdvantage * 16 + team.visionControl * 0.34 + input.teamProfile.aggression * 0.22,
        successChance: getPlanSuccessChance(team.fightReadiness, team.visionControl, team.numbersAdvantage, input.teamProfile.coordination),
        expectedLoss: team.throwRisk * 0.5 + team.lowResourcePressure * 0.25 + Math.max(0, -team.numbersAdvantage) * 18,
        mapControlValue: team.visionControl * 0.18,
        tempoValue: team.numbersAdvantage > 0 ? 16 : 4,
      }),
      urgency: Math.max(35, team.numbersAdvantage * 18 + team.visionControl * 0.35),
      risk: Math.max(16, 54 - team.visionControl * 0.28 - team.numbersAdvantage * 8),
      confidence: team.visionControl + input.teamProfile.coordination * 0.25 + Math.max(0, team.numbersAdvantage) * 10,
      reasonTags: ['pickoff', 'vision', 'numbers'],
    }),
    makePlan(input, 'avoid_fight', {
      expectedValue: team.lowResourcePressure + Math.max(0, -team.numbersAdvantage) * 18 + Math.max(0, -team.netWorthLead / 600) + input.teamProfile.discipline * 0.2 - team.baseThreat * 0.9,
      urgency: team.lowResourcePressure + Math.max(0, -team.numbersAdvantage) * 15,
      risk: 18,
      confidence: input.teamProfile.discipline + input.teamProfile.comebackPatience * 0.35,
      reasonTags: ['risk', 'resources'],
    }),
    makePlan(input, 'defend_high_ground', {
      expectedValue: objectiveConversionValue({
        objectiveValue: team.baseThreat * 1.25 + team.defensivePower * 0.55 + input.teamProfile.highGroundDiscipline * 0.45,
        successChance: getPlanSuccessChance(team.defensivePower, team.visionControl, team.numbersAdvantage, input.teamProfile.highGroundDiscipline),
        expectedLoss: Math.max(0, -team.numbersAdvantage) * 16 + Math.max(0, 55 - team.averageHealthPct * 100) * 0.45,
        mapControlValue: team.baseThreat * 0.35,
        tempoValue: 18 + team.baseThreat * 0.35,
      }),
      urgency: team.baseThreat,
      risk: Math.max(20, 70 - input.teamProfile.highGroundDiscipline * 0.3),
      confidence: input.teamProfile.highGroundDiscipline + team.defensivePower * 0.25,
      reasonTags: ['base', 'high_ground', 'defense'],
    }),
    makePlan(input, 'end_game', {
      expectedValue: enemyBaseOpen
        ? objectiveConversionValue({
          objectiveValue: 145 + team.pushPower * 0.7 + input.teamProfile.tempoAwareness * 0.45,
          successChance: getPlanSuccessChance(team.fightReadiness, team.visionControl, team.numbersAdvantage, input.teamProfile.coordination),
          expectedLoss: team.throwRisk * AI_RULES.teamPlans.highGroundRiskMultiplier + Math.max(0, -team.numbersAdvantage) * 18,
          mapControlValue: team.lanePressure * 0.3,
          tempoValue: 28,
        })
        : -80,
      urgency: enemyBaseOpen ? 82 : 0,
      risk: team.throwRisk * AI_RULES.teamPlans.highGroundRiskMultiplier,
      confidence: team.fightReadiness + input.teamProfile.discipline * 0.2,
      reasonTags: ['base', 'end_game'],
    }),
  ]
}

export function selectTeamPlan(input: TeamBrainInput): TeamPlan | undefined {
  return generateTeamPlans(input)
    .map((plan) => {
      const expectedValue = plan.expectedValue +
        getStyleBonus(input, plan.type) +
        getPreferredPlanBonus(input, plan.type) +
        getStickinessBonus(input.previousPlan, plan.type)
      const chance = decisionChance(expectedValue, AI_RULES.teamPlans.minimumCallExpectedValue, 18)
      return {
        ...plan,
        decisionChance: Number(chance.toFixed(2)),
        expectedValue: Math.round(expectedValue * (0.72 + chance * 0.28)),
      }
    })
    .sort((a, b) => b.expectedValue - a.expectedValue)[0]
}

function makePlan(
  input: TeamBrainInput,
  type: TeamPlanType,
  values: Omit<TeamPlan, 'type' | 'expiresAtGameTime'>,
): TeamPlan {
  return {
    ...values,
    type,
    expectedValue: Math.round(values.expectedValue),
    urgency: clamp(Math.round(values.urgency), 0, 100),
    confidence: clamp(Math.round(values.confidence), 0, 100),
    risk: clamp(Math.round(values.risk), 0, 100),
    expiresAtGameTime: input.analyzed.gameTime.seconds + 24,
  }
}

function getPlanSuccessChance(primaryPower: number, visionControl: number, numbersAdvantage: number, coordination: number) {
  return clamp(
    primaryPower * 0.0042 +
      visionControl * 0.0026 +
      coordination * 0.0018 +
      numbersAdvantage * 0.08,
    0.08,
    0.94,
  )
}

function getStyleBonus(input: TeamBrainInput, type: TeamPlanType) {
  const style = input.teamProfile.style
  if (style === 'aggressive' && (type === 'group_push' || type === 'end_game')) return 10
  if (style === 'methodical' && (type === 'take_boss' || type === 'defend_tower')) return 9
  if (style === 'greedy' && type === 'farm_map') return 12
  if (style === 'pickoff' && type === 'pickoff') return 14
  if (style === 'teamfight' && (type === 'group_push' || type === 'defend_high_ground')) return 11
  if (style === 'split_push' && (type === 'farm_map' || type === 'group_push')) return 8
  if (style === 'objective_focused' && (type === 'group_push' || type === 'take_boss')) return 12
  if (style === 'defensive' && (type === 'defend_tower' || type === 'defend_high_ground')) return 12
  if (style === 'balanced' && (type === 'farm_map' || type === 'group_push' || type === 'defend_tower')) return 4
  if (style === 'chaotic' && type === 'avoid_fight') return -8
  if (style === 'chaotic' && (type === 'pickoff' || type === 'group_push')) return 7
  return 0
}

function getPreferredPlanBonus(input: TeamBrainInput, type: TeamPlanType) {
  return input.teamProfile.preferredPlans.includes(type) ? 6 : 0
}

function getStickinessBonus(previousPlan: TeamPlan | undefined, type: TeamPlanType) {
  return previousPlan?.type === type ? AI_RULES.teamPlans.planStickinessBonus : 0
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}
