import { createFileRoute } from "@tanstack/react-router";

import { getProductReadRepository } from "@/server/read/index.server";

import {
  DEFAULT_HISTORY_LIMIT,
  TrendReadService,
} from "@/server/intelligence/trend-read.service";

/**
 * GET /api/labs/products/:productId/trend
 * Full trend analysis of one product plus the snapshots used.
 */
export const Route = createFileRoute("/api/labs/products/$productId/trend")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        try {
          const raw = Number(new URL(request.url).searchParams.get("historyLimit"));
          const historyLimit = Number.isFinite(raw) && raw > 1 ? Math.trunc(raw) : DEFAULT_HISTORY_LIMIT;

          const repository = await getProductReadRepository();
          const service = new TrendReadService(repository);
          const result = await service.getOne(params.productId, Math.min(historyLimit, 200));
          if (!result) {
            return Response.json(
              { error: { code: "not_found", message: "Produto não encontrado." } },
              { status: 404 },
            );
          }
          return Response.json({
            store: service.store,
            generatedAt: new Date().toISOString(),
            item: result.item,
            snapshots: result.snapshots,
          });
        } catch (error) {
          console.error("[labs-trend-detail] database_error", error);
          return Response.json(
            { error: { code: "database_error", message: "Falha ao calcular a tendência." } },
            { status: 500 },
          );
        }
      },
    },
  },
});
