import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, UserPlus, Calendar, CheckCircle } from "lucide-react";

const notifications = [
  { id: 1, icon: UserPlus, title: "New application received", desc: "Sarah Chen applied for Senior Frontend Dev", time: "5m ago", unread: true },
  { id: 2, icon: Calendar, title: "Interview reminder", desc: "Interview with Alex Kim in 1 hour", time: "1h ago", unread: true },
  { id: 3, icon: CheckCircle, title: "Candidate moved", desc: "James Park moved to Final Round", time: "3h ago", unread: true },
];

export function NotificationsPanel({ onClose }: { onClose: () => void }) {
  return (
    <Card className="absolute right-0 top-12 w-80 p-0 shadow-float z-50 animate-scale-in">
      <div className="flex items-center justify-between p-3 border-b border-border">
        <h3 className="font-semibold text-sm">Notifications</h3>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="max-h-80 overflow-y-auto">
        {notifications.map((n) => (
          <div key={n.id} className="flex gap-3 p-3 hover:bg-muted/50 cursor-pointer transition-colors border-b border-border last:border-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <n.icon className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium flex items-center gap-2">
                {n.title}
                {n.unread && <Badge variant="secondary" className="h-1.5 w-1.5 p-0 rounded-full gradient-primary" />}
              </p>
              <p className="text-xs text-muted-foreground truncate">{n.desc}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{n.time}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="p-2 border-t border-border">
        <Button variant="ghost" className="w-full text-xs h-8">View all notifications</Button>
      </div>
    </Card>
  );
}
