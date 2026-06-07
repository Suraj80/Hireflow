const Candidate = require("../models/Candidate");
const Interview = require("../models/Interview");
const Job = require("../models/Job");
const User = require("../models/User");
const { createAuditLog } = require("../services/audit.service");
const {
  sendCandidateStageChangeEmail,
  sendInterviewInviteEmails,
  sendInterviewReminderEmails,
} = require("../services/email.service");
const {
  notifyCandidateStageChange,
  notifyInterviewEvent,
} = require("../services/notification.service");
const {
  feedbackStatusOptions,
  interviewCalendarQuerySchema,
  interviewCreateSchema,
  interviewFeedbackSchema,
  interviewQuerySchema,
  interviewRescheduleSchema,
  interviewStatusOptions,
  interviewStatusSchema,
  interviewTypeOptions,
  interviewUpdateSchema,
} = require("../validation/interview.validation");

const buildValidationError = (issues) => ({
  message: "Validation failed",
  errors: issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
  })),
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

const normalizeCandidate = (candidate) => {
  if (!candidate) {
    return null;
  }

  return {
    id: candidate._id || candidate.id,
    name: candidate.name,
    email: candidate.email,
    jobId: candidate.jobId?._id || candidate.jobId?.id || candidate.jobId || null,
    stage: candidate.stage,
  };
};

const normalizeJob = (job) => {
  if (!job) {
    return null;
  }

  return {
    id: job._id || job.id,
    title: job.title,
    department: job.department,
    location: job.location,
  };
};

const loadInterviewEmailContext = async (interview) => {
  const [candidate, job, panelUsers] = await Promise.all([
    Candidate.findById(interview.candidateId).select("name email stage statusToken recruiterAssigned createdBy"),
    Job.findById(interview.jobId).select("title department location"),
    User.find({ _id: { $in: interview.interviewers || [] } }).select("name email role"),
  ]);

  return { candidate, job, panelUsers };
};

const computeFeedbackStatus = (interview) => {
  const totalInterviewers = interview.interviewers?.length || 0;
  const submitted = interview.feedback?.length || 0;

  if (submitted === 0) {
    return "pending";
  }

  if (submitted >= totalInterviewers && totalInterviewers > 0) {
    return "complete";
  }

  return "partial";
};

const computeAggregateScore = (interview) => {
  if (!interview.feedback?.length) {
    return null;
  }

  const total = interview.feedback.reduce((sum, entry) => sum + Number(entry.rating || 0), 0);
  return Number((total / interview.feedback.length).toFixed(1));
};

const canManageInterview = (interview, user) =>
  Boolean(
    user &&
      (user.role === "admin" ||
        user.role === "recruiter" ||
        interview.recruiterId?.toString?.() === user.id ||
        interview.createdBy?.toString?.() === user.id)
  );

const canSubmitFeedback = (interview, user) =>
  Boolean(
    user &&
      (canManageInterview(interview, user) ||
        (interview.interviewers || []).some((interviewer) => interviewer._id?.toString?.() === user.id || interviewer.toString?.() === user.id))
  );

const derivePermissions = (interview, user) => ({
  canView: Boolean(user),
  canEdit: canManageInterview(interview, user),
  canReschedule: canManageInterview(interview, user),
  canCancel: canManageInterview(interview, user),
  canDelete: canManageInterview(interview, user),
  canComplete: canManageInterview(interview, user),
  canSendReminder: canManageInterview(interview, user),
  canSubmitFeedback: canSubmitFeedback(interview, user),
});

const appendAudit = (interview, actorId, action, note = "", meta = null) => {
  interview.auditTrail.unshift({
    actor: actorId,
    action,
    note,
    createdAt: new Date(),
    meta,
  });
};

const recordInterviewAudit = async (req, interview, action, description, meta = null) =>
  createAuditLog({
    req,
    action,
    category: "interviews",
    entity: {
      type: "interview",
      id: interview._id || interview.id,
      label: interview.round || "Interview",
    },
    description,
    meta,
  });

const appendNotification = (interview, actorId, type, message = "") => {
  interview.notifications.unshift({
    type,
    sentAt: new Date(),
    sentBy: actorId,
    recipients: interview.interviewers || [],
    message,
  });
};

const buildBaseQuery = (filters) => {
  const query = {
    deletedAt: null,
  };

  if (filters.search) {
    query.$or = [
      { round: { $regex: filters.search, $options: "i" } },
      { notes: { $regex: filters.search, $options: "i" } },
      { agenda: { $regex: filters.search, $options: "i" } },
    ];
  }

  if (filters.interviewer !== "all") {
    query.interviewers = filters.interviewer;
  }

  if (filters.status !== "all") {
    query.status = filters.status;
  }

  if (filters.type !== "all") {
    query.type = filters.type;
  }

  if (filters.recruiter !== "all") {
    query.recruiterId = filters.recruiter;
  }

  if (filters.from || filters.to) {
    query.scheduledAt = {};
    if (filters.from) {
      query.scheduledAt.$gte = new Date(filters.from);
    }
    if (filters.to) {
      const end = new Date(filters.to);
      end.setHours(23, 59, 59, 999);
      query.scheduledAt.$lte = end;
    }
  }

  return query;
};

const applySort = (sort) => {
  switch (sort) {
    case "scheduledAt-desc":
      return { scheduledAt: -1 };
    case "candidate":
      return { scheduledAt: 1 };
    case "status":
      return { status: 1, scheduledAt: 1 };
    case "round":
      return { round: 1, scheduledAt: 1 };
    case "scheduledAt-asc":
    default:
      return { scheduledAt: 1 };
  }
};

const ensureInterviewShape = async (interviewOrId) => {
  const interviewId =
    typeof interviewOrId === "string"
      ? interviewOrId
      : interviewOrId?._id || interviewOrId?.id;
  const populated = await Interview.findById(interviewId)
    .populate("candidateId", "name email stage jobId")
    .populate("jobId", "title department location")
    .populate("interviewers", "name email role")
    .populate("leadInterviewer", "name email role")
    .populate("recruiterId", "name email role")
    .populate("createdBy", "name email role")
    .populate("updatedBy", "name email role")
    .populate("feedback.interviewerId", "name email role")
    .populate("auditTrail.actor", "name email role")
    .populate("notifications.sentBy", "name email role");

  return populated;
};

const mapInterview = (interview, user) => {
  const feedbackStatus = computeFeedbackStatus(interview);
  const aggregateScore = computeAggregateScore(interview);
  const scheduledEnd = new Date(new Date(interview.scheduledAt).getTime() + interview.duration * 60 * 1000);

  return {
    id: interview._id,
    candidate: normalizeCandidate(interview.candidateId),
    job: normalizeJob(interview.jobId),
    round: interview.round,
    type: interview.type,
    status: interview.status,
    scheduledAt: interview.scheduledAt,
    scheduledEnd,
    duration: interview.duration,
    timezone: interview.timezone,
    location: interview.location,
    meetLink: interview.meetLink,
    interviewers: (interview.interviewers || []).map(normalizeUser),
    leadInterviewer: normalizeUser(interview.leadInterviewer),
    recruiter: normalizeUser(interview.recruiterId),
    agenda: interview.agenda,
    notes: interview.notes,
    reminderSettings: interview.reminderSettings || [],
    sendInvite: interview.sendInvite,
    feedback: (interview.feedback || []).map((entry) => ({
      id: entry._id,
      interviewer: normalizeUser(entry.interviewerId),
      rating: entry.rating,
      strengths: entry.strengths,
      concerns: entry.concerns,
      recommendation: entry.recommendation,
      submittedAt: entry.submittedAt,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    })),
    feedbackStatus,
    aggregateScore,
    notifications: (interview.notifications || []).map((entry, index) => ({
      id: `${interview._id}-notification-${index}`,
      type: entry.type,
      sentAt: entry.sentAt,
      sentBy: normalizeUser(entry.sentBy),
      message: entry.message,
    })),
    audit: (interview.auditTrail || []).map((entry, index) => ({
      id: `${interview._id}-audit-${index}`,
      action: entry.action,
      actor: normalizeUser(entry.actor),
      note: entry.note,
      createdAt: entry.createdAt,
      meta: entry.meta,
    })),
    permissions: derivePermissions(interview, user),
    createdAt: interview.createdAt,
    updatedAt: interview.updatedAt,
    createdBy: normalizeUser(interview.createdBy),
    updatedBy: normalizeUser(interview.updatedBy),
    cancelledReason: interview.cancelledReason,
  };
};

const loadInterviewMeta = async () => {
  const [jobs, recruiters, interviewers, candidates] = await Promise.all([
    Job.find({ archived: false }).select("title department location"),
    User.find({ role: { $in: ["admin", "recruiter"] } }).select("name email role"),
    User.find({ role: { $in: ["admin", "recruiter", "viewer"] } }).select("name email role"),
    Candidate.find({ archived: false }).select("name email stage jobId").populate("jobId", "title department location"),
  ]);

  return {
    jobs: jobs.map(normalizeJob),
    recruiters: recruiters.map(normalizeUser),
    interviewers: interviewers.map(normalizeUser),
    candidates: candidates.map((candidate) => ({
      id: candidate._id,
      name: candidate.name,
      email: candidate.email,
      stage: candidate.stage,
      job: normalizeJob(candidate.jobId),
    })),
    statuses: interviewStatusOptions,
    types: interviewTypeOptions,
    feedbackStatuses: feedbackStatusOptions,
  };
};

const ensureDependencies = async (payload) => {
  const [candidate, job, users] = await Promise.all([
    Candidate.findById(payload.candidateId).select("name email stage jobId recruiterAssigned archived"),
    Job.findById(payload.jobId).select("title department location archived"),
    User.find({ _id: { $in: payload.interviewers } }).select("name email role"),
  ]);

  if (!candidate || candidate.archived) {
    return { error: { status: 404, message: "Candidate not found" } };
  }

  if (!job || job.archived) {
    return { error: { status: 404, message: "Job not found" } };
  }

  if (candidate.jobId?.toString() !== payload.jobId) {
    return { error: { status: 400, message: "Selected candidate does not belong to this job" } };
  }

  if (users.length !== payload.interviewers.length) {
    return { error: { status: 404, message: "One or more interviewers were not found" } };
  }

  const leadExists = users.some((user) => user._id.toString() === payload.leadInterviewer);

  if (!leadExists) {
    return { error: { status: 404, message: "Lead interviewer was not found" } };
  }

  return { candidate, job, users };
};

const detectConflicts = async ({ interviewId = null, candidateId, interviewerIds, scheduledAt, duration }) => {
  const start = new Date(scheduledAt);
  const end = new Date(start.getTime() + duration * 60 * 1000);

  const matches = await Interview.find({
    _id: interviewId ? { $ne: interviewId } : { $exists: true },
    deletedAt: null,
    status: { $nin: ["Cancelled"] },
    $or: [{ candidateId }, { interviewers: { $in: interviewerIds } }],
    scheduledAt: { $lt: end },
  }).select("scheduledAt duration candidateId interviewers round");

  return matches.filter((entry) => {
    const entryStart = new Date(entry.scheduledAt);
    const entryEnd = new Date(entryStart.getTime() + entry.duration * 60 * 1000);
    return entryStart < end && entryEnd > start;
  });
};

const getInterviews = async (req, res) => {
  const parsedQuery = interviewQuerySchema.safeParse(req.query);

  if (!parsedQuery.success) {
    return res.status(400).json(buildValidationError(parsedQuery.error.issues));
  }

  try {
    const filters = parsedQuery.data;
    const query = buildBaseQuery(filters);
    const skip = (filters.page - 1) * filters.limit;

    const [items, total, meta] = await Promise.all([
      Interview.find(query)
        .populate("candidateId", "name email stage jobId")
        .populate("jobId", "title department location")
        .populate("interviewers", "name email role")
        .populate("leadInterviewer", "name email role")
        .populate("recruiterId", "name email role")
        .populate("feedback.interviewerId", "name email role")
        .sort(applySort(filters.sort))
        .skip(skip)
        .limit(filters.limit),
      Interview.countDocuments(query),
      loadInterviewMeta(),
    ]);

    const mappedItems = items.map((item) => mapInterview(item, req.user));
    const filteredItems = mappedItems.filter((item) => {
      if (filters.team !== "all" && item.job?.department !== filters.team) {
        return false;
      }
      if (filters.feedbackStatus !== "all" && item.feedbackStatus !== filters.feedbackStatus) {
        return false;
      }
      if (filters.search) {
        const search = filters.search.toLowerCase();
        return (
          item.candidate?.name?.toLowerCase().includes(search) ||
          item.job?.title?.toLowerCase().includes(search) ||
          item.round.toLowerCase().includes(search)
        );
      }
      return true;
    });

    return res.status(200).json({
      items: filteredItems,
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

const getInterviewsCalendar = async (req, res) => {
  const parsedQuery = interviewCalendarQuerySchema.safeParse(req.query);

  if (!parsedQuery.success) {
    return res.status(400).json(buildValidationError(parsedQuery.error.issues));
  }

  try {
    const weekStart = new Date(parsedQuery.data.weekStart);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const items = await Interview.find({
      deletedAt: null,
      scheduledAt: { $gte: weekStart, $lt: weekEnd },
      ...(parsedQuery.data.interviewer !== "all" ? { interviewers: parsedQuery.data.interviewer } : {}),
      ...(parsedQuery.data.status !== "all" ? { status: parsedQuery.data.status } : {}),
    })
      .populate("candidateId", "name email stage jobId")
      .populate("jobId", "title department location")
      .populate("interviewers", "name email role")
      .populate("leadInterviewer", "name email role")
      .populate("recruiterId", "name email role")
      .populate("feedback.interviewerId", "name email role")
      .sort({ scheduledAt: 1 });

    const mappedItems = items
      .map((item) => mapInterview(item, req.user))
      .filter((item) => {
        if (parsedQuery.data.team !== "all" && item.job?.department !== parsedQuery.data.team) {
          return false;
        }
        if (parsedQuery.data.search) {
          const search = parsedQuery.data.search.toLowerCase();
          return (
            item.candidate?.name?.toLowerCase().includes(search) ||
            item.job?.title?.toLowerCase().includes(search) ||
            item.round.toLowerCase().includes(search)
          );
        }
        return true;
      });

    return res.status(200).json({
      weekStart,
      weekEnd,
      items: mappedItems,
      upcoming: mappedItems.filter((item) => new Date(item.scheduledAt).getTime() >= Date.now()).slice(0, 8),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getInterviewById = async (req, res) => {
  try {
    const interview = await ensureInterviewShape(req.params.id);

    if (!interview || interview.deletedAt) {
      return res.status(404).json({ message: "Interview not found" });
    }

    return res.status(200).json(mapInterview(interview, req.user));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const createInterview = async (req, res) => {
  const parsedBody = interviewCreateSchema.safeParse(req.body);

  if (!parsedBody.success) {
    return res.status(400).json(buildValidationError(parsedBody.error.issues));
  }

  try {
    const payload = parsedBody.data;
    const dependencyState = await ensureDependencies(payload);
    if (dependencyState.error) {
      return res.status(dependencyState.error.status).json({ message: dependencyState.error.message });
    }

    const conflicts = await detectConflicts({
      candidateId: payload.candidateId,
      interviewerIds: payload.interviewers,
      scheduledAt: payload.scheduledAt,
      duration: payload.duration,
    });

    if (conflicts.length) {
      return res.status(409).json({
        message: "Scheduling conflict detected",
        conflicts: conflicts.map((entry) => ({
          id: entry._id,
          round: entry.round,
          scheduledAt: entry.scheduledAt,
          duration: entry.duration,
        })),
      });
    }

    const interview = await Interview.create({
      candidateId: payload.candidateId,
      jobId: payload.jobId,
      round: payload.round,
      type: payload.type,
      status: payload.status,
      scheduledAt: payload.scheduledAt,
      duration: payload.duration,
      timezone: payload.timezone,
      location: payload.location,
      meetLink: payload.meetingLink,
      interviewers: payload.interviewers,
      leadInterviewer: payload.leadInterviewer,
      agenda: payload.agenda,
      notes: payload.notes,
      reminderSettings: payload.reminderSettings,
      sendInvite: payload.sendInvite,
      recruiterId: req.user.id,
      createdBy: req.user.id,
      updatedBy: req.user.id,
      auditTrail: [],
      notifications: [],
    });

    appendAudit(interview, req.user.id, "created", "Interview scheduled", {
      scheduledAt: payload.scheduledAt,
      duration: payload.duration,
      type: payload.type,
    });

    if (payload.sendInvite) {
      appendNotification(interview, req.user.id, "invite", "Calendar invite queued");
    }

    await interview.save();

    await recordInterviewAudit(req, interview, "interview-scheduled", `Scheduled ${payload.round} interview`, {
      candidateId: payload.candidateId,
      jobId: payload.jobId,
      scheduledAt: payload.scheduledAt,
      duration: payload.duration,
      status: payload.status,
    });

    const candidate = await Candidate.findById(payload.candidateId);
    if (candidate && candidate.stage !== "Interview") {
      const previousStage = candidate.stage;
      candidate.stage = "Interview";
      candidate.updatedBy = req.user.id;
      candidate.stageHistory.unshift({
        stage: "Interview",
        changedBy: req.user.id,
        changedAt: new Date(),
        reason: "Interview scheduled",
      });
      candidate.activityLog.unshift({
        type: "interview",
        title: "Interview scheduled",
        description: `${payload.round} interview scheduled for ${new Date(payload.scheduledAt).toLocaleString()}.`,
        actorId: req.user.id,
        actorName: req.user.role,
        createdAt: new Date(),
        meta: {
          interviewId: interview._id,
          round: payload.round,
        },
      });
      await candidate.save();

      await notifyCandidateStageChange({
        candidate,
        previousStage,
        nextStage: "Interview",
        actorId: req.user.id,
        reason: "Interview scheduled",
      });

      await sendCandidateStageChangeEmail({
        candidate,
        job: dependencyState.job,
        previousStage,
        nextStage: "Interview",
        reason: "Interview scheduled",
      });
    }

    await notifyInterviewEvent({
      interview,
      candidate: dependencyState.candidate,
      job: dependencyState.job,
      actorId: req.user.id,
      type: "interview-scheduled",
      title: "Interview scheduled",
      message: `${dependencyState.candidate.name} has a ${payload.round} interview scheduled for ${new Date(payload.scheduledAt).toLocaleString()}.`,
    });

    if (payload.sendInvite) {
      await sendInterviewInviteEmails({
        interview,
        candidate: dependencyState.candidate,
        job: dependencyState.job,
        panelUsers: dependencyState.users,
      });
    }

    const hydrated = await ensureInterviewShape(interview);
    return res.status(201).json(mapInterview(hydrated, req.user));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const updateInterview = async (req, res) => {
  const parsedBody = interviewUpdateSchema.safeParse(req.body);

  if (!parsedBody.success) {
    return res.status(400).json(buildValidationError(parsedBody.error.issues));
  }

  try {
    const interview = await Interview.findById(req.params.id);

    if (!interview || interview.deletedAt) {
      return res.status(404).json({ message: "Interview not found" });
    }

    if (!canManageInterview(interview, req.user)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const nextValues = {
      candidateId: parsedBody.data.candidateId || interview.candidateId.toString(),
      jobId: parsedBody.data.jobId || interview.jobId.toString(),
      round: parsedBody.data.round || interview.round,
      type: parsedBody.data.type || interview.type,
      status: parsedBody.data.status || interview.status,
      scheduledAt: parsedBody.data.scheduledAt || interview.scheduledAt,
      duration: parsedBody.data.duration || interview.duration,
      timezone: parsedBody.data.timezone || interview.timezone,
      interviewers: parsedBody.data.interviewers || interview.interviewers.map((entry) => entry.toString()),
      leadInterviewer: parsedBody.data.leadInterviewer || interview.leadInterviewer?.toString(),
      agenda: typeof parsedBody.data.agenda === "undefined" ? interview.agenda : parsedBody.data.agenda,
      notes: typeof parsedBody.data.notes === "undefined" ? interview.notes : parsedBody.data.notes,
      meetingLink: typeof parsedBody.data.meetingLink === "undefined" ? interview.meetLink : parsedBody.data.meetingLink,
      location: typeof parsedBody.data.location === "undefined" ? interview.location : parsedBody.data.location,
      reminderSettings:
        typeof parsedBody.data.reminderSettings === "undefined"
          ? interview.reminderSettings
          : parsedBody.data.reminderSettings,
      sendInvite: typeof parsedBody.data.sendInvite === "undefined" ? interview.sendInvite : parsedBody.data.sendInvite,
    };

    const dependencyState = await ensureDependencies(nextValues);
    if (dependencyState.error) {
      return res.status(dependencyState.error.status).json({ message: dependencyState.error.message });
    }

    const conflicts = await detectConflicts({
      interviewId: interview._id,
      candidateId: nextValues.candidateId,
      interviewerIds: nextValues.interviewers,
      scheduledAt: nextValues.scheduledAt,
      duration: nextValues.duration,
    });

    if (conflicts.length) {
      return res.status(409).json({
        message: "Scheduling conflict detected",
        conflicts: conflicts.map((entry) => ({
          id: entry._id,
          round: entry.round,
          scheduledAt: entry.scheduledAt,
          duration: entry.duration,
        })),
      });
    }

    interview.candidateId = nextValues.candidateId;
    interview.jobId = nextValues.jobId;
    interview.round = nextValues.round;
    interview.type = nextValues.type;
    interview.status = nextValues.status;
    interview.scheduledAt = nextValues.scheduledAt;
    interview.duration = nextValues.duration;
    interview.timezone = nextValues.timezone;
    interview.interviewers = nextValues.interviewers;
    interview.leadInterviewer = nextValues.leadInterviewer;
    interview.agenda = nextValues.agenda;
    interview.notes = nextValues.notes;
    interview.meetLink = nextValues.meetingLink;
    interview.location = nextValues.location;
    interview.reminderSettings = nextValues.reminderSettings;
    interview.sendInvite = nextValues.sendInvite;
    interview.updatedBy = req.user.id;

    appendAudit(interview, req.user.id, "updated", "Interview details updated");

    if (nextValues.sendInvite) {
      appendNotification(interview, req.user.id, "status-update", "Interview details updated");
    }

    await interview.save();

    await recordInterviewAudit(req, interview, "interview-updated", `Updated ${interview.round} interview`, {
      candidateId: nextValues.candidateId,
      jobId: nextValues.jobId,
      scheduledAt: nextValues.scheduledAt,
      duration: nextValues.duration,
      status: nextValues.status,
    });

    await notifyInterviewEvent({
      interview,
      candidate: dependencyState.candidate,
      job: dependencyState.job,
      actorId: req.user.id,
      type: "interview-updated",
      title: "Interview details updated",
      message: `${dependencyState.candidate.name}'s ${interview.round} interview details were updated.`,
    });

    if (nextValues.sendInvite) {
      await sendInterviewInviteEmails({
        interview,
        candidate: dependencyState.candidate,
        job: dependencyState.job,
        panelUsers: dependencyState.users,
      });
    }

    const hydrated = await ensureInterviewShape(interview);
    return res.status(200).json(mapInterview(hydrated, req.user));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const rescheduleInterview = async (req, res) => {
  const parsedBody = interviewRescheduleSchema.safeParse(req.body);

  if (!parsedBody.success) {
    return res.status(400).json(buildValidationError(parsedBody.error.issues));
  }

  try {
    const interview = await Interview.findById(req.params.id);

    if (!interview || interview.deletedAt) {
      return res.status(404).json({ message: "Interview not found" });
    }

    if (!canManageInterview(interview, req.user)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const nextDuration = parsedBody.data.duration || interview.duration;
    const conflicts = await detectConflicts({
      interviewId: interview._id,
      candidateId: interview.candidateId.toString(),
      interviewerIds: interview.interviewers.map((entry) => entry.toString()),
      scheduledAt: parsedBody.data.scheduledAt,
      duration: nextDuration,
    });

    if (conflicts.length) {
      return res.status(409).json({
        message: "Scheduling conflict detected",
        conflicts: conflicts.map((entry) => ({
          id: entry._id,
          round: entry.round,
          scheduledAt: entry.scheduledAt,
          duration: entry.duration,
        })),
      });
    }

    interview.scheduledAt = new Date(parsedBody.data.scheduledAt);
    interview.duration = nextDuration;
    interview.timezone = parsedBody.data.timezone || interview.timezone;
    interview.status = "Rescheduled";
    interview.updatedBy = req.user.id;

    appendAudit(interview, req.user.id, "rescheduled", parsedBody.data.reason, {
      scheduledAt: interview.scheduledAt,
      duration: interview.duration,
    });

    if (parsedBody.data.sendNotification) {
      appendNotification(interview, req.user.id, "reschedule", parsedBody.data.reason || "Interview rescheduled");
    }

    await interview.save();

    await recordInterviewAudit(req, interview, "interview-rescheduled", `Rescheduled ${interview.round} interview`, {
      scheduledAt: interview.scheduledAt,
      duration: interview.duration,
      reason: parsedBody.data.reason,
    });

    if (parsedBody.data.sendNotification) {
      const { candidate, job, panelUsers } = await loadInterviewEmailContext(interview);

      await notifyInterviewEvent({
        interview,
        candidate,
        job,
        actorId: req.user.id,
        type: "interview-rescheduled",
        title: "Interview rescheduled",
        message: `${candidate?.name || "Candidate"}'s ${interview.round} interview was rescheduled.`,
        meta: {
          reason: parsedBody.data.reason,
        },
      });

      await sendInterviewReminderEmails({
        interview,
        candidate,
        job,
        panelUsers,
        kind: "rescheduled",
        reason: parsedBody.data.reason,
      });
    }

    const hydrated = await ensureInterviewShape(interview);
    return res.status(200).json(mapInterview(hydrated, req.user));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const updateInterviewStatus = async (req, res) => {
  const parsedBody = interviewStatusSchema.safeParse(req.body);

  if (!parsedBody.success) {
    return res.status(400).json(buildValidationError(parsedBody.error.issues));
  }

  try {
    const interview = await Interview.findById(req.params.id);

    if (!interview || interview.deletedAt) {
      return res.status(404).json({ message: "Interview not found" });
    }

    if (!canManageInterview(interview, req.user)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const previousStatus = interview.status;
    interview.status = parsedBody.data.status;
    interview.updatedBy = req.user.id;

    if (parsedBody.data.status === "Cancelled") {
      interview.cancelledReason = parsedBody.data.reason;
    }

    appendAudit(interview, req.user.id, "status-updated", parsedBody.data.reason, {
      status: parsedBody.data.status,
    });

    if (parsedBody.data.sendNotification) {
      appendNotification(
        interview,
        req.user.id,
        parsedBody.data.status === "Cancelled" ? "cancellation" : "status-update",
        parsedBody.data.reason || `Interview marked ${parsedBody.data.status.toLowerCase()}`
      );
    }

    await interview.save();

    await recordInterviewAudit(req, interview, "status-updated", `Updated interview status to ${parsedBody.data.status}`, {
      status: parsedBody.data.status,
      reason: parsedBody.data.reason,
    });

    if (parsedBody.data.sendNotification) {
      const { candidate, job, panelUsers } = await loadInterviewEmailContext(interview);

      await notifyInterviewEvent({
        interview,
        candidate,
        job,
        actorId: req.user.id,
        type: parsedBody.data.status === "Cancelled" ? "interview-cancelled" : "interview-status",
        title:
          parsedBody.data.status === "Cancelled"
            ? "Interview cancelled"
            : `Interview marked ${parsedBody.data.status}`,
        message:
          parsedBody.data.reason ||
          `${candidate?.name || "Candidate"}'s ${interview.round} interview is now ${parsedBody.data.status.toLowerCase()}.`,
      });

      const reminderKind =
        previousStatus === parsedBody.data.status
          ? "reminder"
          : parsedBody.data.status === "Cancelled"
            ? "cancelled"
            : "reminder";

      await sendInterviewReminderEmails({
        interview,
        candidate,
        job,
        panelUsers,
        kind: reminderKind,
        reason: parsedBody.data.reason,
      });
    }

    const hydrated = await ensureInterviewShape(interview);
    return res.status(200).json(mapInterview(hydrated, req.user));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const addInterviewFeedback = async (req, res) => {
  const parsedBody = interviewFeedbackSchema.safeParse(req.body);

  if (!parsedBody.success) {
    return res.status(400).json(buildValidationError(parsedBody.error.issues));
  }

  try {
    const interview = await Interview.findById(req.params.id).populate("interviewers", "name email role");

    if (!interview || interview.deletedAt) {
      return res.status(404).json({ message: "Interview not found" });
    }

    if (!canSubmitFeedback(interview, req.user)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const existingIndex = interview.feedback.findIndex(
      (entry) => entry.interviewerId.toString() === req.user.id
    );

    const feedbackEntry = {
      interviewerId: req.user.id,
      rating: parsedBody.data.rating,
      strengths: parsedBody.data.strengths,
      concerns: parsedBody.data.concerns,
      recommendation: parsedBody.data.recommendation,
      submittedAt: new Date(),
    };

    if (existingIndex >= 0) {
      interview.feedback[existingIndex] = {
        ...interview.feedback[existingIndex].toObject(),
        ...feedbackEntry,
      };
      appendAudit(interview, req.user.id, "feedback-updated", "Feedback updated");
    } else {
      interview.feedback.push(feedbackEntry);
      appendAudit(interview, req.user.id, "feedback-submitted", "Feedback submitted");
    }

    interview.updatedBy = req.user.id;
    await interview.save();

    await recordInterviewAudit(
      req,
      interview,
      "feedback-submitted",
      `${existingIndex >= 0 ? "Updated" : "Submitted"} interview feedback for ${interview.round}`,
      {
        rating: parsedBody.data.rating,
        recommendation: parsedBody.data.recommendation,
        updated: existingIndex >= 0,
      }
    );

    const [candidate, job] = await Promise.all([
      Candidate.findById(interview.candidateId).select("name"),
      Job.findById(interview.jobId).select("title"),
    ]);

    await notifyInterviewEvent({
      interview,
      candidate,
      job,
      actorId: req.user.id,
      type: existingIndex >= 0 ? "feedback-updated" : "feedback-submitted",
      title: existingIndex >= 0 ? "Interview feedback updated" : "Interview feedback submitted",
      message: `${candidate?.name || "Candidate"}'s ${interview.round} interview feedback was ${existingIndex >= 0 ? "updated" : "submitted"}.`,
      meta: {
        recommendation: parsedBody.data.recommendation,
        rating: parsedBody.data.rating,
      },
    });

    const hydrated = await ensureInterviewShape(interview);
    return res.status(201).json(mapInterview(hydrated, req.user));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const deleteInterview = async (req, res) => {
  try {
    const interview = await Interview.findById(req.params.id);

    if (!interview || interview.deletedAt) {
      return res.status(404).json({ message: "Interview not found" });
    }

    if (!canManageInterview(interview, req.user)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    interview.deletedAt = new Date();
    interview.status = "Cancelled";
    interview.updatedBy = req.user.id;
    appendAudit(interview, req.user.id, "deleted", "Interview removed from active views");
    await interview.save();

    await recordInterviewAudit(req, interview, "deleted", `Deleted ${interview.round} interview`, {
      status: interview.status,
    });

    const [candidate, job] = await Promise.all([
      Candidate.findById(interview.candidateId).select("name"),
      Job.findById(interview.jobId).select("title"),
    ]);

    await notifyInterviewEvent({
      interview,
      candidate,
      job,
      actorId: req.user.id,
      type: "interview-deleted",
      title: "Interview deleted",
      message: `${candidate?.name || "Candidate"}'s ${interview.round} interview was removed from active schedules.`,
    });

    return res.status(200).json({ message: "Interview deleted" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  addInterviewFeedback,
  createInterview,
  deleteInterview,
  getInterviewById,
  getInterviews,
  getInterviewsCalendar,
  updateInterview,
  updateInterviewStatus,
  rescheduleInterview,
};
