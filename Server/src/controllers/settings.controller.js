const { z } = require("zod");
const WorkspaceSetting = require("../models/WorkspaceSetting");
const { createAuditLog } = require("../services/audit.service");

const DEFAULT_WORKSPACE_SETTINGS = {
  workspaceName: "HireFlow Workspace",
  companyName: "HireFlow Labs",
  defaultPipelineDisplay: "Applied -> Screening -> Interview -> Offer -> Hired",
  defaultTimezone: "Asia/Kolkata",
  defaultCurrency: "USD",
  brandingLogo: "",
  notifications: {
    email: true,
    inApp: true,
    newApplications: true,
    interviewReminders: true,
    stageChanges: true,
    dailyDigest: false,
  },
};

const workspaceSettingsSchema = z.object({
  workspaceName: z.string().trim().min(2).max(120),
  companyName: z.string().trim().min(2).max(120),
  defaultPipelineDisplay: z.string().trim().min(2).max(200),
  defaultTimezone: z.string().trim().min(2).max(120),
  defaultCurrency: z.string().trim().min(3).max(5).transform((value) => value.toUpperCase()),
  brandingLogo: z.string().trim().max(255).optional().default(""),
  notifications: z.object({
    email: z.boolean().default(true),
    inApp: z.boolean().default(true),
    newApplications: z.boolean().default(true),
    interviewReminders: z.boolean().default(true),
    stageChanges: z.boolean().default(true),
    dailyDigest: z.boolean().default(false),
  }),
});

const buildValidationError = (issues) => ({
  message: "Validation failed",
  errors: issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
  })),
});

const normalizeSettingsResponse = (settings) => ({
  workspaceName: settings.workspaceName,
  companyName: settings.companyName,
  defaultPipelineDisplay: settings.defaultPipelineDisplay,
  defaultTimezone: settings.defaultTimezone,
  defaultCurrency: settings.defaultCurrency,
  brandingLogo: settings.brandingLogo || "",
  notifications: {
    email: settings.notifications?.email ?? true,
    inApp: settings.notifications?.inApp ?? true,
    newApplications: settings.notifications?.newApplications ?? true,
    interviewReminders: settings.notifications?.interviewReminders ?? true,
    stageChanges: settings.notifications?.stageChanges ?? true,
    dailyDigest: settings.notifications?.dailyDigest ?? false,
  },
  updatedAt: settings.updatedAt || null,
});

const ensureWorkspaceSettings = async () => {
  let settings = await WorkspaceSetting.findOne();

  if (!settings) {
    settings = await WorkspaceSetting.create(DEFAULT_WORKSPACE_SETTINGS);
  }

  return settings;
};

const getSettings = async (_req, res) => {
  try {
    const settings = await ensureWorkspaceSettings();
    return res.status(200).json(normalizeSettingsResponse(settings));
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
        notifications: settings.notifications,
      },
    });

    return res.status(200).json({
      message: "Workspace settings updated successfully",
      settings: normalizeSettingsResponse(settings),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getSettings,
  updateSettings,
};
