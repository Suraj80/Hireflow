import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BrainCircuit,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Globe2,
  Mail,
  MapPin,
  Phone,
  RotateCw,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { AIScoreBadge } from "@/features/candidates/components/AIScoreBadge";
import { CandidateTimeline } from "@/features/candidates/components/CandidateTimeline";
import { NotesPanel } from "@/features/candidates/components/NotesPanel";
import { ResumeViewer } from "@/features/candidates/components/ResumeViewer";
import { StageBadge } from "@/features/candidates/components/StageBadge";
import {
  formatRelative,
  formatShortDate,
  formatTimestamp,
  priorityLabels,
  sourceLabels,
  stageOrder,
  statusToneClass,
} from "@/features/candidates/helpers";
import { candidateInterviewModeOptions, candidateInterviewStatusOptions } from "@/features/candidates/schema";
import { candidatesApi } from "@/features/candidates/api";
import { defaultCandidateMeta, useCandidatesStore } from "@/features/candidates/store";
import { Candidate, CandidateInterviewMode, CandidateInterviewStatus, CandidateStage } from "@/features/candidates/types";
import { TagSelector } from "@/features/jobs/components/TagSelector";

function DetailLoadingState() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-56 rounded-[28px]" />
      <Skeleton className="h-[640px] rounded-[28px]" />
    </div>
  );
}

export default function CandidateDetailPage() {
  const navigate = useNavigate();
  const { candidateId } = useParams();
  const candidatesState = useCandidatesStore();
  const {
    detail,
    detailLoading,
    detailError,
    meta,
    fetchMeta,
    fetchCandidateById,
    moveStage,
    addInterview,
    assignRecruiter,
    addNote,
    updateNote,
    deleteNote,
    archiveCandidate,
  } = candidatesState;
  const safeMeta = meta ?? defaultCandidateMeta;
  const [stageOpen, setStageOpen] = useState(false);
  const [stageValue, setStageValue] = useState<CandidateStage>("Applied");
  const [stageReason, setStageReason] = useState("");
  const [recruiterOpen, setRecruiterOpen] = useState(false);
  const [recruiterValue, setRecruiterValue] = useState("unassigned");
  const [interviewOpen, setInterviewOpen] = useState(false);
  const [interviewDate, setInterviewDate] = useState("");
  const [interviewMode, setInterviewMode] = useState<CandidateInterviewMode>("Virtual");
  const [interviewStatus, setInterviewStatus] = useState<CandidateInterviewStatus>("Scheduled");
  const [interviewers, setInterviewers] = useState<string[]>([]);
  const [interviewFeedback, setInterviewFeedback] = useState("");
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (!safeMeta.recruiters.length) {
      void fetchMeta();
    }
  }, [fetchMeta, safeMeta.recruiters.length]);

  useEffect(() => {
    if (!candidateId) {
      return;
    }

    void fetchCandidateById(candidateId);
  }, [candidateId, fetchCandidateById]);

  const candidate = detail && detail.id === candidateId ? detail : null;
  const canManage = candidate?.permissions.canEdit ?? false;

  const stageProgress = useMemo(() => {
    if (!candidate) {
      return [];
    }

    const currentIndex = stageOrder.indexOf(candidate.stage);
    return stageOrder.map((stage, index) => ({
      stage,
      active: stage === candidate.stage,
      complete: currentIndex >= 0 && index <= currentIndex && stage !== "Rejected",
    }));
  }, [candidate]);

  if (detailLoading || (!candidate && !detailError)) {
    return <DetailLoadingState />;
  }

  if (detailError || !candidate) {
    return (
      <Card className="rounded-[28px] border border-destructive/20 shadow-sm">
        <CardContent className="p-10">
          <p className="font-medium text-destructive">Unable to load candidate profile</p>
          <p className="mt-2 text-sm text-muted-foreground">{detailError || "Candidate not found"}</p>
          <Button className="mt-6 rounded-2xl" variant="outline" onClick={() => navigate("/candidates")}>
            Back to candidates
          </Button>
        </CardContent>
      </Card>
    );
  }

  const handleArchive = async () => {
    if (!window.confirm(`Archive ${candidate.name}?`)) {
      return;
    }

    try {
      setWorking(true);
      await archiveCandidate(candidate.id);
      toast.success("Candidate archived");
      navigate("/candidates");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to archive candidate");
    } finally {
      setWorking(false);
    }
  };

  const handleStageSave = async () => {
    try {
      setWorking(true);
      await moveStage(candidate.id, { stage: stageValue, reason: stageReason });
      toast.success("Stage updated");
      setStageOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update stage");
    } finally {
      setWorking(false);
    }
  };

  const handleRecruiterSave = async () => {
    try {
      setWorking(true);
      await assignRecruiter(candidate.id, recruiterValue === "unassigned" ? null : recruiterValue);
      toast.success("Recruiter assignment updated");
      setRecruiterOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to assign recruiter");
    } finally {
      setWorking(false);
    }
  };

  const handleInterviewSave = async () => {
    if (!interviewDate || interviewers.length === 0) {
      toast.error("Add an interview date and at least one interviewer");
      return;
    }

    try {
      setWorking(true);
      await addInterview(candidate.id, {
        date: interviewDate,
        interviewers,
        mode: interviewMode,
        status: interviewStatus,
        feedback: interviewFeedback,
      });
      toast.success("Interview scheduled");
      setInterviewOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to schedule interview");
    } finally {
      setWorking(false);
    }
  };

  const handleRescore = async () => {
    try {
      setWorking(true);
      await candidatesApi.rescore(candidate.id);
      await fetchCandidateById(candidate.id);
      toast.success("AI scoring queued");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to queue AI scoring");
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-2xl" onClick={() => navigate("/candidates")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Candidate profile</h1>
          <p className="mt-1 text-muted-foreground">
            Review candidate context, timeline, interviews, and internal notes from one detailed workspace.
          </p>
        </div>
      </div>

      <Card className="overflow-hidden rounded-[30px] border border-border/80 shadow-sm">
        <div className="bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.14),transparent_35%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.14),transparent_35%)]">
          <CardContent className="space-y-6 p-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div className="flex items-start gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-2xl font-semibold">{candidate.name}</h2>
                    <StageBadge stage={candidate.stage} />
                    <AIScoreBadge score={candidate.aiScore} status={candidate.aiStatus} />
                    <Badge variant="outline" className={`rounded-full border ${statusToneClass[candidate.statusIndicator.tone]}`}>
                      {candidate.statusIndicator.label}
                    </Badge>
                  </div>
                  <p className="mt-2 text-muted-foreground">
                    {candidate.job?.title || "Unlinked job"} {candidate.department ? `| ${candidate.department}` : ""}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      {candidate.email}
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      {candidate.phone || "Phone not added"}
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {candidate.location || "Location not added"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {canManage && (
                  <Button className="rounded-2xl" variant="outline" onClick={() => navigate(`/candidates/${candidate.id}/edit`)}>
                    Edit candidate
                  </Button>
                )}
                {candidate.permissions.canMoveStage && (
                  <Button
                    className="rounded-2xl"
                    variant="outline"
                    onClick={() => {
                      setStageValue(candidate.stage);
                      setStageReason("");
                      setStageOpen(true);
                    }}
                  >
                    Move stage
                  </Button>
                )}
                {candidate.permissions.canScheduleInterview && (
                  <Button
                    className="rounded-2xl"
                    variant="outline"
                    onClick={() => {
                      setInterviewDate("");
                      setInterviewers([]);
                      setInterviewMode("Virtual");
                      setInterviewStatus("Scheduled");
                      setInterviewFeedback("");
                      setInterviewOpen(true);
                    }}
                  >
                    Schedule interview
                  </Button>
                )}
                {candidate.permissions.canAssignRecruiter && (
                  <Button
                    className="rounded-2xl"
                    variant="outline"
                    onClick={() => {
                      setRecruiterValue(candidate.recruiterAssigned?.id || "unassigned");
                      setRecruiterOpen(true);
                    }}
                  >
                    Assign recruiter
                  </Button>
                )}
                {candidate.permissions.canArchive && (
                  <Button className="rounded-2xl" variant="outline" onClick={() => void handleArchive()}>
                    Archive
                  </Button>
                )}
                {candidate.permissions.canEdit && candidate.resumeUrl && (
                  <Button className="rounded-2xl" variant="outline" disabled={working} onClick={() => void handleRescore()}>
                    <RotateCw className="mr-2 h-4 w-4" />
                    Re-score
                  </Button>
                )}
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-6">
              {stageProgress.map((step, index) => (
                <div key={step.stage} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-2xl text-xs font-semibold ${
                        step.active ? "bg-primary text-primary-foreground" : step.complete ? "bg-emerald-500/15 text-emerald-700" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {index + 1}
                    </div>
                    <p className="text-sm font-medium">{step.stage}</p>
                  </div>
                  <div className={`h-1 rounded-full ${step.complete || step.active ? "bg-primary/60" : "bg-muted"}`} />
                </div>
              ))}
            </div>
          </CardContent>
        </div>
      </Card>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid h-auto grid-cols-2 rounded-[24px] p-1 md:grid-cols-6">
          <TabsTrigger value="overview" className="rounded-[18px] py-2.5">
            Overview
          </TabsTrigger>
          <TabsTrigger value="resume" className="rounded-[18px] py-2.5">
            Resume
          </TabsTrigger>
          <TabsTrigger value="timeline" className="rounded-[18px] py-2.5">
            Timeline
          </TabsTrigger>
          <TabsTrigger value="notes" className="rounded-[18px] py-2.5">
            Notes
          </TabsTrigger>
          <TabsTrigger value="interviews" className="rounded-[18px] py-2.5">
            Interviews
          </TabsTrigger>
          <TabsTrigger value="activity" className="rounded-[18px] py-2.5">
            Activity
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-6">
              <Card className="rounded-[28px] border border-border/80 shadow-sm">
                <CardHeader>
                  <CardTitle>Profile summary</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-[22px] border border-border/80 p-4">
                    <p className="text-sm text-muted-foreground">Current role</p>
                    <p className="mt-1 font-medium">{candidate.currentRole || "Not added"}</p>
                    <p className="mt-2 text-sm text-muted-foreground">Current company</p>
                    <p className="mt-1 font-medium">{candidate.currentCompany || "Not added"}</p>
                  </div>
                  <div className="rounded-[22px] border border-border/80 p-4">
                    <p className="text-sm text-muted-foreground">Experience</p>
                    <p className="mt-1 font-medium">
                      {candidate.experience.years} years, {candidate.experience.months} months
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">Priority</p>
                    <p className="mt-1 font-medium">{priorityLabels[candidate.priority]}</p>
                  </div>
                  <div className="rounded-[22px] border border-border/80 p-4">
                    <p className="text-sm text-muted-foreground">Applied job</p>
                    <p className="mt-1 font-medium">{candidate.job?.title || "Not linked"}</p>
                    <p className="mt-2 text-sm text-muted-foreground">Source</p>
                    <p className="mt-1 font-medium">{sourceLabels[candidate.source]}</p>
                  </div>
                  <div className="rounded-[22px] border border-border/80 p-4">
                    <p className="text-sm text-muted-foreground">Assigned recruiter</p>
                    <p className="mt-1 font-medium">{candidate.recruiterAssigned?.name || "Unassigned"}</p>
                    <p className="mt-2 text-sm text-muted-foreground">Rating</p>
                    <p className="mt-1 font-medium">{candidate.rating ? `${candidate.rating}/5` : "Not rated yet"}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-[28px] border border-border/80 shadow-sm">
                <CardHeader>
                  <CardTitle>Contact and links</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-[22px] border border-border/80 p-4">
                    <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      Email
                    </p>
                    <p className="mt-1 font-medium">{candidate.email}</p>
                  </div>
                  <div className="rounded-[22px] border border-border/80 p-4">
                    <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      Phone
                    </p>
                    <p className="mt-1 font-medium">{candidate.phone || "Not added"}</p>
                    <p className="mt-2 text-sm text-muted-foreground">Alternate phone</p>
                    <p className="mt-1 font-medium">{candidate.altPhone || "Not added"}</p>
                  </div>
                  <div className="rounded-[22px] border border-border/80 p-4">
                    <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      Location
                    </p>
                    <p className="mt-1 font-medium">{candidate.location || "Not added"}</p>
                  </div>
                  <div className="rounded-[22px] border border-border/80 p-4">
                    <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                      <Globe2 className="h-4 w-4" />
                      External links
                    </p>
                    <div className="mt-2 flex flex-col gap-2 text-sm">
                      {candidate.linkedin ? (
                        <a href={candidate.linkedin} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-4">
                          LinkedIn profile
                        </a>
                      ) : (
                        <span className="text-muted-foreground">LinkedIn not added</span>
                      )}
                      {candidate.portfolio ? (
                        <a href={candidate.portfolio} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-4">
                          Portfolio
                        </a>
                      ) : (
                        <span className="text-muted-foreground">Portfolio not added</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-[28px] border border-border/80 shadow-sm">
                <CardHeader>
                  <CardTitle>Skills and qualifications</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {candidate.skills.length ? (
                      candidate.skills.map((skill) => (
                        <Badge key={skill} variant="secondary" className="rounded-full px-3 py-1">
                          {skill}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No skills added yet.</p>
                    )}
                  </div>
                  {candidate.certifications.length > 0 && (
                    <div>
                      <p className="text-sm font-medium">Certifications</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {candidate.certifications.map((item) => (
                          <Badge key={item} variant="outline" className="rounded-full px-3 py-1">
                            {item}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {candidate.languages.length > 0 && (
                    <div>
                      <p className="text-sm font-medium">Languages</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {candidate.languages.map((item) => (
                          <Badge key={item} variant="outline" className="rounded-full px-3 py-1">
                            {item}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="rounded-[28px] border border-border/80 shadow-sm">
                <CardHeader>
                  <CardTitle>Application info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-[22px] border border-border/80 p-4">
                    <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                      <BrainCircuit className="h-4 w-4" />
                      AI resume match
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <AIScoreBadge score={candidate.aiScore} status={candidate.aiStatus} />
                      {candidate.aiScoredAt && (
                        <span className="text-xs text-muted-foreground">
                          Updated {formatTimestamp(candidate.aiScoredAt)}
                        </span>
                      )}
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">
                      {candidate.aiReasoning || "Upload a resume to enable AI scoring for this candidate."}
                    </p>
                  </div>
                  <div className="rounded-[22px] border border-border/80 p-4">
                    <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                      <BriefcaseBusiness className="h-4 w-4" />
                      Job and department
                    </p>
                    <p className="mt-1 font-medium">{candidate.job?.title || "Not linked"}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{candidate.department || "Department not set"}</p>
                  </div>
                  <div className="rounded-[22px] border border-border/80 p-4">
                    <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                      <Building2 className="h-4 w-4" />
                      Compensation and notice
                    </p>
                    <p className="mt-1 font-medium">
                      {candidate.expectedSalary ? candidate.expectedSalary.toLocaleString() : "Salary not added"}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Notice: {candidate.noticePeriod || "Not added"} | Work auth: {candidate.workAuthorization || "Not added"}
                    </p>
                  </div>
                  <div className="rounded-[22px] border border-border/80 p-4">
                    <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                      <CalendarDays className="h-4 w-4" />
                      Applied and updated
                    </p>
                    <p className="mt-1 font-medium">{formatShortDate(candidate.createdAt)}</p>
                    <p className="mt-1 text-sm text-muted-foreground">Updated {formatRelative(candidate.updatedAt)}</p>
                  </div>
                  {candidate.coverLetter && (
                    <div className="rounded-[22px] border border-border/80 p-4">
                      <p className="text-sm text-muted-foreground">Cover letter</p>
                      <p className="mt-2 whitespace-pre-wrap text-sm">{candidate.coverLetter}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-[28px] border border-border/80 shadow-sm">
                <CardHeader>
                  <CardTitle>Education and stage history</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {candidate.education.length > 0 ? (
                    candidate.education.map((item, index) => (
                      <div key={`${item.degree}-${index}`} className="rounded-[22px] border border-border/80 p-4">
                        <p className="font-medium">{item.degree || "Degree not added"}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {item.college || "College not added"} {item.year ? `| ${item.year}` : ""}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No education records added yet.</p>
                  )}

                  <div className="space-y-3">
                    <p className="font-medium">Stage history</p>
                    {candidate.stageHistory.map((item, index) => (
                      <div key={`${item.stage}-${index}`} className="rounded-[22px] border border-border/80 p-4">
                        <div className="flex items-center justify-between gap-4">
                          <StageBadge stage={item.stage} />
                          <span className="text-xs text-muted-foreground">{formatTimestamp(item.changedAt)}</span>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {item.changedBy?.name || "Unknown"} {item.reason ? `| ${item.reason}` : ""}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="resume">
          <ResumeViewer resumeUrl={candidate.resumeUrl} resumeMeta={candidate.resumeMeta} uploadedAt={candidate.updatedAt} />
        </TabsContent>

        <TabsContent value="timeline">
          <CandidateTimeline items={candidate.timeline} />
        </TabsContent>

        <TabsContent value="notes">
          <NotesPanel
            candidateId={candidate.id}
            notes={candidate.notes}
            canManage={candidate.permissions.canAddNote}
            mentionableUsers={safeMeta.recruiters}
            onAdd={(payload) => addNote(candidate.id, payload).then(() => undefined)}
            onUpdate={(noteId, payload) => updateNote(candidate.id, noteId, payload).then(() => undefined)}
            onDelete={(noteId) => deleteNote(candidate.id, noteId)}
          />
        </TabsContent>

        <TabsContent value="interviews">
          <Card className="rounded-[28px] border border-border/80 shadow-sm">
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>Interview rounds</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Track round timing, mode, interviewers, and outcome context.
                </p>
              </div>
              {candidate.permissions.canScheduleInterview && (
                <Button className="rounded-2xl" onClick={() => setInterviewOpen(true)}>
                  Schedule interview
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {candidate.interviews.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-border/80 bg-muted/20 px-6 py-12 text-center">
                  <p className="font-medium">No interviews scheduled yet</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    The interview list will populate once a recruiter schedules the first round.
                  </p>
                </div>
              ) : (
                candidate.interviews.map((interview) => (
                  <div key={interview.id} className="rounded-[24px] border border-border/80 bg-background p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="rounded-full">
                            {interview.mode}
                          </Badge>
                          <Badge variant="secondary" className="rounded-full">
                            {interview.status}
                          </Badge>
                        </div>
                        <p className="mt-3 font-medium">{formatTimestamp(interview.date)}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Interviewers: {interview.interviewers.join(", ")}
                        </p>
                      </div>
                    </div>
                    {interview.feedback && (
                      <div className="mt-4 rounded-[18px] bg-muted/30 p-4 text-sm text-muted-foreground">
                        {interview.feedback}
                      </div>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <CandidateTimeline items={candidate.activity} title="Audit activity" />
        </TabsContent>
      </Tabs>

      <Dialog open={stageOpen} onOpenChange={setStageOpen}>
        <DialogContent className="rounded-[28px]">
          <DialogHeader>
            <DialogTitle>Move stage</DialogTitle>
            <DialogDescription>Track a stage change for {candidate.name} with optional reasoning for the audit trail.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Stage</Label>
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
              <Textarea value={stageReason} onChange={(event) => setStageReason(event.target.value)} className="rounded-2xl" placeholder="Optional context for this move" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" className="rounded-2xl" onClick={() => setStageOpen(false)}>
              Cancel
            </Button>
            <Button className="rounded-2xl" disabled={working} onClick={() => void handleStageSave()}>
              Save stage
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={recruiterOpen} onOpenChange={setRecruiterOpen}>
        <DialogContent className="rounded-[28px]">
          <DialogHeader>
            <DialogTitle>Assign recruiter</DialogTitle>
            <DialogDescription>Update ownership for {candidate.name} so follow-up actions route to the right teammate.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Recruiter</Label>
            <Select value={recruiterValue} onValueChange={setRecruiterValue}>
              <SelectTrigger className="h-11 rounded-2xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {safeMeta.recruiters.map((recruiter) => (
                  <SelectItem key={recruiter.id} value={recruiter.id}>
                    {recruiter.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="ghost" className="rounded-2xl" onClick={() => setRecruiterOpen(false)}>
              Cancel
            </Button>
            <Button className="rounded-2xl" disabled={working} onClick={() => void handleRecruiterSave()}>
              Save assignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={interviewOpen} onOpenChange={setInterviewOpen}>
        <DialogContent className="max-w-3xl rounded-[28px]">
          <DialogHeader>
            <DialogTitle>Schedule interview</DialogTitle>
            <DialogDescription>Capture the next interview round and keep the candidate timeline in sync.</DialogDescription>
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
              <TagSelector values={interviewers} onChange={setInterviewers} placeholder="Add interviewer names" limit={10} />
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
              <Label>Feedback / prep notes</Label>
              <Textarea value={interviewFeedback} onChange={(event) => setInterviewFeedback(event.target.value)} className="rounded-2xl" placeholder="Optional prep notes or round context" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" className="rounded-2xl" onClick={() => setInterviewOpen(false)}>
              Cancel
            </Button>
            <Button className="rounded-2xl" disabled={working} onClick={() => void handleInterviewSave()}>
              Save interview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
