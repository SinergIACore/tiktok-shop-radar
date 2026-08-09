import type { ProductDataProvider } from "../../ProductDataProvider";
import {
  ProviderError,
  type ExternalProduct,
  type NormalizedProduct,
  type ProductSearchParams,
  type ProductSearchResult,
  type ProductSearchSort,
} from "../../types/external-product.types";
import { normalizeOfficialProducts } from "./normalizeOfficialProduct";
import {
  isTikTokOfficialConfigured,
  readTikTokOfficialConfig,
  TIKTOK_SCOPE_AFFILIATE_COLLABORATION_READ,
} from "./tiktok-official.config";
import { signTikTokRequest } from "@/server/tiktok/signature";
import { getTikTokAuthorizationStore } from "@/server/tiktok/index.server";
import { readAccessToken } from "@/server/tiktok/authorization-store";

/**
 * TikTokShopOfficialProvider — canal oficial (Etapa TikTok Oficial 01).
 *
 * Endpoint documentado (scope `creator.affiliate_collaboration.read`):
 *   POST /affiliate_creator/202405/open_collaborations/products/search
 *
 * Implementa a MESMA interface do provider atual, sem duplicar regra de
 * negócio: normalização isolada, nenhuma persistência aqui.
 *
 * PENDÊNCIA: o shape exato do request body e a assinatura só podem ser
 * considerados comprovados após um 200 real. Tudo que depende do contrato
 * oficial está confinado neste arquivo + signature.ts.
 */
export const OPEN_COLLABORATION_SEARCH_PATH =
  "/affiliate_creator/202405/open_collaborations/products/search";

/** Limite duro desta etapa: nenhuma chamada pode pedir mais que 5 itens. */
export const MAX_PAGE_SIZE = 5;

export const AUTHORIZATION_TYPE = "creator_affiliate";

export type OfficialSortField =
  | "units_sold"
  | "commission"
  | "commission_rate"
  | "product_sales_price";

export type OfficialSortOrder = "ASC" | "DESC";

export interface OfficialSearchParams {
  keywords: string[];
  pageSize?: number;
  sortField?: OfficialSortField;
  sortOrder?: OfficialSortOrder;
  /** Mantido no payload apenas quando informado (nada é inventado). */
  categoryId?: string;
  includeRaw?: boolean;
}

export interface OfficialSearchResult {
  source: "tiktok_official";
  scope: string;
  count: number;
  durationMs: number;
  items: NormalizedProduct[];
  diagnostics: {
    requestedPageSize: number;
    providerPageSize: number;
    receivedCount: number;
    sortField: OfficialSortField;
    sortOrder: OfficialSortOrder;
    /** Regiões distintas retornadas — usado para provar o mercado BR. */
    saleRegions: string[];
  };
}

const SORT_BY_INTENT: Record<ProductSearchSort, OfficialSortField> = {
  relevance: "units_sold",
  best_sellers: "units_sold",
};

export class TikTokShopOfficialProvider implements ProductDataProvider {
  readonly name = "tiktok_official";

  isConfigured(): boolean {
    return isTikTokOfficialConfigured();
  }

  /** Adaptação para a interface genérica usada pelo DiscoveryService. */
  async searchProducts(params: ProductSearchParams): Promise<ProductSearchResult> {
    const requestedLimit = params.limit ?? 5;
    const sort: ProductSearchSort = params.sort ?? "relevance";
    const result = await this.searchOpenCollaboration({
      keywords: [params.keyword],
      pageSize: requestedLimit,
      sortField: SORT_BY_INTENT[sort],
      sortOrder: "DESC",
    });

    return {
      source: this.name,
      query: { ...params, limit: result.diagnostics.providerPageSize, sort },
      count: result.count,
      durationMs: result.durationMs,
      items: result.items,
      diagnostics: {
        requestedLimit,
        providerLimit: result.diagnostics.providerPageSize,
        receivedCount: result.diagnostics.receivedCount,
        sort,
        market: params.country ? params.country.trim().toUpperCase() : null,
      },
    };
  }

  async searchOpenCollaboration(params: OfficialSearchParams): Promise<OfficialSearchResult> {
    const config = readTikTokOfficialConfig();
    if (!config) {
      throw new ProviderError("not_configured", "Credenciais TikTok não configuradas.", 503);
    }

    const keywords = params.keywords.map((k) => k.trim()).filter(Boolean);
    if (keywords.length === 0) {
      throw new ProviderError("invalid_params", "Informe ao menos uma palavra-chave.", 400);
    }

    const requestedPageSize = params.pageSize ?? MAX_PAGE_SIZE;
    const providerPageSize = Math.min(
      Math.max(Math.trunc(requestedPageSize) || 1, 1),
      MAX_PAGE_SIZE,
    );
    const sortField: OfficialSortField = params.sortField ?? "units_sold";
    const sortOrder: OfficialSortOrder = params.sortOrder ?? "DESC";

    const store = await getTikTokAuthorizationStore();
    const authorization = await store.getLatest(AUTHORIZATION_TYPE);
    if (!authorization) {
      throw new ProviderError(
        "not_configured",
        "Nenhuma autorização TikTok encontrada. Conclua o fluxo OAuth.",
        503,
      );
    }
    const accessToken = readAccessToken(authorization);

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const query: Record<string, string> = {
      app_key: config.appKey,
      timestamp,
    };
    const body = JSON.stringify({
      keyword: keywords.join(" "),
      keywords,
      page_size: providerPageSize,
      sort_field: sortField,
      sort_order: sortOrder,
      ...(params.categoryId ? { category_id: params.categoryId } : {}),
    });
    const sign = signTikTokRequest({
      appSecret: config.appSecret,
      path: OPEN_COLLABORATION_SEARCH_PATH,
      query,
      body,
    });

    const url = new URL(OPEN_COLLABORATION_SEARCH_PATH, config.apiBaseUrl);
    for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
    url.searchParams.set("sign", sign);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.timeoutMs);
    const startedAt = Date.now();

    try {
      const response = await fetch(url, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          // Token nunca é logado nem devolvido ao cliente.
          "x-tts-access-token": accessToken,
        },
        body,
      });
      const durationMs = Date.now() - startedAt;

      if (response.status === 401 || response.status === 403) {
        throw new ProviderError(
          "provider_error",
          `Autorização recusada pela API oficial (${response.status}).`,
          401,
        );
      }
      if (!response.ok) {
        const text = (await response.text()).slice(0, 300);
        throw new ProviderError(
          "provider_error",
          `API oficial respondeu ${response.status}: ${text}`,
          502,
        );
      }

      const payload = (await response.json()) as {
        code?: number;
        message?: string;
        data?: { products?: unknown; items?: unknown };
      };
      if (typeof payload.code === "number" && payload.code !== 0) {
        const unauthorized = payload.code === 105000 || payload.code === 36004003;
        throw new ProviderError(
          unauthorized ? "provider_error" : "invalid_response",
          `API oficial recusou (code=${payload.code}): ${payload.message ?? "sem mensagem"}`,
          unauthorized ? 401 : 502,
        );
      }

      const raw = payload.data?.products ?? payload.data?.items;
      if (!Array.isArray(raw)) {
        throw new ProviderError(
          "invalid_response",
          "Resposta oficial sem lista de produtos.",
        );
      }

      const receivedCount = raw.length;
      const items = normalizeOfficialProducts(
        (raw as ExternalProduct[]).slice(0, providerPageSize),
        params.includeRaw ?? false,
      );
      const saleRegions = [
        ...new Set(items.map((item) => item.saleRegion).filter((r): r is string => Boolean(r))),
      ];

      return {
        source: "tiktok_official",
        scope: TIKTOK_SCOPE_AFFILIATE_COLLABORATION_READ,
        count: items.length,
        durationMs,
        items,
        diagnostics: {
          requestedPageSize,
          providerPageSize,
          receivedCount,
          sortField,
          sortOrder,
          saleRegions,
        },
      };
    } catch (error) {
      if (error instanceof ProviderError) throw error;
      if (error instanceof Error && error.name === "AbortError") {
        throw new ProviderError("timeout", "API oficial não respondeu a tempo.", 504);
      }
      throw new ProviderError(
        "provider_error",
        error instanceof Error ? error.message : "Falha desconhecida na API oficial.",
      );
    } finally {
      clearTimeout(timer);
    }
  }
}
