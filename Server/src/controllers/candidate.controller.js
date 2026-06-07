const mongoose = require("mongoose");
const crypto = require("crypto");
const fs = require("fs");
const Candidate = require("../models/Candidate");
const CandidateNote = require("../models/CandidateNote");
const Job = require("../models/Job");
const User = require("../models/User");
const {
  candidateAssignSchema,
  candidateBulkActionSchema,
  candidateCreateSchema,
  candidateInterviewSchema,
  candidateNoteSchema,
  publicCandidateApplicationSchema,
  candidateStageSchema,
  candidateUpdateSchema,
  candidatesQuerySchema,
  interviewModeOptions,
  interviewStatusOptions,
  priorityOptions,
  resumeUploadRequestSchema,
  sourceOptions,
  stageOptions,
  statusOptions,
} = require("../validation/candidate.validation");
const { createAuditLog } = require("../services/audit.service");
const {
  notifyCandidateStageChange,
  notifyNewApplication,
} = require("../services/notification.service");
const { queueCandidateResumeScoring } = require("../services/resumeScoring.service");

const buildValidationError = (issues) => ({
  message: "Validation failed",
  errors: issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
  })),
});

const generateStatusToken = () => crypto.randomBytes(18).toString("hex");

const deriveStatusFromStage = (stage, archived = false) => {
  if (archived) {
    return "Archived";
  }

  if (stage === "Rejected") {
    return "Rejected";
  }

  if (stage === "Hired") {
    return "Hired";
  }

  return "Active";
};

const inferMentionsFromContent = (content) => {
  const plainText = content.replace(/<[^>]+>/g, " ");
  return Array.from(new Set((plainText.match(/@([a-z0-9._-]+)/gi) || []).map((item) => item.slice(1))));
};

const applySort = (sort) => {
  switch (sort) {
    case "oldest":
      return { createdAt: 1 };
    case "highest-ai":
      return { aiScore: -1, createdAt: -1 };
    case "stage":
      return { stage: 1, createdAt: -1 };
    case "name":
      return { name: 1, createdAt: -1 };
    case "newest":
    default:
      return { createdAt: -1 };
  }
};

const buildListQuery = (filters) => {
  const query = {};

  if (filters.status === "Archived") {
    query.archived = true;
    query.status = "Archived";
  } else {
    query.archived = false;
  }

  if (filters.search) {
    query.$or = [
      { name: { $regex: filters.search, $options: "i" } },
      { email: { $regex: filters.search, $options: "i" } },
      { phone: { $regex: filters.search, $options: "i" } },
    ];
  }

  if (filters.job !== "all") {
    query.jobId = filters.job;
  }

  if (filters.department !== "all") {
    query.department = filters.department;
  }

  if (filters.stage !== "all") {
    query.stage = filters.stage;
  }

  if (filters.source !== "all") {
    query.source = filters.source;
  }

  if (filters.recruiter !== "all") {
    query.recruiterAssigned = filters.recruiter;
  }

  if (filters.status !== "all" && filters.status !== "Archived") {
    query.status = filters.status;
  }

  if (filters.aiScoreMin !== null || filters.aiScoreMax !== null) {
    query.aiScore = {};
    if (filters.aiScoreMin !== null) {
      query.aiScore.$gte = filters.aiScoreMin;
    }
    if (filters.aiScoreMax !== null) {
      query.aiScore.$lte = filters.aiScoreMax;
    }
  }

  if (filters.appliedFrom || filters.appliedTo) {
    query.createdAt = {};
    if (filters.appliedFrom) {
      query.createdAt.$gte = new Date(filters.appliedFrom);
    }
    if (filters.appliedTo) {
      const end = new Date(filters.appliedTo);
      end.setHours(23, 59, 59, 999);
      query.createdAt.$lte = end;
    }
  }

  return query;
};

const toComparableId = (value) => {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  return value._id?.toString?.() || value.id?.toString?.() || value.toString?.() || "";
};

const canManageCandidate = (candidate, user) =>
  Boolean(
    user &&
      (user.role === "admin" ||
        toComparableId(candidate.recruiterAssigned) === user.id ||
        toComparableId(candidate.createdBy) === user.id)
  );

const deriveCandidatePermissions = (candidate, viewerUser) => {
  const canManage = canManageCandidate(candidate, viewerUser);
  const canView = Boolean(viewerUser);

  return {
    canView,
    canEdit: canManage,
    canMoveStage: canManage,
    canScheduleInterview: canManage,
    canAddNote: canManage,
    canReject: canManage,
    canArchive: canManage,
    canAssignRecruiter: canManage,
  };
};

const deriveStatusIndicator = (candidate) => {
  if (candidate.archived || candidate.status === "Archived") {
    return { tone: "muted", label: "Archived" };
  }

  if (candidate.stage === "Hired") {
    return { tone: "success", label: "Hired" };
  }

  if (candidate.stage === "Rejected") {
    return { tone: "destructive", label: "Rejected" };
  }

  const updatedAt = candidate.updatedAt ? new Date(candidate.updatedAt) : new Date();
  const staleForMs = Date.now() - updatedAt.getTime();

  if (staleForMs > 14 * 24 * 60 * 60 * 1000) {
    return { tone: "warning", label: "Stale" };
  }

  return { tone: "success", label: "Active" };
};

const appendActivity = (candidate, entry) => {
  candidate.activityLog.unshift({
    type: entry.type,
    title: entry.title,
    description: entry.description || "",
    actorId: entry.actorId,
    actorName: entry.actorName || "",
    createdAt: new Date(),
    meta: entry.meta || null,
  });
};

const recordCandidateAudit = async (req, candidate, action, description, meta = null) =>
  createAuditLog({
    req,
    action,
    category: "candidates",
    entity: {
      type: "candidate",
      id: candidate._id || candidate.id,
      label: candidate.name,
    },
    description,
    meta,
  });

const normalizeUser = (user) => {
  if (!user) {
    return null;
  }

  return {
    id: user._id || user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
};

const mapNote = (note) => ({
  id: note._id,
  candidateId: note.candidateId,
  author: normalizeUser(note.authorId),
  content: note.content,
  mentions: note.mentions,
  pinned: note.pinned,
  createdAt: note.createdAt,
  updatedAt: note.updatedAt,
  editedAt: note.editedAt,
});

const mapInterview = (interview, index = 0) => ({
  id: interview._id || `${interview.date}-${index}`,
  date: interview.date,
  interviewers: interview.interviewers,
  mode: interview.mode,
  status: interview.status,
  feedback: interview.feedback,
});

const buildCandidateMetaPayload = ({ jobs, departments, recruiters }) => ({
  jobs: jobs.map((job) => ({ id: job._id, title: job.title, department: job.department })),
  departments: departments.filter(Boolean).sort(),
  recruiters: recruiters.map(normalizeUser),
  stages: stageOptions,
  sources: sourceOptions,
  priorities: priorityOptions,
  statuses: statusOptions,
  interviewModes: interviewModeOptions,
  interviewStatuses: interviewStatusOptions,
});

const loadCandidateMeta = async () => {
  const [jobs, departments, recruiters] = await Promise.all([
    Job.find({ archived: false }).select("title department"),
    Candidate.distinct("department", { archived: false }),
    User.find({ role: { $in: ["admin", "recruiter"] } }).select("name email role"),
  ]);

  return buildCandidateMetaPayload({ jobs, departments, recruiters });
};

const getPublicBaseUrl = (req) => {
  const configuredBaseUrl = process.env.PUBLIC_SERVER_URL || process.env.PUBLIC_API_BASE_URL;
  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/+$/g, "");
  }

  return `${req.protocol}://${req.get("host")}`;
};

const normalizeCandidateResponse = async (
  candidateDocument,
  { includeNotes = false, viewerUser = null } = {}
) => {
  const candidate = candidateDocument.toObject ? candidateDocument.toObject() : candidateDocument;
  const notes = includeNotes
    ? await CandidateNote.find({ candidateId: candidate._id })
        .populate("authorId", "name email role")
        .sort({ pinned: -1, createdAt: -1 })
    : [];

  const timeline = [
    ...candidate.activityLog.map((item, index) => ({
      id: `activity-${index}-${item.createdAt}`,
      type: item.type,
      title: item.title,
      description: item.description,
      createdAt: item.createdAt,
      actorName: item.actorName,
      meta: item.meta,
    })),
    ...candidate.stageHistory.map((item, index) => ({
      id: `stage-${index}-${item.changedAt}`,
      type: "stage-change",
      title: `Moved to ${item.stage}`,
      description: item.reason || "",
      createdAt: item.changedAt,
      actorName: item.changedBy?.name || "",
      meta: { stage: item.stage },
    })),
    ...notes.map((note) => ({
      id: `note-${note._id}`,
      type: "note",
      title: note.pinned ? "Pinned note added" : "Note added",
      description: note.content,
      createdAt: note.createdAt,
      actorName: note.authorId?.name || "",
      meta: { pinned: note.pinned },
    })),
  ].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());

  return {
    id: candidate._id,
    name: candidate.name,
    email: candidate.email,
    phone: candidate.phone,
    altPhone: candidate.altPhone,
    location: candidate.location,
    linkedin: candidate.linkedin,
    portfolio: candidate.portfolio,
    currentCompany: candidate.currentCompany,
    currentRole: candidate.currentRole,
    job: candidate.jobId
      ? {
          id: candidate.jobId._id || candidate.jobId.id || candidate.jobId,
          title: candidate.jobId.title,
          department: candidate.jobId.department,
          location: candidate.jobId.location,
        }
      : null,
    jobId: candidate.jobId?._id || candidate.jobId?.id || candidate.jobId || null,
    department: candidate.department,
    source: candidate.source,
    referredBy: candidate.referredBy,
    expectedSalary: candidate.expectedSalary,
    noticePeriod: candidate.noticePeriod,
    workAuthorization: candidate.workAuthorization,
    resumeUrl: candidate.resumeUrl,
    resumeMeta: candidate.resumeMeta,
    coverLetter: candidate.coverLetter,
    skills: candidate.skills,
    experience: candidate.experience,
    education: candidate.education,
    certifications: candidate.certifications,
    languages: candidate.languages,
    recruiterAssigned: normalizeUser(candidate.recruiterAssigned),
    stage: candidate.stage,
    priority: candidate.priority,
    rating: candidate.rating,
    aiScore: candidate.aiScore,
    aiReasoning: candidate.aiReasoning,
    aiStatus: candidate.aiStatus || (candidate.resumeUrl ? "queued" : "not-started"),
    aiError: candidate.aiError || "",
    aiScoredAt: candidate.aiScoredAt || null,
    permissions: deriveCandidatePermissions(candidate, viewerUser),
    statusIndicator: deriveStatusIndicator(candidate),
    notesCount: candidate.notesCount,
    archived: candidate.archived,
    status: candidate.status,
    statusToken: candidate.statusToken,
    createdBy: normalizeUser(candidate.createdBy),
    updatedBy: normalizeUser(candidate.updatedBy),
    createdAt: candidate.createdAt,
    updatedAt: candidate.updatedAt,
    stageHistory: candidate.stageHistory.map((item) => ({
      stage: item.stage,
      changedBy: normalizeUser(item.changedBy),
      changedAt: item.changedAt,
      reason: item.reason,
    })),
    notes: notes.map(mapNote),
    interviews: candidate.interviews.map(mapInterview),
    activity: candidate.activityLog.map((item, index) => ({
      id: `audit-${index}-${item.createdAt}`,
      type: item.type,
      title: item.title,
      description: item.description,
      actorName: item.actorName,
      createdAt: item.createdAt,
      meta: item.meta,
    })),
    timeline,
  };
};

const ensureManageAccess = (candidate, req, res) => {
  if (!canManageCandidate(candidate, req.user)) {
    res.status(403).json({ message: "Forbidden" });
    return false;
  }

  return true;
};

const ensureStageMoveAccess = (req, res) => {
  if (!req.user || !["admin", "recruiter"].includes(req.user.role)) {
    res.status(403).json({ message: "Forbidden" });
    return false;
  }

  return true;
};

const ensureAssignableRecruiter = async (recruiterId) => {
  if (!recruiterId) {
    return null;
  }

  return User.findOne({
    _id: recruiterId,
    role: { $in: ["admin", "recruiter"] },
  }).select("name email role");
};

const deriveAIStateForPayload = (payload) => {
  if (!payload.resumeUrl) {
    return {
      aiScore: null,
      aiReasoning: "",
      aiStatus: "not-started",
      aiError: "",
      aiScoredAt: null,
      aiInputHash: "",
      aiModel: "",
    };
  }

  if (!process.env.OPENAI_API_KEY) {
    return {
      aiScore: null,
      aiReasoning: "AI scoring is unavailable until OPENAI_API_KEY is configured on the server.",
      aiStatus: "unavailable",
      aiError: "AI scoring is unavailable until OPENAI_API_KEY is configured on the server.",
      aiScoredAt: null,
      aiInputHash: "",
      aiModel: "",
    };
  }

  return {
    aiScore: null,
    aiReasoning: "Resume uploaded. AI scoring has been queued and will complete shortly.",
    aiStatus: "queued",
    aiError: "",
    aiScoredAt: null,
    aiInputHash: "",
    aiModel: "",
  };
};

const aiScoringFields = new Set([
  "resumeUrl",
  "resumeMeta",
  "jobId",
  "skills",
  "experience",
  "education",
  "certifications",
  "languages",
  "currentRole",
  "currentCompany",
  "coverLetter",
  "location",
  "workAuthorization",
  "noticePeriod",
]);

const getCandidates = async (req, res) => {
  const parsedQuery = candidatesQuerySchema.safeParse(req.query);

  if (!parsedQuery.success) {
    return res.status(400).json(buildValidationError(parsedQuery.error.issues));
  }

  try {
    const filters = parsedQuery.data;
    const query = buildListQuery(filters);
    const skip = (filters.page - 1) * filters.limit;

    const [items, total, meta] = await Promise.all([
      Candidate.find(query)
        .populate("jobId", "title department location")
        .populate("recruiterAssigned", "name email role")
        .populate("createdBy", "name email role")
        .populate("updatedBy", "name email role")
        .sort(applySort(filters.sort))
        .skip(skip)
        .limit(filters.limit),
      Candidate.countDocuments(query),
      loadCandidateMeta(),
    ]);

    return res.status(200).json({
      items: await Promise.all(
        items.map((item) => normalizeCandidateResponse(item, { viewerUser: req.user }))
      ),
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / filters.limit)),
      },
      filters: meta,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getCandidatesMeta = async (_req, res) => {
  try {
    return res.status(200).json(await loadCandidateMeta());
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getCandidateById = async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.id)
      .populate("jobId", "title department location")
      .populate("recruiterAssigned", "name email role")
      .populate("createdBy", "name email role")
      .populate("updatedBy", "name email role")
      .populate("stageHistory.changedBy", "name email role");

    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    return res
      .status(200)
      .json(await normalizeCandidateResponse(candidate, { includeNotes: true, viewerUser: req.user }));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getCandidateStatusByToken = async (req, res) => {
  try {
    const token = String(req.params.token || "").trim();

    if (!token) {
      return res.status(400).json({ message: "Status token is required" });
    }

    const candidate = await Candidate.findOne({ statusToken: token, archived: false })
      .populate("jobId", "title department")
      .select("name stage status createdAt updatedAt statusToken jobId");

    if (!candidate) {
      return res.status(404).json({ message: "Application status not found" });
    }

    return res.status(200).json({
      name: candidate.name,
      stage: candidate.stage,
      status: candidate.status,
      createdAt: candidate.createdAt,
      updatedAt: candidate.updatedAt,
      statusToken: candidate.statusToken,
      job: candidate.jobId
        ? {
            id: candidate.jobId._id || candidate.jobId.id,
            title: candidate.jobId.title,
            department: candidate.jobId.department,
          }
        : null,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const createCandidate = async (req, res) => {
  const parsedBody = candidateCreateSchema.safeParse(req.body);

  if (!parsedBody.success) {
    return res.status(400).json(buildValidationError(parsedBody.error.issues));
  }

  try {
    const payload = parsedBody.data;
    const job = await Job.findById(payload.jobId);

    if (!job || job.archived) {
      return res.status(404).json({ message: "Job not found" });
    }

    if (payload.recruiterAssigned) {
      const recruiter = await ensureAssignableRecruiter(payload.recruiterAssigned);
      if (!recruiter) {
        return res.status(404).json({ message: "Assigned recruiter not found" });
      }
    }

    const duplicate = await Candidate.findOne({
      email: payload.email.toLowerCase(),
      jobId: payload.jobId,
      archived: false,
    }).select("_id name createdAt stage");

    const candidate = await Candidate.create({
      ...payload,
      ...deriveAIStateForPayload(payload),
      department: payload.department || job.department,
      email: payload.email.toLowerCase(),
      status: deriveStatusFromStage(payload.stage, false),
      createdBy: req.user.id,
      updatedBy: req.user.id,
      stageHistory: [
        {
          stage: payload.stage,
          changedBy: req.user.id,
          changedAt: new Date(),
          reason: "Candidate created",
        },
      ],
      activityLog: [
        {
          type: "created",
          title: "Candidate created",
          description: `${payload.name} was added to the pipeline for ${job.title}.`,
          actorId: req.user.id,
          actorName: req.user.name || req.user.role,
          createdAt: new Date(),
          meta: {
            source: payload.source,
          },
        },
      ],
    });

    if (candidate.resumeUrl) {
      await queueCandidateResumeScoring(candidate._id.toString());
    }

    await recordCandidateAudit(
      req,
      candidate,
      "created",
      `Created candidate ${candidate.name} for ${job.title}`,
      {
        stage: candidate.stage,
        source: candidate.source,
        jobId: candidate.jobId,
        jobTitle: job.title,
      }
    );

    const savedCandidate = await Candidate.findById(candidate._id)
      .populate("jobId", "title department location")
      .populate("recruiterAssigned", "name email role")
      .populate("createdBy", "name email role")
      .populate("updatedBy", "name email role")
      .populate("stageHistory.changedBy", "name email role");

    return res.status(201).json({
      item: await normalizeCandidateResponse(savedCandidate, {
        includeNotes: true,
        viewerUser: req.user,
      }),
      duplicateWarning: duplicate
        ? {
            candidateId: duplicate._id,
            name: duplicate.name,
            stage: duplicate.stage,
            createdAt: duplicate.createdAt,
          }
        : null,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const updateCandidate = async (req, res) => {
  const parsedBody = candidateUpdateSchema.safeParse(req.body);

  if (!parsedBody.success) {
    return res.status(400).json(buildValidationError(parsedBody.error.issues));
  }

  try {
    const candidate = await Candidate.findById(req.params.id);
    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    if (!ensureManageAccess(candidate, req, res)) {
      return;
    }

    const previousStage = candidate.stage;
    const nextStage = parsedBody.data.stage || previousStage;
    const nextJobId = parsedBody.data.jobId || candidate.jobId?.toString();
    const nextEmail = (parsedBody.data.email || candidate.email).toLowerCase();

    if (parsedBody.data.jobId) {
      const job = await Job.findById(parsedBody.data.jobId);
      if (!job || job.archived) {
        return res.status(404).json({ message: "Job not found" });
      }

      if (!parsedBody.data.department) {
        parsedBody.data.department = job.department;
      }
    }

    if (Object.prototype.hasOwnProperty.call(parsedBody.data, "recruiterAssigned") && parsedBody.data.recruiterAssigned) {
      const recruiter = await ensureAssignableRecruiter(parsedBody.data.recruiterAssigned);
      if (!recruiter) {
        return res.status(404).json({ message: "Assigned recruiter not found" });
      }
    }

    const duplicate = await Candidate.findOne({
      _id: { $ne: candidate._id },
      email: nextEmail,
      jobId: nextJobId,
      archived: false,
    }).select("_id name");

    if (duplicate) {
      return res.status(409).json({
        message: "Another candidate with this email already exists for the selected job",
        duplicateWarning: {
          candidateId: duplicate._id,
          name: duplicate.name,
        },
      });
    }

    const shouldRefreshAIScore = Object.keys(parsedBody.data).some((key) => aiScoringFields.has(key));
    const assignmentPayload = {
      ...parsedBody.data,
      updatedBy: req.user.id,
      status: deriveStatusFromStage(nextStage, parsedBody.data.archived ?? candidate.archived),
      email: nextEmail,
    };

    if (shouldRefreshAIScore) {
      Object.assign(
        assignmentPayload,
        deriveAIStateForPayload({
          resumeUrl:
            typeof parsedBody.data.resumeUrl === "string" ? parsedBody.data.resumeUrl : candidate.resumeUrl,
        })
      );
    }

    Object.assign(candidate, assignmentPayload);

    if (nextStage !== previousStage) {
      candidate.stageHistory.unshift({
        stage: nextStage,
        changedBy: req.user.id,
        changedAt: new Date(),
        reason: "Updated from candidate form",
      });
      appendActivity(candidate, {
        type: "stage-change",
        title: `Moved to ${nextStage}`,
        description: "Stage updated from the candidate form.",
        actorId: req.user.id,
        actorName: req.user.name || req.user.role,
        meta: { previousStage, nextStage },
      });
    } else {
      appendActivity(candidate, {
        type: "updated",
        title: "Candidate profile updated",
        description: "Candidate details were edited.",
        actorId: req.user.id,
        actorName: req.user.name || req.user.role,
      });
    }

    await candidate.save();

    if (shouldRefreshAIScore && candidate.resumeUrl) {
      await queueCandidateResumeScoring(candidate._id.toString());
    }

    await recordCandidateAudit(req, candidate, "updated", `Updated candidate ${candidate.name}`, {
      stage: candidate.stage,
      recruiterAssigned: candidate.recruiterAssigned,
      aiRescored: shouldRefreshAIScore && Boolean(candidate.resumeUrl),
    });

    const populated = await Candidate.findById(candidate._id)
      .populate("jobId", "title department location")
      .populate("recruiterAssigned", "name email role")
      .populate("createdBy", "name email role")
      .populate("updatedBy", "name email role")
      .populate("stageHistory.changedBy", "name email role");

    return res.status(200).json(
      await normalizeCandidateResponse(populated, { includeNotes: true, viewerUser: req.user })
    );
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const updateCandidateStage = async (req, res) => {
  const parsedBody = candidateStageSchema.safeParse(req.body);

  if (!parsedBody.success) {
    return res.status(400).json(buildValidationError(parsedBody.error.issues));
  }

  try {
    const candidate = await Candidate.findById(req.params.id);
    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    if (!ensureStageMoveAccess(req, res)) {
      return;
    }

    const previousStage = candidate.stage;
    candidate.stage = parsedBody.data.stage;
    candidate.status = deriveStatusFromStage(parsedBody.data.stage, candidate.archived);
    candidate.updatedBy = req.user.id;
    candidate.stageHistory.unshift({
      stage: parsedBody.data.stage,
      changedBy: req.user.id,
      changedAt: new Date(),
      reason: parsedBody.data.reason,
    });
    appendActivity(candidate, {
      type: "stage-change",
      title: `Moved to ${parsedBody.data.stage}`,
      description: parsedBody.data.reason || "",
      actorId: req.user.id,
      actorName: req.user.name || req.user.role,
      meta: { previousStage, nextStage: parsedBody.data.stage },
    });

    await candidate.save();

    await recordCandidateAudit(
      req,
      candidate,
      "stage-moved",
      `Moved candidate ${candidate.name} from ${previousStage} to ${parsedBody.data.stage}`,
      {
        previousStage,
        nextStage: parsedBody.data.stage,
        reason: parsedBody.data.reason,
      }
    );

    if (nextStage !== previousStage) {
      await notifyCandidateStageChange({
        candidate,
        previousStage,
        nextStage,
        actorId: req.user.id,
        reason: "Updated from candidate form",
      });
    }

    const populated = await Candidate.findById(candidate._id)
      .populate("jobId", "title department location")
      .populate("recruiterAssigned", "name email role")
      .populate("createdBy", "name email role")
      .populate("updatedBy", "name email role")
      .populate("stageHistory.changedBy", "name email role");

    return res.status(200).json(
      await normalizeCandidateResponse(populated, { includeNotes: true, viewerUser: req.user })
    );
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const assignCandidate = async (req, res) => {
  const parsedBody = candidateAssignSchema.safeParse(req.body);

  if (!parsedBody.success) {
    return res.status(400).json(buildValidationError(parsedBody.error.issues));
  }

  try {
    const candidate = await Candidate.findById(req.params.id);
    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    if (!ensureManageAccess(candidate, req, res)) {
      return;
    }

    if (parsedBody.data.recruiterAssigned) {
      const recruiter = await ensureAssignableRecruiter(parsedBody.data.recruiterAssigned);
      if (!recruiter) {
        return res.status(404).json({ message: "Assigned recruiter not found" });
      }
    }

    candidate.recruiterAssigned = parsedBody.data.recruiterAssigned || null;
    candidate.updatedBy = req.user.id;
    appendActivity(candidate, {
      type: "assignment",
      title: candidate.recruiterAssigned ? "Recruiter assigned" : "Recruiter unassigned",
      description: candidate.recruiterAssigned ? "Ownership was updated." : "Ownership was cleared.",
      actorId: req.user.id,
      actorName: req.user.name || req.user.role,
      meta: { recruiterAssigned: candidate.recruiterAssigned },
    });
    await candidate.save();

    await recordCandidateAudit(
      req,
      candidate,
      "assigned",
      `${candidate.recruiterAssigned ? "Assigned" : "Unassigned"} recruiter for ${candidate.name}`,
      {
        recruiterAssigned: candidate.recruiterAssigned,
      }
    );

    if (parsedBody.data.stage !== previousStage) {
      await notifyCandidateStageChange({
        candidate,
        previousStage,
        nextStage: parsedBody.data.stage,
        actorId: req.user.id,
        reason: parsedBody.data.reason,
      });
    }

    const populated = await Candidate.findById(candidate._id)
      .populate("jobId", "title department location")
      .populate("recruiterAssigned", "name email role")
      .populate("createdBy", "name email role")
      .populate("updatedBy", "name email role")
      .populate("stageHistory.changedBy", "name email role");

    return res.status(200).json(
      await normalizeCandidateResponse(populated, { includeNotes: true, viewerUser: req.user })
    );
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const addCandidateNote = async (req, res) => {
  const parsedBody = candidateNoteSchema.safeParse(req.body);

  if (!parsedBody.success) {
    return res.status(400).json(buildValidationError(parsedBody.error.issues));
  }

  try {
    const candidate = await Candidate.findById(req.params.id);
    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    if (!ensureManageAccess(candidate, req, res)) {
      return;
    }

    const note = await CandidateNote.create({
      candidateId: candidate._id,
      authorId: req.user.id,
      content: parsedBody.data.content,
      mentions: parsedBody.data.mentions.length ? parsedBody.data.mentions : inferMentionsFromContent(parsedBody.data.content),
      pinned: parsedBody.data.pinned,
    });

    candidate.notesCount += 1;
    candidate.updatedBy = req.user.id;
    appendActivity(candidate, {
      type: "note",
      title: parsedBody.data.pinned ? "Pinned note added" : "Note added",
      description: "Internal recruiter note saved.",
      actorId: req.user.id,
      actorName: req.user.name || req.user.role,
      meta: { pinned: parsedBody.data.pinned },
    });
    await candidate.save();

    const populatedNote = await CandidateNote.findById(note._id).populate("authorId", "name email role");

    await recordCandidateAudit(req, candidate, "note-added", `Added note to ${candidate.name}`, {
      pinned: parsedBody.data.pinned,
      noteId: note._id,
    });

    return res.status(201).json(mapNote(populatedNote));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const addCandidateInterview = async (req, res) => {
  const parsedBody = candidateInterviewSchema.safeParse(req.body);

  if (!parsedBody.success) {
    return res.status(400).json(buildValidationError(parsedBody.error.issues));
  }

  try {
    const candidate = await Candidate.findById(req.params.id);
    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    if (!ensureManageAccess(candidate, req, res)) {
      return;
    }

    candidate.interviews.unshift({
      ...parsedBody.data,
      date: new Date(parsedBody.data.date),
    });
    candidate.updatedBy = req.user.id;
    appendActivity(candidate, {
      type: "interview",
      title: "Interview scheduled",
      description: `${parsedBody.data.mode} interview set for ${new Date(parsedBody.data.date).toLocaleString()}.`,
      actorId: req.user.id,
      actorName: req.user.name || req.user.role,
      meta: {
        date: parsedBody.data.date,
        mode: parsedBody.data.mode,
        interviewers: parsedBody.data.interviewers,
        status: parsedBody.data.status,
      },
    });
    await candidate.save();

    await recordCandidateAudit(req, candidate, "interview-scheduled", `Scheduled interview for ${candidate.name}`, {
      date: parsedBody.data.date,
      mode: parsedBody.data.mode,
      status: parsedBody.data.status,
      interviewers: parsedBody.data.interviewers,
    });

    const populated = await Candidate.findById(candidate._id)
      .populate("jobId", "title department location")
      .populate("recruiterAssigned", "name email role")
      .populate("createdBy", "name email role")
      .populate("updatedBy", "name email role")
      .populate("stageHistory.changedBy", "name email role");

    return res.status(201).json(
      await normalizeCandidateResponse(populated, { includeNotes: true, viewerUser: req.user })
    );
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const updateCandidateNote = async (req, res) => {
  const parsedBody = candidateNoteSchema.safeParse(req.body);

  if (!parsedBody.success) {
    return res.status(400).json(buildValidationError(parsedBody.error.issues));
  }

  try {
    const candidate = await Candidate.findById(req.params.id);
    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    if (!ensureManageAccess(candidate, req, res)) {
      return;
    }

    const note = await CandidateNote.findOne({ _id: req.params.noteId, candidateId: candidate._id });
    if (!note) {
      return res.status(404).json({ message: "Note not found" });
    }

    note.content = parsedBody.data.content;
    note.mentions = parsedBody.data.mentions.length ? parsedBody.data.mentions : inferMentionsFromContent(parsedBody.data.content);
    note.pinned = parsedBody.data.pinned;
    note.editedAt = new Date();
    await note.save();

    appendActivity(candidate, {
      type: "note",
      title: "Note updated",
      description: "Internal recruiter note edited.",
      actorId: req.user.id,
      actorName: req.user.name || req.user.role,
      meta: { noteId: note._id },
    });
    candidate.updatedBy = req.user.id;
    await candidate.save();

    const populatedNote = await CandidateNote.findById(note._id).populate("authorId", "name email role");
    await recordCandidateAudit(req, candidate, "note-updated", `Updated note on ${candidate.name}`, {
      pinned: parsedBody.data.pinned,
      noteId: note._id,
    });
    return res.status(200).json(mapNote(populatedNote));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const deleteCandidateNote = async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.id);
    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    if (!ensureManageAccess(candidate, req, res)) {
      return;
    }

    const note = await CandidateNote.findOneAndDelete({ _id: req.params.noteId, candidateId: candidate._id });
    if (!note) {
      return res.status(404).json({ message: "Note not found" });
    }

    candidate.notesCount = Math.max(0, candidate.notesCount - 1);
    candidate.updatedBy = req.user.id;
    appendActivity(candidate, {
      type: "note",
      title: "Note deleted",
      description: "Internal recruiter note removed.",
      actorId: req.user.id,
      actorName: req.user.name || req.user.role,
      meta: { noteId: note._id },
    });
    await candidate.save();

    await recordCandidateAudit(req, candidate, "note-deleted", `Deleted note from ${candidate.name}`, {
      noteId: note._id,
    });

    return res.status(200).json({ message: "Note deleted" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const deleteCandidate = async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.id);
    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    if (!ensureManageAccess(candidate, req, res)) {
      return;
    }

    candidate.archived = true;
    candidate.status = "Archived";
    candidate.updatedBy = req.user.id;
    appendActivity(candidate, {
      type: "archived",
      title: "Candidate archived",
      description: "Candidate was archived from the active pipeline.",
      actorId: req.user.id,
      actorName: req.user.name || req.user.role,
    });
    await candidate.save();

    await recordCandidateAudit(req, candidate, "archived", `Archived candidate ${candidate.name}`, {
      status: candidate.status,
    });

    return res.status(200).json({ message: "Candidate archived successfully" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const bulkActionCandidates = async (req, res) => {
  const parsedBody = candidateBulkActionSchema.safeParse(req.body);

  if (!parsedBody.success) {
    return res.status(400).json(buildValidationError(parsedBody.error.issues));
  }

  try {
    const { action, candidateIds, stage, recruiterAssigned, reason } = parsedBody.data;

    if (action === "assign-recruiter" && recruiterAssigned) {
      const recruiter = await ensureAssignableRecruiter(recruiterAssigned);
      if (!recruiter) {
        return res.status(404).json({ message: "Assigned recruiter not found" });
      }
    }

    const candidates = await Candidate.find({ _id: { $in: candidateIds } });
    const manageableCandidates = candidates.filter((candidate) => canManageCandidate(candidate, req.user));

    if (manageableCandidates.length === 0) {
      return res.status(403).json({ message: "No candidates available for this action" });
    }

    for (const candidate of manageableCandidates) {
      candidate.updatedBy = req.user.id;
      let auditEntry = null;

      if (action === "move-stage") {
        const previousStage = candidate.stage;
        candidate.stage = stage;
        candidate.status = deriveStatusFromStage(stage, candidate.archived);
        candidate.stageHistory.unshift({
          stage,
          changedBy: req.user.id,
          changedAt: new Date(),
          reason,
        });
        appendActivity(candidate, {
          type: "stage-change",
          title: `Moved to ${stage}`,
          description: reason,
          actorId: req.user.id,
          actorName: req.user.name || req.user.role,
        });
        auditEntry = {
          action: "stage-moved",
          description: `Moved candidate ${candidate.name} to ${stage} in bulk`,
          meta: {
            previousStage,
            nextStage: stage,
            reason,
            bulkAction: true,
          },
        };
      }

      if (action === "archive") {
        candidate.archived = true;
        candidate.status = "Archived";
        appendActivity(candidate, {
          type: "archived",
          title: "Candidate archived",
          description: reason,
          actorId: req.user.id,
          actorName: req.user.name || req.user.role,
        });
        auditEntry = {
          action: "archived",
          description: `Archived candidate ${candidate.name} in bulk`,
          meta: {
            reason,
            bulkAction: true,
          },
        };
      }

      if (action === "reject") {
        const previousStage = candidate.stage;
        candidate.stage = "Rejected";
        candidate.status = "Rejected";
        candidate.stageHistory.unshift({
          stage: "Rejected",
          changedBy: req.user.id,
          changedAt: new Date(),
          reason,
        });
        appendActivity(candidate, {
          type: "stage-change",
          title: "Candidate rejected",
          description: reason,
          actorId: req.user.id,
          actorName: req.user.name || req.user.role,
        });
        auditEntry = {
          action: "stage-moved",
          description: `Rejected candidate ${candidate.name} in bulk`,
          meta: {
            previousStage,
            nextStage: "Rejected",
            reason,
            bulkAction: true,
          },
        };
      }

      if (action === "assign-recruiter") {
        candidate.recruiterAssigned = recruiterAssigned || null;
        appendActivity(candidate, {
          type: "assignment",
          title: recruiterAssigned ? "Recruiter assigned" : "Recruiter unassigned",
          description: reason,
          actorId: req.user.id,
          actorName: req.user.name || req.user.role,
        });
        auditEntry = {
          action: "assigned",
          description: `${recruiterAssigned ? "Assigned" : "Unassigned"} recruiter for ${candidate.name} in bulk`,
          meta: {
            recruiterAssigned,
            reason,
            bulkAction: true,
          },
        };
      }

      await candidate.save();

      if (auditEntry) {
        await recordCandidateAudit(req, candidate, auditEntry.action, auditEntry.description, auditEntry.meta);
      }

      if (auditEntry?.action === "stage-moved") {
        await notifyCandidateStageChange({
          candidate,
          previousStage: auditEntry.meta?.previousStage || "Applied",
          nextStage: auditEntry.meta?.nextStage || candidate.stage,
          actorId: req.user.id,
          reason,
          bulkAction: true,
        });
      }
    }

    return res.status(200).json({
      message: "Bulk action completed",
      processed: manageableCandidates.length,
      skipped: candidateIds.length - manageableCandidates.length,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const checkDuplicateCandidate = async (req, res) => {
  const { email = "", jobId = "" } = req.query;

  if (!email || !jobId || !mongoose.Types.ObjectId.isValid(jobId)) {
    return res.status(200).json({ duplicate: null });
  }

  try {
    const duplicate = await Candidate.findOne({
      email: email.toLowerCase(),
      jobId,
      archived: false,
    })
      .populate("jobId", "title department")
      .populate("recruiterAssigned", "name email role");

    if (!duplicate) {
      return res.status(200).json({ duplicate: null });
    }

    return res.status(200).json({
      duplicate: await normalizeCandidateResponse(duplicate, { viewerUser: req.user }),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const requestResumeUploadUrl = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "Resume file is required" });
  }

  const parsedBody = resumeUploadRequestSchema.safeParse({
    filename: req.file.originalname,
    contentType: req.file.mimetype,
    size: req.file.size,
  });

  if (!parsedBody.success) {
    fs.unlink(req.file.path, () => undefined);
    return res.status(400).json(buildValidationError(parsedBody.error.issues));
  }

  return res.status(200).json({
    fileUrl: `${getPublicBaseUrl(req)}/uploads/resumes/${req.file.filename}`,
    resumeMeta: {
      filename: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype,
    },
  });
};

const applyToJobPublic = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "Resume file is required" });
  }

  const parsedBody = publicCandidateApplicationSchema.safeParse(req.body);

  if (!parsedBody.success) {
    fs.unlink(req.file.path, () => undefined);
    return res.status(400).json(buildValidationError(parsedBody.error.issues));
  }

  const parsedResume = resumeUploadRequestSchema.safeParse({
    filename: req.file.originalname,
    contentType: req.file.mimetype,
    size: req.file.size,
  });

  if (!parsedResume.success) {
    fs.unlink(req.file.path, () => undefined);
    return res.status(400).json(buildValidationError(parsedResume.error.issues));
  }

  try {
    const job = await Job.findById(req.params.jobId).populate("createdBy", "name email role");

    if (!job || job.archived || job.status !== "open" || job.visibility !== "public") {
      fs.unlink(req.file.path, () => undefined);
      return res.status(404).json({ message: "This job is not accepting public applications" });
    }

    const payload = parsedBody.data;
    const email = payload.email.trim().toLowerCase();
    const fullName = `${payload.firstName.trim()} ${payload.lastName.trim()}`.trim();

    const duplicate = await Candidate.findOne({
      email,
      jobId: job._id,
      archived: false,
    }).select("_id name stage statusToken");

    if (duplicate) {
      fs.unlink(req.file.path, () => undefined);
      return res.status(409).json({
        message: "An application with this email already exists for this role",
        statusToken: duplicate.statusToken,
      });
    }

    const statusToken = generateStatusToken();
    const resumeUrl = `${getPublicBaseUrl(req)}/uploads/resumes/${req.file.filename}`;
    const aiState = deriveAIStateForPayload({ resumeUrl });

    const candidate = await Candidate.create({
      name: fullName,
      email,
      phone: payload.phone,
      linkedin: payload.linkedin,
      jobId: job._id,
      department: job.department,
      source: "portal",
      resumeUrl,
      resumeMeta: {
        filename: req.file.originalname,
        size: req.file.size,
        mimeType: req.file.mimetype,
      },
      coverLetter: payload.coverLetter,
      stage: "Applied",
      status: "Active",
      statusToken,
      createdBy: job.createdBy?._id || job.createdBy || null,
      updatedBy: job.createdBy?._id || job.createdBy || null,
      stageHistory: [
        {
          stage: "Applied",
          changedBy: job.createdBy?._id || job.createdBy,
          changedAt: new Date(),
          reason: "Candidate applied through public job page",
        },
      ],
      activityLog: [
        {
          type: "created",
          title: "Candidate applied",
          description: `${fullName} applied to ${job.title} through the public job page.`,
          actorId: job.createdBy?._id || job.createdBy,
          actorName: "Public application",
          createdAt: new Date(),
          meta: {
            source: "portal",
          },
        },
      ],
      ...aiState,
    });

    if (candidate.resumeUrl) {
      await queueCandidateResumeScoring(candidate._id.toString());
    }

    await createAuditLog({
      req,
      action: "created",
      category: "candidates",
      entity: {
        type: "candidate",
        id: candidate._id,
        label: candidate.name,
      },
      description: `Public application received for ${job.title}`,
      meta: {
        email: candidate.email,
        jobId: job._id,
        jobTitle: job.title,
      },
    });

    await notifyNewApplication({
      candidate,
      job,
    });

    return res.status(201).json({
      message: "Application submitted successfully",
      candidateId: candidate._id,
      statusToken,
      statusUrl: `/status/${statusToken}`,
      candidateName: candidate.name,
      jobTitle: job.title,
    });
  } catch (error) {
    fs.unlink(req.file.path, () => undefined);
    return res.status(500).json({ message: error.message });
  }
};

const rescoreCandidate = async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.id);
    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    if (!ensureManageAccess(candidate, req, res)) {
      return;
    }

    if (!candidate.resumeUrl) {
      return res.status(400).json({ message: "Upload a resume before requesting AI scoring" });
    }

    await queueCandidateResumeScoring(candidate._id.toString());

    const refreshedCandidate = await Candidate.findById(candidate._id)
      .populate("jobId", "title department location")
      .populate("recruiterAssigned", "name email role")
      .populate("createdBy", "name email role")
      .populate("updatedBy", "name email role")
      .populate("stageHistory.changedBy", "name email role");

    return res.status(202).json(
      await normalizeCandidateResponse(refreshedCandidate, { includeNotes: true, viewerUser: req.user })
    );
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  addCandidateNote,
  addCandidateInterview,
  applyToJobPublic,
  assignCandidate,
  bulkActionCandidates,
  checkDuplicateCandidate,
  createCandidate,
  deleteCandidate,
  deleteCandidateNote,
  getCandidateById,
  getCandidateStatusByToken,
  getCandidatesMeta,
  getCandidates,
  requestResumeUploadUrl,
  rescoreCandidate,
  updateCandidate,
  updateCandidateNote,
  updateCandidateStage,
};
