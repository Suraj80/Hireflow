import { format, formatDistanceToNowStrict, isValid } from "date-fns";
import { EmploymentType, Job, JobStatus } from "@/features/jobs/types";

export const employmentTypeLabels: Record<EmploymentType, string> = {
  "full-time": "Full-time",
  "part-time": "Part-time",
  contract: "Contract",
  internship: "Internship",
};

export const statusLabels: Record<JobStatus, string> = {
  draft: "Draft",
  open: "Open",
  closed: "Closed",
};

export const formatJobSalary = (job: Pick<Job, "salaryMin" | "salaryMax" | "currency" | "showSalary">) => {
  if (!job.showSalary || (job.salaryMin === null && job.salaryMax === null)) {
    return "Private";
  }

  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: job.currency || "USD",
    maximumFractionDigits: 0,
  });

  if (job.salaryMin !== null && job.salaryMax !== null) {
    return `${formatter.format(job.salaryMin)} - ${formatter.format(job.salaryMax)}`;
  }

  if (job.salaryMin !== null) {
    return `From ${formatter.format(job.salaryMin)}`;
  }

  return `Up to ${formatter.format(job.salaryMax ?? 0)}`;
};

export const formatAbsoluteDate = (value: string | null) => {
  if (!value) {
    return "No deadline";
  }

  const date = new Date(value);
  return isValid(date) ? format(date, "MMM d, yyyy") : "Invalid date";
};

export const formatRelativeDate = (value: string) => {
  const date = new Date(value);
  return isValid(date) ? formatDistanceToNowStrict(date, { addSuffix: true }) : "Invalid date";
};
