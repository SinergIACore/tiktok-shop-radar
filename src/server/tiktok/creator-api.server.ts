import {
  readTikTokOfficialConfig,
  TIKTOK_REQUIRED_CREATOR_SCOPES,
} from "@/services/providers/product-data/providers/tiktok-official/tiktok-official.config";
import { AUTHORIZATION_TYPE } from "@/services/providers/product-data/providers/tiktok-official/TikTokShopOfficialProvider";
import {
  readAccessToken,
  readRefreshToken,
  type TikTokAuthorization,
} from "./authorization-store";
import { getTikTokAuthorizationStore } from "./index.server";
import { refreshAccessToken, TikTokOAuthError } from "./oauth.server";
import { signTikTokRequest } from "./signature";

/**
 * Cliente server-only das Affiliate Creator APIs.
 *
 *   GET /affiliate_creator/202508/profiles          (creator.affiliate.info)
 *   GET /affiliate_creator/202405/showcases/products (creator.showcase.read)
 *
 * Todas as chamadas: assinatura oficial + header `x-tts-access-token`.
 * Nenhum token, secret ou chave sai deste processo.
 */
export const CREATOR_PROFILE_PATH = "/affiliate_creator/202508/profiles";
export const CREATOR_SHOWCASE_PRODUCTS_PATH = "/affiliate_creator/202405/showcases/products";

export type CreatorConnectionState =
  | "not_configured"
  | "not_connected"
  | "connected"
  | "missing_scopes"
  | "token_expired"
  | "token_invalid";

export class CreatorApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status = 502,
  ) {
    super(message);
    this.name = "CreatorApiError";
  }
}

function isExpired(iso: string | null): boolean {
  if (!iso) return false;
  return new Date(iso).getTime() <= Date.now();
}

export function missingScopes(granted: string[]): string[] {
  return TIKTOK_REQUIRED_CREATOR_SCOPES.filter((scope) => !granted.includes(scope));
}

/**
 * Autorização válida do Creator, renovando automaticamente o access token
 * quando expirado. A renovação revalida user_type/open_id/scopes.
 */
export async function getValidCreatorAuthorization(): Promise<TikTokAuthorization | null> {
  const store = await getTikTokAuthorizationStore();
  const current = await store.getLatest(AUTHORIZATION_TYPE);
  if (!current) return null;
  if (!isExpired(current.accessTokenExpiresAt)) return current;

  const refreshToken = readRefreshToken(current);
  if (!refreshToken || isExpired(current.refreshTokenExpiresAt)) return current;

  const renewed = await refreshAccessToken(refreshToken);
  if (current.openId && renewed.openId && current.openId !== renewed.openId) {
    throw new TikTokOAuthError("open_id_mismatch", "Refresh devolveu outra identidade.", 403);
  }
  const saved = await store.save({
    authorizationType: AUTHORIZATION_TYPE,
    market: current.market,
    accessToken: renewed.accessToken,
    refreshToken: renewed.refreshToken ?? refreshToken,
    accessTokenExpiresAt: renewed.accessTokenExpiresAt,
    refreshTokenExpiresAt: renewed.refreshTokenExpiresAt,
    openId: renewed.openId ?? current.openId,
    userType: renewed.userType,
    grantedScopes: renewed.grantedScopes.length ? renewed.grantedScopes : current.grantedScopes,
  });
  console.info("[tiktok-oauth] status=refreshed user_type=" + renewed.userType);
  return saved;
}

export async function creatorConnectionState(): Promise<{
  state: CreatorConnectionState;
  authorization: TikTokAuthorization | null;
  missing: string[];
}> {
  const config = readTikTokOfficialConfig();
  if (!config) return { state: "not_configured", authorization: null, missing: [] };

  let auth: TikTokAuthorization | null = null;
  try {
    auth = await getValidCreatorAuthorization();
  } catch {
    return { state: "token_invalid", authorization: null, missing: [] };
  }
  if (!auth) return { state: "not_connected", authorization: null, missing: [] };

  const missing = missingScopes(auth.grantedScopes);
  if (isExpired(auth.accessTokenExpiresAt)) {
    return { state: "token_expired", authorization: auth, missing };
  }
  if (auth.userType !== null && auth.userType !== 1) {
    return { state: "token_invalid", authorization: auth, missing };
  }
  return { state: missing.length ? "missing_scopes" : "connected", authorization: auth, missing };
}

/** Chamada GET assinada às Affiliate Creator APIs. */
export async function creatorApiGet(
  path: string,
  query: Record<string, string> = {},
): Promise<unknown> {
  const config = readTikTokOfficialConfig();
  if (!config) throw new CreatorApiError("not_configured", "Credenciais TikTok ausentes.", 503);

  const auth = await getValidCreatorAuthorization();
  if (!auth) throw new CreatorApiError("not_connected", "Creator não autorizado.", 401);

  const accessToken = readAccessToken(auth);
  const params: Record<string, string> = {
    ...query,
    app_key: config.appKey,
    timestamp: String(Math.floor(Date.now() / 1000)),
  };
  params["sign"] = signTikTokRequest({ appSecret: config.appSecret, path, query: params });

  const url = new URL(path, config.apiBaseUrl);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "x-tts-access-token": accessToken,
        "content-type": "application/json",
      },
      signal: controller.signal,
    });
    const text = await response.text();
    if (!response.ok) {
      throw new CreatorApiError(
        response.status === 401 ? "unauthorized" : "request_failed",
        `TikTok respondeu ${response.status}: ${text.slice(0, 300)}`,
        response.status === 401 ? 401 : 502,
      );
    }
    return JSON.parse(text) as unknown;
  } catch (error) {
    if (error instanceof CreatorApiError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new CreatorApiError("timeout", "TikTok não respondeu a tempo.", 504);
    }
    throw new CreatorApiError(
      "request_failed",
      error instanceof Error ? error.message : "Falha desconhecida.",
    );
  } finally {
    clearTimeout(timer);
  }
}

export async function getCreatorProfile(): Promise<unknown> {
  return creatorApiGet(CREATOR_PROFILE_PATH);
}

export async function getCreatorShowcaseProducts(pageSize = 10): Promise<unknown> {
  return creatorApiGet(CREATOR_SHOWCASE_PRODUCTS_PATH, {
    page_size: String(Math.min(Math.max(Math.trunc(pageSize) || 1, 1), 50)),
  });
}
