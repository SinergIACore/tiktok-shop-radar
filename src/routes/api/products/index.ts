import { createFileRoute } from "@tanstack/react-router";

import { getProductReadRepository } from "@/server/read/index.server";

import { parseProductListQuery } from "@/server/read/list-query";
import { toProductListViewModel } from "@/lib/product-view-model";

/**
 * GET /api/products — paginated, filtered listing of persisted products.
 * Read-only: never calls the provider, never writes. No mock fallback:
 * a database failure returns an explicit error.
 */
export const Route = createFileRoute("/api/products/")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const query = parseProductListQuery(new URL(request.url).searchParams);
        try {
          const repository = await getProductReadRepository();
          const page = await repository.listProductsPage(query);
          return Response.json({
            store: repository.name,
            page: page.page,
            limit: page.limit,
            total: page.total,
            totalPages: page.totalPages,
            items: page.items.map(toProductListViewModel),
          });
        } catch (error) {
          console.error("[products] database_error", error);
          return Response.json(
            {
              error: { code: "database_error", message: "Não foi possível carregar os produtos." },
            },
            { status: 500 },
          );
        }
      },
    },
  },
});
