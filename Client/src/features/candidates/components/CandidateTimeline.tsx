import { BriefcaseBusiness, CalendarClock, CircleDot, FileText, GitBranchPlus, MessageSquareText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRelative, formatTimestamp } from "@/features/candidates/helpers";
import { CandidateTimelineItem } from "@/features/candidates/types";

type CandidateTimelineProps = {
  items: CandidateTimelineItem[];
  title?: string;
};

const iconByType: Record<string, typeof CircleDot> = {
  created: BriefcaseBusiness,
  updated: FileText,
  note: MessageSquareText,
  interview: CalendarClock,
  "stage-change": GitBranchPlus,
};

export function CandidateTimeline({ items, title = "Timeline" }: CandidateTimelineProps) {
  return (
    <Card className="rounded-[28px] border border-border/80 shadow-sm">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-border/80 bg-muted/20 px-6 py-12 text-center">
            <p className="font-medium">No timeline activity yet</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Activity will appear here as notes, interviews, and stage changes happen.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {items.map((item, index) => {
              const Icon = iconByType[item.type] || CircleDot;

              return (
                <div key={item.id} className="relative pl-11">
                  {index !== items.length - 1 && <span className="absolute left-[15px] top-8 h-[calc(100%+16px)] w-px bg-border" />}
                  <div className="absolute left-0 top-1 flex h-8 w-8 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="rounded-[22px] border border-border/80 bg-background p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-medium">{item.title}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {item.actorName ? `${item.actorName} | ` : ""}
                          {formatRelative(item.createdAt)}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground">{formatTimestamp(item.createdAt)}</p>
                    </div>
                    {item.description && (
                      <div
                        className="prose prose-sm mt-3 max-w-none text-sm text-foreground"
                        dangerouslySetInnerHTML={{ __html: item.description }}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
