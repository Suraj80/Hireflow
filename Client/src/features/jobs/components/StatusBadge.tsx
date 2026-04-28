import { Badge } from "@/components/ui/badge";
import { JobStatus } from "@/features/jobs/types";
import { statusLabels } from "@/features/jobs/helpers";

const toneClasses: Record<JobStatus, string> = {
  draft: "border-amber-500/20 bg-amber-500/10 text-amber-700",
  open: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700",
  closed: "border-slate-500/20 bg-slate-500/10 text-slate-700",
};

export function StatusBadge({ status }: { status: JobStatus }) {
  return (
    <Badge variant="outline" className={toneClasses[status]}>
      {statusLabels[status]}
    </Badge>
  );
}
