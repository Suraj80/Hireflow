import { useEffect, useMemo, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import {
  AlertTriangle,
  Download,
  LoaderCircle,
  Plus,
  Save,
  ShieldAlert,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { useFieldArray, useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/features/jobs/components/RichTextEditor";
import { TagSelector } from "@/features/jobs/components/TagSelector";
import { candidatesApi } from "@/features/candidates/api";
import {
  candidatePriorityOptions,
  candidateSourceOptions,
  candidateStageOptions,
  CandidateFormValues,
  candidateFormSchema,
  defaultCandidateFormValues,
  toCandidateFormValues,
} from "@/features/candidates/schema";
import { useCandidatesStore } from "@/features/candidates/store";
import { Candidate } from "@/features/candidates/types";

type CandidateFormProps = {
  mode: "create" | "edit";
  candidate?: Candidate | null;
};

type AutosavedValues = CandidateFormValues & {
  _savedAt?: string;
};

const allowedResumeTypes = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export function CandidateForm({ mode, candidate = null }: CandidateFormProps) {
  const navigate = useNavigate();
  const meta = useCandidatesStore((state) => state.meta);
  const fetchMeta = useCandidatesStore((state) => state.fetchMeta);
  const createCandidate = useCandidatesStore((state) => state.createCandidate);
  const updateCandidate = useCandidatesStore((state) => state.updateCandidate);
  const addNote = useCandidatesStore((state) => state.addNote);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [autosaveStamp, setAutosaveStamp] = useState<string | null>(null);
  const [duplicateCandidate, setDuplicateCandidate] = useState<Candidate | null>(null);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const [isImportingResume, setIsImportingResume] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const autosaveTimerRef = useRef<number | null>(null);
  const duplicateTimerRef = useRef<number | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const storageKey = `hireflow-candidate-draft:${candidate?.id || "new"}`;

  const form = useForm<CandidateFormValues>({
    resolver: zodResolver(candidateFormSchema),
    defaultValues: candidate ? toCandidateFormValues(candidate) : defaultCandidateFormValues,
    mode: "onBlur",
  });

  const educationFields = useFieldArray({
    control: form.control,
    name: "education",
  });

  const watchedJobId = form.watch("jobId");
  const watchedEmail = form.watch("email");
  const watchedResumeUrl = form.watch("resumeUrl");
  const watchedResumeMeta = form.watch("resumeMeta");
  const watchedInitialNote = form.watch("initialNote");

  const selectedJob = useMemo(
    () => meta.jobs.find((job) => job.id === watchedJobId) || null,
    [meta.jobs, watchedJobId]
  );

  useEffect(() => {
    if (!meta.jobs.length || !meta.recruiters.length) {
      void fetchMeta();
    }
  }, [fetchMeta, meta.jobs.length, meta.recruiters.length]);

  useEffect(() => {
    if (candidate) {
      form.reset(toCandidateFormValues(candidate));
      return;
    }

    const savedDraft = localStorage.getItem(storageKey);
    if (!savedDraft) {
      return;
    }

    try {
      const parsedDraft = JSON.parse(savedDraft) as AutosavedValues;
      const { _savedAt, ...values } = parsedDraft;
      form.reset({
        ...defaultCandidateFormValues,
        ...values,
        education:
          values.education && values.education.length
            ? values.education
            : defaultCandidateFormValues.education,
      });
      if (_savedAt) {
        setAutosaveStamp(_savedAt);
      }
      toast.message("Restored local candidate draft");
    } catch (_error) {
      localStorage.removeItem(storageKey);
    }
  }, [candidate, form, storageKey]);

  useEffect(() => {
    const subscription = form.watch((values) => {
      if (autosaveTimerRef.current) {
        window.clearTimeout(autosaveTimerRef.current);
      }

      autosaveTimerRef.current = window.setTimeout(() => {
        if (!form.formState.isDirty) {
          return;
        }

        const savedAt = new Date().toISOString();
        localStorage.setItem(storageKey, JSON.stringify({ ...(values as CandidateFormValues), _savedAt: savedAt }));
        setAutosaveStamp(savedAt);
      }, 600);
    });

    return () => {
      subscription.unsubscribe();
      if (autosaveTimerRef.current) {
        window.clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [form, storageKey]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!form.formState.isDirty) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [form.formState.isDirty]);

  useEffect(() => {
    if (selectedJob?.department && form.getValues("department") !== selectedJob.department) {
      form.setValue("department", selectedJob.department, { shouldDirty: true, shouldValidate: true });
    }
  }, [form, selectedJob]);

  useEffect(() => {
    if (!watchedEmail || !watchedJobId) {
      setDuplicateCandidate(null);
      return;
    }

    if (duplicateTimerRef.current) {
      window.clearTimeout(duplicateTimerRef.current);
    }

    duplicateTimerRef.current = window.setTimeout(async () => {
      try {
        setCheckingDuplicate(true);
        const response = await candidatesApi.checkDuplicate(watchedEmail.trim(), watchedJobId);
        if (candidate && response.duplicate?.id === candidate.id) {
          setDuplicateCandidate(null);
        } else {
          setDuplicateCandidate(response.duplicate);
        }
      } catch (_error) {
        setDuplicateCandidate(null);
      } finally {
        setCheckingDuplicate(false);
      }
    }, 450);

    return () => {
      if (duplicateTimerRef.current) {
        window.clearTimeout(duplicateTimerRef.current);
      }
    };
  }, [candidate, watchedEmail, watchedJobId]);

  const handleResumeUpload = async (file: File) => {
    if (!allowedResumeTypes.includes(file.type)) {
      toast.error("Resume must be PDF, DOC, or DOCX");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Resume must be smaller than 5MB");
      return;
    }

    try {
      setIsUploadingResume(true);
      setUploadProgress(0);
      const uploadedResume = await candidatesApi.uploadResume(file, setUploadProgress);
      form.setValue("resumeUrl", uploadedResume.resumeUrl, { shouldDirty: true, shouldValidate: true });
      form.setValue("resumeMeta", uploadedResume.resumeMeta, { shouldDirty: true, shouldValidate: true });
      form.setValue(
        "aiReasoning",
        "Resume uploaded. AI scoring will run after you save this candidate.",
        { shouldDirty: true }
      );
      form.setValue("aiScore", null, { shouldDirty: true });
      toast.success("Resume uploaded");
      if (file.type === "application/msword") {
        toast.warning("Legacy .doc resumes upload successfully, but AI scoring works only with PDF or DOCX.");
      }
    } catch (error) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (error instanceof Error ? error.message : "Unable to upload resume");
      toast.error(message);
    } finally {
      setIsUploadingResume(false);
    }
  };

  const applyImportedResumeData = (
    parsedCandidate: Awaited<ReturnType<typeof candidatesApi.uploadResume>>["parsedCandidate"]
  ) => {
    if (!parsedCandidate) {
      toast.message("Resume imported, but no structured candidate fields were confidently detected.");
      return;
    }

    const currentValues = form.getValues();
    let updatedFields = 0;

    const setIfEmpty = <K extends keyof CandidateFormValues>(key: K, value: CandidateFormValues[K]) => {
      const currentValue = currentValues[key];

      if (typeof currentValue === "string") {
        if (!currentValue.trim() && typeof value === "string" && value.trim()) {
          form.setValue(key, value, { shouldDirty: true, shouldValidate: true });
          updatedFields += 1;
        }
        return;
      }

      if (currentValue === null || typeof currentValue === "undefined") {
        if (value !== null && typeof value !== "undefined") {
          form.setValue(key, value, { shouldDirty: true, shouldValidate: true });
          updatedFields += 1;
        }
      }
    };

    setIfEmpty("name", parsedCandidate.name);
    setIfEmpty("email", parsedCandidate.email);
    setIfEmpty("phone", parsedCandidate.phone);
    setIfEmpty("location", parsedCandidate.location);
    setIfEmpty("linkedin", parsedCandidate.linkedin);
    setIfEmpty("portfolio", parsedCandidate.portfolio);
    setIfEmpty("currentRole", parsedCandidate.currentRole);
    setIfEmpty("currentCompany", parsedCandidate.currentCompany);

    if (
      (!currentValues.skills || currentValues.skills.length === 0) &&
      parsedCandidate.skills?.length
    ) {
      form.setValue("skills", parsedCandidate.skills, { shouldDirty: true, shouldValidate: true });
      updatedFields += 1;
    }

    if (
      (!currentValues.certifications || currentValues.certifications.length === 0) &&
      parsedCandidate.certifications?.length
    ) {
      form.setValue("certifications", parsedCandidate.certifications, { shouldDirty: true, shouldValidate: true });
      updatedFields += 1;
    }

    if (
      (!currentValues.languages || currentValues.languages.length === 0) &&
      parsedCandidate.languages?.length
    ) {
      form.setValue("languages", parsedCandidate.languages, { shouldDirty: true, shouldValidate: true });
      updatedFields += 1;
    }

    if (
      currentValues.education.every((item) => !item.degree && !item.college && !item.year) &&
      parsedCandidate.education?.length
    ) {
      form.setValue("education", parsedCandidate.education, { shouldDirty: true, shouldValidate: true });
      updatedFields += 1;
    }

    if (
      currentValues.experience.years === 0 &&
      currentValues.experience.months === 0 &&
      (parsedCandidate.experience.years > 0 || parsedCandidate.experience.months > 0)
    ) {
      form.setValue("experience", parsedCandidate.experience, { shouldDirty: true, shouldValidate: true });
      updatedFields += 1;
    }

    toast.success(
      updatedFields > 0
        ? `Imported resume and filled ${updatedFields} form section${updatedFields === 1 ? "" : "s"}`
        : "Resume imported"
    );
  };

  const handleResumeImport = async (file: File) => {
    if (!["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"].includes(file.type)) {
      toast.error("Import currently supports PDF and DOCX only");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Resume must be smaller than 5MB");
      return;
    }

    try {
      setIsImportingResume(true);
      setUploadProgress(0);
      const uploadedResume = await candidatesApi.uploadResume(file, setUploadProgress);
      form.setValue("resumeUrl", uploadedResume.resumeUrl, { shouldDirty: true, shouldValidate: true });
      form.setValue("resumeMeta", uploadedResume.resumeMeta, { shouldDirty: true, shouldValidate: true });
      form.setValue(
        "aiReasoning",
        "Resume imported. AI scoring will run after you save this candidate.",
        { shouldDirty: true }
      );
      form.setValue("aiScore", null, { shouldDirty: true });
      applyImportedResumeData(uploadedResume.parsedCandidate);
    } catch (error) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (error instanceof Error ? error.message : "Unable to import resume");
      toast.error(message);
    } finally {
      setIsImportingResume(false);
    }
  };

  const handleCancel = () => {
    if (form.formState.isDirty) {
      setDiscardOpen(true);
      return;
    }

    navigate(candidate ? `/candidates/${candidate.id}` : "/candidates");
  };

  const handleSubmit = async (values: CandidateFormValues) => {
    try {
      setIsSubmitting(true);
      const response =
        mode === "edit" && candidate
          ? { item: await updateCandidate(candidate.id, values), duplicateWarning: null }
          : await createCandidate(values);

      if (values.initialNote.replace(/<[^>]+>/g, "").trim()) {
        await addNote(response.item.id, {
          content: values.initialNote,
          pinned: false,
        });
      }

      form.reset({
        ...toCandidateFormValues(response.item),
        initialNote: "",
      });
      localStorage.removeItem(storageKey);
      setAutosaveStamp(new Date().toISOString());

      if (response.duplicateWarning) {
        toast.warning(`Possible duplicate: ${response.duplicateWarning.name} is already in this job pipeline.`);
      }

      toast.success(mode === "edit" ? "Candidate updated" : "Candidate created");
      navigate(`/candidates/${response.item.id}`);
    } catch (error) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (error instanceof Error ? error.message : "Unable to save candidate");
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <Card className="overflow-hidden rounded-[28px] border border-border/80 shadow-sm">
          <CardHeader className="bg-gradient-to-r from-primary/10 via-background to-sky-500/10">
            <CardTitle>{mode === "edit" ? "Update candidate profile" : "Create candidate profile"}</CardTitle>
            <CardDescription>
              Capture a polished internal profile with recruiter notes, structured experience, and resume-backed AI scoring.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 p-6 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <p className="text-sm font-medium text-foreground">Draft protection</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Local autosave is active
                {autosaveStamp ? ` | last saved ${format(new Date(autosaveStamp), "MMM d, h:mm a")}` : ""}.
              </p>
            </div>
            <Alert className="rounded-2xl border-primary/20 bg-primary/5">
              <ShieldAlert className="h-4 w-4 text-primary" />
              <AlertTitle>ATS entry checklist</AlertTitle>
              <AlertDescription>
                Add the job, stage, resume, and ownership up front so downstream interview scheduling and reporting stay clean.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {duplicateCandidate && (
          <Alert className="rounded-[28px] border-amber-500/30 bg-amber-500/5">
            <AlertTriangle className="h-4 w-4 text-amber-700" />
            <AlertTitle>Possible duplicate candidate</AlertTitle>
            <AlertDescription>
              {duplicateCandidate.name} is already attached to this job in stage {duplicateCandidate.stage}. You can still save, but this should be reviewed first.
            </AlertDescription>
          </Alert>
        )}

        <Card className="rounded-[28px] border border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle>Basic information</CardTitle>
            <CardDescription>Core identity and contact data used across outreach, interview loops, and reporting.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5 md:grid-cols-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Full name *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ariana Brooks" className="h-11 rounded-2xl" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email *</FormLabel>
                  <FormControl>
                    <Input {...field} type="email" placeholder="ariana@domain.com" className="h-11 rounded-2xl" />
                  </FormControl>
                  <div className="text-xs text-muted-foreground">{checkingDuplicate ? "Checking duplicates..." : "Unique per job is recommended."}</div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="+91 98765 43210" className="h-11 rounded-2xl" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="altPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Alternate phone</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="+91 91234 56789" className="h-11 rounded-2xl" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current location</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Pune, India" className="h-11 rounded-2xl" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="linkedin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>LinkedIn URL</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="https://linkedin.com/in/..." className="h-11 rounded-2xl" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="portfolio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Portfolio URL</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="https://portfolio.site" className="h-11 rounded-2xl" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="currentCompany"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current company</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Orbit Labs" className="h-11 rounded-2xl" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="currentRole"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current role</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Senior Product Designer" className="h-11 rounded-2xl" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card className="rounded-[28px] border border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle>Job application</CardTitle>
            <CardDescription>Link the candidate to a real opening so filtering, ownership, and stage reporting stay accurate.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5 md:grid-cols-2">
            <FormField
              control={form.control}
              name="jobId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select job *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="h-11 rounded-2xl">
                        <SelectValue placeholder="Choose a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {meta.jobs.map((job) => (
                        <SelectItem key={job.id} value={job.id}>
                          {job.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="department"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Department</FormLabel>
                  <FormControl>
                    <Input {...field} readOnly className="h-11 rounded-2xl bg-muted/20" placeholder="Auto-filled from job" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="source"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Source</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="h-11 rounded-2xl">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {candidateSourceOptions.map((source) => (
                        <SelectItem key={source} value={source}>
                          {source.replace("-", " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="referredBy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Referred by</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Employee / external referrer" className="h-11 rounded-2xl" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="expectedSalary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expected salary</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      value={field.value ?? ""}
                      onChange={(event) => field.onChange(event.target.value === "" ? null : Number(event.target.value))}
                      placeholder="900000"
                      className="h-11 rounded-2xl"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="noticePeriod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notice period</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="30 days" className="h-11 rounded-2xl" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="workAuthorization"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Work authorization</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Citizen / visa / sponsorship needed" className="h-11 rounded-2xl" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card className="rounded-[28px] border border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle>Resume upload</CardTitle>
            <CardDescription>Resume files are stored locally for now. Accepted formats: PDF, DOC, DOCX up to 5MB.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-[24px] border border-dashed border-border/80 bg-muted/20 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="font-medium">{watchedResumeMeta.filename || "No resume uploaded yet"}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {watchedResumeMeta.size ? `${Math.round(watchedResumeMeta.size / 1024)} KB` : "Ready for upload"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Label className="inline-flex cursor-pointer items-center justify-center rounded-2xl border border-border bg-background px-4 py-2 text-sm font-medium">
                    <UploadCloud className="mr-2 h-4 w-4" />
                    {isUploadingResume ? "Uploading..." : watchedResumeUrl ? "Replace resume" : "Upload resume"}
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      className="sr-only"
                      disabled={isUploadingResume}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) {
                          void handleResumeUpload(file);
                        }
                        event.target.value = "";
                      }}
                    />
                  </Label>
                  {mode === "create" && (
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-2xl"
                      disabled={isImportingResume}
                      onClick={() => importInputRef.current?.click()}
                    >
                      <UploadCloud className="mr-2 h-4 w-4" />
                      {isImportingResume ? "Importing..." : "Import PDF / DOCX"}
                    </Button>
                  )}
                  <input
                    ref={importInputRef}
                    type="file"
                    accept=".pdf,.docx"
                    className="sr-only"
                    disabled={isImportingResume}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        void handleResumeImport(file);
                      }
                      event.target.value = "";
                    }}
                  />
                  {watchedResumeUrl && (
                    <Button type="button" variant="outline" className="rounded-2xl" asChild>
                      <a href={watchedResumeUrl} target="_blank" rel="noreferrer">
                        <Download className="mr-2 h-4 w-4" />
                        Preview / download
                      </a>
                    </Button>
                  )}
                </div>
              </div>
              {isUploadingResume && (
                <div className="mt-4 space-y-2">
                  <Progress value={uploadProgress} className="h-2" />
                  <p className="text-xs text-muted-foreground">{uploadProgress}% uploaded</p>
                </div>
              )}
            </div>

            <FormField
              control={form.control}
              name="coverLetter"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cover letter</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Optional context from the recruiter or candidate application." className="min-h-32 rounded-2xl" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card className="rounded-[28px] border border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle>Professional information</CardTitle>
            <CardDescription>Capture searchable talent signals that help recruiters compare and shortlist candidates faster.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <FormField
              control={form.control}
              name="skills"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Skills</FormLabel>
                  <FormControl>
                    <TagSelector values={field.value} onChange={field.onChange} placeholder="Add skills" limit={25} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-5 md:grid-cols-2">
              <FormField
                control={form.control}
                name="experience.years"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Experience years</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        max={50}
                        value={field.value}
                        onChange={(event) => field.onChange(Number(event.target.value))}
                        className="h-11 rounded-2xl"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="experience.months"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Experience months</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        max={11}
                        value={field.value}
                        onChange={(event) => field.onChange(Number(event.target.value))}
                        className="h-11 rounded-2xl"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Education</p>
                  <p className="text-sm text-muted-foreground">Add one or more academic records.</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-2xl"
                  onClick={() => educationFields.append({ degree: "", college: "", year: null })}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add education
                </Button>
              </div>

              {educationFields.fields.map((field, index) => (
                <div key={field.id} className="grid gap-4 rounded-[24px] border border-border/80 p-4 md:grid-cols-[1fr_1fr_140px_auto]">
                  <FormField
                    control={form.control}
                    name={`education.${index}.degree`}
                    render={({ field: currentField }) => (
                      <FormItem>
                        <FormLabel>Degree</FormLabel>
                        <FormControl>
                          <Input {...currentField} placeholder="B.Tech" className="h-11 rounded-2xl" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`education.${index}.college`}
                    render={({ field: currentField }) => (
                      <FormItem>
                        <FormLabel>College</FormLabel>
                        <FormControl>
                          <Input {...currentField} placeholder="IIT Delhi" className="h-11 rounded-2xl" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`education.${index}.year`}
                    render={({ field: currentField }) => (
                      <FormItem>
                        <FormLabel>Year</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1950}
                            max={2100}
                            value={currentField.value ?? ""}
                            onChange={(event) => currentField.onChange(event.target.value === "" ? null : Number(event.target.value))}
                            placeholder="2020"
                            className="h-11 rounded-2xl"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-11 rounded-2xl text-destructive"
                      disabled={educationFields.fields.length === 1}
                      onClick={() => educationFields.remove(index)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <FormField
              control={form.control}
              name="certifications"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Certifications</FormLabel>
                  <FormControl>
                    <TagSelector values={field.value} onChange={field.onChange} placeholder="Add certifications" limit={20} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="languages"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Languages</FormLabel>
                  <FormControl>
                    <TagSelector values={field.value} onChange={field.onChange} placeholder="Add languages" limit={15} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card className="rounded-[28px] border border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle>Screening</CardTitle>
            <CardDescription>Set ownership, stage, and ranking signals so the candidate enters the funnel cleanly.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5 md:grid-cols-2">
            <FormField
              control={form.control}
              name="stage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Initial stage</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="h-11 rounded-2xl">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {candidateStageOptions.map((stage) => (
                        <SelectItem key={stage} value={stage}>
                          {stage}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="recruiterAssigned"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Recruiter assigned</FormLabel>
                  <Select value={field.value || "unassigned"} onValueChange={(value) => field.onChange(value === "unassigned" ? null : value)}>
                    <FormControl>
                      <SelectTrigger className="h-11 rounded-2xl">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {meta.recruiters.map((recruiter) => (
                        <SelectItem key={recruiter.id} value={recruiter.id}>
                          {recruiter.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="h-11 rounded-2xl">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {candidatePriorityOptions.map((priority) => (
                        <SelectItem key={priority} value={priority}>
                          {priority}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="rating"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rating</FormLabel>
                  <Select value={field.value ? String(field.value) : "unrated"} onValueChange={(value) => field.onChange(value === "unrated" ? null : Number(value))}>
                    <FormControl>
                      <SelectTrigger className="h-11 rounded-2xl">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="unrated">Not rated yet</SelectItem>
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <SelectItem key={rating} value={String(rating)}>
                          {rating} / 5
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card className="rounded-[28px] border border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle>AI scoring</CardTitle>
            <CardDescription>Resume uploads trigger real similarity scoring after save. The final score is generated on the server.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="rounded-2xl border-sky-500/20 bg-sky-500/5">
              <AlertTriangle className="h-4 w-4 text-sky-700" />
              <AlertTitle>
                {watchedResumeUrl ? "Resume detected" : "Pending AI analysis"}
              </AlertTitle>
              <AlertDescription>
                {watchedResumeUrl
                  ? "The next save will queue async resume scoring against the selected job."
                  : "Upload a resume to unlock parsing, similarity matching, and AI scoring."}
              </AlertDescription>
            </Alert>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="aiScore"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>AI score</FormLabel>
                    <FormControl>
                      <Input value={field.value ?? ""} readOnly className="h-11 rounded-2xl bg-muted/20" placeholder="Pending" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="aiReasoning"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>AI reasoning</FormLabel>
                    <FormControl>
                      <Textarea {...field} readOnly className="min-h-24 rounded-2xl bg-muted/20" placeholder="Pending AI analysis." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[28px] border border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle>Notes</CardTitle>
            <CardDescription>Save an optional internal note immediately after the candidate record is created.</CardDescription>
          </CardHeader>
          <CardContent>
            <RichTextEditor value={watchedInitialNote} onChange={(value) => form.setValue("initialNote", value, { shouldDirty: true })} />
          </CardContent>
        </Card>

        <Separator />

        <div className="flex flex-col gap-3 pb-8 sm:flex-row sm:items-center">
          <Button type="submit" className="h-11 rounded-2xl" disabled={isSubmitting || isUploadingResume}>
            {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {mode === "edit" ? "Update candidate" : "Create candidate"}
          </Button>
          <Button type="button" variant="ghost" className="h-11 rounded-2xl sm:ml-auto" onClick={handleCancel}>
            Cancel
          </Button>
        </div>
      </form>

      <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <AlertDialogContent className="rounded-[28px]">
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>
              This draft has local edits that have not been saved yet. If you leave now, those changes will remain in autosave but will not be submitted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-2xl">Stay here</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-2xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => navigate(candidate ? `/candidates/${candidate.id}` : "/candidates")}
            >
              Leave page
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Form>
  );
}
