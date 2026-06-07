import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { candidatesApi } from "@/features/candidates/api";
import { CandidateStage, PublicCandidateStatusResponse } from "@/features/candidates/types";
import { Zap, CheckCircle, Circle, LoaderCircle } from "lucide-react";

const stages: CandidateStage[] = ["Applied", "Screening", "Interview", "Offer", "Hired", "Rejected"];

const formatDate = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));

export default function CandidateStatusPage() {
  const { token = "" } = useParams();
  const [status, setStatus] = useState<PublicCandidateStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadStatus = async () => {
      try {
        setLoading(true);
        const response = await candidatesApi.getPublicStatus(token);
        setStatus(response);
        setError(null);
      } catch (loadError) {
        const message =
          (loadError as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          "Application status not found";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    void loadStatus();
  }, [token]);

  const currentIndex = useMemo(() => {
    if (!status) {
      return 0;
    }

    const foundIndex = stages.indexOf(status.stage);
    return foundIndex >= 0 ? foundIndex : 0;
  }, [status]);

  const progress = useMemo(() => {
    if (!status) {
      return 0;
    }

    if (status.stage === "Rejected") {
      return 100;
    }

    return (currentIndex / Math.max(1, stages.length - 1)) * 100;
  }, [currentIndex, status]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary">
            <Zap className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold">HireFlow</span>
        </div>

        <Card className="border border-border animate-scale-in">
          <CardContent className="p-6">
            {loading ? (
              <div className="flex items-center justify-center gap-3 py-10 text-muted-foreground">
                <LoaderCircle className="h-5 w-5 animate-spin" />
                Loading application status...
              </div>
            ) : error || !status ? (
              <div className="text-center">
                <h1 className="text-xl font-bold mb-1">Status unavailable</h1>
                <p className="text-muted-foreground text-sm">{error || "We could not find this application."}</p>
              </div>
            ) : (
              <>
                <div className="text-center mb-6">
                  <h1 className="text-xl font-bold mb-1">Application Status</h1>
                  <p className="text-muted-foreground text-sm">{status.job?.title || "Applied role"}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Applied on {formatDate(status.createdAt)} · Last updated {formatDate(status.updatedAt)}
                  </p>
                </div>

                <div className="mb-6">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Progress</span>
                    <Badge variant="secondary" className="bg-primary/10 text-primary">
                      {status.stage}
                    </Badge>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>

                <div className="space-y-3">
                  {stages.map((stage, index) => {
                    const completed =
                      status.stage === "Rejected"
                        ? stage === "Rejected"
                        : index < currentIndex || (stage === "Hired" && status.stage === "Hired");
                    const current = stage === status.stage;

                    return (
                      <div key={stage} className="flex items-center gap-3">
                        {completed ? (
                          <CheckCircle className="h-5 w-5 text-success shrink-0" />
                        ) : current ? (
                          <div className="h-5 w-5 rounded-full gradient-primary animate-pulse-subtle shrink-0" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground/30 shrink-0" />
                        )}
                        <span
                          className={`text-sm ${
                            completed
                              ? "text-foreground font-medium"
                              : current
                                ? "text-foreground font-semibold"
                                : "text-muted-foreground"
                          }`}
                        >
                          {stage}
                        </span>
                        {current && (
                          <Badge variant="secondary" className="ml-auto text-xs bg-primary/10 text-primary">
                            Current
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            <div className="mt-6 p-4 rounded-xl bg-muted/40 text-center">
              <p className="text-sm text-muted-foreground">
                Questions? Return to the <Link to="/" className="text-primary hover:underline">HireFlow home page</Link>.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
