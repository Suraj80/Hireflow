import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InterviewFilters as InterviewFiltersType, InterviewMeta } from "@/features/interviews/types";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

type InterviewFiltersProps = {
  filters: InterviewFiltersType;
  meta: InterviewMeta;
  onChange: (value: Partial<InterviewFiltersType>) => void;
};

export function InterviewFilters({ filters, meta, onChange }: InterviewFiltersProps) {
  const [searchInput, setSearchInput] = useState(filters.search);
  const debouncedSearch = useDebouncedValue(searchInput, 1500);
  const teams = Array.from(new Set(meta.jobs.map((job) => job.department))).filter(Boolean).sort();

  useEffect(() => {
    setSearchInput(filters.search);
  }, [filters.search]);

  useEffect(() => {
    if (debouncedSearch !== filters.search) {
      onChange({ search: debouncedSearch });
    }
  }, [debouncedSearch, filters.search, onChange]);

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
      <Input
        value={searchInput}
        onChange={(event) => setSearchInput(event.target.value)}
        placeholder="Search candidate"
        className="h-11 rounded-2xl"
        autoComplete="off"
      />
      <Select value={filters.team} onValueChange={(value) => onChange({ team: value })}>
        <SelectTrigger className="h-11 rounded-2xl">
          <SelectValue placeholder="Team" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All teams</SelectItem>
          {teams.map((team) => (
            <SelectItem key={team} value={team}>
              {team}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={filters.interviewer} onValueChange={(value) => onChange({ interviewer: value })}>
        <SelectTrigger className="h-11 rounded-2xl">
          <SelectValue placeholder="Interviewer" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All interviewers</SelectItem>
          {meta.interviewers.map((interviewer) => (
            <SelectItem key={interviewer.id} value={interviewer.id}>
              {interviewer.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={filters.status} onValueChange={(value) => onChange({ status: value as InterviewFiltersType["status"] })}>
        <SelectTrigger className="h-11 rounded-2xl">
          <SelectValue placeholder="Status" />
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
      <Select value={filters.recruiter} onValueChange={(value) => onChange({ recruiter: value })}>
        <SelectTrigger className="h-11 rounded-2xl">
          <SelectValue placeholder="Recruiter" />
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
      <Select
        value={filters.feedbackStatus}
        onValueChange={(value) => onChange({ feedbackStatus: value as InterviewFiltersType["feedbackStatus"] })}
      >
        <SelectTrigger className="h-11 rounded-2xl">
          <SelectValue placeholder="Feedback" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All feedback</SelectItem>
          {meta.feedbackStatuses.map((status) => (
            <SelectItem key={status} value={status}>
              {status}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
