import { useState } from "react";
import { CalendarClock, CheckCircle2, PencilLine, RotateCcw, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { FeedbackForm } from "@/features/interviews/components/FeedbackForm";
import { InterviewForm } from "@/features/interviews/components/InterviewForm";
import { formatInterviewDateTime, statusToneMap } from "@/features/interviews/helpers";
import { Interview, InterviewFeedbackValues, InterviewFormValues, InterviewMeta } from "@/features/interviews/types";

type InterviewDrawerProps = {
  open: boolean;
  loading: boolean;
  interview: Interview | null;
  meta: InterviewMeta;
  onOpenChange: (open: boolean) => void;
  onUpdate: (id: string, values: InterviewFormValues) => Promise<Interview>;
  onRequestReschedule: (interview: Interview) => void;
  onUpdateStatus: (id: string, payload: { status: Interview["status"]; reason?: string; sendNotification?: boolean }) => Promise<Interview>;
  onDelete: (id: string) => Promise<void>;
  onAddFeedback: (id: string, values: InterviewFeedbackValues) => Promise<Interview>;
};

export function InterviewDrawer({
  open,
  loading,
  interview,
  meta,
  onOpenChange,
  onUpdate,
  onRequestReschedule,
  onUpdateStatus,
  onDelete,
  onAddFeedback,
}: InterviewDrawerProps) {
  const [editing, setEditing] = useState(false);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-[92vw] max-w-3xl overflow-y-auto p-0 sm:max-w-3xl">
          <div className="border-b border-border p-6">
            <SheetHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <SheetTitle>{interview?.candidate?.name || "Interview details"}</SheetTitle>
                  <SheetDescription>
                    {interview ? `${interview.round} | ${formatInterviewDateTime(interview.scheduledAt)}` : "Loading interview details"}
                  </SheetDescription>
                </div>
                {interview && <Badge className={`border ${statusToneMap[interview.status]}`}>{interview.status}</Badge>}
              </div>
            </SheetHeader>
            {interview && (
              <div className="mt-4 flex flex-wrap gap-2">
                {interview.permissions.canEdit && (
                  <Button variant="outline" className="rounded-2xl" onClick={() => setEditing(true)}>
                    <PencilLine className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                )}
                {interview.permissions.canReschedule && (
                  <Button
                    variant="outline"
                    className="rounded-2xl"
                    onClick={() => onRequestReschedule(interview)}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Reschedule
                  </Button>
                )}
                {interview.permissions.canCancel && (
                  <Button
                    variant="outline"
                    className="rounded-2xl"
                    onClick={async () => {
                      try {
                        await onUpdateStatus(interview.id, { status: "Cancelled", reason: "Cancelled from interview drawer" });
                        toast.success("Interview cancelled");
                      } catch (error) {
                        toast.error(error instanceof Error ? error.message : "Unable to cancel interview");
                      }
                    }}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Cancel
                  </Button>
                )}
                {interview.permissions.canDelete && (
                  <Button
                    variant="outline"
                    className="rounded-2xl text-destructive hover:text-destructive"
                    onClick={async () => {
                      if (!window.confirm(`Delete the ${interview.round} interview for ${interview.candidate?.name}?`)) {
                        return;
                      }
                      try {
                        await onDelete(interview.id);
                        toast.success("Interview deleted");
                      } catch (error) {
                        toast.error(error instanceof Error ? error.message : "Unable to delete interview");
                      }
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                )}
                {interview.permissions.canComplete && (
                  <Button
                    variant="outline"
                    className="rounded-2xl"
                    onClick={async () => {
                      try {
                        await onUpdateStatus(interview.id, { status: "Completed", reason: "Marked completed from interview drawer" });
                        toast.success("Interview completed");
                      } catch (error) {
                        toast.error(error instanceof Error ? error.message : "Unable to complete interview");
                      }
                    }}
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Complete
                  </Button>
                )}
              </div>
            )}
          </div>

          <div className="p-6">
            {loading || !interview ? (
              <p className="text-sm text-muted-foreground">Loading interview details...</p>
            ) : (
              <Tabs defaultValue="overview" className="space-y-5">
                <TabsList className="grid w-full grid-cols-5 rounded-2xl">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="panel">Panel</TabsTrigger>
                  <TabsTrigger value="feedback">Feedback</TabsTrigger>
                  <TabsTrigger value="notes">Notes</TabsTrigger>
                  <TabsTrigger value="audit">Audit</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  <Card className="rounded-[24px]">
                    <CardContent className="grid gap-4 p-5 md:grid-cols-2">
                      <div>
                        <p className="text-sm text-muted-foreground">Candidate</p>
                        <p className="font-semibold">{interview.candidate?.name}</p>
                        <p className="text-sm text-muted-foreground">{interview.candidate?.email}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Job</p>
                        <p className="font-semibold">{interview.job?.title}</p>
                        <p className="text-sm text-muted-foreground">{interview.job?.department}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Schedule</p>
                        <p className="font-semibold">{formatInterviewDateTime(interview.scheduledAt)}</p>
                        <p className="text-sm text-muted-foreground">{interview.duration} min | {interview.timezone}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Format</p>
                        <p className="font-semibold">{interview.type}</p>
                        <p className="text-sm text-muted-foreground">{interview.meetLink || interview.location || "No location set"}</p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="panel" className="space-y-4">
                  <Card className="rounded-[24px]">
                    <CardContent className="space-y-4 p-5">
                      <div>
                        <p className="text-sm text-muted-foreground">Lead interviewer</p>
                        <p className="font-semibold">{interview.leadInterviewer?.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Panel</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {interview.interviewers.map((entry) => (
                            <Badge key={entry.id} variant="secondary" className="rounded-xl px-3 py-1">
                              {entry.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Reminder cadence</p>
                        <p className="font-semibold">{interview.reminderSettings.join(", ")} min before</p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="feedback" className="space-y-4">
                  <Card className="rounded-[24px]">
                    <CardContent className="space-y-5 p-5">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Aggregate score</p>
                          <p className="text-2xl font-semibold">{interview.aggregateScore ?? "--"}</p>
                        </div>
                        <Badge variant="secondary">{interview.feedbackStatus}</Badge>
                      </div>
                      {interview.feedback.map((entry) => (
                        <div key={entry.id} className="rounded-2xl border border-border/70 p-4">
                          <div className="flex items-center justify-between">
                            <p className="font-semibold">{entry.interviewer?.name}</p>
                            <Badge variant="secondary">{entry.rating}/5</Badge>
                          </div>
                          <p className="mt-2 text-sm"><strong>Strengths:</strong> {entry.strengths || "None captured"}</p>
                          <p className="mt-2 text-sm"><strong>Concerns:</strong> {entry.concerns || "None captured"}</p>
                          <p className="mt-2 text-sm"><strong>Recommendation:</strong> {entry.recommendation}</p>
                        </div>
                      ))}
                      {interview.permissions.canSubmitFeedback && (
                        <FeedbackForm
                          onSubmit={async (values) => {
                            await onAddFeedback(interview.id, values);
                            toast.success("Feedback submitted");
                          }}
                        />
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="notes" className="space-y-4">
                  <Card className="rounded-[24px]">
                    <CardContent className="space-y-4 p-5">
                      <div>
                        <p className="text-sm text-muted-foreground">Agenda</p>
                        <p className="mt-2 whitespace-pre-wrap text-sm">{interview.agenda || "No agenda yet."}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Internal notes</p>
                        <Textarea value={interview.notes} readOnly rows={8} className="mt-2 rounded-2xl" />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="audit" className="space-y-4">
                  <Card className="rounded-[24px]">
                    <CardContent className="space-y-4 p-5">
                      {[...interview.audit, ...interview.notifications.map((entry) => ({
                        id: entry.id,
                        action: entry.type,
                        actor: entry.sentBy,
                        note: entry.message,
                        createdAt: entry.sentAt,
                        meta: null,
                      }))].map((entry) => (
                        <div key={entry.id} className="flex gap-3 rounded-2xl border border-border/70 p-4">
                          <CalendarClock className="mt-0.5 h-4 w-4 text-primary" />
                          <div>
                            <p className="font-medium">{entry.action}</p>
                            <p className="text-sm text-muted-foreground">{entry.actor?.name || "System"} | {formatInterviewDateTime(entry.createdAt)}</p>
                            <p className="mt-1 text-sm">{entry.note || "No note provided."}</p>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto rounded-[28px]">
          <DialogHeader>
            <DialogTitle>Edit interview</DialogTitle>
          </DialogHeader>
          {interview && (
            <InterviewForm
              mode="edit"
              meta={meta}
              interview={interview}
              onSubmit={async (values) => {
                await onUpdate(interview.id, values);
                setEditing(false);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
