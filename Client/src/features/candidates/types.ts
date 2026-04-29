export type CandidateStage = "Applied" | "Screening" | "Interview" | "Offer" | "Hired" | "Rejected";
export type CandidateSource = "portal" | "referral" | "manual" | "campus" | "linkedin" | "agency";
export type CandidatePriority = "Low" | "Medium" | "High";
export type CandidateStatus = "Active" | "Hired" | "Rejected" | "Archived";
export type CandidateInterviewMode = "Virtual" | "Onsite" | "Phone";
export type CandidateInterviewStatus = "Scheduled" | "Completed" | "Cancelled";
export type CandidateSort = "newest" | "oldest" | "highest-ai" | "stage" | "name";
export type UserRole = "admin" | "recruiter" | "viewer";

export type UserSummary = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

export type CandidateJobSummary = {
  id: string;
  title: string;
  department: string;
  location?: string;
};

export type ResumeMeta = {
  filename: string;
  size: number;
  mimeType: string;
};

export type CandidateEducation = {
  degree: string;
  college: string;
  year: number | null;
};

export type CandidateExperience = {
  years: number;
  months: number;
};

export type CandidateStageHistoryItem = {
  stage: CandidateStage;
  changedBy: UserSummary | null;
  changedAt: string;
  reason: string;
};

export type CandidatePermissions = {
  canView: boolean;
  canEdit: boolean;
  canMoveStage: boolean;
  canScheduleInterview: boolean;
  canAddNote: boolean;
  canReject: boolean;
  canArchive: boolean;
  canAssignRecruiter: boolean;
};

export type CandidateStatusIndicator = {
  tone: "success" | "warning" | "destructive" | "muted";
  label: string;
};

export type CandidateNote = {
  id: string;
  candidateId: string;
  author: UserSummary | null;
  content: string;
  mentions: string[];
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
  editedAt: string | null;
};

export type CandidateInterview = {
  id: string;
  date: string;
  interviewers: string[];
  mode: CandidateInterviewMode;
  status: CandidateInterviewStatus;
  feedback: string;
};

export type CandidateTimelineItem = {
  id: string;
  type: string;
  title: string;
  description: string;
  createdAt: string;
  actorName: string;
  meta: Record<string, unknown> | null;
};

export type CandidateActivityItem = CandidateTimelineItem;

export type Candidate = {
  id: string;
  name: string;
  email: string;
  phone: string;
  altPhone: string;
  location: string;
  linkedin: string;
  portfolio: string;
  currentCompany: string;
  currentRole: string;
  job: CandidateJobSummary | null;
  jobId: string | null;
  department: string;
  source: CandidateSource;
  referredBy: string;
  expectedSalary: number | null;
  noticePeriod: string;
  workAuthorization: string;
  resumeUrl: string;
  resumeMeta: ResumeMeta;
  coverLetter: string;
  skills: string[];
  experience: CandidateExperience;
  education: CandidateEducation[];
  certifications: string[];
  languages: string[];
  recruiterAssigned: UserSummary | null;
  stage: CandidateStage;
  priority: CandidatePriority;
  rating: number | null;
  aiScore: number | null;
  aiReasoning: string;
  permissions: CandidatePermissions;
  statusIndicator: CandidateStatusIndicator;
  notesCount: number;
  archived: boolean;
  status: CandidateStatus;
  statusToken: string;
  createdBy: UserSummary | null;
  updatedBy: UserSummary | null;
  createdAt: string;
  updatedAt: string;
  stageHistory: CandidateStageHistoryItem[];
  notes: CandidateNote[];
  interviews: CandidateInterview[];
  activity: CandidateActivityItem[];
  timeline: CandidateTimelineItem[];
};

export type CandidateMeta = {
  jobs: CandidateJobSummary[];
  departments: string[];
  recruiters: UserSummary[];
  stages: CandidateStage[];
  sources: CandidateSource[];
  priorities: CandidatePriority[];
  statuses: CandidateStatus[];
  interviewModes: CandidateInterviewMode[];
  interviewStatuses: CandidateInterviewStatus[];
};

export type CandidateFilters = {
  search: string;
  job: string;
  department: string;
  stage: "all" | CandidateStage;
  source: "all" | CandidateSource;
  recruiter: string;
  status: "all" | CandidateStatus;
  aiScoreMin: number | null;
  aiScoreMax: number | null;
  appliedFrom: string;
  appliedTo: string;
  sort: CandidateSort;
};

export type CandidatePagination = {
  page: number;
  limit: 10 | 25 | 50 | 100;
  total: number;
  totalPages: number;
};

export type CandidatesListResponse = {
  items: Candidate[];
  pagination: CandidatePagination;
  filters: CandidateMeta;
};

export type CandidateCreateResponse = {
  item: Candidate;
  duplicateWarning: {
    candidateId: string;
    name: string;
    stage: CandidateStage;
    createdAt: string;
  } | null;
};

export type DuplicateCandidateResponse = {
  duplicate: Candidate | null;
};

export type ResumeUploadResponse = {
  uploadUrl: string;
  fileUrl: string;
  key: string;
  method: "PUT";
  headers: {
    "Content-Type": string;
  };
  expiresIn: number;
};

export type CandidateBulkActionPayload = {
  action: "move-stage" | "archive" | "reject" | "assign-recruiter";
  candidateIds: string[];
  stage?: CandidateStage;
  recruiterAssigned?: string | null;
  reason?: string;
};

export type CandidateBulkActionResponse = {
  message: string;
  processed: number;
  skipped: number;
};
