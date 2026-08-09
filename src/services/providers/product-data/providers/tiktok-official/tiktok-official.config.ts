/**
 * TikTok Shop Open API — configuração server-only (Etapa TikTok Oficial 01).
 *
 * NENHUMA destas variáveis usa prefixo VITE_: elas jamais podem entrar no
 * bundle do navegador. Toda leitura acontece dentro de handlers server-side.
 */
export interface TikTokOfficialConfig {
  appKey: string;
  appSecret: string;
  redirectUri: string;
  /** Base da Open API. Sobrescrevível apenas por env server-side. */
  apiBaseUrl: string;
  /** Base do serviço de autenticação/token. */
  authBaseUrl: string;
  timeoutMs: number;
}

export const DEFAULT_TIKTOK_API_BASE_URL = "https://open-api.tiktokglobalshop.com";
export const DEFAULT_TIKTOK_AUTH_BASE_URL = "https://auth.tiktok-shops.com";
export const DEFAULT_TIKTOK_TIMEOUT_MS = 30_000;

/** Escopo em investigação nesta etapa (confirmado no Partner Center). */
export const TIKTOK_SCOPE_AFFILIATE_COLLABORATION_READ =
  "creator.affiliate_collaboration.read";

/** Retorna a config apenas se TODAS as credenciais obrigatórias existirem. */
export function readTikTokOfficialConfig(): TikTokOfficialConfig | null {
  const appKey = process.env["TIKTOK_SHOP_APP_KEY"];
  const appSecret = process.env["TIKTOK_SHOP_APP_SECRET"];
  const redirectUri = process.env["TIKTOK_SHOP_REDIRECT_URI"];
  if (!appKey || !appSecret || !redirectUri) return null;

  const timeout = Number(process.env["TIKTOK_SHOP_TIMEOUT_MS"] ?? DEFAULT_TIKTOK_TIMEOUT_MS);

  return {
    appKey,
    appSecret,
    redirectUri,
    apiBaseUrl: process.env["TIKTOK_SHOP_API_BASE_URL"] ?? DEFAULT_TIKTOK_API_BASE_URL,
    authBaseUrl: process.env["TIKTOK_SHOP_AUTH_BASE_URL"] ?? DEFAULT_TIKTOK_AUTH_BASE_URL,
    timeoutMs: Number.isFinite(timeout) ? timeout : DEFAULT_TIKTOK_TIMEOUT_MS,
  };
}

export function isTikTokOfficialConfigured(): boolean {
  return readTikTokOfficialConfig() !== null;
}

/** Mascara qualquer credencial/token antes de qualquer log. */
export function maskSecret(value: string | null | undefined): string {
  if (!value) return "none";
  if (value.length <= 8) return "***";
  return `${value.slice(0, 4)}***${value.slice(-2)}`;
}
