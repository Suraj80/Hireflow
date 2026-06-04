import { BellRing, CalendarClock, Clock3, Eye, PencilLine, Trash2, XCircle } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatInterviewDateTime, getInitials, statusToneMap } from "@/features/interviews/helpers";
import { Interview } from "@/features/interviews/types";

type UpcomingSidebarProps = {
  items: Interview[];
  onView: (id: string) => void;
  onReschedule: (interview: Interview) => void;
  onCancel: (interview: Interview) => void;
  onDelete: (interview: Interview) => void;
  onReminder: (interview: Interview) => void;
};

export function UpcomingSidebar({ items, onView, onReschedule, onCancel, onDelete, onReminder }: UpcomingSidebarProps) {
  return (
    <Card className="border border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base font-semibold">Upcoming</CardTitle>
        <Button variant="ghost" className="h-8 rounded-xl px-3 text-xs">
          View All
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="rounded-2xl border border-border/70 bg-muted/30 p-4">
            <div className="flex items-start gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback>{getInitials(item.candidate?.name || "NA")}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="truncate text-sm font-semibold">{item.candidate?.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {item.job?.department} | {item.job?.title}
                    </p>
                  </div>
                  <Badge className={`border ${statusToneMap[item.status]}`}>{item.status}</Badge>
                </div>
                <div className="mt-3 grid gap-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <CalendarClock className="h-3.5 w-3.5" />
                    {item.round}
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock3 className="h-3.5 w-3.5" />
                    {formatInterviewDateTime(item.scheduledAt)} | {item.duration} min
                  </div>
                  <p>{item.type} | {item.interviewers.map((entry) => entry.name).join(", ")}</p>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="rounded-xl" onClick={() => onView(item.id)}>
                <Eye className="mr-1.5 h-3.5 w-3.5" />
                View
              </Button>
              {item.permissions.canReschedule && (
                <Button variant="outline" size="sm" className="rounded-xl" onClick={() => onReschedule(item)}>
                  <PencilLine className="mr-1.5 h-3.5 w-3.5" />
                  Reschedule
                </Button>
              )}
              {item.permissions.canCancel && (
                <Button variant="outline" size="sm" className="rounded-xl" onClick={() => onCancel(item)}>
                  <XCircle className="mr-1.5 h-3.5 w-3.5" />
                  Cancel
                </Button>
              )}
              {item.permissions.canDelete && (
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl text-destructive hover:text-destructive"
                  onClick={() => onDelete(item)}
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  Delete
                </Button>
              )}
              {item.permissions.canSendReminder && (
                <Button variant="outline" size="sm" className="rounded-xl" onClick={() => onReminder(item)}>
                  <BellRing className="mr-1.5 h-3.5 w-3.5" />
                  Send reminder
                </Button>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
