import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertCircle, GripVertical, Mail, Phone, Search, Users2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/AuthProvider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { StageBadge } from "@/features/candidates/components/StageBadge";
import {
  formatRelative,
  formatShortDate,
  getCandidateInitials,
  groupCandidatesByStage,
  scoreToneClass,
  stageOrder,
  stageToneClass,
} from "@/features/candidates/helpers";
import { candidatesApi } from "@/features/candidates/api";
import { Candidate, CandidateFilters, CandidateMeta, CandidateStage } from "@/features/candidates/types";

const stageDescriptions: Record<CandidateStage, string> = {
  Applied: "Fresh inbound applicants waiting for first review.",
  Screening: "Profiles currently being reviewed by the hiring team.",
  Interview: "Candidates actively in live interview loops.",
  Offer: "Finalists with offers drafted or in discussion.",
  Hired: "Accepted candidates ready for closeout.",
  Rejected: "Candidates that have exited the process.",
};

const defaultFilters: CandidateFilters = {
  search: "",
  job: "all",
  department: "all",
  stage: "all",
  source: "all",
  recruiter: "all",
  status: "all",
  aiScoreMin: null,
  aiScoreMax: null,
  appliedFrom: "",
  appliedTo: "",
  sort: "newest",
};

function LoadingState() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-28 rounded-[28px]" />
      <div className="flex gap-4 overflow-hidden">
        {stageOrder.map((stage) => (
          <Skeleton key={stage} className="h-[520px] min-w-[320px] rounded-[28px]" />
        ))}
      </div>
    </div>
  );
}

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <Card className="rounded-[28px] border border-dashed border-border/80 bg-card/70">
      <CardContent className="flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10">
          <Users2 className="h-8 w-8 text-primary" />
        </div>
        <h2 className="mt-5 text-xl font-semibold">No candidates match this pipeline view</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">Try broadening the search or switching jobs to bring more candidates into view.</p>
        <Button className="mt-6 h-11 rounded-2xl" variant="outline" onClick={onReset}>
          Reset filters
        </Button>
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

export default function PipelinePage() {
  const { user } = useAuth();
  const { jobId } = useParams();
  const navigate = useNavigate();
  const canMoveCandidates = user?.role === "admin" || user?.role === "recruiter";
  const [filters, setFilters] = useState<CandidateFilters>({
    ...defaultFilters,
    job: jobId || "all",
  });
  const [meta, setMeta] = useState<CandidateMeta | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draggingCandidateId, setDraggingCandidateId] = useState<string | null>(null);
  const [updatingCandidateId, setUpdatingCandidateId] = useState<string | null>(null);

  useEffect(() => {
    setFilters((current) => ({
      ...current,
      job: jobId || "all",
    }));
  }, [jobId]);

  const loadPipeline = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [metaResponse, candidatesResponse] = await Promise.all([
        candidatesApi.meta(),
        fetchAllCandidates(filters),
      ]);
      setMeta(metaResponse);
      setCandidates(candidatesResponse.items);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load pipeline candidates");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void loadPipeline();
  }, [loadPipeline]);

  const groupedCandidates = useMemo(() => groupCandidatesByStage(candidates), [candidates]);

  const handleJobChange = (value: string) => {
    setFilters((current) => ({ ...current, job: value }));
    navigate(value === "all" ? "/pipeline" : `/pipeline/${value}`);
  };

  const handleMoveCandidate = async (candidateId: string, nextStage: CandidateStage) => {
    const currentCandidate = candidates.find((candidate) => candidate.id === candidateId);

    if (!currentCandidate || currentCandidate.stage === nextStage || !canMoveCandidates) {
      return;
    }

    const previousCandidates = candidates;

    setUpdatingCandidateId(candidateId);
    setCandidates((current) =>
      current.map((candidate) =>
        candidate.id === candidateId
          ? {
              ...candidate,
              stage: nextStage,
              updatedAt: new Date().toISOString(),
            }
          : candidate
      )
    );

    try {
      const updatedCandidate = await candidatesApi.moveStage(candidateId, { stage: nextStage });
      setCandidates((current) =>
        current.map((candidate) => (candidate.id === candidateId ? updatedCandidate : candidate))
      );
      toast.success(`${currentCandidate.name} moved to ${nextStage}`);
    } catch (moveError) {
      setCandidates(previousCandidates);
      toast.error(moveError instanceof Error ? moveError.message : "Unable to update candidate stage");
    } finally {
      setUpdatingCandidateId(null);
    }
  };

  const resetFilters = () => {
    const nextFilters = {
      ...defaultFilters,
      job: jobId || "all",
    };
    setFilters(nextFilters);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pipeline</h1>
          <p className="mt-1 text-muted-foreground">
            Move real candidates through each hiring stage, keep recruiters aligned, and track progress in one board.
          </p>
        </div>
        <Badge variant="outline" className="w-fit rounded-full px-3 py-1.5">
          {canMoveCandidates ? "Drag and drop enabled" : "View only"}
        </Badge>
      </div>
      <Card className="rounded-[28px] border border-border/80 shadow-sm">
        <CardContent className="grid gap-3 p-5 md:grid-cols-[minmax(0,1fr)_260px_180px_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filters.search}
              onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
              placeholder="Search candidate name or email"
              className="h-11 rounded-2xl pl-9"
            />
          </div>
          <Select value={filters.job} onValueChange={handleJobChange}>
            <SelectTrigger className="h-11 rounded-2xl">
              <SelectValue placeholder="Filter by job" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All jobs</SelectItem>
              {(meta?.jobs || []).map((job) => (
                <SelectItem key={job.id} value={job.id}>
                  {job.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="number"
            min={0}
            max={100}
            value={filters.aiScoreMin ?? ""}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                aiScoreMin: event.target.value === "" ? null : Number(event.target.value),
              }))
            }
            placeholder="Min AI score"
            className="h-11 rounded-2xl"
          />
          <Button variant="outline" className="h-11 rounded-2xl" onClick={() => void loadPipeline()}>
            Refresh
          </Button>
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
            <Button variant="outline" className="rounded-2xl" onClick={() => void loadPipeline()}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      ) : candidates.length === 0 ? (
        <EmptyState onReset={resetFilters} />
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {stageOrder.map((stage) => {
            const stageCandidates = groupedCandidates[stage];
            const isDraggedOver = draggingCandidateId !== null;

            return (
              <div key={stage} className="min-w-[320px] flex-1">
                <div className="mb-3 flex items-center gap-3 px-1">
                  <div className={`h-2.5 w-2.5 rounded-full border ${stageToneClass[stage]}`} />
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold">{stage}</h3>
                    <p className="text-xs text-muted-foreground">{stageDescriptions[stage]}</p>
                  </div>
                  <Badge variant="secondary" className="ml-auto h-6 rounded-full px-2.5 text-xs">
                    {stageCandidates.length}
                  </Badge>
                </div>

                <div
                  className={`min-h-[520px] space-y-3 rounded-[28px] border border-border/70 bg-muted/25 p-3 transition-colors ${
                    isDraggedOver ? "bg-muted/45" : ""
                  }`}
                  onDragOver={(event) => {
                    if (!canMoveCandidates) {
                      return;
                    }
                    event.preventDefault();
                  }}
                  onDrop={(event) => {
                    if (!canMoveCandidates) {
                      return;
                    }
                    event.preventDefault();
                    const candidateId = event.dataTransfer.getData("text/plain");
                    void handleMoveCandidate(candidateId, stage);
                    setDraggingCandidateId(null);
                  }}
                >
                  {stageCandidates.map((candidate) => {
                    const detailLine = candidate.phone || candidate.email;

                    return (
                      <Card
                        key={candidate.id}
                        draggable={canMoveCandidates}
                        onDragStart={(event) => {
                          if (!canMoveCandidates) {
                            return;
                          }
                          event.dataTransfer.setData("text/plain", candidate.id);
                          setDraggingCandidateId(candidate.id);
                        }}
                        onDragEnd={() => setDraggingCandidateId(null)}
                        className={`border border-border/80 transition-all ${
                          canMoveCandidates ? "cursor-grab active:cursor-grabbing hover:-translate-y-0.5 hover:shadow-md" : ""
                        } ${updatingCandidateId === candidate.id ? "opacity-70" : ""}`}
                      >
                        <CardContent className="space-y-4 p-4">
                          <div className="flex items-start gap-3">
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
                                {canMoveCandidates && <GripVertical className="mt-0.5 h-4 w-4 text-muted-foreground" />}
                              </div>
                              <div className="mt-3 flex flex-wrap gap-2">
                                <StageBadge stage={candidate.stage} />
                                {typeof candidate.aiScore === "number" && (
                                  <Badge variant="outline" className={`rounded-full border px-2.5 py-1 text-xs ${scoreToneClass(candidate.aiScore)}`}>
                                    <Brain className="mr-1 h-3 w-3" />
                                    {candidate.aiScore}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="grid gap-2 text-xs text-muted-foreground">
                            <div className="flex items-center justify-between gap-3">
                              <span>Applied</span>
                              <span className="font-medium text-foreground">{formatShortDate(candidate.createdAt)}</span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <span>Updated</span>
                              <span className="font-medium text-foreground">{formatRelative(candidate.updatedAt)}</span>
                            </div>
                          </div>

                          <div className="rounded-2xl bg-muted/50 p-3 text-xs">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              {candidate.phone ? <Phone className="h-3.5 w-3.5" /> : <Mail className="h-3.5 w-3.5" />}
                              <span className="truncate">{detailLine}</span>
                            </div>
                            {candidate.job?.department && (
                              <p className="mt-2 truncate text-muted-foreground">{candidate.job.department}</p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
