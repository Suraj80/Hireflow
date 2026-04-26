import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, MoreHorizontal, MapPin, Users, Eye } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Link } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";

const jobs = [
  { id: 1, title: "Senior Frontend Developer", dept: "Engineering", location: "Remote", type: "Full-time", applicants: 45, status: "Active", posted: "Mar 15" },
  { id: 2, title: "Product Designer", dept: "Design", location: "New York", type: "Full-time", applicants: 32, status: "Active", posted: "Mar 12" },
  { id: 3, title: "Data Analyst", dept: "Analytics", location: "San Francisco", type: "Full-time", applicants: 28, status: "Active", posted: "Mar 10" },
  { id: 4, title: "Backend Engineer", dept: "Engineering", location: "Remote", type: "Full-time", applicants: 67, status: "Active", posted: "Mar 8" },
  { id: 5, title: "Marketing Manager", dept: "Marketing", location: "Chicago", type: "Full-time", applicants: 19, status: "Paused", posted: "Mar 5" },
  { id: 6, title: "DevOps Engineer", dept: "Engineering", location: "Remote", type: "Contract", applicants: 22, status: "Closed", posted: "Feb 28" },
];

const statusColors: Record<string, string> = {
  Active: "bg-success/10 text-success",
  Paused: "bg-warning/10 text-warning",
  Closed: "bg-muted text-muted-foreground",
};

export default function JobsPage() {
  const [search, setSearch] = useState("");
  const { user } = useAuth();
  const canManageJobs = user?.role === "admin" || user?.role === "recruiter";
  const filtered = jobs.filter((j) => j.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Jobs</h1>
          <p className="text-muted-foreground">Manage your open positions</p>
        </div>
        {canManageJobs && (
          <Link to="/jobs/new">
            <Button className="gradient-primary text-primary-foreground border-0">
              <Plus className="h-4 w-4 mr-2" /> Create Job
            </Button>
          </Link>
        )}
      </div>

      <Card className="border border-border">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search jobs..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select defaultValue="all">
              <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="all">
              <SelectTrigger className="w-40"><SelectValue placeholder="Department" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                <SelectItem value="engineering">Engineering</SelectItem>
                <SelectItem value="design">Design</SelectItem>
                <SelectItem value="marketing">Marketing</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job Title</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Applicants</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Posted</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((job) => (
                <TableRow key={job.id} className="hover:bg-muted/40 cursor-pointer">
                  <TableCell>
                    <div>
                      <p className="font-medium">{job.title}</p>
                      <p className="text-xs text-muted-foreground">{job.dept} · {job.type}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" /> {job.location}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1 text-sm">
                      <Users className="h-3.5 w-3.5 text-muted-foreground" /> {job.applicants}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={statusColors[job.status]}>{job.status}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{job.posted}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem><Eye className="h-4 w-4 mr-2" /> View</DropdownMenuItem>
                        {canManageJobs && <DropdownMenuItem>Edit</DropdownMenuItem>}
                        {canManageJobs && <DropdownMenuItem className="text-destructive">Close</DropdownMenuItem>}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
