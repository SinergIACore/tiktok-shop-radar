import { ApifyProductDataProvider } from "./providers/apify/ApifyProductDataProvider";
import { TikTokShopOfficialProvider } from "./providers/tiktok-official/TikTokShopOfficialProvider";
import type { ProductDataProvider } from "./ProductDataProvider";

/**
 * Single place where the active provider is chosen. Swapping Apify for an
 * official TikTok Shop provider means changing only this function.
 * Server-side only: implementations read secrets from process.env.
 *
 * Etapa TikTok Oficial 01: a seleção é feita SOMENTE por variável de ambiente
 * server-side (DISCOVERY_PROVIDER). O padrão continua sendo o provider atual
 * (Apify) — nada muda para Discovery/Dashboard/Products sem opt-in explícito.
 *
 *   DISCOVERY_PROVIDER=apify           (padrão)
 *   DISCOVERY_PROVIDER=tiktok_official (opt-in)
 */
export type DiscoveryProviderId = "apify" | "tiktok_official";

export function getDiscoveryProviderId(): DiscoveryProviderId {
  return process.env["DISCOVERY_PROVIDER"] === "tiktok_official" ? "tiktok_official" : "apify";
}

export function getProductDataProvider(): ProductDataProvider {
  return getDiscoveryProviderId() === "tiktok_official"
    ? new TikTokShopOfficialProvider()
    : new ApifyProductDataProvider();
}
