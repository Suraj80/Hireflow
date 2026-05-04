import { addWeeks, format } from "date-fns";
import { create } from "zustand";
import { interviewsApi } from "@/features/interviews/api";
import {
  defaultInterviewFilters,
  defaultInterviewMeta,
  defaultInterviewPagination,
  getStoredInterviewView,
  getWeekStart,
  saveInterviewView,
} from "@/features/interviews/helpers";
import { Interview, InterviewFilters, InterviewPagination, InterviewView } from "@/features/interviews/types";

const syncInterview = (items: Interview[], interview: Interview) =>
  items.map((item) => (item.id === interview.id ? interview : item));

const removeInterview = (items: Interview[], interviewId: string) => items.filter((item) => item.id !== interviewId);

type InterviewsStoreState = {
  view: InterviewView;
  weekStart: Date;
  filters: InterviewFilters;
  pagination: InterviewPagination;
  meta: typeof defaultInterviewMeta;
  items: Interview[];
  calendarItems: Interview[];
  upcoming: Interview[];
  loadingList: boolean;
  loadingCalendar: boolean;
  error: string | null;
  selectedIds: string[];
  drawerOpen: boolean;
  selectedInterview: Interview | null;
  detailLoading: boolean;
  setView: (view: InterviewView) => void;
  setFilters: (filters: Partial<InterviewFilters>) => void;
  resetFilters: () => void;
  setPage: (page: number) => void;
  setLimit: (limit: InterviewPagination["limit"]) => void;
  setWeekStart: (weekStart: Date) => void;
  shiftWeek: (direction: -1 | 1) => void;
  toggleSelected: (id: string) => void;
  toggleSelectAll: (ids: string[]) => void;
  clearSelection: () => void;
  fetchList: () => Promise<void>;
  fetchCalendar: () => Promise<void>;
  refreshActiveData: () => Promise<void>;
  openDrawer: (interviewId: string) => Promise<void>;
  closeDrawer: () => void;
  createInterview: (payload: Parameters<typeof interviewsApi.create>[0]) => Promise<Interview>;
  updateInterview: (id: string, payload: Parameters<typeof interviewsApi.update>[1]) => Promise<Interview>;
  rescheduleInterview: (id: string, payload: Parameters<typeof interviewsApi.reschedule>[1]) => Promise<Interview>;
  updateStatus: (id: string, payload: Parameters<typeof interviewsApi.updateStatus>[1]) => Promise<Interview>;
  addFeedback: (id: string, payload: Parameters<typeof interviewsApi.addFeedback>[1]) => Promise<Interview>;
  deleteInterview: (id: string) => Promise<void>;
};

export const useInterviewsStore = create<InterviewsStoreState>((set, get) => ({
  view: getStoredInterviewView(),
  weekStart: getWeekStart(),
  filters: defaultInterviewFilters as InterviewFilters,
  pagination: defaultInterviewPagination as InterviewPagination,
  meta: defaultInterviewMeta,
  items: [],
  calendarItems: [],
  upcoming: [],
  loadingList: false,
  loadingCalendar: false,
  error: null,
  selectedIds: [],
  drawerOpen: false,
  selectedInterview: null,
  detailLoading: false,
  setView: (view) => {
    saveInterviewView(view);
    set({ view });
  },
  setFilters: (filters) =>
    set((state) => ({
      filters: { ...state.filters, ...filters },
      pagination: { ...state.pagination, page: 1 },
    })),
  resetFilters: () =>
    set({
      filters: defaultInterviewFilters as InterviewFilters,
      pagination: defaultInterviewPagination as InterviewPagination,
    }),
  setPage: (page) => set((state) => ({ pagination: { ...state.pagination, page } })),
  setLimit: (limit) =>
    set((state) => ({
      pagination: { ...state.pagination, limit, page: 1 },
    })),
  setWeekStart: (weekStart) => set({ weekStart }),
  shiftWeek: (direction) => set((state) => ({ weekStart: addWeeks(state.weekStart, direction) })),
  toggleSelected: (id) =>
    set((state) => ({
      selectedIds: state.selectedIds.includes(id)
        ? state.selectedIds.filter((entry) => entry !== id)
        : [...state.selectedIds, id],
    })),
  toggleSelectAll: (ids) =>
    set((state) => ({
      selectedIds: state.selectedIds.length === ids.length ? [] : ids,
    })),
  clearSelection: () => set({ selectedIds: [] }),
  fetchList: async () => {
    set({ loadingList: true, error: null });
    try {
      const { filters, pagination, weekStart } = get();
      const response = await interviewsApi.list({
        ...filters,
        page: pagination.page,
        limit: pagination.limit,
        from: format(weekStart, "yyyy-MM-dd"),
      });
      set({
        items: response.items,
        pagination: response.pagination,
        meta: response.filters,
        loadingList: false,
      });
    } catch (error) {
      set({
        loadingList: false,
        error: error instanceof Error ? error.message : "Failed to load interviews",
      });
    }
  },
  fetchCalendar: async () => {
    set({ loadingCalendar: true, error: null });
    try {
      const { filters, weekStart } = get();
      const response = await interviewsApi.calendar({
        weekStart: weekStart.toISOString(),
        search: filters.search || undefined,
        team: filters.team === "all" ? undefined : filters.team,
        interviewer: filters.interviewer === "all" ? undefined : filters.interviewer,
        status: filters.status === "all" ? undefined : filters.status,
      });
      set({
        calendarItems: response.items,
        upcoming: response.upcoming,
        loadingCalendar: false,
      });
    } catch (error) {
      set({
        loadingCalendar: false,
        error: error instanceof Error ? error.message : "Failed to load interview calendar",
      });
    }
  },
  refreshActiveData: async () => {
    const { fetchCalendar, fetchList } = get();
    await Promise.all([fetchCalendar(), fetchList()]);
  },
  openDrawer: async (interviewId) => {
    set({ drawerOpen: true, detailLoading: true });
    try {
      const interview = await interviewsApi.getById(interviewId);
      set({ selectedInterview: interview, detailLoading: false });
    } catch (error) {
      set({
        detailLoading: false,
        error: error instanceof Error ? error.message : "Failed to load interview details",
      });
    }
  },
  closeDrawer: () => set({ drawerOpen: false, selectedInterview: null }),
  createInterview: async (payload) => {
    const interview = await interviewsApi.create(payload);
    set((state) => ({
      items: [interview, ...state.items],
      calendarItems: [interview, ...state.calendarItems],
      upcoming: [interview, ...state.upcoming].slice(0, 8),
    }));
    return interview;
  },
  updateInterview: async (id, payload) => {
    const interview = await interviewsApi.update(id, payload);
    set((state) => ({
      items: syncInterview(state.items, interview),
      calendarItems: syncInterview(state.calendarItems, interview),
      upcoming: syncInterview(state.upcoming, interview),
      selectedInterview: state.selectedInterview?.id === id ? interview : state.selectedInterview,
    }));
    return interview;
  },
  rescheduleInterview: async (id, payload) => {
    const interview = await interviewsApi.reschedule(id, payload);
    set((state) => ({
      items: syncInterview(state.items, interview),
      calendarItems: syncInterview(state.calendarItems, interview),
      upcoming: syncInterview(state.upcoming, interview),
      selectedInterview: state.selectedInterview?.id === id ? interview : state.selectedInterview,
    }));
    return interview;
  },
  updateStatus: async (id, payload) => {
    const interview = await interviewsApi.updateStatus(id, payload);
    set((state) => ({
      items: syncInterview(state.items, interview),
      calendarItems: syncInterview(state.calendarItems, interview),
      upcoming: syncInterview(state.upcoming, interview),
      selectedInterview: state.selectedInterview?.id === id ? interview : state.selectedInterview,
    }));
    return interview;
  },
  addFeedback: async (id, payload) => {
    const interview = await interviewsApi.addFeedback(id, payload);
    set((state) => ({
      items: syncInterview(state.items, interview),
      calendarItems: syncInterview(state.calendarItems, interview),
      upcoming: syncInterview(state.upcoming, interview),
      selectedInterview: state.selectedInterview?.id === id ? interview : state.selectedInterview,
    }));
    return interview;
  },
  deleteInterview: async (id) => {
    await interviewsApi.remove(id);
    set((state) => ({
      items: removeInterview(state.items, id),
      calendarItems: removeInterview(state.calendarItems, id),
      upcoming: removeInterview(state.upcoming, id),
      selectedInterview: state.selectedInterview?.id === id ? null : state.selectedInterview,
      drawerOpen: state.selectedInterview?.id === id ? false : state.drawerOpen,
    }));
  },
}));
