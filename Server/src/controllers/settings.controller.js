const { z } = require("zod");
const User = require("../models/User");
const { createAuditLog } = require("../services/audit.service");
const {
  buildEmailIntegrationStatus,
  sendTransactionalEmail,
} = require("../services/email.service");
const {
  buildIntegrationStatuses,
  ensureWorkspaceSettings,
  normalizeWorkspaceSettingsResponse,
} = require("../services/workspace-settings.service");

const weekdayOptions = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

const officeHourSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Time must be in HH:mm format");

const workspaceSettingsSchema = z.object({
  workspaceName: z.string().trim().min(2).max(120),
  companyName: z.string().trim().min(2).max(120),
  defaultPipelineDisplay: z.string().trim().min(2).max(200),
  defaultTimezone: z.string().trim().min(2).max(120),
  defaultCurrency: z.string().trim().min(3).max(5).transform((value) => value.toUpperCase()),
  officeHours: z
    .object({
      start: officeHourSchema,
      end: officeHourSchema,
    })
    .refine(({ start, end }) => start < end, {
      message: "Office end time must be after start time",
      path: ["end"],
    }),
  officeWeek: z
    .array(z.enum(weekdayOptions))
    .min(1, "Select at least one office day")
    .max(7)
    .transform((days) => Array.from(new Set(days))),
  brandingLogo: z.string().trim().max(255).optional().default(""),
  notifications: z.object({
    email: z.boolean().default(true),
    inApp: z.boolean().default(true),
    newApplications: z.boolean().default(true),
    interviewReminders: z.boolean().default(true),
    stageChanges: z.boolean().default(true),
    dailyDigest: z.boolean().default(false),
  }),
  hiringPreferences: z.object({
    defaultCandidateSource: z.enum(["portal", "referral", "manual", "campus", "linkedin", "agency"]).default("manual"),
    defaultJobStatus: z.enum(["draft", "open", "closed"]).default("draft"),
    resumeFileSizeLimitMb: z.number().int().min(1).max(25).default(5),
    allowedResumeFormats: z
      .array(z.enum(["PDF", "DOC", "DOCX"]))
      .min(1, "Select at least one resume format")
      .max(3)
      .transform((formats) => Array.from(new Set(formats))),
    duplicateApplicationWarning: z.boolean().default(true),
  }),
  security: z.object({
    sessionTimeoutMinutes: z.number().int().min(5).max(1440).default(15),
    refreshTokenDurationDays: z.number().int().min(1).max(90).default(7),
    passwordMinLength: z.number().int().min(6).max(32).default(6),
    requireStrongPasswords: z.boolean().default(false),
    twoFactorRequired: z.boolean().default(false),
    loginActivityVisible: z.boolean().default(false),
  }),
  integrations: z.object({
    resumeStorage: z.object({
      provider: z.enum(["local", "s3"]).default("local"),
      s3Bucket: z.string().trim().max(120).default(""),
      s3Region: z.string().trim().max(80).default(""),
      s3BasePath: z.string().trim().max(120).default("resumes/"),
    }),
    aiScoring: z.object({
      provider: z.enum(["disabled", "openai"]).default("openai"),
      model: z.string().trim().min(2).max(80).default("gpt-4.1-mini"),
    }),
    calendar: z.object({
      provider: z.enum(["none", "google", "outlook"]).default("none"),
      enabled: z.boolean().default(false),
      organizerEmail: z.string().trim().email().or(z.literal("")).default(""),
    }),
  }),
});

const buildValidationError = (issues) => ({
  message: "Validation failed",
  errors: issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
  })),
});

const testEmailSchema = z.object({
  email: z.string().trim().email().optional(),
});

const getSettings = async (_req, res) => {
  try {
    const settings = await ensureWorkspaceSettings();
    return res.status(200).json(normalizeWorkspaceSettingsResponse(settings));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const updateSettings = async (req, res) => {
  const parsedBody = workspaceSettingsSchema.safeParse(req.body);

  if (!parsedBody.success) {
    return res.status(400).json(buildValidationError(parsedBody.error.issues));
  }

  try {
    const settings = await ensureWorkspaceSettings();

    Object.assign(settings, parsedBody.data, {
      updatedBy: req.user.id,
    });

    await settings.save();

    await createAuditLog({
      req,
      action: "settings-updated",
      category: "settings",
      entity: {
        type: "settings",
        id: settings._id,
        label: settings.workspaceName,
      },
      description: `Updated workspace settings for ${settings.workspaceName}`,
      meta: {
        companyName: settings.companyName,
        timezone: settings.defaultTimezone,
        currency: settings.defaultCurrency,
        officeHours: settings.officeHours,
        officeWeek: settings.officeWeek,
        notifications: settings.notifications,
        hiringPreferences: settings.hiringPreferences,
        security: settings.security,
        integrations: settings.integrations,
      },
    });

    return res.status(200).json({
      message: "Workspace settings updated successfully",
      settings: normalizeWorkspaceSettingsResponse(settings),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getIntegrationStatuses = async (_req, res) => {
  try {
    return res.status(200).json(await buildIntegrationStatuses());
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getEmailIntegrationSettings = async (_req, res) => {
  try {
    return res.status(200).json(buildEmailIntegrationStatus());
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const sendTestEmail = async (req, res) => {
  const parsedBody = testEmailSchema.safeParse(req.body || {});

  if (!parsedBody.success) {
    return res.status(400).json(buildValidationError(parsedBody.error.issues));
  }

  try {
    const actor = await User.findById(req.user.id).select("name email role");
    if (!actor) {
      return res.status(404).json({ message: "User not found" });
    }

    const emailStatus = buildEmailIntegrationStatus();
    if (!emailStatus.ready) {
      return res.status(400).json({ message: "Brevo email delivery is not configured on the server" });
    }

    const recipientEmail = parsedBody.data.email || actor.email;
    const recipientName = actor.name || "HireFlow Admin";
    const sentAt = new Date().toLocaleString();

    const response = await sendTransactionalEmail({
      to: [{ email: recipientEmail, name: recipientName }],
      subject: "HireFlow Brevo test email",
      htmlContent: `
        <html>
          <body>
            <p>Hi ${recipientName},</p>
            <p>This is a test email from HireFlow using Brevo transactional delivery.</p>
            <p><strong>Sent at:</strong> ${sentAt}</p>
            <p><strong>Sandbox mode:</strong> ${emailStatus.sandboxMode ? "enabled" : "disabled"}</p>
            <p>If you received this, the email integration is working.</p>
          </body>
        </html>
      `,
      textContent: [
        `Hi ${recipientName},`,
        "This is a test email from HireFlow using Brevo transactional delivery.",
        `Sent at: ${sentAt}`,
        `Sandbox mode: ${emailStatus.sandboxMode ? "enabled" : "disabled"}`,
        "If you received this, the email integration is working.",
      ].join("\n"),
      tags: ["settings-test-email"],
    });

    await createAuditLog({
      req,
      action: "settings-test-email-sent",
      category: "settings",
      entity: {
        type: "integration",
        id: "brevo-email",
        label: "Brevo Email",
      },
      description: `Sent Brevo test email to ${recipientEmail}`,
      meta: {
        recipientEmail,
        sandboxMode: emailStatus.sandboxMode,
        messageId: response?.messageId || "",
      },
    });

    return res.status(200).json({
      message: emailStatus.sandboxMode
        ? "Brevo test request accepted in sandbox mode"
        : "Brevo test email sent successfully",
      messageId: response?.messageId || "",
      sandboxMode: emailStatus.sandboxMode,
      recipientEmail,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getEmailIntegrationSettings,
  getIntegrationStatuses,
  getSettings,
  sendTestEmail,
  updateSettings,
};
