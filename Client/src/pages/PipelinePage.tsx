import { useEffect, useMemo, useState } from "react";
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { AlertCircle, ArrowRightLeft, Brain, GripVertical, Sparkles, Users2 } from "lucide-react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/components/AuthProvider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { candidatesApi } from "@/features/candidates/api";
import {
  averageAiScore,
  formatRelative,
  getCandidateInitials,
  groupCandidatesByStage,
  scoreToneClass,
  sourceLabels,
  stageOrder,
  stageToneClass,
} from "@/features/candidates/helpers";
import { Candidate, CandidateBulkActionPayload, CandidateFilters, CandidateStage, CandidateStatus } from "@/features/candidates/types";
import { defaultCandidateFilters } from "@/features/candidates/store";
import { cn } from "@/lib/utils";

const stageDescriptions: Record<CandidateStage, string> = {
  Applied: "Fresh inbound applicants waiting for first review.",
  Screening: "Profiles currently being reviewed by the hiring team.",
  Interview: "Candidates actively in live interview loops.",
  Offer: "Finalists with offers drafted or in discussion.",
  Hired: "Accepted candidates ready for closeout.",
  Rejected: "Candidates that have exited the process.",
};

type PipelineCardProps = {
  candidate: Candidate;
  canManageCandidates: boolean;
  selected: boolean;
  onToggleSelected: (candidateId: string, checked: boolean) => void;
};

type PipelineColumnProps = {
  stage: CandidateStage;
  candidates: Candidate[];
  canManageCandidates: boolean;
  selectedIds: string[];
  onToggleSelected: (candidateId: string, checked: boolean) => void;
  onToggleColumn: (stage: CandidateStage, checked: boolean) => void;
};

function LoadingState() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-32 rounded-[28px]" />
      <div className="flex gap-4 overflow-hidden">
        {stageOrder.map((stage) => (
          <Skeleton key={stage} className="h-[560px] min-w-[320px] rounded-[28px]" />
        ))}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <Card className="rounded-[28px] border border-dashed border-border/80 bg-card/70">
      <CardContent className="flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10">
          <Users2 className="h-8 w-8 text-primary" />
        </div>
        <h2 className="mt-5 text-xl font-semibold">No candidates in this pipeline view</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          New candidates will appear here as they move into the hiring process.
        </p>
      </CardContent>
    </Card>
  );
}

async function fetchAllCandidates(filters: CandidateFilters) {
  const baseParams = {
    ...filters,
    page: 1 as const,
    limit: 100 as const,
  };

  const firstPage = await candidatesApi.list(baseParams);

  if (firstPage.pagination.totalPages <= 1) {
    return firstPage;
  }

  const remainingPages = await Promise.all(
    Array.from({ length: firstPage.pagination.totalPages - 1 }, (_, index) =>
      candidatesApi.list({
        ...baseParams,
        page: index + 2,
      })
    )
  );

  return {
    ...firstPage,
    items: [firstPage.items, ...remainingPages.map((page) => page.items)].flat(),
  };
}

function PipelineCard({ candidate, canManageCandidates, selected, onToggleSelected }: PipelineCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: candidate.id,
    disabled: !canManageCandidates,
  });

  return (
    <Card
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={cn(
        "border border-border/80 transition-all",
        canManageCandidates && "hover:-translate-y-0.5 hover:shadow-md",
        isDragging && "opacity-40 shadow-xl ring-2 ring-primary/20",
        selected && "border-primary/40 ring-2 ring-primary/15"
      )}
    >
      <CardContent className="space-y-4 p-4">
        <div className="flex items-start gap-3">
          {canManageCandidates ? (
            <Checkbox
              checked={selected}
              onCheckedChange={(checked) => onToggleSelected(candidate.id, Boolean(checked))}
              aria-label={`Select ${candidate.name}`}
              className="mt-1"
            />
          ) : null}
          <Avatar className="mt-0.5 h-10 w-10">
            <AvatarFallback className="text-xs gradient-primary text-primary-foreground">
              {getCandidateInitials(candidate.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{candidate.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {candidate.job?.title || "Unassigned job"}
                </p>
              </div>
              {canManageCandidates ? (
                <button
                  type="button"
                  className="mt-0.5 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label={`Drag ${candidate.name}`}
                  {...listeners}
                  {...attributes}
                >
                  <GripVertical className="h-4 w-4" />
                </button>
              ) : null}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {typeof candidate.aiScore === "number" ? (
                <Badge
                  variant="outline"
                  className={`rounded-full border px-2.5 py-1 text-xs ${scoreToneClass(candidate.aiScore)}`}
                >
                  <Brain className="mr-1 h-3 w-3" />
                  {candidate.aiScore}
                </Badge>
              ) : null}
              {candidate.job?.department ? (
                <Badge variant="outline" className="rounded-full px-2.5 py-1 text-xs">
                  {candidate.job.department}
                </Badge>
              ) : null}
              <Badge variant="outline" className="rounded-full px-2.5 py-1 text-xs">
                {sourceLabels[candidate.source]}
              </Badge>
            </div>

            <div className="mt-3 grid gap-1 text-xs text-muted-foreground">
              <p>{candidate.recruiterAssigned?.name || "Unassigned recruiter"}</p>
              <p>{candidate.updatedAt ? `Updated ${formatRelative(candidate.updatedAt)}` : "Recently updated"}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DragPreview({ candidate }: { candidate: Candidate | null }) {
  if (!candidate) {
    return null;
  }

  return (
    <div className="w-[300px] rotate-1 rounded-[22px] border border-border/80 bg-card shadow-2xl">
      <PipelineCard
        candidate={candidate}
        canManageCandidates={false}
        selected={false}
        onToggleSelected={() => undefined}
      />
    </div>
  );
}

function PipelineColumn({
  stage,
  candidates,
  canManageCandidates,
  selectedIds,
  onToggleSelected,
  onToggleColumn,
}: PipelineColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const selectedInStage = candidates.filter((candidate) => selectedIds.includes(candidate.id)).length;
  const allSelected = candidates.length > 0 && selectedInStage === candidates.length;

  return (
    <div className="min-w-[320px] flex-1">
      <div className="mb-3 flex items-center gap-3 px-1">
        <div className={`h-2.5 w-2.5 rounded-full border ${stageToneClass[stage]}`} />
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">{stage}</h3>
          <p className="text-xs text-muted-foreground">{stageDescriptions[stage]}</p>
        </div>
        {canManageCandidates ? (
          <Checkbox
            checked={allSelected}
            onCheckedChange={(checked) => onToggleColumn(stage, Boolean(checked))}
            aria-label={`Select all candidates in ${stage}`}
            className="ml-auto"
          />
        ) : null}
        <Badge variant="secondary" className="h-6 rounded-full px-2.5 text-xs">
          {candidates.length}
        </Badge>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          "min-h-[560px] space-y-3 rounded-[28px] border border-border/70 bg-muted/25 p-3 transition-colors",
          isOver && "bg-primary/5 ring-2 ring-primary/15"
        )}
      >
        {candidates.map((candidate) => (
          <PipelineCard
            key={candidate.id}
            candidate={candidate}
            canManageCandidates={canManageCandidates}
            selected={selectedIds.includes(candidate.id)}
            onToggleSelected={onToggleSelected}
          />
        ))}
      </div>
    </div>
  );
}

export default function PipelinePage() {
  const { user } = useAuth();
  const { jobId } = useParams();
  const canManageCandidates = user?.role === "admin" || user?.role === "recruiter";
  const [filters, setFilters] = useState<CandidateFilters>({
    ...defaultCandidateFilters,
    job: jobId || "all",
  });
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkStage, setBulkStage] = useState<CandidateStage>("Screening");
  const [working, setWorking] = useState(false);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  useEffect(() => {
    const nextJobFilter = jobId || "all";

    setFilters((current) =>
      current.job === nextJobFilter
        ? current
        : {
            ...current,
            job: nextJobFilter,
          }
    );
  }, [jobId]);

  useEffect(() => {
    let ignore = false;

    const loadPipeline = async () => {
      setLoading(true);
      setError(null);

      try {
        const candidatesResponse = await fetchAllCandidates(filters);
        if (!ignore) {
          setCandidates(candidatesResponse.items);
          setSelectedIds((current) =>
            current.filter((candidateId) => candidatesResponse.items.some((candidate) => candidate.id === candidateId))
          );
        }
      } catch (loadError) {
        if (!ignore) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load pipeline candidates");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    void loadPipeline();

    return () => {
      ignore = true;
    };
  }, [filters]);

  const groupedCandidates = useMemo(() => groupCandidatesByStage(candidates), [candidates]);
  const activeDragCandidate = useMemo(
    () => candidates.find((candidate) => candidate.id === activeDragId) || null,
    [activeDragId, candidates]
  );
  const visibleSelectedCandidates = useMemo(
    () => candidates.filter((candidate) => selectedIds.includes(candidate.id)),
    [candidates, selectedIds]
  );
  const visibleSelectedCount = visibleSelectedCandidates.length;
  const averageSelectedScore = useMemo(() => averageAiScore(visibleSelectedCandidates), [visibleSelectedCandidates]);

  const summary = useMemo(() => {
    const scored = candidates.filter((candidate) => typeof candidate.aiScore === "number");
    const hired = candidates.filter((candidate) => candidate.stage === "Hired").length;
    const active = candidates.filter((candidate) => candidate.status === ("Active" as CandidateStatus)).length;

    return {
      total: candidates.length,
      active,
      hired,
      averageAiScore: scored.length
        ? Math.round(scored.reduce((sum, candidate) => sum + (candidate.aiScore || 0), 0) / scored.length)
        : null,
    };
  }, [candidates]);

  const toggleSelected = (candidateId: string, checked: boolean) => {
    setSelectedIds((current) =>
      checked ? Array.from(new Set([...current, candidateId])) : current.filter((item) => item !== candidateId)
    );
  };

  const toggleColumn = (stage: CandidateStage, checked: boolean) => {
    const columnIds = groupedCandidates[stage].map((candidate) => candidate.id);
    setSelectedIds((current) =>
      checked
        ? Array.from(new Set([...current, ...columnIds]))
        : current.filter((candidateId) => !columnIds.includes(candidateId))
    );
  };

  const applyOptimisticStage = (candidateIds: string[], nextStage: CandidateStage) => {
    const movedIds = new Set(candidateIds);
    setCandidates((current) =>
      current.map((candidate) =>
        movedIds.has(candidate.id)
          ? {
              ...candidate,
              stage: nextStage,
              updatedAt: new Date().toISOString(),
            }
          : candidate
      )
    );
  };

  const moveCandidates = async (candidateIds: string[], nextStage: CandidateStage, reason = "") => {
    if (!canManageCandidates || candidateIds.length === 0) {
      return;
    }

    const snapshot = candidates;
    setWorking(true);
    applyOptimisticStage(candidateIds, nextStage);

    try {
      if (candidateIds.length === 1) {
        const updatedCandidate = await candidatesApi.moveStage(candidateIds[0], { stage: nextStage, reason });
        setCandidates((current) =>
          current.map((candidate) => (candidate.id === updatedCandidate.id ? updatedCandidate : candidate))
        );
      } else {
        const payload: CandidateBulkActionPayload = {
          action: "move-stage",
          candidateIds,
          stage: nextStage,
          reason,
        };
        await candidatesApi.bulkAction(payload);
        const refreshed = await fetchAllCandidates(filters);
        setCandidates(refreshed.items);
        setSelectedIds((current) =>
          current.filter((candidateId) => refreshed.items.some((candidate) => candidate.id === candidateId))
        );
      }

      toast.success(
        candidateIds.length === 1
          ? `Candidate moved to ${nextStage}`
          : `${candidateIds.length} candidates moved to ${nextStage}`
      );
    } catch (moveError) {
      setCandidates(snapshot);
      toast.error(moveError instanceof Error ? moveError.message : "Unable to update candidate stage");
    } finally {
      setWorking(false);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveDragId(null);

    const candidateId = String(event.active.id);
    const nextStage = event.over?.id as CandidateStage | undefined;
    const currentCandidate = candidates.find((candidate) => candidate.id === candidateId);

    if (!currentCandidate || !nextStage || currentCandidate.stage === nextStage) {
      return;
    }

    await moveCandidates([candidateId], nextStage, "Moved from pipeline board");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pipeline</h1>
          <p className="mt-1 text-muted-foreground">
            Move candidates across the funnel and manage bulk stage updates from one board.
          </p>
        </div>
        <Badge variant="outline" className="w-fit rounded-full px-3 py-1.5">
          {canManageCandidates ? "Board actions enabled" : "View only"}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-[28px] border border-border/80 shadow-sm">
          <CardContent className="space-y-1 p-5">
            <p className="text-sm text-muted-foreground">Visible candidates</p>
            <p className="text-3xl font-semibold">{summary.total}</p>
          </CardContent>
        </Card>
        <Card className="rounded-[28px] border border-border/80 shadow-sm">
          <CardContent className="space-y-1 p-5">
            <p className="text-sm text-muted-foreground">Active pipeline</p>
            <p className="text-3xl font-semibold">{summary.active}</p>
          </CardContent>
        </Card>
        <Card className="rounded-[28px] border border-border/80 shadow-sm">
          <CardContent className="space-y-1 p-5">
            <p className="text-sm text-muted-foreground">Hired in view</p>
            <p className="text-3xl font-semibold">{summary.hired}</p>
          </CardContent>
        </Card>
        <Card className="rounded-[28px] border border-border/80 shadow-sm">
          <CardContent className="space-y-1 p-5">
            <p className="text-sm text-muted-foreground">Average AI score</p>
            <p className="text-3xl font-semibold">{summary.averageAiScore ?? "--"}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-[28px] border border-border/80 shadow-sm">
        <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4 text-primary" />
              <p className="font-medium">Bulk stage move</p>
            </div>
            <p className="text-sm text-muted-foreground">
              {visibleSelectedCount > 0
                ? `${visibleSelectedCount} candidates selected${averageSelectedScore !== null ? ` • avg AI ${averageSelectedScore}` : ""}`
                : "Select candidates across one or more columns, then move them together."}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Select value={bulkStage} onValueChange={(value) => setBulkStage(value as CandidateStage)}>
              <SelectTrigger className="h-11 min-w-[180px] rounded-2xl">
                <SelectValue placeholder="Move selected to" />
              </SelectTrigger>
              <SelectContent>
                {stageOrder.map((stage) => (
                  <SelectItem key={stage} value={stage}>
                    {stage}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              className="h-11 rounded-2xl"
              disabled={!canManageCandidates || visibleSelectedCount === 0 || working}
              onClick={() => void moveCandidates(selectedIds, bulkStage, "Bulk moved from pipeline board")}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Move selected
            </Button>
            <Button
              variant="outline"
              className="h-11 rounded-2xl"
              disabled={visibleSelectedCount === 0}
              onClick={() => setSelectedIds([])}
            >
              Clear selection
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <Alert variant="destructive" className="rounded-[28px]">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Unable to load the pipeline</AlertTitle>
          <AlertDescription className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <span>{error}</span>
            <Button variant="outline" className="rounded-2xl" onClick={() => setFilters((current) => ({ ...current }))}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      ) : candidates.length === 0 ? (
        <EmptyState />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={(event) => setActiveDragId(String(event.active.id))}
          onDragEnd={(event) => void handleDragEnd(event)}
          onDragCancel={() => setActiveDragId(null)}
        >
          <div className="flex gap-4 overflow-x-auto pb-4">
            {stageOrder.map((stage) => (
              <PipelineColumn
                key={stage}
                stage={stage}
                candidates={groupedCandidates[stage]}
                canManageCandidates={canManageCandidates}
                selectedIds={selectedIds}
                onToggleSelected={toggleSelected}
                onToggleColumn={toggleColumn}
              />
            ))}
          </div>
          <DragOverlay>
            <DragPreview candidate={activeDragCandidate} />
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}
