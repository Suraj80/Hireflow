const { z } = require("zod");

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, "Invalid identifier");

const offerStatusOptions = ["Draft", "Sent", "Accepted", "Declined", "Withdrawn", "Expired"];
const publicDecisionOptions = ["Accepted", "Declined"];
const allowedLimits = [10, 25, 50, 100];

const nullableNumber = z.preprocess((value) => {
  if (value === "" || value === null || typeof value === "undefined") {
    return null;
  }
  return Number(value);
}, z.number().min(0).nullable());

const nullableDateString = z.preprocess((value) => {
  if (!value) {
    return null;
  }
  return String(value);
}, z.string().trim().datetime().nullable());

const offerCreateSchema = z.object({
  candidateId: objectIdSchema,
  title: z.string().trim().min(2).max(120),
  salaryAmount: nullableNumber.optional().default(null),
  bonusAmount: nullableNumber.optional().default(null),
  equity: z.string().trim().max(120).optional().default(""),
  currency: z.string().trim().min(3).max(5).transform((value) => value.toUpperCase()).optional().default("USD"),
  startDate: nullableDateString.optional().default(null),
  expiresAt: nullableDateString.optional().default(null),
  letterHtml: z.string().trim().max(50000).optional().default(""),
  notes: z.string().trim().max(4000).optional().default(""),
});

const offerUpdateSchema = z.object({
  title: z.string().trim().min(2).max(120).optional(),
  salaryAmount: nullableNumber.optional(),
  bonusAmount: nullableNumber.optional(),
  equity: z.string().trim().max(120).optional(),
  currency: z.string().trim().min(3).max(5).transform((value) => value.toUpperCase()).optional(),
  startDate: nullableDateString.optional(),
  expiresAt: nullableDateString.optional(),
  letterHtml: z.string().trim().max(50000).optional(),
  notes: z.string().trim().max(4000).optional(),
});

const offerStatusSchema = z.object({
  status: z.enum(offerStatusOptions),
  message: z.string().trim().max(1000).optional().default(""),
});

const offerSendSchema = z.object({
  message: z.string().trim().max(1000).optional().default(""),
});

const offerListQuerySchema = z.object({
  page: z.preprocess((value) => Number(value ?? 1), z.number().int().positive()).default(1),
  limit: z.preprocess(
    (value) => Number(value ?? 10),
    z.number().int().refine((entry) => allowedLimits.includes(entry), "Invalid page size")
  ).default(10),
  status: z.string().trim().optional().default("all"),
  search: z.string().trim().optional().default(""),
});

const publicOfferDecisionSchema = z.object({
  decision: z.enum(publicDecisionOptions),
  signatureName: z.string().trim().min(2).max(120),
  message: z.string().trim().max(1000).optional().default(""),
});

module.exports = {
  offerCreateSchema,
  offerListQuerySchema,
  offerSendSchema,
  offerStatusOptions,
  offerStatusSchema,
  offerUpdateSchema,
  publicOfferDecisionSchema,
};
