import { createFileRoute } from "@tanstack/react-router";

// Pure modules: static imports (SSR-safe, no `pg` in the graph).
import { parseTrendQuery, TrendReadService } from "@/server/intelligence/trend-read.service";

/**
 * GET /api/labs/products/trends
 * Read-only LAB endpoint: persisted snapshots -> pure trend engine.
 * Params: limit, historyLimit, status, minSnapshots.
 */
export const Route = createFileRoute("/api/labs/products/trends")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const query = parseTrendQuery(new URL(request.url).searchParams);
          // One dynamic import per statement: keeps the pg driver server-only.
          const { getProductReadRepository } = await import("@/server/read/index.server");
          const repository = await getProductReadRepository();
          const service = new TrendReadService(repository);
          const items = await service.list(query);
          return Response.json({
            store: service.store,
            generatedAt: new Date().toISOString(),
            query,
            items,
          });
        } catch (error) {
          console.error("[labs-trends] database_error", error);
          return Response.json(
            { error: { code: "database_error", message: "Falha ao calcular as tendências." } },
            { status: 500 },
          );
        }
      },
    },
  },
});
