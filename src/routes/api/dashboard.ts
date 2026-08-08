import { createFileRoute } from "@tanstack/react-router";

import { toDashboardResponse } from "@/lib/dashboard-view-model";

/**
 * GET /api/dashboard — objective aggregates + bounded product lists.
 * Read-only: never calls the provider, never writes, no mock fallback.
 */
export const Route = createFileRoute("/api/dashboard")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const { getProductReadRepository } = await import("@/server/read/index.server");
          const { DashboardReadService } =
            await import("@/server/dashboard/dashboard-read.service");
          const repository = await getProductReadRepository();
          const data = await new DashboardReadService(repository).load();
          return Response.json(toDashboardResponse(data));
        } catch (error) {
          console.error("[dashboard] database_error", error);
          return Response.json(
            {
              error: { code: "database_error", message: "Não foi possível carregar o dashboard." },
            },
            { status: 500 },
          );
        }
      },
    },
  },
});
