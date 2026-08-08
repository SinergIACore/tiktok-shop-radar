import { createFileRoute } from "@tanstack/react-router";

import { DiscoveryError } from "@/server/discovery/store-types";
import { parseLimits } from "@/server/discovery/validation";

/**
 * POST /api/discovery/searches/:searchId/run
 * Manual execution only — there is no scheduler, cron or worker in this stage.
 * Body (optional): { maxTermsPerRun, maxProductsPerTerm }
 */
export const Route = createFileRoute("/api/discovery/searches/$searchId/run")({
  server: {
    handlers: {
      POST: async ({ params, request }) => {
        let body: unknown = {};
        try {
          body = await request.json();
        } catch {
          body = {};
        }

        try {
          const limits = parseLimits(body);

          // One dynamic import per statement (SSR __exportAll incident).
          const discoveryStoreModule = await import("@/server/discovery/index.server");
          const persistence = await import("@/server/persistence/index.server");
          const providerModule = await import(
            "@/services/providers/product-data/index.server"
          );
          const read = await import("@/server/read/index.server");
          const serviceModule = await import("@/server/discovery/discovery.service");

          const discoveryStore = await discoveryStoreModule.getDiscoveryStore();
          const search = await discoveryStore.getSearch(params.searchId);
          if (!search) {
            return Response.json(
              { error: { code: "not_found", message: "Pesquisa não encontrada." } },
              { status: 404 },
            );
          }
          if (!search.active) {
            return Response.json(
              { error: { code: "validation_error", message: "Pesquisa desativada." } },
              { status: 400 },
            );
          }

          const productStore = await persistence.getProductStore();
          const provider = providerModule.getProductDataProvider();
          const service = new serviceModule.DiscoveryService(
            discoveryStore,
            productStore,
            provider,
          );

          const result = await service.run({ search, terms: search.terms }, limits);
          const updated = (await discoveryStore.recordRun(search.id, result.run.finishedAt)) ?? search;

          const repository = await read.getProductReadRepository();
          const products = await serviceModule.buildDiscoveryProducts(
            repository,
            result.productIds,
          );

          console.info(
            `[discovery] search=${search.id} terms=${result.run.termsExecuted} received=${result.run.received} unique=${result.run.uniqueProducts} errors=${result.errors.length}`,
          );

          return Response.json({
            search: updated,
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
            { error: { code: "database_error", message: "Falha ao executar a pesquisa." } },
            { status: 500 },
          );
        }
      },
    },
  },
});
