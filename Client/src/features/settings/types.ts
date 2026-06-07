export type WorkspaceSettings = {
  workspaceName: string;
  companyName: string;
  defaultPipelineDisplay: string;
  defaultTimezone: string;
  defaultCurrency: string;
  brandingLogo: string;
  notifications: {
    email: boolean;
    inApp: boolean;
    newApplications: boolean;
    interviewReminders: boolean;
    stageChanges: boolean;
    dailyDigest: boolean;
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
