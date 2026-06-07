import { api } from "@/lib/api";
import { NotificationsResponse } from "@/features/notifications/types";

export const notificationsApi = {
  list: async (limit = 12) => {
    const response = await api.get<NotificationsResponse>("/notifications", {
      params: { limit },
    });

    return response.data;
  },

  markRead: async (notificationId: string) => {
    const response = await api.patch<{
      item: NotificationsResponse["items"][number];
      unreadCount: number;
    }>(`/notifications/${notificationId}/read`);

    return response.data;
  },

  markAllRead: async () => {
    const response = await api.post<{ message: string; unreadCount: number }>("/notifications/read-all");
    return response.data;
  },
};
