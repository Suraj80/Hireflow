import { CalendarDays, FilePenLine, MessageSquarePlus, MoreHorizontal, Trash2, UserRoundCheck, UserRoundMinus, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Candidate } from "@/features/candidates/types";

type CandidateActionsMenuProps = {
  candidate: Candidate;
  onView: (candidate: Candidate) => void;
  onEdit: (candidate: Candidate) => void;
  onMoveStage: (candidate: Candidate) => void;
  onScheduleInterview: (candidate: Candidate) => void;
  onAddNote: (candidate: Candidate) => void;
  onReject: (candidate: Candidate) => void;
  onArchive: (candidate: Candidate) => void;
};

export function CandidateActionsMenu({
  candidate,
  onView,
  onEdit,
  onMoveStage,
  onScheduleInterview,
  onAddNote,
  onReject,
  onArchive,
}: CandidateActionsMenuProps) {
  const canManage = candidate.permissions.canEdit;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-2xl" onClick={(event) => event.stopPropagation()}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 rounded-2xl">
        <DropdownMenuItem onClick={() => onView(candidate)}>
          <Eye className="mr-2 h-4 w-4" />
          View candidate
        </DropdownMenuItem>
        {canManage && (
          <DropdownMenuItem onClick={() => onEdit(candidate)}>
            <FilePenLine className="mr-2 h-4 w-4" />
            Edit candidate
          </DropdownMenuItem>
        )}
        {canManage && (
          <DropdownMenuItem onClick={() => onMoveStage(candidate)}>
            <UserRoundCheck className="mr-2 h-4 w-4" />
            Move stage
          </DropdownMenuItem>
        )}
        {canManage && (
          <DropdownMenuItem onClick={() => onScheduleInterview(candidate)}>
            <CalendarDays className="mr-2 h-4 w-4" />
            Schedule interview
          </DropdownMenuItem>
        )}
        {canManage && (
          <DropdownMenuItem onClick={() => onAddNote(candidate)}>
            <MessageSquarePlus className="mr-2 h-4 w-4" />
            Add note
          </DropdownMenuItem>
        )}
        {canManage && <DropdownMenuSeparator />}
        {candidate.permissions.canReject && (
          <DropdownMenuItem className="text-amber-700 focus:text-amber-700" onClick={() => onReject(candidate)}>
            <UserRoundMinus className="mr-2 h-4 w-4" />
            Reject candidate
          </DropdownMenuItem>
        )}
        {candidate.permissions.canArchive && (
          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => onArchive(candidate)}>
            <Trash2 className="mr-2 h-4 w-4" />
            Archive candidate
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
