import { createFileRoute } from "@tanstack/react-router";

import { buildConnectResponse } from "@/server/tiktok/oauth-response.server";

/**
 * GET /api/auth/tiktok/connect
 *
 * Inicia a CREATOR AUTHORIZATION redirecionando para
 * https://shop.tiktok.com/alliance/creator/auth?app_key=...&state=...
 *
 * O `state` é gerado no servidor (32 bytes aleatórios), guardado em registro
 * server-side single-use e amarrado ao navegador por cookie HttpOnly enviado
 * no próprio 302 (headers mutáveis — nunca `Response.redirect()`).
 */
export const Route = createFileRoute("/api/auth/tiktok/connect")({
  server: {
    handlers: {
      GET: async ({ request }) => buildConnectResponse(request),
    },
  },
});
