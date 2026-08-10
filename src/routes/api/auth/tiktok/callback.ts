import { createFileRoute } from "@tanstack/react-router";
import { deleteCookie, getCookie } from "@tanstack/react-start/server";

import { AUTHORIZATION_TYPE } from "@/services/providers/product-data/providers/tiktok-official/TikTokShopOfficialProvider";
import { hasTokenEncryptionKey } from "@/server/tiktok/token-crypto";
import { getTikTokAuthorizationStore } from "@/server/tiktok/index.server";
import { exchangeAuthCode, TikTokOAuthError } from "@/server/tiktok/oauth.server";
import { consumeOAuthState, OAUTH_STATE_COOKIE } from "@/server/tiktok/oauth-state.server";

/**
 * GET /api/auth/tiktok/callback
 *
 * Callback da CREATOR AUTHORIZATION.
 * Ordem obrigatória: validar o `state` (single-use, expirável, ligado ao
 * cookie de sessão) ANTES de qualquer troca de token. Nenhum token é
 * devolvido ao navegador.
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
        const state = url.searchParams.get("state");
        const market = url.searchParams.get("locale") ?? url.searchParams.get("region");

        const cookieState = getCookie(OAUTH_STATE_COOKIE) ?? null;
        deleteCookie(OAUTH_STATE_COOKIE, { path: "/" });

        const stateResult = consumeOAuthState(state, cookieState);
        if (stateResult !== "ok") {
          console.warn(`[tiktok-oauth] status=state_rejected reason=${stateResult}`);
          return redirectTo(request, { tiktok: "error", reason: stateResult });
        }

        if (!authCode) {
          console.warn("[tiktok-oauth] status=missing_auth_code");
          return redirectTo(request, { tiktok: "error", reason: "missing_auth_code" });
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
            openId: token.openId,
            userType: token.userType,
            grantedScopes: token.grantedScopes,
          });
          // Log sem token: apenas identidade e store.
          console.info(
            `[tiktok-oauth] status=ok store=${store.name} user_type=${token.userType} scopes=${token.grantedScopes.length}`,
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
