import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Brain, GripVertical, MoreHorizontal, Plus } from "lucide-react";

type Candidate = { id: number; name: string; role: string; score: number; initials: string; avatar?: string };

const initialColumns: { id: string; title: string; color: string; candidates: Candidate[] }[] = [
  {
    id: "applied",
    title: "Applied",
    color: "bg-muted-foreground",
    candidates: [
      { id: 1, name: "David Lee", role: "DevOps Engineer", score: 65, initials: "DL" },
      { id: 2, name: "Tom Wilson", role: "QA Engineer", score: 58, initials: "TW" },
    ],
  },
  {
    id: "screening",
    title: "Screening",
    color: "bg-info",
    candidates: [
      { id: 3, name: "James Park", role: "Backend Engineer", score: 78, initials: "JP" },
    ],
  },
  {
    id: "interview",
    title: "Interview",
    color: "bg-primary",
    candidates: [
      { id: 4, name: "Emily Watson", role: "Marketing Manager", score: 72, initials: "EW" },
      { id: 5, name: "Alex Kim", role: "Product Designer", score: 87, initials: "AK" },
    ],
  },
  {
    id: "final",
    title: "Final Round",
    color: "bg-warning",
    candidates: [
      { id: 6, name: "Sarah Chen", role: "Senior Frontend Dev", score: 92, initials: "SC" },
    ],
  },
  {
    id: "offer",
    title: "Offer",
    color: "bg-success",
    candidates: [
      { id: 7, name: "Maria Garcia", role: "Data Analyst", score: 95, initials: "MG" },
    ],
  },
];

function scoreColor(score: number) {
  if (score >= 85) return "text-success";
  if (score >= 70) return "text-info";
  if (score >= 50) return "text-warning";
  return "text-destructive";
}

export default function PipelinePage() {
  const [columns] = useState(initialColumns);
  const [draggedCandidate, setDraggedCandidate] = useState<{ candidate: Candidate; fromCol: string } | null>(null);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pipeline</h1>
          <p className="text-muted-foreground">Drag and drop candidates between stages</p>
        </div>
        <Select defaultValue="all">
          <SelectTrigger className="w-48"><SelectValue placeholder="Filter by job" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Jobs</SelectItem>
            <SelectItem value="frontend">Senior Frontend Dev</SelectItem>
            <SelectItem value="designer">Product Designer</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((col) => (
          <div key={col.id} className="flex-shrink-0 w-72">
            <div className="flex items-center gap-2 mb-3 px-1">
              <div className={`h-2.5 w-2.5 rounded-full ${col.color}`} />
              <h3 className="text-sm font-semibold">{col.title}</h3>
              <Badge variant="secondary" className="text-xs h-5 ml-auto">{col.candidates.length}</Badge>
            </div>
            <div
              className="space-y-2 min-h-[200px] p-2 rounded-xl bg-muted/30 border border-border/50"
              onDragOver={(e) => e.preventDefault()}
            >
              {col.candidates.map((c) => (
                <Card
                  key={c.id}
                  draggable
                  onDragStart={() => setDraggedCandidate({ candidate: c, fromCol: col.id })}
                  className="border border-border hover:shadow-elevated transition-all cursor-grab active:cursor-grabbing hover:-translate-y-0.5"
                >
                  <CardContent className="p-3">
                    <div className="flex items-start gap-2.5">
                      <Avatar className="h-8 w-8 mt-0.5">
                        <AvatarFallback className="text-xs gradient-primary text-primary-foreground">{c.initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.role}</p>
                        <div className="flex items-center gap-1 mt-1.5">
                          <Brain className={`h-3 w-3 ${scoreColor(c.score)}`} />
                          <span className={`text-xs font-semibold ${scoreColor(c.score)}`}>{c.score}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
