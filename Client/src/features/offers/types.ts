import type { UserRole } from "@/components/AuthProvider";

export type OfferStatus = "Draft" | "Sent" | "Accepted" | "Declined" | "Withdrawn" | "Expired";

export type OfferUserSummary = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

export type OfferCandidateSummary = {
  id: string;
  name: string;
  email: string;
  stage: string;
  recruiterAssigned: OfferUserSummary | null;
};

export type OfferJobSummary = {
  id: string;
  title: string;
  department: string;
  location?: string;
};

export type OfferVersion = {
  version: number;
  title: string;
  salaryAmount: number | null;
  bonusAmount: number | null;
  equity: string;
  currency: string;
  startDate: string | null;
  expiresAt: string | null;
  letterHtml: string;
  notes: string;
  changedAt: string;
  changedBy: OfferUserSummary | null;
};

export type Offer = {
  id: string;
  candidate: OfferCandidateSummary | null;
  job: OfferJobSummary | null;
  title: string;
  salaryAmount: number | null;
  bonusAmount: number | null;
  equity: string;
  currency: string;
  startDate: string | null;
  expiresAt: string | null;
  letterHtml: string;
  notes: string;
  status: OfferStatus;
  version: number;
  versions: OfferVersion[];
  shareUrl: string;
  sentAt: string | null;
  respondedAt: string | null;
  withdrawnAt: string | null;
  decisionName: string;
  decisionMessage: string;
  createdBy: OfferUserSummary | null;
  updatedBy: OfferUserSummary | null;
  createdAt: string;
  updatedAt: string;
};

export type OfferListResponse = {
  items: Offer[];
  pagination: {
    page: number;
    limit: 10 | 25 | 50 | 100;
    total: number;
    totalPages: number;
  };
  filters: {
    statuses: OfferStatus[];
  };
};

export type OfferMetaResponse = {
  candidates: Array<{
    id: string;
    name: string;
    email: string;
    stage: string;
    recruiterAssigned: OfferUserSummary | null;
    job: OfferJobSummary | null;
  }>;
  statuses: OfferStatus[];
};

export type OfferFormValues = {
  candidateId: string;
  title: string;
  salaryAmount: string;
  bonusAmount: string;
  equity: string;
  currency: string;
  startDate: string;
  expiresAt: string;
  letterHtml: string;
  notes: string;
};

export type PublicOffer = {
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  department: string;
  location: string;
  title: string;
  salaryAmount: number | null;
  bonusAmount: number | null;
  equity: string;
  currency: string;
  startDate: string | null;
  expiresAt: string | null;
  letterHtml: string;
  notes: string;
  status: OfferStatus;
  version: number;
  companyName: string;
};
