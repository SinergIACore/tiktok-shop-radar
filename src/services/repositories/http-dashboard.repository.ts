import type { DashboardResponse } from "@/types/dashboard-view";

/** HTTP repository for the dashboard read model. */
export interface DashboardRepository {
  load(): Promise<DashboardResponse>;
}

export const httpDashboardRepository: DashboardRepository = {
  async load() {
    const response = await fetch("/api/dashboard");
    const payload = (await response.json().catch(() => null)) as
      | (DashboardResponse & { error?: { message?: string } })
      | null;
    if (!response.ok || !payload) {
      throw new Error(payload?.error?.message ?? "Não foi possível carregar o dashboard.");
    }
    return payload;
  },
};
