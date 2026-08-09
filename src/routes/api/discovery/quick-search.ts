import { createFileRoute } from "@tanstack/react-router";

import { getDiscoveryStore } from "@/server/discovery/index.server";
import { getProductStore } from "@/server/persistence/index.server";
import { getProductDataProvider } from "@/services/providers/product-data/index.server";
import { getProductReadRepository } from "@/server/read/index.server";
import { DiscoveryService, buildDiscoveryProducts } from "@/server/discovery/discovery.service";

import { DiscoveryError } from "@/server/discovery/store-types";
import { parseLimits, validateQuickSearch } from "@/server/discovery/validation";

/**
 * POST /api/discovery/quick-search
 * Ad-hoc (unsaved) manual run for a keyword or product name.
 * Body: { query, type?, maxProductsPerTerm? }
 */
export const Route = createFileRoute("/api/discovery/quick-search")({
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

        try {
          const { type, query } = validateQuickSearch(body);
          const limits = parseLimits({ ...(body as object), maxTermsPerRun: 1 });


          const discoveryStore = await getDiscoveryStore();
          const productStore = await getProductStore();
          const provider = getProductDataProvider();
          const service = new DiscoveryService(
            discoveryStore,
            productStore,
            provider,
          );

          const result = await service.run({ search: null, terms: [query] }, limits);
          const repository = await getProductReadRepository();
          const products = await buildDiscoveryProducts(
            repository,
            result.productIds,
          );

          console.info(
            `[discovery] quick type=${type} received=${result.run.received} unique=${result.run.uniqueProducts} errors=${result.errors.length}`,
          );

          return Response.json({
            search: null,
            quick: { type, query },
            run: result.run,
            limits: result.limits,
            terms: result.terms,
            errors: result.errors,
            products,
          });
        } catch (error) {
          if (error instanceof DiscoveryError) {
            return Response.json(
              { error: { code: error.code, message: error.message } },
              { status: error.status },
            );
          }
          return Response.json(
            { error: { code: "database_error", message: "Falha ao executar a busca." } },
            { status: 500 },
          );
        }
      },
    },
  },
});
