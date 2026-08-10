import { readTikTokOfficialConfig } from "@/services/providers/product-data/providers/tiktok-official/tiktok-official.config";

/**
 * URL de autorização do CREATOR (Affiliate Creator API).
 *
 * Fluxo oficial "Creator authorization guide":
 *   https://shop.tiktok.com/alliance/creator/auth?app_key={APP_KEY}&state={STATE}
 *
 * NÃO usa `service_id` nem a tela de Seller Authorization.
 * Nenhum segredo entra nesta URL — o app_secret só aparece na troca de token.
 */
export const DEFAULT_TIKTOK_CREATOR_AUTHORIZE_URL =
  "https://shop.tiktok.com/alliance/creator/auth";

export type AuthorizeUrlResult =
  | { ok: true; url: string }
  | { ok: false; reason: "not_configured" };

export function buildTikTokAuthorizeUrl(state?: string): AuthorizeUrlResult {
  const config = readTikTokOfficialConfig();
  if (!config) return { ok: false, reason: "not_configured" };

  const base =
    process.env["TIKTOK_SHOP_AUTHORIZE_URL"] ?? DEFAULT_TIKTOK_CREATOR_AUTHORIZE_URL;
  const url = new URL(base);
  url.searchParams.set("app_key", config.appKey);
  if (state) url.searchParams.set("state", state);
  return { ok: true, url: url.toString() };
}
