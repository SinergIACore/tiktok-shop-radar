import { createFileRoute } from "@tanstack/react-router";

import { getDiscoveryStore } from "@/server/discovery/index.server";
import { getProductStore } from "@/server/persistence/index.server";
import { getProductDataProvider } from "@/services/providers/product-data/index.server";
import { getProductReadRepository } from "@/server/read/index.server";
import { DiscoveryService, buildDiscoveryProducts } from "@/server/discovery/discovery.service";

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


          const discoveryStore = await getDiscoveryStore();
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

          const productStore = await getProductStore();
          const provider = getProductDataProvider();
          const service = new DiscoveryService(
            discoveryStore,
            productStore,
            provider,
          );

          const result = await service.run({ search, terms: search.terms }, limits, {
            market: search.market,
            sort: "best_sellers",
            quality: parseQualityRule((body as { quality?: unknown } | undefined)?.quality),
          });
          const updated = (await discoveryStore.recordRun(search.id, result.run.finishedAt)) ?? search;

          const repository = await getProductReadRepository();
          const products = await buildDiscoveryProducts(
            repository,
            result.productIds,
          );

          console.info(
            `[discovery] search=${search.id} terms=${result.run.termsExecuted} market=${search.market} received=${result.run.received} qualified=${result.run.qualified} discarded=${result.run.discarded} unique=${result.run.uniqueProducts} errors=${result.errors.length}`,
          );

          return Response.json({
            search: updated,
            run: result.run,
            limits: result.limits,
            diagnostics: result.diagnostics,
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
