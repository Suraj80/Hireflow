import { Badge } from "@/components/ui/badge";
import { stageToneClass } from "@/features/candidates/helpers";
import { CandidateStage } from "@/features/candidates/types";

type StageBadgeProps = {
  stage: CandidateStage;
  className?: string;
};

export function StageBadge({ stage, className = "" }: StageBadgeProps) {
  return (
    <Badge variant="outline" className={`rounded-full border px-2.5 py-1 text-xs font-medium ${stageToneClass[stage]} ${className}`}>
      {stage}
    </Badge>
  );
}
