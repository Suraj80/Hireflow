import { create } from "zustand";
import { candidatesApi } from "@/features/candidates/api";
import {
  Candidate,
  CandidateBulkActionPayload,
  CandidateFilters,
  CandidateMeta,
  CandidateNote,
  CandidatePagination,
} from "@/features/candidates/types";
import { CandidateFormValues, InterviewFormValues } from "@/features/candidates/schema";

export const defaultCandidateFilters: CandidateFilters = {
  search: "",
  job: "all",
  department: "all",
  stage: "all",
  source: "all",
  recruiter: "all",
  status: "all",
  aiScoreMin: null,
  aiScoreMax: null,
  appliedFrom: "",
  appliedTo: "",
  sort: "newest",
};

export const defaultCandidatePagination: CandidatePagination = {
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 1,
};

export const defaultCandidateMeta: CandidateMeta = {
  jobs: [],
  departments: [],
  recruiters: [],
  stages: ["Applied", "Screening", "Interview", "Offer", "Hired", "Rejected"],
  sources: ["portal", "referral", "manual", "campus", "linkedin", "agency"],
  priorities: ["Low", "Medium", "High"],
  statuses: ["Active", "Hired", "Rejected", "Archived"],
  interviewModes: ["Virtual", "Onsite", "Phone"],
  interviewStatuses: ["Scheduled", "Completed", "Cancelled"],
};

const getErrorMessage = (error: unknown, fallback: string) =>
  (error as { response?: { data?: { errors?: { message?: string }[]; message?: string } } })?.response?.data
    ?.errors?.[0]?.message ||
  (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
  (error instanceof Error ? error.message : fallback);

const patchCandidateCollection = (candidates: Candidate[], candidate: Candidate) => {
  const index = candidates.findIndex((item) => item.id === candidate.id);

  if (index === -1) {
    return [candidate, ...candidates];
  }

  const next = [...candidates];
  next[index] = candidate;
  return next;
};

type CandidatesStoreState = {
  candidates: Candidate[];
  loading: boolean;
  error: string | null;
  filters: CandidateFilters;
  pagination: CandidatePagination;
  meta: CandidateMeta;
  selectedIds: string[];
  detail: Candidate | null;
  detailLoading: boolean;
  detailError: string | null;
  setFilters: (filters: Partial<CandidateFilters>) => void;
  setPage: (page: number) => void;
  setLimit: (limit: CandidatePagination["limit"]) => void;
  resetFilters: () => void;
  toggleSelected: (candidateId: string) => void;
  toggleSelectAll: (candidateIds: string[]) => void;
  clearSelection: () => void;
  clearDetail: () => void;
  fetchCandidates: () => Promise<void>;
  fetchMeta: () => Promise<void>;
  fetchCandidateById: (candidateId: string) => Promise<Candidate>;
  createCandidate: (values: CandidateFormValues) => Promise<ReturnType<typeof candidatesApi.create>>;
  updateCandidate: (candidateId: string, values: CandidateFormValues) => Promise<Candidate>;
  moveStage: (candidateId: string, payload: { stage: Candidate["stage"]; reason?: string }) => Promise<Candidate>;
  assignRecruiter: (candidateId: string, recruiterAssigned: string | null) => Promise<Candidate>;
  addNote: (candidateId: string, payload: { content: string; pinned?: boolean; mentions?: string[] }) => Promise<CandidateNote>;
  updateNote: (candidateId: string, noteId: string, payload: { content: string; pinned?: boolean; mentions?: string[] }) => Promise<CandidateNote>;
  deleteNote: (candidateId: string, noteId: string) => Promise<void>;
  addInterview: (candidateId: string, values: InterviewFormValues) => Promise<Candidate>;
  archiveCandidate: (candidateId: string) => Promise<void>;
  bulkAction: (payload: CandidateBulkActionPayload) => Promise<void>;
  upsertCandidate: (candidate: Candidate) => void;
};

export const useCandidatesStore = create<CandidatesStoreState>((set, get) => ({
  candidates: [],
  loading: false,
  error: null,
  filters: defaultCandidateFilters,
  pagination: defaultCandidatePagination,
  meta: defaultCandidateMeta,
  selectedIds: [],
  detail: null,
  detailLoading: false,
  detailError: null,
  setFilters: (filters) =>
    set((state) => ({
      filters: { ...(state.filters || defaultCandidateFilters), ...filters },
      pagination: { ...(state.pagination || defaultCandidatePagination), page: 1 },
    })),
  setPage: (page) =>
    set((state) => ({
      pagination: { ...(state.pagination || defaultCandidatePagination), page },
    })),
  setLimit: (limit) =>
    set((state) => ({
      pagination: { ...(state.pagination || defaultCandidatePagination), page: 1, limit },
    })),
  resetFilters: () =>
    set({
      filters: defaultCandidateFilters,
      pagination: { ...defaultCandidatePagination },
      selectedIds: [],
    }),
  toggleSelected: (candidateId) =>
    set((state) => ({
      selectedIds: state.selectedIds.includes(candidateId)
        ? state.selectedIds.filter((item) => item !== candidateId)
        : [...state.selectedIds, candidateId],
    })),
  toggleSelectAll: (candidateIds) =>
    set((state) => ({
      selectedIds:
        candidateIds.length > 0 &&
        candidateIds.every((candidateId) => state.selectedIds.includes(candidateId))
          ? state.selectedIds.filter((item) => !candidateIds.includes(item))
          : Array.from(new Set([...state.selectedIds, ...candidateIds])),
    })),
  clearSelection: () => set({ selectedIds: [] }),
  clearDetail: () => set({ detail: null, detailError: null, detailLoading: false }),
  fetchCandidates: async () => {
    set({ loading: true, error: null });

    try {
      const { filters, pagination } = get();
      const response = await candidatesApi.list({
        ...(filters || defaultCandidateFilters),
        page: pagination?.page ?? defaultCandidatePagination.page,
        limit: pagination?.limit ?? defaultCandidatePagination.limit,
      });

      set({
        candidates: Array.isArray(response.items) ? response.items : [],
        loading: false,
        error: null,
        pagination: response.pagination || pagination || defaultCandidatePagination,
        meta: response.filters || get().meta || defaultCandidateMeta,
        selectedIds: [],
      });
    } catch (error) {
      set({
        loading: false,
        error: getErrorMessage(error, "Unable to load candidates"),
      });
    }
  },
  fetchMeta: async () => {
    try {
      const meta = await candidatesApi.meta();
      set({ meta: meta || defaultCandidateMeta });
    } catch (_error) {
      // Keep local defaults when metadata cannot load separately.
    }
  },
  fetchCandidateById: async (candidateId) => {
    set({ detailLoading: true, detailError: null });

    try {
      const candidate = await candidatesApi.getById(candidateId);
      set((state) => ({
        detail: candidate,
        detailLoading: false,
        detailError: null,
        candidates: patchCandidateCollection(state.candidates, candidate),
      }));
      return candidate;
    } catch (error) {
      const message = getErrorMessage(error, "Unable to load candidate");
      set({ detailLoading: false, detailError: message });
      throw error;
    }
  },
  createCandidate: async (values) => {
    const response = await candidatesApi.create(values);
    set((state) => ({
      candidates: patchCandidateCollection(state.candidates, response.item),
      detail: response.item,
      pagination: {
        ...(state.pagination || defaultCandidatePagination),
        total: (state.pagination?.total || 0) + 1,
      },
    }));
    return response;
  },
  updateCandidate: async (candidateId, values) => {
    const candidate = await candidatesApi.update(candidateId, values);
    set((state) => ({
      candidates: patchCandidateCollection(state.candidates, candidate),
      detail: state.detail?.id === candidate.id ? candidate : state.detail,
    }));
    return candidate;
  },
  moveStage: async (candidateId, payload) => {
    const snapshot = get().candidates;
    const detailSnapshot = get().detail;

    set((state) => ({
      candidates: state.candidates.map((candidate) =>
        candidate.id === candidateId
          ? {
              ...candidate,
              stage: payload.stage,
              updatedAt: new Date().toISOString(),
            }
          : candidate
      ),
      detail:
        state.detail?.id === candidateId
          ? {
              ...state.detail,
              stage: payload.stage,
              updatedAt: new Date().toISOString(),
            }
          : state.detail,
    }));

    try {
      const candidate = await candidatesApi.moveStage(candidateId, payload);
      set((state) => ({
        candidates: patchCandidateCollection(state.candidates, candidate),
        detail: state.detail?.id === candidate.id ? candidate : state.detail,
      }));
      return candidate;
    } catch (error) {
      set({ candidates: snapshot, detail: detailSnapshot });
      throw error;
    }
  },
  assignRecruiter: async (candidateId, recruiterAssigned) => {
    const { meta, candidates, detail } = get();
    const recruiter = meta.recruiters.find((item) => item.id === recruiterAssigned) || null;

    set({
      candidates: candidates.map((candidate) =>
        candidate.id === candidateId
          ? {
              ...candidate,
              recruiterAssigned: recruiter,
              updatedAt: new Date().toISOString(),
            }
          : candidate
      ),
      detail:
        detail?.id === candidateId
          ? {
              ...detail,
              recruiterAssigned: recruiter,
              updatedAt: new Date().toISOString(),
            }
          : detail,
    });

    try {
      const candidate = await candidatesApi.assign(candidateId, recruiterAssigned);
      set((state) => ({
        candidates: patchCandidateCollection(state.candidates, candidate),
        detail: state.detail?.id === candidate.id ? candidate : state.detail,
      }));
      return candidate;
    } catch (error) {
      set({ candidates, detail });
      throw error;
    }
  },
  addNote: async (candidateId, payload) => {
    const note = await candidatesApi.addNote(candidateId, payload);
    set((state) => ({
      candidates: state.candidates.map((candidate) =>
        candidate.id === candidateId
          ? {
              ...candidate,
              notesCount: candidate.notesCount + 1,
              updatedAt: new Date().toISOString(),
            }
          : candidate
      ),
      detail:
        state.detail?.id === candidateId
          ? {
              ...state.detail,
              notes: [note, ...state.detail.notes],
              notesCount: state.detail.notesCount + 1,
              timeline: [
                {
                  id: `note-${note.id}`,
                  type: "note",
                  title: note.pinned ? "Pinned note added" : "Note added",
                  description: note.content,
                  createdAt: note.createdAt,
                  actorName: note.author?.name || "",
                  meta: { pinned: note.pinned },
                },
                ...state.detail.timeline,
              ],
            }
          : state.detail,
    }));
    return note;
  },
  updateNote: async (candidateId, noteId, payload) => {
    const note = await candidatesApi.updateNote(candidateId, noteId, payload);
    set((state) => ({
      detail:
        state.detail?.id === candidateId
          ? {
              ...state.detail,
              notes: state.detail.notes.map((item) => (item.id === noteId ? note : item)),
            }
          : state.detail,
    }));
    return note;
  },
  deleteNote: async (candidateId, noteId) => {
    await candidatesApi.deleteNote(candidateId, noteId);
    set((state) => ({
      candidates: state.candidates.map((candidate) =>
        candidate.id === candidateId
          ? {
              ...candidate,
              notesCount: Math.max(0, candidate.notesCount - 1),
            }
          : candidate
      ),
      detail:
        state.detail?.id === candidateId
          ? {
              ...state.detail,
              notes: state.detail.notes.filter((item) => item.id !== noteId),
              notesCount: Math.max(0, state.detail.notesCount - 1),
            }
          : state.detail,
    }));
  },
  addInterview: async (candidateId, values) => {
    const candidate = await candidatesApi.addInterview(candidateId, values);
    set((state) => ({
      candidates: patchCandidateCollection(state.candidates, candidate),
      detail: state.detail?.id === candidate.id ? candidate : state.detail,
    }));
    return candidate;
  },
  archiveCandidate: async (candidateId) => {
    const previousCandidates = get().candidates;
    const previousDetail = get().detail;

    set((state) => ({
      candidates: state.candidates.filter((candidate) => candidate.id !== candidateId),
      detail:
        state.detail?.id === candidateId
          ? {
              ...state.detail,
              archived: true,
              status: "Archived",
            }
          : state.detail,
      selectedIds: state.selectedIds.filter((item) => item !== candidateId),
      pagination: {
        ...(state.pagination || defaultCandidatePagination),
        total: Math.max(0, (state.pagination?.total || 0) - 1),
      },
    }));

    try {
      await candidatesApi.archive(candidateId);
    } catch (error) {
      set({ candidates: previousCandidates, detail: previousDetail });
      throw error;
    }
  },
  bulkAction: async (payload) => {
    await candidatesApi.bulkAction(payload);
    await get().fetchCandidates();
    if (get().detail && payload.candidateIds.includes(get().detail.id)) {
      await get().fetchCandidateById(get().detail.id);
    }
  },
  upsertCandidate: (candidate) =>
    set((state) => ({
      candidates: patchCandidateCollection(state.candidates, candidate),
      detail: state.detail?.id === candidate.id ? candidate : state.detail,
    })),
}));
