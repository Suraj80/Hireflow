import { api } from "@/lib/api";
import {
  AnalyticsOverview,
  PipelineAnalyticsResponse,
  SourceAnalyticsResponse,
  TimeToHireResponse,
  UpcomingInterviewsResponse,
} from "@/features/analytics/types";

type AnalyticsParams = {
  jobId?: string;
  from?: string;
  to?: string;
};

export const analyticsApi = {
  overview: async (params: AnalyticsParams = {}) => {
    const response = await api.get<AnalyticsOverview>("/analytics/overview", { params });
    return response.data;
  },
  pipeline: async (params: AnalyticsParams = {}) => {
    const response = await api.get<PipelineAnalyticsResponse>("/analytics/pipeline", { params });
    return response.data;
  },
  sources: async (params: AnalyticsParams = {}) => {
    const response = await api.get<SourceAnalyticsResponse>("/analytics/sources", { params });
    return response.data;
  },
  timeToHire: async (params: AnalyticsParams = {}) => {
    const response = await api.get<TimeToHireResponse>("/analytics/time-to-hire", { params });
    return response.data;
  },
  interviews: async (params: AnalyticsParams = {}) => {
    const response = await api.get<UpcomingInterviewsResponse>("/analytics/interviews", { params });
    return response.data;
  },
};
