import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  formatRelative,
  formatShortDate,
  formatTimestamp,
  getCandidateInitials,
  sourceLabels,
  statusToneClass,
} from "@/features/candidates/helpers";
import { AIScoreBadge } from "@/features/candidates/components/AIScoreBadge";
import { CandidateActionsMenu } from "@/features/candidates/components/CandidateActionsMenu";
import { StageBadge } from "@/features/candidates/components/StageBadge";
import { Candidate } from "@/features/candidates/types";

type CandidateTableProps = {
  candidates: Candidate[];
  selectedIds: string[];
  onToggleSelected: (candidateId: string) => void;
  onToggleAll: (candidateIds: string[]) => void;
  onView: (candidate: Candidate) => void;
  onEdit: (candidate: Candidate) => void;
  onMoveStage: (candidate: Candidate) => void;
  onScheduleInterview: (candidate: Candidate) => void;
  onAddNote: (candidate: Candidate) => void;
  onReject: (candidate: Candidate) => void;
  onArchive: (candidate: Candidate) => void;
};

export function CandidateTable({
  candidates,
  selectedIds,
  onToggleSelected,
  onToggleAll,
  onView,
  onEdit,
  onMoveStage,
  onScheduleInterview,
  onAddNote,
  onReject,
  onArchive,
}: CandidateTableProps) {
  const currentPageIds = candidates.map((candidate) => candidate.id);
  const allSelected = currentPageIds.length > 0 && currentPageIds.every((candidateId) => selectedIds.includes(candidateId));

  return (
    <>
      <Card className="hidden overflow-hidden rounded-[28px] border border-border/80 shadow-sm xl:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox checked={allSelected} onCheckedChange={() => onToggleAll(currentPageIds)} aria-label="Select all candidates on this page" />
              </TableHead>
              <TableHead>Candidate</TableHead>
              <TableHead>Applied job</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>AI score</TableHead>
              <TableHead>Applied</TableHead>
              <TableHead>Recruiter</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="w-14 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {candidates.map((candidate) => (
              <TableRow key={candidate.id} className="cursor-pointer hover:bg-muted/40" onClick={() => onView(candidate)}>
                <TableCell onClick={(event) => event.stopPropagation()}>
                  <Checkbox
                    checked={selectedIds.includes(candidate.id)}
                    onCheckedChange={() => onToggleSelected(candidate.id)}
                    aria-label={`Select ${candidate.name}`}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 rounded-2xl">
                      <AvatarFallback className="rounded-2xl bg-primary/10 text-primary">
                        {getCandidateInitials(candidate.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-foreground">{candidate.name}</p>
                      <p className="text-sm text-muted-foreground">{candidate.email}</p>
                      <p className="text-xs text-muted-foreground">{candidate.phone || "Phone not added"}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <p className="font-medium">{candidate.job?.title || "Unlinked job"}</p>
                </TableCell>
                <TableCell>{candidate.department || "Not set"}</TableCell>
                <TableCell>{sourceLabels[candidate.source]}</TableCell>
                <TableCell>
                  <StageBadge stage={candidate.stage} />
                </TableCell>
                <TableCell>
                  <AIScoreBadge score={candidate.aiScore} />
                </TableCell>
                <TableCell>{formatShortDate(candidate.createdAt)}</TableCell>
                <TableCell>{candidate.recruiterAssigned?.name || "Unassigned"}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={`rounded-full border ${statusToneClass[candidate.statusIndicator.tone]}`}>
                    {candidate.statusIndicator.label}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    <p>{formatRelative(candidate.updatedAt)}</p>
                    <p className="text-xs text-muted-foreground">{formatTimestamp(candidate.updatedAt)}</p>
                  </div>
                </TableCell>
                <TableCell className="text-right" onClick={(event) => event.stopPropagation()}>
                  <CandidateActionsMenu
                    candidate={candidate}
                    onView={onView}
                    onEdit={onEdit}
                    onMoveStage={onMoveStage}
                    onScheduleInterview={onScheduleInterview}
                    onAddNote={onAddNote}
                    onReject={onReject}
                    onArchive={onArchive}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <div className="grid gap-4 xl:hidden">
        {candidates.map((candidate) => (
          <Card
            key={candidate.id}
            className="cursor-pointer rounded-[28px] border border-border/80 shadow-sm transition hover:border-primary/30"
            onClick={() => onView(candidate)}
          >
            <CardContent className="space-y-4 p-5">
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={selectedIds.includes(candidate.id)}
                  onCheckedChange={() => onToggleSelected(candidate.id)}
                  onClick={(event) => event.stopPropagation()}
                  aria-label={`Select ${candidate.name}`}
                />
                <Avatar className="h-11 w-11 rounded-2xl">
                  <AvatarFallback className="rounded-2xl bg-primary/10 text-primary">
                    {getCandidateInitials(candidate.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{candidate.name}</p>
                      <p className="truncate text-sm text-muted-foreground">{candidate.email}</p>
                    </div>
                    <div onClick={(event) => event.stopPropagation()}>
                      <CandidateActionsMenu
                        candidate={candidate}
                        onView={onView}
                        onEdit={onEdit}
                        onMoveStage={onMoveStage}
                        onScheduleInterview={onScheduleInterview}
                        onAddNote={onAddNote}
                        onReject={onReject}
                        onArchive={onArchive}
                      />
                    </div>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{candidate.job?.title || "Unlinked job"}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <StageBadge stage={candidate.stage} />
                <AIScoreBadge score={candidate.aiScore} />
                <Badge variant="outline" className={`rounded-full border ${statusToneClass[candidate.statusIndicator.tone]}`}>
                  {candidate.statusIndicator.label}
                </Badge>
              </div>

              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Department</p>
                  <p>{candidate.department || "Not set"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Source</p>
                  <p>{sourceLabels[candidate.source]}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Recruiter</p>
                  <p>{candidate.recruiterAssigned?.name || "Unassigned"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Updated</p>
                  <p>{formatRelative(candidate.updatedAt)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
