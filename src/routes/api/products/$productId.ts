import { createFileRoute } from "@tanstack/react-router";

import { getProductReadRepository } from "@/server/read/index.server";

import { toProductListViewModel, toSnapshotViewModel } from "@/lib/product-view-model";

/** GET /api/products/:productId — product view model + chronological history. */
export const Route = createFileRoute("/api/products/$productId")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        try {
          const repository = await getProductReadRepository();
          const product = await repository.getProductWithMetrics(params.productId);
          if (!product) {
            return Response.json(
              { error: { code: "not_found", message: "Produto não encontrado." } },
              { status: 404 },
            );
          }
          const history = await repository.listHistory(product.id);
          return Response.json({
            store: repository.name,
            product: toProductListViewModel(product),
            history: history.map(toSnapshotViewModel),
          });
        } catch (error) {
          console.error("[product-detail] database_error", error);
          return Response.json(
            { error: { code: "database_error", message: "Não foi possível carregar o produto." } },
            { status: 500 },
          );
        }
      },
    },
  },
});
