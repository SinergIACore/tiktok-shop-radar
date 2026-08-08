import type {
  ProductSearchParams,
  ProductSearchResult,
} from "./types/external-product.types";

/**
 * Contract for any external product data source (Apify, official TikTok Shop
 * API, custom crawler...). The application only ever depends on this interface.
 */
export interface ProductDataProvider {
  /** Stable provider identifier, used in logs and in the normalized output. */
  readonly name: string;
  /** False when required environment configuration is missing. */
  isConfigured(): boolean;
  searchProducts(params: ProductSearchParams): Promise<ProductSearchResult>;
}
