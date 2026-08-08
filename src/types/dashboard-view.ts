import type { ProductListViewModel } from "./product-view";

/** Dashboard view model consumed by the UI (Stage 02B.4). Real data only. */
export interface DashboardSummaryView {
  productsMonitored: number;
  productsWithHistory: number;
  snapshotsCollected: number;
  lastObservationAt: string | null;
  newProducts24h: number;
  snapshots24h: number;
}

export interface DashboardResponse {
  store: string;
  summary: DashboardSummaryView;
  mostSold: ProductListViewModel[];
  highestGmv: ProductListViewModel[];
  biggestSoldDelta: ProductListViewModel[];
  recentlyObserved: ProductListViewModel[];
}
