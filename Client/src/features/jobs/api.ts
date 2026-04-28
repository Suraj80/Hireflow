import { api } from "@/lib/api";
import { JobFormValues, formatJobPayload } from "@/features/jobs/schema";
import { Job, JobsFilters, JobsListResponse, PublicJob } from "@/features/jobs/types";

export const jobsApi = {
  list: async (params: JobsFilters & { page: number; limit: number }) => {
    const response = await api.get<JobsListResponse>("/jobs", {
      params: {
        page: params.page,
        limit: params.limit,
        search: params.search || undefined,
        status: params.status,
        department: params.department === "all" ? undefined : params.department,
        sort: params.sort,
      },
    });

    return response.data;
  },
  getById: async (id: string) => {
    const response = await api.get<Job>(`/jobs/${id}`);
    return response.data;
  },
  getPublicById: async (id: string) => {
    const response = await api.get<PublicJob>(`/jobs/${id}`);
    return response.data;
  },
  create: async (values: JobFormValues) => {
    const response = await api.post<Job>("/jobs", formatJobPayload(values));
    return response.data;
  },
  update: async (id: string, values: JobFormValues) => {
    const response = await api.patch<Job>(`/jobs/${id}`, formatJobPayload(values));
    return response.data;
  },
  archive: async (id: string) => {
    const response = await api.delete<{ message: string }>(`/jobs/${id}`);
    return response.data;
  },
};
