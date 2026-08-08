/**
 * Niche catalog (Stage 02C.2).
 *
 * Small, editable and intentionally incomplete: these terms are only a
 * starting point for market discovery — they do NOT cover an entire niche.
 * Kept as configuration (never hardcoded inside React components) so it can
 * evolve into database-backed configuration later without touching the UI.
 */
export interface NicheDefinition {
  key: string;
  name: string;
  description?: string;
  terms: string[];
}

export const NICHE_CATALOG: NicheDefinition[] = [
  {
    key: "women_fashion",
    name: "Moda feminina",
    description: "Peças de vestuário feminino de giro rápido.",
    terms: [
      "women dress",
      "women blouse",
      "women set",
      "women pants",
      "women skirt",
      "women jumpsuit",
      "women cardigan",
    ],
  },
  {
    key: "beauty",
    name: "Beleza",
    description: "Ferramentas e acessórios de beleza e skincare.",
    terms: [
      "facial cleansing brush",
      "hair curler",
      "hair straightener",
      "skincare tool",
      "makeup organizer",
    ],
  },
  {
    key: "home_kitchen",
    name: "Casa e cozinha",
    description: "Utilidades domésticas e itens de cozinha.",
    terms: ["kitchen organizer", "portable blender", "food storage container", "cleaning gadget"],
  },
  {
    key: "electronics",
    name: "Eletrônicos",
    description: "Gadgets e acessórios eletrônicos de consumo.",
    terms: ["mini projector", "wireless earbuds", "phone holder", "smart watch"],
  },
  {
    key: "fitness",
    name: "Fitness",
    description: "Acessórios de treino e bem-estar.",
    terms: ["resistance band", "yoga mat", "massage gun", "workout gloves"],
  },
  {
    key: "pets",
    name: "Pets",
    description: "Acessórios para cães e gatos.",
    terms: ["pet grooming", "dog accessories", "cat accessories", "pet hair remover", "pet feeder"],
  },
];

export function findNiche(key: string): NicheDefinition | null {
  return NICHE_CATALOG.find((niche) => niche.key === key) ?? null;
}
