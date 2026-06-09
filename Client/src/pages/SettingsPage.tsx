import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { departmentsApi } from "@/features/departments/api";
import { DepartmentItem } from "@/features/departments/types";
import { settingsApi } from "@/features/settings/api";
import {
  EmailIntegrationStatus,
  SettingsIntegrationStatuses,
  WorkspaceSettings,
} from "@/features/settings/types";
import {
  BellRing,
  BriefcaseBusiness,
  Building2,
  CalendarSync,
  LoaderCircle,
  LockKeyhole,
  PlugZap,
  Plus,
  Save,
  Send,
  ShieldCheck,
} from "lucide-react";

const defaultNotificationSettings: WorkspaceSettings["notifications"] = {
  email: true,
  inApp: true,
  newApplications: true,
  interviewReminders: true,
  stageChanges: true,
  dailyDigest: false,
};

const defaultWorkspaceSettings: WorkspaceSettings = {
  workspaceName: "",
  companyName: "",
  defaultPipelineDisplay: "Applied -> Screening -> Interview -> Offer -> Hired",
  defaultTimezone: "Asia/Kolkata",
  defaultCurrency: "USD",
  officeHours: {
    start: "09:00",
    end: "18:00",
  },
  officeWeek: ["monday", "tuesday", "wednesday", "thursday", "friday"],
  brandingLogo: "",
  notifications: defaultNotificationSettings,
  hiringPreferences: {
    defaultCandidateSource: "manual",
    defaultJobStatus: "draft",
    resumeFileSizeLimitMb: 5,
    allowedResumeFormats: ["PDF", "DOC", "DOCX"],
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

const currencyOptions = ["USD", "EUR", "GBP", "INR", "AED", "CAD", "AUD", "SGD"];
const resumeFormatOptions: Array<WorkspaceSettings["hiringPreferences"]["allowedResumeFormats"][number]> = [
  "PDF",
  "DOC",
  "DOCX",
];
const officeDayOptions: Array<{ value: WorkspaceSettings["officeWeek"][number]; label: string }> = [
  { value: "sunday", label: "Sun" },
  { value: "monday", label: "Mon" },
  { value: "tuesday", label: "Tue" },
  { value: "wednesday", label: "Wed" },
  { value: "thursday", label: "Thu" },
  { value: "friday", label: "Fri" },
  { value: "saturday", label: "Sat" },
];

const defaultEmailIntegration: EmailIntegrationStatus = {
  provider: "brevo",
  configured: false,
  ready: false,
  sandboxMode: false,
  senderEmail: "",
  senderName: "HireFlow",
  replyToEmail: "",
  hasApiKey: false,
};

const defaultIntegrationStatuses: SettingsIntegrationStatuses = {
  resumeStorage: {
    provider: "local",
    configured: true,
    ready: true,
    mode: "active",
    message: "Resumes are stored on the local server uploads directory.",
    s3Bucket: "",
    s3Region: "",
    s3BasePath: "resumes/",
  },
  aiScoring: {
    provider: "openai",
    configured: true,
    ready: false,
    mode: "needs-credentials",
    model: "gpt-4.1-mini",
    message: "Add OPENAI_API_KEY on the server to enable AI resume scoring.",
  },
  calendar: {
    provider: "none",
    enabled: false,
    configured: true,
    ready: false,
    mode: "disabled",
    organizerEmail: "",
    message: "Calendar sync is turned off for this workspace.",
  },
};

const normalizeWorkspaceSettings = (settings: Partial<WorkspaceSettings> | null | undefined): WorkspaceSettings => ({
  ...defaultWorkspaceSettings,
  ...settings,
  notifications: {
    ...defaultNotificationSettings,
    ...(settings?.notifications || {}),
  },
  hiringPreferences: {
    ...defaultWorkspaceSettings.hiringPreferences,
    ...(settings?.hiringPreferences || {}),
  },
  security: {
    ...defaultWorkspaceSettings.security,
    ...(settings?.security || {}),
  },
  integrations: {
    ...defaultWorkspaceSettings.integrations,
    ...(settings?.integrations || {}),
    resumeStorage: {
      ...defaultWorkspaceSettings.integrations.resumeStorage,
      ...(settings?.integrations?.resumeStorage || {}),
    },
    aiScoring: {
      ...defaultWorkspaceSettings.integrations.aiScoring,
      ...(settings?.integrations?.aiScoring || {}),
    },
    calendar: {
      ...defaultWorkspaceSettings.integrations.calendar,
      ...(settings?.integrations?.calendar || {}),
    },
  },
});

const getIntegrationBadge = (ready: boolean, configured: boolean, fallback: string) => {
  if (ready) {
    return { label: "Ready", variant: "secondary" as const };
  }

  if (configured) {
    return { label: fallback, variant: "outline" as const };
  }

  return { label: "Needs setup", variant: "outline" as const };
};

export default function SettingsPage() {
  const [workspaceSettings, setWorkspaceSettings] = useState<WorkspaceSettings>(defaultWorkspaceSettings);
  const [initialWorkspaceSettings, setInitialWorkspaceSettings] = useState<WorkspaceSettings | null>(null);
  const [loadingWorkspace, setLoadingWorkspace] = useState(true);
  const [savingWorkspace, setSavingWorkspace] = useState(false);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(true);
  const [departmentName, setDepartmentName] = useState("");
  const [creatingDepartment, setCreatingDepartment] = useState(false);
  const [workingDepartmentId, setWorkingDepartmentId] = useState<string | null>(null);
  const [emailIntegration, setEmailIntegration] = useState<EmailIntegrationStatus>(defaultEmailIntegration);
  const [loadingEmailIntegration, setLoadingEmailIntegration] = useState(true);
  const [integrationStatuses, setIntegrationStatuses] = useState<SettingsIntegrationStatuses>(defaultIntegrationStatuses);
  const [loadingIntegrationStatuses, setLoadingIntegrationStatuses] = useState(true);
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [testEmailRecipient, setTestEmailRecipient] = useState("");

  const loadWorkspaceSettings = async () => {
    try {
      setLoadingWorkspace(true);
      const response = await settingsApi.getWorkspace();
      const normalized = normalizeWorkspaceSettings(response);
      setWorkspaceSettings(normalized);
      setInitialWorkspaceSettings(normalized);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load workspace settings");
    } finally {
      setLoadingWorkspace(false);
    }
  };

  const loadDepartments = async () => {
    try {
      setLoadingDepartments(true);
      const response = await departmentsApi.list(true);
      setDepartments(response.items);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load departments");
    } finally {
      setLoadingDepartments(false);
    }
  };

  const loadEmailIntegration = async () => {
    try {
      setLoadingEmailIntegration(true);
      const response = await settingsApi.getEmailIntegration();
      setEmailIntegration(response);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load email integration status");
    } finally {
      setLoadingEmailIntegration(false);
    }
  };

  const loadIntegrationStatuses = async () => {
    try {
      setLoadingIntegrationStatuses(true);
      const response = await settingsApi.getIntegrationStatuses();
      setIntegrationStatuses(response);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load integration statuses");
    } finally {
      setLoadingIntegrationStatuses(false);
    }
  };

  useEffect(() => {
    void loadWorkspaceSettings();
    void loadDepartments();
    void loadEmailIntegration();
    void loadIntegrationStatuses();
  }, []);

  const workspaceDirty = useMemo(() => {
    if (!initialWorkspaceSettings) {
      return false;
    }

    return JSON.stringify(workspaceSettings) !== JSON.stringify(initialWorkspaceSettings);
  }, [initialWorkspaceSettings, workspaceSettings]);

  const notificationRows: Array<{
    key: keyof WorkspaceSettings["notifications"];
    label: string;
    description: string;
  }> = [
    { key: "email", label: "Email notifications", description: "Receive email updates for important hiring activity" },
    { key: "inApp", label: "In-app notifications", description: "Show notification badges and inbox alerts in HireFlow" },
    { key: "newApplications", label: "New application alerts", description: "Notify recruiters when a candidate applies" },
    { key: "interviewReminders", label: "Interview reminder alerts", description: "Send reminders for scheduled interviews" },
    { key: "stageChanges", label: "Stage change alerts", description: "Track stage movement across the hiring pipeline" },
    { key: "dailyDigest", label: "Daily summary digest", description: "Future digest with a daily hiring summary" },
  ];

  const handleWorkspaceChange = <K extends keyof WorkspaceSettings>(key: K, value: WorkspaceSettings[K]) => {
    setWorkspaceSettings((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleOfficeWeekToggle = (day: WorkspaceSettings["officeWeek"][number], checked: boolean) => {
    setWorkspaceSettings((current) => {
      const nextDays = checked
        ? Array.from(new Set([...current.officeWeek, day]))
        : current.officeWeek.filter((entry) => entry !== day);

      return {
        ...current,
        officeWeek: nextDays.length > 0 ? nextDays : current.officeWeek,
      };
    });
  };

  const handleResumeFormatToggle = (
    format: WorkspaceSettings["hiringPreferences"]["allowedResumeFormats"][number],
    checked: boolean
  ) => {
    setWorkspaceSettings((current) => {
      const nextFormats = checked
        ? Array.from(new Set([...current.hiringPreferences.allowedResumeFormats, format]))
        : current.hiringPreferences.allowedResumeFormats.filter((entry) => entry !== format);

      return {
        ...current,
        hiringPreferences: {
          ...current.hiringPreferences,
          allowedResumeFormats: nextFormats.length > 0 ? nextFormats : current.hiringPreferences.allowedResumeFormats,
        },
      };
    });
  };

  const handleSaveWorkspace = async () => {
    try {
      setSavingWorkspace(true);
      const response = await settingsApi.updateWorkspace({
        workspaceName: workspaceSettings.workspaceName.trim(),
        companyName: workspaceSettings.companyName.trim(),
        defaultPipelineDisplay: workspaceSettings.defaultPipelineDisplay,
        defaultTimezone: workspaceSettings.defaultTimezone.trim(),
        defaultCurrency: workspaceSettings.defaultCurrency.trim().toUpperCase(),
        officeHours: workspaceSettings.officeHours,
        officeWeek: workspaceSettings.officeWeek,
        brandingLogo: workspaceSettings.brandingLogo.trim(),
        notifications: workspaceSettings.notifications,
        hiringPreferences: workspaceSettings.hiringPreferences,
        security: workspaceSettings.security,
        integrations: workspaceSettings.integrations,
      });
      const normalized = normalizeWorkspaceSettings(response.settings);
      setWorkspaceSettings(normalized);
      setInitialWorkspaceSettings(normalized);
      await loadIntegrationStatuses();
      toast.success("Workspace settings saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save workspace settings");
    } finally {
      setSavingWorkspace(false);
    }
  };

  const handleCreateDepartment = async () => {
    const nextName = departmentName.trim();

    if (!nextName) {
      toast.error("Department name is required");
      return;
    }

    try {
      setCreatingDepartment(true);
      const response = await departmentsApi.create({ name: nextName });
      setDepartments((current) =>
        [...current, response.item].sort((left, right) => left.name.localeCompare(right.name))
      );
      setDepartmentName("");
      toast.success("Department added");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to add department");
    } finally {
      setCreatingDepartment(false);
    }
  };

  const handleToggleDepartment = async (department: DepartmentItem, isActive: boolean) => {
    if (department.isLegacy) {
      toast.error("Legacy departments need to be recreated before they can be managed here");
      return;
    }

    try {
      setWorkingDepartmentId(department.id);
      const response = await departmentsApi.update(department.id, { isActive });
      setDepartments((current) =>
        current.map((item) => (item.id === department.id ? response.item : item))
      );
      toast.success(isActive ? "Department activated" : "Department archived");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update department");
    } finally {
      setWorkingDepartmentId(null);
    }
  };

  const handleSendTestEmail = async () => {
    try {
      setSendingTestEmail(true);
      const response = await settingsApi.sendTestEmail(testEmailRecipient.trim() || undefined);
      toast.success(response.message);
      if (response.recipientEmail) {
        setTestEmailRecipient(response.recipientEmail);
      }
      await loadEmailIntegration();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to send test email");
    } finally {
      setSendingTestEmail(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-muted-foreground">
          Manage workspace preferences, notifications, security, and integrations.
        </p>
      </div>

      <Tabs defaultValue="workspace" className="space-y-6">
        <TabsList className="h-auto flex-wrap justify-start gap-2 rounded-[22px] bg-muted/40 p-1.5">
          <TabsTrigger value="workspace" className="rounded-[18px] px-4 py-2.5">
            Workspace
          </TabsTrigger>
          <TabsTrigger value="notifications" className="rounded-[18px] px-4 py-2.5">
            Notifications
          </TabsTrigger>
          <TabsTrigger value="hiring" className="rounded-[18px] px-4 py-2.5">
            Hiring Preferences
          </TabsTrigger>
          <TabsTrigger value="security" className="rounded-[18px] px-4 py-2.5">
            Security
          </TabsTrigger>
          <TabsTrigger value="integrations" className="rounded-[18px] px-4 py-2.5">
            Integrations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="workspace" className="space-y-6">
          <Card className="rounded-[28px] border border-border/80 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Workspace Defaults
              </CardTitle>
              <CardDescription>
                Configure the core workspace values used across the ATS. These settings now persist for admins.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <Label>Workspace name</Label>
                <Input
                  value={workspaceSettings.workspaceName}
                  disabled={loadingWorkspace || savingWorkspace}
                  onChange={(event) => handleWorkspaceChange("workspaceName", event.target.value)}
                  className="h-11 rounded-2xl"
                  placeholder="HireFlow Workspace"
                />
              </div>
              <div className="space-y-2">
                <Label>Company name</Label>
                <Input
                  value={workspaceSettings.companyName}
                  disabled={loadingWorkspace || savingWorkspace}
                  onChange={(event) => handleWorkspaceChange("companyName", event.target.value)}
                  className="h-11 rounded-2xl"
                  placeholder="HireFlow Labs"
                />
              </div>
              <div className="space-y-2">
                <Label>Default timezone</Label>
                <Select
                  value={workspaceSettings.defaultTimezone}
                  disabled={loadingWorkspace || savingWorkspace}
                  onValueChange={(value) => handleWorkspaceChange("defaultTimezone", value)}
                >
                  <SelectTrigger className="h-11 rounded-2xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Asia/Kolkata">Asia/Kolkata</SelectItem>
                    <SelectItem value="UTC">UTC</SelectItem>
                    <SelectItem value="America/New_York">America/New_York</SelectItem>
                    <SelectItem value="Europe/London">Europe/London</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Default currency</Label>
                <Select
                  value={workspaceSettings.defaultCurrency}
                  disabled={loadingWorkspace || savingWorkspace}
                  onValueChange={(value) => handleWorkspaceChange("defaultCurrency", value)}
                >
                  <SelectTrigger className="h-11 rounded-2xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencyOptions.map((currency) => (
                      <SelectItem key={currency} value={currency}>
                        {currency}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Office hours start</Label>
                <Input
                  type="time"
                  value={workspaceSettings.officeHours.start}
                  disabled={loadingWorkspace || savingWorkspace}
                  onChange={(event) =>
                    setWorkspaceSettings((current) => ({
                      ...current,
                      officeHours: {
                        ...current.officeHours,
                        start: event.target.value,
                      },
                    }))
                  }
                  className="h-11 rounded-2xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Office hours end</Label>
                <Input
                  type="time"
                  value={workspaceSettings.officeHours.end}
                  disabled={loadingWorkspace || savingWorkspace}
                  onChange={(event) =>
                    setWorkspaceSettings((current) => ({
                      ...current,
                      officeHours: {
                        ...current.officeHours,
                        end: event.target.value,
                      },
                    }))
                  }
                  className="h-11 rounded-2xl"
                />
              </div>
              <div className="space-y-3 lg:col-span-2">
                <div className="space-y-1">
                  <Label>Office week</Label>
                  <p className="text-sm text-muted-foreground">
                    The interview calendar will use these days as the visible working week.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3 rounded-[22px] border border-border/80 bg-muted/20 p-4">
                  {officeDayOptions.map((day) => (
                    <label
                      key={day.value}
                      className="flex items-center gap-2 rounded-2xl border border-border/70 bg-background px-3 py-2 text-sm shadow-sm"
                    >
                      <Switch
                        checked={workspaceSettings.officeWeek.includes(day.value)}
                        disabled={loadingWorkspace || savingWorkspace}
                        onCheckedChange={(checked) => handleOfficeWeekToggle(day.value, checked)}
                      />
                      <span>{day.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="lg:col-span-2 flex flex-col gap-3 rounded-[22px] border border-border/80 bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">Save workspace configuration</p>
                  <p className="text-sm text-muted-foreground">
                    These defaults apply across the workspace and can be updated later from this admin-only page.
                  </p>
                </div>
                <Button
                  className="h-11 rounded-2xl"
                  disabled={loadingWorkspace || savingWorkspace || !workspaceDirty}
                  onClick={() => void handleSaveWorkspace()}
                >
                  {savingWorkspace ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save workspace
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[28px] border border-border/80 shadow-sm">
            <CardHeader>
              <CardTitle>Departments</CardTitle>
              <CardDescription>Add and manage the department list used across jobs and forms.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
                <Input
                  value={departmentName}
                  onChange={(event) => setDepartmentName(event.target.value)}
                  placeholder="Add a department like Engineering, Design, or Talent"
                  className="h-11 rounded-2xl"
                />
                <Button
                  className="h-11 rounded-2xl"
                  disabled={creatingDepartment}
                  onClick={() => void handleCreateDepartment()}
                >
                  {creatingDepartment ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                  Add department
                </Button>
              </div>

              <div className="space-y-2">
                {loadingDepartments ? (
                  <div className="rounded-[24px] border border-border/80 bg-muted/20 p-5 text-sm text-muted-foreground">
                    Loading departments...
                  </div>
                ) : departments.length === 0 ? (
                  <div className="rounded-[24px] border border-dashed border-border/80 bg-muted/20 p-5 text-sm text-muted-foreground">
                    No departments yet.
                  </div>
                ) : (
                  departments.map((department) => (
                    <div
                      key={department.id}
                      className="flex items-center justify-between gap-3 rounded-[20px] border border-border/80 bg-background/80 px-4 py-3 shadow-sm"
                    >
                      <div className="min-w-0 flex items-center gap-2">
                        <p className="truncate font-medium">{department.name}</p>
                        {department.isLegacy && (
                          <Badge variant="outline" className="rounded-full px-2 py-0.5 text-[11px]">
                            Legacy
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground">{department.isActive ? "Active" : "Archived"}</span>
                        <Switch
                          checked={department.isActive}
                          disabled={Boolean(workingDepartmentId) || department.isLegacy}
                          onCheckedChange={(checked) => void handleToggleDepartment(department, checked)}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card className="rounded-[28px] border border-border/80 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BellRing className="h-5 w-5 text-primary" />
                Notifications
              </CardTitle>
              <CardDescription>
                Configure which in-app and email notifications should be delivered across the workspace.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {notificationRows.map(({ key, label, description }) => (
                <div key={label} className="flex items-center justify-between gap-4 rounded-[22px] border border-border/80 bg-muted/20 px-4 py-3">
                  <div>
                    <p className="font-medium">{label}</p>
                    <p className="text-sm text-muted-foreground">{description}</p>
                  </div>
                  <Switch
                    checked={workspaceSettings.notifications[key]}
                    disabled={loadingWorkspace || savingWorkspace}
                    onCheckedChange={(checked) =>
                      setWorkspaceSettings((current) => ({
                        ...current,
                        notifications: {
                          ...current.notifications,
                          [key]: checked,
                        },
                      }))
                    }
                  />
                </div>
              ))}
              <div className="flex flex-col gap-3 rounded-[22px] border border-border/80 bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">Save notification preferences</p>
                  <p className="text-sm text-muted-foreground">
                    These settings now control the real notification and email delivery rules used by the workspace.
                  </p>
                </div>
                <Button
                  className="h-11 rounded-2xl"
                  disabled={loadingWorkspace || savingWorkspace || !workspaceDirty}
                  onClick={() => void handleSaveWorkspace()}
                >
                  {savingWorkspace ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save notifications
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hiring" className="space-y-6">
          <Card className="rounded-[28px] border border-border/80 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BriefcaseBusiness className="h-5 w-5 text-primary" />
                Hiring Preferences
              </CardTitle>
              <CardDescription>
                Save workspace-level hiring defaults so candidate intake and job creation start from a consistent baseline.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <Label>Default candidate source</Label>
                <Select
                  value={workspaceSettings.hiringPreferences.defaultCandidateSource}
                  disabled={loadingWorkspace || savingWorkspace}
                  onValueChange={(value) =>
                    setWorkspaceSettings((current) => ({
                      ...current,
                      hiringPreferences: {
                        ...current.hiringPreferences,
                        defaultCandidateSource: value as WorkspaceSettings["hiringPreferences"]["defaultCandidateSource"],
                      },
                    }))
                  }
                >
                  <SelectTrigger className="h-11 rounded-2xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">manual</SelectItem>
                    <SelectItem value="portal">portal</SelectItem>
                    <SelectItem value="referral">referral</SelectItem>
                    <SelectItem value="campus">campus</SelectItem>
                    <SelectItem value="linkedin">linkedin</SelectItem>
                    <SelectItem value="agency">agency</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Default job status</Label>
                <Select
                  value={workspaceSettings.hiringPreferences.defaultJobStatus}
                  disabled={loadingWorkspace || savingWorkspace}
                  onValueChange={(value) =>
                    setWorkspaceSettings((current) => ({
                      ...current,
                      hiringPreferences: {
                        ...current.hiringPreferences,
                        defaultJobStatus: value as WorkspaceSettings["hiringPreferences"]["defaultJobStatus"],
                      },
                    }))
                  }
                >
                  <SelectTrigger className="h-11 rounded-2xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">draft</SelectItem>
                    <SelectItem value="open">open</SelectItem>
                    <SelectItem value="closed">closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Resume file size limit</Label>
                <Input
                  type="number"
                  min={1}
                  max={25}
                  value={workspaceSettings.hiringPreferences.resumeFileSizeLimitMb}
                  disabled={loadingWorkspace || savingWorkspace}
                  onChange={(event) =>
                    setWorkspaceSettings((current) => ({
                      ...current,
                      hiringPreferences: {
                        ...current.hiringPreferences,
                        resumeFileSizeLimitMb: Number(event.target.value || 1),
                      },
                    }))
                  }
                  className="h-11 rounded-2xl"
                />
              </div>
              <div className="space-y-2 lg:col-span-2">
                <Label>Allowed resume formats</Label>
                <div className="flex flex-wrap gap-3 rounded-[22px] border border-border/80 bg-muted/20 p-4">
                  {resumeFormatOptions.map((format) => (
                    <label
                      key={format}
                      className="flex items-center gap-2 rounded-2xl border border-border/70 bg-background px-3 py-2 text-sm shadow-sm"
                    >
                      <Switch
                        checked={workspaceSettings.hiringPreferences.allowedResumeFormats.includes(format)}
                        disabled={loadingWorkspace || savingWorkspace}
                        onCheckedChange={(checked) => handleResumeFormatToggle(format, checked)}
                      />
                      <span>{format}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-2 lg:col-span-2">
                <Label>Duplicate application warning</Label>
                <div className="flex items-center justify-between rounded-[22px] border border-border/80 bg-muted/20 px-4 py-3">
                  <div>
                    <p className="font-medium">Warn when the same email applies to the same job</p>
                    <p className="text-sm text-muted-foreground">
                      Show an internal duplicate warning when a recruiter adds the same email to the same job again.
                    </p>
                  </div>
                  <Switch
                    checked={workspaceSettings.hiringPreferences.duplicateApplicationWarning}
                    disabled={loadingWorkspace || savingWorkspace}
                    onCheckedChange={(checked) =>
                      setWorkspaceSettings((current) => ({
                        ...current,
                        hiringPreferences: {
                          ...current.hiringPreferences,
                          duplicateApplicationWarning: checked,
                        },
                      }))
                    }
                  />
                </div>
              </div>
              <div className="lg:col-span-2 flex flex-col gap-3 rounded-[22px] border border-border/80 bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">Save hiring preferences</p>
                  <p className="text-sm text-muted-foreground">
                    These preferences now drive default job status, candidate source, duplicate warnings, and resume upload limits.
                  </p>
                </div>
                <Button
                  className="h-11 rounded-2xl"
                  disabled={loadingWorkspace || savingWorkspace || !workspaceDirty}
                  onClick={() => void handleSaveWorkspace()}
                >
                  {savingWorkspace ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save hiring preferences
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card className="rounded-[28px] border border-border/80 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LockKeyhole className="h-5 w-5 text-primary" />
                Security
              </CardTitle>
              <CardDescription>
                Save workspace security preferences now so auth behavior and admin controls have a clear policy source.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <Label>Session timeout (minutes)</Label>
                <Input
                  type="number"
                  min={5}
                  max={1440}
                  value={workspaceSettings.security.sessionTimeoutMinutes}
                  disabled={loadingWorkspace || savingWorkspace}
                  onChange={(event) =>
                    setWorkspaceSettings((current) => ({
                      ...current,
                      security: {
                        ...current.security,
                        sessionTimeoutMinutes: Number(event.target.value || 5),
                      },
                    }))
                  }
                  className="h-11 rounded-2xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Refresh token duration (days)</Label>
                <Input
                  type="number"
                  min={1}
                  max={90}
                  value={workspaceSettings.security.refreshTokenDurationDays}
                  disabled={loadingWorkspace || savingWorkspace}
                  onChange={(event) =>
                    setWorkspaceSettings((current) => ({
                      ...current,
                      security: {
                        ...current.security,
                        refreshTokenDurationDays: Number(event.target.value || 1),
                      },
                    }))
                  }
                  className="h-11 rounded-2xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Password minimum length</Label>
                <Input
                  type="number"
                  min={6}
                  max={32}
                  value={workspaceSettings.security.passwordMinLength}
                  disabled={loadingWorkspace || savingWorkspace}
                  onChange={(event) =>
                    setWorkspaceSettings((current) => ({
                      ...current,
                      security: {
                        ...current.security,
                        passwordMinLength: Number(event.target.value || 6),
                      },
                    }))
                  }
                  className="h-11 rounded-2xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Security controls</Label>
                <div className="space-y-3 rounded-[22px] border border-border/80 bg-muted/20 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium">Require strong passwords</p>
                      <p className="text-sm text-muted-foreground">Apply the workspace password policy to account creation and password changes.</p>
                    </div>
                    <Switch
                      checked={workspaceSettings.security.requireStrongPasswords}
                      disabled={loadingWorkspace || savingWorkspace}
                      onCheckedChange={(checked) =>
                        setWorkspaceSettings((current) => ({
                          ...current,
                          security: {
                            ...current.security,
                            requireStrongPasswords: checked,
                          },
                        }))
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium">Require two-factor authentication</p>
                      <p className="text-sm text-muted-foreground">Keep the workspace policy saved while the dedicated 2FA flow is completed.</p>
                    </div>
                    <Switch
                      checked={workspaceSettings.security.twoFactorRequired}
                      disabled={loadingWorkspace || savingWorkspace}
                      onCheckedChange={(checked) =>
                        setWorkspaceSettings((current) => ({
                          ...current,
                          security: {
                            ...current.security,
                            twoFactorRequired: checked,
                          },
                        }))
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium">Show login activity in admin UI</p>
                      <p className="text-sm text-muted-foreground">Keep login activity visible for admins in the product surfaces that support it.</p>
                    </div>
                    <Switch
                      checked={workspaceSettings.security.loginActivityVisible}
                      disabled={loadingWorkspace || savingWorkspace}
                      onCheckedChange={(checked) =>
                        setWorkspaceSettings((current) => ({
                          ...current,
                          security: {
                            ...current.security,
                            loginActivityVisible: checked,
                          },
                        }))
                      }
                    />
                  </div>
                </div>
              </div>
              <div className="lg:col-span-2 flex flex-col gap-3 rounded-[22px] border border-border/80 bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">Save security preferences</p>
                  <p className="text-sm text-muted-foreground">
                    These values now drive password policy and session lifetime behavior across auth and user-management flows.
                  </p>
                </div>
                <Button
                  className="h-11 rounded-2xl"
                  disabled={loadingWorkspace || savingWorkspace || !workspaceDirty}
                  onClick={() => void handleSaveWorkspace()}
                >
                  {savingWorkspace ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save security
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-6">
          <Card className="rounded-[28px] border border-border/80 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PlugZap className="h-5 w-5 text-primary" />
                Integrations
              </CardTitle>
              <CardDescription>
                Save provider settings here and monitor whether each backend integration is actually ready.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 lg:grid-cols-3">
                {[
                  {
                    title: "Resume storage",
                    icon: ShieldCheck,
                    badge: getIntegrationBadge(
                      integrationStatuses.resumeStorage.ready,
                      integrationStatuses.resumeStorage.configured,
                      "Config saved"
                    ),
                    message: loadingIntegrationStatuses
                      ? "Checking storage status..."
                      : integrationStatuses.resumeStorage.message,
                  },
                  {
                    title: "AI scoring",
                    icon: PlugZap,
                    badge: getIntegrationBadge(
                      integrationStatuses.aiScoring.ready,
                      integrationStatuses.aiScoring.configured,
                      integrationStatuses.aiScoring.provider === "disabled" ? "Disabled" : "Config saved"
                    ),
                    message: loadingIntegrationStatuses
                      ? "Checking AI provider status..."
                      : integrationStatuses.aiScoring.message,
                  },
                  {
                    title: "Calendar sync",
                    icon: CalendarSync,
                    badge: getIntegrationBadge(
                      integrationStatuses.calendar.ready,
                      integrationStatuses.calendar.configured,
                      integrationStatuses.calendar.enabled ? "Config saved" : "Disabled"
                    ),
                    message: loadingIntegrationStatuses
                      ? "Checking calendar status..."
                      : integrationStatuses.calendar.message,
                  },
                ].map(({ title, icon: Icon, badge, message }) => (
                  <div key={title} className="rounded-[22px] border border-border/80 bg-muted/20 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-primary" />
                        <p className="font-medium">{title}</p>
                      </div>
                      <Badge variant={badge.variant} className="rounded-full px-3 py-1">
                        {badge.label}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{message}</p>
                  </div>
                ))}
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-4 rounded-[22px] border border-border/80 bg-muted/20 p-4">
                  <div className="space-y-1">
                    <p className="font-medium">Resume storage</p>
                    <p className="text-sm text-muted-foreground">
                      Local storage works today. S3 settings are saved here and the backend reports whether credentials are ready.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Provider</Label>
                    <Select
                      value={workspaceSettings.integrations.resumeStorage.provider}
                      disabled={loadingWorkspace || savingWorkspace}
                      onValueChange={(value: WorkspaceSettings["integrations"]["resumeStorage"]["provider"]) =>
                        setWorkspaceSettings((current) => ({
                          ...current,
                          integrations: {
                            ...current.integrations,
                            resumeStorage: {
                              ...current.integrations.resumeStorage,
                              provider: value,
                            },
                          },
                        }))
                      }
                    >
                      <SelectTrigger className="h-11 rounded-2xl">
                        <SelectValue placeholder="Select provider" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="local">Local storage</SelectItem>
                        <SelectItem value="s3">AWS S3</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {workspaceSettings.integrations.resumeStorage.provider === "s3" ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>S3 bucket</Label>
                        <Input
                          value={workspaceSettings.integrations.resumeStorage.s3Bucket}
                          onChange={(event) =>
                            setWorkspaceSettings((current) => ({
                              ...current,
                              integrations: {
                                ...current.integrations,
                                resumeStorage: {
                                  ...current.integrations.resumeStorage,
                                  s3Bucket: event.target.value,
                                },
                              },
                            }))
                          }
                          className="h-11 rounded-2xl"
                          placeholder="hireflow-resumes"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>S3 region</Label>
                        <Input
                          value={workspaceSettings.integrations.resumeStorage.s3Region}
                          onChange={(event) =>
                            setWorkspaceSettings((current) => ({
                              ...current,
                              integrations: {
                                ...current.integrations,
                                resumeStorage: {
                                  ...current.integrations.resumeStorage,
                                  s3Region: event.target.value,
                                },
                              },
                            }))
                          }
                          className="h-11 rounded-2xl"
                          placeholder="ap-south-1"
                        />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label>S3 base path</Label>
                        <Input
                          value={workspaceSettings.integrations.resumeStorage.s3BasePath}
                          onChange={(event) =>
                            setWorkspaceSettings((current) => ({
                              ...current,
                              integrations: {
                                ...current.integrations,
                                resumeStorage: {
                                  ...current.integrations.resumeStorage,
                                  s3BasePath: event.target.value,
                                },
                              },
                            }))
                          }
                          className="h-11 rounded-2xl"
                          placeholder="resumes/"
                        />
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="space-y-4 rounded-[22px] border border-border/80 bg-muted/20 p-4">
                  <div className="space-y-1">
                    <p className="font-medium">AI scoring provider</p>
                    <p className="text-sm text-muted-foreground">
                      Choose the resume scoring provider and the model the backend should expect when scoring is enabled.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Provider</Label>
                    <Select
                      value={workspaceSettings.integrations.aiScoring.provider}
                      disabled={loadingWorkspace || savingWorkspace}
                      onValueChange={(value: WorkspaceSettings["integrations"]["aiScoring"]["provider"]) =>
                        setWorkspaceSettings((current) => ({
                          ...current,
                          integrations: {
                            ...current.integrations,
                            aiScoring: {
                              ...current.integrations.aiScoring,
                              provider: value,
                            },
                          },
                        }))
                      }
                    >
                      <SelectTrigger className="h-11 rounded-2xl">
                        <SelectValue placeholder="Select provider" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="openai">OpenAI</SelectItem>
                        <SelectItem value="disabled">Disabled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Model</Label>
                    <Input
                      value={workspaceSettings.integrations.aiScoring.model}
                      disabled={loadingWorkspace || savingWorkspace || workspaceSettings.integrations.aiScoring.provider === "disabled"}
                      onChange={(event) =>
                        setWorkspaceSettings((current) => ({
                          ...current,
                          integrations: {
                            ...current.integrations,
                            aiScoring: {
                              ...current.integrations.aiScoring,
                              model: event.target.value,
                            },
                          },
                        }))
                      }
                      className="h-11 rounded-2xl"
                      placeholder="gpt-4.1-mini"
                    />
                  </div>
                </div>

                <div className="space-y-4 rounded-[22px] border border-border/80 bg-muted/20 p-4 lg:col-span-2">
                  <div className="space-y-1">
                    <p className="font-medium">Calendar integration</p>
                    <p className="text-sm text-muted-foreground">
                      Save which calendar provider this workspace intends to use and who should appear as the organizer for invites.
                    </p>
                  </div>
                  <div className="grid gap-4 lg:grid-cols-[220px_220px_minmax(0,1fr)]">
                    <div className="space-y-2">
                      <Label>Provider</Label>
                      <Select
                        value={workspaceSettings.integrations.calendar.provider}
                        disabled={loadingWorkspace || savingWorkspace}
                        onValueChange={(value: WorkspaceSettings["integrations"]["calendar"]["provider"]) =>
                          setWorkspaceSettings((current) => ({
                            ...current,
                            integrations: {
                              ...current.integrations,
                              calendar: {
                                ...current.integrations.calendar,
                                provider: value,
                              },
                            },
                          }))
                        }
                      >
                        <SelectTrigger className="h-11 rounded-2xl">
                          <SelectValue placeholder="Select provider" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="google">Google Calendar</SelectItem>
                          <SelectItem value="outlook">Outlook</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Sync enabled</Label>
                      <div className="flex h-11 items-center justify-between rounded-2xl border border-input bg-background px-4">
                        <span className="text-sm text-muted-foreground">Allow calendar sync</span>
                        <Switch
                          checked={workspaceSettings.integrations.calendar.enabled}
                          disabled={loadingWorkspace || savingWorkspace}
                          onCheckedChange={(checked) =>
                            setWorkspaceSettings((current) => ({
                              ...current,
                              integrations: {
                                ...current.integrations,
                                calendar: {
                                  ...current.integrations.calendar,
                                  enabled: checked,
                                },
                              },
                            }))
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Organizer email</Label>
                      <Input
                        value={workspaceSettings.integrations.calendar.organizerEmail}
                        disabled={loadingWorkspace || savingWorkspace}
                        onChange={(event) =>
                          setWorkspaceSettings((current) => ({
                            ...current,
                            integrations: {
                              ...current.integrations,
                              calendar: {
                                ...current.integrations.calendar,
                                organizerEmail: event.target.value,
                              },
                            },
                          }))
                        }
                        className="h-11 rounded-2xl"
                        placeholder="scheduler@company.com"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  className="h-11 rounded-2xl"
                  disabled={loadingWorkspace || savingWorkspace || !workspaceDirty}
                  onClick={() => void handleSaveWorkspace()}
                >
                  {savingWorkspace ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save integrations
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[28px] border border-border/80 shadow-sm">
            <CardHeader>
              <CardTitle>Email delivery</CardTitle>
              <CardDescription>
                Monitor Brevo readiness and send a live test email from the server-side integration.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-[22px] border border-border/80 bg-muted/20 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">Provider status</p>
                    <Badge variant={emailIntegration.ready ? "secondary" : "outline"} className="rounded-full px-3 py-1">
                      {loadingEmailIntegration
                        ? "Loading"
                        : emailIntegration.ready
                          ? emailIntegration.sandboxMode
                            ? "Sandbox ready"
                            : "Ready"
                          : "Not ready"}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {loadingEmailIntegration
                      ? "Checking Brevo configuration..."
                      : emailIntegration.ready
                        ? "Brevo credentials are configured on the server."
                        : "Brevo credentials or sender details are missing."}
                  </p>
                </div>
                <div className="rounded-[22px] border border-border/80 bg-muted/20 p-4">
                  <p className="font-medium">Sender details</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {emailIntegration.senderName || "HireFlow"} {emailIntegration.senderEmail ? `| ${emailIntegration.senderEmail}` : "| Sender not configured"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Reply-to: {emailIntegration.replyToEmail || "Not set"}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
                <div className="space-y-2">
                  <Label>Test email recipient</Label>
                  <Input
                    value={testEmailRecipient}
                    onChange={(event) => setTestEmailRecipient(event.target.value)}
                    className="h-11 rounded-2xl"
                    placeholder="Leave blank to send to your admin email"
                  />
                </div>
                <Button
                  className="h-11 rounded-2xl self-end"
                  disabled={loadingEmailIntegration || sendingTestEmail || !emailIntegration.configured}
                  onClick={() => void handleSendTestEmail()}
                >
                  {sendingTestEmail ? (
                    <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  Send test email
                </Button>
              </div>

              <div className="rounded-[22px] border border-border/80 bg-muted/20 p-4 text-sm text-muted-foreground">
                <p>
                  API key: {emailIntegration.hasApiKey ? "Configured" : "Missing"} | Sandbox mode:{" "}
                  {emailIntegration.sandboxMode ? "Enabled" : "Disabled"}
                </p>
              </div>
            </CardContent>
          </Card>

        </TabsContent>
      </Tabs>
    </div>
  );
}
