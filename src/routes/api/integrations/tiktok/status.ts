import { createFileRoute } from "@tanstack/react-router";

import { AUTHORIZATION_TYPE } from "@/services/providers/product-data/providers/tiktok-official/TikTokShopOfficialProvider";
import { isTikTokOfficialConfigured } from "@/services/providers/product-data/providers/tiktok-official/tiktok-official.config";
import { hasTokenEncryptionKey } from "@/server/tiktok/token-crypto";
import { getTikTokAuthorizationStore } from "@/server/tiktok/index.server";
import { buildTikTokAuthorizeUrl } from "@/server/tiktok/authorize-url.server";

/**
 * GET /api/integrations/tiktok/status
 *
 * Estado mínimo da integração oficial para a tela de Configurações.
 * NUNCA retorna access token, refresh token, app secret ou chave de cripto.
 */
export const Route = createFileRoute("/api/integrations/tiktok/status")({
  server: {
    handlers: {
      GET: async () => {
        const configured = isTikTokOfficialConfigured() && hasTokenEncryptionKey();
        const authorizeReady = buildTikTokAuthorizeUrl().ok;

        let connected = false;
        let market: string | null = null;
        let expiresAt: string | null = null;

        if (configured) {
          try {
            const store = await getTikTokAuthorizationStore();
            const auth = await store.getLatest(AUTHORIZATION_TYPE);
            if (auth) {
              const notExpired =
                !auth.accessTokenExpiresAt || new Date(auth.accessTokenExpiresAt) > new Date();
              connected = notExpired;
              market = auth.market;
              expiresAt = auth.accessTokenExpiresAt;
            }
          } catch {
            console.error("[tiktok-status] status=store_error");
          }
        }

        return Response.json({ configured, authorizeReady, connected, market, expiresAt });
      },
    },
  },
});
