import { createFileRoute } from "@tanstack/react-router";

import { CreatorApiError, getCreatorShowcaseProducts } from "@/server/tiktok/creator-api.server";

/**
 * GET /api/integrations/tiktok/showcase?pageSize=10
 * Produtos do Showcase do Creator (scopes creator.showcase.read / creator.video.write).
 */
export const Route = createFileRoute("/api/integrations/tiktok/showcase")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const pageSize = Number(new URL(request.url).searchParams.get("pageSize") ?? 10);
        try {
          return Response.json({ data: await getCreatorShowcaseProducts(pageSize) });
        } catch (error) {
          const err =
            error instanceof CreatorApiError
              ? error
              : new CreatorApiError("request_failed", "Falha desconhecida.");
          console.error(`[tiktok-creator] endpoint=showcase status=failed reason=${err.code}`);
          return Response.json(
            { error: { code: err.code, message: err.message } },
            { status: err.status },
          );
        }
      },
    },
  },
});
