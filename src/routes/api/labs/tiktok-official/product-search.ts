import { createFileRoute } from "@tanstack/react-router";

import { TikTokShopOfficialProvider } from "@/services/providers/product-data/providers/tiktok-official/TikTokShopOfficialProvider";
import { MAX_PAGE_SIZE } from "@/services/providers/product-data/providers/tiktok-official/TikTokShopOfficialProvider";
import { ProviderError } from "@/services/providers/product-data/types/external-product.types";

/**
 * POST /api/labs/tiktok-official/product-search
 *
 * Prova controlada do canal oficial. NÃO persiste nada no banco principal:
 * o objetivo é apenas enxergar a resposta normalizada e comprovar mercado BR.
 * pageSize é limitado a 5 nesta etapa para evitar chamadas desnecessárias.
 */
export const Route = createFileRoute("/api/labs/tiktok-official/product-search")({
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

        const input = (body ?? {}) as {
          keywords?: unknown;
          pageSize?: unknown;
          sortField?: unknown;
          sortOrder?: unknown;
        };

        const keywords = Array.isArray(input.keywords)
          ? input.keywords.filter((k): k is string => typeof k === "string" && k.trim() !== "")
          : [];
        if (keywords.length === 0) {
          return Response.json(
            { error: { code: "validation_error", message: "Informe ao menos uma palavra-chave." } },
            { status: 400 },
          );
        }

        const parsedPageSize = Number(input.pageSize ?? MAX_PAGE_SIZE);
        const pageSize = Number.isFinite(parsedPageSize)
          ? Math.min(Math.max(Math.trunc(parsedPageSize), 1), MAX_PAGE_SIZE)
          : MAX_PAGE_SIZE;

        const allowedSortFields = [
          "units_sold",
          "commission",
          "commission_rate",
          "product_sales_price",
        ] as const;
        const sortField = allowedSortFields.includes(input.sortField as never)
          ? (input.sortField as (typeof allowedSortFields)[number])
          : "units_sold";
        const sortOrder = input.sortOrder === "ASC" ? "ASC" : "DESC";

        const provider = new TikTokShopOfficialProvider();
        if (!provider.isConfigured()) {
          return Response.json(
            {
              error: {
                code: "not_configured",
                message: "Credenciais TikTok não configuradas.",
              },
            },
            { status: 503 },
          );
        }

        try {
          const result = await provider.searchOpenCollaboration({
            keywords,
            pageSize,
            sortField,
            sortOrder,
          });
          console.info(
            `[tiktok-official] status=ok duration_ms=${result.durationMs} results=${result.count} regions=${result.diagnostics.saleRegions.join(",") || "none"}`,
          );
          return Response.json({
            ok: true,
            persisted: false,
            ...result,
          });
        } catch (error) {
          if (error instanceof ProviderError) {
            console.error(`[tiktok-official] status=${error.code}`);
            return Response.json(
              { error: { code: error.code, message: error.message } },
              { status: error.status },
            );
          }
          console.error("[tiktok-official] status=unexpected");
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
      },
    },
  },
});
