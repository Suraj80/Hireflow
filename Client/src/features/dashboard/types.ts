import { CandidateStage } from "@/features/candidates/types";

export type DashboardRecentCandidate = {
  id: string;
  name: string;
  jobTitle: string;
  appliedAt: string;
  stage: CandidateStage;
  aiScore: number | null;
  email: string;
  phone: string;
};

export type DashboardUpcomingInterview = {
  id: string;
  candidateName: string;
  jobTitle: string;
  scheduledAt: string;
  round: string;
  mode: string;
  status: string;
};

export type DashboardActiveJob = {
  id: string;
  title: string;
  department: string;
  applicantsCount: number;
  deadline: string | null;
  status: string;
};

export type DashboardPipelineItem = {
  stage: CandidateStage;
  count: number;
};

export type DashboardActivityItem = {
  id: string;
  type: string;
  title: string;
  description: string;
  createdAt: string;
};

export type DashboardOverviewResponse = {
  totalCandidates: number;
  activeJobs: number;
  openJobs: number;
  upcomingInterviewsCount: number;
  candidatesInInterview: number;
  pendingApplications: number;
  hiredThisMonth: number;
  recentCandidates: DashboardRecentCandidate[];
  upcomingInterviews: DashboardUpcomingInterview[];
  activeJobsList: DashboardActiveJob[];
  pipelineSummary: DashboardPipelineItem[];
  recentActivity: DashboardActivityItem[];
};
