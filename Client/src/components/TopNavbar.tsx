import { Bell, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { notificationsApi } from "@/features/notifications/api";
import { NotificationItem } from "@/features/notifications/types";
import { useEffect, useState } from "react";
import { NotificationsPanel } from "@/components/NotificationsPanel";
import { useAuth } from "@/components/AuthProvider";
import { useNavigate } from "react-router-dom";

export function TopNavbar() {
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const loadNotifications = async () => {
    if (!user) {
      return;
    }

    setNotificationsLoading(true);

    try {
      const response = await notificationsApi.list();
      setNotifications(response.items.filter((item) => !item.readAt));
      setUnreadCount(response.unreadCount);
    } finally {
      setNotificationsLoading(false);
    }
  };

  const handleToggleNotifications = async () => {
    const nextValue = !showNotifications;
    setShowNotifications(nextValue);

    if (nextValue) {
      await loadNotifications();
    }
  };

  const handleMarkRead = async (notificationId: string) => {
    const existingItem = notifications.find((notification) => notification.id === notificationId);
    if (!existingItem || existingItem.readAt) {
      return;
    }

    setNotifications((current) => current.filter((notification) => notification.id !== notificationId));
    setUnreadCount((current) => Math.max(0, current - 1));

    try {
      const response = await notificationsApi.markRead(notificationId);
      setUnreadCount(response.unreadCount);
      if (!response.item.readAt) {
        setNotifications((current) => [response.item, ...current.filter((notification) => notification.id !== notificationId)]);
      }
    } catch (_error) {
      await loadNotifications();
    }
  };

  const handleMarkAllRead = async () => {
    if (unreadCount === 0) {
      return;
    }

    setNotifications([]);
    setUnreadCount(0);

    try {
      await notificationsApi.markAllRead();
    } catch (_error) {
      await loadNotifications();
    }
  };

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    void loadNotifications();

    const interval = window.setInterval(() => {
      void loadNotifications();
    }, 60000);

    return () => {
      window.clearInterval(interval);
    };
  }, [user]);

  useEffect(() => {
    if (showNotifications && unreadCount === 0) {
      setNotifications([]);
    }
  }, [showNotifications, unreadCount]);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-border bg-card/80 backdrop-blur-sm px-4">
      <SidebarTrigger className="h-8 w-8" />

      <div className="ml-auto flex items-center gap-1">
        <ThemeToggle />

        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 relative"
            onClick={() => void handleToggleNotifications()}
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 ? (
              <Badge className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 flex items-center justify-center text-[10px] gradient-primary text-primary-foreground border-0">
                {unreadCount > 9 ? "9+" : unreadCount}
              </Badge>
            ) : null}
          </Button>
          {showNotifications && (
            <NotificationsPanel
              items={notifications}
              unreadCount={unreadCount}
              loading={notificationsLoading}
              onClose={() => setShowNotifications(false)}
              onRefresh={() => void loadNotifications()}
              onMarkRead={(notificationId) => void handleMarkRead(notificationId)}
              onMarkAllRead={() => void handleMarkAllRead()}
            />
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-9 gap-2 px-2">
              <span className="text-sm font-medium hidden sm:inline">{user?.name || "HireFlow User"}</span>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => navigate("/profile")}>Profile</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={() => void logout()}>
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
