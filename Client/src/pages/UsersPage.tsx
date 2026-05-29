import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { AlertCircle, MoreHorizontal, ShieldCheck, UserPlus, Users2 } from "lucide-react";
import { toast } from "sonner";
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
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

  const stats = useMemo(() => {
    const admins = users.filter((member) => member.role === "admin").length;
    const recruiters = users.filter((member) => member.role === "recruiter").length;
    const viewers = users.filter((member) => member.role === "viewer").length;

    return [
      { label: "Team members", value: users.length, hint: "Visible in this result set", icon: Users2 },
      { label: "Admins", value: admins, hint: "Full workspace access", icon: ShieldCheck },
      { label: "Recruiters", value: recruiters, hint: "Can manage jobs and candidates", icon: UserPlus },
      { label: "Viewers", value: viewers, hint: "Read-only workspace access", icon: AlertCircle },
    ];
  }, [users]);

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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="rounded-[28px] border border-border/80 shadow-sm">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                <stat.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-semibold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.hint}</p>
              </div>
            </CardContent>
          </Card>
        ))}
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
                    <TableHead>Created</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[80px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((member) => {
                    const isCurrentUser = member.id === user?.id;
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
                          <Badge variant="outline" className={roleBadgeClassName[member.role]}>
                            {roleLabel[member.role]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{formatDate(member.createdAt)}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="capitalize">
                            {member.status || "active"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                              <DropdownMenuLabel>Change role</DropdownMenuLabel>
                              {(["admin", "recruiter", "viewer"] as UserRole[]).map((option) => (
                                <DropdownMenuItem
                                  key={option}
                                  disabled={changingRoleId === member.id || (isCurrentUser && option !== "admin")}
                                  onClick={() => void handleRoleChange(member, option)}
                                >
                                  Make {roleLabel[option]}
                                </DropdownMenuItem>
                              ))}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem disabled>
                                Deactivate user
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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
                        disabled={changingRoleId === member.id || isCurrentUser}
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
                      <Button variant="outline" className="rounded-2xl justify-start" disabled>
                        Deactivate user
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
    </div>
  );
}
