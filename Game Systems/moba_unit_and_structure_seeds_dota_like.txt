// moba_unit_seeds_dota_like.txt
// Dados de unidades para um simulador de manager de MOBA inspirado em Dota-like.
// Não é uma tabela oficial de Dota 2. Os nomes e números abaixo são adaptados e balanceáveis.
// Inclui lane creeps, super/mega creeps, creeps neutros, bosses estilo Roshan/Tormentor, summons/wards/clones e estruturas.
// Recomendação: salvar como src/data/unitSeeds.ts e ajustar números após testes de simulação.

export type UnitCategory =
  | "lane_creep"
  | "neutral_creep"
  | "boss"
  | "summon"
  | "illusion"
  | "clone"
  | "ward"
  | "mine"
  | "pet"
  | "structure";

export type CampTier =
  | "none"
  | "small"
  | "medium"
  | "large"
  | "ancient"
  | "boss";

export type AttackType = "melee" | "ranged" | "none";
export type DamageType = "physical" | "magical" | "pure" | "none";

export interface UnitAbilitySeed {
  id: string;
  kind: "active" | "passive" | "aura" | "on_death" | "toggle";
  damageType: DamageType;
  tags: string[];
  values?: Record<string, number | number[] | string | boolean>;
}

export interface UnitSeed {
  id: string;
  category: UnitCategory;
  referenceRole: string;
  campTier: CampTier;

  attackType: AttackType;
  isAncient: boolean;
  isBoss: boolean;
  isControllable: boolean;
  isHeroLike: boolean;
  isBuildingLike: boolean;

  tags: string[];

  bounty: {
    goldMin: number;
    goldMax: number;
    xp: number;
    teamGold?: number;
    special?: string;
  };

  spawn: {
    firstSpawnSecond: number;
    respawnIntervalSecond: number;
    waveIntervalSecond?: number;
    maxCount?: number;
    durationSecond?: number;
    canStack?: boolean;
    canBeConverted?: boolean;
  };

  baseStats: {
    maxHealth: number;
    healthRegen: number;
    maxMana: number;
    manaRegen: number;

    damageMin: number;
    damageMax: number;
    armor: number;
    magicResistance: number;

    baseAttackSpeed: number;
    baseAttackTime: number;
    attackRange: number;
    acquisitionRange: number;

    movementSpeed: number;
    turnRate: number;
    collisionSize: number;

    dayVision: number;
    nightVision: number;
  };

  scaling?: {
    healthPerMinute?: number;
    damagePerMinute?: number;
    armorPerMinute?: number;
    bountyGoldPerMinute?: number;
    bountyXpPerMinute?: number;
    upgradeEverySeconds?: number;
  };

  abilities: UnitAbilitySeed[];

  structure?: {
    teamId: string;
    structureType:
      | "tower"
      | "barracks_melee"
      | "barracks_ranged"
      | "ancient_core";
    lane: "top" | "mid" | "bottom" | "base";
    tier: number;
    side: "left" | "right" | "none";
    hasBackdoorProtection: boolean;
    canBeFortified: boolean;
    requiredDestroyedStructureIds: string[];
    unlocksNextStructureIds: string[];
    objectiveValue: {
      mapControl: number;
      lanePressure: number;
      baseDefense: number;
      ancientDefense: number;
    };
  };
}

export const LANE_CREEP_SEEDS: UnitSeed[] = [
  {
    id: "lane_melee_creep",
    category: "lane_creep",
    referenceRole: "basic melee lane creep",
    campTier: "none",
    attackType: "melee",
    isAncient: false,
    isBoss: false,
    isControllable: false,
    isHeroLike: false,
    isBuildingLike: false,
    tags: ["lane", "melee", "basic_wave"],
    bounty: {
      goldMin: 34,
      goldMax: 39,
      xp: 57
    },
    spawn: {
      firstSpawnSecond: 0,
      respawnIntervalSecond: 30,
      canStack: false,
      canBeConverted: false,
      waveIntervalSecond: 30,
      maxCount: 3
    },
    baseStats: {
      maxHealth: 550,
      healthRegen: 0,
      maxMana: 0,
      manaRegen: 0,
      damageMin: 19,
      damageMax: 23,
      armor: 2,
      magicResistance: 0,
      baseAttackSpeed: 100,
      baseAttackTime: 1.0,
      attackRange: 150,
      acquisitionRange: 500,
      movementSpeed: 325,
      turnRate: 0.5,
      collisionSize: 16,
      dayVision: 800,
      nightVision: 800
    },
    scaling: {
      healthPerMinute: 1.6,
      damagePerMinute: 0.12,
      bountyGoldPerMinute: 0.2,
      upgradeEverySeconds: 450
    },
    abilities: []
  },

  {
    id: "lane_ranged_creep",
    category: "lane_creep",
    referenceRole: "basic ranged lane creep",
    campTier: "none",
    attackType: "ranged",
    isAncient: false,
    isBoss: false,
    isControllable: false,
    isHeroLike: false,
    isBuildingLike: false,
    tags: ["lane", "ranged", "basic_wave", "higher_xp"],
    bounty: {
      goldMin: 43,
      goldMax: 52,
      xp: 69
    },
    spawn: {
      firstSpawnSecond: 0,
      respawnIntervalSecond: 30,
      canStack: false,
      canBeConverted: false,
      waveIntervalSecond: 30,
      maxCount: 1
    },
    baseStats: {
      maxHealth: 300,
      healthRegen: 0,
      maxMana: 500,
      manaRegen: 0.75,
      damageMin: 21,
      damageMax: 26,
      armor: 0,
      magicResistance: 0,
      baseAttackSpeed: 100,
      baseAttackTime: 1.0,
      attackRange: 500,
      acquisitionRange: 800,
      movementSpeed: 325,
      turnRate: 0.5,
      collisionSize: 16,
      dayVision: 800,
      nightVision: 800
    },
    scaling: {
      healthPerMinute: 1.0,
      damagePerMinute: 0.12,
      bountyGoldPerMinute: 0.2,
      upgradeEverySeconds: 450
    },
    abilities: [
      {
        id: "ranged_creep_mana_bolt",
        kind: "active",
        damageType: "magical",
        tags: ["small_nuke"],
        values: {
          damage: 15,
          cooldown: 6
        }
      }
    ]
  },

  {
    id: "lane_siege_creep",
    category: "lane_creep",
    referenceRole: "siege lane creep for tower pressure",
    campTier: "none",
    attackType: "ranged",
    isAncient: false,
    isBoss: false,
    isControllable: false,
    isHeroLike: false,
    isBuildingLike: false,
    tags: ["lane", "siege", "building_damage", "wave_timing"],
    bounty: {
      goldMin: 66,
      goldMax: 80,
      xp: 88
    },
    spawn: {
      firstSpawnSecond: 300,
      respawnIntervalSecond: 150,
      canStack: false,
      canBeConverted: false,
      waveIntervalSecond: 150,
      maxCount: 1
    },
    baseStats: {
      maxHealth: 935,
      healthRegen: 0,
      maxMana: 0,
      manaRegen: 0,
      damageMin: 35,
      damageMax: 46,
      armor: 0,
      magicResistance: 80,
      baseAttackSpeed: 100,
      baseAttackTime: 2.7,
      attackRange: 690,
      acquisitionRange: 800,
      movementSpeed: 325,
      turnRate: 0.5,
      collisionSize: 16,
      dayVision: 800,
      nightVision: 800
    },
    scaling: {
      healthPerMinute: 2.6,
      damagePerMinute: 0.18,
      bountyGoldPerMinute: 0.3,
      upgradeEverySeconds: 450
    },
    abilities: [
      {
        id: "siege_building_pressure",
        kind: "passive",
        damageType: "none",
        tags: ["bonus_vs_buildings"],
        values: {
          buildingDamageMultiplier: 1.5
        }
      }
    ]
  },

  {
    id: "lane_flagbearer_creep",
    category: "lane_creep",
    referenceRole: "flagbearer lane creep with team economy aura",
    campTier: "none",
    attackType: "melee",
    isAncient: false,
    isBoss: false,
    isControllable: false,
    isHeroLike: false,
    isBuildingLike: false,
    tags: ["lane", "flagbearer", "bonus_gold", "aura"],
    bounty: {
      goldMin: 40,
      goldMax: 48,
      xp: 57,
      special: "On death, grants bonus unreliable gold to nearby enemy heroes in addition to last-hit bounty."
    },
    spawn: {
      firstSpawnSecond: 120,
      respawnIntervalSecond: 60,
      canStack: false,
      canBeConverted: false,
      waveIntervalSecond: 60,
      maxCount: 1
    },
    baseStats: {
      maxHealth: 550,
      healthRegen: 0,
      maxMana: 0,
      manaRegen: 0,
      damageMin: 19,
      damageMax: 23,
      armor: 3,
      magicResistance: 0,
      baseAttackSpeed: 100,
      baseAttackTime: 1.0,
      attackRange: 150,
      acquisitionRange: 500,
      movementSpeed: 325,
      turnRate: 0.5,
      collisionSize: 16,
      dayVision: 800,
      nightVision: 800
    },
    scaling: {
      healthPerMinute: 1.6,
      damagePerMinute: 0.12,
      bountyGoldPerMinute: 0.2,
      upgradeEverySeconds: 450
    },
    abilities: [
      {
        id: "flagbearer_gold_aura",
        kind: "aura",
        damageType: "none",
        tags: ["bonus_gold_radius"],
        values: {
          radius: 1500,
          bonusGold: 10
        }
      }
    ]
  },

  {
    id: "super_melee_creep",
    category: "lane_creep",
    referenceRole: "upgraded melee creep after melee barracks destruction",
    campTier: "none",
    attackType: "melee",
    isAncient: false,
    isBoss: false,
    isControllable: false,
    isHeroLike: false,
    isBuildingLike: false,
    tags: ["lane", "melee", "super_creep", "barracks_upgrade"],
    bounty: {
      goldMin: 40,
      goldMax: 48,
      xp: 65
    },
    spawn: {
      firstSpawnSecond: 0,
      respawnIntervalSecond: 30,
      canStack: false,
      canBeConverted: false,
      waveIntervalSecond: 30,
      maxCount: 3
    },
    baseStats: {
      maxHealth: 750,
      healthRegen: 0,
      maxMana: 0,
      manaRegen: 0,
      damageMin: 35,
      damageMax: 40,
      armor: 3,
      magicResistance: 0,
      baseAttackSpeed: 100,
      baseAttackTime: 1.0,
      attackRange: 150,
      acquisitionRange: 500,
      movementSpeed: 325,
      turnRate: 0.5,
      collisionSize: 16,
      dayVision: 800,
      nightVision: 800
    },
    scaling: {
      healthPerMinute: 2.0,
      damagePerMinute: 0.16,
      bountyGoldPerMinute: 0.2,
      upgradeEverySeconds: 450
    },
    abilities: []
  },

  {
    id: "super_ranged_creep",
    category: "lane_creep",
    referenceRole: "upgraded ranged creep after ranged barracks destruction",
    campTier: "none",
    attackType: "ranged",
    isAncient: false,
    isBoss: false,
    isControllable: false,
    isHeroLike: false,
    isBuildingLike: false,
    tags: ["lane", "ranged", "super_creep", "barracks_upgrade"],
    bounty: {
      goldMin: 48,
      goldMax: 58,
      xp: 75
    },
    spawn: {
      firstSpawnSecond: 0,
      respawnIntervalSecond: 30,
      canStack: false,
      canBeConverted: false,
      waveIntervalSecond: 30,
      maxCount: 1
    },
    baseStats: {
      maxHealth: 475,
      healthRegen: 0,
      maxMana: 0,
      manaRegen: 0,
      damageMin: 36,
      damageMax: 43,
      armor: 1,
      magicResistance: 0,
      baseAttackSpeed: 100,
      baseAttackTime: 1.0,
      attackRange: 500,
      acquisitionRange: 800,
      movementSpeed: 325,
      turnRate: 0.5,
      collisionSize: 16,
      dayVision: 800,
      nightVision: 800
    },
    scaling: {
      healthPerMinute: 1.2,
      damagePerMinute: 0.16,
      bountyGoldPerMinute: 0.2,
      upgradeEverySeconds: 450
    },
    abilities: []
  },

  {
    id: "mega_melee_creep",
    category: "lane_creep",
    referenceRole: "mega melee creep after all barracks destruction",
    campTier: "none",
    attackType: "melee",
    isAncient: false,
    isBoss: false,
    isControllable: false,
    isHeroLike: false,
    isBuildingLike: false,
    tags: ["lane", "melee", "mega_creep", "all_barracks_upgrade"],
    bounty: {
      goldMin: 40,
      goldMax: 48,
      xp: 65
    },
    spawn: {
      firstSpawnSecond: 0,
      respawnIntervalSecond: 30,
      canStack: false,
      canBeConverted: false,
      waveIntervalSecond: 30,
      maxCount: 3
    },
    baseStats: {
      maxHealth: 1270,
      healthRegen: 0,
      maxMana: 0,
      manaRegen: 0,
      damageMin: 80,
      damageMax: 90,
      armor: 5,
      magicResistance: 0,
      baseAttackSpeed: 100,
      baseAttackTime: 1.0,
      attackRange: 150,
      acquisitionRange: 500,
      movementSpeed: 325,
      turnRate: 0.5,
      collisionSize: 16,
      dayVision: 800,
      nightVision: 800
    },
    scaling: {
      healthPerMinute: 2.4,
      damagePerMinute: 0.22,
      bountyGoldPerMinute: 0.2,
      upgradeEverySeconds: 450
    },
    abilities: []
  },

  {
    id: "mega_ranged_creep",
    category: "lane_creep",
    referenceRole: "mega ranged creep after all barracks destruction",
    campTier: "none",
    attackType: "ranged",
    isAncient: false,
    isBoss: false,
    isControllable: false,
    isHeroLike: false,
    isBuildingLike: false,
    tags: ["lane", "ranged", "mega_creep", "all_barracks_upgrade"],
    bounty: {
      goldMin: 48,
      goldMax: 58,
      xp: 75
    },
    spawn: {
      firstSpawnSecond: 0,
      respawnIntervalSecond: 30,
      canStack: false,
      canBeConverted: false,
      waveIntervalSecond: 30,
      maxCount: 1
    },
    baseStats: {
      maxHealth: 1015,
      healthRegen: 0,
      maxMana: 0,
      manaRegen: 0,
      damageMin: 85,
      damageMax: 95,
      armor: 3,
      magicResistance: 0,
      baseAttackSpeed: 100,
      baseAttackTime: 1.0,
      attackRange: 500,
      acquisitionRange: 800,
      movementSpeed: 325,
      turnRate: 0.5,
      collisionSize: 16,
      dayVision: 800,
      nightVision: 800
    },
    scaling: {
      healthPerMinute: 1.8,
      damagePerMinute: 0.22,
      bountyGoldPerMinute: 0.2,
      upgradeEverySeconds: 450
    },
    abilities: []
  }
];

export const NEUTRAL_CREEP_SEEDS: UnitSeed[] = [
  {
    id: "small_kobold_runner",
    category: "neutral_creep",
    referenceRole: "small fast weak neutral",
    campTier: "small",
    attackType: "melee",
    isAncient: false,
    isBoss: false,
    isControllable: false,
    isHeroLike: false,
    isBuildingLike: false,
    tags: ["small", "fast"],
    bounty: {
      goldMin: 7,
      goldMax: 9,
      xp: 14
    },
    spawn: {
      firstSpawnSecond: 60,
      respawnIntervalSecond: 60,
      canStack: true,
      canBeConverted: true
    },
    baseStats: {
      maxHealth: 240,
      healthRegen: 0,
      maxMana: 0,
      manaRegen: 0,
      damageMin: 10,
      damageMax: 12,
      armor: 0,
      magicResistance: 25,
      baseAttackSpeed: 100,
      baseAttackTime: 1.6,
      attackRange: 150,
      acquisitionRange: 600,
      movementSpeed: 320,
      turnRate: 0.5,
      collisionSize: 16,
      dayVision: 800,
      nightVision: 800
    },
    scaling: {
      bountyGoldPerMinute: 0.0,
      bountyXpPerMinute: 0.0
    },
    abilities: []
  },

  {
    id: "small_kobold_overseer",
    category: "neutral_creep",
    referenceRole: "small camp aura leader",
    campTier: "small",
    attackType: "melee",
    isAncient: false,
    isBoss: false,
    isControllable: false,
    isHeroLike: false,
    isBuildingLike: false,
    tags: ["small", "aura", "speed"],
    bounty: {
      goldMin: 12,
      goldMax: 16,
      xp: 22
    },
    spawn: {
      firstSpawnSecond: 60,
      respawnIntervalSecond: 60,
      canStack: true,
      canBeConverted: true
    },
    baseStats: {
      maxHealth: 400,
      healthRegen: 0,
      maxMana: 0,
      manaRegen: 0,
      damageMin: 18,
      damageMax: 22,
      armor: 1,
      magicResistance: 25,
      baseAttackSpeed: 100,
      baseAttackTime: 1.6,
      attackRange: 150,
      acquisitionRange: 600,
      movementSpeed: 330,
      turnRate: 0.5,
      collisionSize: 16,
      dayVision: 800,
      nightVision: 800
    },
    scaling: {
      bountyGoldPerMinute: 0.0,
      bountyXpPerMinute: 0.0
    },
    abilities: [
      {
        id: "kobold_speed_aura",
        kind: "aura",
        damageType: "none",
        tags: ["movement_speed_aura"],
        values: {
          radius: 900,
          moveSpeedBonusPct: 12
        }
      }
    ]
  },

  {
    id: "small_gnoll_assassin",
    category: "neutral_creep",
    referenceRole: "small camp poison attacker",
    campTier: "small",
    attackType: "ranged",
    isAncient: false,
    isBoss: false,
    isControllable: false,
    isHeroLike: false,
    isBuildingLike: false,
    tags: ["small", "poison"],
    bounty: {
      goldMin: 12,
      goldMax: 16,
      xp: 20
    },
    spawn: {
      firstSpawnSecond: 60,
      respawnIntervalSecond: 60,
      canStack: true,
      canBeConverted: true
    },
    baseStats: {
      maxHealth: 370,
      healthRegen: 0,
      maxMana: 0,
      manaRegen: 0,
      damageMin: 22,
      damageMax: 28,
      armor: 1,
      magicResistance: 25,
      baseAttackSpeed: 100,
      baseAttackTime: 1.7,
      attackRange: 500,
      acquisitionRange: 800,
      movementSpeed: 300,
      turnRate: 0.5,
      collisionSize: 16,
      dayVision: 800,
      nightVision: 800
    },
    scaling: {
      bountyGoldPerMinute: 0.0,
      bountyXpPerMinute: 0.0
    },
    abilities: [
      {
        id: "minor_poison_attack",
        kind: "passive",
        damageType: "magical",
        tags: ["dot"],
        values: {
          dps: 6,
          duration: 3
        }
      }
    ]
  },

  {
    id: "small_forest_troll",
    category: "neutral_creep",
    referenceRole: "small ranged neutral",
    campTier: "small",
    attackType: "ranged",
    isAncient: false,
    isBoss: false,
    isControllable: false,
    isHeroLike: false,
    isBuildingLike: false,
    tags: ["small", "ranged"],
    bounty: {
      goldMin: 9,
      goldMax: 13,
      xp: 18
    },
    spawn: {
      firstSpawnSecond: 60,
      respawnIntervalSecond: 60,
      canStack: true,
      canBeConverted: true
    },
    baseStats: {
      maxHealth: 300,
      healthRegen: 0,
      maxMana: 0,
      manaRegen: 0,
      damageMin: 18,
      damageMax: 23,
      armor: 0,
      magicResistance: 25,
      baseAttackSpeed: 100,
      baseAttackTime: 1.7,
      attackRange: 500,
      acquisitionRange: 800,
      movementSpeed: 300,
      turnRate: 0.5,
      collisionSize: 16,
      dayVision: 800,
      nightVision: 800
    },
    scaling: {
      bountyGoldPerMinute: 0.0,
      bountyXpPerMinute: 0.0
    },
    abilities: []
  },

  {
    id: "small_harpy_scout",
    category: "neutral_creep",
    referenceRole: "small flying vision neutral",
    campTier: "small",
    attackType: "ranged",
    isAncient: false,
    isBoss: false,
    isControllable: false,
    isHeroLike: false,
    isBuildingLike: false,
    tags: ["small", "flying", "vision"],
    bounty: {
      goldMin: 11,
      goldMax: 15,
      xp: 20
    },
    spawn: {
      firstSpawnSecond: 60,
      respawnIntervalSecond: 60,
      canStack: true,
      canBeConverted: true
    },
    baseStats: {
      maxHealth: 330,
      healthRegen: 0,
      maxMana: 0,
      manaRegen: 0,
      damageMin: 20,
      damageMax: 25,
      armor: 0,
      magicResistance: 25,
      baseAttackSpeed: 100,
      baseAttackTime: 1.7,
      attackRange: 500,
      acquisitionRange: 800,
      movementSpeed: 320,
      turnRate: 0.5,
      collisionSize: 16,
      dayVision: 800,
      nightVision: 800
    },
    scaling: {
      bountyGoldPerMinute: 0.0,
      bountyXpPerMinute: 0.0
    },
    abilities: [
      {
        id: "harpy_chain_spark",
        kind: "active",
        damageType: "magical",
        tags: ["small_nuke"],
        values: {
          damage: 35,
          cooldown: 8
        }
      }
    ]
  },

  {
    id: "small_frost_ghost",
    category: "neutral_creep",
    referenceRole: "small ghost with slow",
    campTier: "small",
    attackType: "ranged",
    isAncient: false,
    isBoss: false,
    isControllable: false,
    isHeroLike: false,
    isBuildingLike: false,
    tags: ["small", "slow"],
    bounty: {
      goldMin: 10,
      goldMax: 14,
      xp: 20
    },
    spawn: {
      firstSpawnSecond: 60,
      respawnIntervalSecond: 60,
      canStack: true,
      canBeConverted: true
    },
    baseStats: {
      maxHealth: 360,
      healthRegen: 0,
      maxMana: 0,
      manaRegen: 0,
      damageMin: 16,
      damageMax: 20,
      armor: 1,
      magicResistance: 25,
      baseAttackSpeed: 100,
      baseAttackTime: 1.7,
      attackRange: 500,
      acquisitionRange: 800,
      movementSpeed: 300,
      turnRate: 0.5,
      collisionSize: 16,
      dayVision: 800,
      nightVision: 800
    },
    scaling: {
      bountyGoldPerMinute: 0.0,
      bountyXpPerMinute: 0.0
    },
    abilities: [
      {
        id: "minor_frost_slow",
        kind: "passive",
        damageType: "none",
        tags: ["slow"],
        values: {
          slowPct: 10,
          duration: 2
        }
      }
    ]
  },

  {
    id: "small_mud_golem",
    category: "neutral_creep",
    referenceRole: "small durable neutral",
    campTier: "small",
    attackType: "melee",
    isAncient: false,
    isBoss: false,
    isControllable: false,
    isHeroLike: false,
    isBuildingLike: false,
    tags: ["small", "durable"],
    bounty: {
      goldMin: 13,
      goldMax: 17,
      xp: 24
    },
    spawn: {
      firstSpawnSecond: 60,
      respawnIntervalSecond: 60,
      canStack: true,
      canBeConverted: true
    },
    baseStats: {
      maxHealth: 500,
      healthRegen: 0,
      maxMana: 0,
      manaRegen: 0,
      damageMin: 20,
      damageMax: 24,
      armor: 2,
      magicResistance: 25,
      baseAttackSpeed: 100,
      baseAttackTime: 1.6,
      attackRange: 150,
      acquisitionRange: 600,
      movementSpeed: 270,
      turnRate: 0.5,
      collisionSize: 16,
      dayVision: 800,
      nightVision: 800
    },
    scaling: {
      bountyGoldPerMinute: 0.0,
      bountyXpPerMinute: 0.0
    },
    abilities: [
      {
        id: "mud_split",
        kind: "on_death",
        damageType: "none",
        tags: ["split"],
        values: {
          summons: 2
        }
      }
    ]
  },

  {
    id: "small_satyr_trickster",
    category: "neutral_creep",
    referenceRole: "small purge neutral",
    campTier: "small",
    attackType: "ranged",
    isAncient: false,
    isBoss: false,
    isControllable: false,
    isHeroLike: false,
    isBuildingLike: false,
    tags: ["small", "purge"],
    bounty: {
      goldMin: 12,
      goldMax: 16,
      xp: 22
    },
    spawn: {
      firstSpawnSecond: 60,
      respawnIntervalSecond: 60,
      canStack: true,
      canBeConverted: true
    },
    baseStats: {
      maxHealth: 360,
      healthRegen: 0,
      maxMana: 0,
      manaRegen: 0,
      damageMin: 18,
      damageMax: 22,
      armor: 0,
      magicResistance: 25,
      baseAttackSpeed: 100,
      baseAttackTime: 1.7,
      attackRange: 500,
      acquisitionRange: 800,
      movementSpeed: 300,
      turnRate: 0.5,
      collisionSize: 16,
      dayVision: 800,
      nightVision: 800
    },
    scaling: {
      bountyGoldPerMinute: 0.0,
      bountyXpPerMinute: 0.0
    },
    abilities: [
      {
        id: "minor_purge",
        kind: "active",
        damageType: "none",
        tags: ["dispel", "slow"],
        values: {
          slowPct: 20,
          duration: 3,
          cooldown: 12
        }
      }
    ]
  },

  {
    id: "medium_centaur_runner",
    category: "neutral_creep",
    referenceRole: "medium melee bruiser",
    campTier: "medium",
    attackType: "melee",
    isAncient: false,
    isBoss: false,
    isControllable: false,
    isHeroLike: false,
    isBuildingLike: false,
    tags: ["medium", "durable"],
    bounty: {
      goldMin: 18,
      goldMax: 24,
      xp: 36
    },
    spawn: {
      firstSpawnSecond: 60,
      respawnIntervalSecond: 60,
      canStack: true,
      canBeConverted: true
    },
    baseStats: {
      maxHealth: 650,
      healthRegen: 0,
      maxMana: 0,
      manaRegen: 0,
      damageMin: 28,
      damageMax: 34,
      armor: 2,
      magicResistance: 25,
      baseAttackSpeed: 100,
      baseAttackTime: 1.6,
      attackRange: 150,
      acquisitionRange: 600,
      movementSpeed: 320,
      turnRate: 0.5,
      collisionSize: 16,
      dayVision: 800,
      nightVision: 800
    },
    scaling: {
      bountyGoldPerMinute: 0.0,
      bountyXpPerMinute: 0.0
    },
    abilities: []
  },

  {
    id: "medium_centaur_stomper",
    category: "neutral_creep",
    referenceRole: "medium neutral with stomp",
    campTier: "medium",
    attackType: "melee",
    isAncient: false,
    isBoss: false,
    isControllable: false,
    isHeroLike: false,
    isBuildingLike: false,
    tags: ["medium", "stun"],
    bounty: {
      goldMin: 28,
      goldMax: 36,
      xp: 58
    },
    spawn: {
      firstSpawnSecond: 60,
      respawnIntervalSecond: 60,
      canStack: true,
      canBeConverted: true
    },
    baseStats: {
      maxHealth: 950,
      healthRegen: 0,
      maxMana: 0,
      manaRegen: 0,
      damageMin: 42,
      damageMax: 50,
      armor: 3,
      magicResistance: 25,
      baseAttackSpeed: 100,
      baseAttackTime: 1.6,
      attackRange: 150,
      acquisitionRange: 600,
      movementSpeed: 320,
      turnRate: 0.5,
      collisionSize: 16,
      dayVision: 800,
      nightVision: 800
    },
    scaling: {
      bountyGoldPerMinute: 0.0,
      bountyXpPerMinute: 0.0
    },
    abilities: [
      {
        id: "centaur_stomp",
        kind: "active",
        damageType: "magical",
        tags: ["aoe_stun"],
        values: {
          damage: 75,
          stun: 1.6,
          radius: 250,
          cooldown: 12
        }
      }
    ]
  },

  {
    id: "medium_wolf",
    category: "neutral_creep",
    referenceRole: "medium wolf damage unit",
    campTier: "medium",
    attackType: "melee",
    isAncient: false,
    isBoss: false,
    isControllable: false,
    isHeroLike: false,
    isBuildingLike: false,
    tags: ["medium", "damage"],
    bounty: {
      goldMin: 16,
      goldMax: 22,
      xp: 32
    },
    spawn: {
      firstSpawnSecond: 60,
      respawnIntervalSecond: 60,
      canStack: true,
      canBeConverted: true
    },
    baseStats: {
      maxHealth: 500,
      healthRegen: 0,
      maxMana: 0,
      manaRegen: 0,
      damageMin: 24,
      damageMax: 30,
      armor: 1,
      magicResistance: 25,
      baseAttackSpeed: 100,
      baseAttackTime: 1.6,
      attackRange: 150,
      acquisitionRange: 600,
      movementSpeed: 350,
      turnRate: 0.5,
      collisionSize: 16,
      dayVision: 800,
      nightVision: 800
    },
    scaling: {
      bountyGoldPerMinute: 0.0,
      bountyXpPerMinute: 0.0
    },
    abilities: []
  },

  {
    id: "medium_alpha_wolf",
    category: "neutral_creep",
    referenceRole: "medium aura wolf",
    campTier: "medium",
    attackType: "melee",
    isAncient: false,
    isBoss: false,
    isControllable: false,
    isHeroLike: false,
    isBuildingLike: false,
    tags: ["medium", "aura", "critical"],
    bounty: {
      goldMin: 28,
      goldMax: 36,
      xp: 56
    },
    spawn: {
      firstSpawnSecond: 60,
      respawnIntervalSecond: 60,
      canStack: true,
      canBeConverted: true
    },
    baseStats: {
      maxHealth: 750,
      healthRegen: 0,
      maxMana: 0,
      manaRegen: 0,
      damageMin: 34,
      damageMax: 42,
      armor: 2,
      magicResistance: 25,
      baseAttackSpeed: 100,
      baseAttackTime: 1.6,
      attackRange: 150,
      acquisitionRange: 600,
      movementSpeed: 350,
      turnRate: 0.5,
      collisionSize: 16,
      dayVision: 800,
      nightVision: 800
    },
    scaling: {
      bountyGoldPerMinute: 0.0,
      bountyXpPerMinute: 0.0
    },
    abilities: [
      {
        id: "pack_damage_aura",
        kind: "aura",
        damageType: "none",
        tags: ["damage_aura"],
        values: {
          radius: 900,
          damageBonusPct: 12
        }
      },
      {
        id: "minor_critical",
        kind: "passive",
        damageType: "physical",
        tags: ["critical"],
        values: {
          critChance: 20,
          critMultiplier: 170
        }
      }
    ]
  },

  {
    id: "medium_ogre_bruiser",
    category: "neutral_creep",
    referenceRole: "medium durable ogre",
    campTier: "medium",
    attackType: "melee",
    isAncient: false,
    isBoss: false,
    isControllable: false,
    isHeroLike: false,
    isBuildingLike: false,
    tags: ["medium", "durable"],
    bounty: {
      goldMin: 20,
      goldMax: 28,
      xp: 42
    },
    spawn: {
      firstSpawnSecond: 60,
      respawnIntervalSecond: 60,
      canStack: true,
      canBeConverted: true
    },
    baseStats: {
      maxHealth: 850,
      healthRegen: 0,
      maxMana: 0,
      manaRegen: 0,
      damageMin: 32,
      damageMax: 38,
      armor: 1,
      magicResistance: 25,
      baseAttackSpeed: 100,
      baseAttackTime: 1.6,
      attackRange: 150,
      acquisitionRange: 600,
      movementSpeed: 280,
      turnRate: 0.5,
      collisionSize: 16,
      dayVision: 800,
      nightVision: 800
    },
    scaling: {
      bountyGoldPerMinute: 0.0,
      bountyXpPerMinute: 0.0
    },
    abilities: []
  },

  {
    id: "medium_ogre_magi",
    category: "neutral_creep",
    referenceRole: "medium armor aura caster",
    campTier: "medium",
    attackType: "ranged",
    isAncient: false,
    isBoss: false,
    isControllable: false,
    isHeroLike: false,
    isBuildingLike: false,
    tags: ["medium", "armor_aura"],
    bounty: {
      goldMin: 24,
      goldMax: 32,
      xp: 52
    },
    spawn: {
      firstSpawnSecond: 60,
      respawnIntervalSecond: 60,
      canStack: true,
      canBeConverted: true
    },
    baseStats: {
      maxHealth: 650,
      healthRegen: 0,
      maxMana: 0,
      manaRegen: 0,
      damageMin: 24,
      damageMax: 30,
      armor: 1,
      magicResistance: 25,
      baseAttackSpeed: 100,
      baseAttackTime: 1.7,
      attackRange: 500,
      acquisitionRange: 800,
      movementSpeed: 290,
      turnRate: 0.5,
      collisionSize: 16,
      dayVision: 800,
      nightVision: 800
    },
    scaling: {
      bountyGoldPerMinute: 0.0,
      bountyXpPerMinute: 0.0
    },
    abilities: [
      {
        id: "ogre_frost_armor",
        kind: "active",
        damageType: "none",
        tags: ["armor_buff", "slow"],
        values: {
          armor: 5,
          duration: 45,
          cooldown: 8
        }
      }
    ]
  },

  {
    id: "medium_satyr_banisher",
    category: "neutral_creep",
    referenceRole: "medium mana burn neutral",
    campTier: "medium",
    attackType: "ranged",
    isAncient: false,
    isBoss: false,
    isControllable: false,
    isHeroLike: false,
    isBuildingLike: false,
    tags: ["medium", "mana_burn"],
    bounty: {
      goldMin: 24,
      goldMax: 32,
      xp: 52
    },
    spawn: {
      firstSpawnSecond: 60,
      respawnIntervalSecond: 60,
      canStack: true,
      canBeConverted: true
    },
    baseStats: {
      maxHealth: 600,
      healthRegen: 0,
      maxMana: 0,
      manaRegen: 0,
      damageMin: 24,
      damageMax: 30,
      armor: 0,
      magicResistance: 25,
      baseAttackSpeed: 100,
      baseAttackTime: 1.7,
      attackRange: 500,
      acquisitionRange: 800,
      movementSpeed: 300,
      turnRate: 0.5,
      collisionSize: 16,
      dayVision: 800,
      nightVision: 800
    },
    scaling: {
      bountyGoldPerMinute: 0.0,
      bountyXpPerMinute: 0.0
    },
    abilities: [
      {
        id: "mana_burn",
        kind: "active",
        damageType: "magical",
        tags: ["mana_burn"],
        values: {
          manaBurn: 100,
          damage: 100,
          cooldown: 15
        }
      }
    ]
  },

  {
    id: "medium_wildwing_ripper",
    category: "neutral_creep",
    referenceRole: "medium tornado neutral",
    campTier: "medium",
    attackType: "ranged",
    isAncient: false,
    isBoss: false,
    isControllable: false,
    isHeroLike: false,
    isBuildingLike: false,
    tags: ["medium", "tornado"],
    bounty: {
      goldMin: 24,
      goldMax: 32,
      xp: 52
    },
    spawn: {
      firstSpawnSecond: 60,
      respawnIntervalSecond: 60,
      canStack: true,
      canBeConverted: true
    },
    baseStats: {
      maxHealth: 700,
      healthRegen: 0,
      maxMana: 0,
      manaRegen: 0,
      damageMin: 28,
      damageMax: 35,
      armor: 1,
      magicResistance: 25,
      baseAttackSpeed: 100,
      baseAttackTime: 1.7,
      attackRange: 500,
      acquisitionRange: 800,
      movementSpeed: 320,
      turnRate: 0.5,
      collisionSize: 16,
      dayVision: 800,
      nightVision: 800
    },
    scaling: {
      bountyGoldPerMinute: 0.0,
      bountyXpPerMinute: 0.0
    },
    abilities: [
      {
        id: "wild_tornado",
        kind: "active",
        damageType: "magical",
        tags: ["tornado", "zone"],
        values: {
          dps: 15,
          duration: 10,
          radius: 150,
          cooldown: 30
        }
      }
    ]
  },

  {
    id: "large_polar_beast",
    category: "neutral_creep",
    referenceRole: "large durable beast",
    campTier: "large",
    attackType: "melee",
    isAncient: false,
    isBoss: false,
    isControllable: false,
    isHeroLike: false,
    isBuildingLike: false,
    tags: ["large", "durable"],
    bounty: {
      goldMin: 36,
      goldMax: 48,
      xp: 76
    },
    spawn: {
      firstSpawnSecond: 60,
      respawnIntervalSecond: 60,
      canStack: true,
      canBeConverted: true
    },
    baseStats: {
      maxHealth: 1100,
      healthRegen: 0,
      maxMana: 0,
      manaRegen: 0,
      damageMin: 52,
      damageMax: 62,
      armor: 4,
      magicResistance: 25,
      baseAttackSpeed: 100,
      baseAttackTime: 1.6,
      attackRange: 150,
      acquisitionRange: 600,
      movementSpeed: 300,
      turnRate: 0.5,
      collisionSize: 16,
      dayVision: 800,
      nightVision: 800
    },
    scaling: {
      bountyGoldPerMinute: 0.0,
      bountyXpPerMinute: 0.0
    },
    abilities: []
  },

  {
    id: "large_polar_smasher",
    category: "neutral_creep",
    referenceRole: "large thunder stomp beast",
    campTier: "large",
    attackType: "melee",
    isAncient: false,
    isBoss: false,
    isControllable: false,
    isHeroLike: false,
    isBuildingLike: false,
    tags: ["large", "stun", "durable"],
    bounty: {
      goldMin: 48,
      goldMax: 64,
      xp: 96
    },
    spawn: {
      firstSpawnSecond: 60,
      respawnIntervalSecond: 60,
      canStack: true,
      canBeConverted: true
    },
    baseStats: {
      maxHealth: 1400,
      healthRegen: 0,
      maxMana: 0,
      manaRegen: 0,
      damageMin: 62,
      damageMax: 74,
      armor: 5,
      magicResistance: 25,
      baseAttackSpeed: 100,
      baseAttackTime: 1.6,
      attackRange: 150,
      acquisitionRange: 600,
      movementSpeed: 300,
      turnRate: 0.5,
      collisionSize: 16,
      dayVision: 800,
      nightVision: 800
    },
    scaling: {
      bountyGoldPerMinute: 0.0,
      bountyXpPerMinute: 0.0
    },
    abilities: [
      {
        id: "thunder_clap",
        kind: "active",
        damageType: "magical",
        tags: ["aoe_slow"],
        values: {
          damage: 120,
          slowPct: 25,
          radius: 300,
          cooldown: 12
        }
      }
    ]
  },

  {
    id: "large_satyr_tormentor",
    category: "neutral_creep",
    referenceRole: "large shockwave neutral",
    campTier: "large",
    attackType: "melee",
    isAncient: false,
    isBoss: false,
    isControllable: false,
    isHeroLike: false,
    isBuildingLike: false,
    tags: ["large", "shockwave"],
    bounty: {
      goldMin: 42,
      goldMax: 56,
      xp: 86
    },
    spawn: {
      firstSpawnSecond: 60,
      respawnIntervalSecond: 60,
      canStack: true,
      canBeConverted: true
    },
    baseStats: {
      maxHealth: 1100,
      healthRegen: 0,
      maxMana: 0,
      manaRegen: 0,
      damageMin: 49,
      damageMax: 55,
      armor: 3,
      magicResistance: 25,
      baseAttackSpeed: 100,
      baseAttackTime: 1.6,
      attackRange: 150,
      acquisitionRange: 600,
      movementSpeed: 290,
      turnRate: 0.5,
      collisionSize: 16,
      dayVision: 800,
      nightVision: 800
    },
    scaling: {
      bountyGoldPerMinute: 0.0,
      bountyXpPerMinute: 0.0
    },
    abilities: [
      {
        id: "satyr_shockwave",
        kind: "active",
        damageType: "magical",
        tags: ["line_nuke"],
        values: {
          damage: 120,
          range: 800,
          cooldown: 8
        }
      }
    ]
  },

  {
    id: "large_hellbear",
    category: "neutral_creep",
    referenceRole: "large attack speed aura neutral",
    campTier: "large",
    attackType: "melee",
    isAncient: false,
    isBoss: false,
    isControllable: false,
    isHeroLike: false,
    isBuildingLike: false,
    tags: ["large", "aura", "attack_speed"],
    bounty: {
      goldMin: 40,
      goldMax: 54,
      xp: 82
    },
    spawn: {
      firstSpawnSecond: 60,
      respawnIntervalSecond: 60,
      canStack: true,
      canBeConverted: true
    },
    baseStats: {
      maxHealth: 950,
      healthRegen: 0,
      maxMana: 0,
      manaRegen: 0,
      damageMin: 45,
      damageMax: 55,
      armor: 3,
      magicResistance: 25,
      baseAttackSpeed: 100,
      baseAttackTime: 1.6,
      attackRange: 150,
      acquisitionRange: 600,
      movementSpeed: 320,
      turnRate: 0.5,
      collisionSize: 16,
      dayVision: 800,
      nightVision: 800
    },
    scaling: {
      bountyGoldPerMinute: 0.0,
      bountyXpPerMinute: 0.0
    },
    abilities: [
      {
        id: "swiftness_aura",
        kind: "aura",
        damageType: "none",
        tags: ["attack_speed_aura"],
        values: {
          radius: 900,
          attackSpeed: 15
        }
      }
    ]
  },

  {
    id: "large_hellbear_smasher",
    category: "neutral_creep",
    referenceRole: "large clap neutral",
    campTier: "large",
    attackType: "melee",
    isAncient: false,
    isBoss: false,
    isControllable: false,
    isHeroLike: false,
    isBuildingLike: false,
    tags: ["large", "clap", "durable"],
    bounty: {
      goldMin: 50,
      goldMax: 66,
      xp: 100
    },
    spawn: {
      firstSpawnSecond: 60,
      respawnIntervalSecond: 60,
      canStack: true,
      canBeConverted: true
    },
    baseStats: {
      maxHealth: 1500,
      healthRegen: 0,
      maxMana: 0,
      manaRegen: 0,
      damageMin: 60,
      damageMax: 70,
      armor: 4,
      magicResistance: 25,
      baseAttackSpeed: 100,
      baseAttackTime: 1.6,
      attackRange: 150,
      acquisitionRange: 600,
      movementSpeed: 320,
      turnRate: 0.5,
      collisionSize: 16,
      dayVision: 800,
      nightVision: 800
    },
    scaling: {
      bountyGoldPerMinute: 0.0,
      bountyXpPerMinute: 0.0
    },
    abilities: [
      {
        id: "hellbear_clap",
        kind: "active",
        damageType: "magical",
        tags: ["aoe_slow"],
        values: {
          damage: 150,
          slowPct: 25,
          radius: 300,
          cooldown: 12
        }
      }
    ]
  },

  {
    id: "large_dark_troll",
    category: "neutral_creep",
    referenceRole: "large skeleton summoner",
    campTier: "large",
    attackType: "ranged",
    isAncient: false,
    isBoss: false,
    isControllable: false,
    isHeroLike: false,
    isBuildingLike: false,
    tags: ["large", "summon", "root"],
    bounty: {
      goldMin: 44,
      goldMax: 58,
      xp: 92
    },
    spawn: {
      firstSpawnSecond: 60,
      respawnIntervalSecond: 60,
      canStack: true,
      canBeConverted: true
    },
    baseStats: {
      maxHealth: 1100,
      healthRegen: 0,
      maxMana: 0,
      manaRegen: 0,
      damageMin: 38,
      damageMax: 46,
      armor: 2,
      magicResistance: 25,
      baseAttackSpeed: 100,
      baseAttackTime: 1.7,
      attackRange: 500,
      acquisitionRange: 800,
      movementSpeed: 300,
      turnRate: 0.5,
      collisionSize: 16,
      dayVision: 800,
      nightVision: 800
    },
    scaling: {
      bountyGoldPerMinute: 0.0,
      bountyXpPerMinute: 0.0
    },
    abilities: [
      {
        id: "ensnare",
        kind: "active",
        damageType: "none",
        tags: ["root"],
        values: {
          root: 1.5,
          cooldown: 15
        }
      },
      {
        id: "raise_skeletons",
        kind: "active",
        damageType: "none",
        tags: ["summon"],
        values: {
          summons: 2,
          duration: 40,
          cooldown: 25
        }
      }
    ]
  },

  {
    id: "large_drake",
    category: "neutral_creep",
    referenceRole: "large flying fire neutral",
    campTier: "large",
    attackType: "ranged",
    isAncient: false,
    isBoss: false,
    isControllable: false,
    isHeroLike: false,
    isBuildingLike: false,
    tags: ["large", "flying", "splash"],
    bounty: {
      goldMin: 45,
      goldMax: 60,
      xp: 94
    },
    spawn: {
      firstSpawnSecond: 60,
      respawnIntervalSecond: 60,
      canStack: true,
      canBeConverted: true
    },
    baseStats: {
      maxHealth: 1200,
      healthRegen: 0,
      maxMana: 0,
      manaRegen: 0,
      damageMin: 50,
      damageMax: 60,
      armor: 3,
      magicResistance: 25,
      baseAttackSpeed: 100,
      baseAttackTime: 1.7,
      attackRange: 500,
      acquisitionRange: 800,
      movementSpeed: 330,
      turnRate: 0.5,
      collisionSize: 16,
      dayVision: 800,
      nightVision: 800
    },
    scaling: {
      bountyGoldPerMinute: 0.0,
      bountyXpPerMinute: 0.0
    },
    abilities: [
      {
        id: "fire_splash",
        kind: "passive",
        damageType: "magical",
        tags: ["splash"],
        values: {
          radius: 200,
          damagePct: 35
        }
      }
    ]
  },

  {
    id: "large_warpine",
    category: "neutral_creep",
    referenceRole: "large ranged break neutral",
    campTier: "large",
    attackType: "ranged",
    isAncient: false,
    isBoss: false,
    isControllable: false,
    isHeroLike: false,
    isBuildingLike: false,
    tags: ["large", "break", "spikes"],
    bounty: {
      goldMin: 46,
      goldMax: 62,
      xp: 96
    },
    spawn: {
      firstSpawnSecond: 60,
      respawnIntervalSecond: 60,
      canStack: true,
      canBeConverted: true
    },
    baseStats: {
      maxHealth: 1250,
      healthRegen: 0,
      maxMana: 0,
      manaRegen: 0,
      damageMin: 48,
      damageMax: 58,
      armor: 4,
      magicResistance: 25,
      baseAttackSpeed: 100,
      baseAttackTime: 1.7,
      attackRange: 500,
      acquisitionRange: 800,
      movementSpeed: 300,
      turnRate: 0.5,
      collisionSize: 16,
      dayVision: 800,
      nightVision: 800
    },
    scaling: {
      bountyGoldPerMinute: 0.0,
      bountyXpPerMinute: 0.0
    },
    abilities: [
      {
        id: "spike_break",
        kind: "active",
        damageType: "physical",
        tags: ["break"],
        values: {
          damage: 90,
          breakDuration: 3,
          cooldown: 14
        }
      }
    ]
  },

  {
    id: "ancient_granite_golem",
    category: "neutral_creep",
    referenceRole: "ancient high health aura golem",
    campTier: "ancient",
    attackType: "melee",
    isAncient: true,
    isBoss: false,
    isControllable: false,
    isHeroLike: false,
    isBuildingLike: false,
    tags: ["ancient", "aura", "health"],
    bounty: {
      goldMin: 70,
      goldMax: 90,
      xp: 150
    },
    spawn: {
      firstSpawnSecond: 60,
      respawnIntervalSecond: 60,
      canStack: true,
      canBeConverted: false
    },
    baseStats: {
      maxHealth: 2000,
      healthRegen: 0,
      maxMana: 0,
      manaRegen: 0,
      damageMin: 80,
      damageMax: 90,
      armor: 8,
      magicResistance: 50,
      baseAttackSpeed: 100,
      baseAttackTime: 1.6,
      attackRange: 150,
      acquisitionRange: 600,
      movementSpeed: 270,
      turnRate: 0.5,
      collisionSize: 16,
      dayVision: 800,
      nightVision: 800
    },
    scaling: {
      bountyGoldPerMinute: 0.0,
      bountyXpPerMinute: 0.0
    },
    abilities: [
      {
        id: "granite_health_aura",
        kind: "aura",
        damageType: "none",
        tags: ["health_aura"],
        values: {
          radius: 900,
          maxHealthBonusPct: 15
        }
      }
    ]
  },

  {
    id: "ancient_rock_golem",
    category: "neutral_creep",
    referenceRole: "ancient durable golem",
    campTier: "ancient",
    attackType: "melee",
    isAncient: true,
    isBoss: false,
    isControllable: false,
    isHeroLike: false,
    isBuildingLike: false,
    tags: ["ancient", "durable"],
    bounty: {
      goldMin: 54,
      goldMax: 72,
      xp: 120
    },
    spawn: {
      firstSpawnSecond: 60,
      respawnIntervalSecond: 60,
      canStack: true,
      canBeConverted: false
    },
    baseStats: {
      maxHealth: 1600,
      healthRegen: 0,
      maxMana: 0,
      manaRegen: 0,
      damageMin: 65,
      damageMax: 75,
      armor: 6,
      magicResistance: 50,
      baseAttackSpeed: 100,
      baseAttackTime: 1.6,
      attackRange: 150,
      acquisitionRange: 600,
      movementSpeed: 270,
      turnRate: 0.5,
      collisionSize: 16,
      dayVision: 800,
      nightVision: 800
    },
    scaling: {
      bountyGoldPerMinute: 0.0,
      bountyXpPerMinute: 0.0
    },
    abilities: []
  },

  {
    id: "ancient_black_dragon",
    category: "neutral_creep",
    referenceRole: "ancient splash dragon",
    campTier: "ancient",
    attackType: "ranged",
    isAncient: true,
    isBoss: false,
    isControllable: false,
    isHeroLike: false,
    isBuildingLike: false,
    tags: ["ancient", "flying", "splash", "aura"],
    bounty: {
      goldMin: 76,
      goldMax: 100,
      xp: 160
    },
    spawn: {
      firstSpawnSecond: 60,
      respawnIntervalSecond: 60,
      canStack: true,
      canBeConverted: false
    },
    baseStats: {
      maxHealth: 2200,
      healthRegen: 0,
      maxMana: 0,
      manaRegen: 0,
      damageMin: 85,
      damageMax: 95,
      armor: 6,
      magicResistance: 50,
      baseAttackSpeed: 100,
      baseAttackTime: 1.7,
      attackRange: 500,
      acquisitionRange: 800,
      movementSpeed: 330,
      turnRate: 0.5,
      collisionSize: 16,
      dayVision: 800,
      nightVision: 800
    },
    scaling: {
      bountyGoldPerMinute: 0.0,
      bountyXpPerMinute: 0.0
    },
    abilities: [
      {
        id: "dragonhide_aura",
        kind: "aura",
        damageType: "none",
        tags: ["armor_aura"],
        values: {
          radius: 900,
          armor: 3
        }
      },
      {
        id: "fireball",
        kind: "active",
        damageType: "magical",
        tags: ["aoe"],
        values: {
          damage: 85,
          radius: 300,
          cooldown: 10
        }
      }
    ]
  },

  {
    id: "ancient_black_drake",
    category: "neutral_creep",
    referenceRole: "ancient smaller dragon",
    campTier: "ancient",
    attackType: "ranged",
    isAncient: true,
    isBoss: false,
    isControllable: false,
    isHeroLike: false,
    isBuildingLike: false,
    tags: ["ancient", "flying"],
    bounty: {
      goldMin: 54,
      goldMax: 72,
      xp: 120
    },
    spawn: {
      firstSpawnSecond: 60,
      respawnIntervalSecond: 60,
      canStack: true,
      canBeConverted: false
    },
    baseStats: {
      maxHealth: 1400,
      healthRegen: 0,
      maxMana: 0,
      manaRegen: 0,
      damageMin: 60,
      damageMax: 70,
      armor: 4,
      magicResistance: 50,
      baseAttackSpeed: 100,
      baseAttackTime: 1.7,
      attackRange: 500,
      acquisitionRange: 800,
      movementSpeed: 330,
      turnRate: 0.5,
      collisionSize: 16,
      dayVision: 800,
      nightVision: 800
    },
    scaling: {
      bountyGoldPerMinute: 0.0,
      bountyXpPerMinute: 0.0
    },
    abilities: []
  },

  {
    id: "ancient_thunder_lizard",
    category: "neutral_creep",
    referenceRole: "ancient frenzy aura lizard",
    campTier: "ancient",
    attackType: "melee",
    isAncient: true,
    isBoss: false,
    isControllable: false,
    isHeroLike: false,
    isBuildingLike: false,
    tags: ["ancient", "attack_speed", "slam"],
    bounty: {
      goldMin: 78,
      goldMax: 104,
      xp: 165
    },
    spawn: {
      firstSpawnSecond: 60,
      respawnIntervalSecond: 60,
      canStack: true,
      canBeConverted: false
    },
    baseStats: {
      maxHealth: 2400,
      healthRegen: 0,
      maxMana: 0,
      manaRegen: 0,
      damageMin: 90,
      damageMax: 105,
      armor: 7,
      magicResistance: 50,
      baseAttackSpeed: 100,
      baseAttackTime: 1.6,
      attackRange: 150,
      acquisitionRange: 600,
      movementSpeed: 290,
      turnRate: 0.5,
      collisionSize: 16,
      dayVision: 800,
      nightVision: 800
    },
    scaling: {
      bountyGoldPerMinute: 0.0,
      bountyXpPerMinute: 0.0
    },
    abilities: [
      {
        id: "frenzy_aura",
        kind: "aura",
        damageType: "none",
        tags: ["attack_speed_aura"],
        values: {
          radius: 900,
          attackSpeed: 25
        }
      },
      {
        id: "slam",
        kind: "active",
        damageType: "magical",
        tags: ["aoe"],
        values: {
          damage: 150,
          radius: 250,
          cooldown: 12
        }
      }
    ]
  },

  {
    id: "ancient_prowler_shaman",
    category: "neutral_creep",
    referenceRole: "ancient root healer neutral",
    campTier: "ancient",
    attackType: "ranged",
    isAncient: true,
    isBoss: false,
    isControllable: false,
    isHeroLike: false,
    isBuildingLike: false,
    tags: ["ancient", "root", "heal"],
    bounty: {
      goldMin: 76,
      goldMax: 100,
      xp: 165
    },
    spawn: {
      firstSpawnSecond: 60,
      respawnIntervalSecond: 60,
      canStack: true,
      canBeConverted: false
    },
    baseStats: {
      maxHealth: 2100,
      healthRegen: 0,
      maxMana: 0,
      manaRegen: 0,
      damageMin: 70,
      damageMax: 82,
      armor: 5,
      magicResistance: 50,
      baseAttackSpeed: 100,
      baseAttackTime: 1.7,
      attackRange: 500,
      acquisitionRange: 800,
      movementSpeed: 300,
      turnRate: 0.5,
      collisionSize: 16,
      dayVision: 800,
      nightVision: 800
    },
    scaling: {
      bountyGoldPerMinute: 0.0,
      bountyXpPerMinute: 0.0
    },
    abilities: [
      {
        id: "ancient_root",
        kind: "active",
        damageType: "none",
        tags: ["root"],
        values: {
          root: 2,
          cooldown: 14
        }
      },
      {
        id: "ancient_heal",
        kind: "active",
        damageType: "none",
        tags: ["heal"],
        values: {
          heal: 250,
          cooldown: 20
        }
      }
    ]
  }
];

export const BOSS_UNIT_SEEDS: UnitSeed[] = [
  {
    id: "ancient_boss_roshan_like",
    category: "boss",
    referenceRole: "major neutral boss equivalent to Roshan role",
    campTier: "boss",
    attackType: "melee",
    isAncient: true,
    isBoss: true,
    isControllable: false,
    isHeroLike: true,
    isBuildingLike: false,
    tags: ["boss", "roshan_like", "aegis_reward", "progressive_scaling", "objective"],
    bounty: {
      goldMin: 200,
      goldMax: 290,
      xp: 400,
      teamGold: 135,
      special: "Drops resurrection/objective reward. Respawn should be randomized between 8 and 11 minutes after death in match logic."
    },
    spawn: {
      firstSpawnSecond: 0,
      respawnIntervalSecond: 540,
      canStack: false,
      canBeConverted: false
    },
    baseStats: {
      maxHealth: 6000,
      healthRegen: 20,
      maxMana: 0,
      manaRegen: 0,
      damageMin: 75,
      damageMax: 85,
      armor: 20,
      magicResistance: 55,
      baseAttackSpeed: 100,
      baseAttackTime: 1.0,
      attackRange: 150,
      acquisitionRange: 900,
      movementSpeed: 270,
      turnRate: 0.5,
      collisionSize: 64,
      dayVision: 1400,
      nightVision: 1400
    },
    scaling: {
      healthPerMinute: 115,
      damagePerMinute: 4,
      armorPerMinute: 0.35,
      bountyGoldPerMinute: 1.2,
      bountyXpPerMinute: 4,
      upgradeEverySeconds: 60
    },
    abilities: [
      {
        id: "boss_spell_block",
        kind: "passive",
        damageType: "none",
        tags: ["debuff_resistance", "spell_block"],
        values: {
          statusResistance: 0.25,
          spellBlockCooldown: 15
        }
      },
      {
        id: "boss_slam",
        kind: "active",
        damageType: "magical",
        tags: ["aoe", "stun"],
        values: {
          damage: 120,
          stun: 1.2,
          radius: 300,
          cooldown: 10
        }
      },
      {
        id: "boss_bash",
        kind: "passive",
        damageType: "physical",
        tags: ["bash"],
        values: {
          chance: 15,
          stun: 1.5,
          bonusDamage: 50
        }
      }
    ]
  },

  {
    id: "reflecting_obelisk_tormentor_like",
    category: "boss",
    referenceRole: "immobile reflecting neutral boss equivalent to Tormentor role",
    campTier: "boss",
    attackType: "none",
    isAncient: true,
    isBoss: true,
    isControllable: false,
    isHeroLike: false,
    isBuildingLike: true,
    tags: ["boss", "tormentor_like", "immobile", "barrier", "damage_reflection", "shard_reward"],
    bounty: {
      goldMin: 0,
      goldMax: 0,
      xp: 0,
      teamGold: 250,
      special: "Rewards a shard-like upgrade to a low-net-worth eligible allied hero and team gold."
    },
    spawn: {
      firstSpawnSecond: 1200,
      respawnIntervalSecond: 600,
      canStack: false,
      canBeConverted: false
    },
    baseStats: {
      maxHealth: 2500,
      healthRegen: 0,
      maxMana: 0,
      manaRegen: 0,
      damageMin: 0,
      damageMax: 0,
      armor: 20,
      magicResistance: 55,
      baseAttackSpeed: 0,
      baseAttackTime: 1.7,
      attackRange: 0,
      acquisitionRange: 0,
      movementSpeed: 0,
      turnRate: 0,
      collisionSize: 64,
      dayVision: 800,
      nightVision: 800
    },
    scaling: {
      healthPerMinute: 55,
      damagePerMinute: 0,
      armorPerMinute: 0.25,
      upgradeEverySeconds: 60
    },
    abilities: [
      {
        id: "regenerating_barrier",
        kind: "passive",
        damageType: "none",
        tags: ["barrier", "regen"],
        values: {
          barrier: 2500,
          barrierRegenPerSecond: 100
        }
      },
      {
        id: "damage_reflection",
        kind: "passive",
        damageType: "pure",
        tags: ["reflect"],
        values: {
          reflectPct: 0.7,
          radius: 1200
        }
      },
      {
        id: "ambient_burn",
        kind: "aura",
        damageType: "magical",
        tags: ["aura", "burn"],
        values: {
          dps: 30,
          radius: 1200
        }
      }
    ]
  },

  {
    id: "minor_objective_watcher",
    category: "boss",
    referenceRole: "small map objective watcher",
    campTier: "boss",
    attackType: "none",
    isAncient: false,
    isBoss: false,
    isControllable: false,
    isHeroLike: false,
    isBuildingLike: false,
    tags: ["objective", "vision", "capturable"],
    bounty: {
      goldMin: 0,
      goldMax: 0,
      xp: 0,
      special: "Capturable neutral vision objective."
    },
    spawn: {
      firstSpawnSecond: 0,
      respawnIntervalSecond: 120,
      canStack: false,
      canBeConverted: false
    },
    baseStats: {
      maxHealth: 1,
      healthRegen: 0,
      maxMana: 0,
      manaRegen: 0,
      damageMin: 0,
      damageMax: 0,
      armor: 0,
      magicResistance: 0,
      baseAttackSpeed: 0,
      baseAttackTime: 1.7,
      attackRange: 0,
      acquisitionRange: 500,
      movementSpeed: 0,
      turnRate: 0.5,
      collisionSize: 16,
      dayVision: 1000,
      nightVision: 1000
    },
    abilities: [
      {
        id: "watcher_vision",
        kind: "passive",
        damageType: "none",
        tags: ["vision"],
        values: {
          radius: 1000
        }
      }
    ]
  }
];

export const SUMMON_UNIT_SEEDS: UnitSeed[] = [
  {
    id: "summon_lesser_treant",
    category: "summon",
    referenceRole: "temporary pushing treant",
    campTier: "none",
    attackType: "melee",
    isAncient: false,
    isBoss: false,
    isControllable: true,
    isHeroLike: false,
    isBuildingLike: false,
    tags: ["summon", "pusher"],
    bounty: {
      goldMin: 18,
      goldMax: 22,
      xp: 32
    },
    spawn: {
      firstSpawnSecond: -1,
      respawnIntervalSecond: 0,
      canStack: false,
      canBeConverted: true,
      durationSecond: 40
    },
    baseStats: {
      maxHealth: 550,
      healthRegen: 0,
      maxMana: 0,
      manaRegen: 0,
      damageMin: 24,
      damageMax: 30,
      armor: 0,
      magicResistance: 25,
      baseAttackSpeed: 100,
      baseAttackTime: 1.7,
      attackRange: 150,
      acquisitionRange: 600,
      movementSpeed: 325,
      turnRate: 0.5,
      collisionSize: 16,
      dayVision: 800,
      nightVision: 800
    },
    abilities: []
  },

  {
    id: "summon_spirit_wolf",
    category: "summon",
    referenceRole: "scouting and damage wolf",
    campTier: "none",
    attackType: "melee",
    isAncient: false,
    isBoss: false,
    isControllable: true,
    isHeroLike: false,
    isBuildingLike: false,
    tags: ["summon", "scout", "critical"],
    bounty: {
      goldMin: 20,
      goldMax: 26,
      xp: 36
    },
    spawn: {
      firstSpawnSecond: -1,
      respawnIntervalSecond: 0,
      canStack: false,
      canBeConverted: true,
      durationSecond: 45
    },
    baseStats: {
      maxHealth: 500,
      healthRegen: 0,
      maxMana: 0,
      manaRegen: 0,
      damageMin: 25,
      damageMax: 31,
      armor: 1,
      magicResistance: 25,
      baseAttackSpeed: 100,
      baseAttackTime: 1.7,
      attackRange: 150,
      acquisitionRange: 600,
      movementSpeed: 350,
      turnRate: 0.5,
      collisionSize: 16,
      dayVision: 800,
      nightVision: 800
    },
    abilities: [
      {
        id: "wolf_crit",
        kind: "passive",
        damageType: "physical",
        tags: ["critical"],
        values: {
          critChance: 20,
          critMultiplier: 160
        }
      }
    ]
  },

  {
    id: "summon_alpha_boar",
    category: "summon",
    referenceRole: "slowing boar",
    campTier: "none",
    attackType: "ranged",
    isAncient: false,
    isBoss: false,
    isControllable: true,
    isHeroLike: false,
    isBuildingLike: false,
    tags: ["summon", "slow"],
    bounty: {
      goldMin: 24,
      goldMax: 30,
      xp: 40
    },
    spawn: {
      firstSpawnSecond: -1,
      respawnIntervalSecond: 0,
      canStack: false,
      canBeConverted: true,
      durationSecond: 60
    },
    baseStats: {
      maxHealth: 650,
      healthRegen: 0,
      maxMana: 0,
      manaRegen: 0,
      damageMin: 28,
      damageMax: 34,
      armor: 1,
      magicResistance: 25,
      baseAttackSpeed: 100,
      baseAttackTime: 1.7,
      attackRange: 500,
      acquisitionRange: 800,
      movementSpeed: 320,
      turnRate: 0.5,
      collisionSize: 16,
      dayVision: 800,
      nightVision: 800
    },
    abilities: [
      {
        id: "boar_poison_slow",
        kind: "passive",
        damageType: "none",
        tags: ["slow"],
        values: {
          slowPct: 20,
          duration: 3
        }
      }
    ]
  },

  {
    id: "summon_hawk_scout",
    category: "summon",
    referenceRole: "flying scout unit",
    campTier: "none",
    attackType: "none",
    isAncient: false,
    isBoss: false,
    isControllable: true,
    isHeroLike: false,
    isBuildingLike: false,
    tags: ["summon", "flying", "vision", "scout"],
    bounty: {
      goldMin: 20,
      goldMax: 25,
      xp: 40
    },
    spawn: {
      firstSpawnSecond: -1,
      respawnIntervalSecond: 0,
      canStack: false,
      canBeConverted: true,
      durationSecond: 60
    },
    baseStats: {
      maxHealth: 300,
      healthRegen: 0,
      maxMana: 0,
      manaRegen: 0,
      damageMin: 0,
      damageMax: 0,
      armor: 0,
      magicResistance: 25,
      baseAttackSpeed: 100,
      baseAttackTime: 0,
      attackRange: 0,
      acquisitionRange: 0,
      movementSpeed: 400,
      turnRate: 0.5,
      collisionSize: 16,
      dayVision: 1600,
      nightVision: 1600
    },
    abilities: [
      {
        id: "flying_scout_vision",
        kind: "passive",
        damageType: "none",
        tags: ["flying_vision"],
        values: {
          vision: 1600
        }
      }
    ]
  },

  {
    id: "summon_serpent_ward",
    category: "ward",
    referenceRole: "stationary attacking ward",
    campTier: "none",
    attackType: "ranged",
    isAncient: false,
    isBoss: false,
    isControllable: false,
    isHeroLike: false,
    isBuildingLike: true,
    tags: ["ward", "pusher", "stationary"],
    bounty: {
      goldMin: 26,
      goldMax: 32,
      xp: 35
    },
    spawn: {
      firstSpawnSecond: -1,
      respawnIntervalSecond: 0,
      canStack: false,
      canBeConverted: false,
      durationSecond: 30
    },
    baseStats: {
      maxHealth: 450,
      healthRegen: 0,
      maxMana: 0,
      manaRegen: 0,
      damageMin: 38,
      damageMax: 44,
      armor: 0,
      magicResistance: 25,
      baseAttackSpeed: 100,
      baseAttackTime: 1.7,
      attackRange: 500,
      acquisitionRange: 800,
      movementSpeed: 0,
      turnRate: 0.5,
      collisionSize: 16,
      dayVision: 800,
      nightVision: 800
    },
    abilities: []
  },

  {
    id: "summon_plague_ward",
    category: "ward",
    referenceRole: "small poison ward",
    campTier: "none",
    attackType: "ranged",
    isAncient: false,
    isBoss: false,
    isControllable: false,
    isHeroLike: false,
    isBuildingLike: true,
    tags: ["ward", "poison", "pusher"],
    bounty: {
      goldMin: 12,
      goldMax: 16,
      xp: 18
    },
    spawn: {
      firstSpawnSecond: -1,
      respawnIntervalSecond: 0,
      canStack: false,
      canBeConverted: false,
      durationSecond: 40
    },
    baseStats: {
      maxHealth: 180,
      healthRegen: 0,
      maxMana: 0,
      manaRegen: 0,
      damageMin: 12,
      damageMax: 18,
      armor: 0,
      magicResistance: 25,
      baseAttackSpeed: 100,
      baseAttackTime: 1.7,
      attackRange: 500,
      acquisitionRange: 800,
      movementSpeed: 0,
      turnRate: 0.5,
      collisionSize: 16,
      dayVision: 800,
      nightVision: 800
    },
    abilities: [
      {
        id: "ward_poison",
        kind: "passive",
        damageType: "magical",
        tags: ["dot"],
        values: {
          dps: 8,
          duration: 3
        }
      }
    ]
  },

  {
    id: "summon_skeleton_warrior",
    category: "summon",
    referenceRole: "temporary skeleton melee unit",
    campTier: "none",
    attackType: "melee",
    isAncient: false,
    isBoss: false,
    isControllable: true,
    isHeroLike: false,
    isBuildingLike: false,
    tags: ["summon", "swarm"],
    bounty: {
      goldMin: 8,
      goldMax: 12,
      xp: 12
    },
    spawn: {
      firstSpawnSecond: -1,
      respawnIntervalSecond: 0,
      canStack: false,
      canBeConverted: true,
      durationSecond: 35
    },
    baseStats: {
      maxHealth: 300,
      healthRegen: 0,
      maxMana: 0,
      manaRegen: 0,
      damageMin: 18,
      damageMax: 23,
      armor: 0,
      magicResistance: 25,
      baseAttackSpeed: 100,
      baseAttackTime: 1.7,
      attackRange: 150,
      acquisitionRange: 600,
      movementSpeed: 325,
      turnRate: 0.5,
      collisionSize: 16,
      dayVision: 800,
      nightVision: 800
    },
    abilities: []
  },

  {
    id: "summon_skeleton_archer",
    category: "summon",
    referenceRole: "temporary skeleton ranged unit",
    campTier: "none",
    attackType: "ranged",
    isAncient: false,
    isBoss: false,
    isControllable: true,
    isHeroLike: false,
    isBuildingLike: false,
    tags: ["summon", "swarm", "ranged"],
    bounty: {
      goldMin: 10,
      goldMax: 14,
      xp: 14
    },
    spawn: {
      firstSpawnSecond: -1,
      respawnIntervalSecond: 0,
      canStack: false,
      canBeConverted: true,
      durationSecond: 35
    },
    baseStats: {
      maxHealth: 240,
      healthRegen: 0,
      maxMana: 0,
      manaRegen: 0,
      damageMin: 17,
      damageMax: 22,
      armor: 0,
      magicResistance: 25,
      baseAttackSpeed: 100,
      baseAttackTime: 1.7,
      attackRange: 500,
      acquisitionRange: 800,
      movementSpeed: 325,
      turnRate: 0.5,
      collisionSize: 16,
      dayVision: 800,
      nightVision: 800
    },
    abilities: []
  },

  {
    id: "summon_spiderling",
    category: "summon",
    referenceRole: "fast spiderling swarm",
    campTier: "none",
    attackType: "melee",
    isAncient: false,
    isBoss: false,
    isControllable: true,
    isHeroLike: false,
    isBuildingLike: false,
    tags: ["summon", "swarm", "fast"],
    bounty: {
      goldMin: 8,
      goldMax: 12,
      xp: 10
    },
    spawn: {
      firstSpawnSecond: -1,
      respawnIntervalSecond: 0,
      canStack: false,
      canBeConverted: true,
      durationSecond: 40
    },
    baseStats: {
      maxHealth: 250,
      healthRegen: 0,
      maxMana: 0,
      manaRegen: 0,
      damageMin: 14,
      damageMax: 18,
      armor: 0,
      magicResistance: 25,
      baseAttackSpeed: 100,
      baseAttackTime: 1.7,
      attackRange: 150,
      acquisitionRange: 600,
      movementSpeed: 350,
      turnRate: 0.5,
      collisionSize: 16,
      dayVision: 800,
      nightVision: 800
    },
    abilities: [
      {
        id: "minor_poison",
        kind: "passive",
        damageType: "magical",
        tags: ["dot"],
        values: {
          dps: 4,
          duration: 2
        }
      }
    ]
  },

  {
    id: "summon_forged_spirit",
    category: "summon",
    referenceRole: "scaling ranged elemental",
    campTier: "none",
    attackType: "ranged",
    isAncient: false,
    isBoss: false,
    isControllable: true,
    isHeroLike: false,
    isBuildingLike: false,
    tags: ["summon", "armor_reduction"],
    bounty: {
      goldMin: 30,
      goldMax: 38,
      xp: 50
    },
    spawn: {
      firstSpawnSecond: -1,
      respawnIntervalSecond: 0,
      canStack: false,
      canBeConverted: true,
      durationSecond: 80
    },
    baseStats: {
      maxHealth: 900,
      healthRegen: 0,
      maxMana: 0,
      manaRegen: 0,
      damageMin: 35,
      damageMax: 45,
      armor: 2,
      magicResistance: 25,
      baseAttackSpeed: 100,
      baseAttackTime: 1.7,
      attackRange: 500,
      acquisitionRange: 800,
      movementSpeed: 320,
      turnRate: 0.5,
      collisionSize: 16,
      dayVision: 800,
      nightVision: 800
    },
    abilities: [
      {
        id: "melting_attack",
        kind: "passive",
        damageType: "none",
        tags: ["armor_reduction"],
        values: {
          armorReduction: 1,
          duration: 5,
          maxStacks: 10
        }
      }
    ]
  },

  {
    id: "summon_stone_familiar",
    category: "summon",
    referenceRole: "durable flying familiar with stun",
    campTier: "none",
    attackType: "ranged",
    isAncient: false,
    isBoss: false,
    isControllable: true,
    isHeroLike: false,
    isBuildingLike: false,
    tags: ["summon", "flying", "stun"],
    bounty: {
      goldMin: 50,
      goldMax: 60,
      xp: 80
    },
    spawn: {
      firstSpawnSecond: -1,
      respawnIntervalSecond: 0,
      canStack: false,
      canBeConverted: true,
      durationSecond: 60
    },
    baseStats: {
      maxHealth: 700,
      healthRegen: 0,
      maxMana: 0,
      manaRegen: 0,
      damageMin: 25,
      damageMax: 35,
      armor: 2,
      magicResistance: 25,
      baseAttackSpeed: 100,
      baseAttackTime: 1.7,
      attackRange: 500,
      acquisitionRange: 800,
      movementSpeed: 380,
      turnRate: 0.5,
      collisionSize: 16,
      dayVision: 800,
      nightVision: 800
    },
    abilities: [
      {
        id: "stone_drop",
        kind: "active",
        damageType: "magical",
        tags: ["stun", "aoe"],
        values: {
          damage: 60,
          stun: 1,
          radius: 250,
          cooldown: 20
        }
      }
    ]
  },

  {
    id: "summon_spirit_bear",
    category: "pet",
    referenceRole: "hero-like pet bear",
    campTier: "none",
    attackType: "melee",
    isAncient: false,
    isBoss: false,
    isControllable: true,
    isHeroLike: true,
    isBuildingLike: false,
    tags: ["pet", "hero_like", "root", "durable"],
    bounty: {
      goldMin: 100,
      goldMax: 120,
      xp: 160,
      special: "durationSecond = -1 means persistent until killed or owner condition removes it."
    },
    spawn: {
      firstSpawnSecond: -1,
      respawnIntervalSecond: 0,
      canStack: false,
      canBeConverted: false,
      durationSecond: -1
    },
    baseStats: {
      maxHealth: 1500,
      healthRegen: 0,
      maxMana: 0,
      manaRegen: 0,
      damageMin: 50,
      damageMax: 60,
      armor: 3,
      magicResistance: 25,
      baseAttackSpeed: 100,
      baseAttackTime: 1.7,
      attackRange: 150,
      acquisitionRange: 600,
      movementSpeed: 320,
      turnRate: 0.5,
      collisionSize: 16,
      dayVision: 800,
      nightVision: 800
    },
    abilities: [
      {
        id: "entangling_claws",
        kind: "passive",
        damageType: "physical",
        tags: ["root"],
        values: {
          chance: 20,
          root: 1.2
        }
      }
    ]
  },

  {
    id: "summon_infernal_golem",
    category: "summon",
    referenceRole: "large teamfight golem",
    campTier: "none",
    attackType: "melee",
    isAncient: false,
    isBoss: false,
    isControllable: true,
    isHeroLike: false,
    isBuildingLike: false,
    tags: ["summon", "boss_like", "aura", "stun"],
    bounty: {
      goldMin: 100,
      goldMax: 150,
      xp: 200
    },
    spawn: {
      firstSpawnSecond: -1,
      respawnIntervalSecond: 0,
      canStack: false,
      canBeConverted: true,
      durationSecond: 60
    },
    baseStats: {
      maxHealth: 1200,
      healthRegen: 0,
      maxMana: 0,
      manaRegen: 0,
      damageMin: 75,
      damageMax: 100,
      armor: 5,
      magicResistance: 25,
      baseAttackSpeed: 100,
      baseAttackTime: 1.7,
      attackRange: 150,
      acquisitionRange: 600,
      movementSpeed: 320,
      turnRate: 0.5,
      collisionSize: 16,
      dayVision: 800,
      nightVision: 800
    },
    abilities: [
      {
        id: "golem_impact",
        kind: "on_death",
        damageType: "magical",
        tags: ["aoe"],
        values: {
          damage: 150,
          radius: 400
        }
      },
      {
        id: "burning_fists",
        kind: "passive",
        damageType: "magical",
        tags: ["splash"],
        values: {
          radius: 250,
          damagePct: 40
        }
      }
    ]
  },

  {
    id: "summon_eidolon",
    category: "summon",
    referenceRole: "splitting void summon",
    campTier: "none",
    attackType: "ranged",
    isAncient: false,
    isBoss: false,
    isControllable: true,
    isHeroLike: false,
    isBuildingLike: false,
    tags: ["summon", "split"],
    bounty: {
      goldMin: 18,
      goldMax: 24,
      xp: 28
    },
    spawn: {
      firstSpawnSecond: -1,
      respawnIntervalSecond: 0,
      canStack: false,
      canBeConverted: true,
      durationSecond: 35
    },
    baseStats: {
      maxHealth: 400,
      healthRegen: 0,
      maxMana: 0,
      manaRegen: 0,
      damageMin: 24,
      damageMax: 30,
      armor: 1,
      magicResistance: 25,
      baseAttackSpeed: 100,
      baseAttackTime: 1.7,
      attackRange: 500,
      acquisitionRange: 800,
      movementSpeed: 320,
      turnRate: 0.5,
      collisionSize: 16,
      dayVision: 800,
      nightVision: 800
    },
    abilities: [
      {
        id: "eidolon_split",
        kind: "passive",
        damageType: "none",
        tags: ["split"],
        values: {
          attacksToSplit: 6,
          summons: 2
        }
      }
    ]
  },

  {
    id: "summon_healing_banner",
    category: "ward",
    referenceRole: "stationary healing banner",
    campTier: "none",
    attackType: "none",
    isAncient: false,
    isBoss: false,
    isControllable: false,
    isHeroLike: false,
    isBuildingLike: true,
    tags: ["ward", "heal", "stationary"],
    bounty: {
      goldMin: 20,
      goldMax: 25,
      xp: 30
    },
    spawn: {
      firstSpawnSecond: -1,
      respawnIntervalSecond: 0,
      canStack: false,
      canBeConverted: false,
      durationSecond: 12
    },
    baseStats: {
      maxHealth: 300,
      healthRegen: 0,
      maxMana: 0,
      manaRegen: 0,
      damageMin: 0,
      damageMax: 0,
      armor: 0,
      magicResistance: 25,
      baseAttackSpeed: 100,
      baseAttackTime: 0,
      attackRange: 0,
      acquisitionRange: 0,
      movementSpeed: 0,
      turnRate: 0.5,
      collisionSize: 16,
      dayVision: 800,
      nightVision: 800
    },
    abilities: [
      {
        id: "healing_aura",
        kind: "aura",
        damageType: "none",
        tags: ["heal"],
        values: {
          healPctPerSecond: 3,
          radius: 450
        }
      }
    ]
  },

  {
    id: "summon_remote_charge",
    category: "mine",
    referenceRole: "remote explosive mine",
    campTier: "none",
    attackType: "none",
    isAncient: false,
    isBoss: false,
    isControllable: false,
    isHeroLike: false,
    isBuildingLike: true,
    tags: ["mine", "trap", "burst"],
    bounty: {
      goldMin: 10,
      goldMax: 10,
      xp: 0
    },
    spawn: {
      firstSpawnSecond: -1,
      respawnIntervalSecond: 0,
      canStack: false,
      canBeConverted: false,
      durationSecond: 120
    },
    baseStats: {
      maxHealth: 1,
      healthRegen: 0,
      maxMana: 0,
      manaRegen: 0,
      damageMin: 0,
      damageMax: 0,
      armor: 0,
      magicResistance: 25,
      baseAttackSpeed: 100,
      baseAttackTime: 0,
      attackRange: 0,
      acquisitionRange: 0,
      movementSpeed: 0,
      turnRate: 0.5,
      collisionSize: 16,
      dayVision: 800,
      nightVision: 800
    },
    abilities: [
      {
        id: "remote_explosion",
        kind: "active",
        damageType: "magical",
        tags: ["burst", "aoe"],
        values: {
          damage: 450,
          radius: 425
        }
      }
    ]
  },

  {
    id: "summon_stasis_device",
    category: "mine",
    referenceRole: "root trap device",
    campTier: "none",
    attackType: "none",
    isAncient: false,
    isBoss: false,
    isControllable: false,
    isHeroLike: false,
    isBuildingLike: true,
    tags: ["mine", "trap", "root"],
    bounty: {
      goldMin: 10,
      goldMax: 10,
      xp: 0
    },
    spawn: {
      firstSpawnSecond: -1,
      respawnIntervalSecond: 0,
      canStack: false,
      canBeConverted: false,
      durationSecond: 60
    },
    baseStats: {
      maxHealth: 1,
      healthRegen: 0,
      maxMana: 0,
      manaRegen: 0,
      damageMin: 0,
      damageMax: 0,
      armor: 0,
      magicResistance: 25,
      baseAttackSpeed: 100,
      baseAttackTime: 0,
      attackRange: 0,
      acquisitionRange: 0,
      movementSpeed: 0,
      turnRate: 0.5,
      collisionSize: 16,
      dayVision: 800,
      nightVision: 800
    },
    abilities: [
      {
        id: "stasis_trigger",
        kind: "active",
        damageType: "none",
        tags: ["root"],
        values: {
          root: 3,
          radius: 350
        }
      }
    ]
  },

  {
    id: "summon_tempest_clone",
    category: "clone",
    referenceRole: "temporary hero clone with item restrictions",
    campTier: "none",
    attackType: "ranged",
    isAncient: false,
    isBoss: false,
    isControllable: true,
    isHeroLike: true,
    isBuildingLike: false,
    tags: ["clone", "hero_like", "item_restricted"],
    bounty: {
      goldMin: 180,
      goldMax: 220,
      xp: 250
    },
    spawn: {
      firstSpawnSecond: -1,
      respawnIntervalSecond: 0,
      canStack: false,
      canBeConverted: false,
      durationSecond: 26
    },
    baseStats: {
      maxHealth: 1000,
      healthRegen: 0,
      maxMana: 0,
      manaRegen: 0,
      damageMin: 40,
      damageMax: 50,
      armor: 2,
      magicResistance: 25,
      baseAttackSpeed: 100,
      baseAttackTime: 1.7,
      attackRange: 500,
      acquisitionRange: 800,
      movementSpeed: 310,
      turnRate: 0.5,
      collisionSize: 16,
      dayVision: 800,
      nightVision: 800
    },
    abilities: [
      {
        id: "clone_restrictions",
        kind: "passive",
        damageType: "none",
        tags: ["item_restriction"],
        values: {
          outgoingDamagePct: 0.75,
          incomingDamagePct: 1.5
        }
      }
    ]
  },

  {
    id: "summon_basic_illusion",
    category: "illusion",
    referenceRole: "standard hero illusion",
    campTier: "none",
    attackType: "melee",
    isAncient: false,
    isBoss: false,
    isControllable: true,
    isHeroLike: false,
    isBuildingLike: false,
    tags: ["illusion", "temporary"],
    bounty: {
      goldMin: 5,
      goldMax: 8,
      xp: 5
    },
    spawn: {
      firstSpawnSecond: -1,
      respawnIntervalSecond: 0,
      canStack: false,
      canBeConverted: false,
      durationSecond: 20
    },
    baseStats: {
      maxHealth: 600,
      healthRegen: 0,
      maxMana: 0,
      manaRegen: 0,
      damageMin: 20,
      damageMax: 25,
      armor: 0,
      magicResistance: 25,
      baseAttackSpeed: 100,
      baseAttackTime: 1.7,
      attackRange: 150,
      acquisitionRange: 600,
      movementSpeed: 320,
      turnRate: 0.5,
      collisionSize: 16,
      dayVision: 800,
      nightVision: 800
    },
    abilities: [
      {
        id: "illusion_rules",
        kind: "passive",
        damageType: "none",
        tags: ["illusion"],
        values: {
          outgoingDamagePct: 0.33,
          incomingDamagePct: 2.0,
          buildingDamagePct: 0.35
        }
      }
    ]
  },

  {
    id: "summon_strong_illusion",
    category: "illusion",
    referenceRole: "strong hero illusion",
    campTier: "none",
    attackType: "melee",
    isAncient: false,
    isBoss: false,
    isControllable: true,
    isHeroLike: false,
    isBuildingLike: false,
    tags: ["illusion", "strong"],
    bounty: {
      goldMin: 12,
      goldMax: 18,
      xp: 15
    },
    spawn: {
      firstSpawnSecond: -1,
      respawnIntervalSecond: 0,
      canStack: false,
      canBeConverted: false,
      durationSecond: 30
    },
    baseStats: {
      maxHealth: 900,
      healthRegen: 0,
      maxMana: 0,
      manaRegen: 0,
      damageMin: 30,
      damageMax: 36,
      armor: 1,
      magicResistance: 25,
      baseAttackSpeed: 100,
      baseAttackTime: 1.7,
      attackRange: 150,
      acquisitionRange: 600,
      movementSpeed: 330,
      turnRate: 0.5,
      collisionSize: 16,
      dayVision: 800,
      nightVision: 800
    },
    abilities: [
      {
        id: "strong_illusion_rules",
        kind: "passive",
        damageType: "none",
        tags: ["illusion"],
        values: {
          outgoingDamagePct: 0.6,
          incomingDamagePct: 1.5,
          buildingDamagePct: 0.5
        }
      }
    ]
  }
];



export const STRUCTURE_UNIT_SEEDS: UnitSeed[] = [
  {
    id: "blue_tower_tier_1_top",
    category: "structure",
    referenceRole: "tower tier 1 top",
    campTier: "none",
    attackType: "ranged",
    isAncient: false,
    isBoss: false,
    isControllable: false,
    isHeroLike: false,
    isBuildingLike: true,
    tags: ["structure", "tower", "tier_1", "top", "outer_objective", "attacks_enemies", "fortifiable"],
    bounty: {
      goldMin: 150,
      goldMax: 150,
      xp: 100,
      teamGold: 120,
      special: "Structure objective for team blue. Last hit gold is represented by goldMin/goldMax; team reward by teamGold."
    },
    spawn: {
      firstSpawnSecond: 0,
      respawnIntervalSecond: 0,
      canStack: false,
      canBeConverted: false
    },
    baseStats: {
      maxHealth: 1800,
      healthRegen: 0,
      maxMana: 0,
      manaRegen: 0,
      damageMin: 90,
      damageMax: 100,
      armor: 12,
      magicResistance: 0,
      baseAttackSpeed: 100,
      baseAttackTime: 1.0,
      attackRange: 700,
      acquisitionRange: 800,
      movementSpeed: 0,
      turnRate: 0,
      collisionSize: 64,
      dayVision: 1800,
      nightVision: 1800
    },
    structure: {
      teamId: "blue",
      structureType: "tower",
      lane: "top",
      tier: 1,
      side: "none",
      hasBackdoorProtection: true,
      canBeFortified: true,
      requiredDestroyedStructureIds: [],
      unlocksNextStructureIds: ["blue_tower_tier_2_top"],
      objectiveValue: {
        mapControl: 85,
        lanePressure: 60,
        baseDefense: 20,
        ancientDefense: 0
      }
    },
    abilities: []
  },

  {
    id: "blue_tower_tier_2_top",
    category: "structure",
    referenceRole: "tower tier 2 top",
    campTier: "none",
    attackType: "ranged",
    isAncient: false,
    isBoss: false,
    isControllable: false,
    isHeroLike: false,
    isBuildingLike: true,
    tags: ["structure", "tower", "tier_2", "top", "jungle_gate", "attacks_enemies", "fortifiable"],
    bounty: {
      goldMin: 200,
      goldMax: 200,
      xp: 120,
      teamGold: 140,
      special: "Structure objective for team blue. Last hit gold is represented by goldMin/goldMax; team reward by teamGold."
    },
    spawn: {
      firstSpawnSecond: 0,
      respawnIntervalSecond: 0,
      canStack: false,
      canBeConverted: false
    },
    baseStats: {
      maxHealth: 2000,
      healthRegen: 0,
      maxMana: 0,
      manaRegen: 0,
      damageMin: 120,
      damageMax: 130,
      armor: 16,
      magicResistance: 0,
      baseAttackSpeed: 100,
      baseAttackTime: 1.0,
      attackRange: 700,
      acquisitionRange: 800,
      movementSpeed: 0,
      turnRate: 0,
      collisionSize: 64,
      dayVision: 1800,
      nightVision: 1800
    },
    structure: {
      teamId: "blue",
      structureType: "tower",
      lane: "top",
      tier: 2,
      side: "none",
      hasBackdoorProtection: true,
      canBeFortified: true,
      requiredDestroyedStructureIds: ["blue_tower_tier_1_top"],
      unlocksNextStructureIds: ["blue_tower_tier_3_top"],
      objectiveValue: {
        mapControl: 75,
        lanePressure: 70,
        baseDefense: 35,
        ancientDefense: 0
      }
    },
    abilities: []
  },

  {
    id: "blue_tower_tier_3_top",
    category: "structure",
    referenceRole: "tower tier 3 top",
    campTier: "none",
    attackType: "ranged",
    isAncient: false,
    isBoss: false,
    isControllable: false,
    isHeroLike: false,
    isBuildingLike: true,
    tags: ["structure", "tower", "tier_3", "top", "high_ground_gate", "attacks_enemies", "fortifiable", "backdoor_protected"],
    bounty: {
      goldMin: 250,
      goldMax: 250,
      xp: 160,
      teamGold: 160,
      special: "Structure objective for team blue. Last hit gold is represented by goldMin/goldMax; team reward by teamGold."
    },
    spawn: {
      firstSpawnSecond: 0,
      respawnIntervalSecond: 0,
      canStack: false,
      canBeConverted: false
    },
    baseStats: {
      maxHealth: 2000,
      healthRegen: 0,
      maxMana: 0,
      manaRegen: 0,
      damageMin: 130,
      damageMax: 140,
      armor: 18,
      magicResistance: 0,
      baseAttackSpeed: 100,
      baseAttackTime: 1.0,
      attackRange: 700,
      acquisitionRange: 800,
      movementSpeed: 0,
      turnRate: 0,
      collisionSize: 64,
      dayVision: 1800,
      nightVision: 1800
    },
    structure: {
      teamId: "blue",
      structureType: "tower",
      lane: "top",
      tier: 3,
      side: "none",
      hasBackdoorProtection: true,
      canBeFortified: true,
      requiredDestroyedStructureIds: ["blue_tower_tier_2_top"],
      unlocksNextStructureIds: ["blue_barracks_melee_top", "blue_barracks_ranged_top"],
      objectiveValue: {
        mapControl: 60,
        lanePressure: 85,
        baseDefense: 80,
        ancientDefense: 25
      }
    },
    abilities: []
  },

  {
    id: "blue_barracks_melee_top",
    category: "structure",
    referenceRole: "barracks melee top",
    campTier: "none",
    attackType: "none",
    isAncient: false,
    isBoss: false,
    isControllable: false,
    isHeroLike: false,
    isBuildingLike: true,
    tags: ["structure", "barracks", "melee_barracks", "top", "high_ground", "enables_super_melee_creeps", "fortifiable", "backdoor_protected"],
    bounty: {
      goldMin: 100,
      goldMax: 100,
      xp: 0,
      teamGold: 150,
      special: "Structure objective for team blue. Last hit gold is represented by goldMin/goldMax; team reward by teamGold."
    },
    spawn: {
      firstSpawnSecond: 0,
      respawnIntervalSecond: 0,
      canStack: false,
      canBeConverted: false
    },
    baseStats: {
      maxHealth: 2200,
      healthRegen: 5,
      maxMana: 0,
      manaRegen: 0,
      damageMin: 0,
      damageMax: 0,
      armor: 15,
      magicResistance: 0,
      baseAttackSpeed: 0,
      baseAttackTime: 0,
      attackRange: 0,
      acquisitionRange: 0,
      movementSpeed: 0,
      turnRate: 0,
      collisionSize: 64,
      dayVision: 1800,
      nightVision: 1800
    },
    structure: {
      teamId: "blue",
      structureType: "barracks_melee",
      lane: "top",
      tier: 0,
      side: "none",
      hasBackdoorProtection: true,
      canBeFortified: true,
      requiredDestroyedStructureIds: ["blue_tower_tier_3_top"],
      unlocksNextStructureIds: [],
      objectiveValue: {
        mapControl: 35,
        lanePressure: 120,
        baseDefense: 70,
        ancientDefense: 35
      }
    },
    abilities: [
      {
        id: "melee_barracks_upgrade_rule",
        kind: "passive",
        damageType: "none",
        tags: ["lane_creep_upgrade", "super_melee_creeps"],
        values: {
          onDestroyedEnemyUnlocks: "super_melee_creep",
          megaCondition: "all_enemy_barracks_destroyed"
        }
      }
    ]
  },

  {
    id: "blue_barracks_ranged_top",
    category: "structure",
    referenceRole: "barracks ranged top",
    campTier: "none",
    attackType: "none",
    isAncient: false,
    isBoss: false,
    isControllable: false,
    isHeroLike: false,
    isBuildingLike: true,
    tags: ["structure", "barracks", "ranged_barracks", "top", "high_ground", "enables_super_ranged_creeps", "fortifiable", "backdoor_protected"],
    bounty: {
      goldMin: 100,
      goldMax: 100,
      xp: 0,
      teamGold: 150,
      special: "Structure objective for team blue. Last hit gold is represented by goldMin/goldMax; team reward by teamGold."
    },
    spawn: {
      firstSpawnSecond: 0,
      respawnIntervalSecond: 0,
      canStack: false,
      canBeConverted: false
    },
    baseStats: {
      maxHealth: 2200,
      healthRegen: 5,
      maxMana: 0,
      manaRegen: 0,
      damageMin: 0,
      damageMax: 0,
      armor: 15,
      magicResistance: 0,
      baseAttackSpeed: 0,
      baseAttackTime: 0,
      attackRange: 0,
      acquisitionRange: 0,
      movementSpeed: 0,
      turnRate: 0,
      collisionSize: 64,
      dayVision: 1800,
      nightVision: 1800
    },
    structure: {
      teamId: "blue",
      structureType: "barracks_ranged",
      lane: "top",
      tier: 0,
      side: "none",
      hasBackdoorProtection: true,
      canBeFortified: true,
      requiredDestroyedStructureIds: ["blue_tower_tier_3_top"],
      unlocksNextStructureIds: [],
      objectiveValue: {
        mapControl: 30,
        lanePressure: 105,
        baseDefense: 65,
        ancientDefense: 30
      }
    },
    abilities: [
      {
        id: "ranged_barracks_upgrade_rule",
        kind: "passive",
        damageType: "none",
        tags: ["lane_creep_upgrade", "super_ranged_creeps"],
        values: {
          onDestroyedEnemyUnlocks: "super_ranged_creep",
          megaCondition: "all_enemy_barracks_destroyed"
        }
      }
    ]
  },

  {
    id: "blue_tower_tier_1_mid",
    category: "structure",
    referenceRole: "tower tier 1 mid",
    campTier: "none",
    attackType: "ranged",
    isAncient: false,
    isBoss: false,
    isControllable: false,
    isHeroLike: false,
    isBuildingLike: true,
    tags: ["structure", "tower", "tier_1", "mid", "outer_objective", "attacks_enemies", "fortifiable"],
    bounty: {
      goldMin: 150,
      goldMax: 150,
      xp: 100,
      teamGold: 120,
      special: "Structure objective for team blue. Last hit gold is represented by goldMin/goldMax; team reward by teamGold."
    },
    spawn: {
      firstSpawnSecond: 0,
      respawnIntervalSecond: 0,
      canStack: false,
      canBeConverted: false
    },
    baseStats: {
      maxHealth: 1800,
      healthRegen: 0,
      maxMana: 0,
      manaRegen: 0,
      damageMin: 90,
      damageMax: 100,
      armor: 12,
      magicResistance: 0,
      baseAttackSpeed: 100,
      baseAttackTime: 1.0,
      attackRange: 700,
      acquisitionRange: 800,
      movementSpeed: 0,
      turnRate: 0,
      collisionSize: 64,
      dayVision: 1800,
      nightVision: 1800
    },
    structure: {
      teamId: "blue",
      structureType: "tower",
      lane: "mid",
      tier: 1,
      side: "none",
      hasBackdoorProtection: true,
      canBeFortified: true,
      requiredDestroyedStructureIds: [],
      unlocksNextStructureIds: ["blue_tower_tier_2_mid"],
      objectiveValue: {
        mapControl: 85,
        lanePressure: 60,
        baseDefense: 20,
        ancientDefense: 0
      }
    },
    abilities: []
  },

  {
    id: "blue_tower_tier_2_mid",
    category: "structure",
    referenceRole: "tower tier 2 mid",
    campTier: "none",
    attackType: "ranged",
    isAncient: false,
    isBoss: false,
    isControllable: false,
    isHeroLike: false,
    isBuildingLike: true,
    tags: ["structure", "tower", "tier_2", "mid", "jungle_gate", "attacks_enemies", "fortifiable"],
    bounty: {
      goldMin: 200,
      goldMax: 200,
      xp: 120,
      teamGold: 140,
      special: "Structure objective for team blue. Last hit gold is represented by goldMin/goldMax; team reward by teamGold."
    },
    spawn: {
      firstSpawnSecond: 0,
      respawnIntervalSecond: 0,
      canStack: false,
      canBeConverted: false
    },
    baseStats: {
      maxHealth: 2000,
      healthRegen: 0,
      maxMana: 0,
      manaRegen: 0,
      damageMin: 120,
      damageMax: 130,
      armor: 16,
      magicResistance: 0,
      baseAttackSpeed: 100,
      baseAttackTime: 1.0,
      attackRange: 700,
      acquisitionRange: 800,
      movementSpeed: 0,
      turnRate: 0,
      collisionSize: 64,
      dayVision: 1800,
      nightVision: 1800
    },
    structure: {
      teamId: "blue",
      structureType: "tower",
      lane: "mid",
      tier: 2,
      side: "none",
      hasBackdoorProtection: true,
      canBeFortified: true,
      requiredDestroyedStructureIds: ["blue_tower_tier_1_mid"],
      unlocksNextStructureIds: ["blue_tower_tier_3_mid"],
      objectiveValue: {
        mapControl: 75,
        lanePressure: 70,
        baseDefense: 35,
        ancientDefense: 0
      }
    },
    abilities: []
  },

  {
    id: "blue_tower_tier_3_mid",
    category: "structure",
    referenceRole: "tower tier 3 mid",
    campTier: "none",
    attackType: "ranged",
    isAncient: false,
    isBoss: false,
    isControllable: false,
    isHeroLike: false,
    isBuildingLike: true,
    tags: ["structure", "tower", "tier_3", "mid", "high_ground_gate", "attacks_enemies", "fortifiable", "backdoor_protected"],
    bounty: {
      goldMin: 250,
      goldMax: 250,
      xp: 160,
      teamGold: 160,
      special: "Structure objective for team blue. Last hit gold is represented by goldMin/goldMax; team reward by teamGold."
    },
    spawn: {
      firstSpawnSecond: 0,
      respawnIntervalSecond: 0,
      canStack: false,
      canBeConverted: false
    },
    baseStats: {
      maxHealth: 2000,
      healthRegen: 0,
      maxMana: 0,
      manaRegen: 0,
      damageMin: 130,
      damageMax: 140,
      armor: 18,
      magicResistance: 0,
      baseAttackSpeed: 100,
      baseAttackTime: 1.0,
      attackRange: 700,
      acquisitionRange: 800,
      movementSpeed: 0,
      turnRate: 0,
      collisionSize: 64,
      dayVision: 1800,
      nightVision: 1800
    },
    structure: {
      teamId: "blue",
      structureType: "tower",
      lane: "mid",
      tier: 3,
      side: "none",
      hasBackdoorProtection: true,
      canBeFortified: true,
      requiredDestroyedStructureIds: ["blue_tower_tier_2_mid"],
      unlocksNextStructureIds: ["blue_barracks_melee_mid", "blue_barracks_ranged_mid"],
      objectiveValue: {
        mapControl: 60,
        lanePressure: 85,
        baseDefense: 80,
        ancientDefense: 25
      }
    },
    abilities: []
  },

  {
    id: "blue_barracks_melee_mid",
    category: "structure",
    referenceRole: "barracks melee mid",
    campTier: "none",
    attackType: "none",
    isAncient: false,
    isBoss: false,
    isControllable: false,
    isHeroLike: false,
    isBuildingLike: true,
    tags: ["structure", "barracks", "melee_barracks", "mid", "high_ground", "enables_super_melee_creeps", "fortifiable", "backdoor_protected"],
    bounty: {
      goldMin: 100,
      goldMax: 100,
      xp: 0,
      teamGold: 150,
      special: "Structure objective for team blue. Last hit gold is represented by goldMin/goldMax; team reward by teamGold."
    },
    spawn: {
      firstSpawnSecond: 0,
      respawnIntervalSecond: 0,
      canStack: false,
      canBeConverted: false
    },
    baseStats: {
      maxHealth: 2200,
      healthRegen: 5,
      maxMana: 0,
      manaRegen: 0,
      damageMin: 0,
      damageMax: 0,
      armor: 15,
      magicResistance: 0,
      baseAttackSpeed: 0,
      baseAttackTime: 0,
      attackRange: 0,
      acquisitionRange: 0,
      movementSpeed: 0,
      turnRate: 0,
      collisionSize: 64,
      dayVision: 1800,
      nightVision: 1800
    },
    structure: {
      teamId: "blue",
      structureType: "barracks_melee",
      lane: "mid",
      tier: 0,
      side: "none",
      hasBackdoorProtection: true,
      canBeFortified: true,
      requiredDestroyedStructureIds: ["blue_tower_tier_3_mid"],
      unlocksNextStructureIds: [],
      objectiveValue: {
        mapControl: 35,
        lanePressure: 120,
        baseDefense: 70,
        ancientDefense: 35
      }
    },
    abilities: [
      {
        id: "melee_barracks_upgrade_rule",
        kind: "passive",
        damageType: "none",
        tags: ["lane_creep_upgrade", "super_melee_creeps"],
        values: {
          onDestroyedEnemyUnlocks: "super_melee_creep",
          megaCondition: "all_enemy_barracks_destroyed"
        }
      }
    ]
  },

  {
    id: "blue_barracks_ranged_mid",
    category: "structure",
    referenceRole: "barracks ranged mid",
    campTier: "none",
    attackType: "none",
    isAncient: false,
    isBoss: false,
    isControllable: false,
    isHeroLike: false,
    isBuildingLike: true,
    tags: ["structure", "barracks", "ranged_barracks", "mid", "high_ground", "enables_super_ranged_creeps", "fortifiable", "backdoor_protected"],
    bounty: {
      goldMin: 100,
      goldMax: 100,
      xp: 0,
      teamGold: 150,
      special: "Structure objective for team blue. Last hit gold is represented by goldMin/goldMax; team reward by teamGold."
    },
    spawn: {
      firstSpawnSecond: 0,
      respawnIntervalSecond: 0,
      canStack: false,
      canBeConverted: false
    },
    baseStats: {
      maxHealth: 2200,
      healthRegen: 5,
      maxMana: 0,
      manaRegen: 0,
      damageMin: 0,
      damageMax: 0,
      armor: 15,
      magicResistance: 0,
      baseAttackSpeed: 0,
      baseAttackTime: 0,
      attackRange: 0,
      acquisitionRange: 0,
      movementSpeed: 0,
      turnRate: 0,
      collisionSize: 64,
      dayVision: 1800,
      nightVision: 1800
    },
    structure: {
      teamId: "blue",
      structureType: "barracks_ranged",
      lane: "mid",
      tier: 0,
      side: "none",
      hasBackdoorProtection: true,
      canBeFortified: true,
      requiredDestroyedStructureIds: ["blue_tower_tier_3_mid"],
      unlocksNextStructureIds: [],
      objectiveValue: {
        mapControl: 30,
        lanePressure: 105,
        baseDefense: 65,
        ancientDefense: 30
      }
    },
    abilities: [
      {
        id: "ranged_barracks_upgrade_rule",
        kind: "passive",
        damageType: "none",
        tags: ["lane_creep_upgrade", "super_ranged_creeps"],
        values: {
          onDestroyedEnemyUnlocks: "super_ranged_creep",
          megaCondition: "all_enemy_barracks_destroyed"
        }
      }
    ]
  },

  {
    id: "blue_tower_tier_1_bottom",
    category: "structure",
    referenceRole: "tower tier 1 bottom",
    campTier: "none",
    attackType: "ranged",
    isAncient: false,
    isBoss: false,
    isControllable: false,
    isHeroLike: false,
    isBuildingLike: true,
    tags: ["structure", "tower", "tier_1", "bottom", "outer_objective", "attacks_enemies", "fortifiable"],
    bounty: {
      goldMin: 150,
      goldMax: 150,
      xp: 100,
      teamGold: 120,
      special: "Structure objective for team blue. Last hit gold is represented by goldMin/goldMax; team reward by teamGold."
    },
    spawn: {
      firstSpawnSecond: 0,
      respawnIntervalSecond: 0,
      canStack: false,
      canBeConverted: false
    },
    baseStats: {
      maxHealth: 1800,
      healthRegen: 0,
      maxMana: 0,
      manaRegen: 0,
      damageMin: 90,
      damageMax: 100,
      armor: 12,
      magicResistance: 0,
      baseAttackSpeed: 100,
      baseAttackTime: 1.0,
      attackRange: 700,
      acquisitionRange: 800,
      movementSpeed: 0,
      turnRate: 0,
      collisionSize: 64,
      dayVision: 1800,
      nightVision: 1800
    },
    structure: {
      teamId: "blue",
      structureType: "tower",
      lane: "bottom",
      tier: 1,
      side: "none",
      hasBackdoorProtection: true,
      canBeFortified: true,
      requiredDestroyedStructureIds: [],
      unlocksNextStructureIds: ["blue_tower_tier_2_bottom"],
      objectiveValue: {
        mapControl: 85,
        lanePressure: 60,
        baseDefense: 20,
        ancientDefense: 0
      }
    },
    abilities: []
  },

  {
    id: "blue_tower_tier_2_bottom",
    category: "structure",
    referenceRole: "tower tier 2 bottom",
    campTier: "none",
    attackType: "ranged",
    isAncient: false,
    isBoss: false,
    isControllable: false,
    isHeroLike: false,
    isBuildingLike: true,
    tags: ["structure", "tower", "tier_2", "bottom", "jungle_gate", "attacks_enemies", "fortifiable"],
    bounty: {
      goldMin: 200,
      goldMax: 200,
      xp: 120,
      teamGold: 140,
      special: "Structure objective for team blue. Last hit gold is represented by goldMin/goldMax; team reward by teamGold."
    },
    spawn: {
      firstSpawnSecond: 0,
      respawnIntervalSecond: 0,
      canStack: false,
      canBeConverted: false
    },
    baseStats: {
      maxHealth: 2000,
      healthRegen: 0,
      maxMana: 0,
      manaRegen: 0,
      damageMin: 120,
      damageMax: 130,
      armor: 16,
      magicResistance: 0,
      baseAttackSpeed: 100,
      baseAttackTime: 1.0,
      attackRange: 700,
      acquisitionRange: 800,
      movementSpeed: 0,
      turnRate: 0,
      collisionSize: 64,
      dayVision: 1800,
      nightVision: 1800
    },
    structure: {
      teamId: "blue",
      structureType: "tower",
      lane: "bottom",
      tier: 2,
      side: "none",
      hasBackdoorProtection: true,
      canBeFortified: true,
      requiredDestroyedStructureIds: ["blue_tower_tier_1_bottom"],
      unlocksNextStructureIds: ["blue_tower_tier_3_bottom"],
      objectiveValue: {
        mapControl: 75,
        lanePressure: 70,
        baseDefense: 35,
        ancientDefense: 0
      }
    },
    abilities: []
  },

  {
    id: "blue_tower_tier_3_bottom",
    category: "structure",
    referenceRole: "tower tier 3 bottom",
    campTier: "none",
    attackType: "ranged",
    isAncient: false,
    isBoss: false,
    isControllable: false,
    isHeroLike: false,
    isBuildingLike: true,
    tags: ["structure", "tower", "tier_3", "bottom", "high_ground_gate", "attacks_enemies", "fortifiable", "backdoor_protected"],
    bounty: {
      goldMin: 250,
      goldMax: 250,
      xp: 160,
      teamGold: 160,
      special: "Structure objective for team blue. Last hit gold is represented by goldMin/goldMax; team reward by teamGold."
    },
    spawn: {
      firstSpawnSecond: 0,
      respawnIntervalSecond: 0,
      canStack: false,
      canBeConverted: false
    },
    baseStats: {
      maxHealth: 2000,
      healthRegen: 0,
      maxMana: 0,
      manaRegen: 0,
      damageMin: 130,
      damageMax: 140,
      armor: 18,
      magicResistance: 0,
      baseAttackSpeed: 100,
      baseAttackTime: 1.0,
      attackRange: 700,
      acquisitionRange: 800,
      movementSpeed: 0,
      turnRate: 0,
      collisionSize: 64,
      dayVision: 1800,
      nightVision: 1800
    },
    structure: {
      teamId: "blue",
      structureType: "tower",
      lane: "bottom",
      tier: 3,
      side: "none",
      hasBackdoorProtection: true,
      canBeFortified: true,
      requiredDestroyedStructureIds: ["blue_tower_tier_2_bottom"],
      unlocksNextStructureIds: ["blue_barracks_melee_bottom", "blue_barracks_ranged_bottom"],
      objectiveValue: {
        mapControl: 60,
        lanePressure: 85,
        baseDefense: 80,
        ancientDefense: 25
      }
    },
    abilities: []
  },

  {
    id: "blue_barracks_melee_bottom",
    category: "structure",
    referenceRole: "barracks melee bottom",
    campTier: "none",
    attackType: "none",
    isAncient: false,
    isBoss: false,
    isControllable: false,
    isHeroLike: false,
    isBuildingLike: true,
    tags: ["structure", "barracks", "melee_barracks", "bottom", "high_ground", "enables_super_melee_creeps", "fortifiable", "backdoor_protected"],
    bounty: {
      goldMin: 100,
      goldMax: 100,
      xp: 0,
      teamGold: 150,
      special: "Structure objective for team blue. Last hit gold is represented by goldMin/goldMax; team reward by teamGold."
    },
    spawn: {
      firstSpawnSecond: 0,
      respawnIntervalSecond: 0,
      canStack: false,
      canBeConverted: false
    },
    baseStats: {
      maxHealth: 2200,
      healthRegen: 5,
      maxMana: 0,
      manaRegen: 0,
      damageMin: 0,
      damageMax: 0,
      armor: 15,
      magicResistance: 0,
      baseAttackSpeed: 0,
      baseAttackTime: 0,
      attackRange: 0,
      acquisitionRange: 0,
      movementSpeed: 0,
      turnRate: 0,
      collisionSize: 64,
      dayVision: 1800,
      nightVision: 1800
    },
    structure: {
      teamId: "blue",
      structureType: "barracks_melee",
      lane: "bottom",
      tier: 0,
      side: "none",
      hasBackdoorProtection: true,
      canBeFortified: true,
      requiredDestroyedStructureIds: ["blue_tower_tier_3_bottom"],
      unlocksNextStructureIds: [],
      objectiveValue: {
        mapControl: 35,
        lanePressure: 120,
        baseDefense: 70,
        ancientDefense: 35
      }
    },
    abilities: [
      {
        id: "melee_barracks_upgrade_rule",
        kind: "passive",
        damageType: "none",
        tags: ["lane_creep_upgrade", "super_melee_creeps"],
        values: {
          onDestroyedEnemyUnlocks: "super_melee_creep",
          megaCondition: "all_enemy_barracks_destroyed"
        }
      }
    ]
  },

  {
    id: "blue_barracks_ranged_bottom",
    category: "structure",
    referenceRole: "barracks ranged bottom",
    campTier: "none",
    attackType: "none",
    isAncient: false,
    isBoss: false,
    isControllable: false,
    isHeroLike: false,
    isBuildingLike: true,
    tags: ["structure", "barracks", "ranged_barracks", "bottom", "high_ground", "enables_super_ranged_creeps", "fortifiable", "backdoor_protected"],
    bounty: {
      goldMin: 100,
      goldMax: 100,
      xp: 0,
      teamGold: 150,
      special: "Structure objective for team blue. Last hit gold is represented by goldMin/goldMax; team reward by teamGold."
    },
    spawn: {
      firstSpawnSecond: 0,
      respawnIntervalSecond: 0,
      canStack: false,
      canBeConverted: false
    },
    baseStats: {
      maxHealth: 2200,
      healthRegen: 5,
      maxMana: 0,
      manaRegen: 0,
      damageMin: 0,
      damageMax: 0,
      armor: 15,
      magicResistance: 0,
      baseAttackSpeed: 0,
      baseAttackTime: 0,
      attackRange: 0,
      acquisitionRange: 0,
      movementSpeed: 0,
      turnRate: 0,
      collisionSize: 64,
      dayVision: 1800,
      nightVision: 1800
    },
    structure: {
      teamId: "blue",
      structureType: "barracks_ranged",
      lane: "bottom",
      tier: 0,
      side: "none",
      hasBackdoorProtection: true,
      canBeFortified: true,
      requiredDestroyedStructureIds: ["blue_tower_tier_3_bottom"],
      unlocksNextStructureIds: [],
      objectiveValue: {
        mapControl: 30,
        lanePressure: 105,
        baseDefense: 65,
        ancientDefense: 30
      }
    },
    abilities: [
      {
        id: "ranged_barracks_upgrade_rule",
        kind: "passive",
        damageType: "none",
        tags: ["lane_creep_upgrade", "super_ranged_creeps"],
        values: {
          onDestroyedEnemyUnlocks: "super_ranged_creep",
          megaCondition: "all_enemy_barracks_destroyed"
        }
      }
    ]
  },

  {
    id: "blue_tower_tier_4_left",
    category: "structure",
    referenceRole: "tower tier 4 left",
    campTier: "none",
    attackType: "ranged",
    isAncient: false,
    isBoss: false,
    isControllable: false,
    isHeroLike: false,
    isBuildingLike: true,
    tags: ["structure", "tower", "tier_4", "base", "left", "ancient_guard", "attacks_enemies", "fortifiable", "backdoor_protected"],
    bounty: {
      goldMin: 0,
      goldMax: 0,
      xp: 0,
      teamGold: 0,
      special: "Structure objective for team blue. Last hit gold is represented by goldMin/goldMax; team reward by teamGold."
    },
    spawn: {
      firstSpawnSecond: 0,
      respawnIntervalSecond: 0,
      canStack: false,
      canBeConverted: false
    },
    baseStats: {
      maxHealth: 2100,
      healthRegen: 0,
      maxMana: 0,
      manaRegen: 0,
      damageMin: 140,
      damageMax: 150,
      armor: 21,
      magicResistance: 0,
      baseAttackSpeed: 100,
      baseAttackTime: 1.0,
      attackRange: 700,
      acquisitionRange: 800,
      movementSpeed: 0,
      turnRate: 0,
      collisionSize: 64,
      dayVision: 1800,
      nightVision: 1800
    },
    structure: {
      teamId: "blue",
      structureType: "tower",
      lane: "base",
      tier: 4,
      side: "left",
      hasBackdoorProtection: true,
      canBeFortified: true,
      requiredDestroyedStructureIds: ["blue_tower_tier_3_top", "blue_tower_tier_3_mid", "blue_tower_tier_3_bottom"],
      unlocksNextStructureIds: ["blue_ancient_core"],
      objectiveValue: {
        mapControl: 15,
        lanePressure: 20,
        baseDefense: 100,
        ancientDefense: 120
      }
    },
    abilities: []
  },

  {
    id: "blue_tower_tier_4_right",
    category: "structure",
    referenceRole: "tower tier 4 right",
    campTier: "none",
    attackType: "ranged",
    isAncient: false,
    isBoss: false,
    isControllable: false,
    isHeroLike: false,
    isBuildingLike: true,
    tags: ["structure", "tower", "tier_4", "base", "right", "ancient_guard", "attacks_enemies", "fortifiable", "backdoor_protected"],
    bounty: {
      goldMin: 0,
      goldMax: 0,
      xp: 0,
      teamGold: 0,
      special: "Structure objective for team blue. Last hit gold is represented by goldMin/goldMax; team reward by teamGold."
    },
    spawn: {
      firstSpawnSecond: 0,
      respawnIntervalSecond: 0,
      canStack: false,
      canBeConverted: false
    },
    baseStats: {
      maxHealth: 2100,
      healthRegen: 0,
      maxMana: 0,
      manaRegen: 0,
      damageMin: 140,
      damageMax: 150,
      armor: 21,
      magicResistance: 0,
      baseAttackSpeed: 100,
      baseAttackTime: 1.0,
      attackRange: 700,
      acquisitionRange: 800,
      movementSpeed: 0,
      turnRate: 0,
      collisionSize: 64,
      dayVision: 1800,
      nightVision: 1800
    },
    structure: {
      teamId: "blue",
      structureType: "tower",
      lane: "base",
      tier: 4,
      side: "right",
      hasBackdoorProtection: true,
      canBeFortified: true,
      requiredDestroyedStructureIds: ["blue_tower_tier_3_top", "blue_tower_tier_3_mid", "blue_tower_tier_3_bottom"],
      unlocksNextStructureIds: ["blue_ancient_core"],
      objectiveValue: {
        mapControl: 15,
        lanePressure: 20,
        baseDefense: 100,
        ancientDefense: 120
      }
    },
    abilities: []
  },

  {
    id: "blue_ancient_core",
    category: "structure",
    referenceRole: "ancient core",
    campTier: "none",
    attackType: "none",
    isAncient: true,
    isBoss: false,
    isControllable: false,
    isHeroLike: false,
    isBuildingLike: true,
    tags: ["structure", "ancient", "core", "win_condition", "base", "fortifiable", "backdoor_protected"],
    bounty: {
      goldMin: 0,
      goldMax: 0,
      xp: 0,
      teamGold: 0,
      special: "Structure objective for team blue. Last hit gold is represented by goldMin/goldMax; team reward by teamGold."
    },
    spawn: {
      firstSpawnSecond: 0,
      respawnIntervalSecond: 0,
      canStack: false,
      canBeConverted: false
    },
    baseStats: {
      maxHealth: 4500,
      healthRegen: 0,
      maxMana: 0,
      manaRegen: 0,
      damageMin: 0,
      damageMax: 0,
      armor: 15,
      magicResistance: 0,
      baseAttackSpeed: 0,
      baseAttackTime: 0,
      attackRange: 0,
      acquisitionRange: 0,
      movementSpeed: 0,
      turnRate: 0,
      collisionSize: 96,
      dayVision: 1800,
      nightVision: 1800
    },
    structure: {
      teamId: "blue",
      structureType: "ancient_core",
      lane: "base",
      tier: 0,
      side: "none",
      hasBackdoorProtection: true,
      canBeFortified: true,
      requiredDestroyedStructureIds: ["blue_tower_tier_4_left", "blue_tower_tier_4_right"],
      unlocksNextStructureIds: [],
      objectiveValue: {
        mapControl: 0,
        lanePressure: 0,
        baseDefense: 200,
        ancientDefense: 999
      }
    },
    abilities: [
      {
        id: "ancient_destroy_win_condition",
        kind: "passive",
        damageType: "none",
        tags: ["win_condition"],
        values: {
          onDestroyed: "enemy_team_wins"
        }
      }
    ]
  },

  {
    id: "red_tower_tier_1_top",
    category: "structure",
    referenceRole: "tower tier 1 top",
    campTier: "none",
    attackType: "ranged",
    isAncient: false,
    isBoss: false,
    isControllable: false,
    isHeroLike: false,
    isBuildingLike: true,
    tags: ["structure", "tower", "tier_1", "top", "outer_objective", "attacks_enemies", "fortifiable"],
    bounty: {
      goldMin: 150,
      goldMax: 150,
      xp: 100,
      teamGold: 120,
      special: "Structure objective for team red. Last hit gold is represented by goldMin/goldMax; team reward by teamGold."
    },
    spawn: {
      firstSpawnSecond: 0,
      respawnIntervalSecond: 0,
      canStack: false,
      canBeConverted: false
    },
    baseStats: {
      maxHealth: 1800,
      healthRegen: 0,
      maxMana: 0,
      manaRegen: 0,
      damageMin: 90,
      damageMax: 100,
      armor: 12,
      magicResistance: 0,
      baseAttackSpeed: 100,
      baseAttackTime: 1.0,
      attackRange: 700,
      acquisitionRange: 800,
      movementSpeed: 0,
      turnRate: 0,
      collisionSize: 64,
      dayVision: 1800,
      nightVision: 1800
    },
    structure: {
      teamId: "red",
      structureType: "tower",
      lane: "top",
      tier: 1,
      side: "none",
      hasBackdoorProtection: true,
      canBeFortified: true,
      requiredDestroyedStructureIds: [],
      unlocksNextStructureIds: ["red_tower_tier_2_top"],
      objectiveValue: {
        mapControl: 85,
        lanePressure: 60,
        baseDefense: 20,
        ancientDefense: 0
      }
    },
    abilities: []
  },

  {
    id: "red_tower_tier_2_top",
    category: "structure",
    referenceRole: "tower tier 2 top",
    campTier: "none",
    attackType: "ranged",
    isAncient: false,
    isBoss: false,
    isControllable: false,
    isHeroLike: false,
    isBuildingLike: true,
    tags: ["structure", "tower", "tier_2", "top", "jungle_gate", "attacks_enemies", "fortifiable"],
    bounty: {
      goldMin: 200,
      goldMax: 200,
      xp: 120,
      teamGold: 140,
      special: "Structure objective for team red. Last hit gold is represented by goldMin/goldMax; team reward by teamGold."
    },
    spawn: {
      firstSpawnSecond: 0,
      respawnIntervalSecond: 0,
      canStack: false,
      canBeConverted: false
    },
    baseStats: {
      maxHealth: 2000,
      healthRegen: 0,
      maxMana: 0,
      manaRegen: 0,
      damageMin: 120,
      damageMax: 130,
      armor: 16,
      magicResistance: 0,
      baseAttackSpeed: 100,
      baseAttackTime: 1.0,
      attackRange: 700,
      acquisitionRange: 800,
      movementSpeed: 0,
      turnRate: 0,
      collisionSize: 64,
      dayVision: 1800,
      nightVision: 1800
    },
    structure: {
      teamId: "red",
      structureType: "tower",
      lane: "top",
      tier: 2,
      side: "none",
      hasBackdoorProtection: true,
      canBeFortified: true,
      requiredDestroyedStructureIds: ["red_tower_tier_1_top"],
      unlocksNextStructureIds: ["red_tower_tier_3_top"],
      objectiveValue: {
        mapControl: 75,
        lanePressure: 70,
        baseDefense: 35,
        ancientDefense: 0
      }
    },
    abilities: []
  },

  {
    id: "red_tower_tier_3_top",
    category: "structure",
    referenceRole: "tower tier 3 top",
    campTier: "none",
    attackType: "ranged",
    isAncient: false,
    isBoss: false,
    isControllable: false,
    isHeroLike: false,
    isBuildingLike: true,
    tags: ["structure", "tower", "tier_3", "top", "high_ground_gate", "attacks_enemies", "fortifiable", "backdoor_protected"],
    bounty: {
      goldMin: 250,
      goldMax: 250,
      xp: 160,
      teamGold: 160,
      special: "Structure objective for team red. Last hit gold is represented by goldMin/goldMax; team reward by teamGold."
    },
    spawn: {
      firstSpawnSecond: 0,
      respawnIntervalSecond: 0,
      canStack: false,
      canBeConverted: false
    },
    baseStats: {
      maxHealth: 2000,
      healthRegen: 0,
      maxMana: 0,
      manaRegen: 0,
      damageMin: 130,
      damageMax: 140,
      armor: 18,
      magicResistance: 0,
      baseAttackSpeed: 100,
      baseAttackTime: 1.0,
      attackRange: 700,
      acquisitionRange: 800,
      movementSpeed: 0,
      turnRate: 0,
      collisionSize: 64,
      dayVision: 1800,
      nightVision: 1800
    },
    structure: {
      teamId: "red",
      structureType: "tower",
      lane: "top",
      tier: 3,
      side: "none",
      hasBackdoorProtection: true,
      canBeFortified: true,
      requiredDestroyedStructureIds: ["red_tower_tier_2_top"],
      unlocksNextStructureIds: ["red_barracks_melee_top", "red_barracks_ranged_top"],
      objectiveValue: {
        mapControl: 60,
        lanePressure: 85,
        baseDefense: 80,
        ancientDefense: 25
      }
    },
    abilities: []
  },

  {
    id: "red_barracks_melee_top",
    category: "structure",
    referenceRole: "barracks melee top",
    campTier: "none",
    attackType: "none",
    isAncient: false,
    isBoss: false,
    isControllable: false,
    isHeroLike: false,
    isBuildingLike: true,
    tags: ["structure", "barracks", "melee_barracks", "top", "high_ground", "enables_super_melee_creeps", "fortifiable", "backdoor_protected"],
    bounty: {
      goldMin: 100,
      goldMax: 100,
      xp: 0,
      teamGold: 150,
      special: "Structure objective for team red. Last hit gold is represented by goldMin/goldMax; team reward by teamGold."
    },
    spawn: {
      firstSpawnSecond: 0,
      respawnIntervalSecond: 0,
      canStack: false,
      canBeConverted: false
    },
    baseStats: {
      maxHealth: 2200,
      healthRegen: 5,
      maxMana: 0,
      manaRegen: 0,
      damageMin: 0,
      damageMax: 0,
      armor: 15,
      magicResistance: 0,
      baseAttackSpeed: 0,
      baseAttackTime: 0,
      attackRange: 0,
      acquisitionRange: 0,
      movementSpeed: 0,
      turnRate: 0,
      collisionSize: 64,
      dayVision: 1800,
      nightVision: 1800
    },
    structure: {
      teamId: "red",
      structureType: "barracks_melee",
      lane: "top",
      tier: 0,
      side: "none",
      hasBackdoorProtection: true,
      canBeFortified: true,
      requiredDestroyedStructureIds: ["red_tower_tier_3_top"],
      unlocksNextStructureIds: [],
      objectiveValue: {
        mapControl: 35,
        lanePressure: 120,
        baseDefense: 70,
        ancientDefense: 35
      }
    },
    abilities: [
      {
        id: "melee_barracks_upgrade_rule",
        kind: "passive",
        damageType: "none",
        tags: ["lane_creep_upgrade", "super_melee_creeps"],
        values: {
          onDestroyedEnemyUnlocks: "super_melee_creep",
          megaCondition: "all_enemy_barracks_destroyed"
        }
      }
    ]
  },

  {
    id: "red_barracks_ranged_top",
    category: "structure",
    referenceRole: "barracks ranged top",
    campTier: "none",
    attackType: "none",
    isAncient: false,
    isBoss: false,
    isControllable: false,
    isHeroLike: false,
    isBuildingLike: true,
    tags: ["structure", "barracks", "ranged_barracks", "top", "high_ground", "enables_super_ranged_creeps", "fortifiable", "backdoor_protected"],
    bounty: {
      goldMin: 100,
      goldMax: 100,
      xp: 0,
      teamGold: 150,
      special: "Structure objective for team red. Last hit gold is represented by goldMin/goldMax; team reward by teamGold."
    },
    spawn: {
      firstSpawnSecond: 0,
      respawnIntervalSecond: 0,
      canStack: false,
      canBeConverted: false
    },
    baseStats: {
      maxHealth: 2200,
      healthRegen: 5,
      maxMana: 0,
      manaRegen: 0,
      damageMin: 0,
      damageMax: 0,
      armor: 15,
      magicResistance: 0,
      baseAttackSpeed: 0,
      baseAttackTime: 0,
      attackRange: 0,
      acquisitionRange: 0,
      movementSpeed: 0,
      turnRate: 0,
      collisionSize: 64,
      dayVision: 1800,
      nightVision: 1800
    },
    structure: {
      teamId: "red",
      structureType: "barracks_ranged",
      lane: "top",
      tier: 0,
      side: "none",
      hasBackdoorProtection: true,
      canBeFortified: true,
      requiredDestroyedStructureIds: ["red_tower_tier_3_top"],
      unlocksNextStructureIds: [],
      objectiveValue: {
        mapControl: 30,
        lanePressure: 105,
        baseDefense: 65,
        ancientDefense: 30
      }
    },
    abilities: [
      {
        id: "ranged_barracks_upgrade_rule",
        kind: "passive",
        damageType: "none",
        tags: ["lane_creep_upgrade", "super_ranged_creeps"],
        values: {
          onDestroyedEnemyUnlocks: "super_ranged_creep",
          megaCondition: "all_enemy_barracks_destroyed"
        }
      }
    ]
  },

  {
    id: "red_tower_tier_1_mid",
    category: "structure",
    referenceRole: "tower tier 1 mid",
    campTier: "none",
    attackType: "ranged",
    isAncient: false,
    isBoss: false,
    isControllable: false,
    isHeroLike: false,
    isBuildingLike: true,
    tags: ["structure", "tower", "tier_1", "mid", "outer_objective", "attacks_enemies", "fortifiable"],
    bounty: {
      goldMin: 150,
      goldMax: 150,
      xp: 100,
      teamGold: 120,
      special: "Structure objective for team red. Last hit gold is represented by goldMin/goldMax; team reward by teamGold."
    },
    spawn: {
      firstSpawnSecond: 0,
      respawnIntervalSecond: 0,
      canStack: false,
      canBeConverted: false
    },
    baseStats: {
      maxHealth: 1800,
      healthRegen: 0,
      maxMana: 0,
      manaRegen: 0,
      damageMin: 90,
      damageMax: 100,
      armor: 12,
      magicResistance: 0,
      baseAttackSpeed: 100,
      baseAttackTime: 1.0,
      attackRange: 700,
      acquisitionRange: 800,
      movementSpeed: 0,
      turnRate: 0,
      collisionSize: 64,
      dayVision: 1800,
      nightVision: 1800
    },
    structure: {
      teamId: "red",
      structureType: "tower",
      lane: "mid",
      tier: 1,
      side: "none",
      hasBackdoorProtection: true,
      canBeFortified: true,
      requiredDestroyedStructureIds: [],
      unlocksNextStructureIds: ["red_tower_tier_2_mid"],
      objectiveValue: {
        mapControl: 85,
        lanePressure: 60,
        baseDefense: 20,
        ancientDefense: 0
      }
    },
    abilities: []
  },

  {
    id: "red_tower_tier_2_mid",
    category: "structure",
    referenceRole: "tower tier 2 mid",
    campTier: "none",
    attackType: "ranged",
    isAncient: false,
    isBoss: false,
    isControllable: false,
    isHeroLike: false,
    isBuildingLike: true,
    tags: ["structure", "tower", "tier_2", "mid", "jungle_gate", "attacks_enemies", "fortifiable"],
    bounty: {
      goldMin: 200,
      goldMax: 200,
      xp: 120,
      teamGold: 140,
      special: "Structure objective for team red. Last hit gold is represented by goldMin/goldMax; team reward by teamGold."
    },
    spawn: {
      firstSpawnSecond: 0,
      respawnIntervalSecond: 0,
      canStack: false,
      canBeConverted: false
    },
    baseStats: {
      maxHealth: 2000,
      healthRegen: 0,
      maxMana: 0,
      manaRegen: 0,
      damageMin: 120,
      damageMax: 130,
      armor: 16,
      magicResistance: 0,
      baseAttackSpeed: 100,
      baseAttackTime: 1.0,
      attackRange: 700,
      acquisitionRange: 800,
      movementSpeed: 0,
      turnRate: 0,
      collisionSize: 64,
      dayVision: 1800,
      nightVision: 1800
    },
    structure: {
      teamId: "red",
      structureType: "tower",
      lane: "mid",
      tier: 2,
      side: "none",
      hasBackdoorProtection: true,
      canBeFortified: true,
      requiredDestroyedStructureIds: ["red_tower_tier_1_mid"],
      unlocksNextStructureIds: ["red_tower_tier_3_mid"],
      objectiveValue: {
        mapControl: 75,
        lanePressure: 70,
        baseDefense: 35,
        ancientDefense: 0
      }
    },
    abilities: []
  },

  {
    id: "red_tower_tier_3_mid",
    category: "structure",
    referenceRole: "tower tier 3 mid",
    campTier: "none",
    attackType: "ranged",
    isAncient: false,
    isBoss: false,
    isControllable: false,
    isHeroLike: false,
    isBuildingLike: true,
    tags: ["structure", "tower", "tier_3", "mid", "high_ground_gate", "attacks_enemies", "fortifiable", "backdoor_protected"],
    bounty: {
      goldMin: 250,
      goldMax: 250,
      xp: 160,
      teamGold: 160,
      special: "Structure objective for team red. Last hit gold is represented by goldMin/goldMax; team reward by teamGold."
    },
    spawn: {
      firstSpawnSecond: 0,
      respawnIntervalSecond: 0,
      canStack: false,
      canBeConverted: false
    },
    baseStats: {
      maxHealth: 2000,
      healthRegen: 0,
      maxMana: 0,
      manaRegen: 0,
      damageMin: 130,
      damageMax: 140,
      armor: 18,
      magicResistance: 0,
      baseAttackSpeed: 100,
      baseAttackTime: 1.0,
      attackRange: 700,
      acquisitionRange: 800,
      movementSpeed: 0,
      turnRate: 0,
      collisionSize: 64,
      dayVision: 1800,
      nightVision: 1800
    },
    structure: {
      teamId: "red",
      structureType: "tower",
      lane: "mid",
      tier: 3,
      side: "none",
      hasBackdoorProtection: true,
      canBeFortified: true,
      requiredDestroyedStructureIds: ["red_tower_tier_2_mid"],
      unlocksNextStructureIds: ["red_barracks_melee_mid", "red_barracks_ranged_mid"],
      objectiveValue: {
        mapControl: 60,
        lanePressure: 85,
        baseDefense: 80,
        ancientDefense: 25
      }
    },
    abilities: []
  },

  {
    id: "red_barracks_melee_mid",
    category: "structure",
    referenceRole: "barracks melee mid",
    campTier: "none",
    attackType: "none",
    isAncient: false,
    isBoss: false,
    isControllable: false,
    isHeroLike: false,
    isBuildingLike: true,
    tags: ["structure", "barracks", "melee_barracks", "mid", "high_ground", "enables_super_melee_creeps", "fortifiable", "backdoor_protected"],
    bounty: {
      goldMin: 100,
      goldMax: 100,
      xp: 0,
      teamGold: 150,
      special: "Structure objective for team red. Last hit gold is represented by goldMin/goldMax; team reward by teamGold."
    },
    spawn: {
      firstSpawnSecond: 0,
      respawnIntervalSecond: 0,
      canStack: false,
      canBeConverted: false
    },
    baseStats: {
      maxHealth: 2200,
      healthRegen: 5,
      maxMana: 0,
      manaRegen: 0,
      damageMin: 0,
      damageMax: 0,
      armor: 15,
      magicResistance: 0,
      baseAttackSpeed: 0,
      baseAttackTime: 0,
      attackRange: 0,
      acquisitionRange: 0,
      movementSpeed: 0,
      turnRate: 0,
      collisionSize: 64,
      dayVision: 1800,
      nightVision: 1800
    },
    structure: {
      teamId: "red",
      structureType: "barracks_melee",
      lane: "mid",
      tier: 0,
      side: "none",
      hasBackdoorProtection: true,
      canBeFortified: true,
      requiredDestroyedStructureIds: ["red_tower_tier_3_mid"],
      unlocksNextStructureIds: [],
      objectiveValue: {
        mapControl: 35,
        lanePressure: 120,
        baseDefense: 70,
        ancientDefense: 35
      }
    },
    abilities: [
      {
        id: "melee_barracks_upgrade_rule",
        kind: "passive",
        damageType: "none",
        tags: ["lane_creep_upgrade", "super_melee_creeps"],
        values: {
          onDestroyedEnemyUnlocks: "super_melee_creep",
          megaCondition: "all_enemy_barracks_destroyed"
        }
      }
    ]
  },

  {
    id: "red_barracks_ranged_mid",
    category: "structure",
    referenceRole: "barracks ranged mid",
    campTier: "none",
    attackType: "none",
    isAncient: false,
    isBoss: false,
    isControllable: false,
    isHeroLike: false,
    isBuildingLike: true,
    tags: ["structure", "barracks", "ranged_barracks", "mid", "high_ground", "enables_super_ranged_creeps", "fortifiable", "backdoor_protected"],
    bounty: {
      goldMin: 100,
      goldMax: 100,
      xp: 0,
      teamGold: 150,
      special: "Structure objective for team red. Last hit gold is represented by goldMin/goldMax; team reward by teamGold."
    },
    spawn: {
      firstSpawnSecond: 0,
      respawnIntervalSecond: 0,
      canStack: false,
      canBeConverted: false
    },
    baseStats: {
      maxHealth: 2200,
      healthRegen: 5,
      maxMana: 0,
      manaRegen: 0,
      damageMin: 0,
      damageMax: 0,
      armor: 15,
      magicResistance: 0,
      baseAttackSpeed: 0,
      baseAttackTime: 0,
      attackRange: 0,
      acquisitionRange: 0,
      movementSpeed: 0,
      turnRate: 0,
      collisionSize: 64,
      dayVision: 1800,
      nightVision: 1800
    },
    structure: {
      teamId: "red",
      structureType: "barracks_ranged",
      lane: "mid",
      tier: 0,
      side: "none",
      hasBackdoorProtection: true,
      canBeFortified: true,
      requiredDestroyedStructureIds: ["red_tower_tier_3_mid"],
      unlocksNextStructureIds: [],
      objectiveValue: {
        mapControl: 30,
        lanePressure: 105,
        baseDefense: 65,
        ancientDefense: 30
      }
    },
    abilities: [
      {
        id: "ranged_barracks_upgrade_rule",
        kind: "passive",
        damageType: "none",
        tags: ["lane_creep_upgrade", "super_ranged_creeps"],
        values: {
          onDestroyedEnemyUnlocks: "super_ranged_creep",
          megaCondition: "all_enemy_barracks_destroyed"
        }
      }
    ]
  },

  {
    id: "red_tower_tier_1_bottom",
    category: "structure",
    referenceRole: "tower tier 1 bottom",
    campTier: "none",
    attackType: "ranged",
    isAncient: false,
    isBoss: false,
    isControllable: false,
    isHeroLike: false,
    isBuildingLike: true,
    tags: ["structure", "tower", "tier_1", "bottom", "outer_objective", "attacks_enemies", "fortifiable"],
    bounty: {
      goldMin: 150,
      goldMax: 150,
      xp: 100,
      teamGold: 120,
      special: "Structure objective for team red. Last hit gold is represented by goldMin/goldMax; team reward by teamGold."
    },
    spawn: {
      firstSpawnSecond: 0,
      respawnIntervalSecond: 0,
      canStack: false,
      canBeConverted: false
    },
    baseStats: {
      maxHealth: 1800,
      healthRegen: 0,
      maxMana: 0,
      manaRegen: 0,
      damageMin: 90,
      damageMax: 100,
      armor: 12,
      magicResistance: 0,
      baseAttackSpeed: 100,
      baseAttackTime: 1.0,
      attackRange: 700,
      acquisitionRange: 800,
      movementSpeed: 0,
      turnRate: 0,
      collisionSize: 64,
      dayVision: 1800,
      nightVision: 1800
    },
    structure: {
      teamId: "red",
      structureType: "tower",
      lane: "bottom",
      tier: 1,
      side: "none",
      hasBackdoorProtection: true,
      canBeFortified: true,
      requiredDestroyedStructureIds: [],
      unlocksNextStructureIds: ["red_tower_tier_2_bottom"],
      objectiveValue: {
        mapControl: 85,
        lanePressure: 60,
        baseDefense: 20,
        ancientDefense: 0
      }
    },
    abilities: []
  },

  {
    id: "red_tower_tier_2_bottom",
    category: "structure",
    referenceRole: "tower tier 2 bottom",
    campTier: "none",
    attackType: "ranged",
    isAncient: false,
    isBoss: false,
    isControllable: false,
    isHeroLike: false,
    isBuildingLike: true,
    tags: ["structure", "tower", "tier_2", "bottom", "jungle_gate", "attacks_enemies", "fortifiable"],
    bounty: {
      goldMin: 200,
      goldMax: 200,
      xp: 120,
      teamGold: 140,
      special: "Structure objective for team red. Last hit gold is represented by goldMin/goldMax; team reward by teamGold."
    },
    spawn: {
      firstSpawnSecond: 0,
      respawnIntervalSecond: 0,
      canStack: false,
      canBeConverted: false
    },
    baseStats: {
      maxHealth: 2000,
      healthRegen: 0,
      maxMana: 0,
      manaRegen: 0,
      damageMin: 120,
      damageMax: 130,
      armor: 16,
      magicResistance: 0,
      baseAttackSpeed: 100,
      baseAttackTime: 1.0,
      attackRange: 700,
      acquisitionRange: 800,
      movementSpeed: 0,
      turnRate: 0,
      collisionSize: 64,
      dayVision: 1800,
      nightVision: 1800
    },
    structure: {
      teamId: "red",
      structureType: "tower",
      lane: "bottom",
      tier: 2,
      side: "none",
      hasBackdoorProtection: true,
      canBeFortified: true,
      requiredDestroyedStructureIds: ["red_tower_tier_1_bottom"],
      unlocksNextStructureIds: ["red_tower_tier_3_bottom"],
      objectiveValue: {
        mapControl: 75,
        lanePressure: 70,
        baseDefense: 35,
        ancientDefense: 0
      }
    },
    abilities: []
  },

  {
    id: "red_tower_tier_3_bottom",
    category: "structure",
    referenceRole: "tower tier 3 bottom",
    campTier: "none",
    attackType: "ranged",
    isAncient: false,
    isBoss: false,
    isControllable: false,
    isHeroLike: false,
    isBuildingLike: true,
    tags: ["structure", "tower", "tier_3", "bottom", "high_ground_gate", "attacks_enemies", "fortifiable", "backdoor_protected"],
    bounty: {
      goldMin: 250,
      goldMax: 250,
      xp: 160,
      teamGold: 160,
      special: "Structure objective for team red. Last hit gold is represented by goldMin/goldMax; team reward by teamGold."
    },
    spawn: {
      firstSpawnSecond: 0,
      respawnIntervalSecond: 0,
      canStack: false,
      canBeConverted: false
    },
    baseStats: {
      maxHealth: 2000,
      healthRegen: 0,
      maxMana: 0,
      manaRegen: 0,
      damageMin: 130,
      damageMax: 140,
      armor: 18,
      magicResistance: 0,
      baseAttackSpeed: 100,
      baseAttackTime: 1.0,
      attackRange: 700,
      acquisitionRange: 800,
      movementSpeed: 0,
      turnRate: 0,
      collisionSize: 64,
      dayVision: 1800,
      nightVision: 1800
    },
    structure: {
      teamId: "red",
      structureType: "tower",
      lane: "bottom",
      tier: 3,
      side: "none",
      hasBackdoorProtection: true,
      canBeFortified: true,
      requiredDestroyedStructureIds: ["red_tower_tier_2_bottom"],
      unlocksNextStructureIds: ["red_barracks_melee_bottom", "red_barracks_ranged_bottom"],
      objectiveValue: {
        mapControl: 60,
        lanePressure: 85,
        baseDefense: 80,
        ancientDefense: 25
      }
    },
    abilities: []
  },

  {
    id: "red_barracks_melee_bottom",
    category: "structure",
    referenceRole: "barracks melee bottom",
    campTier: "none",
    attackType: "none",
    isAncient: false,
    isBoss: false,
    isControllable: false,
    isHeroLike: false,
    isBuildingLike: true,
    tags: ["structure", "barracks", "melee_barracks", "bottom", "high_ground", "enables_super_melee_creeps", "fortifiable", "backdoor_protected"],
    bounty: {
      goldMin: 100,
      goldMax: 100,
      xp: 0,
      teamGold: 150,
      special: "Structure objective for team red. Last hit gold is represented by goldMin/goldMax; team reward by teamGold."
    },
    spawn: {
      firstSpawnSecond: 0,
      respawnIntervalSecond: 0,
      canStack: false,
      canBeConverted: false
    },
    baseStats: {
      maxHealth: 2200,
      healthRegen: 5,
      maxMana: 0,
      manaRegen: 0,
      damageMin: 0,
      damageMax: 0,
      armor: 15,
      magicResistance: 0,
      baseAttackSpeed: 0,
      baseAttackTime: 0,
      attackRange: 0,
      acquisitionRange: 0,
      movementSpeed: 0,
      turnRate: 0,
      collisionSize: 64,
      dayVision: 1800,
      nightVision: 1800
    },
    structure: {
      teamId: "red",
      structureType: "barracks_melee",
      lane: "bottom",
      tier: 0,
      side: "none",
      hasBackdoorProtection: true,
      canBeFortified: true,
      requiredDestroyedStructureIds: ["red_tower_tier_3_bottom"],
      unlocksNextStructureIds: [],
      objectiveValue: {
        mapControl: 35,
        lanePressure: 120,
        baseDefense: 70,
        ancientDefense: 35
      }
    },
    abilities: [
      {
        id: "melee_barracks_upgrade_rule",
        kind: "passive",
        damageType: "none",
        tags: ["lane_creep_upgrade", "super_melee_creeps"],
        values: {
          onDestroyedEnemyUnlocks: "super_melee_creep",
          megaCondition: "all_enemy_barracks_destroyed"
        }
      }
    ]
  },

  {
    id: "red_barracks_ranged_bottom",
    category: "structure",
    referenceRole: "barracks ranged bottom",
    campTier: "none",
    attackType: "none",
    isAncient: false,
    isBoss: false,
    isControllable: false,
    isHeroLike: false,
    isBuildingLike: true,
    tags: ["structure", "barracks", "ranged_barracks", "bottom", "high_ground", "enables_super_ranged_creeps", "fortifiable", "backdoor_protected"],
    bounty: {
      goldMin: 100,
      goldMax: 100,
      xp: 0,
      teamGold: 150,
      special: "Structure objective for team red. Last hit gold is represented by goldMin/goldMax; team reward by teamGold."
    },
    spawn: {
      firstSpawnSecond: 0,
      respawnIntervalSecond: 0,
      canStack: false,
      canBeConverted: false
    },
    baseStats: {
      maxHealth: 2200,
      healthRegen: 5,
      maxMana: 0,
      manaRegen: 0,
      damageMin: 0,
      damageMax: 0,
      armor: 15,
      magicResistance: 0,
      baseAttackSpeed: 0,
      baseAttackTime: 0,
      attackRange: 0,
      acquisitionRange: 0,
      movementSpeed: 0,
      turnRate: 0,
      collisionSize: 64,
      dayVision: 1800,
      nightVision: 1800
    },
    structure: {
      teamId: "red",
      structureType: "barracks_ranged",
      lane: "bottom",
      tier: 0,
      side: "none",
      hasBackdoorProtection: true,
      canBeFortified: true,
      requiredDestroyedStructureIds: ["red_tower_tier_3_bottom"],
      unlocksNextStructureIds: [],
      objectiveValue: {
        mapControl: 30,
        lanePressure: 105,
        baseDefense: 65,
        ancientDefense: 30
      }
    },
    abilities: [
      {
        id: "ranged_barracks_upgrade_rule",
        kind: "passive",
        damageType: "none",
        tags: ["lane_creep_upgrade", "super_ranged_creeps"],
        values: {
          onDestroyedEnemyUnlocks: "super_ranged_creep",
          megaCondition: "all_enemy_barracks_destroyed"
        }
      }
    ]
  },

  {
    id: "red_tower_tier_4_left",
    category: "structure",
    referenceRole: "tower tier 4 left",
    campTier: "none",
    attackType: "ranged",
    isAncient: false,
    isBoss: false,
    isControllable: false,
    isHeroLike: false,
    isBuildingLike: true,
    tags: ["structure", "tower", "tier_4", "base", "left", "ancient_guard", "attacks_enemies", "fortifiable", "backdoor_protected"],
    bounty: {
      goldMin: 0,
      goldMax: 0,
      xp: 0,
      teamGold: 0,
      special: "Structure objective for team red. Last hit gold is represented by goldMin/goldMax; team reward by teamGold."
    },
    spawn: {
      firstSpawnSecond: 0,
      respawnIntervalSecond: 0,
      canStack: false,
      canBeConverted: false
    },
    baseStats: {
      maxHealth: 2100,
      healthRegen: 0,
      maxMana: 0,
      manaRegen: 0,
      damageMin: 140,
      damageMax: 150,
      armor: 21,
      magicResistance: 0,
      baseAttackSpeed: 100,
      baseAttackTime: 1.0,
      attackRange: 700,
      acquisitionRange: 800,
      movementSpeed: 0,
      turnRate: 0,
      collisionSize: 64,
      dayVision: 1800,
      nightVision: 1800
    },
    structure: {
      teamId: "red",
      structureType: "tower",
      lane: "base",
      tier: 4,
      side: "left",
      hasBackdoorProtection: true,
      canBeFortified: true,
      requiredDestroyedStructureIds: ["red_tower_tier_3_top", "red_tower_tier_3_mid", "red_tower_tier_3_bottom"],
      unlocksNextStructureIds: ["red_ancient_core"],
      objectiveValue: {
        mapControl: 15,
        lanePressure: 20,
        baseDefense: 100,
        ancientDefense: 120
      }
    },
    abilities: []
  },

  {
    id: "red_tower_tier_4_right",
    category: "structure",
    referenceRole: "tower tier 4 right",
    campTier: "none",
    attackType: "ranged",
    isAncient: false,
    isBoss: false,
    isControllable: false,
    isHeroLike: false,
    isBuildingLike: true,
    tags: ["structure", "tower", "tier_4", "base", "right", "ancient_guard", "attacks_enemies", "fortifiable", "backdoor_protected"],
    bounty: {
      goldMin: 0,
      goldMax: 0,
      xp: 0,
      teamGold: 0,
      special: "Structure objective for team red. Last hit gold is represented by goldMin/goldMax; team reward by teamGold."
    },
    spawn: {
      firstSpawnSecond: 0,
      respawnIntervalSecond: 0,
      canStack: false,
      canBeConverted: false
    },
    baseStats: {
      maxHealth: 2100,
      healthRegen: 0,
      maxMana: 0,
      manaRegen: 0,
      damageMin: 140,
      damageMax: 150,
      armor: 21,
      magicResistance: 0,
      baseAttackSpeed: 100,
      baseAttackTime: 1.0,
      attackRange: 700,
      acquisitionRange: 800,
      movementSpeed: 0,
      turnRate: 0,
      collisionSize: 64,
      dayVision: 1800,
      nightVision: 1800
    },
    structure: {
      teamId: "red",
      structureType: "tower",
      lane: "base",
      tier: 4,
      side: "right",
      hasBackdoorProtection: true,
      canBeFortified: true,
      requiredDestroyedStructureIds: ["red_tower_tier_3_top", "red_tower_tier_3_mid", "red_tower_tier_3_bottom"],
      unlocksNextStructureIds: ["red_ancient_core"],
      objectiveValue: {
        mapControl: 15,
        lanePressure: 20,
        baseDefense: 100,
        ancientDefense: 120
      }
    },
    abilities: []
  },

  {
    id: "red_ancient_core",
    category: "structure",
    referenceRole: "ancient core",
    campTier: "none",
    attackType: "none",
    isAncient: true,
    isBoss: false,
    isControllable: false,
    isHeroLike: false,
    isBuildingLike: true,
    tags: ["structure", "ancient", "core", "win_condition", "base", "fortifiable", "backdoor_protected"],
    bounty: {
      goldMin: 0,
      goldMax: 0,
      xp: 0,
      teamGold: 0,
      special: "Structure objective for team red. Last hit gold is represented by goldMin/goldMax; team reward by teamGold."
    },
    spawn: {
      firstSpawnSecond: 0,
      respawnIntervalSecond: 0,
      canStack: false,
      canBeConverted: false
    },
    baseStats: {
      maxHealth: 4500,
      healthRegen: 0,
      maxMana: 0,
      manaRegen: 0,
      damageMin: 0,
      damageMax: 0,
      armor: 15,
      magicResistance: 0,
      baseAttackSpeed: 0,
      baseAttackTime: 0,
      attackRange: 0,
      acquisitionRange: 0,
      movementSpeed: 0,
      turnRate: 0,
      collisionSize: 96,
      dayVision: 1800,
      nightVision: 1800
    },
    structure: {
      teamId: "red",
      structureType: "ancient_core",
      lane: "base",
      tier: 0,
      side: "none",
      hasBackdoorProtection: true,
      canBeFortified: true,
      requiredDestroyedStructureIds: ["red_tower_tier_4_left", "red_tower_tier_4_right"],
      unlocksNextStructureIds: [],
      objectiveValue: {
        mapControl: 0,
        lanePressure: 0,
        baseDefense: 200,
        ancientDefense: 999
      }
    },
    abilities: [
      {
        id: "ancient_destroy_win_condition",
        kind: "passive",
        damageType: "none",
        tags: ["win_condition"],
        values: {
          onDestroyed: "enemy_team_wins"
        }
      }
    ]
  }
];

export const ALL_UNIT_SEEDS: UnitSeed[] = [
  ...LANE_CREEP_SEEDS,
  ...NEUTRAL_CREEP_SEEDS,
  ...BOSS_UNIT_SEEDS,
  ...SUMMON_UNIT_SEEDS,
  ...STRUCTURE_UNIT_SEEDS,
];

export const UNIT_SEED_COUNTS = {
  laneCreeps: LANE_CREEP_SEEDS.length,
  neutralCreeps: NEUTRAL_CREEP_SEEDS.length,
  bosses: BOSS_UNIT_SEEDS.length,
  summons: SUMMON_UNIT_SEEDS.length,
  structures: STRUCTURE_UNIT_SEEDS.length,
  total: ALL_UNIT_SEEDS.length,
};

// Sugestão para o Codex:
// 1. Salvar como src/data/unitSeeds.ts.
// 2. Criar UnitSeed validator.
// 3. Criar filtros por category, campTier, tags, attackType, isAncient, isBoss.
// 4. Criar integração com lane wave spawner, neutral camp spawner e summon factory.
// 5. Não reescrever estes seeds ao criar UI.
// 6. Ajustar números em balance pass depois de simular 50-100 partidas.
