import { createFileRoute } from "@tanstack/react-router";

/** GET /api/labs/products — persisted products (LAB only, no provider call). */
export const Route = createFileRoute("/api/labs/products/")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const { getProductStore } = await import("@/server/persistence/index.server");
          const store = await getProductStore();
          return Response.json({ store: store.name, items: await store.listProducts(50) });
        } catch (error) {
          console.error("[labs-products] database_error", error);
          return Response.json(
            { error: { code: "database_error", message: "Falha ao listar produtos." } },
            { status: 500 },
          );
        }
      },
    },
  },
});
