import { z } from "zod";
import { Job } from "@/features/jobs/types";

export const jobStatusOptions = ["draft", "open", "closed"] as const;
export const employmentTypeOptions = ["full-time", "part-time", "contract", "internship"] as const;
export const visibilityOptions = ["public", "private"] as const;
export const workModeOptions = ["onsite", "hybrid", "remote"] as const;

const optionalNumber = z.preprocess((value) => {
  if (value === "" || value === null || typeof value === "undefined") {
    return null;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? value : parsed;
}, z.number().nonnegative().nullable());

const optionalInteger = z.preprocess((value) => {
  if (value === "" || value === null || typeof value === "undefined") {
    return null;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? value : parsed;
}, z.number().int().positive().nullable());

export const jobFormSchema = z
  .object({
    title: z.string().trim().min(3, "Title must be at least 3 characters").max(120),
    department: z.string().trim().min(2, "Department is required").max(80),
    hiringManager: z.string().trim().max(120).optional().default(""),
    hiringManagerId: z.string().trim().nullable().optional().default(null),
    type: z.enum(employmentTypeOptions, { required_error: "Employment type is required" }),
    location: z.string().trim().min(2, "Location is required").max(120),
    workMode: z.enum(workModeOptions).default("onsite"),
    salaryMin: optionalNumber.optional().default(null),
    salaryMax: optionalNumber.optional().default(null),
    currency: z.string().trim().min(3, "Currency is required").max(5).default("USD"),
    showSalary: z.boolean().default(false),
    descriptionHTML: z.string().trim().min(30, "Description should be at least 30 characters"),
    requirements: z.object({
      skills: z.array(z.string().trim().min(1).max(40)).max(20),
      yearsOfExperience: optionalNumber.optional().default(null),
      qualification: z.string().trim().max(120).default(""),
      certifications: z.array(z.string().trim().min(1).max(60)).max(15),
    }),
    tags: z.array(z.string().trim().min(1).max(24)).max(10, "Use up to 10 tags"),
    deadline: z
      .string()
      .nullable()
      .refine((value) => !value || !Number.isNaN(new Date(value).getTime()), "Deadline is invalid"),
    maxApplicants: optionalInteger.optional().default(null),
    autoClose: z.boolean().default(false),
    visibility: z.enum(visibilityOptions).default("private"),
    status: z.enum(["draft", "open"]).default("draft"),
  })
  .superRefine((data, context) => {
    if (data.salaryMin !== null && data.salaryMax !== null && data.salaryMax < data.salaryMin) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["salaryMax"],
        message: "Salary max must be greater than or equal to salary min",
      });
    }

    if (data.deadline && new Date(data.deadline).getTime() < Date.now() - 60 * 1000) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["deadline"],
        message: "Deadline must be in the future",
      });
    }

    if (data.status === "open" && !data.deadline) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["deadline"],
        message: "Publish requires a valid deadline",
      });
    }
  });

export type JobFormValues = z.infer<typeof jobFormSchema>;

export const defaultJobFormValues: JobFormValues = {
  title: "",
  department: "",
  hiringManager: "",
  hiringManagerId: null,
  type: "full-time",
  location: "",
  workMode: "onsite",
  salaryMin: null,
  salaryMax: null,
  currency: "USD",
  showSalary: false,
  descriptionHTML: "",
  requirements: {
    skills: [],
    yearsOfExperience: null,
    qualification: "",
    certifications: [],
  },
  tags: [],
  deadline: null,
  maxApplicants: null,
  autoClose: false,
  visibility: "private",
  status: "draft",
};

export const formatJobPayload = (values: JobFormValues) => ({
  ...values,
  title: values.title.trim(),
  department: values.department.trim(),
  hiringManager: values.hiringManager?.trim() || "",
  hiringManagerId: values.hiringManagerId || null,
  location: values.location.trim(),
  currency: values.currency.trim().toUpperCase(),
  descriptionHTML: values.descriptionHTML.trim(),
  requirements: {
    ...values.requirements,
    qualification: values.requirements.qualification.trim(),
  },
  tags: values.tags.map((tag) => tag.trim().toLowerCase()),
});

export const toJobFormValues = (job: Job): JobFormValues => ({
  title: job.title,
  department: job.department,
  hiringManager: job.hiringManager || "",
  hiringManagerId: job.hiringManagerId || null,
  type: job.type,
  location: job.location,
  workMode: job.workMode || (job.remote ? "remote" : "onsite"),
  salaryMin: job.salaryMin,
  salaryMax: job.salaryMax,
  currency: job.currency,
  showSalary: job.showSalary,
  descriptionHTML: job.descriptionHTML,
  requirements: {
    skills: job.requirements.skills || [],
    yearsOfExperience: job.requirements.yearsOfExperience ?? null,
    qualification: job.requirements.qualification || "",
    certifications: job.requirements.certifications || [],
  },
  tags: job.tags || [],
  deadline: job.deadline,
  maxApplicants: job.maxApplicants,
  autoClose: job.autoClose,
  visibility: job.visibility,
  status: job.status === "closed" ? "draft" : job.status,
});
