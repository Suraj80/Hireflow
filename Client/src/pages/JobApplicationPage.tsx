import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { jobsApi } from "@/features/jobs/api";
import { employmentTypeLabels, formatAbsoluteDate, formatJobSalary } from "@/features/jobs/helpers";
import { PublicJob } from "@/features/jobs/types";
import { Briefcase, CheckCircle, Clock3, LoaderCircle, MapPin, Upload, Zap } from "lucide-react";
import { Link, useParams } from "react-router-dom";

export default function JobApplicationPage() {
  const { jobId = "" } = useParams();
  const [job, setJob] = useState<PublicJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const loadJob = async () => {
      try {
        setLoading(true);
        const response = await jobsApi.getPublicById(jobId);
        setJob(response);
        setError(null);
      } catch (loadError) {
        const message =
          (loadError as { response?: { data?: { message?: string } } })?.response?.data?.message || "This job is unavailable";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    void loadJob();
  }, [jobId]);

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full border border-border animate-scale-in">
          <CardContent className="p-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10 mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
            <h2 className="text-xl font-bold mb-2">Application Submitted!</h2>
            <p className="text-muted-foreground text-sm mb-6">
              Thank you for applying. Your profile has been shared with the hiring team.
            </p>
            <Link to="/">
              <Button variant="outline">Back to Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="container flex h-14 items-center">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg gradient-primary">
              <Zap className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="font-bold">HireFlow</span>
          </Link>
        </div>
      </nav>

      <div className="container max-w-2xl py-12">
        {loading ? (
          <Card className="border border-border">
            <CardContent className="flex items-center gap-3 p-8 text-muted-foreground">
              <LoaderCircle className="h-5 w-5 animate-spin" />
              Loading job details...
            </CardContent>
          </Card>
        ) : error || !job ? (
          <Card className="border border-border">
            <CardContent className="p-8">
              <h1 className="text-xl font-semibold">Job unavailable</h1>
              <p className="mt-2 text-sm text-muted-foreground">{error || "This role is not publicly accessible."}</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="border border-border mb-6">
              <CardContent className="p-6">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{job.department}</Badge>
                  {job.tags?.slice(0, 3).map((tag) => (
                    <Badge key={tag} variant="outline">{tag}</Badge>
                  ))}
                </div>
                <h1 className="mt-4 text-2xl font-bold">{job.title}</h1>
                <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {job.remote ? `${job.location} · Remote` : job.location}</span>
                  <span className="flex items-center gap-1"><Briefcase className="h-4 w-4" /> {employmentTypeLabels[job.type]}</span>
                  <span className="flex items-center gap-1"><Clock3 className="h-4 w-4" /> {formatAbsoluteDate(job.deadline)}</span>
                </div>
                <p className="mt-4 text-sm font-medium text-foreground">{formatJobSalary(job)}</p>
                <div className="prose prose-sm mt-5 max-w-none" dangerouslySetInnerHTML={{ __html: job.descriptionHTML }} />
              </CardContent>
            </Card>

            <Card className="border border-border">
              <CardHeader><CardTitle className="text-lg">Apply for this Position</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div><Label htmlFor="fname">First Name *</Label><Input id="fname" placeholder="John" className="mt-1.5" /></div>
                  <div><Label htmlFor="lname">Last Name *</Label><Input id="lname" placeholder="Doe" className="mt-1.5" /></div>
                </div>
                <div><Label htmlFor="email">Email *</Label><Input id="email" type="email" placeholder="john@example.com" className="mt-1.5" /></div>
                <div><Label htmlFor="phone">Phone</Label><Input id="phone" placeholder="+1 (555) 000-0000" className="mt-1.5" /></div>
                <div><Label htmlFor="linkedin">LinkedIn Profile</Label><Input id="linkedin" placeholder="https://linkedin.com/in/..." className="mt-1.5" /></div>
                <div>
                  <Label>Resume *</Label>
                  <div className="mt-1.5 border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">Drop your resume here or click to upload</p>
                    <p className="text-xs text-muted-foreground mt-1">PDF, DOC up to 10MB</p>
                  </div>
                </div>
                <div><Label htmlFor="cover">Cover Letter</Label><Textarea id="cover" placeholder="Why are you interested in this role?" className="mt-1.5 min-h-[120px]" /></div>
                <Button className="w-full gradient-primary text-primary-foreground border-0 h-11" onClick={() => setSubmitted(true)}>
                  Submit Application
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
