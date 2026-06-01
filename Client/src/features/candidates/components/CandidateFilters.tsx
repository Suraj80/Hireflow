import { RotateCcw, Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CandidateFilters as CandidateFiltersType, CandidateMeta } from "@/features/candidates/types";
import { sourceLabels } from "@/features/candidates/helpers";

type CandidateFiltersProps = {
  filters: CandidateFiltersType;
  meta: CandidateMeta;
  onChange: (filters: Partial<CandidateFiltersType>) => void;
  onReset: () => void;
};

export function CandidateFilters({
  filters,
  meta,
  onChange,
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
            Narrow the candidate list by job, department, stage, source, or status.
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

      </CardContent>
    </Card>
  );
}
