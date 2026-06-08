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
import { EmailIntegrationStatus, WorkspaceSettings } from "@/features/settings/types";
import {
  BellRing,
  BriefcaseBusiness,
  Building2,
  LoaderCircle,
  LockKeyhole,
  Plus,
  PlugZap,
  Save,
  Send,
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
};

const currencyOptions = ["USD", "EUR", "GBP", "INR", "AED", "CAD", "AUD", "SGD"];
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

const normalizeWorkspaceSettings = (settings: Partial<WorkspaceSettings> | null | undefined): WorkspaceSettings => ({
  ...defaultWorkspaceSettings,
  ...settings,
  notifications: {
    ...defaultNotificationSettings,
    ...(settings?.notifications || {}),
  },
});

function ComingSoonCard({
  title,
  description,
  actionLabel = "Coming soon",
}: {
  title: string;
  description: string;
  actionLabel?: string;
}) {
  return (
    <Card className="rounded-[28px] border border-border/80 shadow-sm">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
          Placeholder
        </Badge>
        <Button variant="outline" className="rounded-2xl" disabled>
          {actionLabel}
        </Button>
      </CardContent>
    </Card>
  );
}

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

  useEffect(() => {
    void loadWorkspaceSettings();
    void loadDepartments();
    void loadEmailIntegration();
  }, []);

  const activeDepartments = useMemo(
    () => departments.filter((department) => department.isActive),
    [departments]
  );

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
      });
      const normalized = normalizeWorkspaceSettings(response.settings);
      setWorkspaceSettings(normalized);
      setInitialWorkspaceSettings(normalized);
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
                <Label>Default pipeline display</Label>
                <Select
                  value={workspaceSettings.defaultPipelineDisplay}
                  disabled={loadingWorkspace || savingWorkspace}
                  onValueChange={(value) => handleWorkspaceChange("defaultPipelineDisplay", value)}
                >
                  <SelectTrigger className="h-11 rounded-2xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Applied -> Screening -> Interview -> Offer -> Hired">
                      Applied → Screening → Interview → Offer → Hired
                    </SelectItem>
                  </SelectContent>
                </Select>
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
                <Label>Branding / logo</Label>
                <Input
                  value={workspaceSettings.brandingLogo}
                  disabled={loadingWorkspace || savingWorkspace}
                  onChange={(event) => handleWorkspaceChange("brandingLogo", event.target.value)}
                  className="h-11 rounded-2xl"
                  placeholder="Logo URL or branding note"
                />
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
              <CardDescription>
                Add departments once here, then reuse them in job creation and filters to avoid typos and reporting drift.
              </CardDescription>
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

              <div className="rounded-[24px] border border-border/80 bg-muted/20 p-4">
                <p className="text-sm font-medium">Active departments</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {loadingDepartments
                    ? "Loading department list..."
                    : `${activeDepartments.length} active department${activeDepartments.length === 1 ? "" : "s"} available for jobs.`}
                </p>
              </div>

              <div className="space-y-3">
                {loadingDepartments ? (
                  <div className="rounded-[24px] border border-border/80 bg-muted/20 p-5 text-sm text-muted-foreground">
                    Loading departments...
                  </div>
                ) : departments.length === 0 ? (
                  <div className="rounded-[24px] border border-dashed border-border/80 bg-muted/20 p-5 text-sm text-muted-foreground">
                    No departments exist yet. Add your first department to start using dropdown-based selection in job forms.
                  </div>
                ) : (
                  departments.map((department) => (
                    <div
                      key={department.id}
                      className="flex flex-col gap-4 rounded-[24px] border border-border/80 bg-background/80 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{department.name}</p>
                          <Badge variant={department.isActive ? "secondary" : "outline"} className="rounded-full px-2.5 py-1 text-xs">
                            {department.isActive ? "Active" : "Archived"}
                          </Badge>
                          {department.isLegacy && (
                            <Badge variant="outline" className="rounded-full px-2.5 py-1 text-xs">
                              Legacy
                            </Badge>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {department.isLegacy
                            ? "This department exists on older job records. Recreate it here if you want full settings control."
                            : "Used in structured job creation and downstream filtering."}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground">Available in forms</span>
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
                These defaults reflect the current product behavior and can be connected to a settings API later.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <Label>Default candidate source</Label>
                <Input value="manual" disabled className="h-11 rounded-2xl opacity-80" />
              </div>
              <div className="space-y-2">
                <Label>Default job status</Label>
                <Input value="draft" disabled className="h-11 rounded-2xl opacity-80" />
              </div>
              <div className="space-y-2">
                <Label>Resume file size limit</Label>
                <Input value="5 MB" disabled className="h-11 rounded-2xl opacity-80" />
              </div>
              <div className="space-y-2">
                <Label>Allowed resume formats</Label>
                <Input value="PDF, DOC, DOCX" disabled className="h-11 rounded-2xl opacity-80" />
              </div>
              <div className="space-y-2 lg:col-span-2">
                <Label>Duplicate application warning</Label>
                <div className="flex items-center justify-between rounded-[22px] border border-border/80 bg-muted/20 px-4 py-3">
                  <div>
                    <p className="font-medium">Warn when the same email applies to the same job</p>
                    <p className="text-sm text-muted-foreground">
                      This behavior exists in candidate creation flow and is shown here as a workspace preference placeholder.
                    </p>
                  </div>
                  <Switch checked disabled />
                </div>
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
                These values are derived from the current authentication implementation and future roadmap items.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-[22px] border border-border/80 bg-muted/20 p-4">
                <p className="font-medium">Session timeout</p>
                <p className="mt-1 text-sm text-muted-foreground">15 minutes access token lifetime</p>
              </div>
              <div className="rounded-[22px] border border-border/80 bg-muted/20 p-4">
                <p className="font-medium">Refresh token duration</p>
                <p className="mt-1 text-sm text-muted-foreground">7 days rolling refresh window</p>
              </div>
              <div className="rounded-[22px] border border-border/80 bg-muted/20 p-4">
                <p className="font-medium">Password policy</p>
                <p className="mt-1 text-sm text-muted-foreground">Minimum 6 characters, hashed before storage</p>
              </div>
              <div className="rounded-[22px] border border-border/80 bg-muted/20 p-4">
                <p className="font-medium">Two-factor authentication</p>
                <p className="mt-1 text-sm text-muted-foreground">Planned for a future security release</p>
              </div>
              <div className="rounded-[22px] border border-border/80 bg-muted/20 p-4 lg:col-span-2">
                <p className="font-medium">Login activity</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Session history and login activity auditing are not exposed in the UI yet.
                </p>
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
                Service wiring is surfaced here as status placeholders until a dedicated settings service exists.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-2">
              {[
                ["S3 resume storage", "Resume storage configuration placeholder"],
                ["OpenAI scoring", "Resume scoring provider status placeholder"],
                ["Calendar integration", "Calendar sync support planned for future"],
              ].map(([label, description]) => (
                <div key={label} className="rounded-[22px] border border-border/80 bg-muted/20 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{label}</p>
                    <Badge variant="outline" className="rounded-full px-3 py-1">
                      Placeholder
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{description}</p>
                </div>
              ))}
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

          <ComingSoonCard
            title="Integration management"
            description="Credential management, health checks, and provider configuration can be connected once a workspace settings backend exists."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
