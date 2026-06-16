import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NotificationItem } from "@/features/notifications/types";
import { Bell, Calendar, CheckCircle2, CircleDollarSign, Clock3, RefreshCw, UserPlus, X } from "lucide-react";

const getNotificationIcon = (type: string) => {
  if (type.includes("application")) {
    return UserPlus;
  }

  if (type.includes("interview")) {
    return Calendar;
  }

  if (type.includes("offer")) {
    return CircleDollarSign;
  }

  if (type.includes("feedback") || type.includes("stage")) {
    return CheckCircle2;
  }

  return Bell;
};

const formatRelativeTime = (value: string) => {
  const now = Date.now();
  const timestamp = new Date(value).getTime();
  const diffMs = timestamp - now;
  const diffMinutes = Math.round(diffMs / (1000 * 60));
  const relativeFormatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (Math.abs(diffMinutes) < 60) {
    return relativeFormatter.format(diffMinutes, "minute");
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return relativeFormatter.format(diffHours, "hour");
  }

  const diffDays = Math.round(diffHours / 24);
  return relativeFormatter.format(diffDays, "day");
};

type NotificationsPanelProps = {
  items: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  onClose: () => void;
  onRefresh: () => void;
  onMarkRead: (notificationId: string) => void;
  onMarkAllRead: () => void;
};

export function NotificationsPanel({
  items,
  unreadCount,
  loading,
  onClose,
  onRefresh,
  onMarkRead,
  onMarkAllRead,
}: NotificationsPanelProps) {
  const visibleItems = items.filter((notification) => !notification.readAt);

  return (
    <Card className="absolute right-0 top-12 w-80 p-0 shadow-float z-50 animate-scale-in">
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm">Notifications</h3>
          {unreadCount > 0 ? <Badge variant="secondary">{unreadCount} new</Badge> : null}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onRefresh}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <div className="max-h-80 overflow-y-auto">
        {loading ? (
          <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
            <Clock3 className="h-4 w-4 animate-pulse" />
            Loading notifications...
          </div>
        ) : null}
        {!loading && visibleItems.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">Your inbox is clear right now.</div>
        ) : null}
        {!loading &&
          visibleItems.map((notification) => {
            const Icon = getNotificationIcon(notification.type);

            return (
              <button
                type="button"
                key={notification.id}
                className="flex w-full gap-3 p-3 text-left hover:bg-muted/50 transition-colors border-b border-border last:border-0"
                onClick={() => onMarkRead(notification.id)}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium flex items-center gap-2">
                    {notification.title}
                    {!notification.readAt ? (
                      <Badge variant="secondary" className="h-1.5 w-1.5 p-0 rounded-full gradient-primary" />
                    ) : null}
                  </p>
                  <p className="text-xs text-muted-foreground">{notification.message}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatRelativeTime(notification.createdAt)}
                  </p>
                </div>
              </button>
            );
          })}
      </div>
      <div className="grid grid-cols-2 gap-2 p-2 border-t border-border">
        <Button variant="ghost" className="text-xs h-8" onClick={onRefresh}>
          Refresh inbox
        </Button>
        <Button variant="ghost" className="text-xs h-8" onClick={onMarkAllRead} disabled={unreadCount === 0}>
          Mark all read
        </Button>
      </div>
    </Card>
  );
}
