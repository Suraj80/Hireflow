const { z } = require("zod");

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, "Invalid identifier");

const interviewStatusOptions = ["Scheduled", "Confirmed", "Completed", "Cancelled", "Rescheduled"];
const interviewTypeOptions = ["Video", "Onsite", "Phone", "Panel", "Technical"];
const recommendationOptions = ["Strong Hire", "Hire", "Leaning Hire", "No Hire", "Strong No Hire"];
const feedbackStatusOptions = ["pending", "partial", "complete"];
const allowedSorts = ["scheduledAt-desc", "scheduledAt-asc", "candidate", "status", "round"];
const allowedLimits = [10, 25, 50, 100];

const optionalUrl = z
  .string()
  .trim()
  .optional()
  .default("")
  .refine((value) => value === "" || /^https?:\/\//i.test(value), "Must be a valid URL");

const interviewPayloadSchema = z.object({
  candidateId: objectIdSchema,
  jobId: objectIdSchema,
  round: z.string().trim().min(2).max(100),
  type: z.enum(interviewTypeOptions),
  status: z.enum(interviewStatusOptions).optional().default("Scheduled"),
  date: z.string().trim().min(1, "Date is required"),
  time: z.string().trim().min(1, "Time is required"),
  timezone: z.string().trim().min(2).max(100),
  duration: z.preprocess((value) => Number(value), z.number().int().min(15).max(480)),
  interviewers: z.array(objectIdSchema).min(1).max(12),
  leadInterviewer: objectIdSchema,
  agenda: z.string().trim().max(4000).optional().default(""),
  notes: z.string().trim().max(4000).optional().default(""),
  meetingLink: optionalUrl,
  location: z.string().trim().max(160).optional().default(""),
  reminderSettings: z.array(z.preprocess((value) => Number(value), z.number().int().min(0).max(10080))).max(5).optional().default([1440, 60]),
  sendInvite: z.boolean().optional().default(true),
});

const validateLeadInterviewer = (value, context) => {
  if (!value.interviewers.includes(value.leadInterviewer)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["leadInterviewer"],
      message: "Lead interviewer must be part of the panel",
    });
  }
};

const interviewCreateSchema = interviewPayloadSchema
  .superRefine(validateLeadInterviewer)
  .transform((value) => ({
    ...value,
    scheduledAt: new Date(`${value.date}T${value.time}`),
  }));

const interviewUpdateSchema = z
  .object({
    candidateId: objectIdSchema.optional(),
    jobId: objectIdSchema.optional(),
    round: z.string().trim().min(2).max(100).optional(),
    type: z.enum(interviewTypeOptions).optional(),
    status: z.enum(interviewStatusOptions).optional(),
    date: z.string().trim().min(1).optional(),
    time: z.string().trim().min(1).optional(),
    timezone: z.string().trim().min(2).max(100).optional(),
    duration: z.preprocess((value) => (typeof value === "undefined" ? undefined : Number(value)), z.number().int().min(15).max(480).optional()),
    interviewers: z.array(objectIdSchema).min(1).max(12).optional(),
    leadInterviewer: objectIdSchema.optional(),
    agenda: z.string().trim().max(4000).optional(),
    notes: z.string().trim().max(4000).optional(),
    meetingLink: optionalUrl.optional(),
    location: z.string().trim().max(160).optional(),
    reminderSettings: z.array(z.preprocess((value) => Number(value), z.number().int().min(0).max(10080))).max(5).optional(),
    sendInvite: z.boolean().optional(),
  })
  .superRefine((value, context) => {
    if (value.leadInterviewer && value.interviewers && !value.interviewers.includes(value.leadInterviewer)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["leadInterviewer"],
        message: "Lead interviewer must be part of the panel",
      });
    }
  })
  .transform((value) => {
    const next = { ...value };

    if (value.date && value.time) {
      next.scheduledAt = new Date(`${value.date}T${value.time}`);
    }

    return next;
  });

const interviewQuerySchema = z.object({
  page: z.preprocess((value) => Number(value ?? 1), z.number().int().positive()).default(1),
  limit: z.preprocess((value) => Number(value ?? 10), z.number().int().refine((entry) => allowedLimits.includes(entry), "Invalid page size")).default(10),
  search: z.string().trim().optional().default(""),
  team: z.string().trim().optional().default("all"),
  interviewer: z.string().trim().optional().default("all"),
  status: z.string().trim().optional().default("all"),
  type: z.string().trim().optional().default("all"),
  recruiter: z.string().trim().optional().default("all"),
  feedbackStatus: z.string().trim().optional().default("all"),
  sort: z.enum(allowedSorts).default("scheduledAt-asc"),
  from: z.string().trim().optional().default(""),
  to: z.string().trim().optional().default(""),
});

const interviewCalendarQuerySchema = z.object({
  weekStart: z.string().trim().min(1, "Week start is required"),
  team: z.string().trim().optional().default("all"),
  interviewer: z.string().trim().optional().default("all"),
  status: z.string().trim().optional().default("all"),
  search: z.string().trim().optional().default(""),
});

const interviewStatusSchema = z.object({
  status: z.enum(interviewStatusOptions),
  reason: z.string().trim().max(300).optional().default(""),
  sendNotification: z.boolean().optional().default(true),
});

const interviewRescheduleSchema = z.object({
  scheduledAt: z.string().datetime("Scheduled time is invalid"),
  duration: z.preprocess((value) => (typeof value === "undefined" ? undefined : Number(value)), z.number().int().min(15).max(480).optional()),
  timezone: z.string().trim().max(100).optional(),
  reason: z.string().trim().max(300).optional().default(""),
  sendNotification: z.boolean().optional().default(true),
});

const interviewFeedbackSchema = z.object({
  rating: z.preprocess((value) => Number(value), z.number().min(1).max(5)),
  strengths: z.string().trim().max(2000).optional().default(""),
  concerns: z.string().trim().max(2000).optional().default(""),
  recommendation: z.enum(recommendationOptions),
});

module.exports = {
  feedbackStatusOptions,
  interviewCalendarQuerySchema,
  interviewCreateSchema,
  interviewFeedbackSchema,
  interviewQuerySchema,
  interviewRescheduleSchema,
  interviewStatusOptions,
  interviewStatusSchema,
  interviewTypeOptions,
  interviewUpdateSchema,
  recommendationOptions,
};
