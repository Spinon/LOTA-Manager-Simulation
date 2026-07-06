// MOBA Manager - adapted item seed data inspired by the item ecosystem of Dota-like MOBAs.
// Intentional design choice: no official item names, lore, icons, or copyrighted wording.
// Use this as a starting database for Codex to implement shop, inventory, builds, neutral items, UI cards and later combat resolution.

export type ItemCategory =
  | "consumable"
  | "map_utility"
  | "component"
  | "early"
  | "boots"
  | "mid"
  | "late"
  | "support"
  | "economy"
  | "neutral_tier_1"
  | "neutral_tier_2"
  | "neutral_tier_3"
  | "neutral_tier_4"
  | "neutral_tier_5"
  | "neutral_enchantment";

export type ItemSlot = "inventory" | "consumable" | "component" | "neutral" | "neutral_enchantment";
export type ShopTier = "base" | "secret" | "neutral";

export type ItemEffectKind = "active" | "passive" | "toggle" | "aura" | "consumable" | "enchantment";
export type ItemEffectTarget = "self" | "unit" | "enemy" | "area" | "point" | "unit_or_structure";

export interface ItemStats {
  strength?: number;
  agility?: number;
  intelligence?: number;
  selectedAttribute?: number;
  secondaryAttributes?: number;
  primaryAttribute?: number;

  maxHealth?: number;
  healthRegen?: number;
  healthRegenPct?: number;
  healthRegenAmpPct?: number;
  maxMana?: number;
  manaRegen?: number;
  manaRegenAmpPct?: number;

  damage?: number;
  damagePct?: number;
  armor?: number;
  magicResistance?: number;
  statusResistance?: number;
  slowResistance?: number;
  evasion?: number;

  attackSpeed?: number;
  attackRangeRangedOnly?: number;
  movementSpeed?: number;
  movementSpeedPct?: number;
  castRange?: number;
  areaOfEffect?: number;
  cooldownReductionPct?: number;

  lifestealPct?: number;
  spellLifestealPct?: number;
  spellAmpPct?: number;
  healAmpPct?: number;
  debuffDurationPct?: number;

  dayVision?: number;
  nightVision?: number;
}

export interface ItemEffectSeed {
  id: string;
  kind: ItemEffectKind;
  target: ItemEffectTarget;
  tags: string[];
  values?: Record<string, number | string | boolean>;
}

export interface ItemSeed {
  id: string;
  archetype: string;
  category: ItemCategory;
  slot: ItemSlot;
  shopTier: ShopTier;
  cost: number;
  recipeCost?: number;
  components?: string[];
  tags: string[];
  stats?: ItemStats;
  effects?: ItemEffectSeed[];
  notes?: string;
}

export const ITEM_SEEDS: ItemSeed[] = [
  {
    "id": "i001_regen_rations",
    "archetype": "consumível de regeneração lenta de vida",
    "category": "consumable",
    "slot": "consumable",
    "shopTier": "base",
    "cost": 90,
    "tags": [
      "lane_sustain",
      "tree_interaction"
    ],
    "effects": [
      {
        "id": "eat_tree_regen",
        "kind": "consumable",
        "target": "self",
        "tags": [
          "heal_over_time"
        ],
        "values": {
          "charges": 3,
          "heal": 112,
          "duration": 16
        }
      }
    ]
  },
  {
    "id": "i002_healing_salve",
    "archetype": "consumível de cura intensa interrompível",
    "category": "consumable",
    "slot": "consumable",
    "shopTier": "base",
    "cost": 100,
    "tags": [
      "burst_sustain"
    ],
    "effects": [
      {
        "id": "salve_regen",
        "kind": "consumable",
        "target": "unit",
        "tags": [
          "heal_over_time",
          "break_on_damage"
        ],
        "values": {
          "heal": 400,
          "duration": 10
        }
      }
    ]
  },
  {
    "id": "i003_mana_clarity",
    "archetype": "consumível de regeneração lenta de mana",
    "category": "consumable",
    "slot": "consumable",
    "shopTier": "base",
    "cost": 50,
    "tags": [
      "mana_sustain"
    ],
    "effects": [
      {
        "id": "clarity_regen",
        "kind": "consumable",
        "target": "unit",
        "tags": [
          "mana_over_time",
          "break_on_damage"
        ],
        "values": {
          "mana": 180,
          "duration": 25
        }
      }
    ]
  },
  {
    "id": "i004_burst_mango",
    "archetype": "fruta de mana instantânea com pequena regeneração passiva",
    "category": "consumable",
    "slot": "consumable",
    "shopTier": "base",
    "cost": 65,
    "tags": [
      "instant_mana",
      "lane_sustain"
    ],
    "stats": {
      "healthRegen": 0.4
    },
    "effects": [
      {
        "id": "instant_mana_restore",
        "kind": "consumable",
        "target": "unit",
        "tags": [
          "restore_mana"
        ],
        "values": {
          "mana": 100
        }
      }
    ]
  },
  {
    "id": "i005_faerie_spark",
    "archetype": "consumível de dano pequeno e cura emergencial",
    "category": "consumable",
    "slot": "consumable",
    "shopTier": "base",
    "cost": 65,
    "tags": [
      "last_hit",
      "emergency_heal"
    ],
    "stats": {
      "damage": 2
    },
    "effects": [
      {
        "id": "instant_small_heal",
        "kind": "consumable",
        "target": "self",
        "tags": [
          "restore_health"
        ],
        "values": {
          "health": 85
        }
      }
    ]
  },
  {
    "id": "i006_team_smoke",
    "archetype": "consumível de invisibilidade estratégica para rotação",
    "category": "map_utility",
    "slot": "consumable",
    "shopTier": "base",
    "cost": 50,
    "tags": [
      "gank",
      "rotation",
      "team_utility"
    ],
    "effects": [
      {
        "id": "smoke_invisibility",
        "kind": "consumable",
        "target": "area",
        "tags": [
          "invisibility",
          "movement"
        ],
        "values": {
          "duration": 45,
          "moveSpeedPct": 15,
          "breakRadius": 1025
        }
      }
    ]
  },
  {
    "id": "i007_recall_scroll",
    "archetype": "teleporte estratégico para estruturas aliadas",
    "category": "map_utility",
    "slot": "consumable",
    "shopTier": "base",
    "cost": 100,
    "tags": [
      "teleport",
      "macro"
    ],
    "effects": [
      {
        "id": "channel_recall",
        "kind": "consumable",
        "target": "point",
        "tags": [
          "teleport",
          "channel"
        ],
        "values": {
          "channel": 3,
          "range": "allied_structure"
        }
      }
    ]
  },
  {
    "id": "i008_observer_eye",
    "archetype": "sentinela de visão gratuita com duração longa",
    "category": "map_utility",
    "slot": "consumable",
    "shopTier": "base",
    "cost": 0,
    "tags": [
      "vision",
      "objective_control"
    ],
    "effects": [
      {
        "id": "place_observer",
        "kind": "consumable",
        "target": "point",
        "tags": [
          "ward",
          "vision"
        ],
        "values": {
          "dayVision": 1600,
          "nightVision": 1600,
          "duration": 360
        }
      }
    ]
  },
  {
    "id": "i009_sentry_eye",
    "archetype": "sentinela de revelação contra invisibilidade",
    "category": "map_utility",
    "slot": "consumable",
    "shopTier": "base",
    "cost": 50,
    "tags": [
      "detection",
      "counter_vision"
    ],
    "effects": [
      {
        "id": "place_sentry",
        "kind": "consumable",
        "target": "point",
        "tags": [
          "ward",
          "true_sight"
        ],
        "values": {
          "radius": 900,
          "duration": 420
        }
      }
    ]
  },
  {
    "id": "i010_revealing_dust",
    "archetype": "revelação em área contra unidades invisíveis",
    "category": "map_utility",
    "slot": "consumable",
    "shopTier": "base",
    "cost": 80,
    "tags": [
      "detection",
      "anti_invisibility"
    ],
    "effects": [
      {
        "id": "dust_reveal",
        "kind": "consumable",
        "target": "area",
        "tags": [
          "true_sight",
          "slow"
        ],
        "values": {
          "radius": 1050,
          "duration": 12,
          "slowPct": 20
        }
      }
    ]
  },
  {
    "id": "i011_refillable_bottle",
    "archetype": "frasco de recargas para vida, mana e controle de runas",
    "category": "consumable",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 675,
    "tags": [
      "mid_lane",
      "resource_sustain",
      "rune_control"
    ],
    "effects": [
      {
        "id": "drink_charge",
        "kind": "active",
        "target": "self",
        "tags": [
          "heal_over_time",
          "mana_over_time"
        ],
        "values": {
          "charges": 3,
          "health": 110,
          "mana": 60,
          "duration": 2.7
        }
      }
    ]
  },
  {
    "id": "i012_rain_barrier_drops",
    "archetype": "barreira consumível automática contra dano mágico",
    "category": "consumable",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 225,
    "tags": [
      "anti_magic",
      "early_defense"
    ],
    "stats": {
      "manaRegen": 0.8
    },
    "effects": [
      {
        "id": "auto_magic_barrier_charge",
        "kind": "passive",
        "target": "self",
        "tags": [
          "magic_barrier",
          "charges"
        ],
        "values": {
          "charges": 6,
          "barrier": 120,
          "threshold": 75
        }
      }
    ]
  },
  {
    "id": "i013_tome_training",
    "archetype": "consumível de experiência para recuperação estratégica",
    "category": "consumable",
    "slot": "consumable",
    "shopTier": "base",
    "cost": 0,
    "tags": [
      "manager_mode",
      "catch_up"
    ],
    "effects": [
      {
        "id": "grant_xp",
        "kind": "consumable",
        "target": "unit",
        "tags": [
          "experience"
        ],
        "values": {
          "xp": 700
        }
      }
    ],
    "notes": "Opcional para manager; útil se houver economia de XP por time."
  },
  {
    "id": "i014_minor_branch",
    "archetype": "componente barato de atributos universais",
    "category": "component",
    "slot": "component",
    "shopTier": "base",
    "cost": 50,
    "tags": [
      "attributes",
      "component"
    ],
    "stats": {
      "strength": 1,
      "agility": 1,
      "intelligence": 1
    }
  },
  {
    "id": "i015_strength_gauntlet",
    "archetype": "componente barato de força",
    "category": "component",
    "slot": "component",
    "shopTier": "base",
    "cost": 140,
    "tags": [
      "strength",
      "component"
    ],
    "stats": {
      "strength": 3
    }
  },
  {
    "id": "i016_agility_slippers",
    "archetype": "componente barato de agilidade",
    "category": "component",
    "slot": "component",
    "shopTier": "base",
    "cost": 140,
    "tags": [
      "agility",
      "component"
    ],
    "stats": {
      "agility": 3
    }
  },
  {
    "id": "i017_intelligence_mantle",
    "archetype": "componente barato de inteligência",
    "category": "component",
    "slot": "component",
    "shopTier": "base",
    "cost": 140,
    "tags": [
      "intelligence",
      "component"
    ],
    "stats": {
      "intelligence": 3
    }
  },
  {
    "id": "i018_small_circlet",
    "archetype": "componente barato de todos os atributos",
    "category": "component",
    "slot": "component",
    "shopTier": "base",
    "cost": 155,
    "tags": [
      "attributes",
      "component"
    ],
    "stats": {
      "strength": 2,
      "agility": 2,
      "intelligence": 2
    }
  },
  {
    "id": "i019_strength_belt",
    "archetype": "componente médio de força",
    "category": "component",
    "slot": "component",
    "shopTier": "base",
    "cost": 450,
    "tags": [
      "strength",
      "component"
    ],
    "stats": {
      "strength": 6
    }
  },
  {
    "id": "i020_agility_band",
    "archetype": "componente médio de agilidade",
    "category": "component",
    "slot": "component",
    "shopTier": "base",
    "cost": 450,
    "tags": [
      "agility",
      "component"
    ],
    "stats": {
      "agility": 6
    }
  },
  {
    "id": "i021_intelligence_robe",
    "archetype": "componente médio de inteligência",
    "category": "component",
    "slot": "component",
    "shopTier": "base",
    "cost": 450,
    "tags": [
      "intelligence",
      "component"
    ],
    "stats": {
      "intelligence": 6
    }
  },
  {
    "id": "i022_balanced_crown",
    "archetype": "componente médio de atributos universais",
    "category": "component",
    "slot": "component",
    "shopTier": "base",
    "cost": 450,
    "tags": [
      "attributes",
      "component"
    ],
    "stats": {
      "strength": 4,
      "agility": 4,
      "intelligence": 4
    }
  },
  {
    "id": "i023_giant_axe",
    "archetype": "componente grande de força",
    "category": "component",
    "slot": "component",
    "shopTier": "base",
    "cost": 1000,
    "tags": [
      "strength",
      "component"
    ],
    "stats": {
      "strength": 10
    }
  },
  {
    "id": "i024_swift_blade",
    "archetype": "componente grande de agilidade",
    "category": "component",
    "slot": "component",
    "shopTier": "base",
    "cost": 1000,
    "tags": [
      "agility",
      "component"
    ],
    "stats": {
      "agility": 10
    }
  },
  {
    "id": "i025_wizard_staff",
    "archetype": "componente grande de inteligência",
    "category": "component",
    "slot": "component",
    "shopTier": "base",
    "cost": 1000,
    "tags": [
      "intelligence",
      "component"
    ],
    "stats": {
      "intelligence": 10
    }
  },
  {
    "id": "i026_grand_diadem",
    "archetype": "componente grande de todos os atributos",
    "category": "component",
    "slot": "component",
    "shopTier": "base",
    "cost": 1000,
    "tags": [
      "attributes",
      "component"
    ],
    "stats": {
      "strength": 6,
      "agility": 6,
      "intelligence": 6
    }
  },
  {
    "id": "i027_basic_boots",
    "archetype": "componente de velocidade de movimento",
    "category": "component",
    "slot": "component",
    "shopTier": "base",
    "cost": 500,
    "tags": [
      "movement",
      "component"
    ],
    "stats": {
      "movementSpeed": 45
    }
  },
  {
    "id": "i028_wind_thread",
    "archetype": "componente barato de velocidade adicional",
    "category": "component",
    "slot": "component",
    "shopTier": "base",
    "cost": 250,
    "tags": [
      "movement",
      "component"
    ],
    "stats": {
      "movementSpeed": 20
    }
  },
  {
    "id": "i029_quelling_hatchet",
    "archetype": "componente de farm contra creeps",
    "category": "component",
    "slot": "component",
    "shopTier": "base",
    "cost": 100,
    "tags": [
      "last_hit",
      "jungle"
    ],
    "effects": [
      {
        "id": "creep_damage_bonus",
        "kind": "passive",
        "target": "self",
        "tags": [
          "attack_modifier",
          "creep_only"
        ],
        "values": {
          "meleeDamageBonusPct": 8,
          "rangedDamageBonusPct": 4
        }
      }
    ]
  },
  {
    "id": "i030_venom_orb",
    "archetype": "componente de ataque com veneno e lentidão",
    "category": "component",
    "slot": "component",
    "shopTier": "base",
    "cost": 350,
    "tags": [
      "orb",
      "slow",
      "dot"
    ],
    "effects": [
      {
        "id": "venom_attack",
        "kind": "passive",
        "target": "enemy",
        "tags": [
          "attack_modifier",
          "slow",
          "dot"
        ],
        "values": {
          "dps": 2,
          "slowPct": 13,
          "duration": 3
        }
      }
    ]
  },
  {
    "id": "i031_armor_break_stone",
    "archetype": "componente de redução de armadura por ataque",
    "category": "component",
    "slot": "component",
    "shopTier": "base",
    "cost": 300,
    "tags": [
      "armor_reduction",
      "attack_modifier"
    ],
    "effects": [
      {
        "id": "minor_armor_corruption",
        "kind": "passive",
        "target": "enemy",
        "tags": [
          "attack_modifier",
          "armor_reduction"
        ],
        "values": {
          "armorReduction": 2,
          "duration": 8
        }
      }
    ]
  },
  {
    "id": "i032_small_damage_blades",
    "archetype": "componente barato de dano",
    "category": "component",
    "slot": "component",
    "shopTier": "base",
    "cost": 450,
    "tags": [
      "damage",
      "component"
    ],
    "stats": {
      "damage": 9
    }
  },
  {
    "id": "i033_broad_sword",
    "archetype": "componente médio de dano",
    "category": "component",
    "slot": "component",
    "shopTier": "base",
    "cost": 1000,
    "tags": [
      "damage",
      "component"
    ],
    "stats": {
      "damage": 15
    }
  },
  {
    "id": "i034_heavy_claymore",
    "archetype": "componente grande de dano",
    "category": "component",
    "slot": "component",
    "shopTier": "base",
    "cost": 1350,
    "tags": [
      "damage",
      "component"
    ],
    "stats": {
      "damage": 20
    }
  },
  {
    "id": "i035_piercing_javelin",
    "archetype": "componente de dano com proc mágico",
    "category": "component",
    "slot": "component",
    "shopTier": "base",
    "cost": 900,
    "tags": [
      "proc_damage",
      "component"
    ],
    "stats": {
      "damage": 10
    },
    "effects": [
      {
        "id": "pierce_proc",
        "kind": "passive",
        "target": "enemy",
        "tags": [
          "attack_proc",
          "magic_damage"
        ],
        "values": {
          "chancePct": 25,
          "damage": 60
        }
      }
    ]
  },
  {
    "id": "i036_war_hammer",
    "archetype": "componente avançado de dano",
    "category": "component",
    "slot": "component",
    "shopTier": "base",
    "cost": 1600,
    "tags": [
      "damage",
      "component"
    ],
    "stats": {
      "damage": 24
    }
  },
  {
    "id": "i037_demon_edge_generic",
    "archetype": "componente supremo de dano bruto",
    "category": "component",
    "slot": "component",
    "shopTier": "base",
    "cost": 2200,
    "tags": [
      "damage",
      "late_component"
    ],
    "stats": {
      "damage": 40
    }
  },
  {
    "id": "i038_quarterstaff",
    "archetype": "componente de dano e velocidade de ataque",
    "category": "component",
    "slot": "component",
    "shopTier": "base",
    "cost": 875,
    "tags": [
      "damage",
      "attack_speed"
    ],
    "stats": {
      "damage": 10,
      "attackSpeed": 10
    }
  },
  {
    "id": "i039_fast_knuckles",
    "archetype": "componente de velocidade de ataque",
    "category": "component",
    "slot": "component",
    "shopTier": "base",
    "cost": 1000,
    "tags": [
      "attack_speed",
      "component"
    ],
    "stats": {
      "attackSpeed": 35
    }
  },
  {
    "id": "i040_haste_gloves",
    "archetype": "componente barato de velocidade de ataque",
    "category": "component",
    "slot": "component",
    "shopTier": "base",
    "cost": 450,
    "tags": [
      "attack_speed",
      "component"
    ],
    "stats": {
      "attackSpeed": 20
    }
  },
  {
    "id": "i041_protection_ring",
    "archetype": "componente barato de armadura",
    "category": "component",
    "slot": "component",
    "shopTier": "base",
    "cost": 175,
    "tags": [
      "armor",
      "component"
    ],
    "stats": {
      "armor": 2
    }
  },
  {
    "id": "i042_chain_armor",
    "archetype": "componente médio de armadura",
    "category": "component",
    "slot": "component",
    "shopTier": "base",
    "cost": 550,
    "tags": [
      "armor",
      "component"
    ],
    "stats": {
      "armor": 4
    }
  },
  {
    "id": "i043_splintmail_plate",
    "archetype": "componente grande de armadura",
    "category": "component",
    "slot": "component",
    "shopTier": "base",
    "cost": 950,
    "tags": [
      "armor",
      "component"
    ],
    "stats": {
      "armor": 7
    }
  },
  {
    "id": "i044_iron_helm",
    "archetype": "componente de armadura e regeneração",
    "category": "component",
    "slot": "component",
    "shopTier": "base",
    "cost": 975,
    "tags": [
      "armor",
      "regen"
    ],
    "stats": {
      "armor": 5,
      "healthRegen": 5
    }
  },
  {
    "id": "i045_grand_platemail",
    "archetype": "componente supremo de armadura",
    "category": "component",
    "slot": "component",
    "shopTier": "base",
    "cost": 1400,
    "tags": [
      "armor",
      "late_component"
    ],
    "stats": {
      "armor": 10
    }
  },
  {
    "id": "i046_magic_cloak",
    "archetype": "componente de resistência mágica",
    "category": "component",
    "slot": "component",
    "shopTier": "base",
    "cost": 800,
    "tags": [
      "magic_resistance",
      "component"
    ],
    "stats": {
      "magicResistance": 15
    }
  },
  {
    "id": "i047_simple_shawl",
    "archetype": "componente barato de resistência mágica",
    "category": "component",
    "slot": "component",
    "shopTier": "base",
    "cost": 450,
    "tags": [
      "magic_resistance",
      "component"
    ],
    "stats": {
      "magicResistance": 10
    }
  },
  {
    "id": "i048_regen_ring",
    "archetype": "componente de regeneração de vida",
    "category": "component",
    "slot": "component",
    "shopTier": "base",
    "cost": 175,
    "tags": [
      "health_regen",
      "component"
    ],
    "stats": {
      "healthRegen": 1.25
    }
  },
  {
    "id": "i049_mana_mask",
    "archetype": "componente de regeneração de mana",
    "category": "component",
    "slot": "component",
    "shopTier": "base",
    "cost": 175,
    "tags": [
      "mana_regen",
      "component"
    ],
    "stats": {
      "manaRegen": 0.7
    }
  },
  {
    "id": "i050_void_stone",
    "archetype": "componente avançado de regeneração de mana",
    "category": "component",
    "slot": "component",
    "shopTier": "base",
    "cost": 700,
    "tags": [
      "mana_regen",
      "component"
    ],
    "stats": {
      "manaRegen": 2.25
    }
  },
  {
    "id": "i051_lifesteal_mask",
    "archetype": "componente de roubo de vida",
    "category": "component",
    "slot": "component",
    "shopTier": "base",
    "cost": 900,
    "tags": [
      "lifesteal",
      "component"
    ],
    "stats": {
      "lifestealPct": 15
    }
  },
  {
    "id": "i052_health_booster",
    "archetype": "componente de vida máxima",
    "category": "component",
    "slot": "component",
    "shopTier": "base",
    "cost": 1000,
    "tags": [
      "health",
      "component"
    ],
    "stats": {
      "maxHealth": 250
    }
  },
  {
    "id": "i053_mana_booster",
    "archetype": "componente de mana máxima",
    "category": "component",
    "slot": "component",
    "shopTier": "base",
    "cost": 800,
    "tags": [
      "mana",
      "component"
    ],
    "stats": {
      "maxMana": 250
    }
  },
  {
    "id": "i054_resource_core",
    "archetype": "componente de vida e mana máxima",
    "category": "component",
    "slot": "component",
    "shopTier": "base",
    "cost": 1200,
    "tags": [
      "health",
      "mana",
      "component"
    ],
    "stats": {
      "maxHealth": 175,
      "maxMana": 175
    }
  },
  {
    "id": "i055_blink_core",
    "archetype": "componente de mobilidade instantânea",
    "category": "component",
    "slot": "component",
    "shopTier": "base",
    "cost": 2250,
    "tags": [
      "blink",
      "mobility"
    ],
    "effects": [
      {
        "id": "short_range_blink",
        "kind": "active",
        "target": "point",
        "tags": [
          "blink"
        ],
        "values": {
          "range": 1200,
          "damageLockout": 3,
          "cooldown": 15
        }
      }
    ]
  },
  {
    "id": "i056_evasion_charm",
    "archetype": "componente de evasão",
    "category": "component",
    "slot": "component",
    "shopTier": "base",
    "cost": 1300,
    "tags": [
      "evasion",
      "component"
    ],
    "stats": {
      "evasion": 18
    }
  },
  {
    "id": "i057_hyperstone_core",
    "archetype": "componente supremo de velocidade de ataque",
    "category": "component",
    "slot": "component",
    "shopTier": "base",
    "cost": 2000,
    "tags": [
      "attack_speed",
      "late_component"
    ],
    "stats": {
      "attackSpeed": 60
    }
  },
  {
    "id": "i058_sacred_relic_generic",
    "archetype": "componente supremo de dano físico",
    "category": "component",
    "slot": "component",
    "shopTier": "base",
    "cost": 3400,
    "tags": [
      "damage",
      "late_component"
    ],
    "stats": {
      "damage": 55
    }
  },
  {
    "id": "i059_mystic_staff_generic",
    "archetype": "componente supremo de inteligência",
    "category": "component",
    "slot": "component",
    "shopTier": "base",
    "cost": 2800,
    "tags": [
      "intelligence",
      "late_component"
    ],
    "stats": {
      "intelligence": 25
    }
  },
  {
    "id": "i060_reaver_core",
    "archetype": "componente supremo de força",
    "category": "component",
    "slot": "component",
    "shopTier": "base",
    "cost": 2800,
    "tags": [
      "strength",
      "late_component"
    ],
    "stats": {
      "strength": 25
    }
  },
  {
    "id": "i061_eaglesong_core",
    "archetype": "componente supremo de agilidade",
    "category": "component",
    "slot": "component",
    "shopTier": "base",
    "cost": 2800,
    "tags": [
      "agility",
      "late_component"
    ],
    "stats": {
      "agility": 25
    }
  },
  {
    "id": "i062_ultimate_orb_generic",
    "archetype": "componente supremo de todos os atributos",
    "category": "component",
    "slot": "component",
    "shopTier": "base",
    "cost": 2800,
    "tags": [
      "attributes",
      "late_component"
    ],
    "stats": {
      "strength": 15,
      "agility": 15,
      "intelligence": 15
    }
  },
  {
    "id": "i063_wizard_hat",
    "archetype": "componente barato de mana máxima",
    "category": "component",
    "slot": "component",
    "shopTier": "base",
    "cost": 250,
    "tags": [
      "mana",
      "component"
    ],
    "stats": {
      "maxMana": 125
    }
  },
  {
    "id": "i064_aoe_chasm_stone",
    "archetype": "componente de ampliação de área",
    "category": "component",
    "slot": "component",
    "shopTier": "base",
    "cost": 800,
    "tags": [
      "aoe_bonus",
      "component"
    ],
    "stats": {
      "areaOfEffect": 40
    }
  },
  {
    "id": "i065_strength_bracer",
    "archetype": "item inicial de força e sobrevivência",
    "category": "early",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 505,
    "components": [
      "i015_strength_gauntlet",
      "i018_small_circlet"
    ],
    "tags": [
      "lane",
      "strength",
      "survival"
    ],
    "stats": {
      "strength": 5,
      "agility": 2,
      "intelligence": 2,
      "damage": 3,
      "healthRegen": 0.75
    }
  },
  {
    "id": "i066_agility_band",
    "archetype": "item inicial de agilidade e ataque",
    "category": "early",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 505,
    "components": [
      "i016_agility_slippers",
      "i018_small_circlet"
    ],
    "tags": [
      "lane",
      "agility",
      "attack_speed"
    ],
    "stats": {
      "strength": 2,
      "agility": 5,
      "intelligence": 2,
      "damage": 3,
      "attackSpeed": 6
    }
  },
  {
    "id": "i067_intelligence_talisman",
    "archetype": "item inicial de inteligência e mana",
    "category": "early",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 505,
    "components": [
      "i017_intelligence_mantle",
      "i018_small_circlet"
    ],
    "tags": [
      "lane",
      "intelligence",
      "mana"
    ],
    "stats": {
      "strength": 2,
      "agility": 2,
      "intelligence": 5,
      "damage": 3,
      "manaRegen": 0.75
    }
  },
  {
    "id": "i068_magic_wand",
    "archetype": "item inicial de cargas contra uso de magias",
    "category": "early",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 450,
    "components": [
      "i014_minor_branch"
    ],
    "tags": [
      "lane",
      "burst_sustain",
      "charges"
    ],
    "stats": {
      "strength": 3,
      "agility": 3,
      "intelligence": 3
    },
    "effects": [
      {
        "id": "spell_charge_restore",
        "kind": "active",
        "target": "self",
        "tags": [
          "restore_health",
          "restore_mana",
          "charges"
        ],
        "values": {
          "maxCharges": 20,
          "healthPerCharge": 15,
          "manaPerCharge": 15
        }
      }
    ]
  },
  {
    "id": "i069_soul_battery",
    "archetype": "item de sacrifício de vida por mana",
    "category": "early",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 805,
    "tags": [
      "mana",
      "tradeoff"
    ],
    "stats": {
      "strength": 6,
      "healthRegen": 2,
      "armor": 2
    },
    "effects": [
      {
        "id": "convert_health_to_mana",
        "kind": "active",
        "target": "self",
        "tags": [
          "restore_mana",
          "self_damage"
        ],
        "values": {
          "mana": 150,
          "healthCost": 170,
          "cooldown": 25
        }
      }
    ]
  },
  {
    "id": "i070_corrosion_orb",
    "archetype": "item agressivo de lane com veneno e redução de armadura",
    "category": "early",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 925,
    "components": [
      "i030_venom_orb",
      "i031_armor_break_stone"
    ],
    "tags": [
      "orb",
      "slow",
      "armor_reduction",
      "lane_pressure"
    ],
    "stats": {
      "maxHealth": 150
    },
    "effects": [
      {
        "id": "corrosive_attack",
        "kind": "passive",
        "target": "enemy",
        "tags": [
          "attack_modifier",
          "slow",
          "armor_reduction",
          "dot"
        ],
        "values": {
          "armorReduction": 3,
          "slowPct": 13,
          "dps": 3,
          "duration": 3
        }
      }
    ]
  },
  {
    "id": "i071_phase_warboots",
    "archetype": "bota ofensiva com faseamento e dano",
    "category": "boots",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 1500,
    "components": [
      "i027_basic_boots",
      "i032_small_damage_blades",
      "i041_protection_ring"
    ],
    "tags": [
      "movement",
      "damage",
      "phase"
    ],
    "stats": {
      "movementSpeed": 45,
      "damage": 18,
      "armor": 4
    },
    "effects": [
      {
        "id": "phase_sprint",
        "kind": "active",
        "target": "self",
        "tags": [
          "movement",
          "phased"
        ],
        "values": {
          "moveSpeedPct": 20,
          "duration": 3,
          "cooldown": 8
        }
      }
    ]
  },
  {
    "id": "i072_attribute_treads",
    "archetype": "bota de atributo alternável e velocidade de ataque",
    "category": "boots",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 1400,
    "components": [
      "i027_basic_boots",
      "i040_haste_gloves"
    ],
    "tags": [
      "movement",
      "attack_speed",
      "attribute_toggle"
    ],
    "stats": {
      "movementSpeed": 45,
      "attackSpeed": 25,
      "selectedAttribute": 10
    },
    "effects": [
      {
        "id": "toggle_attribute",
        "kind": "toggle",
        "target": "self",
        "tags": [
          "strength",
          "agility",
          "intelligence"
        ],
        "values": {
          "attributeBonus": 10
        }
      }
    ]
  },
  {
    "id": "i073_arcane_boots",
    "archetype": "bota de mana para o time",
    "category": "boots",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 1300,
    "components": [
      "i027_basic_boots",
      "i053_mana_booster"
    ],
    "tags": [
      "movement",
      "mana",
      "team_sustain"
    ],
    "stats": {
      "movementSpeed": 45,
      "maxMana": 250
    },
    "effects": [
      {
        "id": "restore_team_mana",
        "kind": "active",
        "target": "area",
        "tags": [
          "restore_mana",
          "team"
        ],
        "values": {
          "mana": 175,
          "radius": 1200,
          "cooldown": 55
        }
      }
    ]
  },
  {
    "id": "i074_tranquil_boots",
    "archetype": "bota de regeneração fora de combate",
    "category": "boots",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 925,
    "components": [
      "i027_basic_boots",
      "i048_regen_ring",
      "i028_wind_thread"
    ],
    "tags": [
      "movement",
      "health_regen",
      "support"
    ],
    "stats": {
      "movementSpeed": 65,
      "healthRegen": 14
    },
    "effects": [
      {
        "id": "break_regen_on_attack",
        "kind": "passive",
        "target": "self",
        "tags": [
          "conditional_regen"
        ],
        "values": {
          "breakDuration": 13
        }
      }
    ]
  },
  {
    "id": "i075_travel_boots",
    "archetype": "bota macro de teleporte avançado",
    "category": "boots",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 2500,
    "components": [
      "i027_basic_boots"
    ],
    "tags": [
      "movement",
      "teleport",
      "macro"
    ],
    "stats": {
      "movementSpeed": 90
    },
    "effects": [
      {
        "id": "advanced_recall",
        "kind": "active",
        "target": "unit_or_structure",
        "tags": [
          "teleport"
        ],
        "values": {
          "cooldown": 40,
          "target": "allied_unit_or_structure"
        }
      }
    ]
  },
  {
    "id": "i076_greed_glove",
    "archetype": "item econômico de ouro por abate ativo",
    "category": "economy",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 2200,
    "components": [
      "i040_haste_gloves"
    ],
    "tags": [
      "farm",
      "attack_speed",
      "gold"
    ],
    "stats": {
      "attackSpeed": 35
    },
    "effects": [
      {
        "id": "transmute_creep",
        "kind": "active",
        "target": "unit",
        "tags": [
          "gold",
          "xp",
          "creep_only"
        ],
        "values": {
          "bonusGold": 160,
          "bonusXpPct": 210,
          "cooldown": 100
        }
      }
    ]
  },
  {
    "id": "i077_falcon_blade_generic",
    "archetype": "item barato de dano, vida e mana",
    "category": "early",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 1125,
    "components": [
      "i032_small_damage_blades",
      "i049_mana_mask"
    ],
    "tags": [
      "lane",
      "mana",
      "damage"
    ],
    "stats": {
      "damage": 14,
      "maxHealth": 175,
      "manaRegen": 1.8
    }
  },
  {
    "id": "i078_armlet_relic",
    "archetype": "item de força com ativação arriscada",
    "category": "mid",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 2500,
    "components": [
      "i044_iron_helm",
      "i040_haste_gloves"
    ],
    "tags": [
      "strength",
      "toggle",
      "risk_reward"
    ],
    "stats": {
      "damage": 15,
      "armor": 6,
      "healthRegen": 5,
      "attackSpeed": 25
    },
    "effects": [
      {
        "id": "unholy_strength_toggle",
        "kind": "toggle",
        "target": "self",
        "tags": [
          "strength",
          "self_drain"
        ],
        "values": {
          "bonusStrength": 25,
          "bonusDamage": 35,
          "healthDrainPerSecond": 45
        }
      }
    ]
  },
  {
    "id": "i079_frenzy_mask",
    "archetype": "item de roubo de vida com fúria e silêncio próprio",
    "category": "mid",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 1775,
    "components": [
      "i051_lifesteal_mask"
    ],
    "tags": [
      "lifesteal",
      "attack_speed",
      "self_silence"
    ],
    "stats": {
      "lifestealPct": 20,
      "damage": 15
    },
    "effects": [
      {
        "id": "berserk_frenzy",
        "kind": "active",
        "target": "self",
        "tags": [
          "attack_speed",
          "movement",
          "self_silence",
          "armor_reduction"
        ],
        "values": {
          "attackSpeed": 110,
          "moveSpeedPct": 30,
          "armorPenalty": 8,
          "duration": 6
        }
      }
    ]
  },
  {
    "id": "i080_echo_blade",
    "archetype": "arma de dois ataques e mana para lutadores",
    "category": "mid",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 2500,
    "components": [
      "i023_giant_axe",
      "i050_void_stone"
    ],
    "tags": [
      "double_hit",
      "strength",
      "mana"
    ],
    "stats": {
      "strength": 15,
      "intelligence": 10,
      "damage": 15,
      "manaRegen": 1.75
    },
    "effects": [
      {
        "id": "echo_strike",
        "kind": "passive",
        "target": "enemy",
        "tags": [
          "double_attack",
          "slow"
        ],
        "values": {
          "slowPct": 100,
          "duration": 0.8,
          "cooldown": 6
        }
      }
    ]
  },
  {
    "id": "i081_harpoon_chain",
    "archetype": "arma de aproximação ativa para corpo a corpo",
    "category": "mid",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 4700,
    "components": [
      "i080_echo_blade"
    ],
    "tags": [
      "gap_close",
      "double_hit",
      "catch"
    ],
    "stats": {
      "strength": 15,
      "agility": 15,
      "intelligence": 15,
      "damage": 25,
      "attackSpeed": 20
    },
    "effects": [
      {
        "id": "pull_self_to_enemy",
        "kind": "active",
        "target": "unit",
        "tags": [
          "displacement",
          "gap_close"
        ],
        "values": {
          "range": 700,
          "slowPct": 100,
          "slowDuration": 0.8,
          "cooldown": 19
        }
      }
    ]
  },
  {
    "id": "i082_mage_hunter_blade",
    "archetype": "arma contra magos com redução de dano mágico inimigo",
    "category": "mid",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 2625,
    "components": [
      "i046_magic_cloak",
      "i038_quarterstaff"
    ],
    "tags": [
      "anti_mage",
      "attack_modifier",
      "magic_resistance"
    ],
    "stats": {
      "damage": 20,
      "attackSpeed": 20,
      "magicResistance": 25,
      "manaRegen": 1.5
    },
    "effects": [
      {
        "id": "weaken_spell_damage",
        "kind": "passive",
        "target": "enemy",
        "tags": [
          "debuff",
          "spell_damage_reduction"
        ],
        "values": {
          "spellDamageReductionPct": 35,
          "duration": 6
        }
      }
    ]
  },
  {
    "id": "i083_diffusal_edge",
    "archetype": "lâmina de queima de mana e lentidão",
    "category": "mid",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 2500,
    "components": [
      "i024_swift_blade",
      "i025_wizard_staff"
    ],
    "tags": [
      "mana_burn",
      "slow",
      "agility"
    ],
    "stats": {
      "agility": 15,
      "intelligence": 10
    },
    "effects": [
      {
        "id": "mana_burn_attack",
        "kind": "passive",
        "target": "enemy",
        "tags": [
          "attack_modifier",
          "mana_burn"
        ],
        "values": {
          "manaBurn": 40,
          "damageFromBurnPct": 100
        }
      },
      {
        "id": "inhibit_target",
        "kind": "active",
        "target": "unit",
        "tags": [
          "slow"
        ],
        "values": {
          "slowPct": 100,
          "duration": 4
        }
      }
    ]
  },
  {
    "id": "i084_dispersion_edge",
    "archetype": "lâmina avançada de dissipação e mobilidade",
    "category": "late",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 5700,
    "components": [
      "i083_diffusal_edge",
      "i061_eaglesong_core"
    ],
    "tags": [
      "dispel",
      "mobility",
      "mana_burn"
    ],
    "stats": {
      "agility": 35,
      "intelligence": 15,
      "movementSpeedPct": 10
    },
    "effects": [
      {
        "id": "self_dispel_haste",
        "kind": "active",
        "target": "self",
        "tags": [
          "dispel",
          "haste"
        ],
        "values": {
          "duration": 4,
          "cooldown": 15
        }
      }
    ]
  },
  {
    "id": "i085_reach_lance",
    "archetype": "lança de alcance para heróis à distância",
    "category": "mid",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 1900,
    "components": [
      "i023_giant_axe",
      "i024_swift_blade"
    ],
    "tags": [
      "range",
      "agility",
      "strength"
    ],
    "stats": {
      "strength": 10,
      "agility": 15,
      "attackRangeRangedOnly": 150
    }
  },
  {
    "id": "i086_force_pike",
    "archetype": "lança de alcance com empurrão defensivo/ofensivo",
    "category": "late",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 4450,
    "components": [
      "i085_reach_lance"
    ],
    "tags": [
      "range",
      "force",
      "mobility"
    ],
    "stats": {
      "strength": 15,
      "agility": 20,
      "intelligence": 15,
      "attackRangeRangedOnly": 150,
      "healthRegen": 2
    },
    "effects": [
      {
        "id": "force_unit_direction",
        "kind": "active",
        "target": "unit",
        "tags": [
          "displacement"
        ],
        "values": {
          "distance": 600,
          "cooldown": 19
        }
      }
    ]
  },
  {
    "id": "i087_shadow_blade_generic",
    "archetype": "lâmina de invisibilidade ofensiva",
    "category": "mid",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 3000,
    "components": [
      "i034_heavy_claymore",
      "i039_fast_knuckles"
    ],
    "tags": [
      "invisibility",
      "damage",
      "attack_speed"
    ],
    "stats": {
      "damage": 20,
      "attackSpeed": 35
    },
    "effects": [
      {
        "id": "shadow_walk",
        "kind": "active",
        "target": "self",
        "tags": [
          "invisibility",
          "movement",
          "break_attack"
        ],
        "values": {
          "duration": 14,
          "moveSpeedPct": 20,
          "bonusDamageOnBreak": 175
        }
      }
    ]
  },
  {
    "id": "i088_execution_edge",
    "archetype": "lâmina invisível com crítico e quebra de passiva",
    "category": "late",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 5450,
    "components": [
      "i087_shadow_blade_generic"
    ],
    "tags": [
      "invisibility",
      "break",
      "critical"
    ],
    "stats": {
      "damage": 52,
      "attackSpeed": 35
    },
    "effects": [
      {
        "id": "break_from_invisibility",
        "kind": "active",
        "target": "self",
        "tags": [
          "invisibility",
          "break_attack"
        ],
        "values": {
          "duration": 14,
          "bonusDamageOnBreak": 175,
          "breakDuration": 4
        }
      },
      {
        "id": "critical_strike",
        "kind": "passive",
        "target": "enemy",
        "tags": [
          "critical"
        ],
        "values": {
          "chancePct": 30,
          "critMultiplier": 160
        }
      }
    ]
  },
  {
    "id": "i089_overwhelming_blink",
    "archetype": "teleporte de força com dano e lentidão em área",
    "category": "late",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 6800,
    "components": [
      "i055_blink_core",
      "i060_reaver_core"
    ],
    "tags": [
      "blink",
      "strength",
      "aoe_slow"
    ],
    "stats": {
      "strength": 25
    },
    "effects": [
      {
        "id": "strength_blink_impact",
        "kind": "active",
        "target": "point",
        "tags": [
          "blink",
          "aoe",
          "slow"
        ],
        "values": {
          "range": 1200,
          "radius": 800,
          "damageFromStrengthPct": 100,
          "slowPct": 50
        }
      }
    ]
  },
  {
    "id": "i090_swift_blink",
    "archetype": "teleporte de agilidade com velocidade pós-uso",
    "category": "late",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 6800,
    "components": [
      "i055_blink_core",
      "i061_eaglesong_core"
    ],
    "tags": [
      "blink",
      "agility",
      "attack_speed"
    ],
    "stats": {
      "agility": 25
    },
    "effects": [
      {
        "id": "agility_blink_haste",
        "kind": "active",
        "target": "point",
        "tags": [
          "blink",
          "attack_speed",
          "movement"
        ],
        "values": {
          "range": 1200,
          "attackSpeed": 35,
          "moveSpeedPct": 25,
          "duration": 6
        }
      }
    ]
  },
  {
    "id": "i091_arcane_blink",
    "archetype": "teleporte de inteligência com redução de tempo de recarga",
    "category": "late",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 6800,
    "components": [
      "i055_blink_core",
      "i059_mystic_staff_generic"
    ],
    "tags": [
      "blink",
      "intelligence",
      "cooldown"
    ],
    "stats": {
      "intelligence": 25
    },
    "effects": [
      {
        "id": "arcane_blink_focus",
        "kind": "active",
        "target": "point",
        "tags": [
          "blink",
          "cooldown_reduction"
        ],
        "values": {
          "range": 1200,
          "cooldownReductionPct": 25,
          "duration": 6
        }
      }
    ]
  },
  {
    "id": "i092_force_staff_generic",
    "archetype": "cajado de empurrão direcional",
    "category": "mid",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 2200,
    "tags": [
      "support",
      "mobility",
      "save"
    ],
    "stats": {
      "intelligence": 10,
      "healthRegen": 2
    },
    "effects": [
      {
        "id": "force_push",
        "kind": "active",
        "target": "unit",
        "tags": [
          "displacement"
        ],
        "values": {
          "distance": 600,
          "cooldown": 19
        }
      }
    ]
  },
  {
    "id": "i093_glimmer_cloak_generic",
    "archetype": "capa de invisibilidade e barreira mágica para aliados",
    "category": "support",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 2150,
    "components": [
      "i046_magic_cloak"
    ],
    "tags": [
      "support",
      "save",
      "anti_magic",
      "invisibility"
    ],
    "stats": {
      "magicResistance": 20
    },
    "effects": [
      {
        "id": "glimmer_fade",
        "kind": "active",
        "target": "unit",
        "tags": [
          "invisibility",
          "magic_barrier"
        ],
        "values": {
          "fadeTime": 0.6,
          "duration": 5,
          "magicBarrier": 300
        }
      }
    ]
  },
  {
    "id": "i094_cyclone_scepter",
    "archetype": "cajado de ciclone para controle e dissipação",
    "category": "support",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 2725,
    "tags": [
      "dispel",
      "disable",
      "movement"
    ],
    "stats": {
      "intelligence": 10,
      "manaRegen": 2.5,
      "movementSpeed": 20
    },
    "effects": [
      {
        "id": "cyclone_unit",
        "kind": "active",
        "target": "unit",
        "tags": [
          "cyclone",
          "dispel"
        ],
        "values": {
          "duration": 2.5,
          "range": 575
        }
      }
    ]
  },
  {
    "id": "i095_wind_ascension",
    "archetype": "versão avançada do ciclone com mobilidade livre",
    "category": "late",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 6825,
    "components": [
      "i094_cyclone_scepter"
    ],
    "tags": [
      "dispel",
      "mobility",
      "save"
    ],
    "stats": {
      "intelligence": 35,
      "manaRegen": 6,
      "movementSpeed": 50
    },
    "effects": [
      {
        "id": "free_movement_cyclone",
        "kind": "active",
        "target": "unit",
        "tags": [
          "cyclone",
          "dispel",
          "free_movement"
        ],
        "values": {
          "duration": 2.5,
          "range": 950
        }
      }
    ]
  },
  {
    "id": "i096_cast_range_lens",
    "archetype": "lente de alcance de conjuração e mana",
    "category": "mid",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 2275,
    "components": [
      "i053_mana_booster",
      "i050_void_stone"
    ],
    "tags": [
      "cast_range",
      "mana"
    ],
    "stats": {
      "castRange": 225,
      "maxMana": 300,
      "manaRegen": 2.5
    }
  },
  {
    "id": "i097_ghost_form_scepter",
    "archetype": "cetro defensivo contra ataques físicos",
    "category": "mid",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 1500,
    "tags": [
      "save",
      "ethereal",
      "anti_physical"
    ],
    "stats": {
      "strength": 5,
      "agility": 5,
      "intelligence": 5
    },
    "effects": [
      {
        "id": "self_ghost_form",
        "kind": "active",
        "target": "self",
        "tags": [
          "ethereal",
          "physical_immunity",
          "magic_vulnerability"
        ],
        "values": {
          "duration": 4,
          "magicDamageTakenPct": 40
        }
      }
    ]
  },
  {
    "id": "i098_ethereal_focus_blade",
    "archetype": "arma mágica que converte alvo em forma etérea",
    "category": "late",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 4650,
    "components": [
      "i097_ghost_form_scepter",
      "i059_mystic_staff_generic"
    ],
    "tags": [
      "burst_magic",
      "ethereal",
      "attribute"
    ],
    "stats": {
      "strength": 5,
      "agility": 5,
      "intelligence": 25,
      "spellAmpPct": 12
    },
    "effects": [
      {
        "id": "target_ethereal_blast",
        "kind": "active",
        "target": "unit",
        "tags": [
          "ethereal",
          "nuke",
          "slow"
        ],
        "values": {
          "damageBase": 150,
          "damageFromPrimaryAttributePct": 150,
          "duration": 4,
          "slowPct": 80
        }
      }
    ]
  },
  {
    "id": "i099_discord_veil",
    "archetype": "véu de amplificação mágica em área",
    "category": "support",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 1725,
    "tags": [
      "magic_amp",
      "teamfight"
    ],
    "stats": {
      "strength": 4,
      "agility": 4,
      "intelligence": 4,
      "armor": 4,
      "manaRegen": 1
    },
    "effects": [
      {
        "id": "magic_weakness_area",
        "kind": "active",
        "target": "area",
        "tags": [
          "magic_damage_amp"
        ],
        "values": {
          "ampPct": 18,
          "duration": 16,
          "radius": 600
        }
      }
    ]
  },
  {
    "id": "i100_frost_armor_plate",
    "archetype": "armadura avançada de lentidão e dano mágico em área",
    "category": "late",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 4850,
    "tags": [
      "armor",
      "anti_attack",
      "aoe_slow"
    ],
    "stats": {
      "intelligence": 25,
      "armor": 15
    },
    "effects": [
      {
        "id": "frost_blast_armor",
        "kind": "active",
        "target": "area",
        "tags": [
          "slow",
          "attack_slow",
          "magic_damage"
        ],
        "values": {
          "damage": 200,
          "moveSlowPct": 40,
          "attackSlow": 45,
          "duration": 4,
          "radius": 900
        }
      }
    ]
  },
  {
    "id": "i101_spell_kaya",
    "archetype": "núcleo de amplificação mágica",
    "category": "mid",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 2100,
    "components": [
      "i025_wizard_staff"
    ],
    "tags": [
      "spell_amp",
      "mana"
    ],
    "stats": {
      "intelligence": 16,
      "spellAmpPct": 10,
      "manaRegenAmpPct": 25
    }
  },
  {
    "id": "i102_power_sange",
    "archetype": "núcleo de força e resistência a controle",
    "category": "mid",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 2100,
    "components": [
      "i023_giant_axe"
    ],
    "tags": [
      "strength",
      "status_resistance",
      "regen_amp"
    ],
    "stats": {
      "strength": 16,
      "statusResistance": 12,
      "healthRegenAmpPct": 12
    }
  },
  {
    "id": "i103_speed_yasha",
    "archetype": "núcleo de agilidade e velocidade",
    "category": "mid",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 2100,
    "components": [
      "i024_swift_blade"
    ],
    "tags": [
      "agility",
      "movement",
      "attack_speed"
    ],
    "stats": {
      "agility": 16,
      "attackSpeed": 15,
      "movementSpeedPct": 8
    }
  },
  {
    "id": "i104_spell_power_halberd",
    "archetype": "combinação de magia e resistência",
    "category": "late",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 4200,
    "components": [
      "i101_spell_kaya",
      "i102_power_sange"
    ],
    "tags": [
      "spell_amp",
      "strength",
      "status_resistance"
    ],
    "stats": {
      "strength": 16,
      "intelligence": 16,
      "spellAmpPct": 10,
      "statusResistance": 16,
      "healthRegenAmpPct": 16
    }
  },
  {
    "id": "i105_power_speed_dualblade",
    "archetype": "combinação de força, agilidade e mobilidade",
    "category": "late",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 4200,
    "components": [
      "i102_power_sange",
      "i103_speed_yasha"
    ],
    "tags": [
      "strength",
      "agility",
      "movement",
      "status_resistance"
    ],
    "stats": {
      "strength": 16,
      "agility": 16,
      "attackSpeed": 15,
      "movementSpeedPct": 10,
      "statusResistance": 16
    }
  },
  {
    "id": "i106_mirror_style",
    "archetype": "item de atributos com dissipação e ilusões",
    "category": "late",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 4650,
    "components": [
      "i103_speed_yasha",
      "i062_ultimate_orb_generic"
    ],
    "tags": [
      "agility",
      "illusion",
      "dispel"
    ],
    "stats": {
      "strength": 10,
      "agility": 26,
      "intelligence": 10,
      "attackSpeed": 12,
      "movementSpeedPct": 8
    },
    "effects": [
      {
        "id": "mirror_image_dispel",
        "kind": "active",
        "target": "self",
        "tags": [
          "basic_dispel",
          "illusion"
        ],
        "values": {
          "illusions": 2,
          "duration": 20,
          "illusionDamagePct": 33,
          "illusionDamageTakenPct": 300
        }
      }
    ]
  },
  {
    "id": "i107_disarm_halberd",
    "archetype": "arma defensiva de evasão, força e desarme",
    "category": "late",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 3500,
    "components": [
      "i102_power_sange",
      "i056_evasion_charm"
    ],
    "tags": [
      "disarm",
      "evasion",
      "strength"
    ],
    "stats": {
      "strength": 20,
      "evasion": 20,
      "statusResistance": 12
    },
    "effects": [
      {
        "id": "disarm_enemy",
        "kind": "active",
        "target": "unit",
        "tags": [
          "disarm"
        ],
        "values": {
          "durationMelee": 3,
          "durationRanged": 5,
          "range": 650
        }
      }
    ]
  },
  {
    "id": "i108_frost_orb_core",
    "archetype": "item supremo de atributos, vida, mana e lentidão por ataque",
    "category": "late",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 5300,
    "components": [
      "i062_ultimate_orb_generic"
    ],
    "tags": [
      "all_attributes",
      "slow",
      "anti_heal"
    ],
    "stats": {
      "strength": 22,
      "agility": 22,
      "intelligence": 22,
      "maxHealth": 220,
      "maxMana": 220
    },
    "effects": [
      {
        "id": "cold_attack_slow",
        "kind": "passive",
        "target": "enemy",
        "tags": [
          "attack_modifier",
          "slow",
          "heal_reduction"
        ],
        "values": {
          "moveSlowPct": 40,
          "attackSlow": 40,
          "healReductionPct": 40,
          "duration": 3
        }
      }
    ]
  },
  {
    "id": "i109_evasion_wingblade",
    "archetype": "item supremo de agilidade, dano e evasão",
    "category": "late",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 5450,
    "components": [
      "i061_eaglesong_core",
      "i056_evasion_charm"
    ],
    "tags": [
      "agility",
      "evasion",
      "carry"
    ],
    "stats": {
      "agility": 35,
      "damage": 25,
      "evasion": 35,
      "attackSpeed": 30
    }
  },
  {
    "id": "i110_spellproof_crown",
    "archetype": "imunidade temporária a debuffs e resistência mágica",
    "category": "late",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 4050,
    "tags": [
      "debuff_immunity",
      "magic_resistance"
    ],
    "stats": {
      "strength": 10,
      "agility": 10,
      "intelligence": 10,
      "damage": 18
    },
    "effects": [
      {
        "id": "debuff_immunity_active",
        "kind": "active",
        "target": "self",
        "tags": [
          "debuff_immunity",
          "magic_resistance"
        ],
        "values": {
          "duration": 9,
          "magicResistance": 50
        }
      }
    ]
  },
  {
    "id": "i111_link_barrier_sphere",
    "archetype": "bloqueio periódico de magia direcionada",
    "category": "late",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 4600,
    "tags": [
      "spell_block",
      "stats",
      "regen"
    ],
    "stats": {
      "strength": 16,
      "agility": 16,
      "intelligence": 16,
      "healthRegen": 7,
      "manaRegen": 5
    },
    "effects": [
      {
        "id": "spell_block",
        "kind": "passive",
        "target": "self",
        "tags": [
          "spell_block"
        ],
        "values": {
          "cooldown": 14
        }
      }
    ]
  },
  {
    "id": "i112_emergency_disk",
    "archetype": "disco defensivo automático contra burst",
    "category": "late",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 3000,
    "tags": [
      "survival",
      "anti_burst"
    ],
    "stats": {
      "maxHealth": 250,
      "maxMana": 300
    },
    "effects": [
      {
        "id": "auto_damage_immunity",
        "kind": "passive",
        "target": "self",
        "tags": [
          "damage_immunity",
          "auto_trigger"
        ],
        "values": {
          "triggerHealthPct": 70,
          "duration": 2.5,
          "cooldown": 105
        }
      }
    ]
  },
  {
    "id": "i113_lotus_shell",
    "archetype": "armadura de dissipação e reflexo de feitiços",
    "category": "late",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 3850,
    "tags": [
      "dispel",
      "spell_reflect",
      "armor"
    ],
    "stats": {
      "armor": 10,
      "healthRegen": 6.5,
      "manaRegen": 4
    },
    "effects": [
      {
        "id": "reflective_shell",
        "kind": "active",
        "target": "unit",
        "tags": [
          "basic_dispel",
          "spell_reflect"
        ],
        "values": {
          "duration": 6,
          "cooldown": 15
        }
      }
    ]
  },
  {
    "id": "i114_blade_return_mail",
    "archetype": "armadura que devolve dano recebido",
    "category": "mid",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 2300,
    "tags": [
      "damage_return",
      "armor"
    ],
    "stats": {
      "damage": 20,
      "armor": 7
    },
    "effects": [
      {
        "id": "return_damage_active",
        "kind": "active",
        "target": "self",
        "tags": [
          "damage_return"
        ],
        "values": {
          "duration": 5.5,
          "returnPct": 100
        }
      }
    ]
  },
  {
    "id": "i115_damage_block_shield",
    "archetype": "escudo de bloqueio de dano físico",
    "category": "mid",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 1700,
    "tags": [
      "tank",
      "damage_block",
      "health"
    ],
    "stats": {
      "maxHealth": 250,
      "healthRegen": 4
    },
    "effects": [
      {
        "id": "block_attack_damage",
        "kind": "passive",
        "target": "self",
        "tags": [
          "damage_block"
        ],
        "values": {
          "blockChancePct": 60,
          "blockMelee": 56,
          "blockRanged": 28
        }
      }
    ]
  },
  {
    "id": "i116_team_crimson_barrier",
    "archetype": "barreira física ativa para o time",
    "category": "support",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 3600,
    "components": [
      "i115_damage_block_shield"
    ],
    "tags": [
      "team_barrier",
      "anti_physical"
    ],
    "stats": {
      "maxHealth": 250,
      "healthRegen": 12,
      "armor": 8
    },
    "effects": [
      {
        "id": "team_damage_block",
        "kind": "active",
        "target": "area",
        "tags": [
          "physical_barrier",
          "team"
        ],
        "values": {
          "block": 75,
          "duration": 12,
          "radius": 1200
        }
      }
    ]
  },
  {
    "id": "i117_magic_shroud",
    "archetype": "manto de resistência e conversão de dano mágico em mana",
    "category": "late",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 3300,
    "components": [
      "i046_magic_cloak"
    ],
    "tags": [
      "anti_magic",
      "mana"
    ],
    "stats": {
      "magicResistance": 30,
      "healthRegen": 8
    },
    "effects": [
      {
        "id": "magic_to_mana_shield",
        "kind": "active",
        "target": "self",
        "tags": [
          "magic_barrier",
          "restore_mana"
        ],
        "values": {
          "magicBarrier": 400,
          "damageToManaPct": 25,
          "duration": 12
        }
      }
    ]
  },
  {
    "id": "i118_team_pipe_barrier",
    "archetype": "barreira mágica ativa para o time",
    "category": "support",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 3725,
    "components": [
      "i046_magic_cloak"
    ],
    "tags": [
      "team_barrier",
      "anti_magic"
    ],
    "stats": {
      "magicResistance": 25,
      "healthRegen": 8
    },
    "effects": [
      {
        "id": "team_magic_barrier",
        "kind": "active",
        "target": "area",
        "tags": [
          "magic_barrier",
          "team"
        ],
        "values": {
          "barrier": 450,
          "duration": 12,
          "radius": 1200
        }
      }
    ]
  },
  {
    "id": "i119_assault_aura_plate",
    "archetype": "armadura de aura ofensiva e defensiva",
    "category": "late",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 5125,
    "components": [
      "i045_grand_platemail",
      "i057_hyperstone_core"
    ],
    "tags": [
      "aura",
      "armor",
      "attack_speed",
      "siege"
    ],
    "stats": {
      "armor": 10,
      "attackSpeed": 30
    },
    "effects": [
      {
        "id": "assault_aura",
        "kind": "aura",
        "target": "area",
        "tags": [
          "armor_aura",
          "attack_speed_aura"
        ],
        "values": {
          "allyArmor": 5,
          "allyAttackSpeed": 30,
          "enemyArmorReduction": 5,
          "radius": 1200
        }
      }
    ]
  },
  {
    "id": "i120_giant_heart",
    "archetype": "item supremo de vida e regeneração fora de combate",
    "category": "late",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 5200,
    "components": [
      "i060_reaver_core"
    ],
    "tags": [
      "health",
      "regen",
      "tank"
    ],
    "stats": {
      "strength": 35,
      "maxHealth": 250,
      "healthRegenPct": 1.6
    },
    "effects": [
      {
        "id": "out_of_combat_regen",
        "kind": "passive",
        "target": "self",
        "tags": [
          "health_regen"
        ],
        "values": {
          "regenPctMaxHealth": 1.6,
          "disableAfterDamage": 5
        }
      }
    ]
  },
  {
    "id": "i121_satanic_bloodstone",
    "archetype": "roubo de vida supremo com dissipação e sustain",
    "category": "late",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 5050,
    "components": [
      "i051_lifesteal_mask",
      "i060_reaver_core"
    ],
    "tags": [
      "lifesteal",
      "damage",
      "survival"
    ],
    "stats": {
      "strength": 25,
      "damage": 25,
      "lifestealPct": 30
    },
    "effects": [
      {
        "id": "blood_rage_lifesteal",
        "kind": "active",
        "target": "self",
        "tags": [
          "lifesteal_amp",
          "basic_dispel"
        ],
        "values": {
          "lifestealPct": 175,
          "duration": 6
        }
      }
    ]
  },
  {
    "id": "i122_armor_corruptor",
    "archetype": "arma de redução intensa de armadura",
    "category": "late",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 3500,
    "components": [
      "i036_war_hammer",
      "i031_armor_break_stone"
    ],
    "tags": [
      "armor_reduction",
      "damage",
      "carry"
    ],
    "stats": {
      "damage": 50
    },
    "effects": [
      {
        "id": "major_armor_corruption",
        "kind": "passive",
        "target": "enemy",
        "tags": [
          "attack_modifier",
          "armor_reduction"
        ],
        "values": {
          "armorReduction": 6,
          "duration": 7
        }
      }
    ]
  },
  {
    "id": "i123_cleave_battle_axe",
    "archetype": "arma de farm com clivagem e regeneração",
    "category": "late",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 4100,
    "components": [
      "i034_heavy_claymore",
      "i033_broad_sword",
      "i048_regen_ring",
      "i050_void_stone"
    ],
    "tags": [
      "cleave",
      "farm",
      "regen"
    ],
    "stats": {
      "damage": 55,
      "healthRegen": 7.5,
      "manaRegen": 2.75
    },
    "effects": [
      {
        "id": "melee_cleave",
        "kind": "passive",
        "target": "area",
        "tags": [
          "cleave",
          "melee_only"
        ],
        "values": {
          "cleavePct": 60
        }
      }
    ]
  },
  {
    "id": "i124_chain_lightning_hammer",
    "archetype": "arma de relâmpagos para farm e luta",
    "category": "mid",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 2950,
    "components": [
      "i035_piercing_javelin",
      "i039_fast_knuckles"
    ],
    "tags": [
      "attack_speed",
      "chain_lightning"
    ],
    "stats": {
      "damage": 25,
      "attackSpeed": 25
    },
    "effects": [
      {
        "id": "chain_lightning_proc",
        "kind": "passive",
        "target": "enemy",
        "tags": [
          "attack_proc",
          "magical",
          "chain"
        ],
        "values": {
          "chancePct": 25,
          "damage": 120,
          "bounces": 4
        }
      }
    ]
  },
  {
    "id": "i125_static_storm_hammer",
    "archetype": "martelo de relâmpagos com escudo ofensivo",
    "category": "late",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 5600,
    "components": [
      "i124_chain_lightning_hammer",
      "i057_hyperstone_core"
    ],
    "tags": [
      "attack_speed",
      "chain_lightning",
      "active_shield"
    ],
    "stats": {
      "damage": 25,
      "attackSpeed": 90
    },
    "effects": [
      {
        "id": "static_charge_shield",
        "kind": "active",
        "target": "unit",
        "tags": [
          "counter_attack",
          "chain_lightning"
        ],
        "values": {
          "duration": 15,
          "procDamage": 225
        }
      }
    ]
  },
  {
    "id": "i126_rooting_storm_rod",
    "archetype": "arma de relâmpago com enraizamento em área",
    "category": "late",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 5450,
    "components": [
      "i124_chain_lightning_hammer",
      "i062_ultimate_orb_generic"
    ],
    "tags": [
      "root",
      "chain_lightning",
      "catch"
    ],
    "stats": {
      "damage": 25,
      "attackSpeed": 25,
      "strength": 14,
      "agility": 14,
      "intelligence": 14
    },
    "effects": [
      {
        "id": "storm_root_area",
        "kind": "active",
        "target": "area",
        "tags": [
          "root",
          "damage"
        ],
        "values": {
          "root": 2,
          "damage": 180,
          "radius": 350
        }
      }
    ]
  },
  {
    "id": "i127_bash_club",
    "archetype": "arma de chance de atordoar em ataques",
    "category": "mid",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 2875,
    "components": [
      "i035_piercing_javelin",
      "i023_giant_axe"
    ],
    "tags": [
      "bash",
      "damage"
    ],
    "stats": {
      "damage": 25,
      "strength": 10
    },
    "effects": [
      {
        "id": "attack_bash",
        "kind": "passive",
        "target": "enemy",
        "tags": [
          "bash"
        ],
        "values": {
          "chanceMeleePct": 25,
          "chanceRangedPct": 10,
          "stun": 1.2,
          "bonusDamage": 100
        }
      }
    ]
  },
  {
    "id": "i128_abyssal_lockblade",
    "archetype": "arma suprema de bash e atordoamento ativo",
    "category": "late",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 6250,
    "components": [
      "i127_bash_club",
      "i115_damage_block_shield"
    ],
    "tags": [
      "bash",
      "active_stun",
      "tank"
    ],
    "stats": {
      "damage": 25,
      "strength": 25,
      "maxHealth": 250,
      "healthRegen": 10
    },
    "effects": [
      {
        "id": "melee_active_stun",
        "kind": "active",
        "target": "unit",
        "tags": [
          "stun",
          "piercing_disable"
        ],
        "values": {
          "stun": 2,
          "range": 150
        }
      }
    ]
  },
  {
    "id": "i129_crystal_edge",
    "archetype": "arma de crítico médio",
    "category": "mid",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 1950,
    "components": [
      "i033_broad_sword"
    ],
    "tags": [
      "critical",
      "damage"
    ],
    "stats": {
      "damage": 32
    },
    "effects": [
      {
        "id": "minor_crit",
        "kind": "passive",
        "target": "enemy",
        "tags": [
          "critical"
        ],
        "values": {
          "chancePct": 30,
          "critMultiplier": 160
        }
      }
    ]
  },
  {
    "id": "i130_great_crit_blade",
    "archetype": "arma suprema de crítico",
    "category": "late",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 5100,
    "components": [
      "i129_crystal_edge",
      "i037_demon_edge_generic"
    ],
    "tags": [
      "critical",
      "damage",
      "carry"
    ],
    "stats": {
      "damage": 88
    },
    "effects": [
      {
        "id": "major_crit",
        "kind": "passive",
        "target": "enemy",
        "tags": [
          "critical"
        ],
        "values": {
          "chancePct": 30,
          "critMultiplier": 225
        }
      }
    ]
  },
  {
    "id": "i131_true_strike_staff",
    "archetype": "arma contra evasão com proc mágico",
    "category": "late",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 4975,
    "components": [
      "i035_piercing_javelin",
      "i038_quarterstaff"
    ],
    "tags": [
      "true_strike",
      "damage",
      "attack_speed"
    ],
    "stats": {
      "damage": 40,
      "attackSpeed": 45
    },
    "effects": [
      {
        "id": "true_strike",
        "kind": "passive",
        "target": "self",
        "tags": [
          "accuracy"
        ],
        "values": {
          "accuracyPct": 80
        }
      },
      {
        "id": "pierce_proc_large",
        "kind": "passive",
        "target": "enemy",
        "tags": [
          "attack_proc",
          "magic_damage"
        ],
        "values": {
          "chancePct": 80,
          "damage": 70
        }
      }
    ]
  },
  {
    "id": "i132_radiant_burn_relic",
    "archetype": "reliquia de dano em aura e cegueira",
    "category": "late",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 4700,
    "components": [
      "i058_sacred_relic_generic"
    ],
    "tags": [
      "aura_damage",
      "miss_chance",
      "farm"
    ],
    "stats": {
      "damage": 55
    },
    "effects": [
      {
        "id": "burn_aura",
        "kind": "aura",
        "target": "area",
        "tags": [
          "magical_damage",
          "blind"
        ],
        "values": {
          "dps": 60,
          "missChancePct": 15,
          "radius": 700
        }
      }
    ]
  },
  {
    "id": "i133_divine_relic",
    "archetype": "arma extrema de alto risco e dano máximo",
    "category": "late",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 5600,
    "tags": [
      "damage",
      "risk_reward",
      "drop_on_death"
    ],
    "stats": {
      "damage": 350
    },
    "effects": [
      {
        "id": "drop_on_death",
        "kind": "passive",
        "target": "self",
        "tags": [
          "risk_reward"
        ],
        "values": {
          "dropsOnDeath": true
        }
      }
    ]
  },
  {
    "id": "i134_moon_shard_generic",
    "archetype": "cristal de velocidade de ataque consumível",
    "category": "late",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 4000,
    "components": [
      "i057_hyperstone_core"
    ],
    "tags": [
      "attack_speed",
      "consumable_upgrade"
    ],
    "stats": {
      "attackSpeed": 140,
      "nightVision": 400
    },
    "effects": [
      {
        "id": "consume_for_attack_speed",
        "kind": "active",
        "target": "self",
        "tags": [
          "permanent_buff"
        ],
        "values": {
          "permanentAttackSpeed": 60
        }
      }
    ]
  },
  {
    "id": "i135_grand_spell_scepter",
    "archetype": "cetro de upgrade de habilidade principal",
    "category": "late",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 4200,
    "components": [
      "i054_resource_core"
    ],
    "tags": [
      "ability_upgrade",
      "attributes"
    ],
    "stats": {
      "strength": 10,
      "agility": 10,
      "intelligence": 10,
      "maxHealth": 175,
      "maxMana": 175
    },
    "effects": [
      {
        "id": "unlock_scepter_upgrade",
        "kind": "passive",
        "target": "self",
        "tags": [
          "ability_upgrade"
        ],
        "values": {
          "upgradeSlot": "scepter"
        }
      }
    ]
  },
  {
    "id": "i136_spell_shard",
    "archetype": "fragmento de upgrade secundário de habilidade",
    "category": "mid",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 1400,
    "tags": [
      "ability_upgrade"
    ],
    "effects": [
      {
        "id": "unlock_shard_upgrade",
        "kind": "passive",
        "target": "self",
        "tags": [
          "ability_upgrade"
        ],
        "values": {
          "upgradeSlot": "shard"
        }
      }
    ]
  },
  {
    "id": "i137_octarine_core_generic",
    "archetype": "núcleo de redução de recarga e roubo de vida mágico",
    "category": "late",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 4800,
    "components": [
      "i096_cast_range_lens",
      "i054_resource_core"
    ],
    "tags": [
      "cooldown_reduction",
      "spell_lifesteal",
      "cast_range"
    ],
    "stats": {
      "maxHealth": 425,
      "maxMana": 425,
      "manaRegen": 3,
      "castRange": 225,
      "cooldownReductionPct": 25,
      "spellLifestealPct": 25
    }
  },
  {
    "id": "i138_refresh_orb_generic",
    "archetype": "orbe de reinício de recargas",
    "category": "late",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 5000,
    "components": [
      "i050_void_stone"
    ],
    "tags": [
      "cooldown_reset",
      "teamfight"
    ],
    "stats": {
      "damage": 20,
      "healthRegen": 12,
      "manaRegen": 6
    },
    "effects": [
      {
        "id": "reset_cooldowns",
        "kind": "active",
        "target": "self",
        "tags": [
          "cooldown_reset"
        ],
        "values": {
          "manaCost": 350,
          "cooldown": 180
        }
      }
    ]
  },
  {
    "id": "i139_hex_scythe_generic",
    "archetype": "item supremo de controle unitário",
    "category": "late",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 5650,
    "components": [
      "i059_mystic_staff_generic",
      "i062_ultimate_orb_generic"
    ],
    "tags": [
      "hex",
      "intelligence",
      "disable"
    ],
    "stats": {
      "intelligence": 35,
      "strength": 10,
      "agility": 10,
      "manaRegen": 9
    },
    "effects": [
      {
        "id": "hex_target",
        "kind": "active",
        "target": "unit",
        "tags": [
          "hex",
          "disable"
        ],
        "values": {
          "duration": 3.5,
          "range": 800
        }
      }
    ]
  },
  {
    "id": "i140_silence_orchid",
    "archetype": "arma mágica de silêncio e amplificação de dano",
    "category": "mid",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 3475,
    "tags": [
      "silence",
      "damage_amp",
      "mana_regen"
    ],
    "stats": {
      "damage": 30,
      "attackSpeed": 40,
      "manaRegen": 3
    },
    "effects": [
      {
        "id": "soul_silence",
        "kind": "active",
        "target": "unit",
        "tags": [
          "silence",
          "damage_amp"
        ],
        "values": {
          "duration": 5,
          "damageStoredPct": 30
        }
      }
    ]
  },
  {
    "id": "i141_bloodthorn_generic",
    "archetype": "arma suprema de silêncio, crítico mágico e acerto garantido",
    "category": "late",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 6800,
    "components": [
      "i140_silence_orchid",
      "i131_true_strike_staff"
    ],
    "tags": [
      "silence",
      "critical",
      "true_strike"
    ],
    "stats": {
      "damage": 60,
      "attackSpeed": 90,
      "manaRegen": 3.5
    },
    "effects": [
      {
        "id": "marked_silence_crit",
        "kind": "active",
        "target": "unit",
        "tags": [
          "silence",
          "true_strike",
          "critical"
        ],
        "values": {
          "duration": 5,
          "critMultiplier": 130,
          "accuracyPct": 100
        }
      }
    ]
  },
  {
    "id": "i142_burst_wand",
    "archetype": "cajado escalável de dano mágico unitário",
    "category": "mid",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 2700,
    "tags": [
      "nuke",
      "upgradeable"
    ],
    "stats": {
      "strength": 6,
      "agility": 6,
      "intelligence": 14
    },
    "effects": [
      {
        "id": "energy_burst",
        "kind": "active",
        "target": "unit",
        "tags": [
          "magical_damage"
        ],
        "values": {
          "damageByLevel": "400/500/600/700/800",
          "range": 700
        }
      }
    ]
  },
  {
    "id": "i143_spirit_urn",
    "archetype": "urna de cargas para cura ou dano gradual",
    "category": "support",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 880,
    "tags": [
      "charges",
      "heal",
      "dot"
    ],
    "stats": {
      "strength": 2,
      "agility": 2,
      "intelligence": 2,
      "armor": 2,
      "manaRegen": 1.4
    },
    "effects": [
      {
        "id": "soul_charge",
        "kind": "active",
        "target": "unit",
        "tags": [
          "heal_or_damage",
          "charges"
        ],
        "values": {
          "heal": 200,
          "damage": 200,
          "duration": 8
        }
      }
    ]
  },
  {
    "id": "i144_spirit_vessel_generic",
    "archetype": "vaso de anti-cura e dano percentual",
    "category": "support",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 2780,
    "components": [
      "i143_spirit_urn"
    ],
    "tags": [
      "anti_heal",
      "percent_damage",
      "charges"
    ],
    "stats": {
      "strength": 12,
      "agility": 12,
      "intelligence": 12,
      "armor": 2,
      "movementSpeed": 20
    },
    "effects": [
      {
        "id": "vessel_charge",
        "kind": "active",
        "target": "unit",
        "tags": [
          "heal_or_damage",
          "heal_reduction",
          "percent_damage"
        ],
        "values": {
          "healReductionPct": 45,
          "currentHealthDamagePct": 4,
          "duration": 8
        }
      }
    ]
  },
  {
    "id": "i145_healing_mechanism",
    "archetype": "mecanismo de cura em área",
    "category": "support",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 1775,
    "tags": [
      "team_heal",
      "support"
    ],
    "stats": {
      "armor": 4
    },
    "effects": [
      {
        "id": "team_burst_heal",
        "kind": "active",
        "target": "area",
        "tags": [
          "heal",
          "team"
        ],
        "values": {
          "heal": 275,
          "radius": 1200
        }
      }
    ]
  },
  {
    "id": "i146_guardian_boots_generic",
    "archetype": "bota suprema de cura, mana e dissipação em área",
    "category": "support",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 5050,
    "components": [
      "i073_arcane_boots",
      "i145_healing_mechanism"
    ],
    "tags": [
      "team_heal",
      "team_mana",
      "dispel",
      "boots"
    ],
    "stats": {
      "movementSpeed": 55,
      "armor": 4,
      "maxMana": 250,
      "healthRegen": 4
    },
    "effects": [
      {
        "id": "guardian_restore",
        "kind": "active",
        "target": "area",
        "tags": [
          "heal",
          "restore_mana",
          "basic_dispel",
          "team"
        ],
        "values": {
          "heal": 350,
          "mana": 200,
          "radius": 1200
        }
      }
    ]
  },
  {
    "id": "i147_holy_locket_generic",
    "archetype": "amplificador de cura e cargas defensivas",
    "category": "support",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 2400,
    "tags": [
      "heal_amp",
      "charges",
      "support"
    ],
    "stats": {
      "strength": 10,
      "maxHealth": 250,
      "maxMana": 300,
      "healthRegen": 3,
      "manaRegen": 2
    },
    "effects": [
      {
        "id": "release_heal_charges",
        "kind": "active",
        "target": "unit",
        "tags": [
          "heal",
          "charges"
        ],
        "values": {
          "maxCharges": 20,
          "healPerCharge": 15,
          "healAmpPct": 25
        }
      }
    ]
  },
  {
    "id": "i148_pavise_barrier",
    "archetype": "barreira física barata para aliados",
    "category": "support",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 1400,
    "tags": [
      "physical_barrier",
      "support"
    ],
    "stats": {
      "maxMana": 175,
      "armor": 3,
      "healthRegen": 2.5
    },
    "effects": [
      {
        "id": "physical_barrier_target",
        "kind": "active",
        "target": "unit",
        "tags": [
          "physical_barrier"
        ],
        "values": {
          "barrier": 300,
          "duration": 8
        }
      }
    ]
  },
  {
    "id": "i149_solar_crest_generic",
    "archetype": "crest de armadura, velocidade e barreira para aliado ou inimigo",
    "category": "support",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 2600,
    "components": [
      "i148_pavise_barrier"
    ],
    "tags": [
      "support",
      "armor",
      "attack_speed",
      "barrier"
    ],
    "stats": {
      "strength": 6,
      "agility": 6,
      "intelligence": 6,
      "armor": 6,
      "movementSpeed": 20,
      "manaRegen": 1.5
    },
    "effects": [
      {
        "id": "solar_buff_or_debuff",
        "kind": "active",
        "target": "unit",
        "tags": [
          "armor",
          "attack_speed",
          "movement",
          "barrier"
        ],
        "values": {
          "armor": 6,
          "attackSpeed": 70,
          "moveSpeedPct": 15,
          "barrier": 400
        }
      }
    ]
  },
  {
    "id": "i150_war_drums_generic",
    "archetype": "tambor de velocidade para rotações e luta",
    "category": "support",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 1650,
    "tags": [
      "team_movement",
      "attack_speed",
      "charges"
    ],
    "stats": {
      "strength": 7,
      "agility": 7,
      "intelligence": 7,
      "movementSpeed": 20
    },
    "effects": [
      {
        "id": "drum_charge",
        "kind": "active",
        "target": "area",
        "tags": [
          "movement",
          "attack_speed",
          "team"
        ],
        "values": {
          "charges": 8,
          "attackSpeed": 45,
          "moveSpeedPct": 13,
          "duration": 6
        }
      }
    ]
  },
  {
    "id": "i151_bearing_boots_generic",
    "archetype": "bota de aura e explosão de velocidade para o time",
    "category": "support",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 4125,
    "components": [
      "i150_war_drums_generic",
      "i074_tranquil_boots"
    ],
    "tags": [
      "boots",
      "team_movement",
      "aura"
    ],
    "stats": {
      "movementSpeed": 65,
      "strength": 8,
      "agility": 8,
      "intelligence": 8
    },
    "effects": [
      {
        "id": "unstoppable_march",
        "kind": "active",
        "target": "area",
        "tags": [
          "movement",
          "slow_immunity",
          "team"
        ],
        "values": {
          "moveSpeedPct": 15,
          "attackSpeed": 50,
          "duration": 6
        }
      }
    ]
  },
  {
    "id": "i152_vampire_aura_mask",
    "archetype": "aura de dano e roubo de vida para o time",
    "category": "support",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 2450,
    "tags": [
      "aura",
      "lifesteal",
      "damage"
    ],
    "stats": {
      "armor": 2,
      "manaRegen": 1.75
    },
    "effects": [
      {
        "id": "vampire_aura",
        "kind": "aura",
        "target": "area",
        "tags": [
          "lifesteal",
          "damage",
          "mana_regen"
        ],
        "values": {
          "lifestealPct": 15,
          "damagePct": 18,
          "manaRegen": 1.75,
          "radius": 1200
        }
      }
    ]
  },
  {
    "id": "i153_dominator_helm",
    "archetype": "dominação de creep neutro",
    "category": "mid",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 2625,
    "tags": [
      "summon",
      "aura",
      "jungle"
    ],
    "stats": {
      "strength": 6,
      "agility": 6,
      "intelligence": 6,
      "armor": 6,
      "healthRegen": 6
    },
    "effects": [
      {
        "id": "dominate_creep",
        "kind": "active",
        "target": "unit",
        "tags": [
          "control_neutral"
        ],
        "values": {
          "maxLevel": 6,
          "bonusHealth": 1000
        }
      }
    ]
  },
  {
    "id": "i154_overlord_helm",
    "archetype": "dominação avançada de creep poderoso",
    "category": "late",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 5725,
    "components": [
      "i153_dominator_helm"
    ],
    "tags": [
      "summon",
      "aura",
      "jungle"
    ],
    "stats": {
      "strength": 20,
      "agility": 20,
      "intelligence": 20,
      "armor": 7,
      "healthRegen": 7
    },
    "effects": [
      {
        "id": "dominate_ancient",
        "kind": "active",
        "target": "unit",
        "tags": [
          "control_neutral",
          "ancient"
        ],
        "values": {
          "maxLevel": 10,
          "bonusHealth": 1800
        }
      }
    ]
  },
  {
    "id": "i155_spell_lifeblood_core",
    "archetype": "núcleo de roubo de vida mágico e amplificação de área",
    "category": "late",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 4700,
    "components": [
      "i099_discord_veil",
      "i054_resource_core"
    ],
    "tags": [
      "spell_lifesteal",
      "area_amp",
      "mana"
    ],
    "stats": {
      "maxHealth": 425,
      "maxMana": 425,
      "spellLifestealPct": 25,
      "manaRegen": 3
    },
    "effects": [
      {
        "id": "bloodpact_spell_amp",
        "kind": "active",
        "target": "self",
        "tags": [
          "spell_lifesteal",
          "aoe_bonus"
        ],
        "values": {
          "spellLifestealPct": 30,
          "areaOfEffect": 75,
          "duration": 6
        }
      }
    ]
  },
  {
    "id": "i156_phylactery_focus",
    "archetype": "foco de dano extra em magia unitária",
    "category": "mid",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 2400,
    "tags": [
      "single_target_spell",
      "slow",
      "nuke"
    ],
    "stats": {
      "strength": 7,
      "agility": 7,
      "intelligence": 7,
      "maxHealth": 200,
      "maxMana": 200
    },
    "effects": [
      {
        "id": "spell_followup_nuke",
        "kind": "passive",
        "target": "enemy",
        "tags": [
          "single_target_spell_proc",
          "slow"
        ],
        "values": {
          "damage": 150,
          "slowPct": 50,
          "cooldown": 6
        }
      }
    ]
  },
  {
    "id": "i157_khanda_focus",
    "archetype": "foco avançado de magia unitária com crítico físico",
    "category": "late",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 5000,
    "components": [
      "i156_phylactery_focus",
      "i129_crystal_edge"
    ],
    "tags": [
      "single_target_spell",
      "critical",
      "burst"
    ],
    "stats": {
      "damage": 50,
      "strength": 10,
      "agility": 10,
      "intelligence": 10
    },
    "effects": [
      {
        "id": "spell_weapon_burst",
        "kind": "passive",
        "target": "enemy",
        "tags": [
          "single_target_spell_proc",
          "critical_scaling"
        ],
        "values": {
          "baseDamage": 150,
          "attackDamagePct": 75,
          "slowPct": 50
        }
      }
    ]
  },
  {
    "id": "i158_witch_blade_generic",
    "archetype": "lâmina mágica com projétil venenoso escalado por inteligência",
    "category": "mid",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 2600,
    "tags": [
      "intelligence",
      "attack_modifier",
      "dot"
    ],
    "stats": {
      "intelligence": 12,
      "attackSpeed": 35,
      "armor": 6
    },
    "effects": [
      {
        "id": "int_poison_attack",
        "kind": "passive",
        "target": "enemy",
        "tags": [
          "attack_proc",
          "dot",
          "slow"
        ],
        "values": {
          "damageFromIntPct": 75,
          "duration": 4,
          "slowPct": 25
        }
      }
    ]
  },
  {
    "id": "i159_parasma_generic",
    "archetype": "lâmina mágica avançada com redução de resistência mágica",
    "category": "late",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 5975,
    "components": [
      "i158_witch_blade_generic"
    ],
    "tags": [
      "intelligence",
      "magic_amp",
      "attack_modifier"
    ],
    "stats": {
      "intelligence": 40,
      "attackSpeed": 40,
      "armor": 8
    },
    "effects": [
      {
        "id": "magic_resistance_break_attack",
        "kind": "passive",
        "target": "enemy",
        "tags": [
          "magic_resistance_reduction",
          "dot"
        ],
        "values": {
          "magicResistanceReductionPct": 20,
          "duration": 4
        }
      }
    ]
  },
  {
    "id": "i160_revenant_brooch_generic",
    "archetype": "broche que transforma ataques em dano mágico",
    "category": "late",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 4900,
    "tags": [
      "magic_attacks",
      "mana_cost_attack"
    ],
    "stats": {
      "damage": 45,
      "attackSpeed": 30,
      "manaRegen": 5
    },
    "effects": [
      {
        "id": "toggle_magic_attacks",
        "kind": "toggle",
        "target": "self",
        "tags": [
          "attack_magic_damage",
          "mana_cost"
        ],
        "values": {
          "manaCostPerAttack": 75,
          "canHitEthereal": true
        }
      }
    ]
  },
  {
    "id": "i161_consecrated_wraps_generic",
    "archetype": "faixas defensivas de barreira, atributos e resistência mágica",
    "category": "late",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 4200,
    "tags": [
      "barrier",
      "attributes",
      "anti_magic"
    ],
    "stats": {
      "strength": 14,
      "agility": 14,
      "intelligence": 14,
      "maxHealth": 250,
      "magicResistance": 12
    },
    "effects": [
      {
        "id": "hallowed_barrier",
        "kind": "active",
        "target": "self",
        "tags": [
          "barrier",
          "movement"
        ],
        "values": {
          "barrier": 450,
          "moveSpeedPct": 15,
          "duration": 5
        }
      }
    ]
  },
  {
    "id": "i162_crozier_ghost_relic",
    "archetype": "cajado de forma fantasma com roubo de cura e velocidade",
    "category": "late",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 4800,
    "tags": [
      "ethereal",
      "anti_heal",
      "movement_steal"
    ],
    "stats": {
      "intelligence": 20,
      "armor": 8,
      "magicResistance": 12
    },
    "effects": [
      {
        "id": "crozier_ghost_aura",
        "kind": "active",
        "target": "self",
        "tags": [
          "ethereal",
          "heal_steal",
          "movement_steal"
        ],
        "values": {
          "duration": 4,
          "magicDamageTakenPct": 30,
          "moveSpeedStealPctPerSecond": 5,
          "healReductionPct": 75
        }
      }
    ]
  },
  {
    "id": "i163_hydra_range_toxin",
    "archetype": "arma de alcance com veneno percentual e ataques adicionais",
    "category": "late",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 5900,
    "tags": [
      "ranged_carry",
      "poison",
      "multi_target"
    ],
    "stats": {
      "damage": 25,
      "agility": 30,
      "strength": 15,
      "attackRangeRangedOnly": 150
    },
    "effects": [
      {
        "id": "hydra_poison_attack",
        "kind": "passive",
        "target": "enemy",
        "tags": [
          "attack_modifier",
          "max_health_dot"
        ],
        "values": {
          "maxHealthDpsPct": 2.5,
          "duration": 3
        }
      },
      {
        "id": "hydra_extra_projectiles",
        "kind": "passive",
        "target": "area",
        "tags": [
          "multi_target_attack"
        ],
        "values": {
          "extraTargets": 3,
          "damagePct": 65
        }
      }
    ]
  },
  {
    "id": "i164_essence_distiller_generic",
    "archetype": "item híbrido de cura, dano e armadilhas utilitárias",
    "category": "support",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 3600,
    "tags": [
      "heal_or_damage",
      "trap",
      "utility"
    ],
    "stats": {
      "strength": 8,
      "agility": 8,
      "intelligence": 16,
      "armor": 5,
      "manaRegen": 2
    },
    "effects": [
      {
        "id": "distill_essence",
        "kind": "active",
        "target": "unit",
        "tags": [
          "heal_or_damage"
        ],
        "values": {
          "heal": 220,
          "damage": 220
        }
      },
      {
        "id": "place_essence_trap",
        "kind": "active",
        "target": "point",
        "tags": [
          "trap",
          "slow"
        ],
        "values": {
          "duration": 30,
          "slowPct": 35,
          "radius": 300
        }
      }
    ]
  },
  {
    "id": "i165_specialist_array_generic",
    "archetype": "array de dano e agilidade com disparos extras condicionais",
    "category": "mid",
    "slot": "inventory",
    "shopTier": "base",
    "cost": 2550,
    "tags": [
      "ranged_carry",
      "multi_target",
      "agility"
    ],
    "stats": {
      "damage": 20,
      "agility": 12
    },
    "effects": [
      {
        "id": "splitshot_proc",
        "kind": "passive",
        "target": "area",
        "tags": [
          "ranged_only",
          "extra_projectiles"
        ],
        "values": {
          "chancePct": 30,
          "extraTargets": 2,
          "damagePct": 75
        }
      }
    ]
  },
  {
    "id": "i166_t1_duelist_gloves",
    "archetype": "luvas neutras de duelo e ataque rápido",
    "category": "neutral_tier_1",
    "slot": "neutral",
    "shopTier": "neutral",
    "cost": 0,
    "tags": [
      "neutral",
      "tier_1",
      "attack_speed",
      "duel"
    ],
    "stats": {
      "attackSpeed": 20
    },
    "effects": [
      {
        "id": "t1_duelist_gloves_effect",
        "kind": "passive",
        "target": "self",
        "tags": [
          "attack_speed",
          "duel"
        ],
        "values": {
          "tier": 1
        }
      }
    ]
  },
  {
    "id": "i167_t1_arcane_bracelet",
    "archetype": "bracelete neutro de mana e atributos",
    "category": "neutral_tier_1",
    "slot": "neutral",
    "shopTier": "neutral",
    "cost": 0,
    "tags": [
      "neutral",
      "tier_1",
      "mana",
      "attributes"
    ],
    "stats": {
      "strength": 3,
      "agility": 3,
      "intelligence": 6,
      "maxMana": 75
    },
    "effects": [
      {
        "id": "t1_arcane_bracelet_effect",
        "kind": "passive",
        "target": "self",
        "tags": [
          "mana",
          "attributes"
        ],
        "values": {
          "tier": 1
        }
      }
    ]
  },
  {
    "id": "i168_t1_faded_amulet",
    "archetype": "amuleto neutro de movimento e dano",
    "category": "neutral_tier_1",
    "slot": "neutral",
    "shopTier": "neutral",
    "cost": 0,
    "tags": [
      "neutral",
      "tier_1",
      "movement",
      "damage"
    ],
    "stats": {
      "damage": 7,
      "movementSpeed": 20
    },
    "effects": [
      {
        "id": "t1_faded_amulet_effect",
        "kind": "passive",
        "target": "self",
        "tags": [
          "movement",
          "damage"
        ],
        "values": {
          "tier": 1
        }
      }
    ]
  },
  {
    "id": "i169_t1_lance_token",
    "archetype": "lança neutra de alcance curto",
    "category": "neutral_tier_1",
    "slot": "neutral",
    "shopTier": "neutral",
    "cost": 0,
    "tags": [
      "neutral",
      "tier_1",
      "range",
      "ranged"
    ],
    "stats": {
      "attackRangeRangedOnly": 75,
      "damage": 6
    },
    "effects": [
      {
        "id": "t1_lance_token_effect",
        "kind": "passive",
        "target": "self",
        "tags": [
          "range",
          "ranged"
        ],
        "values": {
          "tier": 1
        }
      }
    ]
  },
  {
    "id": "i170_t1_broom_charm",
    "archetype": "talismã neutro de armadura, dano e visão noturna",
    "category": "neutral_tier_1",
    "slot": "neutral",
    "shopTier": "neutral",
    "cost": 0,
    "tags": [
      "neutral",
      "tier_1",
      "vision",
      "armor"
    ],
    "stats": {
      "armor": 3,
      "damage": 8,
      "nightVision": 200
    },
    "effects": [
      {
        "id": "t1_broom_charm_effect",
        "kind": "passive",
        "target": "self",
        "tags": [
          "vision",
          "armor"
        ],
        "values": {
          "tier": 1
        }
      }
    ]
  },
  {
    "id": "i171_t1_survival_pouch",
    "archetype": "bolsa neutra de vida e regeneração",
    "category": "neutral_tier_1",
    "slot": "neutral",
    "shopTier": "neutral",
    "cost": 0,
    "tags": [
      "neutral",
      "tier_1",
      "health",
      "regen"
    ],
    "stats": {
      "maxHealth": 120,
      "healthRegen": 3
    },
    "effects": [
      {
        "id": "t1_survival_pouch_effect",
        "kind": "passive",
        "target": "self",
        "tags": [
          "health",
          "regen"
        ],
        "values": {
          "tier": 1
        }
      }
    ]
  },
  {
    "id": "i172_t2_vambrace_generic",
    "archetype": "bracelete neutro que alterna atributo dominante",
    "category": "neutral_tier_2",
    "slot": "neutral",
    "shopTier": "neutral",
    "cost": 0,
    "tags": [
      "neutral",
      "tier_2",
      "attributes",
      "toggle"
    ],
    "stats": {
      "selectedAttribute": 12,
      "secondaryAttributes": 6
    },
    "effects": [
      {
        "id": "t2_vambrace_generic_effect",
        "kind": "passive",
        "target": "self",
        "tags": [
          "attributes",
          "toggle"
        ],
        "values": {
          "tier": 2
        }
      }
    ]
  },
  {
    "id": "i173_t2_dragon_scale",
    "archetype": "escama neutra de armadura e dano por ataque",
    "category": "neutral_tier_2",
    "slot": "neutral",
    "shopTier": "neutral",
    "cost": 0,
    "tags": [
      "neutral",
      "tier_2",
      "armor",
      "dot_attack"
    ],
    "stats": {
      "armor": 5,
      "healthRegen": 5
    },
    "effects": [
      {
        "id": "t2_dragon_scale_effect",
        "kind": "passive",
        "target": "self",
        "tags": [
          "armor",
          "dot_attack"
        ],
        "values": {
          "tier": 2
        }
      }
    ]
  },
  {
    "id": "i174_t2_pupil_gift",
    "archetype": "presente neutro para atributos secundários",
    "category": "neutral_tier_2",
    "slot": "neutral",
    "shopTier": "neutral",
    "cost": 0,
    "tags": [
      "neutral",
      "tier_2",
      "attributes",
      "scaling"
    ],
    "stats": {
      "secondaryAttributes": 14
    },
    "effects": [
      {
        "id": "t2_pupil_gift_effect",
        "kind": "passive",
        "target": "self",
        "tags": [
          "attributes",
          "scaling"
        ],
        "values": {
          "tier": 2
        }
      }
    ]
  },
  {
    "id": "i175_t2_specialist_quiver",
    "archetype": "aljava neutra de alcance e dano mágico periódico",
    "category": "neutral_tier_2",
    "slot": "neutral",
    "shopTier": "neutral",
    "cost": 0,
    "tags": [
      "neutral",
      "tier_2",
      "range",
      "proc_damage"
    ],
    "stats": {
      "attackRangeRangedOnly": 100
    },
    "effects": [
      {
        "id": "t2_specialist_quiver_effect",
        "kind": "passive",
        "target": "self",
        "tags": [
          "range",
          "proc_damage"
        ],
        "values": {
          "tier": 2
        }
      }
    ]
  },
  {
    "id": "i176_t2_bullwhip_generic",
    "archetype": "chicote neutro de velocidade em alvo",
    "category": "neutral_tier_2",
    "slot": "neutral",
    "shopTier": "neutral",
    "cost": 0,
    "tags": [
      "neutral",
      "tier_2",
      "movement",
      "utility"
    ],
    "stats": {
      "healthRegen": 4,
      "manaRegen": 2
    },
    "effects": [
      {
        "id": "t2_bullwhip_generic_effect",
        "kind": "passive",
        "target": "self",
        "tags": [
          "movement",
          "utility"
        ],
        "values": {
          "tier": 2
        }
      }
    ]
  },
  {
    "id": "i177_t2_orb_destruction",
    "archetype": "orbe neutro de redução de armadura e slow",
    "category": "neutral_tier_2",
    "slot": "neutral",
    "shopTier": "neutral",
    "cost": 0,
    "tags": [
      "neutral",
      "tier_2",
      "armor_reduction",
      "slow"
    ],
    "stats": {
      "damage": 10
    },
    "effects": [
      {
        "id": "t2_orb_destruction_effect",
        "kind": "passive",
        "target": "self",
        "tags": [
          "armor_reduction",
          "slow"
        ],
        "values": {
          "tier": 2
        }
      }
    ]
  },
  {
    "id": "i178_t3_titan_sliver",
    "archetype": "fragmento neutro de dano, resistência e status",
    "category": "neutral_tier_3",
    "slot": "neutral",
    "shopTier": "neutral",
    "cost": 0,
    "tags": [
      "neutral",
      "tier_3",
      "damage",
      "resistance"
    ],
    "stats": {
      "damagePct": 16,
      "magicResistance": 16,
      "statusResistance": 16
    },
    "effects": [
      {
        "id": "t3_titan_sliver_effect",
        "kind": "passive",
        "target": "self",
        "tags": [
          "damage",
          "resistance"
        ],
        "values": {
          "tier": 3
        }
      }
    ]
  },
  {
    "id": "i179_t3_elven_tunic",
    "archetype": "túnica neutra de evasão, movimento e ataque",
    "category": "neutral_tier_3",
    "slot": "neutral",
    "shopTier": "neutral",
    "cost": 0,
    "tags": [
      "neutral",
      "tier_3",
      "evasion",
      "attack_speed"
    ],
    "stats": {
      "attackSpeed": 30,
      "movementSpeedPct": 8,
      "evasion": 16
    },
    "effects": [
      {
        "id": "t3_elven_tunic_effect",
        "kind": "passive",
        "target": "self",
        "tags": [
          "evasion",
          "attack_speed"
        ],
        "values": {
          "tier": 3
        }
      }
    ]
  },
  {
    "id": "i180_t3_ceremonial_robe",
    "archetype": "robe neutro de aura contra mana e status inimigo",
    "category": "neutral_tier_3",
    "slot": "neutral",
    "shopTier": "neutral",
    "cost": 0,
    "tags": [
      "neutral",
      "tier_3",
      "aura",
      "debuff"
    ],
    "stats": {
      "maxMana": 350
    },
    "effects": [
      {
        "id": "t3_ceremonial_robe_effect",
        "kind": "passive",
        "target": "self",
        "tags": [
          "aura",
          "debuff"
        ],
        "values": {
          "tier": 3
        }
      }
    ]
  },
  {
    "id": "i181_t3_psychic_headband",
    "archetype": "tiara neutra de inteligência, alcance e empurrão",
    "category": "neutral_tier_3",
    "slot": "neutral",
    "shopTier": "neutral",
    "cost": 0,
    "tags": [
      "neutral",
      "tier_3",
      "cast_range",
      "displacement"
    ],
    "stats": {
      "intelligence": 16,
      "castRange": 100
    },
    "effects": [
      {
        "id": "t3_psychic_headband_effect",
        "kind": "passive",
        "target": "self",
        "tags": [
          "cast_range",
          "displacement"
        ],
        "values": {
          "tier": 3
        }
      }
    ]
  },
  {
    "id": "i182_t3_quickening_charm",
    "archetype": "amuleto neutro de redução de recarga",
    "category": "neutral_tier_3",
    "slot": "neutral",
    "shopTier": "neutral",
    "cost": 0,
    "tags": [
      "neutral",
      "tier_3",
      "cooldown"
    ],
    "stats": {
      "cooldownReductionPct": 13
    },
    "effects": [
      {
        "id": "t3_quickening_charm_effect",
        "kind": "passive",
        "target": "self",
        "tags": [
          "cooldown"
        ],
        "values": {
          "tier": 3
        }
      }
    ]
  },
  {
    "id": "i183_t3_paladin_sword",
    "archetype": "espada neutra de dano e amplificação de cura",
    "category": "neutral_tier_3",
    "slot": "neutral",
    "shopTier": "neutral",
    "cost": 0,
    "tags": [
      "neutral",
      "tier_3",
      "lifesteal",
      "heal_amp"
    ],
    "stats": {
      "damage": 20,
      "lifestealPct": 16,
      "healAmpPct": 14
    },
    "effects": [
      {
        "id": "t3_paladin_sword_effect",
        "kind": "passive",
        "target": "self",
        "tags": [
          "lifesteal",
          "heal_amp"
        ],
        "values": {
          "tier": 3
        }
      }
    ]
  },
  {
    "id": "i184_t4_spell_prism",
    "archetype": "prisma neutro de recarga e atributos",
    "category": "neutral_tier_4",
    "slot": "neutral",
    "shopTier": "neutral",
    "cost": 0,
    "tags": [
      "neutral",
      "tier_4",
      "cooldown",
      "attributes"
    ],
    "stats": {
      "strength": 8,
      "agility": 8,
      "intelligence": 8,
      "cooldownReductionPct": 12
    },
    "effects": [
      {
        "id": "t4_spell_prism_effect",
        "kind": "passive",
        "target": "self",
        "tags": [
          "cooldown",
          "attributes"
        ],
        "values": {
          "tier": 4
        }
      }
    ]
  },
  {
    "id": "i185_t4_ninja_gear",
    "archetype": "equipamento neutro de agilidade e fumaça pessoal",
    "category": "neutral_tier_4",
    "slot": "neutral",
    "shopTier": "neutral",
    "cost": 0,
    "tags": [
      "neutral",
      "tier_4",
      "stealth",
      "agility"
    ],
    "stats": {
      "agility": 24,
      "movementSpeed": 30
    },
    "effects": [
      {
        "id": "t4_ninja_gear_effect",
        "kind": "passive",
        "target": "self",
        "tags": [
          "stealth",
          "agility"
        ],
        "values": {
          "tier": 4
        }
      }
    ]
  },
  {
    "id": "i186_t4_trickster_cloak",
    "archetype": "manto neutro de evasão e resistência mágica",
    "category": "neutral_tier_4",
    "slot": "neutral",
    "shopTier": "neutral",
    "cost": 0,
    "tags": [
      "neutral",
      "tier_4",
      "evasion",
      "magic_resistance"
    ],
    "stats": {
      "evasion": 20,
      "magicResistance": 20
    },
    "effects": [
      {
        "id": "t4_trickster_cloak_effect",
        "kind": "passive",
        "target": "self",
        "tags": [
          "evasion",
          "magic_resistance"
        ],
        "values": {
          "tier": 4
        }
      }
    ]
  },
  {
    "id": "i187_t4_stormcrafter",
    "archetype": "núcleo neutro de tempestade e dissipação",
    "category": "neutral_tier_4",
    "slot": "neutral",
    "shopTier": "neutral",
    "cost": 0,
    "tags": [
      "neutral",
      "tier_4",
      "dispel",
      "magic_damage"
    ],
    "stats": {
      "movementSpeed": 35,
      "manaRegen": 4
    },
    "effects": [
      {
        "id": "t4_stormcrafter_effect",
        "kind": "passive",
        "target": "self",
        "tags": [
          "dispel",
          "magic_damage"
        ],
        "values": {
          "tier": 4
        }
      }
    ]
  },
  {
    "id": "i188_t4_ancient_guardian",
    "archetype": "guardião neutro de defesa perto de estruturas",
    "category": "neutral_tier_4",
    "slot": "neutral",
    "shopTier": "neutral",
    "cost": 0,
    "tags": [
      "neutral",
      "tier_4",
      "defense",
      "objective"
    ],
    "stats": {
      "armor": 12,
      "healthRegen": 12
    },
    "effects": [
      {
        "id": "t4_ancient_guardian_effect",
        "kind": "passive",
        "target": "self",
        "tags": [
          "defense",
          "objective"
        ],
        "values": {
          "tier": 4
        }
      }
    ]
  },
  {
    "id": "i189_t4_timeless_relic",
    "archetype": "relíquia neutra de amplificação mágica e duração de debuff",
    "category": "neutral_tier_4",
    "slot": "neutral",
    "shopTier": "neutral",
    "cost": 0,
    "tags": [
      "neutral",
      "tier_4",
      "spell_amp",
      "debuff"
    ],
    "stats": {
      "spellAmpPct": 15,
      "debuffDurationPct": 20
    },
    "effects": [
      {
        "id": "t4_timeless_relic_effect",
        "kind": "passive",
        "target": "self",
        "tags": [
          "spell_amp",
          "debuff"
        ],
        "values": {
          "tier": 4
        }
      }
    ]
  },
  {
    "id": "i190_t5_apex_shard",
    "archetype": "ápice neutro de atributo primário",
    "category": "neutral_tier_5",
    "slot": "neutral",
    "shopTier": "neutral",
    "cost": 0,
    "tags": [
      "neutral",
      "tier_5",
      "primary_attribute",
      "scaling"
    ],
    "stats": {
      "primaryAttribute": 70
    },
    "effects": [
      {
        "id": "t5_apex_shard_effect",
        "kind": "passive",
        "target": "self",
        "tags": [
          "primary_attribute",
          "scaling"
        ],
        "values": {
          "tier": 5
        }
      }
    ]
  },
  {
    "id": "i191_t5_force_boots",
    "archetype": "botas neutras de velocidade extrema e dissipação",
    "category": "neutral_tier_5",
    "slot": "neutral",
    "shopTier": "neutral",
    "cost": 0,
    "tags": [
      "neutral",
      "tier_5",
      "movement",
      "dispel"
    ],
    "stats": {
      "movementSpeed": 115,
      "healthRegen": 30
    },
    "effects": [
      {
        "id": "t5_force_boots_effect",
        "kind": "passive",
        "target": "self",
        "tags": [
          "movement",
          "dispel"
        ],
        "values": {
          "tier": 5
        }
      }
    ]
  },
  {
    "id": "i192_t5_mirror_shield",
    "archetype": "escudo neutro de bloqueio e reflexo de magia",
    "category": "neutral_tier_5",
    "slot": "neutral",
    "shopTier": "neutral",
    "cost": 0,
    "tags": [
      "neutral",
      "tier_5",
      "spell_block",
      "reflect"
    ],
    "stats": {
      "strength": 16,
      "agility": 16,
      "intelligence": 16
    },
    "effects": [
      {
        "id": "t5_mirror_shield_effect",
        "kind": "passive",
        "target": "self",
        "tags": [
          "spell_block",
          "reflect"
        ],
        "values": {
          "tier": 5
        }
      }
    ]
  },
  {
    "id": "i193_t5_fallen_sky",
    "archetype": "meteorito neutro de teleporte curto e impacto",
    "category": "neutral_tier_5",
    "slot": "neutral",
    "shopTier": "neutral",
    "cost": 0,
    "tags": [
      "neutral",
      "tier_5",
      "blink",
      "stun"
    ],
    "stats": {
      "strength": 20,
      "intelligence": 20,
      "healthRegen": 15,
      "manaRegen": 10
    },
    "effects": [
      {
        "id": "t5_fallen_sky_effect",
        "kind": "passive",
        "target": "self",
        "tags": [
          "blink",
          "stun"
        ],
        "values": {
          "tier": 5
        }
      }
    ]
  },
  {
    "id": "i194_t5_desolator_core",
    "archetype": "núcleo neutro de dano acumulativo por abate",
    "category": "neutral_tier_5",
    "slot": "neutral",
    "shopTier": "neutral",
    "cost": 0,
    "tags": [
      "neutral",
      "tier_5",
      "damage",
      "snowball"
    ],
    "stats": {
      "damage": 60
    },
    "effects": [
      {
        "id": "t5_desolator_core_effect",
        "kind": "passive",
        "target": "self",
        "tags": [
          "damage",
          "snowball"
        ],
        "values": {
          "tier": 5
        }
      }
    ]
  },
  {
    "id": "i195_t5_pirate_hat",
    "archetype": "chapéu neutro de ataque extremo e ouro",
    "category": "neutral_tier_5",
    "slot": "neutral",
    "shopTier": "neutral",
    "cost": 0,
    "tags": [
      "neutral",
      "tier_5",
      "attack_speed",
      "economy"
    ],
    "stats": {
      "attackSpeed": 150
    },
    "effects": [
      {
        "id": "t5_pirate_hat_effect",
        "kind": "passive",
        "target": "self",
        "tags": [
          "attack_speed",
          "economy"
        ],
        "values": {
          "tier": 5
        }
      }
    ]
  },
  {
    "id": "i196_e001_mighty",
    "archetype": "encantamento de força",
    "category": "neutral_enchantment",
    "slot": "neutral_enchantment",
    "shopTier": "neutral",
    "cost": 0,
    "tags": [
      "neutral_enchantment",
      "strength"
    ],
    "stats": {
      "strength": 8
    },
    "effects": [
      {
        "id": "e001_mighty_enchant",
        "kind": "enchantment",
        "target": "self",
        "tags": [
          "strength"
        ],
        "values": {
          "canAttachTo": "neutral_artifact"
        }
      }
    ]
  },
  {
    "id": "i197_e002_swift",
    "archetype": "encantamento de agilidade",
    "category": "neutral_enchantment",
    "slot": "neutral_enchantment",
    "shopTier": "neutral",
    "cost": 0,
    "tags": [
      "neutral_enchantment",
      "agility"
    ],
    "stats": {
      "agility": 8
    },
    "effects": [
      {
        "id": "e002_swift_enchant",
        "kind": "enchantment",
        "target": "self",
        "tags": [
          "agility"
        ],
        "values": {
          "canAttachTo": "neutral_artifact"
        }
      }
    ]
  },
  {
    "id": "i198_e003_sage",
    "archetype": "encantamento de inteligência",
    "category": "neutral_enchantment",
    "slot": "neutral_enchantment",
    "shopTier": "neutral",
    "cost": 0,
    "tags": [
      "neutral_enchantment",
      "intelligence"
    ],
    "stats": {
      "intelligence": 8
    },
    "effects": [
      {
        "id": "e003_sage_enchant",
        "kind": "enchantment",
        "target": "self",
        "tags": [
          "intelligence"
        ],
        "values": {
          "canAttachTo": "neutral_artifact"
        }
      }
    ]
  },
  {
    "id": "i199_e004_sturdy",
    "archetype": "encantamento de vida",
    "category": "neutral_enchantment",
    "slot": "neutral_enchantment",
    "shopTier": "neutral",
    "cost": 0,
    "tags": [
      "neutral_enchantment",
      "health"
    ],
    "stats": {
      "maxHealth": 180
    },
    "effects": [
      {
        "id": "e004_sturdy_enchant",
        "kind": "enchantment",
        "target": "self",
        "tags": [
          "health"
        ],
        "values": {
          "canAttachTo": "neutral_artifact"
        }
      }
    ]
  },
  {
    "id": "i200_e005_fleet",
    "archetype": "encantamento de movimento",
    "category": "neutral_enchantment",
    "slot": "neutral_enchantment",
    "shopTier": "neutral",
    "cost": 0,
    "tags": [
      "neutral_enchantment",
      "movement"
    ],
    "stats": {
      "movementSpeed": 25
    },
    "effects": [
      {
        "id": "e005_fleet_enchant",
        "kind": "enchantment",
        "target": "self",
        "tags": [
          "movement"
        ],
        "values": {
          "canAttachTo": "neutral_artifact"
        }
      }
    ]
  },
  {
    "id": "i201_e006_sharp",
    "archetype": "encantamento de dano",
    "category": "neutral_enchantment",
    "slot": "neutral_enchantment",
    "shopTier": "neutral",
    "cost": 0,
    "tags": [
      "neutral_enchantment",
      "damage"
    ],
    "stats": {
      "damage": 18
    },
    "effects": [
      {
        "id": "e006_sharp_enchant",
        "kind": "enchantment",
        "target": "self",
        "tags": [
          "damage"
        ],
        "values": {
          "canAttachTo": "neutral_artifact"
        }
      }
    ]
  },
  {
    "id": "i202_e007_hardened",
    "archetype": "encantamento de armadura",
    "category": "neutral_enchantment",
    "slot": "neutral_enchantment",
    "shopTier": "neutral",
    "cost": 0,
    "tags": [
      "neutral_enchantment",
      "armor"
    ],
    "stats": {
      "armor": 6
    },
    "effects": [
      {
        "id": "e007_hardened_enchant",
        "kind": "enchantment",
        "target": "self",
        "tags": [
          "armor"
        ],
        "values": {
          "canAttachTo": "neutral_artifact"
        }
      }
    ]
  },
  {
    "id": "i203_e008_warded",
    "archetype": "encantamento de resistência mágica",
    "category": "neutral_enchantment",
    "slot": "neutral_enchantment",
    "shopTier": "neutral",
    "cost": 0,
    "tags": [
      "neutral_enchantment",
      "magic_resistance"
    ],
    "stats": {
      "magicResistance": 12
    },
    "effects": [
      {
        "id": "e008_warded_enchant",
        "kind": "enchantment",
        "target": "self",
        "tags": [
          "magic_resistance"
        ],
        "values": {
          "canAttachTo": "neutral_artifact"
        }
      }
    ]
  },
  {
    "id": "i204_e009_focused",
    "archetype": "encantamento de alcance de conjuração",
    "category": "neutral_enchantment",
    "slot": "neutral_enchantment",
    "shopTier": "neutral",
    "cost": 0,
    "tags": [
      "neutral_enchantment",
      "cast_range"
    ],
    "stats": {
      "castRange": 75
    },
    "effects": [
      {
        "id": "e009_focused_enchant",
        "kind": "enchantment",
        "target": "self",
        "tags": [
          "cast_range"
        ],
        "values": {
          "canAttachTo": "neutral_artifact"
        }
      }
    ]
  },
  {
    "id": "i205_e010_vampiric",
    "archetype": "encantamento de roubo de vida",
    "category": "neutral_enchantment",
    "slot": "neutral_enchantment",
    "shopTier": "neutral",
    "cost": 0,
    "tags": [
      "neutral_enchantment",
      "lifesteal"
    ],
    "stats": {
      "lifestealPct": 12
    },
    "effects": [
      {
        "id": "e010_vampiric_enchant",
        "kind": "enchantment",
        "target": "self",
        "tags": [
          "lifesteal"
        ],
        "values": {
          "canAttachTo": "neutral_artifact"
        }
      }
    ]
  },
  {
    "id": "i206_e011_arcane",
    "archetype": "encantamento de mana",
    "category": "neutral_enchantment",
    "slot": "neutral_enchantment",
    "shopTier": "neutral",
    "cost": 0,
    "tags": [
      "neutral_enchantment",
      "mana"
    ],
    "stats": {
      "maxMana": 180,
      "manaRegen": 1.5
    },
    "effects": [
      {
        "id": "e011_arcane_enchant",
        "kind": "enchantment",
        "target": "self",
        "tags": [
          "mana"
        ],
        "values": {
          "canAttachTo": "neutral_artifact"
        }
      }
    ]
  },
  {
    "id": "i207_e012_hasty",
    "archetype": "encantamento de velocidade de ataque",
    "category": "neutral_enchantment",
    "slot": "neutral_enchantment",
    "shopTier": "neutral",
    "cost": 0,
    "tags": [
      "neutral_enchantment",
      "attack_speed"
    ],
    "stats": {
      "attackSpeed": 25
    },
    "effects": [
      {
        "id": "e012_hasty_enchant",
        "kind": "enchantment",
        "target": "self",
        "tags": [
          "attack_speed"
        ],
        "values": {
          "canAttachTo": "neutral_artifact"
        }
      }
    ]
  },
  {
    "id": "i208_e013_resolute",
    "archetype": "encantamento de resistência de status",
    "category": "neutral_enchantment",
    "slot": "neutral_enchantment",
    "shopTier": "neutral",
    "cost": 0,
    "tags": [
      "neutral_enchantment",
      "status_resistance"
    ],
    "stats": {
      "statusResistance": 10
    },
    "effects": [
      {
        "id": "e013_resolute_enchant",
        "kind": "enchantment",
        "target": "self",
        "tags": [
          "status_resistance"
        ],
        "values": {
          "canAttachTo": "neutral_artifact"
        }
      }
    ]
  },
  {
    "id": "i209_e014_restorative",
    "archetype": "encantamento de cura recebida",
    "category": "neutral_enchantment",
    "slot": "neutral_enchantment",
    "shopTier": "neutral",
    "cost": 0,
    "tags": [
      "neutral_enchantment",
      "heal_amp"
    ],
    "stats": {
      "healAmpPct": 12
    },
    "effects": [
      {
        "id": "e014_restorative_enchant",
        "kind": "enchantment",
        "target": "self",
        "tags": [
          "heal_amp"
        ],
        "values": {
          "canAttachTo": "neutral_artifact"
        }
      }
    ]
  },
  {
    "id": "i210_e015_visionary",
    "archetype": "encantamento de visão noturna",
    "category": "neutral_enchantment",
    "slot": "neutral_enchantment",
    "shopTier": "neutral",
    "cost": 0,
    "tags": [
      "neutral_enchantment",
      "vision"
    ],
    "stats": {
      "nightVision": 350
    },
    "effects": [
      {
        "id": "e015_visionary_enchant",
        "kind": "enchantment",
        "target": "self",
        "tags": [
          "vision"
        ],
        "values": {
          "canAttachTo": "neutral_artifact"
        }
      }
    ]
  }
];

export const CODEX_ITEM_IMPLEMENTATION_NOTES = `
Use ITEM_SEEDS as the initial item database for the MOBA manager.
Do not add official Dota names, icons or lore.
First implementation priorities:
1. Item card rendering in the UI.
2. Filtering by category, tags, cost, slot and role synergy.
3. Applying flat stats to HeroCalculatedStats.
4. Handling inventory slots, neutral slot and neutral enchantments separately.
5. Recipe validation through components.
6. Active/passive/toggle/aura effects should be parsed and displayed first; full combat execution can be implemented later.
7. Consumables and map utility can be implemented as manager commands before real-time combat.
8. Neutral artifacts and enchantments are intentionally separated so the draft system can roll one artifact plus one enchantment.
`;
