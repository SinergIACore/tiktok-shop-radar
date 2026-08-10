import { createFileRoute } from "@tanstack/react-router";

import { CreatorApiError, getCreatorProfile } from "@/server/tiktok/creator-api.server";

/**
 * GET /api/integrations/tiktok/profile
 * Primeiro teste após a autorização: confirma o Creator conectado.
 */
export const Route = createFileRoute("/api/integrations/tiktok/profile")({
  server: {
    handlers: {
      GET: async () => {
        try {
          return Response.json({ data: await getCreatorProfile() });
        } catch (error) {
          const err =
            error instanceof CreatorApiError
              ? error
              : new CreatorApiError("request_failed", "Falha desconhecida.");
          console.error(`[tiktok-creator] endpoint=profiles status=failed reason=${err.code}`);
          return Response.json(
            { error: { code: err.code, message: err.message } },
            { status: err.status },
          );
        }
      },
    },
  },
});
