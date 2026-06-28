export type JobStatus = "draft" | "open" | "closed";
export type EmploymentType = "full-time" | "part-time" | "contract" | "internship";
export type JobVisibility = "public" | "private";
export type WorkMode = "onsite" | "hybrid" | "remote";
export type JobSort = "newest" | "oldest" | "deadline";
export type UserSummary = {
  _id?: string;
  id?: string;
  name: string;
  email: string;
  role: "admin" | "recruiter" | "viewer";
};

export type Job = {
  id: string;
  title: string;
  department: string;
  hiringManager: string;
  hiringManagerId: string | null;
  hiringManagerUser: UserSummary | null;
  descriptionHTML: string;
  requirementsHTML: string;
  type: EmploymentType;
  location: string;
  workMode: WorkMode;
  remote: boolean;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string;
  showSalary: boolean;
  skills: string[];
  tags: string[];
  deadline: string | null;
  maxApplicants: number | null;
  autoClose: boolean;
  visibility: JobVisibility;
  status: JobStatus;
  archived: boolean;
  createdBy: UserSummary;
  updatedBy: UserSummary;
  createdAt: string;
  updatedAt: string;
  applicantsCount: number;
};

export type PublicJob = Omit<
  Job,
  | "createdBy"
  | "updatedBy"
  | "archived"
  | "applicantsCount"
  | "hiringManager"
  | "hiringManagerId"
  | "hiringManagerUser"
  | "maxApplicants"
  | "autoClose"
>;

export type JobsFilters = {
  search: string;
  status: "all" | JobStatus;
  department: string;
  jobType: "all" | EmploymentType;
  sort: JobSort;
};

export type JobsPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type JobsListResponse = {
  items: Job[];
  pagination: JobsPagination;
  filters: {
    departments: string[];
  };
};

export type JobDepartmentOption = {
  id: string;
  name: string;
  isActive: boolean;
  isLegacy?: boolean;
};

export type JobMetaResponse = {
  departments: JobDepartmentOption[];
  hiringManagers: UserSummary[];
};
