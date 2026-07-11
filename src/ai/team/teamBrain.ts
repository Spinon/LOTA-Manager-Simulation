import { AI_RULES } from '../config/aiConstants.ts'
import { decisionChance, objectiveConversionValue } from '../../game-systems/decisionFormulas.ts'
import type { TeamBrainInput, TeamPlan, TeamPlanType } from '../types/aiTypes.ts'

export function generateTeamPlans(input: TeamBrainInput): TeamPlan[] {
  const team = input.analyzed.teams[input.teamId]
  if (!team) return []

  const enemyBaseOpen = input.analyzed.objectives.enemyBaseOpenByTeam[input.teamId] ?? false
  const highValueObjectiveAvailable = input.analyzed.objectives.highValueObjectiveAvailableByTeam[input.teamId] ?? false
  const phase = input.analyzed.gameTime.phase
  const relativeLead = getRelativeNetWorthLead(input)
  const ahead20 = relativeLead >= 0.2
  const ahead40 = relativeLead >= 0.4
  const behind20 = relativeLead <= -0.2
  const powerPlay = team.numbersAdvantage >= 2
  const closingWindowBonus = phase === 'ultra_late' ? 58 : phase === 'late_game' ? 24 : 0
  const pushTimingPenalty = phase === 'laning' ? 105 : phase === 'early_mid' ? 24 : 0
  const pickoffTimingPenalty = phase === 'laning' ? 52 : 0
  const farmTimingBonus = phase === 'laning' ? 42 : phase === 'early_mid' ? 14 : 0
  const endGameTimingPenalty = phase === 'laning'
    ? 220
    : phase === 'early_mid'
      ? 135
      : phase === 'mid_game'
        ? 32
        : 0
  const advantageObjectiveBonus = ahead40 ? 80 : ahead20 ? 34 : 0
  const advantageRiskReduction = ahead40 ? 24 : ahead20 ? 12 : 0
  const comebackBonus = behind20 ? 20 + input.teamProfile.comebackPatience * 0.22 : 0

  return [
    makePlan(input, 'farm_map', {
      expectedValue: team.safeFarm + input.teamProfile.greed * 0.4 + team.lowResourcePressure * 0.35 - team.structureAtRisk * 0.35 - team.baseThreat * 0.4 + farmTimingBonus + comebackBonus - closingWindowBonus * 0.45,
      urgency: Math.max(team.lowResourcePressure, behind20 ? 58 : 0),
      risk: 24 + team.baseThreat * 0.25,
      reasonTags: ['farm', 'resources'],
    }),
    makePlan(input, 'group_push', {
      expectedValue: objectiveConversionValue({
        objectiveValue: team.pushPower + team.lanePressure * 0.7 + input.teamProfile.objectiveFocus * 0.35 + advantageObjectiveBonus + closingWindowBonus + (powerPlay ? 36 : 0),
        successChance: getPlanSuccessChance(team.fightReadiness, team.visionControl, team.numbersAdvantage, input.teamProfile.coordination),
        expectedLoss: Math.max(0, team.throwRisk * 0.55 + Math.max(0, -team.numbersAdvantage) * 12 - advantageRiskReduction - (powerPlay ? 18 : 0)),
        mapControlValue: team.lanePressure * 0.35,
        tempoValue: (highValueObjectiveAvailable ? 24 : 10) + (powerPlay ? 18 : 0),
      }) - pushTimingPenalty,
      urgency: powerPlay ? 88 : Math.max(highValueObjectiveAvailable ? 72 : 48, ahead20 ? 70 : 0, closingWindowBonus + 36),
      risk: Math.max(8, team.throwRisk - advantageRiskReduction),
      reasonTags: ['push', 'objective', 'tempo', ...(ahead20 ? ['lead'] : []), ...(powerPlay ? ['power_play'] : [])],
    }),
    makePlan(input, 'defend_tower', {
      expectedValue: objectiveConversionValue({
        objectiveValue: team.structureAtRisk + team.defensivePower * 0.45 + 20 + comebackBonus,
        successChance: getPlanSuccessChance(team.defensivePower, team.visionControl, team.numbersAdvantage, input.teamProfile.coordination),
        expectedLoss: Math.max(0, -team.numbersAdvantage) * 11 + Math.max(0, 45 - team.defensivePower) * 0.35,
        mapControlValue: team.structureAtRisk * 0.45,
        tempoValue: input.teamProfile.discipline * 0.18,
      }),
      urgency: Math.max(team.structureAtRisk, behind20 ? 62 : 0),
      risk: Math.max(15, 55 - team.defensivePower * 0.35),
      reasonTags: ['defense', 'structure'],
    }),
    makePlan(input, 'take_boss', {
      targetId: input.analyzed.objectives.bossId,
      targetPosition: input.analyzed.objectives.bossPosition,
      expectedValue: input.analyzed.objectives.bossAvailable
        ? objectiveConversionValue({
          objectiveValue: 108 + input.teamProfile.bossPriority * 0.4 + input.teamProfile.objectiveFocus * 0.25 + advantageObjectiveBonus + (powerPlay ? 30 : 0),
          successChance: getPlanSuccessChance(team.bossDamage, team.visionControl, team.numbersAdvantage, input.teamProfile.coordination),
          expectedLoss: Math.max(0, 42 - team.visionControl * 0.35 - team.numbersAdvantage * 8 - advantageRiskReduction) + team.lowResourcePressure * 0.35,
          mapControlValue: team.visionControl * 0.45,
          tempoValue: (phase === 'mid_game' || phase === 'late_game' || phase === 'ultra_late' ? 22 : 5) + (powerPlay ? 14 : 0),
        })
        : -100,
      urgency: powerPlay && input.analyzed.objectives.bossAvailable && phase !== 'laning' ? 88 : Math.max(phase === 'late_game' || phase === 'ultra_late' ? 76 : 48, ahead20 ? 70 : 0),
      risk: Math.max(10, 65 - team.visionControl * 0.45 - team.numbersAdvantage * 8),
      reasonTags: ['boss', 'objective', 'vision', ...(ahead20 ? ['lead'] : []), ...(powerPlay ? ['power_play'] : [])],
    }),
    makePlan(input, 'pickoff', {
      expectedValue: objectiveConversionValue({
        objectiveValue: 54 + team.numbersAdvantage * 16 + team.visionControl * 0.34 + input.teamProfile.aggression * 0.22,
        successChance: getPlanSuccessChance(team.fightReadiness, team.visionControl, team.numbersAdvantage, input.teamProfile.coordination),
        expectedLoss: team.throwRisk * 0.5 + team.lowResourcePressure * 0.25 + Math.max(0, -team.numbersAdvantage) * 18,
        mapControlValue: team.visionControl * 0.18,
        tempoValue: team.numbersAdvantage > 0 ? 16 : 4,
      }) - pickoffTimingPenalty,
      urgency: Math.max(35, team.numbersAdvantage * 18 + team.visionControl * 0.35),
      risk: Math.max(16, 54 - team.visionControl * 0.28 - team.numbersAdvantage * 8),
      reasonTags: ['pickoff', 'vision', 'numbers'],
    }),
    makePlan(input, 'avoid_fight', {
      expectedValue: team.lowResourcePressure + Math.max(0, -team.numbersAdvantage) * 18 + Math.max(0, -team.netWorthLead / 600) + input.teamProfile.discipline * 0.2 - team.baseThreat * 0.9 + comebackBonus,
      urgency: Math.max(team.lowResourcePressure + Math.max(0, -team.numbersAdvantage) * 15, behind20 ? 58 : 0),
      risk: 18,
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
      reasonTags: ['base', 'high_ground', 'defense'],
    }),
    makePlan(input, 'end_game', {
      expectedValue: enemyBaseOpen
        ? objectiveConversionValue({
          objectiveValue: 145 + team.pushPower * 0.7 + input.teamProfile.tempoAwareness * 0.45 + advantageObjectiveBonus + closingWindowBonus,
          successChance: getPlanSuccessChance(team.fightReadiness, team.visionControl, team.numbersAdvantage, input.teamProfile.coordination),
          expectedLoss: Math.max(0, team.throwRisk * AI_RULES.teamPlans.highGroundRiskMultiplier + Math.max(0, -team.numbersAdvantage) * 18 - advantageRiskReduction),
          mapControlValue: team.lanePressure * 0.3,
          tempoValue: 28,
        }) - endGameTimingPenalty
        : -80,
      urgency: enemyBaseOpen ? Math.max(82, ahead20 ? 88 : 0) : 0,
      risk: Math.max(8, team.throwRisk * AI_RULES.teamPlans.highGroundRiskMultiplier - advantageRiskReduction),
      reasonTags: ['base', 'end_game', ...(ahead20 ? ['lead'] : [])],
    }),
  ]
}

export function selectTeamPlan(input: TeamBrainInput): TeamPlan | undefined {
  const plans = generateTeamPlans(input)
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
    .sort((a, b) => b.expectedValue - a.expectedValue)

  const team = input.analyzed.teams[input.teamId]
  const phase = input.analyzed.gameTime.phase
  const powerPlay = team?.numbersAdvantage !== undefined && team.numbersAdvantage >= 2
  if (
    team &&
    powerPlay &&
    input.analyzed.objectives.bossAvailable &&
    (phase === 'mid_game' || phase === 'late_game' || phase === 'ultra_late') &&
    team.lowResourcePressure <= 60 &&
    team.baseThreat < 65
  ) {
    const bossPlan = plans.find((plan) => plan.type === 'take_boss')
    if (bossPlan) return { ...bossPlan, urgency: Math.max(85, bossPlan.urgency), reasonTags: [...bossPlan.reasonTags, 'forced_power_play'] }
  }

  if (
    team &&
    powerPlay &&
    (phase === 'late_game' || phase === 'ultra_late') &&
    input.analyzed.objectives.enemyBaseOpenByTeam[input.teamId] &&
    team.baseThreat < 65
  ) {
    const endPlan = plans.find((plan) => plan.type === 'end_game')
    if (endPlan) return { ...endPlan, urgency: Math.max(88, endPlan.urgency), reasonTags: [...endPlan.reasonTags, 'forced_power_play'] }
  }

  if (team && powerPlay && phase !== 'laning' && team.baseThreat < 65) {
    const pushPlan = plans.find((plan) => plan.type === 'group_push')
    if (pushPlan) return { ...pushPlan, urgency: Math.max(85, pushPlan.urgency), reasonTags: [...pushPlan.reasonTags, 'forced_power_play'] }
  }

  if (team && phase === 'ultra_late' && team.baseThreat < 65) {
    const planType = input.analyzed.objectives.enemyBaseOpenByTeam[input.teamId] ? 'end_game' : 'group_push'
    const closingPlan = plans.find((plan) => plan.type === planType)
    if (closingPlan) {
      return {
        ...closingPlan,
        urgency: Math.max(90, closingPlan.urgency),
        reasonTags: [...closingPlan.reasonTags, 'forced_closing_window'],
      }
    }
  }

  return plans[0]
}

function makePlan(
  _input: TeamBrainInput,
  type: TeamPlanType,
  values: Omit<TeamPlan, 'type'>,
): TeamPlan {
  return {
    ...values,
    type,
    expectedValue: Math.round(values.expectedValue),
    urgency: clamp(Math.round(values.urgency), 0, 100),
    risk: clamp(Math.round(values.risk), 0, 100),
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

function getRelativeNetWorthLead(input: TeamBrainInput) {
  const team = input.analyzed.teams[input.teamId]
  if (!team) return 0
  const opponent = Object.entries(input.analyzed.teams)
    .find(([teamId]) => teamId !== input.teamId)?.[1]
  const referenceNetWorth = Math.max(1, opponent?.netWorth ?? team.netWorth)
  return team.netWorthLead / referenceNetWorth
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}
