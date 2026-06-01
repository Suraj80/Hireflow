import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, BriefcaseBusiness, Plus } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { JobDetailsSheet } from "@/features/jobs/components/JobDetailsSheet";
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
          Create a fresh opening to start building your pipeline.
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
    selectedJob,
    setSelectedJob,
    setPage,
    fetchJobs,
    archiveJob,
  } = useJobsStore();
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  useEffect(() => {
    void fetchJobs();
  }, [fetchJobs, filters, pagination.page, pagination.limit]);

  const handleDelete = async (job: Job) => {
    if (!window.confirm(`Delete "${job.title}"? This will remove it from the active jobs view and close the job.`)) {
      return;
    }

    try {
      setIsDeleting(job.id);
      await archiveJob(job.id);
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {canManageJobs && (
          <Button className="h-11 rounded-2xl self-start" onClick={() => navigate("/jobs/new")}>
            <Plus className="mr-2 h-4 w-4" />
            Add Job
          </Button>
        )}
      </div>
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
            canManageJobs={canManageJobs && !isDeleting}
            onView={setSelectedJob}
            onEdit={(job) => navigate(`/jobs/${job.id}/edit`)}
            onDelete={(job) => void handleDelete(job)}
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
