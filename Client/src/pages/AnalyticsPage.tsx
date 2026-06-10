import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  AlertCircle,
  BriefcaseBusiness,
  CalendarDays,
  CircleDashed,
  TrendingUp,
  Users2,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { analyticsApi } from "@/features/analytics/api";
import {
  analyticsChartColors,
  formatCompact,
  formatNumber,
  formatPercent,
  getEmptyChartMessage,
} from "@/features/analytics/helpers";
import {
  AnalyticsOverview,
  PipelineAnalyticsItem,
  SourceAnalyticsItem,
  TimeToHireResponse,
  UpcomingInterviewItem,
} from "@/features/analytics/types";
import { candidatesApi } from "@/features/candidates/api";
import { CandidateJobSummary } from "@/features/candidates/types";

function LoadingState() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-28 rounded-[28px]" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-32 rounded-[28px]" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <Skeleton className="h-[360px] rounded-[28px] xl:col-span-2" />
        <Skeleton className="h-[360px] rounded-[28px]" />
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Skeleton className="h-[360px] rounded-[28px]" />
        <Skeleton className="h-[360px] rounded-[28px]" />
      </div>
    </div>
  );
}

function EmptyChartState({ message }: { message: string }) {
  return (
    <div className="flex h-[260px] items-center justify-center rounded-[24px] border border-dashed border-border/80 bg-muted/20 px-6 text-center">
      <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

export default function AnalyticsPage() {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [pipeline, setPipeline] = useState<PipelineAnalyticsItem[]>([]);
  const [sources, setSources] = useState<SourceAnalyticsItem[]>([]);
  const [timeToHire, setTimeToHire] = useState<TimeToHireResponse | null>(null);
  const [upcomingInterviews, setUpcomingInterviews] = useState<UpcomingInterviewItem[]>([]);
  const [jobs, setJobs] = useState<CandidateJobSummary[]>([]);
  const [jobId, setJobId] = useState("all");
  const [datePreset, setDatePreset] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const dateRange = useMemo(() => {
    if (datePreset === "all") {
      return {};
    }

    const now = new Date();
    const from = new Date(now);

    if (datePreset === "30d") {
      from.setDate(now.getDate() - 30);
    } else if (datePreset === "90d") {
      from.setDate(now.getDate() - 90);
    }

    return {
      from: from.toISOString().slice(0, 10),
      to: now.toISOString().slice(0, 10),
    };
  }, [datePreset]);

  const queryParams = useMemo(() => {
    const params: { jobId?: string; from?: string; to?: string } = {};

    if (jobId !== "all") {
      params.jobId = jobId;
    }

    if (dateRange.from) {
      params.from = dateRange.from;
    }

    if (dateRange.to) {
      params.to = dateRange.to;
    }

    return params;
  }, [dateRange.from, dateRange.to, jobId]);

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const overviewParams = jobId !== "all" ? { jobId } : {};
      const [meta, overviewResponse, pipelineResponse, sourcesResponse, timeToHireResponse, interviewResponse] =
        await Promise.all([
          candidatesApi.meta(),
          analyticsApi.overview(overviewParams),
          analyticsApi.pipeline(queryParams),
          analyticsApi.sources(queryParams),
          analyticsApi.timeToHire(queryParams),
          analyticsApi.interviews(queryParams),
        ]);

      setJobs(meta.jobs);
      setOverview(overviewResponse);
      setPipeline(pipelineResponse.items);
      setSources(sourcesResponse.items);
      setTimeToHire(timeToHireResponse);
      setUpcomingInterviews(interviewResponse.items);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load analytics");
    } finally {
      setLoading(false);
    }
  }, [jobId, queryParams]);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  const kpis = useMemo(() => {
    if (!overview) {
      return [];
    }

    return [
      {
        label: "Active Jobs vs Closed",
        value: formatNumber(overview.activeJobs),
        helper: `${formatNumber(overview.closedJobs)} closed jobs`,
        icon: BriefcaseBusiness,
      },
      {
        label: "Total Applicants",
        value: formatNumber(overview.totalCandidates),
        helper: `${formatNumber(overview.candidatesThisMonth)} added this month`,
        icon: Users2,
      },
      {
        label: "Offer Acceptance Rate",
        value: formatPercent(overview.offerAcceptanceRate),
        helper: `${overview.offerAcceptanceRateTrend >= 0 ? "+" : ""}${formatPercent(overview.offerAcceptanceRateTrend)} vs previous month`,
        icon: TrendingUp,
      },
    ];
  }, [overview]);

  const totalPipelineCandidates = useMemo(
    () => pipeline.reduce((sum, item) => sum + item.count, 0),
    [pipeline]
  );

  const pipelineShare = useMemo(() => {
    if (totalPipelineCandidates === 0) {
      return [];
    }

    return pipeline.map((item) => ({
      ...item,
      percentage: Number(((item.count / totalPipelineCandidates) * 100).toFixed(1)),
    }));
  }, [pipeline, totalPipelineCandidates]);

  const outcomeChartData = useMemo(() => {
    if (!overview) {
      return [];
    }

    const activeCandidates = Math.max(
      overview.totalCandidates - overview.hiredCandidates - overview.rejectedCandidates,
      0
    );

    return [
      { label: "Active", value: activeCandidates },
      { label: "Hired", value: overview.hiredCandidates },
      { label: "Rejected", value: overview.rejectedCandidates },
    ];
  }, [overview]);

  const hiringVolumeData = useMemo(
    () => timeToHire?.items ?? [],
    [timeToHire]
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="mt-1 text-muted-foreground">
            Track hiring performance, pipeline health, and candidate conversion.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Select value={jobId} onValueChange={setJobId}>
            <SelectTrigger className="h-11 w-full rounded-2xl sm:w-[240px]">
              <SelectValue placeholder="Filter by job" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All jobs</SelectItem>
              {jobs.map((job) => (
                <SelectItem key={job.id} value={job.id}>
                  {job.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={datePreset} onValueChange={setDatePreset}>
            <SelectTrigger className="h-11 w-full rounded-2xl sm:w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All time</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <Alert variant="destructive" className="rounded-[28px]">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Unable to load analytics</AlertTitle>
          <AlertDescription className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <span>{error}</span>
            <Button variant="outline" className="rounded-2xl" onClick={() => void loadAnalytics()}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {kpis.map((kpi) => (
              <Card key={kpi.label} className="rounded-[28px] border border-border/80 shadow-sm">
                <CardContent className="p-5">
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                      <kpi.icon className="h-5 w-5 text-primary" />
                    </div>
                    <Badge variant="outline" className="rounded-full px-2.5 py-1 text-xs">
                      Live
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{kpi.label}</p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight">{kpi.value}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{kpi.helper}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <Card className="rounded-[28px] border border-border/80 shadow-sm xl:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle>Pipeline Funnel</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Candidate counts by stage {jobId !== "all" ? "for the selected job" : "across all jobs"}.
                </p>
              </CardHeader>
              <CardContent>
                {getEmptyChartMessage(
                  pipeline.reduce((sum, item) => sum + item.count, 0),
                  "No candidates exist yet, so the pipeline chart is still empty."
                ) ? (
                  <EmptyChartState message="No candidates exist yet, so the pipeline chart is still empty." />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={pipeline}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="stage" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "1rem",
                          border: "1px solid hsl(var(--border))",
                          background: "hsl(var(--card))",
                        }}
                      />
                      <Bar dataKey="count" radius={[10, 10, 0, 0]}>
                        {pipeline.map((item, index) => (
                          <Cell key={item.stage} fill={analyticsChartColors[index % analyticsChartColors.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-[28px] border border-border/80 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle>Application Sources</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Breakdown of how candidates are entering the funnel.
                </p>
              </CardHeader>
              <CardContent>
                {getEmptyChartMessage(
                  sources.reduce((sum, item) => sum + item.value, 0),
                  "No source data yet. Candidate submissions will appear here once applications start flowing in."
                ) ? (
                  <EmptyChartState message="No source data yet. Candidate submissions will appear here once applications start flowing in." />
                ) : (
                  <div className="flex flex-col gap-6 xl:flex-row xl:items-center">
                    <ResponsiveContainer width="100%" height={240} className="max-w-[320px]">
                      <PieChart>
                        <Pie data={sources} dataKey="value" nameKey="source" innerRadius={60} outerRadius={96} paddingAngle={4}>
                          {sources.map((item, index) => (
                            <Cell key={item.source} fill={analyticsChartColors[index % analyticsChartColors.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            borderRadius: "1rem",
                            border: "1px solid hsl(var(--border))",
                            background: "hsl(var(--card))",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="grid flex-1 gap-3">
                      {sources.map((item, index) => (
                        <div key={item.source} className="flex items-center justify-between rounded-2xl bg-muted/40 px-4 py-3">
                          <div className="flex items-center gap-3">
                            <span
                              className="h-3 w-3 rounded-full"
                              style={{ backgroundColor: analyticsChartColors[index % analyticsChartColors.length] }}
                            />
                            <span className="text-sm font-medium">{item.source}</span>
                          </div>
                          <span className="text-sm font-semibold">{formatCompact(item.value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card className="rounded-[28px] border border-border/80 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle>Time to Hire</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Average days from candidate creation to hired stage over time.
                </p>
              </CardHeader>
              <CardContent>
                {timeToHire && timeToHire.items.length > 0 ? (
                  <>
                    <div className="mb-5 flex items-center gap-3 rounded-[22px] bg-muted/30 p-4">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
                        <Activity className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Average time to hire</p>
                        <p className="text-2xl font-semibold">{timeToHire.avgDays} days</p>
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height={260}>
                      <AreaChart data={timeToHire.items}>
                        <defs>
                          <linearGradient id="hireTrend" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(262 83% 58%)" stopOpacity={0.28} />
                            <stop offset="95%" stopColor="hsl(262 83% 58%)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                        <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                        <Tooltip
                          contentStyle={{
                            borderRadius: "1rem",
                            border: "1px solid hsl(var(--border))",
                            background: "hsl(var(--card))",
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="avgDays"
                          stroke="hsl(262 83% 58%)"
                          fillOpacity={1}
                          fill="url(#hireTrend)"
                          strokeWidth={2.5}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </>
                ) : (
                  <EmptyChartState message="Not enough hiring data yet." />
                )}
              </CardContent>
            </Card>

            <Card className="rounded-[28px] border border-border/80 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle>Hiring Volume</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Monthly hired-candidate count based on when the hire stage was reached.
                </p>
              </CardHeader>
              <CardContent>
                {hiringVolumeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={336}>
                    <BarChart data={hiringVolumeData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "1rem",
                          border: "1px solid hsl(var(--border))",
                          background: "hsl(var(--card))",
                        }}
                      />
                      <Bar dataKey="hires" radius={[10, 10, 0, 0]} fill={analyticsChartColors[1]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChartState message="No hires have been recorded yet, so monthly hiring volume is still empty." />
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
            <Card className="rounded-[28px] border border-border/80 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle>Candidate Outcomes</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Current split between active, hired, and rejected candidates.
                </p>
              </CardHeader>
              <CardContent>
                {outcomeChartData.reduce((sum, item) => sum + item.value, 0) > 0 ? (
                  <div className="flex flex-col gap-6 xl:flex-row xl:items-center">
                    <ResponsiveContainer width="100%" height={260} className="max-w-[320px]">
                      <PieChart>
                        <Pie data={outcomeChartData} dataKey="value" nameKey="label" innerRadius={64} outerRadius={98} paddingAngle={4}>
                          {outcomeChartData.map((item, index) => (
                            <Cell key={item.label} fill={analyticsChartColors[index % analyticsChartColors.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            borderRadius: "1rem",
                            border: "1px solid hsl(var(--border))",
                            background: "hsl(var(--card))",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="grid flex-1 gap-3">
                      {outcomeChartData.map((item, index) => (
                        <div key={item.label} className="flex items-center justify-between rounded-2xl bg-muted/40 px-4 py-3">
                          <div className="flex items-center gap-3">
                            <span
                              className="h-3 w-3 rounded-full"
                              style={{ backgroundColor: analyticsChartColors[index % analyticsChartColors.length] }}
                            />
                            <span className="text-sm font-medium">{item.label}</span>
                          </div>
                          <span className="text-sm font-semibold">{formatCompact(item.value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <EmptyChartState message="Candidate outcomes will appear here once the pipeline starts moving." />
                )}
              </CardContent>
            </Card>

            <Card className="rounded-[28px] border border-border/80 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle>Stage Share</CardTitle>
                <p className="text-sm text-muted-foreground">
                  How the current funnel is distributed across each hiring stage.
                </p>
              </CardHeader>
              <CardContent>
                {pipelineShare.length > 0 ? (
                  <div className="space-y-4">
                    {pipelineShare.map((item, index) => (
                      <div key={item.stage} className="space-y-2">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <span
                              className="h-3 w-3 rounded-full"
                              style={{ backgroundColor: analyticsChartColors[index % analyticsChartColors.length] }}
                            />
                            <span className="text-sm font-medium">{item.stage}</span>
                          </div>
                          <div className="flex items-center gap-3 text-sm">
                            <span className="text-muted-foreground">{item.percentage}%</span>
                            <span className="font-semibold">{formatCompact(item.count)}</span>
                          </div>
                        </div>
                        <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${item.percentage}%`,
                              backgroundColor: analyticsChartColors[index % analyticsChartColors.length],
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-[260px] flex-col items-center justify-center gap-3 rounded-[24px] border border-dashed border-border/80 bg-muted/20 px-6 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                      <CircleDashed className="h-5 w-5 text-primary" />
                    </div>
                    <p className="max-w-sm text-sm text-muted-foreground">
                      The stage share will populate as soon as candidates enter the funnel.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-[28px] border border-border/80 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle>Upcoming Interviews</CardTitle>
              <p className="text-sm text-muted-foreground">
                Scheduled interviews in the next 7 days for the current analytics scope.
              </p>
            </CardHeader>
            <CardContent>
              {upcomingInterviews.length > 0 ? (
                <div className="grid gap-3">
                  {upcomingInterviews.map((interview) => (
                    <div
                      key={interview.id}
                      className="flex flex-col gap-3 rounded-[22px] border border-border/80 bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{interview.candidateName}</p>
                          <Badge variant="outline" className="rounded-full">
                            {interview.round}
                          </Badge>
                          <Badge variant="secondary" className="rounded-full">
                            {interview.status}
                          </Badge>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{interview.jobTitle}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {new Date(interview.scheduledAt).toLocaleString()} | {interview.mode}
                        </p>
                      </div>
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
                        <CalendarDays className="h-5 w-5 text-primary" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyChartState message="No upcoming interviews are scheduled in the next 7 days." />
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
