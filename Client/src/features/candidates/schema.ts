import { z } from "zod";
import {
  Candidate,
  CandidateInterviewMode,
  CandidateInterviewStatus,
  CandidatePriority,
  CandidateSource,
  CandidateStage,
} from "@/features/candidates/types";

export const candidateStageOptions = ["Applied", "Screening", "Interview", "Offer", "Hired", "Rejected"] as const;
export const candidateSourceOptions = ["portal", "referral", "manual", "campus", "linkedin", "agency"] as const;
export const candidatePriorityOptions = ["Low", "Medium", "High"] as const;
export const candidateInterviewModeOptions = ["Virtual", "Onsite", "Phone"] as const;
export const candidateInterviewStatusOptions = ["Scheduled", "Completed", "Cancelled"] as const;

const optionalUrl = z
  .string()
  .trim()
  .default("")
  .refine((value) => value === "" || /^https?:\/\//i.test(value), "Enter a valid URL");

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
  size: z.number().min(0).max(5 * 1024 * 1024).default(0),
  mimeType: z.string().trim().default(""),
});

export const candidateFormSchema = z.object({
  name: z.string().trim().min(2, "Full name is required").max(120),
  email: z.string().trim().email("Enter a valid email address"),
  phone: z.string().trim().max(30).default(""),
  altPhone: z.string().trim().max(30).default(""),
  location: z.string().trim().max(120).default(""),
  linkedin: optionalUrl,
  portfolio: optionalUrl,
  currentCompany: z.string().trim().max(120).default(""),
  currentRole: z.string().trim().max(120).default(""),
  jobId: z.string().trim().min(1, "Select a job"),
  department: z.string().trim().min(2, "Department is required").max(80),
  source: z.enum(candidateSourceOptions).default("manual"),
  referredBy: z.string().trim().max(120).default(""),
  expectedSalary: optionalNumber.default(null),
  noticePeriod: z.string().trim().max(80).default(""),
  workAuthorization: z.string().trim().max(120).default(""),
  resumeUrl: optionalUrl,
  resumeMeta: resumeMetaSchema.default({
    filename: "",
    size: 0,
    mimeType: "",
  }),
  coverLetter: z.string().trim().max(4000).default(""),
  skills: z.array(z.string().trim().min(1).max(40)).max(25).default([]),
  experience: experienceSchema.default({
    years: 0,
    months: 0,
  }),
  education: z.array(educationSchema).max(10).default([]),
  certifications: z.array(z.string().trim().min(1).max(60)).max(20).default([]),
  languages: z.array(z.string().trim().min(1).max(40)).max(15).default([]),
  recruiterAssigned: z.string().trim().nullable().default(null),
  stage: z.enum(candidateStageOptions).default("Applied"),
  priority: z.enum(candidatePriorityOptions).default("Medium"),
  rating: z.preprocess((value) => {
    if (value === "" || value === null || typeof value === "undefined") {
      return null;
    }

    const parsed = Number(value);
    return Number.isNaN(parsed) ? value : parsed;
  }, z.number().int().min(1).max(5).nullable()).default(null),
  aiScore: z.number().min(0).max(100).nullable().default(null),
  aiReasoning: z.string().trim().max(4000).default(""),
  initialNote: z.string().default(""),
}).superRefine((data, context) => {
  if (data.source !== "referral" && data.referredBy) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["referredBy"],
      message: "Referrer is only needed for referral candidates",
    });
  }
});

export type CandidateFormValues = z.infer<typeof candidateFormSchema>;

export const defaultCandidateFormValues: CandidateFormValues = {
  name: "",
  email: "",
  phone: "",
  altPhone: "",
  location: "",
  linkedin: "",
  portfolio: "",
  currentCompany: "",
  currentRole: "",
  jobId: "",
  department: "",
  source: "manual",
  referredBy: "",
  expectedSalary: null,
  noticePeriod: "",
  workAuthorization: "",
  resumeUrl: "",
  resumeMeta: {
    filename: "",
    size: 0,
    mimeType: "",
  },
  coverLetter: "",
  skills: [],
  experience: {
    years: 0,
    months: 0,
  },
  education: [
    {
      degree: "",
      college: "",
      year: null,
    },
  ],
  certifications: [],
  languages: [],
  recruiterAssigned: null,
  stage: "Applied",
  priority: "Medium",
  rating: null,
  aiScore: null,
  aiReasoning: "",
  initialNote: "",
};

export const toCandidateFormValues = (candidate: Candidate): CandidateFormValues => ({
  name: candidate.name,
  email: candidate.email,
  phone: candidate.phone || "",
  altPhone: candidate.altPhone || "",
  location: candidate.location || "",
  linkedin: candidate.linkedin || "",
  portfolio: candidate.portfolio || "",
  currentCompany: candidate.currentCompany || "",
  currentRole: candidate.currentRole || "",
  jobId: candidate.jobId || "",
  department: candidate.department || candidate.job?.department || "",
  source: candidate.source,
  referredBy: candidate.referredBy || "",
  expectedSalary: candidate.expectedSalary,
  noticePeriod: candidate.noticePeriod || "",
  workAuthorization: candidate.workAuthorization || "",
  resumeUrl: candidate.resumeUrl || "",
  resumeMeta: candidate.resumeMeta,
  coverLetter: candidate.coverLetter || "",
  skills: candidate.skills || [],
  experience: candidate.experience || {
    years: 0,
    months: 0,
  },
  education:
    candidate.education && candidate.education.length
      ? candidate.education
      : [
          {
            degree: "",
            college: "",
            year: null,
          },
        ],
  certifications: candidate.certifications || [],
  languages: candidate.languages || [],
  recruiterAssigned: candidate.recruiterAssigned?.id || null,
  stage: candidate.stage,
  priority: candidate.priority,
  rating: candidate.rating,
  aiScore: candidate.aiScore,
  aiReasoning: candidate.aiReasoning || "",
  initialNote: "",
});

export const formatCandidatePayload = (values: CandidateFormValues) => ({
  name: values.name.trim(),
  email: values.email.trim().toLowerCase(),
  phone: values.phone.trim(),
  altPhone: values.altPhone.trim(),
  location: values.location.trim(),
  linkedin: values.linkedin.trim(),
  portfolio: values.portfolio.trim(),
  currentCompany: values.currentCompany.trim(),
  currentRole: values.currentRole.trim(),
  jobId: values.jobId,
  department: values.department.trim(),
  source: values.source,
  referredBy: values.referredBy.trim(),
  expectedSalary: values.expectedSalary,
  noticePeriod: values.noticePeriod.trim(),
  workAuthorization: values.workAuthorization.trim(),
  resumeUrl: values.resumeUrl.trim(),
  resumeMeta: values.resumeMeta,
  coverLetter: values.coverLetter.trim(),
  skills: values.skills.map((item) => item.trim().toLowerCase()),
  experience: values.experience,
  education: values.education
    .map((item) => ({
      degree: item.degree.trim(),
      college: item.college.trim(),
      year: item.year,
    }))
    .filter((item) => item.degree || item.college || item.year),
  certifications: values.certifications.map((item) => item.trim().toLowerCase()),
  languages: values.languages.map((item) => item.trim().toLowerCase()),
  recruiterAssigned: values.recruiterAssigned || null,
  stage: values.stage,
  priority: values.priority,
  rating: values.rating,
  aiScore: values.aiScore,
  aiReasoning: values.aiReasoning.trim(),
});

export const noteSchema = z.object({
  content: z.string().trim().min(1, "Note content is required"),
  pinned: z.boolean().default(false),
});

export type NoteFormValues = z.infer<typeof noteSchema>;

export const interviewSchema = z.object({
  date: z.string().min(1, "Select an interview time"),
  interviewers: z.array(z.string().trim().min(1).max(120)).min(1, "Add at least one interviewer"),
  mode: z.enum(candidateInterviewModeOptions).default("Virtual"),
  status: z.enum(candidateInterviewStatusOptions).default("Scheduled"),
  feedback: z.string().trim().max(4000).default(""),
});

export type InterviewFormValues = z.infer<typeof interviewSchema>;

export const defaultInterviewValues: InterviewFormValues = {
  date: "",
  interviewers: [],
  mode: "Virtual",
  status: "Scheduled",
  feedback: "",
};

export const candidateStageLabel = (value: CandidateStage | CandidatePriority | CandidateSource | CandidateInterviewMode | CandidateInterviewStatus) =>
  value.replace(/-/g, " ");
