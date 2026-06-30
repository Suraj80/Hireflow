import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, Download, LoaderCircle, Plus, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/AuthProvider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { InterviewCalendarView } from "@/features/interviews/components/InterviewCalendarView";
import { InterviewDrawer } from "@/features/interviews/components/InterviewDrawer";
import { InterviewListView } from "@/features/interviews/components/InterviewListView";
import { InterviewToolbar } from "@/features/interviews/components/InterviewToolbar";
import { settingsApi } from "@/features/settings/api";
import { WorkspaceSettings } from "@/features/settings/types";
import { defaultOfficeHours, defaultOfficeWeek, downloadInterviewCsv, getWeekStart } from "@/features/interviews/helpers";
import { useInterviewsStore } from "@/features/interviews/store";
import { Interview } from "@/features/interviews/types";

export default function InterviewsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canManage = user?.role === "admin" || user?.role === "recruiter";
  const {
    view,
    weekStart,
    meta,
    items,
    calendarItems,
    pagination,
    loadingList,
    loadingCalendar,
    error,
    selectedIds,
    drawerOpen,
    selectedInterview,
    detailLoading,
    setView,
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
    rescheduleInterview: rescheduleInterviewApi,
    updateStatus,
    deleteInterview,
    addFeedback,
  } = useInterviewsStore();

  const [refreshKey, setRefreshKey] = useState(0);
  const [officeHours, setOfficeHours] = useState<WorkspaceSettings["officeHours"]>(defaultOfficeHours);
  const [officeWeek, setOfficeWeek] = useState<WorkspaceSettings["officeWeek"]>(defaultOfficeWeek);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [rescheduleInterview, setRescheduleInterview] = useState<Interview | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [rescheduleDuration, setRescheduleDuration] = useState<number>(30);
  const [rescheduleReason, setRescheduleReason] = useState("");
  const [rescheduleSubmitting, setRescheduleSubmitting] = useState(false);

  useEffect(() => {
    void fetchCalendar();
  }, [fetchCalendar, weekStart, refreshKey]);

  useEffect(() => {
    void fetchList();
  }, [fetchList, pagination.page, pagination.limit, refreshKey]);

  useEffect(() => {
    const loadWorkspacePreferences = async () => {
      try {
        const settings = await settingsApi.getWorkspace();
        const nextOfficeHours = settings.officeHours || defaultOfficeHours;
        const nextOfficeWeek = settings.officeWeek?.length ? settings.officeWeek : defaultOfficeWeek;
        setOfficeHours(nextOfficeHours);
        setOfficeWeek(nextOfficeWeek);
        setWeekStart(getWeekStart(new Date(), nextOfficeWeek));
      } catch (_error) {
        setOfficeHours(defaultOfficeHours);
        setOfficeWeek(defaultOfficeWeek);
      }
    };

    void loadWorkspacePreferences();
  }, [setWeekStart]);

  const openRescheduleModal = (interview: Interview) => {
    const current = new Date(interview.scheduledAt);
    const pad = (value: number) => String(value).padStart(2, "0");

    setRescheduleInterview(interview);
    setRescheduleDate(`${current.getFullYear()}-${pad(current.getMonth() + 1)}-${pad(current.getDate())}`);
    setRescheduleTime(`${pad(current.getHours())}:${pad(current.getMinutes())}`);
    setRescheduleDuration(interview.duration);
    setRescheduleReason("");
    setRescheduleOpen(true);
  };

  const closeRescheduleModal = () => {
    setRescheduleOpen(false);
    setRescheduleInterview(null);
    setRescheduleReason("");
    setRescheduleSubmitting(false);
  };

  const handleRescheduleSubmit = async () => {
    if (!rescheduleInterview || !rescheduleDate || !rescheduleTime) {
      toast.error("Pick a date and time for the reschedule");
      return;
    }

    const nextTimestamp = new Date(`${rescheduleDate}T${rescheduleTime}:00`);
    if (Number.isNaN(nextTimestamp.getTime())) {
      toast.error("Please enter a valid date and time");
      return;
    }

    try {
      setRescheduleSubmitting(true);
      await rescheduleInterviewApi(rescheduleInterview.id, {
        scheduledAt: nextTimestamp.toISOString(),
        duration: rescheduleDuration,
        reason: rescheduleReason || "Rescheduled from interviews workspace",
      });
      toast.success("Interview rescheduled");
      setRefreshKey((value) => value + 1);
      closeRescheduleModal();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to reschedule interview");
    } finally {
      setRescheduleSubmitting(false);
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

  const handleDelete = async (interview: Interview) => {
    if (!window.confirm(`Delete the ${interview.round} interview for ${interview.candidate?.name}?`)) {
      return;
    }

    try {
      await deleteInterview(interview.id);
      toast.success("Interview deleted");
      setRefreshKey((value) => value + 1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete interview");
    }
  };

  const selectedRows = items.filter((item) => selectedIds.includes(item.id));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Interviews</h1>
          <p className="text-muted-foreground">
            Keep the calendar as the operating center, then flip into list mode for bulk management and reporting.
          </p>
        </div>
        {canManage && (
          <Button className="h-11 rounded-2xl self-start" onClick={() => navigate("/interviews/new")}>
            <Plus className="mr-2 h-4 w-4" />
            Schedule Interview
          </Button>
        )}
      </div>

      <InterviewToolbar
        view={view}
        weekStart={weekStart}
        officeWeek={officeWeek}
        onViewChange={setView}
        onWeekChange={shiftWeek}
        onWeekStartChange={setWeekStart}
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
        loadingCalendar ? (
          <Card className="rounded-[28px] border border-border/80 shadow-sm">
            <CardContent className="flex items-center gap-3 p-10 text-muted-foreground">
              <LoaderCircle className="h-5 w-5 animate-spin" />
              Loading interview calendar...
            </CardContent>
          </Card>
        ) : (
          <InterviewCalendarView
            weekStart={weekStart}
            items={calendarItems}
            officeHours={officeHours}
            officeWeek={officeWeek}
            onOpen={(id) => void openDrawer(id)}
            onReschedule={async (id, payload) => {
              await rescheduleInterviewApi(id, payload);
              setRefreshKey((value) => value + 1);
            }}
          />
        )
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
          onReschedule={(interview) => openRescheduleModal(interview)}
          onCancel={(interview) => void handleCancel(interview)}
          onDelete={(interview) => void handleDelete(interview)}
          onAddFeedback={(id) => void openDrawer(id)}
          onMarkCompleted={async (interview) => {
            await updateStatus(interview.id, { status: "Completed", reason: "Marked completed from list view" });
            toast.success("Interview marked completed");
            setRefreshKey((value) => value + 1);
          }}
          onSortChange={() => undefined}
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
        onRequestReschedule={(interview) => openRescheduleModal(interview)}
        onUpdateStatus={async (id, payload) => {
          const next = await updateStatus(id, payload);
          setRefreshKey((value) => value + 1);
          return next;
        }}
        onDelete={async (id) => {
          await deleteInterview(id);
          setRefreshKey((value) => value + 1);
        }}
        onAddFeedback={async (id, values) => {
          const next = await addFeedback(id, values);
          setRefreshKey((value) => value + 1);
          return next;
        }}
      />

      <Dialog open={rescheduleOpen} onOpenChange={(open) => (open ? setRescheduleOpen(true) : closeRescheduleModal())}>
        <DialogContent className="rounded-[28px] sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Reschedule interview</DialogTitle>
            <DialogDescription>
              Update the date, time, or duration for {rescheduleInterview?.candidate?.name || "this interview"}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="reschedule-date">Date</Label>
                <Input
                  id="reschedule-date"
                  type="date"
                  className="h-11 rounded-2xl"
                  value={rescheduleDate}
                  onChange={(event) => setRescheduleDate(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reschedule-time">Time</Label>
                <Input
                  id="reschedule-time"
                  type="time"
                  className="h-11 rounded-2xl"
                  value={rescheduleTime}
                  onChange={(event) => setRescheduleTime(event.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="reschedule-duration">Duration (minutes)</Label>
                <Input
                  id="reschedule-duration"
                  type="number"
                  min={15}
                  step={15}
                  className="h-11 rounded-2xl"
                  value={rescheduleDuration}
                  onChange={(event) => setRescheduleDuration(Number(event.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reschedule-timezone">Timezone</Label>
                <Input
                  id="reschedule-timezone"
                  className="h-11 rounded-2xl"
                  value={rescheduleInterview?.timezone || ""}
                  readOnly
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reschedule-reason">Reason</Label>
              <Textarea
                id="reschedule-reason"
                rows={4}
                className="rounded-2xl"
                value={rescheduleReason}
                onChange={(event) => setRescheduleReason(event.target.value)}
                placeholder="Optional reason for the change"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-end">
            <Button type="button" variant="outline" className="rounded-2xl" onClick={closeRescheduleModal} disabled={rescheduleSubmitting}>
              Cancel
            </Button>
            <Button type="button" className="rounded-2xl" onClick={() => void handleRescheduleSubmit()} disabled={rescheduleSubmitting}>
              {rescheduleSubmitting ? "Saving..." : "Save reschedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
