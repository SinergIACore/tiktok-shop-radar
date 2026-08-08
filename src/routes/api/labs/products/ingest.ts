import { createFileRoute } from "@tanstack/react-router";

import { ProviderError } from "@/services/providers/product-data/types/external-product.types";

/**
 * POST /api/labs/products/ingest
 * LAB route: runs the external provider once (explicit user action only) and
 * persists Product + ProductSnapshot. Never called automatically.
 */
const MAX_LAB_LIMIT = 20;

export const Route = createFileRoute("/api/labs/products/ingest")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json(
            { error: { code: "validation_error", message: "Corpo JSON inválido." } },
            { status: 400 },
          );
        }

        const input = (body ?? {}) as { keyword?: unknown; limit?: unknown };
        const keyword = typeof input.keyword === "string" ? input.keyword.trim() : "";
        if (!keyword) {
          return Response.json(
            { error: { code: "validation_error", message: "Informe uma palavra-chave." } },
            { status: 400 },
          );
        }
        const parsedLimit = Number(input.limit ?? 5);
        const limit = Number.isFinite(parsedLimit)
          ? Math.min(Math.max(Math.trunc(parsedLimit), 1), MAX_LAB_LIMIT)
          : 5;

        const { getProductDataProvider } = await import(
          "@/services/providers/product-data/index.server"
        );
        const provider = getProductDataProvider();
        if (!provider.isConfigured()) {
          return Response.json(
            {
              error: {
                code: "not_configured",
                message: "Provider de dados não configurado.",
              },
            },
            { status: 503 },
          );
        }

        let items;
        let source: string;
        try {
          const result = await provider.searchProducts({ keyword, limit });
          items = result.items;
          source = result.source;
        } catch (error) {
          if (error instanceof ProviderError) {
            const code = error.code === "timeout" ? "provider_timeout" : error.code;
            return Response.json(
              { error: { code, message: error.message } },
              { status: error.status },
            );
          }
          return Response.json(
            {
              error: {
                code: "provider_error",
                message: error instanceof Error ? error.message : "Erro desconhecido.",
              },
            },
            { status: 502 },
          );
        }

        try {
          // One dynamic import per statement (see history route): Promise.all
          // over dynamic imports makes the SSR bundler emit namespace objects
          // built with the `__exportAll` helper, which fails at runtime.
          const persistence = await import("@/server/persistence/index.server");
          const ingestion0 = await import("@/server/ingestion/product-ingestion.service");
          const ProductIngestionService = ingestion0.ProductIngestionService;
          const store = await persistence.getProductStore();
          const service = new ProductIngestionService(store);
          const { productIds, ...ingestion } = await service.ingest(items);

          console.info(
            `[ingestion] store=${store.name} received=${ingestion.received} created=${ingestion.productsCreated} updated=${ingestion.productsUpdated} snapshots=${ingestion.snapshotsCreated}`,
          );

          return Response.json({
            ok: true,
            source,
            store: store.name,
            query: { keyword, limit },
            ingestion,
            productIds,
          });
        } catch (error) {
          const { PersistenceError } = await import("@/server/persistence/types");
          if (error instanceof PersistenceError) {
            return Response.json(
              { error: { code: error.code, message: error.message } },
              { status: error.status },
            );
          }
          console.error("[ingestion] database_error", error);
          return Response.json(
            { error: { code: "database_error", message: "Falha ao persistir a ingestão." } },
            { status: 500 },
          );
        }
      },
    },
  },
});
