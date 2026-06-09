const { z } = require("zod");

const jobStatuses = ["draft", "open", "closed"];
const employmentTypes = ["full-time", "part-time", "contract", "internship"];
const jobVisibility = ["public", "private"];

const trimString = (min, max) =>
  z
    .string()
    .trim()
    .min(min)
    .max(max);

const nullableNumber = z.preprocess((value) => {
  if (value === "" || value === null || typeof value === "undefined") {
    return null;
  }

  const numericValue = Number(value);
  return Number.isNaN(numericValue) ? value : numericValue;
}, z.number().nonnegative().nullable());

const nullableInteger = z.preprocess((value) => {
  if (value === "" || value === null || typeof value === "undefined") {
    return null;
  }

  const numericValue = Number(value);
  return Number.isNaN(numericValue) ? value : numericValue;
}, z.number().int().positive().nullable());

const tagsSchema = z
  .array(trimString(1, 24).transform((value) => value.toLowerCase()))
  .max(10, "A maximum of 10 tags is allowed")
  .default([]);

const jobRequirementsSchema = z
  .object({
    skills: z.array(trimString(1, 40)).max(20).default([]),
    yearsOfExperience: nullableNumber,
    qualification: z.string().trim().max(120).default(""),
    certifications: z.array(trimString(1, 60)).max(15).default([]),
  })
  .default({
    skills: [],
    yearsOfExperience: null,
    qualification: "",
    certifications: [],
  });

const jobPayloadBaseSchema = z.object({
  title: trimString(3, 120),
  department: trimString(2, 80),
  hiringManager: z.string().trim().max(120).optional().default(""),
  hiringManagerId: z.string().trim().optional().nullable().default(null),
  descriptionHTML: trimString(30, 50000),
  type: z.enum(employmentTypes),
  location: trimString(2, 120),
  remote: z.boolean().default(false),
  salaryMin: nullableNumber.optional().default(null),
  salaryMax: nullableNumber.optional().default(null),
  currency: trimString(3, 5).transform((value) => value.toUpperCase()).default("USD"),
  showSalary: z.boolean().default(false),
  requirements: jobRequirementsSchema,
  tags: tagsSchema,
  deadline: z.preprocess((value) => {
    if (!value) {
      return null;
    }

    if (value instanceof Date) {
      return value;
    }

    return new Date(value);
  }, z.date().nullable()).default(null),
  maxApplicants: nullableInteger.optional().default(null),
  autoClose: z.boolean().default(false),
  visibility: z.enum(jobVisibility).default("private"),
  status: z.enum(jobStatuses).default("draft"),
});

const withJobRules = (schema) =>
  schema.superRefine((data, context) => {
    if (data.salaryMin !== null && data.salaryMax !== null && data.salaryMax < data.salaryMin) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Salary max must be greater than or equal to salary min",
        path: ["salaryMax"],
      });
    }

    if (data.deadline && data.deadline.getTime() < Date.now() - 60 * 1000) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Deadline must be in the future",
        path: ["deadline"],
      });
    }

    if (data.status === "open" && !data.deadline) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "An open job requires an application deadline",
        path: ["deadline"],
      });
    }
  });

const jobCreateSchema = withJobRules(jobPayloadBaseSchema);
const jobUpdateSchema = withJobRules(jobPayloadBaseSchema);

const jobsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
  search: z.string().trim().max(120).optional().default(""),
  status: z.enum(["all", ...jobStatuses]).optional().default("all"),
  department: z.string().trim().max(80).optional().default("all"),
  type: z.enum(["all", ...employmentTypes]).optional().default("all"),
  sort: z.enum(["newest", "oldest", "deadline"]).optional().default("newest"),
  includeArchived: z
    .union([z.literal("true"), z.literal("false"), z.boolean()])
    .optional()
    .transform((value) => value === true || value === "true")
    .default(false),
});

module.exports = {
  employmentTypes,
  jobCreateSchema,
  jobStatuses,
  jobsQuerySchema,
  jobUpdateSchema,
  jobVisibility,
};
