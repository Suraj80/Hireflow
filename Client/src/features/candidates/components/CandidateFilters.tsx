import { RotateCcw, Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CandidateFilters as CandidateFiltersType, CandidateMeta, CandidatePagination } from "@/features/candidates/types";
import { sourceLabels } from "@/features/candidates/helpers";

type CandidateFiltersProps = {
  filters: CandidateFiltersType;
  meta: CandidateMeta;
  pagination: CandidatePagination;
  onChange: (filters: Partial<CandidateFiltersType>) => void;
  onLimitChange: (limit: CandidatePagination["limit"]) => void;
  onReset: () => void;
};

export function CandidateFilters({
  filters,
  meta,
  pagination,
  onChange,
  onLimitChange,
  onReset,
}: CandidateFiltersProps) {
  return (
    <Card className="rounded-[28px] border border-border/80 shadow-sm">
      <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <SlidersHorizontal className="h-5 w-5 text-primary" />
            Search and filters
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Slice by recruiter, stage, source, date, or score without leaving the pipeline view.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative min-w-[240px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filters.search}
              onChange={(event) => onChange({ search: event.target.value })}
              placeholder="Search name, email, phone"
              className="h-11 rounded-2xl pl-9"
            />
          </div>
          <Button type="button" variant="outline" className="h-11 rounded-2xl" onClick={onReset}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="space-y-2">
          <Label>Job</Label>
          <Select value={filters.job} onValueChange={(value) => onChange({ job: value })}>
            <SelectTrigger className="h-11 rounded-2xl">
              <SelectValue placeholder="All jobs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All jobs</SelectItem>
              {meta.jobs.map((job) => (
                <SelectItem key={job.id} value={job.id}>
                  {job.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Department</Label>
          <Select value={filters.department} onValueChange={(value) => onChange({ department: value })}>
            <SelectTrigger className="h-11 rounded-2xl">
              <SelectValue placeholder="All departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All departments</SelectItem>
              {meta.departments.map((department) => (
                <SelectItem key={department} value={department}>
                  {department}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Stage</Label>
          <Select
            value={filters.stage}
            onValueChange={(value) => onChange({ stage: value as CandidateFiltersType["stage"] })}
          >
            <SelectTrigger className="h-11 rounded-2xl">
              <SelectValue placeholder="All stages" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All stages</SelectItem>
              {meta.stages.map((stage) => (
                <SelectItem key={stage} value={stage}>
                  {stage}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Source</Label>
          <Select
            value={filters.source}
            onValueChange={(value) => onChange({ source: value as CandidateFiltersType["source"] })}
          >
            <SelectTrigger className="h-11 rounded-2xl">
              <SelectValue placeholder="All sources" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sources</SelectItem>
              {meta.sources.map((source) => (
                <SelectItem key={source} value={source}>
                  {sourceLabels[source]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Recruiter</Label>
          <Select value={filters.recruiter} onValueChange={(value) => onChange({ recruiter: value })}>
            <SelectTrigger className="h-11 rounded-2xl">
              <SelectValue placeholder="All recruiters" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All recruiters</SelectItem>
              {meta.recruiters.map((recruiter) => (
                <SelectItem key={recruiter.id} value={recruiter.id}>
                  {recruiter.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Status</Label>
          <Select
            value={filters.status}
            onValueChange={(value) => onChange({ status: value as CandidateFiltersType["status"] })}
          >
            <SelectTrigger className="h-11 rounded-2xl">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {meta.statuses.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Applied from</Label>
          <Input
            type="date"
            value={filters.appliedFrom}
            onChange={(event) => onChange({ appliedFrom: event.target.value })}
            className="h-11 rounded-2xl"
          />
        </div>

        <div className="space-y-2">
          <Label>Applied to</Label>
          <Input
            type="date"
            value={filters.appliedTo}
            onChange={(event) => onChange({ appliedTo: event.target.value })}
            className="h-11 rounded-2xl"
          />
        </div>

        <div className="space-y-2">
          <Label>AI score min</Label>
          <Input
            type="number"
            min={0}
            max={100}
            value={filters.aiScoreMin ?? ""}
            onChange={(event) => onChange({ aiScoreMin: event.target.value === "" ? null : Number(event.target.value) })}
            className="h-11 rounded-2xl"
            placeholder="0"
          />
        </div>

        <div className="space-y-2">
          <Label>AI score max</Label>
          <Input
            type="number"
            min={0}
            max={100}
            value={filters.aiScoreMax ?? ""}
            onChange={(event) => onChange({ aiScoreMax: event.target.value === "" ? null : Number(event.target.value) })}
            className="h-11 rounded-2xl"
            placeholder="100"
          />
        </div>

        <div className="space-y-2">
          <Label>Sort</Label>
          <Select value={filters.sort} onValueChange={(value) => onChange({ sort: value as CandidateFiltersType["sort"] })}>
            <SelectTrigger className="h-11 rounded-2xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="oldest">Oldest</SelectItem>
              <SelectItem value="highest-ai">Highest AI score</SelectItem>
              <SelectItem value="stage">Stage</SelectItem>
              <SelectItem value="name">Name A-Z</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Rows per page</Label>
          <Select
            value={String(pagination.limit)}
            onValueChange={(value) => onLimitChange(Number(value) as CandidatePagination["limit"])}
          >
            <SelectTrigger className="h-11 rounded-2xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[10, 25, 50, 100].map((limit) => (
                <SelectItem key={limit} value={String(limit)}>
                  {limit} rows
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
