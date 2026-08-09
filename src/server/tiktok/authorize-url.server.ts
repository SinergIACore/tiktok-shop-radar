import { readTikTokOfficialConfig } from "@/services/providers/product-data/providers/tiktok-official/tiktok-official.config";

/**
 * Construção da URL de autorização do TikTok Shop (server-only).
 *
 * O Partner Center expõe a tela de autorização em:
 *   {TIKTOK_SHOP_AUTHORIZE_URL}?service_id=...&state=...
 * (padrão oficial: https://services.tiktokshop.com/open/authorize)
 *
 * O `service_id` NÃO é derivável do app_key: ele é fornecido pelo Partner
 * Center. Enquanto ele não estiver em ENV, não adivinhamos — o endpoint
 * responde com pendência explícita em vez de gerar uma URL inválida.
 * Nenhum segredo (app_secret) entra nessa URL.
 */
export const DEFAULT_TIKTOK_AUTHORIZE_URL = "https://services.tiktokshop.com/open/authorize";

export type AuthorizeUrlResult =
  | { ok: true; url: string }
  | { ok: false; reason: "not_configured" | "missing_service_id" };

export function buildTikTokAuthorizeUrl(state?: string): AuthorizeUrlResult {
  const config = readTikTokOfficialConfig();
  if (!config) return { ok: false, reason: "not_configured" };

  const serviceId = process.env["TIKTOK_SHOP_SERVICE_ID"];
  if (!serviceId) return { ok: false, reason: "missing_service_id" };

  const base = process.env["TIKTOK_SHOP_AUTHORIZE_URL"] ?? DEFAULT_TIKTOK_AUTHORIZE_URL;
  const url = new URL(base);
  url.searchParams.set("service_id", serviceId);
  if (state) url.searchParams.set("state", state);
  return { ok: true, url: url.toString() };
}
