import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { EmploymentType, JobsFilters } from "@/features/jobs/types";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { Search } from "lucide-react";

type JobFiltersProps = {
  filters: JobsFilters;
  departments: string[];
  onChange: (filters: Partial<JobsFilters>) => void;
  onReset: () => void;
};

export function JobFilters({ filters, departments, onChange, onReset }: JobFiltersProps) {
  const [searchInput, setSearchInput] = useState(filters.search);
  const debouncedSearch = useDebouncedValue(searchInput, 1500);
  const typeOptions: Array<{ value: EmploymentType; label: string }> = [
    { value: "full-time", label: "Full-time" },
    { value: "part-time", label: "Part-time" },
    { value: "contract", label: "Contract" },
    { value: "internship", label: "Internship" },
  ];

  useEffect(() => {
    setSearchInput(filters.search);
  }, [filters.search]);

  useEffect(() => {
    if (debouncedSearch !== filters.search) {
      onChange({ search: debouncedSearch });
    }
  }, [debouncedSearch, filters.search, onChange]);

  return (
    <div className="rounded-3xl border border-border bg-card/80 p-4 shadow-sm">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="relative xl:w-[320px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search by title"
              className="h-11 rounded-2xl pl-10"
              autoComplete="off"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:w-[420px]">
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
            <Select value={filters.jobType} onValueChange={(value) => onChange({ jobType: value as JobsFilters["jobType"] })}>
              <SelectTrigger className="h-11 rounded-2xl">
                <SelectValue placeholder="Job type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All job types</SelectItem>
                {typeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end xl:shrink-0">
          <Button type="button" variant="ghost" onClick={onReset} className="rounded-2xl">
            Reset filters
          </Button>
        </div>
      </div>
    </div>
  );
}
