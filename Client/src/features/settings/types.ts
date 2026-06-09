export type WorkspaceSettings = {
  workspaceName: string;
  companyName: string;
  defaultPipelineDisplay: string;
  defaultTimezone: string;
  defaultCurrency: string;
  officeHours: {
    start: string;
    end: string;
  };
  officeWeek: Array<
    "sunday" | "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday"
  >;
  brandingLogo: string;
  notifications: {
    email: boolean;
    inApp: boolean;
    newApplications: boolean;
    interviewReminders: boolean;
    stageChanges: boolean;
    dailyDigest: boolean;
  };
  hiringPreferences: {
    defaultCandidateSource: "portal" | "referral" | "manual" | "campus" | "linkedin" | "agency";
    defaultJobStatus: "draft" | "open" | "closed";
    resumeFileSizeLimitMb: number;
    allowedResumeFormats: Array<"PDF" | "DOC" | "DOCX">;
    duplicateApplicationWarning: boolean;
  };
  security: {
    sessionTimeoutMinutes: number;
    refreshTokenDurationDays: number;
    passwordMinLength: number;
    requireStrongPasswords: boolean;
    twoFactorRequired: boolean;
    loginActivityVisible: boolean;
  };
  integrations: {
    resumeStorage: {
      provider: "local" | "s3";
      s3Bucket: string;
      s3Region: string;
      s3BasePath: string;
    };
    aiScoring: {
      provider: "disabled" | "openai";
      model: string;
    };
    calendar: {
      provider: "none" | "google" | "outlook";
      enabled: boolean;
      organizerEmail: string;
    };
  };
  updatedAt?: string | null;
};

export type EmailIntegrationStatus = {
  provider: "brevo";
  configured: boolean;
  ready: boolean;
  sandboxMode: boolean;
  senderEmail: string;
  senderName: string;
  replyToEmail: string;
  hasApiKey: boolean;
};

export type SettingsIntegrationStatuses = {
  resumeStorage: {
    provider: "local" | "s3";
    configured: boolean;
    ready: boolean;
    mode: "active" | "needs-credentials" | "needs-config";
    message: string;
    s3Bucket: string;
    s3Region: string;
    s3BasePath: string;
  };
  aiScoring: {
    provider: "disabled" | "openai";
    configured: boolean;
    ready: boolean;
    mode: "active" | "disabled" | "needs-credentials";
    model: string;
    message: string;
  };
  calendar: {
    provider: "none" | "google" | "outlook";
    enabled: boolean;
    configured: boolean;
    ready: boolean;
    mode: "disabled" | "manual" | "needs-config";
    organizerEmail: string;
    message: string;
  };
};
