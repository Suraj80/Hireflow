import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, BriefcaseBusiness, Plus, RefreshCw, Users2 } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { JobDetailsSheet } from "@/features/jobs/components/JobDetailsSheet";
import { JobFilters } from "@/features/jobs/components/JobFilters";
import { JobTable } from "@/features/jobs/components/JobTable";
import { useJobsStore } from "@/features/jobs/store";
import { Job } from "@/features/jobs/types";

function LoadingState() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-28 rounded-[28px]" />
      <Skeleton className="h-[420px] rounded-[28px]" />
    </div>
  );
}

function EmptyState({ canManageJobs, onCreate }: { canManageJobs: boolean; onCreate: () => void }) {
  return (
    <Card className="rounded-[28px] border border-dashed border-border/80 bg-card/70">
      <CardContent className="flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10">
          <BriefcaseBusiness className="h-8 w-8 text-primary" />
        </div>
        <h2 className="mt-5 text-xl font-semibold">No jobs match the current view</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Try resetting the filters, broadening your search, or create a fresh opening to start building your pipeline.
        </p>
        {canManageJobs && (
          <Button className="mt-6 h-11 rounded-2xl" onClick={onCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add Job
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default function JobsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canManageJobs = user?.role === "admin" || user?.role === "recruiter";
  const {
    jobs,
    loading,
    error,
    filters,
    pagination,
    availableDepartments,
    selectedJob,
    setSelectedJob,
    setFilters,
    setPage,
    resetFilters,
    fetchJobs,
    archiveJob,
  } = useJobsStore();
  const [isArchiving, setIsArchiving] = useState<string | null>(null);

  useEffect(() => {
    void fetchJobs();
  }, [fetchJobs, filters, pagination.page, pagination.limit]);

  const stats = useMemo(() => {
    const open = jobs.filter((job) => job.status === "open").length;
    const draft = jobs.filter((job) => job.status === "draft").length;
    const applicants = jobs.reduce((total, job) => total + job.applicantsCount, 0);

    return [
      { label: "Visible roles", value: jobs.length, hint: `${pagination.total} total matches`, icon: BriefcaseBusiness },
      { label: "Open now", value: open, hint: `${draft} still in draft`, icon: RefreshCw },
      { label: "Applicants", value: applicants, hint: "Across this result set", icon: Users2 },
    ];
  }, [jobs, pagination.total]);

  const handleArchive = async (job: Job) => {
    if (!window.confirm(`Archive "${job.title}"? This will move it to closed.`)) {
      return;
    }

    try {
      setIsArchiving(job.id);
      await archiveJob(job.id);
    } finally {
      setIsArchiving(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Jobs</h1>
          <p className="mt-1 text-muted-foreground">
            Track active openings, keep hiring signals tidy, and move from draft to published cleanly.
          </p>
        </div>
        {canManageJobs && (
          <Button className="h-11 rounded-2xl self-start" onClick={() => navigate("/jobs/new")}>
            <Plus className="mr-2 h-4 w-4" />
            Add Job
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label} className="rounded-[28px] border border-border/80 shadow-sm">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                <stat.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-semibold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.hint}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <JobFilters
        filters={filters}
        departments={availableDepartments}
        onChange={setFilters}
        onReset={resetFilters}
      />

      {loading ? (
        <LoadingState />
      ) : error ? (
        <Alert variant="destructive" className="rounded-[28px]">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Unable to load jobs</AlertTitle>
          <AlertDescription className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <span>{error}</span>
            <Button variant="outline" className="rounded-2xl" onClick={() => void fetchJobs()}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      ) : jobs.length === 0 ? (
        <EmptyState canManageJobs={canManageJobs} onCreate={() => navigate("/jobs/new")} />
      ) : (
        <>
          <JobTable
            jobs={jobs}
            canManageJobs={canManageJobs && !isArchiving}
            onView={setSelectedJob}
            onEdit={(job) => navigate(`/jobs/${job.id}/edit`)}
            onArchive={(job) => void handleArchive(job)}
          />

          <div className="flex flex-col gap-3 rounded-[28px] border border-border/80 bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Page {pagination.page} of {pagination.totalPages} | {pagination.total} total jobs
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="rounded-2xl"
                disabled={pagination.page <= 1}
                onClick={() => setPage(pagination.page - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                className="rounded-2xl"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPage(pagination.page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}

      <JobDetailsSheet
        job={selectedJob}
        open={Boolean(selectedJob)}
        onOpenChange={(open) => !open && setSelectedJob(null)}
      />
    </div>
  );
}
