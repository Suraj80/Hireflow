import { useEffect, useState } from "react";
import { ArrowLeft, LoaderCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { InterviewForm } from "@/features/interviews/components/InterviewForm";
import { interviewsApi } from "@/features/interviews/api";
import { defaultInterviewMeta } from "@/features/interviews/helpers";
import { useInterviewsStore } from "@/features/interviews/store";
import { InterviewMeta } from "@/features/interviews/types";

export default function ScheduleInterviewPage() {
  const { createInterview } = useInterviewsStore();
  const [meta, setMeta] = useState<InterviewMeta>(defaultInterviewMeta);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadMeta = async () => {
      try {
        setLoading(true);
        const response = await interviewsApi.list({
          ...useInterviewsStore.getState().filters,
          page: 1,
          limit: 10,
        });
        setMeta(response.filters);
        setError(null);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load interview form");
      } finally {
        setLoading(false);
      }
    };

    void loadMeta();
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link to="/interviews">
          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-2xl">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Schedule interview</h1>
          <p className="mt-1 text-muted-foreground">
            Build a full ATS-grade interview entry with panel ownership, reminders, and conflict-aware scheduling.
          </p>
        </div>
      </div>

      {loading ? (
        <Card className="rounded-[28px] border border-border/80 shadow-sm">
          <CardContent className="flex items-center gap-3 p-10 text-muted-foreground">
            <LoaderCircle className="h-5 w-5 animate-spin" />
            Loading interview workspace...
          </CardContent>
        </Card>
      ) : error ? (
        <Card className="rounded-[28px] border border-destructive/20 shadow-sm">
          <CardContent className="p-10">
            <p className="font-medium text-destructive">Unable to load scheduling data</p>
            <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      ) : (
        <InterviewForm meta={meta} onSubmit={createInterview} />
      )}
    </div>
  );
}
