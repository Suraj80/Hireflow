import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { JobDetailsContent } from "@/features/jobs/components/JobDetailsContent";
import { Job } from "@/features/jobs/types";

type JobDetailsSheetProps = {
  job: Job | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function JobDetailsSheet({ job, open, onOpenChange }: JobDetailsSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
        {job && (
          <>
            <SheetHeader>
              <SheetTitle>{job.title}</SheetTitle>
              <SheetDescription>{job.department}</SheetDescription>
            </SheetHeader>
            <div className="mt-6">
              <JobDetailsContent job={job} />
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
