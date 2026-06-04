import { BrainCircuit } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { scoreToneClass } from "@/features/candidates/helpers";
import { CandidateAIStatus } from "@/features/candidates/types";

type AIScoreBadgeProps = {
  score: number | null;
  status?: CandidateAIStatus;
  className?: string;
};

const statusLabel: Record<CandidateAIStatus, string> = {
  "not-started": "No AI score",
  queued: "AI queued",
  processing: "AI scoring",
  completed: "AI scored",
  failed: "AI failed",
  unavailable: "AI unavailable",
};

export function AIScoreBadge({ score, status = "not-started", className = "" }: AIScoreBadgeProps) {
  return (
    <Badge variant="outline" className={`rounded-full border px-2.5 py-1 text-xs font-medium ${scoreToneClass(score)} ${className}`}>
      <BrainCircuit className="mr-1.5 h-3.5 w-3.5" />
      {typeof score === "number" ? `${score}/100` : statusLabel[status]}
    </Badge>
  );
}
