export type NotificationActor = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "recruiter" | "viewer";
};

export type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  actor: NotificationActor | null;
  entityType: string;
  entityId: string | null;
  entityLabel: string;
  meta: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NotificationsResponse = {
  items: NotificationItem[];
  unreadCount: number;
};
