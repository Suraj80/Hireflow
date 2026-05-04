import {
  addDays,
  addMinutes,
  endOfWeek,
  format,
  isSameDay,
  parseISO,
  startOfDay,
  startOfWeek,
} from "date-fns";
import { Interview, InterviewStatus } from "@/features/interviews/types";

export const INTERVIEW_VIEW_STORAGE_KEY = "hireflow:interviews:view";

export const statusToneMap: Record<InterviewStatus, string> = {
  Scheduled: "bg-blue-500/12 text-blue-700 border-blue-200",
  Confirmed: "bg-emerald-500/12 text-emerald-700 border-emerald-200",
  Completed: "bg-slate-500/12 text-slate-700 border-slate-200",
  Cancelled: "bg-rose-500/12 text-rose-700 border-rose-200",
  Rescheduled: "bg-amber-500/12 text-amber-700 border-amber-200",
};

export const statusAccentMap: Record<InterviewStatus, string> = {
  Scheduled: "from-blue-500 to-cyan-500",
  Confirmed: "from-emerald-500 to-teal-500",
  Completed: "from-slate-500 to-slate-400",
  Cancelled: "from-rose-500 to-red-500",
  Rescheduled: "from-amber-500 to-orange-500",
};

export const typeIconLabelMap = {
  Video: "video",
  Onsite: "map-pin",
  Phone: "phone",
  Panel: "users",
  Technical: "code",
} as const;

export const defaultInterviewFilters = {
  search: "",
  team: "all",
  interviewer: "all",
  status: "all",
  type: "all",
  recruiter: "all",
  feedbackStatus: "all",
  sort: "scheduledAt-asc",
} as const;

export const defaultInterviewPagination = {
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 1,
} as const;

export const defaultInterviewMeta = {
  jobs: [],
  recruiters: [],
  interviewers: [],
  candidates: [],
  statuses: ["Scheduled", "Confirmed", "Completed", "Cancelled", "Rescheduled"],
  types: ["Video", "Onsite", "Phone", "Panel", "Technical"],
  feedbackStatuses: ["pending", "partial", "complete"],
} as const;

export const getStoredInterviewView = () => {
  if (typeof window === "undefined") {
    return "calendar";
  }

  return window.localStorage.getItem(INTERVIEW_VIEW_STORAGE_KEY) === "list" ? "list" : "calendar";
};

export const saveInterviewView = (value: "calendar" | "list") => {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(INTERVIEW_VIEW_STORAGE_KEY, value);
  }
};

export const getWeekStart = (value?: Date) => startOfWeek(value || new Date(), { weekStartsOn: 1 });
export const getWeekEnd = (value?: Date) => endOfWeek(value || new Date(), { weekStartsOn: 1 });

export const buildWeekDays = (weekStart: Date) => Array.from({ length: 5 }, (_, index) => addDays(weekStart, index));

export const buildTimeSlots = (startHour = 8, endHour = 18) =>
  Array.from({ length: (endHour - startHour) * 2 }, (_, index) => {
    const hour = startHour + Math.floor(index / 2);
    const minute = index % 2 === 0 ? 0 : 30;
    const slot = new Date();
    slot.setHours(hour, minute, 0, 0);
    return {
      label: format(slot, "h:mm a"),
      hour,
      minute,
    };
  });

export const formatInterviewDate = (value: string) => format(parseISO(value), "EEE, MMM d");
export const formatInterviewTime = (value: string) => format(parseISO(value), "h:mm a");
export const formatInterviewDateTime = (value: string) => format(parseISO(value), "EEE, MMM d • h:mm a");
export const formatWeekRange = (weekStart: Date) =>
  `${format(weekStart, "MMM d")} - ${format(addDays(weekStart, 4), "MMM d, yyyy")}`;

export const getInterviewLayout = (interview: Interview, weekStart: Date) => {
  const start = parseISO(interview.scheduledAt);
  const dayIndex = Math.max(0, Math.min(4, Math.floor((startOfDay(start).getTime() - startOfDay(weekStart).getTime()) / (1000 * 60 * 60 * 24))));
  const minutesFromEight = (start.getHours() - 8) * 60 + start.getMinutes();
  const top = Math.max(0, (minutesFromEight / 30) * 44);
  const height = Math.max(44, (interview.duration / 30) * 44);

  return { dayIndex, top, height };
};

export const isInterviewInWorkWeek = (interview: Interview, weekStart: Date) => {
  const date = parseISO(interview.scheduledAt);
  return buildWeekDays(weekStart).some((day) => isSameDay(day, date));
};

export const getInitials = (value: string) =>
  value
    .split(" ")
    .map((part) => part[0] || "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

export const buildCsvRows = (items: Interview[]) => {
  const headers = [
    "Candidate",
    "Job",
    "Round",
    "Date",
    "Time",
    "Duration",
    "Type",
    "Interviewers",
    "Recruiter",
    "Status",
    "Feedback Status",
  ];

  const rows = items.map((item) => [
    item.candidate?.name || "",
    item.job?.title || "",
    item.round,
    formatInterviewDate(item.scheduledAt),
    formatInterviewTime(item.scheduledAt),
    `${item.duration} min`,
    item.type,
    item.interviewers.map((entry) => entry.name).join(", "),
    item.recruiter?.name || "",
    item.status,
    item.feedbackStatus,
  ]);

  return [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
    .join("\n");
};

export const downloadInterviewCsv = (items: Interview[]) => {
  const blob = new Blob([buildCsvRows(items)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `hireflow-interviews-${format(new Date(), "yyyy-MM-dd")}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const roundToQuarterHour = (value: Date) => {
  const rounded = new Date(value);
  const minutes = rounded.getMinutes();
  const next = Math.round(minutes / 15) * 15;
  rounded.setMinutes(next, 0, 0);
  return rounded;
};

export const buildRescheduleTimestamp = (base: string, day: Date, hour: number, minute: number) => {
  const current = parseISO(base);
  const next = new Date(day);
  next.setHours(hour, minute, 0, 0);
  const merged = addMinutes(next, 0);
  merged.setSeconds(0, 0);
  if (Number.isNaN(merged.getTime())) {
    return current.toISOString();
  }
  return merged.toISOString();
};
