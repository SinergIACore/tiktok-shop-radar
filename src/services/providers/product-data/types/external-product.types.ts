/**
 * Types for the external product data acquisition layer (Stage 02A).
 * These types are provider-agnostic; nothing here mentions a vendor schema.
 */

/** Raw item returned by an external provider. Shape is unknown by design. */
export type ExternalProduct = Record<string, unknown>;

export interface ProductSearchParams {
  keyword: string;
  /** Max number of items to return. */
  limit?: number;
  /** ISO country / market code, when the provider supports it. */
  country?: string;
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
}

export interface ProductSearchResult {
  source: string;
  query: ProductSearchParams;
  count: number;
  /** Provider round-trip in milliseconds. */
  durationMs: number;
  items: NormalizedProduct[];
}

export type ProviderErrorCode =
  | "not_configured"
  | "timeout"
  | "provider_error"
  | "invalid_response"
  | "invalid_params";

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
