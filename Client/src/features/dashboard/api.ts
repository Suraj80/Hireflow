import { api } from "@/lib/api";
import { DashboardOverviewResponse } from "@/features/dashboard/types";

export const dashboardApi = {
  overview: async () => {
    const response = await api.get<DashboardOverviewResponse>("/dashboard/overview");
    return response.data;
  },
};
