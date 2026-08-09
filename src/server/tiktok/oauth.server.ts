import { readTikTokOfficialConfig } from "@/services/providers/product-data/providers/tiktok-official/tiktok-official.config";

/**
 * ADAPTER ISOLADO de troca de código por token (TikTok Shop Open API).
 *
 * Endpoint documentado publicamente pelo Partner Center:
 *   GET {authBaseUrl}/api/v2/token/get
 *       ?app_key=...&app_secret=...&auth_code=...&grant_type=authorized_code
 *
 * PENDÊNCIA: o contrato exato (nomes de campos da resposta e validade) só
 * pode ser considerado comprovado após uma troca real bem-sucedida. Todo o
 * acoplamento com o formato oficial vive AQUI — nada disso vaza para o resto
 * da aplicação, que enxerga apenas `TikTokTokenExchangeResult`.
 */
export interface TikTokTokenExchangeResult {
  accessToken: string;
  refreshToken: string | null;
  accessTokenExpiresAt: string | null;
  refreshTokenExpiresAt: string | null;
  /** Identidade autorizada, quando a resposta oficial trouxer. */
  sellerName: string | null;
  openId: string | null;
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
  // A API oficial devolve epoch em segundos.
  return new Date(seconds * 1000).toISOString();
}

export async function exchangeAuthCode(authCode: string): Promise<TikTokTokenExchangeResult> {
  const config = readTikTokOfficialConfig();
  if (!config) {
    throw new TikTokOAuthError("not_configured", "Credenciais TikTok não configuradas.", 503);
  }

  const url = new URL("/api/v2/token/get", config.authBaseUrl);
  url.searchParams.set("app_key", config.appKey);
  url.searchParams.set("app_secret", config.appSecret);
  url.searchParams.set("auth_code", authCode);
  url.searchParams.set("grant_type", "authorized_code");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);
  try {
    const response = await fetch(url, { method: "GET", signal: controller.signal });
    if (!response.ok) {
      // Nunca ecoamos a URL (contém app_secret): apenas status e corpo truncado.
      const body = (await response.text()).slice(0, 300);
      throw new TikTokOAuthError("token_exchange_failed", `TikTok respondeu ${response.status}: ${body}`);
    }
    const payload = (await response.json()) as {
      code?: number;
      message?: string;
      data?: Record<string, unknown>;
    };
    if (payload.code && payload.code !== 0) {
      throw new TikTokOAuthError(
        "token_exchange_rejected",
        `TikTok recusou a troca (code=${payload.code}): ${payload.message ?? "sem mensagem"}`,
        401,
      );
    }
    const data = payload.data ?? {};
    const accessToken = typeof data["access_token"] === "string" ? data["access_token"] : null;
    if (!accessToken) {
      throw new TikTokOAuthError(
        "invalid_token_response",
        "Resposta oficial sem access_token.",
      );
    }
    return {
      accessToken,
      refreshToken: typeof data["refresh_token"] === "string" ? data["refresh_token"] : null,
      accessTokenExpiresAt: toIso(data["access_token_expire_in"]),
      refreshTokenExpiresAt: toIso(data["refresh_token_expire_in"]),
      sellerName: typeof data["seller_name"] === "string" ? data["seller_name"] : null,
      openId: typeof data["open_id"] === "string" ? data["open_id"] : null,
    };
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
