import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Shield, UserPlus, Settings, Trash2 } from "lucide-react";
import { useState } from "react";

const logs = [
  { id: 1, user: "John Doe", action: "Created job posting", target: "Senior Frontend Dev", time: "5 min ago", type: "create", icon: UserPlus },
  { id: 2, user: "Jane Smith", action: "Updated settings", target: "Email notifications", time: "1h ago", type: "update", icon: Settings },
  { id: 3, user: "John Doe", action: "Deleted candidate", target: "Test User", time: "2h ago", type: "delete", icon: Trash2 },
  { id: 4, user: "Jane Smith", action: "Changed role", target: "Mike Johnson → Admin", time: "3h ago", type: "security", icon: Shield },
  { id: 5, user: "John Doe", action: "Created job posting", target: "Product Designer", time: "5h ago", type: "create", icon: UserPlus },
  { id: 6, user: "Jane Smith", action: "Updated settings", target: "API keys", time: "1d ago", type: "update", icon: Settings },
];

const typeColors: Record<string, string> = {
  create: "bg-success/10 text-success",
  update: "bg-info/10 text-info",
  delete: "bg-destructive/10 text-destructive",
  security: "bg-warning/10 text-warning",
};

export default function AuditLogPage() {
  const [search, setSearch] = useState("");

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Audit Log</h1>
        <p className="text-muted-foreground">Track all system activity</p>
      </div>
      <Card className="border border-border">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search logs..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select defaultValue="all">
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="create">Create</SelectItem>
                <SelectItem value="update">Update</SelectItem>
                <SelectItem value="delete">Delete</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-medium text-sm">{log.user}</TableCell>
                  <TableCell className="text-sm">{log.action}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{log.target}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={typeColors[log.type]}>{log.type}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{log.time}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
