import { useEffect, useState } from "react";
import { AxiosError } from "axios";
import { CalendarDays, Clock3, Eye, EyeOff, KeyRound, Mail, Pencil, ShieldCheck, UserRound, X } from "lucide-react";
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
import { MIN_PASSWORD_LENGTH, isPasswordValidForClient } from "@/features/users/password-strength";

const roleLabel: Record<"admin" | "recruiter" | "viewer", string> = {
  admin: "Admin",
  recruiter: "Recruiter",
  viewer: "Viewer",
};

const getFriendlyError = (error: unknown) => {
  const axiosError = error as AxiosError<{ message?: string; errors?: { message?: string }[] }>;
  return (
    axiosError.response?.data?.errors?.[0]?.message ||
    axiosError.response?.data?.message ||
    (error instanceof Error ? error.message : "Unable to update profile")
  );
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
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingSecurity, setSavingSecurity] = useState(false);
  const [currentPasswordError, setCurrentPasswordError] = useState("");
  const [newPasswordError, setNewPasswordError] = useState("");
  const [isEditingProfileDetails, setIsEditingProfileDetails] = useState(false);

  useEffect(() => {
    if (!user) {
      return;
    }

    setName(user.name);
    setEmail(user.email);
  }, [user]);

  const normalizedName = name.trim();
  const normalizedEmail = email.trim().toLowerCase();
  const hasNameChange = Boolean(user) && normalizedName !== user.name;
  const hasEmailChange = Boolean(user) && normalizedEmail !== user.email;
  const hasPasswordChange = Boolean(currentPassword || newPassword || confirmPassword);
  const hasProfileDetailsDirty = hasNameChange || hasEmailChange;

  const toggleProfileDetails = () => {
    if (!user) {
      return;
    }

    setIsEditingProfileDetails((open) => {
      if (open) {
        setName(user.name);
        setEmail(user.email);
      }
      return !open;
    });
  };

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

  const handleSaveProfileDetails = async () => {
    if (!normalizedName) {
      toast.error("Name is required");
      return;
    }

    if (!normalizedEmail) {
      toast.error("Email is required");
      return;
    }

    if (!hasProfileDetailsDirty) {
      return;
    }

    try {
      setSavingProfile(true);
      await updateProfile({
        name: normalizedName,
        email: normalizedEmail,
      });
      setIsEditingProfileDetails(false);
      toast.success("Profile details updated");
    } catch (error) {
      toast.error(getFriendlyError(error));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveSecurity = async () => {
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

    if (!isPasswordValidForClient(newPassword)) {
      const message = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
      setNewPasswordError(message);
      toast.error(message);
      return;
    }

    try {
      setCurrentPasswordError("");
      setNewPasswordError("");
      setSavingSecurity(true);
      await updateProfile({
        name: normalizedName || user.name,
        email: normalizedEmail || user.email,
        currentPassword,
        newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password updated");
    } catch (error) {
      const friendlyError = getFriendlyError(error);

      if (/current password/i.test(friendlyError)) {
        setCurrentPasswordError(friendlyError);
      } else if (/password/i.test(friendlyError)) {
        setNewPasswordError(friendlyError);
      }

      toast.error(friendlyError);
    } finally {
      setSavingSecurity(false);
    }
  };

  const passwordFieldsInvalid = Boolean(confirmPassword && newPassword !== confirmPassword);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Profile</h1>
        <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
          Keep your hiring identity current and maintain account security.
        </p>
      </div>

      <div className="space-y-6">
        {!isEditingProfileDetails ? (
          <Card className="rounded-[32px] border border-border/70 bg-card/95 shadow-[0_18px_50px_-32px_rgba(15,23,42,0.32)]">
            <CardContent className="space-y-5 p-5 sm:p-6">
              <div className="flex items-start gap-4">
                <span className="mt-1 h-3 w-3 shrink-0 rounded-full bg-emerald-500 shadow-[0_0_0_6px_rgba(16,185,129,0.12)]" />
                <div className="min-w-0 flex-1">
                  <Badge variant="outline" className="rounded-full border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                    Active session
                  </Badge>
                  <h2 className="mt-3 truncate text-xl font-semibold">{user.name}</h2>
                  <p className="truncate text-sm text-muted-foreground">{user.email}</p>
                  <p className="mt-3 text-sm font-medium text-foreground">Role: {roleLabel[user.role]}</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 shrink-0 rounded-2xl border-border/70"
                  aria-label="Edit profile details"
                  aria-expanded={false}
                  onClick={toggleProfileDetails}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
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
            </CardContent>
          </Card>
        ) : null}

        {isEditingProfileDetails ? (
          <Card className="rounded-[32px] border border-border/70 bg-card/95 shadow-[0_18px_50px_-32px_rgba(15,23,42,0.32)]">
            <CardHeader className="space-y-3 pb-4">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <UserRound className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-xl">Profile Details</CardTitle>
                  <CardDescription>
                    Update the personal details that appear across the workspace.
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 shrink-0 rounded-2xl border-border/70"
                  aria-label="Close profile details"
                  onClick={toggleProfileDetails}
                >
                  <X className="h-4 w-4" />
                </Button>
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
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="h-12 rounded-2xl border-border/70 bg-background/80 pl-11 shadow-sm transition-all focus-visible:border-primary/60 focus-visible:ring-4 focus-visible:ring-primary/10"
                    placeholder="you@example.com"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Used for sign-in and profile visibility across the workspace.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile-role" className="text-sm font-medium text-foreground/90">
                  Role
                </Label>
                <div className="relative">
                  <ShieldCheck className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="profile-role"
                    value={`Role: ${roleLabel[user.role]}`}
                    disabled
                    className="h-12 rounded-2xl border-border/70 bg-muted/30 pl-11 text-muted-foreground opacity-100"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Role changes are handled from Team Members by admins only.</p>
              </div>

              <div className="flex justify-end sm:col-span-2">
                <Button
                  type="button"
                  className="h-11 min-w-[170px] rounded-2xl shadow-sm"
                  disabled={savingProfile || !hasProfileDetailsDirty || !normalizedName || !normalizedEmail}
                  onClick={() => void handleSaveProfileDetails()}
                >
                  <UserRound className="mr-2 h-4 w-4" />
                  {savingProfile ? "Saving..." : "Save changes"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

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
                <div className="relative">
                  <Input
                    id="profile-current-password"
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(event) => {
                      setCurrentPassword(event.target.value);
                      if (currentPasswordError) {
                        setCurrentPasswordError("");
                      }
                    }}
                    className="h-12 rounded-2xl border-border/70 bg-background/80 pr-10 shadow-sm transition-all focus-visible:border-primary/60 focus-visible:ring-4 focus-visible:ring-primary/10"
                    placeholder="Enter your current password"
                  />
                  <button
                    type="button"
                    aria-label={showCurrentPassword ? "Hide current password" : "Show current password"}
                    className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground"
                    onClick={() => setShowCurrentPassword((current) => !current)}
                  >
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {currentPasswordError ? <p className="text-xs text-destructive">{currentPasswordError}</p> : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile-new-password" className="text-sm font-medium text-foreground/90">
                  New password
                </Label>
                <div className="relative">
                  <Input
                    id="profile-new-password"
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(event) => {
                      setNewPassword(event.target.value);
                      if (newPasswordError) {
                        setNewPasswordError("");
                      }
                    }}
                    className="h-12 rounded-2xl border-border/70 bg-background/80 pr-10 shadow-sm transition-all focus-visible:border-primary/60 focus-visible:ring-4 focus-visible:ring-primary/10"
                    placeholder="Enter a new password"
                  />
                  <button
                    type="button"
                    aria-label={showNewPassword ? "Hide new password" : "Show new password"}
                    className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground"
                    onClick={() => setShowNewPassword((current) => !current)}
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {newPasswordError ? <p className="text-xs text-destructive">{newPasswordError}</p> : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile-confirm-password" className="text-sm font-medium text-foreground/90">
                  Confirm new password
                </Label>
                <div className="relative">
                  <Input
                    id="profile-confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="h-12 rounded-2xl border-border/70 bg-background/80 pr-10 shadow-sm transition-all focus-visible:border-primary/60 focus-visible:ring-4 focus-visible:ring-primary/10"
                    placeholder="Re-enter the new password"
                  />
                  <button
                    type="button"
                    aria-label={showConfirmPassword ? "Hide confirmation password" : "Show confirmation password"}
                    className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground"
                    onClick={() => setShowConfirmPassword((current) => !current)}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {confirmPassword && newPassword !== confirmPassword ? (
                  <p className="text-xs text-destructive">Passwords do not match.</p>
                ) : null}
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                type="button"
                className="h-11 min-w-[170px] rounded-2xl shadow-sm"
                disabled={
                  savingSecurity ||
                  !hasPasswordChange ||
                  passwordFieldsInvalid ||
                  !currentPassword ||
                  !newPassword ||
                  !confirmPassword
                }
                onClick={() => void handleSaveSecurity()}
              >
                <ShieldCheck className="mr-2 h-4 w-4" />
                {savingSecurity ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
