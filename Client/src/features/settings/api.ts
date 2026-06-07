import { api } from "@/lib/api";
import { EmailIntegrationStatus, WorkspaceSettings } from "@/features/settings/types";

export const settingsApi = {
  getWorkspace: async () => {
    const response = await api.get<WorkspaceSettings>("/settings");
    return response.data;
  },
  updateWorkspace: async (payload: WorkspaceSettings) => {
    const response = await api.patch<{ message: string; settings: WorkspaceSettings }>("/settings", payload);
    return response.data;
  },
  getEmailIntegration: async () => {
    const response = await api.get<EmailIntegrationStatus>("/settings/integrations/email");
    return response.data;
  },
  sendTestEmail: async (email?: string) => {
    const response = await api.post<{
      message: string;
      messageId: string;
      sandboxMode: boolean;
      recipientEmail: string;
    }>("/settings/integrations/email/test", {
      ...(email ? { email } : {}),
    });

    return response.data;
  },
};
