/**
 * Dashboard read model (Stage 02B.4).
 *
 * Objective aggregates only: everything here can be derived directly from
 * `products` + `product_snapshots`. No score, trend, acceleration or forecast.
 */
import type { ProductWithMetrics } from "../read/types";

export interface DashboardSummary {
  /** COUNT(products) */
  productsMonitored: number;
  /** products having snapshot_count >= 2 */
  productsWithHistory: number;
  /** COUNT(product_snapshots) */
  snapshotsCollected: number;
  /** MAX(product_snapshots.observed_at) */
  lastObservationAt: string | null;
  /** products.first_seen_at within the last 24h */
  newProducts24h: number;
  /** product_snapshots.observed_at within the last 24h */
  snapshots24h: number;
}

export interface DashboardData {
  store: string;
  summary: DashboardSummary;
  mostSold: ProductWithMetrics[];
  highestGmv: ProductWithMetrics[];
  biggestSoldDelta: ProductWithMetrics[];
  recentlyObserved: ProductWithMetrics[];
}

/** Number of products per dashboard list. Keeps the queries bounded. */
export const DASHBOARD_LIST_LIMIT = 6;
