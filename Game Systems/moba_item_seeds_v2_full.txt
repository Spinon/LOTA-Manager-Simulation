// moba_item_seeds_v2_full.txt
// Refatoração completa do arquivo de itens para o manager de MOBA.
// Base: item_seeds_moba_manager.txt, preservando os 210 IDs já usados.
// Esta versão corrige o problema de stats incompletos/esparsos e effects pouco simuláveis.
//
// Diretriz:
// - Não é dado oficial patch-locked de Dota 2.
// - É uma base Dota-like, consistente e configurável para shop, UI, builds e simulação.
// - Zero em stats densos significa ausência daquele bônus.
// - Usar ai.classification/recommendedRoles/buyIf/doNotBuyIf para IA de compra.
// - Usar stacking/restrictions para evitar compras inválidas ou redundantes.

export type ItemEffectKind = "active" | "passive" | "toggle" | "aura" | "consumable" | "enchantment";
export type ItemEffectTarget = "self" | "unit" | "enemy" | "area" | "point" | "unit_or_structure";

export interface DenseItemStats {
  attributes: {
    strength: number;
    agility: number;
    intelligence: number;
    allAttributes: number;
    selectedAttribute: number;
    primaryAttribute: number;
    secondaryAttributes: number;
  };

  resources: {
    maxHealth: number;
    maxMana: number;
    healthRegen: number;
    healthRegenPct: number;
    healthRegenAmpPct: number;
    manaRegen: number;
    manaRegenAmpPct: number;
  };

  offense: Record<string, number>;
  defense: Record<string, number>;
  mobility: Record<string, number>;
  utility: Record<string, number>;
}

export interface FullItemEffectSeed {
  id: string;
  kind: ItemEffectKind;
  target: ItemEffectTarget;
  tags: string[];
  values: Record<string, number | number[] | string | boolean>;
  rules: {
    dispellable: boolean;
    piercesDebuffImmunity: boolean;
    breaksInvisibility: boolean;
    affectsBuildings: boolean;
    canTargetAllies: boolean;
    canTargetEnemies: boolean;
  };
}

export interface FullItemSeed {
  id: string;
  archetype: string;
  category: string;
  slot: string;
  shopTier: string;
  cost: number;
  recipeCost: number;
  components: string[];
  tags: string[];
  stats: DenseItemStats;
  effects: FullItemEffectSeed[];

  stacking: {
    stackGroup: string;
    stackMode: string;
    uniqueByItemId: boolean;
  };

  restrictions: {
    unique: boolean;
    shareable: boolean;
    droppable: boolean;
    sellable: boolean;
    consumedOnUse: boolean;
    requiresRangedHero: boolean;
    requiresMeleeHero: boolean;
    disabledOnIllusions: boolean;
    cannotBeBought: boolean;
    isRecipeComponentOnly: boolean;
  };

  ai: {
    classification: string;
    recommendedRoles: string[];
    purchasePhase: string;
    weights: Record<string, number>;
    synergy: {
      greatWith: string[];
      badWith: string[];
      counters: string[];
    };
    doNotBuyIf: string[];
    buyIf: string[];
  };

  balanceNotes: string[];
  sourceLegacyId: string;
}

export const ITEM_V2_RULES = {
  validationRules: ["Todos os itens devem ter stats, effects, restrictions, stacking e ai.", "Item final com stats deve ter effect stat_bonus.", "Item active deve ter cooldown e manaCost, mesmo que manaCost seja 0.", "Item neutral ou enchantment deve ter cannotBeBought = true.", "Componentes devem ter isRecipeComponentOnly = true.", "Itens ranged-only não devem ser recomendados para heróis melee.", "Itens melee-only não devem ser recomendados para heróis ranged.", "Auras e famílias de item usam stackGroup para evitar redundância."],
  purchaseScoringHint: {
    scoreItemForHero: "baseRoleWeight + statSynergy + counterValue + timingValue - restrictionPenalty - redundancyPenalty - opportunityCost",
    restrictionPenalty: 9999,
    sameStackGroupPenalty: 35,
    wrongTimingPenalty: 15,
    counterOverrideBonus: 45
  }
};

export const FULL_ITEM_SEEDS_V2: FullItemSeed[] = [
  {
    id: "i001_regen_rations",
    archetype: "consumível de regeneração lenta de vida",
    category: "consumable",
    slot: "consumable",
    shopTier: "base",
    cost: 90,
    recipeCost: 0,
    components: [],
    tags: ["lane_sustain", "tree_interaction"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "eat_tree_regen",
        kind: "consumable",
        target: "self",
        tags: ["heal_over_time"],
        values: {
          charges: 3,
          heal: 112,
          duration: 16,
          cooldown: 0
        },
        rules: {
          dispellable: true,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: true,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "universal_consumable",
      recommendedRoles: ["all_positions"],
      purchasePhase: "starting_or_utility",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: [],
        badWith: [],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i001_regen_rations"
  },
  {
    id: "i002_healing_salve",
    archetype: "consumível de cura intensa interrompível",
    category: "consumable",
    slot: "consumable",
    shopTier: "base",
    cost: 100,
    recipeCost: 0,
    components: [],
    tags: ["burst_sustain"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "salve_regen",
        kind: "consumable",
        target: "unit",
        tags: ["heal_over_time", "break_on_damage"],
        values: {
          heal: 400,
          duration: 10,
          cooldown: 0
        },
        rules: {
          dispellable: true,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: true
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: true,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "universal_consumable",
      recommendedRoles: ["all_positions"],
      purchasePhase: "starting_or_utility",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: [],
        badWith: [],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i002_healing_salve"
  },
  {
    id: "i003_mana_clarity",
    archetype: "consumível de regeneração lenta de mana",
    category: "consumable",
    slot: "consumable",
    shopTier: "base",
    cost: 50,
    recipeCost: 0,
    components: [],
    tags: ["mana_sustain"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "clarity_regen",
        kind: "consumable",
        target: "unit",
        tags: ["mana_over_time", "break_on_damage"],
        values: {
          mana: 180,
          duration: 25,
          cooldown: 0
        },
        rules: {
          dispellable: true,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: true
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: true,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "universal_consumable",
      recommendedRoles: ["all_positions"],
      purchasePhase: "starting_or_utility",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["cooldown_reduction", "magic_burst", "mana_sustain", "spell_amp"],
        badWith: ["mana_independent_right_clickers"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i003_mana_clarity"
  },
  {
    id: "i004_burst_mango",
    archetype: "fruta de mana instantânea com pequena regeneração passiva",
    category: "consumable",
    slot: "consumable",
    shopTier: "base",
    cost: 65,
    recipeCost: 0,
    components: [],
    tags: ["instant_mana", "lane_sustain"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0.4,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i004_burst_mango_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          healthRegen: 0.4
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "instant_mana_restore",
        kind: "consumable",
        target: "unit",
        tags: ["restore_mana"],
        values: {
          mana: 100,
          cooldown: 0
        },
        rules: {
          dispellable: true,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: true,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "universal_consumable",
      recommendedRoles: ["all_positions"],
      purchasePhase: "starting_or_utility",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["cooldown_reduction", "magic_burst", "mana_sustain", "spell_amp"],
        badWith: ["mana_independent_right_clickers"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i004_burst_mango"
  },
  {
    id: "i005_faerie_spark",
    archetype: "consumível de dano pequeno e cura emergencial",
    category: "consumable",
    slot: "consumable",
    shopTier: "base",
    cost: 65,
    recipeCost: 0,
    components: [],
    tags: ["last_hit", "emergency_heal"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 2,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i005_faerie_spark_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          damage: 2
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "instant_small_heal",
        kind: "consumable",
        target: "self",
        tags: ["restore_health"],
        values: {
          health: 85,
          cooldown: 0
        },
        rules: {
          dispellable: true,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: true,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "universal_consumable",
      recommendedRoles: ["all_positions"],
      purchasePhase: "starting_or_utility",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["anti_burst", "save_play", "supports"],
        badWith: [],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i005_faerie_spark"
  },
  {
    id: "i006_team_smoke",
    archetype: "consumível de invisibilidade estratégica para rotação",
    category: "map_utility",
    slot: "consumable",
    shopTier: "base",
    cost: 50,
    recipeCost: 0,
    components: [],
    tags: ["gank", "rotation", "team_utility"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "smoke_invisibility",
        kind: "consumable",
        target: "area",
        tags: ["invisibility", "movement"],
        values: {
          duration: 45,
          moveSpeedPct: 15,
          breakRadius: 1025,
          cooldown: 0
        },
        rules: {
          dispellable: true,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: true,
          canTargetEnemies: true
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: true,
      droppable: true,
      sellable: true,
      consumedOnUse: true,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "support_map_utility",
      recommendedRoles: ["position_5_hard_support", "position_4_soft_support"],
      purchasePhase: "starting_or_utility",
      weights: {
        core: 35,
        support: 90,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 40,
        mapUtility: 95
      },
      synergy: {
        greatWith: [],
        badWith: [],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i006_team_smoke"
  },
  {
    id: "i007_recall_scroll",
    archetype: "teleporte estratégico para estruturas aliadas",
    category: "map_utility",
    slot: "consumable",
    shopTier: "base",
    cost: 100,
    recipeCost: 0,
    components: [],
    tags: ["teleport", "macro"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "channel_recall",
        kind: "consumable",
        target: "point",
        tags: ["teleport", "channel"],
        values: {
          channel: 3,
          range: "allied_structure",
          cooldown: 0
        },
        rules: {
          dispellable: true,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: true,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "universal_map_utility",
      recommendedRoles: ["all_positions"],
      purchasePhase: "starting_or_utility",
      weights: {
        core: 35,
        support: 90,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 40,
        mapUtility: 95
      },
      synergy: {
        greatWith: [],
        badWith: [],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i007_recall_scroll"
  },
  {
    id: "i008_observer_eye",
    archetype: "sentinela de visão gratuita com duração longa",
    category: "map_utility",
    slot: "consumable",
    shopTier: "base",
    cost: 0,
    recipeCost: 0,
    components: [],
    tags: ["vision", "objective_control"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "place_observer",
        kind: "consumable",
        target: "point",
        tags: ["ward", "vision"],
        values: {
          dayVision: 1600,
          nightVision: 1600,
          duration: 360,
          cooldown: 0
        },
        rules: {
          dispellable: true,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "ward_stock",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: true,
      droppable: true,
      sellable: false,
      consumedOnUse: true,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "support_map_utility",
      recommendedRoles: ["position_5_hard_support", "position_4_soft_support"],
      purchasePhase: "starting_or_utility",
      weights: {
        core: 35,
        support: 90,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 40,
        mapUtility: 95
      },
      synergy: {
        greatWith: [],
        badWith: [],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: ["enemy_has_invisibility_or_map_is_dark"]
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i008_observer_eye"
  },
  {
    id: "i009_sentry_eye",
    archetype: "sentinela de revelação contra invisibilidade",
    category: "map_utility",
    slot: "consumable",
    shopTier: "base",
    cost: 50,
    recipeCost: 0,
    components: [],
    tags: ["detection", "counter_vision"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "place_sentry",
        kind: "consumable",
        target: "point",
        tags: ["ward", "true_sight"],
        values: {
          radius: 900,
          duration: 420,
          cooldown: 0
        },
        rules: {
          dispellable: true,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "ward_stock",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: true,
      droppable: true,
      sellable: true,
      consumedOnUse: true,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "support_map_utility",
      recommendedRoles: ["position_5_hard_support", "position_4_soft_support"],
      purchasePhase: "starting_or_utility",
      weights: {
        core: 35,
        support: 90,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 40,
        mapUtility: 95
      },
      synergy: {
        greatWith: [],
        badWith: [],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: ["enemy_has_invisibility_or_map_is_dark"]
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i009_sentry_eye"
  },
  {
    id: "i010_revealing_dust",
    archetype: "revelação em área contra unidades invisíveis",
    category: "map_utility",
    slot: "consumable",
    shopTier: "base",
    cost: 80,
    recipeCost: 0,
    components: [],
    tags: ["detection", "anti_invisibility"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "dust_reveal",
        kind: "consumable",
        target: "area",
        tags: ["true_sight", "slow"],
        values: {
          radius: 1050,
          duration: 12,
          slowPct: 20,
          cooldown: 0
        },
        rules: {
          dispellable: true,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: true
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: true,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "support_map_utility",
      recommendedRoles: ["position_5_hard_support", "position_4_soft_support"],
      purchasePhase: "starting_or_utility",
      weights: {
        core: 35,
        support: 90,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 40,
        mapUtility: 95
      },
      synergy: {
        greatWith: [],
        badWith: ["enemy_true_sight_heavy_games"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: ["enemy_has_invisibility_or_map_is_dark"]
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i010_revealing_dust"
  },
  {
    id: "i011_refillable_bottle",
    archetype: "frasco de recargas para vida, mana e controle de runas",
    category: "consumable",
    slot: "inventory",
    shopTier: "base",
    cost: 675,
    recipeCost: 0,
    components: [],
    tags: ["mid_lane", "resource_sustain", "rune_control"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "drink_charge",
        kind: "active",
        target: "self",
        tags: ["heal_over_time", "mana_over_time"],
        values: {
          charges: 3,
          health: 110,
          mana: 60,
          duration: 2.7,
          cooldown: 30,
          radius: 1200,
          manaCost: 0
        },
        rules: {
          dispellable: true,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "mid_or_roaming_consumable",
      recommendedRoles: ["position_2_mid", "position_4_soft_support"],
      purchasePhase: "starting_or_utility",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["cooldown_reduction", "magic_burst", "mana_sustain", "spell_amp"],
        badWith: ["mana_independent_right_clickers"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i011_refillable_bottle"
  },
  {
    id: "i012_rain_barrier_drops",
    archetype: "barreira consumível automática contra dano mágico",
    category: "consumable",
    slot: "inventory",
    shopTier: "base",
    cost: 225,
    recipeCost: 0,
    components: [],
    tags: ["anti_magic", "early_defense"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0.8,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i012_rain_barrier_drops_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          manaRegen: 0.8
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "auto_magic_barrier_charge",
        kind: "passive",
        target: "self",
        tags: ["magic_barrier", "charges"],
        values: {
          charges: 6,
          barrier: 120,
          threshold: 75,
          cooldown: 0
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: true,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "universal_consumable",
      recommendedRoles: ["all_positions"],
      purchasePhase: "starting_or_utility",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: [],
        badWith: [],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i012_rain_barrier_drops"
  },
  {
    id: "i013_tome_training",
    archetype: "consumível de experiência para recuperação estratégica",
    category: "consumable",
    slot: "consumable",
    shopTier: "base",
    cost: 0,
    recipeCost: 0,
    components: [],
    tags: ["manager_mode", "catch_up"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "grant_xp",
        kind: "consumable",
        target: "unit",
        tags: ["experience"],
        values: {
          xp: 700,
          cooldown: 0
        },
        rules: {
          dispellable: true,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: true
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: false,
      consumedOnUse: true,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "universal_consumable",
      recommendedRoles: ["all_positions"],
      purchasePhase: "starting_or_utility",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["cooldown_reduction", "magic_burst", "mana_sustain", "spell_amp"],
        badWith: ["mana_independent_right_clickers"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i013_tome_training"
  },
  {
    id: "i014_minor_branch",
    archetype: "componente barato de atributos universais",
    category: "component",
    slot: "component",
    shopTier: "base",
    cost: 50,
    recipeCost: 0,
    components: [],
    tags: ["attributes", "component"],
    stats: {
      attributes: {
        strength: 1,
        agility: 1,
        intelligence: 1,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i014_minor_branch_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          strength: 1,
          agility: 1,
          intelligence: 1
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: true
    },
    ai: {
      classification: "component_only",
      recommendedRoles: ["recipe_component"],
      purchasePhase: "component",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: [],
        badWith: [],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i014_minor_branch"
  },
  {
    id: "i015_strength_gauntlet",
    archetype: "componente barato de força",
    category: "component",
    slot: "component",
    shopTier: "base",
    cost: 140,
    recipeCost: 0,
    components: [],
    tags: ["strength", "component"],
    stats: {
      attributes: {
        strength: 3,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i015_strength_gauntlet_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          strength: 3
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: true
    },
    ai: {
      classification: "component_only",
      recommendedRoles: ["recipe_component"],
      purchasePhase: "component",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: [],
        badWith: [],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i015_strength_gauntlet"
  },
  {
    id: "i016_agility_slippers",
    archetype: "componente barato de agilidade",
    category: "component",
    slot: "component",
    shopTier: "base",
    cost: 140,
    recipeCost: 0,
    components: [],
    tags: ["agility", "component"],
    stats: {
      attributes: {
        strength: 0,
        agility: 3,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i016_agility_slippers_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          agility: 3
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: true
    },
    ai: {
      classification: "component_only",
      recommendedRoles: ["recipe_component"],
      purchasePhase: "component",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: [],
        badWith: [],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i016_agility_slippers"
  },
  {
    id: "i017_intelligence_mantle",
    archetype: "componente barato de inteligência",
    category: "component",
    slot: "component",
    shopTier: "base",
    cost: 140,
    recipeCost: 0,
    components: [],
    tags: ["intelligence", "component"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 3,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i017_intelligence_mantle_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          intelligence: 3
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: true
    },
    ai: {
      classification: "component_only",
      recommendedRoles: ["recipe_component"],
      purchasePhase: "component",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["cooldown_reduction", "magic_burst", "mana_sustain", "spell_amp"],
        badWith: ["mana_independent_right_clickers"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i017_intelligence_mantle"
  },
  {
    id: "i018_small_circlet",
    archetype: "componente barato de todos os atributos",
    category: "component",
    slot: "component",
    shopTier: "base",
    cost: 155,
    recipeCost: 0,
    components: [],
    tags: ["attributes", "component"],
    stats: {
      attributes: {
        strength: 2,
        agility: 2,
        intelligence: 2,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i018_small_circlet_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          strength: 2,
          agility: 2,
          intelligence: 2
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: true
    },
    ai: {
      classification: "component_only",
      recommendedRoles: ["recipe_component"],
      purchasePhase: "component",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: [],
        badWith: [],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i018_small_circlet"
  },
  {
    id: "i019_strength_belt",
    archetype: "componente médio de força",
    category: "component",
    slot: "component",
    shopTier: "base",
    cost: 450,
    recipeCost: 0,
    components: [],
    tags: ["strength", "component"],
    stats: {
      attributes: {
        strength: 6,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i019_strength_belt_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          strength: 6
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: true
    },
    ai: {
      classification: "component_only",
      recommendedRoles: ["recipe_component"],
      purchasePhase: "component",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: [],
        badWith: [],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i019_strength_belt"
  },
  {
    id: "i020_agility_band",
    archetype: "componente médio de agilidade",
    category: "component",
    slot: "component",
    shopTier: "base",
    cost: 450,
    recipeCost: 0,
    components: [],
    tags: ["agility", "component"],
    stats: {
      attributes: {
        strength: 0,
        agility: 6,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i020_agility_band_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          agility: 6
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: true
    },
    ai: {
      classification: "component_only",
      recommendedRoles: ["recipe_component"],
      purchasePhase: "component",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: [],
        badWith: [],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i020_agility_band"
  },
  {
    id: "i021_intelligence_robe",
    archetype: "componente médio de inteligência",
    category: "component",
    slot: "component",
    shopTier: "base",
    cost: 450,
    recipeCost: 0,
    components: [],
    tags: ["intelligence", "component"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 6,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i021_intelligence_robe_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          intelligence: 6
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: true
    },
    ai: {
      classification: "component_only",
      recommendedRoles: ["recipe_component"],
      purchasePhase: "component",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["cooldown_reduction", "magic_burst", "mana_sustain", "spell_amp"],
        badWith: ["mana_independent_right_clickers"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i021_intelligence_robe"
  },
  {
    id: "i022_balanced_crown",
    archetype: "componente médio de atributos universais",
    category: "component",
    slot: "component",
    shopTier: "base",
    cost: 450,
    recipeCost: 0,
    components: [],
    tags: ["attributes", "component"],
    stats: {
      attributes: {
        strength: 4,
        agility: 4,
        intelligence: 4,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i022_balanced_crown_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          strength: 4,
          agility: 4,
          intelligence: 4
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: true
    },
    ai: {
      classification: "component_only",
      recommendedRoles: ["recipe_component"],
      purchasePhase: "component",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: [],
        badWith: [],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i022_balanced_crown"
  },
  {
    id: "i023_giant_axe",
    archetype: "componente grande de força",
    category: "component",
    slot: "component",
    shopTier: "base",
    cost: 1000,
    recipeCost: 0,
    components: [],
    tags: ["strength", "component"],
    stats: {
      attributes: {
        strength: 10,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i023_giant_axe_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          strength: 10
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: true
    },
    ai: {
      classification: "component_only",
      recommendedRoles: ["recipe_component"],
      purchasePhase: "component",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: [],
        badWith: [],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i023_giant_axe"
  },
  {
    id: "i024_swift_blade",
    archetype: "componente grande de agilidade",
    category: "component",
    slot: "component",
    shopTier: "base",
    cost: 1000,
    recipeCost: 0,
    components: [],
    tags: ["agility", "component"],
    stats: {
      attributes: {
        strength: 0,
        agility: 10,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i024_swift_blade_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          agility: 10
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: true
    },
    ai: {
      classification: "component_only",
      recommendedRoles: ["recipe_component"],
      purchasePhase: "component",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: [],
        badWith: [],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i024_swift_blade"
  },
  {
    id: "i025_wizard_staff",
    archetype: "componente grande de inteligência",
    category: "component",
    slot: "component",
    shopTier: "base",
    cost: 1000,
    recipeCost: 0,
    components: [],
    tags: ["intelligence", "component"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 10,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i025_wizard_staff_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          intelligence: 10
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: true
    },
    ai: {
      classification: "component_only",
      recommendedRoles: ["recipe_component"],
      purchasePhase: "component",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["cooldown_reduction", "magic_burst", "mana_sustain", "spell_amp"],
        badWith: ["mana_independent_right_clickers"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i025_wizard_staff"
  },
  {
    id: "i026_grand_diadem",
    archetype: "componente grande de todos os atributos",
    category: "component",
    slot: "component",
    shopTier: "base",
    cost: 1000,
    recipeCost: 0,
    components: [],
    tags: ["attributes", "component"],
    stats: {
      attributes: {
        strength: 6,
        agility: 6,
        intelligence: 6,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i026_grand_diadem_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          strength: 6,
          agility: 6,
          intelligence: 6
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: true
    },
    ai: {
      classification: "component_only",
      recommendedRoles: ["recipe_component"],
      purchasePhase: "component",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: [],
        badWith: [],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i026_grand_diadem"
  },
  {
    id: "i027_basic_boots",
    archetype: "componente de velocidade de movimento",
    category: "component",
    slot: "component",
    shopTier: "base",
    cost: 500,
    recipeCost: 0,
    components: [],
    tags: ["movement", "component"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 45,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i027_basic_boots_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          movementSpeed: 45
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: true
    },
    ai: {
      classification: "component_only",
      recommendedRoles: ["recipe_component"],
      purchasePhase: "component",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: [],
        badWith: [],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i027_basic_boots"
  },
  {
    id: "i028_wind_thread",
    archetype: "componente barato de velocidade adicional",
    category: "component",
    slot: "component",
    shopTier: "base",
    cost: 250,
    recipeCost: 0,
    components: [],
    tags: ["movement", "component"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 20,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i028_wind_thread_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          movementSpeed: 20
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: true
    },
    ai: {
      classification: "component_only",
      recommendedRoles: ["recipe_component"],
      purchasePhase: "component",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: [],
        badWith: [],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i028_wind_thread"
  },
  {
    id: "i029_quelling_hatchet",
    archetype: "componente de farm contra creeps",
    category: "component",
    slot: "component",
    shopTier: "base",
    cost: 100,
    recipeCost: 0,
    components: [],
    tags: ["last_hit", "jungle"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "creep_damage_bonus",
        kind: "passive",
        target: "self",
        tags: ["attack_modifier", "creep_only"],
        values: {
          meleeDamageBonusPct: 8,
          rangedDamageBonusPct: 4,
          cooldown: 0
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: true
    },
    ai: {
      classification: "component_only",
      recommendedRoles: ["recipe_component"],
      purchasePhase: "component",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: [],
        badWith: [],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i029_quelling_hatchet"
  },
  {
    id: "i030_venom_orb",
    archetype: "componente de ataque com veneno e lentidão",
    category: "component",
    slot: "component",
    shopTier: "base",
    cost: 350,
    recipeCost: 0,
    components: [],
    tags: ["orb", "slow", "dot"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "venom_attack",
        kind: "passive",
        target: "enemy",
        tags: ["attack_modifier", "slow", "dot"],
        values: {
          dps: 2,
          slowPct: 13,
          duration: 3,
          cooldown: 0
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: true
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: true
    },
    ai: {
      classification: "component_only",
      recommendedRoles: ["recipe_component"],
      purchasePhase: "component",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: [],
        badWith: [],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i030_venom_orb"
  },
  {
    id: "i031_armor_break_stone",
    archetype: "componente de redução de armadura por ataque",
    category: "component",
    slot: "component",
    shopTier: "base",
    cost: 300,
    recipeCost: 0,
    components: [],
    tags: ["armor_reduction", "attack_modifier"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "minor_armor_corruption",
        kind: "passive",
        target: "enemy",
        tags: ["attack_modifier", "armor_reduction"],
        values: {
          armorReduction: 2,
          duration: 8,
          cooldown: 0
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: true
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: true
    },
    ai: {
      classification: "component_only",
      recommendedRoles: ["recipe_component"],
      purchasePhase: "component",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["armor_reduction", "attack_speed", "lifesteal", "right_click_cores"],
        badWith: ["low_attack_uptime_supports"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i031_armor_break_stone"
  },
  {
    id: "i032_small_damage_blades",
    archetype: "componente barato de dano",
    category: "component",
    slot: "component",
    shopTier: "base",
    cost: 450,
    recipeCost: 0,
    components: [],
    tags: ["damage", "component"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 9,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i032_small_damage_blades_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          damage: 9
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: true
    },
    ai: {
      classification: "component_only",
      recommendedRoles: ["recipe_component"],
      purchasePhase: "component",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["armor_reduction", "attack_speed", "lifesteal", "right_click_cores"],
        badWith: ["low_attack_uptime_supports"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i032_small_damage_blades"
  },
  {
    id: "i033_broad_sword",
    archetype: "componente médio de dano",
    category: "component",
    slot: "component",
    shopTier: "base",
    cost: 1000,
    recipeCost: 0,
    components: [],
    tags: ["damage", "component"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 15,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i033_broad_sword_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          damage: 15
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: true
    },
    ai: {
      classification: "component_only",
      recommendedRoles: ["recipe_component"],
      purchasePhase: "component",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["armor_reduction", "attack_speed", "lifesteal", "right_click_cores"],
        badWith: ["low_attack_uptime_supports"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i033_broad_sword"
  },
  {
    id: "i034_heavy_claymore",
    archetype: "componente grande de dano",
    category: "component",
    slot: "component",
    shopTier: "base",
    cost: 1350,
    recipeCost: 0,
    components: [],
    tags: ["damage", "component"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 20,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i034_heavy_claymore_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          damage: 20
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: true
    },
    ai: {
      classification: "component_only",
      recommendedRoles: ["recipe_component"],
      purchasePhase: "component",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["armor_reduction", "attack_speed", "lifesteal", "right_click_cores"],
        badWith: ["low_attack_uptime_supports"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i034_heavy_claymore"
  },
  {
    id: "i035_piercing_javelin",
    archetype: "componente de dano com proc mágico",
    category: "component",
    slot: "component",
    shopTier: "base",
    cost: 900,
    recipeCost: 0,
    components: [],
    tags: ["proc_damage", "component"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 10,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i035_piercing_javelin_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          damage: 10
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "pierce_proc",
        kind: "passive",
        target: "enemy",
        tags: ["attack_proc", "magic_damage"],
        values: {
          chancePct: 25,
          damage: 60,
          cooldown: 0
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: true
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: true
    },
    ai: {
      classification: "component_only",
      recommendedRoles: ["recipe_component"],
      purchasePhase: "component",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["armor_reduction", "attack_speed", "lifesteal", "right_click_cores"],
        badWith: ["low_attack_uptime_supports"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i035_piercing_javelin"
  },
  {
    id: "i036_war_hammer",
    archetype: "componente avançado de dano",
    category: "component",
    slot: "component",
    shopTier: "base",
    cost: 1600,
    recipeCost: 0,
    components: [],
    tags: ["damage", "component"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 24,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i036_war_hammer_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          damage: 24
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: true
    },
    ai: {
      classification: "component_only",
      recommendedRoles: ["recipe_component"],
      purchasePhase: "component",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["armor_reduction", "attack_speed", "lifesteal", "right_click_cores"],
        badWith: ["low_attack_uptime_supports"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i036_war_hammer"
  },
  {
    id: "i037_demon_edge_generic",
    archetype: "componente supremo de dano bruto",
    category: "component",
    slot: "component",
    shopTier: "base",
    cost: 2200,
    recipeCost: 0,
    components: [],
    tags: ["damage", "late_component"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 40,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i037_demon_edge_generic_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          damage: 40
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: true
    },
    ai: {
      classification: "component_only",
      recommendedRoles: ["recipe_component"],
      purchasePhase: "component",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["armor_reduction", "attack_speed", "lifesteal", "right_click_cores"],
        badWith: ["low_attack_uptime_supports"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i037_demon_edge_generic"
  },
  {
    id: "i038_quarterstaff",
    archetype: "componente de dano e velocidade de ataque",
    category: "component",
    slot: "component",
    shopTier: "base",
    cost: 875,
    recipeCost: 0,
    components: [],
    tags: ["damage", "attack_speed"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 10,
        damagePct: 0,
        attackSpeed: 10,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i038_quarterstaff_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          damage: 10,
          attackSpeed: 10
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: true
    },
    ai: {
      classification: "component_only",
      recommendedRoles: ["recipe_component"],
      purchasePhase: "component",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["armor_reduction", "attack_speed", "lifesteal", "right_click_cores"],
        badWith: ["low_attack_uptime_supports"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i038_quarterstaff"
  },
  {
    id: "i039_fast_knuckles",
    archetype: "componente de velocidade de ataque",
    category: "component",
    slot: "component",
    shopTier: "base",
    cost: 1000,
    recipeCost: 0,
    components: [],
    tags: ["attack_speed", "component"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 35,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i039_fast_knuckles_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          attackSpeed: 35
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: true
    },
    ai: {
      classification: "component_only",
      recommendedRoles: ["recipe_component"],
      purchasePhase: "component",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["armor_reduction", "attack_speed", "lifesteal", "right_click_cores"],
        badWith: ["low_attack_uptime_supports"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i039_fast_knuckles"
  },
  {
    id: "i040_haste_gloves",
    archetype: "componente barato de velocidade de ataque",
    category: "component",
    slot: "component",
    shopTier: "base",
    cost: 450,
    recipeCost: 0,
    components: [],
    tags: ["attack_speed", "component"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 20,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i040_haste_gloves_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          attackSpeed: 20
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: true
    },
    ai: {
      classification: "component_only",
      recommendedRoles: ["recipe_component"],
      purchasePhase: "component",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["armor_reduction", "attack_speed", "lifesteal", "right_click_cores"],
        badWith: ["low_attack_uptime_supports"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i040_haste_gloves"
  },
  {
    id: "i041_protection_ring",
    archetype: "componente barato de armadura",
    category: "component",
    slot: "component",
    shopTier: "base",
    cost: 175,
    recipeCost: 0,
    components: [],
    tags: ["armor", "component"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 2,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i041_protection_ring_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          armor: 2
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: true
    },
    ai: {
      classification: "component_only",
      recommendedRoles: ["recipe_component"],
      purchasePhase: "component",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: [],
        badWith: [],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i041_protection_ring"
  },
  {
    id: "i042_chain_armor",
    archetype: "componente médio de armadura",
    category: "component",
    slot: "component",
    shopTier: "base",
    cost: 550,
    recipeCost: 0,
    components: [],
    tags: ["armor", "component"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 4,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i042_chain_armor_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          armor: 4
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: true
    },
    ai: {
      classification: "component_only",
      recommendedRoles: ["recipe_component"],
      purchasePhase: "component",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: [],
        badWith: [],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i042_chain_armor"
  },
  {
    id: "i043_splintmail_plate",
    archetype: "componente grande de armadura",
    category: "component",
    slot: "component",
    shopTier: "base",
    cost: 950,
    recipeCost: 0,
    components: [],
    tags: ["armor", "component"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 7,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i043_splintmail_plate_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          armor: 7
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: true
    },
    ai: {
      classification: "component_only",
      recommendedRoles: ["recipe_component"],
      purchasePhase: "component",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: [],
        badWith: [],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i043_splintmail_plate"
  },
  {
    id: "i044_iron_helm",
    archetype: "componente de armadura e regeneração",
    category: "component",
    slot: "component",
    shopTier: "base",
    cost: 975,
    recipeCost: 0,
    components: [],
    tags: ["armor", "regen"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 5,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 5,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i044_iron_helm_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          healthRegen: 5,
          armor: 5
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: true
    },
    ai: {
      classification: "component_only",
      recommendedRoles: ["recipe_component"],
      purchasePhase: "component",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: [],
        badWith: [],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i044_iron_helm"
  },
  {
    id: "i045_grand_platemail",
    archetype: "componente supremo de armadura",
    category: "component",
    slot: "component",
    shopTier: "base",
    cost: 1400,
    recipeCost: 0,
    components: [],
    tags: ["armor", "late_component"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 10,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i045_grand_platemail_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          armor: 10
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: true
    },
    ai: {
      classification: "component_only",
      recommendedRoles: ["recipe_component"],
      purchasePhase: "component",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: [],
        badWith: [],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i045_grand_platemail"
  },
  {
    id: "i046_magic_cloak",
    archetype: "componente de resistência mágica",
    category: "component",
    slot: "component",
    shopTier: "base",
    cost: 800,
    recipeCost: 0,
    components: [],
    tags: ["magic_resistance", "component"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 15,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i046_magic_cloak_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          magicResistancePct: 15
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: true
    },
    ai: {
      classification: "component_only",
      recommendedRoles: ["recipe_component"],
      purchasePhase: "component",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: [],
        badWith: [],
        counters: ["aoe_magic_damage", "magic_burst"]
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i046_magic_cloak"
  },
  {
    id: "i047_simple_shawl",
    archetype: "componente barato de resistência mágica",
    category: "component",
    slot: "component",
    shopTier: "base",
    cost: 450,
    recipeCost: 0,
    components: [],
    tags: ["magic_resistance", "component"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 10,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i047_simple_shawl_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          magicResistancePct: 10
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: true
    },
    ai: {
      classification: "component_only",
      recommendedRoles: ["recipe_component"],
      purchasePhase: "component",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: [],
        badWith: [],
        counters: ["aoe_magic_damage", "magic_burst"]
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i047_simple_shawl"
  },
  {
    id: "i048_regen_ring",
    archetype: "componente de regeneração de vida",
    category: "component",
    slot: "component",
    shopTier: "base",
    cost: 175,
    recipeCost: 0,
    components: [],
    tags: ["health_regen", "component"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 1.25,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i048_regen_ring_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          healthRegen: 1.25
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: true
    },
    ai: {
      classification: "component_only",
      recommendedRoles: ["recipe_component"],
      purchasePhase: "component",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["anti_burst", "save_play", "supports"],
        badWith: [],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i048_regen_ring"
  },
  {
    id: "i049_mana_mask",
    archetype: "componente de regeneração de mana",
    category: "component",
    slot: "component",
    shopTier: "base",
    cost: 175,
    recipeCost: 0,
    components: [],
    tags: ["mana_regen", "component"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0.7,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i049_mana_mask_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          manaRegen: 0.7
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: true
    },
    ai: {
      classification: "component_only",
      recommendedRoles: ["recipe_component"],
      purchasePhase: "component",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["cooldown_reduction", "magic_burst", "mana_sustain", "spell_amp"],
        badWith: ["mana_independent_right_clickers"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i049_mana_mask"
  },
  {
    id: "i050_void_stone",
    archetype: "componente avançado de regeneração de mana",
    category: "component",
    slot: "component",
    shopTier: "base",
    cost: 700,
    recipeCost: 0,
    components: [],
    tags: ["mana_regen", "component"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 2.25,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i050_void_stone_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          manaRegen: 2.25
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: true
    },
    ai: {
      classification: "component_only",
      recommendedRoles: ["recipe_component"],
      purchasePhase: "component",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["cooldown_reduction", "magic_burst", "mana_sustain", "spell_amp"],
        badWith: ["mana_independent_right_clickers"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i050_void_stone"
  },
  {
    id: "i051_lifesteal_mask",
    archetype: "componente de roubo de vida",
    category: "component",
    slot: "component",
    shopTier: "base",
    cost: 900,
    recipeCost: 0,
    components: [],
    tags: ["lifesteal", "component"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 15,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i051_lifesteal_mask_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          lifestealPct: 15
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: true
    },
    ai: {
      classification: "component_only",
      recommendedRoles: ["recipe_component"],
      purchasePhase: "component",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["armor_reduction", "attack_speed", "lifesteal", "right_click_cores"],
        badWith: ["low_attack_uptime_supports"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i051_lifesteal_mask"
  },
  {
    id: "i052_health_booster",
    archetype: "componente de vida máxima",
    category: "component",
    slot: "component",
    shopTier: "base",
    cost: 1000,
    recipeCost: 0,
    components: [],
    tags: ["health", "component"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 250,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i052_health_booster_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          maxHealth: 250
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: true
    },
    ai: {
      classification: "component_only",
      recommendedRoles: ["recipe_component"],
      purchasePhase: "component",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["anti_burst", "save_play", "supports"],
        badWith: [],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i052_health_booster"
  },
  {
    id: "i053_mana_booster",
    archetype: "componente de mana máxima",
    category: "component",
    slot: "component",
    shopTier: "base",
    cost: 800,
    recipeCost: 0,
    components: [],
    tags: ["mana", "component"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 250,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i053_mana_booster_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          maxMana: 250
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: true
    },
    ai: {
      classification: "component_only",
      recommendedRoles: ["recipe_component"],
      purchasePhase: "component",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["cooldown_reduction", "magic_burst", "mana_sustain", "spell_amp"],
        badWith: ["mana_independent_right_clickers"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i053_mana_booster"
  },
  {
    id: "i054_resource_core",
    archetype: "componente de vida e mana máxima",
    category: "component",
    slot: "component",
    shopTier: "base",
    cost: 1200,
    recipeCost: 0,
    components: [],
    tags: ["health", "mana", "component"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 175,
        maxMana: 175,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i054_resource_core_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          maxHealth: 175,
          maxMana: 175
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: true
    },
    ai: {
      classification: "component_only",
      recommendedRoles: ["recipe_component"],
      purchasePhase: "component",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["anti_burst", "cooldown_reduction", "magic_burst", "mana_sustain", "save_play", "spell_amp", "supports"],
        badWith: ["mana_independent_right_clickers"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i054_resource_core"
  },
  {
    id: "i055_blink_core",
    archetype: "componente de mobilidade instantânea",
    category: "component",
    slot: "component",
    shopTier: "base",
    cost: 2250,
    recipeCost: 0,
    components: [],
    tags: ["blink", "mobility"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "short_range_blink",
        kind: "active",
        target: "point",
        tags: ["blink"],
        values: {
          range: 1200,
          damageLockout: 3,
          cooldown: 15,
          manaCost: 0
        },
        rules: {
          dispellable: true,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: true,
      cannotBeBought: false,
      isRecipeComponentOnly: true
    },
    ai: {
      classification: "component_only",
      recommendedRoles: ["recipe_component"],
      purchasePhase: "component",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: [],
        badWith: [],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i055_blink_core"
  },
  {
    id: "i056_evasion_charm",
    archetype: "componente de evasão",
    category: "component",
    slot: "component",
    shopTier: "base",
    cost: 1300,
    recipeCost: 0,
    components: [],
    tags: ["evasion", "component"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 18,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i056_evasion_charm_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          evasionPct: 18
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: true
    },
    ai: {
      classification: "component_only",
      recommendedRoles: ["recipe_component"],
      purchasePhase: "component",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: [],
        badWith: ["enemy_true_strike"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i056_evasion_charm"
  },
  {
    id: "i057_hyperstone_core",
    archetype: "componente supremo de velocidade de ataque",
    category: "component",
    slot: "component",
    shopTier: "base",
    cost: 2000,
    recipeCost: 0,
    components: [],
    tags: ["attack_speed", "late_component"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 60,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i057_hyperstone_core_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          attackSpeed: 60
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: true
    },
    ai: {
      classification: "component_only",
      recommendedRoles: ["recipe_component"],
      purchasePhase: "component",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["armor_reduction", "attack_speed", "lifesteal", "right_click_cores"],
        badWith: ["low_attack_uptime_supports"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i057_hyperstone_core"
  },
  {
    id: "i058_sacred_relic_generic",
    archetype: "componente supremo de dano físico",
    category: "component",
    slot: "component",
    shopTier: "base",
    cost: 3400,
    recipeCost: 0,
    components: [],
    tags: ["damage", "late_component"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 55,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i058_sacred_relic_generic_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          damage: 55
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: true
    },
    ai: {
      classification: "component_only",
      recommendedRoles: ["recipe_component"],
      purchasePhase: "component",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["armor_reduction", "attack_speed", "lifesteal", "right_click_cores"],
        badWith: ["low_attack_uptime_supports"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i058_sacred_relic_generic"
  },
  {
    id: "i059_mystic_staff_generic",
    archetype: "componente supremo de inteligência",
    category: "component",
    slot: "component",
    shopTier: "base",
    cost: 2800,
    recipeCost: 0,
    components: [],
    tags: ["intelligence", "late_component"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 25,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i059_mystic_staff_generic_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          intelligence: 25
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: true
    },
    ai: {
      classification: "component_only",
      recommendedRoles: ["recipe_component"],
      purchasePhase: "component",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["cooldown_reduction", "magic_burst", "mana_sustain", "spell_amp"],
        badWith: ["mana_independent_right_clickers"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i059_mystic_staff_generic"
  },
  {
    id: "i060_reaver_core",
    archetype: "componente supremo de força",
    category: "component",
    slot: "component",
    shopTier: "base",
    cost: 2800,
    recipeCost: 0,
    components: [],
    tags: ["strength", "late_component"],
    stats: {
      attributes: {
        strength: 25,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i060_reaver_core_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          strength: 25
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: true
    },
    ai: {
      classification: "component_only",
      recommendedRoles: ["recipe_component"],
      purchasePhase: "component",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: [],
        badWith: [],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i060_reaver_core"
  },
  {
    id: "i061_eaglesong_core",
    archetype: "componente supremo de agilidade",
    category: "component",
    slot: "component",
    shopTier: "base",
    cost: 2800,
    recipeCost: 0,
    components: [],
    tags: ["agility", "late_component"],
    stats: {
      attributes: {
        strength: 0,
        agility: 25,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i061_eaglesong_core_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          agility: 25
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: true
    },
    ai: {
      classification: "component_only",
      recommendedRoles: ["recipe_component"],
      purchasePhase: "component",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: [],
        badWith: [],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i061_eaglesong_core"
  },
  {
    id: "i062_ultimate_orb_generic",
    archetype: "componente supremo de todos os atributos",
    category: "component",
    slot: "component",
    shopTier: "base",
    cost: 2800,
    recipeCost: 0,
    components: [],
    tags: ["attributes", "late_component"],
    stats: {
      attributes: {
        strength: 15,
        agility: 15,
        intelligence: 15,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i062_ultimate_orb_generic_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          strength: 15,
          agility: 15,
          intelligence: 15
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: true
    },
    ai: {
      classification: "component_only",
      recommendedRoles: ["recipe_component"],
      purchasePhase: "component",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: [],
        badWith: [],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i062_ultimate_orb_generic"
  },
  {
    id: "i063_wizard_hat",
    archetype: "componente barato de mana máxima",
    category: "component",
    slot: "component",
    shopTier: "base",
    cost: 250,
    recipeCost: 0,
    components: [],
    tags: ["mana", "component"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 125,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i063_wizard_hat_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          maxMana: 125
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: true
    },
    ai: {
      classification: "component_only",
      recommendedRoles: ["recipe_component"],
      purchasePhase: "component",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["cooldown_reduction", "magic_burst", "mana_sustain", "spell_amp"],
        badWith: ["mana_independent_right_clickers"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i063_wizard_hat"
  },
  {
    id: "i064_aoe_chasm_stone",
    archetype: "componente de ampliação de área",
    category: "component",
    slot: "component",
    shopTier: "base",
    cost: 800,
    recipeCost: 0,
    components: [],
    tags: ["aoe_bonus", "component"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 40,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i064_aoe_chasm_stone_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          areaOfEffect: 40
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: true
    },
    ai: {
      classification: "component_only",
      recommendedRoles: ["recipe_component"],
      purchasePhase: "component",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: [],
        badWith: [],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i064_aoe_chasm_stone"
  },
  {
    id: "i065_strength_bracer",
    archetype: "item inicial de força e sobrevivência",
    category: "early",
    slot: "inventory",
    shopTier: "base",
    cost: 505,
    recipeCost: 0,
    components: ["i015_strength_gauntlet", "i018_small_circlet"],
    tags: ["lane", "strength", "survival"],
    stats: {
      attributes: {
        strength: 5,
        agility: 2,
        intelligence: 2,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0.75,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 3,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i065_strength_bracer_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          strength: 5,
          agility: 2,
          intelligence: 2,
          healthRegen: 0.75,
          damage: 3
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "laning_item",
      recommendedRoles: ["all_positions_by_lane_matchup"],
      purchasePhase: "laning",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 70,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: [],
        badWith: [],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i065_strength_bracer"
  },
  {
    id: "i066_agility_band",
    archetype: "item inicial de agilidade e ataque",
    category: "early",
    slot: "inventory",
    shopTier: "base",
    cost: 505,
    recipeCost: 0,
    components: ["i016_agility_slippers", "i018_small_circlet"],
    tags: ["lane", "agility", "attack_speed"],
    stats: {
      attributes: {
        strength: 2,
        agility: 5,
        intelligence: 2,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 3,
        damagePct: 0,
        attackSpeed: 6,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i066_agility_band_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          strength: 2,
          agility: 5,
          intelligence: 2,
          damage: 3,
          attackSpeed: 6
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "laning_item",
      recommendedRoles: ["all_positions_by_lane_matchup"],
      purchasePhase: "laning",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 70,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["armor_reduction", "attack_speed", "lifesteal", "right_click_cores"],
        badWith: ["low_attack_uptime_supports"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i066_agility_band"
  },
  {
    id: "i067_intelligence_talisman",
    archetype: "item inicial de inteligência e mana",
    category: "early",
    slot: "inventory",
    shopTier: "base",
    cost: 505,
    recipeCost: 0,
    components: ["i017_intelligence_mantle", "i018_small_circlet"],
    tags: ["lane", "intelligence", "mana"],
    stats: {
      attributes: {
        strength: 2,
        agility: 2,
        intelligence: 5,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0.75,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 3,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i067_intelligence_talisman_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          strength: 2,
          agility: 2,
          intelligence: 5,
          manaRegen: 0.75,
          damage: 3
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "laning_item",
      recommendedRoles: ["all_positions_by_lane_matchup"],
      purchasePhase: "laning",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 70,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["cooldown_reduction", "magic_burst", "mana_sustain", "spell_amp"],
        badWith: ["mana_independent_right_clickers"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i067_intelligence_talisman"
  },
  {
    id: "i068_magic_wand",
    archetype: "item inicial de cargas contra uso de magias",
    category: "early",
    slot: "inventory",
    shopTier: "base",
    cost: 450,
    recipeCost: 0,
    components: ["i014_minor_branch"],
    tags: ["lane", "burst_sustain", "charges"],
    stats: {
      attributes: {
        strength: 3,
        agility: 3,
        intelligence: 3,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i068_magic_wand_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          strength: 3,
          agility: 3,
          intelligence: 3
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "spell_charge_restore",
        kind: "active",
        target: "self",
        tags: ["restore_health", "restore_mana", "charges"],
        values: {
          maxCharges: 20,
          healthPerCharge: 15,
          manaPerCharge: 15,
          cooldown: 30,
          radius: 1200,
          manaCost: 0
        },
        rules: {
          dispellable: true,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "laning_item",
      recommendedRoles: ["all_positions_by_lane_matchup"],
      purchasePhase: "laning",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 70,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: [],
        badWith: [],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i068_magic_wand"
  },
  {
    id: "i069_soul_battery",
    archetype: "item de sacrifício de vida por mana",
    category: "early",
    slot: "inventory",
    shopTier: "base",
    cost: 805,
    recipeCost: 0,
    components: [],
    tags: ["mana", "tradeoff"],
    stats: {
      attributes: {
        strength: 6,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 2,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 2,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i069_soul_battery_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          strength: 6,
          healthRegen: 2,
          armor: 2
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "convert_health_to_mana",
        kind: "active",
        target: "self",
        tags: ["restore_mana", "self_damage"],
        values: {
          mana: 150,
          healthCost: 170,
          cooldown: 25,
          manaCost: 0
        },
        rules: {
          dispellable: true,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "laning_item",
      recommendedRoles: ["all_positions_by_lane_matchup"],
      purchasePhase: "laning",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 70,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["cooldown_reduction", "magic_burst", "mana_sustain", "spell_amp"],
        badWith: ["mana_independent_right_clickers"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i069_soul_battery"
  },
  {
    id: "i070_corrosion_orb",
    archetype: "item agressivo de lane com veneno e redução de armadura",
    category: "early",
    slot: "inventory",
    shopTier: "base",
    cost: 925,
    recipeCost: 0,
    components: ["i030_venom_orb", "i031_armor_break_stone"],
    tags: ["orb", "slow", "armor_reduction", "lane_pressure"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 150,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i070_corrosion_orb_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          maxHealth: 150
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "corrosive_attack",
        kind: "passive",
        target: "enemy",
        tags: ["attack_modifier", "slow", "armor_reduction", "dot"],
        values: {
          armorReduction: 3,
          slowPct: 13,
          dps: 3,
          duration: 3,
          cooldown: 0
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: true
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "laning_item",
      recommendedRoles: ["all_positions_by_lane_matchup"],
      purchasePhase: "laning",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 70,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: [],
        badWith: [],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i070_corrosion_orb"
  },
  {
    id: "i071_phase_warboots",
    archetype: "bota ofensiva com faseamento e dano",
    category: "boots",
    slot: "inventory",
    shopTier: "base",
    cost: 1500,
    recipeCost: 0,
    components: ["i027_basic_boots", "i032_small_damage_blades", "i041_protection_ring"],
    tags: ["movement", "damage", "phase"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 18,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 4,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 45,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i071_phase_warboots_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          damage: 18,
          armor: 4,
          movementSpeed: 45
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "phase_sprint",
        kind: "active",
        target: "self",
        tags: ["movement", "phased"],
        values: {
          moveSpeedPct: 20,
          duration: 3,
          cooldown: 8,
          manaCost: 0
        },
        rules: {
          dispellable: true,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "boots",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "core_boots",
      recommendedRoles: ["position_1_carry", "position_2_mid", "position_3_offlane"],
      purchasePhase: "early_to_mid",
      weights: {
        core: 90,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 90,
        tempo: 70,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["armor_reduction", "attack_speed", "lifesteal", "right_click_cores"],
        badWith: ["low_attack_uptime_supports"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i071_phase_warboots"
  },
  {
    id: "i072_attribute_treads",
    archetype: "bota de atributo alternável e velocidade de ataque",
    category: "boots",
    slot: "inventory",
    shopTier: "base",
    cost: 1400,
    recipeCost: 0,
    components: ["i027_basic_boots", "i040_haste_gloves"],
    tags: ["movement", "attack_speed", "attribute_toggle"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 10,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 25,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 45,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i072_attribute_treads_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          selectedAttribute: 10,
          attackSpeed: 25,
          movementSpeed: 45
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "toggle_attribute",
        kind: "toggle",
        target: "self",
        tags: ["strength", "agility", "intelligence"],
        values: {
          attributeBonus: 10,
          cooldown: 0
        },
        rules: {
          dispellable: true,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "boots",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "core_boots",
      recommendedRoles: ["position_1_carry", "position_2_mid", "position_3_offlane"],
      purchasePhase: "early_to_mid",
      weights: {
        core: 90,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 90,
        tempo: 70,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["armor_reduction", "attack_speed", "lifesteal", "right_click_cores"],
        badWith: ["low_attack_uptime_supports"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i072_attribute_treads"
  },
  {
    id: "i073_arcane_boots",
    archetype: "bota de mana para o time",
    category: "boots",
    slot: "inventory",
    shopTier: "base",
    cost: 1300,
    recipeCost: 0,
    components: ["i027_basic_boots", "i053_mana_booster"],
    tags: ["movement", "mana", "team_sustain"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 250,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 45,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i073_arcane_boots_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          maxMana: 250,
          movementSpeed: 45
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "restore_team_mana",
        kind: "active",
        target: "area",
        tags: ["restore_mana", "team"],
        values: {
          mana: 175,
          radius: 1200,
          cooldown: 55,
          manaCost: 0
        },
        rules: {
          dispellable: true,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: true,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "boots",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "support_boots",
      recommendedRoles: ["position_4_soft_support", "position_5_hard_support"],
      purchasePhase: "early_to_mid",
      weights: {
        core: 35,
        support: 90,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 70,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["cooldown_reduction", "magic_burst", "mana_sustain", "spell_amp"],
        badWith: ["mana_independent_right_clickers"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i073_arcane_boots"
  },
  {
    id: "i074_tranquil_boots",
    archetype: "bota de regeneração fora de combate",
    category: "boots",
    slot: "inventory",
    shopTier: "base",
    cost: 925,
    recipeCost: 0,
    components: ["i027_basic_boots", "i048_regen_ring", "i028_wind_thread"],
    tags: ["movement", "health_regen", "support"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 14,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 65,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i074_tranquil_boots_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          healthRegen: 14,
          movementSpeed: 65
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "break_regen_on_attack",
        kind: "passive",
        target: "self",
        tags: ["conditional_regen"],
        values: {
          breakDuration: 13,
          cooldown: 0
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "boots",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "support_boots",
      recommendedRoles: ["position_4_soft_support", "position_5_hard_support"],
      purchasePhase: "early_to_mid",
      weights: {
        core: 35,
        support: 90,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 70,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["anti_burst", "save_play", "supports"],
        badWith: [],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i074_tranquil_boots"
  },
  {
    id: "i075_travel_boots",
    archetype: "bota macro de teleporte avançado",
    category: "boots",
    slot: "inventory",
    shopTier: "base",
    cost: 2500,
    recipeCost: 0,
    components: ["i027_basic_boots"],
    tags: ["movement", "teleport", "macro"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 90,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i075_travel_boots_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          movementSpeed: 90
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "advanced_recall",
        kind: "active",
        target: "unit_or_structure",
        tags: ["teleport"],
        values: {
          cooldown: 40,
          target: "allied_unit_or_structure",
          manaCost: 0
        },
        rules: {
          dispellable: true,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "boots",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "macro_boots",
      recommendedRoles: ["split_push_core", "late_game_core", "map_pressure_mid"],
      purchasePhase: "early_to_mid",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 70,
        lateGame: 40,
        mapUtility: 95
      },
      synergy: {
        greatWith: [],
        badWith: [],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i075_travel_boots"
  },
  {
    id: "i076_greed_glove",
    archetype: "item econômico de ouro por abate ativo",
    category: "economy",
    slot: "inventory",
    shopTier: "base",
    cost: 2200,
    recipeCost: 0,
    components: ["i040_haste_gloves"],
    tags: ["farm", "attack_speed", "gold"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 35,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i076_greed_glove_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          attackSpeed: 35
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "transmute_creep",
        kind: "active",
        target: "unit",
        tags: ["gold", "xp", "creep_only"],
        values: {
          bonusGold: 160,
          bonusXpPct: 210,
          cooldown: 100,
          manaCost: 0
        },
        rules: {
          dispellable: true,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: true
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "greedy_core_economy",
      recommendedRoles: ["position_1_carry", "greedy_position_2_mid"],
      purchasePhase: "mid_game",
      weights: {
        core: 90,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 70,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["armor_reduction", "attack_speed", "lifesteal", "right_click_cores"],
        badWith: ["low_attack_uptime_supports"],
        counters: []
      },
      doNotBuyIf: ["team_is_under_heavy_tempo_pressure"],
      buyIf: ["safe_farm_available_and_core_has_timing_window"]
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i076_greed_glove"
  },
  {
    id: "i077_falcon_blade_generic",
    archetype: "item barato de dano, vida e mana",
    category: "early",
    slot: "inventory",
    shopTier: "base",
    cost: 1125,
    recipeCost: 0,
    components: ["i032_small_damage_blades", "i049_mana_mask"],
    tags: ["lane", "mana", "damage"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 175,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 1.8,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 14,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i077_falcon_blade_generic_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          maxHealth: 175,
          manaRegen: 1.8,
          damage: 14
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "laning_item",
      recommendedRoles: ["all_positions_by_lane_matchup"],
      purchasePhase: "laning",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 70,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["armor_reduction", "attack_speed", "cooldown_reduction", "lifesteal", "magic_burst", "mana_sustain", "right_click_cores", "spell_amp"],
        badWith: ["low_attack_uptime_supports", "mana_independent_right_clickers"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i077_falcon_blade_generic"
  },
  {
    id: "i078_armlet_relic",
    archetype: "item de força com ativação arriscada",
    category: "mid",
    slot: "inventory",
    shopTier: "base",
    cost: 2500,
    recipeCost: 0,
    components: ["i044_iron_helm", "i040_haste_gloves"],
    tags: ["strength", "toggle", "risk_reward"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 5,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 15,
        damagePct: 0,
        attackSpeed: 25,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 6,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i078_armlet_relic_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          healthRegen: 5,
          damage: 15,
          attackSpeed: 25,
          armor: 6
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "unholy_strength_toggle",
        kind: "toggle",
        target: "self",
        tags: ["strength", "self_drain"],
        values: {
          bonusStrength: 25,
          bonusDamage: 35,
          healthDrainPerSecond: 45,
          cooldown: 0
        },
        rules: {
          dispellable: true,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "defensive_or_aura",
      recommendedRoles: ["position_3_offlane", "position_4_soft_support", "position_5_hard_support", "defensive_core"],
      purchasePhase: "mid_game",
      weights: {
        core: 35,
        support: 35,
        offlane: 80,
        caster: 35,
        rightClick: 30,
        tempo: 70,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: [],
        badWith: [],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i078_armlet_relic"
  },
  {
    id: "i079_frenzy_mask",
    archetype: "item de roubo de vida com fúria e silêncio próprio",
    category: "mid",
    slot: "inventory",
    shopTier: "base",
    cost: 1775,
    recipeCost: 0,
    components: ["i051_lifesteal_mask"],
    tags: ["lifesteal", "attack_speed", "self_silence"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 15,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 20,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i079_frenzy_mask_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          damage: 15,
          lifestealPct: 20
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "berserk_frenzy",
        kind: "active",
        target: "self",
        tags: ["attack_speed", "movement", "self_silence", "armor_reduction"],
        values: {
          attackSpeed: 110,
          moveSpeedPct: 30,
          armorPenalty: 8,
          duration: 6,
          cooldown: 30,
          range: 700,
          manaCost: 0
        },
        rules: {
          dispellable: true,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "core_damage",
      recommendedRoles: ["position_1_carry", "position_2_mid", "damage_position_3_offlane"],
      purchasePhase: "mid_game",
      weights: {
        core: 90,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 90,
        tempo: 70,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["armor_reduction", "attack_speed", "cooldown_reduction", "lifesteal", "magic_burst", "mana_sustain", "right_click_cores", "spell_amp"],
        badWith: ["low_attack_uptime_supports", "mana_independent_right_clickers"],
        counters: []
      },
      doNotBuyIf: ["hero_must_cast_spells_during_damage_window"],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i079_frenzy_mask"
  },
  {
    id: "i080_echo_blade",
    archetype: "arma de dois ataques e mana para lutadores",
    category: "mid",
    slot: "inventory",
    shopTier: "base",
    cost: 2500,
    recipeCost: 0,
    components: ["i023_giant_axe", "i050_void_stone"],
    tags: ["double_hit", "strength", "mana"],
    stats: {
      attributes: {
        strength: 15,
        agility: 0,
        intelligence: 10,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 1.75,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 15,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i080_echo_blade_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          strength: 15,
          intelligence: 10,
          manaRegen: 1.75,
          damage: 15
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "echo_strike",
        kind: "passive",
        target: "enemy",
        tags: ["double_attack", "slow"],
        values: {
          slowPct: 100,
          duration: 0.8,
          cooldown: 6
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: true
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "core_damage",
      recommendedRoles: ["position_1_carry", "position_2_mid", "damage_position_3_offlane"],
      purchasePhase: "mid_game",
      weights: {
        core: 90,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 90,
        tempo: 70,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["armor_reduction", "attack_speed", "cooldown_reduction", "lifesteal", "magic_burst", "mana_sustain", "right_click_cores", "spell_amp"],
        badWith: ["low_attack_uptime_supports", "mana_independent_right_clickers"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i080_echo_blade"
  },
  {
    id: "i081_harpoon_chain",
    archetype: "arma de aproximação ativa para corpo a corpo",
    category: "mid",
    slot: "inventory",
    shopTier: "base",
    cost: 4700,
    recipeCost: 0,
    components: ["i080_echo_blade"],
    tags: ["gap_close", "double_hit", "catch"],
    stats: {
      attributes: {
        strength: 15,
        agility: 15,
        intelligence: 15,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 25,
        damagePct: 0,
        attackSpeed: 20,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i081_harpoon_chain_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          strength: 15,
          agility: 15,
          intelligence: 15,
          damage: 25,
          attackSpeed: 20
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "pull_self_to_enemy",
        kind: "active",
        target: "unit",
        tags: ["displacement", "gap_close"],
        values: {
          range: 700,
          slowPct: 100,
          slowDuration: 0.8,
          cooldown: 19,
          manaCost: 0
        },
        rules: {
          dispellable: true,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: true
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "core_damage",
      recommendedRoles: ["position_1_carry", "position_2_mid", "damage_position_3_offlane"],
      purchasePhase: "mid_game",
      weights: {
        core: 90,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 90,
        tempo: 70,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["armor_reduction", "attack_speed", "lifesteal", "right_click_cores"],
        badWith: ["low_attack_uptime_supports"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i081_harpoon_chain"
  },
  {
    id: "i082_mage_hunter_blade",
    archetype: "arma contra magos com redução de dano mágico inimigo",
    category: "mid",
    slot: "inventory",
    shopTier: "base",
    cost: 2625,
    recipeCost: 0,
    components: ["i046_magic_cloak", "i038_quarterstaff"],
    tags: ["anti_mage", "attack_modifier", "magic_resistance"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 1.5,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 20,
        damagePct: 0,
        attackSpeed: 20,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 25,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i082_mage_hunter_blade_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          manaRegen: 1.5,
          damage: 20,
          attackSpeed: 20,
          magicResistancePct: 25
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "weaken_spell_damage",
        kind: "passive",
        target: "enemy",
        tags: ["debuff", "spell_damage_reduction"],
        values: {
          spellDamageReductionPct: 35,
          duration: 6,
          cooldown: 0
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: true
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "midgame_flex",
      recommendedRoles: ["all_positions"],
      purchasePhase: "mid_game",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 70,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["armor_reduction", "attack_speed", "lifesteal", "right_click_cores"],
        badWith: ["low_attack_uptime_supports"],
        counters: ["aoe_magic_damage", "magic_burst"]
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i082_mage_hunter_blade"
  },
  {
    id: "i083_diffusal_edge",
    archetype: "lâmina de queima de mana e lentidão",
    category: "mid",
    slot: "inventory",
    shopTier: "base",
    cost: 2500,
    recipeCost: 0,
    components: ["i024_swift_blade", "i025_wizard_staff"],
    tags: ["mana_burn", "slow", "agility"],
    stats: {
      attributes: {
        strength: 0,
        agility: 15,
        intelligence: 10,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i083_diffusal_edge_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          agility: 15,
          intelligence: 10
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "mana_burn_attack",
        kind: "passive",
        target: "enemy",
        tags: ["attack_modifier", "mana_burn"],
        values: {
          manaBurn: 40,
          damageFromBurnPct: 100,
          cooldown: 0
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: true
        }
      },
      {
        id: "inhibit_target",
        kind: "active",
        target: "unit",
        tags: ["slow"],
        values: {
          slowPct: 100,
          duration: 4,
          cooldown: 30,
          manaCost: 0
        },
        rules: {
          dispellable: true,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: true
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "core_damage",
      recommendedRoles: ["position_1_carry", "position_2_mid", "damage_position_3_offlane"],
      purchasePhase: "mid_game",
      weights: {
        core: 90,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 90,
        tempo: 70,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["armor_reduction", "attack_speed", "cooldown_reduction", "lifesteal", "magic_burst", "mana_sustain", "right_click_cores", "spell_amp"],
        badWith: ["low_attack_uptime_supports", "mana_independent_right_clickers"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i083_diffusal_edge"
  },
  {
    id: "i084_dispersion_edge",
    archetype: "lâmina avançada de dissipação e mobilidade",
    category: "late",
    slot: "inventory",
    shopTier: "base",
    cost: 5700,
    recipeCost: 0,
    components: ["i083_diffusal_edge", "i061_eaglesong_core"],
    tags: ["dispel", "mobility", "mana_burn"],
    stats: {
      attributes: {
        strength: 0,
        agility: 35,
        intelligence: 15,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 10,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i084_dispersion_edge_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          agility: 35,
          intelligence: 15,
          movementSpeedPct: 10
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "self_dispel_haste",
        kind: "active",
        target: "self",
        tags: ["dispel", "haste"],
        values: {
          duration: 4,
          cooldown: 15,
          manaCost: 0
        },
        rules: {
          dispellable: true,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "core_damage",
      recommendedRoles: ["position_1_carry", "position_2_mid", "damage_position_3_offlane"],
      purchasePhase: "late_game",
      weights: {
        core: 90,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 90,
        tempo: 45,
        lateGame: 85,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["anti_burst", "armor_reduction", "attack_speed", "cooldown_reduction", "lifesteal", "magic_burst", "mana_sustain", "right_click_cores", "save_play", "spell_amp", "supports"],
        badWith: ["low_attack_uptime_supports", "mana_independent_right_clickers"],
        counters: ["damage_over_time", "root", "silence", "slow"]
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i084_dispersion_edge"
  },
  {
    id: "i085_reach_lance",
    archetype: "lança de alcance para heróis à distância",
    category: "mid",
    slot: "inventory",
    shopTier: "base",
    cost: 1900,
    recipeCost: 0,
    components: ["i023_giant_axe", "i024_swift_blade"],
    tags: ["range", "agility", "strength"],
    stats: {
      attributes: {
        strength: 10,
        agility: 15,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 150,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i085_reach_lance_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          strength: 10,
          agility: 15,
          attackRangeRangedOnly: 150
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: true,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "core_damage",
      recommendedRoles: ["position_1_carry", "position_2_mid", "damage_position_3_offlane"],
      purchasePhase: "mid_game",
      weights: {
        core: 90,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 90,
        tempo: 70,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["armor_reduction", "attack_speed", "lifesteal", "right_click_cores"],
        badWith: ["low_attack_uptime_supports"],
        counters: []
      },
      doNotBuyIf: ["hero.attackType == melee"],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i085_reach_lance"
  },
  {
    id: "i086_force_pike",
    archetype: "lança de alcance com empurrão defensivo/ofensivo",
    category: "late",
    slot: "inventory",
    shopTier: "base",
    cost: 4450,
    recipeCost: 0,
    components: ["i085_reach_lance"],
    tags: ["range", "force", "mobility"],
    stats: {
      attributes: {
        strength: 15,
        agility: 20,
        intelligence: 15,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 2,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 150,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i086_force_pike_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          strength: 15,
          agility: 20,
          intelligence: 15,
          healthRegen: 2,
          attackRangeRangedOnly: 150
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "force_unit_direction",
        kind: "active",
        target: "unit",
        tags: ["displacement"],
        values: {
          distance: 600,
          cooldown: 19,
          range: 600,
          manaCost: 0
        },
        rules: {
          dispellable: true,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: true
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: true,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "core_damage",
      recommendedRoles: ["position_1_carry", "position_2_mid", "damage_position_3_offlane"],
      purchasePhase: "late_game",
      weights: {
        core: 90,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 90,
        tempo: 45,
        lateGame: 85,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["anti_burst", "armor_reduction", "attack_speed", "lifesteal", "right_click_cores", "save_play", "supports"],
        badWith: ["low_attack_uptime_supports"],
        counters: []
      },
      doNotBuyIf: ["hero.attackType == melee"],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i086_force_pike"
  },
  {
    id: "i087_shadow_blade_generic",
    archetype: "lâmina de invisibilidade ofensiva",
    category: "mid",
    slot: "inventory",
    shopTier: "base",
    cost: 3000,
    recipeCost: 0,
    components: ["i034_heavy_claymore", "i039_fast_knuckles"],
    tags: ["invisibility", "damage", "attack_speed"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 20,
        damagePct: 0,
        attackSpeed: 35,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i087_shadow_blade_generic_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          damage: 20,
          attackSpeed: 35
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "shadow_walk",
        kind: "active",
        target: "self",
        tags: ["invisibility", "movement", "break_attack"],
        values: {
          duration: 14,
          moveSpeedPct: 20,
          bonusDamageOnBreak: 175,
          cooldown: 30,
          manaCost: 0
        },
        rules: {
          dispellable: true,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "core_damage",
      recommendedRoles: ["position_1_carry", "position_2_mid", "damage_position_3_offlane"],
      purchasePhase: "mid_game",
      weights: {
        core: 90,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 90,
        tempo: 70,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["armor_reduction", "attack_speed", "lifesteal", "right_click_cores"],
        badWith: ["enemy_true_sight_heavy_games", "low_attack_uptime_supports"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i087_shadow_blade_generic"
  },
  {
    id: "i088_execution_edge",
    archetype: "lâmina invisível com crítico e quebra de passiva",
    category: "late",
    slot: "inventory",
    shopTier: "base",
    cost: 5450,
    recipeCost: 0,
    components: ["i087_shadow_blade_generic"],
    tags: ["invisibility", "break", "critical"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 52,
        damagePct: 0,
        attackSpeed: 35,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i088_execution_edge_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          damage: 52,
          attackSpeed: 35
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "break_from_invisibility",
        kind: "active",
        target: "self",
        tags: ["invisibility", "break_attack"],
        values: {
          duration: 14,
          bonusDamageOnBreak: 175,
          breakDuration: 4,
          cooldown: 30,
          manaCost: 0
        },
        rules: {
          dispellable: true,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "critical_strike",
        kind: "passive",
        target: "enemy",
        tags: ["critical"],
        values: {
          chancePct: 30,
          critMultiplier: 160,
          cooldown: 0
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: true
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "core_damage",
      recommendedRoles: ["position_1_carry", "position_2_mid", "damage_position_3_offlane"],
      purchasePhase: "late_game",
      weights: {
        core: 90,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 90,
        tempo: 45,
        lateGame: 85,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["armor_reduction", "attack_speed", "lifesteal", "right_click_cores"],
        badWith: ["enemy_true_sight_heavy_games", "low_attack_uptime_supports"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i088_execution_edge"
  },
  {
    id: "i089_overwhelming_blink",
    archetype: "teleporte de força com dano e lentidão em área",
    category: "late",
    slot: "inventory",
    shopTier: "base",
    cost: 6800,
    recipeCost: 0,
    components: ["i055_blink_core", "i060_reaver_core"],
    tags: ["blink", "strength", "aoe_slow"],
    stats: {
      attributes: {
        strength: 25,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i089_overwhelming_blink_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          strength: 25
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "strength_blink_impact",
        kind: "active",
        target: "point",
        tags: ["blink", "aoe", "slow"],
        values: {
          range: 1200,
          radius: 800,
          damageFromStrengthPct: 100,
          slowPct: 50,
          cooldown: 30,
          manaCost: 0
        },
        rules: {
          dispellable: true,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: true,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "defensive_or_aura",
      recommendedRoles: ["position_3_offlane", "position_4_soft_support", "position_5_hard_support", "defensive_core"],
      purchasePhase: "late_game",
      weights: {
        core: 35,
        support: 35,
        offlane: 80,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 85,
        mapUtility: 25
      },
      synergy: {
        greatWith: [],
        badWith: [],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i089_overwhelming_blink"
  },
  {
    id: "i090_swift_blink",
    archetype: "teleporte de agilidade com velocidade pós-uso",
    category: "late",
    slot: "inventory",
    shopTier: "base",
    cost: 6800,
    recipeCost: 0,
    components: ["i055_blink_core", "i061_eaglesong_core"],
    tags: ["blink", "agility", "attack_speed"],
    stats: {
      attributes: {
        strength: 0,
        agility: 25,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i090_swift_blink_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          agility: 25
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "agility_blink_haste",
        kind: "active",
        target: "point",
        tags: ["blink", "attack_speed", "movement"],
        values: {
          range: 1200,
          attackSpeed: 35,
          moveSpeedPct: 25,
          duration: 6,
          cooldown: 30,
          manaCost: 0
        },
        rules: {
          dispellable: true,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: true,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "lategame_flex",
      recommendedRoles: ["all_positions"],
      purchasePhase: "late_game",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 85,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["armor_reduction", "attack_speed", "lifesteal", "right_click_cores"],
        badWith: ["low_attack_uptime_supports"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i090_swift_blink"
  },
  {
    id: "i091_arcane_blink",
    archetype: "teleporte de inteligência com redução de tempo de recarga",
    category: "late",
    slot: "inventory",
    shopTier: "base",
    cost: 6800,
    recipeCost: 0,
    components: ["i055_blink_core", "i059_mystic_staff_generic"],
    tags: ["blink", "intelligence", "cooldown"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 25,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i091_arcane_blink_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          intelligence: 25
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "arcane_blink_focus",
        kind: "active",
        target: "point",
        tags: ["blink", "cooldown_reduction"],
        values: {
          range: 1200,
          cooldownReductionPct: 25,
          duration: 6,
          cooldown: 30,
          manaCost: 0
        },
        rules: {
          dispellable: true,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: true,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "caster_or_control",
      recommendedRoles: ["position_2_mid", "position_4_soft_support", "rich_position_5_hard_support"],
      purchasePhase: "late_game",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 85,
        rightClick: 30,
        tempo: 45,
        lateGame: 85,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["cooldown_reduction", "magic_burst", "mana_sustain", "spell_amp"],
        badWith: ["mana_independent_right_clickers"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i091_arcane_blink"
  },
  {
    id: "i092_force_staff_generic",
    archetype: "cajado de empurrão direcional",
    category: "mid",
    slot: "inventory",
    shopTier: "base",
    cost: 2200,
    recipeCost: 0,
    components: [],
    tags: ["support", "mobility", "save"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 10,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 2,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i092_force_staff_generic_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          intelligence: 10,
          healthRegen: 2
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "force_push",
        kind: "active",
        target: "unit",
        tags: ["displacement"],
        values: {
          distance: 600,
          cooldown: 19,
          range: 600,
          manaCost: 0
        },
        rules: {
          dispellable: true,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: true
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "defensive_or_aura",
      recommendedRoles: ["position_3_offlane", "position_4_soft_support", "position_5_hard_support", "defensive_core"],
      purchasePhase: "mid_game",
      weights: {
        core: 35,
        support: 35,
        offlane: 80,
        caster: 35,
        rightClick: 30,
        tempo: 70,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: [],
        badWith: [],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i092_force_staff_generic"
  },
  {
    id: "i093_glimmer_cloak_generic",
    archetype: "capa de invisibilidade e barreira mágica para aliados",
    category: "support",
    slot: "inventory",
    shopTier: "base",
    cost: 2150,
    recipeCost: 0,
    components: ["i046_magic_cloak"],
    tags: ["support", "save", "anti_magic", "invisibility"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 20,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i093_glimmer_cloak_generic_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          magicResistancePct: 20
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "glimmer_fade",
        kind: "active",
        target: "unit",
        tags: ["invisibility", "magic_barrier"],
        values: {
          fadeTime: 0.6,
          duration: 5,
          magicBarrier: 300,
          cooldown: 30,
          radius: 1200,
          manaCost: 0
        },
        rules: {
          dispellable: true,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: true
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "support_or_team_utility",
      recommendedRoles: ["position_3_offlane", "position_4_soft_support", "position_5_hard_support"],
      purchasePhase: "mid_game",
      weights: {
        core: 35,
        support: 90,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 70,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: [],
        badWith: ["enemy_true_sight_heavy_games"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i093_glimmer_cloak_generic"
  },
  {
    id: "i094_cyclone_scepter",
    archetype: "cajado de ciclone para controle e dissipação",
    category: "support",
    slot: "inventory",
    shopTier: "base",
    cost: 2725,
    recipeCost: 0,
    components: [],
    tags: ["dispel", "disable", "movement"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 10,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 2.5,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 20,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i094_cyclone_scepter_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          intelligence: 10,
          manaRegen: 2.5,
          movementSpeed: 20
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "cyclone_unit",
        kind: "active",
        target: "unit",
        tags: ["cyclone", "dispel"],
        values: {
          duration: 2.5,
          range: 575,
          cooldown: 30,
          manaCost: 0
        },
        rules: {
          dispellable: true,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: true,
          canTargetEnemies: true
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "support_or_team_utility",
      recommendedRoles: ["position_3_offlane", "position_4_soft_support", "position_5_hard_support"],
      purchasePhase: "mid_game",
      weights: {
        core: 35,
        support: 90,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 70,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["anti_burst", "save_play", "supports"],
        badWith: [],
        counters: ["damage_over_time", "root", "silence", "slow"]
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i094_cyclone_scepter"
  },
  {
    id: "i095_wind_ascension",
    archetype: "versão avançada do ciclone com mobilidade livre",
    category: "late",
    slot: "inventory",
    shopTier: "base",
    cost: 6825,
    recipeCost: 0,
    components: ["i094_cyclone_scepter"],
    tags: ["dispel", "mobility", "save"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 35,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 6,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 50,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i095_wind_ascension_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          intelligence: 35,
          manaRegen: 6,
          movementSpeed: 50
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "free_movement_cyclone",
        kind: "active",
        target: "unit",
        tags: ["cyclone", "dispel", "free_movement"],
        values: {
          duration: 2.5,
          range: 950,
          cooldown: 30,
          manaCost: 0
        },
        rules: {
          dispellable: true,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: true,
          canTargetEnemies: true
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "defensive_or_aura",
      recommendedRoles: ["position_3_offlane", "position_4_soft_support", "position_5_hard_support", "defensive_core"],
      purchasePhase: "late_game",
      weights: {
        core: 35,
        support: 35,
        offlane: 80,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 85,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["anti_burst", "save_play", "supports"],
        badWith: [],
        counters: ["damage_over_time", "root", "silence", "slow"]
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i095_wind_ascension"
  },
  {
    id: "i096_cast_range_lens",
    archetype: "lente de alcance de conjuração e mana",
    category: "mid",
    slot: "inventory",
    shopTier: "base",
    cost: 2275,
    recipeCost: 0,
    components: ["i053_mana_booster", "i050_void_stone"],
    tags: ["cast_range", "mana"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 300,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 2.5,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 225,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i096_cast_range_lens_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          maxMana: 300,
          manaRegen: 2.5,
          castRange: 225
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "caster_or_control",
      recommendedRoles: ["position_2_mid", "position_4_soft_support", "rich_position_5_hard_support"],
      purchasePhase: "mid_game",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 85,
        rightClick: 30,
        tempo: 70,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["cooldown_reduction", "magic_burst", "mana_sustain", "spell_amp"],
        badWith: ["mana_independent_right_clickers"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i096_cast_range_lens"
  },
  {
    id: "i097_ghost_form_scepter",
    archetype: "cetro defensivo contra ataques físicos",
    category: "mid",
    slot: "inventory",
    shopTier: "base",
    cost: 1500,
    recipeCost: 0,
    components: [],
    tags: ["save", "ethereal", "anti_physical"],
    stats: {
      attributes: {
        strength: 5,
        agility: 5,
        intelligence: 5,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i097_ghost_form_scepter_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          strength: 5,
          agility: 5,
          intelligence: 5
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "self_ghost_form",
        kind: "active",
        target: "self",
        tags: ["ethereal", "physical_immunity", "magic_vulnerability"],
        values: {
          duration: 4,
          magicDamageTakenPct: 40,
          cooldown: 30,
          manaCost: 0
        },
        rules: {
          dispellable: true,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "defensive_or_aura",
      recommendedRoles: ["position_3_offlane", "position_4_soft_support", "position_5_hard_support", "defensive_core"],
      purchasePhase: "mid_game",
      weights: {
        core: 35,
        support: 35,
        offlane: 80,
        caster: 35,
        rightClick: 30,
        tempo: 70,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: [],
        badWith: [],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i097_ghost_form_scepter"
  },
  {
    id: "i098_ethereal_focus_blade",
    archetype: "arma mágica que converte alvo em forma etérea",
    category: "late",
    slot: "inventory",
    shopTier: "base",
    cost: 4650,
    recipeCost: 0,
    components: ["i097_ghost_form_scepter", "i059_mystic_staff_generic"],
    tags: ["burst_magic", "ethereal", "attribute"],
    stats: {
      attributes: {
        strength: 5,
        agility: 5,
        intelligence: 25,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 12,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i098_ethereal_focus_blade_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          strength: 5,
          agility: 5,
          intelligence: 25,
          spellAmpPct: 12
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "target_ethereal_blast",
        kind: "active",
        target: "unit",
        tags: ["ethereal", "nuke", "slow"],
        values: {
          damageBase: 150,
          damageFromPrimaryAttributePct: 150,
          duration: 4,
          slowPct: 80,
          cooldown: 30,
          damage: 150,
          manaCost: 0
        },
        rules: {
          dispellable: true,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: true
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "caster_or_control",
      recommendedRoles: ["position_2_mid", "position_4_soft_support", "rich_position_5_hard_support"],
      purchasePhase: "late_game",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 85,
        rightClick: 30,
        tempo: 45,
        lateGame: 85,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["cooldown_reduction", "magic_burst", "mana_sustain", "spell_amp"],
        badWith: ["mana_independent_right_clickers"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i098_ethereal_focus_blade"
  },
  {
    id: "i099_discord_veil",
    archetype: "véu de amplificação mágica em área",
    category: "support",
    slot: "inventory",
    shopTier: "base",
    cost: 1725,
    recipeCost: 0,
    components: [],
    tags: ["magic_amp", "teamfight"],
    stats: {
      attributes: {
        strength: 4,
        agility: 4,
        intelligence: 4,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 1,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 4,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i099_discord_veil_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          strength: 4,
          agility: 4,
          intelligence: 4,
          manaRegen: 1,
          armor: 4
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "magic_weakness_area",
        kind: "active",
        target: "area",
        tags: ["magic_damage_amp"],
        values: {
          ampPct: 18,
          duration: 16,
          radius: 600,
          cooldown: 30,
          damage: 150,
          manaCost: 0
        },
        rules: {
          dispellable: true,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: true
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "support_or_team_utility",
      recommendedRoles: ["position_3_offlane", "position_4_soft_support", "position_5_hard_support"],
      purchasePhase: "mid_game",
      weights: {
        core: 35,
        support: 90,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 70,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: [],
        badWith: [],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i099_discord_veil"
  },
  {
    id: "i100_frost_armor_plate",
    archetype: "armadura avançada de lentidão e dano mágico em área",
    category: "late",
    slot: "inventory",
    shopTier: "base",
    cost: 4850,
    recipeCost: 0,
    components: [],
    tags: ["armor", "anti_attack", "aoe_slow"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 25,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 15,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i100_frost_armor_plate_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          intelligence: 25,
          armor: 15
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "frost_blast_armor",
        kind: "active",
        target: "area",
        tags: ["slow", "attack_slow", "magic_damage"],
        values: {
          damage: 200,
          moveSlowPct: 40,
          attackSlow: 45,
          duration: 4,
          radius: 900,
          cooldown: 30,
          manaCost: 0
        },
        rules: {
          dispellable: true,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: true
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "defensive_or_aura",
      recommendedRoles: ["position_3_offlane", "position_4_soft_support", "position_5_hard_support", "defensive_core"],
      purchasePhase: "late_game",
      weights: {
        core: 35,
        support: 35,
        offlane: 80,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 85,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["armor_reduction", "attack_speed", "lifesteal", "right_click_cores"],
        badWith: ["low_attack_uptime_supports"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i100_frost_armor_plate"
  },
  {
    id: "i101_spell_kaya",
    archetype: "núcleo de amplificação mágica",
    category: "mid",
    slot: "inventory",
    shopTier: "base",
    cost: 2100,
    recipeCost: 0,
    components: ["i025_wizard_staff"],
    tags: ["spell_amp", "mana"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 16,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 25
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 10,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i101_spell_kaya_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          intelligence: 16,
          manaRegenAmpPct: 25,
          spellAmpPct: 10
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "kaya_family_spell_amp",
      stackMode: "max_value_only",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "caster_or_control",
      recommendedRoles: ["position_2_mid", "position_4_soft_support", "rich_position_5_hard_support"],
      purchasePhase: "mid_game",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 85,
        rightClick: 30,
        tempo: 70,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["cooldown_reduction", "magic_burst", "mana_sustain", "spell_amp"],
        badWith: ["mana_independent_right_clickers"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i101_spell_kaya"
  },
  {
    id: "i102_power_sange",
    archetype: "núcleo de força e resistência a controle",
    category: "mid",
    slot: "inventory",
    shopTier: "base",
    cost: 2100,
    recipeCost: 0,
    components: ["i023_giant_axe"],
    tags: ["strength", "status_resistance", "regen_amp"],
    stats: {
      attributes: {
        strength: 16,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 12,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 12,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i102_power_sange_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          strength: 16,
          healthRegenAmpPct: 12,
          statusResistancePct: 12
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "sange_family_status_resistance",
      stackMode: "max_value_only",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "defensive_or_aura",
      recommendedRoles: ["position_3_offlane", "position_4_soft_support", "position_5_hard_support", "defensive_core"],
      purchasePhase: "mid_game",
      weights: {
        core: 35,
        support: 35,
        offlane: 80,
        caster: 35,
        rightClick: 30,
        tempo: 70,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: [],
        badWith: [],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i102_power_sange"
  },
  {
    id: "i103_speed_yasha",
    archetype: "núcleo de agilidade e velocidade",
    category: "mid",
    slot: "inventory",
    shopTier: "base",
    cost: 2100,
    recipeCost: 0,
    components: ["i024_swift_blade"],
    tags: ["agility", "movement", "attack_speed"],
    stats: {
      attributes: {
        strength: 0,
        agility: 16,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 15,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 8,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i103_speed_yasha_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          agility: 16,
          attackSpeed: 15,
          movementSpeedPct: 8
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "yasha_family_movement",
      stackMode: "max_value_only",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "core_damage",
      recommendedRoles: ["position_1_carry", "position_2_mid", "damage_position_3_offlane"],
      purchasePhase: "mid_game",
      weights: {
        core: 90,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 90,
        tempo: 70,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["armor_reduction", "attack_speed", "lifesteal", "right_click_cores"],
        badWith: ["low_attack_uptime_supports"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i103_speed_yasha"
  },
  {
    id: "i104_spell_power_halberd",
    archetype: "combinação de magia e resistência",
    category: "late",
    slot: "inventory",
    shopTier: "base",
    cost: 4200,
    recipeCost: 0,
    components: ["i101_spell_kaya", "i102_power_sange"],
    tags: ["spell_amp", "strength", "status_resistance"],
    stats: {
      attributes: {
        strength: 16,
        agility: 0,
        intelligence: 16,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 16,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 10,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 16,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i104_spell_power_halberd_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          strength: 16,
          intelligence: 16,
          healthRegenAmpPct: 16,
          spellAmpPct: 10,
          statusResistancePct: 16
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "kaya_family_spell_amp",
      stackMode: "max_value_only",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "caster_or_control",
      recommendedRoles: ["position_2_mid", "position_4_soft_support", "rich_position_5_hard_support"],
      purchasePhase: "late_game",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 85,
        rightClick: 30,
        tempo: 45,
        lateGame: 85,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["cooldown_reduction", "magic_burst", "mana_sustain", "spell_amp"],
        badWith: ["mana_independent_right_clickers"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i104_spell_power_halberd"
  },
  {
    id: "i105_power_speed_dualblade",
    archetype: "combinação de força, agilidade e mobilidade",
    category: "late",
    slot: "inventory",
    shopTier: "base",
    cost: 4200,
    recipeCost: 0,
    components: ["i102_power_sange", "i103_speed_yasha"],
    tags: ["strength", "agility", "movement", "status_resistance"],
    stats: {
      attributes: {
        strength: 16,
        agility: 16,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 15,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 16,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 10,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i105_power_speed_dualblade_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          strength: 16,
          agility: 16,
          attackSpeed: 15,
          statusResistancePct: 16,
          movementSpeedPct: 10
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "sange_family_status_resistance",
      stackMode: "max_value_only",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "core_damage",
      recommendedRoles: ["position_1_carry", "position_2_mid", "damage_position_3_offlane"],
      purchasePhase: "late_game",
      weights: {
        core: 90,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 90,
        tempo: 45,
        lateGame: 85,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["armor_reduction", "attack_speed", "lifesteal", "right_click_cores"],
        badWith: ["low_attack_uptime_supports"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i105_power_speed_dualblade"
  },
  {
    id: "i106_mirror_style",
    archetype: "item de atributos com dissipação e ilusões",
    category: "late",
    slot: "inventory",
    shopTier: "base",
    cost: 4650,
    recipeCost: 0,
    components: ["i103_speed_yasha", "i062_ultimate_orb_generic"],
    tags: ["agility", "illusion", "dispel"],
    stats: {
      attributes: {
        strength: 10,
        agility: 26,
        intelligence: 10,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 12,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 8,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i106_mirror_style_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          strength: 10,
          agility: 26,
          intelligence: 10,
          attackSpeed: 12,
          movementSpeedPct: 8
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "mirror_image_dispel",
        kind: "active",
        target: "self",
        tags: ["basic_dispel", "illusion"],
        values: {
          illusions: 2,
          duration: 20,
          illusionDamagePct: 33,
          illusionDamageTakenPct: 300,
          cooldown: 30,
          manaCost: 0
        },
        rules: {
          dispellable: true,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "core_damage",
      recommendedRoles: ["position_1_carry", "position_2_mid", "damage_position_3_offlane"],
      purchasePhase: "late_game",
      weights: {
        core: 90,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 90,
        tempo: 45,
        lateGame: 85,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["anti_burst", "armor_reduction", "attack_speed", "lifesteal", "right_click_cores", "save_play", "supports"],
        badWith: ["low_attack_uptime_supports"],
        counters: ["damage_over_time", "root", "silence", "slow"]
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i106_mirror_style"
  },
  {
    id: "i107_disarm_halberd",
    archetype: "arma defensiva de evasão, força e desarme",
    category: "late",
    slot: "inventory",
    shopTier: "base",
    cost: 3500,
    recipeCost: 0,
    components: ["i102_power_sange", "i056_evasion_charm"],
    tags: ["disarm", "evasion", "strength"],
    stats: {
      attributes: {
        strength: 20,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 12,
        slowResistancePct: 0,
        evasionPct: 20,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i107_disarm_halberd_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          strength: 20,
          statusResistancePct: 12,
          evasionPct: 20
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "disarm_enemy",
        kind: "active",
        target: "unit",
        tags: ["disarm"],
        values: {
          durationMelee: 3,
          durationRanged: 5,
          range: 650,
          cooldown: 30,
          duration: 3,
          manaCost: 0
        },
        rules: {
          dispellable: true,
          piercesDebuffImmunity: false,
          breaksInvisibility: true,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: true
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "defensive_or_aura",
      recommendedRoles: ["position_3_offlane", "position_4_soft_support", "position_5_hard_support", "defensive_core"],
      purchasePhase: "late_game",
      weights: {
        core: 35,
        support: 35,
        offlane: 80,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 85,
        mapUtility: 25
      },
      synergy: {
        greatWith: [],
        badWith: ["enemy_true_strike"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i107_disarm_halberd"
  },
  {
    id: "i108_frost_orb_core",
    archetype: "item supremo de atributos, vida, mana e lentidão por ataque",
    category: "late",
    slot: "inventory",
    shopTier: "base",
    cost: 5300,
    recipeCost: 0,
    components: ["i062_ultimate_orb_generic"],
    tags: ["all_attributes", "slow", "anti_heal"],
    stats: {
      attributes: {
        strength: 22,
        agility: 22,
        intelligence: 22,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 220,
        maxMana: 220,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i108_frost_orb_core_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          strength: 22,
          agility: 22,
          intelligence: 22,
          maxHealth: 220,
          maxMana: 220
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "cold_attack_slow",
        kind: "passive",
        target: "enemy",
        tags: ["attack_modifier", "slow", "heal_reduction"],
        values: {
          moveSlowPct: 40,
          attackSlow: 40,
          healReductionPct: 40,
          duration: 3,
          cooldown: 0
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: true
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "core_damage",
      recommendedRoles: ["position_1_carry", "position_2_mid", "damage_position_3_offlane"],
      purchasePhase: "late_game",
      weights: {
        core: 90,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 90,
        tempo: 45,
        lateGame: 85,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["anti_burst", "armor_reduction", "attack_speed", "cooldown_reduction", "lifesteal", "magic_burst", "mana_sustain", "right_click_cores", "save_play", "spell_amp", "supports"],
        badWith: ["low_attack_uptime_supports", "mana_independent_right_clickers"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i108_frost_orb_core"
  },
  {
    id: "i109_evasion_wingblade",
    archetype: "item supremo de agilidade, dano e evasão",
    category: "late",
    slot: "inventory",
    shopTier: "base",
    cost: 5450,
    recipeCost: 0,
    components: ["i061_eaglesong_core", "i056_evasion_charm"],
    tags: ["agility", "evasion", "carry"],
    stats: {
      attributes: {
        strength: 0,
        agility: 35,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 25,
        damagePct: 0,
        attackSpeed: 30,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 35,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i109_evasion_wingblade_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          agility: 35,
          damage: 25,
          attackSpeed: 30,
          evasionPct: 35
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "core_damage",
      recommendedRoles: ["position_1_carry", "position_2_mid", "damage_position_3_offlane"],
      purchasePhase: "late_game",
      weights: {
        core: 90,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 90,
        tempo: 45,
        lateGame: 85,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["armor_reduction", "attack_speed", "lifesteal", "right_click_cores"],
        badWith: ["enemy_true_strike", "low_attack_uptime_supports"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i109_evasion_wingblade"
  },
  {
    id: "i110_spellproof_crown",
    archetype: "imunidade temporária a debuffs e resistência mágica",
    category: "late",
    slot: "inventory",
    shopTier: "base",
    cost: 4050,
    recipeCost: 0,
    components: [],
    tags: ["debuff_immunity", "magic_resistance"],
    stats: {
      attributes: {
        strength: 10,
        agility: 10,
        intelligence: 10,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 18,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i110_spellproof_crown_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          strength: 10,
          agility: 10,
          intelligence: 10,
          damage: 18
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "debuff_immunity_active",
        kind: "active",
        target: "self",
        tags: ["debuff_immunity", "magic_resistance"],
        values: {
          duration: 9,
          magicResistance: 50,
          cooldown: 30,
          manaCost: 0
        },
        rules: {
          dispellable: true,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "defensive_or_aura",
      recommendedRoles: ["position_3_offlane", "position_4_soft_support", "position_5_hard_support", "defensive_core"],
      purchasePhase: "late_game",
      weights: {
        core: 35,
        support: 35,
        offlane: 80,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 85,
        mapUtility: 25
      },
      synergy: {
        greatWith: [],
        badWith: [],
        counters: ["aoe_magic_damage", "magic_burst"]
      },
      doNotBuyIf: [],
      buyIf: ["enemy_has_single_target_control_or_silence"]
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i110_spellproof_crown"
  },
  {
    id: "i111_link_barrier_sphere",
    archetype: "bloqueio periódico de magia direcionada",
    category: "late",
    slot: "inventory",
    shopTier: "base",
    cost: 4600,
    recipeCost: 0,
    components: [],
    tags: ["spell_block", "stats", "regen"],
    stats: {
      attributes: {
        strength: 16,
        agility: 16,
        intelligence: 16,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 7,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 5,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i111_link_barrier_sphere_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          strength: 16,
          agility: 16,
          intelligence: 16,
          healthRegen: 7,
          manaRegen: 5
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "spell_block",
        kind: "passive",
        target: "self",
        tags: ["spell_block"],
        values: {
          cooldown: 14
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "defensive_or_aura",
      recommendedRoles: ["position_3_offlane", "position_4_soft_support", "position_5_hard_support", "defensive_core"],
      purchasePhase: "late_game",
      weights: {
        core: 35,
        support: 35,
        offlane: 80,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 85,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["cooldown_reduction", "magic_burst", "mana_sustain", "spell_amp"],
        badWith: ["mana_independent_right_clickers"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: ["enemy_has_single_target_control_or_silence"]
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i111_link_barrier_sphere"
  },
  {
    id: "i112_emergency_disk",
    archetype: "disco defensivo automático contra burst",
    category: "late",
    slot: "inventory",
    shopTier: "base",
    cost: 3000,
    recipeCost: 0,
    components: [],
    tags: ["survival", "anti_burst"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 250,
        maxMana: 300,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i112_emergency_disk_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          maxHealth: 250,
          maxMana: 300
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "auto_damage_immunity",
        kind: "passive",
        target: "self",
        tags: ["damage_immunity", "auto_trigger"],
        values: {
          triggerHealthPct: 70,
          duration: 2.5,
          cooldown: 105
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "defensive_or_aura",
      recommendedRoles: ["position_3_offlane", "position_4_soft_support", "position_5_hard_support", "defensive_core"],
      purchasePhase: "late_game",
      weights: {
        core: 35,
        support: 35,
        offlane: 80,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 85,
        mapUtility: 25
      },
      synergy: {
        greatWith: [],
        badWith: [],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i112_emergency_disk"
  },
  {
    id: "i113_lotus_shell",
    archetype: "armadura de dissipação e reflexo de feitiços",
    category: "late",
    slot: "inventory",
    shopTier: "base",
    cost: 3850,
    recipeCost: 0,
    components: [],
    tags: ["dispel", "spell_reflect", "armor"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 6.5,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 4,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 10,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i113_lotus_shell_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          healthRegen: 6.5,
          manaRegen: 4,
          armor: 10
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "reflective_shell",
        kind: "active",
        target: "unit",
        tags: ["basic_dispel", "spell_reflect"],
        values: {
          duration: 6,
          cooldown: 15,
          manaCost: 0
        },
        rules: {
          dispellable: true,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: true
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "defensive_or_aura",
      recommendedRoles: ["position_3_offlane", "position_4_soft_support", "position_5_hard_support", "defensive_core"],
      purchasePhase: "late_game",
      weights: {
        core: 35,
        support: 35,
        offlane: 80,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 85,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["anti_burst", "cooldown_reduction", "magic_burst", "mana_sustain", "save_play", "spell_amp", "supports"],
        badWith: ["mana_independent_right_clickers"],
        counters: ["damage_over_time", "root", "silence", "slow"]
      },
      doNotBuyIf: [],
      buyIf: ["enemy_has_single_target_control_or_silence"]
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i113_lotus_shell"
  },
  {
    id: "i114_blade_return_mail",
    archetype: "armadura que devolve dano recebido",
    category: "mid",
    slot: "inventory",
    shopTier: "base",
    cost: 2300,
    recipeCost: 0,
    components: [],
    tags: ["damage_return", "armor"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 20,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 7,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i114_blade_return_mail_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          damage: 20,
          armor: 7
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "return_damage_active",
        kind: "active",
        target: "self",
        tags: ["damage_return"],
        values: {
          duration: 5.5,
          returnPct: 100,
          cooldown: 30,
          manaCost: 0
        },
        rules: {
          dispellable: true,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "defensive_or_aura",
      recommendedRoles: ["position_3_offlane", "position_4_soft_support", "position_5_hard_support", "defensive_core"],
      purchasePhase: "mid_game",
      weights: {
        core: 35,
        support: 35,
        offlane: 80,
        caster: 35,
        rightClick: 30,
        tempo: 70,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["armor_reduction", "attack_speed", "lifesteal", "right_click_cores"],
        badWith: ["low_attack_uptime_supports"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i114_blade_return_mail"
  },
  {
    id: "i115_damage_block_shield",
    archetype: "escudo de bloqueio de dano físico",
    category: "mid",
    slot: "inventory",
    shopTier: "base",
    cost: 1700,
    recipeCost: 0,
    components: [],
    tags: ["tank", "damage_block", "health"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 250,
        maxMana: 0,
        healthRegen: 4,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i115_damage_block_shield_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          maxHealth: 250,
          healthRegen: 4
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "block_attack_damage",
        kind: "passive",
        target: "self",
        tags: ["damage_block"],
        values: {
          blockChancePct: 60,
          blockMelee: 56,
          blockRanged: 28,
          cooldown: 0
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "defensive_or_aura",
      recommendedRoles: ["position_3_offlane", "position_4_soft_support", "position_5_hard_support", "defensive_core"],
      purchasePhase: "mid_game",
      weights: {
        core: 35,
        support: 35,
        offlane: 80,
        caster: 35,
        rightClick: 30,
        tempo: 70,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["anti_burst", "armor_reduction", "attack_speed", "lifesteal", "right_click_cores", "save_play", "supports"],
        badWith: ["low_attack_uptime_supports"],
        counters: ["illusions", "multi_hit_physical_damage", "summons"]
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i115_damage_block_shield"
  },
  {
    id: "i116_team_crimson_barrier",
    archetype: "barreira física ativa para o time",
    category: "support",
    slot: "inventory",
    shopTier: "base",
    cost: 3600,
    recipeCost: 0,
    components: ["i115_damage_block_shield"],
    tags: ["team_barrier", "anti_physical"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 250,
        maxMana: 0,
        healthRegen: 12,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 8,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i116_team_crimson_barrier_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          maxHealth: 250,
          healthRegen: 12,
          armor: 8
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "team_damage_block",
        kind: "active",
        target: "area",
        tags: ["physical_barrier", "team"],
        values: {
          block: 75,
          duration: 12,
          radius: 1200,
          cooldown: 30,
          manaCost: 0
        },
        rules: {
          dispellable: true,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: true,
          canTargetEnemies: true
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "support_or_team_utility",
      recommendedRoles: ["position_3_offlane", "position_4_soft_support", "position_5_hard_support"],
      purchasePhase: "mid_game",
      weights: {
        core: 35,
        support: 90,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 70,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["anti_burst", "save_play", "supports"],
        badWith: [],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: ["enemy_has_summons_illusions_or_multi_hit_physical_damage"]
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i116_team_crimson_barrier"
  },
  {
    id: "i117_magic_shroud",
    archetype: "manto de resistência e conversão de dano mágico em mana",
    category: "late",
    slot: "inventory",
    shopTier: "base",
    cost: 3300,
    recipeCost: 0,
    components: ["i046_magic_cloak"],
    tags: ["anti_magic", "mana"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 8,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 30,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i117_magic_shroud_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          healthRegen: 8,
          magicResistancePct: 30
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "magic_to_mana_shield",
        kind: "active",
        target: "self",
        tags: ["magic_barrier", "restore_mana"],
        values: {
          magicBarrier: 400,
          damageToManaPct: 25,
          duration: 12,
          cooldown: 30,
          radius: 1200,
          manaCost: 0
        },
        rules: {
          dispellable: true,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "defensive_or_aura",
      recommendedRoles: ["position_3_offlane", "position_4_soft_support", "position_5_hard_support", "defensive_core"],
      purchasePhase: "late_game",
      weights: {
        core: 35,
        support: 35,
        offlane: 80,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 85,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["cooldown_reduction", "magic_burst", "mana_sustain", "spell_amp"],
        badWith: ["mana_independent_right_clickers"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i117_magic_shroud"
  },
  {
    id: "i118_team_pipe_barrier",
    archetype: "barreira mágica ativa para o time",
    category: "support",
    slot: "inventory",
    shopTier: "base",
    cost: 3725,
    recipeCost: 0,
    components: ["i046_magic_cloak"],
    tags: ["team_barrier", "anti_magic"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 8,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 25,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i118_team_pipe_barrier_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          healthRegen: 8,
          magicResistancePct: 25
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "team_magic_barrier",
        kind: "active",
        target: "area",
        tags: ["magic_barrier", "team"],
        values: {
          barrier: 450,
          duration: 12,
          radius: 1200,
          cooldown: 30,
          manaCost: 0
        },
        rules: {
          dispellable: true,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: true,
          canTargetEnemies: true
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "support_or_team_utility",
      recommendedRoles: ["position_3_offlane", "position_4_soft_support", "position_5_hard_support"],
      purchasePhase: "mid_game",
      weights: {
        core: 35,
        support: 90,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 70,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["anti_burst", "save_play", "supports"],
        badWith: [],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: ["enemy_has_aoe_magic_burst"]
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i118_team_pipe_barrier"
  },
  {
    id: "i119_assault_aura_plate",
    archetype: "armadura de aura ofensiva e defensiva",
    category: "late",
    slot: "inventory",
    shopTier: "base",
    cost: 5125,
    recipeCost: 0,
    components: ["i045_grand_platemail", "i057_hyperstone_core"],
    tags: ["aura", "armor", "attack_speed", "siege"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 30,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 10,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i119_assault_aura_plate_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          attackSpeed: 30,
          armor: 10
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "assault_aura",
        kind: "aura",
        target: "area",
        tags: ["armor_aura", "attack_speed_aura"],
        values: {
          allyArmor: 5,
          allyAttackSpeed: 30,
          enemyArmorReduction: 5,
          radius: 1200,
          cooldown: 0
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: true
        }
      }
    ],
    stacking: {
      stackGroup: "aura_armor",
      stackMode: "max_value_only",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "defensive_or_aura",
      recommendedRoles: ["position_3_offlane", "position_4_soft_support", "position_5_hard_support", "defensive_core"],
      purchasePhase: "late_game",
      weights: {
        core: 35,
        support: 35,
        offlane: 80,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 85,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["armor_reduction", "attack_speed", "lifesteal", "right_click_cores"],
        badWith: ["low_attack_uptime_supports"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i119_assault_aura_plate"
  },
  {
    id: "i120_giant_heart",
    archetype: "item supremo de vida e regeneração fora de combate",
    category: "late",
    slot: "inventory",
    shopTier: "base",
    cost: 5200,
    recipeCost: 0,
    components: ["i060_reaver_core"],
    tags: ["health", "regen", "tank"],
    stats: {
      attributes: {
        strength: 35,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 250,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 1.6,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i120_giant_heart_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          strength: 35,
          maxHealth: 250,
          healthRegenPct: 1.6
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "out_of_combat_regen",
        kind: "passive",
        target: "self",
        tags: ["health_regen"],
        values: {
          regenPctMaxHealth: 1.6,
          disableAfterDamage: 5,
          cooldown: 0
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "defensive_or_aura",
      recommendedRoles: ["position_3_offlane", "position_4_soft_support", "position_5_hard_support", "defensive_core"],
      purchasePhase: "late_game",
      weights: {
        core: 35,
        support: 35,
        offlane: 80,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 85,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["anti_burst", "save_play", "supports"],
        badWith: [],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i120_giant_heart"
  },
  {
    id: "i121_satanic_bloodstone",
    archetype: "roubo de vida supremo com dissipação e sustain",
    category: "late",
    slot: "inventory",
    shopTier: "base",
    cost: 5050,
    recipeCost: 0,
    components: ["i051_lifesteal_mask", "i060_reaver_core"],
    tags: ["lifesteal", "damage", "survival"],
    stats: {
      attributes: {
        strength: 25,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 25,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 30,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i121_satanic_bloodstone_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          strength: 25,
          damage: 25,
          lifestealPct: 30
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "blood_rage_lifesteal",
        kind: "active",
        target: "self",
        tags: ["lifesteal_amp", "basic_dispel"],
        values: {
          lifestealPct: 175,
          duration: 6,
          cooldown: 30,
          manaCost: 0
        },
        rules: {
          dispellable: true,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "core_damage",
      recommendedRoles: ["position_1_carry", "position_2_mid", "damage_position_3_offlane"],
      purchasePhase: "late_game",
      weights: {
        core: 90,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 90,
        tempo: 45,
        lateGame: 85,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["armor_reduction", "attack_speed", "lifesteal", "right_click_cores"],
        badWith: ["low_attack_uptime_supports"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i121_satanic_bloodstone"
  },
  {
    id: "i122_armor_corruptor",
    archetype: "arma de redução intensa de armadura",
    category: "late",
    slot: "inventory",
    shopTier: "base",
    cost: 3500,
    recipeCost: 0,
    components: ["i036_war_hammer", "i031_armor_break_stone"],
    tags: ["armor_reduction", "damage", "carry"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 50,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i122_armor_corruptor_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          damage: 50
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "major_armor_corruption",
        kind: "passive",
        target: "enemy",
        tags: ["attack_modifier", "armor_reduction"],
        values: {
          armorReduction: 6,
          duration: 7,
          cooldown: 0
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: true
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "core_damage",
      recommendedRoles: ["position_1_carry", "position_2_mid", "damage_position_3_offlane"],
      purchasePhase: "late_game",
      weights: {
        core: 90,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 90,
        tempo: 45,
        lateGame: 85,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["armor_reduction", "attack_speed", "lifesteal", "right_click_cores"],
        badWith: ["low_attack_uptime_supports"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i122_armor_corruptor"
  },
  {
    id: "i123_cleave_battle_axe",
    archetype: "arma de farm com clivagem e regeneração",
    category: "late",
    slot: "inventory",
    shopTier: "base",
    cost: 4100,
    recipeCost: 0,
    components: ["i034_heavy_claymore", "i033_broad_sword", "i048_regen_ring", "i050_void_stone"],
    tags: ["cleave", "farm", "regen"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 7.5,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 2.75,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 55,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0,
        cleavePctMelee: 60
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i123_cleave_battle_axe_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          healthRegen: 7.5,
          manaRegen: 2.75,
          damage: 55,
          cleavePctMelee: 60
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "melee_cleave",
        kind: "passive",
        target: "area",
        tags: ["cleave", "melee_only"],
        values: {
          cleavePct: 60,
          cooldown: 0
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: true,
          canTargetAllies: false,
          canTargetEnemies: true
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: true,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "core_damage",
      recommendedRoles: ["position_1_carry", "position_2_mid", "damage_position_3_offlane"],
      purchasePhase: "late_game",
      weights: {
        core: 90,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 90,
        tempo: 45,
        lateGame: 85,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["armor_reduction", "attack_speed", "lifesteal", "right_click_cores"],
        badWith: ["low_attack_uptime_supports"],
        counters: []
      },
      doNotBuyIf: ["hero.attackType == ranged"],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i123_cleave_battle_axe"
  },
  {
    id: "i124_chain_lightning_hammer",
    archetype: "arma de relâmpagos para farm e luta",
    category: "mid",
    slot: "inventory",
    shopTier: "base",
    cost: 2950,
    recipeCost: 0,
    components: ["i035_piercing_javelin", "i039_fast_knuckles"],
    tags: ["attack_speed", "chain_lightning"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 25,
        damagePct: 0,
        attackSpeed: 25,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i124_chain_lightning_hammer_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          damage: 25,
          attackSpeed: 25
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "chain_lightning_proc",
        kind: "passive",
        target: "enemy",
        tags: ["attack_proc", "magical", "chain"],
        values: {
          chancePct: 25,
          damage: 120,
          bounces: 4,
          cooldown: 0
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: true
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "core_damage",
      recommendedRoles: ["position_1_carry", "position_2_mid", "damage_position_3_offlane"],
      purchasePhase: "mid_game",
      weights: {
        core: 90,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 90,
        tempo: 70,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["armor_reduction", "attack_speed", "lifesteal", "right_click_cores"],
        badWith: ["low_attack_uptime_supports"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i124_chain_lightning_hammer"
  },
  {
    id: "i125_static_storm_hammer",
    archetype: "martelo de relâmpagos com escudo ofensivo",
    category: "late",
    slot: "inventory",
    shopTier: "base",
    cost: 5600,
    recipeCost: 0,
    components: ["i124_chain_lightning_hammer", "i057_hyperstone_core"],
    tags: ["attack_speed", "chain_lightning", "active_shield"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 25,
        damagePct: 0,
        attackSpeed: 90,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i125_static_storm_hammer_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          damage: 25,
          attackSpeed: 90
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "static_charge_shield",
        kind: "active",
        target: "unit",
        tags: ["counter_attack", "chain_lightning"],
        values: {
          duration: 15,
          procDamage: 225,
          cooldown: 30,
          manaCost: 0
        },
        rules: {
          dispellable: true,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: true
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "core_damage",
      recommendedRoles: ["position_1_carry", "position_2_mid", "damage_position_3_offlane"],
      purchasePhase: "late_game",
      weights: {
        core: 90,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 90,
        tempo: 45,
        lateGame: 85,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["armor_reduction", "attack_speed", "lifesteal", "right_click_cores"],
        badWith: ["low_attack_uptime_supports"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i125_static_storm_hammer"
  },
  {
    id: "i126_rooting_storm_rod",
    archetype: "arma de relâmpago com enraizamento em área",
    category: "late",
    slot: "inventory",
    shopTier: "base",
    cost: 5450,
    recipeCost: 0,
    components: ["i124_chain_lightning_hammer", "i062_ultimate_orb_generic"],
    tags: ["root", "chain_lightning", "catch"],
    stats: {
      attributes: {
        strength: 14,
        agility: 14,
        intelligence: 14,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 25,
        damagePct: 0,
        attackSpeed: 25,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i126_rooting_storm_rod_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          strength: 14,
          agility: 14,
          intelligence: 14,
          damage: 25,
          attackSpeed: 25
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "storm_root_area",
        kind: "active",
        target: "area",
        tags: ["root", "damage"],
        values: {
          root: 2,
          damage: 180,
          radius: 350,
          cooldown: 30,
          manaCost: 0
        },
        rules: {
          dispellable: true,
          piercesDebuffImmunity: false,
          breaksInvisibility: true,
          affectsBuildings: true,
          canTargetAllies: false,
          canTargetEnemies: true
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "core_damage",
      recommendedRoles: ["position_1_carry", "position_2_mid", "damage_position_3_offlane"],
      purchasePhase: "late_game",
      weights: {
        core: 90,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 90,
        tempo: 45,
        lateGame: 85,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["armor_reduction", "attack_speed", "lifesteal", "right_click_cores"],
        badWith: ["low_attack_uptime_supports"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i126_rooting_storm_rod"
  },
  {
    id: "i127_bash_club",
    archetype: "arma de chance de atordoar em ataques",
    category: "mid",
    slot: "inventory",
    shopTier: "base",
    cost: 2875,
    recipeCost: 0,
    components: ["i035_piercing_javelin", "i023_giant_axe"],
    tags: ["bash", "damage"],
    stats: {
      attributes: {
        strength: 10,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 25,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i127_bash_club_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          strength: 10,
          damage: 25
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "attack_bash",
        kind: "passive",
        target: "enemy",
        tags: ["bash"],
        values: {
          chanceMeleePct: 25,
          chanceRangedPct: 10,
          stun: 1.2,
          bonusDamage: 100,
          cooldown: 0
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: true
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "core_damage",
      recommendedRoles: ["position_1_carry", "position_2_mid", "damage_position_3_offlane"],
      purchasePhase: "mid_game",
      weights: {
        core: 90,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 90,
        tempo: 70,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["armor_reduction", "attack_speed", "lifesteal", "right_click_cores"],
        badWith: ["low_attack_uptime_supports"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i127_bash_club"
  },
  {
    id: "i128_abyssal_lockblade",
    archetype: "arma suprema de bash e atordoamento ativo",
    category: "late",
    slot: "inventory",
    shopTier: "base",
    cost: 6250,
    recipeCost: 0,
    components: ["i127_bash_club", "i115_damage_block_shield"],
    tags: ["bash", "active_stun", "tank"],
    stats: {
      attributes: {
        strength: 25,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 250,
        maxMana: 0,
        healthRegen: 10,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 25,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i128_abyssal_lockblade_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          strength: 25,
          maxHealth: 250,
          healthRegen: 10,
          damage: 25
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "melee_active_stun",
        kind: "active",
        target: "unit",
        tags: ["stun", "piercing_disable"],
        values: {
          stun: 2,
          range: 150,
          cooldown: 30,
          manaCost: 0
        },
        rules: {
          dispellable: true,
          piercesDebuffImmunity: true,
          breaksInvisibility: true,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: true
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "core_damage",
      recommendedRoles: ["position_1_carry", "position_2_mid", "damage_position_3_offlane"],
      purchasePhase: "late_game",
      weights: {
        core: 90,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 90,
        tempo: 45,
        lateGame: 85,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["armor_reduction", "attack_speed", "lifesteal", "right_click_cores"],
        badWith: ["low_attack_uptime_supports"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i128_abyssal_lockblade"
  },
  {
    id: "i129_crystal_edge",
    archetype: "arma de crítico médio",
    category: "mid",
    slot: "inventory",
    shopTier: "base",
    cost: 1950,
    recipeCost: 0,
    components: ["i033_broad_sword"],
    tags: ["critical", "damage"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 32,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i129_crystal_edge_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          damage: 32
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "minor_crit",
        kind: "passive",
        target: "enemy",
        tags: ["critical"],
        values: {
          chancePct: 30,
          critMultiplier: 160,
          cooldown: 0
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: true
        }
      }
    ],
    stacking: {
      stackGroup: "critical_strike_highest_proc",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "core_damage",
      recommendedRoles: ["position_1_carry", "position_2_mid", "damage_position_3_offlane"],
      purchasePhase: "mid_game",
      weights: {
        core: 90,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 90,
        tempo: 70,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["armor_reduction", "attack_speed", "lifesteal", "right_click_cores"],
        badWith: ["low_attack_uptime_supports"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i129_crystal_edge"
  },
  {
    id: "i130_great_crit_blade",
    archetype: "arma suprema de crítico",
    category: "late",
    slot: "inventory",
    shopTier: "base",
    cost: 5100,
    recipeCost: 0,
    components: ["i129_crystal_edge", "i037_demon_edge_generic"],
    tags: ["critical", "damage", "carry"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 88,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i130_great_crit_blade_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          damage: 88
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "major_crit",
        kind: "passive",
        target: "enemy",
        tags: ["critical"],
        values: {
          chancePct: 30,
          critMultiplier: 225,
          cooldown: 0
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: true
        }
      }
    ],
    stacking: {
      stackGroup: "critical_strike_highest_proc",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "core_damage",
      recommendedRoles: ["position_1_carry", "position_2_mid", "damage_position_3_offlane"],
      purchasePhase: "late_game",
      weights: {
        core: 90,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 90,
        tempo: 45,
        lateGame: 85,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["armor_reduction", "attack_speed", "lifesteal", "right_click_cores"],
        badWith: ["low_attack_uptime_supports"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i130_great_crit_blade"
  },
  {
    id: "i131_true_strike_staff",
    archetype: "arma contra evasão com proc mágico",
    category: "late",
    slot: "inventory",
    shopTier: "base",
    cost: 4975,
    recipeCost: 0,
    components: ["i035_piercing_javelin", "i038_quarterstaff"],
    tags: ["true_strike", "damage", "attack_speed"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 40,
        damagePct: 0,
        attackSpeed: 45,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0,
        accuracyPct: 80
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i131_true_strike_staff_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          damage: 40,
          attackSpeed: 45,
          accuracyPct: 80
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "true_strike",
        kind: "passive",
        target: "self",
        tags: ["accuracy"],
        values: {
          accuracyPct: 80,
          cooldown: 0
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "pierce_proc_large",
        kind: "passive",
        target: "enemy",
        tags: ["attack_proc", "magic_damage"],
        values: {
          chancePct: 80,
          damage: 70,
          cooldown: 0
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: true
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "core_damage",
      recommendedRoles: ["position_1_carry", "position_2_mid", "damage_position_3_offlane"],
      purchasePhase: "late_game",
      weights: {
        core: 90,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 90,
        tempo: 45,
        lateGame: 85,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["armor_reduction", "attack_speed", "lifesteal", "right_click_cores"],
        badWith: ["low_attack_uptime_supports"],
        counters: ["blind", "evasion"]
      },
      doNotBuyIf: [],
      buyIf: ["enemy_has_evasion_or_blind"]
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i131_true_strike_staff"
  },
  {
    id: "i132_radiant_burn_relic",
    archetype: "reliquia de dano em aura e cegueira",
    category: "late",
    slot: "inventory",
    shopTier: "base",
    cost: 4700,
    recipeCost: 0,
    components: ["i058_sacred_relic_generic"],
    tags: ["aura_damage", "miss_chance", "farm"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 55,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i132_radiant_burn_relic_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          damage: 55
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "burn_aura",
        kind: "aura",
        target: "area",
        tags: ["magical_damage", "blind"],
        values: {
          dps: 60,
          missChancePct: 15,
          radius: 700,
          cooldown: 0
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: true
        }
      }
    ],
    stacking: {
      stackGroup: "aura_generic",
      stackMode: "max_value_only",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "core_damage",
      recommendedRoles: ["position_1_carry", "position_2_mid", "damage_position_3_offlane"],
      purchasePhase: "late_game",
      weights: {
        core: 90,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 90,
        tempo: 45,
        lateGame: 85,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["armor_reduction", "attack_speed", "lifesteal", "right_click_cores"],
        badWith: ["low_attack_uptime_supports"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i132_radiant_burn_relic"
  },
  {
    id: "i133_divine_relic",
    archetype: "arma extrema de alto risco e dano máximo",
    category: "late",
    slot: "inventory",
    shopTier: "base",
    cost: 5600,
    recipeCost: 0,
    components: [],
    tags: ["damage", "risk_reward", "drop_on_death"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 350,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i133_divine_relic_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          damage: 350
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "drop_on_death",
        kind: "passive",
        target: "self",
        tags: ["risk_reward"],
        values: {
          dropsOnDeath: true,
          cooldown: 0
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "core_damage",
      recommendedRoles: ["position_1_carry", "position_2_mid", "damage_position_3_offlane"],
      purchasePhase: "late_game",
      weights: {
        core: 90,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 90,
        tempo: 45,
        lateGame: 85,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["armor_reduction", "attack_speed", "lifesteal", "right_click_cores"],
        badWith: ["low_attack_uptime_supports"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i133_divine_relic"
  },
  {
    id: "i134_moon_shard_generic",
    archetype: "cristal de velocidade de ataque consumível",
    category: "late",
    slot: "inventory",
    shopTier: "base",
    cost: 4000,
    recipeCost: 0,
    components: ["i057_hyperstone_core"],
    tags: ["attack_speed", "consumable_upgrade"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 140,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 400
      }
    },
    effects: [
      {
        id: "i134_moon_shard_generic_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          attackSpeed: 140,
          nightVision: 400
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "consume_for_attack_speed",
        kind: "active",
        target: "self",
        tags: ["permanent_buff"],
        values: {
          permanentAttackSpeed: 60,
          cooldown: 30,
          manaCost: 0
        },
        rules: {
          dispellable: true,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "core_damage",
      recommendedRoles: ["position_1_carry", "position_2_mid", "damage_position_3_offlane"],
      purchasePhase: "late_game",
      weights: {
        core: 90,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 90,
        tempo: 45,
        lateGame: 85,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["armor_reduction", "attack_speed", "lifesteal", "right_click_cores"],
        badWith: ["low_attack_uptime_supports"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i134_moon_shard_generic"
  },
  {
    id: "i135_grand_spell_scepter",
    archetype: "cetro de upgrade de habilidade principal",
    category: "late",
    slot: "inventory",
    shopTier: "base",
    cost: 4200,
    recipeCost: 0,
    components: ["i054_resource_core"],
    tags: ["ability_upgrade", "attributes"],
    stats: {
      attributes: {
        strength: 10,
        agility: 10,
        intelligence: 10,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 175,
        maxMana: 175,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0,
        abilityUpgradeScepter: 1
      }
    },
    effects: [
      {
        id: "i135_grand_spell_scepter_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          strength: 10,
          agility: 10,
          intelligence: 10,
          maxHealth: 175,
          maxMana: 175,
          abilityUpgradeScepter: 1
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "unlock_scepter_upgrade",
        kind: "passive",
        target: "self",
        tags: ["ability_upgrade"],
        values: {
          upgradeSlot: "scepter",
          cooldown: 0
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "caster_or_control",
      recommendedRoles: ["position_2_mid", "position_4_soft_support", "rich_position_5_hard_support"],
      purchasePhase: "late_game",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 85,
        rightClick: 30,
        tempo: 45,
        lateGame: 85,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["cooldown_reduction", "magic_burst", "mana_sustain", "spell_amp"],
        badWith: ["mana_independent_right_clickers"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i135_grand_spell_scepter"
  },
  {
    id: "i136_spell_shard",
    archetype: "fragmento de upgrade secundário de habilidade",
    category: "mid",
    slot: "inventory",
    shopTier: "base",
    cost: 1400,
    recipeCost: 0,
    components: [],
    tags: ["ability_upgrade"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0,
        abilityUpgradeShard: 1
      }
    },
    effects: [
      {
        id: "i136_spell_shard_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          abilityUpgradeShard: 1
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "unlock_shard_upgrade",
        kind: "passive",
        target: "self",
        tags: ["ability_upgrade"],
        values: {
          upgradeSlot: "shard",
          cooldown: 0
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "caster_or_control",
      recommendedRoles: ["position_2_mid", "position_4_soft_support", "rich_position_5_hard_support"],
      purchasePhase: "mid_game",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 85,
        rightClick: 30,
        tempo: 70,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["cooldown_reduction", "magic_burst", "mana_sustain", "spell_amp"],
        badWith: ["mana_independent_right_clickers"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i136_spell_shard"
  },
  {
    id: "i137_octarine_core_generic",
    archetype: "núcleo de redução de recarga e roubo de vida mágico",
    category: "late",
    slot: "inventory",
    shopTier: "base",
    cost: 4800,
    recipeCost: 0,
    components: ["i096_cast_range_lens", "i054_resource_core"],
    tags: ["cooldown_reduction", "spell_lifesteal", "cast_range"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 425,
        maxMana: 425,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 3,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 25,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 225,
        areaOfEffect: 0,
        cooldownReductionPct: 25,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i137_octarine_core_generic_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          maxHealth: 425,
          maxMana: 425,
          manaRegen: 3,
          spellLifestealPct: 25,
          castRange: 225,
          cooldownReductionPct: 25
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "caster_or_control",
      recommendedRoles: ["position_2_mid", "position_4_soft_support", "rich_position_5_hard_support"],
      purchasePhase: "late_game",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 85,
        rightClick: 30,
        tempo: 45,
        lateGame: 85,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["armor_reduction", "attack_speed", "cooldown_reduction", "lifesteal", "magic_burst", "mana_sustain", "right_click_cores", "spell_amp"],
        badWith: ["low_attack_uptime_supports", "mana_independent_right_clickers"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i137_octarine_core_generic"
  },
  {
    id: "i138_refresh_orb_generic",
    archetype: "orbe de reinício de recargas",
    category: "late",
    slot: "inventory",
    shopTier: "base",
    cost: 5000,
    recipeCost: 0,
    components: ["i050_void_stone"],
    tags: ["cooldown_reset", "teamfight"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 12,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 6,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 20,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i138_refresh_orb_generic_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          healthRegen: 12,
          manaRegen: 6,
          damage: 20
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "reset_cooldowns",
        kind: "active",
        target: "self",
        tags: ["cooldown_reset"],
        values: {
          manaCost: 350,
          cooldown: 180
        },
        rules: {
          dispellable: true,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: true,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "caster_or_control",
      recommendedRoles: ["position_2_mid", "position_4_soft_support", "rich_position_5_hard_support"],
      purchasePhase: "late_game",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 85,
        rightClick: 30,
        tempo: 45,
        lateGame: 85,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["cooldown_reduction", "magic_burst", "mana_sustain", "spell_amp"],
        badWith: ["mana_independent_right_clickers"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i138_refresh_orb_generic"
  },
  {
    id: "i139_hex_scythe_generic",
    archetype: "item supremo de controle unitário",
    category: "late",
    slot: "inventory",
    shopTier: "base",
    cost: 5650,
    recipeCost: 0,
    components: ["i059_mystic_staff_generic", "i062_ultimate_orb_generic"],
    tags: ["hex", "intelligence", "disable"],
    stats: {
      attributes: {
        strength: 10,
        agility: 10,
        intelligence: 35,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 9,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i139_hex_scythe_generic_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          strength: 10,
          agility: 10,
          intelligence: 35,
          manaRegen: 9
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "hex_target",
        kind: "active",
        target: "unit",
        tags: ["hex", "disable"],
        values: {
          duration: 3.5,
          range: 800,
          cooldown: 30,
          manaCost: 0
        },
        rules: {
          dispellable: true,
          piercesDebuffImmunity: true,
          breaksInvisibility: true,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: true
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "caster_or_control",
      recommendedRoles: ["position_2_mid", "position_4_soft_support", "rich_position_5_hard_support"],
      purchasePhase: "late_game",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 85,
        rightClick: 30,
        tempo: 45,
        lateGame: 85,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["cooldown_reduction", "magic_burst", "mana_sustain", "spell_amp"],
        badWith: ["mana_independent_right_clickers"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i139_hex_scythe_generic"
  },
  {
    id: "i140_silence_orchid",
    archetype: "arma mágica de silêncio e amplificação de dano",
    category: "mid",
    slot: "inventory",
    shopTier: "base",
    cost: 3475,
    recipeCost: 0,
    components: [],
    tags: ["silence", "damage_amp", "mana_regen"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 3,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 30,
        damagePct: 0,
        attackSpeed: 40,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i140_silence_orchid_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          manaRegen: 3,
          damage: 30,
          attackSpeed: 40
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "soul_silence",
        kind: "active",
        target: "unit",
        tags: ["silence", "damage_amp"],
        values: {
          duration: 5,
          damageStoredPct: 30,
          cooldown: 30,
          range: 700,
          manaCost: 0
        },
        rules: {
          dispellable: true,
          piercesDebuffImmunity: false,
          breaksInvisibility: true,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: true
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "caster_or_control",
      recommendedRoles: ["position_2_mid", "position_4_soft_support", "rich_position_5_hard_support"],
      purchasePhase: "mid_game",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 85,
        rightClick: 30,
        tempo: 70,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["armor_reduction", "attack_speed", "cooldown_reduction", "lifesteal", "magic_burst", "mana_sustain", "right_click_cores", "spell_amp"],
        badWith: ["low_attack_uptime_supports", "mana_independent_right_clickers"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i140_silence_orchid"
  },
  {
    id: "i141_bloodthorn_generic",
    archetype: "arma suprema de silêncio, crítico mágico e acerto garantido",
    category: "late",
    slot: "inventory",
    shopTier: "base",
    cost: 6800,
    recipeCost: 0,
    components: ["i140_silence_orchid", "i131_true_strike_staff"],
    tags: ["silence", "critical", "true_strike"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 3.5,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 60,
        damagePct: 0,
        attackSpeed: 90,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0,
        accuracyPct: 100
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i141_bloodthorn_generic_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          manaRegen: 3.5,
          damage: 60,
          attackSpeed: 90,
          accuracyPct: 100
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "marked_silence_crit",
        kind: "active",
        target: "unit",
        tags: ["silence", "true_strike", "critical"],
        values: {
          duration: 5,
          critMultiplier: 130,
          accuracyPct: 100,
          cooldown: 30,
          range: 700,
          manaCost: 0
        },
        rules: {
          dispellable: true,
          piercesDebuffImmunity: true,
          breaksInvisibility: true,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: true
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "core_damage",
      recommendedRoles: ["position_1_carry", "position_2_mid", "damage_position_3_offlane"],
      purchasePhase: "late_game",
      weights: {
        core: 90,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 90,
        tempo: 45,
        lateGame: 85,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["armor_reduction", "attack_speed", "cooldown_reduction", "lifesteal", "magic_burst", "mana_sustain", "right_click_cores", "spell_amp"],
        badWith: ["low_attack_uptime_supports", "mana_independent_right_clickers"],
        counters: ["blind", "evasion"]
      },
      doNotBuyIf: [],
      buyIf: ["enemy_has_evasion_or_blind"]
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i141_bloodthorn_generic"
  },
  {
    id: "i142_burst_wand",
    archetype: "cajado escalável de dano mágico unitário",
    category: "mid",
    slot: "inventory",
    shopTier: "base",
    cost: 2700,
    recipeCost: 0,
    components: [],
    tags: ["nuke", "upgradeable"],
    stats: {
      attributes: {
        strength: 6,
        agility: 6,
        intelligence: 14,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i142_burst_wand_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          strength: 6,
          agility: 6,
          intelligence: 14
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "energy_burst",
        kind: "active",
        target: "unit",
        tags: ["magical_damage"],
        values: {
          damageByLevel: [400, 500, 600, 700, 800],
          range: 700,
          cooldown: 30,
          damage: 150,
          manaCost: 0
        },
        rules: {
          dispellable: true,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: true
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "caster_or_control",
      recommendedRoles: ["position_2_mid", "position_4_soft_support", "rich_position_5_hard_support"],
      purchasePhase: "mid_game",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 85,
        rightClick: 30,
        tempo: 70,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["cooldown_reduction", "magic_burst", "mana_sustain", "spell_amp"],
        badWith: ["mana_independent_right_clickers"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i142_burst_wand"
  },
  {
    id: "i143_spirit_urn",
    archetype: "urna de cargas para cura ou dano gradual",
    category: "support",
    slot: "inventory",
    shopTier: "base",
    cost: 880,
    recipeCost: 0,
    components: [],
    tags: ["charges", "heal", "dot"],
    stats: {
      attributes: {
        strength: 2,
        agility: 2,
        intelligence: 2,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 1.4,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 2,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i143_spirit_urn_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          strength: 2,
          agility: 2,
          intelligence: 2,
          manaRegen: 1.4,
          armor: 2
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "soul_charge",
        kind: "active",
        target: "unit",
        tags: ["heal_or_damage", "charges"],
        values: {
          heal: 200,
          damage: 200,
          duration: 8,
          cooldown: 30,
          radius: 1200,
          manaCost: 0
        },
        rules: {
          dispellable: true,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: true
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "support_or_team_utility",
      recommendedRoles: ["position_3_offlane", "position_4_soft_support", "position_5_hard_support"],
      purchasePhase: "mid_game",
      weights: {
        core: 35,
        support: 90,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 70,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["anti_burst", "save_play", "supports"],
        badWith: [],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i143_spirit_urn"
  },
  {
    id: "i144_spirit_vessel_generic",
    archetype: "vaso de anti-cura e dano percentual",
    category: "support",
    slot: "inventory",
    shopTier: "base",
    cost: 2780,
    recipeCost: 0,
    components: ["i143_spirit_urn"],
    tags: ["anti_heal", "percent_damage", "charges"],
    stats: {
      attributes: {
        strength: 12,
        agility: 12,
        intelligence: 12,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 2,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 20,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i144_spirit_vessel_generic_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          strength: 12,
          agility: 12,
          intelligence: 12,
          armor: 2,
          movementSpeed: 20
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "vessel_charge",
        kind: "active",
        target: "unit",
        tags: ["heal_or_damage", "heal_reduction", "percent_damage"],
        values: {
          healReductionPct: 45,
          currentHealthDamagePct: 4,
          duration: 8,
          cooldown: 30,
          radius: 1200,
          manaCost: 0
        },
        rules: {
          dispellable: true,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: true
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "support_or_team_utility",
      recommendedRoles: ["position_3_offlane", "position_4_soft_support", "position_5_hard_support"],
      purchasePhase: "mid_game",
      weights: {
        core: 35,
        support: 90,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 70,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["anti_burst", "armor_reduction", "attack_speed", "lifesteal", "right_click_cores", "save_play", "supports"],
        badWith: ["low_attack_uptime_supports"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: ["enemy_has_heavy_healing_or_lifesteal"]
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i144_spirit_vessel_generic"
  },
  {
    id: "i145_healing_mechanism",
    archetype: "mecanismo de cura em área",
    category: "support",
    slot: "inventory",
    shopTier: "base",
    cost: 1775,
    recipeCost: 0,
    components: [],
    tags: ["team_heal", "support"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 4,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i145_healing_mechanism_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          armor: 4
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "team_burst_heal",
        kind: "active",
        target: "area",
        tags: ["heal", "team"],
        values: {
          heal: 275,
          radius: 1200,
          cooldown: 30,
          manaCost: 0
        },
        rules: {
          dispellable: true,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: true,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "support_or_team_utility",
      recommendedRoles: ["position_3_offlane", "position_4_soft_support", "position_5_hard_support"],
      purchasePhase: "mid_game",
      weights: {
        core: 35,
        support: 90,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 70,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["anti_burst", "save_play", "supports"],
        badWith: [],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i145_healing_mechanism"
  },
  {
    id: "i146_guardian_boots_generic",
    archetype: "bota suprema de cura, mana e dissipação em área",
    category: "support",
    slot: "inventory",
    shopTier: "base",
    cost: 5050,
    recipeCost: 0,
    components: ["i073_arcane_boots", "i145_healing_mechanism"],
    tags: ["team_heal", "team_mana", "dispel", "boots"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 250,
        healthRegen: 4,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 4,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 55,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i146_guardian_boots_generic_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          maxMana: 250,
          healthRegen: 4,
          armor: 4,
          movementSpeed: 55
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "guardian_restore",
        kind: "active",
        target: "area",
        tags: ["heal", "restore_mana", "basic_dispel", "team"],
        values: {
          heal: 350,
          mana: 200,
          radius: 1200,
          cooldown: 30,
          manaCost: 0
        },
        rules: {
          dispellable: true,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: true,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "support_or_team_utility",
      recommendedRoles: ["position_3_offlane", "position_4_soft_support", "position_5_hard_support"],
      purchasePhase: "mid_game",
      weights: {
        core: 35,
        support: 90,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 70,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["anti_burst", "cooldown_reduction", "magic_burst", "mana_sustain", "save_play", "spell_amp", "supports"],
        badWith: ["mana_independent_right_clickers"],
        counters: ["damage_over_time", "root", "silence", "slow"]
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i146_guardian_boots_generic"
  },
  {
    id: "i147_holy_locket_generic",
    archetype: "amplificador de cura e cargas defensivas",
    category: "support",
    slot: "inventory",
    shopTier: "base",
    cost: 2400,
    recipeCost: 0,
    components: [],
    tags: ["heal_amp", "charges", "support"],
    stats: {
      attributes: {
        strength: 10,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 250,
        maxMana: 300,
        healthRegen: 3,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 2,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i147_holy_locket_generic_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          strength: 10,
          maxHealth: 250,
          maxMana: 300,
          healthRegen: 3,
          manaRegen: 2
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "release_heal_charges",
        kind: "active",
        target: "unit",
        tags: ["heal", "charges"],
        values: {
          maxCharges: 20,
          healPerCharge: 15,
          healAmpPct: 25,
          cooldown: 30,
          radius: 1200,
          manaCost: 0
        },
        rules: {
          dispellable: true,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: true,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "support_or_team_utility",
      recommendedRoles: ["position_3_offlane", "position_4_soft_support", "position_5_hard_support"],
      purchasePhase: "mid_game",
      weights: {
        core: 35,
        support: 90,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 70,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["anti_burst", "save_play", "supports"],
        badWith: [],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i147_holy_locket_generic"
  },
  {
    id: "i148_pavise_barrier",
    archetype: "barreira física barata para aliados",
    category: "support",
    slot: "inventory",
    shopTier: "base",
    cost: 1400,
    recipeCost: 0,
    components: [],
    tags: ["physical_barrier", "support"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 175,
        healthRegen: 2.5,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 3,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i148_pavise_barrier_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          maxMana: 175,
          healthRegen: 2.5,
          armor: 3
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "physical_barrier_target",
        kind: "active",
        target: "unit",
        tags: ["physical_barrier"],
        values: {
          barrier: 300,
          duration: 8,
          cooldown: 30,
          radius: 1200,
          manaCost: 0
        },
        rules: {
          dispellable: true,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: true
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "support_or_team_utility",
      recommendedRoles: ["position_3_offlane", "position_4_soft_support", "position_5_hard_support"],
      purchasePhase: "mid_game",
      weights: {
        core: 35,
        support: 90,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 70,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["anti_burst", "save_play", "supports"],
        badWith: [],
        counters: ["illusions", "multi_hit_physical_damage", "summons"]
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i148_pavise_barrier"
  },
  {
    id: "i149_solar_crest_generic",
    archetype: "crest de armadura, velocidade e barreira para aliado ou inimigo",
    category: "support",
    slot: "inventory",
    shopTier: "base",
    cost: 2600,
    recipeCost: 0,
    components: ["i148_pavise_barrier"],
    tags: ["support", "armor", "attack_speed", "barrier"],
    stats: {
      attributes: {
        strength: 6,
        agility: 6,
        intelligence: 6,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 1.5,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 6,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 20,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i149_solar_crest_generic_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          strength: 6,
          agility: 6,
          intelligence: 6,
          manaRegen: 1.5,
          armor: 6,
          movementSpeed: 20
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "solar_buff_or_debuff",
        kind: "active",
        target: "unit",
        tags: ["armor", "attack_speed", "movement", "barrier"],
        values: {
          armor: 6,
          attackSpeed: 70,
          moveSpeedPct: 15,
          barrier: 400,
          cooldown: 30,
          radius: 1200,
          manaCost: 0
        },
        rules: {
          dispellable: true,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: true,
          canTargetEnemies: true
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "support_or_team_utility",
      recommendedRoles: ["position_3_offlane", "position_4_soft_support", "position_5_hard_support"],
      purchasePhase: "mid_game",
      weights: {
        core: 35,
        support: 90,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 70,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["anti_burst", "armor_reduction", "attack_speed", "lifesteal", "right_click_cores", "save_play", "supports"],
        badWith: ["low_attack_uptime_supports"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i149_solar_crest_generic"
  },
  {
    id: "i150_war_drums_generic",
    archetype: "tambor de velocidade para rotações e luta",
    category: "support",
    slot: "inventory",
    shopTier: "base",
    cost: 1650,
    recipeCost: 0,
    components: [],
    tags: ["team_movement", "attack_speed", "charges"],
    stats: {
      attributes: {
        strength: 7,
        agility: 7,
        intelligence: 7,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 20,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i150_war_drums_generic_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          strength: 7,
          agility: 7,
          intelligence: 7,
          movementSpeed: 20
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "drum_charge",
        kind: "active",
        target: "area",
        tags: ["movement", "attack_speed", "team"],
        values: {
          charges: 8,
          attackSpeed: 45,
          moveSpeedPct: 13,
          duration: 6,
          cooldown: 30,
          radius: 1200,
          manaCost: 0
        },
        rules: {
          dispellable: true,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: true,
          canTargetEnemies: true
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "support_or_team_utility",
      recommendedRoles: ["position_3_offlane", "position_4_soft_support", "position_5_hard_support"],
      purchasePhase: "mid_game",
      weights: {
        core: 35,
        support: 90,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 70,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["armor_reduction", "attack_speed", "lifesteal", "right_click_cores"],
        badWith: ["low_attack_uptime_supports"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i150_war_drums_generic"
  },
  {
    id: "i151_bearing_boots_generic",
    archetype: "bota de aura e explosão de velocidade para o time",
    category: "support",
    slot: "inventory",
    shopTier: "base",
    cost: 4125,
    recipeCost: 0,
    components: ["i150_war_drums_generic", "i074_tranquil_boots"],
    tags: ["boots", "team_movement", "aura"],
    stats: {
      attributes: {
        strength: 8,
        agility: 8,
        intelligence: 8,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 65,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i151_bearing_boots_generic_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          strength: 8,
          agility: 8,
          intelligence: 8,
          movementSpeed: 65
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "unstoppable_march",
        kind: "active",
        target: "area",
        tags: ["movement", "slow_immunity", "team"],
        values: {
          moveSpeedPct: 15,
          attackSpeed: 50,
          duration: 6,
          cooldown: 30,
          radius: 1200,
          manaCost: 0
        },
        rules: {
          dispellable: true,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: true,
          canTargetEnemies: true
        }
      }
    ],
    stacking: {
      stackGroup: "aura_generic",
      stackMode: "max_value_only",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "support_or_team_utility",
      recommendedRoles: ["position_3_offlane", "position_4_soft_support", "position_5_hard_support"],
      purchasePhase: "mid_game",
      weights: {
        core: 35,
        support: 90,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 70,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: [],
        badWith: [],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i151_bearing_boots_generic"
  },
  {
    id: "i152_vampire_aura_mask",
    archetype: "aura de dano e roubo de vida para o time",
    category: "support",
    slot: "inventory",
    shopTier: "base",
    cost: 2450,
    recipeCost: 0,
    components: [],
    tags: ["aura", "lifesteal", "damage"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 1.75,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 2,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i152_vampire_aura_mask_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          manaRegen: 1.75,
          armor: 2
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "vampire_aura",
        kind: "aura",
        target: "area",
        tags: ["lifesteal", "damage", "mana_regen"],
        values: {
          lifestealPct: 15,
          damagePct: 18,
          manaRegen: 1.75,
          radius: 1200,
          cooldown: 0
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: true,
          canTargetAllies: false,
          canTargetEnemies: true
        }
      }
    ],
    stacking: {
      stackGroup: "aura_generic",
      stackMode: "max_value_only",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "support_or_team_utility",
      recommendedRoles: ["position_3_offlane", "position_4_soft_support", "position_5_hard_support"],
      purchasePhase: "mid_game",
      weights: {
        core: 35,
        support: 90,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 70,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["armor_reduction", "attack_speed", "lifesteal", "right_click_cores"],
        badWith: ["low_attack_uptime_supports"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i152_vampire_aura_mask"
  },
  {
    id: "i153_dominator_helm",
    archetype: "dominação de creep neutro",
    category: "mid",
    slot: "inventory",
    shopTier: "base",
    cost: 2625,
    recipeCost: 0,
    components: [],
    tags: ["summon", "aura", "jungle"],
    stats: {
      attributes: {
        strength: 6,
        agility: 6,
        intelligence: 6,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 6,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 6,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i153_dominator_helm_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          strength: 6,
          agility: 6,
          intelligence: 6,
          healthRegen: 6,
          armor: 6
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "dominate_creep",
        kind: "active",
        target: "unit",
        tags: ["control_neutral"],
        values: {
          maxLevel: 6,
          bonusHealth: 1000,
          cooldown: 30,
          manaCost: 0
        },
        rules: {
          dispellable: true,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: true
        }
      }
    ],
    stacking: {
      stackGroup: "aura_generic",
      stackMode: "max_value_only",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "midgame_flex",
      recommendedRoles: ["all_positions"],
      purchasePhase: "mid_game",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 70,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: [],
        badWith: [],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i153_dominator_helm"
  },
  {
    id: "i154_overlord_helm",
    archetype: "dominação avançada de creep poderoso",
    category: "late",
    slot: "inventory",
    shopTier: "base",
    cost: 5725,
    recipeCost: 0,
    components: ["i153_dominator_helm"],
    tags: ["summon", "aura", "jungle"],
    stats: {
      attributes: {
        strength: 20,
        agility: 20,
        intelligence: 20,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 7,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 7,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i154_overlord_helm_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          strength: 20,
          agility: 20,
          intelligence: 20,
          healthRegen: 7,
          armor: 7
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "dominate_ancient",
        kind: "active",
        target: "unit",
        tags: ["control_neutral", "ancient"],
        values: {
          maxLevel: 10,
          bonusHealth: 1800,
          cooldown: 30,
          manaCost: 0
        },
        rules: {
          dispellable: true,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: true
        }
      }
    ],
    stacking: {
      stackGroup: "aura_generic",
      stackMode: "max_value_only",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "lategame_flex",
      recommendedRoles: ["all_positions"],
      purchasePhase: "late_game",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 85,
        mapUtility: 25
      },
      synergy: {
        greatWith: [],
        badWith: [],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i154_overlord_helm"
  },
  {
    id: "i155_spell_lifeblood_core",
    archetype: "núcleo de roubo de vida mágico e amplificação de área",
    category: "late",
    slot: "inventory",
    shopTier: "base",
    cost: 4700,
    recipeCost: 0,
    components: ["i099_discord_veil", "i054_resource_core"],
    tags: ["spell_lifesteal", "area_amp", "mana"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 425,
        maxMana: 425,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 3,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 25,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i155_spell_lifeblood_core_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          maxHealth: 425,
          maxMana: 425,
          manaRegen: 3,
          spellLifestealPct: 25
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "bloodpact_spell_amp",
        kind: "active",
        target: "self",
        tags: ["spell_lifesteal", "aoe_bonus"],
        values: {
          spellLifestealPct: 30,
          areaOfEffect: 75,
          duration: 6,
          cooldown: 30,
          manaCost: 0
        },
        rules: {
          dispellable: true,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "caster_or_control",
      recommendedRoles: ["position_2_mid", "position_4_soft_support", "rich_position_5_hard_support"],
      purchasePhase: "late_game",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 85,
        rightClick: 30,
        tempo: 45,
        lateGame: 85,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["armor_reduction", "attack_speed", "cooldown_reduction", "lifesteal", "magic_burst", "mana_sustain", "right_click_cores", "spell_amp"],
        badWith: ["low_attack_uptime_supports", "mana_independent_right_clickers"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i155_spell_lifeblood_core"
  },
  {
    id: "i156_phylactery_focus",
    archetype: "foco de dano extra em magia unitária",
    category: "mid",
    slot: "inventory",
    shopTier: "base",
    cost: 2400,
    recipeCost: 0,
    components: [],
    tags: ["single_target_spell", "slow", "nuke"],
    stats: {
      attributes: {
        strength: 7,
        agility: 7,
        intelligence: 7,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 200,
        maxMana: 200,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i156_phylactery_focus_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          strength: 7,
          agility: 7,
          intelligence: 7,
          maxHealth: 200,
          maxMana: 200
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "spell_followup_nuke",
        kind: "passive",
        target: "enemy",
        tags: ["single_target_spell_proc", "slow"],
        values: {
          damage: 150,
          slowPct: 50,
          cooldown: 6
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: true
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "caster_or_control",
      recommendedRoles: ["position_2_mid", "position_4_soft_support", "rich_position_5_hard_support"],
      purchasePhase: "mid_game",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 85,
        rightClick: 30,
        tempo: 70,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["cooldown_reduction", "magic_burst", "mana_sustain", "spell_amp"],
        badWith: ["mana_independent_right_clickers"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i156_phylactery_focus"
  },
  {
    id: "i157_khanda_focus",
    archetype: "foco avançado de magia unitária com crítico físico",
    category: "late",
    slot: "inventory",
    shopTier: "base",
    cost: 5000,
    recipeCost: 0,
    components: ["i156_phylactery_focus", "i129_crystal_edge"],
    tags: ["single_target_spell", "critical", "burst"],
    stats: {
      attributes: {
        strength: 10,
        agility: 10,
        intelligence: 10,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 50,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i157_khanda_focus_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          strength: 10,
          agility: 10,
          intelligence: 10,
          damage: 50
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "spell_weapon_burst",
        kind: "passive",
        target: "enemy",
        tags: ["single_target_spell_proc", "critical_scaling"],
        values: {
          baseDamage: 150,
          attackDamagePct: 75,
          slowPct: 50,
          cooldown: 0
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: true
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "core_damage",
      recommendedRoles: ["position_1_carry", "position_2_mid", "damage_position_3_offlane"],
      purchasePhase: "late_game",
      weights: {
        core: 90,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 90,
        tempo: 45,
        lateGame: 85,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["armor_reduction", "attack_speed", "cooldown_reduction", "lifesteal", "magic_burst", "mana_sustain", "right_click_cores", "spell_amp"],
        badWith: ["low_attack_uptime_supports", "mana_independent_right_clickers"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i157_khanda_focus"
  },
  {
    id: "i158_witch_blade_generic",
    archetype: "lâmina mágica com projétil venenoso escalado por inteligência",
    category: "mid",
    slot: "inventory",
    shopTier: "base",
    cost: 2600,
    recipeCost: 0,
    components: [],
    tags: ["intelligence", "attack_modifier", "dot"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 12,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 35,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 6,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i158_witch_blade_generic_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          intelligence: 12,
          attackSpeed: 35,
          armor: 6
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "int_poison_attack",
        kind: "passive",
        target: "enemy",
        tags: ["attack_proc", "dot", "slow"],
        values: {
          damageFromIntPct: 75,
          duration: 4,
          slowPct: 25,
          cooldown: 0
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: true
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "caster_or_control",
      recommendedRoles: ["position_2_mid", "position_4_soft_support", "rich_position_5_hard_support"],
      purchasePhase: "mid_game",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 85,
        rightClick: 30,
        tempo: 70,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["armor_reduction", "attack_speed", "cooldown_reduction", "lifesteal", "magic_burst", "mana_sustain", "right_click_cores", "spell_amp"],
        badWith: ["low_attack_uptime_supports", "mana_independent_right_clickers"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i158_witch_blade_generic"
  },
  {
    id: "i159_parasma_generic",
    archetype: "lâmina mágica avançada com redução de resistência mágica",
    category: "late",
    slot: "inventory",
    shopTier: "base",
    cost: 5975,
    recipeCost: 0,
    components: ["i158_witch_blade_generic"],
    tags: ["intelligence", "magic_amp", "attack_modifier"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 40,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 40,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 8,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i159_parasma_generic_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          intelligence: 40,
          attackSpeed: 40,
          armor: 8
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "magic_resistance_break_attack",
        kind: "passive",
        target: "enemy",
        tags: ["magic_resistance_reduction", "dot"],
        values: {
          magicResistanceReductionPct: 20,
          duration: 4,
          cooldown: 0
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: true
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "caster_or_control",
      recommendedRoles: ["position_2_mid", "position_4_soft_support", "rich_position_5_hard_support"],
      purchasePhase: "late_game",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 85,
        rightClick: 30,
        tempo: 45,
        lateGame: 85,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["armor_reduction", "attack_speed", "cooldown_reduction", "lifesteal", "magic_burst", "mana_sustain", "right_click_cores", "spell_amp"],
        badWith: ["low_attack_uptime_supports", "mana_independent_right_clickers"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i159_parasma_generic"
  },
  {
    id: "i160_revenant_brooch_generic",
    archetype: "broche que transforma ataques em dano mágico",
    category: "late",
    slot: "inventory",
    shopTier: "base",
    cost: 4900,
    recipeCost: 0,
    components: [],
    tags: ["magic_attacks", "mana_cost_attack"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 5,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 45,
        damagePct: 0,
        attackSpeed: 30,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i160_revenant_brooch_generic_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          manaRegen: 5,
          damage: 45,
          attackSpeed: 30
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "toggle_magic_attacks",
        kind: "toggle",
        target: "self",
        tags: ["attack_magic_damage", "mana_cost"],
        values: {
          manaCostPerAttack: 75,
          canHitEthereal: true,
          cooldown: 0
        },
        rules: {
          dispellable: true,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "caster_or_control",
      recommendedRoles: ["position_2_mid", "position_4_soft_support", "rich_position_5_hard_support"],
      purchasePhase: "late_game",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 85,
        rightClick: 30,
        tempo: 45,
        lateGame: 85,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["armor_reduction", "attack_speed", "cooldown_reduction", "lifesteal", "magic_burst", "mana_sustain", "right_click_cores", "spell_amp"],
        badWith: ["low_attack_uptime_supports", "mana_independent_right_clickers"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i160_revenant_brooch_generic"
  },
  {
    id: "i161_consecrated_wraps_generic",
    archetype: "faixas defensivas de barreira, atributos e resistência mágica",
    category: "late",
    slot: "inventory",
    shopTier: "base",
    cost: 4200,
    recipeCost: 0,
    components: [],
    tags: ["barrier", "attributes", "anti_magic"],
    stats: {
      attributes: {
        strength: 14,
        agility: 14,
        intelligence: 14,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 250,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 12,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i161_consecrated_wraps_generic_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          strength: 14,
          agility: 14,
          intelligence: 14,
          maxHealth: 250,
          magicResistancePct: 12
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "hallowed_barrier",
        kind: "active",
        target: "self",
        tags: ["barrier", "movement"],
        values: {
          barrier: 450,
          moveSpeedPct: 15,
          duration: 5,
          cooldown: 30,
          radius: 1200,
          manaCost: 0
        },
        rules: {
          dispellable: true,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "defensive_or_aura",
      recommendedRoles: ["position_3_offlane", "position_4_soft_support", "position_5_hard_support", "defensive_core"],
      purchasePhase: "late_game",
      weights: {
        core: 35,
        support: 35,
        offlane: 80,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 85,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["anti_burst", "save_play", "supports"],
        badWith: [],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i161_consecrated_wraps_generic"
  },
  {
    id: "i162_crozier_ghost_relic",
    archetype: "cajado de forma fantasma com roubo de cura e velocidade",
    category: "late",
    slot: "inventory",
    shopTier: "base",
    cost: 4800,
    recipeCost: 0,
    components: [],
    tags: ["ethereal", "anti_heal", "movement_steal"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 20,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 8,
        magicResistancePct: 12,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i162_crozier_ghost_relic_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          intelligence: 20,
          armor: 8,
          magicResistancePct: 12
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "crozier_ghost_aura",
        kind: "active",
        target: "self",
        tags: ["ethereal", "heal_steal", "movement_steal"],
        values: {
          duration: 4,
          magicDamageTakenPct: 30,
          moveSpeedStealPctPerSecond: 5,
          healReductionPct: 75,
          cooldown: 30,
          radius: 1200,
          manaCost: 0
        },
        rules: {
          dispellable: true,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "defensive_or_aura",
      recommendedRoles: ["position_3_offlane", "position_4_soft_support", "position_5_hard_support", "defensive_core"],
      purchasePhase: "late_game",
      weights: {
        core: 35,
        support: 35,
        offlane: 80,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 85,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["anti_burst", "save_play", "supports"],
        badWith: [],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i162_crozier_ghost_relic"
  },
  {
    id: "i163_hydra_range_toxin",
    archetype: "arma de alcance com veneno percentual e ataques adicionais",
    category: "late",
    slot: "inventory",
    shopTier: "base",
    cost: 5900,
    recipeCost: 0,
    components: [],
    tags: ["ranged_carry", "poison", "multi_target"],
    stats: {
      attributes: {
        strength: 15,
        agility: 30,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 25,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 150,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i163_hydra_range_toxin_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          strength: 15,
          agility: 30,
          damage: 25,
          attackRangeRangedOnly: 150
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "hydra_poison_attack",
        kind: "passive",
        target: "enemy",
        tags: ["attack_modifier", "max_health_dot"],
        values: {
          maxHealthDpsPct: 2.5,
          duration: 3,
          cooldown: 0
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: true
        }
      },
      {
        id: "hydra_extra_projectiles",
        kind: "passive",
        target: "area",
        tags: ["multi_target_attack"],
        values: {
          extraTargets: 3,
          damagePct: 65,
          cooldown: 0
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: true
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: true,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "core_damage",
      recommendedRoles: ["position_1_carry", "position_2_mid", "damage_position_3_offlane"],
      purchasePhase: "late_game",
      weights: {
        core: 90,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 90,
        tempo: 45,
        lateGame: 85,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["armor_reduction", "attack_speed", "lifesteal", "right_click_cores"],
        badWith: ["low_attack_uptime_supports"],
        counters: []
      },
      doNotBuyIf: ["hero.attackType == melee"],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i163_hydra_range_toxin"
  },
  {
    id: "i164_essence_distiller_generic",
    archetype: "item híbrido de cura, dano e armadilhas utilitárias",
    category: "support",
    slot: "inventory",
    shopTier: "base",
    cost: 3600,
    recipeCost: 0,
    components: [],
    tags: ["heal_or_damage", "trap", "utility"],
    stats: {
      attributes: {
        strength: 8,
        agility: 8,
        intelligence: 16,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 2,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 5,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i164_essence_distiller_generic_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          strength: 8,
          agility: 8,
          intelligence: 16,
          manaRegen: 2,
          armor: 5
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "distill_essence",
        kind: "active",
        target: "unit",
        tags: ["heal_or_damage"],
        values: {
          heal: 220,
          damage: 220,
          cooldown: 30,
          radius: 1200,
          manaCost: 0
        },
        rules: {
          dispellable: true,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: true
        }
      },
      {
        id: "place_essence_trap",
        kind: "active",
        target: "point",
        tags: ["trap", "slow"],
        values: {
          duration: 30,
          slowPct: 35,
          radius: 300,
          cooldown: 30,
          manaCost: 0
        },
        rules: {
          dispellable: true,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "support_or_team_utility",
      recommendedRoles: ["position_3_offlane", "position_4_soft_support", "position_5_hard_support"],
      purchasePhase: "mid_game",
      weights: {
        core: 35,
        support: 90,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 70,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["anti_burst", "armor_reduction", "attack_speed", "lifesteal", "right_click_cores", "save_play", "supports"],
        badWith: ["low_attack_uptime_supports"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i164_essence_distiller_generic"
  },
  {
    id: "i165_specialist_array_generic",
    archetype: "array de dano e agilidade com disparos extras condicionais",
    category: "mid",
    slot: "inventory",
    shopTier: "base",
    cost: 2550,
    recipeCost: 0,
    components: [],
    tags: ["ranged_carry", "multi_target", "agility"],
    stats: {
      attributes: {
        strength: 0,
        agility: 12,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 20,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i165_specialist_array_generic_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          agility: 12,
          damage: 20
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "splitshot_proc",
        kind: "passive",
        target: "area",
        tags: ["ranged_only", "extra_projectiles"],
        values: {
          chancePct: 30,
          extraTargets: 2,
          damagePct: 75,
          cooldown: 0
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: true
        }
      }
    ],
    stacking: {
      stackGroup: "unique_item",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: true,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: false,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "core_damage",
      recommendedRoles: ["position_1_carry", "position_2_mid", "damage_position_3_offlane"],
      purchasePhase: "mid_game",
      weights: {
        core: 90,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 90,
        tempo: 70,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["armor_reduction", "attack_speed", "lifesteal", "right_click_cores"],
        badWith: ["low_attack_uptime_supports"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i165_specialist_array_generic"
  },
  {
    id: "i166_t1_duelist_gloves",
    archetype: "luvas neutras de duelo e ataque rápido",
    category: "neutral_tier_1",
    slot: "neutral",
    shopTier: "neutral",
    cost: 0,
    recipeCost: 0,
    components: [],
    tags: ["neutral", "tier_1", "attack_speed", "duel"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 20,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i166_t1_duelist_gloves_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          attackSpeed: 20
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "t1_duelist_gloves_effect",
        kind: "passive",
        target: "self",
        tags: ["attack_speed", "duel"],
        values: {
          tier: 1,
          cooldown: 0
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "neutral_slot",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: false,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: true,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "neutral_core_damage",
      recommendedRoles: ["position_1_carry", "position_2_mid", "damage_position_3_offlane"],
      purchasePhase: "neutral_drop",
      weights: {
        core: 90,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 90,
        tempo: 45,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["armor_reduction", "attack_speed", "lifesteal", "right_click_cores"],
        badWith: ["low_attack_uptime_supports"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i166_t1_duelist_gloves"
  },
  {
    id: "i167_t1_arcane_bracelet",
    archetype: "bracelete neutro de mana e atributos",
    category: "neutral_tier_1",
    slot: "neutral",
    shopTier: "neutral",
    cost: 0,
    recipeCost: 0,
    components: [],
    tags: ["neutral", "tier_1", "mana", "attributes"],
    stats: {
      attributes: {
        strength: 3,
        agility: 3,
        intelligence: 6,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 75,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i167_t1_arcane_bracelet_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          strength: 3,
          agility: 3,
          intelligence: 6,
          maxMana: 75
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "t1_arcane_bracelet_effect",
        kind: "passive",
        target: "self",
        tags: ["mana", "attributes"],
        values: {
          tier: 1,
          cooldown: 0
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "neutral_slot",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: false,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: true,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "neutral_caster",
      recommendedRoles: ["position_2_mid", "position_4_soft_support", "position_5_hard_support"],
      purchasePhase: "neutral_drop",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 85,
        rightClick: 30,
        tempo: 45,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["cooldown_reduction", "magic_burst", "mana_sustain", "spell_amp"],
        badWith: ["mana_independent_right_clickers"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i167_t1_arcane_bracelet"
  },
  {
    id: "i168_t1_faded_amulet",
    archetype: "amuleto neutro de movimento e dano",
    category: "neutral_tier_1",
    slot: "neutral",
    shopTier: "neutral",
    cost: 0,
    recipeCost: 0,
    components: [],
    tags: ["neutral", "tier_1", "movement", "damage"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 7,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 20,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i168_t1_faded_amulet_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          damage: 7,
          movementSpeed: 20
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "t1_faded_amulet_effect",
        kind: "passive",
        target: "self",
        tags: ["movement", "damage"],
        values: {
          tier: 1,
          cooldown: 0
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: true,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "neutral_slot",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: false,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: true,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "neutral_core_damage",
      recommendedRoles: ["position_1_carry", "position_2_mid", "damage_position_3_offlane"],
      purchasePhase: "neutral_drop",
      weights: {
        core: 90,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 90,
        tempo: 45,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["armor_reduction", "attack_speed", "lifesteal", "right_click_cores"],
        badWith: ["low_attack_uptime_supports"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i168_t1_faded_amulet"
  },
  {
    id: "i169_t1_lance_token",
    archetype: "lança neutra de alcance curto",
    category: "neutral_tier_1",
    slot: "neutral",
    shopTier: "neutral",
    cost: 0,
    recipeCost: 0,
    components: [],
    tags: ["neutral", "tier_1", "range", "ranged"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 6,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 75,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i169_t1_lance_token_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          damage: 6,
          attackRangeRangedOnly: 75
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "t1_lance_token_effect",
        kind: "passive",
        target: "self",
        tags: ["range", "ranged"],
        values: {
          tier: 1,
          cooldown: 0
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "neutral_slot",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: false,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: true,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "neutral_flex",
      recommendedRoles: ["all_positions"],
      purchasePhase: "neutral_drop",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: [],
        badWith: [],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i169_t1_lance_token"
  },
  {
    id: "i170_t1_broom_charm",
    archetype: "talismã neutro de armadura, dano e visão noturna",
    category: "neutral_tier_1",
    slot: "neutral",
    shopTier: "neutral",
    cost: 0,
    recipeCost: 0,
    components: [],
    tags: ["neutral", "tier_1", "vision", "armor"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 8,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 3,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 200
      }
    },
    effects: [
      {
        id: "i170_t1_broom_charm_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          damage: 8,
          armor: 3,
          nightVision: 200
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "t1_broom_charm_effect",
        kind: "passive",
        target: "self",
        tags: ["vision", "armor"],
        values: {
          tier: 1,
          cooldown: 0
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "neutral_slot",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: false,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: true,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "neutral_core_damage",
      recommendedRoles: ["position_1_carry", "position_2_mid", "damage_position_3_offlane"],
      purchasePhase: "neutral_drop",
      weights: {
        core: 90,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 90,
        tempo: 45,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["armor_reduction", "attack_speed", "lifesteal", "right_click_cores"],
        badWith: ["low_attack_uptime_supports"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i170_t1_broom_charm"
  },
  {
    id: "i171_t1_survival_pouch",
    archetype: "bolsa neutra de vida e regeneração",
    category: "neutral_tier_1",
    slot: "neutral",
    shopTier: "neutral",
    cost: 0,
    recipeCost: 0,
    components: [],
    tags: ["neutral", "tier_1", "health", "regen"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 120,
        maxMana: 0,
        healthRegen: 3,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i171_t1_survival_pouch_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          maxHealth: 120,
          healthRegen: 3
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "t1_survival_pouch_effect",
        kind: "passive",
        target: "self",
        tags: ["health", "regen"],
        values: {
          tier: 1,
          cooldown: 0
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "neutral_slot",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: false,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: true,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "neutral_defensive",
      recommendedRoles: ["position_3_offlane", "position_4_soft_support", "position_5_hard_support"],
      purchasePhase: "neutral_drop",
      weights: {
        core: 35,
        support: 35,
        offlane: 80,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["anti_burst", "save_play", "supports"],
        badWith: [],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i171_t1_survival_pouch"
  },
  {
    id: "i172_t2_vambrace_generic",
    archetype: "bracelete neutro que alterna atributo dominante",
    category: "neutral_tier_2",
    slot: "neutral",
    shopTier: "neutral",
    cost: 0,
    recipeCost: 0,
    components: [],
    tags: ["neutral", "tier_2", "attributes", "toggle"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 12,
        primaryAttribute: 0,
        secondaryAttributes: 6
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i172_t2_vambrace_generic_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          selectedAttribute: 12,
          secondaryAttributes: 6
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "t2_vambrace_generic_effect",
        kind: "passive",
        target: "self",
        tags: ["attributes", "toggle"],
        values: {
          tier: 2,
          cooldown: 0
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "neutral_slot",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: false,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: true,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "neutral_flex",
      recommendedRoles: ["all_positions"],
      purchasePhase: "neutral_drop",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: [],
        badWith: [],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i172_t2_vambrace_generic"
  },
  {
    id: "i173_t2_dragon_scale",
    archetype: "escama neutra de armadura e dano por ataque",
    category: "neutral_tier_2",
    slot: "neutral",
    shopTier: "neutral",
    cost: 0,
    recipeCost: 0,
    components: [],
    tags: ["neutral", "tier_2", "armor", "dot_attack"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 5,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 5,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i173_t2_dragon_scale_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          healthRegen: 5,
          armor: 5
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "t2_dragon_scale_effect",
        kind: "passive",
        target: "self",
        tags: ["armor", "dot_attack"],
        values: {
          tier: 2,
          cooldown: 0
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "neutral_slot",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: false,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: true,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "neutral_core_damage",
      recommendedRoles: ["position_1_carry", "position_2_mid", "damage_position_3_offlane"],
      purchasePhase: "neutral_drop",
      weights: {
        core: 90,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 90,
        tempo: 45,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["armor_reduction", "attack_speed", "lifesteal", "right_click_cores"],
        badWith: ["low_attack_uptime_supports"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i173_t2_dragon_scale"
  },
  {
    id: "i174_t2_pupil_gift",
    archetype: "presente neutro para atributos secundários",
    category: "neutral_tier_2",
    slot: "neutral",
    shopTier: "neutral",
    cost: 0,
    recipeCost: 0,
    components: [],
    tags: ["neutral", "tier_2", "attributes", "scaling"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 14
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i174_t2_pupil_gift_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          secondaryAttributes: 14
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "t2_pupil_gift_effect",
        kind: "passive",
        target: "self",
        tags: ["attributes", "scaling"],
        values: {
          tier: 2,
          cooldown: 0
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "neutral_slot",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: false,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: true,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "neutral_flex",
      recommendedRoles: ["all_positions"],
      purchasePhase: "neutral_drop",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: [],
        badWith: [],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i174_t2_pupil_gift"
  },
  {
    id: "i175_t2_specialist_quiver",
    archetype: "aljava neutra de alcance e dano mágico periódico",
    category: "neutral_tier_2",
    slot: "neutral",
    shopTier: "neutral",
    cost: 0,
    recipeCost: 0,
    components: [],
    tags: ["neutral", "tier_2", "range", "proc_damage"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 100,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i175_t2_specialist_quiver_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          attackRangeRangedOnly: 100
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "t2_specialist_quiver_effect",
        kind: "passive",
        target: "self",
        tags: ["range", "proc_damage"],
        values: {
          tier: 2,
          cooldown: 0
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "neutral_slot",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: false,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: true,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "neutral_core_damage",
      recommendedRoles: ["position_1_carry", "position_2_mid", "damage_position_3_offlane"],
      purchasePhase: "neutral_drop",
      weights: {
        core: 90,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 90,
        tempo: 45,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["armor_reduction", "attack_speed", "lifesteal", "right_click_cores"],
        badWith: ["low_attack_uptime_supports"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i175_t2_specialist_quiver"
  },
  {
    id: "i176_t2_bullwhip_generic",
    archetype: "chicote neutro de velocidade em alvo",
    category: "neutral_tier_2",
    slot: "neutral",
    shopTier: "neutral",
    cost: 0,
    recipeCost: 0,
    components: [],
    tags: ["neutral", "tier_2", "movement", "utility"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 4,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 2,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i176_t2_bullwhip_generic_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          healthRegen: 4,
          manaRegen: 2
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "t2_bullwhip_generic_effect",
        kind: "passive",
        target: "self",
        tags: ["movement", "utility"],
        values: {
          tier: 2,
          cooldown: 0
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "neutral_slot",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: false,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: true,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "neutral_flex",
      recommendedRoles: ["all_positions"],
      purchasePhase: "neutral_drop",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: [],
        badWith: [],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i176_t2_bullwhip_generic"
  },
  {
    id: "i177_t2_orb_destruction",
    archetype: "orbe neutro de redução de armadura e slow",
    category: "neutral_tier_2",
    slot: "neutral",
    shopTier: "neutral",
    cost: 0,
    recipeCost: 0,
    components: [],
    tags: ["neutral", "tier_2", "armor_reduction", "slow"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 10,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i177_t2_orb_destruction_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          damage: 10
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "t2_orb_destruction_effect",
        kind: "passive",
        target: "self",
        tags: ["armor_reduction", "slow"],
        values: {
          tier: 2,
          cooldown: 0
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "neutral_slot",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: false,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: true,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "neutral_defensive",
      recommendedRoles: ["position_3_offlane", "position_4_soft_support", "position_5_hard_support"],
      purchasePhase: "neutral_drop",
      weights: {
        core: 35,
        support: 35,
        offlane: 80,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: [],
        badWith: [],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i177_t2_orb_destruction"
  },
  {
    id: "i178_t3_titan_sliver",
    archetype: "fragmento neutro de dano, resistência e status",
    category: "neutral_tier_3",
    slot: "neutral",
    shopTier: "neutral",
    cost: 0,
    recipeCost: 0,
    components: [],
    tags: ["neutral", "tier_3", "damage", "resistance"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 16,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 16,
        statusResistancePct: 16,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i178_t3_titan_sliver_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          damagePct: 16,
          magicResistancePct: 16,
          statusResistancePct: 16
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "t3_titan_sliver_effect",
        kind: "passive",
        target: "self",
        tags: ["damage", "resistance"],
        values: {
          tier: 3,
          cooldown: 0
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: true,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "neutral_slot",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: false,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: true,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "neutral_core_damage",
      recommendedRoles: ["position_1_carry", "position_2_mid", "damage_position_3_offlane"],
      purchasePhase: "neutral_drop",
      weights: {
        core: 90,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 90,
        tempo: 45,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["armor_reduction", "attack_speed", "lifesteal", "right_click_cores"],
        badWith: ["low_attack_uptime_supports"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i178_t3_titan_sliver"
  },
  {
    id: "i179_t3_elven_tunic",
    archetype: "túnica neutra de evasão, movimento e ataque",
    category: "neutral_tier_3",
    slot: "neutral",
    shopTier: "neutral",
    cost: 0,
    recipeCost: 0,
    components: [],
    tags: ["neutral", "tier_3", "evasion", "attack_speed"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 30,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 16,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 8,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i179_t3_elven_tunic_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          attackSpeed: 30,
          evasionPct: 16,
          movementSpeedPct: 8
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "t3_elven_tunic_effect",
        kind: "passive",
        target: "self",
        tags: ["evasion", "attack_speed"],
        values: {
          tier: 3,
          cooldown: 0
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "neutral_slot",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: false,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: true,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "neutral_core_damage",
      recommendedRoles: ["position_1_carry", "position_2_mid", "damage_position_3_offlane"],
      purchasePhase: "neutral_drop",
      weights: {
        core: 90,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 90,
        tempo: 45,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["armor_reduction", "attack_speed", "lifesteal", "right_click_cores"],
        badWith: ["enemy_true_strike", "low_attack_uptime_supports"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i179_t3_elven_tunic"
  },
  {
    id: "i180_t3_ceremonial_robe",
    archetype: "robe neutro de aura contra mana e status inimigo",
    category: "neutral_tier_3",
    slot: "neutral",
    shopTier: "neutral",
    cost: 0,
    recipeCost: 0,
    components: [],
    tags: ["neutral", "tier_3", "aura", "debuff"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 350,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i180_t3_ceremonial_robe_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          maxMana: 350
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "t3_ceremonial_robe_effect",
        kind: "passive",
        target: "self",
        tags: ["aura", "debuff"],
        values: {
          tier: 3,
          cooldown: 0
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: true,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "aura_generic",
      stackMode: "max_value_only",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: false,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: true,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "neutral_caster",
      recommendedRoles: ["position_2_mid", "position_4_soft_support", "position_5_hard_support"],
      purchasePhase: "neutral_drop",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 85,
        rightClick: 30,
        tempo: 45,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["cooldown_reduction", "magic_burst", "mana_sustain", "spell_amp"],
        badWith: ["mana_independent_right_clickers"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i180_t3_ceremonial_robe"
  },
  {
    id: "i181_t3_psychic_headband",
    archetype: "tiara neutra de inteligência, alcance e empurrão",
    category: "neutral_tier_3",
    slot: "neutral",
    shopTier: "neutral",
    cost: 0,
    recipeCost: 0,
    components: [],
    tags: ["neutral", "tier_3", "cast_range", "displacement"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 16,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 100,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i181_t3_psychic_headband_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          intelligence: 16,
          castRange: 100
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "t3_psychic_headband_effect",
        kind: "passive",
        target: "self",
        tags: ["cast_range", "displacement"],
        values: {
          tier: 3,
          cooldown: 0
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "neutral_slot",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: false,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: true,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "neutral_caster",
      recommendedRoles: ["position_2_mid", "position_4_soft_support", "position_5_hard_support"],
      purchasePhase: "neutral_drop",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 85,
        rightClick: 30,
        tempo: 45,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["cooldown_reduction", "magic_burst", "mana_sustain", "spell_amp"],
        badWith: ["mana_independent_right_clickers"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i181_t3_psychic_headband"
  },
  {
    id: "i182_t3_quickening_charm",
    archetype: "amuleto neutro de redução de recarga",
    category: "neutral_tier_3",
    slot: "neutral",
    shopTier: "neutral",
    cost: 0,
    recipeCost: 0,
    components: [],
    tags: ["neutral", "tier_3", "cooldown"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 13,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i182_t3_quickening_charm_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          cooldownReductionPct: 13
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "t3_quickening_charm_effect",
        kind: "passive",
        target: "self",
        tags: ["cooldown"],
        values: {
          tier: 3,
          cooldown: 0
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "neutral_slot",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: false,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: true,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "neutral_flex",
      recommendedRoles: ["all_positions"],
      purchasePhase: "neutral_drop",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: [],
        badWith: [],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i182_t3_quickening_charm"
  },
  {
    id: "i183_t3_paladin_sword",
    archetype: "espada neutra de dano e amplificação de cura",
    category: "neutral_tier_3",
    slot: "neutral",
    shopTier: "neutral",
    cost: 0,
    recipeCost: 0,
    components: [],
    tags: ["neutral", "tier_3", "lifesteal", "heal_amp"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 20,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 16,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 14,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i183_t3_paladin_sword_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          damage: 20,
          lifestealPct: 16,
          healAmpPct: 14
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "t3_paladin_sword_effect",
        kind: "passive",
        target: "self",
        tags: ["lifesteal", "heal_amp"],
        values: {
          tier: 3,
          cooldown: 0
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "neutral_slot",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: false,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: true,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "neutral_core_damage",
      recommendedRoles: ["position_1_carry", "position_2_mid", "damage_position_3_offlane"],
      purchasePhase: "neutral_drop",
      weights: {
        core: 90,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 90,
        tempo: 45,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["anti_burst", "armor_reduction", "attack_speed", "lifesteal", "right_click_cores", "save_play", "supports"],
        badWith: ["low_attack_uptime_supports"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i183_t3_paladin_sword"
  },
  {
    id: "i184_t4_spell_prism",
    archetype: "prisma neutro de recarga e atributos",
    category: "neutral_tier_4",
    slot: "neutral",
    shopTier: "neutral",
    cost: 0,
    recipeCost: 0,
    components: [],
    tags: ["neutral", "tier_4", "cooldown", "attributes"],
    stats: {
      attributes: {
        strength: 8,
        agility: 8,
        intelligence: 8,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 12,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i184_t4_spell_prism_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          strength: 8,
          agility: 8,
          intelligence: 8,
          cooldownReductionPct: 12
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "t4_spell_prism_effect",
        kind: "passive",
        target: "self",
        tags: ["cooldown", "attributes"],
        values: {
          tier: 4,
          cooldown: 0
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "neutral_slot",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: false,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: true,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "neutral_caster",
      recommendedRoles: ["position_2_mid", "position_4_soft_support", "position_5_hard_support"],
      purchasePhase: "neutral_drop",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 85,
        rightClick: 30,
        tempo: 45,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["cooldown_reduction", "magic_burst", "mana_sustain", "spell_amp"],
        badWith: ["mana_independent_right_clickers"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i184_t4_spell_prism"
  },
  {
    id: "i185_t4_ninja_gear",
    archetype: "equipamento neutro de agilidade e fumaça pessoal",
    category: "neutral_tier_4",
    slot: "neutral",
    shopTier: "neutral",
    cost: 0,
    recipeCost: 0,
    components: [],
    tags: ["neutral", "tier_4", "stealth", "agility"],
    stats: {
      attributes: {
        strength: 0,
        agility: 24,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 30,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i185_t4_ninja_gear_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          agility: 24,
          movementSpeed: 30
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "t4_ninja_gear_effect",
        kind: "passive",
        target: "self",
        tags: ["stealth", "agility"],
        values: {
          tier: 4,
          cooldown: 0
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "neutral_slot",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: false,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: true,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "neutral_core_damage",
      recommendedRoles: ["position_1_carry", "position_2_mid", "damage_position_3_offlane"],
      purchasePhase: "neutral_drop",
      weights: {
        core: 90,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 90,
        tempo: 45,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["armor_reduction", "attack_speed", "lifesteal", "right_click_cores"],
        badWith: ["enemy_true_sight_heavy_games", "low_attack_uptime_supports"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i185_t4_ninja_gear"
  },
  {
    id: "i186_t4_trickster_cloak",
    archetype: "manto neutro de evasão e resistência mágica",
    category: "neutral_tier_4",
    slot: "neutral",
    shopTier: "neutral",
    cost: 0,
    recipeCost: 0,
    components: [],
    tags: ["neutral", "tier_4", "evasion", "magic_resistance"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 20,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 20,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i186_t4_trickster_cloak_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          magicResistancePct: 20,
          evasionPct: 20
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "t4_trickster_cloak_effect",
        kind: "passive",
        target: "self",
        tags: ["evasion", "magic_resistance"],
        values: {
          tier: 4,
          cooldown: 0
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "neutral_slot",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: false,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: true,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "neutral_defensive",
      recommendedRoles: ["position_3_offlane", "position_4_soft_support", "position_5_hard_support"],
      purchasePhase: "neutral_drop",
      weights: {
        core: 35,
        support: 35,
        offlane: 80,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: [],
        badWith: ["enemy_true_strike"],
        counters: ["aoe_magic_damage", "magic_burst"]
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i186_t4_trickster_cloak"
  },
  {
    id: "i187_t4_stormcrafter",
    archetype: "núcleo neutro de tempestade e dissipação",
    category: "neutral_tier_4",
    slot: "neutral",
    shopTier: "neutral",
    cost: 0,
    recipeCost: 0,
    components: [],
    tags: ["neutral", "tier_4", "dispel", "magic_damage"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 4,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 35,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i187_t4_stormcrafter_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          manaRegen: 4,
          movementSpeed: 35
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "t4_stormcrafter_effect",
        kind: "passive",
        target: "self",
        tags: ["dispel", "magic_damage"],
        values: {
          tier: 4,
          cooldown: 0
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "neutral_slot",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: false,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: true,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "neutral_flex",
      recommendedRoles: ["all_positions"],
      purchasePhase: "neutral_drop",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["anti_burst", "armor_reduction", "attack_speed", "lifesteal", "right_click_cores", "save_play", "supports"],
        badWith: ["low_attack_uptime_supports"],
        counters: ["damage_over_time", "root", "silence", "slow"]
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i187_t4_stormcrafter"
  },
  {
    id: "i188_t4_ancient_guardian",
    archetype: "guardião neutro de defesa perto de estruturas",
    category: "neutral_tier_4",
    slot: "neutral",
    shopTier: "neutral",
    cost: 0,
    recipeCost: 0,
    components: [],
    tags: ["neutral", "tier_4", "defense", "objective"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 12,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 12,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i188_t4_ancient_guardian_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          healthRegen: 12,
          armor: 12
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "t4_ancient_guardian_effect",
        kind: "passive",
        target: "self",
        tags: ["defense", "objective"],
        values: {
          tier: 4,
          cooldown: 0
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "neutral_slot",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: false,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: true,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "neutral_flex",
      recommendedRoles: ["all_positions"],
      purchasePhase: "neutral_drop",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: [],
        badWith: [],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i188_t4_ancient_guardian"
  },
  {
    id: "i189_t4_timeless_relic",
    archetype: "relíquia neutra de amplificação mágica e duração de debuff",
    category: "neutral_tier_4",
    slot: "neutral",
    shopTier: "neutral",
    cost: 0,
    recipeCost: 0,
    components: [],
    tags: ["neutral", "tier_4", "spell_amp", "debuff"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 15,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 20,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i189_t4_timeless_relic_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          spellAmpPct: 15,
          debuffDurationPct: 20
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "t4_timeless_relic_effect",
        kind: "passive",
        target: "self",
        tags: ["spell_amp", "debuff"],
        values: {
          tier: 4,
          cooldown: 0
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "neutral_slot",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: false,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: true,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "neutral_caster",
      recommendedRoles: ["position_2_mid", "position_4_soft_support", "position_5_hard_support"],
      purchasePhase: "neutral_drop",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 85,
        rightClick: 30,
        tempo: 45,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["cooldown_reduction", "magic_burst", "mana_sustain", "spell_amp"],
        badWith: ["mana_independent_right_clickers"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i189_t4_timeless_relic"
  },
  {
    id: "i190_t5_apex_shard",
    archetype: "ápice neutro de atributo primário",
    category: "neutral_tier_5",
    slot: "neutral",
    shopTier: "neutral",
    cost: 0,
    recipeCost: 0,
    components: [],
    tags: ["neutral", "tier_5", "primary_attribute", "scaling"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 70,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i190_t5_apex_shard_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          primaryAttribute: 70
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "t5_apex_shard_effect",
        kind: "passive",
        target: "self",
        tags: ["primary_attribute", "scaling"],
        values: {
          tier: 5,
          cooldown: 0
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "neutral_slot",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: false,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: true,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "neutral_flex",
      recommendedRoles: ["all_positions"],
      purchasePhase: "neutral_drop",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 85,
        mapUtility: 25
      },
      synergy: {
        greatWith: [],
        badWith: [],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i190_t5_apex_shard"
  },
  {
    id: "i191_t5_force_boots",
    archetype: "botas neutras de velocidade extrema e dissipação",
    category: "neutral_tier_5",
    slot: "neutral",
    shopTier: "neutral",
    cost: 0,
    recipeCost: 0,
    components: [],
    tags: ["neutral", "tier_5", "movement", "dispel"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 30,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 115,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i191_t5_force_boots_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          healthRegen: 30,
          movementSpeed: 115
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "t5_force_boots_effect",
        kind: "passive",
        target: "self",
        tags: ["movement", "dispel"],
        values: {
          tier: 5,
          cooldown: 0
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "neutral_slot",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: false,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: true,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "neutral_flex",
      recommendedRoles: ["all_positions"],
      purchasePhase: "neutral_drop",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 85,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["anti_burst", "save_play", "supports"],
        badWith: [],
        counters: ["damage_over_time", "root", "silence", "slow"]
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i191_t5_force_boots"
  },
  {
    id: "i192_t5_mirror_shield",
    archetype: "escudo neutro de bloqueio e reflexo de magia",
    category: "neutral_tier_5",
    slot: "neutral",
    shopTier: "neutral",
    cost: 0,
    recipeCost: 0,
    components: [],
    tags: ["neutral", "tier_5", "spell_block", "reflect"],
    stats: {
      attributes: {
        strength: 16,
        agility: 16,
        intelligence: 16,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i192_t5_mirror_shield_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          strength: 16,
          agility: 16,
          intelligence: 16
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "t5_mirror_shield_effect",
        kind: "passive",
        target: "self",
        tags: ["spell_block", "reflect"],
        values: {
          tier: 5,
          cooldown: 0
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "neutral_slot",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: false,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: true,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "neutral_caster",
      recommendedRoles: ["position_2_mid", "position_4_soft_support", "position_5_hard_support"],
      purchasePhase: "neutral_drop",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 85,
        rightClick: 30,
        tempo: 45,
        lateGame: 85,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["cooldown_reduction", "magic_burst", "mana_sustain", "spell_amp"],
        badWith: ["mana_independent_right_clickers"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i192_t5_mirror_shield"
  },
  {
    id: "i193_t5_fallen_sky",
    archetype: "meteorito neutro de teleporte curto e impacto",
    category: "neutral_tier_5",
    slot: "neutral",
    shopTier: "neutral",
    cost: 0,
    recipeCost: 0,
    components: [],
    tags: ["neutral", "tier_5", "blink", "stun"],
    stats: {
      attributes: {
        strength: 20,
        agility: 0,
        intelligence: 20,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 15,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 10,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i193_t5_fallen_sky_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          strength: 20,
          intelligence: 20,
          healthRegen: 15,
          manaRegen: 10
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "t5_fallen_sky_effect",
        kind: "passive",
        target: "self",
        tags: ["blink", "stun"],
        values: {
          tier: 5,
          cooldown: 0
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "neutral_slot",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: false,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: true,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "neutral_flex",
      recommendedRoles: ["all_positions"],
      purchasePhase: "neutral_drop",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 85,
        mapUtility: 25
      },
      synergy: {
        greatWith: [],
        badWith: [],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i193_t5_fallen_sky"
  },
  {
    id: "i194_t5_desolator_core",
    archetype: "núcleo neutro de dano acumulativo por abate",
    category: "neutral_tier_5",
    slot: "neutral",
    shopTier: "neutral",
    cost: 0,
    recipeCost: 0,
    components: [],
    tags: ["neutral", "tier_5", "damage", "snowball"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 60,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i194_t5_desolator_core_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          damage: 60
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "t5_desolator_core_effect",
        kind: "passive",
        target: "self",
        tags: ["damage", "snowball"],
        values: {
          tier: 5,
          cooldown: 0
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: true,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "neutral_slot",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: false,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: true,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "neutral_core_damage",
      recommendedRoles: ["position_1_carry", "position_2_mid", "damage_position_3_offlane"],
      purchasePhase: "neutral_drop",
      weights: {
        core: 90,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 90,
        tempo: 45,
        lateGame: 85,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["armor_reduction", "attack_speed", "lifesteal", "right_click_cores"],
        badWith: ["low_attack_uptime_supports"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i194_t5_desolator_core"
  },
  {
    id: "i195_t5_pirate_hat",
    archetype: "chapéu neutro de ataque extremo e ouro",
    category: "neutral_tier_5",
    slot: "neutral",
    shopTier: "neutral",
    cost: 0,
    recipeCost: 0,
    components: [],
    tags: ["neutral", "tier_5", "attack_speed", "economy"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 150,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i195_t5_pirate_hat_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          attackSpeed: 150
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "t5_pirate_hat_effect",
        kind: "passive",
        target: "self",
        tags: ["attack_speed", "economy"],
        values: {
          tier: 5,
          cooldown: 0
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "neutral_slot",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: false,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: true,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "neutral_core_damage",
      recommendedRoles: ["position_1_carry", "position_2_mid", "damage_position_3_offlane"],
      purchasePhase: "neutral_drop",
      weights: {
        core: 90,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 90,
        tempo: 45,
        lateGame: 85,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["armor_reduction", "attack_speed", "lifesteal", "right_click_cores"],
        badWith: ["low_attack_uptime_supports"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i195_t5_pirate_hat"
  },
  {
    id: "i196_e001_mighty",
    archetype: "encantamento de força",
    category: "neutral_enchantment",
    slot: "neutral_enchantment",
    shopTier: "neutral",
    cost: 0,
    recipeCost: 0,
    components: [],
    tags: ["neutral_enchantment", "strength"],
    stats: {
      attributes: {
        strength: 8,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i196_e001_mighty_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          strength: 8
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "e001_mighty_enchant",
        kind: "enchantment",
        target: "self",
        tags: ["strength"],
        values: {
          canAttachTo: "neutral_artifact",
          cooldown: 0
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "neutral_slot",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: false,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: true,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "neutral_enchantment",
      recommendedRoles: ["neutral_slot_owner_by_stat_need"],
      purchasePhase: "neutral_drop",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: [],
        badWith: [],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i196_e001_mighty"
  },
  {
    id: "i197_e002_swift",
    archetype: "encantamento de agilidade",
    category: "neutral_enchantment",
    slot: "neutral_enchantment",
    shopTier: "neutral",
    cost: 0,
    recipeCost: 0,
    components: [],
    tags: ["neutral_enchantment", "agility"],
    stats: {
      attributes: {
        strength: 0,
        agility: 8,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i197_e002_swift_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          agility: 8
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "e002_swift_enchant",
        kind: "enchantment",
        target: "self",
        tags: ["agility"],
        values: {
          canAttachTo: "neutral_artifact",
          cooldown: 0
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "neutral_slot",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: false,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: true,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "neutral_enchantment",
      recommendedRoles: ["neutral_slot_owner_by_stat_need"],
      purchasePhase: "neutral_drop",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: [],
        badWith: [],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i197_e002_swift"
  },
  {
    id: "i198_e003_sage",
    archetype: "encantamento de inteligência",
    category: "neutral_enchantment",
    slot: "neutral_enchantment",
    shopTier: "neutral",
    cost: 0,
    recipeCost: 0,
    components: [],
    tags: ["neutral_enchantment", "intelligence"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 8,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i198_e003_sage_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          intelligence: 8
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "e003_sage_enchant",
        kind: "enchantment",
        target: "self",
        tags: ["intelligence"],
        values: {
          canAttachTo: "neutral_artifact",
          cooldown: 0
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "neutral_slot",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: false,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: true,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "neutral_enchantment",
      recommendedRoles: ["neutral_slot_owner_by_stat_need"],
      purchasePhase: "neutral_drop",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["cooldown_reduction", "magic_burst", "mana_sustain", "spell_amp"],
        badWith: ["mana_independent_right_clickers"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i198_e003_sage"
  },
  {
    id: "i199_e004_sturdy",
    archetype: "encantamento de vida",
    category: "neutral_enchantment",
    slot: "neutral_enchantment",
    shopTier: "neutral",
    cost: 0,
    recipeCost: 0,
    components: [],
    tags: ["neutral_enchantment", "health"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 180,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i199_e004_sturdy_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          maxHealth: 180
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "e004_sturdy_enchant",
        kind: "enchantment",
        target: "self",
        tags: ["health"],
        values: {
          canAttachTo: "neutral_artifact",
          cooldown: 0
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "neutral_slot",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: false,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: true,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "neutral_enchantment",
      recommendedRoles: ["neutral_slot_owner_by_stat_need"],
      purchasePhase: "neutral_drop",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["anti_burst", "save_play", "supports"],
        badWith: [],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i199_e004_sturdy"
  },
  {
    id: "i200_e005_fleet",
    archetype: "encantamento de movimento",
    category: "neutral_enchantment",
    slot: "neutral_enchantment",
    shopTier: "neutral",
    cost: 0,
    recipeCost: 0,
    components: [],
    tags: ["neutral_enchantment", "movement"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 25,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i200_e005_fleet_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          movementSpeed: 25
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "e005_fleet_enchant",
        kind: "enchantment",
        target: "self",
        tags: ["movement"],
        values: {
          canAttachTo: "neutral_artifact",
          cooldown: 0
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "neutral_slot",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: false,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: true,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "neutral_enchantment",
      recommendedRoles: ["neutral_slot_owner_by_stat_need"],
      purchasePhase: "neutral_drop",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: [],
        badWith: [],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i200_e005_fleet"
  },
  {
    id: "i201_e006_sharp",
    archetype: "encantamento de dano",
    category: "neutral_enchantment",
    slot: "neutral_enchantment",
    shopTier: "neutral",
    cost: 0,
    recipeCost: 0,
    components: [],
    tags: ["neutral_enchantment", "damage"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 18,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i201_e006_sharp_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          damage: 18
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "e006_sharp_enchant",
        kind: "enchantment",
        target: "self",
        tags: ["damage"],
        values: {
          canAttachTo: "neutral_artifact",
          cooldown: 0
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: true,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "neutral_slot",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: false,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: true,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "neutral_enchantment",
      recommendedRoles: ["neutral_slot_owner_by_stat_need"],
      purchasePhase: "neutral_drop",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["armor_reduction", "attack_speed", "lifesteal", "right_click_cores"],
        badWith: ["low_attack_uptime_supports"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i201_e006_sharp"
  },
  {
    id: "i202_e007_hardened",
    archetype: "encantamento de armadura",
    category: "neutral_enchantment",
    slot: "neutral_enchantment",
    shopTier: "neutral",
    cost: 0,
    recipeCost: 0,
    components: [],
    tags: ["neutral_enchantment", "armor"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 6,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i202_e007_hardened_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          armor: 6
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "e007_hardened_enchant",
        kind: "enchantment",
        target: "self",
        tags: ["armor"],
        values: {
          canAttachTo: "neutral_artifact",
          cooldown: 0
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "neutral_slot",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: false,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: true,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "neutral_enchantment",
      recommendedRoles: ["neutral_slot_owner_by_stat_need"],
      purchasePhase: "neutral_drop",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: [],
        badWith: [],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i202_e007_hardened"
  },
  {
    id: "i203_e008_warded",
    archetype: "encantamento de resistência mágica",
    category: "neutral_enchantment",
    slot: "neutral_enchantment",
    shopTier: "neutral",
    cost: 0,
    recipeCost: 0,
    components: [],
    tags: ["neutral_enchantment", "magic_resistance"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 12,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i203_e008_warded_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          magicResistancePct: 12
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "e008_warded_enchant",
        kind: "enchantment",
        target: "self",
        tags: ["magic_resistance"],
        values: {
          canAttachTo: "neutral_artifact",
          cooldown: 0
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "neutral_slot",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: false,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: true,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "neutral_enchantment",
      recommendedRoles: ["neutral_slot_owner_by_stat_need"],
      purchasePhase: "neutral_drop",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: [],
        badWith: [],
        counters: ["aoe_magic_damage", "magic_burst"]
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i203_e008_warded"
  },
  {
    id: "i204_e009_focused",
    archetype: "encantamento de alcance de conjuração",
    category: "neutral_enchantment",
    slot: "neutral_enchantment",
    shopTier: "neutral",
    cost: 0,
    recipeCost: 0,
    components: [],
    tags: ["neutral_enchantment", "cast_range"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 75,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i204_e009_focused_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          castRange: 75
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "e009_focused_enchant",
        kind: "enchantment",
        target: "self",
        tags: ["cast_range"],
        values: {
          canAttachTo: "neutral_artifact",
          cooldown: 0
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "neutral_slot",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: false,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: true,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "neutral_enchantment",
      recommendedRoles: ["neutral_slot_owner_by_stat_need"],
      purchasePhase: "neutral_drop",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: [],
        badWith: [],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i204_e009_focused"
  },
  {
    id: "i205_e010_vampiric",
    archetype: "encantamento de roubo de vida",
    category: "neutral_enchantment",
    slot: "neutral_enchantment",
    shopTier: "neutral",
    cost: 0,
    recipeCost: 0,
    components: [],
    tags: ["neutral_enchantment", "lifesteal"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 12,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i205_e010_vampiric_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          lifestealPct: 12
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "e010_vampiric_enchant",
        kind: "enchantment",
        target: "self",
        tags: ["lifesteal"],
        values: {
          canAttachTo: "neutral_artifact",
          cooldown: 0
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "neutral_slot",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: false,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: true,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "neutral_enchantment",
      recommendedRoles: ["neutral_slot_owner_by_stat_need"],
      purchasePhase: "neutral_drop",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["armor_reduction", "attack_speed", "lifesteal", "right_click_cores"],
        badWith: ["low_attack_uptime_supports"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i205_e010_vampiric"
  },
  {
    id: "i206_e011_arcane",
    archetype: "encantamento de mana",
    category: "neutral_enchantment",
    slot: "neutral_enchantment",
    shopTier: "neutral",
    cost: 0,
    recipeCost: 0,
    components: [],
    tags: ["neutral_enchantment", "mana"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 180,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 1.5,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i206_e011_arcane_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          maxMana: 180,
          manaRegen: 1.5
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "e011_arcane_enchant",
        kind: "enchantment",
        target: "self",
        tags: ["mana"],
        values: {
          canAttachTo: "neutral_artifact",
          cooldown: 0
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "neutral_slot",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: false,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: true,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "neutral_enchantment",
      recommendedRoles: ["neutral_slot_owner_by_stat_need"],
      purchasePhase: "neutral_drop",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["cooldown_reduction", "magic_burst", "mana_sustain", "spell_amp"],
        badWith: ["mana_independent_right_clickers"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i206_e011_arcane"
  },
  {
    id: "i207_e012_hasty",
    archetype: "encantamento de velocidade de ataque",
    category: "neutral_enchantment",
    slot: "neutral_enchantment",
    shopTier: "neutral",
    cost: 0,
    recipeCost: 0,
    components: [],
    tags: ["neutral_enchantment", "attack_speed"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 25,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i207_e012_hasty_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          attackSpeed: 25
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "e012_hasty_enchant",
        kind: "enchantment",
        target: "self",
        tags: ["attack_speed"],
        values: {
          canAttachTo: "neutral_artifact",
          cooldown: 0
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "neutral_slot",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: false,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: true,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "neutral_enchantment",
      recommendedRoles: ["neutral_slot_owner_by_stat_need"],
      purchasePhase: "neutral_drop",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["armor_reduction", "attack_speed", "lifesteal", "right_click_cores"],
        badWith: ["low_attack_uptime_supports"],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i207_e012_hasty"
  },
  {
    id: "i208_e013_resolute",
    archetype: "encantamento de resistência de status",
    category: "neutral_enchantment",
    slot: "neutral_enchantment",
    shopTier: "neutral",
    cost: 0,
    recipeCost: 0,
    components: [],
    tags: ["neutral_enchantment", "status_resistance"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 10,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i208_e013_resolute_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          statusResistancePct: 10
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "e013_resolute_enchant",
        kind: "enchantment",
        target: "self",
        tags: ["status_resistance"],
        values: {
          canAttachTo: "neutral_artifact",
          cooldown: 0
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "neutral_slot",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: false,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: true,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "neutral_enchantment",
      recommendedRoles: ["neutral_slot_owner_by_stat_need"],
      purchasePhase: "neutral_drop",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: [],
        badWith: [],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i208_e013_resolute"
  },
  {
    id: "i209_e014_restorative",
    archetype: "encantamento de cura recebida",
    category: "neutral_enchantment",
    slot: "neutral_enchantment",
    shopTier: "neutral",
    cost: 0,
    recipeCost: 0,
    components: [],
    tags: ["neutral_enchantment", "heal_amp"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 12,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 0
      }
    },
    effects: [
      {
        id: "i209_e014_restorative_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          healAmpPct: 12
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "e014_restorative_enchant",
        kind: "enchantment",
        target: "self",
        tags: ["heal_amp"],
        values: {
          canAttachTo: "neutral_artifact",
          cooldown: 0
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "neutral_slot",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: false,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: true,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "neutral_enchantment",
      recommendedRoles: ["neutral_slot_owner_by_stat_need"],
      purchasePhase: "neutral_drop",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: ["anti_burst", "save_play", "supports"],
        badWith: [],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i209_e014_restorative"
  },
  {
    id: "i210_e015_visionary",
    archetype: "encantamento de visão noturna",
    category: "neutral_enchantment",
    slot: "neutral_enchantment",
    shopTier: "neutral",
    cost: 0,
    recipeCost: 0,
    components: [],
    tags: ["neutral_enchantment", "vision"],
    stats: {
      attributes: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        allAttributes: 0,
        selectedAttribute: 0,
        primaryAttribute: 0,
        secondaryAttributes: 0
      },
      resources: {
        maxHealth: 0,
        maxMana: 0,
        healthRegen: 0,
        healthRegenPct: 0,
        healthRegenAmpPct: 0,
        manaRegen: 0,
        manaRegenAmpPct: 0
      },
      offense: {
        damage: 0,
        damagePct: 0,
        attackSpeed: 0,
        attackRangeMeleeOnly: 0,
        attackRangeRangedOnly: 0,
        spellAmpPct: 0,
        lifestealPct: 0,
        spellLifestealPct: 0,
        armorPierce: 0,
        critChancePct: 0,
        critMultiplierPct: 0
      },
      defense: {
        armor: 0,
        magicResistancePct: 0,
        statusResistancePct: 0,
        slowResistancePct: 0,
        evasionPct: 0,
        damageBlock: 0,
        physicalBarrier: 0,
        magicBarrier: 0
      },
      mobility: {
        movementSpeed: 0,
        movementSpeedPct: 0,
        turnRate: 0,
        phaseMovement: 0
      },
      utility: {
        castRange: 0,
        areaOfEffect: 0,
        cooldownReductionPct: 0,
        manaCostReductionPct: 0,
        healAmpPct: 0,
        debuffDurationPct: 0,
        dayVision: 0,
        nightVision: 350
      }
    },
    effects: [
      {
        id: "i210_e015_visionary_stat_bonus",
        kind: "passive",
        target: "self",
        tags: ["stat_bonus"],
        values: {
          nightVision: 350
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      },
      {
        id: "e015_visionary_enchant",
        kind: "enchantment",
        target: "self",
        tags: ["vision"],
        values: {
          canAttachTo: "neutral_artifact",
          cooldown: 0
        },
        rules: {
          dispellable: false,
          piercesDebuffImmunity: false,
          breaksInvisibility: false,
          affectsBuildings: false,
          canTargetAllies: false,
          canTargetEnemies: false
        }
      }
    ],
    stacking: {
      stackGroup: "neutral_slot",
      stackMode: "independent",
      uniqueByItemId: true
    },
    restrictions: {
      unique: true,
      shareable: false,
      droppable: true,
      sellable: false,
      consumedOnUse: false,
      requiresRangedHero: false,
      requiresMeleeHero: false,
      disabledOnIllusions: false,
      cannotBeBought: true,
      isRecipeComponentOnly: false
    },
    ai: {
      classification: "neutral_enchantment",
      recommendedRoles: ["neutral_slot_owner_by_stat_need"],
      purchasePhase: "neutral_drop",
      weights: {
        core: 35,
        support: 35,
        offlane: 45,
        caster: 35,
        rightClick: 30,
        tempo: 45,
        lateGame: 40,
        mapUtility: 25
      },
      synergy: {
        greatWith: [],
        badWith: [],
        counters: []
      },
      doNotBuyIf: [],
      buyIf: []
    },
    balanceNotes: ["v2 schema: stats are dense and grouped; zero means no bonus.", "Numbers are Dota-like manager values, not official patch-locked data."],
    sourceLegacyId: "i210_e015_visionary"
  }
];

export const FULL_ITEM_SEED_V2_COUNT = FULL_ITEM_SEEDS_V2.length;
