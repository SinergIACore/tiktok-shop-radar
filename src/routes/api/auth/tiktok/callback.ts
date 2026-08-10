import { createFileRoute } from "@tanstack/react-router";
import { getCookie } from "@tanstack/react-start/server";

import { AUTHORIZATION_TYPE } from "@/services/providers/product-data/providers/tiktok-official/TikTokShopOfficialProvider";
import { hasTokenEncryptionKey } from "@/server/tiktok/token-crypto";
import { getTikTokAuthorizationStore } from "@/server/tiktok/index.server";
import { exchangeAuthCode, TikTokOAuthError } from "@/server/tiktok/oauth.server";
import { consumeOAuthState, OAUTH_STATE_COOKIE } from "@/server/tiktok/oauth-state.server";
import {
  clearStateCookie,
  redirectResponse,
  settingsUrl,
} from "@/server/tiktok/oauth-response.server";

/**
 * GET /api/auth/tiktok/callback
 *
 * Callback da CREATOR AUTHORIZATION.
 * Ordem obrigatória: validar o `state` (single-use, expirável, ligado ao
 * cookie de sessão) ANTES de qualquer troca de token. Nenhum token é
 * devolvido ao navegador. Todas as respostas usam Headers mutáveis.
 */
export const Route = createFileRoute("/api/auth/tiktok/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const authCode = url.searchParams.get("code") ?? url.searchParams.get("auth_code");
        const state = url.searchParams.get("state");
        const market = url.searchParams.get("locale") ?? url.searchParams.get("region");

        const secure = url.protocol === "https:";
        const cookieState = getCookie(OAUTH_STATE_COOKIE) ?? null;
        const expireCookie = clearStateCookie(secure);
        const back = (params: Record<string, string>) =>
          redirectResponse(settingsUrl(request, params), expireCookie);

        const stateResult = consumeOAuthState(state, cookieState);
        if (stateResult !== "ok") {
          console.warn(`[tiktok-oauth] status=state_rejected reason=${stateResult}`);
          return back({ tiktok: "error", reason: stateResult });
        }

        if (!authCode) {
          console.warn("[tiktok-oauth] status=missing_auth_code");
          return back({ tiktok: "error", reason: "missing_auth_code" });
        }

        if (!hasTokenEncryptionKey()) {
          console.error("[tiktok-oauth] status=missing_encryption_key");
          return back({ tiktok: "error", reason: "missing_encryption_key" });
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
          return back({ tiktok: "connected" });
        } catch (error) {
          const reason =
            error instanceof TikTokOAuthError ? error.code : "token_exchange_failed";
          console.error(`[tiktok-oauth] status=failed reason=${reason}`);
          return back({ tiktok: "error", reason });
        }
      },
    },
  },
});
