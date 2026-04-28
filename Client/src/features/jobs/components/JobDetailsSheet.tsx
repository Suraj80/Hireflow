import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/features/jobs/components/StatusBadge";
import { employmentTypeLabels, formatAbsoluteDate, formatJobSalary } from "@/features/jobs/helpers";
import { Job } from "@/features/jobs/types";
import { Copy, Globe, Users } from "lucide-react";
import { toast } from "sonner";

type JobDetailsSheetProps = {
  job: Job | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function JobDetailsSheet({ job, open, onOpenChange }: JobDetailsSheetProps) {
  const applyUrl = job ? `${window.location.origin}/apply/${job.id}` : "";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
        {job && (
          <>
            <SheetHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <SheetTitle>{job.title}</SheetTitle>
                  <SheetDescription>{job.department}</SheetDescription>
                </div>
                <StatusBadge status={job.status} />
              </div>
            </SheetHeader>
            <div className="mt-6 space-y-6">
              <div className="grid gap-3 rounded-3xl border border-border bg-muted/20 p-4 md:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Employment</p>
                  <p className="mt-1 font-medium">{employmentTypeLabels[job.type]}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Location</p>
                  <p className="mt-1 font-medium">{job.remote ? `${job.location} · Remote` : job.location}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Deadline</p>
                  <p className="mt-1 font-medium">{formatAbsoluteDate(job.deadline)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Applicants</p>
                  <p className="mt-1 flex items-center gap-2 font-medium"><Users className="h-4 w-4 text-primary" /> {job.applicantsCount}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Salary Range</p>
                  <p className="mt-1 font-medium">{formatJobSalary(job)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Visibility</p>
                  <p className="mt-1 font-medium capitalize">{job.visibility}</p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">Tags</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {job.tags.length ? job.tags.map((tag) => <Badge key={tag} variant="secondary">{tag}</Badge>) : <Badge variant="outline">No tags</Badge>}
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">Description</h3>
                <div className="prose prose-sm mt-4 max-w-none" dangerouslySetInnerHTML={{ __html: job.descriptionHTML }} />
              </div>

              <Separator />

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">Requirements</h3>
                  <div className="mt-4 space-y-4 text-sm">
                    <div>
                      <p className="font-medium">Skills</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {job.requirements.skills.length ? job.requirements.skills.map((skill) => <Badge key={skill} variant="secondary">{skill}</Badge>) : <span className="text-muted-foreground">No skills added</span>}
                      </div>
                    </div>
                    <div>
                      <p className="font-medium">Experience</p>
                      <p className="mt-1 text-muted-foreground">{job.requirements.yearsOfExperience ?? "Not specified"} years</p>
                    </div>
                    <div>
                      <p className="font-medium">Qualification</p>
                      <p className="mt-1 text-muted-foreground">{job.requirements.qualification || "Not specified"}</p>
                    </div>
                    <div>
                      <p className="font-medium">Certifications</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {job.requirements.certifications.length ? job.requirements.certifications.map((certification) => <Badge key={certification} variant="outline">{certification}</Badge>) : <span className="text-muted-foreground">No certifications added</span>}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="rounded-3xl border border-border bg-card p-4">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Globe className="h-4 w-4 text-primary" />
                    Public apply URL
                  </div>
                  <p className="mt-3 break-all text-sm text-muted-foreground">{applyUrl}</p>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-4 w-full rounded-2xl"
                    onClick={async () => {
                      await navigator.clipboard.writeText(applyUrl);
                      toast.success("Public URL copied");
                    }}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copy apply link
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
