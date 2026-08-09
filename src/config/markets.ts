/**
 * Market (TikTok Shop storefront) catalog — Stage 02C.2B.
 *
 * IMPORTANT: this list mirrors EXACTLY the `country` enum of the real Actor
 * input schema (lurkapi~tiktok-shop-scraper, build 0.0.17):
 *
 *   "country": { "enum": ["US"], "enumTitles": ["United States"], "default": "US" }
 *
 * The Actor documents UK / FR / SEA as roadmap only, so today the United States
 * is the ONLY selectable market. Nothing is invented here: when the Actor adds
 * a new value to that enum, add it below — no other file changes.
 */
export interface MarketDefinition {
  /** Value sent verbatim to the provider (`country`). */
  code: string;
  /** Label shown in the UI. */
  name: string;
}

export const SUPPORTED_MARKETS: MarketDefinition[] = [
  { code: "US", name: "Estados Unidos (US)" },
];

export const DEFAULT_MARKET = "US";

export function findMarket(code: string | null | undefined): MarketDefinition | undefined {
  if (!code) return undefined;
  const normalized = code.trim().toUpperCase();
  return SUPPORTED_MARKETS.find((market) => market.code === normalized);
}
