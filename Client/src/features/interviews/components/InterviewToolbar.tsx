import { addMonths, format, setMonth } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WorkspaceSettings } from "@/features/settings/types";
import { formatWeekRange, getWeekStart } from "@/features/interviews/helpers";
import { InterviewView } from "@/features/interviews/types";

type InterviewToolbarProps = {
  view: InterviewView;
  weekStart: Date;
  officeWeek: WorkspaceSettings["officeWeek"];
  onViewChange: (view: InterviewView) => void;
  onWeekChange: (direction: -1 | 1) => void;
  onWeekStartChange: (date: Date) => void;
};

export function InterviewToolbar({
  view,
  weekStart,
  officeWeek,
  onViewChange,
  onWeekChange,
  onWeekStartChange,
}: InterviewToolbarProps) {
  const months = Array.from({ length: 12 }, (_, index) => setMonth(new Date(weekStart), index));

  return (
    <Card className="rounded-[28px] border border-border/80 shadow-sm">
      <CardContent className="p-5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="h-11 rounded-2xl" onClick={() => onWeekStartChange(getWeekStart(new Date(), officeWeek))}>
              Today
            </Button>
            <Button variant="outline" size="icon" className="h-11 w-11 rounded-2xl" onClick={() => onWeekChange(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-11 w-11 rounded-2xl" onClick={() => onWeekChange(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Select
              value={String(weekStart.getMonth())}
              onValueChange={(value) =>
                onWeekStartChange(getWeekStart(setMonth(addMonths(weekStart, 0), Number(value)), officeWeek))
              }
            >
              <SelectTrigger className="h-11 w-[170px] rounded-2xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map((month) => (
                  <SelectItem key={month.getMonth()} value={String(month.getMonth())}>
                    {format(month, "MMMM")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex h-11 items-center rounded-2xl border border-border px-4 text-sm text-muted-foreground">
              {formatWeekRange(weekStart, officeWeek)}
            </div>
          </div>
          <Select value={view} onValueChange={(value) => onViewChange(value as InterviewView)}>
            <SelectTrigger className="h-11 w-full rounded-2xl xl:w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="calendar">Calendar View</SelectItem>
              <SelectItem value="list">List View</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
