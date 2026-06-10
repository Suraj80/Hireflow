import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/features/jobs/components/StatusBadge";
import { employmentTypeLabels, formatAbsoluteDate, formatJobLocation, formatJobSalary } from "@/features/jobs/helpers";
import { Job } from "@/features/jobs/types";
import { BriefcaseBusiness, CalendarDays, Eye, MapPin, PencilLine, Trash2, Users } from "lucide-react";

type JobTableProps = {
  jobs: Job[];
  canManageJobs: boolean;
  onView: (job: Job) => void;
  onEdit: (job: Job) => void;
  onDelete: (job: Job) => void;
};

export function JobTable({ jobs, canManageJobs, onView, onEdit, onDelete }: JobTableProps) {
  return (
    <>
      <div className="hidden overflow-hidden rounded-3xl border border-border bg-card shadow-sm lg:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead className="pl-6">Job Title</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Salary</TableHead>
              <TableHead>Deadline</TableHead>
              <TableHead>Applicants</TableHead>
              <TableHead className="pr-6 text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.map((job) => (
              <TableRow key={job.id} className="hover:bg-muted/25">
                <TableCell className="pl-6">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onView(job)}
                        className="text-left font-semibold transition hover:text-primary"
                      >
                        {job.title}
                      </button>
                      <StatusBadge status={job.status} />
                    </div>
                    <p className="text-xs text-muted-foreground">{job.hiringManager || "No hiring manager assigned"}</p>
                  </div>
                </TableCell>
                <TableCell>{job.department}</TableCell>
                <TableCell>{employmentTypeLabels[job.type]}</TableCell>
                <TableCell>{formatJobLocation(job)}</TableCell>
                <TableCell>{formatJobSalary(job)}</TableCell>
                <TableCell>{formatAbsoluteDate(job.deadline)}</TableCell>
                <TableCell>{job.applicantsCount}</TableCell>
                <TableCell className="pr-6">
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-xl"
                      onClick={() => onView(job)}
                      aria-label={`View ${job.title}`}
                      title="View"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {canManageJobs && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-xl"
                        onClick={() => onEdit(job)}
                        aria-label={`Edit ${job.title}`}
                        title="Edit"
                      >
                        <PencilLine className="h-4 w-4" />
                      </Button>
                    )}
                    {canManageJobs && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-xl text-destructive hover:text-destructive"
                        onClick={() => onDelete(job)}
                        aria-label={`Delete ${job.title}`}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="grid gap-4 lg:hidden">
        {jobs.map((job) => (
          <div key={job.id} className="rounded-3xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <button
                  type="button"
                  onClick={() => onView(job)}
                  className="text-left text-lg font-semibold transition hover:text-primary"
                >
                  {job.title}
                </button>
                <p className="mt-1 text-sm text-muted-foreground">{job.department}</p>
              </div>
              <StatusBadge status={job.status} />
            </div>
            <div className="mt-4 grid gap-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <BriefcaseBusiness className="h-4 w-4" />
                {employmentTypeLabels[job.type]}
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {formatJobLocation(job)}
              </div>
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                {formatAbsoluteDate(job.deadline)}
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                {job.applicantsCount} applicants
              </div>
            </div>
            <div className="mt-5 flex gap-2">
              <Button type="button" variant="outline" className="flex-1 rounded-2xl" onClick={() => onView(job)}>
                View
              </Button>
              {canManageJobs && (
                <Button type="button" variant="outline" className="rounded-2xl" onClick={() => onEdit(job)}>
                  <PencilLine className="h-4 w-4" />
                </Button>
              )}
              {canManageJobs && (
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-2xl text-destructive"
                  onClick={() => onDelete(job)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
