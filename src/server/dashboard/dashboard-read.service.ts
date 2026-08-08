import {
  DEFAULT_LIST_QUERY,
  type ProductListSort,
  type ProductReadRepository,
} from "../read/types";
import { DASHBOARD_LIST_LIMIT, type DashboardData } from "./types";

/**
 * Composes the dashboard payload from the READ repository only.
 *
 * Invariants:
 *  - never calls a data provider (Apify);
 *  - never writes to the database;
 *  - never recomputes metrics (they come from the metrics layer);
 *  - every list is bounded by DASHBOARD_LIST_LIMIT (no full history loaded).
 */
export class DashboardReadService {
  constructor(private readonly repository: ProductReadRepository) {}

  private page(sort: ProductListSort, hasHistory = false) {
    return this.repository.listProductsPage({
      ...DEFAULT_LIST_QUERY,
      page: 1,
      limit: DASHBOARD_LIST_LIMIT,
      sort,
      direction: "desc",
      hasHistory,
    });
  }

  async load(): Promise<DashboardData> {
    const summary = await this.repository.getDashboardSummary();
    const mostSold = await this.page("soldCount");
    const highestGmv = await this.page("gmv");
    const biggestSoldDelta = await this.page("soldCountDelta", true);
    const recentlyObserved = await this.page("lastObservedAt");

    return {
      store: this.repository.name,
      summary,
      mostSold: mostSold.items,
      highestGmv: highestGmv.items,
      biggestSoldDelta: biggestSoldDelta.items.filter(
        (item) => item.snapshotCount >= 2 && item.metrics.soldCountDelta !== null,
      ),
      recentlyObserved: recentlyObserved.items,
    };
  }
}
