import type { ProductDataProvider } from "../../ProductDataProvider";
import { normalizeProducts } from "../../normalizers/normalizeProduct";
import { logProviderSample } from "../../debug/logProviderSample";

import {
  ProviderError,
  type ExternalProduct,
  type ProductSearchParams,
  type ProductSearchResult,
  type ProductSearchSort,
} from "../../types/external-product.types";

/**
 * Apify implementation of ProductDataProvider.
 *
 * Endpoint (official Apify REST API v2):
 *   POST https://api.apify.com/v2/acts/{actorId}/run-sync-get-dataset-items
 * Auth: Authorization: Bearer <APIFY_API_TOKEN>  (server-side only)
 *
 * The Actor is NOT hardcoded: it is read from APIFY_PRODUCT_ACTOR_ID.
 *
 * Stage 02C.2B — the input now uses ONLY keys that exist in the real Actor
 * input schema (lurkapi~tiktok-shop-scraper, build 0.0.17):
 *   keywords[], keywordSortBy, maxProductsPerSource, country,
 *   includeCreatorCount (paid → always false), includeFirstSeen (free),
 *   output* toggles (off for fields the normalizer never reads).
 *
 * `maxProductsPerSource` is CRITICAL: without it the Actor defaults to 50
 * products per keyword and every one of them is billed.
 */
const APIFY_BASE_URL = "https://api.apify.com/v2";
const DEFAULT_TIMEOUT_MS = 120_000;

/** Mirrors the Actor's `keywordSortBy` enum. Nothing invented. */
const SORT_MAP: Record<ProductSearchSort, "default" | "best_sellers"> = {
  relevance: "default",
  best_sellers: "best_sellers",
};

/** Output fields the normalizer never reads — off keeps rows lean and fast. */
const DISABLED_OUTPUTS = {
  outputDescription: false,
  outputVariants: false,
  outputSellerId: false,
  outputSellerFollowers: false,
  outputSellerRating: false,
  outputSellerSold: false,
  outputSellerResponseRatePct: false,
  outputSellerShipsWithinDays: false,
  outputSellerPositiveFeedbackPct: false,
  outputSellerProductCount: false,
  outputSellerReviewCount: false,
  outputSellerUrl: false,
  outputSellerIsOfficial: false,
  outputShippingOrigin: false,
} as const;

export class ApifyProductDataProvider implements ProductDataProvider {
  readonly name = "apify";

  private get token(): string | undefined {
    return process.env["APIFY_API_TOKEN"];
  }

  private get actorId(): string | undefined {
    return process.env["APIFY_PRODUCT_ACTOR_ID"];
  }

  isConfigured(): boolean {
    return Boolean(this.token && this.actorId);
  }

  async searchProducts(params: ProductSearchParams): Promise<ProductSearchResult> {
    const token = this.token;
    const actorId = this.actorId;

    if (!token || !actorId) {
      throw new ProviderError("not_configured", "Provider de dados não configurado.", 503);
    }

    const requestedLimit = params.limit ?? 10;
    const providerLimit = Math.min(Math.max(requestedLimit, 1), 50);
    const sort: ProductSearchSort = params.sort ?? "relevance";
    const market = params.country ? params.country.trim().toUpperCase() : null;
    const timeoutMs = Number(process.env["APIFY_TIMEOUT_MS"] ?? DEFAULT_TIMEOUT_MS);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const startedAt = Date.now();

    try {
      const url = `${APIFY_BASE_URL}/acts/${encodeURIComponent(actorId)}/run-sync-get-dataset-items?limit=${providerLimit}`;
      const response = await fetch(url, {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          keywords: [params.keyword],
          keywordSortBy: SORT_MAP[sort],
          // Collection cap at the source: prevents the implicit 50-product default.
          maxProductsPerSource: providerLimit,
          ...(market ? { country: market } : {}),
          includeCreatorCount: false, // paid add-on — intentionally off
          includeFirstSeen: true, // free
          ...DISABLED_OUTPUTS,
        }),
      });

      const durationMs = Date.now() - startedAt;

      if (!response.ok) {
        const body = (await response.text()).slice(0, 500);
        throw new ProviderError(
          "provider_error",
          `Provider respondeu ${response.status}: ${body}`,
          502,
        );
      }

      const payload: unknown = await response.json();
      if (!Array.isArray(payload)) {
        throw new ProviderError(
          "invalid_response",
          "Provider retornou um formato inesperado (esperado: lista de itens).",
        );
      }

      const receivedCount = payload.length;
      const rawItems = (payload as ExternalProduct[]).slice(0, providerLimit);
      const items = normalizeProducts(rawItems, this.name);
      // TEMPORARY (02C.2D): safe schema observability, no secrets logged.
      logProviderSample(this.name, rawItems, items);


      return {
        source: this.name,
        query: { ...params, limit: providerLimit, sort },
        count: items.length,
        durationMs,
        items,
        diagnostics: {
          requestedLimit,
          providerLimit,
          receivedCount,
          sort,
          market,
        },
      };
    } catch (error) {
      if (error instanceof ProviderError) throw error;
      if (error instanceof Error && error.name === "AbortError") {
        throw new ProviderError("timeout", `Provider não respondeu em ${timeoutMs}ms.`, 504);
      }
      throw new ProviderError(
        "provider_error",
        error instanceof Error ? error.message : "Falha desconhecida no provider.",
      );
    } finally {
      clearTimeout(timer);
    }
  }
}

