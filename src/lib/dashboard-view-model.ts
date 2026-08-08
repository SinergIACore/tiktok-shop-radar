import type { DashboardData } from "@/server/dashboard/types";
import type { DashboardResponse } from "@/types/dashboard-view";
import { toProductListViewModel } from "./product-view-model";

/** Pure adapter DashboardData -> DashboardResponse. No calculation here. */
export function toDashboardResponse(data: DashboardData): DashboardResponse {
  return {
    store: data.store,
    summary: { ...data.summary },
    mostSold: data.mostSold.map(toProductListViewModel),
    highestGmv: data.highestGmv.map(toProductListViewModel),
    biggestSoldDelta: data.biggestSoldDelta.map(toProductListViewModel),
    recentlyObserved: data.recentlyObserved.map(toProductListViewModel),
  };
}
