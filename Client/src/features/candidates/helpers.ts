import { format, formatDistanceToNow } from "date-fns";
import {
  Candidate,
  CandidateBulkActionPayload,
  CandidatePriority,
  CandidateSource,
  CandidateStage,
  CandidateStatusIndicator,
} from "@/features/candidates/types";

export const stageOrder: CandidateStage[] = [
  "Applied",
  "Screening",
  "Interview",
  "Offer",
  "Hired",
  "Rejected",
];

export const groupCandidatesByStage = (candidates: Candidate[]) =>
  stageOrder.reduce<Record<CandidateStage, Candidate[]>>(
    (groups, stage) => {
      groups[stage] = candidates.filter((candidate) => candidate.stage === stage);
      return groups;
    },
    {
      Applied: [],
      Screening: [],
      Interview: [],
      Offer: [],
      Hired: [],
      Rejected: [],
    }
  );

export const sourceLabels: Record<CandidateSource, string> = {
  portal: "Portal",
  referral: "Referral",
  manual: "Manual",
  campus: "Campus",
  linkedin: "LinkedIn",
  agency: "Agency",
};

export const priorityLabels: Record<CandidatePriority, string> = {
  Low: "Low",
  Medium: "Medium",
  High: "High",
};

export const statusToneClass: Record<CandidateStatusIndicator["tone"], string> = {
  success: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  warning: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  destructive: "bg-rose-500/10 text-rose-700 border-rose-500/20",
  muted: "bg-slate-500/10 text-slate-700 border-slate-500/20",
};

export const getCandidateInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");

export const formatTimestamp = (value?: string | null, fallback = "Not available") => {
  if (!value) {
    return fallback;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  return format(date, "MMM d, yyyy h:mm a");
};

export const formatShortDate = (value?: string | null, fallback = "Not available") => {
  if (!value) {
    return fallback;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  return format(date, "MMM d, yyyy");
};

export const formatRelative = (value?: string | null, fallback = "just now") => {
  if (!value) {
    return fallback;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  return formatDistanceToNow(date, { addSuffix: true });
};

export const scoreToneClass = (score: number | null) => {
  if (score === null) {
    return "bg-slate-500/10 text-slate-700 border-slate-500/20";
  }

  if (score >= 85) {
    return "bg-emerald-500/10 text-emerald-700 border-emerald-500/20";
  }

  if (score >= 70) {
    return "bg-sky-500/10 text-sky-700 border-sky-500/20";
  }

  if (score >= 50) {
    return "bg-amber-500/10 text-amber-700 border-amber-500/20";
  }

  return "bg-rose-500/10 text-rose-700 border-rose-500/20";
};

export const stageToneClass: Record<CandidateStage, string> = {
  Applied: "bg-slate-500/10 text-slate-700 border-slate-500/20",
  Screening: "bg-sky-500/10 text-sky-700 border-sky-500/20",
  Interview: "bg-violet-500/10 text-violet-700 border-violet-500/20",
  Offer: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  Hired: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  Rejected: "bg-rose-500/10 text-rose-700 border-rose-500/20",
};

export const averageAiScore = (candidates: Candidate[]) => {
  const scoredCandidates = candidates.filter((candidate) => typeof candidate.aiScore === "number");
  if (!scoredCandidates.length) {
    return null;
  }

  const total = scoredCandidates.reduce((sum, candidate) => sum + (candidate.aiScore || 0), 0);
  return Math.round(total / scoredCandidates.length);
};

export const candidateCsvColumns = [
  "Name",
  "Email",
  "Phone",
  "Applied Job",
  "Department",
  "Source",
  "Stage",
  "AI Score",
  "Applied Date",
  "Recruiter",
  "Last Updated",
  "Status",
];

const escapeCsv = (value: string | number | null) => {
  const normalized = value === null || typeof value === "undefined" ? "" : String(value);
  return `"${normalized.replace(/"/g, '""')}"`;
};

export const buildCandidatesCsv = (candidates: Candidate[]) => {
  const rows = candidates.map((candidate) =>
    [
      candidate.name,
      candidate.email,
      candidate.phone,
      candidate.job?.title || "",
      candidate.department,
      sourceLabels[candidate.source],
      candidate.stage,
      candidate.aiScore ?? "",
      formatShortDate(candidate.createdAt, ""),
      candidate.recruiterAssigned?.name || "",
      formatTimestamp(candidate.updatedAt, ""),
      candidate.status,
    ]
      .map(escapeCsv)
      .join(",")
  );

  return [candidateCsvColumns.join(","), ...rows].join("\n");
};

export const downloadCandidatesCsv = (candidates: Candidate[]) => {
  const csv = buildCandidatesCsv(candidates);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `hireflow-candidates-${format(new Date(), "yyyy-MM-dd")}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

export const getBulkActionLabel = (action: CandidateBulkActionPayload["action"]) => {
  if (action === "move-stage") return "Move stage";
  if (action === "assign-recruiter") return "Assign recruiter";
  if (action === "archive") return "Archive";
  return "Reject";
};
