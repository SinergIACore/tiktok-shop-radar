import { createFileRoute } from "@tanstack/react-router";

import { buildTikTokAuthorizeUrl } from "@/server/tiktok/authorize-url.server";

/**
 * GET /api/auth/tiktok/connect
 *
 * Inicia a autorização oficial redirecionando o navegador para a tela do
 * TikTok Shop. Reutiliza a config server-only existente; nenhum segredo é
 * exposto na URL (o app_secret só é usado na troca de token, no callback).
 */
export const Route = createFileRoute("/api/auth/tiktok/connect")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const result = buildTikTokAuthorizeUrl();
        if (!result.ok) {
          console.warn(`[tiktok-oauth] status=connect_blocked reason=${result.reason}`);
          const url = new URL("/settings", request.url);
          url.searchParams.set("tiktok", "error");
          url.searchParams.set("reason", result.reason);
          return Response.redirect(url.toString(), 302);
        }
        return Response.redirect(result.url, 302);
      },
    },
  },
});
