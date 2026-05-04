import type { UserRole } from "@/components/AuthProvider";

export type InterviewStatus = "Scheduled" | "Confirmed" | "Completed" | "Cancelled" | "Rescheduled";
export type InterviewType = "Video" | "Onsite" | "Phone" | "Panel" | "Technical";
export type FeedbackStatus = "pending" | "partial" | "complete";
export type InterviewView = "calendar" | "list";

export type UserSummary = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

export type InterviewCandidateSummary = {
  id: string;
  name: string;
  email: string;
  jobId: string | null;
  stage: string;
};

export type InterviewJobSummary = {
  id: string;
  title: string;
  department: string;
  location?: string;
};

export type InterviewFeedback = {
  id: string;
  interviewer: UserSummary | null;
  rating: number;
  strengths: string;
  concerns: string;
  recommendation: "Strong Hire" | "Hire" | "Leaning Hire" | "No Hire" | "Strong No Hire";
  submittedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type InterviewNotification = {
  id: string;
  type: string;
  sentAt: string;
  sentBy: UserSummary | null;
  message: string;
};

export type InterviewAuditItem = {
  id: string;
  action: string;
  actor: UserSummary | null;
  note: string;
  createdAt: string;
  meta: Record<string, unknown> | null;
};

export type InterviewPermissions = {
  canView: boolean;
  canEdit: boolean;
  canReschedule: boolean;
  canCancel: boolean;
  canComplete: boolean;
  canSendReminder: boolean;
  canSubmitFeedback: boolean;
};

export type Interview = {
  id: string;
  candidate: InterviewCandidateSummary | null;
  job: InterviewJobSummary | null;
  round: string;
  type: InterviewType;
  status: InterviewStatus;
  scheduledAt: string;
  scheduledEnd: string;
  duration: number;
  timezone: string;
  location: string;
  meetLink: string;
  interviewers: UserSummary[];
  leadInterviewer: UserSummary | null;
  recruiter: UserSummary | null;
  agenda: string;
  notes: string;
  reminderSettings: number[];
  sendInvite: boolean;
  feedback: InterviewFeedback[];
  feedbackStatus: FeedbackStatus;
  aggregateScore: number | null;
  notifications: InterviewNotification[];
  audit: InterviewAuditItem[];
  permissions: InterviewPermissions;
  createdAt: string;
  updatedAt: string;
  createdBy: UserSummary | null;
  updatedBy: UserSummary | null;
  cancelledReason: string;
};

export type InterviewMeta = {
  jobs: InterviewJobSummary[];
  recruiters: UserSummary[];
  interviewers: UserSummary[];
  candidates: Array<{
    id: string;
    name: string;
    email: string;
    stage: string;
    job: InterviewJobSummary | null;
  }>;
  statuses: InterviewStatus[];
  types: InterviewType[];
  feedbackStatuses: FeedbackStatus[];
};

export type InterviewFilters = {
  search: string;
  team: string;
  interviewer: string;
  status: "all" | InterviewStatus;
  type: "all" | InterviewType;
  recruiter: string;
  feedbackStatus: "all" | FeedbackStatus;
  sort: "scheduledAt-asc" | "scheduledAt-desc" | "candidate" | "status" | "round";
};

export type InterviewPagination = {
  page: number;
  limit: 10 | 25 | 50 | 100;
  total: number;
  totalPages: number;
};

export type InterviewsListResponse = {
  items: Interview[];
  pagination: InterviewPagination;
  filters: InterviewMeta;
};

export type InterviewsCalendarResponse = {
  weekStart: string;
  weekEnd: string;
  items: Interview[];
  upcoming: Interview[];
};

export type InterviewFormValues = {
  candidateId: string;
  jobId: string;
  round: string;
  type: InterviewType;
  date: string;
  time: string;
  timezone: string;
  duration: number;
  interviewers: string[];
  leadInterviewer: string;
  agenda: string;
  notes: string;
  meetingLink: string;
  location: string;
  reminderSettings: number[];
  sendInvite: boolean;
};

export type InterviewFeedbackValues = {
  rating: number;
  strengths: string;
  concerns: string;
  recommendation: InterviewFeedback["recommendation"];
};

export type InterviewBulkAction = "mark-completed" | "cancel";
