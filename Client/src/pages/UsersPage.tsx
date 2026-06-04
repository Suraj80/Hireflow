import { useCallback, useDeferredValue, useEffect, useState } from "react";
import { AlertCircle, PencilLine, Trash2, UserPlus, Users2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/components/AuthProvider";
import { usersApi } from "@/features/users/api";
import { UserListItem, UserRole } from "@/features/users/types";

const roleOptions: Array<{ label: string; value: UserRole | "all" }> = [
  { label: "All roles", value: "all" },
  { label: "Admin", value: "admin" },
  { label: "Recruiter", value: "recruiter" },
  { label: "Viewer", value: "viewer" },
];

const roleLabel: Record<UserRole, string> = {
  admin: "Admin",
  recruiter: "Recruiter",
  viewer: "Viewer",
};

const roleBadgeClassName: Record<UserRole, string> = {
  admin: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  recruiter: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  viewer: "bg-slate-500/10 text-slate-700 border-slate-500/20",
};

function LoadingState() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-28 rounded-[28px]" />
      <Skeleton className="h-[420px] rounded-[28px]" />
    </div>
  );
}

function EmptyState({ onInvite }: { onInvite: () => void }) {
  return (
    <Card className="rounded-[28px] border border-dashed border-border/80 bg-card/70">
      <CardContent className="flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10">
          <Users2 className="h-8 w-8 text-primary" />
        </div>
        <h2 className="mt-5 text-xl font-semibold">No team members match this view</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Try broadening your filters or add a new teammate so they can access the hiring workspace.
        </p>
        <Button className="mt-6 h-11 rounded-2xl" onClick={onInvite}>
          <UserPlus className="mr-2 h-4 w-4" />
          Add user
        </Button>
      </CardContent>
    </Card>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export default function UsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<UserRole | "all">("all");
  const deferredSearch = useDeferredValue(search);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "viewer" as UserRole,
  });
  const [changingRoleId, setChangingRoleId] = useState<string | null>(null);
  const [statusChangingId, setStatusChangingId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [passwordDialogUser, setPasswordDialogUser] = useState<UserListItem | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [confirmAction, setConfirmAction] = useState<
    | {
        type: "status";
        user: UserListItem;
      }
    | {
        type: "delete";
        user: UserListItem;
      }
    | null
  >(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await usersApi.list({
        search: deferredSearch.trim(),
        role,
      });
      setUsers(response.items);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load users");
    } finally {
      setLoading(false);
    }
  }, [deferredSearch, role]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const resetForm = () => {
    setCreateForm({
      name: "",
      email: "",
      password: "",
      role: "viewer",
    });
  };

  const handleCreateUser = async () => {
    if (!createForm.name.trim() || !createForm.email.trim() || !createForm.password) {
      toast.error("Name, email, and password are required");
      return;
    }

    try {
      setSubmitting(true);
      const response = await usersApi.create({
        name: createForm.name.trim(),
        email: createForm.email.trim(),
        password: createForm.password,
        role: createForm.role,
      });
      setUsers((current) => [response.user, ...current]);
      setDialogOpen(false);
      resetForm();
      toast.success("User added successfully");
    } catch (createError) {
      toast.error(createError instanceof Error ? createError.message : "Unable to create user");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRoleChange = async (member: UserListItem, nextRole: UserRole) => {
    if (member.role === nextRole) {
      return;
    }

    try {
      setChangingRoleId(member.id);
      const response = await usersApi.updateRole(member.id, nextRole);
      setUsers((current) => current.map((item) => (item.id === member.id ? response.user : item)));
      toast.success(`Updated ${member.name}'s role`);
    } catch (updateError) {
      toast.error(updateError instanceof Error ? updateError.message : "Unable to update role");
    } finally {
      setChangingRoleId(null);
    }
  };

  const handleStatusChange = async (member: UserListItem, nextIsActive: boolean) => {
    try {
      setStatusChangingId(member.id);
      const response = await usersApi.updateStatus(member.id, nextIsActive);
      setUsers((current) => current.map((item) => (item.id === member.id ? response.user : item)));
      toast.success(nextIsActive ? `${member.name} reactivated` : `${member.name} deactivated`);
    } catch (updateError) {
      toast.error(updateError instanceof Error ? updateError.message : "Unable to update user status");
    } finally {
      setStatusChangingId(null);
      setConfirmAction(null);
    }
  };

  const handleDeleteUser = async (member: UserListItem) => {
    try {
      setDeletingUserId(member.id);
      await usersApi.delete(member.id);
      setUsers((current) => current.filter((item) => item.id !== member.id));
      toast.success(`${member.name} deleted`);
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : "Unable to delete user");
    } finally {
      setDeletingUserId(null);
      setConfirmAction(null);
    }
  };

  const handlePasswordUpdate = async () => {
    if (!passwordDialogUser) {
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    try {
      setPasswordSubmitting(true);
      const response = await usersApi.updatePassword(passwordDialogUser.id, newPassword);
      setUsers((current) =>
        current.map((item) => (item.id === passwordDialogUser.id ? response.user : item))
      );
      toast.success(`Password updated for ${passwordDialogUser.name}`);
      setPasswordDialogUser(null);
      setNewPassword("");
    } catch (updateError) {
      toast.error(updateError instanceof Error ? updateError.message : "Unable to update password");
    } finally {
      setPasswordSubmitting(false);
    }
  };

  const renderStatusActionLabel = (member: UserListItem) => (member.isActive ? "Deactivate user" : "Reactivate user");

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team Members</h1>
          <p className="mt-1 text-muted-foreground">
            Manage application users, roles, and access.
          </p>
        </div>
        <Button className="h-11 rounded-2xl self-start" onClick={() => setDialogOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Add new user
        </Button>
      </div>

      <Card className="rounded-[28px] border border-border/80 shadow-sm">
        <CardHeader className="gap-4">
          <div>
            <CardTitle>User Directory</CardTitle>
            <p className="text-sm text-muted-foreground">
              Search by name or email, then refine by role to keep access reviews quick.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_auto]">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search users by name or email"
              autoComplete="off"
              className="h-11 rounded-2xl"
            />
            <Select value={role} onValueChange={(value) => setRole(value as UserRole | "all")}>
              <SelectTrigger className="h-11 rounded-2xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roleOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" className="h-11 rounded-2xl" onClick={() => void loadUsers()}>
              Refresh
            </Button>
          </div>
        </CardHeader>
      </Card>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <Alert variant="destructive" className="rounded-[28px]">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Unable to load users</AlertTitle>
          <AlertDescription className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <span>{error}</span>
            <Button variant="outline" className="rounded-2xl" onClick={() => void loadUsers()}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      ) : users.length === 0 ? (
        <EmptyState onInvite={() => setDialogOpen(true)} />
      ) : (
        <>
          <Card className="hidden rounded-[28px] border border-border/80 shadow-sm md:block">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[120px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((member) => {
                    const isCurrentUser = member.id === user?.id;
                    const actionsDisabled =
                      changingRoleId === member.id || statusChangingId === member.id || deletingUserId === member.id;
                    return (
                      <TableRow key={member.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{member.name}</p>
                            {isCurrentUser && (
                              <p className="text-xs text-muted-foreground">Current admin session</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{member.email}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={roleBadgeClassName[member.role]}>
                              {roleLabel[member.role]}
                            </Badge>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-lg"
                                  disabled={changingRoleId === member.id || isCurrentUser || actionsDisabled}
                                  title="Change role"
                                >
                                  <PencilLine className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start" className="w-40">
                                {(["admin", "recruiter", "viewer"] as UserRole[]).map((option) => (
                                  <DropdownMenuItem
                                    key={option}
                                    disabled={member.role === option}
                                    onClick={() => void handleRoleChange(member, option)}
                                  >
                                    {roleLabel[option]}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="capitalize">
                            {member.status || "active"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 rounded-xl"
                              disabled={isCurrentUser || statusChangingId === member.id}
                              onClick={() => setConfirmAction({ type: "status", user: member })}
                              title={renderStatusActionLabel(member)}
                            >
                              <AlertCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 rounded-xl"
                              disabled={isCurrentUser || passwordSubmitting}
                              onClick={() => {
                                setPasswordDialogUser(member);
                                setNewPassword("");
                              }}
                              title="Update password"
                            >
                              <PencilLine className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 rounded-xl text-destructive hover:text-destructive"
                              disabled={isCurrentUser || deletingUserId === member.id}
                              onClick={() => setConfirmAction({ type: "delete", user: member })}
                              title="Delete user"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:hidden">
            {users.map((member) => {
              const isCurrentUser = member.id === user?.id;
              const actionsDisabled =
                changingRoleId === member.id || statusChangingId === member.id || deletingUserId === member.id;
              return (
                <Card key={member.id} className="rounded-[24px] border border-border/80 shadow-sm">
                  <CardContent className="space-y-4 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{member.name}</p>
                        <p className="text-sm text-muted-foreground">{member.email}</p>
                        {isCurrentUser && (
                          <p className="mt-1 text-xs text-muted-foreground">Current admin session</p>
                        )}
                      </div>
                      <Badge variant="outline" className={roleBadgeClassName[member.role]}>
                        {roleLabel[member.role]}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">Created</p>
                        <p className="font-medium">{formatDate(member.createdAt)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Status</p>
                        <Badge variant="secondary" className="mt-1 capitalize">
                          {member.status || "active"}
                        </Badge>
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-xs uppercase tracking-wide text-muted-foreground">Role</Label>
                      <Select
                        value={member.role}
                        onValueChange={(value) => void handleRoleChange(member, value as UserRole)}
                        disabled={changingRoleId === member.id || isCurrentUser || actionsDisabled}
                      >
                        <SelectTrigger className="h-11 rounded-2xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(["admin", "recruiter", "viewer"] as UserRole[]).map((option) => (
                            <SelectItem key={option} value={option}>
                              {roleLabel[option]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        className="rounded-2xl justify-start"
                        disabled={isCurrentUser || statusChangingId === member.id}
                        onClick={() => setConfirmAction({ type: "status", user: member })}
                      >
                        {renderStatusActionLabel(member)}
                      </Button>
                      <Button
                        variant="outline"
                        className="rounded-2xl justify-start"
                        disabled={isCurrentUser || passwordSubmitting}
                        onClick={() => {
                          setPasswordDialogUser(member);
                          setNewPassword("");
                        }}
                      >
                        Update password
                      </Button>
                      <Button
                        variant="outline"
                        className="rounded-2xl justify-start text-destructive hover:text-destructive"
                        disabled={isCurrentUser || deletingUserId === member.id}
                        onClick={() => setConfirmAction({ type: "delete", user: member })}
                      >
                        Delete user
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            resetForm();
          }
        }}
      >
        <DialogContent className="rounded-[28px] sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Add team member</DialogTitle>
            <DialogDescription>
              Create a new workspace user and assign the right level of access from day one.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="user-name">Full name</Label>
              <Input
                id="user-name"
                value={createForm.name}
                onChange={(event) => setCreateForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Taylor Brooks"
                autoComplete="off"
                className="h-11 rounded-2xl"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="user-email">Email</Label>
              <Input
                id="user-email"
                type="email"
                value={createForm.email}
                onChange={(event) => setCreateForm((current) => ({ ...current, email: event.target.value }))}
                placeholder="taylor@hireflow.com"
                autoComplete="off"
                className="h-11 rounded-2xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-password">Temporary password</Label>
              <Input
                id="user-password"
                type="password"
                value={createForm.password}
                onChange={(event) => setCreateForm((current) => ({ ...current, password: event.target.value }))}
                placeholder="Minimum 6 characters"
                autoComplete="new-password"
                className="h-11 rounded-2xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={createForm.role}
                onValueChange={(value) => setCreateForm((current) => ({ ...current, role: value as UserRole }))}
              >
                <SelectTrigger className="h-11 rounded-2xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["admin", "recruiter", "viewer"] as UserRole[]).map((option) => (
                    <SelectItem key={option} value={option}>
                      {roleLabel[option]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" className="rounded-2xl" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button className="rounded-2xl" disabled={submitting} onClick={() => void handleCreateUser()}>
              Create user
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(passwordDialogUser)}
        onOpenChange={(open) => {
          if (!open) {
            setPasswordDialogUser(null);
            setNewPassword("");
          }
        }}
      >
        <DialogContent className="rounded-[28px] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update password</DialogTitle>
            <DialogDescription>
              {passwordDialogUser
                ? `Set a new password for ${passwordDialogUser.name}. Their current sessions will be signed out.`
                : "Set a new password for this user."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="user-new-password">New password</Label>
            <Input
              id="user-new-password"
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="Minimum 6 characters"
              autoComplete="new-password"
              className="h-11 rounded-2xl"
            />
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              className="rounded-2xl"
              onClick={() => {
                setPasswordDialogUser(null);
                setNewPassword("");
              }}
            >
              Cancel
            </Button>
            <Button className="rounded-2xl" disabled={passwordSubmitting} onClick={() => void handlePasswordUpdate()}>
              Save password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(confirmAction)} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent className="rounded-[28px]">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === "delete"
                ? "Delete user?"
                : confirmAction?.user.isActive
                  ? "Deactivate user?"
                  : "Reactivate user?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === "delete"
                ? `${confirmAction.user.name} will be removed from the workspace. This cannot be undone.`
                : confirmAction?.user.isActive
                  ? `${confirmAction.user.name} will lose access immediately and their current sessions will be signed out.`
                  : `${confirmAction?.user.name} will be able to sign back in and use the workspace again.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-2xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-2xl"
              onClick={(event) => {
                event.preventDefault();

                if (!confirmAction) {
                  return;
                }

                if (confirmAction.type === "delete") {
                  void handleDeleteUser(confirmAction.user);
                  return;
                }

                void handleStatusChange(confirmAction.user, !confirmAction.user.isActive);
              }}
            >
              {confirmAction?.type === "delete"
                ? "Delete user"
                : confirmAction?.user.isActive
                  ? "Deactivate user"
                  : "Reactivate user"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
