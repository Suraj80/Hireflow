import {
  addDays,
  addMinutes,
  endOfWeek,
  format,
  getDay,
  isSameDay,
  parseISO,
  startOfWeek,
} from "date-fns";
import { WorkspaceSettings } from "@/features/settings/types";
import { Interview, InterviewStatus } from "@/features/interviews/types";

export const INTERVIEW_VIEW_STORAGE_KEY = "hireflow:interviews:view";
export const defaultOfficeWeek: WorkspaceSettings["officeWeek"] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
];
export const defaultOfficeHours: WorkspaceSettings["officeHours"] = {
  start: "09:00",
  end: "18:00",
};

export const timezoneOptions = [
  "UTC",
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Singapore",
  "Europe/London",
  "Europe/Berlin",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Australia/Sydney",
] as const;

export const weekdayOrder: Array<WorkspaceSettings["officeWeek"][number]> = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

const pixelsPerHalfHour = 44;

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

export const sortOfficeWeek = (officeWeek?: WorkspaceSettings["officeWeek"]) => {
  const source = officeWeek?.length ? officeWeek : defaultOfficeWeek;
  return Array.from(new Set(source)).sort(
    (left, right) => weekdayOrder.indexOf(left) - weekdayOrder.indexOf(right)
  );
};

export const getWeekStartsOn = (officeWeek?: WorkspaceSettings["officeWeek"]) =>
  weekdayOrder.indexOf(sortOfficeWeek(officeWeek)[0]);

export const getWeekStart = (value?: Date, officeWeek?: WorkspaceSettings["officeWeek"]) =>
  startOfWeek(value || new Date(), { weekStartsOn: getWeekStartsOn(officeWeek) as 0 | 1 | 2 | 3 | 4 | 5 | 6 });

export const getWeekEnd = (value?: Date, officeWeek?: WorkspaceSettings["officeWeek"]) =>
  endOfWeek(value || new Date(), { weekStartsOn: getWeekStartsOn(officeWeek) as 0 | 1 | 2 | 3 | 4 | 5 | 6 });

export const buildWeekDays = (weekStart: Date, officeWeek?: WorkspaceSettings["officeWeek"]) =>
  sortOfficeWeek(officeWeek).map((day) => addDays(weekStart, weekdayOrder.indexOf(day) - getWeekStartsOn(officeWeek)));

const parseOfficeHour = (value: string) => {
  const [hourText, minuteText] = value.split(":");
  return {
    hour: Number(hourText || 0),
    minute: Number(minuteText || 0),
  };
};

export const buildTimeSlots = (officeHours?: WorkspaceSettings["officeHours"]) => {
  const hours = officeHours || defaultOfficeHours;
  const start = parseOfficeHour(hours.start);
  const end = parseOfficeHour(hours.end);
  const totalMinutes = Math.max(60, end.hour * 60 + end.minute - (start.hour * 60 + start.minute));
  const slotCount = Math.max(1, Math.ceil(totalMinutes / 60));

  return Array.from({ length: slotCount }, (_, index) => {
    const total = start.hour * 60 + start.minute + index * 60;
    const hour = Math.floor(total / 60);
    const minute = total % 60;
    const slot = new Date();
    slot.setHours(hour, minute, 0, 0);
    return {
      label: format(slot, "h:mm a"),
      hour,
      minute,
    };
  });
};

export const buildTimeLabels = (officeHours?: WorkspaceSettings["officeHours"]) => {
  const hours = officeHours || defaultOfficeHours;
  const end = parseOfficeHour(hours.end);
  const labels = [...buildTimeSlots(hours)];
  const endSlot = new Date();
  endSlot.setHours(end.hour, end.minute, 0, 0);

  labels.push({
    label: format(endSlot, "h:mm a"),
    hour: end.hour,
    minute: end.minute,
  });

  return labels;
};

export const getCalendarHourRowHeight = () => pixelsPerHalfHour * 2;

export const formatInterviewDate = (value: string) => format(parseISO(value), "EEE, MMM d");
export const formatInterviewTime = (value: string) => format(parseISO(value), "h:mm a");
export const formatInterviewDateTime = (value: string) => format(parseISO(value), "EEE, MMM d • h:mm a");

export const formatWeekRange = (weekStart: Date, officeWeek?: WorkspaceSettings["officeWeek"]) => {
  const days = buildWeekDays(weekStart, officeWeek);
  const firstDay = days[0] || weekStart;
  const lastDay = days[days.length - 1] || weekStart;
  return `${format(firstDay, "MMM d")} - ${format(lastDay, "MMM d, yyyy")}`;
};

export const getInterviewLayout = (
  interview: Interview,
  weekStart: Date,
  officeWeek?: WorkspaceSettings["officeWeek"],
  officeHours?: WorkspaceSettings["officeHours"]
) => {
  const start = parseISO(interview.scheduledAt);
  const dayIndex = sortOfficeWeek(officeWeek).indexOf(weekdayOrder[getDay(start)]);
  const officeStart = parseOfficeHour((officeHours || defaultOfficeHours).start);
  const minutesFromStart = start.getHours() * 60 + start.getMinutes() - (officeStart.hour * 60 + officeStart.minute);
  const top = Math.max(0, (minutesFromStart / 30) * pixelsPerHalfHour);
  const height = Math.max(pixelsPerHalfHour, (interview.duration / 30) * pixelsPerHalfHour);

  return { dayIndex, top, height };
};

export const isInterviewInWorkWeek = (
  interview: Interview,
  weekStart: Date,
  officeWeek?: WorkspaceSettings["officeWeek"]
) => {
  const date = parseISO(interview.scheduledAt);
  return buildWeekDays(weekStart, officeWeek).some((day) => isSameDay(day, date));
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
