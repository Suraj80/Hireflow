import { api } from "@/lib/api";
import { CreateUserPayload, UserListItem, UserRole, UsersListResponse } from "@/features/users/types";

export const usersApi = {
  list: async (params: { search?: string; role?: UserRole | "all" }) => {
    const response = await api.get<UsersListResponse>("/users", {
      params: {
        search: params.search || undefined,
        role: params.role && params.role !== "all" ? params.role : undefined,
      },
    });

    return response.data;
  },
  create: async (payload: CreateUserPayload) => {
    const response = await api.post<{ message: string; user: UserListItem }>("/users", payload);
    return response.data;
  },
  updateRole: async (id: string, role: UserRole) => {
    const response = await api.patch<{ message: string; user: UserListItem }>(`/users/${id}/role`, { role });
    return response.data;
  },
  updateStatus: async (id: string, isActive: boolean) => {
    const response = await api.patch<{ message: string; user: UserListItem }>(`/users/${id}/status`, { isActive });
    return response.data;
  },
  updatePassword: async (id: string, password: string) => {
    const response = await api.patch<{ message: string; user: UserListItem }>(`/users/${id}/password`, { password });
    return response.data;
  },
  delete: async (id: string) => {
    const response = await api.delete<{ message: string }>(`/users/${id}`);
    return response.data;
  },
};
