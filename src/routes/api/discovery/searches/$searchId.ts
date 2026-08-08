import { createFileRoute } from "@tanstack/react-router";

import { DiscoveryError } from "@/server/discovery/store-types";
import { validateSearchPatch } from "@/server/discovery/validation";

/**
 * GET   /api/discovery/searches/:searchId
 * PATCH /api/discovery/searches/:searchId  (logical archive via active=false)
 * Neither handler calls the external provider.
 */
export const Route = createFileRoute("/api/discovery/searches/$searchId")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        try {
          const discovery = await import("@/server/discovery/index.server");
          const store = await discovery.getDiscoveryStore();
          const search = await store.getSearch(params.searchId);
          if (!search) {
            return Response.json(
              { error: { code: "not_found", message: "Pesquisa não encontrada." } },
              { status: 404 },
            );
          }
          return Response.json({ search });
        } catch {
          return Response.json(
            { error: { code: "database_error", message: "Falha ao carregar pesquisa." } },
            { status: 500 },
          );
        }
      },

      PATCH: async ({ params, request }) => {
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
          const patch = validateSearchPatch(body);
          const discovery = await import("@/server/discovery/index.server");
          const store = await discovery.getDiscoveryStore();
          const search = await store.updateSearch(params.searchId, patch);
          if (!search) {
            return Response.json(
              { error: { code: "not_found", message: "Pesquisa não encontrada." } },
              { status: 404 },
            );
          }
          return Response.json({ search });
        } catch (error) {
          if (error instanceof DiscoveryError) {
            return Response.json(
              { error: { code: error.code, message: error.message } },
              { status: error.status },
            );
          }
          return Response.json(
            { error: { code: "database_error", message: "Falha ao atualizar pesquisa." } },
            { status: 500 },
          );
        }
      },
    },
  },
});
