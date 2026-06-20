import { useEffect, useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { timezoneOptions } from "@/features/interviews/helpers";
import { interviewFormSchema } from "@/features/interviews/schema";
import { Interview, InterviewFormValues, InterviewMeta } from "@/features/interviews/types";

type InterviewFormProps = {
  meta: InterviewMeta;
  mode?: "create" | "edit";
  interview?: Interview | null;
  onSubmit: (values: InterviewFormValues) => Promise<void>;
};

const reminderOptions = [
  { label: "24h", value: 1440 },
  { label: "1h", value: 60 },
  { label: "15m", value: 15 },
];

const roundOptions = ["Screening", "Round 1", "Round 2", "Round 3", "Technical", "Panel", "Final"];

export function InterviewForm({ meta, mode = "create", interview, onSubmit }: InterviewFormProps) {
  const navigate = useNavigate();
  const candidateOptions = useMemo(() => meta.candidates, [meta.candidates]);
  const form = useForm<InterviewFormValues>({
    resolver: zodResolver(interviewFormSchema),
    defaultValues: interview
      ? {
          candidateId: interview.candidate?.id || "",
          jobId: interview.job?.id || "",
          round: interview.round,
          type: interview.type,
          date: interview.scheduledAt.slice(0, 10),
          time: interview.scheduledAt.slice(11, 16),
          timezone: interview.timezone,
          duration: interview.duration,
          interviewers: interview.interviewers.map((entry) => entry.id),
          leadInterviewer: interview.leadInterviewer?.id || "",
          agenda: interview.agenda,
          notes: interview.notes,
          meetingLink: interview.meetLink,
          location: interview.location,
          reminderSettings: interview.reminderSettings,
          sendInvite: interview.sendInvite,
        }
      : {
          candidateId: "",
          jobId: "",
          round: "Screening",
          type: "Video",
          date: "",
          time: "",
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
          duration: 45,
          interviewers: [],
          leadInterviewer: "",
          agenda: "",
          notes: "",
          meetingLink: "",
          location: "",
          reminderSettings: [1440, 60],
          sendInvite: true,
        },
  });

  const selectedCandidateId = form.watch("candidateId");
  const selectedInterviewerIds = form.watch("interviewers");
  const selectedInterviewerNames = useMemo(
    () =>
      meta.interviewers
        .filter((entry) => selectedInterviewerIds.includes(entry.id))
        .map((entry) => entry.name),
    [meta.interviewers, selectedInterviewerIds]
  );
  const timezoneChoices = useMemo(() => {
    const currentTimezone = form.getValues("timezone");
    return Array.from(new Set([...timezoneOptions, currentTimezone].filter(Boolean)));
  }, [form]);

  useEffect(() => {
    if (!selectedCandidateId) {
      return;
    }

    const candidate = candidateOptions.find((entry) => entry.id === selectedCandidateId);
    if (candidate?.job?.id) {
      form.setValue("jobId", candidate.job.id, { shouldValidate: true });
    }
  }, [candidateOptions, form, selectedCandidateId]);

  useEffect(() => {
    const leadInterviewer = form.getValues("leadInterviewer");
    if (leadInterviewer && !selectedInterviewerIds.includes(leadInterviewer)) {
      form.setValue("leadInterviewer", "", { shouldValidate: true });
    }
  }, [form, selectedInterviewerIds]);

  return (
    <Form {...form}>
      <form
        className="space-y-6"
        onSubmit={form.handleSubmit(async (values) => {
          try {
            await onSubmit(values);
            toast.success(mode === "create" ? "Interview scheduled" : "Interview updated");
            if (mode === "create") {
              navigate("/interviews");
            }
          } catch (error) {
            const message =
              (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
              (error instanceof Error ? error.message : "Unable to save interview");
            toast.error(message);
          }
        })}
      >
        <Card className="rounded-[28px] border border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle>{mode === "create" ? "Schedule Interview" : "Edit Interview"}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 md:grid-cols-2">
            <FormField
              control={form.control}
              name="candidateId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Candidate</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="h-11 rounded-2xl">
                        <SelectValue placeholder="Select candidate" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {candidateOptions.map((candidate) => (
                        <SelectItem key={candidate.id} value={candidate.id}>
                          {candidate.name} • {candidate.job?.title}
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
              name="round"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Round</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="h-11 rounded-2xl">
                        <SelectValue placeholder="Select round" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {roundOptions.map((round) => (
                        <SelectItem key={round} value={round}>
                          {round}
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
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="h-11 rounded-2xl">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {meta.types.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
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
              name="duration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duration</FormLabel>
                  <FormControl>
                    <Input type="number" min={15} max={480} value={field.value} onChange={(event) => field.onChange(Number(event.target.value))} className="h-11 rounded-2xl" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} className="h-11 rounded-2xl" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="time"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Time</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} className="h-11 rounded-2xl" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="timezone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Timezone</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="h-11 rounded-2xl">
                        <SelectValue placeholder="Select timezone" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {timezoneChoices.map((timezone) => (
                        <SelectItem key={timezone} value={timezone}>
                          {timezone}
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
              name="meetingLink"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Meeting link</FormLabel>
                  <FormControl>
                    <Input {...field} className="h-11 rounded-2xl" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Office room, address, or remote" className="h-11 rounded-2xl" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="interviewers"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Interviewers</FormLabel>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-auto min-h-11 w-full justify-between rounded-2xl px-4 py-3 text-left font-normal"
                        >
                          <span className="truncate">
                            {selectedInterviewerNames.length
                              ? selectedInterviewerNames.join(", ")
                              : "Select interviewers"}
                          </span>
                          <ChevronDown className="ml-3 h-4 w-4 shrink-0 opacity-60" />
                        </Button>
                      </FormControl>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)] rounded-2xl" align="start">
                      {meta.interviewers.map((interviewer) => {
                        const checked = field.value.includes(interviewer.id);
                        return (
                          <DropdownMenuCheckboxItem
                            key={interviewer.id}
                            checked={checked}
                            onCheckedChange={(nextValue) => {
                              const set = new Set(field.value);
                              if (nextValue) {
                                set.add(interviewer.id);
                              } else {
                                set.delete(interviewer.id);
                              }
                              field.onChange(Array.from(set));
                            }}
                            onSelect={(event) => event.preventDefault()}
                          >
                            {interviewer.name}
                          </DropdownMenuCheckboxItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="leadInterviewer"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lead interviewer</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="h-11 rounded-2xl">
                        <SelectValue placeholder="Select lead interviewer" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {meta.interviewers
                        .filter((entry) => form.watch("interviewers").includes(entry.id))
                        .map((interviewer) => (
                          <SelectItem key={interviewer.id} value={interviewer.id}>
                            {interviewer.name}
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
              name="jobId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Job</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="h-11 rounded-2xl">
                        <SelectValue placeholder="Select job" />
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
              name="agenda"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Agenda</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={4} className="rounded-2xl" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={4} className="rounded-2xl" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="reminderSettings"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Reminder settings</FormLabel>
                  <div className="flex flex-wrap gap-3 rounded-2xl border border-border p-4">
                    {reminderOptions.map((option) => (
                      <label key={option.value} className="flex items-center gap-2 rounded-xl border border-border/60 px-3 py-2">
                        <Checkbox
                          checked={field.value.includes(option.value)}
                          onCheckedChange={(checked) => {
                            const next = checked
                              ? [...field.value, option.value]
                              : field.value.filter((entry) => entry !== option.value);
                            field.onChange(next);
                          }}
                        />
                        <span className="text-sm">{option.label}</span>
                      </label>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="sendInvite"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <label className="flex items-center gap-3 rounded-2xl border border-border p-4">
                    <Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(Boolean(checked))} />
                    <span className="text-sm font-medium">Send invite immediately</span>
                  </label>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex flex-wrap justify-end gap-3">
          <Button type="button" variant="outline" className="rounded-2xl" onClick={() => navigate("/interviews")}>
            Cancel
          </Button>
          <Button type="submit" className="rounded-2xl">
            {mode === "create" ? "Schedule interview" : "Save changes"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
