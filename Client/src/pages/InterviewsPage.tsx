import { useEffect, useState } from "react";
import { AlertCircle, Download, LoaderCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/AuthProvider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { InterviewCalendarView } from "@/features/interviews/components/InterviewCalendarView";
import { InterviewDrawer } from "@/features/interviews/components/InterviewDrawer";
import { InterviewListView } from "@/features/interviews/components/InterviewListView";
import { InterviewToolbar } from "@/features/interviews/components/InterviewToolbar";
import { UpcomingSidebar } from "@/features/interviews/components/UpcomingSidebar";
import { downloadInterviewCsv } from "@/features/interviews/helpers";
import { useInterviewsStore } from "@/features/interviews/store";
import { Interview } from "@/features/interviews/types";

export default function InterviewsPage() {
  const { user } = useAuth();
  const canManage = user?.role === "admin" || user?.role === "recruiter";
  const {
    view,
    weekStart,
    filters,
    meta,
    items,
    calendarItems,
    upcoming,
    pagination,
    loadingList,
    loadingCalendar,
    error,
    selectedIds,
    drawerOpen,
    selectedInterview,
    detailLoading,
    setView,
    setFilters,
    setPage,
    setWeekStart,
    shiftWeek,
    toggleSelected,
    toggleSelectAll,
    clearSelection,
    fetchList,
    fetchCalendar,
    openDrawer,
    closeDrawer,
    updateInterview,
    rescheduleInterview,
    updateStatus,
    addFeedback,
  } = useInterviewsStore();

  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    void fetchCalendar();
  }, [fetchCalendar, weekStart, filters.search, filters.team, filters.interviewer, filters.status, refreshKey]);

  useEffect(() => {
    void fetchList();
  }, [fetchList, filters, pagination.page, pagination.limit, refreshKey]);

  const handleReschedulePrompt = async (interview: Interview) => {
    const next = window.prompt("New interview time in ISO format", interview.scheduledAt);
    if (!next) {
      return;
    }
    try {
      await rescheduleInterview(interview.id, { scheduledAt: next, reason: "Rescheduled from interviews workspace" });
      toast.success("Interview rescheduled");
      setRefreshKey((value) => value + 1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to reschedule interview");
    }
  };

  const handleCancel = async (interview: Interview) => {
    try {
      await updateStatus(interview.id, { status: "Cancelled", reason: "Cancelled from interviews workspace" });
      toast.success("Interview cancelled");
      setRefreshKey((value) => value + 1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to cancel interview");
    }
  };

  const handleReminder = async (interview: Interview) => {
    try {
      await updateStatus(interview.id, {
        status: interview.status,
        reason: "Reminder sent to interview panel",
        sendNotification: true,
      });
      toast.success("Reminder recorded");
      setRefreshKey((value) => value + 1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to send reminder");
    }
  };

  const selectedRows = items.filter((item) => selectedIds.includes(item.id));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Interviews</h1>
        <p className="text-muted-foreground">
          Keep the calendar as the operating center, then flip into list mode for bulk management and reporting.
        </p>
      </div>

      <InterviewToolbar
        canManage={canManage}
        view={view}
        weekStart={weekStart}
        filters={filters}
        meta={meta}
        onViewChange={setView}
        onWeekChange={shiftWeek}
        onWeekStartChange={setWeekStart}
        onFiltersChange={setFilters}
      />

      {canManage && selectedIds.length > 0 && (
        <Card className="rounded-[28px] border border-primary/20 bg-primary/5 shadow-sm">
          <CardContent className="flex flex-col gap-3 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="font-medium">{selectedIds.length} interviews selected</p>
              <p className="text-sm text-muted-foreground">Use this for operational cleanup, bulk status updates, and export.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                className="rounded-2xl"
                onClick={async () => {
                  await Promise.all(selectedRows.map((item) => updateStatus(item.id, { status: "Completed", reason: "Bulk marked completed" })));
                  clearSelection();
                  toast.success("Selected interviews marked completed");
                }}
              >
                Mark completed
              </Button>
              <Button
                variant="outline"
                className="rounded-2xl"
                onClick={async () => {
                  await Promise.all(selectedRows.map((item) => updateStatus(item.id, { status: "Cancelled", reason: "Bulk cancelled" })));
                  clearSelection();
                  toast.success("Selected interviews cancelled");
                }}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button variant="outline" className="rounded-2xl" onClick={() => downloadInterviewCsv(selectedRows)}>
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Alert variant="destructive" className="rounded-[28px]">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Unable to load interviews</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {view === "calendar" ? (
        <div className="grid gap-6 lg:grid-cols-3">
          {loadingCalendar ? (
            <Card className="lg:col-span-2 rounded-[28px] border border-border/80 shadow-sm">
              <CardContent className="flex items-center gap-3 p-10 text-muted-foreground">
                <LoaderCircle className="h-5 w-5 animate-spin" />
                Loading interview calendar...
              </CardContent>
            </Card>
          ) : (
            <InterviewCalendarView
              weekStart={weekStart}
              items={calendarItems}
              onOpen={(id) => void openDrawer(id)}
              onReschedule={async (id, payload) => {
                await rescheduleInterview(id, payload);
                setRefreshKey((value) => value + 1);
              }}
            />
          )}

          <UpcomingSidebar
            items={upcoming}
            onView={(id) => void openDrawer(id)}
            onReschedule={(interview) => void handleReschedulePrompt(interview)}
            onCancel={(interview) => void handleCancel(interview)}
            onReminder={(interview) => void handleReminder(interview)}
          />
        </div>
      ) : loadingList ? (
        <Card className="rounded-[28px] border border-border/80 shadow-sm">
          <CardContent className="flex items-center gap-3 p-10 text-muted-foreground">
            <LoaderCircle className="h-5 w-5 animate-spin" />
            Loading interview list...
          </CardContent>
        </Card>
      ) : (
        <InterviewListView
          items={items}
          selectedIds={selectedIds}
          pagination={pagination}
          onToggleSelected={toggleSelected}
          onToggleAll={toggleSelectAll}
          onOpen={(id) => void openDrawer(id)}
          onEdit={(interview) => void openDrawer(interview.id)}
          onReschedule={(interview) => void handleReschedulePrompt(interview)}
          onCancel={(interview) => void handleCancel(interview)}
          onAddFeedback={(id) => void openDrawer(id)}
          onMarkCompleted={async (interview) => {
            await updateStatus(interview.id, { status: "Completed", reason: "Marked completed from list view" });
            toast.success("Interview marked completed");
            setRefreshKey((value) => value + 1);
          }}
          onSortChange={(sort) => setFilters({ sort })}
          onPageChange={setPage}
        />
      )}

      <InterviewDrawer
        open={drawerOpen}
        loading={detailLoading}
        interview={selectedInterview}
        meta={meta}
        onOpenChange={closeDrawer}
        onUpdate={async (id, values) => {
          const next = await updateInterview(id, values);
          setRefreshKey((value) => value + 1);
          return next;
        }}
        onReschedule={async (id, payload) => {
          const next = await rescheduleInterview(id, payload);
          setRefreshKey((value) => value + 1);
          return next;
        }}
        onUpdateStatus={async (id, payload) => {
          const next = await updateStatus(id, payload);
          setRefreshKey((value) => value + 1);
          return next;
        }}
        onAddFeedback={async (id, values) => {
          const next = await addFeedback(id, values);
          setRefreshKey((value) => value + 1);
          return next;
        }}
      />
    </div>
  );
}
