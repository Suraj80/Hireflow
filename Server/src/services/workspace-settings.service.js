const WorkspaceSetting = require("../models/WorkspaceSetting");
const { buildCalendarIntegrationStatus } = require("./calendar.service");

const DEFAULT_WORKSPACE_SETTINGS = {
  workspaceName: "HireFlow Workspace",
  companyName: "HireFlow Labs",
  defaultPipelineDisplay: "Applied -> Screening -> Interview -> Offer -> Hired",
  defaultTimezone: "Asia/Kolkata",
  defaultCurrency: "USD",
  officeHours: {
    start: "09:00",
    end: "18:00",
  },
  officeWeek: ["monday", "tuesday", "wednesday", "thursday", "friday"],
  brandingLogo: "",
  notifications: {
    email: true,
    inApp: true,
    newApplications: true,
    interviewReminders: true,
    stageChanges: true,
    dailyDigest: false,
  },
  hiringPreferences: {
    defaultCandidateSource: "manual",
    defaultJobStatus: "draft",
    resumeFileSizeLimitMb: 5,
    allowedResumeFormats: ["PDF", "DOCX"],
    duplicateApplicationWarning: true,
  },
  security: {
    sessionTimeoutMinutes: 15,
    refreshTokenDurationDays: 7,
    passwordMinLength: 6,
    requireStrongPasswords: false,
    twoFactorRequired: false,
    loginActivityVisible: false,
  },
  integrations: {
    resumeStorage: {
      provider: "local",
      s3Bucket: "",
      s3Region: "",
      s3BasePath: "resumes/",
    },
    aiScoring: {
      provider: "openai",
      model: "gpt-4.1-mini",
    },
    calendar: {
      provider: "none",
      enabled: false,
      organizerEmail: "",
    },
  },
};

const resumeFormatMimeTypes = {
  PDF: "application/pdf",
  DOCX: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

const supportedResumeFormats = ["PDF", "DOCX"];

const strongPasswordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/;

const sanitizeResumeFormats = (formats) => {
  const filtered = Array.from(new Set((formats || []).filter((format) => supportedResumeFormats.includes(format))));
  return filtered.length ? filtered : [...supportedResumeFormats];
};

const normalizeWorkspaceSettingsResponse = (settings) => ({
  workspaceName: settings.workspaceName,
  companyName: settings.companyName,
  defaultPipelineDisplay: settings.defaultPipelineDisplay,
  defaultTimezone: settings.defaultTimezone,
  defaultCurrency: settings.defaultCurrency,
  officeHours: {
    start: settings.officeHours?.start || "09:00",
    end: settings.officeHours?.end || "18:00",
  },
  officeWeek:
    settings.officeWeek?.length
      ? settings.officeWeek
      : ["monday", "tuesday", "wednesday", "thursday", "friday"],
  brandingLogo: settings.brandingLogo || "",
  notifications: {
    email: settings.notifications?.email ?? true,
    inApp: settings.notifications?.inApp ?? true,
    newApplications: settings.notifications?.newApplications ?? true,
    interviewReminders: settings.notifications?.interviewReminders ?? true,
    stageChanges: settings.notifications?.stageChanges ?? true,
    dailyDigest: settings.notifications?.dailyDigest ?? false,
  },
  hiringPreferences: {
    defaultCandidateSource: settings.hiringPreferences?.defaultCandidateSource || "manual",
    defaultJobStatus: settings.hiringPreferences?.defaultJobStatus || "draft",
    resumeFileSizeLimitMb: settings.hiringPreferences?.resumeFileSizeLimitMb ?? 5,
    allowedResumeFormats: sanitizeResumeFormats(settings.hiringPreferences?.allowedResumeFormats),
    duplicateApplicationWarning: settings.hiringPreferences?.duplicateApplicationWarning ?? true,
  },
  security: {
    sessionTimeoutMinutes: settings.security?.sessionTimeoutMinutes ?? 15,
    refreshTokenDurationDays: settings.security?.refreshTokenDurationDays ?? 7,
    passwordMinLength: settings.security?.passwordMinLength ?? 6,
    requireStrongPasswords: settings.security?.requireStrongPasswords ?? false,
    twoFactorRequired: settings.security?.twoFactorRequired ?? false,
    loginActivityVisible: settings.security?.loginActivityVisible ?? false,
  },
  integrations: {
    resumeStorage: {
      provider: settings.integrations?.resumeStorage?.provider || "local",
      s3Bucket: settings.integrations?.resumeStorage?.s3Bucket || "",
      s3Region: settings.integrations?.resumeStorage?.s3Region || "",
      s3BasePath: settings.integrations?.resumeStorage?.s3BasePath || "resumes/",
    },
    aiScoring: {
      provider: settings.integrations?.aiScoring?.provider || "openai",
      model: settings.integrations?.aiScoring?.model || "gpt-4.1-mini",
    },
    calendar: {
      provider: settings.integrations?.calendar?.provider || "none",
      enabled: settings.integrations?.calendar?.enabled ?? false,
      organizerEmail: settings.integrations?.calendar?.organizerEmail || "",
    },
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

const getWorkspaceSettings = async () => normalizeWorkspaceSettingsResponse(await ensureWorkspaceSettings());

const getSecuritySettings = async () => (await getWorkspaceSettings()).security;

const getHiringPreferences = async () => (await getWorkspaceSettings()).hiringPreferences;

const buildPasswordPolicyMessage = (securitySettings) => {
  const minLength = securitySettings?.passwordMinLength ?? 6;
  const requireStrongPasswords = securitySettings?.requireStrongPasswords ?? false;

  if (requireStrongPasswords) {
    return `Password must be at least ${minLength} characters and include uppercase, lowercase, number, and special character`;
  }

  return `Password must be at least ${minLength} characters`;
};

const validatePasswordAgainstPolicy = (password, securitySettings) => {
  const normalizedPassword = String(password || "");
  const minLength = securitySettings?.passwordMinLength ?? 6;
  const requireStrongPasswords = securitySettings?.requireStrongPasswords ?? false;

  if (!normalizedPassword || normalizedPassword.length < minLength) {
    return buildPasswordPolicyMessage(securitySettings);
  }

  if (requireStrongPasswords && !strongPasswordPattern.test(normalizedPassword)) {
    return buildPasswordPolicyMessage(securitySettings);
  }

  return null;
};

const getResumeUploadPolicy = async () => {
  const hiringPreferences = await getHiringPreferences();
  const allowedFormats = hiringPreferences.allowedResumeFormats?.length
    ? sanitizeResumeFormats(hiringPreferences.allowedResumeFormats)
    : DEFAULT_WORKSPACE_SETTINGS.hiringPreferences.allowedResumeFormats;
  const allowedMimeTypes = allowedFormats
    .map((format) => resumeFormatMimeTypes[format])
    .filter(Boolean);

  return {
    allowedFormats,
    allowedMimeTypes,
    maxSizeMb: hiringPreferences.resumeFileSizeLimitMb ?? 5,
    maxSizeBytes: (hiringPreferences.resumeFileSizeLimitMb ?? 5) * 1024 * 1024,
  };
};

const validateResumeUpload = (file, policy) => {
  if (!file) {
    return "Resume file is required";
  }

  if (file.size > policy.maxSizeBytes) {
    return `Resume must be smaller than ${policy.maxSizeMb}MB`;
  }

  if (!policy.allowedMimeTypes.includes(file.mimetype)) {
    return `Resume must be ${policy.allowedFormats.join(", ")}`;
  }

  return null;
};

const buildResumeStorageStatus = (settings) => {
  const provider = settings.integrations.resumeStorage.provider;

  if (provider === "local") {
    return {
      provider,
      configured: true,
      ready: true,
      mode: "active",
      message: "Resumes are stored on the local server uploads directory.",
      s3Bucket: "",
      s3Region: "",
      s3BasePath: settings.integrations.resumeStorage.s3BasePath,
    };
  }

  const hasBucket = Boolean(settings.integrations.resumeStorage.s3Bucket);
  const hasRegion = Boolean(settings.integrations.resumeStorage.s3Region);
  const hasCredentials = Boolean(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
  const configured = hasBucket && hasRegion;
  const ready = configured && hasCredentials;

  return {
    provider,
    configured,
    ready,
    mode: ready ? "active" : configured ? "needs-credentials" : "needs-config",
    message: ready
      ? "S3 bucket and AWS credentials are available."
      : configured
        ? "S3 is selected, but AWS credentials are missing on the server."
        : "Add the S3 bucket and region before switching resume storage.",
    s3Bucket: settings.integrations.resumeStorage.s3Bucket,
    s3Region: settings.integrations.resumeStorage.s3Region,
    s3BasePath: settings.integrations.resumeStorage.s3BasePath,
  };
};

const buildAiScoringStatus = (settings) => {
  const provider = settings.integrations.aiScoring.provider;

  if (provider === "disabled") {
    return {
      provider,
      configured: true,
      ready: false,
      mode: "disabled",
      model: "",
      message: "AI resume scoring is disabled for this workspace.",
    };
  }

  const model = settings.integrations.aiScoring.model || "gpt-4.1-mini";
  const hasApiKey = Boolean(process.env.OPENAI_API_KEY);

  return {
    provider,
    configured: Boolean(model),
    ready: hasApiKey,
    mode: hasApiKey ? "active" : "needs-credentials",
    model,
    message: hasApiKey
      ? `OpenAI scoring is ready with ${model}.`
      : "Add OPENAI_API_KEY on the server to enable AI resume scoring.",
  };
};

const buildCalendarStatus = (settings) => {
  return buildCalendarIntegrationStatus(settings.integrations.calendar);
};

const buildIntegrationStatuses = async () => {
  const settings = await getWorkspaceSettings();

  return {
    resumeStorage: buildResumeStorageStatus(settings),
    aiScoring: buildAiScoringStatus(settings),
    calendar: buildCalendarStatus(settings),
  };
};

module.exports = {
  DEFAULT_WORKSPACE_SETTINGS,
  buildIntegrationStatuses,
  buildPasswordPolicyMessage,
  ensureWorkspaceSettings,
  getHiringPreferences,
  getResumeUploadPolicy,
  getSecuritySettings,
  getWorkspaceSettings,
  normalizeWorkspaceSettingsResponse,
  validatePasswordAgainstPolicy,
  validateResumeUpload,
};
