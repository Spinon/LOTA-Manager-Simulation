export type PrimaryAttribute = 'strength' | 'agility' | 'intelligence' | 'universal'
export type AttackType = 'melee' | 'ranged'
export type HeroRole =
  | 'carry'
  | 'support'
  | 'nuker'
  | 'disabler'
  | 'durable'
  | 'escape'
  | 'pusher'
  | 'initiator'

export interface AttributeBlock {
  strength: number
  agility: number
  intelligence: number
}

export interface AttributeGrowthBlock {
  strengthGain: number
  agilityGain: number
  intelligenceGain: number
}

export interface HeroDefinition {
  id: string
  name: string
  primaryAttribute: PrimaryAttribute
  attackType: AttackType
  roles: HeroRole[]
  complexity: 1 | 2 | 3
  baseAttributes: AttributeBlock
  attributeGrowth: AttributeGrowthBlock
  baseStats: {
    baseHealth: number
    baseHealthRegen: number
    baseMana: number
    baseManaRegen: number
    baseDamageMin: number
    baseDamageMax: number
    baseArmor: number
    baseMagicResistance: number
    baseStatusResistance: number
    baseSlowResistance: number
    baseAttackSpeed: number
    baseAttackTime: number
    attackRange: number
    acquisitionRange: number
    movementSpeed: number
    turnRate: number
    collisionSize: number
    dayVision: number
    nightVision: number
  }
}

export interface HeroCalculatedStats {
  level: number
  attributes: AttributeBlock & {
    totalAttributes: number
  }
  resources: {
    maxHealth: number
    healthRegen: number
    maxMana: number
    manaRegen: number
  }
  offense: {
    damageMin: number
    damageMax: number
    averageDamage: number
    attackSpeed: number
    baseAttackTime: number
    attacksPerSecond: number
    attackType: AttackType
    attackRange: number
    acquisitionRange: number
  }
  defense: {
    armor: number
    physicalDamageReduction: number
    magicResistance: number
    statusResistance: number
    slowResistance: number
    evasion: number
    damageBlock: number
  }
  movement: {
    movementSpeed: number
    turnRate: number
    collisionSize: number
  }
  vision: {
    dayVision: number
    nightVision: number
  }
}

export interface StatModifier {
  id: string
  source: 'item' | 'buff' | 'debuff' | 'talent' | 'training' | 'aura'
  flat?: Partial<{
    strength: number
    agility: number
    intelligence: number
    maxHealth: number
    healthRegen: number
    maxMana: number
    manaRegen: number
    damageMin: number
    damageMax: number
    armor: number
    magicResistance: number
    statusResistance: number
    slowResistance: number
    evasion: number
    damageBlock: number
    attackSpeed: number
    baseAttackTime: number
    attackRange: number
    acquisitionRange: number
    movementSpeed: number
    turnRate: number
    collisionSize: number
    dayVision: number
    nightVision: number
  }>
  percent?: Partial<{
    maxHealth: number
    healthRegen: number
    maxMana: number
    manaRegen: number
    damage: number
    armor: number
    magicResistance: number
    attackSpeed: number
    movementSpeed: number
    dayVision: number
    nightVision: number
  }>
}

export const ATTRIBUTE_RULES = {
  maxHeroLevel: 30,
  healthPerStrength: 22,
  healthRegenPerStrength: 0.1,
  armorPerAgility: 1 / 6,
  attackSpeedPerAgility: 1,
  manaPerIntelligence: 12,
  manaRegenPerIntelligence: 0.05,
  magicResistancePerIntelligence: 0.1,
  primaryAttributeDamageMultiplier: 1,
  universalAttributeDamageMultiplier: 0.7,
  minAttackSpeed: 20,
  maxAttackSpeed: 700,
  minMovementSpeed: 100,
  maxMovementSpeed: 550,
}

export const exampleHero: HeroDefinition = {
  id: 'iron_vanguard',
  name: 'Iron Vanguard',
  primaryAttribute: 'strength',
  attackType: 'melee',
  roles: ['durable', 'initiator'],
  complexity: 1,
  baseAttributes: {
    strength: 25,
    agility: 14,
    intelligence: 16,
  },
  attributeGrowth: {
    strengthGain: 3.2,
    agilityGain: 1.6,
    intelligenceGain: 1.8,
  },
  baseStats: {
    baseHealth: 120,
    baseHealthRegen: 1.5,
    baseMana: 75,
    baseManaRegen: 0,
    baseDamageMin: 30,
    baseDamageMax: 36,
    baseArmor: 1,
    baseMagicResistance: 25,
    baseStatusResistance: 0,
    baseSlowResistance: 0,
    baseAttackSpeed: 100,
    baseAttackTime: 1.7,
    attackRange: 150,
    acquisitionRange: 600,
    movementSpeed: 300,
    turnRate: 0.6,
    collisionSize: 24,
    dayVision: 1800,
    nightVision: 800,
  },
}

export function calculateAttributesAtLevel(hero: HeroDefinition, level: number): AttributeBlock {
  const validatedLevel = clamp(Math.floor(level), 1, ATTRIBUTE_RULES.maxHeroLevel)
  const levelUps = validatedLevel - 1

  return {
    strength: hero.baseAttributes.strength + hero.attributeGrowth.strengthGain * levelUps,
    agility: hero.baseAttributes.agility + hero.attributeGrowth.agilityGain * levelUps,
    intelligence: hero.baseAttributes.intelligence + hero.attributeGrowth.intelligenceGain * levelUps,
  }
}

export function calculateAttributeDamage(primaryAttribute: PrimaryAttribute, attributes: AttributeBlock): number {
  if (primaryAttribute === 'strength') return attributes.strength * ATTRIBUTE_RULES.primaryAttributeDamageMultiplier
  if (primaryAttribute === 'agility') return attributes.agility * ATTRIBUTE_RULES.primaryAttributeDamageMultiplier
  if (primaryAttribute === 'intelligence') return attributes.intelligence * ATTRIBUTE_RULES.primaryAttributeDamageMultiplier
  return (attributes.strength + attributes.agility + attributes.intelligence) * ATTRIBUTE_RULES.universalAttributeDamageMultiplier
}

export function calculateHeroStats(
  hero: HeroDefinition,
  level: number,
  modifiers: StatModifier[] = [],
): HeroCalculatedStats {
  const validatedLevel = clamp(Math.floor(level), 1, ATTRIBUTE_RULES.maxHeroLevel)
  const attributes = applyFlatAttributeModifiers(calculateAttributesAtLevel(hero, validatedLevel), modifiers)
  const attributeDamage = calculateAttributeDamage(hero.primaryAttribute, attributes)

  const draft = {
    resources: {
      maxHealth: hero.baseStats.baseHealth + attributes.strength * ATTRIBUTE_RULES.healthPerStrength,
      healthRegen: hero.baseStats.baseHealthRegen + attributes.strength * ATTRIBUTE_RULES.healthRegenPerStrength,
      maxMana: hero.baseStats.baseMana + attributes.intelligence * ATTRIBUTE_RULES.manaPerIntelligence,
      manaRegen: hero.baseStats.baseManaRegen + attributes.intelligence * ATTRIBUTE_RULES.manaRegenPerIntelligence,
    },
    offense: {
      damageMin: hero.baseStats.baseDamageMin + attributeDamage,
      damageMax: hero.baseStats.baseDamageMax + attributeDamage,
      attackSpeed: hero.baseStats.baseAttackSpeed + attributes.agility * ATTRIBUTE_RULES.attackSpeedPerAgility,
      baseAttackTime: hero.baseStats.baseAttackTime,
      attackRange: hero.baseStats.attackRange,
      acquisitionRange: hero.baseStats.acquisitionRange,
    },
    defense: {
      armor: hero.baseStats.baseArmor + attributes.agility * ATTRIBUTE_RULES.armorPerAgility,
      magicResistance: hero.baseStats.baseMagicResistance + attributes.intelligence * ATTRIBUTE_RULES.magicResistancePerIntelligence,
      statusResistance: hero.baseStats.baseStatusResistance,
      slowResistance: hero.baseStats.baseSlowResistance,
      evasion: 0,
      damageBlock: 0,
    },
    movement: {
      movementSpeed: hero.baseStats.movementSpeed,
      turnRate: hero.baseStats.turnRate,
      collisionSize: hero.baseStats.collisionSize,
    },
    vision: {
      dayVision: hero.baseStats.dayVision,
      nightVision: hero.baseStats.nightVision,
    },
  }

  applyFlatDerivedModifiers(draft, modifiers)
  applyPercentModifiers(draft, modifiers)

  const attackSpeed = clamp(draft.offense.attackSpeed, ATTRIBUTE_RULES.minAttackSpeed, ATTRIBUTE_RULES.maxAttackSpeed)
  const movementSpeed = clamp(draft.movement.movementSpeed, ATTRIBUTE_RULES.minMovementSpeed, ATTRIBUTE_RULES.maxMovementSpeed)
  const damageMin = Math.max(0, draft.offense.damageMin)
  const damageMax = Math.max(damageMin, draft.offense.damageMax)
  const armor = draft.defense.armor

  return {
    level: validatedLevel,
    attributes: {
      ...attributes,
      totalAttributes: attributes.strength + attributes.agility + attributes.intelligence,
    },
    resources: {
      maxHealth: Math.max(1, draft.resources.maxHealth),
      healthRegen: draft.resources.healthRegen,
      maxMana: Math.max(0, draft.resources.maxMana),
      manaRegen: draft.resources.manaRegen,
    },
    offense: {
      damageMin,
      damageMax,
      averageDamage: (damageMin + damageMax) / 2,
      attackSpeed,
      baseAttackTime: Math.max(0.1, draft.offense.baseAttackTime),
      attacksPerSecond: attackSpeed / (100 * Math.max(0.1, draft.offense.baseAttackTime)),
      attackType: hero.attackType,
      attackRange: Math.max(0, draft.offense.attackRange),
      acquisitionRange: Math.max(0, draft.offense.acquisitionRange),
    },
    defense: {
      armor,
      physicalDamageReduction: calculatePhysicalDamageReduction(armor),
      magicResistance: draft.defense.magicResistance,
      statusResistance: draft.defense.statusResistance,
      slowResistance: draft.defense.slowResistance,
      evasion: draft.defense.evasion,
      damageBlock: draft.defense.damageBlock,
    },
    movement: {
      movementSpeed,
      turnRate: draft.movement.turnRate,
      collisionSize: draft.movement.collisionSize,
    },
    vision: {
      dayVision: Math.max(0, draft.vision.dayVision),
      nightVision: Math.max(0, draft.vision.nightVision),
    },
  }
}

export function calculatePhysicalDamageReduction(armor: number): number {
  return (0.06 * armor) / (1 + 0.06 * Math.abs(armor))
}

function applyFlatAttributeModifiers(attributes: AttributeBlock, modifiers: StatModifier[]): AttributeBlock {
  return modifiers.reduce((current, modifier) => ({
    strength: current.strength + (modifier.flat?.strength ?? 0),
    agility: current.agility + (modifier.flat?.agility ?? 0),
    intelligence: current.intelligence + (modifier.flat?.intelligence ?? 0),
  }), attributes)
}

function applyFlatDerivedModifiers(
  draft: {
    resources: HeroCalculatedStats['resources']
    offense: Omit<HeroCalculatedStats['offense'], 'averageDamage' | 'attacksPerSecond' | 'attackType'>
    defense: Omit<HeroCalculatedStats['defense'], 'physicalDamageReduction'>
    movement: HeroCalculatedStats['movement']
    vision: HeroCalculatedStats['vision']
  },
  modifiers: StatModifier[],
) {
  modifiers.forEach((modifier) => {
    const flat = modifier.flat
    if (!flat) return
    draft.resources.maxHealth += flat.maxHealth ?? 0
    draft.resources.healthRegen += flat.healthRegen ?? 0
    draft.resources.maxMana += flat.maxMana ?? 0
    draft.resources.manaRegen += flat.manaRegen ?? 0
    draft.offense.damageMin += flat.damageMin ?? 0
    draft.offense.damageMax += flat.damageMax ?? 0
    draft.offense.attackSpeed += flat.attackSpeed ?? 0
    draft.offense.baseAttackTime += flat.baseAttackTime ?? 0
    draft.offense.attackRange += flat.attackRange ?? 0
    draft.offense.acquisitionRange += flat.acquisitionRange ?? 0
    draft.defense.armor += flat.armor ?? 0
    draft.defense.magicResistance += flat.magicResistance ?? 0
    draft.defense.statusResistance += flat.statusResistance ?? 0
    draft.defense.slowResistance += flat.slowResistance ?? 0
    draft.defense.evasion += flat.evasion ?? 0
    draft.defense.damageBlock += flat.damageBlock ?? 0
    draft.movement.movementSpeed += flat.movementSpeed ?? 0
    draft.movement.turnRate += flat.turnRate ?? 0
    draft.movement.collisionSize += flat.collisionSize ?? 0
    draft.vision.dayVision += flat.dayVision ?? 0
    draft.vision.nightVision += flat.nightVision ?? 0
  })
}

function applyPercentModifiers(
  draft: {
    resources: HeroCalculatedStats['resources']
    offense: Omit<HeroCalculatedStats['offense'], 'averageDamage' | 'attacksPerSecond' | 'attackType'>
    defense: Omit<HeroCalculatedStats['defense'], 'physicalDamageReduction'>
    movement: HeroCalculatedStats['movement']
    vision: HeroCalculatedStats['vision']
  },
  modifiers: StatModifier[],
) {
  modifiers.forEach((modifier) => {
    const percent = modifier.percent
    if (!percent) return
    draft.resources.maxHealth = applyPercent(draft.resources.maxHealth, percent.maxHealth)
    draft.resources.healthRegen = applyPercent(draft.resources.healthRegen, percent.healthRegen)
    draft.resources.maxMana = applyPercent(draft.resources.maxMana, percent.maxMana)
    draft.resources.manaRegen = applyPercent(draft.resources.manaRegen, percent.manaRegen)
    draft.offense.damageMin = applyPercent(draft.offense.damageMin, percent.damage)
    draft.offense.damageMax = applyPercent(draft.offense.damageMax, percent.damage)
    draft.offense.attackSpeed = applyPercent(draft.offense.attackSpeed, percent.attackSpeed)
    draft.defense.armor = applyPercent(draft.defense.armor, percent.armor)
    draft.defense.magicResistance = applyPercent(draft.defense.magicResistance, percent.magicResistance)
    draft.movement.movementSpeed = applyPercent(draft.movement.movementSpeed, percent.movementSpeed)
    draft.vision.dayVision = applyPercent(draft.vision.dayVision, percent.dayVision)
    draft.vision.nightVision = applyPercent(draft.vision.nightVision, percent.nightVision)
  })
}

function applyPercent(value: number, percent = 0) {
  return value * (1 + percent / 100)
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}
