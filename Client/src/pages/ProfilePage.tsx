import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  KeyRound,
  Mail,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/AuthProvider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDashboardDate, formatDashboardRelative } from "@/features/dashboard/helpers";
import {
  getPasswordRequirementMessage,
  getPasswordStrength,
} from "@/features/users/password-strength";

const roleLabel: Record<"admin" | "recruiter" | "viewer", string> = {
  admin: "Admin",
  recruiter: "Recruiter",
  viewer: "Viewer",
};

function LoadingState() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-2">
        <Skeleton className="h-10 w-48 rounded-2xl" />
        <Skeleton className="h-5 w-80 rounded-xl" />
      </div>
      <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
        <Skeleton className="h-[520px] rounded-[32px]" />
        <div className="space-y-6">
          <Skeleton className="h-[280px] rounded-[32px]" />
          <Skeleton className="h-[330px] rounded-[32px]" />
          <Skeleton className="h-[96px] rounded-[32px]" />
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { user, isLoading, updateProfile } = useAuth();
  const [name, setName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) {
      return;
    }

    setName(user.name);
  }, [user]);

  const normalizedName = name.trim();
  const hasNameChange = Boolean(user) && normalizedName !== user.name;
  const hasPasswordChange = Boolean(currentPassword || newPassword || confirmPassword);
  const isDirty = hasNameChange || hasPasswordChange;
  const passwordStrength = useMemo(() => getPasswordStrength(newPassword), [newPassword]);

  if (isLoading) {
    return <LoadingState />;
  }

  if (!user) {
    return (
      <Alert className="rounded-[28px] border-destructive/20 bg-destructive/5">
        <AlertTitle>Unable to load profile</AlertTitle>
        <AlertDescription>
          Your session details are not available right now. Refresh the page or sign in again to continue.
        </AlertDescription>
      </Alert>
    );
  }

  const handleSave = async () => {
    if (!normalizedName) {
      toast.error("Name is required");
      return;
    }

    if (newPassword || confirmPassword || currentPassword) {
      if (!currentPassword) {
        toast.error("Current password is required to update your password");
        return;
      }

      if (!newPassword) {
        toast.error("Enter a new password to continue");
        return;
      }

      if (newPassword !== confirmPassword) {
        toast.error("New password and confirmation do not match");
        return;
      }
    }

    try {
      setSaving(true);
      await updateProfile({
        name: normalizedName,
        currentPassword: currentPassword || undefined,
        newPassword: newPassword || undefined,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Profile updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Profile</h1>
        <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
          Keep your hiring identity current, review workspace-managed details, and maintain account security.
        </p>
      </div>

      <div className="space-y-6">
        <Card className="overflow-hidden rounded-[32px] border border-border/70 bg-gradient-to-b from-card via-card to-primary/[0.04] shadow-[0_24px_70px_-32px_rgba(37,99,235,0.28)]">
          <div className="h-10 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_52%),radial-gradient(circle_at_top_right,rgba(124,58,237,0.12),transparent_42%)]" />
          <CardContent className="space-y-5 p-5 pt-4 sm:p-6 sm:pt-5">
            <div className="flex items-start gap-4">
              <span className="mt-1 h-3 w-3 rounded-full bg-emerald-500 shadow-[0_0_0_6px_rgba(16,185,129,0.12)]" />
              <div className="min-w-0 flex-1">
                <Badge variant="outline" className="rounded-full border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                  Active session
                </Badge>
                <h2 className="mt-3 truncate text-xl font-semibold">{user.name}</h2>
                <p className="truncate text-sm text-muted-foreground">{user.email}</p>
                <Badge variant="secondary" className="mt-3 rounded-full px-3 py-1 text-xs">
                  {roleLabel[user.role]}
                </Badge>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-[24px] border border-border/70 bg-background/75 p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Joined</p>
                    <p className="mt-1 text-sm font-medium">{formatDashboardDate(user.createdAt)}</p>
                  </div>
                </div>
              </div>
              <div className="rounded-[24px] border border-border/70 bg-background/75 p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <Clock3 className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Last login</p>
                    <p className="mt-1 text-sm font-medium">{formatDashboardRelative(user.lastLoginAt, "No login recorded yet")}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-border/70 bg-background/70 p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <Sparkles className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm font-medium">Workspace-managed access</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Email and role are controlled by your organization administrator to keep permissions aligned across the ATS.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[32px] border border-border/70 bg-card/95 shadow-[0_18px_50px_-32px_rgba(15,23,42,0.32)]">
          <CardHeader className="space-y-3 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <UserRound className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-xl">Profile Details</CardTitle>
                <CardDescription>
                  Update the personal details that appear across the workspace. Workspace identity fields stay read-only here.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="profile-name" className="text-sm font-medium text-foreground/90">
                Full name
              </Label>
              <Input
                id="profile-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="h-12 rounded-2xl border-border/70 bg-background/80 shadow-sm transition-all focus-visible:border-primary/60 focus-visible:ring-4 focus-visible:ring-primary/10"
                placeholder="Your full name"
              />
              <p className="text-xs text-muted-foreground">
                This updates how your name appears in comments, notes, and hiring activity across HireFlow.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-email" className="text-sm font-medium text-foreground/90">
                Email address
              </Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="profile-email"
                  value={user.email}
                  disabled
                  className="h-12 rounded-2xl border-border/70 bg-muted/30 pl-11 text-muted-foreground opacity-100"
                />
              </div>
              <p className="text-xs text-muted-foreground">Managed by your workspace administrator.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-role" className="text-sm font-medium text-foreground/90">
                Workspace role
              </Label>
              <div className="relative">
                <ShieldCheck className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="profile-role"
                  value={roleLabel[user.role]}
                  disabled
                  className="h-12 rounded-2xl border-border/70 bg-muted/30 pl-11 text-muted-foreground opacity-100"
                />
              </div>
              <p className="text-xs text-muted-foreground">Role changes are handled from Team Members by admins only.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[32px] border border-border/70 bg-card/95 shadow-[0_18px_50px_-32px_rgba(15,23,42,0.32)]">
          <CardHeader className="space-y-3 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-xl">Security</CardTitle>
                <CardDescription>
                  Change your password securely. Leave these fields empty if you do not need to update credentials today.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-5 lg:grid-cols-2">
              <div className="space-y-2 lg:col-span-2">
                <Label htmlFor="profile-current-password" className="text-sm font-medium text-foreground/90">
                  Current password
                </Label>
                <Input
                  id="profile-current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  className="h-12 rounded-2xl border-border/70 bg-background/80 shadow-sm transition-all focus-visible:border-primary/60 focus-visible:ring-4 focus-visible:ring-primary/10"
                  placeholder="Enter your current password"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile-new-password" className="text-sm font-medium text-foreground/90">
                  New password
                </Label>
                <Input
                  id="profile-new-password"
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className="h-12 rounded-2xl border-border/70 bg-background/80 shadow-sm transition-all focus-visible:border-primary/60 focus-visible:ring-4 focus-visible:ring-primary/10"
                  placeholder="Enter a new password"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile-confirm-password" className="text-sm font-medium text-foreground/90">
                  Confirm new password
                </Label>
                <Input
                  id="profile-confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="h-12 rounded-2xl border-border/70 bg-background/80 shadow-sm transition-all focus-visible:border-primary/60 focus-visible:ring-4 focus-visible:ring-primary/10"
                  placeholder="Re-enter the new password"
                />
              </div>
            </div>

            <div className="rounded-[24px] border border-border/70 bg-gradient-to-r from-background to-primary/[0.03] p-4 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium">Password strength</p>
                  <p className="mt-1 text-xs text-muted-foreground">{passwordStrength.hint}</p>
                </div>
                <Badge variant="outline" className={`rounded-full border-0 px-3 py-1 text-xs ${passwordStrength.tone}`}>
                  {passwordStrength.label}
                </Badge>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-500 via-blue-600 to-violet-600 transition-all"
                  style={{ width: `${passwordStrength.progress}%` }}
                />
              </div>
              {confirmPassword && newPassword !== confirmPassword ? (
                <p className="mt-3 text-xs text-destructive">Confirmation must match the new password before saving.</p>
              ) : (
                <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  {getPasswordRequirementMessage()}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="sticky bottom-4 z-10">
          <Card className="rounded-[28px] border border-border/70 bg-card/95 shadow-[0_20px_45px_-30px_rgba(15,23,42,0.35)] backdrop-blur">
            <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">Save profile changes</p>
                <p className="text-sm text-muted-foreground">
                  Changes apply only to your profile and do not affect workspace permissions.
                </p>
              </div>
              <Button
                className="h-11 min-w-[170px] rounded-2xl shadow-sm"
                disabled={
                  saving ||
                  !isDirty ||
                  !normalizedName ||
                  Boolean(confirmPassword && newPassword !== confirmPassword)
                }
                onClick={() => void handleSave()}
              >
                <ShieldCheck className="mr-2 h-4 w-4" />
                {saving ? "Saving..." : "Save changes"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
