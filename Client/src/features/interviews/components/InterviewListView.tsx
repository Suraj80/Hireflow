import { ArrowUpDown, CheckCircle2, Eye, MessageSquareMore, PencilLine, RotateCcw, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatInterviewDate, formatInterviewTime, getInitials, statusToneMap } from "@/features/interviews/helpers";
import { Interview, InterviewPagination } from "@/features/interviews/types";

type InterviewListViewProps = {
  items: Interview[];
  selectedIds: string[];
  pagination: InterviewPagination;
  onToggleSelected: (id: string) => void;
  onToggleAll: (ids: string[]) => void;
  onOpen: (id: string) => void;
  onEdit: (interview: Interview) => void;
  onReschedule: (interview: Interview) => void;
  onCancel: (interview: Interview) => void;
  onAddFeedback: (id: string) => void;
  onMarkCompleted: (interview: Interview) => void;
  onSortChange: (value: "scheduledAt-asc" | "scheduledAt-desc" | "candidate" | "status" | "round") => void;
  onPageChange: (page: number) => void;
};

export function InterviewListView({
  items,
  selectedIds,
  pagination,
  onToggleSelected,
  onToggleAll,
  onOpen,
  onEdit,
  onReschedule,
  onCancel,
  onAddFeedback,
  onMarkCompleted,
  onSortChange,
  onPageChange,
}: InterviewListViewProps) {
  return (
    <Card className="rounded-[28px] border border-border/80 shadow-sm">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={items.length > 0 && selectedIds.length === items.length}
                  onCheckedChange={() => onToggleAll(items.map((item) => item.id))}
                />
              </TableHead>
              {["Candidate", "Job", "Round", "Date", "Time", "Duration", "Type", "Interviewers", "Recruiter", "Status", "Feedback", "Actions"].map(
                (header) => (
                  <TableHead key={header}>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1"
                      onClick={() => {
                        if (header === "Candidate") onSortChange("candidate");
                        if (header === "Status") onSortChange("status");
                        if (header === "Round") onSortChange("round");
                        if (header === "Date") onSortChange("scheduledAt-asc");
                      }}
                    >
                      {header}
                      {["Candidate", "Status", "Round", "Date"].includes(header) && <ArrowUpDown className="h-3.5 w-3.5" />}
                    </button>
                  </TableHead>
                )
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id} onClick={() => onOpen(item.id)} className="cursor-pointer">
                <TableCell onClick={(event) => event.stopPropagation()}>
                  <Checkbox checked={selectedIds.includes(item.id)} onCheckedChange={() => onToggleSelected(item.id)} />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback>{getInitials(item.candidate?.name || "NA")}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{item.candidate?.name}</p>
                      <p className="text-xs text-muted-foreground">{item.candidate?.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{item.job?.title}</TableCell>
                <TableCell>{item.round}</TableCell>
                <TableCell>{formatInterviewDate(item.scheduledAt)}</TableCell>
                <TableCell>{formatInterviewTime(item.scheduledAt)}</TableCell>
                <TableCell>{item.duration} min</TableCell>
                <TableCell>{item.type}</TableCell>
                <TableCell className="max-w-[220px] truncate">{item.interviewers.map((entry) => entry.name).join(", ")}</TableCell>
                <TableCell>{item.recruiter?.name}</TableCell>
                <TableCell>
                  <Badge className={`border ${statusToneMap[item.status]}`}>{item.status}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{item.feedbackStatus}</Badge>
                </TableCell>
                <TableCell onClick={(event) => event.stopPropagation()}>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="icon" className="h-8 w-8 rounded-xl" onClick={() => onOpen(item.id)}>
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    {item.permissions.canEdit && (
                      <Button variant="outline" size="icon" className="h-8 w-8 rounded-xl" onClick={() => onEdit(item)}>
                        <PencilLine className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {item.permissions.canReschedule && (
                      <Button variant="outline" size="icon" className="h-8 w-8 rounded-xl" onClick={() => onReschedule(item)}>
                        <RotateCcw className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {item.permissions.canCancel && (
                      <Button variant="outline" size="icon" className="h-8 w-8 rounded-xl" onClick={() => onCancel(item)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {item.permissions.canSubmitFeedback && (
                      <Button variant="outline" size="icon" className="h-8 w-8 rounded-xl" onClick={() => onAddFeedback(item.id)}>
                        <MessageSquareMore className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {item.permissions.canComplete && (
                      <Button variant="outline" size="icon" className="h-8 w-8 rounded-xl" onClick={() => onMarkCompleted(item)}>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="flex flex-col gap-3 border-t border-border/80 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages} | {pagination.total} interviews
          </p>
          <div className="flex gap-2">
            <Button variant="outline" className="rounded-2xl" disabled={pagination.page <= 1} onClick={() => onPageChange(pagination.page - 1)}>
              Previous
            </Button>
            <Button
              variant="outline"
              className="rounded-2xl"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => onPageChange(pagination.page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
