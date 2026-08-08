import type { StoredProduct, StoredSnapshot } from "../persistence/types";
import type { MetricSnapshot, ProductMetricsResult } from "../metrics/product-metrics";

/**
 * READ-ONLY contract (Stage 02B.2 / 02B.3).
 *
 * Layer separation:
 *   Provider  -> collection (Apify)
 *   Ingestion -> writes
 *   Repository-> reads (this file). Never calls a provider, never writes.
 *   Metrics   -> pure calculation
 */
export interface ProductWithMetrics {
  id: string;
  source: string;
  sourceProductId: string;
  name: string | null;
  thumbnail: string | null;
  productUrl: string | null;
  category: string | null;
  sellerName: string | null;
  brand: string | null;
  businessName: string | null;
  countryCode: string | null;
  currency: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  snapshotCount: number;
  latest: MetricSnapshot | null;
  previous: MetricSnapshot | null;
  metrics: ProductMetricsResult;
}

/** Sort keys allowed on /products (Stage 02B.3). No score/trend/forecast. */
export type ProductListSort =
  | "soldCount"
  | "gmv"
  | "soldCountDelta"
  | "gmvDelta"
  | "salesVelocity"
  | "lastObservedAt";

export type SortDirection = "asc" | "desc";

export interface ProductListFilters {
  search?: string | null;
  seller?: string | null;
  category?: string | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  minSold?: number | null;
  minReviews?: number | null;
  minRating?: number | null;
  hasHistory?: boolean;
}

export interface ProductListQuery extends ProductListFilters {
  page: number;
  limit: number;
  sort: ProductListSort;
  direction: SortDirection;
}

export interface ProductListPage {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  items: ProductWithMetrics[];
}

export const ALLOWED_LIMITS = [10, 25, 50] as const;
export const DEFAULT_LIST_QUERY: ProductListQuery = {
  page: 1,
  limit: 25,
  sort: "lastObservedAt",
  direction: "desc",
};

export interface ProductReadRepository {
  readonly name: string;
  /** Products with their two most recent snapshots and derived metrics. */
  listProductsWithMetrics(limit?: number): Promise<ProductWithMetrics[]>;
  /** Paginated + filtered listing used by /products. */
  listProductsPage(query: ProductListQuery): Promise<ProductListPage>;
  /** Single product with metrics, or null. */
  getProductWithMetrics(productId: string): Promise<ProductWithMetrics | null>;
  /** Chronological history (observedAt ASC). */
  listHistory(productId: string): Promise<StoredSnapshot[]>;
}

export type { StoredProduct, StoredSnapshot };
