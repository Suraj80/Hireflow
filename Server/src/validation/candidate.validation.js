const { z } = require("zod");

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, "Invalid identifier");
const stageOptions = ["Applied", "Screening", "Interview", "Offer", "Hired", "Rejected"];
const sourceOptions = ["portal", "referral", "manual", "campus", "linkedin", "agency"];
const priorityOptions = ["Low", "Medium", "High"];
const statusOptions = ["Active", "Hired", "Rejected", "Archived"];
const interviewModeOptions = ["Virtual", "Onsite", "Phone"];
const interviewStatusOptions = ["Scheduled", "Completed", "Cancelled"];
const allowedSorts = ["newest", "oldest", "highest-ai", "stage", "name"];
const allowedLimits = [10, 25, 50, 100];

const optionalUrl = z
  .string()
  .trim()
  .optional()
  .default("")
  .refine((value) => value === "" || /^https?:\/\//i.test(value), "Must be a valid URL");

const optionalNumber = z.preprocess((value) => {
  if (value === "" || value === null || typeof value === "undefined") {
    return null;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? value : parsed;
}, z.number().nonnegative().nullable());

const educationSchema = z.object({
  degree: z.string().trim().max(120).default(""),
  college: z.string().trim().max(120).default(""),
  year: z.preprocess((value) => {
    if (value === "" || value === null || typeof value === "undefined") {
      return null;
    }

    const parsed = Number(value);
    return Number.isNaN(parsed) ? value : parsed;
  }, z.number().int().min(1950).max(2100).nullable()).default(null),
});

const experienceSchema = z.object({
  years: z.preprocess((value) => Number(value ?? 0), z.number().min(0).max(50)).default(0),
  months: z.preprocess((value) => Number(value ?? 0), z.number().int().min(0).max(11)).default(0),
});

const resumeMetaSchema = z.object({
  filename: z.string().trim().max(180).default(""),
  size: z.preprocess((value) => Number(value ?? 0), z.number().min(0).max(5 * 1024 * 1024)).default(0),
  mimeType: z
    .string()
    .trim()
    .default("")
    .refine(
      (value) =>
        value === "" ||
        [
          "application/pdf",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ].includes(value),
      "Resume must be PDF or DOCX"
    ),
});

const candidateBaseSchema = z.object({
  name: z.string().trim().min(2, "Full name is required").max(120),
  email: z.string().trim().email("Enter a valid email address"),
  phone: z.string().trim().max(30).optional().default(""),
  altPhone: z.string().trim().max(30).optional().default(""),
  location: z.string().trim().max(120).optional().default(""),
  linkedin: optionalUrl,
  portfolio: optionalUrl,
  currentCompany: z.string().trim().max(120).optional().default(""),
  currentRole: z.string().trim().max(120).optional().default(""),
  jobId: objectIdSchema,
  department: z.string().trim().min(2, "Department is required").max(80),
  source: z.enum(sourceOptions).default("manual"),
  referredBy: z.string().trim().max(120).optional().default(""),
  expectedSalary: optionalNumber.optional().default(null),
  noticePeriod: z.string().trim().max(80).optional().default(""),
  workAuthorization: z.string().trim().max(120).optional().default(""),
  resumeUrl: optionalUrl,
  resumeMeta: resumeMetaSchema.default({
    filename: "",
    size: 0,
    mimeType: "",
  }),
  coverLetter: z.string().trim().max(4000).optional().default(""),
  skills: z.array(z.string().trim().min(1).max(40)).max(25).default([]),
  experience: experienceSchema.default({
    years: 0,
    months: 0,
  }),
  education: z.array(educationSchema).max(10).default([]),
  certifications: z.array(z.string().trim().min(1).max(60)).max(20).default([]),
  languages: z.array(z.string().trim().min(1).max(40)).max(15).default([]),
  recruiterAssigned: z.union([objectIdSchema, z.literal(""), z.null()]).optional().default(null),
  stage: z.enum(stageOptions).default("Applied"),
  priority: z.enum(priorityOptions).default("Medium"),
  rating: z.preprocess((value) => {
    if (value === "" || value === null || typeof value === "undefined") {
      return null;
    }

    const parsed = Number(value);
    return Number.isNaN(parsed) ? value : parsed;
  }, z.number().int().min(1).max(5).nullable()).default(null),
  aiScore: z.preprocess((value) => {
    if (value === "" || value === null || typeof value === "undefined") {
      return null;
    }

    const parsed = Number(value);
    return Number.isNaN(parsed) ? value : parsed;
  }, z.number().min(0).max(100).nullable()).default(null),
  aiReasoning: z.string().trim().max(4000).optional().default(""),
  status: z.enum(statusOptions).default("Active"),
});

const normalizeCandidatePayload = (data) => ({
  ...data,
  recruiterAssigned:
    typeof data.recruiterAssigned === "undefined" ? undefined : data.recruiterAssigned || null,
  skills: Array.isArray(data.skills) ? data.skills.map((skill) => skill.trim()) : data.skills,
  certifications: Array.isArray(data.certifications)
    ? data.certifications.map((item) => item.trim())
    : data.certifications,
  languages: Array.isArray(data.languages) ? data.languages.map((item) => item.trim()) : data.languages,
});

const candidateCreateSchema = candidateBaseSchema.transform(normalizeCandidatePayload);
const candidateUpdateSchema = candidateBaseSchema.partial().transform(normalizeCandidatePayload);

const candidatesQuerySchema = z.object({
  page: z.preprocess((value) => Number(value ?? 1), z.number().int().positive()).default(1),
  limit: z.preprocess((value) => Number(value ?? 10), z.number().int().refine((value) => allowedLimits.includes(value), "Invalid page size")).default(10),
  search: z.string().trim().optional().default(""),
  job: z.string().trim().optional().default("all"),
  department: z.string().trim().optional().default("all"),
  stage: z.string().trim().optional().default("all"),
  source: z.string().trim().optional().default("all"),
  recruiter: z.string().trim().optional().default("all"),
  status: z.string().trim().optional().default("all"),
  aiScoreMin: z.preprocess((value) => (value === "" || typeof value === "undefined" ? null : Number(value)), z.number().min(0).max(100).nullable()).optional().default(null),
  aiScoreMax: z.preprocess((value) => (value === "" || typeof value === "undefined" ? null : Number(value)), z.number().min(0).max(100).nullable()).optional().default(null),
  appliedFrom: z.string().trim().optional().default(""),
  appliedTo: z.string().trim().optional().default(""),
  sort: z.enum(allowedSorts).default("newest"),
});

const candidateStageSchema = z.object({
  stage: z.enum(stageOptions),
  reason: z.string().trim().max(300).optional().default(""),
});

const candidateAssignSchema = z.object({
  recruiterAssigned: z.union([objectIdSchema, z.literal(""), z.null()]).default(null),
});

const candidateNoteSchema = z.object({
  content: z.string().trim().min(1, "Note content is required").max(6000),
  mentions: z.array(z.string().trim().min(1).max(120)).max(20).optional().default([]),
  pinned: z.boolean().optional().default(false),
});

const candidateInterviewSchema = z.object({
  date: z.string().datetime("Interview date is invalid"),
  interviewers: z.array(z.string().trim().min(1).max(120)).min(1, "Add at least one interviewer").max(10),
  mode: z.enum(interviewModeOptions).default("Virtual"),
  status: z.enum(interviewStatusOptions).default("Scheduled"),
  feedback: z.string().trim().max(4000).optional().default(""),
});

const candidateBulkActionSchema = z.object({
  action: z.enum(["move-stage", "archive", "reject", "assign-recruiter"]),
  candidateIds: z.array(objectIdSchema).min(1).max(100),
  stage: z.enum(stageOptions).optional(),
  recruiterAssigned: z.union([objectIdSchema, z.literal(""), z.null()]).optional(),
  reason: z.string().trim().max(300).optional().default(""),
}).superRefine((data, context) => {
  if (data.action === "move-stage" && !data.stage) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["stage"],
      message: "Stage is required for bulk move",
    });
  }
});

const publicCandidateApplicationSchema = z.object({
  firstName: z.string().trim().min(2, "First name is required").max(80),
  lastName: z.string().trim().min(1, "Last name is required").max(80),
  email: z.string().trim().email("Enter a valid email address"),
  phone: z.string().trim().max(30).optional().default(""),
  linkedin: optionalUrl,
  coverLetter: z.string().trim().max(4000).optional().default(""),
});

const resumeUploadRequestSchema = z.object({
  filename: z.string().trim().min(1).max(180),
  contentType: z
    .string()
    .trim()
    .refine(
      (value) =>
        [
          "application/pdf",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ].includes(value),
      "Resume must be PDF or DOCX"
    ),
  size: z.preprocess((value) => Number(value ?? 0), z.number().positive().max(5 * 1024 * 1024)),
});

module.exports = {
  candidateAssignSchema,
  candidateBulkActionSchema,
  candidateCreateSchema,
  candidateInterviewSchema,
  candidateNoteSchema,
  publicCandidateApplicationSchema,
  candidateStageSchema,
  candidateUpdateSchema,
  candidatesQuerySchema,
  interviewModeOptions,
  interviewStatusOptions,
  priorityOptions,
  resumeUploadRequestSchema,
  sourceOptions,
  stageOptions,
  statusOptions,
};
