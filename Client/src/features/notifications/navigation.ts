import type { UserRole } from "@/components/AuthProvider";
import type { NotificationItem } from "@/features/notifications/types";

export type NotificationDeepLink =
  | { page: "candidate"; candidateId: string }
  | { page: "interview"; interviewId: string; action: "openDrawer" }
  | { page: "offer"; offerId: string }
  | { page: "job"; jobId: string }
  | { page: "pipeline"; jobId: string; candidateId?: string };

export type NotificationNavigation = {
  pathname: string;
  target: NotificationDeepLink | null;
};

const toId = (value: unknown) => {
  if (!value) {
    return "";
  }

  return String(value);
};

export const resolveNotificationDeepLink = (notification: NotificationItem): NotificationDeepLink | null => {
  const meta = notification.meta || {};
  const type = notification.type.toLowerCase();
  const entityType = notification.entityType.toLowerCase();

  const candidateId =
    toId(meta.candidateId) || (entityType === "candidate" ? toId(notification.entityId) : "");
  const interviewId =
    toId(meta.interviewId) || (entityType === "interview" ? toId(notification.entityId) : "");
  const offerId = toId(meta.offerId) || (entityType === "offer" ? toId(notification.entityId) : "");
  const jobId = toId(meta.jobId) || (entityType === "job" ? toId(notification.entityId) : "");

  if (type.includes("interview") || entityType === "interview") {
    if (interviewId) {
      return { page: "interview", interviewId, action: "openDrawer" };
    }

    return null;
  }

  if (type.includes("offer") || entityType === "offer") {
    if (offerId) {
      return { page: "offer", offerId };
    }
  }

  if (type.includes("application") || type.includes("stage") || entityType === "candidate") {
    if (candidateId && jobId) {
      return { page: "pipeline", jobId, candidateId };
    }

    if (candidateId) {
      return { page: "candidate", candidateId };
    }
  }

  if (entityType === "job" && jobId) {
    return { page: "job", jobId };
  }

  if (jobId) {
    return { page: "job", jobId };
  }

  if (candidateId) {
    return { page: "candidate", candidateId };
  }

  return null;
};

export const getNotificationNavigation = (
  notification: NotificationItem,
  role: UserRole | undefined
): NotificationNavigation | null => {
  const link = resolveNotificationDeepLink(notification);
  if (!link) {
    return null;
  }

  const canAccessOffers = role === "admin" || role === "recruiter";

  switch (link.page) {
    case "candidate":
      return { pathname: `/candidates/${link.candidateId}`, target: link };
    case "interview":
      return { pathname: "/interviews", target: link };
    case "offer":
      if (canAccessOffers) {
        return { pathname: `/offers/view/${link.offerId}`, target: link };
      }

      if (notification.meta?.candidateId) {
        const fallback: NotificationDeepLink = {
          page: "candidate",
          candidateId: toId(notification.meta.candidateId),
        };
        return { pathname: `/candidates/${fallback.candidateId}`, target: fallback };
      }

      return null;
    case "job":
      return { pathname: `/jobs/${link.jobId}`, target: link };
    case "pipeline":
      return {
        pathname: link.candidateId ? `/candidates/${link.candidateId}` : `/pipeline/${link.jobId}`,
        target: link,
      };
    default:
      return null;
  }
};

const STORAGE_KEY = "hireflow.notification.target";

export const setPendingNotificationTarget = (target: NotificationDeepLink) => {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(target));
};

export const consumePendingNotificationTarget = (): NotificationDeepLink | null => {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  sessionStorage.removeItem(STORAGE_KEY);

  try {
    return JSON.parse(raw) as NotificationDeepLink;
  } catch {
    return null;
  }
};