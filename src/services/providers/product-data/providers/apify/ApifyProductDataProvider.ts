import type { ProductDataProvider } from "../../ProductDataProvider";
import { normalizeProducts } from "../../normalizers/normalizeProduct";
import {
  ProviderError,
  type ExternalProduct,
  type ProductSearchParams,
  type ProductSearchResult,
} from "../../types/external-product.types";

/**
 * Apify implementation of ProductDataProvider.
 *
 * Endpoint (official Apify REST API v2):
 *   POST https://api.apify.com/v2/acts/{actorId}/run-sync-get-dataset-items
 * Auth: Authorization: Bearer <APIFY_API_TOKEN>  (server-side only)
 *
 * The Actor is NOT hardcoded: it is read from APIFY_PRODUCT_ACTOR_ID so the
 * marketplace Actor can be swapped without code changes. The Actor input is
 * also configurable-free — we send a conservative, widely used input shape and
 * normalize defensively, because each Actor has its own output schema.
 */
const APIFY_BASE_URL = "https://api.apify.com/v2";
const DEFAULT_TIMEOUT_MS = 120_000;

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

    const limit = Math.min(Math.max(params.limit ?? 10, 1), 50);
    const timeoutMs = Number(process.env["APIFY_TIMEOUT_MS"] ?? DEFAULT_TIMEOUT_MS);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const startedAt = Date.now();

    try {
      const url = `${APIFY_BASE_URL}/acts/${encodeURIComponent(actorId)}/run-sync-get-dataset-items?limit=${limit}`;
      const response = await fetch(url, {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          keyword: params.keyword,
          keywords: [params.keyword],
          searchQueries: [params.keyword],
          maxItems: limit,
          ...(params.country ? { country: params.country, region: params.country } : {}),
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

      const items = normalizeProducts((payload as ExternalProduct[]).slice(0, limit), this.name);

      return {
        source: this.name,
        query: { ...params, limit },
        count: items.length,
        durationMs,
        items,
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
