import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, MoreHorizontal, Mail, Brain } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Link } from "react-router-dom";

const candidates = [
  { id: 1, name: "Sarah Chen", email: "sarah@email.com", role: "Senior Frontend Dev", score: 92, stage: "Final Round", initials: "SC", applied: "Mar 15" },
  { id: 2, name: "Alex Kim", email: "alex@email.com", role: "Product Designer", score: 87, stage: "Technical", initials: "AK", applied: "Mar 14" },
  { id: 3, name: "James Park", email: "james@email.com", role: "Backend Engineer", score: 78, stage: "Screening", initials: "JP", applied: "Mar 13" },
  { id: 4, name: "Maria Garcia", email: "maria@email.com", role: "Data Analyst", score: 95, stage: "Offer", initials: "MG", applied: "Mar 12" },
  { id: 5, name: "David Lee", email: "david@email.com", role: "DevOps Engineer", score: 65, stage: "Applied", initials: "DL", applied: "Mar 11" },
  { id: 6, name: "Emily Watson", email: "emily@email.com", role: "Marketing Manager", score: 72, stage: "Interview", initials: "EW", applied: "Mar 10" },
];

function scoreColor(score: number) {
  if (score >= 85) return "bg-success/10 text-success";
  if (score >= 70) return "bg-info/10 text-info";
  if (score >= 50) return "bg-warning/10 text-warning";
  return "bg-destructive/10 text-destructive";
}

const stageColors: Record<string, string> = {
  Applied: "bg-muted text-muted-foreground",
  Screening: "bg-info/10 text-info",
  Interview: "bg-primary/10 text-primary",
  Technical: "bg-warning/10 text-warning",
  "Final Round": "bg-success/10 text-success",
  Offer: "bg-success/15 text-success",
};

export default function CandidatesPage() {
  const [search, setSearch] = useState("");
  const filtered = candidates.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Candidates</h1>
        <p className="text-muted-foreground">Manage and review all applicants</p>
      </div>

      <Card className="border border-border">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search candidates..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select defaultValue="all">
              <SelectTrigger className="w-40"><SelectValue placeholder="Stage" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                <SelectItem value="applied">Applied</SelectItem>
                <SelectItem value="screening">Screening</SelectItem>
                <SelectItem value="interview">Interview</SelectItem>
                <SelectItem value="offer">Offer</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Candidate</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>AI Score</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Applied</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id} className="hover:bg-muted/40 cursor-pointer">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs gradient-primary text-primary-foreground">{c.initials}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{c.role}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={`${scoreColor(c.score)} font-semibold`}>
                      <Brain className="h-3 w-3 mr-1" /> {c.score}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={stageColors[c.stage] || ""}>{c.stage}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.applied}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>View Profile</DropdownMenuItem>
                        <DropdownMenuItem><Mail className="h-4 w-4 mr-2" /> Send Email</DropdownMenuItem>
                        <DropdownMenuItem>Move Stage</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">Reject</DropdownMenuItem>
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
