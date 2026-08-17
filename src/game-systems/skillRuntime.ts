import type { HeroSkillDefinition } from './heroAttributes.ts'

export type SkillUsageSituation = keyof NonNullable<HeroSkillDefinition['aiUsage']>
export type SkillSummonArchetype = 'unit' | 'ward' | 'healing_ward' | 'illusion' | 'clone'
export type SkillSummonMode = 'cast' | 'channel' | 'target_death' | 'on_attack' | 'on_death'
export type SkillSummonCopySource = 'caster' | 'target'
export type SkillSummonTargetScope = 'default' | 'primary' | 'affected_enemies' | 'all_enemies'

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
  linkedSummonMoveSpeedPct: number
  linkedLifestealPct: number
  cloakMaxLayers: number
  cloakDamageReductionPct: number
  cloakRecoveryTime: number
  cloakMinimumDamage: number
  summonCount: number
  summonDuration: number
  summonTriggerDuration: number
  summonArchetype: SkillSummonArchetype
  summonMode: SkillSummonMode
  summonCopySource: SkillSummonCopySource
  summonTargetScope: SkillSummonTargetScope
  summonLocksTarget: boolean
  summonExpiresWithTarget: boolean
  summonUntargetable: boolean
  summonUnitSeedId: string
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
  summonFlatDamage: number
  summonMoveSpeedPct: number
  summonDelay: number
  summonMaxCount: number
  summonProcChancePct: number
  summonSecondaryProcChancePct: number
  summonSecondaryDuration: number
  summonHealPct: number
  summonEffectRadius: number
  summonTriggerRadius: number
  summonTriggerSlowPct: number
  summonTriggerSlowDuration: number
  summonSpawnInterval: number
  summonChildDamage: number
  summonChildHits: number
  summonRegen: number
  summonLeashRange: number
  summonBacklashPct: number
  summonScepterBounceRadius: number
  summonScepterLifestealPct: number
  summonReturnDistance: number
  summonRecallDuration: number
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

export function getSkillBooleanValue(skill: HeroSkillDefinition, key: string, fallback = false) {
  const value = skill.values[key]
  return typeof value === 'boolean' ? value : fallback
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
    linkedSummonMoveSpeedPct: clampPercent(getSkillValue(skill, 'linkedSummonMoveSpeedPct', level, 0)),
    linkedLifestealPct: clampPercent(getSkillValue(skill, 'linkedLifestealPct', level, 0)),
    cloakMaxLayers: Math.max(0, Math.round(getSkillValue(skill, 'cloakMaxLayers', level, 0))),
    cloakDamageReductionPct: clampPercent(getSkillValue(skill, 'cloakDamageReductionPct', level, 0)),
    cloakRecoveryTime: Math.max(0, getSkillValue(skill, 'cloakRecoveryTime', level, 0)),
    cloakMinimumDamage: Math.max(0, getSkillValue(skill, 'cloakMinimumDamage', level, 0)),
    summonCount: hasSkillTag(skill, ['summon'])
      ? Math.max(0, Math.round(getSkillValue(skill, 'summons', level, 0)))
      : 0,
    summonDuration: Math.max(0, getSkillValue(skill, 'summonDuration', level, duration)),
    summonTriggerDuration: Math.max(0, getSkillValue(skill, 'summonTriggerDuration', level, duration)),
    summonArchetype: getSkillStringValue(skill, 'summonArchetype', 'unit' as SkillSummonArchetype),
    summonMode: getSkillStringValue(skill, 'summonMode', 'cast' as SkillSummonMode),
    summonCopySource: getSkillStringValue(skill, 'summonCopySource', 'caster' as SkillSummonCopySource),
    summonTargetScope: getSkillStringValue(skill, 'summonTargetScope', 'default' as SkillSummonTargetScope),
    summonLocksTarget: getSkillBooleanValue(skill, 'summonLocksTarget'),
    summonExpiresWithTarget: getSkillBooleanValue(skill, 'summonExpiresWithTarget'),
    summonUntargetable: getSkillBooleanValue(skill, 'summonUntargetable'),
    summonUnitSeedId: getSkillStringValue(skill, 'summonUnitSeedId', ''),
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
    summonFlatDamage: Math.max(0, getSkillValue(skill, 'summonFlatDamage', level, 0)),
    summonMoveSpeedPct: clampPercent(getSkillValue(skill, 'summonMoveSpeedPct', level, 0)),
    summonDelay: Math.max(0, getSkillValue(skill, 'summonDelay', level, 0)),
    summonMaxCount: Math.max(0, Math.round(getSkillValue(skill, 'summonMaxCount', level, 0))),
    summonProcChancePct: Math.max(0, Math.min(100, getSkillValue(skill, 'summonProcChancePct', level, 0))),
    summonSecondaryProcChancePct: Math.max(0, Math.min(100, getSkillValue(skill, 'summonSecondaryProcChancePct', level, 0))),
    summonSecondaryDuration: Math.max(0, getSkillValue(skill, 'summonSecondaryDuration', level, 0)),
    summonHealPct: Math.max(0, getSkillValue(skill, 'summonHealPct', level, 0)),
    summonEffectRadius: Math.max(0, getSkillValue(skill, 'summonEffectRadius', level, 0)),
    summonTriggerRadius: Math.max(0, getSkillValue(skill, 'summonTriggerRadius', level, 0)),
    summonTriggerSlowPct: clampPercent(getSkillValue(skill, 'summonTriggerSlowPct', level, 0)),
    summonTriggerSlowDuration: Math.max(0, getSkillValue(skill, 'summonTriggerSlowDuration', level, 0)),
    summonSpawnInterval: Math.max(0, getSkillValue(skill, 'summonSpawnInterval', level, 0)),
    summonChildDamage: Math.max(0, getSkillValue(skill, 'summonChildDamage', level, 0)),
    summonChildHits: Math.max(0, getSkillValue(skill, 'summonChildHits', level, 0)),
    summonRegen: Math.max(0, getSkillValue(skill, 'summonRegen', level, 0)),
    summonLeashRange: Math.max(0, getSkillValue(skill, 'summonLeashRange', level, 0)),
    summonBacklashPct: clampPercent(getSkillValue(skill, 'summonBacklashPct', level, 0)),
    summonScepterBounceRadius: Math.max(0, getSkillValue(skill, 'summonScepterBounceRadius', level, 0)),
    summonScepterLifestealPct: clampPercent(getSkillValue(skill, 'summonScepterLifestealPct', level, 0)),
    summonReturnDistance: Math.max(0, getSkillValue(skill, 'summonReturnDistance', level, 0)),
    summonRecallDuration: Math.max(0, getSkillValue(skill, 'summonRecallDuration', level, 0)),
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
