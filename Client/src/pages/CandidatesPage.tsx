import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, Plus, Users2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/AuthProvider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { CandidateTable } from "@/features/candidates/components/CandidateTable";
import { averageAiScore, downloadCandidatesCsv } from "@/features/candidates/helpers";
import { candidateInterviewModeOptions, candidateInterviewStatusOptions } from "@/features/candidates/schema";
import {
  defaultCandidateMeta,
  defaultCandidatePagination,
  useCandidatesStore,
} from "@/features/candidates/store";
import { Candidate, CandidateInterviewMode, CandidateInterviewStatus, CandidateStage } from "@/features/candidates/types";
import { RichTextEditor } from "@/features/jobs/components/RichTextEditor";
import { TagSelector } from "@/features/jobs/components/TagSelector";

const EMPTY_CANDIDATES: Candidate[] = [];
const EMPTY_SELECTED_IDS: string[] = [];

function LoadingState() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-28 rounded-[28px]" />
      <Skeleton className="h-[520px] rounded-[28px]" />
    </div>
  );
}

function EmptyState({ canManageCandidates, onCreate }: { canManageCandidates: boolean; onCreate: () => void }) {
  return (
    <Card className="rounded-[28px] border border-dashed border-border/80 bg-card/70">
      <CardContent className="flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10">
          <Users2 className="h-8 w-8 text-primary" />
        </div>
        <h2 className="mt-5 text-xl font-semibold">No candidates match the current view</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Create a fresh manual entry to start building this pipeline segment.
        </p>
        {canManageCandidates && (
          <Button className="mt-6 h-11 rounded-2xl" onClick={onCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Create candidate
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default function CandidatesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canManageCandidates = user?.role === "admin" || user?.role === "recruiter";
  const candidatesState = useCandidatesStore();
  const {
    candidates,
    loading,
    error,
    filters,
    pagination,
    meta,
    selectedIds,
    setPage,
    clearSelection,
    fetchCandidates,
    moveStage,
    addInterview,
    addNote,
    archiveCandidate,
    bulkAction,
  } = candidatesState;
  const safeCandidates = candidates ?? EMPTY_CANDIDATES;
  const safePagination = pagination ?? defaultCandidatePagination;
  const safeMeta = meta ?? defaultCandidateMeta;
  const safeSelectedIds = selectedIds ?? EMPTY_SELECTED_IDS;
  const [stageCandidate, setStageCandidate] = useState<Candidate | null>(null);
  const [stageValue, setStageValue] = useState<CandidateStage>("Applied");
  const [stageReason, setStageReason] = useState("");
  const [noteCandidate, setNoteCandidate] = useState<Candidate | null>(null);
  const [noteContent, setNoteContent] = useState("");
  const [notePinned, setNotePinned] = useState(false);
  const [interviewCandidate, setInterviewCandidate] = useState<Candidate | null>(null);
  const [interviewDate, setInterviewDate] = useState("");
  const [interviewMode, setInterviewMode] = useState<CandidateInterviewMode>("Virtual");
  const [interviewStatus, setInterviewStatus] = useState<CandidateInterviewStatus>("Scheduled");
  const [interviewers, setInterviewers] = useState<string[]>([]);
  const [interviewFeedback, setInterviewFeedback] = useState("");
  const [bulkStage, setBulkStage] = useState<CandidateStage>("Applied");
  const [bulkRecruiter, setBulkRecruiter] = useState<string>("unassigned");
  const [working, setWorking] = useState(false);

  useEffect(() => {
    void fetchCandidates();
  }, [fetchCandidates, filters, safePagination.page, safePagination.limit]);

  const selectedCandidates = useMemo(
    () => safeCandidates.filter((candidate) => safeSelectedIds.includes(candidate.id)),
    [safeCandidates, safeSelectedIds]
  );

  const openStageDialog = (candidate: Candidate) => {
    setStageCandidate(candidate);
    setStageValue(candidate.stage);
    setStageReason("");
  };

  const openInterviewDialog = (candidate: Candidate) => {
    setInterviewCandidate(candidate);
    setInterviewDate("");
    setInterviewMode("Virtual");
    setInterviewStatus("Scheduled");
    setInterviewers([]);
    setInterviewFeedback("");
  };

  const openNoteDialog = (candidate: Candidate) => {
    setNoteCandidate(candidate);
    setNoteContent("");
    setNotePinned(false);
  };

  const handleReject = async (candidate: Candidate) => {
    const reason = window.prompt("Reason for rejection?", "Not a fit for current role") || "";

    try {
      setWorking(true);
      await moveStage(candidate.id, {
        stage: "Rejected",
        reason,
      });
      toast.success("Candidate rejected");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to reject candidate");
    } finally {
      setWorking(false);
    }
  };

  const handleArchive = async (candidate: Candidate) => {
    if (!window.confirm(`Archive ${candidate.name}?`)) {
      return;
    }

    try {
      setWorking(true);
      await archiveCandidate(candidate.id);
      toast.success("Candidate archived");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to archive candidate");
    } finally {
      setWorking(false);
    }
  };

  const handleStageSubmit = async () => {
    if (!stageCandidate) {
      return;
    }

    try {
      setWorking(true);
      await moveStage(stageCandidate.id, {
        stage: stageValue,
        reason: stageReason,
      });
      toast.success("Stage updated");
      setStageCandidate(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update stage");
    } finally {
      setWorking(false);
    }
  };

  const handleNoteSubmit = async () => {
    if (!noteCandidate || !noteContent.replace(/<[^>]+>/g, "").trim()) {
      toast.error("Note content is required");
      return;
    }

    try {
      setWorking(true);
      await addNote(noteCandidate.id, {
        content: noteContent,
        pinned: notePinned,
      });
      toast.success("Note added");
      setNoteCandidate(null);
      setNoteContent("");
      setNotePinned(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save note");
    } finally {
      setWorking(false);
    }
  };

  const handleInterviewSubmit = async () => {
    if (!interviewCandidate || !interviewDate || interviewers.length === 0) {
      toast.error("Add an interview date and at least one interviewer");
      return;
    }

    try {
      setWorking(true);
      await addInterview(interviewCandidate.id, {
        date: interviewDate,
        interviewers,
        mode: interviewMode,
        status: interviewStatus,
        feedback: interviewFeedback,
      });
      toast.success("Interview scheduled");
      setInterviewCandidate(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to schedule interview");
    } finally {
      setWorking(false);
    }
  };

  const handleBulkStageMove = async () => {
    if (safeSelectedIds.length === 0) {
      return;
    }

    try {
      setWorking(true);
      await bulkAction({
        action: "move-stage",
        candidateIds: safeSelectedIds,
        stage: bulkStage,
      });
      clearSelection();
      toast.success("Bulk stage move completed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to complete bulk action");
    } finally {
      setWorking(false);
    }
  };

  const handleBulkAssign = async () => {
    if (safeSelectedIds.length === 0) {
      return;
    }

    try {
      setWorking(true);
      await bulkAction({
        action: "assign-recruiter",
        candidateIds: safeSelectedIds,
        recruiterAssigned: bulkRecruiter === "unassigned" ? null : bulkRecruiter,
      });
      clearSelection();
      toast.success("Recruiter assignment updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to assign recruiter");
    } finally {
      setWorking(false);
    }
  };

  const handleBulkArchive = async () => {
    if (safeSelectedIds.length === 0 || !window.confirm(`Archive ${safeSelectedIds.length} selected candidates?`)) {
      return;
    }

    try {
      setWorking(true);
      await bulkAction({
        action: "archive",
        candidateIds: safeSelectedIds,
      });
      clearSelection();
      toast.success("Selected candidates archived");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to archive selected candidates");
    } finally {
      setWorking(false);
    }
  };

  const handleBulkReject = async () => {
    if (safeSelectedIds.length === 0) {
      return;
    }

    try {
      setWorking(true);
      await bulkAction({
        action: "reject",
        candidateIds: safeSelectedIds,
      });
      clearSelection();
      toast.success("Selected candidates rejected");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to reject selected candidates");
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {canManageCandidates && (
          <Button className="h-11 rounded-2xl self-start" onClick={() => navigate("/candidates/new")}>
            <Plus className="mr-2 h-4 w-4" />
            Create candidate
          </Button>
        )}
      </div>
      {safeSelectedIds.length > 0 && canManageCandidates && (
        <Card className="rounded-[28px] border border-primary/20 bg-primary/5 shadow-sm">
          <CardContent className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_220px_220px_auto]">
            <div>
              <p className="font-medium">{safeSelectedIds.length} candidates selected</p>
              <p className="text-sm text-muted-foreground">
                Move stages, assign ownership, reject, archive, or export the selected rows.
              </p>
            </div>
            <Select value={bulkStage} onValueChange={(value) => setBulkStage(value as CandidateStage)}>
              <SelectTrigger className="h-11 rounded-2xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {safeMeta.stages.map((stage) => (
                  <SelectItem key={stage} value={stage}>
                    {stage}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={bulkRecruiter} onValueChange={setBulkRecruiter}>
              <SelectTrigger className="h-11 rounded-2xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassign recruiter</SelectItem>
                {safeMeta.recruiters.map((recruiter) => (
                  <SelectItem key={recruiter.id} value={recruiter.id}>
                    {recruiter.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="rounded-2xl" disabled={working} onClick={() => void handleBulkStageMove()}>
                Move stage
              </Button>
              <Button variant="outline" className="rounded-2xl" disabled={working} onClick={() => void handleBulkAssign()}>
                Assign
              </Button>
              <Button variant="outline" className="rounded-2xl" disabled={working} onClick={() => void handleBulkReject()}>
                Reject
              </Button>
              <Button variant="outline" className="rounded-2xl" disabled={working} onClick={() => void handleBulkArchive()}>
                Archive
              </Button>
              <Button variant="outline" className="rounded-2xl" onClick={() => downloadCandidatesCsv(selectedCandidates)}>
                Export CSV
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <LoadingState />
      ) : error ? (
        <Alert variant="destructive" className="rounded-[28px]">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Unable to load candidates</AlertTitle>
          <AlertDescription className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <span>{error}</span>
            <Button variant="outline" className="rounded-2xl" onClick={() => void fetchCandidates()}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      ) : safeCandidates.length === 0 ? (
        <EmptyState canManageCandidates={canManageCandidates} onCreate={() => navigate("/candidates/new")} />
      ) : (
        <CandidateTable
          candidates={safeCandidates}
          onView={(candidate) => navigate(`/candidates/${candidate.id}`)}
          onEdit={(candidate) => navigate(`/candidates/${candidate.id}/edit`)}
          onMoveStage={openStageDialog}
          onScheduleInterview={openInterviewDialog}
          onAddNote={openNoteDialog}
          onReject={(candidate) => void handleReject(candidate)}
          onArchive={(candidate) => void handleArchive(candidate)}
        />
      )}

      {!loading && !error && safeCandidates.length > 0 && (
        <div className="flex flex-col gap-3 rounded-[28px] border border-border/80 bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Page {safePagination.page} of {safePagination.totalPages} | {safePagination.total} total candidates
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="rounded-2xl"
              disabled={safePagination.page <= 1}
              onClick={() => setPage(safePagination.page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              className="rounded-2xl"
              disabled={safePagination.page >= safePagination.totalPages}
              onClick={() => setPage(safePagination.page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <Dialog open={Boolean(stageCandidate)} onOpenChange={(open) => !open && setStageCandidate(null)}>
        <DialogContent className="rounded-[28px]">
          <DialogHeader>
            <DialogTitle>Move candidate stage</DialogTitle>
            <DialogDescription>
              Update the pipeline stage for {stageCandidate?.name}. This change will be written to stage history and audit activity.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>New stage</Label>
              <Select value={stageValue} onValueChange={(value) => setStageValue(value as CandidateStage)}>
                <SelectTrigger className="h-11 rounded-2xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {safeMeta.stages.map((stage) => (
                    <SelectItem key={stage} value={stage}>
                      {stage}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Input value={stageReason} onChange={(event) => setStageReason(event.target.value)} placeholder="Optional context for the move" className="h-11 rounded-2xl" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" className="rounded-2xl" onClick={() => setStageCandidate(null)}>
              Cancel
            </Button>
            <Button className="rounded-2xl" disabled={working} onClick={() => void handleStageSubmit()}>
              Save stage
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(noteCandidate)} onOpenChange={(open) => !open && setNoteCandidate(null)}>
        <DialogContent className="max-w-3xl rounded-[28px]">
          <DialogHeader>
            <DialogTitle>Add candidate note</DialogTitle>
            <DialogDescription>
              Capture private internal context for {noteCandidate?.name}. Notes stay visible only to the hiring team.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <RichTextEditor value={noteContent} onChange={setNoteContent} />
            <div className="flex items-center gap-3">
              <Switch checked={notePinned} onCheckedChange={setNotePinned} />
              <Label>Pin this note</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" className="rounded-2xl" onClick={() => setNoteCandidate(null)}>
              Cancel
            </Button>
            <Button className="rounded-2xl" disabled={working} onClick={() => void handleNoteSubmit()}>
              Save note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(interviewCandidate)} onOpenChange={(open) => !open && setInterviewCandidate(null)}>
        <DialogContent className="max-w-3xl rounded-[28px]">
          <DialogHeader>
            <DialogTitle>Schedule interview</DialogTitle>
            <DialogDescription>
              Add the next interview round for {interviewCandidate?.name}. It will appear in timeline and interviews history.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Date and time</Label>
              <Input type="datetime-local" value={interviewDate} onChange={(event) => setInterviewDate(event.target.value)} className="h-11 rounded-2xl" />
            </div>
            <div className="space-y-2">
              <Label>Mode</Label>
              <Select value={interviewMode} onValueChange={(value) => setInterviewMode(value as CandidateInterviewMode)}>
                <SelectTrigger className="h-11 rounded-2xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {candidateInterviewModeOptions.map((mode) => (
                    <SelectItem key={mode} value={mode}>
                      {mode}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Interviewers</Label>
              <TagSelector values={interviewers} onChange={setInterviewers} placeholder="Add interviewers" limit={10} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={interviewStatus} onValueChange={(value) => setInterviewStatus(value as CandidateInterviewStatus)}>
                <SelectTrigger className="h-11 rounded-2xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {candidateInterviewStatusOptions.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Feedback placeholder</Label>
              <Input value={interviewFeedback} onChange={(event) => setInterviewFeedback(event.target.value)} placeholder="Optional prep notes or scheduling context" className="h-11 rounded-2xl" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" className="rounded-2xl" onClick={() => setInterviewCandidate(null)}>
              Cancel
            </Button>
            <Button className="rounded-2xl" disabled={working} onClick={() => void handleInterviewSubmit()}>
              Schedule interview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
