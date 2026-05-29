import { useMemo, useState } from "react";
import { CalendarDays, Camera, KeyRound, Mail, ShieldCheck, UserRound } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/AuthProvider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDashboardDate } from "@/features/dashboard/helpers";

const roleLabel: Record<"admin" | "recruiter" | "viewer", string> = {
  admin: "Admin",
  recruiter: "Recruiter",
  viewer: "Viewer",
};

export default function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [avatar, setAvatar] = useState(user?.avatar || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const initials = useMemo(
    () =>
      (user?.name || "HireFlow User")
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("") || "HF",
    [user?.name]
  );

  if (!user) {
    return null;
  }

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }

    try {
      setSaving(true);
      await updateProfile({
        name: name.trim(),
        avatar: avatar.trim(),
        currentPassword: currentPassword || undefined,
        newPassword: newPassword || undefined,
      });
      setCurrentPassword("");
      setNewPassword("");
      toast.success("Profile updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        <p className="mt-1 text-muted-foreground">
          Review your account details and keep your personal profile up to date.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Card className="rounded-[28px] border border-border/80 shadow-sm">
          <CardContent className="space-y-6 p-6">
            <div className="flex flex-col items-center text-center">
              <Avatar className="h-24 w-24">
                {user.avatar ? <AvatarImage src={user.avatar} alt={user.name} /> : null}
                <AvatarFallback className="text-2xl gradient-primary text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <h2 className="mt-4 text-xl font-semibold">{user.name}</h2>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <Badge variant="outline" className="mt-3 rounded-full px-3 py-1">
                {roleLabel[user.role]}
              </Badge>
            </div>

            <div className="space-y-3 rounded-[24px] bg-muted/25 p-4 text-sm">
              <div className="flex items-center gap-3">
                <UserRound className="h-4 w-4 text-primary" />
                <span className="font-medium">Role</span>
                <span className="ml-auto text-muted-foreground">{roleLabel[user.role]}</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-primary" />
                <span className="font-medium">Email</span>
                <span className="ml-auto truncate text-muted-foreground">{user.email}</span>
              </div>
              <div className="flex items-center gap-3">
                <CalendarDays className="h-4 w-4 text-primary" />
                <span className="font-medium">Joined</span>
                <span className="ml-auto text-muted-foreground">{formatDashboardDate(user.createdAt)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="rounded-[28px] border border-border/80 shadow-sm">
            <CardHeader>
              <CardTitle>Profile Details</CardTitle>
              <CardDescription>
                Update your display information. Email and role are managed by the workspace.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="profile-name">Full name</Label>
                <Input
                  id="profile-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="h-11 rounded-2xl"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="profile-email">Email</Label>
                <Input id="profile-email" value={user.email} disabled className="h-11 rounded-2xl opacity-80" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="profile-avatar">Avatar URL</Label>
                <Input
                  id="profile-avatar"
                  value={avatar}
                  onChange={(event) => setAvatar(event.target.value)}
                  placeholder="https://example.com/avatar.png"
                  className="h-11 rounded-2xl"
                />
                <p className="text-xs text-muted-foreground">
                  File upload can be added later. For now, profile avatars use a direct image URL.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[28px] border border-border/80 shadow-sm">
            <CardHeader>
              <CardTitle>Password</CardTitle>
              <CardDescription>
                Change your password securely. Leave these fields empty if you do not want to update it.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="profile-current-password">Current password</Label>
                <Input
                  id="profile-current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  className="h-11 rounded-2xl"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="profile-new-password">New password</Label>
                <Input
                  id="profile-new-password"
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className="h-11 rounded-2xl"
                />
                <p className="text-xs text-muted-foreground">
                  Password updates require your current password and a minimum of 6 characters.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[28px] border border-border/80 shadow-sm">
            <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">Save profile changes</p>
                <p className="text-sm text-muted-foreground">
                  Changes apply to your current account only and do not affect workspace permissions.
                </p>
              </div>
              <Button className="h-11 rounded-2xl" disabled={saving} onClick={() => void handleSave()}>
                <ShieldCheck className="mr-2 h-4 w-4" />
                Save Profile
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
