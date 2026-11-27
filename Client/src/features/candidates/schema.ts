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
  years: z.preprocess((value) => {
    if (value === "" || value === null || typeof value === "undefined") {
      return null;
    }

    const parsed = Number(value);
    return Number.isNaN(parsed) ? value : parsed;
  }, z.number().min(0).max(50).nullable()).default(null),
  months: z.preprocess((value) => {
    if (value === "" || value === null || typeof value === "undefined") {
      return null;
    }

    const parsed = Number(value);
    return Number.isNaN(parsed) ? value : parsed;
  }, z.number().int().min(0).max(11).nullable()).default(null),
});

const resumeMetaSchema = z.object({
  filename: z.string().trim().max(180).default(""),
  size: z.number().min(0).max(5 * 1024 * 1024).default(0),
  mimeType: z.string().trim().default(""),
});

export const candidateFormSchema = z.object({
  name: z.string().trim().max(120),
  email: z.string().trim().max(320).default(""),
  phone: z.string().trim().max(30).default(""),
  altPhone: z.string().trim().max(30).default(""),
  location: z.string().trim().max(120).default(""),
  linkedin: optionalUrl,
  portfolio: optionalUrl,
  currentCompany: z.string().trim().max(120).default(""),
  currentRole: z.string().trim().max(120).default(""),
  jobId: z.string().trim().default(""),
  department: z.string().trim().max(80).default(""),
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
  coverLetterUrl: optionalUrl,
  coverLetterMeta: resumeMetaSchema.default({
    filename: "",
    size: 0,
    mimeType: "",
  }),
  skills: z.array(z.string().trim().min(1).max(40)).max(25).default([]),
  experience: experienceSchema.default({
    years: null,
    months: null,
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
  status: z.enum(["Draft", "Active"]).default("Active"),
}).superRefine((data, context) => {
  if (data.source !== "referral" && data.referredBy) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["referredBy"],
      message: "Referrer is only needed for referral candidates",
    });
  }

  if (data.status === "Draft") {
    if (!data.jobId.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["jobId"],
        message: "Select a job to save draft",
      });
    }

    if (data.name.trim().length < 1) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["name"],
        message: "Add a name to save draft",
      });
    }

    return;
  }

  if (data.name.trim().length < 2) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["name"],
      message: "Full name is required",
    });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["email"],
      message: "Enter a valid email address",
    });
  }

  if (!data.jobId.trim()) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["jobId"],
      message: "Select a job",
    });
  }

  if (data.department.trim().length < 2) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["department"],
      message: "Department is required",
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
  coverLetterUrl: "",
  coverLetterMeta: {
    filename: "",
    size: 0,
    mimeType: "",
  },
  skills: [],
  experience: {
    years: null,
    months: null,
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
  status: "Active",
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
  coverLetterUrl: candidate.coverLetterUrl || "",
  coverLetterMeta: candidate.coverLetterMeta || {
    filename: "",
    size: 0,
    mimeType: "",
  },
  skills: candidate.skills || [],
  experience: candidate.experience || {
    years: null,
    months: null,
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
  status: candidate.status === "Draft" ? "Draft" : "Active",
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
  coverLetterUrl: values.coverLetterUrl.trim(),
  coverLetterMeta: values.coverLetterMeta,
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
  status: values.status,
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
