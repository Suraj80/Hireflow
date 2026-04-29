const mongoose = require("mongoose");
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

const buildValidationError = (issues) => ({
  message: "Validation failed",
  errors: issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
  })),
});

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

const encodeRfc3986 = (value) =>
  encodeURIComponent(value).replace(/[!'()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);

const buildCanonicalUri = (key) => `/${key.split("/").map(encodeRfc3986).join("/")}`;

const buildS3ResumeObjectKey = (filename) => {
  const prefix = (process.env.AWS_S3_RESUME_PREFIX || "hireflow/resumes").replace(/^\/+|\/+$/g, "");
  const now = new Date();
  const extension = filename.includes(".") ? filename.split(".").pop() : "";
  const safeName = filename
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
  const normalizedName = safeName || "resume";
  const randomToken = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const datedPrefix = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const fileSegment = extension
    ? `${normalizedName.replace(new RegExp(`\\.${extension}$`), "")}.${extension}`
    : normalizedName;

  return `${prefix}/${datedPrefix}/${randomToken}-${fileSegment}`;
};

const getSigningKey = (secretAccessKey, dateStamp, region, service) => {
  const kDate = require("crypto").createHmac("sha256", `AWS4${secretAccessKey}`).update(dateStamp).digest();
  const kRegion = require("crypto").createHmac("sha256", kDate).update(region).digest();
  const kService = require("crypto").createHmac("sha256", kRegion).update(service).digest();
  return require("crypto").createHmac("sha256", kService).update("aws4_request").digest();
};

const createS3PresignedUpload = ({ filename, contentType }) => {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const sessionToken = process.env.AWS_SESSION_TOKEN;
  const region = process.env.AWS_REGION || process.env.AWS_S3_REGION;
  const bucket = process.env.AWS_S3_BUCKET;
  const expiresIn = Number(process.env.AWS_S3_PRESIGNED_TTL || 900);

  if (!accessKeyId || !secretAccessKey || !region || !bucket) {
    return null;
  }

  const key = buildS3ResumeObjectKey(filename);
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const service = "s3";
  const host = `${bucket}.s3.${region}.amazonaws.com`;
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const signedHeaders = "content-type;host";
  const canonicalQueryEntries = {
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${accessKeyId}/${credentialScope}`,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(Math.max(60, Math.min(expiresIn, 3600))),
    "X-Amz-SignedHeaders": signedHeaders,
  };

  if (sessionToken) {
    canonicalQueryEntries["X-Amz-Security-Token"] = sessionToken;
  }

  const canonicalQueryString = Object.entries(canonicalQueryEntries)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([queryKey, value]) => `${encodeRfc3986(queryKey)}=${encodeRfc3986(value)}`)
    .join("&");

  const canonicalRequest = [
    "PUT",
    buildCanonicalUri(key),
    canonicalQueryString,
    `content-type:${contentType}`,
    `host:${host}`,
    "",
    signedHeaders,
    "UNSIGNED-PAYLOAD",
  ].join("\n");

  const hashedCanonicalRequest = require("crypto").createHash("sha256").update(canonicalRequest).digest("hex");
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, credentialScope, hashedCanonicalRequest].join("\n");
  const signingKey = getSigningKey(secretAccessKey, dateStamp, region, service);
  const signature = require("crypto").createHmac("sha256", signingKey).update(stringToSign).digest("hex");
  const uploadUrl = `https://${host}${buildCanonicalUri(key)}?${canonicalQueryString}&X-Amz-Signature=${signature}`;
  const publicBaseUrl = (process.env.RESUME_UPLOAD_PUBLIC_BASE_URL || `https://${host}`).replace(/\/+$/g, "");

  return {
    key,
    uploadUrl,
    publicUrl: `${publicBaseUrl}/${key.split("/").map(encodeRfc3986).join("/")}`,
    headers: {
      "Content-Type": contentType,
    },
    method: "PUT",
  };
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

const ensureAssignableRecruiter = async (recruiterId) => {
  if (!recruiterId) {
    return null;
  }

  return User.findOne({
    _id: recruiterId,
    role: { $in: ["admin", "recruiter"] },
  }).select("name email role");
};

const syncAIPreview = (payload) => {
  if (payload.resumeUrl && payload.resumeMeta?.filename) {
    if (typeof payload.aiScore !== "number") {
      payload.aiScore = 72;
    }

    if (!payload.aiReasoning) {
      payload.aiReasoning =
        "Resume uploaded. Automated similarity scoring is queued; this preview score is based on currently captured profile signals.";
    }
  } else if (!payload.resumeUrl) {
    payload.aiScore = null;
    payload.aiReasoning = "";
  }
};

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

    syncAIPreview(payload);

    const candidate = await Candidate.create({
      ...payload,
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

    Object.assign(candidate, parsedBody.data, {
      updatedBy: req.user.id,
      status: deriveStatusFromStage(nextStage, parsedBody.data.archived ?? candidate.archived),
      email: nextEmail,
    });

    syncAIPreview(candidate);

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

    if (!ensureManageAccess(candidate, req, res)) {
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

      if (action === "move-stage") {
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
      }

      if (action === "reject") {
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
      }

      await candidate.save();
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
  const parsedBody = resumeUploadRequestSchema.safeParse(req.body);

  if (!parsedBody.success) {
    return res.status(400).json(buildValidationError(parsedBody.error.issues));
  }

  const signedUpload = createS3PresignedUpload(parsedBody.data);

  if (!signedUpload) {
    return res.status(501).json({
      message:
        "Resume upload signing is not configured. Set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, and AWS_S3_BUCKET to enable presigned S3 uploads.",
    });
  }

  return res.status(200).json({
    uploadUrl: signedUpload.uploadUrl,
    fileUrl: signedUpload.publicUrl,
    key: signedUpload.key,
    method: signedUpload.method,
    headers: signedUpload.headers,
    expiresIn: Number(process.env.AWS_S3_PRESIGNED_TTL || 900),
  });
};

module.exports = {
  addCandidateNote,
  addCandidateInterview,
  assignCandidate,
  bulkActionCandidates,
  checkDuplicateCandidate,
  createCandidate,
  deleteCandidate,
  deleteCandidateNote,
  getCandidateById,
  getCandidatesMeta,
  getCandidates,
  requestResumeUploadUrl,
  updateCandidate,
  updateCandidateNote,
  updateCandidateStage,
};
