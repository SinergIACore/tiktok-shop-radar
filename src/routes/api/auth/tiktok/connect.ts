import { createFileRoute } from "@tanstack/react-router";
import { setCookie } from "@tanstack/react-start/server";

import { buildTikTokAuthorizeUrl } from "@/server/tiktok/authorize-url.server";
import {
  createOAuthState,
  OAUTH_STATE_COOKIE,
  OAUTH_STATE_TTL_MS,
} from "@/server/tiktok/oauth-state.server";

/**
 * GET /api/auth/tiktok/connect
 *
 * Inicia a CREATOR AUTHORIZATION redirecionando para
 * https://shop.tiktok.com/alliance/creator/auth?app_key=...&state=...
 *
 * O `state` é gerado no servidor (32 bytes aleatórios), guardado em registro
 * server-side single-use e amarrado ao navegador por cookie HttpOnly.
 * Nenhum segredo entra na URL.
 */
export const Route = createFileRoute("/api/auth/tiktok/connect")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const state = createOAuthState();
        const result = buildTikTokAuthorizeUrl(state);
        if (!result.ok) {
          console.warn(`[tiktok-oauth] status=connect_blocked reason=${result.reason}`);
          const url = new URL("/settings", request.url);
          url.searchParams.set("tiktok", "error");
          url.searchParams.set("reason", result.reason);
          return Response.redirect(url.toString(), 302);
        }

        setCookie(OAUTH_STATE_COOKIE, state, {
          httpOnly: true,
          secure: new URL(request.url).protocol === "https:",
          sameSite: "lax",
          path: "/",
          maxAge: Math.floor(OAUTH_STATE_TTL_MS / 1000),
        });

        return Response.redirect(result.url, 302);
      },
    },
  },
});
