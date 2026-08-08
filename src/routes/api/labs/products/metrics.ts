import { createFileRoute } from "@tanstack/react-router";

/**
 * GET /api/labs/products/metrics
 * Read-only: persisted products + two most recent snapshots + raw metrics.
 * Never calls the external provider, never writes.
 */
export const Route = createFileRoute("/api/labs/products/metrics")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const limitParam = Number(url.searchParams.get("limit") ?? 50);
          const limit = Number.isFinite(limitParam) ? limitParam : 50;

          const { getProductReadRepository } = await import("@/server/read/index.server");
          const repository = await getProductReadRepository();
          const items = await repository.listProductsWithMetrics(limit);
          return Response.json({ store: repository.name, items });
        } catch (error) {
          console.error("[labs-metrics] database_error", error);
          return Response.json(
            { error: { code: "database_error", message: "Falha ao ler as métricas." } },
            { status: 500 },
          );
        }
      },
    },
  },
});
