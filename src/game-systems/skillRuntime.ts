import type { HeroSkillDefinition } from './heroAttributes.ts'

export type SkillUsageSituation = keyof NonNullable<HeroSkillDefinition['aiUsage']>
export type SkillSummonArchetype = 'unit' | 'ward' | 'healing_ward' | 'illusion' | 'clone'
export type SkillSummonMode = 'cast' | 'channel' | 'target_death' | 'on_attack' | 'on_death'

export type SkillEffectProfile = {
  damage: number
  duration: number
  radius: number
  slowPct: number
  stunDuration: number
  rootDuration: number
  silenceDuration: number
  fearDuration: number
  tauntDuration: number
  sleepDuration: number
  hexDuration: number
  disarmDuration: number
  breakDuration: number
  muteDuration: number
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
  summonTriggerDuration: number
  summonArchetype: SkillSummonArchetype
  summonMode: SkillSummonMode
  summonHp: number
  summonHits: number
  summonDamage: number
  summonRange: number
  summonMoveSpeed: number
  summonAttackInterval: number
  summonVision: number
  summonGoldBounty: number
  summonXpBounty: number
  summonOutgoingDamagePct: number
  summonIncomingDamagePct: number
  summonHealPct: number
  isDamageOverTime: boolean
  isHealingOverTime: boolean
  isArea: boolean
  isGlobal: boolean
  isMobility: boolean
  isSave: boolean
}

const skillEffectProfileCache = new WeakMap<HeroSkillDefinition, Map<number, SkillEffectProfile>>()

export function getSkillValue(skill: HeroSkillDefinition, key: string, level: number, fallback = 0) {
  const value = skill.values[key]
  if (Array.isArray(value)) {
    const picked = value[Math.max(0, Math.min(value.length - 1, level - 1))]
    return typeof picked === 'number' && Number.isFinite(picked) ? picked : fallback
  }
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

export function getSkillStringValue<T extends string>(skill: HeroSkillDefinition, key: string, fallback: T): T {
  const value = skill.values[key]
  return typeof value === 'string' ? value as T : fallback
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
  let profilesByLevel = skillEffectProfileCache.get(skill)
  if (!profilesByLevel) {
    profilesByLevel = new Map()
    skillEffectProfileCache.set(skill, profilesByLevel)
  }
  const cached = profilesByLevel.get(level)
  if (cached) return cached

  const duration = getSkillValue(skill, 'duration', level, 0)
  const barrierValue = getSkillValue(skill, 'barrierOrArmorValue', level, getSkillValue(skill, 'barrier', level, 0))
  const armorSkill = hasSkillTag(skill, ['armor', 'frost_armor', 'reactive_armor', 'armor_reduction', 'armor_shift'])
  const defensiveBarrier = hasSkillTag(skill, ['shield', 'barrier', 'mana_shield', 'save', 'spell_parry'])
  const manaValue = getSkillValue(skill, 'manaValue', level, 0)

  const profile = {
    damage: Math.max(0, getSkillValue(skill, 'damage', level, 0)),
    duration: Math.max(0.25, duration || 3),
    radius: Math.max(0, getSkillValue(skill, 'radius', level, 0) / 140),
    slowPct: clampPercent(getSkillValue(skill, 'slowPct', level, getSkillValue(skill, 'slow', level, 0))),
    stunDuration: Math.max(0, getSkillValue(skill, 'stun', level, hasSkillTag(skill, ['stun', 'bash', 'hex', 'sleep', 'taunt', 'fear']) ? duration || 1 : 0)),
    rootDuration: Math.max(0, getSkillValue(skill, 'root', level, hasSkillTag(skill, ['root', 'net', 'leash', 'mobility_lockout']) ? duration || 1.5 : 0)),
    silenceDuration: Math.max(0, getSkillValue(skill, 'silence', level, hasSkillTag(skill, ['silence', 'spell_lockout']) ? duration || 1.5 : 0)),
    fearDuration: getNamedControlDuration(skill, 'fearDuration', 'fear', level, duration),
    tauntDuration: getNamedControlDuration(skill, 'tauntDuration', 'taunt', level, duration),
    sleepDuration: getNamedControlDuration(skill, 'sleepDuration', 'sleep', level, duration),
    hexDuration: getNamedControlDuration(skill, 'hexDuration', 'hex', level, duration),
    disarmDuration: getNamedControlDuration(skill, 'disarmDuration', 'disarm', level, duration),
    breakDuration: getNamedControlDuration(skill, 'breakDuration', 'break', level, duration),
    muteDuration: getNamedControlDuration(skill, 'muteDuration', 'mute', level, duration),
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
    summonCount: hasSkillTag(skill, ['summon'])
      ? Math.max(0, Math.round(getSkillValue(skill, 'summons', level, 0)))
      : 0,
    summonDuration: Math.max(0, getSkillValue(skill, 'summonDuration', level, duration)),
    summonTriggerDuration: Math.max(0, getSkillValue(skill, 'summonTriggerDuration', level, duration)),
    summonArchetype: getSkillStringValue(skill, 'summonArchetype', 'unit' as SkillSummonArchetype),
    summonMode: getSkillStringValue(skill, 'summonMode', 'cast' as SkillSummonMode),
    summonHp: Math.max(0, getSkillValue(skill, 'summonHp', level, 0)),
    summonHits: Math.max(0, getSkillValue(skill, 'summonHits', level, 0)),
    summonDamage: Math.max(0, getSkillValue(skill, 'summonDamage', level, 0)),
    summonRange: Math.max(0, getSkillValue(skill, 'summonRange', level, 0)),
    summonMoveSpeed: Math.max(0, getSkillValue(skill, 'summonMoveSpeed', level, 0)),
    summonAttackInterval: Math.max(0, getSkillValue(skill, 'summonAttackInterval', level, 0)),
    summonVision: Math.max(0, getSkillValue(skill, 'summonVision', level, 0)),
    summonGoldBounty: Math.max(0, getSkillValue(skill, 'summonGoldBounty', level, 0)),
    summonXpBounty: Math.max(0, getSkillValue(skill, 'summonXpBounty', level, 0)),
    summonOutgoingDamagePct: Math.max(0, getSkillValue(skill, 'summonOutgoingDamagePct', level, 0)),
    summonIncomingDamagePct: Math.max(0, getSkillValue(skill, 'summonIncomingDamagePct', level, 0)),
    summonHealPct: Math.max(0, getSkillValue(skill, 'summonHealPct', level, 0)),
    isDamageOverTime: hasSkillTag(skill, ['damage_over_time', 'dot', 'poison', 'aura_dot', 'burn']),
    isHealingOverTime: hasSkillTag(skill, ['heal_over_time', 'hot', 'regen', 'regeneration']),
    isArea: skill.target === 'area' || getSkillValue(skill, 'radius', level, 0) > 0,
    isGlobal: isConfirmedGlobalSkill(skill),
    isMobility: hasSkillTag(skill, ['mobility', 'blink', 'dash', 'leap', 'jump', 'roll', 'wave_dash', 'escape']),
    isSave: hasSkillTag(skill, ['save', 'heal', 'shield', 'barrier', 'spell_parry', 'defensive_utility']),
  }
  profilesByLevel.set(level, profile)
  return profile
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

function getNamedControlDuration(
  skill: HeroSkillDefinition,
  valueKey: string,
  tag: string,
  level: number,
  fallbackDuration: number,
) {
  if (!hasSkillTag(skill, [tag])) return 0
  return Math.max(0.1, getSkillValue(skill, valueKey, level, fallbackDuration || 1))
}
