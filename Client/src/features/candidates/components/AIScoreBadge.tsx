import { BrainCircuit } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { scoreToneClass } from "@/features/candidates/helpers";

type AIScoreBadgeProps = {
  score: number | null;
  className?: string;
};

export function AIScoreBadge({ score, className = "" }: AIScoreBadgeProps) {
  return (
    <Badge variant="outline" className={`rounded-full border px-2.5 py-1 text-xs font-medium ${scoreToneClass(score)} ${className}`}>
      <BrainCircuit className="mr-1.5 h-3.5 w-3.5" />
      {typeof score === "number" ? `${score}/100` : "Pending AI"}
    </Badge>
  );
}
