import { useEffect, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Copy, LoaderCircle, Save, Send, ShieldAlert } from "lucide-react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { RichTextEditor } from "@/features/jobs/components/RichTextEditor";
import { SalaryInput } from "@/features/jobs/components/SalaryInput";
import { TagSelector } from "@/features/jobs/components/TagSelector";
import { jobsApi } from "@/features/jobs/api";
import { defaultJobFormValues, employmentTypeOptions, JobFormValues, jobFormSchema, toJobFormValues } from "@/features/jobs/schema";
import { Job, JobDepartmentOption, UserSummary } from "@/features/jobs/types";
import { cn } from "@/lib/utils";

const defaultTagSuggestions = ["urgent", "remote", "engineering", "product", "marketing"];
const defaultSkillsSuggestions = ["react", "typescript", "node.js", "communication", "figma", "mongodb"];
const defaultCertificationSuggestions = ["aws", "gcp", "azure", "pmp", "scrum", "csm"];

type JobFormProps = {
  mode: "create" | "edit";
  job?: Job | null;
};

type AutosavedValues = JobFormValues & {
  _savedAt?: string;
};

export function JobForm({ mode, job = null }: JobFormProps) {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState<"draft" | "open" | null>(null);
  const [autosaveStamp, setAutosaveStamp] = useState<string | null>(null);
  const [departmentOptions, setDepartmentOptions] = useState<JobDepartmentOption[]>([]);
  const [hiringManagerOptions, setHiringManagerOptions] = useState<UserSummary[]>([]);
  const [metaLoading, setMetaLoading] = useState(true);
  const submitIntentRef = useRef<"draft" | "open">("draft");
  const autosaveTimerRef = useRef<number | null>(null);
  const storageKey = `hireflow-job-draft:${job?.id || "new"}`;

  const form = useForm<JobFormValues>({
    resolver: zodResolver(jobFormSchema),
    defaultValues: job ? toJobFormValues(job) : defaultJobFormValues,
    mode: "onBlur",
  });

  useEffect(() => {
    let isMounted = true;

    const loadMeta = async () => {
      try {
        setMetaLoading(true);
        const response = await jobsApi.meta();

        if (!isMounted) {
          return;
        }

        const nextDepartments = [...response.departments];
        if (job?.department && !nextDepartments.some((department) => department.name === job.department)) {
          nextDepartments.push({
            id: `current-${job.department}`,
            name: job.department,
            isActive: true,
            isLegacy: true,
          });
        }

        const nextHiringManagers = [...response.hiringManagers];
        if (
          job?.hiringManagerId &&
          job.hiringManager &&
          !nextHiringManagers.some((manager) => manager.id === job.hiringManagerId)
        ) {
          nextHiringManagers.push({
            id: job.hiringManagerId,
            name: job.hiringManager,
            email: "",
            role: "recruiter",
          });
        }

        setDepartmentOptions(
          nextDepartments.sort((left, right) => left.name.localeCompare(right.name))
        );
        setHiringManagerOptions(
          nextHiringManagers.sort((left, right) => left.name.localeCompare(right.name))
        );
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to load department and hiring manager options");
      } finally {
        if (isMounted) {
          setMetaLoading(false);
        }
      }
    };

    void loadMeta();

    return () => {
      isMounted = false;
    };
  }, [job?.department, job?.hiringManager, job?.hiringManagerId]);

  useEffect(() => {
    if (job) {
      form.reset(toJobFormValues(job));
      return;
    }

    const savedDraft = localStorage.getItem(storageKey);
    if (!savedDraft) {
      return;
    }

    try {
      const parsedDraft = JSON.parse(savedDraft) as AutosavedValues;
      const { _savedAt, ...values } = parsedDraft;
      form.reset({ ...defaultJobFormValues, ...values });
      if (_savedAt) {
        setAutosaveStamp(_savedAt);
      }
      toast.message("Restored local autosave");
    } catch (_error) {
      localStorage.removeItem(storageKey);
    }
  }, [form, job, storageKey]);

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
        localStorage.setItem(storageKey, JSON.stringify({ ...(values as JobFormValues), _savedAt: savedAt }));
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

  const handleCancel = () => {
    if (form.formState.isDirty && !window.confirm("You have unsaved changes. Leave this page?")) {
      return;
    }

    navigate("/jobs");
  };

  const handleSubmit = async (values: JobFormValues) => {
    const nextValues: JobFormValues = {
      ...values,
      status: submitIntentRef.current,
    };

    setIsSubmitting(submitIntentRef.current);

    try {
      const savedJob =
        mode === "edit" && job
          ? await jobsApi.update(job.id, nextValues)
          : await jobsApi.create(nextValues);

      form.reset(toJobFormValues(savedJob));
      localStorage.removeItem(storageKey);
      setAutosaveStamp(new Date().toISOString());
      toast.success(submitIntentRef.current === "draft" ? "Draft saved successfully" : "Job published successfully");
      navigate("/jobs");
    } catch (error) {
      const message =
        (error as { response?: { data?: { message?: string; errors?: { message: string }[] } } })?.response?.data?.errors?.[0]?.message ||
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Unable to save job";
      toast.error(message);
    } finally {
      setIsSubmitting(null);
    }
  };

  const publicUrl = `${window.location.origin}/apply/${job?.id || "preview-after-save"}`;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <Card className="overflow-hidden rounded-[28px] border border-border/80 shadow-sm">
          <CardHeader className="bg-gradient-to-r from-primary/10 via-background to-emerald-500/10">
            <CardTitle>{mode === "edit" ? "Edit job" : "Create a new role"}</CardTitle>
            <CardDescription>
              Set up a hiring-ready job with clear structure, internal controls, and a polished public application experience.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 p-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <p className="text-sm font-medium text-foreground">Draft protection</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Local autosave is active{autosaveStamp ? ` | last saved ${format(new Date(autosaveStamp), "MMM d, h:mm a")}` : ""}.
              </p>
            </div>
            <Alert className="rounded-2xl border-primary/20 bg-primary/5">
              <ShieldAlert className="h-4 w-4 text-primary" />
              <AlertTitle>Publish checklist</AlertTitle>
              <AlertDescription>
                Open jobs should include a deadline, description, and enough requirements for candidates to self-qualify.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        <Card className="rounded-[28px] border border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle>Basic Info</CardTitle>
            <CardDescription>Core details recruiters and candidates will see first.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5 md:grid-cols-2">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Job Title *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Senior Frontend Engineer" className="h-11 rounded-2xl" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="department"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Department *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange} disabled={metaLoading}>
                    <FormControl>
                      <SelectTrigger className="h-11 rounded-2xl">
                        <SelectValue placeholder={metaLoading ? "Loading departments..." : "Choose a department"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {departmentOptions.map((department) => (
                        <SelectItem key={department.id} value={department.name}>
                          {department.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Departments are managed centrally in Settings to keep reporting and filters consistent.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="hiringManagerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hiring Manager</FormLabel>
                  <Select
                    value={field.value || "unassigned"}
                    onValueChange={(value) => {
                      const manager = hiringManagerOptions.find((item) => item.id === value);
                      field.onChange(value === "unassigned" ? null : value);
                      form.setValue("hiringManager", value === "unassigned" ? "" : manager?.name || "", {
                        shouldDirty: true,
                        shouldValidate: true,
                      });
                    }}
                    disabled={metaLoading}
                  >
                    <FormControl>
                      <SelectTrigger className="h-11 rounded-2xl">
                        <SelectValue placeholder={metaLoading ? "Loading users..." : "Select a hiring manager"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {hiringManagerOptions.map((manager) => (
                        <SelectItem key={manager.id} value={manager.id}>
                          {manager.name}{manager.email ? ` • ${manager.email}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Select from existing internal users instead of typing manually, so ownership stays clean.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Employment Type *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="h-11 rounded-2xl">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {employmentTypeOptions.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type.replace("-", " ")}
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
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Bengaluru, India" className="h-11 rounded-2xl" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="remote"
              render={({ field }) => (
                <FormItem className="rounded-2xl border border-border bg-muted/20 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <FormLabel>Remote option</FormLabel>
                      <FormDescription>Show this role as remote-friendly.</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </div>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card className="rounded-[28px] border border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle>Compensation</CardTitle>
            <CardDescription>Keep this flexible for internal-only or public salary ranges.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <SalaryInput
              currency={form.watch("currency")}
              salaryMin={form.watch("salaryMin")}
              salaryMax={form.watch("salaryMax")}
              onCurrencyChange={(value) => form.setValue("currency", value, { shouldDirty: true, shouldValidate: true })}
              onSalaryMinChange={(value) => form.setValue("salaryMin", value === "" ? null : Number(value), { shouldDirty: true, shouldValidate: true })}
              onSalaryMaxChange={(value) => form.setValue("salaryMax", value === "" ? null : Number(value), { shouldDirty: true, shouldValidate: true })}
            />
            <div className="grid gap-4 md:grid-cols-3">
              <div />
              <div className="text-sm font-medium text-destructive">{form.formState.errors.salaryMin?.message}</div>
              <div className="text-sm font-medium text-destructive">{form.formState.errors.salaryMax?.message}</div>
            </div>
            <FormField
              control={form.control}
              name="showSalary"
              render={({ field }) => (
                <FormItem className="rounded-2xl border border-border bg-muted/20 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <FormLabel>Show salary publicly</FormLabel>
                      <FormDescription>Expose the salary range on the public apply page.</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </div>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card className="rounded-[28px] border border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle>Job Description</CardTitle>
            <CardDescription>Use structured content so candidates can scan the role quickly.</CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="descriptionHTML"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <RichTextEditor value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card className="rounded-[28px] border border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle>Requirements</CardTitle>
            <CardDescription>Capture structured qualification signals for the hiring team.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <FormField
              control={form.control}
              name="requirements.skills"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Skills</FormLabel>
                  <FormControl>
                    <TagSelector
                      values={field.value}
                      onChange={field.onChange}
                      suggestions={defaultSkillsSuggestions}
                      placeholder="Add skill tags"
                      limit={20}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-5 md:grid-cols-2">
              <FormField
                control={form.control}
                name="requirements.yearsOfExperience"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Years of Experience</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        value={field.value ?? ""}
                        onChange={(event) => field.onChange(event.target.value === "" ? null : Number(event.target.value))}
                        className="h-11 rounded-2xl"
                        placeholder="5"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="requirements.qualification"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Qualification</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Bachelor's degree in Computer Science" className="h-11 rounded-2xl" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="requirements.certifications"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Certifications</FormLabel>
                  <FormControl>
                    <TagSelector
                      values={field.value}
                      onChange={field.onChange}
                      suggestions={defaultCertificationSuggestions}
                      placeholder="Add certifications"
                      limit={15}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card className="rounded-[28px] border border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle>Tags</CardTitle>
            <CardDescription>Use searchable labels to support list filtering and routing.</CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <TagSelector
                      values={field.value}
                      onChange={field.onChange}
                      suggestions={defaultTagSuggestions}
                      placeholder="Add or create tags"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card className="rounded-[28px] border border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle>Application Settings</CardTitle>
            <CardDescription>Define the lifecycle and public exposure of this role.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <FormField
                control={form.control}
                name="deadline"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Deadline</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            type="button"
                            variant="outline"
                            className={cn("h-11 justify-start rounded-2xl text-left font-normal", !field.value && "text-muted-foreground")}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(new Date(field.value), "PPP") : "Select deadline"}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value ? new Date(field.value) : undefined}
                          onSelect={(date) => field.onChange(date ? date.toISOString() : null)}
                          disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="maxApplicants"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Applicants</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        value={field.value ?? ""}
                        onChange={(event) => field.onChange(event.target.value === "" ? null : Number(event.target.value))}
                        className="h-11 rounded-2xl"
                        placeholder="Leave empty for unlimited"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="autoClose"
                render={({ field }) => (
                  <FormItem className="rounded-2xl border border-border bg-muted/20 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <FormLabel>Auto-close on deadline</FormLabel>
                        <FormDescription>Move the role to closed when the deadline passes.</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </div>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="visibility"
                render={({ field }) => (
                  <FormItem className="rounded-2xl border border-border bg-muted/20 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <FormLabel>Public visibility</FormLabel>
                        <FormDescription>Allow candidates to access the public apply route.</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value === "public"} onCheckedChange={(checked) => field.onChange(checked ? "public" : "private")} />
                      </FormControl>
                    </div>
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[28px] border border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle>SEO / Public Apply</CardTitle>
            <CardDescription>Use this shareable link when the role is set to public and published.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-border bg-muted/20 p-4">
              <p className="text-sm font-medium text-foreground">Public apply route preview</p>
              <p className="mt-2 break-all text-sm text-muted-foreground">{publicUrl}</p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="rounded-2xl"
              onClick={async () => {
                await navigator.clipboard.writeText(publicUrl);
                toast.success("Apply URL copied");
              }}
            >
              <Copy className="mr-2 h-4 w-4" />
              Copy apply URL
            </Button>
          </CardContent>
        </Card>

        <Separator />

        <div className="flex flex-col gap-3 pb-8 sm:flex-row sm:items-center">
          <Button
            type="submit"
            className="h-11 rounded-2xl"
            onClick={() => {
              submitIntentRef.current = "draft";
              form.setValue("status", "draft", { shouldDirty: true });
            }}
            disabled={Boolean(isSubmitting)}
          >
            {isSubmitting === "draft" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save draft
          </Button>
          <Button
            type="submit"
            className="h-11 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700"
            onClick={() => {
              submitIntentRef.current = "open";
              form.setValue("status", "open", { shouldDirty: true });
            }}
            disabled={Boolean(isSubmitting)}
          >
            {isSubmitting === "open" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Publish job
          </Button>
          <Button type="button" variant="ghost" className="h-11 rounded-2xl sm:ml-auto" onClick={handleCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}
