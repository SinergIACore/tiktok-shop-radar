/**
 * Types for the external product data acquisition layer (Stage 02A).
 * These types are provider-agnostic; nothing here mentions a vendor schema.
 */

/** Raw item returned by an external provider. Shape is unknown by design. */
export type ExternalProduct = Record<string, unknown>;

/**
 * Provider-agnostic sort intent.
 * "best_sellers" is only honored by providers that support it natively.
 */
export type ProductSearchSort = "relevance" | "best_sellers";

export interface ProductSearchParams {
  keyword: string;
  /** Max number of items to return AND to request from the provider. */
  limit?: number;
  /** ISO country / market code, when the provider supports it. */
  country?: string;
  /** Commercial sort requested at the source. Defaults to "relevance". */
  sort?: ProductSearchSort;
}

/** Cost/limit diagnostics of a single provider call. */
export interface ProductSearchDiagnostics {
  /** Limit asked by the caller. */
  requestedLimit: number;
  /** Limit actually sent to the provider (collection cap at the source). */
  providerLimit: number;
  /** Items actually returned by the provider before any local filter. */
  receivedCount: number;
  /** Sort actually sent to the provider. */
  sort: ProductSearchSort;
  /** Market/country actually sent to the provider, or null when not sent. */
  market: string | null;
}


/** Internal normalized product model (TikRadarProduct). */
export interface NormalizedProduct {
  id: string;
  name: string | null;
  thumbnail: string | null;
  productUrl: string | null;
  category: string | null;
  price: number | null;
  currency: string | null;
  soldCount: number | null;
  rating: number | null;
  reviewCount: number | null;
  sellerName: string | null;
  /** Videos published by the seller/shop. NOT the number of creators. */
  sellerVideoCount: number | null;
  gmvContribution: number | null;
  brand: string | null;
  businessName: string | null;
  countryCode: string | null;
  discountPercent: number | null;
  commentRate: number | null;
  /** Stays null until a real creator-count field exists in the provider. */
  creatorCount: number | null;
  /** Provider identifier, e.g. "apify". */
  source: string;
  /** Product id as returned by the provider. */
  sourceProductId: string | null;
  /** Original provider payload, kept only for debugging in the LAB route. */
  rawMetadata?: ExternalProduct;

  /**
   * Campos exclusivos do canal oficial TikTok Shop (Open Collaboration).
   * Opcionais: providers que não os fornecem simplesmente os omitem —
   * nenhum consumidor existente é afetado. NULL nunca vira zero.
   */
  saleRegion?: string | null;
  originalPrice?: number | null;
  hasInventory?: boolean | null;
  commissionRate?: number | null;
  commissionAmount?: number | null;
  commissionCurrency?: string | null;
  shopAdsCommission?: number | null;
}

export interface ProductSearchResult {
  source: string;
  query: ProductSearchParams;
  count: number;
  /** Provider round-trip in milliseconds. */
  durationMs: number;
  items: NormalizedProduct[];
  /** Cost/limit diagnostics — never contains credentials. */
  diagnostics: ProductSearchDiagnostics;
}


export type ProviderErrorCode =
  "not_configured" | "timeout" | "provider_error" | "invalid_response" | "invalid_params";

export class ProviderError extends Error {
  readonly code: ProviderErrorCode;
  readonly status: number;

  constructor(code: ProviderErrorCode, message: string, status = 502) {
    super(message);
    this.name = "ProviderError";
    this.code = code;
    this.status = status;
  }
}
