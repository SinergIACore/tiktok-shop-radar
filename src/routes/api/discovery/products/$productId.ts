import { createFileRoute } from "@tanstack/react-router";

import { getDiscoveryStore } from "@/server/discovery/index.server";

/**
 * GET /api/discovery/products/:productId
 * Discovery origin of a product ("Descoberto por"). Read-only; the external
 * provider is never called here.
 */
export const Route = createFileRoute("/api/discovery/products/$productId")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const url = new URL(request.url);
        const parsed = Number(url.searchParams.get("limit"));
        const limit = Number.isFinite(parsed) ? Math.min(Math.max(Math.trunc(parsed), 1), 100) : 50;

        try {
          const store = await getDiscoveryStore();
          const discoveries = await store.listDiscoveriesForProduct(params.productId, limit);
          return Response.json({ store: store.name, discoveries });
        } catch {
          return Response.json(
            { error: { code: "database_error", message: "Falha ao carregar descobertas." } },
            { status: 500 },
          );
        }
      },
    },
  },
});
