import { createFileRoute } from "@tanstack/react-router";

import { AUTHORIZATION_TYPE } from "@/services/providers/product-data/providers/tiktok-official/TikTokShopOfficialProvider";
import { hasTokenEncryptionKey } from "@/server/tiktok/token-crypto";
import { getTikTokAuthorizationStore } from "@/server/tiktok/index.server";
import { exchangeAuthCode, TikTokOAuthError } from "@/server/tiktok/oauth.server";

/**
 * GET /api/auth/tiktok/callback
 *
 * Callback oficial (redirect URI planejada:
 * https://tikradar.sinergia.club/api/auth/tiktok/callback).
 *
 * Recebe o auth_code, troca por token via adapter isolado e persiste somente
 * server-side, sempre criptografado. Nenhum token é devolvido ao navegador.
 */
function redirectTo(request: Request, params: Record<string, string>): Response {
  const url = new URL("/settings", request.url);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return Response.redirect(url.toString(), 302);
}

export const Route = createFileRoute("/api/auth/tiktok/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const authCode = url.searchParams.get("code") ?? url.searchParams.get("auth_code");
        const market = url.searchParams.get("locale") ?? url.searchParams.get("region");

        if (!authCode) {
          console.warn("[tiktok-oauth] status=missing_auth_code");
          return redirectTo(request, {
            tiktok: "error",
            reason: "missing_auth_code",
          });
        }

        if (!hasTokenEncryptionKey()) {
          console.error("[tiktok-oauth] status=missing_encryption_key");
          return redirectTo(request, { tiktok: "error", reason: "missing_encryption_key" });
        }

        try {
          const token = await exchangeAuthCode(authCode);
          const store = await getTikTokAuthorizationStore();
          await store.save({
            authorizationType: AUTHORIZATION_TYPE,
            market: market ? market.trim().toUpperCase() : null,
            accessToken: token.accessToken,
            refreshToken: token.refreshToken,
            accessTokenExpiresAt: token.accessTokenExpiresAt,
            refreshTokenExpiresAt: token.refreshTokenExpiresAt,
          });
          // Log sem token: apenas identidade e store.
          console.info(
            `[tiktok-oauth] status=ok store=${store.name} identity=${token.sellerName ?? token.openId ?? "unknown"}`,
          );
          return redirectTo(request, { tiktok: "connected" });
        } catch (error) {
          const reason =
            error instanceof TikTokOAuthError ? error.code : "token_exchange_failed";
          console.error(`[tiktok-oauth] status=failed reason=${reason}`);
          return redirectTo(request, { tiktok: "error", reason });
        }
      },
    },
  },
});
