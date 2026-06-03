import { api } from "@/lib/api";
import { WorkspaceSettings } from "@/features/settings/types";

export const settingsApi = {
  getWorkspace: async () => {
    const response = await api.get<WorkspaceSettings>("/settings");
    return response.data;
  },
  updateWorkspace: async (payload: WorkspaceSettings) => {
    const response = await api.patch<{ message: string; settings: WorkspaceSettings }>("/settings", payload);
    return response.data;
  },
};
