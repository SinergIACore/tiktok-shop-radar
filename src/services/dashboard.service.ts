import {
  httpDashboardRepository,
  type DashboardRepository,
} from "./repositories/http-dashboard.repository";
import type { DashboardResponse } from "@/types/dashboard-view";

/** Only entry point the Dashboard UI uses to read real persisted data. */
export class DashboardService {
  constructor(private readonly repository: DashboardRepository) {}

  load(): Promise<DashboardResponse> {
    return this.repository.load();
  }
}

export const dashboardService = new DashboardService(httpDashboardRepository);
