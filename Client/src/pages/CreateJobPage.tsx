import { useEffect, useState } from "react";
import { ArrowLeft, LoaderCircle } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { jobsApi } from "@/features/jobs/api";
import { JobForm } from "@/features/jobs/components/JobForm";
import { Job } from "@/features/jobs/types";

export default function CreateJobPage() {
  const { jobId } = useParams();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(Boolean(jobId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) {
      return;
    }

    const loadJob = async () => {
      try {
        setLoading(true);
        const response = await jobsApi.getById(jobId);
        setJob(response);
        setError(null);
      } catch (loadError) {
        const message =
          (loadError as { response?: { data?: { message?: string } } })?.response?.data?.message || "Unable to load job";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    void loadJob();
  }, [jobId]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link to="/jobs">
          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-2xl">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{jobId ? "Edit Job" : "Add New Job"}</h1>
          <p className="mt-1 text-muted-foreground">
            {jobId ? "Update the role safely without losing its internal history." : "Create a polished, public-ready job posting for your hiring team."}
          </p>
        </div>
      </div>

      {loading ? (
        <Card className="rounded-[28px] border border-border/80 shadow-sm">
          <CardContent className="flex items-center gap-3 p-10 text-muted-foreground">
            <LoaderCircle className="h-5 w-5 animate-spin" />
            Loading job configuration...
          </CardContent>
        </Card>
      ) : error ? (
        <Card className="rounded-[28px] border border-destructive/20 shadow-sm">
          <CardContent className="p-10">
            <p className="font-medium text-destructive">Failed to load this job</p>
            <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      ) : (
        <JobForm mode={jobId ? "edit" : "create"} job={job} />
      )}
    </div>
  );
}
