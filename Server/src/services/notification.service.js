const Notification = require("../models/Notification");
const User = require("../models/User");
const WorkspaceSetting = require("../models/WorkspaceSetting");

const DEFAULT_NOTIFICATION_SETTINGS = {
  email: true,
  inApp: true,
  newApplications: true,
  interviewReminders: true,
  stageChanges: true,
  dailyDigest: false,
};

const toIdString = (value) => {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  return value._id?.toString?.() || value.id?.toString?.() || value.toString?.() || "";
};

const getWorkspaceNotificationSettings = async () => {
  const settings = await WorkspaceSetting.findOne().select("notifications");
  return {
    ...DEFAULT_NOTIFICATION_SETTINGS,
    ...(settings?.notifications?.toObject?.() || settings?.notifications || {}),
  };
};

const getAdminAndRecruiterIds = async () => {
  const users = await User.find({
    role: { $in: ["admin", "recruiter"] },
    isActive: { $ne: false },
  }).select("_id");

  return users.map((user) => user._id.toString());
};

const resolveActiveRecipients = async (recipientIds, actorId = "") => {
  const uniqueIds = Array.from(
    new Set(
      recipientIds
        .map(toIdString)
        .filter(Boolean)
        .filter((value) => value !== actorId)
    )
  );

  if (!uniqueIds.length) {
    return [];
  }

  const users = await User.find({
    _id: { $in: uniqueIds },
    isActive: { $ne: false },
  }).select("_id");

  return users.map((user) => user._id.toString());
};

const createNotifications = async ({
  recipientIds,
  type,
  title,
  message,
  actorId = null,
  entityType,
  entityId = null,
  entityLabel = "",
  meta = null,
}) => {
  const activeRecipientIds = await resolveActiveRecipients(recipientIds, toIdString(actorId));

  if (!activeRecipientIds.length) {
    return [];
  }

  const documents = activeRecipientIds.map((recipientId) => ({
    recipientId,
    type,
    title,
    message,
    actorId: actorId || null,
    entityType,
    entityId: entityId || null,
    entityLabel,
    meta,
  }));

  return Notification.insertMany(documents);
};

const notifyNewApplication = async ({ candidate, job }) => {
  const settings = await getWorkspaceNotificationSettings();
  if (!settings.inApp || !settings.newApplications) {
    return [];
  }

  const adminRecruiterIds = await getAdminAndRecruiterIds();
  const ownerId = toIdString(job.createdBy);

  return createNotifications({
    recipientIds: [...adminRecruiterIds, ownerId],
    type: "new-application",
    title: "New application received",
    message: `${candidate.name} applied for ${job.title}.`,
    entityType: "candidate",
    entityId: candidate._id,
    entityLabel: candidate.name,
    meta: {
      candidateId: candidate._id,
      candidateName: candidate.name,
      jobId: job._id,
      jobTitle: job.title,
      stage: candidate.stage,
    },
  });
};

const notifyCandidateStageChange = async ({
  candidate,
  previousStage,
  nextStage,
  actorId,
  reason = "",
  bulkAction = false,
}) => {
  const settings = await getWorkspaceNotificationSettings();
  if (!settings.inApp || !settings.stageChanges) {
    return [];
  }

  const adminRecruiterIds = await getAdminAndRecruiterIds();

  return createNotifications({
    recipientIds: [...adminRecruiterIds, toIdString(candidate.recruiterAssigned), toIdString(candidate.createdBy)],
    type: "candidate-stage",
    title: "Candidate stage updated",
    message: `${candidate.name} moved from ${previousStage} to ${nextStage}.`,
    actorId,
    entityType: "candidate",
    entityId: candidate._id,
    entityLabel: candidate.name,
    meta: {
      candidateId: candidate._id,
      candidateName: candidate.name,
      previousStage,
      nextStage,
      reason,
      bulkAction,
    },
  });
};

const notifyInterviewEvent = async ({
  interview,
  candidate,
  job,
  actorId,
  type,
  title,
  message,
  meta = null,
}) => {
  const settings = await getWorkspaceNotificationSettings();
  if (!settings.inApp || !settings.interviewReminders) {
    return [];
  }

  const adminRecruiterIds = await getAdminAndRecruiterIds();

  return createNotifications({
    recipientIds: [
      ...adminRecruiterIds,
      toIdString(interview.recruiterId),
      toIdString(interview.createdBy),
      toIdString(interview.leadInterviewer),
      ...(interview.interviewers || []).map(toIdString),
    ],
    type,
    title,
    message,
    actorId,
    entityType: "interview",
    entityId: interview._id,
    entityLabel: `${candidate?.name || "Candidate"} - ${interview.round}`,
    meta: {
      interviewId: interview._id,
      round: interview.round,
      candidateId: candidate?._id || interview.candidateId,
      candidateName: candidate?.name || "",
      jobId: job?._id || interview.jobId,
      jobTitle: job?.title || "",
      scheduledAt: interview.scheduledAt,
      status: interview.status,
      ...(meta || {}),
    },
  });
};

module.exports = {
  notifyCandidateStageChange,
  notifyInterviewEvent,
  notifyNewApplication,
};
