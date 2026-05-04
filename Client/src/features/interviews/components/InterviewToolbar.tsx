import { addMonths, format, setMonth } from "date-fns";
import { CalendarRange, ChevronLeft, ChevronRight, List, Plus, Rows3, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InterviewFilters } from "@/features/interviews/components/InterviewFilters";
import { formatWeekRange, getWeekStart } from "@/features/interviews/helpers";
import { InterviewFilters as InterviewFiltersType, InterviewMeta, InterviewView } from "@/features/interviews/types";

type InterviewToolbarProps = {
  canManage: boolean;
  view: InterviewView;
  weekStart: Date;
  filters: InterviewFiltersType;
  meta: InterviewMeta;
  onViewChange: (view: InterviewView) => void;
  onWeekChange: (direction: -1 | 1) => void;
  onWeekStartChange: (date: Date) => void;
  onFiltersChange: (value: Partial<InterviewFiltersType>) => void;
};

export function InterviewToolbar({
  canManage,
  view,
  weekStart,
  filters,
  meta,
  onViewChange,
  onWeekChange,
  onWeekStartChange,
  onFiltersChange,
}: InterviewToolbarProps) {
  const navigate = useNavigate();
  const months = Array.from({ length: 12 }, (_, index) => setMonth(new Date(weekStart), index));

  return (
    <Card className="rounded-[28px] border border-border/80 shadow-sm">
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarRange className="h-4 w-4" />
              Weekly interview scheduler
            </div>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">Interviews</h1>
            <p className="mt-1 text-muted-foreground">
              Keep the calendar as the operating center, then flip into list mode for bulk management and reporting.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={view === "calendar" ? "default" : "outline"}
              className="h-11 rounded-2xl"
              onClick={() => onViewChange("calendar")}
            >
              <Rows3 className="mr-2 h-4 w-4" />
              Calendar View
            </Button>
            <Button
              variant={view === "list" ? "default" : "outline"}
              className="h-11 rounded-2xl"
              onClick={() => onViewChange("list")}
            >
              <List className="mr-2 h-4 w-4" />
              List View
            </Button>
            {canManage && (
              <Button className="h-11 rounded-2xl" onClick={() => navigate("/interviews/new")}>
                <Plus className="mr-2 h-4 w-4" />
                Schedule Interview
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="h-11 rounded-2xl" onClick={() => onWeekStartChange(getWeekStart())}>
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
              onValueChange={(value) => onWeekStartChange(getWeekStart(setMonth(addMonths(weekStart, 0), Number(value))))}
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
              {formatWeekRange(weekStart)}
            </div>
          </div>
          {canManage && (
            <Button
              variant="outline"
              className="h-11 rounded-2xl"
              onClick={() => navigate("/interviews/new")}
            >
              <Search className="mr-2 h-4 w-4" />
              Quick add
            </Button>
          )}
        </div>

        <InterviewFilters filters={filters} meta={meta} onChange={onFiltersChange} />
      </CardContent>
    </Card>
  );
}
