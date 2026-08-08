import type { StoredProduct, StoredSnapshot } from "../persistence/types";
import type { MetricSnapshot, ProductMetricsResult } from "../metrics/product-metrics";

/**
 * READ-ONLY contract (Stage 02B.2).
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
  sellerName: string | null;
  currency: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  snapshotCount: number;
  latest: MetricSnapshot | null;
  previous: MetricSnapshot | null;
  metrics: ProductMetricsResult;
}

export interface ProductReadRepository {
  readonly name: string;
  /** Products with their two most recent snapshots and derived metrics. */
  listProductsWithMetrics(limit?: number): Promise<ProductWithMetrics[]>;
  /** Single product with metrics, or null. */
  getProductWithMetrics(productId: string): Promise<ProductWithMetrics | null>;
  /** Chronological history (observedAt ASC). */
  listHistory(productId: string): Promise<StoredSnapshot[]>;
}

export type { StoredProduct, StoredSnapshot };
