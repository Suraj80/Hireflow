import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  GitBranch,
  Users2,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StageBadge } from "@/features/candidates/components/StageBadge";
import { scoreToneClass } from "@/features/candidates/helpers";
import { dashboardApi } from "@/features/dashboard/api";
import {
  formatDashboardDate,
  formatDashboardDateTime,
  formatDashboardNumber,
  formatDashboardRelative,
} from "@/features/dashboard/helpers";
import { DashboardOverviewResponse } from "@/features/dashboard/types";

function LoadingState() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-28 rounded-[28px]" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-32 rounded-[28px]" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <Skeleton className="h-[360px] rounded-[28px] xl:col-span-2" />
        <Skeleton className="h-[360px] rounded-[28px]" />
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Skeleton className="h-[320px] rounded-[28px]" />
        <Skeleton className="h-[320px] rounded-[28px]" />
      </div>
    </div>
  );
}

function EmptyListState({ message }: { message: string }) {
  return (
    <div className="flex h-[200px] items-center justify-center rounded-[24px] border border-dashed border-border/80 bg-muted/20 px-6 text-center">
      <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

export default function DashboardPage() {
  const [overview, setOverview] = useState<DashboardOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await dashboardApi.overview();
      setOverview(response);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const kpis = useMemo(() => {
    if (!overview) {
      return [];
    }

    return [
      {
        label: "Total Candidates",
        value: formatDashboardNumber(overview.totalCandidates),
        helper: `${formatDashboardNumber(overview.candidatesInInterview)} in interview stage`,
        icon: Users2,
      },
      {
        label: "Active Jobs",
        value: formatDashboardNumber(overview.activeJobs),
        helper: `${formatDashboardNumber(overview.openJobs)} open for applications`,
        icon: BriefcaseBusiness,
      },
      {
        label: "Pending Applications",
        value: formatDashboardNumber(overview.pendingApplications),
        helper: "Fresh applications waiting for first review",
        icon: GitBranch,
      },
      {
        label: "Upcoming Interviews",
        value: formatDashboardNumber(overview.upcomingInterviewsCount),
        helper: "Scheduled over the next 7 days",
        icon: CalendarClock,
      },
      {
        label: "Hired This Month",
        value: formatDashboardNumber(overview.hiredThisMonth),
        helper: "Candidates that reached hired this month",
        icon: CheckCircle2,
      },
    ];
  }, [overview]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-muted-foreground">
            Overview of your hiring activity and upcoming tasks.
          </p>
        </div>
      </div>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <Alert variant="destructive" className="rounded-[28px]">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Unable to load the dashboard</AlertTitle>
          <AlertDescription className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <span>{error}</span>
            <Button variant="outline" className="rounded-2xl" onClick={() => void loadDashboard()}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      ) : !overview ? (
        <EmptyListState message="No dashboard data is available yet." />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {kpis.map((item) => (
              <Card key={item.label} className="rounded-[28px] border border-border/80 shadow-sm">
                <CardContent className="p-5">
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                      <item.icon className="h-5 w-5 text-primary" />
                    </div>
                    <Badge variant="outline" className="rounded-full px-2.5 py-1 text-xs">
                      Live
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight">{item.value}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{item.helper}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <Card className="rounded-[28px] border border-border/80 shadow-sm xl:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle>Recent Applications</CardTitle>
                <p className="text-sm text-muted-foreground">
                  The latest candidates that entered the pipeline and may need review today.
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {overview.recentCandidates.length > 0 ? (
                  overview.recentCandidates.map((candidate) => (
                    <div key={candidate.id} className="rounded-[22px] border border-border/80 bg-muted/20 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="font-semibold">{candidate.name}</p>
                          <p className="text-sm text-muted-foreground">{candidate.jobTitle}</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <StageBadge stage={candidate.stage} />
                            {typeof candidate.aiScore === "number" && (
                              <Badge
                                variant="outline"
                                className={`rounded-full border px-2.5 py-1 text-xs ${scoreToneClass(candidate.aiScore)}`}
                              >
                                AI {candidate.aiScore}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground sm:text-right">
                          <p>{formatDashboardDate(candidate.appliedAt)}</p>
                          <p className="mt-1 text-xs">{candidate.phone || candidate.email}</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyListState message="No recent applications yet." />
                )}
              </CardContent>
            </Card>

            <Card className="rounded-[28px] border border-border/80 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle>Pipeline Summary</CardTitle>
                <p className="text-sm text-muted-foreground">
                  A compact view of where candidates are sitting right now.
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {overview.pipelineSummary.some((item) => item.count > 0) ? (
                  overview.pipelineSummary.map((item) => (
                    <div key={item.stage} className="rounded-[22px] border border-border/80 bg-muted/20 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <StageBadge stage={item.stage} />
                        <span className="text-lg font-semibold">{formatDashboardNumber(item.count)}</span>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{
                            width: `${Math.max(
                              8,
                              overview.totalCandidates > 0 ? (item.count / overview.totalCandidates) * 100 : 0
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyListState message="No candidates in the pipeline yet." />
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card className="rounded-[28px] border border-border/80 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle>Upcoming Interviews</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Interviews scheduled over the next 7 days that may need preparation.
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {overview.upcomingInterviews.length > 0 ? (
                  overview.upcomingInterviews.map((item) => (
                    <div key={item.id} className="rounded-[22px] border border-border/80 bg-muted/20 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{item.candidateName}</p>
                          <p className="text-sm text-muted-foreground">{item.jobTitle}</p>
                        </div>
                        <Badge variant="outline" className="rounded-full px-2.5 py-1 text-xs">
                          {item.mode}
                        </Badge>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span>{formatDashboardDateTime(item.scheduledAt)}</span>
                        <span>&bull;</span>
                        <span>{item.round}</span>
                        <span>&bull;</span>
                        <span>{item.status}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyListState message="No interviews are scheduled in the next 7 days." />
                )}
              </CardContent>
            </Card>

            <Card className="rounded-[28px] border border-border/80 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle>Active Jobs</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Open and active roles that currently need candidate flow and interview attention.
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {overview.activeJobsList.length > 0 ? (
                  overview.activeJobsList.map((job) => (
                    <div key={job.id} className="rounded-[22px] border border-border/80 bg-muted/20 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{job.title}</p>
                          <p className="text-sm text-muted-foreground">{job.department}</p>
                        </div>
                        <Badge variant="outline" className="rounded-full px-2.5 py-1 text-xs capitalize">
                          {job.status}
                        </Badge>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span>{formatDashboardNumber(job.applicantsCount)} applicants</span>
                        <span>&bull;</span>
                        <span>Deadline {formatDashboardDate(job.deadline, "No deadline")}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyListState message="No active jobs are available right now." />
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-[28px] border border-border/80 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle>Recent Activity</CardTitle>
              <p className="text-sm text-muted-foreground">
                Important events across candidates, interviews, and jobs so your team can spot what changed.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {overview.recentActivity.length > 0 ? (
                overview.recentActivity.map((item) => (
                  <div key={item.id} className="flex items-start gap-3 rounded-[22px] border border-border/80 bg-muted/20 p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10">
                      <Activity className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="font-medium">{item.title}</p>
                          <p className="text-sm text-muted-foreground">{item.description}</p>
                        </div>
                        <span className="text-xs text-muted-foreground">{formatDashboardRelative(item.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyListState message="No recent activity has been recorded yet." />
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
