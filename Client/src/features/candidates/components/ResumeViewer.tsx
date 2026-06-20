import { Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatTimestamp } from "@/features/candidates/helpers";
import { ResumeMeta } from "@/features/candidates/types";

type ResumeViewerProps = {
  resumeUrl: string;
  resumeMeta: ResumeMeta;
  uploadedAt?: string;
};

export function ResumeViewer({ resumeUrl, resumeMeta, uploadedAt }: ResumeViewerProps) {
  if (!resumeUrl) {
    return (
      <Card className="rounded-[28px] border border-dashed border-border/80">
        <CardContent className="flex flex-col items-center justify-center px-6 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-muted">
            <FileText className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">No resume uploaded</h3>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            This candidate does not have a resume attached yet. Recruiters can upload one from the edit form.
          </p>
        </CardContent>
      </Card>
    );
  }

  const isPdf = resumeMeta.mimeType === "application/pdf" || resumeMeta.filename.toLowerCase().endsWith(".pdf");

  return (
    <Card className="rounded-[28px] border border-border/80 shadow-sm">
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="text-lg">{resumeMeta.filename || "Candidate resume"}</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            {resumeMeta.size ? `${Math.round(resumeMeta.size / 1024)} KB` : "Unknown size"}
            {uploadedAt ? ` | last updated ${formatTimestamp(uploadedAt)}` : ""}
          </p>
        </div>
        <Button asChild className="h-10 rounded-2xl">
          <a href={resumeUrl} target="_blank" rel="noreferrer">
            <Download className="mr-2 h-4 w-4" />
            Download
          </a>
        </Button>
      </CardHeader>
      <CardContent>
        {isPdf ? (
          <iframe
            src={resumeUrl}
            title={resumeMeta.filename || "Resume"}
            className="h-[780px] w-full rounded-[24px] border border-border bg-background"
          />
        ) : (
          <div className="rounded-[24px] border border-dashed border-border/80 bg-muted/20 p-10 text-center">
            <p className="font-medium">Preview unavailable for this file type</p>
            <p className="mt-2 text-sm text-muted-foreground">
              DOCX files can still be downloaded securely for local review.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
