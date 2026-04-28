import { create } from "zustand";
import { jobsApi } from "@/features/jobs/api";
import { JobsFilters, Job, JobsPagination } from "@/features/jobs/types";

const defaultFilters: JobsFilters = {
  search: "",
  status: "all",
  department: "all",
  sort: "newest",
};

const defaultPagination: JobsPagination = {
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 1,
};

type JobsStoreState = {
  jobs: Job[];
  loading: boolean;
  error: string | null;
  filters: JobsFilters;
  pagination: JobsPagination;
  availableDepartments: string[];
  selectedJob: Job | null;
  setSelectedJob: (job: Job | null) => void;
  setFilters: (filters: Partial<JobsFilters>) => void;
  setPage: (page: number) => void;
  resetFilters: () => void;
  fetchJobs: () => Promise<void>;
  archiveJob: (id: string) => Promise<void>;
  upsertJob: (job: Job) => void;
};

export const useJobsStore = create<JobsStoreState>((set, get) => ({
  jobs: [],
  loading: false,
  error: null,
  filters: defaultFilters,
  pagination: defaultPagination,
  availableDepartments: [],
  selectedJob: null,
  setSelectedJob: (job) => set({ selectedJob: job }),
  setFilters: (filters) =>
    set((state) => ({
      filters: { ...state.filters, ...filters },
      pagination: { ...state.pagination, page: 1 },
    })),
  setPage: (page) =>
    set((state) => ({
      pagination: { ...state.pagination, page },
    })),
  resetFilters: () =>
    set({
      filters: defaultFilters,
      pagination: { ...defaultPagination },
    }),
  fetchJobs: async () => {
    set({ loading: true, error: null });

    try {
      const { filters, pagination } = get();
      const response = await jobsApi.list({
        ...filters,
        page: pagination.page,
        limit: pagination.limit,
      });

      set({
        jobs: response.items,
        loading: false,
        error: null,
        pagination: response.pagination,
        availableDepartments: response.filters.departments,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load jobs";
      set({ loading: false, error: message });
    }
  },
  archiveJob: async (id) => {
    await jobsApi.archive(id);
    await get().fetchJobs();
  },
  upsertJob: (job) =>
    set((state) => {
      const existingIndex = state.jobs.findIndex((item) => item.id === job.id);

      if (existingIndex === -1) {
        return { jobs: [job, ...state.jobs] };
      }

      const nextJobs = [...state.jobs];
      nextJobs[existingIndex] = job;
      return { jobs: nextJobs, selectedJob: job };
    }),
}));
