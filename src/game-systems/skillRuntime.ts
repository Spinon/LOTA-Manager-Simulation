import type { HeroSkillDefinition } from './heroAttributes.ts'

export type SkillUsageSituation = keyof NonNullable<HeroSkillDefinition['aiUsage']>

export type SkillEffectProfile = {
  damage: number
  duration: number
  radius: number
  slowPct: number
  stunDuration: number
  rootDuration: number
  silenceDuration: number
  heal: number
  barrier: number
  armorDelta: number
  manaDelta: number
  moveSpeedPct: number
  attackSpeedPct: number
  critChance: number
  critMultiplier: number
  lifestealPct: number
  summonCount: number
  summonDuration: number
  isDamageOverTime: boolean
  isHealingOverTime: boolean
  isArea: boolean
  isGlobal: boolean
  isMobility: boolean
  isSave: boolean
}

export function getSkillValue(skill: HeroSkillDefinition, key: string, level: number, fallback = 0) {
  const value = skill.values[key]
  if (Array.isArray(value)) {
    const picked = value[Math.max(0, Math.min(value.length - 1, level - 1))]
    return typeof picked === 'number' && Number.isFinite(picked) ? picked : fallback
  }
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

export function hasSkillTag(skill: HeroSkillDefinition, tags: string[]) {
  return tags.some((tag) => skill.sourceTag === tag || skill.mechanics?.includes(tag) || skill.tags.includes(tag))
}

export function isConfirmedGlobalSkill(skill: HeroSkillDefinition) {
  return skill.values.global === true || (skill.target === 'global' && (
    skill.sourceTag?.startsWith('global_') === true ||
    skill.sourceTag === 'global' ||
    skill.sourceTag === 'stampede'
  ))
}

export function getSkillEffectProfile(skill: HeroSkillDefinition, level: number): SkillEffectProfile {
  const duration = getSkillValue(skill, 'duration', level, 0)
  const barrierValue = getSkillValue(skill, 'barrierOrArmorValue', level, getSkillValue(skill, 'barrier', level, 0))
  const armorSkill = hasSkillTag(skill, ['armor', 'frost_armor', 'reactive_armor', 'armor_reduction', 'armor_shift'])
  const defensiveBarrier = hasSkillTag(skill, ['shield', 'barrier', 'mana_shield', 'save', 'spell_parry'])
  const manaValue = getSkillValue(skill, 'manaValue', level, 0)

  return {
    damage: Math.max(0, getSkillValue(skill, 'damage', level, 0)),
    duration: Math.max(0.25, duration || 3),
    radius: Math.max(0, getSkillValue(skill, 'radius', level, 0) / 140),
    slowPct: clampPercent(getSkillValue(skill, 'slowPct', level, getSkillValue(skill, 'slow', level, 0))),
    stunDuration: Math.max(0, getSkillValue(skill, 'stun', level, hasSkillTag(skill, ['stun', 'bash', 'hex', 'sleep', 'taunt', 'fear']) ? duration || 1 : 0)),
    rootDuration: Math.max(0, getSkillValue(skill, 'root', level, hasSkillTag(skill, ['root', 'net', 'leash', 'mobility_lockout']) ? duration || 1.5 : 0)),
    silenceDuration: Math.max(0, getSkillValue(skill, 'silence', level, hasSkillTag(skill, ['silence', 'spell_lockout']) ? duration || 1.5 : 0)),
    heal: Math.max(0, getSkillValue(skill, 'heal', level, 0)),
    barrier: defensiveBarrier ? Math.max(0, barrierValue) : 0,
    armorDelta: armorSkill
      ? (hasSkillTag(skill, ['armor_reduction']) ? -1 : 1) * Math.max(1, barrierValue / 20)
      : 0,
    manaDelta: hasSkillTag(skill, ['mana_burn', 'mana_drain']) ? -manaValue : manaValue,
    moveSpeedPct: clampPercent(getSkillValue(skill, 'moveSpeedBonusPct', level, 0)),
    attackSpeedPct: clampPercent(getSkillValue(skill, 'attackSpeed', level, 0)),
    critChance: clampPercent(getSkillValue(skill, 'critChance', level, 0)),
    critMultiplier: Math.max(1, getSkillValue(skill, 'critMultiplier', level, 100) / 100),
    lifestealPct: clampPercent(getSkillValue(skill, 'lifestealPct', level, 0)),
    summonCount: Math.max(0, Math.round(getSkillValue(skill, 'summons', level, 0))),
    summonDuration: Math.max(0, getSkillValue(skill, 'summonDuration', level, duration)),
    isDamageOverTime: hasSkillTag(skill, ['damage_over_time', 'dot', 'poison', 'aura_dot', 'burn']),
    isHealingOverTime: hasSkillTag(skill, ['heal_over_time', 'hot', 'regen', 'regeneration']),
    isArea: skill.target === 'area' || getSkillValue(skill, 'radius', level, 0) > 0,
    isGlobal: isConfirmedGlobalSkill(skill),
    isMobility: hasSkillTag(skill, ['mobility', 'blink', 'dash', 'leap', 'jump', 'roll', 'wave_dash', 'escape']),
    isSave: hasSkillTag(skill, ['save', 'heal', 'shield', 'barrier', 'spell_parry', 'defensive_utility']),
  }
}

export function getSkillAiUsageScore(skill: HeroSkillDefinition, situation: SkillUsageSituation) {
  return skill.aiUsage?.[situation] ?? 0
}

export function getPrimarySkillUsageSituation(input: {
  phase: 'early' | 'mid' | 'late'
  aiMode: string
  macroDecision: string
  hpRatio: number
}): SkillUsageSituation {
  if (input.hpRatio < 0.42 || input.aiMode === 'retreat' || input.macroDecision.startsWith('Recuar')) return 'retreat'
  if (input.aiMode === 'save_ally' || input.macroDecision.startsWith('Defender aliado')) return 'save'
  if (input.aiMode === 'take_objective' || input.macroDecision.includes('objetivo') || input.macroDecision.includes('torre')) return 'objective'
  if (input.aiMode === 'join_fight' || input.aiMode === 'finish_enemy' || input.macroDecision.includes('Lutar')) return 'teamfight'
  if (input.macroDecision.includes('Gank') || input.macroDecision.includes('Criar vantagem')) return 'gank'
  if (input.macroDecision.includes('Push') || input.macroDecision.includes('Avancar')) return 'push'
  return input.phase === 'early' ? 'laning' : 'farming'
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(0.95, value / 100))
}
