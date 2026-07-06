// moba_item_ai_build_guidelines.txt
// Guia consumível pelo Codex para a IA de compra/builds do manager de MOBA.
// Usa os IDs de item de item_seeds_moba_manager.txt e os IDs de herói de all_hero_seeds_moba_manager.txt.
// Objetivo:
// - dizer qual item tende a ser para core, suporte, offlane, caster, aura ou situacional;
// - declarar interações ótimas e péssimas;
// - fornecer uma build de exemplo para cada herói seed;
// - dar regras para a IA adaptar a build durante a partida.
//
// Importante:
// As builds são exemplos iniciais, não verdades fixas. A IA deve adaptar por partida, inimigos, timings,
// estado do mapa, disponibilidade de buyback, counters e função real do jogador.

export type ItemAiClassification =
  | "universal_laning_consumable"
  | "mid_or_roaming_consumable"
  | "defensive_laning_consumable"
  | "support_recovery_consumable"
  | "support_map_utility"
  | "universal_map_utility"
  | "component_only"
  | "core_component"
  | "caster_component"
  | "flex_component"
  | "core_or_initiator_component"
  | "support_boots"
  | "core_boots"
  | "macro_core_boots"
  | "greedy_core_economy"
  | "support_core"
  | "support_or_aura_core"
  | "right_click_core"
  | "caster_core"
  | "offlane_tank_or_defensive_core"
  | "mobility_or_initiation"
  | "strength_laning_or_offlane"
  | "agility_core_laning"
  | "caster_or_support_laning"
  | "universal_laning"
  | "mana_hungry_core"
  | "aggressive_physical_laning"
  | "hybrid_laning_core"
  | "neutral_core_item"
  | "neutral_caster_or_support_item"
  | "neutral_tank_or_support_item"
  | "neutral_flex_item"
  | "neutral_core_enchantment"
  | "neutral_support_or_caster_enchantment"
  | "neutral_flex_enchantment"
  | "flex";

export interface ItemAiGuide {
  id: string;
  archetype: string;
  category: string;
  aiClassification: ItemAiClassification | string;
  recommendedOwners: string[];
  avoidOwners: string[];
  timing: string;
  aiNotes: string;
}

export interface ItemInteractionGuide {
  id: string;
  requires?: string[];
  greatItems?: string[];
  greatHeroes?: string[];
  badItems?: string[];
  badItemsTogether?: string[];
  badHeroes?: string[];
  badEnemyItems?: string[];
  badEnemyState?: string[];
  missingItems?: string[];
  badEnemyHeroes?: string[];
  badPattern?: string[];
  reason: string;
}

export interface HeroBuildExample {
  heroId: string;
  archetype: string;
  preferredPositions: number[];
  buildIdentity: string;
  startingItems: string[];
  earlyItems: string[];
  coreItems: string[];
  luxuryItems: string[];
  situationalItems: string[];
  neutralPreferences: string[];
  aiWarnings: string[];
}

export const ITEM_PURCHASE_AI_RULES = [
  {
    id: "core_vs_support_role_priority",
    description: "Classificar item não só por atributo, mas por posição e timing. Core compra dano, escalamento e proteção de janela; suporte compra visão, save, aura, dispel e itens baratos de impacto."
  },
  {
    id: "do_not_block_key_timing",
    description: "Se o herói está a menos de 90 segundos de item-chave, reduzir compra situacional de baixo impacto."
  },
  {
    id: "support_gold_efficiency",
    description: "Para suportes, reduzir prioridade de itens acima de 4000 gold salvo se o jogo passou de late game ou o item resolve condição crítica."
  },
  {
    id: "one_boot_rule",
    description: "Apenas uma linha de botas deve estar ativa por build; upgrades substituem botas anteriores."
  },
  {
    id: "counter_item_override",
    description: "Itens situacionais podem ultrapassar core quando counteram ameaça dominante: reveal vs invis, dispel vs silence/root, true strike vs evasion, pipe vs burst mágico, crimson vs summons."
  },
  {
    id: "aura_overlap_penalty",
    description: "Aplicar penalidade quando dois aliados querem comprar a mesma aura. Preferir distribuir Pipe/Crimson/Assault/Vlad-like/Drums-like entre offlane e supports."
  }
];

export const ITEM_AI_GUIDES: ItemAiGuide[] = [
  {
    id: "i001_regen_rations",
    archetype: "consumível de regeneração lenta de vida",
    category: "consumable",
    aiClassification: "universal_laning_consumable",
    recommendedOwners: ["all_positions"],
    avoidOwners: [],
    timing: "starting",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i002_healing_salve",
    archetype: "consumível de cura intensa interrompível",
    category: "consumable",
    aiClassification: "universal_laning_consumable",
    recommendedOwners: ["all_positions"],
    avoidOwners: [],
    timing: "starting",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i003_mana_clarity",
    archetype: "consumível de regeneração lenta de mana",
    category: "consumable",
    aiClassification: "universal_laning_consumable",
    recommendedOwners: ["all_positions"],
    avoidOwners: [],
    timing: "starting",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i004_burst_mango",
    archetype: "fruta de mana instantânea com pequena regeneração passiva",
    category: "consumable",
    aiClassification: "universal_laning_consumable",
    recommendedOwners: ["all_positions"],
    avoidOwners: [],
    timing: "starting",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i005_faerie_spark",
    archetype: "consumível de dano pequeno e cura emergencial",
    category: "consumable",
    aiClassification: "universal_laning_consumable",
    recommendedOwners: ["all_positions"],
    avoidOwners: [],
    timing: "starting",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i006_team_smoke",
    archetype: "consumível de invisibilidade estratégica para rotação",
    category: "map_utility",
    aiClassification: "support_map_utility",
    recommendedOwners: ["position_5_hard_support", "position_4_soft_support"],
    avoidOwners: ["greedy_position_1_if_delays_damage_timing"],
    timing: "starting",
    aiNotes: "Priorizar em suportes e em decisões de mapa; não contar como power spike de combate puro."
  },
  {
    id: "i007_recall_scroll",
    archetype: "teleporte estratégico para estruturas aliadas",
    category: "map_utility",
    aiClassification: "universal_map_utility",
    recommendedOwners: ["all_positions"],
    avoidOwners: [],
    timing: "starting",
    aiNotes: "Priorizar em suportes e em decisões de mapa; não contar como power spike de combate puro."
  },
  {
    id: "i008_observer_eye",
    archetype: "sentinela de visão gratuita com duração longa",
    category: "map_utility",
    aiClassification: "support_map_utility",
    recommendedOwners: ["position_5_hard_support", "position_4_soft_support"],
    avoidOwners: ["greedy_position_1_if_delays_damage_timing"],
    timing: "starting",
    aiNotes: "Priorizar em suportes e em decisões de mapa; não contar como power spike de combate puro."
  },
  {
    id: "i009_sentry_eye",
    archetype: "sentinela de revelação contra invisibilidade",
    category: "map_utility",
    aiClassification: "support_map_utility",
    recommendedOwners: ["position_5_hard_support", "position_4_soft_support"],
    avoidOwners: ["greedy_position_1_if_delays_damage_timing"],
    timing: "starting",
    aiNotes: "Priorizar em suportes e em decisões de mapa; não contar como power spike de combate puro."
  },
  {
    id: "i010_revealing_dust",
    archetype: "revelação em área contra unidades invisíveis",
    category: "map_utility",
    aiClassification: "support_map_utility",
    recommendedOwners: ["position_5_hard_support", "position_4_soft_support"],
    avoidOwners: ["greedy_position_1_if_delays_damage_timing"],
    timing: "starting",
    aiNotes: "Priorizar em suportes e em decisões de mapa; não contar como power spike de combate puro."
  },
  {
    id: "i011_refillable_bottle",
    archetype: "frasco de recargas para vida, mana e controle de runas",
    category: "consumable",
    aiClassification: "mid_or_roaming_consumable",
    recommendedOwners: ["position_2_mid", "position_4_soft_support"],
    avoidOwners: [],
    timing: "starting",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i012_rain_barrier_drops",
    archetype: "barreira consumível automática contra dano mágico",
    category: "consumable",
    aiClassification: "defensive_laning_consumable",
    recommendedOwners: ["all_positions_vs_magic_spam"],
    avoidOwners: [],
    timing: "starting",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i013_tome_training",
    archetype: "consumível de experiência para recuperação estratégica",
    category: "consumable",
    aiClassification: "support_recovery_consumable",
    recommendedOwners: ["position_5_hard_support", "position_4_soft_support"],
    avoidOwners: [],
    timing: "starting",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i014_minor_branch",
    archetype: "componente barato de atributos universais",
    category: "component",
    aiClassification: "component_only",
    recommendedOwners: ["build_component_only"],
    avoidOwners: [],
    timing: "component",
    aiNotes: "Não comprar diretamente como item final; usar como peça de receita."
  },
  {
    id: "i015_strength_gauntlet",
    archetype: "componente barato de força",
    category: "component",
    aiClassification: "core_component",
    recommendedOwners: ["position_1_carry", "position_2_mid", "position_3_offlane"],
    avoidOwners: ["low_attack_uptime_supports", "pure_casters_without_attack_scaling"],
    timing: "component",
    aiNotes: "Não comprar diretamente como item final; usar como peça de receita."
  },
  {
    id: "i016_agility_slippers",
    archetype: "componente barato de agilidade",
    category: "component",
    aiClassification: "core_component",
    recommendedOwners: ["position_1_carry", "position_2_mid", "position_3_offlane"],
    avoidOwners: ["low_attack_uptime_supports", "pure_casters_without_attack_scaling"],
    timing: "component",
    aiNotes: "Não comprar diretamente como item final; usar como peça de receita."
  },
  {
    id: "i017_intelligence_mantle",
    archetype: "componente barato de inteligência",
    category: "component",
    aiClassification: "caster_component",
    recommendedOwners: ["position_2_mid", "position_4_soft_support", "position_5_hard_support"],
    avoidOwners: ["low_spell_impact_tanks", "mana_independent_right_clickers"],
    timing: "component",
    aiNotes: "Não comprar diretamente como item final; usar como peça de receita."
  },
  {
    id: "i018_small_circlet",
    archetype: "componente barato de todos os atributos",
    category: "component",
    aiClassification: "component_only",
    recommendedOwners: ["build_component_only"],
    avoidOwners: [],
    timing: "component",
    aiNotes: "Não comprar diretamente como item final; usar como peça de receita."
  },
  {
    id: "i019_strength_belt",
    archetype: "componente médio de força",
    category: "component",
    aiClassification: "core_component",
    recommendedOwners: ["position_1_carry", "position_2_mid", "position_3_offlane"],
    avoidOwners: ["low_attack_uptime_supports", "pure_casters_without_attack_scaling"],
    timing: "component",
    aiNotes: "Não comprar diretamente como item final; usar como peça de receita."
  },
  {
    id: "i020_agility_band",
    archetype: "componente médio de agilidade",
    category: "component",
    aiClassification: "core_component",
    recommendedOwners: ["position_1_carry", "position_2_mid", "position_3_offlane"],
    avoidOwners: ["low_attack_uptime_supports", "pure_casters_without_attack_scaling"],
    timing: "component",
    aiNotes: "Não comprar diretamente como item final; usar como peça de receita."
  },
  {
    id: "i021_intelligence_robe",
    archetype: "componente médio de inteligência",
    category: "component",
    aiClassification: "caster_component",
    recommendedOwners: ["position_2_mid", "position_4_soft_support", "position_5_hard_support"],
    avoidOwners: ["low_spell_impact_tanks", "mana_independent_right_clickers"],
    timing: "component",
    aiNotes: "Não comprar diretamente como item final; usar como peça de receita."
  },
  {
    id: "i022_balanced_crown",
    archetype: "componente médio de atributos universais",
    category: "component",
    aiClassification: "component_only",
    recommendedOwners: ["build_component_only"],
    avoidOwners: [],
    timing: "component",
    aiNotes: "Não comprar diretamente como item final; usar como peça de receita."
  },
  {
    id: "i023_giant_axe",
    archetype: "componente grande de força",
    category: "component",
    aiClassification: "core_component",
    recommendedOwners: ["position_1_carry", "position_2_mid", "position_3_offlane"],
    avoidOwners: ["low_attack_uptime_supports", "pure_casters_without_attack_scaling"],
    timing: "component",
    aiNotes: "Não comprar diretamente como item final; usar como peça de receita."
  },
  {
    id: "i024_swift_blade",
    archetype: "componente grande de agilidade",
    category: "component",
    aiClassification: "core_component",
    recommendedOwners: ["position_1_carry", "position_2_mid", "position_3_offlane"],
    avoidOwners: ["low_attack_uptime_supports", "pure_casters_without_attack_scaling"],
    timing: "component",
    aiNotes: "Não comprar diretamente como item final; usar como peça de receita."
  },
  {
    id: "i025_wizard_staff",
    archetype: "componente grande de inteligência",
    category: "component",
    aiClassification: "caster_component",
    recommendedOwners: ["position_2_mid", "position_4_soft_support", "position_5_hard_support"],
    avoidOwners: ["low_spell_impact_tanks", "mana_independent_right_clickers"],
    timing: "component",
    aiNotes: "Não comprar diretamente como item final; usar como peça de receita."
  },
  {
    id: "i026_grand_diadem",
    archetype: "componente grande de todos os atributos",
    category: "component",
    aiClassification: "component_only",
    recommendedOwners: ["build_component_only"],
    avoidOwners: [],
    timing: "component",
    aiNotes: "Não comprar diretamente como item final; usar como peça de receita."
  },
  {
    id: "i027_basic_boots",
    archetype: "componente de velocidade de movimento",
    category: "component",
    aiClassification: "component_only",
    recommendedOwners: ["build_component_only"],
    avoidOwners: [],
    timing: "component",
    aiNotes: "Não comprar diretamente como item final; usar como peça de receita."
  },
  {
    id: "i028_wind_thread",
    archetype: "componente barato de velocidade adicional",
    category: "component",
    aiClassification: "component_only",
    recommendedOwners: ["build_component_only"],
    avoidOwners: [],
    timing: "component",
    aiNotes: "Não comprar diretamente como item final; usar como peça de receita."
  },
  {
    id: "i029_quelling_hatchet",
    archetype: "componente de farm contra creeps",
    category: "component",
    aiClassification: "core_or_initiator_component",
    recommendedOwners: ["position_1_carry", "position_2_mid", "position_3_offlane", "position_4_soft_support"],
    avoidOwners: [],
    timing: "component",
    aiNotes: "Não comprar diretamente como item final; usar como peça de receita."
  },
  {
    id: "i030_venom_orb",
    archetype: "componente de ataque com veneno e lentidão",
    category: "component",
    aiClassification: "core_component",
    recommendedOwners: ["position_1_carry", "position_2_mid", "position_3_offlane"],
    avoidOwners: ["low_attack_uptime_supports", "pure_casters_without_attack_scaling"],
    timing: "component",
    aiNotes: "Não comprar diretamente como item final; usar como peça de receita."
  },
  {
    id: "i031_armor_break_stone",
    archetype: "componente de redução de armadura por ataque",
    category: "component",
    aiClassification: "core_component",
    recommendedOwners: ["position_1_carry", "position_2_mid", "position_3_offlane"],
    avoidOwners: ["low_attack_uptime_supports", "pure_casters_without_attack_scaling"],
    timing: "component",
    aiNotes: "Não comprar diretamente como item final; usar como peça de receita."
  },
  {
    id: "i032_small_damage_blades",
    archetype: "componente barato de dano",
    category: "component",
    aiClassification: "core_component",
    recommendedOwners: ["position_1_carry", "position_2_mid", "position_3_offlane"],
    avoidOwners: ["low_attack_uptime_supports", "pure_casters_without_attack_scaling"],
    timing: "component",
    aiNotes: "Não comprar diretamente como item final; usar como peça de receita."
  },
  {
    id: "i033_broad_sword",
    archetype: "componente médio de dano",
    category: "component",
    aiClassification: "core_component",
    recommendedOwners: ["position_1_carry", "position_2_mid", "position_3_offlane"],
    avoidOwners: ["low_attack_uptime_supports", "pure_casters_without_attack_scaling"],
    timing: "component",
    aiNotes: "Não comprar diretamente como item final; usar como peça de receita."
  },
  {
    id: "i034_heavy_claymore",
    archetype: "componente grande de dano",
    category: "component",
    aiClassification: "core_component",
    recommendedOwners: ["position_1_carry", "position_2_mid", "position_3_offlane"],
    avoidOwners: ["low_attack_uptime_supports", "pure_casters_without_attack_scaling"],
    timing: "component",
    aiNotes: "Não comprar diretamente como item final; usar como peça de receita."
  },
  {
    id: "i035_piercing_javelin",
    archetype: "componente de dano com proc mágico",
    category: "component",
    aiClassification: "core_component",
    recommendedOwners: ["position_1_carry", "position_2_mid", "position_3_offlane"],
    avoidOwners: ["low_attack_uptime_supports", "pure_casters_without_attack_scaling"],
    timing: "component",
    aiNotes: "Não comprar diretamente como item final; usar como peça de receita."
  },
  {
    id: "i036_war_hammer",
    archetype: "componente avançado de dano",
    category: "component",
    aiClassification: "core_component",
    recommendedOwners: ["position_1_carry", "position_2_mid", "position_3_offlane"],
    avoidOwners: ["low_attack_uptime_supports", "pure_casters_without_attack_scaling"],
    timing: "component",
    aiNotes: "Não comprar diretamente como item final; usar como peça de receita."
  },
  {
    id: "i037_demon_edge_generic",
    archetype: "componente supremo de dano bruto",
    category: "component",
    aiClassification: "core_component",
    recommendedOwners: ["position_1_carry", "position_2_mid", "position_3_offlane"],
    avoidOwners: ["low_attack_uptime_supports", "pure_casters_without_attack_scaling"],
    timing: "component",
    aiNotes: "Não comprar diretamente como item final; usar como peça de receita."
  },
  {
    id: "i038_quarterstaff",
    archetype: "componente de dano e velocidade de ataque",
    category: "component",
    aiClassification: "core_component",
    recommendedOwners: ["position_1_carry", "position_2_mid", "position_3_offlane"],
    avoidOwners: ["low_attack_uptime_supports", "pure_casters_without_attack_scaling"],
    timing: "component",
    aiNotes: "Não comprar diretamente como item final; usar como peça de receita."
  },
  {
    id: "i039_fast_knuckles",
    archetype: "componente de velocidade de ataque",
    category: "component",
    aiClassification: "core_component",
    recommendedOwners: ["position_1_carry", "position_2_mid", "position_3_offlane"],
    avoidOwners: ["low_attack_uptime_supports", "pure_casters_without_attack_scaling"],
    timing: "component",
    aiNotes: "Não comprar diretamente como item final; usar como peça de receita."
  },
  {
    id: "i040_haste_gloves",
    archetype: "componente barato de velocidade de ataque",
    category: "component",
    aiClassification: "core_component",
    recommendedOwners: ["position_1_carry", "position_2_mid", "position_3_offlane"],
    avoidOwners: ["low_attack_uptime_supports", "pure_casters_without_attack_scaling"],
    timing: "component",
    aiNotes: "Não comprar diretamente como item final; usar como peça de receita."
  },
  {
    id: "i041_protection_ring",
    archetype: "componente barato de armadura",
    category: "component",
    aiClassification: "component_only",
    recommendedOwners: ["build_component_only"],
    avoidOwners: [],
    timing: "component",
    aiNotes: "Não comprar diretamente como item final; usar como peça de receita."
  },
  {
    id: "i042_chain_armor",
    archetype: "componente médio de armadura",
    category: "component",
    aiClassification: "component_only",
    recommendedOwners: ["build_component_only"],
    avoidOwners: [],
    timing: "component",
    aiNotes: "Não comprar diretamente como item final; usar como peça de receita."
  },
  {
    id: "i043_splintmail_plate",
    archetype: "componente grande de armadura",
    category: "component",
    aiClassification: "component_only",
    recommendedOwners: ["build_component_only"],
    avoidOwners: [],
    timing: "component",
    aiNotes: "Não comprar diretamente como item final; usar como peça de receita."
  },
  {
    id: "i044_iron_helm",
    archetype: "componente de armadura e regeneração",
    category: "component",
    aiClassification: "component_only",
    recommendedOwners: ["build_component_only"],
    avoidOwners: [],
    timing: "component",
    aiNotes: "Não comprar diretamente como item final; usar como peça de receita."
  },
  {
    id: "i045_grand_platemail",
    archetype: "componente supremo de armadura",
    category: "component",
    aiClassification: "component_only",
    recommendedOwners: ["build_component_only"],
    avoidOwners: [],
    timing: "component",
    aiNotes: "Não comprar diretamente como item final; usar como peça de receita."
  },
  {
    id: "i046_magic_cloak",
    archetype: "componente de resistência mágica",
    category: "component",
    aiClassification: "flex_component",
    recommendedOwners: ["all_positions"],
    avoidOwners: [],
    timing: "component",
    aiNotes: "Não comprar diretamente como item final; usar como peça de receita."
  },
  {
    id: "i047_simple_shawl",
    archetype: "componente barato de resistência mágica",
    category: "component",
    aiClassification: "flex_component",
    recommendedOwners: ["all_positions"],
    avoidOwners: [],
    timing: "component",
    aiNotes: "Não comprar diretamente como item final; usar como peça de receita."
  },
  {
    id: "i048_regen_ring",
    archetype: "componente de regeneração de vida",
    category: "component",
    aiClassification: "flex_component",
    recommendedOwners: ["all_positions"],
    avoidOwners: [],
    timing: "component",
    aiNotes: "Não comprar diretamente como item final; usar como peça de receita."
  },
  {
    id: "i049_mana_mask",
    archetype: "componente de regeneração de mana",
    category: "component",
    aiClassification: "flex_component",
    recommendedOwners: ["all_positions"],
    avoidOwners: [],
    timing: "component",
    aiNotes: "Não comprar diretamente como item final; usar como peça de receita."
  },
  {
    id: "i050_void_stone",
    archetype: "componente avançado de regeneração de mana",
    category: "component",
    aiClassification: "flex_component",
    recommendedOwners: ["all_positions"],
    avoidOwners: [],
    timing: "component",
    aiNotes: "Não comprar diretamente como item final; usar como peça de receita."
  },
  {
    id: "i051_lifesteal_mask",
    archetype: "componente de roubo de vida",
    category: "component",
    aiClassification: "core_or_initiator_component",
    recommendedOwners: ["position_1_carry", "position_2_mid", "position_3_offlane", "position_4_soft_support"],
    avoidOwners: [],
    timing: "component",
    aiNotes: "Não comprar diretamente como item final; usar como peça de receita."
  },
  {
    id: "i052_health_booster",
    archetype: "componente de vida máxima",
    category: "component",
    aiClassification: "flex_component",
    recommendedOwners: ["all_positions"],
    avoidOwners: [],
    timing: "component",
    aiNotes: "Não comprar diretamente como item final; usar como peça de receita."
  },
  {
    id: "i053_mana_booster",
    archetype: "componente de mana máxima",
    category: "component",
    aiClassification: "flex_component",
    recommendedOwners: ["all_positions"],
    avoidOwners: [],
    timing: "component",
    aiNotes: "Não comprar diretamente como item final; usar como peça de receita."
  },
  {
    id: "i054_resource_core",
    archetype: "componente de vida e mana máxima",
    category: "component",
    aiClassification: "flex_component",
    recommendedOwners: ["all_positions"],
    avoidOwners: [],
    timing: "component",
    aiNotes: "Não comprar diretamente como item final; usar como peça de receita."
  },
  {
    id: "i055_blink_core",
    archetype: "componente de mobilidade instantânea",
    category: "component",
    aiClassification: "core_or_initiator_component",
    recommendedOwners: ["position_1_carry", "position_2_mid", "position_3_offlane", "position_4_soft_support"],
    avoidOwners: [],
    timing: "component",
    aiNotes: "Não comprar diretamente como item final; usar como peça de receita."
  },
  {
    id: "i056_evasion_charm",
    archetype: "componente de evasão",
    category: "component",
    aiClassification: "component_only",
    recommendedOwners: ["build_component_only"],
    avoidOwners: [],
    timing: "component",
    aiNotes: "Não comprar diretamente como item final; usar como peça de receita."
  },
  {
    id: "i057_hyperstone_core",
    archetype: "componente supremo de velocidade de ataque",
    category: "component",
    aiClassification: "core_component",
    recommendedOwners: ["position_1_carry", "position_2_mid", "position_3_offlane"],
    avoidOwners: ["low_attack_uptime_supports", "pure_casters_without_attack_scaling"],
    timing: "component",
    aiNotes: "Não comprar diretamente como item final; usar como peça de receita."
  },
  {
    id: "i058_sacred_relic_generic",
    archetype: "componente supremo de dano físico",
    category: "component",
    aiClassification: "core_component",
    recommendedOwners: ["position_1_carry", "position_2_mid", "position_3_offlane"],
    avoidOwners: ["low_attack_uptime_supports", "pure_casters_without_attack_scaling"],
    timing: "component",
    aiNotes: "Não comprar diretamente como item final; usar como peça de receita."
  },
  {
    id: "i059_mystic_staff_generic",
    archetype: "componente supremo de inteligência",
    category: "component",
    aiClassification: "caster_component",
    recommendedOwners: ["position_2_mid", "position_4_soft_support", "position_5_hard_support"],
    avoidOwners: ["low_spell_impact_tanks", "mana_independent_right_clickers"],
    timing: "component",
    aiNotes: "Não comprar diretamente como item final; usar como peça de receita."
  },
  {
    id: "i060_reaver_core",
    archetype: "componente supremo de força",
    category: "component",
    aiClassification: "core_component",
    recommendedOwners: ["position_1_carry", "position_2_mid", "position_3_offlane"],
    avoidOwners: ["low_attack_uptime_supports", "pure_casters_without_attack_scaling"],
    timing: "component",
    aiNotes: "Não comprar diretamente como item final; usar como peça de receita."
  },
  {
    id: "i061_eaglesong_core",
    archetype: "componente supremo de agilidade",
    category: "component",
    aiClassification: "core_component",
    recommendedOwners: ["position_1_carry", "position_2_mid", "position_3_offlane"],
    avoidOwners: ["low_attack_uptime_supports", "pure_casters_without_attack_scaling"],
    timing: "component",
    aiNotes: "Não comprar diretamente como item final; usar como peça de receita."
  },
  {
    id: "i062_ultimate_orb_generic",
    archetype: "componente supremo de todos os atributos",
    category: "component",
    aiClassification: "component_only",
    recommendedOwners: ["build_component_only"],
    avoidOwners: [],
    timing: "component",
    aiNotes: "Não comprar diretamente como item final; usar como peça de receita."
  },
  {
    id: "i063_wizard_hat",
    archetype: "componente barato de mana máxima",
    category: "component",
    aiClassification: "caster_component",
    recommendedOwners: ["position_2_mid", "position_4_soft_support", "position_5_hard_support"],
    avoidOwners: ["low_spell_impact_tanks", "mana_independent_right_clickers"],
    timing: "component",
    aiNotes: "Não comprar diretamente como item final; usar como peça de receita."
  },
  {
    id: "i064_aoe_chasm_stone",
    archetype: "componente de ampliação de área",
    category: "component",
    aiClassification: "flex_component",
    recommendedOwners: ["all_positions"],
    avoidOwners: [],
    timing: "component",
    aiNotes: "Não comprar diretamente como item final; usar como peça de receita."
  },
  {
    id: "i065_strength_bracer",
    archetype: "item inicial de força e sobrevivência",
    category: "early",
    aiClassification: "strength_laning_or_offlane",
    recommendedOwners: ["strength_heroes", "position_3_offlane"],
    avoidOwners: [],
    timing: "laning",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i066_agility_band",
    archetype: "item inicial de agilidade e ataque",
    category: "early",
    aiClassification: "agility_core_laning",
    recommendedOwners: ["agility_cores", "ranged_carries"],
    avoidOwners: ["low_attack_uptime_supports", "pure_casters_without_attack_scaling"],
    timing: "laning",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i067_intelligence_talisman",
    archetype: "item inicial de inteligência e mana",
    category: "early",
    aiClassification: "caster_or_support_laning",
    recommendedOwners: ["intelligence_heroes", "supports"],
    avoidOwners: [],
    timing: "laning",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i068_magic_wand",
    archetype: "item inicial de cargas contra uso de magias",
    category: "early",
    aiClassification: "universal_laning",
    recommendedOwners: ["all_positions"],
    avoidOwners: [],
    timing: "laning",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i069_soul_battery",
    archetype: "item de sacrifício de vida por mana",
    category: "early",
    aiClassification: "mana_hungry_core",
    recommendedOwners: ["mana_hungry_cores", "spell_spam_mids"],
    avoidOwners: [],
    timing: "laning",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i070_corrosion_orb",
    archetype: "item agressivo de lane com veneno e redução de armadura",
    category: "early",
    aiClassification: "aggressive_physical_laning",
    recommendedOwners: ["melee_cores", "lane_bullies"],
    avoidOwners: ["low_attack_uptime_supports", "pure_casters_without_attack_scaling"],
    timing: "laning",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i071_phase_warboots",
    archetype: "bota ofensiva com faseamento e dano",
    category: "boots",
    aiClassification: "core_boots",
    recommendedOwners: ["position_1_carry", "position_2_mid", "position_3_offlane"],
    avoidOwners: [],
    timing: "laning",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i072_attribute_treads",
    archetype: "bota de atributo alternável e velocidade de ataque",
    category: "boots",
    aiClassification: "core_boots",
    recommendedOwners: ["position_1_carry", "position_2_mid", "position_3_offlane"],
    avoidOwners: [],
    timing: "laning",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i073_arcane_boots",
    archetype: "bota de mana para o time",
    category: "boots",
    aiClassification: "support_boots",
    recommendedOwners: ["position_4_soft_support", "position_5_hard_support"],
    avoidOwners: [],
    timing: "laning",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i074_tranquil_boots",
    archetype: "bota de regeneração fora de combate",
    category: "boots",
    aiClassification: "support_boots",
    recommendedOwners: ["position_4_soft_support", "position_5_hard_support"],
    avoidOwners: [],
    timing: "laning",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i075_travel_boots",
    archetype: "bota macro de teleporte avançado",
    category: "boots",
    aiClassification: "macro_core_boots",
    recommendedOwners: ["split_push_cores", "late_game_cores", "map_pressure_mids"],
    avoidOwners: [],
    timing: "laning",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i076_greed_glove",
    archetype: "item econômico de ouro por abate ativo",
    category: "economy",
    aiClassification: "greedy_core_economy",
    recommendedOwners: ["position_1_carry", "greedy_position_2_mid"],
    avoidOwners: ["supports", "tempo_cores_under_pressure"],
    timing: "mid_game",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i077_falcon_blade_generic",
    archetype: "item barato de dano, vida e mana",
    category: "early",
    aiClassification: "hybrid_laning_core",
    recommendedOwners: ["position_1_carry", "position_2_mid"],
    avoidOwners: [],
    timing: "laning",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i078_armlet_relic",
    archetype: "item de força com ativação arriscada",
    category: "mid",
    aiClassification: "offlane_tank_or_defensive_core",
    recommendedOwners: ["position_3_offlane", "durable_position_1_carry", "defensive_position_2_mid"],
    avoidOwners: [],
    timing: "mid_game",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i079_frenzy_mask",
    archetype: "item de roubo de vida com fúria e silêncio próprio",
    category: "mid",
    aiClassification: "right_click_core",
    recommendedOwners: ["position_1_carry", "position_2_mid", "damage_position_3_offlane"],
    avoidOwners: ["heroes_that_must_cast_during_damage_window", "low_attack_uptime_supports", "pure_casters_without_attack_scaling"],
    timing: "mid_game",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i080_echo_blade",
    archetype: "arma de dois ataques e mana para lutadores",
    category: "mid",
    aiClassification: "right_click_core",
    recommendedOwners: ["position_1_carry", "position_2_mid", "damage_position_3_offlane"],
    avoidOwners: ["low_attack_uptime_supports", "pure_casters_without_attack_scaling"],
    timing: "mid_game",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i081_harpoon_chain",
    archetype: "arma de aproximação ativa para corpo a corpo",
    category: "mid",
    aiClassification: "right_click_core",
    recommendedOwners: ["position_1_carry", "position_2_mid", "damage_position_3_offlane"],
    avoidOwners: ["low_attack_uptime_supports", "pure_casters_without_attack_scaling"],
    timing: "mid_game",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i082_mage_hunter_blade",
    archetype: "arma contra magos com redução de dano mágico inimigo",
    category: "mid",
    aiClassification: "flex",
    recommendedOwners: ["all_positions"],
    avoidOwners: [],
    timing: "mid_game",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i083_diffusal_edge",
    archetype: "lâmina de queima de mana e lentidão",
    category: "mid",
    aiClassification: "right_click_core",
    recommendedOwners: ["position_1_carry", "position_2_mid", "damage_position_3_offlane"],
    avoidOwners: ["low_attack_uptime_supports", "pure_casters_without_attack_scaling"],
    timing: "mid_game",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i084_dispersion_edge",
    archetype: "lâmina avançada de dissipação e mobilidade",
    category: "late",
    aiClassification: "right_click_core",
    recommendedOwners: ["position_1_carry", "position_2_mid", "damage_position_3_offlane"],
    avoidOwners: ["low_attack_uptime_supports", "pure_casters_without_attack_scaling"],
    timing: "late_game",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i085_reach_lance",
    archetype: "lança de alcance para heróis à distância",
    category: "mid",
    aiClassification: "right_click_core",
    recommendedOwners: ["position_1_carry", "position_2_mid", "damage_position_3_offlane"],
    avoidOwners: ["low_attack_uptime_supports", "melee_heroes", "pure_casters_without_attack_scaling"],
    timing: "mid_game",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i086_force_pike",
    archetype: "lança de alcance com empurrão defensivo/ofensivo",
    category: "late",
    aiClassification: "right_click_core",
    recommendedOwners: ["position_1_carry", "position_2_mid", "damage_position_3_offlane"],
    avoidOwners: ["low_attack_uptime_supports", "melee_heroes", "pure_casters_without_attack_scaling"],
    timing: "late_game",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i087_shadow_blade_generic",
    archetype: "lâmina de invisibilidade ofensiva",
    category: "mid",
    aiClassification: "right_click_core",
    recommendedOwners: ["position_1_carry", "position_2_mid", "damage_position_3_offlane"],
    avoidOwners: ["games_with_easy_reveal_and_grouped_enemies", "low_attack_uptime_supports", "pure_casters_without_attack_scaling"],
    timing: "mid_game",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i088_execution_edge",
    archetype: "lâmina invisível com crítico e quebra de passiva",
    category: "late",
    aiClassification: "right_click_core",
    recommendedOwners: ["position_1_carry", "position_2_mid", "damage_position_3_offlane"],
    avoidOwners: ["games_with_easy_reveal_and_grouped_enemies", "low_attack_uptime_supports", "pure_casters_without_attack_scaling"],
    timing: "late_game",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i089_overwhelming_blink",
    archetype: "teleporte de força com dano e lentidão em área",
    category: "late",
    aiClassification: "offlane_tank_or_defensive_core",
    recommendedOwners: ["position_3_offlane", "durable_position_1_carry", "defensive_position_2_mid"],
    avoidOwners: [],
    timing: "late_game",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i090_swift_blink",
    archetype: "teleporte de agilidade com velocidade pós-uso",
    category: "late",
    aiClassification: "mobility_or_initiation",
    recommendedOwners: ["position_2_mid", "position_3_offlane", "position_4_soft_support"],
    avoidOwners: [],
    timing: "late_game",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i091_arcane_blink",
    archetype: "teleporte de inteligência com redução de tempo de recarga",
    category: "late",
    aiClassification: "caster_core",
    recommendedOwners: ["position_2_mid", "magic_damage_cores", "rich_position_4_soft_support"],
    avoidOwners: ["low_spell_impact_tanks", "mana_independent_right_clickers"],
    timing: "late_game",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i092_force_staff_generic",
    archetype: "cajado de empurrão direcional",
    category: "mid",
    aiClassification: "offlane_tank_or_defensive_core",
    recommendedOwners: ["position_3_offlane", "durable_position_1_carry", "defensive_position_2_mid"],
    avoidOwners: [],
    timing: "mid_game",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i093_glimmer_cloak_generic",
    archetype: "capa de invisibilidade e barreira mágica para aliados",
    category: "support",
    aiClassification: "support_core",
    recommendedOwners: ["position_4_soft_support", "position_5_hard_support"],
    avoidOwners: ["greedy_position_1_if_delays_damage_timing"],
    timing: "mid_game",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i094_cyclone_scepter",
    archetype: "cajado de ciclone para controle e dissipação",
    category: "support",
    aiClassification: "support_core",
    recommendedOwners: ["position_4_soft_support", "position_5_hard_support"],
    avoidOwners: ["greedy_position_1_if_delays_damage_timing"],
    timing: "mid_game",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i095_wind_ascension",
    archetype: "versão avançada do ciclone com mobilidade livre",
    category: "late",
    aiClassification: "mobility_or_initiation",
    recommendedOwners: ["position_2_mid", "position_3_offlane", "position_4_soft_support"],
    avoidOwners: [],
    timing: "late_game",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i096_cast_range_lens",
    archetype: "lente de alcance de conjuração e mana",
    category: "mid",
    aiClassification: "caster_core",
    recommendedOwners: ["position_2_mid", "magic_damage_cores", "rich_position_4_soft_support"],
    avoidOwners: ["low_spell_impact_tanks", "mana_independent_right_clickers"],
    timing: "mid_game",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i097_ghost_form_scepter",
    archetype: "cetro defensivo contra ataques físicos",
    category: "mid",
    aiClassification: "flex",
    recommendedOwners: ["all_positions"],
    avoidOwners: [],
    timing: "mid_game",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i098_ethereal_focus_blade",
    archetype: "arma mágica que converte alvo em forma etérea",
    category: "late",
    aiClassification: "caster_core",
    recommendedOwners: ["position_2_mid", "magic_damage_cores", "rich_position_4_soft_support"],
    avoidOwners: ["low_spell_impact_tanks", "mana_independent_right_clickers"],
    timing: "late_game",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i099_discord_veil",
    archetype: "véu de amplificação mágica em área",
    category: "support",
    aiClassification: "support_core",
    recommendedOwners: ["position_4_soft_support", "position_5_hard_support"],
    avoidOwners: ["greedy_position_1_if_delays_damage_timing"],
    timing: "mid_game",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i100_frost_armor_plate",
    archetype: "armadura avançada de lentidão e dano mágico em área",
    category: "late",
    aiClassification: "offlane_tank_or_defensive_core",
    recommendedOwners: ["position_3_offlane", "durable_position_1_carry", "defensive_position_2_mid"],
    avoidOwners: [],
    timing: "late_game",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i101_spell_kaya",
    archetype: "núcleo de amplificação mágica",
    category: "mid",
    aiClassification: "caster_core",
    recommendedOwners: ["position_2_mid", "magic_damage_cores", "rich_position_4_soft_support"],
    avoidOwners: ["low_spell_impact_tanks", "mana_independent_right_clickers"],
    timing: "mid_game",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i102_power_sange",
    archetype: "núcleo de força e resistência a controle",
    category: "mid",
    aiClassification: "offlane_tank_or_defensive_core",
    recommendedOwners: ["position_3_offlane", "durable_position_1_carry", "defensive_position_2_mid"],
    avoidOwners: [],
    timing: "mid_game",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i103_speed_yasha",
    archetype: "núcleo de agilidade e velocidade",
    category: "mid",
    aiClassification: "right_click_core",
    recommendedOwners: ["position_1_carry", "position_2_mid", "damage_position_3_offlane"],
    avoidOwners: ["low_attack_uptime_supports", "pure_casters_without_attack_scaling"],
    timing: "mid_game",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i104_spell_power_halberd",
    archetype: "combinação de magia e resistência",
    category: "late",
    aiClassification: "caster_core",
    recommendedOwners: ["position_2_mid", "magic_damage_cores", "rich_position_4_soft_support"],
    avoidOwners: ["low_spell_impact_tanks", "mana_independent_right_clickers"],
    timing: "late_game",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i105_power_speed_dualblade",
    archetype: "combinação de força, agilidade e mobilidade",
    category: "late",
    aiClassification: "right_click_core",
    recommendedOwners: ["position_1_carry", "position_2_mid", "damage_position_3_offlane"],
    avoidOwners: ["low_attack_uptime_supports", "pure_casters_without_attack_scaling"],
    timing: "late_game",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i106_mirror_style",
    archetype: "item de atributos com dissipação e ilusões",
    category: "late",
    aiClassification: "right_click_core",
    recommendedOwners: ["position_1_carry", "position_2_mid", "damage_position_3_offlane"],
    avoidOwners: ["low_attack_uptime_supports", "pure_casters_without_attack_scaling"],
    timing: "late_game",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i107_disarm_halberd",
    archetype: "arma defensiva de evasão, força e desarme",
    category: "late",
    aiClassification: "offlane_tank_or_defensive_core",
    recommendedOwners: ["position_3_offlane", "durable_position_1_carry", "defensive_position_2_mid"],
    avoidOwners: [],
    timing: "late_game",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i108_frost_orb_core",
    archetype: "item supremo de atributos, vida, mana e lentidão por ataque",
    category: "late",
    aiClassification: "right_click_core",
    recommendedOwners: ["position_1_carry", "position_2_mid", "damage_position_3_offlane"],
    avoidOwners: ["low_attack_uptime_supports", "pure_casters_without_attack_scaling"],
    timing: "late_game",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i109_evasion_wingblade",
    archetype: "item supremo de agilidade, dano e evasão",
    category: "late",
    aiClassification: "right_click_core",
    recommendedOwners: ["position_1_carry", "position_2_mid", "damage_position_3_offlane"],
    avoidOwners: ["low_attack_uptime_supports", "pure_casters_without_attack_scaling"],
    timing: "late_game",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i110_spellproof_crown",
    archetype: "imunidade temporária a debuffs e resistência mágica",
    category: "late",
    aiClassification: "offlane_tank_or_defensive_core",
    recommendedOwners: ["position_3_offlane", "durable_position_1_carry", "defensive_position_2_mid"],
    avoidOwners: [],
    timing: "late_game",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i111_link_barrier_sphere",
    archetype: "bloqueio periódico de magia direcionada",
    category: "late",
    aiClassification: "offlane_tank_or_defensive_core",
    recommendedOwners: ["position_3_offlane", "durable_position_1_carry", "defensive_position_2_mid"],
    avoidOwners: [],
    timing: "late_game",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i112_emergency_disk",
    archetype: "disco defensivo automático contra burst",
    category: "late",
    aiClassification: "offlane_tank_or_defensive_core",
    recommendedOwners: ["position_3_offlane", "durable_position_1_carry", "defensive_position_2_mid"],
    avoidOwners: [],
    timing: "late_game",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i113_lotus_shell",
    archetype: "armadura de dissipação e reflexo de feitiços",
    category: "late",
    aiClassification: "offlane_tank_or_defensive_core",
    recommendedOwners: ["position_3_offlane", "durable_position_1_carry", "defensive_position_2_mid"],
    avoidOwners: [],
    timing: "late_game",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i114_blade_return_mail",
    archetype: "armadura que devolve dano recebido",
    category: "mid",
    aiClassification: "offlane_tank_or_defensive_core",
    recommendedOwners: ["position_3_offlane", "durable_position_1_carry", "defensive_position_2_mid"],
    avoidOwners: [],
    timing: "mid_game",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i115_damage_block_shield",
    archetype: "escudo de bloqueio de dano físico",
    category: "mid",
    aiClassification: "offlane_tank_or_defensive_core",
    recommendedOwners: ["position_3_offlane", "durable_position_1_carry", "defensive_position_2_mid"],
    avoidOwners: [],
    timing: "mid_game",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i116_team_crimson_barrier",
    archetype: "barreira física ativa para o time",
    category: "support",
    aiClassification: "support_core",
    recommendedOwners: ["position_4_soft_support", "position_5_hard_support"],
    avoidOwners: ["greedy_position_1_if_delays_damage_timing"],
    timing: "mid_game",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i117_magic_shroud",
    archetype: "manto de resistência e conversão de dano mágico em mana",
    category: "late",
    aiClassification: "offlane_tank_or_defensive_core",
    recommendedOwners: ["position_3_offlane", "durable_position_1_carry", "defensive_position_2_mid"],
    avoidOwners: [],
    timing: "late_game",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i118_team_pipe_barrier",
    archetype: "barreira mágica ativa para o time",
    category: "support",
    aiClassification: "support_core",
    recommendedOwners: ["position_4_soft_support", "position_5_hard_support"],
    avoidOwners: ["greedy_position_1_if_delays_damage_timing"],
    timing: "mid_game",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i119_assault_aura_plate",
    archetype: "armadura de aura ofensiva e defensiva",
    category: "late",
    aiClassification: "offlane_tank_or_defensive_core",
    recommendedOwners: ["position_3_offlane", "durable_position_1_carry", "defensive_position_2_mid"],
    avoidOwners: [],
    timing: "late_game",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i120_giant_heart",
    archetype: "item supremo de vida e regeneração fora de combate",
    category: "late",
    aiClassification: "offlane_tank_or_defensive_core",
    recommendedOwners: ["position_3_offlane", "durable_position_1_carry", "defensive_position_2_mid"],
    avoidOwners: [],
    timing: "late_game",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i121_satanic_bloodstone",
    archetype: "roubo de vida supremo com dissipação e sustain",
    category: "late",
    aiClassification: "right_click_core",
    recommendedOwners: ["position_1_carry", "position_2_mid", "damage_position_3_offlane"],
    avoidOwners: ["low_attack_uptime_supports", "pure_casters_without_attack_scaling"],
    timing: "late_game",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i122_armor_corruptor",
    archetype: "arma de redução intensa de armadura",
    category: "late",
    aiClassification: "right_click_core",
    recommendedOwners: ["position_1_carry", "position_2_mid", "damage_position_3_offlane"],
    avoidOwners: ["low_attack_uptime_supports", "pure_casters_without_attack_scaling"],
    timing: "late_game",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i123_cleave_battle_axe",
    archetype: "arma de farm com clivagem e regeneração",
    category: "late",
    aiClassification: "right_click_core",
    recommendedOwners: ["position_1_carry", "position_2_mid", "damage_position_3_offlane"],
    avoidOwners: ["illusion_heroes_if_cleave_not_copied", "low_attack_uptime_supports", "pure_casters_without_attack_scaling", "ranged_heroes"],
    timing: "late_game",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i124_chain_lightning_hammer",
    archetype: "arma de relâmpagos para farm e luta",
    category: "mid",
    aiClassification: "right_click_core",
    recommendedOwners: ["position_1_carry", "position_2_mid", "damage_position_3_offlane"],
    avoidOwners: ["low_attack_uptime_supports", "pure_casters_without_attack_scaling"],
    timing: "mid_game",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i125_static_storm_hammer",
    archetype: "martelo de relâmpagos com escudo ofensivo",
    category: "late",
    aiClassification: "right_click_core",
    recommendedOwners: ["position_1_carry", "position_2_mid", "damage_position_3_offlane"],
    avoidOwners: ["low_attack_uptime_supports", "pure_casters_without_attack_scaling"],
    timing: "late_game",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i126_rooting_storm_rod",
    archetype: "arma de relâmpago com enraizamento em área",
    category: "late",
    aiClassification: "right_click_core",
    recommendedOwners: ["position_1_carry", "position_2_mid", "damage_position_3_offlane"],
    avoidOwners: ["low_attack_uptime_supports", "pure_casters_without_attack_scaling"],
    timing: "late_game",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i127_bash_club",
    archetype: "arma de chance de atordoar em ataques",
    category: "mid",
    aiClassification: "right_click_core",
    recommendedOwners: ["position_1_carry", "position_2_mid", "damage_position_3_offlane"],
    avoidOwners: ["low_attack_uptime_supports", "pure_casters_without_attack_scaling"],
    timing: "mid_game",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i128_abyssal_lockblade",
    archetype: "arma suprema de bash e atordoamento ativo",
    category: "late",
    aiClassification: "right_click_core",
    recommendedOwners: ["position_1_carry", "position_2_mid", "damage_position_3_offlane"],
    avoidOwners: ["low_attack_uptime_supports", "pure_casters_without_attack_scaling"],
    timing: "late_game",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i129_crystal_edge",
    archetype: "arma de crítico médio",
    category: "mid",
    aiClassification: "right_click_core",
    recommendedOwners: ["position_1_carry", "position_2_mid", "damage_position_3_offlane"],
    avoidOwners: ["low_attack_uptime_supports", "pure_casters_without_attack_scaling"],
    timing: "mid_game",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i130_great_crit_blade",
    archetype: "arma suprema de crítico",
    category: "late",
    aiClassification: "right_click_core",
    recommendedOwners: ["position_1_carry", "position_2_mid", "damage_position_3_offlane"],
    avoidOwners: ["low_attack_uptime_supports", "pure_casters_without_attack_scaling"],
    timing: "late_game",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i131_true_strike_staff",
    archetype: "arma contra evasão com proc mágico",
    category: "late",
    aiClassification: "right_click_core",
    recommendedOwners: ["position_1_carry", "position_2_mid", "damage_position_3_offlane"],
    avoidOwners: ["low_attack_uptime_supports", "pure_casters_without_attack_scaling"],
    timing: "late_game",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i132_radiant_burn_relic",
    archetype: "reliquia de dano em aura e cegueira",
    category: "late",
    aiClassification: "right_click_core",
    recommendedOwners: ["position_1_carry", "position_2_mid", "damage_position_3_offlane"],
    avoidOwners: ["low_attack_uptime_supports", "pure_casters_without_attack_scaling"],
    timing: "late_game",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i133_divine_relic",
    archetype: "arma extrema de alto risco e dano máximo",
    category: "late",
    aiClassification: "right_click_core",
    recommendedOwners: ["position_1_carry", "position_2_mid", "damage_position_3_offlane"],
    avoidOwners: ["low_attack_uptime_supports", "pure_casters_without_attack_scaling"],
    timing: "late_game",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i134_moon_shard_generic",
    archetype: "cristal de velocidade de ataque consumível",
    category: "late",
    aiClassification: "right_click_core",
    recommendedOwners: ["position_1_carry", "position_2_mid", "damage_position_3_offlane"],
    avoidOwners: ["low_attack_uptime_supports", "pure_casters_without_attack_scaling"],
    timing: "late_game",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i135_grand_spell_scepter",
    archetype: "cetro de upgrade de habilidade principal",
    category: "late",
    aiClassification: "caster_core",
    recommendedOwners: ["position_2_mid", "magic_damage_cores", "rich_position_4_soft_support"],
    avoidOwners: ["low_spell_impact_tanks", "mana_independent_right_clickers"],
    timing: "late_game",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i136_spell_shard",
    archetype: "fragmento de upgrade secundário de habilidade",
    category: "mid",
    aiClassification: "flex",
    recommendedOwners: ["all_positions"],
    avoidOwners: [],
    timing: "mid_game",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i137_octarine_core_generic",
    archetype: "núcleo de redução de recarga e roubo de vida mágico",
    category: "late",
    aiClassification: "caster_core",
    recommendedOwners: ["position_2_mid", "magic_damage_cores", "rich_position_4_soft_support"],
    avoidOwners: ["low_spell_impact_tanks", "mana_independent_right_clickers"],
    timing: "late_game",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i138_refresh_orb_generic",
    archetype: "orbe de reinício de recargas",
    category: "late",
    aiClassification: "caster_core",
    recommendedOwners: ["position_2_mid", "magic_damage_cores", "rich_position_4_soft_support"],
    avoidOwners: ["low_spell_impact_tanks", "mana_independent_right_clickers"],
    timing: "late_game",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i139_hex_scythe_generic",
    archetype: "item supremo de controle unitário",
    category: "late",
    aiClassification: "caster_core",
    recommendedOwners: ["position_2_mid", "magic_damage_cores", "rich_position_4_soft_support"],
    avoidOwners: ["low_spell_impact_tanks", "mana_independent_right_clickers"],
    timing: "late_game",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i140_silence_orchid",
    archetype: "arma mágica de silêncio e amplificação de dano",
    category: "mid",
    aiClassification: "caster_core",
    recommendedOwners: ["position_2_mid", "magic_damage_cores", "rich_position_4_soft_support"],
    avoidOwners: ["low_spell_impact_tanks", "mana_independent_right_clickers"],
    timing: "mid_game",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i141_bloodthorn_generic",
    archetype: "arma suprema de silêncio, crítico mágico e acerto garantido",
    category: "late",
    aiClassification: "right_click_core",
    recommendedOwners: ["position_1_carry", "position_2_mid", "damage_position_3_offlane"],
    avoidOwners: ["low_attack_uptime_supports", "pure_casters_without_attack_scaling"],
    timing: "late_game",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i142_burst_wand",
    archetype: "cajado escalável de dano mágico unitário",
    category: "mid",
    aiClassification: "caster_core",
    recommendedOwners: ["position_2_mid", "magic_damage_cores", "rich_position_4_soft_support"],
    avoidOwners: ["low_spell_impact_tanks", "mana_independent_right_clickers"],
    timing: "mid_game",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i143_spirit_urn",
    archetype: "urna de cargas para cura ou dano gradual",
    category: "support",
    aiClassification: "support_core",
    recommendedOwners: ["position_4_soft_support", "position_5_hard_support"],
    avoidOwners: ["greedy_position_1_if_delays_damage_timing"],
    timing: "mid_game",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i144_spirit_vessel_generic",
    archetype: "vaso de anti-cura e dano percentual",
    category: "support",
    aiClassification: "support_core",
    recommendedOwners: ["position_4_soft_support", "position_5_hard_support"],
    avoidOwners: ["greedy_position_1_if_delays_damage_timing"],
    timing: "mid_game",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i145_healing_mechanism",
    archetype: "mecanismo de cura em área",
    category: "support",
    aiClassification: "support_core",
    recommendedOwners: ["position_4_soft_support", "position_5_hard_support"],
    avoidOwners: ["greedy_position_1_if_delays_damage_timing"],
    timing: "mid_game",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i146_guardian_boots_generic",
    archetype: "bota suprema de cura, mana e dissipação em área",
    category: "support",
    aiClassification: "support_core",
    recommendedOwners: ["position_4_soft_support", "position_5_hard_support"],
    avoidOwners: ["greedy_position_1_if_delays_damage_timing"],
    timing: "mid_game",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i147_holy_locket_generic",
    archetype: "amplificador de cura e cargas defensivas",
    category: "support",
    aiClassification: "support_core",
    recommendedOwners: ["position_4_soft_support", "position_5_hard_support"],
    avoidOwners: ["greedy_position_1_if_delays_damage_timing"],
    timing: "mid_game",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i148_pavise_barrier",
    archetype: "barreira física barata para aliados",
    category: "support",
    aiClassification: "support_core",
    recommendedOwners: ["position_4_soft_support", "position_5_hard_support"],
    avoidOwners: ["greedy_position_1_if_delays_damage_timing"],
    timing: "mid_game",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i149_solar_crest_generic",
    archetype: "crest de armadura, velocidade e barreira para aliado ou inimigo",
    category: "support",
    aiClassification: "support_or_aura_core",
    recommendedOwners: ["position_3_offlane", "position_4_soft_support", "position_5_hard_support"],
    avoidOwners: [],
    timing: "mid_game",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i150_war_drums_generic",
    archetype: "tambor de velocidade para rotações e luta",
    category: "support",
    aiClassification: "support_core",
    recommendedOwners: ["position_4_soft_support", "position_5_hard_support"],
    avoidOwners: ["greedy_position_1_if_delays_damage_timing"],
    timing: "mid_game",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i151_bearing_boots_generic",
    archetype: "bota de aura e explosão de velocidade para o time",
    category: "support",
    aiClassification: "support_core",
    recommendedOwners: ["position_4_soft_support", "position_5_hard_support"],
    avoidOwners: ["greedy_position_1_if_delays_damage_timing"],
    timing: "mid_game",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i152_vampire_aura_mask",
    archetype: "aura de dano e roubo de vida para o time",
    category: "support",
    aiClassification: "support_or_aura_core",
    recommendedOwners: ["position_3_offlane", "position_4_soft_support", "position_5_hard_support"],
    avoidOwners: [],
    timing: "mid_game",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i153_dominator_helm",
    archetype: "dominação de creep neutro",
    category: "mid",
    aiClassification: "flex",
    recommendedOwners: ["all_positions"],
    avoidOwners: [],
    timing: "mid_game",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i154_overlord_helm",
    archetype: "dominação avançada de creep poderoso",
    category: "late",
    aiClassification: "flex",
    recommendedOwners: ["all_positions"],
    avoidOwners: [],
    timing: "late_game",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i155_spell_lifeblood_core",
    archetype: "núcleo de roubo de vida mágico e amplificação de área",
    category: "late",
    aiClassification: "caster_core",
    recommendedOwners: ["position_2_mid", "magic_damage_cores", "rich_position_4_soft_support"],
    avoidOwners: ["low_spell_impact_tanks", "mana_independent_right_clickers"],
    timing: "late_game",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i156_phylactery_focus",
    archetype: "foco de dano extra em magia unitária",
    category: "mid",
    aiClassification: "caster_core",
    recommendedOwners: ["position_2_mid", "magic_damage_cores", "rich_position_4_soft_support"],
    avoidOwners: ["low_spell_impact_tanks", "mana_independent_right_clickers"],
    timing: "mid_game",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i157_khanda_focus",
    archetype: "foco avançado de magia unitária com crítico físico",
    category: "late",
    aiClassification: "right_click_core",
    recommendedOwners: ["position_1_carry", "position_2_mid", "damage_position_3_offlane"],
    avoidOwners: ["low_attack_uptime_supports", "pure_casters_without_attack_scaling"],
    timing: "late_game",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i158_witch_blade_generic",
    archetype: "lâmina mágica com projétil venenoso escalado por inteligência",
    category: "mid",
    aiClassification: "caster_core",
    recommendedOwners: ["position_2_mid", "magic_damage_cores", "rich_position_4_soft_support"],
    avoidOwners: ["low_spell_impact_tanks", "mana_independent_right_clickers"],
    timing: "mid_game",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i159_parasma_generic",
    archetype: "lâmina mágica avançada com redução de resistência mágica",
    category: "late",
    aiClassification: "caster_core",
    recommendedOwners: ["position_2_mid", "magic_damage_cores", "rich_position_4_soft_support"],
    avoidOwners: ["low_spell_impact_tanks", "mana_independent_right_clickers"],
    timing: "late_game",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i160_revenant_brooch_generic",
    archetype: "broche que transforma ataques em dano mágico",
    category: "late",
    aiClassification: "caster_core",
    recommendedOwners: ["position_2_mid", "magic_damage_cores", "rich_position_4_soft_support"],
    avoidOwners: ["low_spell_impact_tanks", "mana_independent_right_clickers"],
    timing: "late_game",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i161_consecrated_wraps_generic",
    archetype: "faixas defensivas de barreira, atributos e resistência mágica",
    category: "late",
    aiClassification: "offlane_tank_or_defensive_core",
    recommendedOwners: ["position_3_offlane", "durable_position_1_carry", "defensive_position_2_mid"],
    avoidOwners: [],
    timing: "late_game",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i162_crozier_ghost_relic",
    archetype: "cajado de forma fantasma com roubo de cura e velocidade",
    category: "late",
    aiClassification: "offlane_tank_or_defensive_core",
    recommendedOwners: ["position_3_offlane", "durable_position_1_carry", "defensive_position_2_mid"],
    avoidOwners: [],
    timing: "late_game",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i163_hydra_range_toxin",
    archetype: "arma de alcance com veneno percentual e ataques adicionais",
    category: "late",
    aiClassification: "right_click_core",
    recommendedOwners: ["position_1_carry", "position_2_mid", "damage_position_3_offlane"],
    avoidOwners: ["low_attack_uptime_supports", "melee_heroes", "pure_casters_without_attack_scaling"],
    timing: "late_game",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i164_essence_distiller_generic",
    archetype: "item híbrido de cura, dano e armadilhas utilitárias",
    category: "support",
    aiClassification: "support_core",
    recommendedOwners: ["position_4_soft_support", "position_5_hard_support"],
    avoidOwners: ["greedy_position_1_if_delays_damage_timing"],
    timing: "mid_game",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i165_specialist_array_generic",
    archetype: "array de dano e agilidade com disparos extras condicionais",
    category: "mid",
    aiClassification: "right_click_core",
    recommendedOwners: ["position_1_carry", "position_2_mid", "damage_position_3_offlane"],
    avoidOwners: ["low_attack_uptime_supports", "pure_casters_without_attack_scaling"],
    timing: "mid_game",
    aiNotes: "Pode ser tratado como item completo."
  },
  {
    id: "i166_t1_duelist_gloves",
    archetype: "luvas neutras de duelo e ataque rápido",
    category: "neutral_tier_1",
    aiClassification: "neutral_core_item",
    recommendedOwners: ["position_1_carry", "position_2_mid", "damage_position_3_offlane"],
    avoidOwners: [],
    timing: "neutral_drop",
    aiNotes: "Item neutro: escolher por sinergia e tier, não comprar."
  },
  {
    id: "i167_t1_arcane_bracelet",
    archetype: "bracelete neutro de mana e atributos",
    category: "neutral_tier_1",
    aiClassification: "neutral_caster_or_support_item",
    recommendedOwners: ["position_2_mid", "position_4_soft_support", "position_5_hard_support"],
    avoidOwners: [],
    timing: "neutral_drop",
    aiNotes: "Item neutro: escolher por sinergia e tier, não comprar."
  },
  {
    id: "i168_t1_faded_amulet",
    archetype: "amuleto neutro de movimento e dano",
    category: "neutral_tier_1",
    aiClassification: "neutral_core_item",
    recommendedOwners: ["position_1_carry", "position_2_mid", "damage_position_3_offlane"],
    avoidOwners: [],
    timing: "neutral_drop",
    aiNotes: "Item neutro: escolher por sinergia e tier, não comprar."
  },
  {
    id: "i169_t1_lance_token",
    archetype: "lança neutra de alcance curto",
    category: "neutral_tier_1",
    aiClassification: "neutral_caster_or_support_item",
    recommendedOwners: ["position_2_mid", "position_4_soft_support", "position_5_hard_support"],
    avoidOwners: [],
    timing: "neutral_drop",
    aiNotes: "Item neutro: escolher por sinergia e tier, não comprar."
  },
  {
    id: "i170_t1_broom_charm",
    archetype: "talismã neutro de armadura, dano e visão noturna",
    category: "neutral_tier_1",
    aiClassification: "neutral_core_item",
    recommendedOwners: ["position_1_carry", "position_2_mid", "damage_position_3_offlane"],
    avoidOwners: [],
    timing: "neutral_drop",
    aiNotes: "Item neutro: escolher por sinergia e tier, não comprar."
  },
  {
    id: "i171_t1_survival_pouch",
    archetype: "bolsa neutra de vida e regeneração",
    category: "neutral_tier_1",
    aiClassification: "neutral_tank_or_support_item",
    recommendedOwners: ["position_3_offlane", "position_4_soft_support", "position_5_hard_support"],
    avoidOwners: [],
    timing: "neutral_drop",
    aiNotes: "Item neutro: escolher por sinergia e tier, não comprar."
  },
  {
    id: "i172_t2_vambrace_generic",
    archetype: "bracelete neutro que alterna atributo dominante",
    category: "neutral_tier_2",
    aiClassification: "neutral_flex_item",
    recommendedOwners: ["all_positions"],
    avoidOwners: [],
    timing: "neutral_drop",
    aiNotes: "Item neutro: escolher por sinergia e tier, não comprar."
  },
  {
    id: "i173_t2_dragon_scale",
    archetype: "escama neutra de armadura e dano por ataque",
    category: "neutral_tier_2",
    aiClassification: "neutral_core_item",
    recommendedOwners: ["position_1_carry", "position_2_mid", "damage_position_3_offlane"],
    avoidOwners: [],
    timing: "neutral_drop",
    aiNotes: "Item neutro: escolher por sinergia e tier, não comprar."
  },
  {
    id: "i174_t2_pupil_gift",
    archetype: "presente neutro para atributos secundários",
    category: "neutral_tier_2",
    aiClassification: "neutral_flex_item",
    recommendedOwners: ["all_positions"],
    avoidOwners: [],
    timing: "neutral_drop",
    aiNotes: "Item neutro: escolher por sinergia e tier, não comprar."
  },
  {
    id: "i175_t2_specialist_quiver",
    archetype: "aljava neutra de alcance e dano mágico periódico",
    category: "neutral_tier_2",
    aiClassification: "neutral_core_item",
    recommendedOwners: ["position_1_carry", "position_2_mid", "damage_position_3_offlane"],
    avoidOwners: [],
    timing: "neutral_drop",
    aiNotes: "Item neutro: escolher por sinergia e tier, não comprar."
  },
  {
    id: "i176_t2_bullwhip_generic",
    archetype: "chicote neutro de velocidade em alvo",
    category: "neutral_tier_2",
    aiClassification: "neutral_flex_item",
    recommendedOwners: ["all_positions"],
    avoidOwners: [],
    timing: "neutral_drop",
    aiNotes: "Item neutro: escolher por sinergia e tier, não comprar."
  },
  {
    id: "i177_t2_orb_destruction",
    archetype: "orbe neutro de redução de armadura e slow",
    category: "neutral_tier_2",
    aiClassification: "neutral_tank_or_support_item",
    recommendedOwners: ["position_3_offlane", "position_4_soft_support", "position_5_hard_support"],
    avoidOwners: [],
    timing: "neutral_drop",
    aiNotes: "Item neutro: escolher por sinergia e tier, não comprar."
  },
  {
    id: "i178_t3_titan_sliver",
    archetype: "fragmento neutro de dano, resistência e status",
    category: "neutral_tier_3",
    aiClassification: "neutral_core_item",
    recommendedOwners: ["position_1_carry", "position_2_mid", "damage_position_3_offlane"],
    avoidOwners: [],
    timing: "neutral_drop",
    aiNotes: "Item neutro: escolher por sinergia e tier, não comprar."
  },
  {
    id: "i179_t3_elven_tunic",
    archetype: "túnica neutra de evasão, movimento e ataque",
    category: "neutral_tier_3",
    aiClassification: "neutral_core_item",
    recommendedOwners: ["position_1_carry", "position_2_mid", "damage_position_3_offlane"],
    avoidOwners: [],
    timing: "neutral_drop",
    aiNotes: "Item neutro: escolher por sinergia e tier, não comprar."
  },
  {
    id: "i180_t3_ceremonial_robe",
    archetype: "robe neutro de aura contra mana e status inimigo",
    category: "neutral_tier_3",
    aiClassification: "neutral_caster_or_support_item",
    recommendedOwners: ["position_2_mid", "position_4_soft_support", "position_5_hard_support"],
    avoidOwners: [],
    timing: "neutral_drop",
    aiNotes: "Item neutro: escolher por sinergia e tier, não comprar."
  },
  {
    id: "i181_t3_psychic_headband",
    archetype: "tiara neutra de inteligência, alcance e empurrão",
    category: "neutral_tier_3",
    aiClassification: "neutral_caster_or_support_item",
    recommendedOwners: ["position_2_mid", "position_4_soft_support", "position_5_hard_support"],
    avoidOwners: [],
    timing: "neutral_drop",
    aiNotes: "Item neutro: escolher por sinergia e tier, não comprar."
  },
  {
    id: "i182_t3_quickening_charm",
    archetype: "amuleto neutro de redução de recarga",
    category: "neutral_tier_3",
    aiClassification: "neutral_caster_or_support_item",
    recommendedOwners: ["position_2_mid", "position_4_soft_support", "position_5_hard_support"],
    avoidOwners: [],
    timing: "neutral_drop",
    aiNotes: "Item neutro: escolher por sinergia e tier, não comprar."
  },
  {
    id: "i183_t3_paladin_sword",
    archetype: "espada neutra de dano e amplificação de cura",
    category: "neutral_tier_3",
    aiClassification: "neutral_core_item",
    recommendedOwners: ["position_1_carry", "position_2_mid", "damage_position_3_offlane"],
    avoidOwners: [],
    timing: "neutral_drop",
    aiNotes: "Item neutro: escolher por sinergia e tier, não comprar."
  },
  {
    id: "i184_t4_spell_prism",
    archetype: "prisma neutro de recarga e atributos",
    category: "neutral_tier_4",
    aiClassification: "neutral_caster_or_support_item",
    recommendedOwners: ["position_2_mid", "position_4_soft_support", "position_5_hard_support"],
    avoidOwners: [],
    timing: "neutral_drop",
    aiNotes: "Item neutro: escolher por sinergia e tier, não comprar."
  },
  {
    id: "i185_t4_ninja_gear",
    archetype: "equipamento neutro de agilidade e fumaça pessoal",
    category: "neutral_tier_4",
    aiClassification: "neutral_core_item",
    recommendedOwners: ["position_1_carry", "position_2_mid", "damage_position_3_offlane"],
    avoidOwners: [],
    timing: "neutral_drop",
    aiNotes: "Item neutro: escolher por sinergia e tier, não comprar."
  },
  {
    id: "i186_t4_trickster_cloak",
    archetype: "manto neutro de evasão e resistência mágica",
    category: "neutral_tier_4",
    aiClassification: "neutral_tank_or_support_item",
    recommendedOwners: ["position_3_offlane", "position_4_soft_support", "position_5_hard_support"],
    avoidOwners: [],
    timing: "neutral_drop",
    aiNotes: "Item neutro: escolher por sinergia e tier, não comprar."
  },
  {
    id: "i187_t4_stormcrafter",
    archetype: "núcleo neutro de tempestade e dissipação",
    category: "neutral_tier_4",
    aiClassification: "neutral_flex_item",
    recommendedOwners: ["all_positions"],
    avoidOwners: [],
    timing: "neutral_drop",
    aiNotes: "Item neutro: escolher por sinergia e tier, não comprar."
  },
  {
    id: "i188_t4_ancient_guardian",
    archetype: "guardião neutro de defesa perto de estruturas",
    category: "neutral_tier_4",
    aiClassification: "neutral_flex_item",
    recommendedOwners: ["all_positions"],
    avoidOwners: [],
    timing: "neutral_drop",
    aiNotes: "Item neutro: escolher por sinergia e tier, não comprar."
  },
  {
    id: "i189_t4_timeless_relic",
    archetype: "relíquia neutra de amplificação mágica e duração de debuff",
    category: "neutral_tier_4",
    aiClassification: "neutral_flex_item",
    recommendedOwners: ["all_positions"],
    avoidOwners: [],
    timing: "neutral_drop",
    aiNotes: "Item neutro: escolher por sinergia e tier, não comprar."
  },
  {
    id: "i190_t5_apex_shard",
    archetype: "ápice neutro de atributo primário",
    category: "neutral_tier_5",
    aiClassification: "neutral_flex_item",
    recommendedOwners: ["all_positions"],
    avoidOwners: [],
    timing: "neutral_drop",
    aiNotes: "Item neutro: escolher por sinergia e tier, não comprar."
  },
  {
    id: "i191_t5_force_boots",
    archetype: "botas neutras de velocidade extrema e dissipação",
    category: "neutral_tier_5",
    aiClassification: "neutral_flex_item",
    recommendedOwners: ["all_positions"],
    avoidOwners: [],
    timing: "neutral_drop",
    aiNotes: "Item neutro: escolher por sinergia e tier, não comprar."
  },
  {
    id: "i192_t5_mirror_shield",
    archetype: "escudo neutro de bloqueio e reflexo de magia",
    category: "neutral_tier_5",
    aiClassification: "neutral_flex_item",
    recommendedOwners: ["all_positions"],
    avoidOwners: [],
    timing: "neutral_drop",
    aiNotes: "Item neutro: escolher por sinergia e tier, não comprar."
  },
  {
    id: "i193_t5_fallen_sky",
    archetype: "meteorito neutro de teleporte curto e impacto",
    category: "neutral_tier_5",
    aiClassification: "neutral_flex_item",
    recommendedOwners: ["all_positions"],
    avoidOwners: [],
    timing: "neutral_drop",
    aiNotes: "Item neutro: escolher por sinergia e tier, não comprar."
  },
  {
    id: "i194_t5_desolator_core",
    archetype: "núcleo neutro de dano acumulativo por abate",
    category: "neutral_tier_5",
    aiClassification: "neutral_core_item",
    recommendedOwners: ["position_1_carry", "position_2_mid", "damage_position_3_offlane"],
    avoidOwners: [],
    timing: "neutral_drop",
    aiNotes: "Item neutro: escolher por sinergia e tier, não comprar."
  },
  {
    id: "i195_t5_pirate_hat",
    archetype: "chapéu neutro de ataque extremo e ouro",
    category: "neutral_tier_5",
    aiClassification: "neutral_core_item",
    recommendedOwners: ["position_1_carry", "position_2_mid", "damage_position_3_offlane"],
    avoidOwners: [],
    timing: "neutral_drop",
    aiNotes: "Item neutro: escolher por sinergia e tier, não comprar."
  },
  {
    id: "i196_e001_mighty",
    archetype: "encantamento de força",
    category: "neutral_enchantment",
    aiClassification: "neutral_core_enchantment",
    recommendedOwners: ["position_1_carry", "position_2_mid", "damage_position_3_offlane"],
    avoidOwners: [],
    timing: "neutral_drop",
    aiNotes: "Item neutro: escolher por sinergia e tier, não comprar."
  },
  {
    id: "i197_e002_swift",
    archetype: "encantamento de agilidade",
    category: "neutral_enchantment",
    aiClassification: "neutral_core_enchantment",
    recommendedOwners: ["position_1_carry", "position_2_mid", "damage_position_3_offlane"],
    avoidOwners: [],
    timing: "neutral_drop",
    aiNotes: "Item neutro: escolher por sinergia e tier, não comprar."
  },
  {
    id: "i198_e003_sage",
    archetype: "encantamento de inteligência",
    category: "neutral_enchantment",
    aiClassification: "neutral_support_or_caster_enchantment",
    recommendedOwners: ["position_2_mid", "position_4_soft_support", "position_5_hard_support"],
    avoidOwners: [],
    timing: "neutral_drop",
    aiNotes: "Item neutro: escolher por sinergia e tier, não comprar."
  },
  {
    id: "i199_e004_sturdy",
    archetype: "encantamento de vida",
    category: "neutral_enchantment",
    aiClassification: "neutral_flex_enchantment",
    recommendedOwners: ["all_positions"],
    avoidOwners: [],
    timing: "neutral_drop",
    aiNotes: "Item neutro: escolher por sinergia e tier, não comprar."
  },
  {
    id: "i200_e005_fleet",
    archetype: "encantamento de movimento",
    category: "neutral_enchantment",
    aiClassification: "neutral_flex_enchantment",
    recommendedOwners: ["all_positions"],
    avoidOwners: [],
    timing: "neutral_drop",
    aiNotes: "Item neutro: escolher por sinergia e tier, não comprar."
  },
  {
    id: "i201_e006_sharp",
    archetype: "encantamento de dano",
    category: "neutral_enchantment",
    aiClassification: "neutral_core_enchantment",
    recommendedOwners: ["position_1_carry", "position_2_mid", "damage_position_3_offlane"],
    avoidOwners: [],
    timing: "neutral_drop",
    aiNotes: "Item neutro: escolher por sinergia e tier, não comprar."
  },
  {
    id: "i202_e007_hardened",
    archetype: "encantamento de armadura",
    category: "neutral_enchantment",
    aiClassification: "neutral_flex_enchantment",
    recommendedOwners: ["all_positions"],
    avoidOwners: [],
    timing: "neutral_drop",
    aiNotes: "Item neutro: escolher por sinergia e tier, não comprar."
  },
  {
    id: "i203_e008_warded",
    archetype: "encantamento de resistência mágica",
    category: "neutral_enchantment",
    aiClassification: "neutral_flex_enchantment",
    recommendedOwners: ["all_positions"],
    avoidOwners: [],
    timing: "neutral_drop",
    aiNotes: "Item neutro: escolher por sinergia e tier, não comprar."
  },
  {
    id: "i204_e009_focused",
    archetype: "encantamento de alcance de conjuração",
    category: "neutral_enchantment",
    aiClassification: "neutral_support_or_caster_enchantment",
    recommendedOwners: ["position_2_mid", "position_4_soft_support", "position_5_hard_support"],
    avoidOwners: [],
    timing: "neutral_drop",
    aiNotes: "Item neutro: escolher por sinergia e tier, não comprar."
  },
  {
    id: "i205_e010_vampiric",
    archetype: "encantamento de roubo de vida",
    category: "neutral_enchantment",
    aiClassification: "neutral_core_enchantment",
    recommendedOwners: ["position_1_carry", "position_2_mid", "damage_position_3_offlane"],
    avoidOwners: [],
    timing: "neutral_drop",
    aiNotes: "Item neutro: escolher por sinergia e tier, não comprar."
  },
  {
    id: "i206_e011_arcane",
    archetype: "encantamento de mana",
    category: "neutral_enchantment",
    aiClassification: "neutral_support_or_caster_enchantment",
    recommendedOwners: ["position_2_mid", "position_4_soft_support", "position_5_hard_support"],
    avoidOwners: [],
    timing: "neutral_drop",
    aiNotes: "Item neutro: escolher por sinergia e tier, não comprar."
  },
  {
    id: "i207_e012_hasty",
    archetype: "encantamento de velocidade de ataque",
    category: "neutral_enchantment",
    aiClassification: "neutral_core_enchantment",
    recommendedOwners: ["position_1_carry", "position_2_mid", "damage_position_3_offlane"],
    avoidOwners: [],
    timing: "neutral_drop",
    aiNotes: "Item neutro: escolher por sinergia e tier, não comprar."
  },
  {
    id: "i208_e013_resolute",
    archetype: "encantamento de resistência de status",
    category: "neutral_enchantment",
    aiClassification: "neutral_flex_enchantment",
    recommendedOwners: ["all_positions"],
    avoidOwners: [],
    timing: "neutral_drop",
    aiNotes: "Item neutro: escolher por sinergia e tier, não comprar."
  },
  {
    id: "i209_e014_restorative",
    archetype: "encantamento de cura recebida",
    category: "neutral_enchantment",
    aiClassification: "neutral_support_or_caster_enchantment",
    recommendedOwners: ["position_2_mid", "position_4_soft_support", "position_5_hard_support"],
    avoidOwners: [],
    timing: "neutral_drop",
    aiNotes: "Item neutro: escolher por sinergia e tier, não comprar."
  },
  {
    id: "i210_e015_visionary",
    archetype: "encantamento de visão noturna",
    category: "neutral_enchantment",
    aiClassification: "neutral_support_or_caster_enchantment",
    recommendedOwners: ["position_2_mid", "position_4_soft_support", "position_5_hard_support"],
    avoidOwners: [],
    timing: "neutral_drop",
    aiNotes: "Item neutro: escolher por sinergia e tier, não comprar."
  }
];

export const GREAT_ITEM_INTERACTIONS: ItemInteractionGuide[] = [
  {
    id: "gi_attack_speed_plus_crit",
    requires: ["attack_speed", "critical"],
    greatItems: ["i124_chain_lightning_hammer", "i125_static_storm_hammer", "i129_crystal_edge", "i130_great_crit_blade", "i134_moon_shard_generic"],
    greatHeroes: ["critical", "fervor", "double_hit", "ranged_scaling"],
    reason: "mais ataques aumentam a frequência de crítico e procs; ótimo para cores de dano físico."
  },
  {
    id: "gi_armor_reduction_plus_summons",
    requires: ["armor_reduction", "summon_or_illusion_damage"],
    greatItems: ["i031_armor_break_stone", "i122_armor_corruptor", "i119_assault_aura_plate", "i149_solar_crest_generic"],
    greatHeroes: ["summon", "illusion", "pusher", "swarm"],
    reason: "redução de armadura multiplica o dano de várias unidades batendo ao mesmo tempo."
  },
  {
    id: "gi_mana_burn_plus_illusions",
    requires: ["mana_burn", "illusion_or_multi_hit"],
    greatItems: ["i083_diffusal_edge", "i084_dispersion_edge", "i106_mirror_style"],
    greatHeroes: ["illusion", "copy", "swarm", "anti_magic", "mana_burn"],
    reason: "cada instância de ataque aumenta pressão de mana e controle de alvo."
  },
  {
    id: "gi_blink_plus_aoe_initiation",
    requires: ["instant_gap_close", "aoe_control"],
    greatItems: ["i055_blink_core", "i089_overwhelming_blink", "i091_arcane_blink"],
    greatHeroes: ["stun", "aoe_stun", "teamfight", "black_hole", "arena", "reverse_gravity"],
    reason: "iniciação confiável transforma controle em luta vencida."
  },
  {
    id: "gi_spell_amp_plus_magic_burst",
    requires: ["spell_amp", "magic_burst"],
    greatItems: ["i099_discord_veil", "i101_spell_kaya", "i098_ethereal_focus_blade", "i155_spell_lifeblood_core", "i159_parasma_generic"],
    greatHeroes: ["nuker", "burst", "triple_nuke", "global_nuke", "mana_scaling"],
    reason: "amplificação mágica aumenta burst, pickoff e dano por spell."
  },
  {
    id: "gi_cooldown_reduction_plus_high_impact_spells",
    requires: ["cooldown_reduction", "high_impact_ultimate"],
    greatItems: ["i137_octarine_core_generic", "i138_refresh_orb_generic", "i182_t3_quickening_charm", "i184_t4_spell_prism"],
    greatHeroes: ["teamfight", "global", "black_hole", "doom", "winter_curse", "reverse_gravity"],
    reason: "mais frequência de ultimates muda janelas de objetivo."
  },
  {
    id: "gi_save_items_plus_squishy_support",
    requires: ["defensive_save", "low_survivability"],
    greatItems: ["i092_force_staff_generic", "i093_glimmer_cloak_generic", "i097_ghost_form_scepter", "i112_emergency_disk", "i148_pavise_barrier"],
    greatHeroes: ["hard_support", "soft_support", "healer", "save"],
    reason: "suporte vivo coloca visão, usa spells e compra tempo para cores."
  },
  {
    id: "gi_pipe_crimson_vs_aoe_damage",
    requires: ["team_barrier", "enemy_aoe_or_summons"],
    greatItems: ["i116_team_crimson_barrier", "i118_team_pipe_barrier", "i145_healing_mechanism", "i146_guardian_boots_generic"],
    greatHeroes: ["offlane", "durable", "hard_support"],
    reason: "barreiras em área reduzem timing de push e dano de teamfight inimigo."
  },
  {
    id: "gi_lifesteal_plus_high_damage_core",
    requires: ["high_attack_damage", "sustain"],
    greatItems: ["i051_lifesteal_mask", "i079_frenzy_mask", "i121_satanic_bloodstone", "i205_e010_vampiric"],
    greatHeroes: ["carry", "critical", "fury_swipes", "high_damage", "duelist"],
    reason: "dano alto vira sustain e permite virar lutas longas."
  },
  {
    id: "gi_range_plus_ranged_carry",
    requires: ["ranged_attack", "range_scaling"],
    greatItems: ["i085_reach_lance", "i086_force_pike", "i163_hydra_range_toxin", "i169_t1_lance_token"],
    greatHeroes: ["ranged_scaling", "long_range", "frost_marksman", "gunslinger", "artillerist"],
    reason: "alcance melhora DPS real porque reduz tempo andando e risco de posicionamento."
  },
  {
    id: "gi_heal_amp_plus_healer",
    requires: ["healing", "heal_amp"],
    greatItems: ["i147_holy_locket_generic", "i183_t3_paladin_sword", "i209_e014_restorative"],
    greatHeroes: ["healer", "heal", "save_ally", "cold_embrace", "death_pulse"],
    reason: "amplifica curas próprias, saves e sustain de objetivo."
  },
  {
    id: "gi_true_strike_vs_evasion",
    requires: ["enemy_evasion"],
    greatItems: ["i131_true_strike_staff", "i141_bloodthorn_generic"],
    greatHeroes: ["right_click_core"],
    reason: "acerto garantido remove o counter de evasão e estabiliza DPS."
  }
];

export const TERRIBLE_ITEM_INTERACTIONS: ItemInteractionGuide[] = [
  {
    id: "ti_multiple_boots",
    badItemsTogether: ["i071_phase_warboots", "i072_attribute_treads", "i073_arcane_boots", "i074_tranquil_boots", "i075_travel_boots", "i146_guardian_boots_generic", "i151_bearing_boots_generic"],
    reason: "botas competem no mesmo slot/função; IA não deve empilhar botas salvo upgrade/substituição planejada."
  },
  {
    id: "ti_spell_amp_on_no_spell_hero",
    badItems: ["i099_discord_veil", "i101_spell_kaya", "i155_spell_lifeblood_core", "i159_parasma_generic"],
    badHeroes: ["pure_right_click_no_spell_damage"],
    reason: "amplificação mágica tem baixo valor em heróis cujo dano real vem quase todo de ataques físicos."
  },
  {
    id: "ti_lifesteal_on_spell_caster",
    badItems: ["i051_lifesteal_mask", "i079_frenzy_mask", "i121_satanic_bloodstone"],
    badHeroes: ["low_attack_uptime_caster", "hard_support_caster"],
    reason: "lifesteal comum não paga se o herói não bate de forma consistente."
  },
  {
    id: "ti_cleave_on_ranged",
    badItems: ["i123_cleave_battle_axe"],
    badHeroes: ["ranged_heroes"],
    reason: "clivagem é desenhada para melee; em ranged deve ser proibida ou muito penalizada."
  },
  {
    id: "ti_lance_on_melee",
    badItems: ["i085_reach_lance", "i086_force_pike", "i163_hydra_range_toxin"],
    badHeroes: ["melee_heroes"],
    reason: "itens de alcance ranged-only não devem ser escolhidos por melee."
  },
  {
    id: "ti_frenzy_mask_on_caster_window",
    badItems: ["i079_frenzy_mask"],
    badHeroes: ["heroes_that_must_cast_during_fight_window"],
    reason: "silenciar a si mesmo no momento de luta pode impedir stun, save ou ultimate."
  },
  {
    id: "ti_greed_item_under_pressure",
    badItems: ["i076_greed_glove"],
    badHeroes: ["supports", "behind_tempo_cores"],
    reason: "item econômico atrasa sobrevivência/dano; péssimo quando o time precisa lutar cedo."
  },
  {
    id: "ti_invisibility_vs_reveal",
    badItems: ["i087_shadow_blade_generic", "i088_execution_edge", "i185_t4_ninja_gear"],
    badEnemyState: ["many_sentries", "dust_ready", "true_sight_area_control"],
    reason: "invisibilidade perde valor se inimigo já joga agrupado com detecção."
  },
  {
    id: "ti_evasion_vs_true_strike",
    badItems: ["i056_evasion_charm", "i109_evasion_wingblade", "i186_t4_trickster_cloak"],
    badEnemyItems: ["i131_true_strike_staff", "i141_bloodthorn_generic"],
    reason: "true strike reduz muito o valor de evasão."
  },
  {
    id: "ti_no_dispel_vs_silence_root",
    missingItems: ["i094_cyclone_scepter", "i106_mirror_style", "i113_lotus_shell", "i146_guardian_boots_generic", "i110_spellproof_crown"],
    badEnemyHeroes: ["silence", "root", "leash", "hex"],
    reason: "sem dispel ou imunidade, cores podem morrer sem jogar."
  },
  {
    id: "ti_aura_overlap_low_team_value",
    badPattern: ["too_many_same_aura_items"],
    reason: "itens de aura iguais ou redundantes devem ter penalidade por overlap no mesmo time."
  },
  {
    id: "ti_high_cost_late_item_on_position_5",
    badItems: ["i133_divine_relic", "i130_great_crit_blade", "i121_satanic_bloodstone", "i128_abyssal_lockblade"],
    badHeroes: ["position_5_hard_support"],
    reason: "suporte 5 raramente atinge timing; IA deve priorizar utilidade barata."
  }
];

export const HERO_BUILD_EXAMPLES: HeroBuildExample[] = [
  {
    heroId: "h001_anti_magic_mobile_carry",
    archetype: "carry anti-magia de mobilidade",
    preferredPositions: [1],
    buildIdentity: "agility_right_click_core",
    startingItems: ["i001_regen_rations", "i002_healing_salve", "i004_burst_mango", "i029_quelling_hatchet", "i066_agility_band", "i068_magic_wand"],
    earlyItems: ["i072_attribute_treads", "i077_falcon_blade_generic"],
    coreItems: ["i083_diffusal_edge", "i084_dispersion_edge", "i079_frenzy_mask", "i103_speed_yasha", "i129_crystal_edge", "i121_satanic_bloodstone"],
    luxuryItems: ["i130_great_crit_blade", "i131_true_strike_staff", "i134_moon_shard_generic", "i133_divine_relic"],
    situationalItems: ["i110_spellproof_crown", "i111_link_barrier_sphere", "i112_emergency_disk", "i122_armor_corruptor", "i128_abyssal_lockblade"],
    neutralPreferences: ["i166_t1_duelist_gloves", "i173_t2_dragon_scale", "i178_t3_titan_sliver", "i185_t4_ninja_gear", "i190_t5_apex_shard", "i207_e012_hasty"],
    aiWarnings: ["avoid_greed_if_team_is_behind", "do_not_buy_ranged_only_items"]
  },
  {
    heroId: "h002_taunt_berserker_tank",
    archetype: "tanque berserker de provocação e execução",
    preferredPositions: [3],
    buildIdentity: "offlane_initiator_tank",
    startingItems: ["i001_regen_rations", "i002_healing_salve", "i004_burst_mango", "i065_strength_bracer", "i068_magic_wand"],
    earlyItems: ["i071_phase_warboots", "i077_falcon_blade_generic", "i114_blade_return_mail"],
    coreItems: ["i055_blink_core", "i089_overwhelming_blink", "i116_team_crimson_barrier", "i118_team_pipe_barrier"],
    luxuryItems: ["i119_assault_aura_plate", "i120_giant_heart", "i128_abyssal_lockblade", "i135_grand_spell_scepter"],
    situationalItems: ["i107_disarm_halberd", "i110_spellproof_crown", "i111_link_barrier_sphere", "i113_lotus_shell", "i100_frost_armor_plate"],
    neutralPreferences: ["i171_t1_survival_pouch", "i173_t2_dragon_scale", "i178_t3_titan_sliver", "i186_t4_trickster_cloak", "i188_t4_ancient_guardian", "i208_e013_resolute"],
    aiWarnings: ["prioritize_blink_or_reach_before_greedy_auras", "do_not_buy_ranged_only_items"]
  },
  {
    heroId: "h003_nightmare_controller",
    archetype: "controlador de pesadelo, sono e drenagem",
    preferredPositions: [5],
    buildIdentity: "support_utility",
    startingItems: ["i001_regen_rations", "i003_mana_clarity", "i004_burst_mango", "i008_observer_eye", "i009_sentry_eye", "i068_magic_wand"],
    earlyItems: ["i074_tranquil_boots", "i143_spirit_urn", "i148_pavise_barrier"],
    coreItems: ["i092_force_staff_generic", "i093_glimmer_cloak_generic", "i145_healing_mechanism", "i146_guardian_boots_generic"],
    luxuryItems: ["i094_cyclone_scepter", "i147_holy_locket_generic", "i139_hex_scythe_generic", "i164_essence_distiller_generic"],
    situationalItems: ["i144_spirit_vessel_generic", "i118_team_pipe_barrier", "i116_team_crimson_barrier", "i112_emergency_disk", "i113_lotus_shell"],
    neutralPreferences: ["i167_t1_arcane_bracelet", "i181_t3_psychic_headband", "i182_t3_quickening_charm", "i184_t4_spell_prism", "i189_t4_timeless_relic", "i204_e009_focused"],
    aiWarnings: ["do_not_skip_detection_and_save_items", "protect_mana_pool_and_cooldowns"]
  },
  {
    heroId: "h004_blood_duelist",
    archetype: "lutador de caça e execução por vida baixa",
    preferredPositions: [1, 2],
    buildIdentity: "agility_right_click_core",
    startingItems: ["i001_regen_rations", "i002_healing_salve", "i004_burst_mango", "i029_quelling_hatchet", "i066_agility_band", "i068_magic_wand"],
    earlyItems: ["i072_attribute_treads", "i077_falcon_blade_generic"],
    coreItems: ["i079_frenzy_mask", "i103_speed_yasha", "i129_crystal_edge", "i121_satanic_bloodstone", "i140_silence_orchid"],
    luxuryItems: ["i130_great_crit_blade", "i131_true_strike_staff", "i134_moon_shard_generic", "i133_divine_relic"],
    situationalItems: ["i110_spellproof_crown", "i111_link_barrier_sphere", "i112_emergency_disk", "i122_armor_corruptor", "i128_abyssal_lockblade"],
    neutralPreferences: ["i166_t1_duelist_gloves", "i173_t2_dragon_scale", "i178_t3_titan_sliver", "i185_t4_ninja_gear", "i190_t5_apex_shard", "i207_e012_hasty"],
    aiWarnings: ["avoid_greed_if_team_is_behind", "do_not_buy_ranged_only_items"]
  },
  {
    heroId: "h005_frost_marksman",
    archetype: "atirador de lentidão e aura de precisão",
    preferredPositions: [1],
    buildIdentity: "agility_right_click_core",
    startingItems: ["i001_regen_rations", "i002_healing_salve", "i004_burst_mango", "i029_quelling_hatchet", "i066_agility_band", "i068_magic_wand"],
    earlyItems: ["i072_attribute_treads", "i077_falcon_blade_generic"],
    coreItems: ["i153_dominator_helm", "i154_overlord_helm", "i119_assault_aura_plate", "i085_reach_lance", "i086_force_pike", "i124_chain_lightning_hammer"],
    luxuryItems: ["i130_great_crit_blade", "i131_true_strike_staff", "i134_moon_shard_generic", "i133_divine_relic"],
    situationalItems: ["i110_spellproof_crown", "i111_link_barrier_sphere", "i112_emergency_disk", "i122_armor_corruptor", "i128_abyssal_lockblade", "i149_solar_crest_generic", "i152_vampire_aura_mask"],
    neutralPreferences: ["i166_t1_duelist_gloves", "i173_t2_dragon_scale", "i178_t3_titan_sliver", "i185_t4_ninja_gear", "i190_t5_apex_shard", "i207_e012_hasty"],
    aiWarnings: ["avoid_greed_if_team_is_behind"]
  },
  {
    heroId: "h006_quake_initiator",
    archetype: "iniciador sísmico de controle em área",
    preferredPositions: [3, 4],
    buildIdentity: "support_utility",
    startingItems: ["i001_regen_rations", "i003_mana_clarity", "i006_team_smoke", "i008_observer_eye", "i009_sentry_eye", "i068_magic_wand"],
    earlyItems: ["i073_arcane_boots", "i143_spirit_urn", "i150_war_drums_generic"],
    coreItems: ["i092_force_staff_generic", "i094_cyclone_scepter", "i149_solar_crest_generic", "i151_bearing_boots_generic"],
    luxuryItems: ["i139_hex_scythe_generic", "i135_grand_spell_scepter", "i095_wind_ascension", "i164_essence_distiller_generic"],
    situationalItems: ["i093_glimmer_cloak_generic", "i144_spirit_vessel_generic", "i118_team_pipe_barrier", "i116_team_crimson_barrier", "i113_lotus_shell"],
    neutralPreferences: ["i171_t1_survival_pouch", "i173_t2_dragon_scale", "i178_t3_titan_sliver", "i186_t4_trickster_cloak", "i188_t4_ancient_guardian", "i208_e013_resolute"],
    aiWarnings: ["do_not_skip_detection_and_save_items", "prioritize_blink_or_reach_before_greedy_auras", "do_not_buy_ranged_only_items"]
  },
  {
    heroId: "h007_sword_tempest",
    archetype: "carry de giro, cura posicionada e acertos críticos",
    preferredPositions: [1],
    buildIdentity: "agility_right_click_core",
    startingItems: ["i001_regen_rations", "i002_healing_salve", "i004_burst_mango", "i029_quelling_hatchet", "i066_agility_band", "i068_magic_wand"],
    earlyItems: ["i072_attribute_treads", "i077_falcon_blade_generic"],
    coreItems: ["i153_dominator_helm", "i154_overlord_helm", "i119_assault_aura_plate", "i079_frenzy_mask", "i103_speed_yasha", "i129_crystal_edge"],
    luxuryItems: ["i130_great_crit_blade", "i131_true_strike_staff", "i134_moon_shard_generic", "i133_divine_relic"],
    situationalItems: ["i147_holy_locket_generic", "i164_essence_distiller_generic", "i110_spellproof_crown", "i111_link_barrier_sphere", "i112_emergency_disk", "i122_armor_corruptor", "i128_abyssal_lockblade"],
    neutralPreferences: ["i166_t1_duelist_gloves", "i173_t2_dragon_scale", "i178_t3_titan_sliver", "i185_t4_ninja_gear", "i190_t5_apex_shard", "i207_e012_hasty"],
    aiWarnings: ["avoid_greed_if_team_is_behind", "do_not_buy_ranged_only_items"]
  },
  {
    heroId: "h008_moon_huntress",
    archetype: "caçadora lunar de salto, flecha e aura noturna",
    preferredPositions: [1, 4],
    buildIdentity: "hybrid_core_or_utility",
    startingItems: ["i001_regen_rations", "i002_healing_salve", "i004_burst_mango", "i029_quelling_hatchet", "i066_agility_band", "i068_magic_wand"],
    earlyItems: ["i072_attribute_treads", "i077_falcon_blade_generic", "i070_corrosion_orb"],
    coreItems: ["i124_chain_lightning_hammer", "i129_crystal_edge", "i110_spellproof_crown", "i130_great_crit_blade"],
    luxuryItems: ["i121_satanic_bloodstone", "i131_true_strike_staff", "i134_moon_shard_generic", "i133_divine_relic"],
    situationalItems: ["i111_link_barrier_sphere", "i112_emergency_disk", "i122_armor_corruptor", "i128_abyssal_lockblade"],
    neutralPreferences: ["i166_t1_duelist_gloves", "i173_t2_dragon_scale", "i178_t3_titan_sliver", "i185_t4_ninja_gear", "i190_t5_apex_shard", "i207_e012_hasty"],
    aiWarnings: ["avoid_greed_if_team_is_behind", "protect_mana_pool_and_cooldowns"]
  },
  {
    heroId: "h009_fluid_shifter",
    archetype: "carry flexível que converte força e agilidade",
    preferredPositions: [1, 2],
    buildIdentity: "magic_core",
    startingItems: ["i001_regen_rations", "i003_mana_clarity", "i004_burst_mango", "i011_refillable_bottle", "i067_intelligence_talisman", "i068_magic_wand"],
    earlyItems: ["i073_arcane_boots", "i096_cast_range_lens", "i156_phylactery_focus"],
    coreItems: ["i101_spell_kaya", "i142_burst_wand", "i140_silence_orchid", "i135_grand_spell_scepter"],
    luxuryItems: ["i137_octarine_core_generic", "i138_refresh_orb_generic", "i139_hex_scythe_generic", "i159_parasma_generic"],
    situationalItems: ["i110_spellproof_crown", "i111_link_barrier_sphere", "i112_emergency_disk", "i098_ethereal_focus_blade", "i113_lotus_shell"],
    neutralPreferences: ["i166_t1_duelist_gloves", "i173_t2_dragon_scale", "i178_t3_titan_sliver", "i185_t4_ninja_gear", "i190_t5_apex_shard", "i207_e012_hasty"],
    aiWarnings: ["avoid_greed_if_team_is_behind", "protect_mana_pool_and_cooldowns"]
  },
  {
    heroId: "h010_shadow_bomber",
    archetype: "mago de almas, dano crescente e presença de mapa",
    preferredPositions: [2],
    buildIdentity: "magic_core",
    startingItems: ["i001_regen_rations", "i003_mana_clarity", "i004_burst_mango", "i011_refillable_bottle", "i067_intelligence_talisman", "i068_magic_wand"],
    earlyItems: ["i073_arcane_boots", "i096_cast_range_lens", "i156_phylactery_focus"],
    coreItems: ["i101_spell_kaya", "i142_burst_wand", "i140_silence_orchid", "i135_grand_spell_scepter"],
    luxuryItems: ["i137_octarine_core_generic", "i138_refresh_orb_generic", "i139_hex_scythe_generic", "i159_parasma_generic"],
    situationalItems: ["i110_spellproof_crown", "i111_link_barrier_sphere", "i112_emergency_disk", "i098_ethereal_focus_blade", "i113_lotus_shell"],
    neutralPreferences: ["i166_t1_duelist_gloves", "i173_t2_dragon_scale", "i178_t3_titan_sliver", "i185_t4_ninja_gear", "i190_t5_apex_shard", "i207_e012_hasty"],
    aiWarnings: ["avoid_greed_if_team_is_behind", "protect_mana_pool_and_cooldowns"]
  },
  {
    heroId: "h011_illusion_lancer",
    archetype: "carry de ilusões e perseguição prolongada",
    preferredPositions: [1],
    buildIdentity: "agility_right_click_core",
    startingItems: ["i001_regen_rations", "i002_healing_salve", "i004_burst_mango", "i029_quelling_hatchet", "i066_agility_band", "i068_magic_wand"],
    earlyItems: ["i072_attribute_treads", "i077_falcon_blade_generic"],
    coreItems: ["i153_dominator_helm", "i154_overlord_helm", "i119_assault_aura_plate", "i083_diffusal_edge", "i106_mirror_style", "i108_frost_orb_core"],
    luxuryItems: ["i130_great_crit_blade", "i131_true_strike_staff", "i134_moon_shard_generic", "i133_divine_relic"],
    situationalItems: ["i110_spellproof_crown", "i111_link_barrier_sphere", "i112_emergency_disk", "i122_armor_corruptor", "i128_abyssal_lockblade", "i149_solar_crest_generic", "i152_vampire_aura_mask"],
    neutralPreferences: ["i166_t1_duelist_gloves", "i173_t2_dragon_scale", "i178_t3_titan_sliver", "i185_t4_ninja_gear", "i190_t5_apex_shard", "i207_e012_hasty"],
    aiWarnings: ["avoid_greed_if_team_is_behind", "do_not_buy_ranged_only_items"]
  },
  {
    heroId: "h012_fae_trickster",
    archetype: "mago evasivo de silêncio, jaula e controle em área",
    preferredPositions: [2],
    buildIdentity: "magic_core",
    startingItems: ["i001_regen_rations", "i003_mana_clarity", "i004_burst_mango", "i011_refillable_bottle", "i067_intelligence_talisman", "i068_magic_wand"],
    earlyItems: ["i073_arcane_boots", "i096_cast_range_lens", "i156_phylactery_focus"],
    coreItems: ["i101_spell_kaya", "i142_burst_wand", "i140_silence_orchid", "i135_grand_spell_scepter"],
    luxuryItems: ["i137_octarine_core_generic", "i138_refresh_orb_generic", "i139_hex_scythe_generic", "i159_parasma_generic"],
    situationalItems: ["i110_spellproof_crown", "i111_link_barrier_sphere", "i112_emergency_disk", "i098_ethereal_focus_blade", "i113_lotus_shell"],
    neutralPreferences: ["i167_t1_arcane_bracelet", "i181_t3_psychic_headband", "i182_t3_quickening_charm", "i184_t4_spell_prism", "i189_t4_timeless_relic", "i204_e009_focused"],
    aiWarnings: ["protect_mana_pool_and_cooldowns"]
  },
  {
    heroId: "h013_chain_vanguard",
    archetype: "tanque de gancho, podridão e isolamento",
    preferredPositions: [3, 4],
    buildIdentity: "support_utility",
    startingItems: ["i001_regen_rations", "i003_mana_clarity", "i006_team_smoke", "i008_observer_eye", "i009_sentry_eye", "i068_magic_wand"],
    earlyItems: ["i073_arcane_boots", "i143_spirit_urn", "i150_war_drums_generic"],
    coreItems: ["i092_force_staff_generic", "i094_cyclone_scepter", "i149_solar_crest_generic", "i151_bearing_boots_generic"],
    luxuryItems: ["i139_hex_scythe_generic", "i135_grand_spell_scepter", "i095_wind_ascension", "i164_essence_distiller_generic"],
    situationalItems: ["i093_glimmer_cloak_generic", "i144_spirit_vessel_generic", "i118_team_pipe_barrier", "i116_team_crimson_barrier", "i113_lotus_shell"],
    neutralPreferences: ["i171_t1_survival_pouch", "i173_t2_dragon_scale", "i178_t3_titan_sliver", "i186_t4_trickster_cloak", "i188_t4_ancient_guardian", "i208_e013_resolute"],
    aiWarnings: ["do_not_skip_detection_and_save_items", "prioritize_blink_or_reach_before_greedy_auras", "do_not_buy_ranged_only_items"]
  },
  {
    heroId: "h014_storm_channeler",
    archetype: "mago móvel de mana, remanescentes e pickoff",
    preferredPositions: [2],
    buildIdentity: "magic_core",
    startingItems: ["i001_regen_rations", "i003_mana_clarity", "i004_burst_mango", "i011_refillable_bottle", "i067_intelligence_talisman", "i068_magic_wand"],
    earlyItems: ["i073_arcane_boots", "i096_cast_range_lens", "i156_phylactery_focus"],
    coreItems: ["i101_spell_kaya", "i142_burst_wand", "i140_silence_orchid", "i135_grand_spell_scepter"],
    luxuryItems: ["i137_octarine_core_generic", "i138_refresh_orb_generic", "i139_hex_scythe_generic", "i159_parasma_generic"],
    situationalItems: ["i110_spellproof_crown", "i111_link_barrier_sphere", "i112_emergency_disk", "i098_ethereal_focus_blade", "i113_lotus_shell"],
    neutralPreferences: ["i167_t1_arcane_bracelet", "i181_t3_psychic_headband", "i182_t3_quickening_charm", "i184_t4_spell_prism", "i189_t4_timeless_relic", "i204_e009_focused"],
    aiWarnings: ["protect_mana_pool_and_cooldowns"]
  },
  {
    heroId: "h015_burrow_sentinel",
    archetype: "iniciador de areia, stun em linha e dano persistente",
    preferredPositions: [3, 4],
    buildIdentity: "support_utility",
    startingItems: ["i001_regen_rations", "i003_mana_clarity", "i006_team_smoke", "i008_observer_eye", "i009_sentry_eye", "i068_magic_wand"],
    earlyItems: ["i073_arcane_boots", "i143_spirit_urn", "i150_war_drums_generic"],
    coreItems: ["i092_force_staff_generic", "i094_cyclone_scepter", "i149_solar_crest_generic", "i151_bearing_boots_generic"],
    luxuryItems: ["i139_hex_scythe_generic", "i135_grand_spell_scepter", "i095_wind_ascension", "i164_essence_distiller_generic"],
    situationalItems: ["i093_glimmer_cloak_generic", "i144_spirit_vessel_generic", "i118_team_pipe_barrier", "i116_team_crimson_barrier", "i113_lotus_shell"],
    neutralPreferences: ["i170_t1_broom_charm", "i176_t2_bullwhip_generic", "i180_t3_ceremonial_robe", "i184_t4_spell_prism", "i192_t5_mirror_shield", "i210_e015_visionary"],
    aiWarnings: ["do_not_skip_detection_and_save_items", "prioritize_blink_or_reach_before_greedy_auras", "do_not_buy_ranged_only_items"]
  },
  {
    heroId: "h016_lightning_archmage",
    archetype: "mago de raio, dano em cadeia e pressão global",
    preferredPositions: [2, 4],
    buildIdentity: "magic_core",
    startingItems: ["i001_regen_rations", "i003_mana_clarity", "i004_burst_mango", "i011_refillable_bottle", "i067_intelligence_talisman", "i068_magic_wand"],
    earlyItems: ["i073_arcane_boots", "i096_cast_range_lens", "i156_phylactery_focus"],
    coreItems: ["i153_dominator_helm", "i154_overlord_helm", "i119_assault_aura_plate", "i101_spell_kaya", "i142_burst_wand", "i140_silence_orchid"],
    luxuryItems: ["i137_octarine_core_generic", "i138_refresh_orb_generic", "i139_hex_scythe_generic", "i159_parasma_generic"],
    situationalItems: ["i110_spellproof_crown", "i111_link_barrier_sphere", "i112_emergency_disk", "i098_ethereal_focus_blade", "i113_lotus_shell", "i149_solar_crest_generic", "i152_vampire_aura_mask"],
    neutralPreferences: ["i167_t1_arcane_bracelet", "i181_t3_psychic_headband", "i182_t3_quickening_charm", "i184_t4_spell_prism", "i189_t4_timeless_relic", "i204_e009_focused"],
    aiWarnings: ["protect_mana_pool_and_cooldowns"]
  },
  {
    heroId: "h017_sea_captain",
    archetype: "iniciador naval de controle, maré e reposicionamento",
    preferredPositions: [2, 3],
    buildIdentity: "offlane_initiator_tank",
    startingItems: ["i001_regen_rations", "i002_healing_salve", "i004_burst_mango", "i065_strength_bracer", "i068_magic_wand"],
    earlyItems: ["i071_phase_warboots", "i077_falcon_blade_generic", "i114_blade_return_mail"],
    coreItems: ["i055_blink_core", "i089_overwhelming_blink", "i116_team_crimson_barrier", "i118_team_pipe_barrier"],
    luxuryItems: ["i119_assault_aura_plate", "i120_giant_heart", "i128_abyssal_lockblade", "i135_grand_spell_scepter"],
    situationalItems: ["i107_disarm_halberd", "i110_spellproof_crown", "i111_link_barrier_sphere", "i113_lotus_shell", "i100_frost_armor_plate"],
    neutralPreferences: ["i171_t1_survival_pouch", "i173_t2_dragon_scale", "i178_t3_titan_sliver", "i186_t4_trickster_cloak", "i188_t4_ancient_guardian", "i208_e013_resolute"],
    aiWarnings: ["prioritize_blink_or_reach_before_greedy_auras", "do_not_buy_ranged_only_items"]
  },
  {
    heroId: "h018_fire_invoker",
    archetype: "mago explosivo de stun, área e burst direto",
    preferredPositions: [2],
    buildIdentity: "magic_core",
    startingItems: ["i001_regen_rations", "i003_mana_clarity", "i004_burst_mango", "i011_refillable_bottle", "i067_intelligence_talisman", "i068_magic_wand"],
    earlyItems: ["i073_arcane_boots", "i096_cast_range_lens", "i156_phylactery_focus"],
    coreItems: ["i101_spell_kaya", "i142_burst_wand", "i140_silence_orchid", "i135_grand_spell_scepter"],
    luxuryItems: ["i137_octarine_core_generic", "i138_refresh_orb_generic", "i139_hex_scythe_generic", "i159_parasma_generic"],
    situationalItems: ["i110_spellproof_crown", "i111_link_barrier_sphere", "i112_emergency_disk", "i098_ethereal_focus_blade", "i113_lotus_shell"],
    neutralPreferences: ["i167_t1_arcane_bracelet", "i181_t3_psychic_headband", "i182_t3_quickening_charm", "i184_t4_spell_prism", "i189_t4_timeless_relic", "i204_e009_focused"],
    aiWarnings: ["protect_mana_pool_and_cooldowns"]
  },
  {
    heroId: "h019_ice_lich",
    archetype: "suporte de armadura gelada e ultimate ricocheteante",
    preferredPositions: [5],
    buildIdentity: "support_utility",
    startingItems: ["i001_regen_rations", "i003_mana_clarity", "i004_burst_mango", "i008_observer_eye", "i009_sentry_eye", "i068_magic_wand"],
    earlyItems: ["i074_tranquil_boots", "i143_spirit_urn", "i148_pavise_barrier"],
    coreItems: ["i092_force_staff_generic", "i093_glimmer_cloak_generic", "i145_healing_mechanism", "i146_guardian_boots_generic"],
    luxuryItems: ["i094_cyclone_scepter", "i147_holy_locket_generic", "i139_hex_scythe_generic", "i164_essence_distiller_generic"],
    situationalItems: ["i144_spirit_vessel_generic", "i118_team_pipe_barrier", "i116_team_crimson_barrier", "i112_emergency_disk", "i113_lotus_shell"],
    neutralPreferences: ["i167_t1_arcane_bracelet", "i181_t3_psychic_headband", "i182_t3_quickening_charm", "i184_t4_spell_prism", "i189_t4_timeless_relic", "i204_e009_focused"],
    aiWarnings: ["do_not_skip_detection_and_save_items", "protect_mana_pool_and_cooldowns"]
  },
  {
    heroId: "h020_hex_warden",
    archetype: "suporte de hex, raio encadeado e amarras",
    preferredPositions: [4, 5],
    buildIdentity: "support_utility",
    startingItems: ["i001_regen_rations", "i003_mana_clarity", "i004_burst_mango", "i008_observer_eye", "i009_sentry_eye", "i068_magic_wand"],
    earlyItems: ["i074_tranquil_boots", "i143_spirit_urn", "i148_pavise_barrier"],
    coreItems: ["i092_force_staff_generic", "i093_glimmer_cloak_generic", "i145_healing_mechanism", "i146_guardian_boots_generic"],
    luxuryItems: ["i094_cyclone_scepter", "i147_holy_locket_generic", "i139_hex_scythe_generic", "i164_essence_distiller_generic"],
    situationalItems: ["i144_spirit_vessel_generic", "i118_team_pipe_barrier", "i116_team_crimson_barrier", "i112_emergency_disk", "i113_lotus_shell"],
    neutralPreferences: ["i167_t1_arcane_bracelet", "i181_t3_psychic_headband", "i182_t3_quickening_charm", "i184_t4_spell_prism", "i189_t4_timeless_relic", "i204_e009_focused"],
    aiWarnings: ["do_not_skip_detection_and_save_items", "protect_mana_pool_and_cooldowns"]
  },
  {
    heroId: "h021_serpent_crusher",
    archetype: "frontliner anfíbio de sprint, bash e corrosão",
    preferredPositions: [3],
    buildIdentity: "offlane_initiator_tank",
    startingItems: ["i001_regen_rations", "i002_healing_salve", "i004_burst_mango", "i065_strength_bracer", "i068_magic_wand"],
    earlyItems: ["i071_phase_warboots", "i077_falcon_blade_generic", "i114_blade_return_mail"],
    coreItems: ["i055_blink_core", "i089_overwhelming_blink", "i116_team_crimson_barrier", "i118_team_pipe_barrier"],
    luxuryItems: ["i119_assault_aura_plate", "i120_giant_heart", "i128_abyssal_lockblade", "i135_grand_spell_scepter"],
    situationalItems: ["i107_disarm_halberd", "i110_spellproof_crown", "i111_link_barrier_sphere", "i113_lotus_shell", "i100_frost_armor_plate"],
    neutralPreferences: ["i166_t1_duelist_gloves", "i173_t2_dragon_scale", "i178_t3_titan_sliver", "i185_t4_ninja_gear", "i190_t5_apex_shard", "i207_e012_hasty"],
    aiWarnings: ["prioritize_blink_or_reach_before_greedy_auras", "do_not_buy_ranged_only_items"]
  },
  {
    heroId: "h022_tide_colossus",
    archetype: "tanque de maré, redução de dano e stun massivo",
    preferredPositions: [3],
    buildIdentity: "offlane_initiator_tank",
    startingItems: ["i001_regen_rations", "i002_healing_salve", "i004_burst_mango", "i065_strength_bracer", "i068_magic_wand"],
    earlyItems: ["i071_phase_warboots", "i077_falcon_blade_generic", "i114_blade_return_mail"],
    coreItems: ["i055_blink_core", "i089_overwhelming_blink", "i116_team_crimson_barrier", "i118_team_pipe_barrier"],
    luxuryItems: ["i119_assault_aura_plate", "i120_giant_heart", "i128_abyssal_lockblade", "i135_grand_spell_scepter"],
    situationalItems: ["i107_disarm_halberd", "i110_spellproof_crown", "i111_link_barrier_sphere", "i113_lotus_shell", "i100_frost_armor_plate"],
    neutralPreferences: ["i171_t1_survival_pouch", "i173_t2_dragon_scale", "i178_t3_titan_sliver", "i186_t4_trickster_cloak", "i188_t4_ancient_guardian", "i208_e013_resolute"],
    aiWarnings: ["prioritize_blink_or_reach_before_greedy_auras", "do_not_buy_ranged_only_items"]
  },
  {
    heroId: "h023_witch_shaman",
    archetype: "suporte vodu de maldição, cura e dano em cadeia",
    preferredPositions: [5],
    buildIdentity: "support_utility",
    startingItems: ["i001_regen_rations", "i003_mana_clarity", "i004_burst_mango", "i008_observer_eye", "i009_sentry_eye", "i068_magic_wand"],
    earlyItems: ["i074_tranquil_boots", "i143_spirit_urn", "i148_pavise_barrier"],
    coreItems: ["i092_force_staff_generic", "i093_glimmer_cloak_generic", "i145_healing_mechanism", "i146_guardian_boots_generic"],
    luxuryItems: ["i094_cyclone_scepter", "i147_holy_locket_generic", "i139_hex_scythe_generic", "i164_essence_distiller_generic"],
    situationalItems: ["i147_holy_locket_generic", "i164_essence_distiller_generic", "i144_spirit_vessel_generic", "i118_team_pipe_barrier", "i116_team_crimson_barrier", "i112_emergency_disk", "i113_lotus_shell"],
    neutralPreferences: ["i167_t1_arcane_bracelet", "i181_t3_psychic_headband", "i182_t3_quickening_charm", "i184_t4_spell_prism", "i189_t4_timeless_relic", "i204_e009_focused"],
    aiWarnings: ["do_not_skip_detection_and_save_items", "protect_mana_pool_and_cooldowns"]
  },
  {
    heroId: "h024_stealth_assassin",
    archetype: "assassino invisível de fumaça e explosão pelas costas",
    preferredPositions: [1, 2],
    buildIdentity: "agility_right_click_core",
    startingItems: ["i001_regen_rations", "i002_healing_salve", "i004_burst_mango", "i029_quelling_hatchet", "i066_agility_band", "i068_magic_wand"],
    earlyItems: ["i072_attribute_treads", "i077_falcon_blade_generic"],
    coreItems: ["i079_frenzy_mask", "i103_speed_yasha", "i129_crystal_edge", "i121_satanic_bloodstone"],
    luxuryItems: ["i130_great_crit_blade", "i131_true_strike_staff", "i134_moon_shard_generic", "i133_divine_relic"],
    situationalItems: ["i110_spellproof_crown", "i111_link_barrier_sphere", "i112_emergency_disk", "i122_armor_corruptor", "i128_abyssal_lockblade"],
    neutralPreferences: ["i166_t1_duelist_gloves", "i173_t2_dragon_scale", "i178_t3_titan_sliver", "i185_t4_ninja_gear", "i190_t5_apex_shard", "i207_e012_hasty"],
    aiWarnings: ["avoid_greed_if_team_is_behind", "do_not_buy_ranged_only_items"]
  },
  {
    heroId: "h025_gravity_summoner",
    archetype: "mago gravitacional de buraco negro e conversão",
    preferredPositions: [3, 4],
    buildIdentity: "support_utility",
    startingItems: ["i001_regen_rations", "i003_mana_clarity", "i006_team_smoke", "i008_observer_eye", "i009_sentry_eye", "i068_magic_wand"],
    earlyItems: ["i073_arcane_boots", "i143_spirit_urn", "i150_war_drums_generic"],
    coreItems: ["i153_dominator_helm", "i154_overlord_helm", "i119_assault_aura_plate", "i092_force_staff_generic", "i094_cyclone_scepter", "i149_solar_crest_generic"],
    luxuryItems: ["i139_hex_scythe_generic", "i135_grand_spell_scepter", "i095_wind_ascension", "i164_essence_distiller_generic"],
    situationalItems: ["i093_glimmer_cloak_generic", "i144_spirit_vessel_generic", "i118_team_pipe_barrier", "i116_team_crimson_barrier", "i113_lotus_shell", "i149_solar_crest_generic", "i152_vampire_aura_mask"],
    neutralPreferences: ["i170_t1_broom_charm", "i176_t2_bullwhip_generic", "i180_t3_ceremonial_robe", "i184_t4_spell_prism", "i192_t5_mirror_shield", "i210_e015_visionary"],
    aiWarnings: ["do_not_skip_detection_and_save_items", "prioritize_blink_or_reach_before_greedy_auras"]
  },
  {
    heroId: "h026_gadget_mage",
    archetype: "engenheiro arcano de lasers, máquinas e reposicionamento",
    preferredPositions: [2],
    buildIdentity: "magic_core",
    startingItems: ["i001_regen_rations", "i003_mana_clarity", "i004_burst_mango", "i011_refillable_bottle", "i067_intelligence_talisman", "i068_magic_wand"],
    earlyItems: ["i073_arcane_boots", "i096_cast_range_lens", "i156_phylactery_focus"],
    coreItems: ["i153_dominator_helm", "i154_overlord_helm", "i119_assault_aura_plate", "i101_spell_kaya", "i142_burst_wand", "i140_silence_orchid"],
    luxuryItems: ["i137_octarine_core_generic", "i138_refresh_orb_generic", "i139_hex_scythe_generic", "i159_parasma_generic", "i075_travel_boots"],
    situationalItems: ["i110_spellproof_crown", "i111_link_barrier_sphere", "i112_emergency_disk", "i098_ethereal_focus_blade", "i113_lotus_shell", "i149_solar_crest_generic", "i152_vampire_aura_mask"],
    neutralPreferences: ["i167_t1_arcane_bracelet", "i181_t3_psychic_headband", "i182_t3_quickening_charm", "i184_t4_spell_prism", "i189_t4_timeless_relic", "i204_e009_focused"],
    aiWarnings: ["protect_mana_pool_and_cooldowns"]
  },
  {
    heroId: "h027_longshot_artillerist",
    archetype: "atirador de alcance extremo e execução à distância",
    preferredPositions: [1, 2],
    buildIdentity: "agility_right_click_core",
    startingItems: ["i001_regen_rations", "i002_healing_salve", "i004_burst_mango", "i029_quelling_hatchet", "i066_agility_band", "i068_magic_wand"],
    earlyItems: ["i072_attribute_treads", "i077_falcon_blade_generic"],
    coreItems: ["i085_reach_lance", "i086_force_pike", "i124_chain_lightning_hammer", "i130_great_crit_blade"],
    luxuryItems: ["i130_great_crit_blade", "i131_true_strike_staff", "i134_moon_shard_generic", "i133_divine_relic"],
    situationalItems: ["i110_spellproof_crown", "i111_link_barrier_sphere", "i112_emergency_disk", "i122_armor_corruptor", "i128_abyssal_lockblade"],
    neutralPreferences: ["i166_t1_duelist_gloves", "i173_t2_dragon_scale", "i178_t3_titan_sliver", "i185_t4_ninja_gear", "i190_t5_apex_shard", "i207_e012_hasty"],
    aiWarnings: ["avoid_greed_if_team_is_behind"]
  },
  {
    heroId: "h028_plague_saint",
    archetype: "mago resistente de cura, decomposição e sentença",
    preferredPositions: [2, 3],
    buildIdentity: "offlane_initiator_tank",
    startingItems: ["i001_regen_rations", "i002_healing_salve", "i004_burst_mango", "i065_strength_bracer", "i068_magic_wand"],
    earlyItems: ["i071_phase_warboots", "i077_falcon_blade_generic", "i114_blade_return_mail"],
    coreItems: ["i055_blink_core", "i089_overwhelming_blink", "i116_team_crimson_barrier", "i118_team_pipe_barrier"],
    luxuryItems: ["i119_assault_aura_plate", "i120_giant_heart", "i128_abyssal_lockblade", "i135_grand_spell_scepter"],
    situationalItems: ["i147_holy_locket_generic", "i164_essence_distiller_generic", "i107_disarm_halberd", "i110_spellproof_crown", "i111_link_barrier_sphere", "i113_lotus_shell", "i100_frost_armor_plate"],
    neutralPreferences: ["i167_t1_arcane_bracelet", "i181_t3_psychic_headband", "i182_t3_quickening_charm", "i184_t4_spell_prism", "i189_t4_timeless_relic", "i204_e009_focused"],
    aiWarnings: ["protect_mana_pool_and_cooldowns"]
  },
  {
    heroId: "h029_soul_warlock",
    archetype: "suporte de laços, cura em área e invocação infernal",
    preferredPositions: [5],
    buildIdentity: "support_utility",
    startingItems: ["i001_regen_rations", "i003_mana_clarity", "i004_burst_mango", "i008_observer_eye", "i009_sentry_eye", "i068_magic_wand"],
    earlyItems: ["i074_tranquil_boots", "i143_spirit_urn", "i148_pavise_barrier"],
    coreItems: ["i092_force_staff_generic", "i093_glimmer_cloak_generic", "i145_healing_mechanism", "i146_guardian_boots_generic"],
    luxuryItems: ["i094_cyclone_scepter", "i147_holy_locket_generic", "i139_hex_scythe_generic", "i164_essence_distiller_generic"],
    situationalItems: ["i147_holy_locket_generic", "i164_essence_distiller_generic", "i144_spirit_vessel_generic", "i118_team_pipe_barrier", "i116_team_crimson_barrier", "i112_emergency_disk", "i113_lotus_shell"],
    neutralPreferences: ["i167_t1_arcane_bracelet", "i181_t3_psychic_headband", "i182_t3_quickening_charm", "i184_t4_spell_prism", "i189_t4_timeless_relic", "i204_e009_focused"],
    aiWarnings: ["do_not_skip_detection_and_save_items", "protect_mana_pool_and_cooldowns"]
  },
  {
    heroId: "h030_beast_commander",
    archetype: "offlaner de aura, animais e rugido de iniciação",
    preferredPositions: [3],
    buildIdentity: "hybrid_core_or_utility",
    startingItems: ["i001_regen_rations", "i003_mana_clarity", "i004_burst_mango", "i068_magic_wand"],
    earlyItems: ["i073_arcane_boots", "i096_cast_range_lens", "i077_falcon_blade_generic"],
    coreItems: ["i153_dominator_helm", "i154_overlord_helm", "i119_assault_aura_plate", "i101_spell_kaya", "i135_grand_spell_scepter", "i137_octarine_core_generic"],
    luxuryItems: ["i138_refresh_orb_generic", "i159_parasma_generic", "i160_revenant_brooch_generic", "i095_wind_ascension"],
    situationalItems: ["i110_spellproof_crown", "i111_link_barrier_sphere", "i112_emergency_disk", "i113_lotus_shell", "i149_solar_crest_generic", "i152_vampire_aura_mask"],
    neutralPreferences: ["i170_t1_broom_charm", "i176_t2_bullwhip_generic", "i180_t3_ceremonial_robe", "i184_t4_spell_prism", "i192_t5_mirror_shield", "i210_e015_visionary"],
    aiWarnings: ["prioritize_blink_or_reach_before_greedy_auras", "do_not_buy_ranged_only_items"]
  },
  {
    heroId: "h031_blink_assassin",
    archetype: "assassina de salto, grito e burst mágico",
    preferredPositions: [2],
    buildIdentity: "magic_core",
    startingItems: ["i001_regen_rations", "i003_mana_clarity", "i004_burst_mango", "i011_refillable_bottle", "i067_intelligence_talisman", "i068_magic_wand"],
    earlyItems: ["i073_arcane_boots", "i096_cast_range_lens", "i156_phylactery_focus"],
    coreItems: ["i101_spell_kaya", "i142_burst_wand", "i140_silence_orchid", "i135_grand_spell_scepter"],
    luxuryItems: ["i137_octarine_core_generic", "i138_refresh_orb_generic", "i139_hex_scythe_generic", "i159_parasma_generic"],
    situationalItems: ["i110_spellproof_crown", "i111_link_barrier_sphere", "i112_emergency_disk", "i098_ethereal_focus_blade", "i113_lotus_shell"],
    neutralPreferences: ["i167_t1_arcane_bracelet", "i181_t3_psychic_headband", "i182_t3_quickening_charm", "i184_t4_spell_prism", "i189_t4_timeless_relic", "i204_e009_focused"],
    aiWarnings: ["protect_mana_pool_and_cooldowns"]
  },
  {
    heroId: "h032_poison_alchemist",
    archetype: "zoner venenoso de wards, veneno e ultimate infecciosa",
    preferredPositions: [3, 4],
    buildIdentity: "support_utility",
    startingItems: ["i001_regen_rations", "i003_mana_clarity", "i006_team_smoke", "i008_observer_eye", "i009_sentry_eye", "i068_magic_wand"],
    earlyItems: ["i073_arcane_boots", "i143_spirit_urn", "i150_war_drums_generic"],
    coreItems: ["i153_dominator_helm", "i154_overlord_helm", "i119_assault_aura_plate", "i092_force_staff_generic", "i094_cyclone_scepter", "i149_solar_crest_generic"],
    luxuryItems: ["i139_hex_scythe_generic", "i135_grand_spell_scepter", "i095_wind_ascension", "i164_essence_distiller_generic"],
    situationalItems: ["i093_glimmer_cloak_generic", "i144_spirit_vessel_generic", "i118_team_pipe_barrier", "i116_team_crimson_barrier", "i113_lotus_shell", "i149_solar_crest_generic", "i152_vampire_aura_mask"],
    neutralPreferences: ["i167_t1_arcane_bracelet", "i181_t3_psychic_headband", "i182_t3_quickening_charm", "i184_t4_spell_prism", "i189_t4_timeless_relic", "i204_e009_focused"],
    aiWarnings: ["do_not_skip_detection_and_save_items", "protect_mana_pool_and_cooldowns"]
  },
  {
    heroId: "h033_chrono_duelist",
    archetype: "carry temporal de esquiva, salto e prisão em área",
    preferredPositions: [1],
    buildIdentity: "agility_right_click_core",
    startingItems: ["i001_regen_rations", "i002_healing_salve", "i004_burst_mango", "i029_quelling_hatchet", "i066_agility_band", "i068_magic_wand"],
    earlyItems: ["i072_attribute_treads", "i077_falcon_blade_generic"],
    coreItems: ["i079_frenzy_mask", "i103_speed_yasha", "i129_crystal_edge", "i121_satanic_bloodstone"],
    luxuryItems: ["i130_great_crit_blade", "i131_true_strike_staff", "i134_moon_shard_generic", "i133_divine_relic"],
    situationalItems: ["i110_spellproof_crown", "i111_link_barrier_sphere", "i112_emergency_disk", "i122_armor_corruptor", "i128_abyssal_lockblade"],
    neutralPreferences: ["i166_t1_duelist_gloves", "i173_t2_dragon_scale", "i178_t3_titan_sliver", "i185_t4_ninja_gear", "i190_t5_apex_shard", "i207_e012_hasty"],
    aiWarnings: ["avoid_greed_if_team_is_behind", "do_not_buy_ranged_only_items"]
  },
  {
    heroId: "h034_skeleton_monarch",
    archetype: "carry resiliente de crítico, esqueletos e segunda vida",
    preferredPositions: [1],
    buildIdentity: "strength_brawler_core",
    startingItems: ["i001_regen_rations", "i002_healing_salve", "i004_burst_mango", "i029_quelling_hatchet", "i065_strength_bracer", "i068_magic_wand"],
    earlyItems: ["i071_phase_warboots", "i078_armlet_relic", "i080_echo_blade"],
    coreItems: ["i153_dominator_helm", "i154_overlord_helm", "i119_assault_aura_plate", "i102_power_sange", "i105_power_speed_dualblade", "i110_spellproof_crown"],
    luxuryItems: ["i128_abyssal_lockblade", "i120_giant_heart", "i119_assault_aura_plate", "i130_great_crit_blade"],
    situationalItems: ["i107_disarm_halberd", "i111_link_barrier_sphere", "i112_emergency_disk", "i131_true_strike_staff", "i122_armor_corruptor", "i149_solar_crest_generic", "i152_vampire_aura_mask"],
    neutralPreferences: ["i166_t1_duelist_gloves", "i173_t2_dragon_scale", "i178_t3_titan_sliver", "i185_t4_ninja_gear", "i190_t5_apex_shard", "i207_e012_hasty"],
    aiWarnings: ["avoid_greed_if_team_is_behind", "do_not_buy_ranged_only_items"]
  },
  {
    heroId: "h035_death_singer",
    archetype: "mago de silêncio, espírito e pressão de torres",
    preferredPositions: [2],
    buildIdentity: "magic_core",
    startingItems: ["i001_regen_rations", "i003_mana_clarity", "i004_burst_mango", "i011_refillable_bottle", "i067_intelligence_talisman", "i068_magic_wand"],
    earlyItems: ["i073_arcane_boots", "i096_cast_range_lens", "i156_phylactery_focus"],
    coreItems: ["i153_dominator_helm", "i154_overlord_helm", "i119_assault_aura_plate", "i101_spell_kaya", "i142_burst_wand", "i140_silence_orchid"],
    luxuryItems: ["i137_octarine_core_generic", "i138_refresh_orb_generic", "i139_hex_scythe_generic", "i159_parasma_generic"],
    situationalItems: ["i110_spellproof_crown", "i111_link_barrier_sphere", "i112_emergency_disk", "i098_ethereal_focus_blade", "i113_lotus_shell", "i149_solar_crest_generic", "i152_vampire_aura_mask"],
    neutralPreferences: ["i167_t1_arcane_bracelet", "i181_t3_psychic_headband", "i182_t3_quickening_charm", "i184_t4_spell_prism", "i189_t4_timeless_relic", "i204_e009_focused"],
    aiWarnings: ["protect_mana_pool_and_cooldowns"]
  },
  {
    heroId: "h036_blade_assassin",
    archetype: "assassina física de adaga, evasão e crítico extremo",
    preferredPositions: [1],
    buildIdentity: "agility_right_click_core",
    startingItems: ["i001_regen_rations", "i002_healing_salve", "i004_burst_mango", "i029_quelling_hatchet", "i066_agility_band", "i068_magic_wand"],
    earlyItems: ["i072_attribute_treads", "i077_falcon_blade_generic"],
    coreItems: ["i079_frenzy_mask", "i103_speed_yasha", "i129_crystal_edge", "i121_satanic_bloodstone", "i130_great_crit_blade"],
    luxuryItems: ["i130_great_crit_blade", "i131_true_strike_staff", "i134_moon_shard_generic", "i133_divine_relic"],
    situationalItems: ["i110_spellproof_crown", "i111_link_barrier_sphere", "i112_emergency_disk", "i122_armor_corruptor", "i128_abyssal_lockblade"],
    neutralPreferences: ["i166_t1_duelist_gloves", "i173_t2_dragon_scale", "i178_t3_titan_sliver", "i185_t4_ninja_gear", "i190_t5_apex_shard", "i207_e012_hasty"],
    aiWarnings: ["avoid_greed_if_team_is_behind", "do_not_buy_ranged_only_items"]
  },
  {
    heroId: "h037_nether_pusher",
    archetype: "mago de drenagem, explosão e antimagia estrutural",
    preferredPositions: [2],
    buildIdentity: "magic_core",
    startingItems: ["i001_regen_rations", "i003_mana_clarity", "i004_burst_mango", "i011_refillable_bottle", "i067_intelligence_talisman", "i068_magic_wand"],
    earlyItems: ["i073_arcane_boots", "i096_cast_range_lens", "i156_phylactery_focus"],
    coreItems: ["i153_dominator_helm", "i154_overlord_helm", "i119_assault_aura_plate", "i101_spell_kaya", "i142_burst_wand", "i140_silence_orchid"],
    luxuryItems: ["i137_octarine_core_generic", "i138_refresh_orb_generic", "i139_hex_scythe_generic", "i159_parasma_generic"],
    situationalItems: ["i110_spellproof_crown", "i111_link_barrier_sphere", "i112_emergency_disk", "i098_ethereal_focus_blade", "i113_lotus_shell", "i149_solar_crest_generic", "i152_vampire_aura_mask"],
    neutralPreferences: ["i167_t1_arcane_bracelet", "i181_t3_psychic_headband", "i182_t3_quickening_charm", "i184_t4_spell_prism", "i189_t4_timeless_relic", "i204_e009_focused"],
    aiWarnings: ["protect_mana_pool_and_cooldowns"]
  },
  {
    heroId: "h038_psychic_assassin",
    archetype: "carry psíquica de refração, armadilhas e burst",
    preferredPositions: [1, 2],
    buildIdentity: "agility_right_click_core",
    startingItems: ["i001_regen_rations", "i002_healing_salve", "i004_burst_mango", "i029_quelling_hatchet", "i066_agility_band", "i068_magic_wand"],
    earlyItems: ["i072_attribute_treads", "i077_falcon_blade_generic"],
    coreItems: ["i085_reach_lance", "i086_force_pike", "i124_chain_lightning_hammer", "i130_great_crit_blade"],
    luxuryItems: ["i130_great_crit_blade", "i131_true_strike_staff", "i134_moon_shard_generic", "i133_divine_relic"],
    situationalItems: ["i110_spellproof_crown", "i111_link_barrier_sphere", "i112_emergency_disk", "i122_armor_corruptor", "i128_abyssal_lockblade"],
    neutralPreferences: ["i166_t1_duelist_gloves", "i173_t2_dragon_scale", "i178_t3_titan_sliver", "i185_t4_ninja_gear", "i190_t5_apex_shard", "i207_e012_hasty"],
    aiWarnings: ["avoid_greed_if_team_is_behind"]
  },
  {
    heroId: "h039_venom_dragon",
    archetype: "dragão venenoso de corrosão, lentidão e break",
    preferredPositions: [2, 3],
    buildIdentity: "offlane_initiator_tank",
    startingItems: ["i001_regen_rations", "i002_healing_salve", "i004_burst_mango", "i065_strength_bracer", "i068_magic_wand"],
    earlyItems: ["i071_phase_warboots", "i077_falcon_blade_generic", "i114_blade_return_mail"],
    coreItems: ["i055_blink_core", "i089_overwhelming_blink", "i116_team_crimson_barrier", "i118_team_pipe_barrier"],
    luxuryItems: ["i119_assault_aura_plate", "i120_giant_heart", "i128_abyssal_lockblade", "i135_grand_spell_scepter"],
    situationalItems: ["i107_disarm_halberd", "i110_spellproof_crown", "i111_link_barrier_sphere", "i113_lotus_shell", "i100_frost_armor_plate"],
    neutralPreferences: ["i167_t1_arcane_bracelet", "i181_t3_psychic_headband", "i182_t3_quickening_charm", "i184_t4_spell_prism", "i189_t4_timeless_relic", "i204_e009_focused"],
    aiWarnings: ["protect_mana_pool_and_cooldowns"]
  },
  {
    heroId: "h040_lunar_raider",
    archetype: "carry lunar de ricochete, aura e bombardeio mágico",
    preferredPositions: [1],
    buildIdentity: "agility_right_click_core",
    startingItems: ["i001_regen_rations", "i002_healing_salve", "i004_burst_mango", "i029_quelling_hatchet", "i066_agility_band", "i068_magic_wand"],
    earlyItems: ["i072_attribute_treads", "i077_falcon_blade_generic"],
    coreItems: ["i153_dominator_helm", "i154_overlord_helm", "i119_assault_aura_plate", "i085_reach_lance", "i086_force_pike", "i124_chain_lightning_hammer"],
    luxuryItems: ["i130_great_crit_blade", "i131_true_strike_staff", "i134_moon_shard_generic", "i133_divine_relic"],
    situationalItems: ["i110_spellproof_crown", "i111_link_barrier_sphere", "i112_emergency_disk", "i122_armor_corruptor", "i128_abyssal_lockblade", "i149_solar_crest_generic", "i152_vampire_aura_mask"],
    neutralPreferences: ["i166_t1_duelist_gloves", "i173_t2_dragon_scale", "i178_t3_titan_sliver", "i185_t4_ninja_gear", "i190_t5_apex_shard", "i207_e012_hasty"],
    aiWarnings: ["avoid_greed_if_team_is_behind", "protect_mana_pool_and_cooldowns"]
  },
  {
    heroId: "h041_dragon_knight",
    archetype: "tanque de linha, stun e forma dracônica",
    preferredPositions: [2, 3],
    buildIdentity: "offlane_initiator_tank",
    startingItems: ["i001_regen_rations", "i002_healing_salve", "i004_burst_mango", "i065_strength_bracer", "i068_magic_wand"],
    earlyItems: ["i071_phase_warboots", "i077_falcon_blade_generic", "i114_blade_return_mail"],
    coreItems: ["i153_dominator_helm", "i154_overlord_helm", "i119_assault_aura_plate", "i055_blink_core", "i089_overwhelming_blink", "i116_team_crimson_barrier"],
    luxuryItems: ["i119_assault_aura_plate", "i120_giant_heart", "i128_abyssal_lockblade", "i135_grand_spell_scepter"],
    situationalItems: ["i107_disarm_halberd", "i110_spellproof_crown", "i111_link_barrier_sphere", "i113_lotus_shell", "i100_frost_armor_plate", "i149_solar_crest_generic", "i152_vampire_aura_mask"],
    neutralPreferences: ["i171_t1_survival_pouch", "i173_t2_dragon_scale", "i178_t3_titan_sliver", "i186_t4_trickster_cloak", "i188_t4_ancient_guardian", "i208_e013_resolute"],
    aiWarnings: ["do_not_buy_ranged_only_items"]
  },
  {
    heroId: "h042_grave_savior",
    archetype: "suporte de cura, veneno e negação de morte",
    preferredPositions: [5],
    buildIdentity: "support_utility",
    startingItems: ["i001_regen_rations", "i003_mana_clarity", "i004_burst_mango", "i008_observer_eye", "i009_sentry_eye", "i068_magic_wand"],
    earlyItems: ["i074_tranquil_boots", "i143_spirit_urn", "i148_pavise_barrier"],
    coreItems: ["i092_force_staff_generic", "i093_glimmer_cloak_generic", "i145_healing_mechanism", "i146_guardian_boots_generic"],
    luxuryItems: ["i094_cyclone_scepter", "i147_holy_locket_generic", "i139_hex_scythe_generic", "i164_essence_distiller_generic"],
    situationalItems: ["i147_holy_locket_generic", "i164_essence_distiller_generic", "i144_spirit_vessel_generic", "i118_team_pipe_barrier", "i116_team_crimson_barrier", "i112_emergency_disk", "i113_lotus_shell"],
    neutralPreferences: ["i170_t1_broom_charm", "i176_t2_bullwhip_generic", "i180_t3_ceremonial_robe", "i184_t4_spell_prism", "i192_t5_mirror_shield", "i210_e015_visionary"],
    aiWarnings: ["do_not_skip_detection_and_save_items"]
  },
  {
    heroId: "h043_clockwork_trapper",
    archetype: "iniciador mecânico de jaula, foguetes e gancho",
    preferredPositions: [3, 4],
    buildIdentity: "support_utility",
    startingItems: ["i001_regen_rations", "i003_mana_clarity", "i006_team_smoke", "i008_observer_eye", "i009_sentry_eye", "i068_magic_wand"],
    earlyItems: ["i073_arcane_boots", "i143_spirit_urn", "i150_war_drums_generic"],
    coreItems: ["i092_force_staff_generic", "i094_cyclone_scepter", "i149_solar_crest_generic", "i151_bearing_boots_generic"],
    luxuryItems: ["i139_hex_scythe_generic", "i135_grand_spell_scepter", "i095_wind_ascension", "i164_essence_distiller_generic"],
    situationalItems: ["i093_glimmer_cloak_generic", "i144_spirit_vessel_generic", "i118_team_pipe_barrier", "i116_team_crimson_barrier", "i113_lotus_shell"],
    neutralPreferences: ["i170_t1_broom_charm", "i176_t2_bullwhip_generic", "i180_t3_ceremonial_robe", "i184_t4_spell_prism", "i192_t5_mirror_shield", "i210_e015_visionary"],
    aiWarnings: ["do_not_skip_detection_and_save_items", "prioritize_blink_or_reach_before_greedy_auras", "do_not_buy_ranged_only_items"]
  },
  {
    heroId: "h044_lightning_demon",
    archetype: "caster de vínculo elétrico, empurrão e tempestade",
    preferredPositions: [2, 3],
    buildIdentity: "magic_core",
    startingItems: ["i001_regen_rations", "i003_mana_clarity", "i004_burst_mango", "i011_refillable_bottle", "i067_intelligence_talisman", "i068_magic_wand"],
    earlyItems: ["i073_arcane_boots", "i096_cast_range_lens", "i156_phylactery_focus"],
    coreItems: ["i101_spell_kaya", "i142_burst_wand", "i140_silence_orchid", "i135_grand_spell_scepter"],
    luxuryItems: ["i137_octarine_core_generic", "i138_refresh_orb_generic", "i139_hex_scythe_generic", "i159_parasma_generic"],
    situationalItems: ["i110_spellproof_crown", "i111_link_barrier_sphere", "i112_emergency_disk", "i098_ethereal_focus_blade", "i113_lotus_shell"],
    neutralPreferences: ["i167_t1_arcane_bracelet", "i181_t3_psychic_headband", "i182_t3_quickening_charm", "i184_t4_spell_prism", "i189_t4_timeless_relic", "i204_e009_focused"],
    aiWarnings: ["protect_mana_pool_and_cooldowns"]
  },
  {
    heroId: "h045_forest_commander",
    archetype: "mago global de teleporte, árvores e invocação",
    preferredPositions: [2, 3],
    buildIdentity: "magic_core",
    startingItems: ["i001_regen_rations", "i003_mana_clarity", "i004_burst_mango", "i011_refillable_bottle", "i067_intelligence_talisman", "i068_magic_wand"],
    earlyItems: ["i073_arcane_boots", "i096_cast_range_lens", "i156_phylactery_focus"],
    coreItems: ["i153_dominator_helm", "i154_overlord_helm", "i119_assault_aura_plate", "i101_spell_kaya", "i142_burst_wand", "i140_silence_orchid"],
    luxuryItems: ["i137_octarine_core_generic", "i138_refresh_orb_generic", "i139_hex_scythe_generic", "i159_parasma_generic", "i075_travel_boots"],
    situationalItems: ["i110_spellproof_crown", "i111_link_barrier_sphere", "i112_emergency_disk", "i098_ethereal_focus_blade", "i113_lotus_shell", "i149_solar_crest_generic", "i152_vampire_aura_mask"],
    neutralPreferences: ["i167_t1_arcane_bracelet", "i181_t3_psychic_headband", "i182_t3_quickening_charm", "i184_t4_spell_prism", "i189_t4_timeless_relic", "i204_e009_focused"],
    aiWarnings: ["protect_mana_pool_and_cooldowns"]
  },
  {
    heroId: "h046_lifesteal_berserker",
    archetype: "carry de roubo de vida, imunidade curta e infestação",
    preferredPositions: [1],
    buildIdentity: "strength_brawler_core",
    startingItems: ["i001_regen_rations", "i002_healing_salve", "i004_burst_mango", "i029_quelling_hatchet", "i065_strength_bracer", "i068_magic_wand"],
    earlyItems: ["i071_phase_warboots", "i078_armlet_relic", "i080_echo_blade"],
    coreItems: ["i102_power_sange", "i105_power_speed_dualblade", "i110_spellproof_crown", "i121_satanic_bloodstone"],
    luxuryItems: ["i128_abyssal_lockblade", "i120_giant_heart", "i119_assault_aura_plate", "i130_great_crit_blade"],
    situationalItems: ["i107_disarm_halberd", "i111_link_barrier_sphere", "i112_emergency_disk", "i131_true_strike_staff", "i122_armor_corruptor"],
    neutralPreferences: ["i166_t1_duelist_gloves", "i173_t2_dragon_scale", "i178_t3_titan_sliver", "i185_t4_ninja_gear", "i190_t5_apex_shard", "i207_e012_hasty"],
    aiWarnings: ["avoid_greed_if_team_is_behind", "do_not_buy_ranged_only_items"]
  },
  {
    heroId: "h047_dark_vector",
    archetype: "offlaner de vácuo, parede e corrida acelerada",
    preferredPositions: [3],
    buildIdentity: "hybrid_core_or_utility",
    startingItems: ["i001_regen_rations", "i003_mana_clarity", "i004_burst_mango", "i068_magic_wand"],
    earlyItems: ["i073_arcane_boots", "i096_cast_range_lens", "i077_falcon_blade_generic"],
    coreItems: ["i153_dominator_helm", "i154_overlord_helm", "i119_assault_aura_plate", "i101_spell_kaya", "i135_grand_spell_scepter", "i137_octarine_core_generic"],
    luxuryItems: ["i138_refresh_orb_generic", "i159_parasma_generic", "i160_revenant_brooch_generic", "i095_wind_ascension"],
    situationalItems: ["i110_spellproof_crown", "i111_link_barrier_sphere", "i112_emergency_disk", "i113_lotus_shell", "i149_solar_crest_generic", "i152_vampire_aura_mask"],
    neutralPreferences: ["i170_t1_broom_charm", "i176_t2_bullwhip_generic", "i180_t3_ceremonial_robe", "i184_t4_spell_prism", "i192_t5_mirror_shield", "i210_e015_visionary"],
    aiWarnings: ["prioritize_blink_or_reach_before_greedy_auras", "do_not_buy_ranged_only_items"]
  },
  {
    heroId: "h048_bone_archer",
    archetype: "atirador invisível de fogo, esqueletos e pickoff",
    preferredPositions: [1, 2],
    buildIdentity: "agility_right_click_core",
    startingItems: ["i001_regen_rations", "i002_healing_salve", "i004_burst_mango", "i029_quelling_hatchet", "i066_agility_band", "i068_magic_wand"],
    earlyItems: ["i072_attribute_treads", "i077_falcon_blade_generic"],
    coreItems: ["i153_dominator_helm", "i154_overlord_helm", "i119_assault_aura_plate", "i083_diffusal_edge", "i106_mirror_style", "i108_frost_orb_core"],
    luxuryItems: ["i130_great_crit_blade", "i131_true_strike_staff", "i134_moon_shard_generic", "i133_divine_relic"],
    situationalItems: ["i110_spellproof_crown", "i111_link_barrier_sphere", "i112_emergency_disk", "i122_armor_corruptor", "i128_abyssal_lockblade", "i149_solar_crest_generic", "i152_vampire_aura_mask"],
    neutralPreferences: ["i166_t1_duelist_gloves", "i173_t2_dragon_scale", "i178_t3_titan_sliver", "i185_t4_ninja_gear", "i190_t5_apex_shard", "i207_e012_hasty"],
    aiWarnings: ["avoid_greed_if_team_is_behind"]
  },
  {
    heroId: "h049_dark_paladin",
    archetype: "frontliner universal de escudo, cura e negação",
    preferredPositions: [3, 5],
    buildIdentity: "support_utility",
    startingItems: ["i001_regen_rations", "i003_mana_clarity", "i004_burst_mango", "i008_observer_eye", "i009_sentry_eye", "i068_magic_wand"],
    earlyItems: ["i074_tranquil_boots", "i143_spirit_urn", "i148_pavise_barrier"],
    coreItems: ["i092_force_staff_generic", "i093_glimmer_cloak_generic", "i145_healing_mechanism", "i146_guardian_boots_generic"],
    luxuryItems: ["i094_cyclone_scepter", "i147_holy_locket_generic", "i139_hex_scythe_generic", "i164_essence_distiller_generic"],
    situationalItems: ["i147_holy_locket_generic", "i164_essence_distiller_generic", "i144_spirit_vessel_generic", "i118_team_pipe_barrier", "i116_team_crimson_barrier", "i112_emergency_disk", "i113_lotus_shell"],
    neutralPreferences: ["i171_t1_survival_pouch", "i173_t2_dragon_scale", "i178_t3_titan_sliver", "i186_t4_trickster_cloak", "i188_t4_ancient_guardian", "i208_e013_resolute"],
    aiWarnings: ["do_not_skip_detection_and_save_items", "do_not_buy_ranged_only_items"]
  },
  {
    heroId: "h050_wild_enchantress",
    archetype: "suporte selvagem de cura, controle de creeps e poke",
    preferredPositions: [4, 5],
    buildIdentity: "support_utility",
    startingItems: ["i001_regen_rations", "i003_mana_clarity", "i004_burst_mango", "i008_observer_eye", "i009_sentry_eye", "i068_magic_wand"],
    earlyItems: ["i074_tranquil_boots", "i143_spirit_urn", "i148_pavise_barrier"],
    coreItems: ["i092_force_staff_generic", "i093_glimmer_cloak_generic", "i145_healing_mechanism", "i146_guardian_boots_generic"],
    luxuryItems: ["i094_cyclone_scepter", "i147_holy_locket_generic", "i139_hex_scythe_generic", "i164_essence_distiller_generic"],
    situationalItems: ["i147_holy_locket_generic", "i164_essence_distiller_generic", "i144_spirit_vessel_generic", "i118_team_pipe_barrier", "i116_team_crimson_barrier", "i112_emergency_disk", "i113_lotus_shell"],
    neutralPreferences: ["i167_t1_arcane_bracelet", "i181_t3_psychic_headband", "i182_t3_quickening_charm", "i184_t4_spell_prism", "i189_t4_timeless_relic", "i204_e009_focused"],
    aiWarnings: ["do_not_skip_detection_and_save_items", "protect_mana_pool_and_cooldowns"]
  },
  {
    heroId: "h051_spear_martyr",
    archetype: "lutador de sacrifício, fogo interior e dano crescente",
    preferredPositions: [1, 3],
    buildIdentity: "offlane_initiator_tank",
    startingItems: ["i001_regen_rations", "i002_healing_salve", "i004_burst_mango", "i065_strength_bracer", "i068_magic_wand"],
    earlyItems: ["i071_phase_warboots", "i077_falcon_blade_generic", "i114_blade_return_mail"],
    coreItems: ["i055_blink_core", "i089_overwhelming_blink", "i116_team_crimson_barrier", "i118_team_pipe_barrier"],
    luxuryItems: ["i119_assault_aura_plate", "i120_giant_heart", "i128_abyssal_lockblade", "i135_grand_spell_scepter"],
    situationalItems: ["i107_disarm_halberd", "i110_spellproof_crown", "i111_link_barrier_sphere", "i113_lotus_shell", "i100_frost_armor_plate"],
    neutralPreferences: ["i166_t1_duelist_gloves", "i173_t2_dragon_scale", "i178_t3_titan_sliver", "i185_t4_ninja_gear", "i190_t5_apex_shard", "i207_e012_hasty"],
    aiWarnings: ["avoid_greed_if_team_is_behind"]
  },
  {
    heroId: "h052_night_hunter",
    archetype: "caçador noturno de silêncio, voo e visão superior",
    preferredPositions: [3, 4],
    buildIdentity: "support_utility",
    startingItems: ["i001_regen_rations", "i003_mana_clarity", "i006_team_smoke", "i008_observer_eye", "i009_sentry_eye", "i068_magic_wand"],
    earlyItems: ["i073_arcane_boots", "i143_spirit_urn", "i150_war_drums_generic"],
    coreItems: ["i092_force_staff_generic", "i094_cyclone_scepter", "i149_solar_crest_generic", "i151_bearing_boots_generic", "i140_silence_orchid"],
    luxuryItems: ["i139_hex_scythe_generic", "i135_grand_spell_scepter", "i095_wind_ascension", "i164_essence_distiller_generic"],
    situationalItems: ["i093_glimmer_cloak_generic", "i144_spirit_vessel_generic", "i118_team_pipe_barrier", "i116_team_crimson_barrier", "i113_lotus_shell"],
    neutralPreferences: ["i171_t1_survival_pouch", "i173_t2_dragon_scale", "i178_t3_titan_sliver", "i186_t4_trickster_cloak", "i188_t4_ancient_guardian", "i208_e013_resolute"],
    aiWarnings: ["do_not_skip_detection_and_save_items", "prioritize_blink_or_reach_before_greedy_auras", "do_not_buy_ranged_only_items"]
  },
  {
    heroId: "h053_brood_matriarch",
    archetype: "pusher de teia, mobilidade territorial e crias",
    preferredPositions: [2, 3],
    buildIdentity: "hybrid_core_or_utility",
    startingItems: ["i001_regen_rations", "i003_mana_clarity", "i004_burst_mango", "i068_magic_wand"],
    earlyItems: ["i073_arcane_boots", "i096_cast_range_lens", "i077_falcon_blade_generic"],
    coreItems: ["i153_dominator_helm", "i154_overlord_helm", "i119_assault_aura_plate", "i101_spell_kaya", "i135_grand_spell_scepter", "i137_octarine_core_generic"],
    luxuryItems: ["i138_refresh_orb_generic", "i159_parasma_generic", "i160_revenant_brooch_generic", "i095_wind_ascension"],
    situationalItems: ["i110_spellproof_crown", "i111_link_barrier_sphere", "i112_emergency_disk", "i113_lotus_shell", "i149_solar_crest_generic", "i152_vampire_aura_mask"],
    neutralPreferences: ["i170_t1_broom_charm", "i176_t2_bullwhip_generic", "i180_t3_ceremonial_robe", "i184_t4_spell_prism", "i192_t5_mirror_shield", "i210_e015_visionary"],
    aiWarnings: ["do_not_buy_ranged_only_items"]
  },
  {
    heroId: "h054_bounty_scout",
    archetype: "caçador furtivo de visão, ouro e perseguição",
    preferredPositions: [4],
    buildIdentity: "support_utility",
    startingItems: ["i001_regen_rations", "i003_mana_clarity", "i006_team_smoke", "i008_observer_eye", "i009_sentry_eye", "i068_magic_wand"],
    earlyItems: ["i073_arcane_boots", "i143_spirit_urn", "i150_war_drums_generic"],
    coreItems: ["i092_force_staff_generic", "i094_cyclone_scepter", "i149_solar_crest_generic", "i151_bearing_boots_generic"],
    luxuryItems: ["i139_hex_scythe_generic", "i135_grand_spell_scepter", "i095_wind_ascension", "i164_essence_distiller_generic"],
    situationalItems: ["i093_glimmer_cloak_generic", "i144_spirit_vessel_generic", "i118_team_pipe_barrier", "i116_team_crimson_barrier", "i113_lotus_shell"],
    neutralPreferences: ["i170_t1_broom_charm", "i176_t2_bullwhip_generic", "i180_t3_ceremonial_robe", "i184_t4_spell_prism", "i192_t5_mirror_shield", "i210_e015_visionary"],
    aiWarnings: ["do_not_skip_detection_and_save_items", "do_not_buy_ranged_only_items"]
  },
  {
    heroId: "h055_time_weaver",
    archetype: "carry móvel de insetos, redução de armadura e reversão",
    preferredPositions: [1],
    buildIdentity: "agility_right_click_core",
    startingItems: ["i001_regen_rations", "i002_healing_salve", "i004_burst_mango", "i029_quelling_hatchet", "i066_agility_band", "i068_magic_wand"],
    earlyItems: ["i072_attribute_treads", "i077_falcon_blade_generic"],
    coreItems: ["i083_diffusal_edge", "i106_mirror_style", "i108_frost_orb_core", "i109_evasion_wingblade"],
    luxuryItems: ["i130_great_crit_blade", "i131_true_strike_staff", "i134_moon_shard_generic", "i133_divine_relic"],
    situationalItems: ["i110_spellproof_crown", "i111_link_barrier_sphere", "i112_emergency_disk", "i122_armor_corruptor", "i128_abyssal_lockblade"],
    neutralPreferences: ["i166_t1_duelist_gloves", "i173_t2_dragon_scale", "i178_t3_titan_sliver", "i185_t4_ninja_gear", "i190_t5_apex_shard", "i207_e012_hasty"],
    aiWarnings: ["avoid_greed_if_team_is_behind"]
  },
  {
    heroId: "h056_twin_dragon",
    archetype: "suporte bicéfalo de gelo/fogo e controle de área",
    preferredPositions: [5],
    buildIdentity: "support_utility",
    startingItems: ["i001_regen_rations", "i003_mana_clarity", "i004_burst_mango", "i008_observer_eye", "i009_sentry_eye", "i068_magic_wand"],
    earlyItems: ["i074_tranquil_boots", "i143_spirit_urn", "i148_pavise_barrier"],
    coreItems: ["i092_force_staff_generic", "i093_glimmer_cloak_generic", "i145_healing_mechanism", "i146_guardian_boots_generic"],
    luxuryItems: ["i094_cyclone_scepter", "i147_holy_locket_generic", "i139_hex_scythe_generic", "i164_essence_distiller_generic"],
    situationalItems: ["i144_spirit_vessel_generic", "i118_team_pipe_barrier", "i116_team_crimson_barrier", "i112_emergency_disk", "i113_lotus_shell"],
    neutralPreferences: ["i167_t1_arcane_bracelet", "i181_t3_psychic_headband", "i182_t3_quickening_charm", "i184_t4_spell_prism", "i189_t4_timeless_relic", "i204_e009_focused"],
    aiWarnings: ["do_not_skip_detection_and_save_items", "protect_mana_pool_and_cooldowns"]
  },
  {
    heroId: "h057_fire_rider",
    archetype: "iniciador voador de óleo, trilha de fogo e arrasto",
    preferredPositions: [3],
    buildIdentity: "hybrid_core_or_utility",
    startingItems: ["i001_regen_rations", "i003_mana_clarity", "i004_burst_mango", "i068_magic_wand"],
    earlyItems: ["i073_arcane_boots", "i096_cast_range_lens", "i077_falcon_blade_generic"],
    coreItems: ["i101_spell_kaya", "i135_grand_spell_scepter", "i137_octarine_core_generic", "i139_hex_scythe_generic"],
    luxuryItems: ["i138_refresh_orb_generic", "i159_parasma_generic", "i160_revenant_brooch_generic", "i095_wind_ascension"],
    situationalItems: ["i110_spellproof_crown", "i111_link_barrier_sphere", "i112_emergency_disk", "i113_lotus_shell"],
    neutralPreferences: ["i170_t1_broom_charm", "i176_t2_bullwhip_generic", "i180_t3_ceremonial_robe", "i184_t4_spell_prism", "i192_t5_mirror_shield", "i210_e015_visionary"],
    aiWarnings: ["prioritize_blink_or_reach_before_greedy_auras"]
  },
  {
    heroId: "h058_animal_priest",
    archetype: "suporte de controle espiritual e exército neutro",
    preferredPositions: [5],
    buildIdentity: "support_utility",
    startingItems: ["i001_regen_rations", "i003_mana_clarity", "i004_burst_mango", "i008_observer_eye", "i009_sentry_eye", "i068_magic_wand"],
    earlyItems: ["i074_tranquil_boots", "i143_spirit_urn", "i148_pavise_barrier"],
    coreItems: ["i092_force_staff_generic", "i093_glimmer_cloak_generic", "i145_healing_mechanism", "i146_guardian_boots_generic"],
    luxuryItems: ["i094_cyclone_scepter", "i147_holy_locket_generic", "i139_hex_scythe_generic", "i164_essence_distiller_generic"],
    situationalItems: ["i147_holy_locket_generic", "i164_essence_distiller_generic", "i144_spirit_vessel_generic", "i118_team_pipe_barrier", "i116_team_crimson_barrier", "i112_emergency_disk", "i113_lotus_shell"],
    neutralPreferences: ["i170_t1_broom_charm", "i176_t2_bullwhip_generic", "i180_t3_ceremonial_robe", "i184_t4_spell_prism", "i192_t5_mirror_shield", "i210_e015_visionary"],
    aiWarnings: ["do_not_skip_detection_and_save_items"]
  },
  {
    heroId: "h059_specter_global",
    archetype: "carry espectral de dispersão e presença global",
    preferredPositions: [1],
    buildIdentity: "agility_right_click_core",
    startingItems: ["i001_regen_rations", "i002_healing_salve", "i004_burst_mango", "i029_quelling_hatchet", "i066_agility_band", "i068_magic_wand"],
    earlyItems: ["i072_attribute_treads", "i077_falcon_blade_generic"],
    coreItems: ["i079_frenzy_mask", "i103_speed_yasha", "i129_crystal_edge", "i121_satanic_bloodstone"],
    luxuryItems: ["i130_great_crit_blade", "i131_true_strike_staff", "i134_moon_shard_generic", "i133_divine_relic"],
    situationalItems: ["i110_spellproof_crown", "i111_link_barrier_sphere", "i112_emergency_disk", "i122_armor_corruptor", "i128_abyssal_lockblade"],
    neutralPreferences: ["i166_t1_duelist_gloves", "i173_t2_dragon_scale", "i178_t3_titan_sliver", "i185_t4_ninja_gear", "i190_t5_apex_shard", "i207_e012_hasty"],
    aiWarnings: ["avoid_greed_if_team_is_behind", "do_not_buy_ranged_only_items"]
  },
  {
    heroId: "h060_doom_bringer",
    archetype: "brutamontes de devorar, maldição e silêncio supremo",
    preferredPositions: [3],
    buildIdentity: "offlane_initiator_tank",
    startingItems: ["i001_regen_rations", "i002_healing_salve", "i004_burst_mango", "i065_strength_bracer", "i068_magic_wand"],
    earlyItems: ["i071_phase_warboots", "i077_falcon_blade_generic", "i114_blade_return_mail"],
    coreItems: ["i055_blink_core", "i089_overwhelming_blink", "i116_team_crimson_barrier", "i118_team_pipe_barrier"],
    luxuryItems: ["i119_assault_aura_plate", "i120_giant_heart", "i128_abyssal_lockblade", "i135_grand_spell_scepter"],
    situationalItems: ["i107_disarm_halberd", "i110_spellproof_crown", "i111_link_barrier_sphere", "i113_lotus_shell", "i100_frost_armor_plate"],
    neutralPreferences: ["i171_t1_survival_pouch", "i173_t2_dragon_scale", "i178_t3_titan_sliver", "i186_t4_trickster_cloak", "i188_t4_ancient_guardian", "i208_e013_resolute"],
    aiWarnings: ["prioritize_blink_or_reach_before_greedy_auras", "do_not_buy_ranged_only_items"]
  },
  {
    heroId: "h061_ice_ancient",
    archetype: "suporte glacial de negação de cura e controle global",
    preferredPositions: [5],
    buildIdentity: "support_utility",
    startingItems: ["i001_regen_rations", "i003_mana_clarity", "i004_burst_mango", "i008_observer_eye", "i009_sentry_eye", "i068_magic_wand"],
    earlyItems: ["i074_tranquil_boots", "i143_spirit_urn", "i148_pavise_barrier"],
    coreItems: ["i092_force_staff_generic", "i093_glimmer_cloak_generic", "i145_healing_mechanism", "i146_guardian_boots_generic"],
    luxuryItems: ["i094_cyclone_scepter", "i147_holy_locket_generic", "i139_hex_scythe_generic", "i164_essence_distiller_generic"],
    situationalItems: ["i144_spirit_vessel_generic", "i118_team_pipe_barrier", "i116_team_crimson_barrier", "i112_emergency_disk", "i113_lotus_shell"],
    neutralPreferences: ["i167_t1_arcane_bracelet", "i181_t3_psychic_headband", "i182_t3_quickening_charm", "i184_t4_spell_prism", "i189_t4_timeless_relic", "i204_e009_focused"],
    aiWarnings: ["do_not_skip_detection_and_save_items", "protect_mana_pool_and_cooldowns"]
  },
  {
    heroId: "h062_bear_berserker",
    archetype: "carry de fúria acumulada e burst corpo a corpo",
    preferredPositions: [1],
    buildIdentity: "agility_right_click_core",
    startingItems: ["i001_regen_rations", "i002_healing_salve", "i004_burst_mango", "i029_quelling_hatchet", "i066_agility_band", "i068_magic_wand"],
    earlyItems: ["i072_attribute_treads", "i077_falcon_blade_generic"],
    coreItems: ["i079_frenzy_mask", "i103_speed_yasha", "i129_crystal_edge", "i121_satanic_bloodstone"],
    luxuryItems: ["i130_great_crit_blade", "i131_true_strike_staff", "i134_moon_shard_generic", "i133_divine_relic"],
    situationalItems: ["i110_spellproof_crown", "i111_link_barrier_sphere", "i112_emergency_disk", "i122_armor_corruptor", "i128_abyssal_lockblade"],
    neutralPreferences: ["i166_t1_duelist_gloves", "i173_t2_dragon_scale", "i178_t3_titan_sliver", "i185_t4_ninja_gear", "i190_t5_apex_shard", "i207_e012_hasty"],
    aiWarnings: ["avoid_greed_if_team_is_behind", "do_not_buy_ranged_only_items"]
  },
  {
    heroId: "h063_horned_charger",
    archetype: "ganker global de investida, resistência e bash",
    preferredPositions: [3, 4],
    buildIdentity: "support_utility",
    startingItems: ["i001_regen_rations", "i003_mana_clarity", "i006_team_smoke", "i008_observer_eye", "i009_sentry_eye", "i068_magic_wand"],
    earlyItems: ["i073_arcane_boots", "i143_spirit_urn", "i150_war_drums_generic"],
    coreItems: ["i092_force_staff_generic", "i094_cyclone_scepter", "i149_solar_crest_generic", "i151_bearing_boots_generic"],
    luxuryItems: ["i139_hex_scythe_generic", "i135_grand_spell_scepter", "i095_wind_ascension", "i164_essence_distiller_generic"],
    situationalItems: ["i093_glimmer_cloak_generic", "i144_spirit_vessel_generic", "i118_team_pipe_barrier", "i116_team_crimson_barrier", "i113_lotus_shell"],
    neutralPreferences: ["i166_t1_duelist_gloves", "i173_t2_dragon_scale", "i178_t3_titan_sliver", "i185_t4_ninja_gear", "i190_t5_apex_shard", "i207_e012_hasty"],
    aiWarnings: ["do_not_skip_detection_and_save_items", "prioritize_blink_or_reach_before_greedy_auras", "do_not_buy_ranged_only_items"]
  },
  {
    heroId: "h064_gyro_artillery",
    archetype: "atirador tecnológico de foguetes, flak e bombardeio",
    preferredPositions: [1],
    buildIdentity: "agility_right_click_core",
    startingItems: ["i001_regen_rations", "i002_healing_salve", "i004_burst_mango", "i029_quelling_hatchet", "i066_agility_band", "i068_magic_wand"],
    earlyItems: ["i072_attribute_treads", "i077_falcon_blade_generic"],
    coreItems: ["i085_reach_lance", "i086_force_pike", "i124_chain_lightning_hammer", "i130_great_crit_blade"],
    luxuryItems: ["i130_great_crit_blade", "i131_true_strike_staff", "i134_moon_shard_generic", "i133_divine_relic"],
    situationalItems: ["i110_spellproof_crown", "i111_link_barrier_sphere", "i112_emergency_disk", "i122_armor_corruptor", "i128_abyssal_lockblade"],
    neutralPreferences: ["i166_t1_duelist_gloves", "i173_t2_dragon_scale", "i178_t3_titan_sliver", "i185_t4_ninja_gear", "i190_t5_apex_shard", "i207_e012_hasty"],
    aiWarnings: ["avoid_greed_if_team_is_behind", "protect_mana_pool_and_cooldowns"]
  },
  {
    heroId: "h065_chemical_brawler",
    archetype: "lutador químico de stun preparado e farm acelerado",
    preferredPositions: [1, 3],
    buildIdentity: "offlane_initiator_tank",
    startingItems: ["i001_regen_rations", "i002_healing_salve", "i004_burst_mango", "i065_strength_bracer", "i068_magic_wand"],
    earlyItems: ["i071_phase_warboots", "i077_falcon_blade_generic", "i114_blade_return_mail"],
    coreItems: ["i055_blink_core", "i089_overwhelming_blink", "i116_team_crimson_barrier", "i118_team_pipe_barrier"],
    luxuryItems: ["i119_assault_aura_plate", "i120_giant_heart", "i128_abyssal_lockblade", "i135_grand_spell_scepter"],
    situationalItems: ["i107_disarm_halberd", "i110_spellproof_crown", "i111_link_barrier_sphere", "i113_lotus_shell", "i100_frost_armor_plate"],
    neutralPreferences: ["i166_t1_duelist_gloves", "i173_t2_dragon_scale", "i178_t3_titan_sliver", "i185_t4_ninja_gear", "i190_t5_apex_shard", "i207_e012_hasty"],
    aiWarnings: ["avoid_greed_if_team_is_behind", "do_not_buy_ranged_only_items"]
  },
  {
    heroId: "h066_complex_mage",
    archetype: "arquimago complexo de dez magias combinatórias",
    preferredPositions: [2],
    buildIdentity: "magic_core",
    startingItems: ["i001_regen_rations", "i003_mana_clarity", "i004_burst_mango", "i011_refillable_bottle", "i067_intelligence_talisman", "i068_magic_wand"],
    earlyItems: ["i073_arcane_boots", "i096_cast_range_lens", "i156_phylactery_focus"],
    coreItems: ["i153_dominator_helm", "i154_overlord_helm", "i119_assault_aura_plate", "i101_spell_kaya", "i142_burst_wand", "i140_silence_orchid"],
    luxuryItems: ["i137_octarine_core_generic", "i138_refresh_orb_generic", "i139_hex_scythe_generic", "i159_parasma_generic"],
    situationalItems: ["i110_spellproof_crown", "i111_link_barrier_sphere", "i112_emergency_disk", "i098_ethereal_focus_blade", "i113_lotus_shell", "i149_solar_crest_generic", "i152_vampire_aura_mask"],
    neutralPreferences: ["i167_t1_arcane_bracelet", "i181_t3_psychic_headband", "i182_t3_quickening_charm", "i184_t4_spell_prism", "i189_t4_timeless_relic", "i204_e009_focused"],
    aiWarnings: ["protect_mana_pool_and_cooldowns"]
  },
  {
    heroId: "h067_silence_warden",
    archetype: "controlador de silêncio, roubo de inteligência e punição global",
    preferredPositions: [2, 5],
    buildIdentity: "support_utility",
    startingItems: ["i001_regen_rations", "i003_mana_clarity", "i004_burst_mango", "i008_observer_eye", "i009_sentry_eye", "i068_magic_wand"],
    earlyItems: ["i074_tranquil_boots", "i143_spirit_urn", "i148_pavise_barrier"],
    coreItems: ["i092_force_staff_generic", "i093_glimmer_cloak_generic", "i145_healing_mechanism", "i146_guardian_boots_generic", "i140_silence_orchid"],
    luxuryItems: ["i094_cyclone_scepter", "i147_holy_locket_generic", "i139_hex_scythe_generic", "i164_essence_distiller_generic"],
    situationalItems: ["i144_spirit_vessel_generic", "i118_team_pipe_barrier", "i116_team_crimson_barrier", "i112_emergency_disk", "i113_lotus_shell"],
    neutralPreferences: ["i167_t1_arcane_bracelet", "i181_t3_psychic_headband", "i182_t3_quickening_charm", "i184_t4_spell_prism", "i189_t4_timeless_relic", "i204_e009_focused"],
    aiWarnings: ["do_not_skip_detection_and_save_items", "protect_mana_pool_and_cooldowns"]
  },
  {
    heroId: "h068_astral_destroyer",
    archetype: "mago astral de roubo de mana e dano puro",
    preferredPositions: [2],
    buildIdentity: "magic_core",
    startingItems: ["i001_regen_rations", "i003_mana_clarity", "i004_burst_mango", "i011_refillable_bottle", "i067_intelligence_talisman", "i068_magic_wand"],
    earlyItems: ["i073_arcane_boots", "i096_cast_range_lens", "i156_phylactery_focus"],
    coreItems: ["i101_spell_kaya", "i142_burst_wand", "i140_silence_orchid", "i135_grand_spell_scepter"],
    luxuryItems: ["i137_octarine_core_generic", "i138_refresh_orb_generic", "i139_hex_scythe_generic", "i159_parasma_generic"],
    situationalItems: ["i110_spellproof_crown", "i111_link_barrier_sphere", "i112_emergency_disk", "i098_ethereal_focus_blade", "i113_lotus_shell"],
    neutralPreferences: ["i167_t1_arcane_bracelet", "i181_t3_psychic_headband", "i182_t3_quickening_charm", "i184_t4_spell_prism", "i189_t4_timeless_relic", "i204_e009_focused"],
    aiWarnings: ["protect_mana_pool_and_cooldowns"]
  },
  {
    heroId: "h069_wolf_alpha",
    archetype: "pusher lupino de aura, summons e transformação",
    preferredPositions: [1, 3],
    buildIdentity: "hybrid_core_or_utility",
    startingItems: ["i001_regen_rations", "i002_healing_salve", "i004_burst_mango", "i029_quelling_hatchet", "i066_agility_band", "i068_magic_wand"],
    earlyItems: ["i072_attribute_treads", "i077_falcon_blade_generic", "i070_corrosion_orb"],
    coreItems: ["i153_dominator_helm", "i154_overlord_helm", "i119_assault_aura_plate", "i124_chain_lightning_hammer", "i129_crystal_edge", "i110_spellproof_crown"],
    luxuryItems: ["i121_satanic_bloodstone", "i131_true_strike_staff", "i134_moon_shard_generic", "i133_divine_relic"],
    situationalItems: ["i111_link_barrier_sphere", "i112_emergency_disk", "i122_armor_corruptor", "i128_abyssal_lockblade", "i149_solar_crest_generic", "i152_vampire_aura_mask"],
    neutralPreferences: ["i166_t1_duelist_gloves", "i173_t2_dragon_scale", "i178_t3_titan_sliver", "i185_t4_ninja_gear", "i190_t5_apex_shard", "i207_e012_hasty"],
    aiWarnings: ["avoid_greed_if_team_is_behind", "do_not_buy_ranged_only_items"]
  },
  {
    heroId: "h070_brew_master",
    archetype: "offlaner evasivo que divide em três formas",
    preferredPositions: [3],
    buildIdentity: "offlane_initiator_tank",
    startingItems: ["i001_regen_rations", "i002_healing_salve", "i004_burst_mango", "i065_strength_bracer", "i068_magic_wand"],
    earlyItems: ["i071_phase_warboots", "i077_falcon_blade_generic", "i114_blade_return_mail"],
    coreItems: ["i055_blink_core", "i089_overwhelming_blink", "i116_team_crimson_barrier", "i118_team_pipe_barrier"],
    luxuryItems: ["i119_assault_aura_plate", "i120_giant_heart", "i128_abyssal_lockblade", "i135_grand_spell_scepter"],
    situationalItems: ["i107_disarm_halberd", "i110_spellproof_crown", "i111_link_barrier_sphere", "i113_lotus_shell", "i100_frost_armor_plate"],
    neutralPreferences: ["i171_t1_survival_pouch", "i173_t2_dragon_scale", "i178_t3_titan_sliver", "i186_t4_trickster_cloak", "i188_t4_ancient_guardian", "i208_e013_resolute"],
    aiWarnings: ["prioritize_blink_or_reach_before_greedy_auras", "do_not_buy_ranged_only_items"]
  },
  {
    heroId: "h071_shadow_demon",
    archetype: "suporte de banimento, ilusões e amplificação de dano",
    preferredPositions: [5],
    buildIdentity: "support_utility",
    startingItems: ["i001_regen_rations", "i003_mana_clarity", "i004_burst_mango", "i008_observer_eye", "i009_sentry_eye", "i068_magic_wand"],
    earlyItems: ["i074_tranquil_boots", "i143_spirit_urn", "i148_pavise_barrier"],
    coreItems: ["i092_force_staff_generic", "i093_glimmer_cloak_generic", "i145_healing_mechanism", "i146_guardian_boots_generic"],
    luxuryItems: ["i094_cyclone_scepter", "i147_holy_locket_generic", "i139_hex_scythe_generic", "i164_essence_distiller_generic"],
    situationalItems: ["i144_spirit_vessel_generic", "i118_team_pipe_barrier", "i116_team_crimson_barrier", "i112_emergency_disk", "i113_lotus_shell"],
    neutralPreferences: ["i167_t1_arcane_bracelet", "i181_t3_psychic_headband", "i182_t3_quickening_charm", "i184_t4_spell_prism", "i189_t4_timeless_relic", "i204_e009_focused"],
    aiWarnings: ["do_not_skip_detection_and_save_items", "protect_mana_pool_and_cooldowns"]
  },
  {
    heroId: "h072_druid_dual",
    archetype: "carry de dupla unidade, urso e vínculo",
    preferredPositions: [1],
    buildIdentity: "hybrid_core_or_utility",
    startingItems: ["i001_regen_rations", "i002_healing_salve", "i004_burst_mango", "i029_quelling_hatchet", "i066_agility_band", "i068_magic_wand"],
    earlyItems: ["i072_attribute_treads", "i077_falcon_blade_generic", "i070_corrosion_orb"],
    coreItems: ["i153_dominator_helm", "i154_overlord_helm", "i119_assault_aura_plate", "i124_chain_lightning_hammer", "i129_crystal_edge", "i110_spellproof_crown"],
    luxuryItems: ["i121_satanic_bloodstone", "i131_true_strike_staff", "i134_moon_shard_generic", "i133_divine_relic"],
    situationalItems: ["i111_link_barrier_sphere", "i112_emergency_disk", "i122_armor_corruptor", "i128_abyssal_lockblade", "i149_solar_crest_generic", "i152_vampire_aura_mask"],
    neutralPreferences: ["i166_t1_duelist_gloves", "i173_t2_dragon_scale", "i178_t3_titan_sliver", "i185_t4_ninja_gear", "i190_t5_apex_shard", "i207_e012_hasty"],
    aiWarnings: ["avoid_greed_if_team_is_behind"]
  },
  {
    heroId: "h073_chaos_lancer",
    archetype: "carry de ilusões fortes, crítico e teleporte caótico",
    preferredPositions: [1],
    buildIdentity: "strength_brawler_core",
    startingItems: ["i001_regen_rations", "i002_healing_salve", "i004_burst_mango", "i029_quelling_hatchet", "i065_strength_bracer", "i068_magic_wand"],
    earlyItems: ["i071_phase_warboots", "i078_armlet_relic", "i080_echo_blade"],
    coreItems: ["i102_power_sange", "i105_power_speed_dualblade", "i110_spellproof_crown", "i121_satanic_bloodstone"],
    luxuryItems: ["i128_abyssal_lockblade", "i120_giant_heart", "i119_assault_aura_plate", "i130_great_crit_blade"],
    situationalItems: ["i107_disarm_halberd", "i111_link_barrier_sphere", "i112_emergency_disk", "i131_true_strike_staff", "i122_armor_corruptor"],
    neutralPreferences: ["i166_t1_duelist_gloves", "i173_t2_dragon_scale", "i178_t3_titan_sliver", "i185_t4_ninja_gear", "i190_t5_apex_shard", "i207_e012_hasty"],
    aiWarnings: ["avoid_greed_if_team_is_behind", "do_not_buy_ranged_only_items"]
  },
  {
    heroId: "h074_clone_tactician",
    archetype: "micro-herói de múltiplos clones permanentes",
    preferredPositions: [1, 2],
    buildIdentity: "agility_right_click_core",
    startingItems: ["i001_regen_rations", "i002_healing_salve", "i004_burst_mango", "i029_quelling_hatchet", "i066_agility_band", "i068_magic_wand"],
    earlyItems: ["i072_attribute_treads", "i077_falcon_blade_generic"],
    coreItems: ["i153_dominator_helm", "i154_overlord_helm", "i119_assault_aura_plate", "i083_diffusal_edge", "i106_mirror_style", "i108_frost_orb_core"],
    luxuryItems: ["i130_great_crit_blade", "i131_true_strike_staff", "i134_moon_shard_generic", "i133_divine_relic"],
    situationalItems: ["i110_spellproof_crown", "i111_link_barrier_sphere", "i112_emergency_disk", "i122_armor_corruptor", "i128_abyssal_lockblade", "i149_solar_crest_generic", "i152_vampire_aura_mask"],
    neutralPreferences: ["i166_t1_duelist_gloves", "i173_t2_dragon_scale", "i178_t3_titan_sliver", "i185_t4_ninja_gear", "i190_t5_apex_shard", "i207_e012_hasty"],
    aiWarnings: ["avoid_greed_if_team_is_behind", "do_not_buy_ranged_only_items"]
  },
  {
    heroId: "h075_tree_guardian",
    archetype: "suporte tanque de raízes, cura global e invisibilidade natural",
    preferredPositions: [3, 5],
    buildIdentity: "support_utility",
    startingItems: ["i001_regen_rations", "i003_mana_clarity", "i004_burst_mango", "i008_observer_eye", "i009_sentry_eye", "i068_magic_wand"],
    earlyItems: ["i074_tranquil_boots", "i143_spirit_urn", "i148_pavise_barrier"],
    coreItems: ["i092_force_staff_generic", "i093_glimmer_cloak_generic", "i145_healing_mechanism", "i146_guardian_boots_generic"],
    luxuryItems: ["i094_cyclone_scepter", "i147_holy_locket_generic", "i139_hex_scythe_generic", "i164_essence_distiller_generic"],
    situationalItems: ["i147_holy_locket_generic", "i164_essence_distiller_generic", "i144_spirit_vessel_generic", "i118_team_pipe_barrier", "i116_team_crimson_barrier", "i112_emergency_disk", "i113_lotus_shell"],
    neutralPreferences: ["i171_t1_survival_pouch", "i173_t2_dragon_scale", "i178_t3_titan_sliver", "i186_t4_trickster_cloak", "i188_t4_ancient_guardian", "i208_e013_resolute"],
    aiWarnings: ["do_not_skip_detection_and_save_items", "do_not_buy_ranged_only_items"]
  },
  {
    heroId: "h076_brute_mage",
    archetype: "suporte de alto corpo, multicast e buffs simples",
    preferredPositions: [5],
    buildIdentity: "support_utility",
    startingItems: ["i001_regen_rations", "i003_mana_clarity", "i004_burst_mango", "i008_observer_eye", "i009_sentry_eye", "i068_magic_wand"],
    earlyItems: ["i074_tranquil_boots", "i143_spirit_urn", "i148_pavise_barrier"],
    coreItems: ["i092_force_staff_generic", "i093_glimmer_cloak_generic", "i145_healing_mechanism", "i146_guardian_boots_generic"],
    luxuryItems: ["i094_cyclone_scepter", "i147_holy_locket_generic", "i139_hex_scythe_generic", "i164_essence_distiller_generic"],
    situationalItems: ["i144_spirit_vessel_generic", "i118_team_pipe_barrier", "i116_team_crimson_barrier", "i112_emergency_disk", "i113_lotus_shell"],
    neutralPreferences: ["i171_t1_survival_pouch", "i173_t2_dragon_scale", "i178_t3_titan_sliver", "i186_t4_trickster_cloak", "i188_t4_ancient_guardian", "i208_e013_resolute"],
    aiWarnings: ["do_not_skip_detection_and_save_items", "do_not_buy_ranged_only_items"]
  },
  {
    heroId: "h077_decay_zombie",
    archetype: "frontliner de decomposição, lápide e roubo de força",
    preferredPositions: [3, 5],
    buildIdentity: "support_utility",
    startingItems: ["i001_regen_rations", "i003_mana_clarity", "i004_burst_mango", "i008_observer_eye", "i009_sentry_eye", "i068_magic_wand"],
    earlyItems: ["i074_tranquil_boots", "i143_spirit_urn", "i148_pavise_barrier"],
    coreItems: ["i092_force_staff_generic", "i093_glimmer_cloak_generic", "i145_healing_mechanism", "i146_guardian_boots_generic"],
    luxuryItems: ["i094_cyclone_scepter", "i147_holy_locket_generic", "i139_hex_scythe_generic", "i164_essence_distiller_generic"],
    situationalItems: ["i144_spirit_vessel_generic", "i118_team_pipe_barrier", "i116_team_crimson_barrier", "i112_emergency_disk", "i113_lotus_shell"],
    neutralPreferences: ["i171_t1_survival_pouch", "i173_t2_dragon_scale", "i178_t3_titan_sliver", "i186_t4_trickster_cloak", "i188_t4_ancient_guardian", "i208_e013_resolute"],
    aiWarnings: ["do_not_skip_detection_and_save_items", "do_not_buy_ranged_only_items"]
  },
  {
    heroId: "h078_spell_thief",
    archetype: "suporte universal de telecinese e roubo de magia",
    preferredPositions: [4, 5],
    buildIdentity: "support_utility",
    startingItems: ["i001_regen_rations", "i003_mana_clarity", "i004_burst_mango", "i008_observer_eye", "i009_sentry_eye", "i068_magic_wand"],
    earlyItems: ["i074_tranquil_boots", "i143_spirit_urn", "i148_pavise_barrier"],
    coreItems: ["i092_force_staff_generic", "i093_glimmer_cloak_generic", "i145_healing_mechanism", "i146_guardian_boots_generic"],
    luxuryItems: ["i094_cyclone_scepter", "i147_holy_locket_generic", "i139_hex_scythe_generic", "i164_essence_distiller_generic"],
    situationalItems: ["i144_spirit_vessel_generic", "i118_team_pipe_barrier", "i116_team_crimson_barrier", "i112_emergency_disk", "i113_lotus_shell"],
    neutralPreferences: ["i167_t1_arcane_bracelet", "i181_t3_psychic_headband", "i182_t3_quickening_charm", "i184_t4_spell_prism", "i189_t4_timeless_relic", "i204_e009_focused"],
    aiWarnings: ["do_not_skip_detection_and_save_items", "protect_mana_pool_and_cooldowns"]
  },
  {
    heroId: "h079_storm_disruptor",
    archetype: "suporte de reposicionamento, campo cinético e tempestade",
    preferredPositions: [5],
    buildIdentity: "support_utility",
    startingItems: ["i001_regen_rations", "i003_mana_clarity", "i004_burst_mango", "i008_observer_eye", "i009_sentry_eye", "i068_magic_wand"],
    earlyItems: ["i074_tranquil_boots", "i143_spirit_urn", "i148_pavise_barrier"],
    coreItems: ["i092_force_staff_generic", "i093_glimmer_cloak_generic", "i145_healing_mechanism", "i146_guardian_boots_generic"],
    luxuryItems: ["i094_cyclone_scepter", "i147_holy_locket_generic", "i139_hex_scythe_generic", "i164_essence_distiller_generic"],
    situationalItems: ["i144_spirit_vessel_generic", "i118_team_pipe_barrier", "i116_team_crimson_barrier", "i112_emergency_disk", "i113_lotus_shell"],
    neutralPreferences: ["i167_t1_arcane_bracelet", "i181_t3_psychic_headband", "i182_t3_quickening_charm", "i184_t4_spell_prism", "i189_t4_timeless_relic", "i204_e009_focused"],
    aiWarnings: ["do_not_skip_detection_and_save_items", "protect_mana_pool_and_cooldowns"]
  },
  {
    heroId: "h080_carapace_assassin",
    archetype: "assassino de carapaça, mana burn e espinhos",
    preferredPositions: [4],
    buildIdentity: "support_utility",
    startingItems: ["i001_regen_rations", "i003_mana_clarity", "i006_team_smoke", "i008_observer_eye", "i009_sentry_eye", "i068_magic_wand"],
    earlyItems: ["i073_arcane_boots", "i143_spirit_urn", "i150_war_drums_generic"],
    coreItems: ["i083_diffusal_edge", "i084_dispersion_edge", "i092_force_staff_generic", "i094_cyclone_scepter", "i149_solar_crest_generic", "i151_bearing_boots_generic"],
    luxuryItems: ["i139_hex_scythe_generic", "i135_grand_spell_scepter", "i095_wind_ascension", "i164_essence_distiller_generic"],
    situationalItems: ["i093_glimmer_cloak_generic", "i144_spirit_vessel_generic", "i118_team_pipe_barrier", "i116_team_crimson_barrier", "i113_lotus_shell"],
    neutralPreferences: ["i170_t1_broom_charm", "i176_t2_bullwhip_generic", "i180_t3_ceremonial_robe", "i184_t4_spell_prism", "i192_t5_mirror_shield", "i210_e015_visionary"],
    aiWarnings: ["do_not_skip_detection_and_save_items", "do_not_buy_ranged_only_items"]
  },
  {
    heroId: "h081_naga_siren",
    archetype: "carry de ilusões, rede e canção global curta",
    preferredPositions: [1],
    buildIdentity: "agility_right_click_core",
    startingItems: ["i001_regen_rations", "i002_healing_salve", "i004_burst_mango", "i029_quelling_hatchet", "i066_agility_band", "i068_magic_wand"],
    earlyItems: ["i072_attribute_treads", "i077_falcon_blade_generic"],
    coreItems: ["i153_dominator_helm", "i154_overlord_helm", "i119_assault_aura_plate", "i083_diffusal_edge", "i106_mirror_style", "i108_frost_orb_core"],
    luxuryItems: ["i130_great_crit_blade", "i131_true_strike_staff", "i134_moon_shard_generic", "i133_divine_relic"],
    situationalItems: ["i110_spellproof_crown", "i111_link_barrier_sphere", "i112_emergency_disk", "i122_armor_corruptor", "i128_abyssal_lockblade", "i149_solar_crest_generic", "i152_vampire_aura_mask"],
    neutralPreferences: ["i166_t1_duelist_gloves", "i173_t2_dragon_scale", "i178_t3_titan_sliver", "i185_t4_ninja_gear", "i190_t5_apex_shard", "i207_e012_hasty"],
    aiWarnings: ["avoid_greed_if_team_is_behind", "do_not_buy_ranged_only_items"]
  },
  {
    heroId: "h082_light_keeper",
    archetype: "suporte de luz, mana, onda carregada e recall",
    preferredPositions: [5],
    buildIdentity: "support_utility",
    startingItems: ["i001_regen_rations", "i003_mana_clarity", "i004_burst_mango", "i008_observer_eye", "i009_sentry_eye", "i068_magic_wand"],
    earlyItems: ["i074_tranquil_boots", "i143_spirit_urn", "i148_pavise_barrier"],
    coreItems: ["i092_force_staff_generic", "i093_glimmer_cloak_generic", "i145_healing_mechanism", "i146_guardian_boots_generic"],
    luxuryItems: ["i094_cyclone_scepter", "i147_holy_locket_generic", "i139_hex_scythe_generic", "i164_essence_distiller_generic"],
    situationalItems: ["i144_spirit_vessel_generic", "i118_team_pipe_barrier", "i116_team_crimson_barrier", "i112_emergency_disk", "i113_lotus_shell"],
    neutralPreferences: ["i167_t1_arcane_bracelet", "i181_t3_psychic_headband", "i182_t3_quickening_charm", "i184_t4_spell_prism", "i189_t4_timeless_relic", "i204_e009_focused"],
    aiWarnings: ["do_not_skip_detection_and_save_items", "protect_mana_pool_and_cooldowns"]
  },
  {
    heroId: "h083_spirit_tether",
    archetype: "suporte de vínculo, cura compartilhada e relocação",
    preferredPositions: [5],
    buildIdentity: "support_utility",
    startingItems: ["i001_regen_rations", "i003_mana_clarity", "i004_burst_mango", "i008_observer_eye", "i009_sentry_eye", "i068_magic_wand"],
    earlyItems: ["i074_tranquil_boots", "i143_spirit_urn", "i148_pavise_barrier"],
    coreItems: ["i092_force_staff_generic", "i093_glimmer_cloak_generic", "i145_healing_mechanism", "i146_guardian_boots_generic"],
    luxuryItems: ["i094_cyclone_scepter", "i147_holy_locket_generic", "i139_hex_scythe_generic", "i164_essence_distiller_generic"],
    situationalItems: ["i147_holy_locket_generic", "i164_essence_distiller_generic", "i144_spirit_vessel_generic", "i118_team_pipe_barrier", "i116_team_crimson_barrier", "i112_emergency_disk", "i113_lotus_shell"],
    neutralPreferences: ["i170_t1_broom_charm", "i176_t2_bullwhip_generic", "i180_t3_ceremonial_robe", "i184_t4_spell_prism", "i192_t5_mirror_shield", "i210_e015_visionary"],
    aiWarnings: ["do_not_skip_detection_and_save_items"]
  },
  {
    heroId: "h084_gargoyle_brood",
    archetype: "summoner de familiares, camadas defensivas e burst",
    preferredPositions: [2, 3],
    buildIdentity: "hybrid_core_or_utility",
    startingItems: ["i001_regen_rations", "i003_mana_clarity", "i004_burst_mango", "i068_magic_wand"],
    earlyItems: ["i073_arcane_boots", "i096_cast_range_lens", "i077_falcon_blade_generic"],
    coreItems: ["i153_dominator_helm", "i154_overlord_helm", "i119_assault_aura_plate", "i101_spell_kaya", "i135_grand_spell_scepter", "i137_octarine_core_generic"],
    luxuryItems: ["i138_refresh_orb_generic", "i159_parasma_generic", "i160_revenant_brooch_generic", "i095_wind_ascension"],
    situationalItems: ["i110_spellproof_crown", "i111_link_barrier_sphere", "i112_emergency_disk", "i113_lotus_shell", "i149_solar_crest_generic", "i152_vampire_aura_mask"],
    neutralPreferences: ["i170_t1_broom_charm", "i176_t2_bullwhip_generic", "i180_t3_ceremonial_robe", "i184_t4_spell_prism", "i192_t5_mirror_shield", "i210_e015_visionary"],
    aiWarnings: []
  },
  {
    heroId: "h085_vampire_carry",
    archetype: "carry de roubo de atributos, pacto e regeneração nas sombras",
    preferredPositions: [1],
    buildIdentity: "agility_right_click_core",
    startingItems: ["i001_regen_rations", "i002_healing_salve", "i004_burst_mango", "i029_quelling_hatchet", "i066_agility_band", "i068_magic_wand"],
    earlyItems: ["i072_attribute_treads", "i077_falcon_blade_generic"],
    coreItems: ["i079_frenzy_mask", "i103_speed_yasha", "i129_crystal_edge", "i121_satanic_bloodstone"],
    luxuryItems: ["i130_great_crit_blade", "i131_true_strike_staff", "i134_moon_shard_generic", "i133_divine_relic"],
    situationalItems: ["i110_spellproof_crown", "i111_link_barrier_sphere", "i112_emergency_disk", "i122_armor_corruptor", "i128_abyssal_lockblade"],
    neutralPreferences: ["i166_t1_duelist_gloves", "i173_t2_dragon_scale", "i178_t3_titan_sliver", "i185_t4_ninja_gear", "i190_t5_apex_shard", "i207_e012_hasty"],
    aiWarnings: ["avoid_greed_if_team_is_behind", "do_not_buy_ranged_only_items"]
  },
  {
    heroId: "h086_stone_gaze_guardian",
    archetype: "carry tanque de mana shield, split shot e petrificação",
    preferredPositions: [1],
    buildIdentity: "agility_right_click_core",
    startingItems: ["i001_regen_rations", "i002_healing_salve", "i004_burst_mango", "i029_quelling_hatchet", "i066_agility_band", "i068_magic_wand"],
    earlyItems: ["i072_attribute_treads", "i077_falcon_blade_generic"],
    coreItems: ["i085_reach_lance", "i086_force_pike", "i124_chain_lightning_hammer", "i130_great_crit_blade"],
    luxuryItems: ["i130_great_crit_blade", "i131_true_strike_staff", "i134_moon_shard_generic", "i133_divine_relic"],
    situationalItems: ["i110_spellproof_crown", "i111_link_barrier_sphere", "i112_emergency_disk", "i122_armor_corruptor", "i128_abyssal_lockblade"],
    neutralPreferences: ["i166_t1_duelist_gloves", "i173_t2_dragon_scale", "i178_t3_titan_sliver", "i185_t4_ninja_gear", "i190_t5_apex_shard", "i207_e012_hasty"],
    aiWarnings: ["avoid_greed_if_team_is_behind"]
  },
  {
    heroId: "h087_troll_switcher",
    archetype: "carry alternador de melee/ranged e fúria de ataque",
    preferredPositions: [1],
    buildIdentity: "agility_right_click_core",
    startingItems: ["i001_regen_rations", "i002_healing_salve", "i004_burst_mango", "i029_quelling_hatchet", "i066_agility_band", "i068_magic_wand"],
    earlyItems: ["i072_attribute_treads", "i077_falcon_blade_generic"],
    coreItems: ["i085_reach_lance", "i086_force_pike", "i124_chain_lightning_hammer", "i130_great_crit_blade"],
    luxuryItems: ["i130_great_crit_blade", "i131_true_strike_staff", "i134_moon_shard_generic", "i133_divine_relic"],
    situationalItems: ["i110_spellproof_crown", "i111_link_barrier_sphere", "i112_emergency_disk", "i122_armor_corruptor", "i128_abyssal_lockblade"],
    neutralPreferences: ["i166_t1_duelist_gloves", "i173_t2_dragon_scale", "i178_t3_titan_sliver", "i185_t4_ninja_gear", "i190_t5_apex_shard", "i207_e012_hasty"],
    aiWarnings: ["avoid_greed_if_team_is_behind"]
  },
  {
    heroId: "h088_centaur_retaliator",
    archetype: "tanque de retaliação, stun e corrida global",
    preferredPositions: [3],
    buildIdentity: "offlane_initiator_tank",
    startingItems: ["i001_regen_rations", "i002_healing_salve", "i004_burst_mango", "i065_strength_bracer", "i068_magic_wand"],
    earlyItems: ["i071_phase_warboots", "i077_falcon_blade_generic", "i114_blade_return_mail"],
    coreItems: ["i055_blink_core", "i089_overwhelming_blink", "i116_team_crimson_barrier", "i118_team_pipe_barrier"],
    luxuryItems: ["i119_assault_aura_plate", "i120_giant_heart", "i128_abyssal_lockblade", "i135_grand_spell_scepter"],
    situationalItems: ["i107_disarm_halberd", "i110_spellproof_crown", "i111_link_barrier_sphere", "i113_lotus_shell", "i100_frost_armor_plate"],
    neutralPreferences: ["i171_t1_survival_pouch", "i173_t2_dragon_scale", "i178_t3_titan_sliver", "i186_t4_trickster_cloak", "i188_t4_ancient_guardian", "i208_e013_resolute"],
    aiWarnings: ["prioritize_blink_or_reach_before_greedy_auras", "do_not_buy_ranged_only_items"]
  },
  {
    heroId: "h089_gravity_general",
    archetype: "iniciador universal de empurrão, buff físico e agrupamento",
    preferredPositions: [3],
    buildIdentity: "hybrid_core_or_utility",
    startingItems: ["i001_regen_rations", "i003_mana_clarity", "i004_burst_mango", "i068_magic_wand"],
    earlyItems: ["i073_arcane_boots", "i096_cast_range_lens", "i077_falcon_blade_generic"],
    coreItems: ["i153_dominator_helm", "i154_overlord_helm", "i119_assault_aura_plate", "i101_spell_kaya", "i135_grand_spell_scepter", "i137_octarine_core_generic"],
    luxuryItems: ["i138_refresh_orb_generic", "i159_parasma_generic", "i160_revenant_brooch_generic", "i095_wind_ascension"],
    situationalItems: ["i110_spellproof_crown", "i111_link_barrier_sphere", "i112_emergency_disk", "i113_lotus_shell", "i149_solar_crest_generic", "i152_vampire_aura_mask"],
    neutralPreferences: ["i170_t1_broom_charm", "i176_t2_bullwhip_generic", "i180_t3_ceremonial_robe", "i184_t4_spell_prism", "i192_t5_mirror_shield", "i210_e015_visionary"],
    aiWarnings: ["prioritize_blink_or_reach_before_greedy_auras", "do_not_buy_ranged_only_items"]
  },
  {
    heroId: "h090_timber_mech",
    archetype: "offlaner mecânico de corrente, corte e acúmulo de armadura",
    preferredPositions: [3],
    buildIdentity: "offlane_initiator_tank",
    startingItems: ["i001_regen_rations", "i002_healing_salve", "i004_burst_mango", "i065_strength_bracer", "i068_magic_wand"],
    earlyItems: ["i071_phase_warboots", "i077_falcon_blade_generic", "i114_blade_return_mail"],
    coreItems: ["i055_blink_core", "i089_overwhelming_blink", "i116_team_crimson_barrier", "i118_team_pipe_barrier"],
    luxuryItems: ["i119_assault_aura_plate", "i120_giant_heart", "i128_abyssal_lockblade", "i135_grand_spell_scepter"],
    situationalItems: ["i107_disarm_halberd", "i110_spellproof_crown", "i111_link_barrier_sphere", "i113_lotus_shell", "i100_frost_armor_plate"],
    neutralPreferences: ["i171_t1_survival_pouch", "i173_t2_dragon_scale", "i178_t3_titan_sliver", "i186_t4_trickster_cloak", "i188_t4_ancient_guardian", "i208_e013_resolute"],
    aiWarnings: ["do_not_buy_ranged_only_items"]
  },
  {
    heroId: "h091_quill_tank",
    archetype: "tanque de espinhos, gosma e dano acumulativo",
    preferredPositions: [3],
    buildIdentity: "offlane_initiator_tank",
    startingItems: ["i001_regen_rations", "i002_healing_salve", "i004_burst_mango", "i065_strength_bracer", "i068_magic_wand"],
    earlyItems: ["i071_phase_warboots", "i077_falcon_blade_generic", "i114_blade_return_mail"],
    coreItems: ["i055_blink_core", "i089_overwhelming_blink", "i116_team_crimson_barrier", "i118_team_pipe_barrier"],
    luxuryItems: ["i119_assault_aura_plate", "i120_giant_heart", "i128_abyssal_lockblade", "i135_grand_spell_scepter"],
    situationalItems: ["i107_disarm_halberd", "i110_spellproof_crown", "i111_link_barrier_sphere", "i113_lotus_shell", "i100_frost_armor_plate"],
    neutralPreferences: ["i171_t1_survival_pouch", "i173_t2_dragon_scale", "i178_t3_titan_sliver", "i186_t4_trickster_cloak", "i188_t4_ancient_guardian", "i208_e013_resolute"],
    aiWarnings: ["do_not_buy_ranged_only_items"]
  },
  {
    heroId: "h092_polar_berserker",
    archetype: "lutador polar de salto, bloqueio de terreno e soco crítico",
    preferredPositions: [1, 3],
    buildIdentity: "offlane_initiator_tank",
    startingItems: ["i001_regen_rations", "i002_healing_salve", "i004_burst_mango", "i065_strength_bracer", "i068_magic_wand"],
    earlyItems: ["i071_phase_warboots", "i077_falcon_blade_generic", "i114_blade_return_mail"],
    coreItems: ["i055_blink_core", "i089_overwhelming_blink", "i116_team_crimson_barrier", "i118_team_pipe_barrier"],
    luxuryItems: ["i119_assault_aura_plate", "i120_giant_heart", "i128_abyssal_lockblade", "i135_grand_spell_scepter"],
    situationalItems: ["i107_disarm_halberd", "i110_spellproof_crown", "i111_link_barrier_sphere", "i113_lotus_shell", "i100_frost_armor_plate"],
    neutralPreferences: ["i166_t1_duelist_gloves", "i173_t2_dragon_scale", "i178_t3_titan_sliver", "i185_t4_ninja_gear", "i190_t5_apex_shard", "i207_e012_hasty"],
    aiWarnings: ["avoid_greed_if_team_is_behind", "prioritize_blink_or_reach_before_greedy_auras", "do_not_buy_ranged_only_items"]
  },
  {
    heroId: "h093_sky_mage",
    archetype: "mago de longo alcance, silêncio e burst místico",
    preferredPositions: [2, 4],
    buildIdentity: "magic_core",
    startingItems: ["i001_regen_rations", "i003_mana_clarity", "i006_team_smoke", "i008_observer_eye", "i009_sentry_eye", "i068_magic_wand"],
    earlyItems: ["i073_arcane_boots", "i143_spirit_urn", "i150_war_drums_generic"],
    coreItems: ["i092_force_staff_generic", "i094_cyclone_scepter", "i149_solar_crest_generic", "i151_bearing_boots_generic"],
    luxuryItems: ["i139_hex_scythe_generic", "i135_grand_spell_scepter", "i095_wind_ascension", "i164_essence_distiller_generic"],
    situationalItems: ["i093_glimmer_cloak_generic", "i144_spirit_vessel_generic", "i118_team_pipe_barrier", "i116_team_crimson_barrier", "i113_lotus_shell"],
    neutralPreferences: ["i167_t1_arcane_bracelet", "i181_t3_psychic_headband", "i182_t3_quickening_charm", "i184_t4_spell_prism", "i189_t4_timeless_relic", "i204_e009_focused"],
    aiWarnings: ["protect_mana_pool_and_cooldowns"]
  },
  {
    heroId: "h094_dark_paladin_2",
    archetype: "cavaleiro sombrio de escudo explosivo e cura invertida",
    preferredPositions: [3, 5],
    buildIdentity: "support_utility",
    startingItems: ["i001_regen_rations", "i003_mana_clarity", "i004_burst_mango", "i008_observer_eye", "i009_sentry_eye", "i068_magic_wand"],
    earlyItems: ["i074_tranquil_boots", "i143_spirit_urn", "i148_pavise_barrier"],
    coreItems: ["i092_force_staff_generic", "i093_glimmer_cloak_generic", "i145_healing_mechanism", "i146_guardian_boots_generic"],
    luxuryItems: ["i094_cyclone_scepter", "i147_holy_locket_generic", "i139_hex_scythe_generic", "i164_essence_distiller_generic"],
    situationalItems: ["i147_holy_locket_generic", "i164_essence_distiller_generic", "i144_spirit_vessel_generic", "i118_team_pipe_barrier", "i116_team_crimson_barrier", "i112_emergency_disk", "i113_lotus_shell"],
    neutralPreferences: ["i171_t1_survival_pouch", "i173_t2_dragon_scale", "i178_t3_titan_sliver", "i186_t4_trickster_cloak", "i188_t4_ancient_guardian", "i208_e013_resolute"],
    aiWarnings: ["do_not_skip_detection_and_save_items", "do_not_buy_ranged_only_items"]
  },
  {
    heroId: "h095_ancient_titan",
    archetype: "iniciador espiritual de eco, sono e redução de resistência",
    preferredPositions: [3, 4],
    buildIdentity: "support_utility",
    startingItems: ["i001_regen_rations", "i003_mana_clarity", "i006_team_smoke", "i008_observer_eye", "i009_sentry_eye", "i068_magic_wand"],
    earlyItems: ["i073_arcane_boots", "i143_spirit_urn", "i150_war_drums_generic"],
    coreItems: ["i092_force_staff_generic", "i094_cyclone_scepter", "i149_solar_crest_generic", "i151_bearing_boots_generic"],
    luxuryItems: ["i139_hex_scythe_generic", "i135_grand_spell_scepter", "i095_wind_ascension", "i164_essence_distiller_generic"],
    situationalItems: ["i093_glimmer_cloak_generic", "i144_spirit_vessel_generic", "i118_team_pipe_barrier", "i116_team_crimson_barrier", "i113_lotus_shell"],
    neutralPreferences: ["i171_t1_survival_pouch", "i173_t2_dragon_scale", "i178_t3_titan_sliver", "i186_t4_trickster_cloak", "i188_t4_ancient_guardian", "i208_e013_resolute"],
    aiWarnings: ["do_not_skip_detection_and_save_items", "prioritize_blink_or_reach_before_greedy_auras", "do_not_buy_ranged_only_items"]
  },
  {
    heroId: "h096_arena_duelist",
    archetype: "duelista de comando, purga e vitória escalável",
    preferredPositions: [1, 3],
    buildIdentity: "offlane_initiator_tank",
    startingItems: ["i001_regen_rations", "i002_healing_salve", "i004_burst_mango", "i065_strength_bracer", "i068_magic_wand"],
    earlyItems: ["i071_phase_warboots", "i077_falcon_blade_generic", "i114_blade_return_mail"],
    coreItems: ["i055_blink_core", "i089_overwhelming_blink", "i116_team_crimson_barrier", "i118_team_pipe_barrier"],
    luxuryItems: ["i119_assault_aura_plate", "i120_giant_heart", "i128_abyssal_lockblade", "i135_grand_spell_scepter"],
    situationalItems: ["i107_disarm_halberd", "i110_spellproof_crown", "i111_link_barrier_sphere", "i113_lotus_shell", "i100_frost_armor_plate"],
    neutralPreferences: ["i166_t1_duelist_gloves", "i173_t2_dragon_scale", "i178_t3_titan_sliver", "i185_t4_ninja_gear", "i190_t5_apex_shard", "i207_e012_hasty"],
    aiWarnings: ["avoid_greed_if_team_is_behind", "prioritize_blink_or_reach_before_greedy_auras", "do_not_buy_ranged_only_items"]
  },
  {
    heroId: "h097_demolition_goblin",
    archetype: "zoner de bombas, minas e explosão controlada",
    preferredPositions: [4],
    buildIdentity: "support_utility",
    startingItems: ["i001_regen_rations", "i003_mana_clarity", "i006_team_smoke", "i008_observer_eye", "i009_sentry_eye", "i068_magic_wand"],
    earlyItems: ["i073_arcane_boots", "i143_spirit_urn", "i150_war_drums_generic"],
    coreItems: ["i153_dominator_helm", "i154_overlord_helm", "i119_assault_aura_plate", "i092_force_staff_generic", "i094_cyclone_scepter", "i149_solar_crest_generic"],
    luxuryItems: ["i139_hex_scythe_generic", "i135_grand_spell_scepter", "i095_wind_ascension", "i164_essence_distiller_generic"],
    situationalItems: ["i093_glimmer_cloak_generic", "i144_spirit_vessel_generic", "i118_team_pipe_barrier", "i116_team_crimson_barrier", "i113_lotus_shell", "i149_solar_crest_generic", "i152_vampire_aura_mask"],
    neutralPreferences: ["i167_t1_arcane_bracelet", "i181_t3_psychic_headband", "i182_t3_quickening_charm", "i184_t4_spell_prism", "i189_t4_timeless_relic", "i204_e009_focused"],
    aiWarnings: ["do_not_skip_detection_and_save_items", "protect_mana_pool_and_cooldowns"]
  },
  {
    heroId: "h098_ember_duelist",
    archetype: "espadachim de fogo, correntes e remanescentes",
    preferredPositions: [1, 2],
    buildIdentity: "magic_core",
    startingItems: ["i001_regen_rations", "i003_mana_clarity", "i004_burst_mango", "i011_refillable_bottle", "i067_intelligence_talisman", "i068_magic_wand"],
    earlyItems: ["i073_arcane_boots", "i096_cast_range_lens", "i156_phylactery_focus"],
    coreItems: ["i101_spell_kaya", "i142_burst_wand", "i140_silence_orchid", "i135_grand_spell_scepter"],
    luxuryItems: ["i137_octarine_core_generic", "i138_refresh_orb_generic", "i139_hex_scythe_generic", "i159_parasma_generic"],
    situationalItems: ["i110_spellproof_crown", "i111_link_barrier_sphere", "i112_emergency_disk", "i098_ethereal_focus_blade", "i113_lotus_shell"],
    neutralPreferences: ["i166_t1_duelist_gloves", "i173_t2_dragon_scale", "i178_t3_titan_sliver", "i185_t4_ninja_gear", "i190_t5_apex_shard", "i207_e012_hasty"],
    aiWarnings: ["avoid_greed_if_team_is_behind", "do_not_buy_ranged_only_items", "protect_mana_pool_and_cooldowns"]
  },
  {
    heroId: "h099_stone_monk",
    archetype: "monge universal de chutes, reposicionamento e marcas",
    preferredPositions: [3, 4],
    buildIdentity: "support_utility",
    startingItems: ["i001_regen_rations", "i003_mana_clarity", "i006_team_smoke", "i008_observer_eye", "i009_sentry_eye", "i068_magic_wand"],
    earlyItems: ["i073_arcane_boots", "i143_spirit_urn", "i150_war_drums_generic"],
    coreItems: ["i092_force_staff_generic", "i094_cyclone_scepter", "i149_solar_crest_generic", "i151_bearing_boots_generic", "i140_silence_orchid"],
    luxuryItems: ["i139_hex_scythe_generic", "i135_grand_spell_scepter", "i095_wind_ascension", "i164_essence_distiller_generic"],
    situationalItems: ["i093_glimmer_cloak_generic", "i144_spirit_vessel_generic", "i118_team_pipe_barrier", "i116_team_crimson_barrier", "i113_lotus_shell"],
    neutralPreferences: ["i170_t1_broom_charm", "i176_t2_bullwhip_generic", "i180_t3_ceremonial_robe", "i184_t4_spell_prism", "i192_t5_mirror_shield", "i210_e015_visionary"],
    aiWarnings: ["do_not_skip_detection_and_save_items", "prioritize_blink_or_reach_before_greedy_auras", "do_not_buy_ranged_only_items"]
  },
  {
    heroId: "h100_abyss_lord",
    archetype: "senhor abissal de aura, portal e zona de fogo",
    preferredPositions: [3],
    buildIdentity: "offlane_initiator_tank",
    startingItems: ["i001_regen_rations", "i002_healing_salve", "i004_burst_mango", "i065_strength_bracer", "i068_magic_wand"],
    earlyItems: ["i071_phase_warboots", "i077_falcon_blade_generic", "i114_blade_return_mail"],
    coreItems: ["i153_dominator_helm", "i154_overlord_helm", "i119_assault_aura_plate", "i055_blink_core", "i089_overwhelming_blink", "i116_team_crimson_barrier"],
    luxuryItems: ["i119_assault_aura_plate", "i120_giant_heart", "i128_abyssal_lockblade", "i135_grand_spell_scepter"],
    situationalItems: ["i107_disarm_halberd", "i110_spellproof_crown", "i111_link_barrier_sphere", "i113_lotus_shell", "i100_frost_armor_plate", "i149_solar_crest_generic", "i152_vampire_aura_mask"],
    neutralPreferences: ["i171_t1_survival_pouch", "i173_t2_dragon_scale", "i178_t3_titan_sliver", "i186_t4_trickster_cloak", "i188_t4_ancient_guardian", "i208_e013_resolute"],
    aiWarnings: ["do_not_buy_ranged_only_items"]
  },
  {
    heroId: "h101_demon_metamorph",
    archetype: "carry demoníaco de metamorfose, ilusões e troca de vida",
    preferredPositions: [1],
    buildIdentity: "agility_right_click_core",
    startingItems: ["i001_regen_rations", "i002_healing_salve", "i004_burst_mango", "i029_quelling_hatchet", "i066_agility_band", "i068_magic_wand"],
    earlyItems: ["i072_attribute_treads", "i077_falcon_blade_generic"],
    coreItems: ["i153_dominator_helm", "i154_overlord_helm", "i119_assault_aura_plate", "i083_diffusal_edge", "i106_mirror_style", "i108_frost_orb_core"],
    luxuryItems: ["i130_great_crit_blade", "i131_true_strike_staff", "i134_moon_shard_generic", "i133_divine_relic"],
    situationalItems: ["i110_spellproof_crown", "i111_link_barrier_sphere", "i112_emergency_disk", "i122_armor_corruptor", "i128_abyssal_lockblade", "i149_solar_crest_generic", "i152_vampire_aura_mask"],
    neutralPreferences: ["i166_t1_duelist_gloves", "i173_t2_dragon_scale", "i178_t3_titan_sliver", "i185_t4_ninja_gear", "i190_t5_apex_shard", "i207_e012_hasty"],
    aiWarnings: ["avoid_greed_if_team_is_behind"]
  },
  {
    heroId: "h102_solar_bird",
    archetype: "ave solar de cura, mergulho e supernova",
    preferredPositions: [3, 4],
    buildIdentity: "support_utility",
    startingItems: ["i001_regen_rations", "i003_mana_clarity", "i006_team_smoke", "i008_observer_eye", "i009_sentry_eye", "i068_magic_wand"],
    earlyItems: ["i073_arcane_boots", "i143_spirit_urn", "i150_war_drums_generic"],
    coreItems: ["i092_force_staff_generic", "i094_cyclone_scepter", "i149_solar_crest_generic", "i151_bearing_boots_generic"],
    luxuryItems: ["i139_hex_scythe_generic", "i135_grand_spell_scepter", "i095_wind_ascension", "i164_essence_distiller_generic"],
    situationalItems: ["i147_holy_locket_generic", "i164_essence_distiller_generic", "i093_glimmer_cloak_generic", "i144_spirit_vessel_generic", "i118_team_pipe_barrier", "i116_team_crimson_barrier", "i113_lotus_shell"],
    neutralPreferences: ["i167_t1_arcane_bracelet", "i181_t3_psychic_headband", "i182_t3_quickening_charm", "i184_t4_spell_prism", "i189_t4_timeless_relic", "i204_e009_focused"],
    aiWarnings: ["do_not_skip_detection_and_save_items", "protect_mana_pool_and_cooldowns"]
  },
  {
    heroId: "h103_fate_oracle",
    archetype: "suporte de destino, purga, cura explosiva e falsa promessa",
    preferredPositions: [5],
    buildIdentity: "support_utility",
    startingItems: ["i001_regen_rations", "i003_mana_clarity", "i004_burst_mango", "i008_observer_eye", "i009_sentry_eye", "i068_magic_wand"],
    earlyItems: ["i074_tranquil_boots", "i143_spirit_urn", "i148_pavise_barrier"],
    coreItems: ["i092_force_staff_generic", "i093_glimmer_cloak_generic", "i145_healing_mechanism", "i146_guardian_boots_generic"],
    luxuryItems: ["i094_cyclone_scepter", "i147_holy_locket_generic", "i139_hex_scythe_generic", "i164_essence_distiller_generic"],
    situationalItems: ["i147_holy_locket_generic", "i164_essence_distiller_generic", "i144_spirit_vessel_generic", "i118_team_pipe_barrier", "i116_team_crimson_barrier", "i112_emergency_disk", "i113_lotus_shell"],
    neutralPreferences: ["i167_t1_arcane_bracelet", "i181_t3_psychic_headband", "i182_t3_quickening_charm", "i184_t4_spell_prism", "i189_t4_timeless_relic", "i204_e009_focused"],
    aiWarnings: ["do_not_skip_detection_and_save_items", "protect_mana_pool_and_cooldowns"]
  },
  {
    heroId: "h104_winter_controller",
    archetype: "suporte de gelo, cura protetiva e maldição em área",
    preferredPositions: [5],
    buildIdentity: "support_utility",
    startingItems: ["i001_regen_rations", "i003_mana_clarity", "i004_burst_mango", "i008_observer_eye", "i009_sentry_eye", "i068_magic_wand"],
    earlyItems: ["i074_tranquil_boots", "i143_spirit_urn", "i148_pavise_barrier"],
    coreItems: ["i092_force_staff_generic", "i093_glimmer_cloak_generic", "i145_healing_mechanism", "i146_guardian_boots_generic"],
    luxuryItems: ["i094_cyclone_scepter", "i147_holy_locket_generic", "i139_hex_scythe_generic", "i164_essence_distiller_generic"],
    situationalItems: ["i147_holy_locket_generic", "i164_essence_distiller_generic", "i144_spirit_vessel_generic", "i118_team_pipe_barrier", "i116_team_crimson_barrier", "i112_emergency_disk", "i113_lotus_shell"],
    neutralPreferences: ["i167_t1_arcane_bracelet", "i181_t3_psychic_headband", "i182_t3_quickening_charm", "i184_t4_spell_prism", "i189_t4_timeless_relic", "i204_e009_focused"],
    aiWarnings: ["do_not_skip_detection_and_save_items", "protect_mana_pool_and_cooldowns"]
  },
  {
    heroId: "h105_arc_double",
    archetype: "mago/carry de duplicata temporária, campo e fluxo",
    preferredPositions: [1, 2],
    buildIdentity: "agility_right_click_core",
    startingItems: ["i001_regen_rations", "i002_healing_salve", "i004_burst_mango", "i029_quelling_hatchet", "i066_agility_band", "i068_magic_wand"],
    earlyItems: ["i072_attribute_treads", "i077_falcon_blade_generic"],
    coreItems: ["i153_dominator_helm", "i154_overlord_helm", "i119_assault_aura_plate", "i085_reach_lance", "i086_force_pike", "i124_chain_lightning_hammer"],
    luxuryItems: ["i130_great_crit_blade", "i131_true_strike_staff", "i134_moon_shard_generic", "i133_divine_relic"],
    situationalItems: ["i110_spellproof_crown", "i111_link_barrier_sphere", "i112_emergency_disk", "i122_armor_corruptor", "i128_abyssal_lockblade", "i149_solar_crest_generic", "i152_vampire_aura_mask"],
    neutralPreferences: ["i166_t1_duelist_gloves", "i173_t2_dragon_scale", "i178_t3_titan_sliver", "i185_t4_ninja_gear", "i190_t5_apex_shard", "i207_e012_hasty"],
    aiWarnings: ["avoid_greed_if_team_is_behind"]
  },
  {
    heroId: "h106_monkey_warrior",
    archetype: "carry acrobático de árvores, clone circular e bastão",
    preferredPositions: [1, 2],
    buildIdentity: "agility_right_click_core",
    startingItems: ["i001_regen_rations", "i002_healing_salve", "i004_burst_mango", "i029_quelling_hatchet", "i066_agility_band", "i068_magic_wand"],
    earlyItems: ["i072_attribute_treads", "i077_falcon_blade_generic"],
    coreItems: ["i079_frenzy_mask", "i103_speed_yasha", "i129_crystal_edge", "i121_satanic_bloodstone"],
    luxuryItems: ["i130_great_crit_blade", "i131_true_strike_staff", "i134_moon_shard_generic", "i133_divine_relic"],
    situationalItems: ["i110_spellproof_crown", "i111_link_barrier_sphere", "i112_emergency_disk", "i122_armor_corruptor", "i128_abyssal_lockblade"],
    neutralPreferences: ["i166_t1_duelist_gloves", "i173_t2_dragon_scale", "i178_t3_titan_sliver", "i185_t4_ninja_gear", "i190_t5_apex_shard", "i207_e012_hasty"],
    aiWarnings: ["avoid_greed_if_team_is_behind", "do_not_buy_ranged_only_items"]
  },
  {
    heroId: "h107_dark_fae",
    archetype: "suporte universal de medo, raízes e burst atrasado",
    preferredPositions: [4, 5],
    buildIdentity: "support_utility",
    startingItems: ["i001_regen_rations", "i003_mana_clarity", "i004_burst_mango", "i008_observer_eye", "i009_sentry_eye", "i068_magic_wand"],
    earlyItems: ["i074_tranquil_boots", "i143_spirit_urn", "i148_pavise_barrier"],
    coreItems: ["i092_force_staff_generic", "i093_glimmer_cloak_generic", "i145_healing_mechanism", "i146_guardian_boots_generic"],
    luxuryItems: ["i094_cyclone_scepter", "i147_holy_locket_generic", "i139_hex_scythe_generic", "i164_essence_distiller_generic"],
    situationalItems: ["i144_spirit_vessel_generic", "i118_team_pipe_barrier", "i116_team_crimson_barrier", "i112_emergency_disk", "i113_lotus_shell"],
    neutralPreferences: ["i167_t1_arcane_bracelet", "i181_t3_psychic_headband", "i182_t3_quickening_charm", "i184_t4_spell_prism", "i189_t4_timeless_relic", "i204_e009_focused"],
    aiWarnings: ["do_not_skip_detection_and_save_items", "protect_mana_pool_and_cooldowns"]
  },
  {
    heroId: "h108_rolling_duelist",
    archetype: "duelista universal de dash, desarme e ultimate rolante",
    preferredPositions: [3, 4],
    buildIdentity: "support_utility",
    startingItems: ["i001_regen_rations", "i003_mana_clarity", "i006_team_smoke", "i008_observer_eye", "i009_sentry_eye", "i068_magic_wand"],
    earlyItems: ["i073_arcane_boots", "i143_spirit_urn", "i150_war_drums_generic"],
    coreItems: ["i092_force_staff_generic", "i094_cyclone_scepter", "i149_solar_crest_generic", "i151_bearing_boots_generic"],
    luxuryItems: ["i139_hex_scythe_generic", "i135_grand_spell_scepter", "i095_wind_ascension", "i164_essence_distiller_generic"],
    situationalItems: ["i093_glimmer_cloak_generic", "i144_spirit_vessel_generic", "i118_team_pipe_barrier", "i116_team_crimson_barrier", "i113_lotus_shell"],
    neutralPreferences: ["i170_t1_broom_charm", "i176_t2_bullwhip_generic", "i180_t3_ceremonial_robe", "i184_t4_spell_prism", "i192_t5_mirror_shield", "i210_e015_visionary"],
    aiWarnings: ["do_not_skip_detection_and_save_items", "prioritize_blink_or_reach_before_greedy_auras", "do_not_buy_ranged_only_items"]
  },
  {
    heroId: "h109_ink_warlock",
    archetype: "suporte de tinta, silêncio, vínculo duplo e fantasma",
    preferredPositions: [4, 5],
    buildIdentity: "support_utility",
    startingItems: ["i001_regen_rations", "i003_mana_clarity", "i004_burst_mango", "i008_observer_eye", "i009_sentry_eye", "i068_magic_wand"],
    earlyItems: ["i074_tranquil_boots", "i143_spirit_urn", "i148_pavise_barrier"],
    coreItems: ["i092_force_staff_generic", "i093_glimmer_cloak_generic", "i145_healing_mechanism", "i146_guardian_boots_generic", "i140_silence_orchid"],
    luxuryItems: ["i094_cyclone_scepter", "i147_holy_locket_generic", "i139_hex_scythe_generic", "i164_essence_distiller_generic"],
    situationalItems: ["i144_spirit_vessel_generic", "i118_team_pipe_barrier", "i116_team_crimson_barrier", "i112_emergency_disk", "i113_lotus_shell"],
    neutralPreferences: ["i167_t1_arcane_bracelet", "i181_t3_psychic_headband", "i182_t3_quickening_charm", "i184_t4_spell_prism", "i189_t4_timeless_relic", "i204_e009_focused"],
    aiWarnings: ["do_not_skip_detection_and_save_items", "protect_mana_pool_and_cooldowns"]
  },
  {
    heroId: "h110_arena_sentinel",
    archetype: "soldado de arena, lança, escudo frontal e zona de duelo",
    preferredPositions: [3],
    buildIdentity: "offlane_initiator_tank",
    startingItems: ["i001_regen_rations", "i002_healing_salve", "i004_burst_mango", "i065_strength_bracer", "i068_magic_wand"],
    earlyItems: ["i071_phase_warboots", "i077_falcon_blade_generic", "i114_blade_return_mail"],
    coreItems: ["i055_blink_core", "i089_overwhelming_blink", "i116_team_crimson_barrier", "i118_team_pipe_barrier"],
    luxuryItems: ["i119_assault_aura_plate", "i120_giant_heart", "i128_abyssal_lockblade", "i135_grand_spell_scepter"],
    situationalItems: ["i107_disarm_halberd", "i110_spellproof_crown", "i111_link_barrier_sphere", "i113_lotus_shell", "i100_frost_armor_plate"],
    neutralPreferences: ["i171_t1_survival_pouch", "i173_t2_dragon_scale", "i178_t3_titan_sliver", "i186_t4_trickster_cloak", "i188_t4_ancient_guardian", "i208_e013_resolute"],
    aiWarnings: ["prioritize_blink_or_reach_before_greedy_auras", "do_not_buy_ranged_only_items"]
  },
  {
    heroId: "h111_void_duelist",
    archetype: "universal móvel com remanescentes e controle vetorial",
    preferredPositions: [2],
    buildIdentity: "magic_core",
    startingItems: ["i001_regen_rations", "i003_mana_clarity", "i004_burst_mango", "i011_refillable_bottle", "i067_intelligence_talisman", "i068_magic_wand"],
    earlyItems: ["i073_arcane_boots", "i096_cast_range_lens", "i156_phylactery_focus"],
    coreItems: ["i101_spell_kaya", "i142_burst_wand", "i140_silence_orchid", "i135_grand_spell_scepter"],
    luxuryItems: ["i137_octarine_core_generic", "i138_refresh_orb_generic", "i139_hex_scythe_generic", "i159_parasma_generic"],
    situationalItems: ["i110_spellproof_crown", "i111_link_barrier_sphere", "i112_emergency_disk", "i098_ethereal_focus_blade", "i113_lotus_shell"],
    neutralPreferences: ["i167_t1_arcane_bracelet", "i181_t3_psychic_headband", "i182_t3_quickening_charm", "i184_t4_spell_prism", "i189_t4_timeless_relic", "i204_e009_focused"],
    aiWarnings: ["do_not_buy_ranged_only_items", "protect_mana_pool_and_cooldowns"]
  },
  {
    heroId: "h112_artillery_grandma",
    archetype: "suporte universal de poke, montaria e artilharia",
    preferredPositions: [4, 5],
    buildIdentity: "support_utility",
    startingItems: ["i001_regen_rations", "i003_mana_clarity", "i004_burst_mango", "i008_observer_eye", "i009_sentry_eye", "i068_magic_wand"],
    earlyItems: ["i074_tranquil_boots", "i143_spirit_urn", "i148_pavise_barrier"],
    coreItems: ["i092_force_staff_generic", "i093_glimmer_cloak_generic", "i145_healing_mechanism", "i146_guardian_boots_generic"],
    luxuryItems: ["i094_cyclone_scepter", "i147_holy_locket_generic", "i139_hex_scythe_generic", "i164_essence_distiller_generic"],
    situationalItems: ["i144_spirit_vessel_generic", "i118_team_pipe_barrier", "i116_team_crimson_barrier", "i112_emergency_disk", "i113_lotus_shell"],
    neutralPreferences: ["i167_t1_arcane_bracelet", "i181_t3_psychic_headband", "i182_t3_quickening_charm", "i184_t4_spell_prism", "i189_t4_timeless_relic", "i204_e009_focused"],
    aiWarnings: ["do_not_skip_detection_and_save_items", "protect_mana_pool_and_cooldowns"]
  },
  {
    heroId: "h113_forest_trickster",
    archetype: "atiradora da mata de armadilhas, boomerang e fuga",
    preferredPositions: [1, 4],
    buildIdentity: "agility_right_click_core",
    startingItems: ["i001_regen_rations", "i002_healing_salve", "i004_burst_mango", "i029_quelling_hatchet", "i066_agility_band", "i068_magic_wand"],
    earlyItems: ["i072_attribute_treads", "i077_falcon_blade_generic"],
    coreItems: ["i085_reach_lance", "i086_force_pike", "i124_chain_lightning_hammer", "i130_great_crit_blade"],
    luxuryItems: ["i130_great_crit_blade", "i131_true_strike_staff", "i134_moon_shard_generic", "i133_divine_relic"],
    situationalItems: ["i110_spellproof_crown", "i111_link_barrier_sphere", "i112_emergency_disk", "i122_armor_corruptor", "i128_abyssal_lockblade"],
    neutralPreferences: ["i166_t1_duelist_gloves", "i173_t2_dragon_scale", "i178_t3_titan_sliver", "i185_t4_ninja_gear", "i190_t5_apex_shard", "i207_e012_hasty"],
    aiWarnings: ["avoid_greed_if_team_is_behind", "protect_mana_pool_and_cooldowns"]
  },
  {
    heroId: "h114_dawn_paladin",
    archetype: "paladina global de cura, martelo e presença de luta",
    preferredPositions: [1, 3],
    buildIdentity: "offlane_initiator_tank",
    startingItems: ["i001_regen_rations", "i002_healing_salve", "i004_burst_mango", "i065_strength_bracer", "i068_magic_wand"],
    earlyItems: ["i071_phase_warboots", "i077_falcon_blade_generic", "i114_blade_return_mail"],
    coreItems: ["i055_blink_core", "i089_overwhelming_blink", "i116_team_crimson_barrier", "i118_team_pipe_barrier"],
    luxuryItems: ["i119_assault_aura_plate", "i120_giant_heart", "i128_abyssal_lockblade", "i135_grand_spell_scepter"],
    situationalItems: ["i147_holy_locket_generic", "i164_essence_distiller_generic", "i107_disarm_halberd", "i110_spellproof_crown", "i111_link_barrier_sphere", "i113_lotus_shell", "i100_frost_armor_plate"],
    neutralPreferences: ["i166_t1_duelist_gloves", "i173_t2_dragon_scale", "i178_t3_titan_sliver", "i185_t4_ninja_gear", "i190_t5_apex_shard", "i207_e012_hasty"],
    aiWarnings: ["avoid_greed_if_team_is_behind", "prioritize_blink_or_reach_before_greedy_auras", "do_not_buy_ranged_only_items"]
  },
  {
    heroId: "h115_grapple_brawler",
    archetype: "lutadora de agarrão, arremesso e save agressivo",
    preferredPositions: [3, 4],
    buildIdentity: "support_utility",
    startingItems: ["i001_regen_rations", "i003_mana_clarity", "i006_team_smoke", "i008_observer_eye", "i009_sentry_eye", "i068_magic_wand"],
    earlyItems: ["i073_arcane_boots", "i143_spirit_urn", "i150_war_drums_generic"],
    coreItems: ["i092_force_staff_generic", "i094_cyclone_scepter", "i149_solar_crest_generic", "i151_bearing_boots_generic"],
    luxuryItems: ["i139_hex_scythe_generic", "i135_grand_spell_scepter", "i095_wind_ascension", "i164_essence_distiller_generic"],
    situationalItems: ["i093_glimmer_cloak_generic", "i144_spirit_vessel_generic", "i118_team_pipe_barrier", "i116_team_crimson_barrier", "i113_lotus_shell"],
    neutralPreferences: ["i170_t1_broom_charm", "i176_t2_bullwhip_generic", "i180_t3_ceremonial_robe", "i184_t4_spell_prism", "i192_t5_mirror_shield", "i210_e015_visionary"],
    aiWarnings: ["do_not_skip_detection_and_save_items", "prioritize_blink_or_reach_before_greedy_auras", "do_not_buy_ranged_only_items"]
  },
  {
    heroId: "h116_primal_beast",
    archetype: "fera colossal de investida, pisoteio e agarrão brutal",
    preferredPositions: [3],
    buildIdentity: "offlane_initiator_tank",
    startingItems: ["i001_regen_rations", "i002_healing_salve", "i004_burst_mango", "i065_strength_bracer", "i068_magic_wand"],
    earlyItems: ["i071_phase_warboots", "i077_falcon_blade_generic", "i114_blade_return_mail"],
    coreItems: ["i055_blink_core", "i089_overwhelming_blink", "i116_team_crimson_barrier", "i118_team_pipe_barrier"],
    luxuryItems: ["i119_assault_aura_plate", "i120_giant_heart", "i128_abyssal_lockblade", "i135_grand_spell_scepter"],
    situationalItems: ["i107_disarm_halberd", "i110_spellproof_crown", "i111_link_barrier_sphere", "i113_lotus_shell", "i100_frost_armor_plate"],
    neutralPreferences: ["i171_t1_survival_pouch", "i173_t2_dragon_scale", "i178_t3_titan_sliver", "i186_t4_trickster_cloak", "i188_t4_ancient_guardian", "i208_e013_resolute"],
    aiWarnings: ["prioritize_blink_or_reach_before_greedy_auras", "do_not_buy_ranged_only_items"]
  },
  {
    heroId: "h117_gunslinger_wraith",
    archetype: "atiradora espectral de medo, silêncio e tiros paralelos",
    preferredPositions: [1, 2],
    buildIdentity: "magic_core",
    startingItems: ["i001_regen_rations", "i003_mana_clarity", "i004_burst_mango", "i011_refillable_bottle", "i067_intelligence_talisman", "i068_magic_wand"],
    earlyItems: ["i073_arcane_boots", "i096_cast_range_lens", "i156_phylactery_focus"],
    coreItems: ["i101_spell_kaya", "i142_burst_wand", "i140_silence_orchid", "i135_grand_spell_scepter"],
    luxuryItems: ["i137_octarine_core_generic", "i138_refresh_orb_generic", "i139_hex_scythe_generic", "i159_parasma_generic"],
    situationalItems: ["i110_spellproof_crown", "i111_link_barrier_sphere", "i112_emergency_disk", "i098_ethereal_focus_blade", "i113_lotus_shell"],
    neutralPreferences: ["i166_t1_duelist_gloves", "i173_t2_dragon_scale", "i178_t3_titan_sliver", "i185_t4_ninja_gear", "i190_t5_apex_shard", "i207_e012_hasty"],
    aiWarnings: ["avoid_greed_if_team_is_behind", "protect_mana_pool_and_cooldowns"]
  },
  {
    heroId: "h118_circus_controller",
    archetype: "controlador circense de medo, armadilhas e salvamento",
    preferredPositions: [4, 5],
    buildIdentity: "support_utility",
    startingItems: ["i001_regen_rations", "i003_mana_clarity", "i004_burst_mango", "i008_observer_eye", "i009_sentry_eye", "i068_magic_wand"],
    earlyItems: ["i074_tranquil_boots", "i143_spirit_urn", "i148_pavise_barrier"],
    coreItems: ["i092_force_staff_generic", "i093_glimmer_cloak_generic", "i145_healing_mechanism", "i146_guardian_boots_generic"],
    luxuryItems: ["i094_cyclone_scepter", "i147_holy_locket_generic", "i139_hex_scythe_generic", "i164_essence_distiller_generic"],
    situationalItems: ["i144_spirit_vessel_generic", "i118_team_pipe_barrier", "i116_team_crimson_barrier", "i112_emergency_disk", "i113_lotus_shell"],
    neutralPreferences: ["i167_t1_arcane_bracelet", "i181_t3_psychic_headband", "i182_t3_quickening_charm", "i184_t4_spell_prism", "i189_t4_timeless_relic", "i204_e009_focused"],
    aiWarnings: ["do_not_skip_detection_and_save_items", "protect_mana_pool_and_cooldowns"]
  },
  {
    heroId: "h119_twin_blade_duelist",
    archetype: "duelista de duas posturas, corte veloz e disciplina de combate",
    preferredPositions: [1, 2],
    buildIdentity: "agility_right_click_core",
    startingItems: ["i001_regen_rations", "i002_healing_salve", "i004_burst_mango", "i029_quelling_hatchet", "i066_agility_band", "i068_magic_wand"],
    earlyItems: ["i072_attribute_treads", "i077_falcon_blade_generic"],
    coreItems: ["i079_frenzy_mask", "i103_speed_yasha", "i129_crystal_edge", "i121_satanic_bloodstone"],
    luxuryItems: ["i130_great_crit_blade", "i131_true_strike_staff", "i134_moon_shard_generic", "i133_divine_relic"],
    situationalItems: ["i110_spellproof_crown", "i111_link_barrier_sphere", "i112_emergency_disk", "i122_armor_corruptor", "i128_abyssal_lockblade"],
    neutralPreferences: ["i166_t1_duelist_gloves", "i173_t2_dragon_scale", "i178_t3_titan_sliver", "i185_t4_ninja_gear", "i190_t5_apex_shard", "i207_e012_hasty"],
    aiWarnings: ["avoid_greed_if_team_is_behind", "do_not_buy_ranged_only_items"]
  },
  {
    heroId: "h120_heavy_artillery_commander",
    archetype: "novo artilheiro pesado de zona, supressão e cerco",
    preferredPositions: [3, 4],
    buildIdentity: "support_utility",
    startingItems: ["i001_regen_rations", "i003_mana_clarity", "i006_team_smoke", "i008_observer_eye", "i009_sentry_eye", "i068_magic_wand"],
    earlyItems: ["i073_arcane_boots", "i143_spirit_urn", "i150_war_drums_generic"],
    coreItems: ["i153_dominator_helm", "i154_overlord_helm", "i119_assault_aura_plate", "i092_force_staff_generic", "i094_cyclone_scepter", "i149_solar_crest_generic"],
    luxuryItems: ["i139_hex_scythe_generic", "i135_grand_spell_scepter", "i095_wind_ascension", "i164_essence_distiller_generic"],
    situationalItems: ["i093_glimmer_cloak_generic", "i144_spirit_vessel_generic", "i118_team_pipe_barrier", "i116_team_crimson_barrier", "i113_lotus_shell", "i149_solar_crest_generic", "i152_vampire_aura_mask"],
    neutralPreferences: ["i171_t1_survival_pouch", "i173_t2_dragon_scale", "i178_t3_titan_sliver", "i186_t4_trickster_cloak", "i188_t4_ancient_guardian", "i208_e013_resolute"],
    aiWarnings: ["do_not_skip_detection_and_save_items"]
  },
  {
    heroId: "h121_vengeance_captain",
    archetype: "suporte de vingança, troca de posição e aura ofensiva",
    preferredPositions: [4, 5],
    buildIdentity: "support_utility",
    startingItems: ["i001_regen_rations", "i003_mana_clarity", "i004_burst_mango", "i008_observer_eye", "i009_sentry_eye", "i068_magic_wand"],
    earlyItems: ["i074_tranquil_boots", "i143_spirit_urn", "i148_pavise_barrier"],
    coreItems: ["i092_force_staff_generic", "i093_glimmer_cloak_generic", "i145_healing_mechanism", "i146_guardian_boots_generic"],
    luxuryItems: ["i094_cyclone_scepter", "i147_holy_locket_generic", "i139_hex_scythe_generic", "i164_essence_distiller_generic"],
    situationalItems: ["i144_spirit_vessel_generic", "i118_team_pipe_barrier", "i116_team_crimson_barrier", "i112_emergency_disk", "i113_lotus_shell"],
    neutralPreferences: ["i170_t1_broom_charm", "i176_t2_bullwhip_generic", "i180_t3_ceremonial_robe", "i184_t4_spell_prism", "i192_t5_mirror_shield", "i210_e015_visionary"],
    aiWarnings: ["do_not_skip_detection_and_save_items"]
  },
  {
    heroId: "h122_crystal_channeler",
    archetype: "suporte glacial de mana, congelamento e ultimate canalizada",
    preferredPositions: [5],
    buildIdentity: "support_utility",
    startingItems: ["i001_regen_rations", "i003_mana_clarity", "i004_burst_mango", "i008_observer_eye", "i009_sentry_eye", "i068_magic_wand"],
    earlyItems: ["i074_tranquil_boots", "i143_spirit_urn", "i148_pavise_barrier"],
    coreItems: ["i092_force_staff_generic", "i093_glimmer_cloak_generic", "i145_healing_mechanism", "i146_guardian_boots_generic"],
    luxuryItems: ["i094_cyclone_scepter", "i147_holy_locket_generic", "i139_hex_scythe_generic", "i164_essence_distiller_generic"],
    situationalItems: ["i144_spirit_vessel_generic", "i118_team_pipe_barrier", "i116_team_crimson_barrier", "i112_emergency_disk", "i113_lotus_shell"],
    neutralPreferences: ["i167_t1_arcane_bracelet", "i181_t3_psychic_headband", "i182_t3_quickening_charm", "i184_t4_spell_prism", "i189_t4_timeless_relic", "i204_e009_focused"],
    aiWarnings: ["do_not_skip_detection_and_save_items", "protect_mana_pool_and_cooldowns"]
  },
  {
    heroId: "h123_greatsword_knight",
    archetype: "guerreiro de espada pesada, cleave e força explosiva",
    preferredPositions: [1, 3],
    buildIdentity: "strength_brawler_core",
    startingItems: ["i001_regen_rations", "i002_healing_salve", "i004_burst_mango", "i029_quelling_hatchet", "i065_strength_bracer", "i068_magic_wand"],
    earlyItems: ["i071_phase_warboots", "i078_armlet_relic", "i080_echo_blade"],
    coreItems: ["i102_power_sange", "i105_power_speed_dualblade", "i110_spellproof_crown", "i121_satanic_bloodstone"],
    luxuryItems: ["i128_abyssal_lockblade", "i120_giant_heart", "i119_assault_aura_plate", "i130_great_crit_blade"],
    situationalItems: ["i107_disarm_halberd", "i111_link_barrier_sphere", "i112_emergency_disk", "i131_true_strike_staff", "i122_armor_corruptor"],
    neutralPreferences: ["i166_t1_duelist_gloves", "i173_t2_dragon_scale", "i178_t3_titan_sliver", "i185_t4_ninja_gear", "i190_t5_apex_shard", "i207_e012_hasty"],
    aiWarnings: ["avoid_greed_if_team_is_behind", "do_not_buy_ranged_only_items"]
  },
  {
    heroId: "h124_stone_giant",
    archetype: "colosso de pedra, arremesso e combo de burst",
    preferredPositions: [2, 3],
    buildIdentity: "offlane_initiator_tank",
    startingItems: ["i001_regen_rations", "i002_healing_salve", "i004_burst_mango", "i065_strength_bracer", "i068_magic_wand"],
    earlyItems: ["i071_phase_warboots", "i077_falcon_blade_generic", "i114_blade_return_mail"],
    coreItems: ["i055_blink_core", "i089_overwhelming_blink", "i116_team_crimson_barrier", "i118_team_pipe_barrier"],
    luxuryItems: ["i119_assault_aura_plate", "i120_giant_heart", "i128_abyssal_lockblade", "i135_grand_spell_scepter"],
    situationalItems: ["i107_disarm_halberd", "i110_spellproof_crown", "i111_link_barrier_sphere", "i113_lotus_shell", "i100_frost_armor_plate"],
    neutralPreferences: ["i167_t1_arcane_bracelet", "i181_t3_psychic_headband", "i182_t3_quickening_charm", "i184_t4_spell_prism", "i189_t4_timeless_relic", "i204_e009_focused"],
    aiWarnings: ["prioritize_blink_or_reach_before_greedy_auras", "do_not_buy_ranged_only_items", "protect_mana_pool_and_cooldowns"]
  },
  {
    heroId: "h125_wind_archer",
    archetype: "arqueira do vento de stun em linha, foco e fuga",
    preferredPositions: [2, 4],
    buildIdentity: "hybrid_core_or_utility",
    startingItems: ["i001_regen_rations", "i003_mana_clarity", "i006_team_smoke", "i008_observer_eye", "i009_sentry_eye", "i068_magic_wand"],
    earlyItems: ["i073_arcane_boots", "i143_spirit_urn", "i150_war_drums_generic"],
    coreItems: ["i092_force_staff_generic", "i094_cyclone_scepter", "i149_solar_crest_generic", "i151_bearing_boots_generic"],
    luxuryItems: ["i139_hex_scythe_generic", "i135_grand_spell_scepter", "i095_wind_ascension", "i164_essence_distiller_generic"],
    situationalItems: ["i093_glimmer_cloak_generic", "i144_spirit_vessel_generic", "i118_team_pipe_barrier", "i116_team_crimson_barrier", "i113_lotus_shell"],
    neutralPreferences: ["i170_t1_broom_charm", "i176_t2_bullwhip_generic", "i180_t3_ceremonial_robe", "i184_t4_spell_prism", "i192_t5_mirror_shield", "i210_e015_visionary"],
    aiWarnings: []
  },
  {
    heroId: "h126_storm_edict_prophet",
    archetype: "mago de edictos elétricos, pulso e divisão de terra",
    preferredPositions: [2],
    buildIdentity: "magic_core",
    startingItems: ["i001_regen_rations", "i003_mana_clarity", "i004_burst_mango", "i011_refillable_bottle", "i067_intelligence_talisman", "i068_magic_wand"],
    earlyItems: ["i073_arcane_boots", "i096_cast_range_lens", "i156_phylactery_focus"],
    coreItems: ["i153_dominator_helm", "i154_overlord_helm", "i119_assault_aura_plate", "i101_spell_kaya", "i142_burst_wand", "i140_silence_orchid"],
    luxuryItems: ["i137_octarine_core_generic", "i138_refresh_orb_generic", "i139_hex_scythe_generic", "i159_parasma_generic"],
    situationalItems: ["i110_spellproof_crown", "i111_link_barrier_sphere", "i112_emergency_disk", "i098_ethereal_focus_blade", "i113_lotus_shell", "i149_solar_crest_generic", "i152_vampire_aura_mask"],
    neutralPreferences: ["i167_t1_arcane_bracelet", "i181_t3_psychic_headband", "i182_t3_quickening_charm", "i184_t4_spell_prism", "i189_t4_timeless_relic", "i204_e009_focused"],
    aiWarnings: ["protect_mana_pool_and_cooldowns"]
  },
  {
    heroId: "h127_goblin_clock_sniper",
    archetype: "atirador tecnológico de minas leves, mira e recuo",
    preferredPositions: [1, 2],
    buildIdentity: "agility_right_click_core",
    startingItems: ["i001_regen_rations", "i002_healing_salve", "i004_burst_mango", "i029_quelling_hatchet", "i066_agility_band", "i068_magic_wand"],
    earlyItems: ["i072_attribute_treads", "i077_falcon_blade_generic"],
    coreItems: ["i085_reach_lance", "i086_force_pike", "i124_chain_lightning_hammer", "i130_great_crit_blade"],
    luxuryItems: ["i130_great_crit_blade", "i131_true_strike_staff", "i134_moon_shard_generic", "i133_divine_relic"],
    situationalItems: ["i110_spellproof_crown", "i111_link_barrier_sphere", "i112_emergency_disk", "i122_armor_corruptor", "i128_abyssal_lockblade"],
    neutralPreferences: ["i166_t1_duelist_gloves", "i173_t2_dragon_scale", "i178_t3_titan_sliver", "i185_t4_ninja_gear", "i190_t5_apex_shard", "i207_e012_hasty"],
    aiWarnings: ["avoid_greed_if_team_is_behind"]
  },
  {
    heroId: "h128_rune_blade_nomad",
    archetype: "lutador de runas, corte circular e bloqueio mágico",
    preferredPositions: [3, 4],
    buildIdentity: "support_utility",
    startingItems: ["i001_regen_rations", "i003_mana_clarity", "i006_team_smoke", "i008_observer_eye", "i009_sentry_eye", "i068_magic_wand"],
    earlyItems: ["i073_arcane_boots", "i143_spirit_urn", "i150_war_drums_generic"],
    coreItems: ["i092_force_staff_generic", "i094_cyclone_scepter", "i149_solar_crest_generic", "i151_bearing_boots_generic"],
    luxuryItems: ["i139_hex_scythe_generic", "i135_grand_spell_scepter", "i095_wind_ascension", "i164_essence_distiller_generic"],
    situationalItems: ["i093_glimmer_cloak_generic", "i144_spirit_vessel_generic", "i118_team_pipe_barrier", "i116_team_crimson_barrier", "i113_lotus_shell"],
    neutralPreferences: ["i171_t1_survival_pouch", "i173_t2_dragon_scale", "i178_t3_titan_sliver", "i186_t4_trickster_cloak", "i188_t4_ancient_guardian", "i208_e013_resolute"],
    aiWarnings: ["do_not_skip_detection_and_save_items", "do_not_buy_ranged_only_items"]
  }
];

export const BUILD_AI_PRIORITY_RULES = {
  startingPhase: [
    "garantir regen suficiente para lane",
    "mid deve priorizar bottle se usa runa/mana",
    "support deve carregar visão/detecção quando necessário",
    "core melee deve priorizar last hit tool se permitido"
  ],

  earlyGame: [
    "fechar botas adequadas",
    "comprar wand/cargas contra lane com spam",
    "suporte compra item barato de save ou urna se participa de kills",
    "offlane compra item de sobrevivência ou iniciação"
  ],

  midGame: [
    "core prioriza primeiro item de dano/farm ou dispel se ameaçado",
    "mid caster prioriza alcance, burst, silence ou spell amp",
    "offlane prioriza blink/aura/barreira conforme plano do time",
    "suporte prioriza force, glimmer, cyclone, vessel, mek ou crest"
  ],

  lateGame: [
    "core precisa de proteção: debuff immunity, link barrier, dispel ou satanic-like",
    "suporte precisa sobreviver ao primeiro burst",
    "adicionar hex, refresh, true strike ou anti-heal conforme inimigo",
    "manter buyback antes de item de luxo se high ground ou boss decisivo"
  ],

  overrideRules: [
    "reveal vence build greed contra invisibilidade",
    "true strike vence dano bruto contra evasão",
    "anti-heal vence cura excessiva",
    "pipe/barreira mágica vence burst mágico em área",
    "crimson/barreira física vence summons/ilusões/multi-hit",
    "dispel vence silence/root/leash",
    "link/lotus vence pickoff unitário",
    "não comprar item ranged-only em melee",
    "não comprar cleave em ranged",
    "não comprar vários itens de aura iguais no mesmo time"
  ]
};

// Sugestão para o Codex:
// 1. Salvar como src/data/itemAiBuildGuides.ts.
// 2. Criar getRecommendedBuildForHero(heroId, matchContext).
// 3. Criar scoreItemForHero(itemId, hero, role, matchContext).
// 4. Aplicar GREAT_ITEM_INTERACTIONS como bônus.
// 5. Aplicar TERRIBLE_ITEM_INTERACTIONS como penalidade forte.
// 6. HERO_BUILD_EXAMPLES serve como fallback e como build de bot simples.
// 7. A IA final deve adaptar as builds em tempo real, não seguir a lista cegamente.
