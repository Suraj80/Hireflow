import { useEffect, useMemo, useState } from "react";
import { Code2, MapPin, Phone, Video, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { WorkspaceSettings } from "@/features/settings/types";
import {
  buildRescheduleTimestamp,
  buildTimeSlots,
  buildWeekDays,
  formatInterviewTime,
  getCalendarHourRowHeight,
  getInterviewLayout,
  statusAccentMap,
} from "@/features/interviews/helpers";
import { Interview } from "@/features/interviews/types";

const typeIcons = {
  Video,
  Onsite: MapPin,
  Phone,
  Panel: Users,
  Technical: Code2,
};

type InterviewCalendarViewProps = {
  weekStart: Date;
  items: Interview[];
  officeHours: WorkspaceSettings["officeHours"];
  officeWeek: WorkspaceSettings["officeWeek"];
  onOpen: (id: string) => void;
  onReschedule: (id: string, payload: { scheduledAt: string; duration?: number; reason?: string }) => Promise<void>;
};

export function InterviewCalendarView({
  weekStart,
  items,
  officeHours,
  officeWeek,
  onOpen,
  onReschedule,
}: InterviewCalendarViewProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [resizing, setResizing] = useState<{ id: string; originY: number; duration: number } | null>(null);
  const days = useMemo(() => buildWeekDays(weekStart, officeWeek), [officeWeek, weekStart]);
  const slots = useMemo(() => buildTimeSlots(officeHours), [officeHours]);
  const hourRowHeight = useMemo(() => getCalendarHourRowHeight(), []);

  useEffect(() => {
    if (!resizing) {
      return;
    }

    const handleMove = async (event: MouseEvent) => {
      const delta = event.clientY - resizing.originY;
      const steps = Math.max(0, Math.round(delta / 44));
      const nextDuration = Math.max(15, resizing.duration + steps * 15);
      setResizing((current) => (current ? { ...current, duration: nextDuration } : current));
    };

    const handleUp = async () => {
      const interview = items.find((item) => item.id === resizing.id);
      if (interview) {
        await onReschedule(interview.id, {
          scheduledAt: interview.scheduledAt,
          duration: resizing.duration,
          reason: "Duration updated from calendar",
        });
      }
      setResizing(null);
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp, { once: true });

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [items, onReschedule, resizing]);

  return (
    <Card className="lg:col-span-2 border border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">This Week</CardTitle>
        <p className="text-sm text-muted-foreground">
          Showing {officeHours.start} to {officeHours.end}
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div
            className="grid min-w-[980px]"
            style={{ gridTemplateColumns: `84px repeat(${days.length}, minmax(0, 1fr))` }}
          >
            <div className="border-r border-border">
              <div className="h-12" />
              {slots.map((slot) => (
                <div
                  key={slot.label}
                  className="border-b border-border/40 pr-3 pt-1 text-right text-xs text-muted-foreground"
                  style={{ height: hourRowHeight }}
                >
                  {slot.label}
                </div>
              ))}
            </div>

            {days.map((day, dayIndex) => (
              <div key={day.toISOString()} className="relative border-r border-border last:border-r-0">
                <div className="h-12 border-b border-border px-3 py-2">
                  <p className="text-sm font-medium">{day.toLocaleDateString(undefined, { weekday: "short" })}</p>
                  <p className="text-xs text-muted-foreground">{day.toLocaleDateString(undefined, { month: "short", day: "numeric" })}</p>
                </div>

                {slots.map((slot) => (
                  <div
                    key={`${day.toISOString()}-${slot.label}`}
                    className="border-b border-border/30"
                    style={{ height: hourRowHeight }}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={async () => {
                      const interview = items.find((item) => item.id === draggingId);
                      if (!interview) {
                        return;
                      }
                      await onReschedule(interview.id, {
                        scheduledAt: buildRescheduleTimestamp(interview.scheduledAt, day, slot.hour, slot.minute),
                        reason: "Dragged on calendar",
                      });
                      setDraggingId(null);
                    }}
                  />
                ))}

                {items
                  .filter((item) => getInterviewLayout(item, weekStart, officeWeek, officeHours).dayIndex === dayIndex)
                  .map((item) => {
                    const layout = getInterviewLayout(item, weekStart, officeWeek, officeHours);
                    const Icon = typeIcons[item.type];
                    const visualHeight = resizing?.id === item.id ? Math.max(44, (resizing.duration / 30) * 44) : layout.height;
                    return (
                      <HoverCard key={item.id}>
                        <HoverCardTrigger asChild>
                          <button
                            type="button"
                            draggable
                            onDragStart={() => setDraggingId(item.id)}
                            onClick={() => onOpen(item.id)}
                            className={`absolute left-1.5 right-1.5 z-10 overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-br ${statusAccentMap[item.status]} p-2 text-left text-white shadow-lg transition-transform hover:scale-[1.01]`}
                            style={{ top: layout.top + 48, height: visualHeight }}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="truncate text-xs font-semibold">{item.candidate?.name}</p>
                                <p className="truncate text-[11px] opacity-85">{item.round}</p>
                              </div>
                              <Icon className="h-3.5 w-3.5 shrink-0" />
                            </div>
                            <div className="mt-2 flex items-center justify-between gap-2 text-[11px] opacity-90">
                              <span>{item.duration} min</span>
                              <span>{item.recruiter?.name?.split(" ")[0]}</span>
                            </div>
                            <div
                              className="absolute inset-x-0 bottom-0 h-2 cursor-row-resize bg-white/20"
                              onMouseDown={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                setResizing({
                                  id: item.id,
                                  originY: event.clientY,
                                  duration: item.duration,
                                });
                              }}
                            />
                          </button>
                        </HoverCardTrigger>
                        <HoverCardContent className="w-80 rounded-2xl">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <p className="font-semibold">{item.candidate?.name}</p>
                              <Badge variant="secondary">{item.status}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{item.job?.title}</p>
                            <div className="grid gap-1 text-sm">
                              <p>{item.round}</p>
                              <p>{formatInterviewTime(item.scheduledAt)} • {item.duration} min</p>
                              <p>{item.type} • {item.interviewers.map((entry) => entry.name).join(", ")}</p>
                            </div>
                          </div>
                        </HoverCardContent>
                      </HoverCard>
                    );
                  })}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
