import { createFileRoute } from "@tanstack/react-router";

import { hasTokenEncryptionKey } from "@/server/tiktok/token-crypto";
import { isTikTokOfficialConfigured } from "@/services/providers/product-data/providers/tiktok-official/tiktok-official.config";
import { creatorConnectionState } from "@/server/tiktok/creator-api.server";

/**
 * GET /api/integrations/tiktok/status
 *
 * Estado da integração Creator para a tela de Configurações.
 * NUNCA retorna access token, refresh token, app secret ou chave de cripto.
 */
export const Route = createFileRoute("/api/integrations/tiktok/status")({
  server: {
    handlers: {
      GET: async () => {
        const configured = isTikTokOfficialConfigured() && hasTokenEncryptionKey();
        if (!configured) {
          return Response.json({
            configured: false,
            state: "not_configured",
            connected: false,
            market: null,
            expiresAt: null,
            openId: null,
            grantedScopes: [],
            missingScopes: [],
          });
        }

        try {
          const { state, authorization, missing } = await creatorConnectionState();
          return Response.json({
            configured: true,
            state,
            connected: state === "connected",
            market: authorization?.market ?? null,
            expiresAt: authorization?.accessTokenExpiresAt ?? null,
            // open_id não é segredo, mas ainda assim vai mascarado.
            openId: authorization?.openId ? `${authorization.openId.slice(0, 6)}***` : null,
            grantedScopes: authorization?.grantedScopes ?? [],
            missingScopes: missing,
          });
        } catch {
          console.error("[tiktok-status] status=store_error");
          return Response.json({
            configured: true,
            state: "token_invalid",
            connected: false,
            market: null,
            expiresAt: null,
            openId: null,
            grantedScopes: [],
            missingScopes: [],
          });
        }
      },
    },
  },
});
