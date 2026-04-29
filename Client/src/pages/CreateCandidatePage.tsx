import { useEffect, useState } from "react";
import { ArrowLeft, LoaderCircle } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { candidatesApi } from "@/features/candidates/api";
import { CandidateForm } from "@/features/candidates/components/CandidateForm";
import { Candidate } from "@/features/candidates/types";

export default function CreateCandidatePage() {
  const { candidateId } = useParams();
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(Boolean(candidateId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!candidateId) {
      return;
    }

    const loadCandidate = async () => {
      try {
        setLoading(true);
        const response = await candidatesApi.getById(candidateId);
        setCandidate(response);
        setError(null);
      } catch (loadError) {
        const message =
          (loadError as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          "Unable to load candidate";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    void loadCandidate();
  }, [candidateId]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link to={candidateId ? `/candidates/${candidateId}` : "/candidates"}>
          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-2xl">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{candidateId ? "Edit candidate" : "Create candidate"}</h1>
          <p className="mt-1 text-muted-foreground">
            {candidateId
              ? "Update the candidate profile without losing notes, stage history, or interview context."
              : "Create a polished internal candidate profile with ATS-ready structure and recruiter context."}
          </p>
        </div>
      </div>

      {loading ? (
        <Card className="rounded-[28px] border border-border/80 shadow-sm">
          <CardContent className="flex items-center gap-3 p-10 text-muted-foreground">
            <LoaderCircle className="h-5 w-5 animate-spin" />
            Loading candidate profile...
          </CardContent>
        </Card>
      ) : error ? (
        <Card className="rounded-[28px] border border-destructive/20 shadow-sm">
          <CardContent className="p-10">
            <p className="font-medium text-destructive">Failed to load this candidate</p>
            <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      ) : (
        <CandidateForm mode={candidateId ? "edit" : "create"} candidate={candidate} />
      )}
    </div>
  );
}
