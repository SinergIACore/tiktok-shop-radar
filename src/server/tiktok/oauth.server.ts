import {
  readTikTokOfficialConfig,
  type TikTokOfficialConfig,
} from "@/services/providers/product-data/providers/tiktok-official/tiktok-official.config";

/**
 * ADAPTER ISOLADO de token da TikTok Shop — fluxo CREATOR.
 *
 *   GET {authBaseUrl}/api/v2/token/get
 *       ?app_key&app_secret&auth_code&grant_type=authorized_code
 *   GET {authBaseUrl}/api/v2/token/refresh
 *       ?app_key&app_secret&refresh_token&grant_type=refresh_token
 *
 * Validações obrigatórias da resposta: `code === 0` e `user_type === 1`
 * (1 = CREATOR). Qualquer outra identidade é recusada.
 */
export const USER_TYPE_CREATOR = 1;

export interface TikTokTokenExchangeResult {
  accessToken: string;
  refreshToken: string | null;
  accessTokenExpiresAt: string | null;
  refreshTokenExpiresAt: string | null;
  openId: string | null;
  userType: number;
  grantedScopes: string[];
  sellerName: string | null;
}

export class TikTokOAuthError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status = 502,
  ) {
    super(message);
    this.name = "TikTokOAuthError";
  }
}

function toIso(seconds: unknown): string | null {
  if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds <= 0) return null;
  return new Date(seconds * 1000).toISOString();
}

function toScopes(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === "string");
  if (typeof value === "string" && value.trim()) {
    return value
      .split(/[,\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

/** Traduz a resposta oficial (mesma para get e refresh) para o modelo interno. */
export function parseTokenPayload(payload: {
  code?: number;
  message?: string;
  data?: Record<string, unknown>;
}): TikTokTokenExchangeResult {
  if (typeof payload.code === "number" && payload.code !== 0) {
    throw new TikTokOAuthError(
      "token_exchange_rejected",
      `TikTok recusou a troca (code=${payload.code}): ${payload.message ?? "sem mensagem"}`,
      401,
    );
  }

  const data = payload.data ?? {};
  const accessToken = typeof data["access_token"] === "string" ? data["access_token"] : null;
  if (!accessToken) {
    throw new TikTokOAuthError("invalid_token_response", "Resposta oficial sem access_token.");
  }

  const userType = typeof data["user_type"] === "number" ? data["user_type"] : -1;
  if (userType !== USER_TYPE_CREATOR) {
    throw new TikTokOAuthError(
      "invalid_user_type",
      `Identidade incorreta: esperado Creator (user_type=1), recebido ${userType}.`,
      403,
    );
  }

  return {
    accessToken,
    refreshToken: typeof data["refresh_token"] === "string" ? data["refresh_token"] : null,
    accessTokenExpiresAt: toIso(data["access_token_expire_in"]),
    refreshTokenExpiresAt: toIso(data["refresh_token_expire_in"]),
    openId: typeof data["open_id"] === "string" ? data["open_id"] : null,
    userType,
    grantedScopes: toScopes(data["granted_scopes"] ?? data["granted_scope"]),
    sellerName: typeof data["seller_name"] === "string" ? data["seller_name"] : null,
  };
}

async function callTokenEndpoint(
  config: TikTokOfficialConfig,
  path: string,
  params: Record<string, string>,
): Promise<TikTokTokenExchangeResult> {
  const url = new URL(path, config.authBaseUrl);
  url.searchParams.set("app_key", config.appKey);
  url.searchParams.set("app_secret", config.appSecret);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);
  try {
    const response = await fetch(url, { method: "GET", signal: controller.signal });
    if (!response.ok) {
      // Nunca ecoamos a URL (contém app_secret): apenas status e corpo truncado.
      const body = (await response.text()).slice(0, 300);
      throw new TikTokOAuthError(
        "token_exchange_failed",
        `TikTok respondeu ${response.status}: ${body}`,
      );
    }
    return parseTokenPayload(await response.json());
  } catch (error) {
    if (error instanceof TikTokOAuthError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new TikTokOAuthError("timeout", "TikTok não respondeu a tempo.", 504);
    }
    throw new TikTokOAuthError(
      "token_exchange_failed",
      error instanceof Error ? error.message : "Falha desconhecida na troca de token.",
    );
  } finally {
    clearTimeout(timer);
  }
}

function requireConfig(): TikTokOfficialConfig {
  const config = readTikTokOfficialConfig();
  if (!config) {
    throw new TikTokOAuthError("not_configured", "Credenciais TikTok não configuradas.", 503);
  }
  return config;
}

/** O callback recebe `code`; o endpoint de token espera `auth_code`. */
export async function exchangeAuthCode(code: string): Promise<TikTokTokenExchangeResult> {
  return callTokenEndpoint(requireConfig(), "/api/v2/token/get", {
    auth_code: code,
    grant_type: "authorized_code",
  });
}

export async function refreshAccessToken(
  refreshToken: string,
): Promise<TikTokTokenExchangeResult> {
  return callTokenEndpoint(requireConfig(), "/api/v2/token/refresh", {
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });
}
