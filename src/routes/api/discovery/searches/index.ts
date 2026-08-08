import { createFileRoute } from "@tanstack/react-router";

import { DiscoveryError } from "@/server/discovery/store-types";
import { validateSearchInput } from "@/server/discovery/validation";

/**
 * GET  /api/discovery/searches   — paginated saved searches (never calls the provider)
 * POST /api/discovery/searches   — creates a saved search
 */
export const Route = createFileRoute("/api/discovery/searches/")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const asInt = (raw: string | null, fallback: number) => {
          const parsed = Number(raw);
          return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
        };
        const page = Math.max(asInt(url.searchParams.get("page"), 1), 1);
        const limit = Math.min(Math.max(asInt(url.searchParams.get("limit"), 25), 1), 100);
        const activeOnly = url.searchParams.get("activeOnly") === "true";

        try {
          const discovery = await import("@/server/discovery/index.server");
          const store = await discovery.getDiscoveryStore();
          const result = await store.listSearches({ page, limit, activeOnly });
          return Response.json({ store: store.name, ...result });
        } catch (error) {
          if (error instanceof DiscoveryError) {
            return Response.json(
              { error: { code: error.code, message: error.message } },
              { status: error.status },
            );
          }
          return Response.json(
            { error: { code: "database_error", message: "Falha ao listar pesquisas." } },
            { status: 500 },
          );
        }
      },

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
          const input = validateSearchInput(body);
          const discovery = await import("@/server/discovery/index.server");
          const store = await discovery.getDiscoveryStore();
          const search = await store.createSearch(input);
          return Response.json({ search }, { status: 201 });
        } catch (error) {
          if (error instanceof DiscoveryError) {
            return Response.json(
              { error: { code: error.code, message: error.message } },
              { status: error.status },
            );
          }
          return Response.json(
            { error: { code: "database_error", message: "Falha ao criar pesquisa." } },
            { status: 500 },
          );
        }
      },
    },
  },
});
