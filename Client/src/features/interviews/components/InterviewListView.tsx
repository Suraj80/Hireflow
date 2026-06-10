import { ArrowUpDown, CheckCircle2, Eye, MessageSquareMore, MoreHorizontal, PencilLine, RotateCcw, Trash2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatInterviewDate, formatInterviewTime } from "@/features/interviews/helpers";
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
  onDelete: (interview: Interview) => void;
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
  onDelete,
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
              {["Candidate", "Job", "Round", "Date", "Time", "Duration", "Interviewers", "Actions"].map(
                (header) => (
                  <TableHead key={header}>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1"
                      onClick={() => {
                        if (header === "Candidate") onSortChange("candidate");
                        if (header === "Round") onSortChange("round");
                        if (header === "Date") onSortChange("scheduledAt-asc");
                      }}
                    >
                      {header}
                      {["Candidate", "Round", "Date"].includes(header) && <ArrowUpDown className="h-3.5 w-3.5" />}
                    </button>
                  </TableHead>
                )
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id} onClick={() => onOpen(item.id)} className="cursor-pointer">
                <TableCell>
                  <div>
                    <p className="font-medium">{item.candidate?.name}</p>
                    <p className="text-xs text-muted-foreground">{item.candidate?.email}</p>
                  </div>
                </TableCell>
                <TableCell>{item.job?.title}</TableCell>
                <TableCell>{item.round}</TableCell>
                <TableCell>{formatInterviewDate(item.scheduledAt)}</TableCell>
                <TableCell>{formatInterviewTime(item.scheduledAt)}</TableCell>
                <TableCell>{item.duration} min</TableCell>
                <TableCell className="max-w-[220px] truncate">{item.interviewers.map((entry) => entry.name).join(", ")}</TableCell>
                <TableCell onClick={(event) => event.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon" className="h-8 w-8 rounded-xl">
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52 rounded-2xl">
                      <DropdownMenuItem onClick={() => onOpen(item.id)}>
                        <Eye className="mr-2 h-4 w-4" />
                        View
                      </DropdownMenuItem>
                      {item.permissions.canEdit && (
                        <DropdownMenuItem onClick={() => onEdit(item)}>
                          <PencilLine className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                      )}
                      {item.permissions.canReschedule && (
                        <DropdownMenuItem onClick={() => onReschedule(item)}>
                          <RotateCcw className="mr-2 h-4 w-4" />
                          Reschedule
                        </DropdownMenuItem>
                      )}
                      {item.permissions.canCancel && (
                        <DropdownMenuItem onClick={() => onCancel(item)}>
                          <XCircle className="mr-2 h-4 w-4" />
                          Cancel
                        </DropdownMenuItem>
                      )}
                      {item.permissions.canDelete && (
                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => onDelete(item)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      )}
                      {item.permissions.canSubmitFeedback && (
                        <DropdownMenuItem onClick={() => onAddFeedback(item.id)}>
                          <MessageSquareMore className="mr-2 h-4 w-4" />
                          Add feedback
                        </DropdownMenuItem>
                      )}
                      {item.permissions.canComplete && (
                        <DropdownMenuItem onClick={() => onMarkCompleted(item)}>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Mark completed
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
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
