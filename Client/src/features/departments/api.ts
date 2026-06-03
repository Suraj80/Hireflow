import { api } from "@/lib/api";
import { DepartmentItem, DepartmentsListResponse } from "@/features/departments/types";

export const departmentsApi = {
  list: async (includeInactive = true) => {
    const response = await api.get<DepartmentsListResponse>("/departments", {
      params: {
        includeInactive: includeInactive ? "true" : undefined,
      },
    });
    return response.data;
  },
  create: async (payload: { name: string }) => {
    const response = await api.post<{ message: string; item: DepartmentItem }>("/departments", payload);
    return response.data;
  },
  update: async (id: string, payload: { name?: string; isActive?: boolean }) => {
    const response = await api.patch<{ message: string; item: DepartmentItem }>(`/departments/${id}`, payload);
    return response.data;
  },
};
