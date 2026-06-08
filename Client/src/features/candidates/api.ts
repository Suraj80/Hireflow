import { api } from "@/lib/api";
import { CandidateFormValues, formatCandidatePayload, InterviewFormValues } from "@/features/candidates/schema";
import {
  Candidate,
  CandidateBulkActionPayload,
  CandidateBulkActionResponse,
  CandidateCreateResponse,
  CandidateFilters,
  CandidateMeta,
  CandidateNote,
  CandidatePagination,
  CandidatesListResponse,
  DuplicateCandidateResponse,
  PublicCandidateApplicationPayload,
  PublicCandidateApplicationResponse,
  PublicCandidateStatusResponse,
  ResumeUploadResponse,
} from "@/features/candidates/types";

type ListParams = CandidateFilters & Pick<CandidatePagination, "page" | "limit">;

export const candidatesApi = {
  list: async (params: ListParams) => {
    const response = await api.get<CandidatesListResponse>("/candidates", {
      params: {
        page: params.page,
        limit: params.limit,
        search: params.search || undefined,
        job: params.job === "all" ? undefined : params.job,
        department: params.department === "all" ? undefined : params.department,
        stage: params.stage,
        source: params.source,
        recruiter: params.recruiter === "all" ? undefined : params.recruiter,
        aiScoreMin: params.aiScoreMin ?? undefined,
        aiScoreMax: params.aiScoreMax ?? undefined,
        appliedFrom: params.appliedFrom || undefined,
        appliedTo: params.appliedTo || undefined,
        status: params.status,
        sort: params.sort,
      },
    });

    return response.data;
  },
  meta: async () => {
    const response = await api.get<CandidateMeta>("/candidates/meta");
    return response.data;
  },
  getById: async (id: string) => {
    const response = await api.get<Candidate>(`/candidates/${id}`);
    return response.data;
  },
  create: async (values: CandidateFormValues) => {
    const response = await api.post<CandidateCreateResponse>("/candidates", formatCandidatePayload(values));
    return response.data;
  },
  update: async (id: string, values: CandidateFormValues) => {
    const response = await api.patch<Candidate>(`/candidates/${id}`, formatCandidatePayload(values));
    return response.data;
  },
  moveStage: async (id: string, payload: { stage: Candidate["stage"]; reason?: string }) => {
    const response = await api.patch<Candidate>(`/candidates/${id}/stage`, payload);
    return response.data;
  },
  assign: async (id: string, recruiterAssigned: string | null) => {
    const response = await api.patch<Candidate>(`/candidates/${id}/assign`, { recruiterAssigned });
    return response.data;
  },
  addNote: async (id: string, payload: { content: string; mentions?: string[]; pinned?: boolean }) => {
    const response = await api.post<CandidateNote>(`/candidates/${id}/note`, payload);
    return response.data;
  },
  updateNote: async (
    id: string,
    noteId: string,
    payload: { content: string; mentions?: string[]; pinned?: boolean }
  ) => {
    const response = await api.patch<CandidateNote>(`/candidates/${id}/notes/${noteId}`, payload);
    return response.data;
  },
  deleteNote: async (id: string, noteId: string) => {
    const response = await api.delete<{ message: string }>(`/candidates/${id}/notes/${noteId}`);
    return response.data;
  },
  addInterview: async (id: string, values: InterviewFormValues) => {
    const response = await api.post<Candidate>(`/candidates/${id}/interviews`, {
      ...values,
      date: new Date(values.date).toISOString(),
    });
    return response.data;
  },
  rescore: async (id: string) => {
    const response = await api.post<Candidate>(`/candidates/${id}/rescore`);
    return response.data;
  },
  archive: async (id: string) => {
    const response = await api.delete<{ message: string }>(`/candidates/${id}`);
    return response.data;
  },
  bulkAction: async (payload: CandidateBulkActionPayload) => {
    const response = await api.post<CandidateBulkActionResponse>("/candidates/bulk-action", payload);
    return response.data;
  },
  checkDuplicate: async (email: string, jobId: string) => {
    const response = await api.get<DuplicateCandidateResponse>("/candidates/duplicate-check", {
      params: {
        email,
        jobId,
      },
    });
    return response.data;
  },
  requestResumeUpload: async (file: File) => {
    const formData = new FormData();
    formData.append("resume", file);
    const response = await api.post<ResumeUploadResponse>("/candidates/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },
  uploadResume: async (file: File, onProgress?: (progress: number) => void) => {
    const formData = new FormData();
    formData.append("resume", file);
    const response = await api.post<ResumeUploadResponse>("/candidates/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: (event) => {
        if (!onProgress || !event.total) {
          return;
        }

        onProgress(Math.round((event.loaded / event.total) * 100));
      },
    });

    return {
      resumeUrl: response.data.fileUrl,
      resumeMeta: response.data.resumeMeta,
      parsedCandidate: response.data.parsedCandidate || null,
    };
  },
  applyPublic: async (jobId: string, payload: PublicCandidateApplicationPayload) => {
    const formData = new FormData();
    formData.append("firstName", payload.firstName);
    formData.append("lastName", payload.lastName);
    formData.append("email", payload.email);
    formData.append("phone", payload.phone);
    formData.append("linkedin", payload.linkedin);
    formData.append("coverLetter", payload.coverLetter);
    formData.append("resume", payload.resume);

    const response = await api.post<PublicCandidateApplicationResponse>(
      `/candidates/public/apply/${jobId}`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    return response.data;
  },
  getPublicStatus: async (token: string) => {
    const response = await api.get<PublicCandidateStatusResponse>(`/candidates/status/${token}`);
    return response.data;
  },
};
