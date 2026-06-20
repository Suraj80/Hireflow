import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, AlertCircle, LoaderCircle, PencilLine, RotateCw } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { candidatesApi } from "@/features/candidates/api";
import { JobDetailsContent } from "@/features/jobs/components/JobDetailsContent";
import { jobsApi } from "@/features/jobs/api";
import { Job } from "@/features/jobs/types";

function LoadingState() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-24 rounded-[28px]" />
      <Skeleton className="h-[640px] rounded-[28px]" />
    </div>
  );
}

export default function JobDetailPage() {
  const { jobId = "" } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canManageJobs = user?.role === "admin" || user?.role === "recruiter";
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rescoring, setRescoring] = useState(false);

  useEffect(() => {
    const loadJob = async () => {
      try {
        setLoading(true);
        const response = await jobsApi.getById(jobId);
        setJob(response);
        setError(null);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load job details");
      } finally {
        setLoading(false);
      }
    };

    void loadJob();
  }, [jobId]);

  const handleRescoreJobCandidates = async () => {
    try {
      setRescoring(true);
      const response = await candidatesApi.rescoreByJob(jobId);
      toast.success(response.message);
    } catch (rescoreError) {
      toast.error(rescoreError instanceof Error ? rescoreError.message : "Unable to queue AI scoring for this job");
    } finally {
      setRescoring(false);
    }
  };

  if (loading) {
    return <LoadingState />;
  }

  if (error || !job) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <Link to="/jobs">
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-2xl">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Job Details</h1>
            <p className="mt-1 text-muted-foreground">Review the full opening in a dedicated page.</p>
          </div>
        </div>

        <Alert variant="destructive" className="rounded-[28px]">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Unable to load job</AlertTitle>
          <AlertDescription className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <span>{error || "Job not found"}</span>
            <Button variant="outline" className="rounded-2xl" onClick={() => navigate("/jobs")}>
              Back to Jobs
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <Link to="/jobs">
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-2xl">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Job Details</h1>
            <p className="mt-1 text-muted-foreground">Review the full opening in a dedicated page.</p>
          </div>
        </div>
        {canManageJobs && (
          <div className="flex flex-wrap gap-2">
            <Button
              className="h-11 rounded-2xl"
              variant="outline"
              disabled={rescoring}
              onClick={() => void handleRescoreJobCandidates()}
            >
              {rescoring ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <RotateCw className="mr-2 h-4 w-4" />}
              Re-score Candidates
            </Button>
            <Button className="h-11 rounded-2xl" onClick={() => navigate(`/jobs/${job.id}/edit`)}>
              <PencilLine className="mr-2 h-4 w-4" />
              Edit Job
            </Button>
          </div>
        )}
      </div>

      <Card className="rounded-[28px] border border-border/80 shadow-sm">
        <CardContent className="p-6">
          <JobDetailsContent job={job} />
        </CardContent>
      </Card>
    </div>
  );
}
