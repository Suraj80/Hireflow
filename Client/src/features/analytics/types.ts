export type AnalyticsOverview = {
  totalCandidates: number;
  totalJobs: number;
  activeJobs: number;
  closedJobs: number;
  totalInterviews: number;
  upcomingInterviews: number;
  hiredCandidates: number;
  rejectedCandidates: number;
  offerAcceptanceRate: number;
};

export type PipelineAnalyticsItem = {
  stage: string;
  count: number;
};

export type PipelineAnalyticsResponse = {
  items: PipelineAnalyticsItem[];
};

export type SourceAnalyticsItem = {
  source: string;
  value: number;
};

export type SourceAnalyticsResponse = {
  items: SourceAnalyticsItem[];
};

export type TimeToHireItem = {
  label: string;
  avgDays: number;
  hires: number;
};

export type TimeToHireResponse = {
  avgDays: number;
  totalHires: number;
  items: TimeToHireItem[];
};

export type UpcomingInterviewItem = {
  id: string;
  candidateName: string;
  jobTitle: string;
  scheduledAt: string;
  round: string;
  mode: string;
  status: string;
};

export type UpcomingInterviewsResponse = {
  count: number;
  items: UpcomingInterviewItem[];
};
