import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { JobsFilters } from "@/features/jobs/types";
import { Search } from "lucide-react";

type JobFiltersProps = {
  filters: JobsFilters;
  departments: string[];
  onChange: (filters: Partial<JobsFilters>) => void;
  onReset: () => void;
};

export function JobFilters({ filters, departments, onChange, onReset }: JobFiltersProps) {
  return (
    <div className="rounded-3xl border border-border bg-card/80 p-4 shadow-sm">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 xl:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filters.search}
              onChange={(event) => onChange({ search: event.target.value })}
              placeholder="Search by title, department, or location"
              className="h-11 rounded-2xl pl-10"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-3 xl:w-[540px]">
            <Select value={filters.status} onValueChange={(value) => onChange({ status: value as JobsFilters["status"] })}>
              <SelectTrigger className="h-11 rounded-2xl">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.department} onValueChange={(value) => onChange({ department: value })}>
              <SelectTrigger className="h-11 rounded-2xl">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All departments</SelectItem>
                {departments.map((department) => (
                  <SelectItem key={department} value={department}>
                    {department}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filters.sort} onValueChange={(value) => onChange({ sort: value as JobsFilters["sort"] })}>
              <SelectTrigger className="h-11 rounded-2xl">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="oldest">Oldest</SelectItem>
                <SelectItem value="deadline">Deadline</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end">
          <Button type="button" variant="ghost" onClick={onReset} className="rounded-2xl">
            Reset filters
          </Button>
        </div>
      </div>
    </div>
  );
}
