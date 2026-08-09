import { createFileRoute } from "@tanstack/react-router";

import { getProductStore } from "@/server/persistence/index.server";

// Pure, dependency-free rules module: safe to import statically. Importing it
// dynamically made the SSR bundler build a namespace object with the
// `__exportAll` helper, which threw at module load in the Node output.
import { soldCountDelta } from "@/server/persistence/snapshot-rules";

/**
 * GET /api/labs/products/:productId/history
 * Returns the persisted product and its snapshots ordered by observedAt ASC,
 * plus the raw soldCountDelta between the two most recent snapshots.
 */
export const Route = createFileRoute("/api/labs/products/$productId/history")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        try {
          // Only the store (which may load the pg driver) stays dynamic so it
          // never reaches the client bundle.
          const store = await getProductStore();
          const product = await store.getProduct(params.productId);
          if (!product) {
            return Response.json(
              { error: { code: "not_found", message: "Produto não encontrado." } },
              { status: 404 },
            );
          }
          const snapshots = await store.listSnapshots(product.id);
          return Response.json({
            product,
            snapshots,
            metrics: { soldCountDelta: soldCountDelta(snapshots) },
          });
        } catch (error) {
          console.error("[history] database_error", error);
          return Response.json(
            { error: { code: "database_error", message: "Falha ao ler o histórico." } },
            { status: 500 },
          );
        }
      },
    },
  },
});
