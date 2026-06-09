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
