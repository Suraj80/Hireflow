import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BellRing,
  BriefcaseBusiness,
  Building2,
  LockKeyhole,
  PlugZap,
  Save,
  ShieldCheck,
} from "lucide-react";

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
                Workspace
              </CardTitle>
              <CardDescription>
                Workspace-level settings are not yet backed by the server, so these values are shown as placeholders only.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <Label>Workspace name</Label>
                <Input value="HireFlow Workspace" disabled className="h-11 rounded-2xl opacity-80" />
              </div>
              <div className="space-y-2">
                <Label>Company name</Label>
                <Input value="HireFlow Labs" disabled className="h-11 rounded-2xl opacity-80" />
              </div>
              <div className="space-y-2">
                <Label>Default pipeline display</Label>
                <Select defaultValue="default" disabled>
                  <SelectTrigger className="h-11 rounded-2xl opacity-80">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Applied → Screening → Interview → Offer → Hired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Default timezone</Label>
                <Select defaultValue="asia-kolkata" disabled>
                  <SelectTrigger className="h-11 rounded-2xl opacity-80">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asia-kolkata">Asia/Kolkata</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Default currency</Label>
                <Input value="USD" disabled className="h-11 rounded-2xl opacity-80" />
              </div>
              <div className="space-y-2">
                <Label>Branding / logo</Label>
                <Input value="Workspace branding support coming soon" disabled className="h-11 rounded-2xl opacity-80" />
              </div>
            </CardContent>
          </Card>

          <ComingSoonCard
            title="Save workspace configuration"
            description="A dedicated settings API can be added later with GET /api/settings and PATCH /api/settings."
          />
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card className="rounded-[28px] border border-border/80 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BellRing className="h-5 w-5 text-primary" />
                Notifications
              </CardTitle>
              <CardDescription>
                Notification preferences are presented here for structure and future backend wiring.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                ["Email notifications", "Receive email updates for important hiring activity"],
                ["In-app notifications", "Show notification badges and inbox alerts in HireFlow"],
                ["New application alerts", "Notify recruiters when a candidate applies"],
                ["Interview reminder alerts", "Send reminders for scheduled interviews"],
                ["Stage change alerts", "Track stage movement across the hiring pipeline"],
                ["Daily summary digest", "Future digest with a daily hiring summary"],
              ].map(([label, description]) => (
                <div key={label} className="flex items-center justify-between gap-4 rounded-[22px] border border-border/80 bg-muted/20 px-4 py-3">
                  <div>
                    <p className="font-medium">{label}</p>
                    <p className="text-sm text-muted-foreground">{description}</p>
                  </div>
                  <Switch disabled />
                </div>
              ))}
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
                ["Email provider", "Nodemailer / Resend status placeholder"],
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

          <ComingSoonCard
            title="Integration management"
            description="Credential management, health checks, and provider configuration can be connected once a workspace settings backend exists."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
