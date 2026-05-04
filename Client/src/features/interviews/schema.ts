import { z } from "zod";

export const interviewFormSchema = z.object({
  candidateId: z.string().min(1, "Candidate is required"),
  jobId: z.string().min(1, "Job is required"),
  round: z.string().min(2, "Round is required"),
  type: z.enum(["Video", "Onsite", "Phone", "Panel", "Technical"]),
  date: z.string().min(1, "Date is required"),
  time: z.string().min(1, "Time is required"),
  timezone: z.string().min(2, "Timezone is required"),
  duration: z.number().min(15).max(480),
  interviewers: z.array(z.string()).min(1, "Select at least one interviewer"),
  leadInterviewer: z.string().min(1, "Lead interviewer is required"),
  agenda: z.string().max(4000).default(""),
  notes: z.string().max(4000).default(""),
  meetingLink: z.string().url("Enter a valid URL").or(z.literal("")),
  location: z.string().max(160).default(""),
  reminderSettings: z.array(z.number()).default([1440, 60]),
  sendInvite: z.boolean().default(true),
}).refine((value) => value.interviewers.includes(value.leadInterviewer), {
  path: ["leadInterviewer"],
  message: "Lead interviewer must be in the panel",
});

export const feedbackFormSchema = z.object({
  rating: z.number().min(1).max(5),
  strengths: z.string().max(2000).default(""),
  concerns: z.string().max(2000).default(""),
  recommendation: z.enum(["Strong Hire", "Hire", "Leaning Hire", "No Hire", "Strong No Hire"]),
});
