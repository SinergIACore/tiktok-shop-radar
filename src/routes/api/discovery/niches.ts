import { createFileRoute } from "@tanstack/react-router";

import { NICHE_CATALOG } from "@/config/niches";
import { DEFAULT_LIMITS, HARD_LIMITS } from "@/server/discovery/validation";

/**
 * GET /api/discovery/niches
 * Read-only catalog. Never calls the external provider.
 */
export const Route = createFileRoute("/api/discovery/niches")({
  server: {
    handlers: {
      GET: async () =>
        Response.json({
          niches: NICHE_CATALOG.map((niche) => ({
            key: niche.key,
            name: niche.name,
            description: niche.description ?? null,
            termCount: niche.terms.length,
            terms: niche.terms,
          })),
          limits: { defaults: DEFAULT_LIMITS, max: HARD_LIMITS },
        }),
    },
  },
});
