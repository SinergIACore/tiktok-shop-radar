import { createFileRoute } from "@tanstack/react-router";

import {
  ProviderError,
  type ProductSearchResult,
} from "@/services/providers/product-data/types/external-product.types";

/**
 * GET /api/products/search?keyword=...&limit=...&country=...
 *
 * GET was chosen because the operation is a read-only, cacheable query with a
 * small set of scalar parameters (see docs/API.md).
 */
export const Route = createFileRoute("/api/products/search")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const keyword = (url.searchParams.get("keyword") ?? "").trim();
        const limitParam = url.searchParams.get("limit");
        const country = url.searchParams.get("country")?.trim() || undefined;

        if (!keyword) {
          return Response.json(
            { error: { code: "invalid_params", message: "Informe uma palavra-chave." } },
            { status: 400 },
          );
        }

        const parsedLimit = limitParam ? Number(limitParam) : 10;
        const limit = Number.isFinite(parsedLimit)
          ? Math.min(Math.max(Math.trunc(parsedLimit), 1), 50)
          : 10;

        const { getProductDataProvider } =
          await import("@/services/providers/product-data/index.server");
        const provider = getProductDataProvider();

        if (!provider.isConfigured()) {
          console.warn(`[product-data] provider=${provider.name} status=not_configured`);
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

        try {
          const result: ProductSearchResult = await provider.searchProducts({
            keyword,
            limit,
            ...(country ? { country } : {}),
          });
          console.info(
            `[product-data] provider=${result.source} status=ok duration_ms=${result.durationMs} results=${result.count}`,
          );
          return Response.json(result);
        } catch (error) {
          if (error instanceof ProviderError) {
            console.error(
              `[product-data] provider=${provider.name} status=${error.code} message=${error.message}`,
            );
            return Response.json(
              { error: { code: error.code, message: error.message } },
              { status: error.status },
            );
          }
          const message = error instanceof Error ? error.message : "Erro desconhecido.";
          console.error(
            `[product-data] provider=${provider.name} status=unexpected message=${message}`,
          );
          return Response.json({ error: { code: "provider_error", message } }, { status: 502 });
        }
      },
    },
  },
});
