import { api } from "@/lib/api";
import {
  Interview,
  InterviewFeedbackValues,
  InterviewFilters,
  InterviewFormValues,
  InterviewPagination,
  InterviewsCalendarResponse,
  InterviewsListResponse,
} from "@/features/interviews/types";

type ListParams = InterviewFilters & Pick<InterviewPagination, "page" | "limit"> & { from?: string; to?: string };

export const interviewsApi = {
  list: async (params: ListParams) => {
    const response = await api.get<InterviewsListResponse>("/interviews", {
      params,
    });
    return response.data;
  },
  calendar: async (params: { weekStart: string; search?: string; team?: string; interviewer?: string; status?: string }) => {
    const response = await api.get<InterviewsCalendarResponse>("/interviews/calendar", {
      params,
    });
    return response.data;
  },
  getById: async (id: string) => {
    const response = await api.get<Interview>(`/interviews/${id}`);
    return response.data;
  },
  create: async (values: InterviewFormValues) => {
    const response = await api.post<Interview>("/interviews", values);
    return response.data;
  },
  update: async (id: string, values: Partial<InterviewFormValues>) => {
    const response = await api.patch<Interview>(`/interviews/${id}`, values);
    return response.data;
  },
  reschedule: async (id: string, payload: { scheduledAt: string; duration?: number; timezone?: string; reason?: string }) => {
    const response = await api.patch<Interview>(`/interviews/${id}/reschedule`, payload);
    return response.data;
  },
  updateStatus: async (id: string, payload: { status: Interview["status"]; reason?: string; sendNotification?: boolean }) => {
    const response = await api.patch<Interview>(`/interviews/${id}/status`, payload);
    return response.data;
  },
  addFeedback: async (id: string, payload: InterviewFeedbackValues) => {
    const response = await api.post<Interview>(`/interviews/${id}/feedback`, payload);
    return response.data;
  },
  remove: async (id: string) => {
    const response = await api.delete<{ message: string }>(`/interviews/${id}`);
    return response.data;
  },
};
